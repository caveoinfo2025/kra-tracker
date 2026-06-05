/**
 * Workflow Engine — Escalation Service
 *
 * Manages escalation rules per workflow/step. A cron job (or background check)
 * calls checkAndTriggerEscalations() to fire overdue reminders or auto-actions.
 */

export interface EscalationRule {
  id:          number;
  workflowId:  number;
  stepId?:     number | null;
  afterHours:  number;
  escalateTo?: number | null;
  action:      string;
  repeatEvery?: number | null;
  maxTriggers: number;
  isActive:    boolean;
}

export async function getEscalationRules(workflowId: number): Promise<EscalationRule[]> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (prisma as any).escalationRule.findMany({
      where:   { workflowId, isActive: true },
      orderBy: { afterHours: "asc" },
    }) as Array<Record<string, unknown>>;
    return rows.map(_mapRule);
  } catch {
    return [];
  }
}

export async function createEscalationRule(data: {
  workflowId:  number;
  stepId?:     number;
  afterHours:  number;
  escalateTo?: number;
  action:      string;
  repeatEvery?: number;
  maxTriggers?: number;
}): Promise<EscalationRule | null> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await (prisma as any).escalationRule.create({
      data: {
        workflowId:  data.workflowId,
        stepId:      data.stepId    ?? null,
        afterHours:  data.afterHours,
        escalateTo:  data.escalateTo ?? null,
        action:      data.action,
        repeatEvery: data.repeatEvery ?? null,
        maxTriggers: data.maxTriggers ?? 3,
        isActive:    true,
      },
    }) as Record<string, unknown>;
    return _mapRule(row);
  } catch {
    return null;
  }
}

/**
 * Scans PENDING approval requests and fires escalation actions for those that
 * have exceeded their step timeout. Called from a scheduled job or API endpoint.
 */
export async function checkAndTriggerEscalations(): Promise<number> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;

    const pendingRequests = await db.approvalRequest.findMany({
      where:   { status: "PENDING" },
      include: { workflow: { include: { steps: true, escalationRules: true } } },
    }) as Array<Record<string, unknown>>;

    let triggered = 0;
    const now = Date.now();

    for (const req of pendingRequests) {
      const workflow = req.workflow as Record<string, unknown>;
      const rules    = (workflow.escalationRules as Array<Record<string, unknown>>) ?? [];
      const stepNum  = req.currentStep as number;
      const steps    = (workflow.steps as Array<Record<string, unknown>>) ?? [];
      const step     = steps.find((s) => (s.stepNumber as number) === stepNum);

      for (const rule of rules) {
        if (!(rule.isActive as boolean)) continue;
        const afterMs   = (rule.afterHours as number) * 3_600_000;
        const submitted = new Date(req.submittedAt as string).getTime();
        if (now - submitted < afterMs) continue;

        await _executeEscalationAction(req.id as number, rule, db);
        triggered++;
      }

      // Auto-escalate if step timeout exceeded
      if (step) {
        const timeoutMs  = (step.timeoutHours as number) * 3_600_000;
        const submitted  = new Date(req.submittedAt as string).getTime();
        if (now - submitted > timeoutMs) {
          const { logWorkflowEvent } = await import("./audit");
          await logWorkflowEvent("APPROVAL_REQUEST", req.id as number, "ESCALATED", 0, {
            reason: "Step timeout exceeded",
            step:   stepNum,
          });
          triggered++;
        }
      }
    }

    return triggered;
  } catch {
    return 0;
  }
}

async function _executeEscalationAction(
  requestId: number,
  rule:       Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db:         any,
): Promise<void> {
  const action = rule.action as string;

  if (action === "REMIND" || action === "ESCALATE") {
    const { logWorkflowEvent } = await import("./audit");
    await logWorkflowEvent("APPROVAL_REQUEST", requestId, "ESCALATED", 0, {
      action,
      escalateTo: rule.escalateTo,
    });
  } else if (action === "AUTO_APPROVE") {
    await db.approvalRequest.update({
      where: { id: requestId },
      data:  { status: "APPROVED", completedAt: new Date() },
    });
    const { logWorkflowEvent } = await import("./audit");
    await logWorkflowEvent("APPROVAL_REQUEST", requestId, "APPROVED", 0, { reason: "Auto-approved by escalation rule" });
  } else if (action === "AUTO_REJECT") {
    await db.approvalRequest.update({
      where: { id: requestId },
      data:  { status: "REJECTED", completedAt: new Date() },
    });
    const { logWorkflowEvent } = await import("./audit");
    await logWorkflowEvent("APPROVAL_REQUEST", requestId, "REJECTED", 0, { reason: "Auto-rejected by escalation rule" });
  }
}

function _mapRule(r: Record<string, unknown>): EscalationRule {
  return {
    id:          r.id          as number,
    workflowId:  r.workflowId  as number,
    stepId:      r.stepId      as number | null | undefined,
    afterHours:  r.afterHours  as number,
    escalateTo:  r.escalateTo  as number | null | undefined,
    action:      r.action      as string,
    repeatEvery: r.repeatEvery as number | null | undefined,
    maxTriggers: r.maxTriggers as number,
    isActive:    Boolean(r.isActive),
  };
}
