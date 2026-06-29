/**
 * Phase W3 — Daily Activity read-only webapp page.
 *
 * Read-only validation surface for the Phase W2 Daily Activity APIs. Does NOT replace
 * /daily-updates (that stays untouched). No summary submission, correction requests, or
 * approve/reject/reopen actions exist on this page — see docs/webapp/
 * DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md for the full Phase W3 scope.
 *
 * Initial data is loaded server-side directly via src/lib/daily-activity.ts (same convention
 * as /daily-updates/page.tsx, which calls prisma directly rather than fetching its own API).
 * The manager panel's date-filter and drill-in interactions call the Phase W2 API routes
 * client-side (GET /api/daily-activity/team, GET /api/daily-activity/team/[employeeId]/[date]).
 */
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import {
  getDailyActivityForEmployee,
  getDailyActivityHistoryForEmployee,
  getTeamDailyActivity,
} from "@/lib/daily-activity";
import EmployeeActivityView from "./EmployeeActivityView";
import ManagerActivityPanel from "./ManagerActivityPanel";

export default async function DailyActivityPage() {
  const session = await getSession();
  const empId = session?.user?.employeeId;
  const isManager = session?.user?.isManager ?? false;

  if (!empId) {
    return (
      <SheetLayout title="Daily Activity" description="Auto-captured activity and productivity preview.">
        <div className="text-center py-16 bg-white rounded-xl border text-gray-400">
          <p className="font-medium">Unauthorized — no active session.</p>
        </div>
      </SheetLayout>
    );
  }

  const [today, history] = await Promise.all([
    getDailyActivityForEmployee(empId, new Date()),
    getDailyActivityHistoryForEmployee(empId, 14),
  ]);

  const team = isManager ? await getTeamDailyActivity(new Date()) : null;

  return (
    <SheetLayout
      title="Daily Activity"
      description="Auto-captured activity, status, and productivity preview — read-only while we validate the data with real usage."
    >
      <div className="space-y-8">
        <EmployeeActivityView initialToday={today} initialHistory={history} />
        {isManager && team && <ManagerActivityPanel initialTeam={team} />}
      </div>
    </SheetLayout>
  );
}
