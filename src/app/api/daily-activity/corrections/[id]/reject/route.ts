/**
 * POST /api/daily-activity/corrections/[id]/reject — Phase W4 write workflow.
 *
 * Manager-only. Rejects a PENDING correction request: no `DailyActivityLog` is created, no
 * points change. Writes an `AuditLog` entry and returns the manager-visible day view.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import {
  rejectDailyActivityCorrectionRequest,
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
    // Body is optional for this route.
  }

  try {
    const result = await rejectDailyActivityCorrectionRequest({
      correctionRequestId,
      managerId: session.user.employeeId,
      managerRemarks,
      authorizedEmployeeIds: resolveManagerAuthorizedEmployeeIds(session.user),
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof DailyActivityError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[daily-activity/corrections/[id]/reject] POST failed:", e);
    return NextResponse.json({ error: "Failed to reject correction request" }, { status: 500 });
  }
}
