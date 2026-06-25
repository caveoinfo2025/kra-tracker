/**
 * READ-ONLY pre-migration snapshot for the Daily Activity foundation migration
 * (20260625120000_daily_activity_foundation). Targets the dev DB only — hardcoded guard
 * below refuses to run against anything else. No INSERT/UPDATE/DELETE/DDL — SELECT/SHOW only.
 *
 * This migration is 100% additive (6 new tables + one nullable-with-default column on
 * CrmMeeting), so a full mysqldump is not proportionate to the risk — mysqldump is also not
 * available in this environment. This snapshot captures row counts for every table the
 * migration touches (CrmMeeting) or is adjacent to (DailyUpdate, CrmActivity — explicitly to
 * prove they are untouched), plus current migration history, as the rollback/verification
 * baseline. Run: node prisma/snapshot-daily-activity-foundation-pre-migration.mjs
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const mariadb = require("mariadb/promise.js");
const dotenv  = require("dotenv");
dotenv.config();

const url = process.env.DATABASE_URL || "";
const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (!m) { console.error("Could not parse DATABASE_URL"); process.exit(1); }

if (m[5] !== "u686730471_caveodev") {
  console.error(`Refusing to run: DATABASE_URL points at "${m[5]}", not the dev DB "u686730471_caveodev".`);
  process.exit(1);
}

const conn = await mariadb.createConnection({
  host: m[3], port: Number(m[4]), user: m[1],
  password: decodeURIComponent(m[2]), database: m[5],
});

const out = {};
out.database = (await conn.query("SELECT DATABASE() AS db"))[0].db;
out.serverTime = (await conn.query("SELECT NOW() AS t"))[0].t;
out.mysqlVersion = (await conn.query("SELECT VERSION() AS v"))[0].v;

out.crmMeetingCount = Number((await conn.query("SELECT COUNT(*) AS c FROM `CrmMeeting`"))[0].c);
out.dailyUpdateCount = Number((await conn.query("SELECT COUNT(*) AS c FROM `DailyUpdate`"))[0].c);
out.crmActivityCount = Number((await conn.query("SELECT COUNT(*) AS c FROM `CrmActivity`"))[0].c);

out.crmMeetingHasStatusColumn = (await conn.query(
  "SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'CrmMeeting' AND COLUMN_NAME = 'status'",
  [m[5]]
))[0].c > 0;

const newTables = ["DailyActivityLog", "DailyActivitySummary", "DailyActivityCorrectionRequest", "DailyProductivityScore", "ProductivityActivityRule", "ProductivityRoleTarget"];
out.preExistingNewTables = [];
for (const t of newTables) {
  const rows = await conn.query(
    "SELECT COUNT(*) AS c FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
    [m[5], t]
  );
  if (Number(rows[0].c) > 0) out.preExistingNewTables.push(t);
}

out.migrationAlreadyRecorded = (await conn.query(
  "SELECT COUNT(*) AS c FROM `_prisma_migrations` WHERE migration_name = '20260625120000_daily_activity_foundation'"
))[0].c > 0;

await conn.end();

console.log(JSON.stringify(out, null, 2));
