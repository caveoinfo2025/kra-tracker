/**
 * Workflow Engine — Audit Trail
 *
 * Records every lifecycle event: created, assigned, approved, rejected,
 * escalated, delegated, returned, cancelled, completed.
 */

export type WorkflowAuditAction =
  | "CREATED" | "ASSIGNED" | "APPROVED" | "REJECTED"
  | "ESCALATED" | "DELEGATED" | "RETURNED" | "CANCELLED" | "COMPLETED"
  | "STEP_ADVANCED" | "DEFINITION_UPDATED";

export interface WorkflowAuditEntry {
  id:         number;
  entityType: "WORKFLOW_DEFINITION" | "APPROVAL_REQUEST";
  entityId:   number;
  action:     WorkflowAuditAction;
  actorId:    number;
  actorName?: string;
  details?:   string;
  createdAt:  string;
}

/** Write an audit entry; silently no-ops if DB unavailable (pre-migration). */
export async function logWorkflowEvent(
  entityType: "WORKFLOW_DEFINITION" | "APPROVAL_REQUEST",
  entityId:   number,
  action:     WorkflowAuditAction,
  actorId:    number,
  details?:   Record<string, unknown>,
): Promise<void> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).workflowAuditLog.create({
      data: {
        entityType,
        entityId,
        action,
        actorId,
        details: details ? JSON.stringify(details) : null,
      },
    });
  } catch {
    // Pre-migration or DB error — silently absorb
  }
}

/** Fetch audit log for an entity (approval request or workflow definition). */
export async function getWorkflowAudit(
  entityType: "WORKFLOW_DEFINITION" | "APPROVAL_REQUEST",
  entityId:   number,
): Promise<WorkflowAuditEntry[]> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (prisma as any).workflowAuditLog.findMany({
      where:   { entityType, entityId },
      orderBy: { createdAt: "desc" },
      take:    100,
      include: { actor: { select: { name: true } } },
    }) as Array<Record<string, any>>;

    return rows.map((r) => ({
      id:         r.id          as number,
      entityType: r.entityType  as "WORKFLOW_DEFINITION" | "APPROVAL_REQUEST",
      entityId:   r.entityId    as number,
      action:     r.action      as WorkflowAuditAction,
      actorId:    r.actorId     as number,
      actorName:  (r.actor as { name: string } | null)?.name,
      details:    r.details     as string | undefined,
      createdAt:  new Date(r.createdAt).toISOString(),
    }));
  } catch {
    return [];
  }
}

/** Fetch a paginated global audit log for the admin UI. */
export async function listWorkflowAuditLog(opts?: {
  entityType?: "WORKFLOW_DEFINITION" | "APPROVAL_REQUEST";
  action?: string;
  take?: number;
}): Promise<WorkflowAuditEntry[]> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (prisma as any).workflowAuditLog.findMany({
      where:   {
        ...(opts?.entityType ? { entityType: opts.entityType } : {}),
        ...(opts?.action     ? { action:     opts.action     } : {}),
      },
      orderBy: { createdAt: "desc" },
      take:    opts?.take ?? 200,
      include: { actor: { select: { name: true } } },
    }) as Array<Record<string, any>>;

    return rows.map((r) => ({
      id:         r.id          as number,
      entityType: r.entityType  as "WORKFLOW_DEFINITION" | "APPROVAL_REQUEST",
      entityId:   r.entityId    as number,
      action:     r.action      as WorkflowAuditAction,
      actorId:    r.actorId     as number,
      actorName:  (r.actor as { name: string } | null)?.name,
      details:    r.details     as string | undefined,
      createdAt:  new Date(r.createdAt).toISOString(),
    }));
  } catch {
    return [];
  }
}
