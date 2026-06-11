import { NextRequest, NextResponse } from "next/server";
import { getSession }               from "@/lib/dev-session";
import { getDataProtectionPolicy, upsertDataProtectionPolicy } from "@/lib/security-engine";
import { logSecurityEvent }         from "@/lib/security-engine";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const policy = await getDataProtectionPolicy();
  return NextResponse.json(policy ?? null);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const policy = await upsertDataProtectionPolicy(body);
  await logSecurityEvent({ userId: session.user.employeeId ?? undefined, eventType: "POLICY_CHANGED", metadata: { policyType: "DATA_PROTECTION", policyId: policy.id } });
  return NextResponse.json(policy, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { id, ...input } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const policy = await upsertDataProtectionPolicy(input, Number(id));
  await logSecurityEvent({ userId: session.user.employeeId ?? undefined, eventType: "POLICY_CHANGED", metadata: { policyType: "DATA_PROTECTION" } });
  return NextResponse.json(policy);
}
