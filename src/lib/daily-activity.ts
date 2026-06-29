/**
 * Daily Activity & Productivity — Phase W2 backend foundation.
 *
 * Auto-captures productivity events from real CRM actions into `DailyActivityLog`, keeps each
 * day's `DailyActivitySummary` auto-computed fields (totalPoints/productivityBand/status/
 * autoSummaryJson) in sync as events land, and exposes read-only aggregation helpers for the
 * employee and manager APIs.
 *
 * Scope (Phase W2): capture + read only. No summary-submission, correction, reopen, or rule/
 * target-configuration writes here — those are later phases (see
 * docs/webapp/DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md §19). This file never writes to the three
 * employee-owned summary fields (`blockers`/`nextDayPlan`/`finalRemarks`) or `submittedAt` —
 * only the system-owned auto fields.
 *
 * Every capture call is fire-and-forget safe: it must never throw back into the CRM route that
 * triggered it (same convention as `executeAutomation`/approval hooks in crm-engine — "never
 * let them block or fail a CRM save").
 */
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  parseDateOnlyAsLocalDate,
  toDateKeyLocal,
  dbDateToLocalDate,
  localDateToDbDate,
} from "@/lib/date-only";

// Re-exported for existing call sites (`@/lib/daily-activity` was the original home of these
// two helpers before Phase W4.1 moved the canonical implementation to `@/lib/date-only`).
export { parseDateOnlyAsLocalDate, toDateKeyLocal };

// ── Vocabularies (String columns, no Prisma enum — matches this schema's existing convention;
//    see docs/webapp/DAILY_ACTIVITY_SCHEMA_DESIGN_REVIEW.md §2) ────────────────────────────────

export const DAILY_ACTIVITY_TYPES = [
  "QUALIFIED_LEAD_CREATED",
  "LEAD_UPDATED",
  "FOLLOW_UP_ADDED",
  "TASK_UPDATED",
  "TASK_COMPLETED",
  "MEETING_SCHEDULED",
  "MEETING_COMPLETED",
  "PROPOSAL_SENT",
  "OPPORTUNITY_UPDATED",
  "CALL_NOTE_ADDED",
  "EMAIL_NOTE_ADDED",
  "WHATSAPP_NOTE_ADDED",
  "END_OF_DAY_SUMMARY_SUBMITTED",
] as const;
export type DailyActivityType = (typeof DAILY_ACTIVITY_TYPES)[number];

export const DAILY_ACTIVITY_SOURCE_TYPES = [
  "CRM_ACTIVITY", "LEAD", "TASK", "MEETING", "OPPORTUNITY", "PROPOSAL", "FOLLOW_UP", "NOTE", "SUMMARY", "CORRECTION",
] as const;
export type DailyActivitySourceType = (typeof DAILY_ACTIVITY_SOURCE_TYPES)[number];

/** Confirmed default points (docs/webapp/DAILY_ACTIVITY_SCHEMA_DESIGN_REVIEW.md §10). Used as
 *  the code-level fallback when no active `ProductivityActivityRule` row exists yet — the
 *  table is intentionally unseeded in Phase W2 (seeding needs separate approval). */
export const DEFAULT_ACTIVITY_POINTS: Record<DailyActivityType, number> = {
  QUALIFIED_LEAD_CREATED: 3,
  LEAD_UPDATED: 1,
  FOLLOW_UP_ADDED: 1,
  TASK_UPDATED: 1,
  TASK_COMPLETED: 2,
  MEETING_SCHEDULED: 2,
  MEETING_COMPLETED: 4,
  PROPOSAL_SENT: 5,
  OPPORTUNITY_UPDATED: 3,
  CALL_NOTE_ADDED: 1,
  EMAIL_NOTE_ADDED: 1,
  WHATSAPP_NOTE_ADDED: 1,
  END_OF_DAY_SUMMARY_SUBMITTED: 2,
};

export function getDefaultActivityPoints(activityType: DailyActivityType): number {
  return DEFAULT_ACTIVITY_POINTS[activityType] ?? 0;
}

/** Employee-visible productivity bands (docs/webapp/DAILY_ACTIVITY_SCHEMA_DESIGN_REVIEW.md §2). */
export type ProductivityBand = "NO_ACTIVITY" | "LOW_ACTIVITY" | "ACTIVE" | "PRODUCTIVE" | "HIGHLY_PRODUCTIVE";

export function getProductivityBand(totalPoints: number): ProductivityBand {
  if (totalPoints <= 0) return "NO_ACTIVITY";
  if (totalPoints <= 4) return "LOW_ACTIVITY";
  if (totalPoints <= 9) return "ACTIVE";
  if (totalPoints <= 14) return "PRODUCTIVE";
  return "HIGHLY_PRODUCTIVE";
}

// ── Cutoff/grace (docs/webapp/DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md §11) ──────────────────────
export const CUTOFF_HOUR = 20; // 8:00 PM
export const GRACE_UNTIL_HOUR = 22; // 10:00 PM

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Converts a **local-midnight Date** (the shape `startOfDay`/`parseDateOnlyAsLocalDate`
 *  produce) into the value to write/query against an `activityDate`/`summaryDate` `@db.Date`
 *  column — see `@/lib/date-only` module doc for the full write-up of why this two-shape split
 *  exists. Every Prisma call below that touches one of those columns goes through this. */
const toDbDate = localDateToDbDate;

/** Resolve the point value for an activity type: active DB rule (role-specific, then global)
 *  if present, else the code-level default. Defensive — never throws (mirrors crm-engine's
 *  "every DB call try/catch-guarded" convention), since a rule-table lookup failure must not
 *  block activity capture. */
async function resolvePoints(activityType: DailyActivityType, employeeRole?: string | null): Promise<number> {
  try {
    if (employeeRole) {
      const roleRule = await prisma.productivityActivityRule.findFirst({
        where: { activityType, isActive: true, appliesToRole: employeeRole },
        orderBy: { updatedAt: "desc" },
      });
      if (roleRule) return roleRule.points;
    }
    const globalRule = await prisma.productivityActivityRule.findFirst({
      where: { activityType, isActive: true, appliesToRole: null },
      orderBy: { updatedAt: "desc" },
    });
    if (globalRule) return globalRule.points;
  } catch {
    // Table unreachable/unseeded — fall through to code default.
  }
  return getDefaultActivityPoints(activityType);
}

export interface CaptureDailyActivityInput {
  employeeId: number;
  activityType: DailyActivityType;
  sourceType: DailyActivitySourceType;
  /** The CRM row this event is about (lead id, task id, opportunity id, meeting id...).
   *  Required for the dedupe key to be meaningful — see docs/webapp/
   *  DAILY_ACTIVITY_SCHEMA_DESIGN_REVIEW.md §9 for the documented residual dedupe gap. */
  sourceId?: number | null;
  sourceTable?: string;
  /** Should encode enough detail to disambiguate two distinct same-day transitions on the same
   *  entity from a retried duplicate of one transition (e.g. "stage:NEW_LEAD->QUALIFIED", not
   *  bare "stage_changed") — see schema design review §9. */
  sourceAction: string;
  leadId?: number | null;
  opportunityId?: number | null;
  taskId?: number | null;
  meetingId?: number | null;
  description?: string;
  occurredAt?: Date;
  employeeRole?: string | null;
}

/**
 * Idempotently capture one Daily Activity event. Fire-and-forget safe: never throws back to
 * the caller. Returns the created log row, or null if it was a duplicate (already captured
 * today for this employee/source/action) or if capture failed for any other reason.
 */
export async function captureDailyActivityEvent(input: CaptureDailyActivityInput) {
  try {
    const occurredAt = input.occurredAt ?? new Date();
    const activityDate = startOfDay(occurredAt);
    const points = await resolvePoints(input.activityType, input.employeeRole);

    const log = await prisma.dailyActivityLog.create({
      data: {
        employeeId: input.employeeId,
        activityDate: toDbDate(activityDate),
        activityType: input.activityType,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        sourceTable: input.sourceTable ?? "",
        sourceAction: input.sourceAction,
        points,
        status: "CAPTURED",
        capturedAt: occurredAt,
        metadataJson: JSON.stringify({
          description: input.description ?? "",
          leadId: input.leadId ?? null,
          opportunityId: input.opportunityId ?? null,
          taskId: input.taskId ?? null,
          meetingId: input.meetingId ?? null,
        }),
      },
    });

    await recomputeDailySummary(input.employeeId, activityDate);
    return log;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      // Duplicate of (employeeId, sourceType, sourceId, sourceAction, activityDate) —
      // already captured today. Not an error, just a no-op.
      return null;
    }
    console.warn("[daily-activity] captureDailyActivityEvent failed (non-blocking):", e);
    return null;
  }
}

/**
 * Convenience wrapper for capturing from a CrmActivity-shaped record (entityType/entityId/
 * action/performedById), for call sites that already have one assembled (e.g. a future backfill
 * job). Not used by the Phase W2 route hooks below — those call captureDailyActivityEvent
 * directly with more precise context (e.g. distinguishing a Qualified transition from a generic
 * stage change, which a bare CrmActivity `action: "stage_changed"` cannot do by itself).
 */
export async function captureFromCrmActivity(crmActivity: {
  entityType: string;
  entityId: number;
  action: string;
  performedById: number;
  leadId?: number | null;
  opportunityId?: number | null;
}) {
  const map: Partial<Record<string, DailyActivityType>> = {
    note_added: "FOLLOW_UP_ADDED",
    meeting_scheduled: "MEETING_SCHEDULED",
    task_completed: "TASK_COMPLETED",
  };
  const activityType = map[crmActivity.action];
  if (!activityType) return null;

  const sourceType: DailyActivitySourceType =
    crmActivity.entityType === "lead" ? "LEAD" :
    crmActivity.entityType === "opportunity" ? "OPPORTUNITY" :
    crmActivity.entityType === "task" ? "TASK" : "CRM_ACTIVITY";

  return captureDailyActivityEvent({
    employeeId: crmActivity.performedById,
    activityType,
    sourceType,
    sourceId: crmActivity.entityId,
    sourceTable: "CrmActivity",
    sourceAction: crmActivity.action,
    leadId: crmActivity.leadId ?? null,
    opportunityId: crmActivity.opportunityId ?? null,
  });
}

/**
 * Recompute the auto-owned fields of today's DailyActivitySummary from DailyActivityLog.
 * Only touches `totalPoints`/`productivityBand`/`autoSummaryJson`/`status` — never the
 * employee-input fields (`blockers`/`nextDayPlan`/`finalRemarks`) or `submittedAt`/`closedAt`.
 * Will not downgrade a day that has already moved past the auto-managed states (e.g. CLOSED,
 * REOPENED, PENDING_CORRECTION, LATE_SUBMITTED, INCOMPLETE) — those are owned by later-phase
 * write APIs (summary submission, correction approval, reopen), not by capture.
 */
const AUTO_MANAGED_STATUSES = new Set(["NO_ACTIVITY", "SUMMARY_PENDING"]);

export async function recomputeDailySummary(employeeId: number, activityDate: Date) {
  try {
    const day = startOfDay(activityDate);
    const logs = await prisma.dailyActivityLog.findMany({
      where: { employeeId, activityDate: toDbDate(day) },
      select: { points: true },
    });
    const totalPoints = logs.reduce((sum, l) => sum + l.points, 0);
    const productivityBand = getProductivityBand(totalPoints);
    const autoSummary = await buildAutoSummary(employeeId, day);

    const existing = await prisma.dailyActivitySummary.findUnique({
      where: { employeeId_summaryDate: { employeeId, summaryDate: toDbDate(day) } },
    });

    if (!existing) {
      await prisma.dailyActivitySummary.create({
        data: {
          employeeId,
          summaryDate: toDbDate(day),
          status: totalPoints > 0 ? "SUMMARY_PENDING" : "NO_ACTIVITY",
          productivityBand,
          totalPoints,
          autoSummaryJson: JSON.stringify(autoSummary),
        },
      });
      return;
    }

    if (!AUTO_MANAGED_STATUSES.has(existing.status)) {
      // A later-phase write API has already moved this day past the auto-managed states —
      // refresh the point/band/auto-summary snapshot but leave `status` alone.
      await prisma.dailyActivitySummary.update({
        where: { id: existing.id },
        data: { totalPoints, productivityBand, autoSummaryJson: JSON.stringify(autoSummary) },
      });
      return;
    }

    await prisma.dailyActivitySummary.update({
      where: { id: existing.id },
      data: {
        status: totalPoints > 0 ? "SUMMARY_PENDING" : "NO_ACTIVITY",
        productivityBand,
        totalPoints,
        autoSummaryJson: JSON.stringify(autoSummary),
      },
    });
  } catch (e) {
    console.warn("[daily-activity] recomputeDailySummary failed (non-blocking):", e);
  }
}

export interface AutoSummary {
  activitiesCompleted: number;
  leadsQualified: number;
  meetingsCompleted: number;
  proposalsSent: number;
  tasksCompleted: number;
  followUpsDone: number;
}

/** Auto-generated summary counts (docs/webapp/DAILY_ACTIVITY_PRODUCTIVITY_WORKFLOW_PLAN.md §7) —
 *  computed from real captured activity, never employee-typed. */
export async function buildAutoSummary(employeeId: number, date: Date): Promise<AutoSummary> {
  const day = startOfDay(date);
  const logs = await prisma.dailyActivityLog.findMany({
    where: { employeeId, activityDate: toDbDate(day) },
    select: { activityType: true },
  });
  const count = (t: DailyActivityType) => logs.filter((l) => l.activityType === t).length;
  return {
    activitiesCompleted: logs.length,
    leadsQualified: count("QUALIFIED_LEAD_CREATED"),
    meetingsCompleted: count("MEETING_COMPLETED"),
    proposalsSent: count("PROPOSAL_SENT"),
    tasksCompleted: count("TASK_COMPLETED"),
    followUpsDone: count("FOLLOW_UP_ADDED") + count("CALL_NOTE_ADDED") + count("EMAIL_NOTE_ADDED") + count("WHATSAPP_NOTE_ADDED"),
  };
}

// ── Read shapes ────────────────────────────────────────────────────────────────────────────────

export interface EmployeeTimelineEntry {
  activityType: DailyActivityType;
  sourceType: DailyActivitySourceType;
  capturedAt: Date;
  description: string;
  // Deliberately no `points` field — employees never see exact points (hard rule).
}

export interface EmployeeDailyActivityView {
  date: string;
  summaryStatus: string;
  productivityBand: ProductivityBand;
  employeeVisibleStatus: ProductivityBand;
  activityCounts: AutoSummary;
  activityTimeline: EmployeeTimelineEntry[];
  autoSummary: AutoSummary;
  blockers: string;
  nextDayPlan: string;
  finalRemarks: string;
  cutoffTime: string;
  graceUntil: string;
  canSubmitSummary: boolean;
  canEditSummary: boolean;
  correctionRequestStatus: string | null;
}

function parseMetadataDescription(metadataJson: string): string {
  try {
    return JSON.parse(metadataJson)?.description ?? "";
  } catch {
    return "";
  }
}

/** Employee's own view of a given day — exact points are never included. */
export async function getDailyActivityForEmployee(employeeId: number, date: Date): Promise<EmployeeDailyActivityView> {
  const day = startOfDay(date);
  const [logs, summary, correction] = await Promise.all([
    prisma.dailyActivityLog.findMany({
      where: { employeeId, activityDate: toDbDate(day) },
      orderBy: { capturedAt: "desc" },
    }),
    prisma.dailyActivitySummary.findUnique({
      where: { employeeId_summaryDate: { employeeId, summaryDate: toDbDate(day) } },
    }),
    prisma.dailyActivityCorrectionRequest.findFirst({
      where: { employeeId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const autoSummary = await buildAutoSummary(employeeId, day);
  const totalPoints = logs.reduce((sum, l) => sum + l.points, 0);
  const productivityBand = summary?.productivityBand as ProductivityBand | undefined ?? getProductivityBand(totalPoints);

  const now = new Date();
  const cutoff = new Date(day); cutoff.setHours(CUTOFF_HOUR, 0, 0, 0);
  const grace = new Date(day); grace.setHours(GRACE_UNTIL_HOUR, 0, 0, 0);
  const isToday = startOfDay(now).getTime() === day.getTime();
  const withinGrace = isToday && now <= grace;

  return {
    date: toDateKeyLocal(day),
    summaryStatus: summary?.status ?? (totalPoints > 0 ? "SUMMARY_PENDING" : "NO_ACTIVITY"),
    productivityBand,
    employeeVisibleStatus: productivityBand,
    activityCounts: autoSummary,
    activityTimeline: logs.map((l) => ({
      activityType: l.activityType as DailyActivityType,
      sourceType: l.sourceType as DailyActivitySourceType,
      capturedAt: l.capturedAt,
      description: parseMetadataDescription(l.metadataJson),
    })),
    autoSummary,
    blockers: summary?.blockers ?? "",
    nextDayPlan: summary?.nextDayPlan ?? "",
    finalRemarks: summary?.finalRemarks ?? "",
    cutoffTime: cutoff.toISOString(),
    graceUntil: grace.toISOString(),
    // Submission/edit are not implemented until a later phase — these flags describe the
    // *timing* rule only; the actual submit/edit endpoints don't exist yet (Phase W2 scope).
    canSubmitSummary: isToday && withinGrace && !summary?.submittedAt,
    canEditSummary: isToday && withinGrace,
    correctionRequestStatus: correction?.status ?? null,
  };
}

export interface EmployeeHistoryEntry {
  date: string;
  summaryStatus: string;
  productivityBand: ProductivityBand;
}

/** Employee's own recent history — band only, no points, no other employees' data. */
export async function getDailyActivityHistoryForEmployee(employeeId: number, days = 14): Promise<EmployeeHistoryEntry[]> {
  const since = startOfDay(new Date());
  since.setDate(since.getDate() - days);

  const summaries = await prisma.dailyActivitySummary.findMany({
    where: { employeeId, summaryDate: { gte: toDbDate(since) } },
    orderBy: { summaryDate: "desc" },
  });

  return summaries.map((s) => ({
    // `s.summaryDate` is a DB-read `@db.Date` value — must go through dbDateToLocalDate (UTC
    // components) before formatting, never toDateKeyLocal directly (local components) on a raw
    // DB-read value. See `@/lib/date-only` module doc.
    date: toDateKeyLocal(dbDateToLocalDate(s.summaryDate)),
    summaryStatus: s.status,
    productivityBand: s.productivityBand as ProductivityBand,
  }));
}

export interface ManagerTimelineEntry extends EmployeeTimelineEntry {
  points: number;
}

export interface ManagerEmployeeDayView {
  employeeId: number;
  employeeName: string;
  summaryDate: string;
  summaryStatus: string;
  totalPoints: number;
  productivityBand: ProductivityBand;
  activityCounts: AutoSummary;
  activityTimeline: ManagerTimelineEntry[];
  hasCorrectionPending: boolean;
}

/** Manager-facing view of one employee's day — exact points included (manager-only). */
export async function getDailyActivityForManagerEmployee(employeeId: number, date: Date): Promise<ManagerEmployeeDayView | null> {
  const day = startOfDay(date);
  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true, name: true } });
  if (!employee) return null;

  const [logs, summary, correctionPending] = await Promise.all([
    prisma.dailyActivityLog.findMany({ where: { employeeId, activityDate: toDbDate(day) }, orderBy: { capturedAt: "desc" } }),
    prisma.dailyActivitySummary.findUnique({ where: { employeeId_summaryDate: { employeeId, summaryDate: toDbDate(day) } } }),
    prisma.dailyActivityCorrectionRequest.count({ where: { employeeId, status: "PENDING" } }),
  ]);

  const autoSummary = await buildAutoSummary(employeeId, day);
  const totalPoints = summary?.totalPoints ?? logs.reduce((sum, l) => sum + l.points, 0);

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    summaryDate: toDateKeyLocal(day),
    summaryStatus: summary?.status ?? (totalPoints > 0 ? "SUMMARY_PENDING" : "NO_ACTIVITY"),
    totalPoints,
    productivityBand: (summary?.productivityBand as ProductivityBand | undefined) ?? getProductivityBand(totalPoints),
    activityCounts: autoSummary,
    activityTimeline: logs.map((l) => ({
      activityType: l.activityType as DailyActivityType,
      sourceType: l.sourceType as DailyActivitySourceType,
      capturedAt: l.capturedAt,
      description: parseMetadataDescription(l.metadataJson),
      points: l.points,
    })),
    hasCorrectionPending: correctionPending > 0,
  };
}

export interface TeamDailyActivityRow {
  employeeId: number;
  employeeName: string;
  summaryStatus: string;
  totalPoints: number;
  productivityBand: ProductivityBand;
  activityCounts: AutoSummary;
  lastActivityAt: Date | null;
  hasCorrectionPending: boolean;
  needsReview: boolean;
}

export interface TeamDailyActivityView {
  date: string;
  totals: { employeeCount: number; closedCount: number; incompleteCount: number; noActivityCount: number; summaryPendingCount: number };
  employees: TeamDailyActivityRow[];
}

/**
 * Manager view of team activity for a date. Scoping note: this app's existing manager pattern
 * (see `/api/daily-updates` — any `isManager === true` employee sees ALL employees unless an
 * `employeeId` filter is passed, not just direct reports) is preserved here for consistency —
 * not narrowed to `Employee.reportsToId` direct reports, since no other endpoint in this
 * codebase scopes manager visibility that way. `employeeIds`, when passed, restricts to that
 * set; callers (the API route) are responsible for the actual authorization decision.
 */
export async function getTeamDailyActivity(date: Date, employeeIds?: number[]): Promise<TeamDailyActivityView> {
  const day = startOfDay(date);
  const employees = await prisma.employee.findMany({
    where: employeeIds ? { id: { in: employeeIds } } : {},
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const rows: TeamDailyActivityRow[] = [];
  let closedCount = 0, incompleteCount = 0, noActivityCount = 0, summaryPendingCount = 0;

  for (const emp of employees) {
    const [logs, summary, correctionPending] = await Promise.all([
      prisma.dailyActivityLog.findMany({ where: { employeeId: emp.id, activityDate: toDbDate(day) }, select: { points: true, capturedAt: true } }),
      prisma.dailyActivitySummary.findUnique({ where: { employeeId_summaryDate: { employeeId: emp.id, summaryDate: toDbDate(day) } } }),
      prisma.dailyActivityCorrectionRequest.count({ where: { employeeId: emp.id, status: "PENDING" } }),
    ]);

    const totalPoints = summary?.totalPoints ?? logs.reduce((sum, l) => sum + l.points, 0);
    const status = summary?.status ?? (totalPoints > 0 ? "SUMMARY_PENDING" : "NO_ACTIVITY");
    const autoSummary = await buildAutoSummary(emp.id, day);
    const lastActivityAt = logs.length ? logs.reduce((latest, l) => (l.capturedAt > latest ? l.capturedAt : latest), logs[0].capturedAt) : null;

    if (status === "CLOSED") closedCount++;
    else if (status === "INCOMPLETE") incompleteCount++;
    else if (status === "NO_ACTIVITY") noActivityCount++;
    else if (status === "SUMMARY_PENDING") summaryPendingCount++;

    rows.push({
      employeeId: emp.id,
      employeeName: emp.name,
      summaryStatus: status,
      totalPoints,
      productivityBand: (summary?.productivityBand as ProductivityBand | undefined) ?? getProductivityBand(totalPoints),
      activityCounts: autoSummary,
      lastActivityAt,
      hasCorrectionPending: correctionPending > 0,
      needsReview: correctionPending > 0 || status === "INCOMPLETE",
    });
  }

  return {
    date: toDateKeyLocal(day),
    totals: { employeeCount: employees.length, closedCount, incompleteCount, noActivityCount, summaryPendingCount },
    employees: rows,
  };
}

// ══════════════════════════════════════════════════════════════════════════════════════════════
// Phase W4 — backend write workflows (summary submit/edit, correction requests, manager
// approve/reject/reopen). No UI write flow yet (that's a later phase); no schema changes.
// ══════════════════════════════════════════════════════════════════════════════════════════════

/** Thrown by every Phase W4 write helper on a validation/authorization/state failure. Routes
 *  catch this and respond with `.status`, keeping the same error shape across all five new
 *  endpoints instead of each route hand-rolling its own 400/403/404/409 logic. */
export class DailyActivityError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "DailyActivityError";
    this.status = status;
  }
}

function isValidActivityType(t: unknown): t is DailyActivityType {
  return typeof t === "string" && (DAILY_ACTIVITY_TYPES as readonly string[]).includes(t);
}

function isValidSourceType(t: unknown): t is DailyActivitySourceType {
  return typeof t === "string" && (DAILY_ACTIVITY_SOURCE_TYPES as readonly string[]).includes(t);
}

const MAX_TEXT_FIELD_LENGTH = 4000;

/** Trims and length-caps a free-text field; returns "" for null/undefined/non-string. Caps
 *  rather than rejects long input — these are `@db.Text` columns with no DB-level length limit,
 *  but an unbounded request body is still worth bounding defensively at the API boundary. */
function sanitizeText(value: unknown, maxLength = MAX_TEXT_FIELD_LENGTH): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

/**
 * Pure decision function shared by `canSubmitDailySummary` and `canEditDailySummary` — given
 * the target day, the current moment, and the summary's current status, decides whether a
 * submit/edit is allowed right now, and whether it would count as a late submission.
 *
 * Business rules implemented (docs/webapp/DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md §9/§11):
 *   - Same calendar day, at or before the 10:00 PM grace cutoff → allowed, on-time.
 *   - Same calendar day, after grace → locked (the day surfaces as INCOMPLETE if never
 *     submitted; this function just reports "not allowed", it doesn't write that status).
 *   - Exactly one calendar day after the target day → allowed, but flagged `isLate` (the
 *     "submit a missed summary within the next working day" rule).
 *   - Two or more calendar days after the target day → locked; only a manager reopen
 *     (`status === "REOPENED"`) can unlock it again.
 *   - `status === "REOPENED"` always allows a submit/edit regardless of how old the day is —
 *     a manager reopen is treated as an explicit, time-unbounded authorization to resubmit.
 *   - A future target day is never allowed.
 *
 * Open business decision, documented rather than silently assumed: this codebase has no
 * working-day/holiday calendar anywhere, so "next working day" is implemented as "next
 * calendar day" (no Sunday/holiday skip). Revisit if a working-day calendar is ever added.
 */
function evaluateSubmissionWindow(
  day: Date,
  now: Date,
  currentStatus: string
): { allowed: boolean; isLate: boolean; reason: string } {
  if (currentStatus === "REOPENED") {
    return { allowed: true, isLate: false, reason: "Day was reopened by a manager — resubmission allowed." };
  }

  const today = startOfDay(now);
  const diffDays = Math.round((today.getTime() - day.getTime()) / 86_400_000);

  if (diffDays < 0) {
    return { allowed: false, isLate: false, reason: "Cannot submit a summary for a future date." };
  }
  if (diffDays === 0) {
    const grace = new Date(day);
    grace.setHours(GRACE_UNTIL_HOUR, 0, 0, 0);
    if (now <= grace) return { allowed: true, isLate: false, reason: "Within same-day grace window." };
    return { allowed: false, isLate: false, reason: "Same-day grace window (10:00 PM) has passed." };
  }
  if (diffDays === 1) {
    return { allowed: true, isLate: true, reason: "Within the next-working-day late-submission window." };
  }
  return { allowed: false, isLate: false, reason: "Submission window has closed — ask a manager to reopen this day." };
}

/** Can `employeeId` submit (create or resubmit) a summary for `date` right now? Fetches the
 *  current summary row (if any) to evaluate against its status. */
export async function canSubmitDailySummary(
  employeeId: number,
  date: Date
): Promise<{ allowed: boolean; isLate: boolean; reason: string }> {
  const day = startOfDay(date);
  const existing = await prisma.dailyActivitySummary.findUnique({
    where: { employeeId_summaryDate: { employeeId, summaryDate: toDbDate(day) } },
  });
  return evaluateSubmissionWindow(day, new Date(), existing?.status ?? "NO_ACTIVITY");
}

/** Can an already-submitted summary be edited right now? Takes the summary row itself (not a
 *  fresh DB lookup) since callers (the edit route) already have it loaded. `summary.summaryDate`
 *  is a DB-read `@db.Date` value — must go through `dbDateToLocalDate`, never `startOfDay`
 *  directly (that would apply local-time `setHours` to UTC-tagged components). */
export function canEditDailySummary(summary: {
  summaryDate: Date;
  status: string;
}): { allowed: boolean; isLate: boolean; reason: string } {
  return evaluateSubmissionWindow(dbDateToLocalDate(summary.summaryDate), new Date(), summary.status);
}

export interface SubmitDailyActivitySummaryInput {
  employeeId: number;
  date: Date; // already parsed via parseDateOnlyAsLocalDate by the caller
  blockers?: string;
  nextDayPlan?: string;
  finalRemarks?: string;
  employeeRole?: string | null;
}

/**
 * Employee submits (or idempotently resubmits, before lock) their end-of-day summary.
 *
 * Conservative, explicitly-documented behavior for the "zero activity, summary still
 * submitted" case (open business decision per the Phase W4 brief — current docs don't resolve
 * it, so this is the chosen default): submission is allowed even with zero captured activity;
 * the `END_OF_DAY_SUMMARY_SUBMITTED` event (2 pts — already an existing Phase W2 default, not
 * newly introduced here) is captured and counted, so a zero-other-activity day that submits a
 * summary lands in the `LOW_ACTIVITY` band (2 pts), not `NO_ACTIVITY` — `getProductivityBand`
 * is unchanged from Phase W2; this helper does not special-case "summary-only" days back to
 * `NO_ACTIVITY`. Revisit this if the business wants summary-only closure to stay band-neutral.
 */
export async function submitDailyActivitySummary(input: SubmitDailyActivitySummaryInput) {
  const day = startOfDay(input.date);
  const now = new Date();

  const existing = await prisma.dailyActivitySummary.findUnique({
    where: { employeeId_summaryDate: { employeeId: input.employeeId, summaryDate: toDbDate(day) } },
  });
  const window = evaluateSubmissionWindow(day, now, existing?.status ?? "NO_ACTIVITY");
  if (!window.allowed) throw new DailyActivityError(window.reason, 409);

  // capturedAt carries the real time-of-day for a realistic timeline entry; activityDate
  // (computed by captureDailyActivityEvent via startOfDay) still correctly resolves to `day`,
  // not "now" — required for late submissions, which submit *for* a prior day.
  const occurredAt = new Date(day);
  occurredAt.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

  await captureDailyActivityEvent({
    employeeId: input.employeeId,
    activityType: "END_OF_DAY_SUMMARY_SUBMITTED",
    sourceType: "SUMMARY",
    sourceId: input.employeeId,
    sourceTable: "DailyActivitySummary",
    sourceAction: "summary_submitted",
    occurredAt,
    employeeRole: input.employeeRole,
  });

  // Refreshes totalPoints/productivityBand/autoSummaryJson from the log (including the event
  // just captured above) and creates the row if it didn't exist yet — reuses the Phase W2
  // recompute path rather than duplicating its point-aggregation logic here.
  await recomputeDailySummary(input.employeeId, day);

  const resultStatus =
    existing?.status === "REOPENED" ? "CLOSED" : window.isLate ? "LATE_SUBMITTED" : "CLOSED";

  const refreshed = await prisma.dailyActivitySummary.findUniqueOrThrow({
    where: { employeeId_summaryDate: { employeeId: input.employeeId, summaryDate: toDbDate(day) } },
  });

  await prisma.dailyActivitySummary.update({
    where: { id: refreshed.id },
    data: {
      blockers: sanitizeText(input.blockers),
      nextDayPlan: sanitizeText(input.nextDayPlan),
      finalRemarks: sanitizeText(input.finalRemarks),
      status: resultStatus,
      submittedAt: refreshed.submittedAt ?? now,
      closedAt: now,
      lateSubmittedAt: window.isLate ? refreshed.lateSubmittedAt ?? now : refreshed.lateSubmittedAt,
    },
  });

  return getDailyActivityForEmployee(input.employeeId, day);
}

export interface UpdateDailyActivitySummaryInput {
  employeeId: number;
  date: Date;
  blockers?: string;
  nextDayPlan?: string;
  finalRemarks?: string;
}

/**
 * Employee edits the three employee-owned fields of an already-submitted summary. Never
 * touches status/points/submittedAt/closedAt — those are submit-time-only or system-owned.
 * Requires the summary to already exist (i.e. submitted at least once) — use
 * `submitDailyActivitySummary` for the first submission.
 */
export async function updateDailyActivitySummary(input: UpdateDailyActivitySummaryInput) {
  const day = startOfDay(input.date);
  const existing = await prisma.dailyActivitySummary.findUnique({
    where: { employeeId_summaryDate: { employeeId: input.employeeId, summaryDate: toDbDate(day) } },
  });
  if (!existing || !existing.submittedAt) {
    throw new DailyActivityError("No submitted summary exists for this date yet — submit it first.", 404);
  }

  const window = canEditDailySummary(existing);
  if (!window.allowed) throw new DailyActivityError(window.reason, 409);

  await prisma.dailyActivitySummary.update({
    where: { id: existing.id },
    data: {
      blockers: sanitizeText(input.blockers),
      nextDayPlan: sanitizeText(input.nextDayPlan),
      finalRemarks: sanitizeText(input.finalRemarks),
    },
  });

  return getDailyActivityForEmployee(input.employeeId, day);
}

export interface CreateDailyActivityCorrectionRequestInput {
  employeeId: number;
  date: Date;
  activityLogId?: number | null;
  requestedActivityType: string;
  requestedSourceType: string;
  requestedSourceId?: number | null;
  reason: string;
}

/** Employee requests a correction for a missing/wrong captured activity on `date`. Never
 *  touches points/score — that only happens on manager approval (see
 *  `approveDailyActivityCorrectionRequest`). */
export async function createDailyActivityCorrectionRequest(input: CreateDailyActivityCorrectionRequestInput) {
  if (!isValidActivityType(input.requestedActivityType)) {
    throw new DailyActivityError(`Invalid requestedActivityType: "${input.requestedActivityType}"`, 400);
  }
  if (!isValidSourceType(input.requestedSourceType)) {
    throw new DailyActivityError(`Invalid requestedSourceType: "${input.requestedSourceType}"`, 400);
  }
  const reason = sanitizeText(input.reason);
  if (!reason) throw new DailyActivityError("reason is required.", 400);

  const day = startOfDay(input.date);

  if (input.activityLogId != null) {
    const log = await prisma.dailyActivityLog.findUnique({ where: { id: input.activityLogId } });
    if (!log || log.employeeId !== input.employeeId || dbDateToLocalDate(log.activityDate).getTime() !== day.getTime()) {
      throw new DailyActivityError("activityLogId does not belong to this employee/date.", 400);
    }
  }

  // Ensures the summary row exists (creates a NO_ACTIVITY/SUMMARY_PENDING row if this is the
  // first write of the day) without altering totalPoints/band — same idempotent path used
  // everywhere else a summary row is needed on demand.
  await recomputeDailySummary(input.employeeId, day);
  const summary = await prisma.dailyActivitySummary.findUniqueOrThrow({
    where: { employeeId_summaryDate: { employeeId: input.employeeId, summaryDate: toDbDate(day) } },
  });

  const request = await prisma.dailyActivityCorrectionRequest.create({
    data: {
      employeeId: input.employeeId,
      summaryId: summary.id,
      activityLogId: input.activityLogId ?? null,
      requestedActivityType: input.requestedActivityType,
      requestedSourceType: input.requestedSourceType,
      requestedSourceId: input.requestedSourceId ?? null,
      reason,
      status: "PENDING",
    },
  });

  await prisma.dailyActivitySummary.update({
    where: { id: summary.id },
    data: { status: "PENDING_CORRECTION" },
  });

  return {
    id: request.id,
    employeeId: request.employeeId,
    date: toDateKeyLocal(day),
    requestedActivityType: request.requestedActivityType,
    requestedSourceType: request.requestedSourceType,
    reason: request.reason,
    status: request.status,
    createdAt: request.createdAt,
    // Deliberately no `approvedPoints` field — null until decided, and not employee-visible
    // even once set (manager-only, surfaced via the approve/reject response instead).
  };
}

/** Best-effort AuditLog write — mirrors this codebase's existing "approval/automation hooks
 *  are fire-and-forget, never block the action they're logging" convention (see crm-engine).
 *  Reuses the existing `AuditLog` model; no new audit table. */
export async function writeDailyActivityAuditLog(input: {
  entityType: "daily_activity_correction" | "daily_activity_day";
  entityId: number;
  action: "approve" | "reject" | "reopen";
  performedById: number;
  changes?: string;
  notes?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        performedById: input.performedById,
        changes: input.changes ?? "",
        notes: input.notes ?? "",
      },
    });
  } catch (e) {
    console.warn("[daily-activity] writeDailyActivityAuditLog failed (non-blocking):", e);
  }
}

/** After a correction is approved/rejected, clears `PENDING_CORRECTION` back to a normal
 *  status — but only if no *other* correction on this summary is still pending. */
async function reconcileSummaryStatusAfterCorrectionDecision(summaryId: number) {
  const stillPending = await prisma.dailyActivityCorrectionRequest.count({
    where: { summaryId, status: "PENDING" },
  });
  if (stillPending > 0) return;

  const summary = await prisma.dailyActivitySummary.findUnique({ where: { id: summaryId } });
  if (!summary || summary.status !== "PENDING_CORRECTION") return;

  const newStatus = summary.submittedAt ? "CLOSED" : summary.totalPoints > 0 ? "SUMMARY_PENDING" : "NO_ACTIVITY";
  await prisma.dailyActivitySummary.update({ where: { id: summaryId }, data: { status: newStatus } });
}

export interface DecideDailyActivityCorrectionRequestInput {
  correctionRequestId: number;
  managerId: number;
  managerRemarks?: string;
  /** Employee IDs the acting manager is authorized to decide for — see
   *  `isManagerAuthorizedForEmployee` for what "authorized" means in this codebase today. */
  authorizedEmployeeIds?: "ALL" | number[];
}

/**
 * Manager approves a pending correction request. Approved points are always resolved
 * server-side from the existing activity-rule/default-points table (`resolvePoints` —
 * identical resolution path Phase W2 uses for normal capture) keyed off
 * `requestedActivityType` — the manager never supplies a point value directly; there is no
 * request-body field that can override it.
 */
export async function approveDailyActivityCorrectionRequest(input: DecideDailyActivityCorrectionRequestInput) {
  const request = await prisma.dailyActivityCorrectionRequest.findUnique({
    where: { id: input.correctionRequestId },
    include: { summary: true },
  });
  if (!request) throw new DailyActivityError("Correction request not found.", 404);
  if (request.status !== "PENDING") throw new DailyActivityError(`Correction request is already ${request.status}.`, 409);
  if (request.employeeId === input.managerId) {
    throw new DailyActivityError("Cannot approve a correction request for yourself.", 403);
  }
  if (input.authorizedEmployeeIds !== "ALL" && !(input.authorizedEmployeeIds ?? []).includes(request.employeeId)) {
    throw new DailyActivityError("Not authorized to decide this employee's correction request.", 403);
  }

  const employee = await prisma.employee.findUnique({ where: { id: request.employeeId }, select: { role: true } });
  const activityType = request.requestedActivityType as DailyActivityType;
  const approvedPoints = await resolvePoints(activityType, employee?.role);

  const day = dbDateToLocalDate(request.summary.summaryDate);
  const now = new Date();

  await prisma.dailyActivityLog.create({
    data: {
      employeeId: request.employeeId,
      activityDate: toDbDate(day),
      activityType,
      sourceType: isValidSourceType(request.requestedSourceType) ? request.requestedSourceType : "CORRECTION",
      sourceId: request.requestedSourceId,
      sourceTable: "DailyActivityCorrectionRequest",
      // Suffixed with the request id (not just "correction_approved") so two approved
      // corrections on the same day — both legitimately missing a sourceId — don't collide on
      // the (employeeId, sourceType, sourceId, sourceAction, activityDate) unique constraint.
      sourceAction: `correction_approved:${request.id}`,
      points: approvedPoints,
      status: "COUNTED",
      capturedAt: now,
      countedAt: now,
      isCorrection: true,
      correctionRequestId: request.id,
      metadataJson: JSON.stringify({ description: `Correction approved: ${activityType}`, correctionRequestId: request.id }),
    },
  });

  await prisma.dailyActivityCorrectionRequest.update({
    where: { id: request.id },
    data: {
      status: "APPROVED",
      managerId: input.managerId,
      managerDecisionAt: now,
      managerRemarks: sanitizeText(input.managerRemarks),
      approvedPoints,
    },
  });

  await recomputeDailySummary(request.employeeId, day);
  await reconcileSummaryStatusAfterCorrectionDecision(request.summaryId);

  await writeDailyActivityAuditLog({
    entityType: "daily_activity_correction",
    entityId: request.id,
    action: "approve",
    performedById: input.managerId,
    changes: JSON.stringify({ approvedPoints, activityType }),
    notes: input.managerRemarks ?? "",
  });

  return getDailyActivityForManagerEmployee(request.employeeId, day);
}

/** Manager rejects a pending correction request. Score is never touched — no log is created,
 *  no points change. */
export async function rejectDailyActivityCorrectionRequest(input: DecideDailyActivityCorrectionRequestInput) {
  const request = await prisma.dailyActivityCorrectionRequest.findUnique({
    where: { id: input.correctionRequestId },
    include: { summary: true },
  });
  if (!request) throw new DailyActivityError("Correction request not found.", 404);
  if (request.status !== "PENDING") throw new DailyActivityError(`Correction request is already ${request.status}.`, 409);
  if (input.authorizedEmployeeIds !== "ALL" && !(input.authorizedEmployeeIds ?? []).includes(request.employeeId)) {
    throw new DailyActivityError("Not authorized to decide this employee's correction request.", 403);
  }

  const now = new Date();
  await prisma.dailyActivityCorrectionRequest.update({
    where: { id: request.id },
    data: {
      status: "REJECTED",
      managerId: input.managerId,
      managerDecisionAt: now,
      managerRemarks: sanitizeText(input.managerRemarks),
    },
  });

  await reconcileSummaryStatusAfterCorrectionDecision(request.summaryId);

  await writeDailyActivityAuditLog({
    entityType: "daily_activity_correction",
    entityId: request.id,
    action: "reject",
    performedById: input.managerId,
    notes: input.managerRemarks ?? "",
  });

  return getDailyActivityForManagerEmployee(request.employeeId, dbDateToLocalDate(request.summary.summaryDate));
}

export interface ReopenDailyActivityDayInput {
  employeeId: number;
  date: Date;
  managerId: number;
  authorizedEmployeeIds?: "ALL" | number[];
}

/** Manager reopens a locked/incomplete/closed day for one team employee. Never adjusts
 *  `DailyActivityLog` points — only flips the summary's status/reopen metadata so the employee
 *  can resubmit through the normal submit path (`submitDailyActivitySummary`). */
export async function reopenDailyActivityDay(input: ReopenDailyActivityDayInput) {
  if (input.authorizedEmployeeIds !== "ALL" && !(input.authorizedEmployeeIds ?? []).includes(input.employeeId)) {
    throw new DailyActivityError("Not authorized to reopen this employee's day.", 403);
  }

  const day = startOfDay(input.date);
  // Ensures the row exists even if the employee had zero activity that day — a manager can
  // still reopen a NO_ACTIVITY day to invite a late summary.
  await recomputeDailySummary(input.employeeId, day);
  const summary = await prisma.dailyActivitySummary.findUniqueOrThrow({
    where: { employeeId_summaryDate: { employeeId: input.employeeId, summaryDate: toDbDate(day) } },
  });

  const now = new Date();
  await prisma.dailyActivitySummary.update({
    where: { id: summary.id },
    data: { status: "REOPENED", reopenedAt: now, reopenedById: input.managerId },
  });

  await writeDailyActivityAuditLog({
    entityType: "daily_activity_day",
    entityId: summary.id,
    action: "reopen",
    performedById: input.managerId,
    notes: `Reopened ${toDateKeyLocal(day)} for employeeId ${input.employeeId}`,
  });

  return getDailyActivityForManagerEmployee(input.employeeId, day);
}

/**
 * Authorization check shared by the three manager-write endpoints (approve/reject/reopen).
 * Deliberately mirrors this codebase's existing, explicitly-documented precedent (see
 * `getTeamDailyActivity` above and `/api/daily-updates`): any `isManager === true` employee is
 * authorized for ALL employees, not narrowed to `Employee.reportsToId` direct reports — there
 * is no other endpoint in this codebase that scopes manager authorization by reporting line,
 * and introducing one only for the three new write endpoints would make authorization
 * inconsistent between read and write paths for the same data. Returns `"ALL"` (matching the
 * `authorizedEmployeeIds` shape the three write helpers above expect) when the session is a
 * manager, otherwise `[]` (authorizes nobody).
 */
export function resolveManagerAuthorizedEmployeeIds(sessionUser: { isManager?: boolean } | undefined): "ALL" | number[] {
  return sessionUser?.isManager ? "ALL" : [];
}
