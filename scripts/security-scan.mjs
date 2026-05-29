/**
 * Static security scanner for kra-tracker + Android APK
 * Checks: hardcoded secrets, auth gaps, XSS, CORS, insecure headers,
 *         IDOR risks, dev-only bypasses in production paths, APK manifest
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT   = process.cwd();
const APK_ANDROID = path.join(ROOT, '..', 'caveo-crm-android', 'android');

let findings = [];
let pass = 0;

function PASS(msg)  { pass++; console.log(`  ✅  ${msg}`); }
function WARN(msg)  { findings.push({ sev: 'WARN',  msg }); console.log(`  ⚠️   ${msg}`); }
function FAIL(msg)  { findings.push({ sev: 'HIGH',  msg }); console.log(`  🔴  ${msg}`); }
function INFO(msg)  { console.log(`  ℹ️   ${msg}`); }
function HEAD(t)    { console.log(`\n── ${t} ──`); }

// ── helpers ──────────────────────────────────────────────────────────
function readFile(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

function allFiles(dir, ext) {
  const results = [];
  function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.next' || e.name === '.git' || e.name === 'generated') continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (!ext || full.endsWith(ext)) results.push(full);
    }
  }
  walk(dir);
  return results;
}

function grep(files, pattern, flags = 'g') {
  const re = new RegExp(pattern, flags);
  const hits = [];
  for (const f of files) {
    const src = readFile(f);
    if (!src) continue;
    const lines = src.split('\n');
    lines.forEach((line, i) => {
      if (re.test(line)) hits.push({ file: path.relative(ROOT, f), line: i + 1, text: line.trim().slice(0, 120) });
    });
  }
  return hits;
}

// ── 1. Dependency Vulnerabilities (npm audit) ─────────────────────────
HEAD('1. Dependency Vulnerabilities');
try {
  const auditRaw = fs.readFileSync(path.join(ROOT, 'audit-report.json'), 'utf8');
  const audit = JSON.parse(auditRaw);
  const vulns = audit.vulnerabilities ?? {};
  const counts = { critical: 0, high: 0, moderate: 0, low: 0 };
  for (const [pkg, v] of Object.entries(vulns)) {
    counts[v.severity] = (counts[v.severity] ?? 0) + 1;
    if (v.severity === 'critical' || v.severity === 'high') {
      FAIL(`${v.severity.toUpperCase()}: ${pkg} — ${Object.values(v.via ?? {})[0]?.url ?? 'see npm audit'}`);
    } else {
      WARN(`${v.severity}: ${pkg}`);
    }
  }
  if (counts.critical === 0 && counts.high === 0) PASS('No critical/high CVEs in dependencies');
  INFO(`Totals: critical=${counts.critical} high=${counts.high} moderate=${counts.moderate} low=${counts.low}`);
} catch {
  WARN('Could not parse audit-report.json — run npm audit first');
}

// ── 2. Hardcoded Secrets ──────────────────────────────────────────────
HEAD('2. Hardcoded Secrets / Credentials');
const srcFiles = allFiles(path.join(ROOT, 'src'), '.ts').concat(allFiles(path.join(ROOT, 'src'), '.tsx'));
const secretPatterns = [
  { name: 'API key pattern',         re: /(?:api[_-]?key|apikey)\s*[:=]\s*["'][A-Za-z0-9_\-]{20,}/i },
  { name: 'Password in source',      re: /password\s*[:=]\s*["'][^"']{6,}/i },
  { name: 'Bearer token literal',    re: /Bearer\s+[A-Za-z0-9_\-.]{20,}/i },
  { name: 'AWS key pattern',         re: /AKIA[0-9A-Z]{16}/ },
  { name: 'Private key header',      re: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/ },
  { name: 'JWT secret literal',      re: /jwt[_-]?secret\s*[:=]\s*["'][^"']{8,}/i },
  { name: 'NextAuth secret literal', re: /NEXTAUTH_SECRET\s*=\s*["'][^"']{8,}/i },
];

let secretHits = 0;
for (const { name, re } of secretPatterns) {
  const hits = grep(srcFiles, re.source, re.flags ?? 'i');
  if (hits.length) {
    hits.forEach(h => FAIL(`${name} @ ${h.file}:${h.line}  →  ${h.text}`));
    secretHits += hits.length;
  }
}
// also check .env files
for (const envFile of ['.env', '.env.local', '.env.production']) {
  const content = readFile(path.join(ROOT, envFile));
  if (content && /NEXTAUTH_SECRET\s*=\s*[^\n]{8,}/.test(content)) {
    WARN(`${envFile} contains NEXTAUTH_SECRET — ensure it's not committed to git`);
  }
}
if (secretHits === 0) PASS('No hardcoded secrets detected in source');

// ── 3. Auth / Session Checks ──────────────────────────────────────────
HEAD('3. Authentication & Session Security');
const apiRoutes = allFiles(path.join(ROOT, 'src', 'app', 'api'), '.ts');

let unprotected = [];
for (const f of apiRoutes) {
  const src = readFile(f);
  if (!src) continue;
  const hasGetOrPost = /export\s+async\s+function\s+(GET|POST|PATCH|PUT|DELETE)/.test(src);
  if (!hasGetOrPost) continue;
  const hasAuth = src.includes('getSession') || src.includes('auth()') || src.includes('session');
  if (!hasAuth) {
    unprotected.push(path.relative(ROOT, f));
  }
}
if (unprotected.length === 0) {
  PASS('All API routes contain session/auth checks');
} else {
  unprotected.forEach(f => WARN(`API route may lack auth: ${f}`));
}

// Dev bypass present only in development?
const devSessionSrc = readFile(path.join(ROOT, 'src', 'lib', 'dev-session.ts'));
if (devSessionSrc) {
  if (devSessionSrc.includes("process.env.NODE_ENV !== 'development'") ||
      devSessionSrc.includes('NODE_ENV !== "development"')) {
    PASS('dev_employee_id cookie bypass is gated to NODE_ENV=development');
  } else {
    FAIL('dev_employee_id bypass does NOT check NODE_ENV — active in production!');
  }
}

// ── 4. XSS Risks ─────────────────────────────────────────────────────
HEAD('4. XSS & Injection Risks');
const dangerousHtml = grep(srcFiles, 'dangerouslySetInnerHTML');
if (dangerousHtml.length === 0) {
  PASS('No dangerouslySetInnerHTML usage found');
} else {
  dangerousHtml.forEach(h => WARN(`dangerouslySetInnerHTML @ ${h.file}:${h.line}  →  ${h.text}`));
}

// eval usage
const evalUsage = grep(srcFiles, /\beval\s*\(/, 'g');
if (evalUsage.length === 0) {
  PASS('No eval() usage found');
} else {
  evalUsage.forEach(h => FAIL(`eval() usage @ ${h.file}:${h.line}`));
}

// innerHTML without sanitization
const innerHtml = grep(srcFiles, /\.innerHTML\s*=/, 'g');
innerHtml.forEach(h => WARN(`Direct .innerHTML assignment @ ${h.file}:${h.line}  →  ${h.text}`));
if (innerHtml.length === 0) PASS('No direct .innerHTML assignments');

// ── 5. Prisma / SQL Injection ─────────────────────────────────────────
HEAD('5. Database / Injection Safety');
const rawQueries = grep(srcFiles, /\$queryRaw|\$executeRaw/);
if (rawQueries.length === 0) {
  PASS('No raw SQL queries (all queries use Prisma typed API)');
} else {
  rawQueries.forEach(h => WARN(`Raw query @ ${h.file}:${h.line} — verify parameterization:  ${h.text}`));
}

// Dynamic sort field injection
const dynamicSort = grep(srcFiles, /orderBy.*\[sort\]/);
dynamicSort.forEach(h => WARN(`Dynamic sort field @ ${h.file}:${h.line} — verify allowlist:  ${h.text}`));

// ── 6. CORS & Headers ────────────────────────────────────────────────
HEAD('6. CORS & Security Headers');
const nextConfig = readFile(path.join(ROOT, 'next.config.ts')) ?? readFile(path.join(ROOT, 'next.config.js')) ?? readFile(path.join(ROOT, 'next.config.mjs'));
if (nextConfig) {
  if (nextConfig.includes('headers')) {
    PASS('next.config sets custom HTTP headers');
    if (nextConfig.includes('X-Frame-Options') || nextConfig.includes('frame-ancestors')) PASS('X-Frame-Options / CSP frame-ancestors configured');
    else WARN('X-Frame-Options not found in next.config — consider adding to prevent clickjacking');
    if (nextConfig.includes('Content-Security-Policy')) PASS('Content-Security-Policy configured');
    else WARN('Content-Security-Policy not found — consider adding');
  } else {
    WARN('No custom security headers in next.config — missing X-Frame-Options, CSP, HSTS etc.');
  }
  if (nextConfig.includes('cors') || nextConfig.includes('Access-Control')) {
    INFO('CORS configuration found in next.config');
  }
} else {
  WARN('next.config not found');
}

// ── 7. Sensitive Data Exposure ────────────────────────────────────────
HEAD('7. Sensitive Data Exposure');
// Passwords / tokens returned in API responses?
const responseWithPassword = grep(srcFiles, /password.*response|response.*password/i);
responseWithPassword.forEach(h => WARN(`Possible password in response @ ${h.file}:${h.line}`));

// console.log of sensitive data
const consoleLogs = grep(srcFiles, /console\.(log|debug)\s*\(.*(?:password|token|secret|key)/i);
consoleLogs.forEach(h => WARN(`console.log of sensitive data @ ${h.file}:${h.line}  →  ${h.text}`));
if (consoleLogs.length === 0) PASS('No console.log of sensitive fields detected');

// ── 8. IDOR Risks ────────────────────────────────────────────────────
HEAD('8. Insecure Direct Object References (IDOR)');
// Look for routes that take [id] param but might not check ownership
const paramRoutes = allFiles(path.join(ROOT, 'src', 'app', 'api'), '.ts')
  .filter(f => f.includes('[id]'));
let idorRisks = 0;
for (const f of paramRoutes) {
  const src = readFile(f);
  if (!src) continue;
  const hasOwnershipCheck = src.includes('employeeId') || src.includes('createdById') ||
    src.includes('assignedToId') || src.includes('isManager') ||
    src.includes('session.user.employeeId') || src.includes('session.user.id');
  if (!hasOwnershipCheck) {
    WARN(`[id] route may lack ownership check: ${path.relative(ROOT, f)}`);
    idorRisks++;
  }
}
if (idorRisks === 0) PASS('All [id] API routes include ownership/role checks');

// ── 9. Environment Variables ──────────────────────────────────────────
HEAD('9. Environment & Configuration');
const envExample = readFile(path.join(ROOT, '.env.example')) ?? readFile(path.join(ROOT, '.env.sample'));
if (envExample) PASS('.env.example exists for documentation');
else INFO('No .env.example found — consider adding one');

const gitignore = readFile(path.join(ROOT, '.gitignore')) ?? '';
if (gitignore.includes('.env')) PASS('.env files are gitignored');
else WARN('.env files may not be gitignored');

// ── 10. Android APK Security ─────────────────────────────────────────
HEAD('10. Android APK Security');
const manifest = readFile(path.join(APK_ANDROID, 'app', 'src', 'main', 'AndroidManifest.xml'));
if (manifest) {
  // Cleartext HTTP
  if (manifest.includes('usesCleartextTraffic="true"')) {
    WARN('AndroidManifest: android:usesCleartextTraffic="true" — HTTP allowed (expected for internal dev server)');
  } else {
    PASS('AndroidManifest: cleartext traffic not globally allowed');
  }
  // Debuggable
  if (manifest.includes('android:debuggable="true"')) {
    FAIL('AndroidManifest: android:debuggable="true" — remove before release build!');
  } else {
    PASS('AndroidManifest: android:debuggable not set (defaults to false in release)');
  }
  // Backup
  if (manifest.includes('allowBackup="false"')) {
    PASS('AndroidManifest: android:allowBackup="false"');
  } else {
    WARN('AndroidManifest: android:allowBackup not set to false — ADB backup possible');
  }
  // Exported activities without intent filters
  if (manifest.includes('exported="true"')) {
    WARN('AndroidManifest: exported="true" activity found — verify it is intentional');
  }
  // Network security config
  if (manifest.includes('networkSecurityConfig')) {
    PASS('AndroidManifest: custom networkSecurityConfig is set');
  }
} else {
  INFO('AndroidManifest.xml not found at expected path');
}

const netSec = readFile(path.join(APK_ANDROID, 'app', 'src', 'main', 'res', 'xml', 'network_security_config.xml'));
if (netSec) {
  if (netSec.includes('<certificates src="user"')) {
    WARN('network_security_config: trusts user certificates — remove before production release');
  }
  const clearDomains = [...netSec.matchAll(/<domain[^>]*>([^<]+)<\/domain>/g)].map(m => m[1].trim());
  if (clearDomains.length > 0) {
    PASS(`network_security_config: cleartext restricted to specific domain(s): ${clearDomains.join(', ')}`);
  }
}

// Hardcoded IP in capacitor config
const capConfig = readFile(path.join(ROOT, '..', 'caveo-crm-android', 'capacitor.config.json'));
if (capConfig) {
  const parsed = JSON.parse(capConfig);
  const serverUrl = parsed?.server?.url ?? '';
  if (serverUrl.includes('10.201.') || serverUrl.includes('192.168.')) {
    WARN(`capacitor.config.json: hardcoded internal IP in server.url: ${serverUrl} — change before production`);
  }
}

// ── Summary ───────────────────────────────────────────────────────────
HEAD('SUMMARY');
const high  = findings.filter(f => f.sev === 'HIGH');
const warns = findings.filter(f => f.sev === 'WARN');
console.log(`\n  Passed checks : ${pass}`);
console.log(`  Warnings      : ${warns.length}`);
console.log(`  High severity : ${high.length}`);

if (high.length > 0) {
  console.log('\n  🔴 HIGH SEVERITY ISSUES:');
  high.forEach(f => console.log(`     • ${f.msg}`));
}
if (warns.length > 0) {
  console.log('\n  ⚠️  WARNINGS (review):');
  warns.forEach(f => console.log(`     • ${f.msg}`));
}

// Write JSON report
const report = { timestamp: new Date().toISOString(), pass, findings };
fs.writeFileSync(path.join(ROOT, 'test-results', 'security-report.json'), JSON.stringify(report, null, 2));
console.log('\n  Full report: test-results/security-report.json');

process.exit(high.length > 0 ? 1 : 0);
