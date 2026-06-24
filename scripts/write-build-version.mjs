/**
 * Writes src/generated/app-version.json — a build-time-only, non-sensitive snapshot of the
 * git commit/branch and build timestamp, read at request time by src/lib/app-version.ts and
 * served (read-only) from /api/version. Closes FT-3 (UAT deployed-commit confirmation) by
 * giving every future build a verifiable identity.
 *
 * Safe by construction:
 * - Only shells out to `git rev-parse`/`git branch` — no network, no database, no secret.
 * - Never throws: any failure (e.g. no .git directory in some deploy target) falls back to
 *   "unknown" so this can never break `npm run build`.
 * - The generated file is gitignored (see .gitignore) — it is build output, not source, and
 *   would be stale/misleading if committed (it reflects whoever happened to run the build).
 */
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

function safeGit(cmd, fallback = "unknown") {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || fallback;
  } catch {
    return fallback;
  }
}

const gitCommit = safeGit("git rev-parse --short HEAD");
const gitBranch = safeGit("git branch --show-current");
const buildTimestamp = new Date().toISOString();

const outDir = path.join(process.cwd(), "src", "generated");
const outFile = path.join(outDir, "app-version.json");

try {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, JSON.stringify({ gitCommit, gitBranch, buildTimestamp }, null, 2) + "\n");
  console.log(`✓ Wrote ${path.relative(process.cwd(), outFile)} — commit ${gitCommit} on ${gitBranch}`);
} catch (e) {
  // Never fail the build over a missing version marker.
  console.warn(`⚠ Could not write build version file: ${e.message}`);
}
