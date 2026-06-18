import { NextRequest, NextResponse } from "next/server";
import { getSession }               from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import { getPasswordPolicy, upsertPasswordPolicy } from "@/lib/security-engine";
import { logSecurityEvent }         from "@/lib/security-engine";

export async function GET() {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "SecurityAdmin", "EDIT");
  if (deny) return deny;
  const policy = await getPasswordPolicy();
  return NextResponse.json(policy ?? null);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "SecurityAdmin", "EDIT");
  if (deny) return deny;
  const body = await req.json();
  const policy = await upsertPasswordPolicy(body);
  await logSecurityEvent({ userId: session?.user?.employeeId ?? undefined, eventType: "POLICY_CHANGED", metadata: { policyType: "PASSWORD", policyId: policy.id } });
  return NextResponse.json(policy, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "SecurityAdmin", "EDIT");
  if (deny) return deny;
  const body = await req.json();
  const { id, ...input } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const policy = await upsertPasswordPolicy(input, Number(id));
  await logSecurityEvent({ userId: session?.user?.employeeId ?? undefined, eventType: "POLICY_CHANGED", metadata: { policyType: "PASSWORD", policyId: Number(id) } });
  return NextResponse.json(policy);
}
