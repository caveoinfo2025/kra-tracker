import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { getMyAssignedKraTargets } from "@/lib/performance-engine";

/**
 * Phase W8.4 — employee SELF-VIEW of assigned KRA targets (read-only).
 *
 * GET /api/performance/my-targets
 *   Returns the logged-in employee's own assigned KPI targets as business-friendly rows.
 *   SELF-SCOPED: the employee is resolved from the session only — there is NO employeeId/
 *   employeeProfileId override accepted, so an employee can never read another's targets.
 *   READ-ONLY: no writes, no KRAAchievement/PerformanceReview, no EmployeeTarget mutation,
 *   no raw targetJson exposed.
 */
export async function GET() {
  const session = await getSession();
  const employeeId = (session?.user as { employeeId?: number } | undefined)?.employeeId;
  if (!employeeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getMyAssignedKraTargets(employeeId);
  if (!data) {
    // No EmployeeProfile for this user yet → empty, self-shaped response (not an error).
    return NextResponse.json({
      employee: {
        employeeName: session?.user?.name ?? "",
        designation: "",
        department: "",
        team: "",
        reportingManager: "",
      },
      targets: [],
    });
  }

  return NextResponse.json({
    employee: {
      employeeName: data.employeeName,
      designation: data.designation,
      department: data.department,
      team: data.team,
      reportingManager: data.reportingManager,
    },
    targets: data.targets.map((t) => ({
      period: t.period,
      templateName: t.templateName,
      status: t.status,
      updatedAt: t.updatedAt,
      kpis: t.kpis,
    })),
  });
}
