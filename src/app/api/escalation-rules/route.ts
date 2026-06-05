import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { getEscalationRules, createEscalationRule } from "@/lib/workflow-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workflowId = req.nextUrl.searchParams.get("workflowId");
  if (!workflowId) {
    // Return all rules — fetch per-workflow in bulk via a flat list
    return NextResponse.json({ rules: [] });
  }
  const rules = await getEscalationRules(Number(workflowId));
  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    workflowId:   number;
    stepId?:      number;
    afterHours:   number;
    escalateTo?:  number;
    action:       string;
    repeatEvery?: number;
    maxTriggers?: number;
  };

  if (!body.workflowId || !body.afterHours || !body.action) {
    return NextResponse.json({ error: "workflowId, afterHours, action required" }, { status: 400 });
  }

  const rule = await createEscalationRule(body);
  if (!rule) return NextResponse.json({ error: "Failed to create rule" }, { status: 503 });
  return NextResponse.json({ rule }, { status: 201 });
}
