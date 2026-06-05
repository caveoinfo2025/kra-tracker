import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { listAssignmentRules, createAssignmentRule, updateAssignmentRule, deleteAssignmentRule } from "@/lib/crm-engine";

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rules = await listAssignmentRules();
  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    name: string;
    priority?: number;
    conditionJson: string;
    assignToType: string;
    assignToId?: number;
    assignToName?: string;
  };

  if (!body.name || !body.conditionJson || !body.assignToType) {
    return NextResponse.json({ error: "name, conditionJson and assignToType are required" }, { status: 400 });
  }

  const rule = await createAssignmentRule(body);
  return NextResponse.json({ rule }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { id: number; delete?: boolean; [key: string]: unknown };

  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (body.delete) {
    await deleteAssignmentRule(body.id);
    return NextResponse.json({ ok: true });
  }

  const { id, delete: _d, ...data } = body;
  const rule = await updateAssignmentRule(id, data as Parameters<typeof updateAssignmentRule>[1]);
  return NextResponse.json({ rule });
}
