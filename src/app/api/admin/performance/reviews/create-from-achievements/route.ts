import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import {
  createPerformanceReviewFromAchievements,
  REVIEW_CREATION_MODES,
  type ReviewCreationMode,
} from "@/lib/performance-engine";

/**
 * Phase W11 — manager-approved PerformanceReview creation from CONVERTED KRAAchievement rows.
 *
 * POST /api/admin/performance/reviews/create-from-achievements
 *   Body: { employeeProfileId (required), periodId?, remarks?, mode?: "CREATE_ONLY" (default) |
 *           "REOPEN_EXISTING" }
 *
 * Manager/admin ONLY (same `Settings/Performance/EDIT` gate as the achievement-preview conversion
 * API). EXPLICIT action only — never called automatically. Requires at least one CONVERTED
 * KRAAchievement row for the resolved EmployeeTarget (never creates a review from preview-only
 * data). Prevents duplicate reviews per EmployeeTarget. Writes ONLY PerformanceReview +
 * PerformanceAudit — never touches KRAAchievement/EmployeeTarget/KRAMetric, never uses legacy KRA.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "Performance", "EDIT");
  if (deny) return deny;

  const managerEmployeeId = (session?.user as { employeeId?: number } | undefined)?.employeeId;
  if (!managerEmployeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const employeeProfileId = Number(body.employeeProfileId);
  if (!employeeProfileId || Number.isNaN(employeeProfileId)) {
    return NextResponse.json({ error: "employeeProfileId is required" }, { status: 400 });
  }

  const modeInput = typeof body.mode === "string" ? body.mode.toUpperCase() : "CREATE_ONLY";
  if (!(REVIEW_CREATION_MODES as readonly string[]).includes(modeInput)) {
    return NextResponse.json({ error: `mode must be one of: ${REVIEW_CREATION_MODES.join(", ")}` }, { status: 400 });
  }

  const result = await createPerformanceReviewFromAchievements(
    {
      employeeProfileId,
      ...(body.periodId ? { periodId: Number(body.periodId) } : {}),
      remarks: typeof body.remarks === "string" ? body.remarks.slice(0, 2000) : "",
      mode: modeInput as ReviewCreationMode,
    },
    managerEmployeeId,
  );

  return NextResponse.json(result);
}
