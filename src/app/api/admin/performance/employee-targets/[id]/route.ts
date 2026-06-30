import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import {
  getEmployeeTargetDetail,
  saveEmployeeTargetRows,
  validateTargetRows,
  type EmployeeTargetKpiRow,
} from "@/lib/performance-engine";

/**
 * Phase W8.2 — single employee target KPI editor.
 *
 * GET  /api/admin/performance/employee-targets/[id]
 *   → employee/period context + parsed KPI rows (no raw JSON exposed).
 *
 * PUT  /api/admin/performance/employee-targets/[id]
 *   body: { rows: EmployeeTargetKpiRow[], status?: string }
 *   → validates business rows, converts to targetJson internally, saves, audits.
 *
 * Admin / authorised manager only. Never writes KRAAchievement / PerformanceReview rows.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "Performance", "EDIT");
  if (deny) return deny;

  const { id } = await params;
  const detail = await getEmployeeTargetDetail(Number(id));
  if (!detail) return NextResponse.json({ error: "Target not found" }, { status: 404 });
  return NextResponse.json(detail);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "Performance", "EDIT");
  if (deny) return deny;

  const { id } = await params;
  const body = await req.json();
  const rows = body?.rows as EmployeeTargetKpiRow[] | undefined;
  if (!Array.isArray(rows)) {
    return NextResponse.json({ error: "rows array required" }, { status: 400 });
  }

  // Pre-validate so hard errors return 400 with details (weight≠100 is only a warning).
  const validation = validateTargetRows(rows);
  if (validation.errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", validation }, { status: 400 });
  }

  const actorId = (session?.user as { employeeId?: number })?.employeeId;
  const result = await saveEmployeeTargetRows({
    targetId: Number(id),
    rows,
    status: typeof body?.status === "string" ? body.status : undefined,
    actorId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Validation failed", validation: result.validation }, { status: 400 });
  }
  return NextResponse.json({ ok: true, validation: result.validation });
}
