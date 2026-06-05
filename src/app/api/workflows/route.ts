import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { listWorkflows, createWorkflow } from "@/lib/workflow-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const workflows = await listWorkflows({
    module: searchParams.get("module") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    take:   searchParams.get("take")   ? Number(searchParams.get("take")) : undefined,
  });
  return NextResponse.json({ workflows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    name:         string;
    code:         string;
    description?: string;
    module:       string;
    triggerEvent: string;
    conditionJson?: string;
    steps?:       unknown[];
  };

  if (!body.name || !body.code || !body.module || !body.triggerEvent) {
    return NextResponse.json({ error: "name, code, module, triggerEvent are required" }, { status: 400 });
  }

  const workflow = await createWorkflow({
    ...body,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    steps:     (body.steps as any) ?? [],
    createdBy: session.user.employeeId!,
  });

  if (!workflow) return NextResponse.json({ error: "Failed to create workflow" }, { status: 503 });
  return NextResponse.json({ workflow }, { status: 201 });
}
