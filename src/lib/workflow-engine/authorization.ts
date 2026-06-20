/**
 * Workflow Engine — Approval Action Authorization
 *
 * Centralizes the "is this actor allowed to act on this specific approval
 * request right now" decision so every action (APPROVE/REJECT/RETURN/
 * DELEGATE/CANCEL) — and every current and future call site — enforces the
 * same object-level rule. Without this, any authenticated employee who
 * knows/guesses a requestId could act on someone else's approval.
 *
 * Eligibility for APPROVE/REJECT/RETURN/DELEGATE is: the request is still
 * PENDING, and the actor is either (a) one of resolveApprovers()'s results
 * for the CURRENT step, (b) the active delegate for one of those approvers,
 * or (c) explicitly granted the Workflow/ApprovalRequest/APPROVE permission
 * via access-control (a deliberate per-employee grant, not an isManager
 * blanket bypass — hasPermission() here checks real UserRole/RolePermission
 * rows only).
 *
 * CANCEL is intentionally narrower: only the original requester, and only
 * while the request is still PENDING. The engine has no existing
 * manager/admin override for cancellation, so none is added here — see
 * docs/RBAC_AUDIT_REPORT.md for this documented limitation.
 */

import { resolveApprovers } from "./resolver";
import { getActiveDelegate } from "./delegation";
import { hasPermission } from "@/lib/access-control";

export type ApprovalActionType = "APPROVE" | "REJECT" | "RETURN" | "DELEGATE" | "CANCEL";

export type ApprovalDenialReason = "NOT_FOUND" | "NOT_PENDING" | "NOT_ELIGIBLE";

export interface ApprovalAuthorizationResult {
  allowed: boolean;
  reason?: ApprovalDenialReason;
}

/**
 * Existing permission, reused as the "explicit workflow admin" override
 * called for in the authorization matrix. No dedicated CANCEL permission
 * exists in the catalogue, so the admin override is scoped to
 * APPROVE/REJECT/RETURN/DELEGATE only (see module docstring for CANCEL).
 */
const WORKFLOW_ADMIN_PERMISSION = {
  module:   "Workflow",
  resource: "ApprovalRequest",
  action:   "APPROVE",
} as const;

async function _loadRequestContext(requestId: number): Promise<Record<string, unknown> | null> {
  const prisma = (await import("@/lib/prisma")).default;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;
  return db.approvalRequest.findUnique({
    where:   { id: requestId },
    include: { workflow: { include: { steps: { orderBy: { stepNumber: "asc" } } } } },
  }) as Promise<Record<string, unknown> | null>;
}

function _currentStep(req: Record<string, unknown>): Record<string, unknown> | null {
  const workflow = req.workflow as Record<string, unknown> | null;
  const steps    = (workflow?.steps as Array<Record<string, unknown>>) ?? [];
  return steps.find((s) => (s.stepNumber as number) === (req.currentStep as number)) ?? null;
}

/**
 * Is actorId one of the resolved approvers for the request's CURRENT step,
 * or the active delegate for one of those approvers? Past-step and
 * future-step approvers are excluded by construction — only the current
 * step is ever resolved.
 */
async function _isEligibleApproverOrDelegate(
  req:     Record<string, unknown>,
  actorId: number,
): Promise<boolean> {
  const step = _currentStep(req);
  if (!step) return false;

  const workflow  = req.workflow as Record<string, unknown>;
  const approvers = await resolveApprovers(
    {
      approvalType:   step.approvalType   as string,
      approverId:     step.approverId     as number | null,
      approverRoleId: step.approverRoleId as number | null,
    },
    req.requestedBy as number,
  );

  if (approvers.some((a) => a.userId === actorId)) return true;

  // Delegation: actorId may be the active delegate FOR one of the resolved
  // approvers (the approver is away and routed their approvals to actorId).
  const moduleCode = workflow.module as string | undefined;
  for (const approver of approvers) {
    const delegate = await getActiveDelegate(approver.userId, moduleCode);
    if (delegate === actorId) return true;
  }
  return false;
}

async function _hasWorkflowAdminOverride(actorId: number): Promise<boolean> {
  try {
    return await hasPermission(
      actorId,
      WORKFLOW_ADMIN_PERMISSION.module,
      WORKFLOW_ADMIN_PERMISSION.resource,
      WORKFLOW_ADMIN_PERMISSION.action,
    );
  } catch {
    return false;
  }
}

/**
 * Central authorization check for every approval action. Must be called —
 * and must return `allowed: true` — before any mutation (ApprovalAction
 * creation, status change, step advancement, cancellation, or "success"
 * audit logging).
 */
export async function assertCanActOnApprovalRequest(
  requestId: number,
  actorId:   number,
  action:    ApprovalActionType,
): Promise<ApprovalAuthorizationResult> {
  const req = await _loadRequestContext(requestId);
  if (!req) return { allowed: false, reason: "NOT_FOUND" };

  if (action === "CANCEL") {
    if ((req.status as string) !== "PENDING") return { allowed: false, reason: "NOT_PENDING" };
    if ((req.requestedBy as number) === actorId) return { allowed: true };
    return { allowed: false, reason: "NOT_ELIGIBLE" };
  }

  // APPROVE / REJECT / RETURN / DELEGATE
  if ((req.status as string) !== "PENDING") return { allowed: false, reason: "NOT_PENDING" };

  if (await _isEligibleApproverOrDelegate(req, actorId)) return { allowed: true };
  if (await _hasWorkflowAdminOverride(actorId)) return { allowed: true };

  return { allowed: false, reason: "NOT_ELIGIBLE" };
}
