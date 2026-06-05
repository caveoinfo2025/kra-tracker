/**
 * Master Data — Override Service
 *
 * Company- and branch-level overrides for MasterValues.
 * Scope types: "COMPANY" | "BRANCH"
 */

import { logMasterEvent } from "./audit";

export interface MasterOverride {
  id:            number;
  masterValueId: number;
  scopeType:     string;
  scopeId:       number;
  customValue:   string;
  isEnabled:     boolean;
  createdAt:     string;
  updatedAt:     string;
}

export async function listOverrides(opts: {
  masterValueId?: number;
  scopeType?:     string;
  scopeId?:       number;
}): Promise<MasterOverride[]> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (prisma as any).masterOverride.findMany({
      where: {
        ...(opts.masterValueId !== undefined ? { masterValueId: opts.masterValueId } : {}),
        ...(opts.scopeType     !== undefined ? { scopeType:     opts.scopeType     } : {}),
        ...(opts.scopeId       !== undefined ? { scopeId:       opts.scopeId       } : {}),
      },
      orderBy: [{ scopeType: "asc" }, { scopeId: "asc" }],
    }) as Array<Record<string, unknown>>;
    return rows.map(_map);
  } catch {
    return [];
  }
}

export async function createOverride(data: {
  masterValueId: number;
  scopeType:     string;
  scopeId:       number;
  customValue?:  string;
  isEnabled?:    boolean;
  actorId:       number;
}): Promise<MasterOverride | null> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await (prisma as any).masterOverride.create({
      data: {
        masterValueId: data.masterValueId,
        scopeType:     data.scopeType,
        scopeId:       data.scopeId,
        customValue:   data.customValue  ?? "",
        isEnabled:     data.isEnabled    ?? true,
      },
    }) as Record<string, unknown>;
    await logMasterEvent(row.id as number, "OVERRIDE", "OVERRIDE_ADDED", data.actorId, undefined, data.customValue ?? "");
    return _map(row);
  } catch {
    return null;
  }
}

export async function updateOverride(
  id:      number,
  data:    { customValue?: string; isEnabled?: boolean },
  actorId: number,
): Promise<boolean> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    const existing = await db.masterOverride.findUnique({
      where: { id },
      select: { customValue: true },
    }) as { customValue: string } | null;
    await db.masterOverride.update({ where: { id }, data });
    await logMasterEvent(id, "OVERRIDE", "OVERRIDE_UPDATED", actorId, existing?.customValue, data.customValue ?? existing?.customValue);
    return true;
  } catch {
    return false;
  }
}

export async function upsertOverride(data: {
  masterValueId: number;
  scopeType:     string;
  scopeId:       number;
  customValue?:  string;
  isEnabled?:    boolean;
  actorId:       number;
}): Promise<MasterOverride | null> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    const row = await db.masterOverride.upsert({
      where: {
        masterValueId_scopeType_scopeId: {
          masterValueId: data.masterValueId,
          scopeType:     data.scopeType,
          scopeId:       data.scopeId,
        },
      },
      create: {
        masterValueId: data.masterValueId,
        scopeType:     data.scopeType,
        scopeId:       data.scopeId,
        customValue:   data.customValue ?? "",
        isEnabled:     data.isEnabled   ?? true,
      },
      update: {
        customValue: data.customValue ?? "",
        isEnabled:   data.isEnabled   ?? true,
      },
    }) as Record<string, unknown>;
    await logMasterEvent(row.id as number, "OVERRIDE", "OVERRIDE_UPDATED", data.actorId, undefined, data.customValue ?? "");
    return _map(row);
  } catch {
    return null;
  }
}

function _map(r: Record<string, unknown>): MasterOverride {
  return {
    id:            r.id            as number,
    masterValueId: r.masterValueId as number,
    scopeType:     r.scopeType     as string,
    scopeId:       r.scopeId       as number,
    customValue:   r.customValue   as string,
    isEnabled:     Boolean(r.isEnabled),
    createdAt:     new Date(r.createdAt as string | number).toISOString(),
    updatedAt:     new Date(r.updatedAt as string | number).toISOString(),
  };
}
