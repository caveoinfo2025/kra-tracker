import { NextRequest, NextResponse } from "next/server";
import { getSession }               from "@/lib/dev-session";
import { getMFAPolicy, upsertMFAPolicy } from "@/lib/security-engine";
import { logSecurityEvent }         from "@/lib/security-engine";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const policy = await getMFAPolicy();
  return NextResponse.json(policy ?? null);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const policy = await upsertMFAPolicy(body);
  await logSecurityEvent({ userId: session.user.employeeId ?? undefined, eventType: "POLICY_CHANGED", metadata: { policyType: "MFA", policyId: policy.id } });
  return NextResponse.json(policy, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { id, ...input } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const policy = await upsertMFAPolicy(input, Number(id));
  await logSecurityEvent({ userId: session.user.employeeId ?? undefined, eventType: "POLICY_CHANGED", metadata: { policyType: "MFA", enabled: input.enabled } });
  return NextResponse.json(policy);
}
