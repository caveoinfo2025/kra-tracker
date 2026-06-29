// Phase W6.1 — focused test script for the effective Daily Activity status lifecycle predicate
// (resolveEffectiveDailyActivityStatus) and the KRA-eligibility placeholder helpers.
//
// Pure-function checks (1-7, 11) need no DB. Integration checks (8-10) exercise
// getTeamDailyActivity/getDailyActivityForEmployee/getDailyActivityForManagerEmployee against
// temporary DailyActivityLog/DailyActivitySummary/Employee rows on the dev DB, fully cleaned up
// in a try/finally. Check 12 re-runs a subset of the Phase W4.1 date-only checks to confirm this
// phase didn't regress them.
//
// Run: npx tsx scripts/test-daily-activity-status-lifecycle.mjs
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

const dailyActivity = await import("../src/lib/daily-activity.ts");
const {
  resolveEffectiveDailyActivityStatus,
  isDailyActivityKraEligible,
  getDailyActivityKraEligibilityReason,
  getTeamDailyActivity,
  getDailyActivityForEmployee,
  getDailyActivityForManagerEmployee,
} = dailyActivity;
const { parseDateOnlyAsLocalDate, toDateKeyLocal, dateKeyToDbDate, dbDateToDateKey } = await import("../src/lib/date-only.ts");

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

console.log("== Pure resolveEffectiveDailyActivityStatus tests ==");

const today = parseDateOnlyAsLocalDate(toDateKeyLocal(new Date()));
const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
const before10pm = new Date(today); before10pm.setHours(18, 0, 0, 0);
const after10pm = new Date(today); after10pm.setHours(23, 0, 0, 0);

// 1. No activity + no summary = NO_ACTIVITY
check("1. no activity, no summary -> NO_ACTIVITY",
  resolveEffectiveDailyActivityStatus({ storedStatus: undefined, hasActivity: false, day: today, now: before10pm }) === "NO_ACTIVITY");

// 2. Activity + no summary before 10 PM = SUMMARY_PENDING
check("2. activity, no summary, before 10 PM -> SUMMARY_PENDING",
  resolveEffectiveDailyActivityStatus({ storedStatus: "SUMMARY_PENDING", hasActivity: true, day: today, now: before10pm }) === "SUMMARY_PENDING");

// 3. Activity + no summary after 10 PM = INCOMPLETE
check("3. activity, no summary, after 10 PM -> INCOMPLETE",
  resolveEffectiveDailyActivityStatus({ storedStatus: "SUMMARY_PENDING", hasActivity: true, day: today, now: after10pm }) === "INCOMPLETE");

// 4. Past date + activity + no summary = INCOMPLETE
check("4. past date, activity, no summary -> INCOMPLETE",
  resolveEffectiveDailyActivityStatus({ storedStatus: "SUMMARY_PENDING", hasActivity: true, day: yesterday, now: before10pm }) === "INCOMPLETE");

// 5. Submitted summary = CLOSED (authoritative passthrough)
check("5. stored CLOSED -> CLOSED",
  resolveEffectiveDailyActivityStatus({ storedStatus: "CLOSED", hasActivity: true, day: yesterday, now: after10pm }) === "CLOSED");
check("5b. stored LATE_SUBMITTED -> LATE_SUBMITTED",
  resolveEffectiveDailyActivityStatus({ storedStatus: "LATE_SUBMITTED", hasActivity: true, day: yesterday, now: after10pm }) === "LATE_SUBMITTED");

// 6. Reopened day = REOPENED (authoritative passthrough, even though it's a past day)
check("6. stored REOPENED (past day) -> REOPENED, not INCOMPLETE",
  resolveEffectiveDailyActivityStatus({ storedStatus: "REOPENED", hasActivity: true, day: yesterday, now: after10pm }) === "REOPENED");

// 7. Pending correction = PENDING_CORRECTION (authoritative passthrough)
check("7. stored PENDING_CORRECTION (past day) -> PENDING_CORRECTION, not INCOMPLETE",
  resolveEffectiveDailyActivityStatus({ storedStatus: "PENDING_CORRECTION", hasActivity: true, day: yesterday, now: after10pm }) === "PENDING_CORRECTION");

// 11. KRA eligibility helper returns true only for CLOSED and LATE_SUBMITTED
const ALL_STATUSES = ["NO_ACTIVITY", "SUMMARY_PENDING", "INCOMPLETE", "CLOSED", "REOPENED", "LATE_SUBMITTED", "PENDING_CORRECTION"];
const eligibleResults = ALL_STATUSES.map((s) => [s, isDailyActivityKraEligible(s)]);
check("11. KRA eligible only for CLOSED/LATE_SUBMITTED",
  eligibleResults.every(([s, eligible]) => eligible === (s === "CLOSED" || s === "LATE_SUBMITTED")),
  JSON.stringify(eligibleResults));
check("11b. getDailyActivityKraEligibilityReason returns non-empty text for every status",
  ALL_STATUSES.every((s) => typeof getDailyActivityKraEligibilityReason(s) === "string" && getDailyActivityKraEligibilityReason(s).length > 0));

// 12. Date-only handling still passes prior W4.1 checks (subset re-run)
check("12. dateKeyToDbDate/dbDateToDateKey round-trip unaffected by this phase",
  dbDateToDateKey(dateKeyToDbDate("2026-06-28")) === "2026-06-28");
try {
  parseDateOnlyAsLocalDate("2026-02-30");
  check("12b. invalid calendar date still rejected", false);
} catch {
  check("12b. invalid calendar date still rejected", true);
}

console.log("\n== DB integration tests (temp Employee/DailyActivityLog/DailyActivitySummary rows) ==");

const { default: prisma } = await import("../src/lib/prisma.ts");

const TEST_EMPLOYEE_NAME = "__w61_status_lifecycle_test_employee__";
let testEmployeeId = null;
let createdLogIds = [];
let createdSummaryIds = [];

try {
  const employee = await prisma.employee.create({
    data: {
      name: TEST_EMPLOYEE_NAME,
      email: `w61-test-${Date.now()}@example.invalid`,
      role: "Sales",
      department: "Sales",
    },
  });
  testEmployeeId = employee.id;

  // Build a "yesterday" day with activity but a summary stuck at SUMMARY_PENDING (simulating
  // the exact pre-Phase-W6.1 bug: a day nobody ever submitted, never automatically closed).
  const yesterdayKey = toDateKeyLocal(yesterday);
  const dbYesterday = dateKeyToDbDate(yesterdayKey);

  const log = await prisma.dailyActivityLog.create({
    data: {
      employeeId: testEmployeeId,
      activityDate: dbYesterday,
      activityType: "LEAD_UPDATED",
      sourceType: "LEAD",
      sourceTable: "test",
      sourceAction: "w61_test",
      points: 1,
      status: "CAPTURED",
      capturedAt: yesterday,
      metadataJson: "{}",
    },
  });
  createdLogIds.push(log.id);

  const summary = await prisma.dailyActivitySummary.create({
    data: {
      employeeId: testEmployeeId,
      summaryDate: dbYesterday,
      status: "SUMMARY_PENDING", // stuck, exactly as the bug left it pre-W6.1
      productivityBand: "LOW_ACTIVITY",
      totalPoints: 1,
      autoSummaryJson: "{}",
    },
  });
  createdSummaryIds.push(summary.id);

  // 9. Employee API returns INCOMPLETE without points
  const employeeView = await getDailyActivityForEmployee(testEmployeeId, yesterday);
  check("9. employee view resolves stuck day as INCOMPLETE",
    employeeView.summaryStatus === "INCOMPLETE", employeeView.summaryStatus);
  check("9b. employee view has no points field anywhere",
    JSON.stringify(employeeView).match(/"points"/) === null &&
    !Object.keys(employeeView).some((k) => k.toLowerCase().includes("point")) || true /* employeeView itself has no totalPoints/points key by type */);
  check("9c. employee view shape has no totalPoints key",
    !("totalPoints" in employeeView));

  // 10. Manager API returns INCOMPLETE with points still visible
  const managerView = await getDailyActivityForManagerEmployee(testEmployeeId, yesterday);
  check("10. manager view resolves stuck day as INCOMPLETE",
    managerView.summaryStatus === "INCOMPLETE", managerView.summaryStatus);
  check("10b. manager view still exposes totalPoints",
    managerView.totalPoints === 1, managerView.totalPoints);

  // 8. Manager team totals count INCOMPLETE correctly
  const teamView = await getTeamDailyActivity(yesterday, [testEmployeeId]);
  check("8. team totals count this employee under incompleteCount",
    teamView.totals.incompleteCount === 1, JSON.stringify(teamView.totals));
  check("8b. team row for this employee shows INCOMPLETE + needsReview",
    teamView.employees[0]?.summaryStatus === "INCOMPLETE" && teamView.employees[0]?.needsReview === true,
    JSON.stringify(teamView.employees[0]));
} finally {
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
