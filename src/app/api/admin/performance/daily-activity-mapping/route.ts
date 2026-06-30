/**
 * Phase W8 — Daily Activity → Enterprise KRA mapping admin API (CONFIG ONLY).
 *
 * Manages ONLY `KRAMetric` rows with `calculationSource = "DAILY_ACTIVITY"`. It never writes
 * `KRAAchievement`, `PerformanceReview`, or `EmployeeTarget`, and never touches
 * `DailyActivityLog`/`DailyActivitySummary` or the legacy KRA/`WeeklyReview` system. Achievement
 * conversion (the actual KRA write path) is a later phase (W10) and is intentionally absent here.
 *
 *   GET  → list the Daily Activity mapping metrics.
 *   POST → idempotently create/reconcile the three default mapping metrics (no duplicates).
 *   PUT  → update one mapping metric's `formulaJson` (validated) and/or `status` only.
 *
 * Auth: manager-only, via the same `requirePermission("Settings","Performance","EDIT")` gate the
 * rest of /api/admin/performance uses.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import {
  listDailyActivityKraMetrics,
  ensureDefaultDailyActivityKraMetrics,
  validateDailyActivityFormulaJson,
  getKRAMetric,
  updateKRAMetric,
  logPerformanceAudit,
  DAILY_ACTIVITY_CALC_SOURCE,
} from "@/lib/performance-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "Performance", "EDIT");
  if (deny) return deny;

  const companyId = req.nextUrl.searchParams.get("companyId");
  const metrics = await listDailyActivityKraMetrics(companyId ? Number(companyId) : undefined);
  return NextResponse.json(metrics);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "Performance", "EDIT");
  if (deny) return deny;

  // Idempotent default-mapping setup. Creates/reconciles the 3 metrics; never duplicates,
  // never writes achievements/reviews/targets.
  const result = await ensureDefaultDailyActivityKraMetrics(session?.user?.employeeId);
  return NextResponse.json(result, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "Performance", "EDIT");
  if (deny) return deny;

  const body = await req.json();
  const { id, formulaJson, status } = body ?? {};
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Only Daily Activity mapping metrics are editable through this endpoint.
  const existing = await getKRAMetric(Number(id));
  if (!existing) return NextResponse.json({ error: "metric not found" }, { status: 404 });
  if (existing.calculationSource !== DAILY_ACTIVITY_CALC_SOURCE) {
    return NextResponse.json(
      { error: `this endpoint only manages calculationSource="${DAILY_ACTIVITY_CALC_SOURCE}" metrics` },
      { status: 400 },
    );
  }

  const data: { formulaJson?: string; status?: string } = {};
  if (typeof formulaJson === "string") {
    const valid = validateDailyActivityFormulaJson(formulaJson);
    if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });
    data.formulaJson = formulaJson;
  }
  if (typeof status === "string") {
    if (status !== "active" && status !== "inactive") {
      return NextResponse.json({ error: 'status must be "active" or "inactive"' }, { status: 400 });
    }
    data.status = status;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "nothing to update (formulaJson or status required)" }, { status: 400 });
  }

  const updated = await updateKRAMetric(Number(id), data);
  await logPerformanceAudit({
    entityType: "KRAMetric",
    entityId: Number(id),
    action: "DAILY_ACTIVITY_MAPPING_UPDATE",
    oldValue: JSON.stringify({ formulaJson: existing.formulaJson, status: existing.status }),
    newValue: JSON.stringify(data),
    performedBy: session?.user?.employeeId ?? 0,
  });
  return NextResponse.json(updated);
}
