import prisma from "@/lib/prisma";
import type { AccountAssignmentRuleModel as AccountAssignmentRule } from "@/generated/prisma/models/AccountAssignmentRule";

export type { AccountAssignmentRule };

export async function listAssignmentRules(): Promise<AccountAssignmentRule[]> {
  try {
    return await prisma.accountAssignmentRule.findMany({
      where: { status: "active" },
      orderBy: { priority: "asc" },
    });
  } catch {
    return [];
  }
}

export async function createAssignmentRule(data: {
  name: string;
  priority?: number;
  conditionJson: string;
  assignToType: string;
  assignToId?: number;
  assignToName?: string;
}): Promise<AccountAssignmentRule> {
  return prisma.accountAssignmentRule.create({
    data: {
      name: data.name,
      priority: data.priority ?? 10,
      conditionJson: data.conditionJson,
      assignToType: data.assignToType,
      assignToId: data.assignToId ?? null,
      assignToName: data.assignToName ?? "",
    },
  });
}

export async function updateAssignmentRule(
  id: number,
  data: Partial<{
    name: string;
    priority: number;
    conditionJson: string;
    assignToType: string;
    assignToId: number | null;
    assignToName: string;
    status: string;
  }>
): Promise<AccountAssignmentRule> {
  return prisma.accountAssignmentRule.update({ where: { id }, data });
}

export async function deleteAssignmentRule(id: number): Promise<void> {
  await prisma.accountAssignmentRule.update({
    where: { id },
    data: { status: "inactive" },
  });
}

export type AssignmentResult = {
  assignToType: string;
  assignToId: number | null;
  assignToName: string;
  ruleId: number;
  ruleName: string;
} | null;

// Evaluate rules in priority order; return first match
export async function evaluateAssignmentRules(
  record: Record<string, unknown>
): Promise<AssignmentResult> {
  try {
    const rules = await listAssignmentRules();
    for (const rule of rules) {
      let condition: Record<string, unknown>;
      try {
        condition = JSON.parse(rule.conditionJson);
      } catch {
        continue;
      }
      if (matchesCondition(record, condition)) {
        return {
          assignToType: rule.assignToType,
          assignToId: rule.assignToId,
          assignToName: rule.assignToName,
          ruleId: rule.id,
          ruleName: rule.name,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Convenience: assign a lead/account based on rules, returns updated record
export async function assignRecord(
  entityType: "LEAD" | "ACCOUNT",
  entityId: number,
  record: Record<string, unknown>
): Promise<AssignmentResult> {
  const result = await evaluateAssignmentRules(record);
  if (result && result.assignToType === "EMPLOYEE" && result.assignToId) {
    if (entityType === "LEAD") {
      await prisma.crmLead.update({
        where: { id: entityId },
        data: { assignedToId: result.assignToId },
      });
    }
  }
  return result;
}

function matchesCondition(
  record: Record<string, unknown>,
  condition: Record<string, unknown>
): boolean {
  for (const [key, expected] of Object.entries(condition)) {
    if (key === "$and" && Array.isArray(expected)) {
      if (!expected.every((c) => matchesCondition(record, c as Record<string, unknown>))) return false;
    } else if (key === "$or" && Array.isArray(expected)) {
      if (!expected.some((c) => matchesCondition(record, c as Record<string, unknown>))) return false;
    } else {
      if (record[key] !== expected) return false;
    }
  }
  return true;
}
