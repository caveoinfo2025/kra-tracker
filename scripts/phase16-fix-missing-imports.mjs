/**
 * Adds missing `import { requirePermission } from "@/lib/access-control"`
 * to any route file that calls requirePermission but hasn't imported it.
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

let fixed = 0;
for (const file of files) {
  let src = readFileSync(file, "utf-8");
  if (src.includes("requirePermission") && !src.includes('from "@/lib/access-control"')) {
    // Insert after dev-session import
    const updated = src.replace(
      /(import \{ [^}]*getSession[^}]* \} from "@\/lib\/dev-session";)/,
      `$1\nimport { requirePermission } from "@/lib/access-control";`
    );
    if (updated !== src) {
      writeFileSync(file, updated, "utf-8");
      console.log(`✅ Fixed: ${file.replace(ROOT + "\\", "").replace(ROOT + "/", "")}`);
      fixed++;
    }
  }
}
console.log(`\nFixed ${fixed} files.`);
