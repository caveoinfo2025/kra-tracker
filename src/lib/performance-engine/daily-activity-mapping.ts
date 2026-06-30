/**
 * Phase W8 — Daily Activity → Enterprise KRA mapping config (CONFIG ONLY).
 *
 * This module manages `KRAMetric` records whose `calculationSource = "DAILY_ACTIVITY"` and the
 * mapping config stored in their `formulaJson`. It is the admin/setup layer designed in
 * docs/webapp/DAILY_ACTIVITY_ENTERPRISE_KRA_INTEGRATION_PLAN.md.
 *
 * STRICT SCOPE — this module:
 *   - ONLY reads/writes `KRAMetric` rows (enterprise catalogue).
 *   - NEVER writes `KRAAchievement`, `PerformanceReview`, or `EmployeeTarget` (those are the
 *     W10+ conversion phase, gated on manager approval).
 *   - NEVER touches `DailyActivityLog`/`DailyActivitySummary` or the legacy `KRA`/`WeeklyReview`
 *     system (`src/lib/kra-engine.ts`). Daily Activity feeds ENTERPRISE KRA only.
 *
 * Schema note: `KRAMetric` has no `targetJson`/`weight`/`isActive` column, so the target
 * definition is nested under `formulaJson.target` (not a separate field), enable/disable uses
 * `status` ("active"/"inactive"), and per-template weight is a `KRATemplateItem` concern handled
 * later. No schema change is required for this phase.
 */
import prisma from "@/lib/prisma";
import { getKRAMetricByCode } from "./kra";
import { logPerformanceAudit } from "./audit";

export const DAILY_ACTIVITY_CALC_SOURCE = "DAILY_ACTIVITY";

/** Mirrors `isDailyActivityKraEligible` in src/lib/daily-activity.ts — keep in sync. */
export const DAILY_ACTIVITY_ELIGIBLE_STATUSES = ["CLOSED", "LATE_SUBMITTED"] as const;
export const DAILY_ACTIVITY_EXCLUDED_STATUSES = [
  "NO_ACTIVITY",
  "SUMMARY_PENDING",
  "INCOMPLETE",
  "REOPENED",
  "PENDING_CORRECTION",
] as const;

export const DAILY_ACTIVITY_MAPPING_TYPES = ["COVERAGE", "PRODUCTIVITY", "COMPLIANCE"] as const;
export type DailyActivityMappingType = (typeof DAILY_ACTIVITY_MAPPING_TYPES)[number];

/** The combined formula+target config stored in `KRAMetric.formulaJson`. */
function defaultFormulaJson(metricType: DailyActivityMappingType): string {
  return JSON.stringify({
    source: DAILY_ACTIVITY_CALC_SOURCE,
    version: 1,
    metricType,
    eligibleStatuses: [...DAILY_ACTIVITY_ELIGIBLE_STATUSES],
    excludedStatuses: [...DAILY_ACTIVITY_EXCLUDED_STATUSES],
    pointsVisibility: "MANAGER_ONLY",
    requiresManagerApprovalForConversion: true,
    // KRAMetric has no targetJson column → target definition is nested here.
    target: {
      period: "MONTHLY",
      workingDayBasis: "CALENDAR_DAYS_EXCLUDING_WEEKENDS_PENDING_DECISION",
      minimumCoveragePercent: metricType === "COVERAGE" ? 90 : null,
      minimumProductiveDays: null,
      minimumEligiblePoints: null,
    },
  });
}

export type DailyActivityMetricSpec = {
  code: string;
  name: string;
  description: string;
  /** KRAMetric.metricType (catalogue type) — distinct from formulaJson.metricType (mapping type). */
  metricType: string;
  mappingType: DailyActivityMappingType;
};

/** The three recommended Daily Activity KRA metrics (Phase W8 / integration plan §3). */
export const DAILY_ACTIVITY_METRIC_SPECS: DailyActivityMetricSpec[] = [
  {
    code: "DAILY_ACTIVITY_COVERAGE",
    name: "Daily Activity Coverage",
    description: "Eligible Daily Activity days vs working days in the period (read-only preview).",
    metricType: "PERCENTAGE",
    mappingType: "COVERAGE",
  },
  {
    code: "DAILY_ACTIVITY_PRODUCTIVITY",
    name: "Daily Activity Productivity",
    description: "Eligible productivity contribution from Daily Activity (read-only preview).",
    metricType: "COUNT",
    mappingType: "PRODUCTIVITY",
  },
  {
    code: "DAILY_ACTIVITY_COMPLIANCE",
    name: "Daily Activity Compliance / Exceptions",
    description: "Impact of incomplete / reopened / pending-correction days (read-only preview).",
    metricType: "PERCENTAGE",
    mappingType: "COMPLIANCE",
  },
];

/** List only the Daily Activity mapping metrics (calculationSource = DAILY_ACTIVITY). */
export async function listDailyActivityKraMetrics(companyId?: number) {
  try {
    return await prisma.kRAMetric.findMany({
      where: { calculationSource: DAILY_ACTIVITY_CALC_SOURCE, ...(companyId ? { companyId } : {}) },
      orderBy: { code: "asc" },
    });
  } catch {
    return [];
  }
}

export type MappingValidationResult = { ok: true } | { ok: false; error: string };

/** Validate a `formulaJson` string for a Daily Activity mapping metric. Pure, never throws. */
export function validateDailyActivityFormulaJson(formulaJson: string): MappingValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(formulaJson);
  } catch {
    return { ok: false, error: "formulaJson is not valid JSON" };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, error: "formulaJson must be a JSON object" };
  }
  const o = parsed as Record<string, unknown>;
  if (o.source !== DAILY_ACTIVITY_CALC_SOURCE) {
    return { ok: false, error: `formulaJson.source must be "${DAILY_ACTIVITY_CALC_SOURCE}"` };
  }
  if (typeof o.version !== "number") {
    return { ok: false, error: "formulaJson.version must be a number" };
  }
  if (!DAILY_ACTIVITY_MAPPING_TYPES.includes(o.metricType as DailyActivityMappingType)) {
    return { ok: false, error: `formulaJson.metricType must be one of ${DAILY_ACTIVITY_MAPPING_TYPES.join(", ")}` };
  }
  if (!Array.isArray(o.eligibleStatuses) || !Array.isArray(o.excludedStatuses)) {
    return { ok: false, error: "formulaJson.eligibleStatuses/excludedStatuses must be arrays" };
  }
  return { ok: true };
}

export type EnsureDefaultsResult = {
  created: { code: string; id: number }[];
  updated: { code: string; id: number }[];
  unchanged: { code: string; id: number }[];
};

/**
 * Idempotently ensure the three default Daily Activity KRA metrics exist.
 * - Missing metric → created with default config.
 * - Existing metric → name/description/metricType/calculationSource reconciled; `formulaJson` is
 *   only seeded when currently empty (admin edits are never overwritten); `status` is left as-is.
 * - Never duplicates (keyed by unique `code`). Never writes KRAAchievement/PerformanceReview/
 *   EmployeeTarget. Audited via PerformanceAudit when `performedBy` is supplied.
 */
export async function ensureDefaultDailyActivityKraMetrics(performedBy?: number): Promise<EnsureDefaultsResult> {
  const result: EnsureDefaultsResult = { created: [], updated: [], unchanged: [] };

  for (const spec of DAILY_ACTIVITY_METRIC_SPECS) {
    const existing = await getKRAMetricByCode(spec.code);

    if (!existing) {
      const created = await prisma.kRAMetric.create({
        data: {
          name: spec.name,
          code: spec.code,
          description: spec.description,
          metricType: spec.metricType,
          calculationSource: DAILY_ACTIVITY_CALC_SOURCE,
          formulaJson: defaultFormulaJson(spec.mappingType),
          status: "active",
        },
      });
      result.created.push({ code: spec.code, id: created.id });
      if (performedBy) {
        await logPerformanceAudit({
          entityType: "KRAMetric",
          entityId: created.id,
          action: "DAILY_ACTIVITY_MAPPING_CREATE",
          newValue: JSON.stringify({ code: spec.code, calculationSource: DAILY_ACTIVITY_CALC_SOURCE }),
          performedBy,
        });
      }
      continue;
    }

    // Reconcile non-destructively: fix catalogue fields, seed formulaJson only if empty.
    const needsCalcSource = existing.calculationSource !== DAILY_ACTIVITY_CALC_SOURCE;
    const needsFormula = !existing.formulaJson || existing.formulaJson.trim() === "";
    if (needsCalcSource || needsFormula) {
      const updated = await prisma.kRAMetric.update({
        where: { id: existing.id },
        data: {
          calculationSource: DAILY_ACTIVITY_CALC_SOURCE,
          ...(needsFormula ? { formulaJson: defaultFormulaJson(spec.mappingType) } : {}),
        },
      });
      result.updated.push({ code: spec.code, id: updated.id });
      if (performedBy) {
        await logPerformanceAudit({
          entityType: "KRAMetric",
          entityId: updated.id,
          action: "DAILY_ACTIVITY_MAPPING_RECONCILE",
          oldValue: JSON.stringify({ calculationSource: existing.calculationSource }),
          newValue: JSON.stringify({ calculationSource: DAILY_ACTIVITY_CALC_SOURCE, seededFormula: needsFormula }),
          performedBy,
        });
      }
    } else {
      result.unchanged.push({ code: spec.code, id: existing.id });
    }
  }

  return result;
}
