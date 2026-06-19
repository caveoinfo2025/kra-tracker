/**
 * Copies the production MariaDB database to the dev database.
 * Runs entirely server-side (no local data transfer).
 *
 * Usage: node scripts/db-copy-prod-to-dev.mjs
 */

import { Client } from "../node_modules/ssh2/lib/index.js";

if (!process.env.HOSTINGER_SSH_PASSWORD || !process.env.DEV_DB_PASS) {
  console.error("✗ HOSTINGER_SSH_PASSWORD and DEV_DB_PASS env vars are required (no hardcoded credentials).");
  process.exit(1);
}

const SSH = {
  host:     "145.79.213.54",
  port:     65002,
  username: "u686730471",
  password: process.env.HOSTINGER_SSH_PASSWORD,
};

const PROD_ENV_PATH = "/home/u686730471/domains/sales.caveoinfosystems.com/public_html/.builds/config/.env";
const DUMP_FILE     = "/tmp/caveo_prod_dump.sql";

const DEV_HOST = "srv2201.hstgr.io";
const DEV_DB   = "u686730471_caveodev";
const DEV_USER = "u686730471_devuser";
const DEV_PASS = process.env.DEV_DB_PASS;

function run(conn, cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    let out = "", err = "";
    conn.exec(cmd, (e, stream) => {
      if (e) return reject(e);
      stream.on("data",        (d) => { out += d; process.stdout.write(d); });
      stream.stderr.on("data", (d) => { err += d; });
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

  // 1. Read and parse prod credentials
  const envRaw = await run(conn, `cat "${PROD_ENV_PATH}"`);
  const urlLine = envRaw.split("\n").find(l => /DATABASE_URL/.test(l) && !l.trimStart().startsWith("#"));
  const match = urlLine?.match(/DATABASE_URL\s*=\s*['"]?mysql:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^'"\s]+)/);
  if (!match) throw new Error("Cannot parse DATABASE_URL from prod .env");

  const [, prodUser, prodPassEncoded, prodHost, , prodDb] = match;
  const prodPass = decodeURIComponent(prodPassEncoded.replace(/\\%/g, "%"));
  console.log(`\nProd: ${prodDb} @ ${prodHost} (user: ${prodUser})`);
  console.log(`Dev:  ${DEV_DB} @ ${DEV_HOST} (user: ${DEV_USER})\n`);

  // 2. Dump prod to temp file — use MYSQL_PWD to avoid shell-quoting the password
  console.log(`Step 1: Dumping ${prodDb} to ${DUMP_FILE} …`);
  await run(conn, `MYSQL_PWD='${prodPass}' mysqldump -h ${prodHost} -u ${prodUser} --single-transaction --add-drop-table ${prodDb} > ${DUMP_FILE}`);

  const sizeOut = await run(conn, `wc -c < ${DUMP_FILE}`);
  const sizeKB  = Math.round(Number(sizeOut.trim()) / 1024);
  console.log(`\n✓ Dump complete — ${sizeKB} KB`);

  if (sizeKB < 10) throw new Error("Dump file suspiciously small — aborting import");

  // 3. Import into dev DB
  console.log(`\nStep 2: Importing into ${DEV_DB} …`);
  await run(conn, `MYSQL_PWD='${DEV_PASS}' mysql -h ${DEV_HOST} -u ${DEV_USER} --init-command="SET foreign_key_checks=0;" ${DEV_DB} < ${DUMP_FILE} 2>/dev/null`);
  console.log("✓ Import complete");

  // 4. Check which migrations are in dev now
  console.log("\nStep 3: Migrations in dev DB after import …");
  const migrations = await run(conn, `MYSQL_PWD='${DEV_PASS}' mysql -h ${DEV_HOST} -u ${DEV_USER} ${DEV_DB} -se "SELECT migration_name FROM _prisma_migrations ORDER BY started_at;" 2>/dev/null`);
  console.log(migrations);

  // 5. Sanity check
  console.log("\nStep 4: Row counts in dev DB:");
  const counts = await run(conn,
    `MYSQL_PWD='${DEV_PASS}' mysql -h ${DEV_HOST} -u ${DEV_USER} ${DEV_DB} 2>/dev/null -e "` +
    `SELECT 'Employee' t, COUNT(*) n FROM Employee ` +
    `UNION ALL SELECT 'Collection', COUNT(*) FROM Collection ` +
    `UNION ALL SELECT 'CrmLead', COUNT(*) FROM CrmLead ` +
    `UNION ALL SELECT 'SalesFunnel', COUNT(*) FROM SalesFunnel ` +
    `UNION ALL SELECT 'Payment', COUNT(*) FROM Payment;"`
  );
  console.log(counts);

  // 6. Cleanup
  await run(conn, `rm -f ${DUMP_FILE}`, { allowFail: true });

  conn.end();
  console.log("\n✓ Dev DB now mirrors production data.");
  console.log("⚠  Run the following to re-apply dev-only schema migrations (Phase 1–7):");
  console.log("   $env:DATABASE_URL=\"mysql://u686730471_devuser:Caveo%402026@srv2201.hstgr.io:3306/u686730471_caveodev\"");
  console.log("   npx prisma migrate deploy");
  console.log("   npx prisma generate");
}

main().catch((e) => { console.error("\n✗", e.message); process.exit(1); });
