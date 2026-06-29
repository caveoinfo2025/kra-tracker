/**
 * GET /api/daily-activity/team/[employeeId]/[date] — manager drill-in to one team member's
 * Daily Activity for one date. Phase W2: read-only. Manager-only. No edit/approval/point-
 * adjustment in this phase — that's later (correction approve/reject, reopen).
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { getDailyActivityForManagerEmployee } from "@/lib/daily-activity";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ employeeId: string; date: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { employeeId, date: dateParam } = await params;
  const date = new Date(dateParam);
  if (isNaN(date.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  const view = await getDailyActivityForManagerEmployee(Number(employeeId), date);
  if (!view) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(view);
}
