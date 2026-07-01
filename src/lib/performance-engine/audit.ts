import prisma from "@/lib/prisma";

export type PerformanceAuditInput = {
  entityType: string;
  entityId: number;
  action: string;
  oldValue?: string;
  newValue?: string;
  performedBy: number;
};

export async function logPerformanceAudit(input: PerformanceAuditInput) {
  try {
    return await prisma.performanceAudit.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        oldValue: input.oldValue ?? "",
        newValue: input.newValue ?? "",
        performedBy: input.performedBy,
      },
    });
  } catch {
    // audit must never block the main operation
    return null;
  }
}

export async function listPerformanceAudit(filters?: {
  entityType?: string;
  entityId?: number;
  performedBy?: number;
}) {
  try {
    return await prisma.performanceAudit.findMany({
      where: filters,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase W8.3 — Performance Audit READ (visibility only).
//
// `listPerformanceAuditDetailed` is a READ-ONLY enrichment over `PerformanceAudit`:
// it never writes, never touches KRAAchievement/PerformanceReview/EmployeeTarget,
// and never uses legacy KRA / Daily Updates. It resolves actor + subject NAMES and
// builds a friendly action label + summary so the Audit tab can show business rows
// instead of raw IDs/JSON.
// ─────────────────────────────────────────────────────────────────────────────

export const AUDIT_LIMIT_DEFAULT = 50;
export const AUDIT_LIMIT_MAX = 200;

/** Friendly labels for the audit action codes actually written by the performance engine. */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  employee_target_template_applied: "Template Applied",
  employee_target_updated: "Employee Target Updated",
  DAILY_ACTIVITY_MAPPING_CREATE: "Daily Activity Mapping Created",
  DAILY_ACTIVITY_MAPPING_UPDATE: "Daily Activity Mapping Updated",
  DAILY_ACTIVITY_MAPPING_RECONCILE: "Daily Activity Mapping Reconciled",
  DAILY_ACTIVITY_MAPPING_DISABLE: "Daily Activity Mapping Disabled",
  enterprise_kra_preview_converted: "Enterprise KRA Preview Converted",
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
};

/** Friendly labels for the entityType codes used by performance audit writers. */
export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  EmployeeTarget: "Employee Target",
  KRAMetric: "KRA Metric",
  enterprise_kra_conversion: "Enterprise KRA Conversion",
  performance_review: "Performance Review",
  team_target: "Team Target",
  kra_template: "KRA Template",
  performance_period: "Performance Period",
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export function auditEntityLabel(entityType: string): string {
  return AUDIT_ENTITY_LABELS[entityType] ?? entityType;
}

/** Safely parse an audit row's stored JSON value (never throws). */
function safeParse(value: string): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const p = JSON.parse(value);
    return p && typeof p === "object" ? (p as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Build a short, business-friendly summary string from an audit row (no raw JSON dumped). */
function buildSummary(action: string, parsed: Record<string, unknown> | null): string {
  if (!parsed) return auditActionLabel(action);
  const num = (k: string) => (typeof parsed[k] === "number" ? (parsed[k] as number) : undefined);
  const str = (k: string) => (typeof parsed[k] === "string" ? (parsed[k] as string) : undefined);
  switch (action) {
    case "employee_target_template_applied": {
      const t = str("templateName");
      const n = num("kpiCount");
      return `Applied template${t ? ` “${t}”` : ""}${n != null ? ` · ${n} KPI${n === 1 ? "" : "s"} seeded` : ""}`;
    }
    case "employee_target_updated": {
      const n = num("kpiCount");
      const w = num("totalActiveWeight");
      return `Updated ${n ?? 0} KPI target${n === 1 ? "" : "s"}${w != null ? ` · total weight ${w}%` : ""}`;
    }
    case "DAILY_ACTIVITY_MAPPING_CREATE":
    case "DAILY_ACTIVITY_MAPPING_UPDATE":
    case "DAILY_ACTIVITY_MAPPING_RECONCILE": {
      const code = str("code") ?? str("metricCode");
      const mt = str("mappingType") ?? str("metricType");
      return `${auditActionLabel(action)}${code ? ` · ${code}` : ""}${mt ? ` (${mt})` : ""}`;
    }
    default:
      return auditActionLabel(action);
  }
}

export type DetailedAuditFilters = {
  entityType?: string;
  action?: string;
  employeeProfileId?: number;
  /** createdAt lower bound (inclusive), a local-midnight Date. */
  createdGte?: Date;
  /** createdAt upper bound (exclusive), a local-midnight Date. */
  createdLt?: Date;
  limit?: number;
};

export type DetailedAuditRow = {
  id: number;
  action: string;
  actionLabel: string;
  entityType: string;
  entityLabel: string;
  entityId: number;
  employeeName: string;
  performedBy: number;
  performedByName: string;
  summary: string;
  createdAt: string;
};

/**
 * Read enriched performance audit rows for the Audit tab. READ-ONLY.
 * Resolves actor (Employee) names and, for EmployeeTarget/KRAMetric rows, the subject name —
 * via batched lookups (no N+1). Never writes. Returns [] on any error (audit view must not 500).
 */
export async function listPerformanceAuditDetailed(
  filters?: DetailedAuditFilters,
): Promise<DetailedAuditRow[]> {
  try {
    const limit = Math.min(Math.max(filters?.limit ?? AUDIT_LIMIT_DEFAULT, 1), AUDIT_LIMIT_MAX);

    const where: {
      entityType?: string;
      action?: string;
      entityId?: { in: number[] };
      createdAt?: { gte?: Date; lt?: Date };
    } = {};
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.action) where.action = filters.action;
    if (filters?.createdGte || filters?.createdLt) {
      where.createdAt = {};
      if (filters.createdGte) where.createdAt.gte = filters.createdGte;
      if (filters.createdLt) where.createdAt.lt = filters.createdLt;
    }

    // employeeProfileId filter → restrict to that employee's EmployeeTarget audit rows.
    if (filters?.employeeProfileId) {
      const targets = await prisma.employeeTarget.findMany({
        where: { employeeProfileId: filters.employeeProfileId },
        select: { id: true },
      });
      where.entityType = "EmployeeTarget";
      where.entityId = { in: targets.map((t) => t.id) };
      if (targets.length === 0) return [];
    }

    const rows = await prisma.performanceAudit.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    if (rows.length === 0) return [];

    // Batch-resolve actor (Employee) names.
    const actorIds = [...new Set(rows.map((r) => r.performedBy).filter((id) => id > 0))];
    const actors = actorIds.length
      ? await prisma.employee.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } })
      : [];
    const actorName = new Map(actors.map((a) => [a.id, a.name]));

    // Batch-resolve EmployeeTarget → employee name.
    const targetIds = [...new Set(rows.filter((r) => r.entityType === "EmployeeTarget").map((r) => r.entityId))];
    const targets = targetIds.length
      ? await prisma.employeeTarget.findMany({
          where: { id: { in: targetIds } },
          select: { id: true, employeeProfile: { select: { employee: { select: { name: true } } } } },
        })
      : [];
    const targetEmployeeName = new Map(targets.map((t) => [t.id, t.employeeProfile?.employee?.name ?? ""]));

    // Batch-resolve KRAMetric → metric name (subject for Daily Activity mapping events).
    const metricIds = [...new Set(rows.filter((r) => r.entityType === "KRAMetric").map((r) => r.entityId))];
    const metrics = metricIds.length
      ? await prisma.kRAMetric.findMany({ where: { id: { in: metricIds } }, select: { id: true, name: true } })
      : [];
    const metricName = new Map(metrics.map((m) => [m.id, m.name]));

    return rows.map((r) => {
      const parsed = safeParse(r.newValue);
      let employeeName = "";
      if (r.entityType === "EmployeeTarget") employeeName = targetEmployeeName.get(r.entityId) ?? "";
      else if (r.entityType === "KRAMetric") employeeName = metricName.get(r.entityId) ?? "";
      return {
        id: r.id,
        action: r.action,
        actionLabel: auditActionLabel(r.action),
        entityType: r.entityType,
        entityLabel: auditEntityLabel(r.entityType),
        entityId: r.entityId,
        employeeName,
        performedBy: r.performedBy,
        performedByName: actorName.get(r.performedBy) ?? (r.performedBy > 0 ? `#${r.performedBy}` : "System"),
        summary: buildSummary(r.action, parsed),
        createdAt: r.createdAt.toISOString(),
      };
    });
  } catch {
    return [];
  }
}
