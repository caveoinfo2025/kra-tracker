import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { getWorkflow, updateWorkflow } from "@/lib/workflow-engine";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workflow = await getWorkflow(Number(id));
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ workflow });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as {
    name?:          string;
    description?:   string;
    triggerEvent?:  string;
    conditionJson?: string;
    status?:        string;
    steps?:         unknown[];
  };

  const workflow = await updateWorkflow(Number(id), session.user.employeeId!, {
    ...body,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    steps: body.steps as any,
  });
  if (!workflow) return NextResponse.json({ error: "Failed to update" }, { status: 503 });
  return NextResponse.json({ workflow });
}
