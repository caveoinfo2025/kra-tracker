/**
 * Workflow Engine — Workflow Definition Service
 *
 * CRUD for WorkflowDefinition + WorkflowStep records.
 * All DB calls are pre-migration safe (silently return safe defaults on error).
 */

import { logWorkflowEvent } from "./audit";

export interface WorkflowStep {
  id:              number;
  workflowId:      number;
  stepNumber:      number;
  stepName:        string;
  approvalType:    string;
  approverId?:     number | null;
  approverRoleId?: number | null;
  approvalMode:    string;
  isMandatory:     boolean;
  timeoutHours:    number;
  requireComments: boolean;
}

export interface WorkflowDefinition {
  id:            number;
  name:          string;
  code:          string;
  description:   string;
  module:        string;
  triggerEvent:  string;
  status:        string;
  conditionJson?: string | null;
  version:       number;
  createdBy:     number;
  createdAt:     string;
  updatedAt:     string;
  steps?:        WorkflowStep[];
}

export async function listWorkflows(opts?: {
  module?:  string;
  status?:  string;
  take?:    number;
}): Promise<WorkflowDefinition[]> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (prisma as any).workflowDefinition.findMany({
      where: {
        ...(opts?.module ? { module: opts.module } : {}),
        ...(opts?.status ? { status: opts.status } : {}),
      },
      include:  { steps: { orderBy: { stepNumber: "asc" } } },
      orderBy:  { updatedAt: "desc" },
      take:     opts?.take ?? 100,
    }) as Array<Record<string, unknown>>;
    return rows.map(_mapWorkflow);
  } catch {
    return [];
  }
}

export async function getWorkflow(id: number): Promise<WorkflowDefinition | null> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await (prisma as any).workflowDefinition.findUnique({
      where:   { id },
      include: { steps: { orderBy: { stepNumber: "asc" } } },
    }) as Record<string, unknown> | null;
    return row ? _mapWorkflow(row) : null;
  } catch {
    return null;
  }
}

export async function getWorkflowByCode(code: string): Promise<WorkflowDefinition | null> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await (prisma as any).workflowDefinition.findFirst({
      where:   { code, status: "ACTIVE" },
      include: { steps: { orderBy: { stepNumber: "asc" } } },
    }) as Record<string, unknown> | null;
    return row ? _mapWorkflow(row) : null;
  } catch {
    return null;
  }
}

export async function createWorkflow(data: {
  name:          string;
  code:          string;
  description?:  string;
  module:        string;
  triggerEvent:  string;
  conditionJson?: string;
  createdBy:     number;
  steps?:        Omit<WorkflowStep, "id" | "workflowId">[];
}): Promise<WorkflowDefinition | null> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    const row = await db.workflowDefinition.create({
      data: {
        name:          data.name,
        code:          data.code,
        description:   data.description ?? "",
        module:        data.module,
        triggerEvent:  data.triggerEvent,
        conditionJson: data.conditionJson ?? null,
        status:        "DRAFT",
        version:       1,
        createdBy:     data.createdBy,
        ...(data.steps?.length
          ? { steps: { create: data.steps.map(_stepInput) } }
          : {}),
      },
      include: { steps: { orderBy: { stepNumber: "asc" } } },
    }) as Record<string, unknown>;

    await logWorkflowEvent("WORKFLOW_DEFINITION", row.id as number, "CREATED", data.createdBy);
    return _mapWorkflow(row);
  } catch {
    return null;
  }
}

export async function updateWorkflow(
  id:      number,
  actorId: number,
  data: {
    name?:         string;
    description?:  string;
    triggerEvent?: string;
    conditionJson?: string;
    status?:       string;
    steps?:        Omit<WorkflowStep, "id" | "workflowId">[];
  },
): Promise<WorkflowDefinition | null> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;

    // Replace steps if provided: delete old, create new
    if (data.steps !== undefined) {
      await db.workflowStep.deleteMany({ where: { workflowId: id } });
      if (data.steps.length) {
        await db.workflowStep.createMany({
          data: data.steps.map((s) => ({ ...(_stepInput(s)), workflowId: id })),
        });
      }
    }

    const row = await db.workflowDefinition.update({
      where: { id },
      data: {
        ...(data.name         !== undefined ? { name:          data.name         } : {}),
        ...(data.description  !== undefined ? { description:   data.description  } : {}),
        ...(data.triggerEvent !== undefined ? { triggerEvent:  data.triggerEvent } : {}),
        ...(data.conditionJson !== undefined ? { conditionJson: data.conditionJson } : {}),
        ...(data.status       !== undefined ? { status:        data.status       } : {}),
        version: { increment: 1 },
      },
      include: { steps: { orderBy: { stepNumber: "asc" } } },
    }) as Record<string, unknown>;

    await logWorkflowEvent("WORKFLOW_DEFINITION", id, "DEFINITION_UPDATED", actorId, { newStatus: data.status });
    return _mapWorkflow(row);
  } catch {
    return null;
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function _stepInput(s: Omit<WorkflowStep, "id" | "workflowId">) {
  return {
    stepNumber:      s.stepNumber,
    stepName:        s.stepName,
    approvalType:    s.approvalType,
    approverId:      s.approverId      ?? null,
    approverRoleId:  s.approverRoleId  ?? null,
    approvalMode:    s.approvalMode,
    isMandatory:     s.isMandatory,
    timeoutHours:    s.timeoutHours,
    requireComments: s.requireComments,
  };
}

function _mapStep(r: Record<string, unknown>): WorkflowStep {
  return {
    id:              r.id              as number,
    workflowId:      r.workflowId      as number,
    stepNumber:      r.stepNumber      as number,
    stepName:        r.stepName        as string,
    approvalType:    r.approvalType    as string,
    approverId:      r.approverId      as number | null | undefined,
    approverRoleId:  r.approverRoleId  as number | null | undefined,
    approvalMode:    r.approvalMode    as string,
    isMandatory:     Boolean(r.isMandatory),
    timeoutHours:    r.timeoutHours    as number,
    requireComments: Boolean(r.requireComments),
  };
}

function _mapWorkflow(r: Record<string, unknown>): WorkflowDefinition {
  const steps = (r.steps as Array<Record<string, unknown>> | undefined)?.map(_mapStep);
  return {
    id:            r.id           as number,
    name:          r.name         as string,
    code:          r.code         as string,
    description:   r.description  as string,
    module:        r.module       as string,
    triggerEvent:  r.triggerEvent as string,
    status:        r.status       as string,
    conditionJson: r.conditionJson as string | null | undefined,
    version:       r.version      as number,
    createdBy:     r.createdBy    as number,
    createdAt:     new Date(r.createdAt as string | number).toISOString(),
    updatedAt:     new Date(r.updatedAt as string | number).toISOString(),
    steps,
  };
}
