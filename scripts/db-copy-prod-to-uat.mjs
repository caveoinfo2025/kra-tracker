/**
 * Copies the production MariaDB database to the UAT database.
 * Runs entirely server-side via SSH (no local data transfer).
 *
 * Usage: node scripts/db-copy-prod-to-uat.mjs
 *
 * Prerequisites:
 *   1. UAT database created in hPanel (u686730471_caveouat / u686730471_uatuser)
 *   2. UAT_DB_PASS set as env var, or hard-code below
 */

import { Client } from "../node_modules/ssh2/lib/index.js";

if (!process.env.HOSTINGER_SSH_PASSWORD || !process.env.UAT_DB_PASS) {
  console.error("✗ HOSTINGER_SSH_PASSWORD and UAT_DB_PASS env vars are required (no hardcoded credentials).");
  process.exit(1);
}

const SSH = {
  host:     "145.79.213.54",
  port:     65002,
  username: "u686730471",
  password: process.env.HOSTINGER_SSH_PASSWORD,
};

const PROD_ENV_PATH = "/home/u686730471/domains/sales.caveoinfosystems.com/public_html/.builds/config/.env";
const DUMP_FILE     = "/tmp/caveo_prod_uat_dump.sql";

const UAT_HOST = "127.0.0.1";
const UAT_DB   = "u686730471_Caveo_UAT";
const UAT_USER = "u686730471_uatuser";
const UAT_PASS = process.env.UAT_DB_PASS;

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
  console.log(`Prod: ${prodDb} @ ${prodHost} (user: ${prodUser})`);
  console.log(`UAT:  ${UAT_DB} @ ${UAT_HOST} (user: ${UAT_USER})\n`);

  // 2. Dump prod
  console.log(`Step 1: Dumping ${prodDb} to ${DUMP_FILE} …`);
  await run(conn, `MYSQL_PWD='${prodPass}' mysqldump -h ${prodHost} -u ${prodUser} --single-transaction --add-drop-table ${prodDb} > ${DUMP_FILE}`);

  const sizeOut = await run(conn, `wc -c < ${DUMP_FILE}`);
  const sizeKB  = Math.round(Number(sizeOut.trim()) / 1024);
  console.log(`\n✓ Dump complete — ${sizeKB} KB`);

  if (sizeKB < 10) throw new Error("Dump file suspiciously small — aborting");

  // 3. Import into UAT DB
  console.log(`\nStep 2: Importing into ${UAT_DB} …`);
  await run(conn, `MYSQL_PWD='${UAT_PASS}' mysql -h ${UAT_HOST} -u ${UAT_USER} --init-command="SET foreign_key_checks=0;" ${UAT_DB} < ${DUMP_FILE}`);
  console.log("✓ Import complete");

  // 4. Apply any pending migrations (finance phase 1+)
  console.log("\nStep 3: Checking migration state in UAT DB …");
  const migrations = await run(conn,
    `MYSQL_PWD='${UAT_PASS}' mysql -h ${UAT_HOST} -u ${UAT_USER} ${UAT_DB} -se "SELECT migration_name FROM _prisma_migrations ORDER BY started_at;"`,
    { allowFail: true }
  );
  console.log(migrations || "(no _prisma_migrations table yet — run prisma migrate deploy on the UAT server after first deploy)");

  // 5. Sanity check
  console.log("\nStep 4: Row counts in UAT DB:");
  const counts = await run(conn,
    `MYSQL_PWD='${UAT_PASS}' mysql -h ${UAT_HOST} -u ${UAT_USER} ${UAT_DB} -e "` +
    `SELECT 'Employee' t, COUNT(*) n FROM Employee ` +
    `UNION ALL SELECT 'CrmLead', COUNT(*) FROM CrmLead ` +
    `UNION ALL SELECT 'SalesFunnel', COUNT(*) FROM SalesFunnel ` +
    `UNION ALL SELECT 'Payment', COUNT(*) FROM Payment ` +
    `UNION ALL SELECT 'Voucher', COUNT(*) FROM Voucher;"`
  );
  console.log(counts);

  // 6. Cleanup
  await run(conn, `rm -f ${DUMP_FILE}`, { allowFail: true });

  conn.end();
  console.log("\n✓ UAT DB now mirrors production data.");
  console.log("Next: run 'node scripts/deploy-uat.mjs' to deploy the uat branch to the UAT server.");
}

main().catch((e) => { console.error("\n✗", e.message); process.exit(1); });
