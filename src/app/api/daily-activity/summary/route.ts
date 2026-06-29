/**
 * POST/PUT /api/daily-activity/summary — Phase W4 write workflow.
 *
 * POST creates or idempotently resubmits the logged-in employee's own end-of-day summary for
 * a given date (within the allowed window — see `evaluateSubmissionWindow` in
 * src/lib/daily-activity.ts). PUT edits an already-submitted summary's employee-owned fields
 * only (blockers/nextDayPlan/finalRemarks) — never status/points/timestamps.
 *
 * Self-scoped only, same as every other Daily Activity employee endpoint: `employeeId` is
 * never read from the request body, even if present — there is no override path, for either
 * an employee impersonating another employee or a manager submitting on an employee's behalf.
 * Exact points are never included in the response (delegates to `getDailyActivityForEmployee`,
 * whose return type has no `points` field at all).
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import {
  parseDateOnlyAsLocalDate,
  submitDailyActivitySummary,
  updateDailyActivitySummary,
  DailyActivityError,
} from "@/lib/daily-activity";

interface SummaryRequestBody {
  date?: string;
  blockers?: string;
  nextDayPlan?: string;
  finalRemarks?: string;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: SummaryRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let date: Date;
  try {
    date = parseDateOnlyAsLocalDate(body.date ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid date (expected YYYY-MM-DD)" }, { status: 400 });
  }

  try {
    const view = await submitDailyActivitySummary({
      employeeId: session.user.employeeId,
      date,
      blockers: body.blockers,
      nextDayPlan: body.nextDayPlan,
      finalRemarks: body.finalRemarks,
      employeeRole: session.user.role,
    });
    return NextResponse.json(view);
  } catch (e) {
    if (e instanceof DailyActivityError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[daily-activity/summary] POST failed:", e);
    return NextResponse.json({ error: "Failed to submit summary" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session?.user?.employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: SummaryRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let date: Date;
  try {
    date = parseDateOnlyAsLocalDate(body.date ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid date (expected YYYY-MM-DD)" }, { status: 400 });
  }

  try {
    const view = await updateDailyActivitySummary({
      employeeId: session.user.employeeId,
      date,
      blockers: body.blockers,
      nextDayPlan: body.nextDayPlan,
      finalRemarks: body.finalRemarks,
    });
    return NextResponse.json(view);
  } catch (e) {
    if (e instanceof DailyActivityError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[daily-activity/summary] PUT failed:", e);
    return NextResponse.json({ error: "Failed to update summary" }, { status: 500 });
  }
}
