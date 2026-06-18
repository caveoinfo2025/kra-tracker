import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import { listAdvancePolicies, createAdvancePolicy, updateAdvancePolicy } from "@/lib/finance-engine";

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const policies = await listAdvancePolicies();
  return NextResponse.json({ policies });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as Parameters<typeof createAdvancePolicy>[0];
  if (body.maxAdvanceLakhs === undefined) {
    return NextResponse.json({ error: "maxAdvanceLakhs is required" }, { status: 400 });
  }

  const policy = await createAdvancePolicy(body);
  return NextResponse.json({ policy }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { id: number; [key: string]: unknown };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { id, ...data } = body;
  const policy = await updateAdvancePolicy(id, data as Parameters<typeof updateAdvancePolicy>[1]);
  return NextResponse.json({ policy });
}
