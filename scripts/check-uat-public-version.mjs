/**
 * Closes FT-3 going forward: fetches the public, unauthenticated /api/version endpoint on
 * UAT and compares its gitCommit to the local repo's current commit. No SSH, no credentials,
 * no database access — just an HTTPS GET against a route that auth.config.ts explicitly
 * allows through unauthenticated (see the `isPublic` allowlist there).
 *
 * Exit codes are informational only (never used to gate CI here): 0 always, the printed
 * verdict is what matters.
 */
import { execSync } from "node:child_process";

const UAT_URL = process.env.UAT_VERSION_URL || "https://uat.caveoinfosystems.com/api/version";

function safeGit(cmd, fallback = "unknown") {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || fallback;
  } catch {
    return fallback;
  }
}

const localCommit = safeGit("git rev-parse --short HEAD");
const localBranch = safeGit("git branch --show-current");

console.log(`Local commit:  ${localCommit} (branch ${localBranch})`);
console.log(`Checking:      ${UAT_URL}`);

let remote;
try {
  const res = await fetch(UAT_URL, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    console.log(`\nVerdict: UNAVAILABLE — HTTP ${res.status} from ${UAT_URL}`);
    console.log("(Expected if this route has not been deployed to UAT yet.)");
    process.exit(0);
  }
  remote = await res.json();
} catch (e) {
  console.log(`\nVerdict: UNAVAILABLE — could not reach ${UAT_URL} (${e.message})`);
  process.exit(0);
}

console.log(`Remote commit: ${remote.gitCommit} (branch ${remote.gitBranch}, built ${remote.buildTimestamp})`);

if (!remote.gitCommit || remote.gitCommit === "unknown") {
  console.log("\nVerdict: UNKNOWN — UAT responded but has no build-time commit recorded.");
  console.log("(Likely deployed before `npm run version:write` was wired into `npm run build`.)");
} else if (remote.gitCommit === localCommit) {
  console.log("\nVerdict: MATCH — deployed UAT commit equals local HEAD.");
} else {
  console.log("\nVerdict: MISMATCH — deployed UAT commit differs from local HEAD.");
}

process.exit(0);
