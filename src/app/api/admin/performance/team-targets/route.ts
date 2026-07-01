import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import { listAssignedKraTargetsGrouped } from "@/lib/performance-engine";

/**
 * Phase W8.4 — manager/admin TEAM VIEW of assigned KRA targets (read-only).
 *
 * GET /api/admin/performance/team-targets
 *   Optional filters: employeeProfileId, periodId, templateId, status.
 *   Returns assigned KPI targets grouped by employee (business-friendly rows, no raw JSON).
 *
 * NOTE: distinct from the legacy `TeamTarget` model (team-level numbers) — this surfaces the
 * per-EMPLOYEE `EmployeeTarget` KPI rows for a manager to review. Admin / authorised manager only
 * (same Settings → Performance gate as the assignment routes). READ-ONLY: no writes of any kind.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "Performance", "EDIT");
  if (deny) return deny;

  const sp = req.nextUrl.searchParams;
  const employeeProfileId = sp.get("employeeProfileId");
  const periodId = sp.get("periodId");
  const templateId = sp.get("templateId");
  const status = sp.get("status");

  const employees = await listAssignedKraTargetsGrouped({
    ...(employeeProfileId ? { employeeProfileId: Number(employeeProfileId) } : {}),
    ...(periodId ? { periodId: Number(periodId) } : {}),
    ...(templateId ? { templateId: Number(templateId) } : {}),
    ...(status ? { status } : {}),
  });

  return NextResponse.json({ employees });
}
