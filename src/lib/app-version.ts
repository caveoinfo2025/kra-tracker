/**
 * Non-sensitive app/build identity — server-side only. Built for FT-3 (UAT post-migration
 * sign-off): lets `/api/version` answer "what commit is actually deployed here?" without ever
 * touching the database or exposing a secret.
 *
 * Priority per field: explicit env var → build-time-generated `app-version.json`
 * (written by `scripts/write-build-version.mjs`, gitignored, never committed) → safe literal
 * fallback. Never reads/returns `DATABASE_URL` or any credential — only git/build identity.
 */
import fs from "node:fs";
import path from "node:path";

export interface AppVersionInfo {
  appName: string;
  environment: string;
  gitCommit: string;
  gitBranch: string;
  buildTimestamp: string;
  nodeEnv: string;
}

interface GeneratedVersionFile {
  gitCommit?: string;
  gitBranch?: string;
  buildTimestamp?: string;
}

function readGeneratedVersionFile(): GeneratedVersionFile {
  try {
    const filePath = path.join(process.cwd(), "src", "generated", "app-version.json");
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as GeneratedVersionFile;
  } catch {
    // Not generated for this build (e.g. local dev without `npm run version:write`) — fine.
    return {};
  }
}

export function getAppVersionInfo(): AppVersionInfo {
  const generated = readGeneratedVersionFile();

  return {
    appName: process.env.NEXT_PUBLIC_APP_VERSION || "Caveo CRM",
    environment: process.env.NEXT_PUBLIC_DEPLOY_ENV || "local",
    gitCommit: process.env.NEXT_PUBLIC_GIT_COMMIT || generated.gitCommit || "unknown",
    gitBranch: process.env.NEXT_PUBLIC_GIT_BRANCH || generated.gitBranch || "unknown",
    buildTimestamp:
      process.env.NEXT_PUBLIC_BUILD_TIME || generated.buildTimestamp || "not-set",
    nodeEnv: process.env.NODE_ENV || "unknown",
  };
}
