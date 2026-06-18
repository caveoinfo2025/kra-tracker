import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import { listCreditPolicies, createCreditPolicy, updateCreditPolicy } from "@/lib/finance-engine";

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const policies = await listCreditPolicies();
  return NextResponse.json({ policies });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as Parameters<typeof createCreditPolicy>[0];
  if (body.defaultCreditLimitLakhs === undefined || body.maxCreditLimitLakhs === undefined) {
    return NextResponse.json({ error: "defaultCreditLimitLakhs and maxCreditLimitLakhs are required" }, { status: 400 });
  }

  const policy = await createCreditPolicy(body);
  return NextResponse.json({ policy }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { id: number; [key: string]: unknown };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { id, ...data } = body;
  const policy = await updateCreditPolicy(id, data as Parameters<typeof updateCreditPolicy>[1]);
  return NextResponse.json({ policy });
}
