/**
 * GET /api/daily-activity/history?days=14 — the logged-in employee's own recent Daily Activity
 * history. Phase W2: read-only. Self-scoped only. `days` is optional, defaults to 14 (recent
 * days only, per spec). Exact points are never returned — band only.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { getDailyActivityHistoryForEmployee } from "@/lib/daily-activity";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const daysParam = Number(searchParams.get("days"));
  const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 90) : 14;

  const history = await getDailyActivityHistoryForEmployee(session.user.employeeId, days);
  return NextResponse.json(history);
}
