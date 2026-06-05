import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { listAutomationRules, createAutomationRule, updateAutomationRule, deleteAutomationRule } from "@/lib/crm-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const event = req.nextUrl.searchParams.get("event") ?? undefined;
  const rules = await listAutomationRules(event);
  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    name: string;
    event: string;
    conditionJson?: string;
    actionJson: string;
  };

  if (!body.name || !body.event || !body.actionJson) {
    return NextResponse.json({ error: "name, event and actionJson are required" }, { status: 400 });
  }

  const rule = await createAutomationRule(body);
  return NextResponse.json({ rule }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { id: number; delete?: boolean; [key: string]: unknown };

  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (body.delete) {
    await deleteAutomationRule(body.id);
    return NextResponse.json({ ok: true });
  }

  const { id, delete: _d, ...data } = body;
  const rule = await updateAutomationRule(id, data as Parameters<typeof updateAutomationRule>[1]);
  return NextResponse.json({ rule });
}
