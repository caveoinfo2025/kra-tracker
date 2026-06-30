import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import { listPerformanceAuditDetailed, AUDIT_LIMIT_DEFAULT, AUDIT_LIMIT_MAX } from "@/lib/performance-engine";
import { parseDateOnlyAsLocalDate } from "@/lib/date-only";

/**
 * Phase W8.3 — Performance Audit READ endpoint (visibility only).
 *
 * GET /api/admin/performance/audit
 *   Optional filters: entityType, action, employeeProfileId, startDate, endDate (YYYY-MM-DD),
 *   limit (default 50, max 200). Returns business-friendly rows newest-first.
 *
 * READ-ONLY: no writes of any kind. Admin / authorised manager only (same Settings → Performance
 * EDIT gate as the other performance admin routes; managers always pass, plain employees get 403).
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "Performance", "EDIT");
  if (deny) return deny;

  const sp = req.nextUrl.searchParams;
  const entityType = sp.get("entityType") || undefined;
  const action = sp.get("action") || undefined;
  const employeeProfileId = sp.get("employeeProfileId");
  const startDate = sp.get("startDate");
  const endDate = sp.get("endDate");
  const limitParamRaw = sp.get("limit");

  // Parse date-only bounds. createdAt is a plain DateTime → use local-midnight day boundaries
  // (gte start-of-startDate, lt start-of-endDate+1 day). Malformed dates → 400.
  let createdGte: Date | undefined;
  let createdLt: Date | undefined;
  try {
    if (startDate) createdGte = parseDateOnlyAsLocalDate(startDate);
    if (endDate) {
      const end = parseDateOnlyAsLocalDate(endDate);
      createdLt = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
    }
  } catch {
    return NextResponse.json({ error: "Invalid startDate/endDate (expected YYYY-MM-DD)" }, { status: 400 });
  }

  let limit = AUDIT_LIMIT_DEFAULT;
  if (limitParamRaw) {
    const n = Number(limitParamRaw);
    if (Number.isFinite(n) && n > 0) limit = Math.min(Math.floor(n), AUDIT_LIMIT_MAX);
  }

  const rows = await listPerformanceAuditDetailed({
    entityType,
    action,
    employeeProfileId: employeeProfileId ? Number(employeeProfileId) : undefined,
    createdGte,
    createdLt,
    limit,
  });

  return NextResponse.json(rows);
}
