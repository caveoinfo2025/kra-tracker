import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import { listReviewCandidates } from "@/lib/performance-engine";

/**
 * Phase W11 — read-only list of employees eligible for PerformanceReview creation.
 *
 * GET /api/admin/performance/reviews/candidates[?employeeProfileId=&reportingManagerId=]
 *   For each active EmployeeProfile, reports whether their current EmployeeTarget has converted
 *   KRAAchievement rows ready to review, already has a review, or has no target/no conversions yet.
 *   Manager/admin only. READ-ONLY — no writes.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "Performance", "EDIT");
  if (deny) return deny;

  const sp = req.nextUrl.searchParams;
  const candidates = await listReviewCandidates({
    ...(sp.get("employeeProfileId") ? { employeeProfileId: Number(sp.get("employeeProfileId")) } : {}),
    ...(sp.get("reportingManagerId") ? { reportingManagerId: Number(sp.get("reportingManagerId")) } : {}),
  });

  return NextResponse.json({ candidates });
}
