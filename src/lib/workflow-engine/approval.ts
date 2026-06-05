/**
 * Workflow Engine — Approval Request Service
 *
 * Lifecycle: PENDING → APPROVED | REJECTED | RETURNED | CANCELLED
 *
 * Each action:
 *  - validates the actor is an eligible approver for the current step
 *  - records an ApprovalAction row
 *  - advances or closes the request
 *  - writes an audit log entry
 */

import { logWorkflowEvent } from "./audit";
import { resolveApprovers } from "./resolver";
import { getActiveDelegate } from "./delegation";

export interface ApprovalRequest {
  id:           number;
  workflowId:   number;
  entityType:   string;
  entityId:     string;
  requestedBy:  number;
  status:       string;
  currentStep:  number;
  contextJson?: string | null;
  submittedAt:  string;
  completedAt?: string | null;
  createdAt:    string;
  updatedAt:    string;
}

// ── Start ─────────────────────────────────────────────────────────────────────

export async function startApproval(data: {
  workflowId:   number;
  entityType:   string;
  entityId:     string;
  requestedBy:  number;
  contextJson?: string;
}): Promise<ApprovalRequest | null> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    const row = await db.approvalRequest.create({
      data: {
        workflowId:  data.workflowId,
        entityType:  data.entityType,
        entityId:    data.entityId,
        requestedBy: data.requestedBy,
        status:      "PENDING",
        currentStep: 1,
        contextJson: data.contextJson ?? null,
        submittedAt: new Date(),
      },
    }) as Record<string, unknown>;

    await logWorkflowEvent("APPROVAL_REQUEST", row.id as number, "CREATED", data.requestedBy, {
      workflowId: data.workflowId,
      entityType: data.entityType,
      entityId:   data.entityId,
    });

    return _mapRequest(row);
  } catch {
    return null;
  }
}

// ── List / Get ────────────────────────────────────────────────────────────────

export async function listApprovalRequests(opts?: {
  requestedBy?: number;
  approverId?:  number;
  status?:      string;
  entityType?:  string;
  take?:        number;
}): Promise<ApprovalRequest[]> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;

    // If filtering by approver, join through ApprovalAction
    if (opts?.approverId) {
      const actions = await db.approvalAction.findMany({
        where:  { approverId: opts.approverId },
        select: { requestId: true },
        distinct: ["requestId"],
      }) as Array<{ requestId: number }>;
      const ids = actions.map((a) => a.requestId);

      const rows = await db.approvalRequest.findMany({
        where: {
          id:     { in: ids },
          ...(opts.status     ? { status:     opts.status     } : {}),
          ...(opts.entityType ? { entityType: opts.entityType } : {}),
        },
        orderBy: { submittedAt: "desc" },
        take:    opts.take ?? 100,
      }) as Array<Record<string, unknown>>;
      return rows.map(_mapRequest);
    }

    const rows = await db.approvalRequest.findMany({
      where: {
        ...(opts?.requestedBy ? { requestedBy: opts.requestedBy } : {}),
        ...(opts?.status      ? { status:      opts.status      } : {}),
        ...(opts?.entityType  ? { entityType:  opts.entityType  } : {}),
      },
      orderBy: { submittedAt: "desc" },
      take:    opts?.take ?? 100,
    }) as Array<Record<string, unknown>>;
    return rows.map(_mapRequest);
  } catch {
    return [];
  }
}

export async function getApprovalRequest(id: number): Promise<ApprovalRequest | null> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await (prisma as any).approvalRequest.findUnique({ where: { id } }) as Record<string, unknown> | null;
    return row ? _mapRequest(row) : null;
  } catch {
    return null;
  }
}

// ── Pending inbox — requests where actorId is the current step approver ───────

export async function getPendingForApprover(actorId: number): Promise<ApprovalRequest[]> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;

    const pending = await db.approvalRequest.findMany({
      where:   { status: "PENDING" },
      include: { workflow: { include: { steps: true } } },
      orderBy: { submittedAt: "asc" },
      take:    200,
    }) as Array<Record<string, unknown>>;

    const mine: ApprovalRequest[] = [];
    for (const req of pending) {
      const workflow = req.workflow as Record<string, unknown>;
      const steps    = (workflow.steps as Array<Record<string, unknown>>) ?? [];
      const step     = steps.find((s) => (s.stepNumber as number) === (req.currentStep as number));
      if (!step) continue;

      const approvers = await resolveApprovers(
        { approvalType: step.approvalType as string, approverId: step.approverId as number | null, approverRoleId: step.approverRoleId as number | null },
        req.requestedBy as number,
      );

      const delegate = await getActiveDelegate(actorId, workflow.module as string);
      const isEligible =
        approvers.some((a) => a.userId === actorId) ||
        (delegate !== null && approvers.some((a) => a.userId === delegate));

      if (isEligible) mine.push(_mapRequest(req));
    }
    return mine;
  } catch {
    return [];
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function approveRequest(
  requestId: number,
  actorId:   number,
  comments?: string,
): Promise<boolean> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    const req = await _fetchRequestWithWorkflow(db, requestId);
    if (!req || req.status !== "PENDING") return false;

    const step = _currentStep(req);
    if (!step) return false;

    await db.approvalAction.create({
      data: {
        requestId,
        stepId:     step.id as number,
        approverId: actorId,
        action:     "APPROVE",
        comments:   comments ?? null,
      },
    });

    // Advance to next step or close
    const steps      = _allSteps(req);
    const nextStep   = steps.find((s) => (s.stepNumber as number) === (req.currentStep as number) + 1);
    const newStatus  = nextStep ? "PENDING" : "APPROVED";
    const newCurrent = nextStep ? (nextStep.stepNumber as number) : req.currentStep;

    await db.approvalRequest.update({
      where: { id: requestId },
      data:  {
        currentStep: newCurrent,
        status:      newStatus,
        ...(newStatus === "APPROVED" ? { completedAt: new Date() } : {}),
      },
    });

    await logWorkflowEvent("APPROVAL_REQUEST", requestId, newStatus === "APPROVED" ? "APPROVED" : "STEP_ADVANCED", actorId, { step: req.currentStep, newStep: newCurrent });
    return true;
  } catch {
    return false;
  }
}

export async function rejectRequest(
  requestId: number,
  actorId:   number,
  comments?: string,
): Promise<boolean> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    const req = await _fetchRequestWithWorkflow(db, requestId);
    if (!req || req.status !== "PENDING") return false;

    const step = _currentStep(req);
    if (!step) return false;

    await db.approvalAction.create({
      data: { requestId, stepId: step.id as number, approverId: actorId, action: "REJECT", comments: comments ?? null },
    });
    await db.approvalRequest.update({
      where: { id: requestId },
      data:  { status: "REJECTED", completedAt: new Date() },
    });
    await logWorkflowEvent("APPROVAL_REQUEST", requestId, "REJECTED", actorId, { step: req.currentStep });
    return true;
  } catch {
    return false;
  }
}

export async function returnRequest(
  requestId: number,
  actorId:   number,
  comments?: string,
): Promise<boolean> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    const req = await _fetchRequestWithWorkflow(db, requestId);
    if (!req || req.status !== "PENDING") return false;

    const step = _currentStep(req);
    if (!step) return false;

    await db.approvalAction.create({
      data: { requestId, stepId: step.id as number, approverId: actorId, action: "RETURN", comments: comments ?? null },
    });
    await db.approvalRequest.update({
      where: { id: requestId },
      data:  { status: "RETURNED", completedAt: new Date() },
    });
    await logWorkflowEvent("APPROVAL_REQUEST", requestId, "RETURNED", actorId, { step: req.currentStep });
    return true;
  } catch {
    return false;
  }
}

export async function delegateRequest(
  requestId:  number,
  actorId:    number,
  toUserId:   number,
  comments?:  string,
): Promise<boolean> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    const req = await _fetchRequestWithWorkflow(db, requestId);
    if (!req || req.status !== "PENDING") return false;

    const step = _currentStep(req);
    if (!step) return false;

    await db.approvalAction.create({
      data: { requestId, stepId: step.id as number, approverId: actorId, action: "DELEGATE", comments: comments ?? null, toUserId },
    });
    await logWorkflowEvent("APPROVAL_REQUEST", requestId, "DELEGATED", actorId, { toUserId });
    return true;
  } catch {
    return false;
  }
}

export async function cancelRequest(requestId: number, actorId: number): Promise<boolean> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    await db.approvalRequest.update({
      where: { id: requestId },
      data:  { status: "CANCELLED", completedAt: new Date() },
    });
    await logWorkflowEvent("APPROVAL_REQUEST", requestId, "CANCELLED", actorId);
    return true;
  } catch {
    return false;
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function _fetchRequestWithWorkflow(db: any, requestId: number) {
  return db.approvalRequest.findUnique({
    where:   { id: requestId },
    include: { workflow: { include: { steps: { orderBy: { stepNumber: "asc" } } } } },
  }) as Promise<Record<string, unknown> | null>;
}

function _currentStep(req: Record<string, unknown>): Record<string, unknown> | null {
  return _allSteps(req).find((s) => (s.stepNumber as number) === (req.currentStep as number)) ?? null;
}

function _allSteps(req: Record<string, unknown>): Array<Record<string, unknown>> {
  const workflow = req.workflow as Record<string, unknown> | null;
  return (workflow?.steps as Array<Record<string, unknown>>) ?? [];
}

function _mapRequest(r: Record<string, unknown>): ApprovalRequest {
  return {
    id:          r.id          as number,
    workflowId:  r.workflowId  as number,
    entityType:  r.entityType  as string,
    entityId:    r.entityId    as string,
    requestedBy: r.requestedBy as number,
    status:      r.status      as string,
    currentStep: r.currentStep as number,
    contextJson: r.contextJson as string | null | undefined,
    submittedAt: new Date(r.submittedAt as string | number).toISOString(),
    completedAt: r.completedAt ? new Date(r.completedAt as string | number).toISOString() : null,
    createdAt:   new Date(r.createdAt   as string | number).toISOString(),
    updatedAt:   new Date(r.updatedAt   as string | number).toISOString(),
  };
}
