import type { NextConfig } from "next";

// On Hostinger's shared CloudLinux host the in-build TypeScript + ESLint
// passes fork many workers and can trip the LVE process limit
// (`bash: fork: Resource temporarily unavailable`). When SKIP_BUILD_CHECKS=1
// is set we skip those redundant in-build checks — type-safety is still
// guaranteed by the separate `npx tsc --noEmit` run in the workflow.
// Prod builds (which do NOT set this var) are unaffected and keep full checks.
const skipBuildChecks = process.env.SKIP_BUILD_CHECKS === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(skipBuildChecks
    ? {
        typescript: { ignoreBuildErrors: true },
        eslint: { ignoreDuringBuilds: true },
        // Single CPU → Next runs page-data collection / static generation
        // in-process instead of spawning jest-worker child processes. On this
        // restricted CloudLinux host the worker pool can't be signalled on
        // cleanup (`kill EPERM`), which aborts the build before BUILD_ID is
        // written. In-process generation sidesteps that entirely.
        experimental: { cpus: 1, workerThreads: false },
      }
    : {}),
};

export default nextConfig;
