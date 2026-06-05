/**
 * Master Data — Audit Service
 *
 * Logs every create/update/status-change on MasterDefinition, MasterValue,
 * MasterOverride, CustomerPolicy and VendorPolicy.
 * Pre-migration safe: silently no-ops on DB error.
 */

export type MasterAuditAction =
  | "CREATED" | "UPDATED" | "STATUS_CHANGED"
  | "OVERRIDE_ADDED" | "OVERRIDE_UPDATED"
  | "VALUE_IMPORTED" | "POLICY_UPDATED";

export type MasterAuditType = "DEFINITION" | "VALUE" | "OVERRIDE" | "POLICY";

export interface MasterAuditEntry {
  id:          number;
  masterId:    number;
  masterType:  MasterAuditType;
  action:      MasterAuditAction;
  oldValue?:   string | null;
  newValue?:   string | null;
  performedBy: number;
  createdAt:   string;
}

export async function logMasterEvent(
  masterId:    number,
  masterType:  MasterAuditType,
  action:      MasterAuditAction,
  actorId:     number,
  oldValue?:   string,
  newValue?:   string,
): Promise<void> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).masterAudit.create({
      data: { masterId, masterType, action, performedBy: actorId, oldValue: oldValue ?? null, newValue: newValue ?? null },
    });
  } catch {
    // Pre-migration — silently absorb
  }
}

export async function getMasterAudit(
  masterId:   number,
  masterType: MasterAuditType,
): Promise<MasterAuditEntry[]> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (prisma as any).masterAudit.findMany({
      where:   { masterId, masterType },
      orderBy: { createdAt: "desc" },
      take:    100,
    }) as Array<Record<string, unknown>>;
    return rows.map(_map);
  } catch {
    return [];
  }
}

export async function listMasterAudit(opts?: {
  masterType?: MasterAuditType;
  take?:       number;
}): Promise<MasterAuditEntry[]> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (prisma as any).masterAudit.findMany({
      where:   opts?.masterType ? { masterType: opts.masterType } : {},
      orderBy: { createdAt: "desc" },
      take:    opts?.take ?? 200,
    }) as Array<Record<string, unknown>>;
    return rows.map(_map);
  } catch {
    return [];
  }
}

function _map(r: Record<string, unknown>): MasterAuditEntry {
  return {
    id:          r.id          as number,
    masterId:    r.masterId    as number,
    masterType:  r.masterType  as MasterAuditType,
    action:      r.action      as MasterAuditAction,
    oldValue:    r.oldValue    as string | null | undefined,
    newValue:    r.newValue    as string | null | undefined,
    performedBy: r.performedBy as number,
    createdAt:   new Date(r.createdAt as string | number).toISOString(),
  };
}
