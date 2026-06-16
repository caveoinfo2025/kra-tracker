/**
 * Deploys the `uat` branch to the UAT Node.js app on Hostinger via SSH.
 *
 * Usage: node scripts/deploy-uat.mjs
 *
 * What it does:
 *   1. SSH into the Hostinger server
 *   2. cd to the UAT app directory
 *   3. git pull origin uat
 *   4. npm ci --omit=dev
 *   5. npm run build  (prisma migrate deploy + generate + next build)
 *   6. touch nodejs/tmp/restart.txt  (Passenger hot-reload)
 *
 * Prerequisites:
 *   - `uat` branch pushed to origin (git push origin uat)
 *   - UAT Node.js app created in hPanel pointing to UAT_APP_PATH
 *   - UAT .env file in place at UAT_APP_PATH/.builds/config/.env
 */

import { Client } from "../node_modules/ssh2/lib/index.js";

const SSH = {
  host:     "145.79.213.54",
  port:     65002,
  username: "u686730471",
  password: "C@veo@2026",
};

// Update this to the exact path shown in hPanel for the UAT Node.js app
const UAT_APP_PATH    = process.env.UAT_APP_PATH
  ?? "/home/u686730471/domains/uat.caveoinfosystems.com/public_html";
const UAT_RESTART_TXT = `${UAT_APP_PATH}/nodejs/tmp/restart.txt`;
const UAT_ENV_PATH    = `${UAT_APP_PATH}/.builds/config/.env`;
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

async function main() {
  const conn = new Client();
  await new Promise((res, rej) => conn.on("ready", res).on("error", rej).connect(SSH));
  console.log("✓ SSH connected\n");

  // 0. Confirm UAT .env exists
  console.log("Step 0: Checking UAT .env …");
  const envExists = await run(conn, `test -f "${UAT_ENV_PATH}" && echo yes || echo no`);
  if (envExists.trim() !== "yes") {
    conn.end();
    console.error(`✗ UAT .env not found at ${UAT_ENV_PATH}`);
    console.error("  Create it first — see .env.uat.example for the required keys.");
    process.exit(1);
  }
  console.log("✓ UAT .env found");

  // 1. Git pull uat branch
  console.log("\nStep 1: git pull origin uat …");
  await run(conn, `cd "${UAT_APP_PATH}" && git fetch origin && git checkout uat && git reset --hard origin/uat`);
  console.log("✓ Code updated");

  // 2. Install dependencies
  console.log("\nStep 2: npm ci …");
  await run(conn, `cd "${UAT_APP_PATH}" && PATH="${NODE_BIN}:$PATH" npm ci --omit=dev`);
  console.log("✓ Dependencies installed");

  // 3. Build (runs prisma migrate deploy + prisma generate + next build)
  console.log("\nStep 3: npm run build …");
  await run(conn,
    `cd "${UAT_APP_PATH}" && ` +
    `set -a && source "${UAT_ENV_PATH}" && set +a && ` +
    `PATH="${NODE_BIN}:$PATH" npm run build`
  );
  console.log("✓ Build complete");

  // 4. Restart Passenger
  console.log("\nStep 4: Restarting UAT app …");
  await run(conn, `mkdir -p "$(dirname "${UAT_RESTART_TXT}")" && touch "${UAT_RESTART_TXT}"`);
  console.log("✓ UAT app restarted");

  conn.end();
  console.log("\n✓ UAT deploy complete → https://uat.caveoinfosystems.com");
}

main().catch((e) => { console.error("\n✗", e.message); process.exit(1); });
