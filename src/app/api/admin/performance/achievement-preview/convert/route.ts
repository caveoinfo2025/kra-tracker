import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import {
  convertEmployeePreviewToAchievements,
  CONVERSION_MODES,
  type ConversionMode,
  type PreviewRangeInput,
} from "@/lib/performance-engine";

/**
 * Phase W10 — manager-approved conversion of an Enterprise KRA achievement PREVIEW into real
 * `KRAAchievement` rows.
 *
 * POST /api/admin/performance/achievement-preview/convert
 *   Body: { employeeProfileId (required), periodId?, month?, periodStart?, periodEnd?,
 *           mode?: "CREATE_ONLY" | "REPLACE_EXISTING" (default CREATE_ONLY), remarks? }
 *
 * Manager/admin ONLY (Settings → Performance gate, same as the read-only preview APIs).
 * EXPLICIT action only — this route is never called automatically. Writes ONLY `KRAAchievement`
 * (for `sourceStatus: "IMPLEMENTED"` KPI rows with a matching `KRAMetric`) and ONE `PerformanceAudit`
 * summary row. Never writes PerformanceReview/EmployeeTarget/KRAMetric/DailyActivity; never touches
 * legacy KRA/WeeklyReview or Daily Updates.
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
  if (!(CONVERSION_MODES as readonly string[]).includes(modeInput)) {
    return NextResponse.json({ error: `mode must be one of: ${CONVERSION_MODES.join(", ")}` }, { status: 400 });
  }
  const mode = modeInput as ConversionMode;

  const remarks = typeof body.remarks === "string" ? body.remarks.slice(0, 2000) : "";

  const rangeInput: PreviewRangeInput = {
    ...(body.periodId ? { periodId: Number(body.periodId) } : {}),
    ...(typeof body.month === "string" ? { month: body.month } : {}),
    ...(typeof body.periodStart === "string" ? { periodStart: body.periodStart } : {}),
    ...(typeof body.periodEnd === "string" ? { periodEnd: body.periodEnd } : {}),
  };

  const summary = await convertEmployeePreviewToAchievements(employeeProfileId, rangeInput, managerEmployeeId, mode, remarks);
  if (!summary) {
    return NextResponse.json({ error: "Employee profile not found or has no assigned targets to convert" }, { status: 404 });
  }

  return NextResponse.json(summary);
}
