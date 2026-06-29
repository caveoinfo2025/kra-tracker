/**
 * POST /api/daily-activity/day/[employeeId]/[date]/reopen — Phase W4 write workflow.
 *
 * Manager-only. Reopens a locked/incomplete/closed day for one team employee so they can
 * resubmit through the normal submit path. Never mutates `DailyActivityLog` points — only the
 * summary's status/reopen metadata. Writes an `AuditLog` entry and returns the manager-visible
 * day view.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import {
  parseDateOnlyAsLocalDate,
  reopenDailyActivityDay,
  resolveManagerAuthorizedEmployeeIds,
  DailyActivityError,
} from "@/lib/daily-activity";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ employeeId: string; date: string }> }
) {
  const session = await getSession();
  if (!session?.user?.employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { employeeId: employeeIdParam, date: dateParam } = await params;
  const employeeId = Number(employeeIdParam);
  if (!Number.isInteger(employeeId)) return NextResponse.json({ error: "Invalid employeeId" }, { status: 400 });

  let date: Date;
  try {
    date = parseDateOnlyAsLocalDate(dateParam);
  } catch {
    return NextResponse.json({ error: "Invalid date (expected YYYY-MM-DD)" }, { status: 400 });
  }

  try {
    const result = await reopenDailyActivityDay({
      employeeId,
      date,
      managerId: session.user.employeeId,
      authorizedEmployeeIds: resolveManagerAuthorizedEmployeeIds(session.user),
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof DailyActivityError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[daily-activity/day/[employeeId]/[date]/reopen] POST failed:", e);
    return NextResponse.json({ error: "Failed to reopen day" }, { status: 500 });
  }
}
