import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import { listKraAchievementPreviewGrouped, type PreviewFilters } from "@/lib/performance-engine";

/**
 * Phase W9 — manager/admin KRA achievement PREVIEW (read-only).
 *
 * GET /api/admin/performance/achievement-preview
 *   Filters: employeeProfileId, periodId, month (YYYY-MM), periodStart, periodEnd, status.
 *   Returns grouped employee previews with EXACT values (manager sees Daily Activity detail).
 *   Admin/manager only (Settings → Performance gate). READ-ONLY — no writes, no conversion.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "Performance", "EDIT");
  if (deny) return deny;

  const sp = req.nextUrl.searchParams;
  const filters: PreviewFilters = {
    ...(sp.get("employeeProfileId") ? { employeeProfileId: Number(sp.get("employeeProfileId")) } : {}),
    ...(sp.get("periodId") ? { periodId: Number(sp.get("periodId")) } : {}),
    ...(sp.get("month") ? { month: sp.get("month")! } : {}),
    ...(sp.get("periodStart") ? { periodStart: sp.get("periodStart")! } : {}),
    ...(sp.get("periodEnd") ? { periodEnd: sp.get("periodEnd")! } : {}),
    ...(sp.get("status") ? { status: sp.get("status")! } : {}),
  };

  const employees = await listKraAchievementPreviewGrouped(filters);
  return NextResponse.json({ employees });
}
