/**
 * Phase W11 — PerformanceReview integration on top of converted Enterprise KRA `KRAAchievement`
 * rows (explicit review workflow, never automatic).
 *
 * This module is a NEW, Enterprise-KRA-specific orchestration layer built ON TOP of the existing
 * generic `review.ts` primitives (`startPerformanceReview`/`updateReview`/`getReview`/`listReviews`,
 * which already back the pre-existing raw `GET/POST/PATCH /api/admin/performance/reviews` route and
 * `ReviewWorkflowManager.tsx` UI) — those are left completely untouched so nothing that already
 * depends on them breaks. This module instead:
 *   - Only creates a `PerformanceReview` for an `EmployeeTarget` that has at least one CONVERTED
 *     `KRAAchievement` row (never from preview-only data).
 *   - Prevents duplicate reviews per `employeeTargetId` (one review per employee+period, matching
 *     the model's natural granularity — `EmployeeTarget` is already employeeProfileId+periodId
 *     scoped, so a duplicate check keyed on `employeeTargetId` alone is sufficient and correct).
 *   - Never auto-calculates `finalRating` from self/manager ratings — finalization is an explicit
 *     manager action that sets whatever rating the manager submits.
 *   - Writes ONLY `PerformanceReview` and `PerformanceAudit`. NEVER writes/updates
 *     `KRAAchievement`, `EmployeeTarget`, `KRAMetric`, `DailyActivityLog`/`DailyActivitySummary`.
 *   - NEVER touches the legacy `KRA`/`WeeklyReview` system (`src/lib/kra-engine.ts`) or Daily Updates.
 *
 * `PerformanceReview.comments` is a single `@db.Text` column (no separate selfRemarks/
 * managerRemarks columns exist, and this phase does not modify the schema) — so self vs. manager
 * remarks are stored as a small JSON document inside that one column (`ReviewCommentsDoc`),
 * tolerant of any pre-existing plain-text `comments` value written by the older generic engine.
 */
import prisma from "@/lib/prisma";
import { logPerformanceAudit } from "./audit";

// ── Status vocabulary ────────────────────────────────────────────────────────────
// Extends (does not replace) the existing generic engine's VALID_STATUSES (review.ts) with
// SELF_SUBMITTED — a JS-level validation list on a plain String column, not a schema/enum change.
export const REVIEW_STATUSES = ["DRAFT", "SELF_SUBMITTED", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_CREATION_MODES = ["CREATE_ONLY", "REOPEN_EXISTING"] as const;
export type ReviewCreationMode = (typeof REVIEW_CREATION_MODES)[number];

// ── comments-as-JSON helper (no schema change) ───────────────────────────────────

export type ReviewCommentsDoc = {
  selfRemarks?: string;
  managerRemarks?: string;
  /** Pre-existing plain-text comments from the generic engine, preserved verbatim if present. */
  legacy?: string;
};

/** Tolerant parse — a pre-existing plain-text `comments` value is preserved under `legacy`. */
export function parseReviewComments(raw: string | null | undefined): ReviewCommentsDoc {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as ReviewCommentsDoc;
  } catch { /* not JSON — treat as legacy plain text */ }
  return { legacy: raw };
}

export function buildReviewComments(existing: ReviewCommentsDoc, patch: Partial<ReviewCommentsDoc>): string {
  return JSON.stringify({ ...existing, ...patch });
}

// ── Achievement summary (read-only) ──────────────────────────────────────────────

export type ReviewAchievementRow = {
  achievementId: number;
  metricCode: string;
  metricName: string;
  actualValue: number;
  achievementPct: number;
  weightedScore: number;
  sourceReference: string;
};

export type ReviewAchievementSummary = {
  achievementCount: number;
  totalWeightedScore: number;
  achievements: ReviewAchievementRow[];
};

/** Read-only summary of an EmployeeTarget's CONVERTED KRAAchievement rows. Never writes. */
export async function calculateReviewSummaryFromAchievements(employeeTargetId: number): Promise<ReviewAchievementSummary> {
  try {
    const rows = await prisma.kRAAchievement.findMany({
      where: { employeeTargetId, status: "active" },
      include: { metric: { select: { code: true, name: true } } },
      orderBy: { calculatedAt: "desc" },
    });
    const achievements: ReviewAchievementRow[] = rows.map((r) => ({
      achievementId: r.id,
      metricCode: r.metric.code,
      metricName: r.metric.name,
      actualValue: r.actualValue,
      achievementPct: r.achievementPct,
      weightedScore: r.weightedScore,
      sourceReference: r.sourceReference,
    }));
    const totalWeightedScore = Math.round(achievements.reduce((s, a) => s + a.weightedScore, 0) * 10) / 10;
    return { achievementCount: achievements.length, totalWeightedScore, achievements };
  } catch {
    return { achievementCount: 0, totalWeightedScore: 0, achievements: [] };
  }
}

// ── Candidate resolution ──────────────────────────────────────────────────────────

export type ReviewCandidateStatus = "NO_TARGET" | "NO_CONVERTED_ACHIEVEMENTS" | "ALREADY_REVIEWED" | "READY";

export type ReviewCandidate = {
  employeeProfileId: number;
  employeeTargetId: number | null;
  employeeName: string;
  periodId: number | null;
  periodName: string;
  achievementCount: number;
  totalWeightedScore: number;
  existingReviewId: number | null;
  existingReviewStatus: string | null;
  candidateStatus: ReviewCandidateStatus;
};

/** Resolve the EmployeeTarget row a review would be created against. Defaults to the employee's
 *  most recent active target if no periodId is given. Never writes. */
async function resolveTargetRow(employeeProfileId: number, periodId?: number) {
  return prisma.employeeTarget.findFirst({
    where: { employeeProfileId, ...(periodId ? { periodId } : { status: "active" }) },
    include: { period: { select: { id: true, name: true } }, employeeProfile: { select: { employee: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Read-only candidacy check for ONE employee (+ optional periodId). Never throws, never writes. */
export async function getReviewCandidate(employeeProfileId: number, periodId?: number): Promise<ReviewCandidate> {
  try {
    const target = await resolveTargetRow(employeeProfileId, periodId);
    if (!target) {
      return {
        employeeProfileId, employeeTargetId: null, employeeName: `Profile #${employeeProfileId}`,
        periodId: null, periodName: "", achievementCount: 0, totalWeightedScore: 0,
        existingReviewId: null, existingReviewStatus: null, candidateStatus: "NO_TARGET",
      };
    }
    const summary = await calculateReviewSummaryFromAchievements(target.id);
    const existing = await findExistingPerformanceReview(target.id);
    const candidateStatus: ReviewCandidateStatus =
      summary.achievementCount === 0 ? "NO_CONVERTED_ACHIEVEMENTS" : existing ? "ALREADY_REVIEWED" : "READY";
    return {
      employeeProfileId,
      employeeTargetId: target.id,
      employeeName: target.employeeProfile?.employee?.name ?? `Profile #${employeeProfileId}`,
      periodId: target.periodId,
      periodName: target.period?.name ?? `Period #${target.periodId}`,
      achievementCount: summary.achievementCount,
      totalWeightedScore: summary.totalWeightedScore,
      existingReviewId: existing?.id ?? null,
      existingReviewStatus: existing?.status ?? null,
      candidateStatus,
    };
  } catch {
    return {
      employeeProfileId, employeeTargetId: null, employeeName: `Profile #${employeeProfileId}`,
      periodId: null, periodName: "", achievementCount: 0, totalWeightedScore: 0,
      existingReviewId: null, existingReviewStatus: null, candidateStatus: "NO_TARGET",
    };
  }
}

/** Read-only candidacy list, optionally scoped to a manager's direct reports. Never writes. */
export async function listReviewCandidates(filters?: { employeeProfileId?: number; reportingManagerId?: number }): Promise<ReviewCandidate[]> {
  try {
    const profiles = await prisma.employeeProfile.findMany({
      where: {
        employmentStatus: "ACTIVE",
        ...(filters?.employeeProfileId ? { id: filters.employeeProfileId } : {}),
        ...(filters?.reportingManagerId ? { reportingManagerId: filters.reportingManagerId } : {}),
      },
      select: { id: true },
    });
    return await Promise.all(profiles.map((p) => getReviewCandidate(p.id)));
  } catch {
    return [];
  }
}

/** Exact duplicate-prevention lookup — one PerformanceReview per EmployeeTarget (no DB unique
 *  constraint; enforced here in application code). */
export async function findExistingPerformanceReview(employeeTargetId: number) {
  return prisma.performanceReview.findFirst({ where: { employeeTargetId } });
}

// ── Review creation (explicit manager action only) ───────────────────────────────

export type ReviewCreationInput = {
  employeeProfileId: number;
  periodId?: number;
  remarks?: string;
  mode: ReviewCreationMode;
};

export function validateReviewCreationInput(input: Partial<ReviewCreationInput>): string | null {
  if (!input.employeeProfileId || Number.isNaN(Number(input.employeeProfileId))) return "employeeProfileId is required";
  if (input.mode && !(REVIEW_CREATION_MODES as readonly string[]).includes(input.mode)) {
    return `mode must be one of: ${REVIEW_CREATION_MODES.join(", ")}`;
  }
  return null;
}

export type ReviewCreationOutcome = "created" | "reopened" | "skipped";

export type ReviewCreationResult = {
  outcome: ReviewCreationOutcome;
  reason?: string;
  reviewId: number | null;
  employeeProfileId: number;
  employeeName: string;
  periodId: number | null;
  periodName: string;
  achievementCount: number;
  totalWeightedScore: number;
  status: string | null;
};

/**
 * Create (or, with explicit manager opt-in, reopen) a PerformanceReview from an EmployeeTarget's
 * CONVERTED KRAAchievement rows. CREATE_ONLY (default) skips if a review already exists for this
 * EmployeeTarget — REOPEN_EXISTING resets that SAME review back to DRAFT (never creates a second
 * row). Never converts/writes KRAAchievement; never touches EmployeeTarget/KRAMetric.
 */
export async function createPerformanceReviewFromAchievements(
  input: ReviewCreationInput,
  managerEmployeeId: number,
): Promise<ReviewCreationResult> {
  const validationError = validateReviewCreationInput(input);
  if (validationError) {
    return { outcome: "skipped", reason: validationError, reviewId: null, employeeProfileId: input.employeeProfileId, employeeName: "", periodId: null, periodName: "", achievementCount: 0, totalWeightedScore: 0, status: null };
  }

  const target = await resolveTargetRow(input.employeeProfileId, input.periodId);
  if (!target) {
    return { outcome: "skipped", reason: "No active EmployeeTarget found for this employee/period.", reviewId: null, employeeProfileId: input.employeeProfileId, employeeName: `Profile #${input.employeeProfileId}`, periodId: input.periodId ?? null, periodName: "", achievementCount: 0, totalWeightedScore: 0, status: null };
  }

  const employeeName = target.employeeProfile?.employee?.name ?? `Profile #${input.employeeProfileId}`;
  const periodName = target.period?.name ?? `Period #${target.periodId}`;
  const summary = await calculateReviewSummaryFromAchievements(target.id);

  if (summary.achievementCount === 0) {
    return { outcome: "skipped", reason: "No converted KRAAchievement rows exist for this employee/period yet — convert the preview first (Phase W10).", reviewId: null, employeeProfileId: input.employeeProfileId, employeeName, periodId: target.periodId, periodName, achievementCount: 0, totalWeightedScore: 0, status: null };
  }

  const existing = await findExistingPerformanceReview(target.id);

  if (existing) {
    if (input.mode !== "REOPEN_EXISTING") {
      return { outcome: "skipped", reason: `A PerformanceReview already exists for this employee/period (id=${existing.id}, status=${existing.status}). Use mode=REOPEN_EXISTING to reopen it.`, reviewId: existing.id, employeeProfileId: input.employeeProfileId, employeeName, periodId: target.periodId, periodName, achievementCount: summary.achievementCount, totalWeightedScore: summary.totalWeightedScore, status: existing.status };
    }
    const comments = buildReviewComments(parseReviewComments(existing.comments), {});
    const reopened = await prisma.performanceReview.update({
      where: { id: existing.id },
      data: { status: "DRAFT", comments },
    });
    await writePerformanceAuditForReview({
      action: "performance_review_reopened", employeeProfileId: input.employeeProfileId, reviewId: reopened.id,
      periodId: target.periodId, achievementCount: summary.achievementCount, totalWeightedScore: summary.totalWeightedScore,
      remarks: input.remarks ?? "", performedBy: managerEmployeeId,
    });
    return { outcome: "reopened", reviewId: reopened.id, employeeProfileId: input.employeeProfileId, employeeName, periodId: target.periodId, periodName, achievementCount: summary.achievementCount, totalWeightedScore: summary.totalWeightedScore, status: reopened.status };
  }

  const comments = buildReviewComments({}, { managerRemarks: input.remarks ?? "" });
  const created = await prisma.performanceReview.create({
    data: { employeeTargetId: target.id, reviewerId: managerEmployeeId, status: "DRAFT", comments },
  });
  await writePerformanceAuditForReview({
    action: "performance_review_created", employeeProfileId: input.employeeProfileId, reviewId: created.id,
    periodId: target.periodId, achievementCount: summary.achievementCount, totalWeightedScore: summary.totalWeightedScore,
    remarks: input.remarks ?? "", performedBy: managerEmployeeId,
  });
  return { outcome: "created", reviewId: created.id, employeeProfileId: input.employeeProfileId, employeeName, periodId: target.periodId, periodName, achievementCount: summary.achievementCount, totalWeightedScore: summary.totalWeightedScore, status: created.status };
}

// ── Self-review (employee, explicit) ─────────────────────────────────────────────

export type SelfReviewInput = { selfRating?: number; selfRemarks?: string };

export type ReviewActionResult =
  | { ok: true; review: { id: number; status: string; selfRating: number; managerRating: number; finalRating: number; comments: ReviewCommentsDoc } }
  | { ok: false; error: string };

/** Employee self-review submission. Only the review's own EmployeeProfile owner may call this;
 *  blocked once the review is finalized (APPROVED) unless a manager reopens it first. */
export async function submitSelfReview(reviewId: number, employeeAuthId: number, input: SelfReviewInput): Promise<ReviewActionResult> {
  const review = await prisma.performanceReview.findUnique({
    where: { id: reviewId },
    include: { employeeTarget: { include: { employeeProfile: { select: { userId: true } } } } },
  });
  if (!review) return { ok: false, error: "Review not found" };
  if (review.employeeTarget.employeeProfile.userId !== employeeAuthId) return { ok: false, error: "Forbidden — not your review" };
  if (review.status === "APPROVED") return { ok: false, error: "This review is finalized and cannot be edited unless a manager reopens it." };

  const existingComments = parseReviewComments(review.comments);
  const comments = buildReviewComments(existingComments, input.selfRemarks !== undefined ? { selfRemarks: input.selfRemarks } : {});
  const nextStatus = review.status === "DRAFT" ? "SELF_SUBMITTED" : review.status;

  const updated = await prisma.performanceReview.update({
    where: { id: reviewId },
    data: { ...(input.selfRating !== undefined ? { selfRating: input.selfRating } : {}), comments, status: nextStatus },
  });

  await writePerformanceAuditForReview({
    action: "performance_review_self_submitted", employeeProfileId: null, reviewId,
    periodId: null, achievementCount: null, totalWeightedScore: null,
    remarks: input.selfRemarks ?? "", performedBy: employeeAuthId,
  });

  return { ok: true, review: { id: updated.id, status: updated.status, selfRating: updated.selfRating, managerRating: updated.managerRating, finalRating: updated.finalRating, comments: parseReviewComments(updated.comments) } };
}

// ── Manager rating / finalization (manager, explicit) ────────────────────────────

export type ManagerReviewInput = { managerRating?: number; managerRemarks?: string; status?: ReviewStatus; finalRating?: number };

/** Manager rating/finalization. `finalRating` is NEVER auto-derived — only written if the manager
 *  explicitly submits one. Setting `status: "APPROVED"` is treated as finalization for audit
 *  purposes (a distinct action code); any other status change is a plain manager-review update. */
export async function submitManagerReview(reviewId: number, managerEmployeeId: number, input: ManagerReviewInput): Promise<ReviewActionResult> {
  const review = await prisma.performanceReview.findUnique({ where: { id: reviewId } });
  if (!review) return { ok: false, error: "Review not found" };

  if (input.status && !(REVIEW_STATUSES as readonly string[]).includes(input.status)) {
    return { ok: false, error: `status must be one of: ${REVIEW_STATUSES.join(", ")}` };
  }

  const existingComments = parseReviewComments(review.comments);
  const comments = buildReviewComments(existingComments, input.managerRemarks !== undefined ? { managerRemarks: input.managerRemarks } : {});
  const isFinalizing = input.status === "APPROVED";

  const updated = await prisma.performanceReview.update({
    where: { id: reviewId },
    data: {
      ...(input.managerRating !== undefined ? { managerRating: input.managerRating } : {}),
      ...(input.finalRating !== undefined ? { finalRating: input.finalRating } : {}),
      ...(input.status ? { status: input.status } : {}),
      comments,
    },
  });

  await writePerformanceAuditForReview({
    action: isFinalizing ? "performance_review_finalized" : "performance_review_manager_submitted",
    employeeProfileId: null, reviewId, periodId: null, achievementCount: null, totalWeightedScore: null,
    remarks: input.managerRemarks ?? "", performedBy: managerEmployeeId,
  });

  return { ok: true, review: { id: updated.id, status: updated.status, selfRating: updated.selfRating, managerRating: updated.managerRating, finalRating: updated.finalRating, comments: parseReviewComments(updated.comments) } };
}

// ── Audit ─────────────────────────────────────────────────────────────────────────

export type ReviewAuditAction =
  | "performance_review_created"
  | "performance_review_reopened"
  | "performance_review_self_submitted"
  | "performance_review_manager_submitted"
  | "performance_review_finalized";

/** Writes ONE PerformanceAudit row for a review lifecycle event. Never blocks/throws. */
export async function writePerformanceAuditForReview(input: {
  action: ReviewAuditAction;
  employeeProfileId: number | null;
  reviewId: number;
  periodId: number | null;
  achievementCount: number | null;
  totalWeightedScore: number | null;
  remarks: string;
  performedBy: number;
}) {
  return logPerformanceAudit({
    entityType: "performance_review",
    entityId: input.reviewId,
    action: input.action,
    newValue: JSON.stringify({
      employeeProfileId: input.employeeProfileId,
      reviewId: input.reviewId,
      periodId: input.periodId,
      achievementCount: input.achievementCount,
      totalWeightedScore: input.totalWeightedScore,
      remarksSummary: (input.remarks || "").slice(0, 300),
    }),
    performedBy: input.performedBy,
  });
}
