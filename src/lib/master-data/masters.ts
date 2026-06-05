/**
 * Master Data — Core Masters Service
 *
 * CRUD for MasterCategory, MasterDefinition and MasterValue.
 * getMasterValues() resolves the three-layer hierarchy:
 *   Global values → Company override → Branch override → active filtered list.
 */

import { logMasterEvent } from "./audit";

export interface MasterCategory {
  id:          number;
  name:        string;
  code:        string;
  description: string;
  status:      string;
  createdAt:   string;
  updatedAt:   string;
}

export interface MasterDefinition {
  id:                   number;
  categoryId:           number;
  categoryName?:        string;
  name:                 string;
  code:                 string;
  description:          string;
  allowCompanyOverride: boolean;
  allowBranchOverride:  boolean;
  requiresApproval:     boolean;
  status:               string;
  createdAt:            string;
  updatedAt:            string;
}

export interface MasterValue {
  id:                 number;
  masterDefinitionId: number;
  parentId?:          number | null;
  value:              string;
  code:               string;
  description:        string;
  metadataJson?:      string | null;
  sortOrder:          number;
  status:             string;
  createdAt:          string;
  updatedAt:          string;
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function listCategories(): Promise<MasterCategory[]> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (prisma as any).masterCategory.findMany({
      orderBy: { name: "asc" },
    }) as Array<Record<string, unknown>>;
    return rows.map(_mapCategory);
  } catch {
    return [];
  }
}

export async function createCategory(data: {
  name: string; code: string; description?: string;
}): Promise<MasterCategory | null> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await (prisma as any).masterCategory.create({
      data: { name: data.name, code: data.code.toUpperCase(), description: data.description ?? "", status: "ACTIVE" },
    }) as Record<string, unknown>;
    return _mapCategory(row);
  } catch {
    return null;
  }
}

// ── Definitions ───────────────────────────────────────────────────────────────

export async function listDefinitions(opts?: {
  categoryId?: number;
  status?:     string;
}): Promise<MasterDefinition[]> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (prisma as any).masterDefinition.findMany({
      where: {
        ...(opts?.categoryId ? { categoryId: opts.categoryId } : {}),
        ...(opts?.status     ? { status:     opts.status     } : {}),
      },
      include: { category: { select: { name: true } } },
      orderBy: { name: "asc" },
    }) as Array<Record<string, unknown>>;
    return rows.map(_mapDefinition);
  } catch {
    return [];
  }
}

export async function getDefinitionByCode(code: string): Promise<MasterDefinition | null> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await (prisma as any).masterDefinition.findUnique({
      where:   { code },
      include: { category: { select: { name: true } } },
    }) as Record<string, unknown> | null;
    return row ? _mapDefinition(row) : null;
  } catch {
    return null;
  }
}

export async function createDefinition(data: {
  categoryId:           number;
  name:                 string;
  code:                 string;
  description?:         string;
  allowCompanyOverride?: boolean;
  allowBranchOverride?:  boolean;
  requiresApproval?:     boolean;
  actorId:              number;
}): Promise<MasterDefinition | null> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await (prisma as any).masterDefinition.create({
      data: {
        categoryId:           data.categoryId,
        name:                 data.name,
        code:                 data.code.toUpperCase(),
        description:          data.description ?? "",
        allowCompanyOverride: data.allowCompanyOverride ?? true,
        allowBranchOverride:  data.allowBranchOverride  ?? false,
        requiresApproval:     data.requiresApproval     ?? false,
        status:               "ACTIVE",
      },
    }) as Record<string, unknown>;
    await logMasterEvent(row.id as number, "DEFINITION", "CREATED", data.actorId, undefined, data.name);
    return _mapDefinition(row);
  } catch {
    return null;
  }
}

export async function updateDefinitionStatus(
  id:      number,
  status:  string,
  actorId: number,
): Promise<boolean> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma as any).masterDefinition.findUnique({ where: { id }, select: { status: true } }) as { status: string } | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).masterDefinition.update({ where: { id }, data: { status } });
    await logMasterEvent(id, "DEFINITION", "STATUS_CHANGED", actorId, existing?.status, status);
    return true;
  } catch {
    return false;
  }
}

// ── Values ────────────────────────────────────────────────────────────────────

export async function listValues(definitionId: number): Promise<MasterValue[]> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (prisma as any).masterValue.findMany({
      where:   { masterDefinitionId: definitionId },
      orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
    }) as Array<Record<string, unknown>>;
    return rows.map(_mapValue);
  } catch {
    return [];
  }
}

/**
 * Three-layer resolution:
 *  1. Load all ACTIVE global values for the master.
 *  2. Apply company-level overrides (disable or rename).
 *  3. Apply branch-level overrides (further disable or rename).
 */
export async function getMasterValues(opts: {
  masterCode: string;
  companyId?: number;
  branchId?:  number;
}): Promise<MasterValue[]> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;

    const defn = await db.masterDefinition.findUnique({
      where: { code: opts.masterCode },
    }) as { id: number; allowCompanyOverride: boolean; allowBranchOverride: boolean } | null;
    if (!defn) return [];

    const values = await db.masterValue.findMany({
      where:   { masterDefinitionId: defn.id, status: "ACTIVE" },
      orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
    }) as Array<Record<string, unknown>>;

    if (!opts.companyId && !opts.branchId) return values.map(_mapValue);

    // Fetch all relevant overrides in one query
    const scopeConditions: Array<Record<string, unknown>> = [];
    if (opts.companyId && defn.allowCompanyOverride) {
      scopeConditions.push({ scopeType: "COMPANY", scopeId: opts.companyId });
    }
    if (opts.branchId && defn.allowBranchOverride) {
      scopeConditions.push({ scopeType: "BRANCH", scopeId: opts.branchId });
    }

    if (scopeConditions.length === 0) return values.map(_mapValue);

    const valueIds = values.map((v) => v.id as number);
    const overrides = await db.masterOverride.findMany({
      where: {
        masterValueId: { in: valueIds },
        OR: scopeConditions,
      },
    }) as Array<{ masterValueId: number; scopeType: string; scopeId: number; customValue: string; isEnabled: boolean }>;

    // Build a lookup: valueId → { company: override, branch: override }
    const overrideMap = new Map<number, { company?: typeof overrides[0]; branch?: typeof overrides[0] }>();
    for (const o of overrides) {
      const entry = overrideMap.get(o.masterValueId) ?? {};
      if (o.scopeType === "COMPANY") entry.company = o;
      if (o.scopeType === "BRANCH")  entry.branch  = o;
      overrideMap.set(o.masterValueId, entry);
    }

    return values
      .filter((v) => {
        const ov = overrideMap.get(v.id as number);
        // Branch override takes precedence; then company; then global (always enabled)
        const effectiveOverride = ov?.branch ?? ov?.company;
        return effectiveOverride ? effectiveOverride.isEnabled : true;
      })
      .map((v) => {
        const ov = overrideMap.get(v.id as number);
        const effectiveOverride = ov?.branch ?? ov?.company;
        const mapped = _mapValue(v);
        if (effectiveOverride?.customValue) mapped.value = effectiveOverride.customValue;
        return mapped;
      });
  } catch {
    return [];
  }
}

export async function createValue(data: {
  masterDefinitionId: number;
  value:              string;
  code:               string;
  description?:       string;
  metadataJson?:      string;
  sortOrder?:         number;
  parentId?:          number;
  actorId:            number;
}): Promise<MasterValue | null> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await (prisma as any).masterValue.create({
      data: {
        masterDefinitionId: data.masterDefinitionId,
        value:              data.value,
        code:               data.code.toUpperCase(),
        description:        data.description ?? "",
        metadataJson:       data.metadataJson ?? null,
        sortOrder:          data.sortOrder    ?? 0,
        parentId:           data.parentId     ?? null,
        status:             "ACTIVE",
      },
    }) as Record<string, unknown>;
    await logMasterEvent(row.id as number, "VALUE", "CREATED", data.actorId, undefined, data.value);
    return _mapValue(row);
  } catch {
    return null;
  }
}

export async function updateValue(
  id:      number,
  data:    { value?: string; description?: string; metadataJson?: string; sortOrder?: number; status?: string },
  actorId: number,
): Promise<boolean> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    const existing = await db.masterValue.findUnique({ where: { id }, select: { value: true, status: true } }) as { value: string; status: string } | null;
    await db.masterValue.update({ where: { id }, data });
    await logMasterEvent(id, "VALUE", data.status && data.status !== existing?.status ? "STATUS_CHANGED" : "UPDATED", actorId, existing?.value, data.value ?? existing?.value);
    return true;
  } catch {
    return false;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _mapCategory(r: Record<string, unknown>): MasterCategory {
  return {
    id:          r.id          as number,
    name:        r.name        as string,
    code:        r.code        as string,
    description: r.description as string,
    status:      r.status      as string,
    createdAt:   new Date(r.createdAt as string | number).toISOString(),
    updatedAt:   new Date(r.updatedAt as string | number).toISOString(),
  };
}

function _mapDefinition(r: Record<string, unknown>): MasterDefinition {
  const cat = r.category as { name: string } | undefined;
  return {
    id:                   r.id                   as number,
    categoryId:           r.categoryId           as number,
    categoryName:         cat?.name,
    name:                 r.name                 as string,
    code:                 r.code                 as string,
    description:          r.description          as string,
    allowCompanyOverride: Boolean(r.allowCompanyOverride),
    allowBranchOverride:  Boolean(r.allowBranchOverride),
    requiresApproval:     Boolean(r.requiresApproval),
    status:               r.status               as string,
    createdAt:            new Date(r.createdAt as string | number).toISOString(),
    updatedAt:            new Date(r.updatedAt as string | number).toISOString(),
  };
}

function _mapValue(r: Record<string, unknown>): MasterValue {
  return {
    id:                 r.id                 as number,
    masterDefinitionId: r.masterDefinitionId as number,
    parentId:           r.parentId           as number | null | undefined,
    value:              r.value              as string,
    code:               r.code               as string,
    description:        r.description        as string,
    metadataJson:       r.metadataJson       as string | null | undefined,
    sortOrder:          r.sortOrder          as number,
    status:             r.status             as string,
    createdAt:          new Date(r.createdAt as string | number).toISOString(),
    updatedAt:          new Date(r.updatedAt as string | number).toISOString(),
  };
}
