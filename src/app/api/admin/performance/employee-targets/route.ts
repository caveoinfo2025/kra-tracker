import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import { listEmployeeTargets, parseEmployeeTargetJson } from "@/lib/performance-engine";

/**
 * Phase W8.2 — Employee Targets (KPI-level), business-shaped.
 *
 * GET /api/admin/performance/employee-targets[?periodId=&employeeProfileId=]
 * Returns one row per EmployeeTarget with employee NAME / role / manager context and a
 * lightweight KPI summary (count + total active weight) parsed from `targetJson`. The raw
 * JSON is never returned to the client. Admin / authorised manager only.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "Performance", "EDIT");
  if (deny) return deny;

  const periodId = req.nextUrl.searchParams.get("periodId");
  const employeeProfileId = req.nextUrl.searchParams.get("employeeProfileId");

  const targets = await listEmployeeTargets({
    ...(periodId ? { periodId: Number(periodId) } : {}),
    ...(employeeProfileId ? { employeeProfileId: Number(employeeProfileId) } : {}),
  });

  const shaped = (targets as Array<Record<string, unknown>>).map((t) => {
    const doc = parseEmployeeTargetJson(t.targetJson as string | undefined);
    const activeWeight = doc.targets
      .filter((r) => r.isActive)
      .reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
    const profile = t.employeeProfile as
      | { employee?: { name?: string }; designation?: { title?: string }; department?: { name?: string }; reportingManager?: { name?: string } }
      | undefined;
    const period = t.period as { name?: string } | undefined;
    return {
      id: t.id as number,
      employeeProfileId: t.employeeProfileId as number,
      employeeName: profile?.employee?.name ?? `Profile #${t.employeeProfileId}`,
      designation: profile?.designation?.title ?? "",
      department: profile?.department?.name ?? "",
      reportingManager: profile?.reportingManager?.name ?? "",
      periodId: t.periodId as number,
      periodName: period?.name ?? `Period #${t.periodId}`,
      templateId: (t.templateId as number | null) ?? null,
      templateName: doc.templateName,
      status: t.status as string,
      kpiCount: doc.targets.length,
      totalActiveWeight: activeWeight,
    };
  });

  return NextResponse.json(shaped);
}
