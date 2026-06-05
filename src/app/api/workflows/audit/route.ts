import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { listWorkflowAuditLog, getWorkflowAudit } from "@/lib/workflow-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const entityTypeParam = searchParams.get("entityType");
  const entityIdParam   = searchParams.get("entityId");

  if (entityTypeParam && entityIdParam) {
    const entries = await getWorkflowAudit(
      entityTypeParam as "WORKFLOW_DEFINITION" | "APPROVAL_REQUEST",
      Number(entityIdParam),
    );
    return NextResponse.json({ entries });
  }

  const entries = await listWorkflowAuditLog({
    entityType: entityTypeParam as "WORKFLOW_DEFINITION" | "APPROVAL_REQUEST" | undefined ?? undefined,
    action:     searchParams.get("action") ?? undefined,
    take:       searchParams.get("take") ? Number(searchParams.get("take")) : undefined,
  });
  return NextResponse.json({ entries });
}
