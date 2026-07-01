import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import { listAchievementPreviewExceptions, type PreviewFilters } from "@/lib/performance-engine";

/**
 * Phase W9 — KRA achievement preview EXCEPTIONS (read-only).
 *
 * GET /api/admin/performance/achievement-preview/exceptions
 *   Surfaces employees/KPIs needing review before any conversion: no assigned targets, source not
 *   implemented, Daily Activity incomplete / pending-correction / reopened days, missing profile,
 *   invalid targetJson, total weight ≠ 100. Admin/manager only. READ-ONLY — no writes.
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
  };

  const exceptions = await listAchievementPreviewExceptions(filters);
  return NextResponse.json({ exceptions });
}
