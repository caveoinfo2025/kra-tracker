import prisma from "@/lib/prisma";
import type { CRMAutomationRuleModel as CRMAutomationRule } from "@/generated/prisma/models/CRMAutomationRule";

export type { CRMAutomationRule };

export async function listAutomationRules(event?: string): Promise<CRMAutomationRule[]> {
  try {
    return await prisma.cRMAutomationRule.findMany({
      where: { status: "active", ...(event ? { event } : {}) },
      orderBy: { id: "asc" },
    });
  } catch {
    return [];
  }
}

export async function createAutomationRule(data: {
  name: string;
  event: string;
  conditionJson?: string;
  actionJson: string;
}): Promise<CRMAutomationRule> {
  return prisma.cRMAutomationRule.create({
    data: {
      name: data.name,
      event: data.event,
      conditionJson: data.conditionJson ?? "{}",
      actionJson: data.actionJson,
    },
  });
}

export async function updateAutomationRule(
  id: number,
  data: Partial<{
    name: string;
    event: string;
    conditionJson: string;
    actionJson: string;
    status: string;
  }>
): Promise<CRMAutomationRule> {
  return prisma.cRMAutomationRule.update({ where: { id }, data });
}

export async function deleteAutomationRule(id: number): Promise<void> {
  await prisma.cRMAutomationRule.update({
    where: { id },
    data: { status: "inactive" },
  });
}

export type AutomationAction = {
  type: string;
  [key: string]: unknown;
};

export type AutomationExecutionResult = {
  ruleId: number;
  ruleName: string;
  action: AutomationAction;
  executed: boolean;
  error?: string;
}[];

// Execute all matching automation rules for a given event + data context
export async function executeAutomation(
  event: string,
  data: Record<string, unknown>
): Promise<AutomationExecutionResult> {
  const results: AutomationExecutionResult = [];
  try {
    const rules = await listAutomationRules(event);
    for (const rule of rules) {
      let condition: Record<string, unknown> = {};
      let action: AutomationAction = { type: "noop" };
      try {
        condition = JSON.parse(rule.conditionJson);
        action = JSON.parse(rule.actionJson) as AutomationAction;
      } catch {
        results.push({ ruleId: rule.id, ruleName: rule.name, action, executed: false, error: "JSON parse error" });
        continue;
      }

      // Check condition (empty condition = always match)
      if (Object.keys(condition).length > 0 && !matchesCondition(data, condition)) {
        continue;
      }

      // Execute the action
      const result = await dispatchAction(action, data);
      results.push({ ruleId: rule.id, ruleName: rule.name, action, ...result });
    }
  } catch {
    // never throw — automation is fire-and-forget
  }
  return results;
}

async function dispatchAction(
  action: AutomationAction,
  context: Record<string, unknown>
): Promise<{ executed: boolean; error?: string }> {
  try {
    switch (action.type) {
      case "assign_lead": {
        if (context.leadId && action.assignToId) {
          await prisma.crmLead.update({
            where: { id: Number(context.leadId) },
            data: { assignedToId: Number(action.assignToId) },
          });
        }
        return { executed: true };
      }
      case "update_stage": {
        if (context.opportunityId && action.stage) {
          await prisma.crmOpportunity.update({
            where: { id: Number(context.opportunityId) },
            data: { stage: String(action.stage) },
          });
        }
        return { executed: true };
      }
      case "create_task": {
        if (context.leadId || context.opportunityId) {
          if (action.assignToId) {
            await prisma.crmTask.create({
              data: {
                leadId: context.leadId ? Number(context.leadId) : undefined,
                opportunityId: context.opportunityId ? Number(context.opportunityId) : undefined,
                title: String(action.title ?? "Auto-generated task"),
                dueDate: new Date(Date.now() + (Number(action.dueDaysFromNow ?? 1)) * 86400000),
                assignedToId: Number(action.assignToId),
              },
            });
          }
        }
        return { executed: true };
      }
      case "send_notification":
        // Placeholder — hook into your notification system
        return { executed: true };
      default:
        return { executed: false, error: `Unknown action type: ${action.type}` };
    }
  } catch (e) {
    return { executed: false, error: String(e) };
  }
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
