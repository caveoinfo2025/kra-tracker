/**
 * One-off fix: UAT's .env has DATABASE_URL pointing at the remote MySQL
 * hostname (srv2201.hstgr.io), but the UAT Node app runs on the SAME
 * Hostinger server as its database — it must connect via 127.0.0.1, per
 * .env.uat.example and the project's documented MySQL connection rule.
 * Routing same-server traffic through the public remote-MySQL hostname
 * causes the pool to hang ("pool timeout ... active=0 idle=0").
 *
 * This script does ONLY three things, in order:
 *   1. Back up the current .env (timestamped copy, same directory)
 *   2. Replace the DATABASE_URL host segment: srv2201.hstgr.io -> 127.0.0.1
 *      (sed, exact string match — no other lines touched)
 *   3. touch nodejs/tmp/restart.txt to apply (Passenger hot-reload)
 *
 * It does NOT git pull, npm ci, or rebuild — this is a config-only fix.
 *
 * Usage:
 *   $env:HOSTINGER_SSH_PASSWORD="..."; node scripts/fix-uat-db-host.mjs
 */

import { Client } from "../node_modules/ssh2/lib/index.js";

if (!process.env.HOSTINGER_SSH_PASSWORD) {
  console.error("✗ HOSTINGER_SSH_PASSWORD env var is required (no hardcoded credentials).");
  process.exit(1);
}

const SSH = {
  host:     "145.79.213.54",
  port:     65002,
  username: "u686730471",
  password: process.env.HOSTINGER_SSH_PASSWORD,
};

const UAT_APP_PATH    = process.env.UAT_APP_PATH
  ?? "/home/u686730471/domains/uat.caveoinfosystems.com/public_html";
const UAT_ENV_PATH    = `${UAT_APP_PATH}/.builds/config/.env`;
const UAT_RESTART_TXT = `${UAT_APP_PATH}/nodejs/tmp/restart.txt`;

function run(conn, cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    let out = "", err = "";
    conn.exec(`bash -lc ${JSON.stringify(cmd)}`, (e, stream) => {
      if (e) return reject(e);
      stream.on("data",        (d) => { out += d; process.stdout.write(d); });
      stream.stderr.on("data", (d) => { err += d; if (!opts.quiet) process.stderr.write(d); });
      stream.on("close", (code) => {
        if (code !== 0 && !opts.allowFail) reject(new Error(`Exit ${code}: ${err.trim() || "(no stderr)"}`));
        else resolve(out.trim());
      });
    });
  });
}

// Hostinger prints a login banner (ASCII art, "Welcome back!", server load,
// hPanel link) on every `bash -lc` invocation, which gets captured into
// stdout ahead of the command's real output. Only the LAST non-empty line
// is ever the actual result of our command — strip the banner by taking it.
function lastLine(s) {
  const lines = s.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.length ? lines[lines.length - 1] : "";
}

async function main() {
  const conn = new Client();
  await new Promise((res, rej) => conn.on("ready", res).on("error", rej).connect(SSH));
  console.log("✓ SSH connected\n");

  // 0. Confirm UAT .env exists and currently has the bad host
  console.log("Step 0: Checking UAT .env …");
  const envExists = await run(conn, `test -f "${UAT_ENV_PATH}" && echo yes || echo no`);
  if (lastLine(envExists) !== "yes") {
    conn.end();
    console.error(`✗ UAT .env not found at ${UAT_ENV_PATH}`);
    process.exit(1);
  }
  console.log("✓ UAT .env found");

  const hasBadHost = await run(conn, `grep -c "srv2201.hstgr.io" "${UAT_ENV_PATH}" || true`, { allowFail: true });
  if (lastLine(hasBadHost) === "0" || lastLine(hasBadHost) === "") {
    conn.end();
    console.error("✗ srv2201.hstgr.io not found in DATABASE_URL — .env may have already been fixed, or the format differs from expected. Aborting without changes.");
    process.exit(1);
  }
  console.log("✓ Confirmed bad host present in .env");

  // 1. Backup
  const stamp = await run(conn, `date +%Y%m%d%H%M%S`);
  const backupPath = `${UAT_ENV_PATH}.bak.${lastLine(stamp)}`;
  console.log(`\nStep 1: Backing up .env to ${backupPath} …`);
  await run(conn, `cp "${UAT_ENV_PATH}" "${backupPath}"`);
  console.log("✓ Backup created");

  // 2. Fix the host (exact string replace, only inside DATABASE_URL's host segment)
  console.log("\nStep 2: Patching DATABASE_URL host srv2201.hstgr.io -> 127.0.0.1 …");
  await run(conn, `sed -i 's/srv2201\\.hstgr\\.io/127.0.0.1/' "${UAT_ENV_PATH}"`);
  const verify = await run(conn, `grep "DATABASE_URL" "${UAT_ENV_PATH}" | sed -E 's#(://[^:]+:)[^@]+(@)#\\1***\\2#'`);
  console.log(`✓ New DATABASE_URL (password redacted): ${lastLine(verify)}`);

  // 3. Restart Passenger
  console.log("\nStep 3: Restarting UAT app …");
  await run(conn, `mkdir -p "$(dirname "${UAT_RESTART_TXT}")" && touch "${UAT_RESTART_TXT}"`);
  console.log("✓ Restart triggered");

  conn.end();
  console.log("\n✓ Fix applied. Wait ~10-15s for Passenger to respawn the worker, then check https://uat.caveoinfosystems.com");
  console.log(`  Rollback if needed: cp "${backupPath}" "${UAT_ENV_PATH}" && touch "${UAT_RESTART_TXT}"`);
}

main().catch((e) => { console.error("\n✗", e.message); process.exit(1); });
