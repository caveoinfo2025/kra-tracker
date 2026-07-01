/**
 * Phase W9 — Enterprise KRA achievement PREVIEW (read-only).
 *
 * Calculates progress against assigned `EmployeeTarget` KPI rows using operational source data:
 * DAILY_ACTIVITY (full), CRM_LEADS (qualified-lead count only, Phase W9.1), and CRM_MEETINGS /
 * CRM_OPPORTUNITY / CRM_PIPELINE (specific metrics only, Phase W9.2 — see each section below for
 * exactly which metrics are supported and why). This module is STRICTLY READ-ONLY:
 *   - It only READS `EmployeeTarget` / `EmployeeProfile` / `PerformancePeriod` / `DailyActivitySummary`
 *     / `DailyActivityLog` / `CrmOpportunity` / `CrmLead`.
 *   - It NEVER writes `KRAAchievement`, `PerformanceReview`, `EmployeeTarget`, `KRAMetric`,
 *     `DailyActivityLog`, `DailyActivitySummary`, `CrmMeeting`, `CrmOpportunity`, or `PerformanceAudit`.
 *   - It NEVER touches the legacy `KRA`/`WeeklyReview` system (`src/lib/kra-engine.ts`) or Daily Updates.
 *
 * KRA structure: KRA Template → KPI/Metric → Employee-specific Target → **Preview** Achievement.
 * Unsupported sources/metrics return `sourceStatus: "NOT_IMPLEMENTED"` (never throw).
 */
import prisma from "@/lib/prisma";
import {
  resolveEffectiveDailyActivityStatus,
  isDailyActivityKraEligible,
} from "@/lib/daily-activity";
import { dbDateToDateKey, toDateKeyLocal, dateKeyToDbDate } from "@/lib/date-only";
import { moneyToNumberForDisplay } from "@/lib/money";
import { parseEmployeeTargetJson, type EmployeeTargetKpiRow } from "./targets";

// ── Enums / constants ──────────────────────────────────────────────────────────

export const PREVIEW_STATUSES = [
  "NOT_STARTED",
  "BELOW_TARGET",
  "ON_TRACK",
  "ACHIEVED",
  "EXCEEDED",
  "NOT_IMPLEMENTED",
  "NEEDS_REVIEW",
] as const;
export type PreviewStatus = (typeof PREVIEW_STATUSES)[number];

export type SourceStatus = "IMPLEMENTED" | "NOT_IMPLEMENTED" | "CONFIG_REQUIRED" | "NEEDS_REVIEW" | "NO_DATA";
export type TargetDirection = "HIGHER_IS_BETTER" | "LOWER_IS_BETTER";

/** Enterprise KRA convention: preview achievement is capped at 200%. */
export const PREVIEW_PERCENT_CAP = 200;

/** Sources for which a live preview calculation exists. CRM_LEADS/CRM_MEETINGS/CRM_OPPORTUNITY/
 *  CRM_PIPELINE are all PARTIAL — only specific metrics per source are supported this phase. */
export const PREVIEW_SUPPORTED_SOURCES = [
  "DAILY_ACTIVITY",
  "CRM_LEADS",
  "CRM_MEETINGS",
  "CRM_OPPORTUNITY",
  "CRM_PIPELINE",
] as const;

// ── Output shapes ───────────────────────────────────────────────────────────────

export type KpiPreview = {
  metricCode: string;
  metricName: string;
  category: string;
  source: string;
  unit: string;
  targetValue: number;
  actualValue: number | null;
  achievementPercent: number | null;
  weight: number;
  weightedPreviewScore: number | null;
  frequency: string;
  direction: TargetDirection;
  status: PreviewStatus;
  sourceStatus: SourceStatus;
  needsReview: boolean;
  notes: string;
  exclusionSummary?: string;
};

export type TargetPreview = {
  targetId: number;
  period: string;
  periodId: number;
  templateName: string;
  status: string;
  rangeLabel: string;
  /** Date-only (YYYY-MM-DD) bounds actually used to compute this target's KPIs — the resolved
   *  range (explicit override → month → periodId → the target's own period), NOT necessarily the
   *  EmployeeTarget's own period dates. Phase W10 uses these to build a stable, idempotent
   *  `sourceReference` for conversion — never persisted anywhere, read-only preview data. */
  rangeStart: string;
  rangeEnd: string;
  kpis: KpiPreview[];
  totalWeight: number;
  weightedPreviewTotal: number | null;
};

export type EmployeePreview = {
  employeeProfileId: number;
  employeeName: string;
  designation: string;
  department: string;
  team: string;
  reportingManager: string;
  targets: TargetPreview[];
};

export type PreviewRange = { startDate: Date; endDate: Date; label: string };
export type PreviewRangeInput = {
  periodId?: number;
  month?: string; // YYYY-MM
  periodStart?: string; // YYYY-MM-DD
  periodEnd?: string; // YYYY-MM-DD
};

// ── Pure calculation helpers ─────────────────────────────────────────────────────

/** Infer whether higher or lower actuals are better, from the target row metadata. */
export function inferDirection(row: Pick<EmployeeTargetKpiRow, "metricCode" | "metricName" | "category" | "unit">): TargetDirection {
  const hay = `${row.metricCode} ${row.metricName} ${row.category} ${row.unit}`.toLowerCase();
  if (/incomplete|pending|correction|reopen|max|breach|violation|overdue|error|defect|compliance/.test(hay)) {
    return "LOWER_IS_BETTER";
  }
  return "HIGHER_IS_BETTER";
}

/** Compute achievement % (capped at PREVIEW_PERCENT_CAP). Never throws. */
export function calculatePreviewPercentage(actual: number, target: number, direction: TargetDirection): number {
  const cap = (n: number) => Math.max(0, Math.min(PREVIEW_PERCENT_CAP, Math.round(n * 10) / 10));
  if (direction === "LOWER_IS_BETTER") {
    // "max allowed" style: compliant (actual ≤ target) → 100%; over the limit degrades toward 0.
    if (actual <= target) return 100;
    const denom = target > 0 ? target : 1;
    return cap(100 - ((actual - target) / denom) * 100);
  }
  // HIGHER_IS_BETTER
  if (target <= 0) return actual > 0 ? PREVIEW_PERCENT_CAP : 0;
  return cap((actual / target) * 100);
}

/** Map an achievement % (+ context) to a preview status band. */
export function buildPreviewStatus(
  percentage: number | null,
  opts: { direction: TargetDirection; hasActivity: boolean; actual: number | null },
): PreviewStatus {
  if (percentage === null) return "NEEDS_REVIEW";
  if (opts.direction === "HIGHER_IS_BETTER" && (opts.actual ?? 0) <= 0 && !opts.hasActivity) return "NOT_STARTED";
  if (opts.direction === "LOWER_IS_BETTER") {
    return percentage >= 100 ? "ACHIEVED" : percentage >= 60 ? "ON_TRACK" : "BELOW_TARGET";
  }
  if (percentage >= 120) return "EXCEEDED";
  if (percentage >= 100) return "ACHIEVED";
  if (percentage >= 60) return "ON_TRACK";
  if (percentage > 0) return "BELOW_TARGET";
  return "NOT_STARTED";
}

// ── Daily Activity context ───────────────────────────────────────────────────────

export type DailyActivityContext = {
  workingDays: number;
  eligibleDays: number;
  excludedDays: number;
  eligiblePoints: number;
  activityCount: number;
  productiveDays: number;
  incompleteDays: number;
  noActivityDays: number;
  reopenedDays: number;
  pendingCorrectionDays: number;
  summaryPendingDays: number;
};

function emptyDailyActivityContext(): DailyActivityContext {
  return {
    workingDays: 0, eligibleDays: 0, excludedDays: 0, eligiblePoints: 0, activityCount: 0,
    productiveDays: 0, incompleteDays: 0, noActivityDays: 0, reopenedDays: 0,
    pendingCorrectionDays: 0, summaryPendingDays: 0,
  };
}

/**
 * Build the Daily Activity aggregate for an employee (auth `Employee.id`) over [startDate, endDate].
 * Working days = weekdays (Mon–Fri) in the range — no holiday calendar exists yet, so holidays are
 * NOT excluded (documented denominator). Each weekday's EFFECTIVE status is resolved via the shared
 * `resolveEffectiveDailyActivityStatus` overlay (never the raw stored column). Read-only.
 */
export async function buildDailyActivityContext(
  employeeId: number,
  startDate: Date,
  endDate: Date,
  now: Date = new Date(),
): Promise<DailyActivityContext> {
  const ctx = emptyDailyActivityContext();
  if (endDate.getTime() < startDate.getTime()) return ctx;

  // `summaryDate` is a `@db.Date` column stored UTC-tagged (see @/lib/date-only) — query bounds MUST
  // be built with `dateKeyToDbDate`, NOT raw local-midnight Dates, or IST-offset rows fall out of range.
  const gteDb = dateKeyToDbDate(toDateKeyLocal(startDate));
  const lteDb = dateKeyToDbDate(toDateKeyLocal(endDate));
  let summaries: { summaryDate: Date; status: string; totalPoints: number; productivityBand: string }[] = [];
  try {
    summaries = await prisma.dailyActivitySummary.findMany({
      where: { employeeId, summaryDate: { gte: gteDb, lte: lteDb } },
      select: { summaryDate: true, status: true, totalPoints: true, productivityBand: true },
    });
  } catch {
    return ctx;
  }

  const byKey = new Map<string, { status: string; totalPoints: number; productivityBand: string }>();
  for (const s of summaries) {
    byKey.set(dbDateToDateKey(s.summaryDate), { status: s.status, totalPoints: s.totalPoints, productivityBand: s.productivityBand });
  }

  // Iterate weekdays in the range using local-date arithmetic.
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const last = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  let guard = 0;
  while (cursor.getTime() <= last.getTime() && guard < 1000) {
    guard += 1;
    const dow = cursor.getDay(); // 0 = Sun, 6 = Sat
    if (dow !== 0 && dow !== 6) {
      ctx.workingDays += 1;
      const key = toDateKeyLocal(cursor);
      const row = byKey.get(key);
      const hasActivity = (row?.totalPoints ?? 0) > 0;
      const effective = resolveEffectiveDailyActivityStatus({
        storedStatus: row?.status,
        hasActivity,
        day: new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()),
        now,
      });
      if (hasActivity) ctx.activityCount += 1;
      if (isDailyActivityKraEligible(effective)) {
        ctx.eligibleDays += 1;
        ctx.eligiblePoints += row?.totalPoints ?? 0;
        if (row?.productivityBand === "PRODUCTIVE" || row?.productivityBand === "HIGHLY_PRODUCTIVE") ctx.productiveDays += 1;
      } else {
        ctx.excludedDays += 1;
        switch (effective) {
          case "INCOMPLETE": ctx.incompleteDays += 1; break;
          case "NO_ACTIVITY": ctx.noActivityDays += 1; break;
          case "REOPENED": ctx.reopenedDays += 1; break;
          case "PENDING_CORRECTION": ctx.pendingCorrectionDays += 1; break;
          case "SUMMARY_PENDING": ctx.summaryPendingDays += 1; break;
        }
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return ctx;
}

function exclusionSummary(ctx: DailyActivityContext): string | undefined {
  const parts: string[] = [];
  if (ctx.incompleteDays) parts.push(`${ctx.incompleteDays} incomplete`);
  if (ctx.reopenedDays) parts.push(`${ctx.reopenedDays} reopened`);
  if (ctx.pendingCorrectionDays) parts.push(`${ctx.pendingCorrectionDays} pending-correction`);
  if (ctx.summaryPendingDays) parts.push(`${ctx.summaryPendingDays} pending-submission`);
  return parts.length ? `Excluded: ${parts.join(", ")}` : undefined;
}

// ── Per-KPI preview ──────────────────────────────────────────────────────────────

function baseKpi(row: EmployeeTargetKpiRow): Omit<KpiPreview, "actualValue" | "achievementPercent" | "weightedPreviewScore" | "direction" | "status" | "sourceStatus" | "needsReview"> {
  return {
    metricCode: row.metricCode,
    metricName: row.metricName || row.metricCode,
    category: row.category,
    source: row.source,
    unit: row.unit,
    targetValue: row.targetValue,
    weight: row.weight,
    frequency: row.frequency,
    notes: row.notes,
  };
}

/**
 * Compute a Daily Activity KPI preview from a target row + DA context. Interprets the KPI by
 * metricCode/name keywords + unit: coverage (% of working days eligible), productivity (eligible
 * points or productive days), and compliance ("max allowed" incomplete/pending/reopened days).
 */
export function calculateDailyActivityKpiPreview(row: EmployeeTargetKpiRow, ctx: DailyActivityContext): KpiPreview {
  const base = baseKpi(row);
  const hay = `${row.metricCode} ${row.metricName} ${row.category}`.toLowerCase();
  const unit = (row.unit || "").toUpperCase();
  const anyActivity = ctx.activityCount > 0;

  let actual: number | null = null;
  let direction: TargetDirection = inferDirection(row);
  let pointBased = false;

  if (/coverage/.test(hay) || (unit === "PERCENT" && !/incomplete|pending|correction|reopen/.test(hay))) {
    // Coverage % = eligible working days / working days * 100.
    actual = ctx.workingDays > 0 ? Math.round((ctx.eligibleDays / ctx.workingDays) * 1000) / 10 : 0;
    direction = "HIGHER_IS_BETTER";
  } else if (/incomplete/.test(hay)) {
    actual = ctx.incompleteDays; direction = "LOWER_IS_BETTER";
  } else if (/pending|correction/.test(hay)) {
    actual = ctx.pendingCorrectionDays; direction = "LOWER_IS_BETTER";
  } else if (/reopen/.test(hay)) {
    actual = ctx.reopenedDays; direction = "LOWER_IS_BETTER";
  } else if (/productiv/.test(hay)) {
    if (unit === "POINTS") { actual = ctx.eligiblePoints; pointBased = true; }
    else { actual = ctx.productiveDays; } // "productive days" style
    direction = "HIGHER_IS_BETTER";
  } else if (/point/.test(hay) || unit === "POINTS") {
    actual = ctx.eligiblePoints; pointBased = true; direction = "HIGHER_IS_BETTER";
  } else if (/day|count/.test(hay) || unit === "COUNT") {
    // Generic day/count KPI on Daily Activity → interpret as eligible (productive) working days.
    actual = ctx.eligibleDays; direction = "HIGHER_IS_BETTER";
  }

  if (actual === null) {
    // Recognised source but the KPI shape is ambiguous → flag for human review, do not guess.
    return {
      ...base, direction, actualValue: null, achievementPercent: null, weightedPreviewScore: null,
      status: "NEEDS_REVIEW", sourceStatus: "NEEDS_REVIEW", needsReview: true,
      notes: base.notes, exclusionSummary: exclusionSummary(ctx),
    };
  }

  const achievementPercent = calculatePreviewPercentage(actual, row.targetValue, direction);
  const status = buildPreviewStatus(achievementPercent, { direction, hasActivity: anyActivity, actual });
  const weightedPreviewScore = Math.round((achievementPercent * row.weight) / 100 * 10) / 10;
  const needsReview =
    status === "NEEDS_REVIEW" ||
    (direction === "HIGHER_IS_BETTER" && (ctx.incompleteDays > 0 || ctx.reopenedDays > 0 || ctx.pendingCorrectionDays > 0));

  return {
    ...base,
    direction,
    actualValue: actual,
    achievementPercent,
    weightedPreviewScore,
    status,
    sourceStatus: "IMPLEMENTED",
    needsReview,
    notes: base.notes,
    exclusionSummary: exclusionSummary(ctx),
    // Marker so the employee endpoint can redact raw point counts (manager-only detail).
    ...(pointBased ? { _pointBased: true } : {}),
  } as KpiPreview & { _pointBased?: boolean };
}

// ── CRM Leads context (Phase W9.1) ───────────────────────────────────────────────

export type CrmLeadsContext = {
  qualifiedLeadCount: number;
  hasData: boolean;
};

const CRM_LEADS_ONLY_NOTE = "CRM Leads source is implemented only for qualified-lead count in this phase.";

/** Is this a qualified-leads KPI (the only CRM_LEADS metric supported this phase)? */
export function isQualifiedLeadsMetric(row: Pick<EmployeeTargetKpiRow, "metricCode" | "metricName" | "category">): boolean {
  const hay = `${row.metricCode} ${row.metricName} ${row.category}`.toLowerCase();
  if (/qualified_?lead/.test(hay)) return true;
  return /qualif/.test(hay) && /lead/.test(hay);
}

/**
 * Count an employee's qualified-lead events in [startDate, endDate]. Source of truth =
 * `DailyActivityLog` `QUALIFIED_LEAD_CREATED` events (Phase W2 capture on a lead's transition INTO
 * QUALIFIED), which preserve the qualification EVENT date + employee attribution. Excludes EXCLUDED /
 * CORRECTION_REJECTED logs. `activityDate` is `@db.Date` → bounds built with `dateKeyToDbDate`
 * (IST-safe). READ-ONLY — no writes, no CrmLead/DailyActivity mutation.
 */
export async function buildCrmLeadsContext(
  employeeId: number,
  startDate: Date,
  endDate: Date,
): Promise<CrmLeadsContext> {
  try {
    const gteDb = dateKeyToDbDate(toDateKeyLocal(startDate));
    const lteDb = dateKeyToDbDate(toDateKeyLocal(endDate));
    const qualifiedLeadCount = await prisma.dailyActivityLog.count({
      where: {
        employeeId,
        activityType: "QUALIFIED_LEAD_CREATED",
        activityDate: { gte: gteDb, lte: lteDb },
        status: { notIn: ["EXCLUDED", "CORRECTION_REJECTED"] },
      },
    });
    return { qualifiedLeadCount, hasData: true };
  } catch {
    return { qualifiedLeadCount: 0, hasData: false };
  }
}

/**
 * CRM_LEADS KPI preview. Only qualified-lead count is supported this phase; any other CRM_LEADS
 * metric → NOT_IMPLEMENTED with a clear note. Missing/zero target → CONFIG_REQUIRED + NEEDS_REVIEW
 * (never throws). Higher-is-better; achievement = actual ÷ target × 100 (capped 200).
 */
export function calculateCrmLeadsKpiPreview(row: EmployeeTargetKpiRow, ctx: CrmLeadsContext | null): KpiPreview {
  const base = baseKpi(row);

  if (!isQualifiedLeadsMetric(row)) {
    return {
      ...base, direction: "HIGHER_IS_BETTER", actualValue: null, achievementPercent: null,
      weightedPreviewScore: null, status: "NOT_IMPLEMENTED", sourceStatus: "NOT_IMPLEMENTED",
      needsReview: false, notes: base.notes ? `${base.notes} — ${CRM_LEADS_ONLY_NOTE}` : CRM_LEADS_ONLY_NOTE,
    };
  }

  const actual = ctx?.qualifiedLeadCount ?? 0;

  // Target missing / zero → cannot compute a percentage; needs configuration review.
  if (!row.targetValue || row.targetValue <= 0) {
    return {
      ...base, direction: "HIGHER_IS_BETTER", actualValue: actual, achievementPercent: null,
      weightedPreviewScore: null, status: "NEEDS_REVIEW", sourceStatus: "CONFIG_REQUIRED",
      needsReview: true,
      notes: base.notes ? `${base.notes} — Target not set; configure a qualified-lead target.` : "Target not set; configure a qualified-lead target.",
    };
  }

  const achievementPercent = calculatePreviewPercentage(actual, row.targetValue, "HIGHER_IS_BETTER");
  const status = buildPreviewStatus(achievementPercent, { direction: "HIGHER_IS_BETTER", hasActivity: actual > 0, actual });
  const weightedPreviewScore = Math.round((achievementPercent * row.weight) / 100 * 10) / 10;
  return {
    ...base, direction: "HIGHER_IS_BETTER", actualValue: actual, achievementPercent,
    weightedPreviewScore, status, sourceStatus: "IMPLEMENTED", needsReview: status === "NEEDS_REVIEW",
    notes: base.notes,
  };
}

// ── CRM Meetings context (Phase W9.2) ────────────────────────────────────────────

export type CrmMeetingsContext = {
  scheduledCount: number;
  completedCount: number;
  hasData: boolean;
};

const CRM_MEETINGS_ONLY_NOTE = "CRM Meetings source is implemented for scheduled- and completed-meeting count this phase.";

/** Is this a "meetings completed" KPI (recognised, but NOT implemented this phase — see audit)? */
export function isMeetingsCompletedMetric(row: Pick<EmployeeTargetKpiRow, "metricCode" | "metricName" | "category">): boolean {
  const hay = `${row.metricCode} ${row.metricName} ${row.category}`.toLowerCase();
  return /meeting/.test(hay) && /complet/.test(hay);
}

/** Is this a "meetings scheduled" KPI (the only CRM_MEETINGS metric supported this phase)? */
export function isMeetingsScheduledMetric(row: Pick<EmployeeTargetKpiRow, "metricCode" | "metricName" | "category">): boolean {
  const hay = `${row.metricCode} ${row.metricName} ${row.category}`.toLowerCase();
  return /meeting/.test(hay) && !isMeetingsCompletedMetric(row);
}

/**
 * Count an employee's scheduled- and completed-meeting events in [startDate, endDate]. Source of
 * truth for BOTH = `DailyActivityLog` (Phase W2 `MEETING_SCHEDULED` capture on
 * `POST /api/pipeline/meetings`; Phase W9.3 `MEETING_COMPLETED` capture on
 * `PATCH /api/pipeline/meetings/[id]` — only on an actual transition INTO `COMPLETED`), which
 * preserve the EVENT date + employee attribution — preferred over reading `CrmMeeting.meetingDate`/
 * `status` directly (the meeting's own date/status can be edited after creation, which would
 * misattribute the event to a different period or double-count a re-save). Excludes EXCLUDED /
 * CORRECTION_REJECTED logs. READ-ONLY — no writes, no CrmMeeting/DailyActivity mutation.
 */
export async function buildCrmMeetingsContext(
  employeeId: number,
  startDate: Date,
  endDate: Date,
): Promise<CrmMeetingsContext> {
  try {
    const gteDb = dateKeyToDbDate(toDateKeyLocal(startDate));
    const lteDb = dateKeyToDbDate(toDateKeyLocal(endDate));
    const [scheduledCount, completedCount] = await Promise.all([
      prisma.dailyActivityLog.count({
        where: {
          employeeId,
          activityType: "MEETING_SCHEDULED",
          activityDate: { gte: gteDb, lte: lteDb },
          status: { notIn: ["EXCLUDED", "CORRECTION_REJECTED"] },
        },
      }),
      prisma.dailyActivityLog.count({
        where: {
          employeeId,
          activityType: "MEETING_COMPLETED",
          activityDate: { gte: gteDb, lte: lteDb },
          status: { notIn: ["EXCLUDED", "CORRECTION_REJECTED"] },
        },
      }),
    ]);
    return { scheduledCount, completedCount, hasData: true };
  } catch {
    return { scheduledCount: 0, completedCount: 0, hasData: false };
  }
}

/**
 * CRM_MEETINGS KPI preview. "Meetings Scheduled" and "Meetings Completed" (Phase W9.3 — now that
 * `PATCH /api/pipeline/meetings/[id]` reliably captures `MEETING_COMPLETED`) are both supported
 * this phase. Actual value = 0 (not NOT_IMPLEMENTED) when no matching events exist yet — a real
 * employee with zero completed meetings this period is normal performance data, not a config gap.
 * Missing/zero target → CONFIG_REQUIRED + NEEDS_REVIEW (never throws). Higher-is-better.
 */
export function calculateCrmMeetingsKpiPreview(row: EmployeeTargetKpiRow, ctx: CrmMeetingsContext | null): KpiPreview {
  const base = baseKpi(row);

  if (!isMeetingsCompletedMetric(row) && !isMeetingsScheduledMetric(row)) {
    return {
      ...base, direction: "HIGHER_IS_BETTER", actualValue: null, achievementPercent: null,
      weightedPreviewScore: null, status: "NOT_IMPLEMENTED", sourceStatus: "NOT_IMPLEMENTED",
      needsReview: false, notes: base.notes ? `${base.notes} — ${CRM_MEETINGS_ONLY_NOTE}` : CRM_MEETINGS_ONLY_NOTE,
    };
  }

  const actual = isMeetingsCompletedMetric(row) ? (ctx?.completedCount ?? 0) : (ctx?.scheduledCount ?? 0);
  const targetLabel = isMeetingsCompletedMetric(row) ? "meetings-completed" : "meetings-scheduled";

  if (!row.targetValue || row.targetValue <= 0) {
    return {
      ...base, direction: "HIGHER_IS_BETTER", actualValue: actual, achievementPercent: null,
      weightedPreviewScore: null, status: "NEEDS_REVIEW", sourceStatus: "CONFIG_REQUIRED",
      needsReview: true,
      notes: base.notes ? `${base.notes} — Target not set; configure a ${targetLabel} target.` : `Target not set; configure a ${targetLabel} target.`,
    };
  }

  const achievementPercent = calculatePreviewPercentage(actual, row.targetValue, "HIGHER_IS_BETTER");
  const status = buildPreviewStatus(achievementPercent, { direction: "HIGHER_IS_BETTER", hasActivity: actual > 0, actual });
  const weightedPreviewScore = Math.round((achievementPercent * row.weight) / 100 * 10) / 10;
  return {
    ...base, direction: "HIGHER_IS_BETTER", actualValue: actual, achievementPercent,
    weightedPreviewScore, status, sourceStatus: "IMPLEMENTED", needsReview: status === "NEEDS_REVIEW",
    notes: base.notes,
  };
}

// ── CRM Opportunity context (Phase W9.2) ─────────────────────────────────────────

export type CrmOpportunityContext = {
  createdCount: number;
  createdValue: number; // ₹, sum of `CrmOpportunity.value` created in range (display-safe number)
  wonCount: number;
  hasData: boolean;
};

type OpportunityMetricKind = "COUNT" | "VALUE" | "WON" | "UNSUPPORTED";

/** Classify a CRM_OPPORTUNITY KPI row by keyword/unit — never guesses beyond these three shapes. */
function classifyOpportunityMetric(row: Pick<EmployeeTargetKpiRow, "metricCode" | "metricName" | "category" | "unit">): OpportunityMetricKind {
  const hay = `${row.metricCode} ${row.metricName} ${row.category}`.toLowerCase();
  const unit = (row.unit || "").toUpperCase();
  if (/stage|progress|movement/.test(hay)) return "UNSUPPORTED";
  if (/won/.test(hay)) return "WON";
  if (/value/.test(hay) || unit === "AMOUNT") return "VALUE";
  if (/opportunit|created|count/.test(hay)) return "COUNT";
  return "UNSUPPORTED";
}

/**
 * Build an employee's Opportunity aggregate for [startDate, endDate]. Employee attribution =
 * `CrmOpportunity.lead.assignedToId` (an Opportunity carries no employee field of its own — it is
 * always 1:1 with the Lead it was converted from, so the lead owner IS the opportunity owner).
 * "Created" uses `createdAt` (reliable, immutable). "Won" uses `stage === "WON"` + `poDate`
 * (reliable — `poDate` is a dedicated field required only on the Won transition, unlike
 * `updatedAt` which changes on every edit). READ-ONLY — no writes, no Opportunity mutation.
 */
export async function buildCrmOpportunityContext(
  employeeId: number,
  startDate: Date,
  endDate: Date,
): Promise<CrmOpportunityContext> {
  try {
    const rangeStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const rangeEndExclusive = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);
    const created = await prisma.crmOpportunity.findMany({
      where: { lead: { assignedToId: employeeId }, createdAt: { gte: rangeStart, lt: rangeEndExclusive } },
      select: { value: true },
    });
    const wonCount = await prisma.crmOpportunity.count({
      where: { lead: { assignedToId: employeeId }, stage: "WON", poDate: { gte: rangeStart, lt: rangeEndExclusive } },
    });
    const createdValue = Math.round(created.reduce((s, o) => s + moneyToNumberForDisplay(o.value), 0) * 100) / 100;
    return { createdCount: created.length, createdValue, wonCount, hasData: true };
  } catch {
    return { createdCount: 0, createdValue: 0, wonCount: 0, hasData: false };
  }
}

/**
 * CRM_OPPORTUNITY KPI preview. Supports opportunity count, opportunity value (₹, via the
 * decimal-safe `moneyToNumberForDisplay` helper — no lakhs conversion, `CrmOpportunity.value` is
 * already actual ₹ INR per Decimal Release 2), and opportunities won. "Stage progress" style
 * metrics are NOT_IMPLEMENTED (no reliable stage-transition-history source this phase). Missing/
 * zero target → CONFIG_REQUIRED + NEEDS_REVIEW. Higher-is-better; never throws.
 */
export function calculateCrmOpportunityKpiPreview(row: EmployeeTargetKpiRow, ctx: CrmOpportunityContext | null): KpiPreview {
  const base = baseKpi(row);
  const kind = classifyOpportunityMetric(row);

  if (kind === "UNSUPPORTED") {
    const note = `CRM Opportunity metric "${row.metricName || row.metricCode}" is not supported this phase (opportunity stage/progress tracking requires a reliable stage-transition-history source, which is not implemented yet).`;
    return {
      ...base, direction: "HIGHER_IS_BETTER", actualValue: null, achievementPercent: null,
      weightedPreviewScore: null, status: "NOT_IMPLEMENTED", sourceStatus: "NOT_IMPLEMENTED",
      needsReview: false, notes: base.notes ? `${base.notes} — ${note}` : note,
    };
  }

  const actual = kind === "VALUE" ? (ctx?.createdValue ?? 0) : kind === "WON" ? (ctx?.wonCount ?? 0) : (ctx?.createdCount ?? 0);

  if (!row.targetValue || row.targetValue <= 0) {
    const note = "Target not set; configure an opportunity target.";
    return {
      ...base, direction: "HIGHER_IS_BETTER", actualValue: actual, achievementPercent: null,
      weightedPreviewScore: null, status: "NEEDS_REVIEW", sourceStatus: "CONFIG_REQUIRED",
      needsReview: true, notes: base.notes ? `${base.notes} — ${note}` : note,
    };
  }

  const achievementPercent = calculatePreviewPercentage(actual, row.targetValue, "HIGHER_IS_BETTER");
  const status = buildPreviewStatus(achievementPercent, { direction: "HIGHER_IS_BETTER", hasActivity: actual > 0, actual });
  const weightedPreviewScore = Math.round((achievementPercent * row.weight) / 100 * 10) / 10;
  return {
    ...base, direction: "HIGHER_IS_BETTER", actualValue: actual, achievementPercent,
    weightedPreviewScore, status, sourceStatus: "IMPLEMENTED", needsReview: status === "NEEDS_REVIEW",
    notes: base.notes,
  };
}

// ── CRM Pipeline context (Phase W9.2) ────────────────────────────────────────────

export type CrmPipelineContext = {
  proposalsSentCount: number;
  openPipelineValue: number; // ₹, CURRENT snapshot of open (non-Won/non-Lost) opportunity value
  hasData: boolean;
};

type PipelineMetricKind = "PROPOSALS_SENT" | "PIPELINE_VALUE" | "UNSUPPORTED";

/**
 * Classify a CRM_PIPELINE KPI row. "Won deals" is intentionally UNSUPPORTED here — it maps to
 * CRM_OPPORTUNITY's "Opportunities Won" metric, which already has a reliable source (`poDate`);
 * duplicating that calculation under a second source name would risk the two drifting apart.
 * "Stage movement" has no reliable transition-history source (same limitation as CRM_OPPORTUNITY).
 */
function classifyPipelineMetric(row: Pick<EmployeeTargetKpiRow, "metricCode" | "metricName" | "category" | "unit">): PipelineMetricKind {
  const hay = `${row.metricCode} ${row.metricName} ${row.category}`.toLowerCase();
  const unit = (row.unit || "").toUpperCase();
  if (/won/.test(hay)) return "UNSUPPORTED";
  if (/stage|movement/.test(hay)) return "UNSUPPORTED";
  if (/proposal/.test(hay)) return "PROPOSALS_SENT";
  if (/pipeline/.test(hay) && /value/.test(hay)) return "PIPELINE_VALUE";
  if (unit === "AMOUNT" || /value/.test(hay)) return "PIPELINE_VALUE";
  return "UNSUPPORTED";
}

/**
 * Build an employee's Pipeline aggregate for [startDate, endDate]. "Proposals sent" = count of
 * `DailyActivityLog` `PROPOSAL_SENT` events (reliable — captured on every lead stage transition
 * INTO `PROPOSAL_SENT`, across all three lead-mutation routes: `stage/route.ts`, `route.ts`
 * PUT/PATCH fallback, and the convert route). "Pipeline value" is a CURRENT snapshot of open
 * (non-Won/non-Lost) opportunity value — NOT filtered to the selected period, since "what's
 * currently in the pipeline" is inherently point-in-time, not a period-created total (that is
 * CRM_OPPORTUNITY's "Opportunity Value" metric — see the mapping note in the calculator below).
 * Employee attribution = `CrmOpportunity.lead.assignedToId`. READ-ONLY — no writes.
 */
export async function buildCrmPipelineContext(
  employeeId: number,
  startDate: Date,
  endDate: Date,
): Promise<CrmPipelineContext> {
  try {
    const gteDb = dateKeyToDbDate(toDateKeyLocal(startDate));
    const lteDb = dateKeyToDbDate(toDateKeyLocal(endDate));
    const proposalsSentCount = await prisma.dailyActivityLog.count({
      where: {
        employeeId,
        activityType: "PROPOSAL_SENT",
        activityDate: { gte: gteDb, lte: lteDb },
        status: { notIn: ["EXCLUDED", "CORRECTION_REJECTED"] },
      },
    });
    const openOpps = await prisma.crmOpportunity.findMany({
      where: { lead: { assignedToId: employeeId }, stage: { notIn: ["WON", "LOST"] } },
      select: { value: true },
    });
    const openPipelineValue = Math.round(openOpps.reduce((s, o) => s + moneyToNumberForDisplay(o.value), 0) * 100) / 100;
    return { proposalsSentCount, openPipelineValue, hasData: true };
  } catch {
    return { proposalsSentCount: 0, openPipelineValue: 0, hasData: false };
  }
}

/**
 * CRM_PIPELINE KPI preview. Supports "proposals sent" (count) and "pipeline value" (current open-
 * opportunity value snapshot). "Won deals" and "stage movement" are NOT_IMPLEMENTED — see
 * `classifyPipelineMetric`. Missing/zero target → CONFIG_REQUIRED + NEEDS_REVIEW. Higher-is-
 * better; never throws.
 */
export function calculateCrmPipelineKpiPreview(row: EmployeeTargetKpiRow, ctx: CrmPipelineContext | null): KpiPreview {
  const base = baseKpi(row);
  const kind = classifyPipelineMetric(row);

  if (kind === "UNSUPPORTED") {
    const hay = `${row.metricCode} ${row.metricName} ${row.category}`.toLowerCase();
    const note = /won/.test(hay)
      ? `CRM Pipeline "won deals" style metrics are tracked via the CRM_OPPORTUNITY source's "Opportunities Won" metric — configure this KPI's source as CRM_OPPORTUNITY instead of CRM_PIPELINE.`
      : `CRM Pipeline metric "${row.metricName || row.metricCode}" is not supported this phase (stage-movement preview requires a reliable stage-transition-history source, which is not implemented yet).`;
    return {
      ...base, direction: "HIGHER_IS_BETTER", actualValue: null, achievementPercent: null,
      weightedPreviewScore: null, status: "NOT_IMPLEMENTED", sourceStatus: "NOT_IMPLEMENTED",
      needsReview: false, notes: base.notes ? `${base.notes} — ${note}` : note,
    };
  }

  const actual = kind === "PIPELINE_VALUE" ? (ctx?.openPipelineValue ?? 0) : (ctx?.proposalsSentCount ?? 0);
  const mappingNote = kind === "PIPELINE_VALUE"
    ? "Pipeline Value reflects the CURRENT open (non-Won/non-Lost) opportunity value — a live snapshot, not filtered to the selected period. For period-created opportunity value, use the CRM_OPPORTUNITY source's Opportunity Value metric."
    : undefined;

  if (!row.targetValue || row.targetValue <= 0) {
    const note = "Target not set; configure a pipeline target.";
    return {
      ...base, direction: "HIGHER_IS_BETTER", actualValue: actual, achievementPercent: null,
      weightedPreviewScore: null, status: "NEEDS_REVIEW", sourceStatus: "CONFIG_REQUIRED",
      needsReview: true, notes: base.notes ? `${base.notes} — ${note}` : note,
    };
  }

  const achievementPercent = calculatePreviewPercentage(actual, row.targetValue, "HIGHER_IS_BETTER");
  const status = buildPreviewStatus(achievementPercent, { direction: "HIGHER_IS_BETTER", hasActivity: actual > 0, actual });
  const weightedPreviewScore = Math.round((achievementPercent * row.weight) / 100 * 10) / 10;
  return {
    ...base, direction: "HIGHER_IS_BETTER", actualValue: actual, achievementPercent,
    weightedPreviewScore, status, sourceStatus: "IMPLEMENTED", needsReview: status === "NEEDS_REVIEW",
    notes: mappingNote ? (base.notes ? `${base.notes} — ${mappingNote}` : mappingNote) : base.notes,
  };
}

/** Bundle of pre-built source contexts for a (employee, range) pair. */
export type PreviewSourceContexts = {
  daCtx: DailyActivityContext | null;
  crmLeadsCtx: CrmLeadsContext | null;
  crmMeetingsCtx: CrmMeetingsContext | null;
  crmOpportunityCtx: CrmOpportunityContext | null;
  crmPipelineCtx: CrmPipelineContext | null;
};

/** Dispatch a single KPI row to its source calculator. Unsupported sources → NOT_IMPLEMENTED. */
export function calculateKpiPreview(row: EmployeeTargetKpiRow, contexts: PreviewSourceContexts): KpiPreview {
  const source = (row.source || "MANUAL").toUpperCase();
  if (source === "DAILY_ACTIVITY" && contexts.daCtx) {
    return calculateDailyActivityKpiPreview(row, contexts.daCtx);
  }
  if (source === "CRM_LEADS") {
    return calculateCrmLeadsKpiPreview(row, contexts.crmLeadsCtx);
  }
  if (source === "CRM_MEETINGS") {
    return calculateCrmMeetingsKpiPreview(row, contexts.crmMeetingsCtx);
  }
  if (source === "CRM_OPPORTUNITY") {
    return calculateCrmOpportunityKpiPreview(row, contexts.crmOpportunityCtx);
  }
  if (source === "CRM_PIPELINE") {
    return calculateCrmPipelineKpiPreview(row, contexts.crmPipelineCtx);
  }
  // Not wired for preview in this phase.
  return {
    ...baseKpi(row),
    direction: inferDirection(row),
    actualValue: null,
    achievementPercent: null,
    weightedPreviewScore: null,
    status: "NOT_IMPLEMENTED",
    sourceStatus: "NOT_IMPLEMENTED",
    needsReview: false,
    notes: row.notes,
  };
}

// ── Range resolution ─────────────────────────────────────────────────────────────

function monthRange(month: string): PreviewRange | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return null;
  const year = Number(m[1]);
  const mon = Number(m[2]);
  if (mon < 1 || mon > 12) return null;
  const startDate = new Date(year, mon - 1, 1);
  const endDate = new Date(year, mon, 0); // last day of month
  return { startDate, endDate, label: month };
}

/**
 * Resolve the preview date range from explicit inputs, falling back to a target's own period.
 * Priority: periodStart+periodEnd → month → periodId (looked up) → fallback period dates.
 */
export async function resolvePreviewRange(
  input: PreviewRangeInput | undefined,
  fallback: { periodId: number; startDate: Date; endDate: Date; label: string },
): Promise<PreviewRange> {
  if (input?.periodStart && input?.periodEnd) {
    const s = /^\d{4}-\d{2}-\d{2}$/.test(input.periodStart) ? new Date(input.periodStart + "T00:00:00") : null;
    const e = /^\d{4}-\d{2}-\d{2}$/.test(input.periodEnd) ? new Date(input.periodEnd + "T00:00:00") : null;
    if (s && e && !Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
      return { startDate: s, endDate: e, label: `${input.periodStart} → ${input.periodEnd}` };
    }
  }
  if (input?.month) {
    const r = monthRange(input.month);
    if (r) return r;
  }
  if (input?.periodId && input.periodId !== fallback.periodId) {
    try {
      const p = await prisma.performancePeriod.findUnique({ where: { id: input.periodId } });
      if (p) return { startDate: new Date(p.startDate), endDate: new Date(p.endDate), label: p.name };
    } catch { /* fall through to fallback */ }
  }
  return { startDate: fallback.startDate, endDate: fallback.endDate, label: fallback.label };
}

// ── Employee / manager preview builders ──────────────────────────────────────────

const PREVIEW_TARGET_INCLUDE = {
  period: true,
  template: { select: { name: true } },
  employeeProfile: {
    select: {
      id: true,
      userId: true,
      employee: { select: { name: true } },
      designation: { select: { title: true } },
      department: { select: { name: true } },
      team: { select: { name: true } },
      reportingManager: { select: { name: true } },
    },
  },
} as const;

type PreviewTargetRecord = {
  id: number;
  employeeProfileId: number;
  periodId: number;
  targetJson: string;
  status: string;
  period?: { name?: string; startDate?: Date; endDate?: Date } | null;
  template?: { name?: string } | null;
  employeeProfile?: {
    id: number;
    userId: number;
    employee?: { name?: string } | null;
    designation?: { title?: string } | null;
    department?: { name?: string } | null;
    team?: { name?: string } | null;
    reportingManager?: { name?: string } | null;
  } | null;
};

async function buildTargetPreview(t: PreviewTargetRecord, rangeInput: PreviewRangeInput | undefined, now: Date): Promise<TargetPreview> {
  const doc = parseEmployeeTargetJson(t.targetJson);
  const fallbackStart = t.period?.startDate ? new Date(t.period.startDate) : new Date(now.getFullYear(), 0, 1);
  const fallbackEnd = t.period?.endDate ? new Date(t.period.endDate) : now;
  const range = await resolvePreviewRange(rangeInput, {
    periodId: t.periodId,
    startDate: fallbackStart,
    endDate: fallbackEnd,
    label: t.period?.name ?? `Period #${t.periodId}`,
  });

  // Build each needed source context once per target (keyed by the employee's auth user id).
  const sources = new Set(doc.targets.map((r) => (r.source || "").toUpperCase()));
  const needsDaily = sources.has("DAILY_ACTIVITY");
  const needsCrmLeads = sources.has("CRM_LEADS");
  const needsCrmMeetings = sources.has("CRM_MEETINGS");
  const needsCrmOpportunity = sources.has("CRM_OPPORTUNITY");
  const needsCrmPipeline = sources.has("CRM_PIPELINE");
  const userId = t.employeeProfile?.userId;
  const daCtx = needsDaily && userId ? await buildDailyActivityContext(userId, range.startDate, range.endDate, now) : null;
  const crmLeadsCtx = needsCrmLeads && userId ? await buildCrmLeadsContext(userId, range.startDate, range.endDate) : null;
  const crmMeetingsCtx = needsCrmMeetings && userId ? await buildCrmMeetingsContext(userId, range.startDate, range.endDate) : null;
  const crmOpportunityCtx = needsCrmOpportunity && userId ? await buildCrmOpportunityContext(userId, range.startDate, range.endDate) : null;
  const crmPipelineCtx = needsCrmPipeline && userId ? await buildCrmPipelineContext(userId, range.startDate, range.endDate) : null;

  const kpis = doc.targets.map((r) => calculateKpiPreview(r, { daCtx, crmLeadsCtx, crmMeetingsCtx, crmOpportunityCtx, crmPipelineCtx }));
  const scored = kpis.filter((k) => k.weightedPreviewScore !== null);
  const weightedPreviewTotal = scored.length
    ? Math.round(scored.reduce((s, k) => s + (k.weightedPreviewScore ?? 0), 0) * 10) / 10
    : null;

  return {
    targetId: t.id,
    period: range.label,
    periodId: t.periodId,
    templateName: t.template?.name ?? doc.templateName ?? "",
    status: t.status,
    rangeLabel: range.label,
    rangeStart: toDateKeyLocal(range.startDate),
    rangeEnd: toDateKeyLocal(range.endDate),
    kpis,
    totalWeight: kpis.reduce((s, k) => s + (k.weight || 0), 0),
    weightedPreviewTotal,
  };
}

function employeeShell(t: PreviewTargetRecord): Omit<EmployeePreview, "targets"> {
  const p = t.employeeProfile;
  return {
    employeeProfileId: t.employeeProfileId,
    employeeName: p?.employee?.name ?? `Profile #${t.employeeProfileId}`,
    designation: p?.designation?.title ?? "",
    department: p?.department?.name ?? "",
    team: p?.team?.name ?? "",
    reportingManager: p?.reportingManager?.name ?? "",
  };
}

/** Read-only achievement preview for ONE employee profile. Returns null if the profile is missing. */
export async function getEmployeeKraAchievementPreview(
  employeeProfileId: number,
  rangeInput?: PreviewRangeInput,
  now: Date = new Date(),
): Promise<EmployeePreview | null> {
  try {
    const targets = (await prisma.employeeTarget.findMany({
      where: { employeeProfileId },
      include: PREVIEW_TARGET_INCLUDE,
      orderBy: { createdAt: "desc" },
    })) as unknown as PreviewTargetRecord[];

    if (targets.length === 0) {
      const profile = await prisma.employeeProfile.findUnique({
        where: { id: employeeProfileId },
        select: {
          id: true,
          employee: { select: { name: true } },
          designation: { select: { title: true } },
          department: { select: { name: true } },
          team: { select: { name: true } },
          reportingManager: { select: { name: true } },
        },
      });
      if (!profile) return null;
      return {
        employeeProfileId: profile.id,
        employeeName: profile.employee?.name ?? `Profile #${profile.id}`,
        designation: profile.designation?.title ?? "",
        department: profile.department?.name ?? "",
        team: profile.team?.name ?? "",
        reportingManager: profile.reportingManager?.name ?? "",
        targets: [],
      };
    }

    const built = await Promise.all(targets.map((t) => buildTargetPreview(t, rangeInput, now)));
    return { ...employeeShell(targets[0]), targets: built };
  } catch {
    return null;
  }
}

/** Redact manager-only detail (raw Daily Activity point counts) from an employee's own preview. */
function redactForEmployee(preview: EmployeePreview): EmployeePreview {
  return {
    ...preview,
    targets: preview.targets.map((t) => ({
      ...t,
      kpis: t.kpis.map((k) => {
        const pointBased = (k as KpiPreview & { _pointBased?: boolean })._pointBased;
        const { _pointBased, ...clean } = k as KpiPreview & { _pointBased?: boolean };
        void _pointBased;
        if (pointBased) {
          // Employee sees the % / status band, not the raw eligible-point count (MANAGER_ONLY).
          return { ...clean, actualValue: null, notes: clean.notes };
        }
        return clean;
      }),
    })),
  };
}

/** Read-only, SELF-SCOPED achievement preview for the logged-in employee. */
export async function getMyKraAchievementPreview(
  employeeId: number,
  rangeInput?: PreviewRangeInput,
  now: Date = new Date(),
): Promise<EmployeePreview | null> {
  try {
    const profile = await prisma.employeeProfile.findUnique({ where: { userId: employeeId }, select: { id: true } });
    if (!profile) return null;
    const full = await getEmployeeKraAchievementPreview(profile.id, rangeInput, now);
    return full ? redactForEmployee(full) : null;
  } catch {
    return null;
  }
}

export type PreviewFilters = PreviewRangeInput & {
  employeeProfileId?: number;
  status?: string;
};

/** Read-only achievement preview for a manager's DIRECT REPORTS (grouped by employee). Manager sees exact values. */
export async function getManagerTeamKraAchievementPreview(
  managerEmployeeId: number,
  filters?: PreviewFilters,
  now: Date = new Date(),
): Promise<EmployeePreview[]> {
  try {
    const reports = await prisma.employeeProfile.findMany({
      where: { reportingManagerId: managerEmployeeId },
      select: { id: true },
    });
    const ids = filters?.employeeProfileId
      ? reports.filter((r) => r.id === filters.employeeProfileId).map((r) => r.id)
      : reports.map((r) => r.id);
    return await buildGroupedPreview(ids, filters, now);
  } catch {
    return [];
  }
}

/** Read-only grouped preview across the given profile ids (admin scope). Manager/admin sees exact values. */
export async function listKraAchievementPreviewGrouped(
  filters?: PreviewFilters,
  now: Date = new Date(),
): Promise<EmployeePreview[]> {
  const ids = filters?.employeeProfileId ? [filters.employeeProfileId] : undefined;
  return await buildGroupedPreview(ids, filters, now);
}

async function buildGroupedPreview(
  profileIds: number[] | undefined,
  filters: PreviewFilters | undefined,
  now: Date,
): Promise<EmployeePreview[]> {
  try {
    if (profileIds && profileIds.length === 0) return [];
    const targets = (await prisma.employeeTarget.findMany({
      where: {
        ...(profileIds ? { employeeProfileId: { in: profileIds } } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: PREVIEW_TARGET_INCLUDE,
      orderBy: { createdAt: "desc" },
    })) as unknown as PreviewTargetRecord[];

    const groups = new Map<number, EmployeePreview>();
    for (const t of targets) {
      let g = groups.get(t.employeeProfileId);
      if (!g) { g = { ...employeeShell(t), targets: [] }; groups.set(t.employeeProfileId, g); }
      g.targets.push(await buildTargetPreview(t, filters, now));
    }
    return [...groups.values()].sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  } catch {
    return [];
  }
}

// ── Exceptions preview ────────────────────────────────────────────────────────────

export type PreviewException = {
  employeeProfileId: number | null;
  employeeName: string;
  targetId: number | null;
  reasonCode:
    | "NO_ASSIGNED_TARGETS"
    | "SOURCE_NOT_IMPLEMENTED"
    | "CRM_LEADS_UNSUPPORTED_METRIC"
    | "CRM_LEADS_TARGET_MISSING"
    | "CRM_LEADS_MISSING_EMPLOYEE_MAPPING"
    | "CRM_LEADS_NO_DATA"
    | "CRM_MEETINGS_UNSUPPORTED_METRIC"
    | "CRM_MEETINGS_TARGET_MISSING"
    | "CRM_MEETINGS_MISSING_EMPLOYEE_MAPPING"
    | "CRM_OPPORTUNITY_UNSUPPORTED_METRIC"
    | "CRM_OPPORTUNITY_MISSING_MAPPING"
    | "CRM_OPPORTUNITY_TARGET_MISSING"
    | "CRM_PIPELINE_UNSUPPORTED_METRIC"
    | "CRM_PIPELINE_PROPOSAL_SOURCE_MISSING"
    | "CRM_PIPELINE_MISSING_EMPLOYEE_MAPPING"
    | "CRM_PIPELINE_TARGET_MISSING"
    | "DAILY_ACTIVITY_INCOMPLETE"
    | "PENDING_CORRECTION"
    | "REOPENED"
    | "MISSING_PROFILE"
    | "INVALID_TARGET_JSON"
    | "WEIGHT_NOT_100"
    | "NEEDS_REVIEW";
  detail: string;
};

/**
 * Read-only scan for employees/KPIs needing attention before any conversion: employees with no
 * targets, unimplemented sources, Daily Activity incomplete/pending/reopened days, missing profile,
 * invalid targetJson, and total-weight ≠ 100.
 */
export async function listAchievementPreviewExceptions(
  filters?: PreviewFilters,
  now: Date = new Date(),
): Promise<PreviewException[]> {
  const exceptions: PreviewException[] = [];
  try {
    // 1) Active profiles with NO assigned targets.
    const profiles = await prisma.employeeProfile.findMany({
      where: { employmentStatus: "ACTIVE" },
      select: { id: true, employee: { select: { name: true } }, employeeTargets: { select: { id: true } } },
    });
    for (const p of profiles) {
      if (p.employeeTargets.length === 0) {
        exceptions.push({
          employeeProfileId: p.id,
          employeeName: p.employee?.name ?? `Profile #${p.id}`,
          targetId: null,
          reasonCode: "NO_ASSIGNED_TARGETS",
          detail: "Employee has no KRA targets assigned.",
        });
      }
    }

    // 2) Per-target checks.
    const targets = (await prisma.employeeTarget.findMany({
      where: filters?.employeeProfileId ? { employeeProfileId: filters.employeeProfileId } : undefined,
      include: PREVIEW_TARGET_INCLUDE,
      orderBy: { createdAt: "desc" },
    })) as unknown as PreviewTargetRecord[];

    for (const t of targets) {
      const name = t.employeeProfile?.employee?.name ?? `Profile #${t.employeeProfileId}`;
      if (!t.employeeProfile) {
        exceptions.push({ employeeProfileId: t.employeeProfileId, employeeName: name, targetId: t.id, reasonCode: "MISSING_PROFILE", detail: "Target has no linked employee profile." });
        continue;
      }

      // Invalid / empty targetJson (non-empty string that fails to parse to targets[]).
      if (t.targetJson && t.targetJson.trim()) {
        let parsedOk = false;
        try { const j = JSON.parse(t.targetJson); parsedOk = j && Array.isArray(j.targets); } catch { parsedOk = false; }
        if (!parsedOk) {
          exceptions.push({ employeeProfileId: t.employeeProfileId, employeeName: name, targetId: t.id, reasonCode: "INVALID_TARGET_JSON", detail: "Stored target rows could not be parsed." });
          continue;
        }
      }

      const doc = parseEmployeeTargetJson(t.targetJson);
      if (doc.targets.length === 0) continue; // an assigned-but-empty target isn't itself an exception here

      // Total active weight ≠ 100.
      const activeWeight = doc.targets.filter((r) => r.isActive).reduce((s, r) => s + (Number(r.weight) || 0), 0);
      if (Math.abs(activeWeight - 100) > 0.01) {
        exceptions.push({ employeeProfileId: t.employeeProfileId, employeeName: name, targetId: t.id, reasonCode: "WEIGHT_NOT_100", detail: `Total active KPI weight is ${activeWeight}% (ideally 100%).` });
      }

      // Unimplemented sources (exclude the implemented ones — DAILY_ACTIVITY, and CRM_LEADS/
      // CRM_MEETINGS/CRM_OPPORTUNITY/CRM_PIPELINE which are handled per-KPI below since each only
      // supports specific metrics this phase).
      const IMPLEMENTED_SRC = new Set(["DAILY_ACTIVITY", "CRM_LEADS", "CRM_MEETINGS", "CRM_OPPORTUNITY", "CRM_PIPELINE"]);
      const unimplemented = [...new Set(doc.targets.map((r) => (r.source || "MANUAL").toUpperCase()).filter((s) => !IMPLEMENTED_SRC.has(s)))];
      if (unimplemented.length) {
        exceptions.push({ employeeProfileId: t.employeeProfileId, employeeName: name, targetId: t.id, reasonCode: "SOURCE_NOT_IMPLEMENTED", detail: `Preview not available for source(s): ${unimplemented.join(", ")}.` });
      }

      // CRM_LEADS per-KPI config checks (Phase W9.1).
      const crmLeadRows = doc.targets.filter((r) => (r.source || "").toUpperCase() === "CRM_LEADS");
      if (crmLeadRows.length) {
        if (!t.employeeProfile.userId) {
          exceptions.push({ employeeProfileId: t.employeeProfileId, employeeName: name, targetId: t.id, reasonCode: "CRM_LEADS_MISSING_EMPLOYEE_MAPPING", detail: "CRM Leads target has no employee mapping (missing user link)." });
        }
        for (const r of crmLeadRows) {
          if (!isQualifiedLeadsMetric(r)) {
            exceptions.push({ employeeProfileId: t.employeeProfileId, employeeName: name, targetId: t.id, reasonCode: "CRM_LEADS_UNSUPPORTED_METRIC", detail: `CRM Leads metric "${r.metricName || r.metricCode}" is not supported (only qualified-lead count this phase).` });
          } else if (!r.targetValue || r.targetValue <= 0) {
            exceptions.push({ employeeProfileId: t.employeeProfileId, employeeName: name, targetId: t.id, reasonCode: "CRM_LEADS_TARGET_MISSING", detail: `Qualified-lead target "${r.metricName || r.metricCode}" has no target value set.` });
          }
        }
      }

      // CRM_MEETINGS per-KPI config checks (Phase W9.2/W9.3 — scheduled AND completed are both
      // supported now that MEETING_COMPLETED capture exists; zero completed meetings is normal
      // performance data, not an exception, so only a missing/zero TARGET is flagged).
      const crmMeetingRows = doc.targets.filter((r) => (r.source || "").toUpperCase() === "CRM_MEETINGS");
      if (crmMeetingRows.length) {
        if (!t.employeeProfile.userId) {
          exceptions.push({ employeeProfileId: t.employeeProfileId, employeeName: name, targetId: t.id, reasonCode: "CRM_MEETINGS_MISSING_EMPLOYEE_MAPPING", detail: "CRM Meetings target has no employee mapping (missing user link)." });
        }
        for (const r of crmMeetingRows) {
          if (!isMeetingsCompletedMetric(r) && !isMeetingsScheduledMetric(r)) {
            exceptions.push({ employeeProfileId: t.employeeProfileId, employeeName: name, targetId: t.id, reasonCode: "CRM_MEETINGS_UNSUPPORTED_METRIC", detail: `CRM Meetings metric "${r.metricName || r.metricCode}" is not supported (only scheduled/completed meeting count this phase).` });
          } else if (!r.targetValue || r.targetValue <= 0) {
            exceptions.push({ employeeProfileId: t.employeeProfileId, employeeName: name, targetId: t.id, reasonCode: "CRM_MEETINGS_TARGET_MISSING", detail: `Meetings target "${r.metricName || r.metricCode}" has no target value set.` });
          }
        }
      }

      // CRM_OPPORTUNITY per-KPI config checks (Phase W9.2). Attribution is via the lead's
      // assignedToId, so "missing mapping" here means the employee has no auth user link at all
      // (opportunities cannot be attributed without it).
      const crmOppRows = doc.targets.filter((r) => (r.source || "").toUpperCase() === "CRM_OPPORTUNITY");
      if (crmOppRows.length) {
        if (!t.employeeProfile.userId) {
          exceptions.push({ employeeProfileId: t.employeeProfileId, employeeName: name, targetId: t.id, reasonCode: "CRM_OPPORTUNITY_MISSING_MAPPING", detail: "CRM Opportunity target has no employee mapping (missing user link)." });
        }
        for (const r of crmOppRows) {
          const hay = `${r.metricCode} ${r.metricName} ${r.category}`.toLowerCase();
          const supported = !/stage|progress|movement/.test(hay);
          if (!supported) {
            exceptions.push({ employeeProfileId: t.employeeProfileId, employeeName: name, targetId: t.id, reasonCode: "CRM_OPPORTUNITY_UNSUPPORTED_METRIC", detail: `CRM Opportunity metric "${r.metricName || r.metricCode}" is not supported (stage/progress tracking requires a reliable stage-transition-history source).` });
          } else if (!r.targetValue || r.targetValue <= 0) {
            exceptions.push({ employeeProfileId: t.employeeProfileId, employeeName: name, targetId: t.id, reasonCode: "CRM_OPPORTUNITY_TARGET_MISSING", detail: `Opportunity target "${r.metricName || r.metricCode}" has no target value set.` });
          }
        }
      }

      // CRM_PIPELINE per-KPI config checks (Phase W9.2).
      const crmPipelineRows = doc.targets.filter((r) => (r.source || "").toUpperCase() === "CRM_PIPELINE");
      if (crmPipelineRows.length) {
        if (!t.employeeProfile.userId) {
          exceptions.push({ employeeProfileId: t.employeeProfileId, employeeName: name, targetId: t.id, reasonCode: "CRM_PIPELINE_MISSING_EMPLOYEE_MAPPING", detail: "CRM Pipeline target has no employee mapping (missing user link)." });
        }
        for (const r of crmPipelineRows) {
          const hay = `${r.metricCode} ${r.metricName} ${r.category}`.toLowerCase();
          const unit = (r.unit || "").toUpperCase();
          const isWonOrStage = /won|stage|movement/.test(hay);
          const isProposal = !isWonOrStage && /proposal/.test(hay);
          const isPipelineValue = !isWonOrStage && !isProposal && (unit === "AMOUNT" || /value/.test(hay) || /pipeline/.test(hay));
          if (isWonOrStage) {
            exceptions.push({ employeeProfileId: t.employeeProfileId, employeeName: name, targetId: t.id, reasonCode: "CRM_PIPELINE_UNSUPPORTED_METRIC", detail: `CRM Pipeline metric "${r.metricName || r.metricCode}" is not supported (won-deals metrics map to CRM_OPPORTUNITY; stage-movement has no reliable transition-history source).` });
          } else if (!isProposal && !isPipelineValue) {
            exceptions.push({ employeeProfileId: t.employeeProfileId, employeeName: name, targetId: t.id, reasonCode: "CRM_PIPELINE_UNSUPPORTED_METRIC", detail: `CRM Pipeline metric "${r.metricName || r.metricCode}" could not be classified as proposals-sent or pipeline-value.` });
          } else if (!r.targetValue || r.targetValue <= 0) {
            exceptions.push({ employeeProfileId: t.employeeProfileId, employeeName: name, targetId: t.id, reasonCode: "CRM_PIPELINE_TARGET_MISSING", detail: `Pipeline target "${r.metricName || r.metricCode}" has no target value set.` });
          }
        }
        // Runtime reliability check: if a proposals-sent metric is configured but the DailyActivityLog
        // read itself failed (e.g. transient DB error), flag it distinctly from a config gap.
        const userId = t.employeeProfile.userId;
        if (userId && crmPipelineRows.some((r) => !/won|stage|movement/.test(`${r.metricCode} ${r.metricName} ${r.category}`.toLowerCase()) && /proposal/.test(`${r.metricCode} ${r.metricName} ${r.category}`.toLowerCase()))) {
          const fallbackStart = t.period?.startDate ? new Date(t.period.startDate) : new Date(now.getFullYear(), 0, 1);
          const fallbackEnd = t.period?.endDate ? new Date(t.period.endDate) : now;
          const range = await resolvePreviewRange(filters, { periodId: t.periodId, startDate: fallbackStart, endDate: fallbackEnd, label: t.period?.name ?? "" });
          const pipelineCtx = await buildCrmPipelineContext(userId, range.startDate, range.endDate);
          if (!pipelineCtx.hasData) {
            exceptions.push({ employeeProfileId: t.employeeProfileId, employeeName: name, targetId: t.id, reasonCode: "CRM_PIPELINE_PROPOSAL_SOURCE_MISSING", detail: "Proposals-sent preview could not read the DailyActivityLog PROPOSAL_SENT source for this employee/range." });
          }
        }
      }

      // Daily Activity exceptions in the preview range.
      const hasDaily = doc.targets.some((r) => (r.source || "").toUpperCase() === "DAILY_ACTIVITY");
      const userId = t.employeeProfile.userId;
      if (hasDaily && userId) {
        const fallbackStart = t.period?.startDate ? new Date(t.period.startDate) : new Date(now.getFullYear(), 0, 1);
        const fallbackEnd = t.period?.endDate ? new Date(t.period.endDate) : now;
        const range = await resolvePreviewRange(filters, { periodId: t.periodId, startDate: fallbackStart, endDate: fallbackEnd, label: t.period?.name ?? "" });
        const ctx = await buildDailyActivityContext(userId, range.startDate, range.endDate, now);
        if (ctx.incompleteDays > 0) exceptions.push({ employeeProfileId: t.employeeProfileId, employeeName: name, targetId: t.id, reasonCode: "DAILY_ACTIVITY_INCOMPLETE", detail: `${ctx.incompleteDays} incomplete Daily Activity day(s) in range.` });
        if (ctx.pendingCorrectionDays > 0) exceptions.push({ employeeProfileId: t.employeeProfileId, employeeName: name, targetId: t.id, reasonCode: "PENDING_CORRECTION", detail: `${ctx.pendingCorrectionDays} pending-correction day(s) in range.` });
        if (ctx.reopenedDays > 0) exceptions.push({ employeeProfileId: t.employeeProfileId, employeeName: name, targetId: t.id, reasonCode: "REOPENED", detail: `${ctx.reopenedDays} reopened day(s) in range.` });
      }
    }
  } catch {
    // best-effort read-only scan
  }
  return exceptions;
}
