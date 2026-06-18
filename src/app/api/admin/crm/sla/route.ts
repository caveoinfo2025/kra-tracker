import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import { listSLARules, createSLARule, updateSLARule, deleteSLARule } from "@/lib/crm-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const module = req.nextUrl.searchParams.get("module") ?? undefined;
  const rules = await listSLARules(module);
  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    module: string;
    event: string;
    label?: string;
    durationHours: number;
    warningHours?: number;
    escalationPolicyId?: number;
  };

  if (!body.module || !body.event || !body.durationHours) {
    return NextResponse.json({ error: "module, event and durationHours are required" }, { status: 400 });
  }

  const rule = await createSLARule(body);
  return NextResponse.json({ rule }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { id: number; delete?: boolean; [key: string]: unknown };

  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (body.delete) {
    await deleteSLARule(body.id);
    return NextResponse.json({ ok: true });
  }

  const { id, delete: _d, ...data } = body;
  const rule = await updateSLARule(id, data as Parameters<typeof updateSLARule>[1]);
  return NextResponse.json({ rule });
}
