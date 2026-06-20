import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import {
  approveRequest,
  rejectRequest,
  returnRequest,
  delegateRequest,
  cancelRequest,
  type ApprovalActionResult,
} from "@/lib/workflow-engine";

/**
 * Maps an engine-level denial reason to the HTTP response. Authorization
 * details (which approver was eligible, resolver internals, etc.) are
 * deliberately never included in the response body.
 */
function _resultToResponse(result: ApprovalActionResult): NextResponse {
  if (result.ok) return NextResponse.json({ success: true });

  switch (result.reason) {
    case "NOT_FOUND":
      return NextResponse.json({ error: "Approval request not found" }, { status: 404 });
    case "NOT_ELIGIBLE":
      return NextResponse.json({ error: "You are not authorized to perform this approval action." }, { status: 403 });
    case "NOT_PENDING":
      return NextResponse.json({ error: "This request is no longer pending and cannot be acted on" }, { status: 409 });
    default:
      return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = session.user.employeeId;
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const requestId = Number(id);
  if (!Number.isFinite(requestId)) {
    return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
  }

  const body = await req.json() as {
    action:     string;
    comments?:  string;
    toUserId?:  number;
  };

  let result: ApprovalActionResult;

  switch (body.action) {
    case "APPROVE":
      result = await approveRequest(requestId, actor, body.comments);
      break;
    case "REJECT":
      result = await rejectRequest(requestId, actor, body.comments);
      break;
    case "RETURN":
      result = await returnRequest(requestId, actor, body.comments);
      break;
    case "DELEGATE":
      if (!body.toUserId) {
        return NextResponse.json({ error: "toUserId required for DELEGATE" }, { status: 400 });
      }
      result = await delegateRequest(requestId, actor, body.toUserId, body.comments);
      break;
    case "CANCEL":
      result = await cancelRequest(requestId, actor);
      break;
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  return _resultToResponse(result);
}
