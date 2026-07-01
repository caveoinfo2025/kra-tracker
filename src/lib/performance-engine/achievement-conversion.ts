/**
 * Phase W10 — Enterprise KRA achievement PREVIEW → `KRAAchievement` conversion (manager-approved,
 * explicit action only — NEVER automatic).
 *
 * Reuses the read-only Phase W9 preview engine (`achievement-preview.ts`) as the single source of
 * truth for actuals/achievement %/weight; this module's only job is deciding which preview rows are
 * eligible to convert and writing them. It:
 *   - WRITES `KRAAchievement` (only for `sourceStatus: "IMPLEMENTED"` KPI rows with a matching
 *     `KRAMetric.code`) and `PerformanceAudit` (one summary row per conversion call).
 *   - NEVER writes `PerformanceReview`, `EmployeeTarget`, `KRAMetric`, `DailyActivityLog`,
 *     `DailyActivitySummary`.
 *   - NEVER touches the legacy `KRA`/`WeeklyReview` system (`src/lib/kra-engine.ts`) or the
 *     legacy `POST /api/kra/sync-achievements` sync route (a different, non-idempotent precedent
 *     this module deliberately does not reuse).
 *   - Idempotent via `sourceReference` — `CREATE_ONLY` skips rows that already have a matching
 *     `sourceReference`; `REPLACE_EXISTING` updates ONLY the row with the exact matching
 *     `sourceReference` (never touches other periods/sources for the same employee/metric).
 */
import prisma from "@/lib/prisma";
import { calculateWeightedScore } from "./achievement";
import { logPerformanceAudit } from "./audit";
import {
  getEmployeeKraAchievementPreview,
  type EmployeePreview,
  type TargetPreview,
  type KpiPreview,
  type PreviewRangeInput,
} from "./achievement-preview";

export const CONVERSION_MODES = ["CREATE_ONLY", "REPLACE_EXISTING"] as const;
export type ConversionMode = (typeof CONVERSION_MODES)[number];

export type ConversionRowOutcome = "CREATED" | "REPLACED" | "SKIPPED";

export type ConversionRowResult = {
  targetId: number;
  metricCode: string;
  metricName: string;
  source: string;
  sourceReference: string;
  outcome: ConversionRowOutcome;
  reason?: string;
  achievementId?: number;
};

export type ConversionSummary = {
  employeeProfileId: number;
  periodStart: string | null;
  periodEnd: string | null;
  mode: ConversionMode;
  created: number;
  replaced: number;
  skipped: number;
  unsupported: number;
  needsReview: number;
  rows: ConversionRowResult[];
};

/**
 * Stable, idempotent identifier for one converted KPI row. Encodes the source, the employee, the
 * EXACT resolved preview range (not necessarily the EmployeeTarget's own period — a manager can
 * override month/periodStart/periodEnd), and the metric code. Two conversion calls for the same
 * (source, employee, range, metric) always produce the same `sourceReference`, which is what makes
 * CREATE_ONLY idempotent and REPLACE_EXISTING scoped to only the matching prior conversion.
 */
export function buildSourceReference(opts: {
  source: string;
  employeeProfileId: number;
  rangeStart: string;
  rangeEnd: string;
  metricCode: string;
}): string {
  const source = (opts.source || "MANUAL").toUpperCase();
  return `enterprise-preview:${source}:${opts.employeeProfileId}:${opts.rangeStart}:${opts.rangeEnd}:${opts.metricCode}`;
}

/**
 * Is this preview KPI row eligible to convert? Only `sourceStatus: "IMPLEMENTED"` rows with both
 * an actual value and an achievement % qualify. `CONFIG_REQUIRED` and other `NEEDS_REVIEW` rows are
 * bucketed together (a KPI preview never distinguishes them beyond `sourceStatus`); `NOT_IMPLEMENTED`
 * is its own bucket. Never throws.
 */
export function validatePreviewForConversion(kpi: KpiPreview): { eligible: boolean; bucket: "OK" | "UNSUPPORTED" | "NEEDS_REVIEW"; reason?: string } {
  if (kpi.sourceStatus === "NOT_IMPLEMENTED") {
    return { eligible: false, bucket: "UNSUPPORTED", reason: kpi.notes || "Source not implemented for this KPI." };
  }
  if (kpi.sourceStatus !== "IMPLEMENTED" || kpi.actualValue === null || kpi.achievementPercent === null) {
    return { eligible: false, bucket: "NEEDS_REVIEW", reason: kpi.notes || `sourceStatus=${kpi.sourceStatus} — needs review before conversion.` };
  }
  return { eligible: true, bucket: "OK" };
}

/** Look up an existing KRAAchievement by the EXACT sourceReference (idempotency key). */
export async function findExistingConvertedAchievements(employeeTargetId: number, sourceReference: string) {
  return prisma.kRAAchievement.findFirst({ where: { employeeTargetId, sourceReference } });
}

/**
 * Convert ONE target's eligible KPI rows into KRAAchievement rows (create or replace per `mode`).
 * Rows that are unsupported/needs-review/missing-metric are reported, never written. Never writes
 * PerformanceReview/EmployeeTarget/KRAMetric/DailyActivity.
 */
async function convertTargetPreview(
  target: TargetPreview,
  employeeProfileId: number,
  mode: ConversionMode,
): Promise<{ rows: ConversionRowResult[]; created: number; replaced: number; skipped: number; unsupported: number; needsReview: number }> {
  const rows: ConversionRowResult[] = [];
  let created = 0, replaced = 0, skipped = 0, unsupported = 0, needsReview = 0;

  for (const kpi of target.kpis) {
    const check = validatePreviewForConversion(kpi);
    const sourceReference = buildSourceReference({
      source: kpi.source, employeeProfileId, rangeStart: target.rangeStart, rangeEnd: target.rangeEnd, metricCode: kpi.metricCode,
    });

    if (!check.eligible) {
      skipped++;
      if (check.bucket === "UNSUPPORTED") unsupported++; else needsReview++;
      rows.push({ targetId: target.targetId, metricCode: kpi.metricCode, metricName: kpi.metricName, source: kpi.source, sourceReference, outcome: "SKIPPED", reason: check.reason });
      continue;
    }

    // KRAAchievement.metricId is a required FK to KRAMetric — a KPI row with no matching
    // KRAMetric.code (e.g. an ad hoc row never seeded from a template) cannot be converted.
    const metric = await prisma.kRAMetric.findUnique({ where: { code: kpi.metricCode }, select: { id: true } });
    if (!metric) {
      skipped++; needsReview++;
      rows.push({ targetId: target.targetId, metricCode: kpi.metricCode, metricName: kpi.metricName, source: kpi.source, sourceReference, outcome: "SKIPPED", reason: `No matching KRAMetric for code "${kpi.metricCode}" — cannot convert without a metric record.` });
      continue;
    }

    const existing = await findExistingConvertedAchievements(target.targetId, sourceReference);
    const actualValue = kpi.actualValue as number;
    const achievementPct = kpi.achievementPercent as number;
    const weightedScore = calculateWeightedScore(achievementPct, kpi.weight);

    if (existing) {
      if (mode === "CREATE_ONLY") {
        skipped++;
        rows.push({ targetId: target.targetId, metricCode: kpi.metricCode, metricName: kpi.metricName, source: kpi.source, sourceReference, outcome: "SKIPPED", reason: "Already converted for this period/source (CREATE_ONLY mode).", achievementId: existing.id });
        continue;
      }
      // REPLACE_EXISTING — update ONLY this exact-sourceReference row, never any other period/source.
      const updated = await prisma.kRAAchievement.update({
        where: { id: existing.id },
        data: { actualValue, achievementPct, weightedScore, calculatedAt: new Date() },
      });
      replaced++;
      rows.push({ targetId: target.targetId, metricCode: kpi.metricCode, metricName: kpi.metricName, source: kpi.source, sourceReference, outcome: "REPLACED", achievementId: updated.id });
      continue;
    }

    const createdRow = await prisma.kRAAchievement.create({
      data: { employeeTargetId: target.targetId, metricId: metric.id, actualValue, achievementPct, weightedScore, sourceReference },
    });
    created++;
    rows.push({ targetId: target.targetId, metricCode: kpi.metricCode, metricName: kpi.metricName, source: kpi.source, sourceReference, outcome: "CREATED", achievementId: createdRow.id });
  }

  return { rows, created, replaced, skipped, unsupported, needsReview };
}

/**
 * Convert an already-fetched preview (`EmployeePreview`) into KRAAchievement rows across ALL of its
 * targets, then write ONE `PerformanceAudit` summary row for the whole call. This is the core engine
 * — `convertEmployeePreviewToAchievements` below is the fetch-then-convert convenience wrapper the
 * API route actually calls.
 */
export async function convertPreviewToKraAchievements(
  preview: EmployeePreview,
  opts: { mode: ConversionMode; managerEmployeeId: number; remarks?: string },
): Promise<ConversionSummary> {
  let created = 0, replaced = 0, skipped = 0, unsupported = 0, needsReview = 0;
  const rows: ConversionRowResult[] = [];

  for (const target of preview.targets) {
    const r = await convertTargetPreview(target, preview.employeeProfileId, opts.mode);
    created += r.created; replaced += r.replaced; skipped += r.skipped;
    unsupported += r.unsupported; needsReview += r.needsReview;
    rows.push(...r.rows);
  }

  const periodStart = preview.targets[0]?.rangeStart ?? null;
  const periodEnd = preview.targets[0]?.rangeEnd ?? null;
  const sourceReferencePrefix = "enterprise-preview:";

  await writePerformanceAuditForConversion({
    employeeProfileId: preview.employeeProfileId,
    periodStart,
    periodEnd,
    created,
    skipped,
    replaced,
    remarks: opts.remarks ?? "",
    sourceReferencePrefix,
    mode: opts.mode,
    performedBy: opts.managerEmployeeId,
  });

  return { employeeProfileId: preview.employeeProfileId, periodStart, periodEnd, mode: opts.mode, created, replaced, skipped, unsupported, needsReview, rows };
}

/**
 * Fetch an employee's Enterprise KRA achievement preview (via the Phase W9 engine, exact-value
 * manager view — never the redacted employee view) and convert it. Manager-approved, explicit call
 * only — the caller (API route) is responsible for the manager/admin permission gate.
 */
export async function convertEmployeePreviewToAchievements(
  employeeProfileId: number,
  rangeInput: PreviewRangeInput | undefined,
  managerEmployeeId: number,
  mode: ConversionMode,
  remarks?: string,
): Promise<ConversionSummary | null> {
  const preview = await getEmployeeKraAchievementPreview(employeeProfileId, rangeInput);
  if (!preview) return null;
  return convertPreviewToKraAchievements(preview, { mode, managerEmployeeId, remarks });
}

/** Writes the ONE PerformanceAudit summary row for a conversion call. Never blocks/throws. */
export async function writePerformanceAuditForConversion(input: {
  employeeProfileId: number;
  periodStart: string | null;
  periodEnd: string | null;
  created: number;
  skipped: number;
  replaced: number;
  remarks: string;
  sourceReferencePrefix: string;
  mode: ConversionMode;
  performedBy: number;
}) {
  return logPerformanceAudit({
    entityType: "enterprise_kra_conversion",
    entityId: input.employeeProfileId,
    action: "enterprise_kra_preview_converted",
    newValue: JSON.stringify({
      employeeProfileId: input.employeeProfileId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      mode: input.mode,
      created: input.created,
      skipped: input.skipped,
      replaced: input.replaced,
      remarks: input.remarks,
      sourceReferencePrefix: input.sourceReferencePrefix,
    }),
    performedBy: input.performedBy,
  });
}
