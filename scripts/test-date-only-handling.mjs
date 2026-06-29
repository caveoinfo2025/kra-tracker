// Phase W4.1 — focused test script for the shared date-only helpers and the Daily Activity
// date-only round trip through real `@db.Date` columns on the dev DB.
//
// Read-only against existing data; the one write path used (steps 8) creates temporary rows in
// `DailyActivityLog`/`DailyActivitySummary` for a synthetic test employee id and deletes them
// at the end (try/finally) — never touches a real employee's data.
//
// Run: npx tsx scripts/test-date-only-handling.mjs   (loads .env via the same prisma.config.ts
// mechanism the rest of the app uses is NOT automatic here, so DATABASE_URL is loaded manually.)
import fs from "node:fs";
import path from "node:path";

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    const key = trimmed.slice(0, i).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = trimmed.slice(i + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
loadEnvFile(".env");

const {
  parseDateOnlyAsLocalDate,
  toDateKeyLocal,
  dateKeyToDbDate,
  dbDateToDateKey,
  dbDateToLocalDate,
} = await import("../src/lib/date-only.ts");

let pass = 0, fail = 0;
function check(name, condition, detail = "") {
  if (condition) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? "  -- " + detail : ""}`);
  }
}

console.log("== Pure helper tests ==");

// 1. parseDateOnlyAsLocalDate
{
  const d = parseDateOnlyAsLocalDate("2026-06-28");
  check("1. parseDateOnlyAsLocalDate('2026-06-28') -> local 2026-06-28",
    d.getFullYear() === 2026 && d.getMonth() === 5 && d.getDate() === 28,
    `got ${d}`);
}

// 2. toDateKeyLocal
{
  const d = new Date(2026, 5, 28);
  check("2. toDateKeyLocal -> '2026-06-28'", toDateKeyLocal(d) === "2026-06-28", toDateKeyLocal(d));
}

// 3. dateKeyToDbDate represents the intended date (UTC components)
{
  const dbDate = dateKeyToDbDate("2026-06-28");
  check("3. dateKeyToDbDate('2026-06-28') -> UTC 2026-06-28",
    dbDate.getUTCFullYear() === 2026 && dbDate.getUTCMonth() === 5 && dbDate.getUTCDate() === 28,
    dbDate.toISOString());
}

// 4 covered below against a real DB round trip.

// 5. invalid date strings rejected
for (const bad of ["2026-13-01", "2026-02-30", "2026/06/28", "abc"]) {
  let threw = false;
  try { parseDateOnlyAsLocalDate(bad); } catch { threw = true; }
  check(`5. parseDateOnlyAsLocalDate rejects "${bad}"`, threw);
}
for (const bad of ["2026-13-01", "2026-02-30", "2026/06/28", "abc"]) {
  let threw = false;
  try { dateKeyToDbDate(bad); } catch { threw = true; }
  check(`5b. dateKeyToDbDate rejects "${bad}"`, threw);
}

// 6. leap day accepted
{
  let threw = false;
  try { parseDateOnlyAsLocalDate("2024-02-29"); dateKeyToDbDate("2024-02-29"); } catch { threw = true; }
  check("6. 2024-02-29 (leap day) accepted", !threw);
}

// 7. non-leap Feb 29 rejected
{
  let threw = false;
  try { parseDateOnlyAsLocalDate("2026-02-29"); } catch { threw = true; }
  check("7. 2026-02-29 (non-leap) rejected", threw);
}

console.log("\n== DB round-trip tests (DailyActivityLog/DailyActivitySummary, temp rows) ==");

const { default: prisma } = await import("../src/lib/prisma.ts");

const TEST_EMPLOYEE_NAME = "__date_only_test_employee__";
let testEmployeeId = null;
let createdLogIds = [];
let createdSummaryIds = [];

try {
  // Use a real (but newly created, fully cleaned up) Employee row so FK constraints are
  // satisfied — DailyActivityLog/DailyActivitySummary both have a required FK to Employee.
  const employee = await prisma.employee.create({
    data: {
      name: TEST_EMPLOYEE_NAME,
      email: `date-only-test-${Date.now()}@example.invalid`,
      role: "Sales",
      department: "Sales",
    },
  });
  testEmployeeId = employee.id;

  const dateKey = "2026-06-28";
  const dbDate = dateKeyToDbDate(dateKey);

  const log = await prisma.dailyActivityLog.create({
    data: {
      employeeId: testEmployeeId,
      activityDate: dbDate,
      activityType: "LEAD_UPDATED",
      sourceType: "LEAD",
      sourceTable: "test",
      sourceAction: "date_only_test",
      points: 1,
      status: "CAPTURED",
      capturedAt: new Date(),
      metadataJson: "{}",
    },
  });
  createdLogIds.push(log.id);

  const summary = await prisma.dailyActivitySummary.create({
    data: {
      employeeId: testEmployeeId,
      summaryDate: dbDate,
      status: "NO_ACTIVITY",
      productivityBand: "NO_ACTIVITY",
      totalPoints: 0,
      autoSummaryJson: "{}",
    },
  });
  createdSummaryIds.push(summary.id);

  const readBackLog = await prisma.dailyActivityLog.findUniqueOrThrow({ where: { id: log.id } });
  const readBackSummary = await prisma.dailyActivitySummary.findUniqueOrThrow({ where: { id: summary.id } });

  check("4. dbDateToDateKey(readBackLog.activityDate) === '2026-06-28'",
    dbDateToDateKey(readBackLog.activityDate) === dateKey,
    dbDateToDateKey(readBackLog.activityDate));
  check("4b. dbDateToDateKey(readBackSummary.summaryDate) === '2026-06-28'",
    dbDateToDateKey(readBackSummary.summaryDate) === dateKey,
    dbDateToDateKey(readBackSummary.summaryDate));
  check("4c. dbDateToLocalDate round-trips to the same local-midnight Date dateKeyToDbDate was given",
    toDateKeyLocal(dbDateToLocalDate(readBackSummary.summaryDate)) === dateKey);

  // 8/9/10 — exercise the real Daily Activity query helpers against the temp data.
  const dailyActivity = await import("../src/lib/daily-activity.ts");

  const teamView = await dailyActivity.getTeamDailyActivity(parseDateOnlyAsLocalDate(dateKey), [testEmployeeId]);
  check("8. Daily Activity team date query returns the requested date",
    teamView.date === dateKey, teamView.date);

  const todayKey = toDateKeyLocal(new Date());
  const employeeToday = await dailyActivity.getDailyActivityForEmployee(testEmployeeId, new Date());
  check("9. Daily Activity employee 'today' returns actual local date",
    employeeToday.date === todayKey, `${employeeToday.date} vs ${todayKey}`);

  const history = await dailyActivity.getDailyActivityHistoryForEmployee(testEmployeeId, 30);
  const historyEntry = history.find((h) => h.date === dateKey);
  check("10. Daily Activity history does not shift stored dates",
    Boolean(historyEntry), `history dates: ${history.map((h) => h.date).join(", ")}`);
} finally {
  // Cleanup — delete temp rows (correction requests would FK-block employee delete, but none
  // are created in this test) then the synthetic employee.
  for (const id of createdLogIds) {
    await prisma.dailyActivityLog.delete({ where: { id } }).catch(() => {});
  }
  for (const id of createdSummaryIds) {
    await prisma.dailyActivitySummary.delete({ where: { id } }).catch(() => {});
  }
  if (testEmployeeId != null) {
    await prisma.employee.delete({ where: { id: testEmployeeId } }).catch(() => {});
  }
  await prisma.$disconnect();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
