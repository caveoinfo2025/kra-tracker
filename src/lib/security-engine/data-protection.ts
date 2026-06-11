import prisma from "@/lib/prisma";

export interface DataProtectionPolicyRow {
  id:                     number;
  companyId:              number | null;
  exportLimit:            number;
  exportApprovalRequired: boolean;
  downloadRestriction:    boolean;
  sensitiveFieldsJson:    string;
  maskingRulesJson:       string;
  status:                 string;
  createdAt:              Date;
  updatedAt:              Date;
}

export async function getDataProtectionPolicy(companyId?: number): Promise<DataProtectionPolicyRow | null> {
  return prisma.dataProtectionPolicy.findFirst({
    where: { status: "ACTIVE", ...(companyId ? { companyId } : {}) },
    orderBy: { id: "desc" },
  });
}

export async function upsertDataProtectionPolicy(
  data: Partial<Omit<DataProtectionPolicyRow, "id" | "createdAt" | "updatedAt">>,
  existingId?: number,
): Promise<DataProtectionPolicyRow> {
  if (existingId) {
    return prisma.dataProtectionPolicy.update({ where: { id: existingId }, data });
  }
  return prisma.dataProtectionPolicy.create({
    data: {
      exportLimit:            data.exportLimit            ?? 1000,
      exportApprovalRequired: data.exportApprovalRequired ?? false,
      downloadRestriction:    data.downloadRestriction    ?? false,
      sensitiveFieldsJson:    data.sensitiveFieldsJson    ?? "[]",
      maskingRulesJson:       data.maskingRulesJson       ?? "[]",
      companyId:              data.companyId              ?? null,
      status:                 "ACTIVE",
    },
  });
}

export interface ExportCheckResult {
  allowed:         boolean;
  requiresApproval: boolean;
  reason?:         string;
}

export function canExportData(
  policy: DataProtectionPolicyRow | null,
  recordCount: number,
  isManager: boolean,
): ExportCheckResult {
  if (!policy) return { allowed: true, requiresApproval: false };
  if (policy.downloadRestriction && !isManager)
    return { allowed: false, requiresApproval: false, reason: "Downloads restricted to managers" };
  if (recordCount > policy.exportLimit)
    return { allowed: false, requiresApproval: false, reason: `Export limit is ${policy.exportLimit} records` };
  if (policy.exportApprovalRequired)
    return { allowed: true, requiresApproval: true };
  return { allowed: true, requiresApproval: false };
}

export function maskField(value: string, rule: { pattern: string }): string {
  if (!rule?.pattern) return value;
  if (rule.pattern === "PHONE") {
    return value.replace(/(\d{2})\d+(\d{2})/, "$1****$2");
  }
  if (rule.pattern === "EMAIL") {
    const [local, domain] = value.split("@");
    if (!domain) return "***";
    return `${local[0]}***@${domain}`;
  }
  // Generic: show first 2 and last 2 chars
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}${"*".repeat(value.length - 4)}${value.slice(-2)}`;
}
