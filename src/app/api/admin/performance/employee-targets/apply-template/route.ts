import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import { applyTemplateToEmployeeTarget } from "@/lib/performance-engine";

/**
 * Phase W8.2 — apply a role template to ONE employee target as a starting point (Task 6).
 *
 * POST /api/admin/performance/employee-targets/apply-template
 *   body: { targetId: number, templateId: number }
 *   → seeds KPI rows from the template into that target's targetJson (links templateId),
 *     audits `employee_target_template_applied`, returns the rebuilt rows for editing.
 *
 * Affects only the selected employee's target — nothing is auto-assigned to a hierarchy or to
 * other employees. Admin / authorised manager only.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "Performance", "EDIT");
  if (deny) return deny;

  const body = await req.json();
  const targetId = Number(body?.targetId);
  const templateId = Number(body?.templateId);
  if (!targetId || !templateId) {
    return NextResponse.json({ error: "targetId and templateId required" }, { status: 400 });
  }

  const actorId = (session?.user as { employeeId?: number })?.employeeId;
  try {
    const rows = await applyTemplateToEmployeeTarget({ targetId, templateId, actorId });
    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to apply template" },
      { status: 400 },
    );
  }
}
