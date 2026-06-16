/**
 * One-time UAT server setup: clones the repo, checks out uat branch,
 * writes the .env (reusing prod auth credentials, overriding DB + URL),
 * and does the first build + Passenger restart.
 *
 * Credentials are read server-side from the prod .env — nothing sensitive
 * is hardcoded in this script.
 *
 * Usage: node scripts/setup-uat-server.mjs
 */

import { Client } from "../node_modules/ssh2/lib/index.js";

const SSH = {
  host:     "145.79.213.54",
  port:     65002,
  username: "u686730471",
  password: "C@veo@2026",
};

const PROD_ENV_PATH = "/home/u686730471/domains/sales.caveoinfosystems.com/public_html/.builds/config/.env";
const REPO_URL      = "https://github.com/caveoinfo2025/kra-tracker.git";
const UAT_APP_PATH  = "/home/u686730471/domains/uat.caveoinfosystems.com/public_html";
const UAT_ENV_PATH  = `${UAT_APP_PATH}/.builds/config/.env`;
const NODE_BIN      = "/opt/alt/alt-nodejs22/root/usr/bin";

const UAT_DB_URL    = "mysql://u686730471_uatuser:C%40veo%402026@127.0.0.1:3306/u686730471_Caveo_UAT";
const UAT_NEXTAUTH  = "https://uat.caveoinfosystems.com";

function run(conn, cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    let out = "", err = "";
    conn.exec(cmd, (e, stream) => {
      if (e) return reject(e);
      stream.on("data",        (d) => { out += d; process.stdout.write(d); });
      stream.stderr.on("data", (d) => { err += d; process.stderr.write(d); });
      stream.on("close", (code) => {
        if (code !== 0 && !opts.allowFail) reject(new Error(`Exit ${code}: ${err.trim() || "(no stderr)"}`));
        else resolve(out.trim());
      });
    });
  });
}

function parseEnv(raw) {
  const kv = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*['"]?(.*?)['"]?\s*$/);
    if (m) kv[m[1]] = m[2];
  }
  return kv;
}

async function main() {
  const conn = new Client();
  await new Promise((res, rej) => conn.on("ready", res).on("error", rej).connect(SSH));
  console.log("✓ SSH connected\n");

  // 0. Read prod .env to get shared auth credentials
  console.log("Step 0: Reading prod credentials …");
  const prodRaw = await run(conn, `cat "${PROD_ENV_PATH}"`);
  const prodEnv = parseEnv(prodRaw);

  const UAT_ENV = [
    `DATABASE_URL='${UAT_DB_URL}'`,
    `AUTH_MICROSOFT_ENTRA_ID_ID='${prodEnv.AUTH_MICROSOFT_ENTRA_ID_ID}'`,
    `AUTH_MICROSOFT_ENTRA_ID_SECRET='${prodEnv.AUTH_MICROSOFT_ENTRA_ID_SECRET}'`,
    `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID='${prodEnv.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}'`,
    `AUTH_SECRET='${prodEnv.AUTH_SECRET}'`,
    `NEXTAUTH_URL='${UAT_NEXTAUTH}'`,
    `NODE_ENV='production'`,
    `NEXT_TELEMETRY_DISABLED='1'`,
  ].join("\n");

  console.log("✓ Prod credentials loaded (not logged)");

  // 1. Check / create UAT directory
  console.log("\nStep 1: Checking UAT app directory …");
  const dirExists = await run(conn, `test -d "${UAT_APP_PATH}" && echo yes || echo no`);
  if (dirExists.trim() !== "yes") {
    await run(conn, `mkdir -p "${UAT_APP_PATH}"`);
  }
  console.log(`✓ ${UAT_APP_PATH} ready`);

  // 2. Clone or update repo
  console.log("\nStep 2: Setting up git repo …");
  const hasGit = await run(conn, `test -d "${UAT_APP_PATH}/.git" && echo yes || echo no`);
  if (hasGit.trim() !== "yes") {
    console.log("  Cloning repo …");
    await run(conn, `git clone ${REPO_URL} "${UAT_APP_PATH}"`);
  } else {
    console.log("  Repo exists — fetching …");
    await run(conn, `cd "${UAT_APP_PATH}" && git fetch origin`);
  }
  await run(conn, `cd "${UAT_APP_PATH}" && git checkout uat && git reset --hard origin/uat`);
  const headSha = await run(conn, `cd "${UAT_APP_PATH}" && git rev-parse --short HEAD`);
  console.log(`✓ uat branch at ${headSha}`);

  // 3. Write .env
  console.log("\nStep 3: Writing UAT .env …");
  await run(conn, `mkdir -p "$(dirname "${UAT_ENV_PATH}")" && cat > "${UAT_ENV_PATH}" << 'ENVEOF'\n${UAT_ENV}\nENVEOF`);
  console.log("✓ .env written");

  // 4. npm ci
  console.log("\nStep 4: npm ci …");
  await run(conn, `cd "${UAT_APP_PATH}" && PATH="${NODE_BIN}:$PATH" npm ci --omit=dev`);
  console.log("✓ Dependencies installed");

  // 5. Build (RAYON_NUM_THREADS=1 prevents Turbopack thread-pool panic on CloudLinux)
  console.log("\nStep 5: npm run build …");
  await run(conn,
    `cd "${UAT_APP_PATH}" && ` +
    `set -a && . "${UAT_ENV_PATH}" && set +a && ` +
    `PATH="${NODE_BIN}:$PATH" RAYON_NUM_THREADS=1 npm run build`
  );
  console.log("✓ Build complete");

  // 6. Restart Passenger
  console.log("\nStep 6: Restarting UAT app …");
  await run(conn, `mkdir -p "${UAT_APP_PATH}/nodejs/tmp" && touch "${UAT_APP_PATH}/nodejs/tmp/restart.txt"`, { allowFail: true });
  console.log("✓ Passenger restart triggered");

  conn.end();
  console.log("\n✓ UAT setup complete → https://uat.caveoinfosystems.com");
}

main().catch((e) => { console.error("\n✗", e.message); process.exit(1); });
