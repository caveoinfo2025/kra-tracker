/**
 * READ-ONLY post-migration verification for 20260625120000_daily_activity_foundation.
 * Dev DB only — hardcoded guard. SELECT/SHOW/information_schema only, no writes.
 * Run: node prisma/verify-daily-activity-foundation.mjs
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

const newTables = ["DailyActivityLog", "DailyActivitySummary", "DailyActivityCorrectionRequest", "DailyProductivityScore", "ProductivityActivityRule", "ProductivityRoleTarget"];
out.tablesExist = {};
for (const t of newTables) {
  const rows = await conn.query(
    "SELECT COUNT(*) AS c FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?", [m[5], t]
  );
  out.tablesExist[t] = Number(rows[0].c) > 0;
}

out.tableRowCounts = {};
for (const t of newTables) {
  const rows = await conn.query(`SELECT COUNT(*) AS c FROM \`${t}\``);
  out.tableRowCounts[t] = Number(rows[0].c);
}

const meetingCol = await conn.query(
  "SELECT COLUMN_NAME, COLUMN_DEFAULT, IS_NULLABLE, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'CrmMeeting' AND COLUMN_NAME = 'status'", [m[5]]
);
out.crmMeetingStatusColumn = meetingCol[0] || null;

const meetingIdx = await conn.query(
  "SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'CrmMeeting' AND INDEX_NAME = 'CrmMeeting_status_idx'", [m[5]]
);
out.crmMeetingStatusIndexExists = meetingIdx.length > 0;

out.indexCounts = {};
for (const t of newTables) {
  const rows = await conn.query(
    "SELECT COUNT(DISTINCT INDEX_NAME) AS c FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?", [m[5], t]
  );
  out.indexCounts[t] = Number(rows[0].c);
}

out.foreignKeyCounts = {};
for (const t of newTables) {
  const rows = await conn.query(
    "SELECT COUNT(*) AS c FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL", [m[5], t]
  );
  out.foreignKeyCounts[t] = Number(rows[0].c);
}

out.dailyUpdateCount = Number((await conn.query("SELECT COUNT(*) AS c FROM `DailyUpdate`"))[0].c);
out.crmActivityCount = Number((await conn.query("SELECT COUNT(*) AS c FROM `CrmActivity`"))[0].c);
out.crmMeetingCount  = Number((await conn.query("SELECT COUNT(*) AS c FROM `CrmMeeting`"))[0].c);

await conn.end();
console.log(JSON.stringify(out, null, 2));
