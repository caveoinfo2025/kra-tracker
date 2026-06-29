/**
 * GET /api/daily-activity/today — the logged-in employee's own Daily Activity for today.
 * Phase W2: read-only. Self-scoped only — does not accept an `employeeId` query param from
 * the caller (managers use /api/daily-activity/team or /team/[employeeId]/[date] instead).
 * Exact points are never returned here — only the banded productivity status.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { getDailyActivityForEmployee } from "@/lib/daily-activity";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const view = await getDailyActivityForEmployee(session.user.employeeId, new Date());
  return NextResponse.json(view);
}
