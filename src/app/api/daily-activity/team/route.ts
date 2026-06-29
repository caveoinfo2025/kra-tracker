/**
 * GET /api/daily-activity/team?date=YYYY-MM-DD&employeeId=123 — manager view of team Daily
 * Activity for a date. Phase W2: read-only. Manager-only (`isManager` — same broad scoping
 * already used by /api/daily-updates: any manager sees ALL employees unless `employeeId` is
 * passed, not just direct reports — see src/lib/daily-activity.ts `getTeamDailyActivity` for
 * why this matches existing precedent rather than introducing a new reportsToId-scoped team
 * concept). Exact points ARE included here (manager-only view). No point-adjustment field
 * exists on this or any other Daily Activity endpoint.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { getTeamDailyActivity, parseDateOnlyAsLocalDate } from "@/lib/daily-activity";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  let date: Date;
  try {
    date = dateParam ? parseDateOnlyAsLocalDate(dateParam) : new Date();
  } catch {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const employeeIdParam = searchParams.get("employeeId");
  const employeeIds = employeeIdParam ? [Number(employeeIdParam)] : undefined;

  const view = await getTeamDailyActivity(date, employeeIds);
  return NextResponse.json(view);
}
