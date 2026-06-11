import { NextRequest, NextResponse } from "next/server";
import { getSession }               from "@/lib/dev-session";
import { getSessionPolicy, upsertSessionPolicy } from "@/lib/security-engine";
import { logSecurityEvent }         from "@/lib/security-engine";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const policy = await getSessionPolicy();
  return NextResponse.json(policy ?? null);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const policy = await upsertSessionPolicy(body);
  await logSecurityEvent({ userId: session.user.employeeId ?? undefined, eventType: "POLICY_CHANGED", metadata: { policyType: "SESSION", policyId: policy.id } });
  return NextResponse.json(policy, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { id, ...input } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const policy = await upsertSessionPolicy(input, Number(id));
  await logSecurityEvent({ userId: session.user.employeeId ?? undefined, eventType: "POLICY_CHANGED", metadata: { policyType: "SESSION" } });
  return NextResponse.json(policy);
}
