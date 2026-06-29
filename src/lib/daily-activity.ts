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
        activityDate,
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
      where: { employeeId, activityDate: day },
      select: { points: true },
    });
    const totalPoints = logs.reduce((sum, l) => sum + l.points, 0);
    const productivityBand = getProductivityBand(totalPoints);
    const autoSummary = await buildAutoSummary(employeeId, day);

    const existing = await prisma.dailyActivitySummary.findUnique({
      where: { employeeId_summaryDate: { employeeId, summaryDate: day } },
    });

    if (!existing) {
      await prisma.dailyActivitySummary.create({
        data: {
          employeeId,
          summaryDate: day,
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
    where: { employeeId, activityDate: day },
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
      where: { employeeId, activityDate: day },
      orderBy: { capturedAt: "desc" },
    }),
    prisma.dailyActivitySummary.findUnique({
      where: { employeeId_summaryDate: { employeeId, summaryDate: day } },
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
    date: day.toISOString().slice(0, 10),
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
    where: { employeeId, summaryDate: { gte: since } },
    orderBy: { summaryDate: "desc" },
  });

  return summaries.map((s) => ({
    date: s.summaryDate.toISOString().slice(0, 10),
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
    prisma.dailyActivityLog.findMany({ where: { employeeId, activityDate: day }, orderBy: { capturedAt: "desc" } }),
    prisma.dailyActivitySummary.findUnique({ where: { employeeId_summaryDate: { employeeId, summaryDate: day } } }),
    prisma.dailyActivityCorrectionRequest.count({ where: { employeeId, status: "PENDING" } }),
  ]);

  const autoSummary = await buildAutoSummary(employeeId, day);
  const totalPoints = summary?.totalPoints ?? logs.reduce((sum, l) => sum + l.points, 0);

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    summaryDate: day.toISOString().slice(0, 10),
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
      prisma.dailyActivityLog.findMany({ where: { employeeId: emp.id, activityDate: day }, select: { points: true, capturedAt: true } }),
      prisma.dailyActivitySummary.findUnique({ where: { employeeId_summaryDate: { employeeId: emp.id, summaryDate: day } } }),
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
    date: day.toISOString().slice(0, 10),
    totals: { employeeCount: employees.length, closedCount, incompleteCount, noActivityCount, summaryPendingCount },
    employees: rows,
  };
}
