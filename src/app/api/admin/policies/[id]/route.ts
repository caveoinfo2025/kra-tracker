/**
 * PATCH /api/admin/policies/[id]
 * Update policy fields and/or transition status.
 * Rules are managed via nested body.rules (upsert array).
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { canAccessSettings } from "@/lib/roles";

async function requirePolicyEdit() {
  const session = await getSession();
  if (!session?.user) return { error: "Unauthorized", status: 401 as const };
  if (!canAccessSettings(session.user)) return { error: "Forbidden", status: 403 as const };
  return { session };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const check = await requirePolicyEdit();
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id } = await params;
  const policyId = parseInt(id, 10);
  if (isNaN(policyId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const userId = check.session.user.employeeId ?? 0;
  const body = await req.json();
  const {
    name, description, scopeType, scopeId, effectiveFrom, effectiveTo,
    status: newStatus, changeReason,
    rules,
  } = body as {
    name?: string; description?: string; scopeType?: string; scopeId?: number | null;
    effectiveFrom?: string | null; effectiveTo?: string | null;
    status?: string; changeReason?: string;
    rules?: Array<{
      id?: number; ruleName: string; priority: number;
      conditionJson: string; actionJson: string; isActive?: boolean;
    }>;
  };

  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;

    const existing = await db.policy.findUnique({ where: { id: policyId } }) as Record<string, any> | null;
    if (!existing) return NextResponse.json({ error: "Policy not found" }, { status: 404 });

    // Only DRAFT policies are editable
    if (existing.status !== "DRAFT" && !newStatus) {
      return NextResponse.json({ error: "Only DRAFT policies can be edited" }, { status: 400 });
    }

    // Handle status transition
    if (newStatus && newStatus !== existing.status) {
      const { transitionPolicyStatus } = await import("@/lib/policy-engine");
      await transitionPolicyStatus(policyId, newStatus as never, userId, changeReason ?? "");
    }

    // Update scalar fields (only when still in DRAFT or if just transitioning)
    if (existing.status === "DRAFT") {
      const data: Record<string, unknown> = {};
      if (name !== undefined)          data.name          = name.trim();
      if (description !== undefined)   data.description   = description.trim();
      if (scopeType !== undefined)     data.scopeType     = scopeType;
      if ("scopeId" in body)           data.scopeId       = scopeId ?? null;
      if ("effectiveFrom" in body)     data.effectiveFrom = effectiveFrom ? new Date(effectiveFrom) : null;
      if ("effectiveTo" in body)       data.effectiveTo   = effectiveTo   ? new Date(effectiveTo)   : null;

      if (Object.keys(data).length > 0) {
        await db.policy.update({ where: { id: policyId }, data });
        await db.policyAudit.create({
          data: { policyId, action: "UPDATED", newValue: JSON.stringify(data), performedBy: userId },
        });
      }
    }

    // Upsert rules if provided (only for DRAFT policies)
    if (rules && existing.status === "DRAFT") {
      for (const rule of rules) {
        if (rule.id) {
          await db.policyRule.update({
            where: { id: rule.id },
            data: {
              ruleName:      rule.ruleName,
              priority:      rule.priority,
              conditionJson: rule.conditionJson,
              actionJson:    rule.actionJson,
              isActive:      rule.isActive ?? true,
            },
          });
        } else {
          const created = await db.policyRule.create({
            data: {
              policyId,
              ruleName:      rule.ruleName,
              priority:      rule.priority,
              conditionJson: rule.conditionJson,
              actionJson:    rule.actionJson,
              isActive:      rule.isActive ?? true,
            },
          }) as { ruleName: string };
          await db.policyAudit.create({
            data: { policyId, action: "RULE_ADDED", newValue: created.ruleName, performedBy: userId },
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && (e.message.includes("not found") || e.message.includes("Cannot publish"))) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Service unavailable — DB not ready" }, { status: 503 });
  }
}
