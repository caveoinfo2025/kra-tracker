/**
 * Public, unauthenticated build-identity endpoint (see `auth.config.ts`'s `isPublic` allowlist
 * for why this one route is exempt from the global auth gate). Exists to close FT-3 — lets
 * anyone (no login required) confirm which commit is actually deployed at a given URL, without
 * exposing the database or any credential. Returns only non-sensitive build metadata.
 */
import { NextResponse } from "next/server";
import { getAppVersionInfo } from "@/lib/app-version";

export async function GET() {
  const { appName, environment, gitCommit, gitBranch, buildTimestamp, nodeEnv } =
    getAppVersionInfo();

  return NextResponse.json(
    { app: appName, environment, gitCommit, gitBranch, buildTimestamp, nodeEnv },
    { headers: { "Cache-Control": "no-store, must-revalidate" } }
  );
}
