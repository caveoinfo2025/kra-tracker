/**
 * Phase 16: Migrate admin API routes from isManager checks to requirePermission()
 *
 * Transforms:
 *   if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 * to:
 *   const deny = await requirePermission(session, MODULE, RESOURCE, ACTION);
 *   if (deny) return deny;
 *
 * Also adds the requirePermission import to each file.
 *
 * Run: node scripts/phase16-migrate-admin-routes.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { resolve, relative, join } from "path";

function walkSync(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkSync(full, results);
    else if (entry.endsWith(".ts")) results.push(full);
  }
  return results;
}

const ROOT = resolve(".");

// Map subfolder prefix → [module, resource, action]
const FOLDER_PERMISSION_MAP = [
  ["src/app/api/admin/communication", "Settings", "CommunicationAdmin", "EDIT"],
  ["src/app/api/admin/crm",           "Settings", "Configuration",      "EDIT"],
  ["src/app/api/admin/finance",        "Settings", "Finance",            "EDIT"],
  ["src/app/api/admin/identity",       "Settings", "Identity",           "EDIT"],
  ["src/app/api/admin/integrations",   "Settings", "IntegrationAdmin",   "EDIT"],
  ["src/app/api/admin/performance",    "Settings", "Performance",        "EDIT"],
  ["src/app/api/admin/roles",          "Settings", "RoleManagement",     "EDIT"],
  ["src/app/api/admin/security",       "Settings", "SecurityAdmin",      "EDIT"],
  ["src/app/api/admin/settings",       "Settings", "Configuration",      "EDIT"],
];

function getPermission(filePath) {
  const rel = relative(ROOT, filePath).replace(/\\/g, "/");
  for (const [prefix, mod, resource, action] of FOLDER_PERMISSION_MAP) {
    if (rel.startsWith(prefix)) return { mod, resource, action };
  }
  return null;
}

const adminDir = resolve(ROOT, "src/app/api/admin");
const files = walkSync(adminDir);

let changed = 0, skipped = 0;

for (const file of files) {
  const perm = getPermission(file);
  if (!perm) { skipped++; continue; }

  let src = readFileSync(file, "utf-8");
  const original = src;

  // 1. Replace isManager guard patterns (both variants)
  // Variant A: if (!session?.user?.isManager) return NextResponse.json(...)
  // Variant B: if (!session?.user) { ... } + if (!session.user.isManager) { ... }
  // We handle the simple single-line variant which covers all admin routes

  const guardRegex = /if \(!session\?\.user\?\.isManager\)\s+return NextResponse\.json\(\s*\{\s*error:\s*["']Forbidden["']\s*\},\s*\{\s*status:\s*403\s*\}\s*\);/g;
  const replacement = `const deny = await requirePermission(session, "${perm.mod}", "${perm.resource}", "${perm.action}");\n  if (deny) return deny;`;
  src = src.replace(guardRegex, replacement);

  // 2. Add import for requirePermission if not already present
  if (!src.includes("requirePermission")) {
    // Insert after the last existing import from @/lib/*
    src = src.replace(
      /(import [^;]+from "@\/lib\/dev-session";)/,
      `$1\nimport { requirePermission } from "@/lib/access-control";`
    );
  }

  if (src !== original) {
    writeFileSync(file, src, "utf-8");
    console.log(`✅ ${relative(ROOT, file)}`);
    changed++;
  } else {
    console.log(`⏭  ${relative(ROOT, file)} (no change)`);
    skipped++;
  }
}

console.log(`\nDone: ${changed} files updated, ${skipped} unchanged.`);
