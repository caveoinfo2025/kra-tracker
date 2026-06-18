import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import { getTerritory, updateTerritory, addTerritoryRule, deleteTerritoryRule } from "@/lib/crm-engine";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const territory = await getTerritory(Number(id));
  if (!territory) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(territory);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    name?: string;
    description?: string;
    status?: string;
    addRule?: { conditionJson: string };
    deleteRuleId?: number;
  };

  const numId = Number(id);

  if (body.addRule) {
    const rule = await addTerritoryRule(numId, body.addRule.conditionJson);
    return NextResponse.json({ rule }, { status: 201 });
  }
  if (body.deleteRuleId) {
    await deleteTerritoryRule(body.deleteRuleId);
    return NextResponse.json({ ok: true });
  }

  const territory = await updateTerritory(numId, {
    name: body.name,
    description: body.description,
    status: body.status,
  });
  return NextResponse.json({ territory });
}
