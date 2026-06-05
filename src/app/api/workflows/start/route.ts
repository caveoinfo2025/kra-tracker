import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { startApproval, getWorkflowByCode } from "@/lib/workflow-engine";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    workflowCode?: string;
    workflowId?:   number;
    entityType:    string;
    entityId:      string;
    contextJson?:  string;
  };

  if (!body.entityType || !body.entityId) {
    return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
  }

  let workflowId = body.workflowId;
  if (!workflowId && body.workflowCode) {
    const wf = await getWorkflowByCode(body.workflowCode);
    if (!wf) return NextResponse.json({ error: "Workflow not found or inactive" }, { status: 404 });
    workflowId = wf.id;
  }
  if (!workflowId) {
    return NextResponse.json({ error: "workflowCode or workflowId required" }, { status: 400 });
  }

  const request = await startApproval({
    workflowId,
    entityType:  body.entityType,
    entityId:    body.entityId,
    requestedBy: session.user.employeeId!,
    contextJson: body.contextJson,
  });

  if (!request) return NextResponse.json({ error: "Failed to start approval" }, { status: 503 });
  return NextResponse.json({ request }, { status: 201 });
}
