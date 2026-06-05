import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import {
  approveRequest,
  rejectRequest,
  returnRequest,
  delegateRequest,
  cancelRequest,
} from "@/lib/workflow-engine";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const requestId = Number(id);

  const body = await req.json() as {
    action:     string;
    comments?:  string;
    toUserId?:  number;
  };

  const actor = session.user.employeeId!;
  let ok = false;

  switch (body.action) {
    case "APPROVE":
      ok = await approveRequest(requestId, actor, body.comments);
      break;
    case "REJECT":
      ok = await rejectRequest(requestId, actor, body.comments);
      break;
    case "RETURN":
      ok = await returnRequest(requestId, actor, body.comments);
      break;
    case "DELEGATE":
      if (!body.toUserId) {
        return NextResponse.json({ error: "toUserId required for DELEGATE" }, { status: 400 });
      }
      ok = await delegateRequest(requestId, actor, body.toUserId, body.comments);
      break;
    case "CANCEL":
      ok = await cancelRequest(requestId, actor);
      break;
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (!ok) return NextResponse.json({ error: "Action failed — request may not exist or is already closed" }, { status: 409 });
  return NextResponse.json({ success: true });
}
