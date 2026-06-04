/**
 * Policy CRUD service — server-side helpers for working with Policy records.
 *
 * All functions use dynamic prisma imports so this file can be imported in
 * server components and API routes without breaking the build when the DB
 * tables don't exist yet (pre-migration).
 */

export type PolicyStatus = "DRAFT" | "REVIEW" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type ScopeType    = "GLOBAL" | "COMPANY" | "BRANCH" | "DEPARTMENT" | "ROLE" | "USER";

export interface PolicySummary {
  id:            number;
  code:          string;
  name:          string;
  description:   string;
  categoryId:    number;
  categoryName:  string;
  scopeType:     ScopeType;
  scopeId:       number | null;
  status:        PolicyStatus;
  version:       number;
  effectiveFrom: string | null;
  effectiveTo:   string | null;
  ruleCount:     number;
  createdAt:     string;
  updatedAt:     string;
}

/** List all policies, optionally filtered by status or category. */
export async function listPolicies(filters?: {
  status?: PolicyStatus;
  categoryId?: number;
  module?: string;
}): Promise<PolicySummary[]> {
  const prisma = (await import("@/lib/prisma")).default;

  const where: Record<string, unknown> = {};
  if (filters?.status)     where.status     = filters.status;
  if (filters?.categoryId) where.categoryId = filters.categoryId;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await (prisma as any).policy.findMany({
    where,
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      category: { select: { name: true } },
      _count:   { select: { rules: true } },
    },
  }) as Array<Record<string, any>>;

  return rows.map((r) => ({
    id:            r.id            as number,
    code:          r.code          as string,
    name:          r.name          as string,
    description:   r.description   as string,
    categoryId:    r.categoryId    as number,
    categoryName:  (r.category as { name: string }).name,
    scopeType:     r.scopeType     as ScopeType,
    scopeId:       r.scopeId       as number | null,
    status:        r.status        as PolicyStatus,
    version:       r.version       as number,
    effectiveFrom: r.effectiveFrom ? new Date(r.effectiveFrom).toISOString() : null,
    effectiveTo:   r.effectiveTo   ? new Date(r.effectiveTo).toISOString()   : null,
    ruleCount:     (r._count as { rules: number }).rules,
    createdAt:     new Date(r.createdAt).toISOString(),
    updatedAt:     new Date(r.updatedAt).toISOString(),
  }));
}

/** Transition a policy through its lifecycle. Records a PolicyAudit row. */
export async function transitionPolicyStatus(
  policyId: number,
  newStatus: PolicyStatus,
  performedById: number,
  changeReason = "",
): Promise<void> {
  const prisma = (await import("@/lib/prisma")).default;
  const { buildSnapshot } = await import("./versioning");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;

  const current = await db.policy.findUnique({
    where: { id: policyId },
    include: { rules: true },
  }) as Record<string, any> | null;
  if (!current) throw new Error(`Policy ${policyId} not found`);

  const oldStatus = current.status as string;

  const updateData: Record<string, unknown> = { status: newStatus };

  // Bump version and create a snapshot on every publish
  if (newStatus === "ACTIVE") {
    const nextVersion = (current.version as number) + 1;
    updateData.version = nextVersion;
    updateData.effectiveFrom = current.effectiveFrom ?? new Date();

    const snapshot = buildSnapshot({ ...current, version: nextVersion } as Parameters<typeof buildSnapshot>[0]);
    await db.policyVersion.create({
      data: {
        policyId,
        versionNumber: nextVersion,
        snapshotJson:  JSON.stringify(snapshot),
        changeReason,
        createdBy:     performedById,
      },
    });
  }

  await db.policy.update({ where: { id: policyId }, data: updateData });

  await db.policyAudit.create({
    data: {
      policyId,
      action:      "STATUS_CHANGED",
      oldValue:    oldStatus,
      newValue:    newStatus,
      performedBy: performedById,
    },
  });
}
