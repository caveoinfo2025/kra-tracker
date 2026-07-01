import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { getMyKraAchievementPreview, type PreviewRangeInput } from "@/lib/performance-engine";

/**
 * Phase W9 — employee SELF-VIEW of KRA achievement PREVIEW (read-only).
 *
 * GET /api/performance/my-achievement-preview[?periodId=&month=YYYY-MM&periodStart=&periodEnd=]
 *   Self-scoped from the session (no employeeId/employeeProfileId override). Returns business-
 *   friendly per-KPI preview (target, %, status) — raw Daily Activity point counts are redacted
 *   (manager-only). READ-ONLY: never writes KRAAchievement/PerformanceReview/EmployeeTarget/etc.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  const employeeId = (session?.user as { employeeId?: number } | undefined)?.employeeId;
  if (!employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const range: PreviewRangeInput = {
    ...(sp.get("periodId") ? { periodId: Number(sp.get("periodId")) } : {}),
    ...(sp.get("month") ? { month: sp.get("month")! } : {}),
    ...(sp.get("periodStart") ? { periodStart: sp.get("periodStart")! } : {}),
    ...(sp.get("periodEnd") ? { periodEnd: sp.get("periodEnd")! } : {}),
  };

  const data = await getMyKraAchievementPreview(employeeId, range);
  if (!data) {
    return NextResponse.json({
      employee: { employeeName: session?.user?.name ?? "", designation: "", department: "", team: "", reportingManager: "" },
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
    targets: data.targets,
  });
}
