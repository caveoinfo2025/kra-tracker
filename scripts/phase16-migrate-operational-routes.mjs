/**
 * Phase 16: Migrate operational API routes from isManager to requirePermission()
 *
 * Maps each route file to its (module, resource, action) permission.
 * Replaces the common guard patterns and adds the requirePermission import.
 *
 * Run: node scripts/phase16-migrate-operational-routes.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, relative } from "path";

const ROOT = resolve(".");

// Per-file permission mapping.
// Format: "src/app/api/<path>/route.ts" → [module, resource, action]
// ACTION here is the *minimum* action checked in any handler of that file.
// For routes that only gate on manager for specific HTTP methods (POST/DELETE),
// we map to EDIT as a conservative default — GET reads fall back to VIEW.
const FILE_MAP = {
  // Collections
  "src/app/api/collections/route.ts":              ["CRM", "Collection", "VIEW"],
  "src/app/api/collections/[id]/route.ts":         ["CRM", "Collection", "EDIT"],
  // Daily updates
  "src/app/api/daily-updates/route.ts":            ["CRM", "DailyUpdate", "VIEW"],
  "src/app/api/daily-updates/[id]/route.ts":       ["CRM", "DailyUpdate", "EDIT"],
  // Employees
  "src/app/api/employees/route.ts":                ["CRM", "Employee", "VIEW"],
  "src/app/api/employees/[id]/route.ts":           ["CRM", "Employee", "EDIT"],
  "src/app/api/employees/[id]/kras/route.ts":      ["CRM", "KRA", "EDIT"],
  "src/app/api/employees/[id]/reviews/route.ts":   ["CRM", "KRA", "APPROVE"],
  // Certifications
  "src/app/api/certifications/route.ts":           ["CRM", "KRA", "VIEW"],
  "src/app/api/certifications/[id]/route.ts":      ["CRM", "KRA", "EDIT"],
  "src/app/api/certifications/[id]/approve/route.ts": ["CRM", "KRA", "APPROVE"],
  // KRAs
  "src/app/api/kras/[id]/route.ts":               ["CRM", "KRA", "EDIT"],
  "src/app/api/kra/sync-achievements/route.ts":   ["CRM", "KRA", "APPROVE"],
  "src/app/api/kra-sync/route.ts":                ["CRM", "KRA", "APPROVE"],
  // Lead generation
  "src/app/api/lead-generation/route.ts":          ["CRM", "LeadGen", "VIEW"],
  "src/app/api/lead-generation/[id]/route.ts":     ["CRM", "LeadGen", "EDIT"],
  // Sales funnel
  "src/app/api/sales-funnel/route.ts":             ["CRM", "SalesFunnel", "VIEW"],
  "src/app/api/sales-funnel/[id]/route.ts":        ["CRM", "SalesFunnel", "EDIT"],
  // Weekly commits
  "src/app/api/weekly-commits/route.ts":           ["CRM", "DailyUpdate", "VIEW"],
  "src/app/api/weekly-commits/[id]/route.ts":      ["CRM", "DailyUpdate", "EDIT"],
  // Pipeline — leads
  "src/app/api/pipeline/leads/route.ts":           ["CRM", "Lead", "VIEW"],
  "src/app/api/pipeline/leads/[id]/route.ts":      ["CRM", "Lead", "EDIT"],
  "src/app/api/pipeline/leads/[id]/stage/route.ts": ["CRM", "Lead", "EDIT"],
  "src/app/api/pipeline/leads/[id]/activity/route.ts": ["CRM", "Activity", "CREATE"],
  // Pipeline — opportunities
  "src/app/api/pipeline/opportunities/route.ts":   ["CRM", "Opportunity", "VIEW"],
  "src/app/api/pipeline/opportunities/[id]/route.ts": ["CRM", "Opportunity", "EDIT"],
  "src/app/api/pipeline/opportunities/promote/route.ts": ["CRM", "Opportunity", "EDIT"],
  // Pipeline — tasks / meetings / notes / analytics
  "src/app/api/pipeline/tasks/route.ts":           ["CRM", "Activity", "VIEW"],
  "src/app/api/pipeline/tasks/[id]/route.ts":      ["CRM", "Activity", "EDIT"],
  "src/app/api/pipeline/meetings/route.ts":        ["CRM", "Activity", "VIEW"],
  "src/app/api/pipeline/notes/route.ts":           ["CRM", "Activity", "VIEW"],
  "src/app/api/pipeline/notes/[id]/route.ts":      ["CRM", "Activity", "EDIT"],
  "src/app/api/pipeline/analytics/route.ts":       ["CRM", "Report", "VIEW"],
  // Reviews
  "src/app/api/reviews/[id]/route.ts":             ["CRM", "KRA", "EDIT"],
  // Finance
  "src/app/api/expenses/route.ts":                 ["Finance", "Expense", "VIEW"],
  // Customer master
  "src/app/api/customers/master/[id]/route.ts":    ["Masters", "CustomerMaster", "EDIT"],
  "src/app/api/customers/master/deduplicate/route.ts": ["Masters", "CustomerMaster", "EDIT"],
  "src/app/api/customers/master/import/route.ts":  ["Masters", "CustomerMaster", "IMPORT"],
  // Import
  "src/app/api/import/route.ts":                   ["CRM", "Lead", "IMPORT"],
  // Mobile
  "src/app/api/mobile/team/route.ts":              ["CRM", "Employee", "VIEW"],
};

// Patterns to replace — ordered from most specific to least specific
const GUARD_PATTERNS = [
  // !session?.user?.isManager
  {
    regex: /if \(!session\?\.user\?\.isManager\)\s*(?:\{[^}]*\}|return NextResponse\.json\(\s*\{[^}]*\},\s*\{[^}]*\}\s*\);)/g,
    build: (mod, resource, action) =>
      `const deny = await requirePermission(session, "${mod}", "${resource}", "${action}");\n  if (deny) return deny;`,
  },
  // !session?.user?.isManager (single-line with return)
  {
    regex: /if \(!session\?\.user\?\.isManager\)\s+return NextResponse\.json\(\s*\{\s*error:\s*["']Forbidden["']\s*\},\s*\{\s*status:\s*403\s*\}\s*\);/g,
    build: (mod, resource, action) =>
      `const deny = await requirePermission(session, "${mod}", "${resource}", "${action}");\n  if (deny) return deny;`,
  },
  // session.user.isManager (without optional chaining)
  {
    regex: /if \(!session\.user\.isManager\)\s+return NextResponse\.json\(\s*\{\s*error:\s*["']Forbidden["']\s*\},\s*\{\s*status:\s*403\s*\}\s*\);/g,
    build: (mod, resource, action) =>
      `const deny = await requirePermission(session, "${mod}", "${resource}", "${action}");\n  if (deny) return deny;`,
  },
];

let changed = 0, skipped = 0, notFound = 0;

for (const [relPath, [mod, resource, action]] of Object.entries(FILE_MAP)) {
  const file = resolve(ROOT, relPath.replace(/\//g, "/"));
  let src;
  try {
    src = readFileSync(file, "utf-8");
  } catch {
    console.log(`⚠️  Not found: ${relPath}`);
    notFound++;
    continue;
  }

  const original = src;

  // Apply guard pattern replacements
  for (const { regex, build } of GUARD_PATTERNS) {
    src = src.replace(regex, build(mod, resource, action));
  }

  // Add import if requirePermission is now used and not yet imported
  if (src.includes("requirePermission") && !src.includes(`from "@/lib/access-control"`)) {
    src = src.replace(
      /(import [^;]+from "@\/lib\/dev-session";)/,
      `$1\nimport { requirePermission } from "@/lib/access-control";`
    );
  }

  if (src !== original) {
    writeFileSync(file, src, "utf-8");
    console.log(`✅ ${relPath}`);
    changed++;
  } else {
    console.log(`⏭  ${relPath} (no matching pattern)`);
    skipped++;
  }
}

console.log(`\nDone: ${changed} updated, ${skipped} unchanged, ${notFound} not found.`);
