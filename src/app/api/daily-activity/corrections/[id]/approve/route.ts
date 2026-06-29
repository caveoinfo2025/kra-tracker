/**
 * POST /api/daily-activity/corrections/[id]/approve — Phase W4 write workflow.
 *
 * Manager-only. Approves a PENDING correction request: creates a `COUNTED`
 * `DailyActivityLog` row with points resolved server-side from the existing activity-rule/
 * default-points table (never from the request body — there is no points field this route
 * reads), recomputes the day's totalPoints/productivityBand, writes an `AuditLog` entry, and
 * returns the manager-visible (exact-points-included) day view.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import {
  approveDailyActivityCorrectionRequest,
  resolveManagerAuthorizedEmployeeIds,
  DailyActivityError,
} from "@/lib/daily-activity";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user?.employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const correctionRequestId = Number(id);
  if (!Number.isInteger(correctionRequestId)) return NextResponse.json({ error: "Invalid correction request id" }, { status: 400 });

  let managerRemarks = "";
  try {
    const body = await req.json();
    managerRemarks = typeof body?.managerRemarks === "string" ? body.managerRemarks : "";
  } catch {
    // Body is optional for this route — ignore parse failure on an empty/absent body.
  }

  try {
    const result = await approveDailyActivityCorrectionRequest({
      correctionRequestId,
      managerId: session.user.employeeId,
      managerRemarks,
      authorizedEmployeeIds: resolveManagerAuthorizedEmployeeIds(session.user),
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof DailyActivityError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[daily-activity/corrections/[id]/approve] POST failed:", e);
    return NextResponse.json({ error: "Failed to approve correction request" }, { status: 500 });
  }
}
