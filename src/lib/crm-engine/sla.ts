import prisma from "@/lib/prisma";
import type { SLARuleModel as SLARule } from "@/generated/prisma/models/SLARule";

export type { SLARule };

export async function listSLARules(module?: string): Promise<SLARule[]> {
  try {
    return await prisma.sLARule.findMany({
      where: { status: "active", ...(module ? { module } : {}) },
      orderBy: [{ module: "asc" }, { event: "asc" }],
    });
  } catch {
    return [];
  }
}

export async function getSLARule(id: number): Promise<SLARule | null> {
  try {
    return await prisma.sLARule.findUnique({ where: { id } });
  } catch {
    return null;
  }
}

export async function createSLARule(data: {
  module: string;
  event: string;
  label?: string;
  durationHours: number;
  warningHours?: number;
  escalationPolicyId?: number;
}): Promise<SLARule> {
  return prisma.sLARule.create({
    data: {
      module: data.module,
      event: data.event,
      label: data.label ?? "",
      durationHours: data.durationHours,
      warningHours: data.warningHours ?? 0,
      escalationPolicyId: data.escalationPolicyId ?? null,
    },
  });
}

export async function updateSLARule(
  id: number,
  data: Partial<{
    module: string;
    event: string;
    label: string;
    durationHours: number;
    warningHours: number;
    escalationPolicyId: number | null;
    status: string;
  }>
): Promise<SLARule> {
  return prisma.sLARule.update({ where: { id }, data });
}

export async function deleteSLARule(id: number): Promise<void> {
  await prisma.sLARule.update({ where: { id }, data: { status: "inactive" } });
}

export type SLAStatus = "ok" | "warning" | "breached" | "no_rule";

export type SLACheckResult = {
  status: SLAStatus;
  rule: SLARule | null;
  elapsedHours: number;
  remainingHours: number;
  percentUsed: number;
};

// Check if a record has breached or is close to breaching its SLA
export async function checkSLABreach(
  module: string,
  event: string,
  startTime: Date
): Promise<SLACheckResult> {
  const rule = await prisma.sLARule.findFirst({
    where: { module, event, status: "active" },
  }).catch(() => null);

  const elapsedHours = (Date.now() - startTime.getTime()) / 3_600_000;

  if (!rule) {
    return { status: "no_rule", rule: null, elapsedHours, remainingHours: Infinity, percentUsed: 0 };
  }

  const remainingHours = rule.durationHours - elapsedHours;
  const percentUsed = Math.min(100, (elapsedHours / rule.durationHours) * 100);

  let status: SLAStatus = "ok";
  if (elapsedHours >= rule.durationHours) {
    status = "breached";
  } else if (rule.warningHours > 0 && remainingHours <= rule.warningHours) {
    status = "warning";
  }

  return { status, rule, elapsedHours, remainingHours, percentUsed };
}

// Bulk-check SLA for a list of records
export async function checkBulkSLA(
  items: Array<{ id: number; module: string; event: string; startTime: Date }>
): Promise<Map<number, SLACheckResult>> {
  const results = new Map<number, SLACheckResult>();
  await Promise.all(
    items.map(async (item) => {
      const result = await checkSLABreach(item.module, item.event, item.startTime);
      results.set(item.id, result);
    })
  );
  return results;
}
