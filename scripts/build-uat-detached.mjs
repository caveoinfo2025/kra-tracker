/**
 * Resilient UAT build: launches `npm run build` DETACHED on the server
 * (via setsid+nohup) so it survives SSH channel drops, then polls a
 * sentinel file until the build finishes. On success, restarts Passenger.
 *
 * Hostinger's shared CPU makes the Next.js TypeScript/page-collection phase
 * slow; an inline SSH exec channel gets killed (SIGHUP) if it idles too long,
 * which leaves a partial .next with no BUILD_ID. Detaching avoids that.
 *
 * Usage: node scripts/build-uat-detached.mjs
 */

import { Client } from "../node_modules/ssh2/lib/index.js";

if (!process.env.HOSTINGER_SSH_PASSWORD) {
  console.error("✗ HOSTINGER_SSH_PASSWORD env var is required (no hardcoded credentials).");
  process.exit(1);
}

const SSH = {
  host:              "145.79.213.54",
  port:              65002,
  username:          "u686730471",
  password:          process.env.HOSTINGER_SSH_PASSWORD,
  keepaliveInterval: 10000,
  keepaliveCountMax: 120,
};

const APP        = "/home/u686730471/domains/uat.caveoinfosystems.com/public_html";
const ENV_PATH   = `${APP}/.builds/config/.env`;
const NODE_BIN   = "/opt/alt/alt-nodejs22/root/usr/bin";
const LOG        = `${APP}/uat-build.log`;
const DONE       = `${APP}/uat-build.done`;   // contains the build's exit code
const RESTART    = `${APP}/nodejs/tmp/restart.txt`;

function run(conn, cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    let out = "", err = "";
    conn.exec(`bash -c ${JSON.stringify(cmd)}`, (e, stream) => {
      if (e) return reject(e);
      stream.on("data",        (d) => { out += d; });
      stream.stderr.on("data", (d) => { err += d; });
      stream.on("close", (code, signal) => {
        const ec = code ?? (signal ? 1 : 0);
        if (ec !== 0 && !opts.allowFail) reject(new Error(`Exit ${ec}: ${err.trim() || out.trim() || "(no output)"}`));
        else resolve(out.trim());
      });
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const conn = new Client();
  await new Promise((res, rej) => conn.on("ready", res).on("error", rej).connect(SSH));
  console.log("✓ SSH connected\n");

  // Sync latest uat branch (brings SKIP_BUILD_CHECKS-aware next.config.ts)
  console.log("Step 0: Syncing uat branch …");
  await run(conn, `cd ${APP} && git fetch origin && git checkout uat && git reset --hard origin/uat`);
  const headSha = await run(conn, `cd ${APP} && git rev-parse --short HEAD`, { allowFail: true });
  console.log(`✓ uat at ${headSha}`);

  // Clean stale sentinels and any partial .next
  console.log("\nStep 1: Cleaning previous build artifacts …");
  await run(conn, `rm -f ${LOG} ${DONE}; rm -rf ${APP}/.next`);
  console.log("✓ Cleaned");

  // Launch build detached. The subshell sources env, runs build, then records
  // the exit code into the DONE sentinel. setsid fully detaches from our channel.
  console.log("\nStep 2: Launching detached build …");
  const buildCmd =
    `cd ${APP} && ` +
    `set -a && . ${ENV_PATH} && set +a && ` +
    `export PATH="${NODE_BIN}:$PATH" RAYON_NUM_THREADS=1 SKIP_BUILD_CHECKS=1 && ` +
    `( npm run build > ${LOG} 2>&1; echo $? > ${DONE} )`;
  // setsid + nohup so it keeps running after we disconnect
  await run(conn, `setsid nohup bash -c ${JSON.stringify(buildCmd)} > /dev/null 2>&1 &`, { allowFail: true });
  console.log("✓ Build launched in background");

  // Poll for the DONE sentinel — ONE exec per cycle, every 20s, to keep
  // fork pressure on the shared host minimal. The sentinel holds the exit code.
  console.log("\nStep 3: Polling for completion (this can take several minutes) …");
  const startedAt = Date.now();
  const MAX_MS = 15 * 60 * 1000; // 15 min cap
  let exitCode = null;

  while (Date.now() - startedAt < MAX_MS) {
    await sleep(20000);
    const doneRaw = await run(conn, `cat ${DONE} 2>/dev/null || echo PENDING`, { allowFail: true });
    if (doneRaw.trim() !== "PENDING" && doneRaw.trim() !== "") {
      exitCode = parseInt(doneRaw.trim(), 10);
      break;
    }
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    console.log(`  … still building (${elapsed}s elapsed)`);
  }

  if (exitCode === null) {
    conn.end();
    throw new Error("Build timed out after 15 min — check uat-build.log on the server");
  }

  if (exitCode !== 0) {
    console.log(`\n✗ Build FAILED (exit ${exitCode}). Last 40 log lines:`);
    const logTail = await run(conn, `tail -40 ${LOG}`, { allowFail: true });
    console.log(logTail);
    conn.end();
    process.exit(1);
  }

  // Verify BUILD_ID exists
  const buildId = await run(conn, `cat ${APP}/.next/BUILD_ID 2>/dev/null || echo MISSING`, { allowFail: true });
  console.log(`\n✓ Build complete — BUILD_ID: ${buildId.trim()}`);

  // Restart Passenger
  console.log("\nStep 4: Restarting UAT app …");
  await run(conn, `mkdir -p ${APP}/nodejs/tmp && touch ${RESTART}`, { allowFail: true });
  console.log("✓ Passenger restart triggered");

  conn.end();
  console.log("\n✓ UAT build + deploy complete → https://uat.caveoinfosystems.com");
}

main().catch((e) => { console.error("\n✗", e.message); process.exit(1); });
