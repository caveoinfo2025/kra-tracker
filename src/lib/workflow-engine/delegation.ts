/**
 * Workflow Engine — Delegation Service
 *
 * Manages delegation rules: when user A is away, approvals are routed to user B
 * for a given module and date range.
 */

export interface DelegationRule {
  id:        number;
  fromUser:  number;
  toUser:    number;
  module?:   string | null;
  startDate: string;
  endDate:   string;
  status:    string;
  reason?:   string | null;
  createdAt: string;
}

/** Returns the delegate for a user right now (or null if none). */
export async function getActiveDelegate(
  userId: number,
  module?: string,
): Promise<number | null> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    const now = new Date();
    const rule = await db.delegationRule.findFirst({
      where: {
        fromUser:  userId,
        status:    "ACTIVE",
        startDate: { lte: now },
        endDate:   { gte: now },
        ...(module ? { OR: [{ module }, { module: null }] } : {}),
      },
      orderBy: { startDate: "desc" },
    }) as { toUser: number } | null;
    return rule?.toUser ?? null;
  } catch {
    return null;
  }
}

export async function createDelegation(data: {
  fromUser:  number;
  toUser:    number;
  module?:   string;
  startDate: Date;
  endDate:   Date;
  reason?:   string;
  createdBy: number;
}): Promise<DelegationRule | null> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    const row = await db.delegationRule.create({
      data: {
        fromUser:  data.fromUser,
        toUser:    data.toUser,
        module:    data.module ?? null,
        startDate: data.startDate,
        endDate:   data.endDate,
        reason:    data.reason ?? null,
        status:    "ACTIVE",
      },
    }) as Record<string, unknown>;

    const { logWorkflowEvent } = await import("./audit");
    await logWorkflowEvent(
      "WORKFLOW_DEFINITION",
      row.id as number,
      "DELEGATED",
      data.createdBy,
      { fromUser: data.fromUser, toUser: data.toUser, module: data.module },
    );

    return _mapRule(row);
  } catch {
    return null;
  }
}

export async function revokeDelegation(id: number, actorId: number): Promise<boolean> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).delegationRule.update({
      where: { id },
      data:  { status: "INACTIVE" },
    });
    const { logWorkflowEvent } = await import("./audit");
    await logWorkflowEvent("WORKFLOW_DEFINITION", id, "CANCELLED", actorId, { delegationRevoked: true });
    return true;
  } catch {
    return false;
  }
}

export async function listDelegations(opts?: {
  userId?:  number;
  module?:  string;
  status?:  string;
  take?:    number;
}): Promise<DelegationRule[]> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (prisma as any).delegationRule.findMany({
      where: {
        ...(opts?.userId  ? { OR: [{ fromUser: opts.userId }, { toUser: opts.userId }] } : {}),
        ...(opts?.module  ? { OR: [{ module: opts.module }, { module: null }] } : {}),
        ...(opts?.status  ? { status: opts.status } : {}),
      },
      orderBy: { startDate: "desc" },
      take:    opts?.take ?? 100,
    }) as Array<Record<string, unknown>>;
    return rows.map(_mapRule);
  } catch {
    return [];
  }
}

function _mapRule(r: Record<string, unknown>): DelegationRule {
  return {
    id:        r.id        as number,
    fromUser:  r.fromUser  as number,
    toUser:    r.toUser    as number,
    module:    r.module    as string | null | undefined,
    startDate: new Date(r.startDate as string | number).toISOString(),
    endDate:   new Date(r.endDate   as string | number).toISOString(),
    status:    r.status    as string,
    reason:    r.reason    as string | null | undefined,
    createdAt: new Date(r.createdAt as string | number).toISOString(),
  };
}
