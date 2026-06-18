/**
 * After requirePermission() calls, TypeScript can't narrow session to non-null.
 * This script adds a non-null type assertion `session = session!` after each
 * requirePermission call in admin routes so TypeScript knows session is defined.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { resolve, join } from "path";

const ROOT = resolve(".");

function walkSync(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkSync(full, results);
    else if (entry.endsWith(".ts")) results.push(full);
  }
  return results;
}

const files = [
  ...walkSync(join(ROOT, "src/app/api/admin")),
  ...walkSync(join(ROOT, "src/app/api")),
];

// Replace session.user. with session?.user?. in files that have requirePermission
// but still access session.user directly (unguarded)
let fixed = 0;
for (const file of files) {
  let src = readFileSync(file, "utf-8");
  const original = src;

  // Only modify files that use requirePermission
  if (!src.includes("requirePermission")) continue;

  // Replace direct session.user accesses with optional chaining
  // This is safe: if session was null, requirePermission already returned early
  src = src
    .replace(/\bsession\.user\.employeeId\b/g, "session?.user?.employeeId")
    .replace(/\bsession\.user\.isManager\b/g, "session?.user?.isManager")
    .replace(/\bsession\.user\.role\b/g, "session?.user?.role")
    .replace(/\bsession\.user\.email\b/g, "session?.user?.email")
    .replace(/\bsession\.user\.name\b/g, "session?.user?.name");

  if (src !== original) {
    writeFileSync(file, src, "utf-8");
    console.log(`✅ ${file.replace(ROOT, "").replace(/^[/\\]/, "")}`);
    fixed++;
  }
}
console.log(`\nFixed ${fixed} files.`);
