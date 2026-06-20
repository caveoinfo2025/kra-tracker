/**
 * Recovery fix: UAT's .env DATABASE_URL line is corrupted on disk — it was
 * found to literally contain "DATABASE_URL='mysql://...'" doubled inside
 * itself (the exact garbled value from an earlier build error appears to
 * have been pasted back into the .env as if it were the correct value).
 *
 * Rather than try to regex-unwrap an arbitrarily-corrupted line, this
 * script REPLACES the DATABASE_URL line outright with a known-clean value
 * you supply at runtime, and ALSO writes DB_HOST/DB_PORT/DB_USER/
 * DB_PASSWORD/DB_NAME (parsed from that same clean value) so
 * src/lib/prisma.ts's resolveDbConfig() uses the explicit vars at runtime
 * and never needs to parse DATABASE_URL again.
 *
 * No credential is hardcoded in this file — the connection string is read
 * from the UAT_DATABASE_URL env var you set in your own terminal.
 *
 * Usage (PowerShell):
 *   $env:HOSTINGER_SSH_PASSWORD = "your-hostinger-ssh-password"
 *   $env:UAT_DATABASE_URL       = "mysql://u686730471_caveouat:Caveo%402026@127.0.0.1:3306/u686730471_Caveo_UAT"
 *   node scripts/fix-uat-database-url.mjs
 */

import { Client } from "../node_modules/ssh2/lib/index.js";

if (!process.env.HOSTINGER_SSH_PASSWORD) {
  console.error("✗ HOSTINGER_SSH_PASSWORD env var is required (no hardcoded credentials).");
  process.exit(1);
}
if (!process.env.UAT_DATABASE_URL) {
  console.error("✗ UAT_DATABASE_URL env var is required, e.g.:");
  console.error("  mysql://u686730471_caveouat:Caveo%402026@127.0.0.1:3306/u686730471_Caveo_UAT");
  process.exit(1);
}

let parsedUrl;
try {
  parsedUrl = new URL(process.env.UAT_DATABASE_URL);
} catch {
  console.error("✗ UAT_DATABASE_URL is not a valid URL. Aborting.");
  process.exit(1);
}
if (parsedUrl.protocol !== "mysql:") {
  console.error(`✗ Expected a mysql:// URL, got protocol "${parsedUrl.protocol}". Aborting.`);
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

const dbVars = {
  DB_HOST:     parsedUrl.hostname,
  DB_PORT:     parsedUrl.port || "3306",
  DB_USER:     decodeURIComponent(parsedUrl.username),
  DB_PASSWORD: decodeURIComponent(parsedUrl.password),
  DB_NAME:     parsedUrl.pathname.replace(/^\//, ""),
};
const cleanDatabaseUrl = process.env.UAT_DATABASE_URL;

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

/** Idempotent upsert: replaces the line if present, else appends. Same
 *  proven pattern as fix-uat-db-host.mjs's sed -i — no command substitution
 *  or shell variables, just an inlined escaped literal, so there's nothing
 *  for an extra shell layer to mis-expand. */
function setEnvLine(conn, envPath, key, value) {
  const escaped = value.replace(/'/g, "'\\''");
  return run(
    conn,
    `if grep -q "^${key}=" "${envPath}"; then ` +
      `sed -i "s#^${key}=.*#${key}='${escaped}'#" "${envPath}"; ` +
    `else ` +
      `echo "${key}='${escaped}'" >> "${envPath}"; ` +
    `fi`,
    { quiet: true },
  );
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

  const stamp = await run(conn, `date +%Y%m%d%H%M%S`);
  const backupPath = `${UAT_ENV_PATH}.bak.${lastLine(stamp)}`;
  console.log(`\nBacking up .env to ${backupPath} …`);
  await run(conn, `cp "${UAT_ENV_PATH}" "${backupPath}"`);
  console.log("✓ Backup created");

  console.log("\nReplacing DATABASE_URL with a clean, single line …");
  await setEnvLine(conn, UAT_ENV_PATH, "DATABASE_URL", cleanDatabaseUrl);
  console.log("✓ DATABASE_URL rewritten");

  console.log("\nSetting DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME …");
  for (const [key, value] of Object.entries(dbVars)) {
    await setEnvLine(conn, UAT_ENV_PATH, key, value);
    console.log(`  ✓ ${key}${key === "DB_PASSWORD" ? "=***" : `=${value}`}`);
  }

  const verify = await run(conn, `grep -E "^(DATABASE_URL|DB_HOST|DB_PORT|DB_USER|DB_NAME)=" "${UAT_ENV_PATH}" | sed -E "s#(://[^:]+:)[^@]+(@)#\\1***\\2#"`, { quiet: true });
  console.log("\n✓ Verified in .env (password redacted):");
  console.log(lastLine(verify) === verify ? verify : verify.split("\n").map((l) => "  " + l).join("\n"));

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
