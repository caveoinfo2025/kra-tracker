/**
 * POST /api/daily-activity/corrections — Phase W4 write workflow.
 *
 * Employee requests a correction for a missing/wrong captured activity on a given date.
 * Self-scoped only (no `employeeId` override accepted from the body). Never changes score —
 * that only happens if/when a manager approves it (see corrections/[id]/approve). Returns the
 * employee-safe correction shape — no `approvedPoints`/exact-points field included.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import {
  parseDateOnlyAsLocalDate,
  createDailyActivityCorrectionRequest,
  DailyActivityError,
} from "@/lib/daily-activity";

interface CorrectionRequestBody {
  date?: string;
  activityLogId?: number;
  requestedActivityType?: string;
  requestedSourceType?: string;
  requestedSourceId?: number;
  reason?: string;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: CorrectionRequestBody;
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
    const result = await createDailyActivityCorrectionRequest({
      employeeId: session.user.employeeId,
      date,
      activityLogId: body.activityLogId ?? null,
      requestedActivityType: body.requestedActivityType ?? "",
      requestedSourceType: body.requestedSourceType ?? "",
      requestedSourceId: body.requestedSourceId ?? null,
      reason: body.reason ?? "",
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof DailyActivityError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[daily-activity/corrections] POST failed:", e);
    return NextResponse.json({ error: "Failed to create correction request" }, { status: 500 });
  }
}
