/**
 * Follow-up fix: UAT's `npm run build` failed with `TypeError: Invalid URL`
 * because process.env.DATABASE_URL was observed to contain the ENTIRE
 * line — "DATABASE_URL='mysql://...'" (key name + quotes included) — not
 * just the value. Something in Hostinger's env-injection path is mangling
 * it (the same general class of issue as the documented %->\% escaping
 * quirk), and src/lib/prisma.ts's resolveDbConfig() has no way to recover
 * from a garbled DATABASE_URL once that's happened.
 *
 * resolveDbConfig() already prefers explicit DB_* vars over DATABASE_URL
 * when DB_HOST is present, and skips DATABASE_URL parsing entirely in that
 * case. This script adds DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME to the
 * UAT .env (idempotent: updates the line if already present with a
 * different value, else appends).
 *
 * No credentials are hardcoded here — the DB_* values are PARSED from the
 * DATABASE_URL line already present in the remote .env file (fetched fresh
 * over SSH, used only in-memory, never written to this script or any local
 * file). DATABASE_URL itself is left untouched in the .env — prisma.config.ts
 * still wants *some* value there for `prisma generate`, which already
 * succeeds today and isn't part of this bug.
 *
 * After this runs you still need to re-run the build (the previous build
 * failed, so there's no fresh .next to restart into) — see the printed
 * next-step command at the end.
 *
 * Usage:
 *   $env:HOSTINGER_SSH_PASSWORD="..."; node scripts/fix-uat-db-env-vars.mjs
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
const NODE_BIN        = "/opt/alt/alt-nodejs22/root/usr/bin";

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

// Hostinger prints a login banner on every `bash -lc` invocation — only the
// last non-empty line of any command's output is ever the real result.
function lastLine(s) {
  const lines = s.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.length ? lines[lines.length - 1] : "";
}

/** Parses key='...' or key="..." or key=... (no quotes) from a raw .env line. */
function parseEnvLine(line) {
  const m = line.match(/^[A-Z_]+=(?:'([^']*)'|"([^"]*)"|(.*))$/);
  if (!m) return null;
  return m[1] ?? m[2] ?? m[3] ?? "";
}

async function main() {
  const conn = new Client();
  await new Promise((res, rej) => conn.on("ready", res).on("error", rej).connect(SSH));
  console.log("✓ SSH connected\n");

  const envExists = await run(conn, `test -f "${UAT_ENV_PATH}" && echo yes || echo no`);
  if (lastLine(envExists) !== "yes") {
    conn.end();
    console.error(`✗ UAT .env not found at ${UAT_ENV_PATH}`);
    process.exit(1);
  }
  console.log("✓ UAT .env found");

  // Fetch the current DATABASE_URL line and parse it in-memory only.
  const rawLine = await run(conn, `grep "^DATABASE_URL=" "${UAT_ENV_PATH}"`, { quiet: true });
  const dbUrlRaw = parseEnvLine(lastLine(rawLine));
  if (!dbUrlRaw) {
    conn.end();
    console.error("✗ Could not find/parse a DATABASE_URL= line in the .env file. Aborting without changes.");
    process.exit(1);
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(dbUrlRaw);
  } catch {
    conn.end();
    console.error("✗ DATABASE_URL value in the .env file itself is not a valid URL. Aborting without changes.");
    process.exit(1);
  }

  const dbVars = {
    DB_HOST:     parsedUrl.hostname,
    DB_PORT:     parsedUrl.port || "3306",
    DB_USER:     decodeURIComponent(parsedUrl.username),
    DB_PASSWORD: decodeURIComponent(parsedUrl.password),
    DB_NAME:     parsedUrl.pathname.replace(/^\//, ""),
  };
  console.log(`✓ Parsed from .env's DATABASE_URL: host=${dbVars.DB_HOST} port=${dbVars.DB_PORT} user=${dbVars.DB_USER} db=${dbVars.DB_NAME} (password redacted)`);

  const stamp = await run(conn, `date +%Y%m%d%H%M%S`);
  const backupPath = `${UAT_ENV_PATH}.bak.${lastLine(stamp)}`;
  console.log(`\nBacking up .env to ${backupPath} …`);
  await run(conn, `cp "${UAT_ENV_PATH}" "${backupPath}"`);
  console.log("✓ Backup created");

  console.log("\nEnsuring DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME are set …");
  for (const [key, value] of Object.entries(dbVars)) {
    const escaped = value.replace(/'/g, "'\\''");
    await run(
      conn,
      `if grep -q "^${key}=" "${UAT_ENV_PATH}"; then ` +
        `sed -i "s#^${key}=.*#${key}='${escaped}'#" "${UAT_ENV_PATH}"; ` +
      `else ` +
        `echo "${key}='${escaped}'" >> "${UAT_ENV_PATH}"; ` +
      `fi`,
      { quiet: true },
    );
    console.log(`  ✓ ${key}${key === "DB_PASSWORD" ? "=***" : `=${value}`}`);
  }

  console.log("\n✓ Env vars added. DATABASE_URL left untouched in the .env file.");
  console.log("\nNext step (this script does NOT rebuild) — re-run the build over SSH:");
  console.log(
    `  cd "${UAT_APP_PATH}" && set -a && source "${UAT_ENV_PATH}" && set +a && ` +
    `PATH="${NODE_BIN}:$PATH" RAYON_NUM_THREADS=1 npm run build`,
  );
  console.log(`\nThen restart: touch "${UAT_RESTART_TXT}"`);
  console.log(`\nRollback if needed: cp "${backupPath}" "${UAT_ENV_PATH}"`);

  conn.end();
}

main().catch((e) => { console.error("\n✗", e.message); process.exit(1); });
