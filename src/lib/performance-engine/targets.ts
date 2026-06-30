import prisma from "@/lib/prisma";

export type EmployeeTargetInput = {
  employeeProfileId: number;
  periodId: number;
  templateId?: number;
  targetJson?: string;
  status?: string;
};

export type TeamTargetInput = {
  teamId: number;
  periodId: number;
  targetJson?: string;
  status?: string;
};

export async function listEmployeeTargets(filters?: {
  employeeProfileId?: number;
  periodId?: number;
}) {
  try {
    return await prisma.employeeTarget.findMany({
      where: filters,
      include: {
        period: true,
        achievements: { include: { metric: true } },
        // Surface employee NAME + role context so the UI never shows raw profile IDs (Phase W8.1).
        employeeProfile: {
          include: {
            employee: { select: { name: true } },
            designation: { select: { title: true } },
            department: { select: { name: true } },
            team: { select: { name: true } },
            reportingManager: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return [];
  }
}

/**
 * Phase W8.1 — list employee profiles for the "assign target" name-search dropdown, so the UI can
 * pick an employee by NAME (and show role/department/manager) instead of asking for a raw profile
 * ID. Read-only; never throws.
 */
export async function listEmployeeProfilesForTargeting() {
  try {
    const profiles = await prisma.employeeProfile.findMany({
      where: { employmentStatus: "ACTIVE" },
      include: {
        employee: { select: { name: true } },
        designation: { select: { title: true } },
        department: { select: { name: true } },
        team: { select: { name: true } },
        reportingManager: { select: { name: true } },
      },
    });
    return profiles
      .map((p) => ({
        employeeProfileId: p.id,
        name: p.employee?.name ?? `Profile #${p.id}`,
        designation: p.designation?.title ?? "",
        department: p.department?.name ?? "",
        team: p.team?.name ?? "",
        reportingManager: p.reportingManager?.name ?? "",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export async function getEmployeeTarget(id: number) {
  try {
    return await prisma.employeeTarget.findUnique({
      where: { id },
      include: {
        period: true,
        achievements: { include: { metric: true } },
        reviews: true,
      },
    });
  } catch {
    return null;
  }
}

export async function createEmployeeTarget(input: EmployeeTargetInput) {
  return await prisma.employeeTarget.create({ data: input });
}

export async function updateEmployeeTarget(id: number, input: Partial<EmployeeTargetInput>) {
  return await prisma.employeeTarget.update({ where: { id }, data: input });
}

export async function listTeamTargets(filters?: { teamId?: number; periodId?: number }) {
  try {
    return await prisma.teamTarget.findMany({
      where: filters,
      include: { period: true },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return [];
  }
}

export async function createTeamTarget(input: TeamTargetInput) {
  return await prisma.teamTarget.create({ data: input });
}

export async function updateTeamTarget(id: number, input: Partial<TeamTargetInput>) {
  return await prisma.teamTarget.update({ where: { id }, data: input });
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase W8.2 — employee-wise KPI target assignment.
//
// Each EmployeeTarget row already belongs to ONE employee (employeeProfileId).
// W8.2 fills its `targetJson` with per-KPI target rows so two ISRs on the SAME
// role template can carry DIFFERENT target values (Priya 35 leads, Sangeetha 45).
//
// Storage: `EmployeeTarget.targetJson` (existing `@db.Text` column — NO schema
// change). The UI never sees this JSON; the API converts business-friendly rows
// to/from it. Role templates seed the rows but every value is editable per
// employee afterwards. This module NEVER writes KRAAchievement / PerformanceReview
// / legacy KRA / WeeklyReview rows.
// ─────────────────────────────────────────────────────────────────────────────

import { logPerformanceAudit } from "./audit";

/** Recommended `source` values for a KPI target row (Task 3). UI dropdown + validation reuse this. */
export const TARGET_SOURCES = [
  "DAILY_ACTIVITY",
  "CRM_LEADS",
  "CRM_MEETINGS",
  "CRM_PIPELINE",
  "CRM_OPPORTUNITY",
  "FINANCE_COLLECTION",
  "MANUAL",
] as const;
export type TargetSource = (typeof TARGET_SOURCES)[number];

/** Allowed measurement frequencies for a KPI target row. */
export const TARGET_FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"] as const;
export type TargetFrequency = (typeof TARGET_FREQUENCIES)[number];

/** Current `targetJson` schema version. Bump if the shape changes. */
export const TARGET_JSON_VERSION = 1 as const;

/** One editable KPI target row as the UI/API exchange it (business-friendly, never raw JSON). */
export type EmployeeTargetKpiRow = {
  metricCode: string;
  metricName: string;
  category: string;
  source: string;
  unit: string;
  targetValue: number;
  weight: number;
  frequency: string;
  isActive: boolean;
  notes: string;
};

/** The full `EmployeeTarget.targetJson` document shape (Task 4). Internal — never shown to users. */
export type EmployeeTargetJson = {
  version: number;
  templateId: number | null;
  templateName: string;
  period: string;
  targets: EmployeeTargetKpiRow[];
};

/** Map an enterprise metric's calculationSource → a recommended target `source` (falls back to MANUAL). */
function deriveSource(calculationSource: string | null | undefined): string {
  const s = (calculationSource ?? "").toUpperCase();
  return (TARGET_SOURCES as readonly string[]).includes(s) ? s : "MANUAL";
}

/** Map metric/template typing → a display unit (PERCENT / COUNT / AMOUNT). */
function deriveUnit(metricType: string | null | undefined, targetType: string | null | undefined): string {
  const mt = (metricType ?? "").toUpperCase();
  const tt = (targetType ?? "").toUpperCase();
  if (mt.includes("PERCENT") || tt === "PERCENTAGE" || tt === "PERCENT") return "PERCENT";
  if (tt === "AMOUNT") return "AMOUNT";
  if (mt.includes("COUNT") || tt === "COUNT") return "COUNT";
  if (mt === "CURRENCY" || mt === "AMOUNT") return "AMOUNT";
  return "COUNT";
}

/** Map calculationSource → a human-readable category bucket for the KPI table. */
function deriveCategory(calculationSource: string | null | undefined, metricType: string | null | undefined): string {
  switch ((calculationSource ?? "").toUpperCase()) {
    case "DAILY_ACTIVITY": return "Daily Activity";
    case "CRM_LEADS": return "Leads";
    case "CRM_MEETINGS": return "Meetings";
    case "CRM_PIPELINE": return "Pipeline";
    case "CRM_OPPORTUNITY": return "Opportunity";
    case "FINANCE_COLLECTION": return "Collections";
    default: return metricType && metricType !== "CUSTOM" ? metricType : "General";
  }
}

/** Normalise a period's type into a default KPI frequency. */
function deriveFrequency(periodType: string | null | undefined): string {
  const pt = (periodType ?? "").toUpperCase();
  return (TARGET_FREQUENCIES as readonly string[]).includes(pt) ? pt : "MONTHLY";
}

/**
 * Build KPI target rows from a role template (Task 6). Reads `KRATemplate` + `KRATemplateItem`
 * + `KRAMetric` and seeds business-friendly defaults. Does NOT persist — the caller decides.
 */
export async function buildTargetRowsFromTemplate(
  templateId: number,
  periodType?: string,
): Promise<{ templateName: string; rows: EmployeeTargetKpiRow[] }> {
  const template = await prisma.kRATemplate.findUnique({
    where: { id: templateId },
    include: { items: { include: { metric: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!template) throw new Error(`Template #${templateId} not found`);

  const freq = deriveFrequency(periodType);
  const rows: EmployeeTargetKpiRow[] = template.items
    .filter((it) => it.status !== "inactive")
    .map((it) => ({
      metricCode: it.metric.code,
      metricName: it.metric.name,
      category: deriveCategory(it.metric.calculationSource, it.metric.metricType),
      source: deriveSource(it.metric.calculationSource),
      unit: deriveUnit(it.metric.metricType, it.targetType),
      // Seed the editable target from the template's expected (fallback minimum) — overridable per employee.
      targetValue: it.expectedTarget || it.minimumTarget || 0,
      weight: it.weightage || 0,
      frequency: freq,
      isActive: true,
      notes: "",
    }));

  return { templateName: template.name, rows };
}

/** Safely parse an `EmployeeTarget.targetJson` string into the document shape (never throws). */
export function parseEmployeeTargetJson(targetJson: string | null | undefined): EmployeeTargetJson {
  const empty: EmployeeTargetJson = {
    version: TARGET_JSON_VERSION,
    templateId: null,
    templateName: "",
    period: "",
    targets: [],
  };
  if (!targetJson) return empty;
  try {
    const parsed = JSON.parse(targetJson);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.targets)) return empty;
    return {
      version: typeof parsed.version === "number" ? parsed.version : TARGET_JSON_VERSION,
      templateId: typeof parsed.templateId === "number" ? parsed.templateId : null,
      templateName: typeof parsed.templateName === "string" ? parsed.templateName : "",
      period: typeof parsed.period === "string" ? parsed.period : "",
      targets: parsed.targets.map((r: Partial<EmployeeTargetKpiRow>) => ({
        metricCode: String(r.metricCode ?? ""),
        metricName: String(r.metricName ?? ""),
        category: String(r.category ?? ""),
        source: String(r.source ?? "MANUAL"),
        unit: String(r.unit ?? "COUNT"),
        targetValue: Number(r.targetValue ?? 0),
        weight: Number(r.weight ?? 0),
        frequency: String(r.frequency ?? "MONTHLY"),
        isActive: r.isActive !== false,
        notes: String(r.notes ?? ""),
      })),
    };
  } catch {
    return empty;
  }
}

/** Validation result for a set of KPI target rows (Task 8). */
export type TargetValidation = { errors: string[]; warnings: string[]; totalActiveWeight: number };

/**
 * Validate KPI target rows. Hard errors block save; weight≠100 is a WARNING only (Task 8 —
 * "warn if total active weight ≠ 100, but allow save").
 */
export function validateTargetRows(rows: EmployeeTargetKpiRow[]): TargetValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  rows.forEach((r, i) => {
    const label = r.metricName || r.metricCode || `Row ${i + 1}`;
    if (!r.metricCode) errors.push(`Row ${i + 1}: metric code is required`);
    if (!r.frequency) errors.push(`${label}: frequency is required`);
    if (typeof r.targetValue !== "number" || Number.isNaN(r.targetValue) || r.targetValue < 0)
      errors.push(`${label}: target value must be a non-negative number`);
    if (typeof r.weight !== "number" || Number.isNaN(r.weight) || r.weight < 0 || r.weight > 100)
      errors.push(`${label}: weight must be between 0 and 100`);
  });

  const totalActiveWeight = rows
    .filter((r) => r.isActive)
    .reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
  if (rows.some((r) => r.isActive) && Math.abs(totalActiveWeight - 100) > 0.01) {
    warnings.push(`Total active KPI weight is ${totalActiveWeight.toFixed(1)}% (ideally 100%).`);
  }

  return { errors, warnings, totalActiveWeight };
}

/**
 * Load one EmployeeTarget with its parsed KPI rows + employee/period context for the editor.
 * Returns business-friendly data only — the raw targetJson string is NOT included.
 */
export async function getEmployeeTargetDetail(id: number) {
  const target = await prisma.employeeTarget.findUnique({
    where: { id },
    include: {
      period: true,
      template: { select: { id: true, name: true } },
      employeeProfile: {
        include: {
          employee: { select: { name: true } },
          designation: { select: { title: true } },
          department: { select: { name: true } },
          team: { select: { name: true } },
          reportingManager: { select: { name: true } },
        },
      },
    },
  });
  if (!target) return null;

  const doc = parseEmployeeTargetJson(target.targetJson);
  return {
    id: target.id,
    employeeProfileId: target.employeeProfileId,
    employeeName: target.employeeProfile?.employee?.name ?? `Profile #${target.employeeProfileId}`,
    designation: target.employeeProfile?.designation?.title ?? "",
    department: target.employeeProfile?.department?.name ?? "",
    team: target.employeeProfile?.team?.name ?? "",
    reportingManager: target.employeeProfile?.reportingManager?.name ?? "",
    periodId: target.periodId,
    periodName: target.period?.name ?? `Period #${target.periodId}`,
    periodType: target.period?.periodType ?? "",
    templateId: target.templateId,
    templateName: target.template?.name ?? doc.templateName ?? "",
    status: target.status,
    rows: doc.targets,
  };
}

/**
 * Apply a role template to ONE employee target (Task 6). Seeds KPI rows from the template into
 * that target's `targetJson` and links `templateId`. Affects only the selected target — nothing
 * is auto-assigned to a hierarchy or to other employees. Audited as `employee_target_template_applied`.
 *
 * Returns the rebuilt rows so the UI can render them for editing before the user saves overrides.
 */
export async function applyTemplateToEmployeeTarget(params: {
  targetId: number;
  templateId: number;
  actorId?: number;
}): Promise<EmployeeTargetKpiRow[]> {
  const { targetId, templateId, actorId } = params;
  const target = await prisma.employeeTarget.findUnique({
    where: { id: targetId },
    include: { period: { select: { name: true, periodType: true } } },
  });
  if (!target) throw new Error(`Employee target #${targetId} not found`);

  const { templateName, rows } = await buildTargetRowsFromTemplate(templateId, target.period?.periodType);

  const doc: EmployeeTargetJson = {
    version: TARGET_JSON_VERSION,
    templateId,
    templateName,
    period: target.period?.name ?? "",
    targets: rows,
  };

  await prisma.employeeTarget.update({
    where: { id: targetId },
    data: { templateId, targetJson: JSON.stringify(doc) },
  });

  await logPerformanceAudit({
    entityType: "EmployeeTarget",
    entityId: targetId,
    action: "employee_target_template_applied",
    newValue: JSON.stringify({
      templateId,
      templateName,
      employeeProfileId: target.employeeProfileId,
      kpiCount: rows.length,
      metricCodes: rows.map((r) => r.metricCode),
    }),
    performedBy: actorId ?? 0,
  });

  return rows;
}

/**
 * Save employee-specific KPI target rows into one target's `targetJson` (Task 5/8). Validates,
 * serialises business rows to JSON internally, and audits `employee_target_updated`. Weight≠100
 * is a non-blocking warning. Never writes KRAAchievement/PerformanceReview rows.
 */
export async function saveEmployeeTargetRows(params: {
  targetId: number;
  rows: EmployeeTargetKpiRow[];
  status?: string;
  actorId?: number;
}): Promise<{ ok: true; validation: TargetValidation } | { ok: false; validation: TargetValidation }> {
  const { targetId, rows, status, actorId } = params;

  const validation = validateTargetRows(rows);
  if (validation.errors.length > 0) return { ok: false, validation };

  const existing = await prisma.employeeTarget.findUnique({
    where: { id: targetId },
    include: { period: { select: { name: true } } },
  });
  if (!existing) throw new Error(`Employee target #${targetId} not found`);

  const prevDoc = parseEmployeeTargetJson(existing.targetJson);
  const doc: EmployeeTargetJson = {
    version: TARGET_JSON_VERSION,
    templateId: existing.templateId,
    templateName: prevDoc.templateName,
    period: existing.period?.name ?? prevDoc.period,
    targets: rows.map((r) => ({
      metricCode: String(r.metricCode),
      metricName: String(r.metricName ?? ""),
      category: String(r.category ?? ""),
      source: String(r.source ?? "MANUAL"),
      unit: String(r.unit ?? "COUNT"),
      targetValue: Number(r.targetValue) || 0,
      weight: Number(r.weight) || 0,
      frequency: String(r.frequency),
      isActive: r.isActive !== false,
      notes: String(r.notes ?? ""),
    })),
  };

  await prisma.employeeTarget.update({
    where: { id: targetId },
    data: { targetJson: JSON.stringify(doc), ...(status ? { status } : {}) },
  });

  await logPerformanceAudit({
    entityType: "EmployeeTarget",
    entityId: targetId,
    action: "employee_target_updated",
    oldValue: JSON.stringify({ kpiCount: prevDoc.targets.length }),
    newValue: JSON.stringify({
      employeeProfileId: existing.employeeProfileId,
      kpiCount: doc.targets.length,
      totalActiveWeight: validation.totalActiveWeight,
      rows: doc.targets.map((r) => ({ metricCode: r.metricCode, targetValue: r.targetValue, weight: r.weight, isActive: r.isActive })),
    }),
    performedBy: actorId ?? 0,
  });

  return { ok: true, validation };
}
