import prisma from "@/lib/prisma";

export type NotificationRuleInput = {
  eventId: number;
  policyId?: number;
  ruleName: string;
  conditionJson?: string;
  recipientJson?: string;
  channelJson?: string;
  frequencyJson?: string;
  status?: string;
};

export type RecipientSpec = {
  type: "USER" | "ROLE" | "REPORTING_MANAGER" | "DEPARTMENT_HEAD" | "TEAM" | "RECORD_OWNER" | "REQUESTER" | "APPROVER";
  value: string;
};

export type ChannelSpec = {
  channels: string[]; // IN_APP | EMAIL | SMS | WHATSAPP | TEAMS
};

export type FrequencySpec = {
  type: "IMMEDIATE" | "DAILY_DIGEST" | "WEEKLY" | "ONCE";
  time?: string;
};

export async function listNotificationRules(eventId?: number) {
  try {
    return await prisma.notificationRule.findMany({
      where: eventId ? { eventId } : undefined,
      include: { event: true },
      orderBy: { ruleName: "asc" },
    });
  } catch {
    return [];
  }
}

export async function getNotificationRule(id: number) {
  try {
    return await prisma.notificationRule.findUnique({
      where: { id },
      include: { event: true },
    });
  } catch {
    return null;
  }
}

export async function getActiveRulesForEvent(eventId: number) {
  try {
    return await prisma.notificationRule.findMany({
      where: { eventId, status: "active" },
    });
  } catch {
    return [];
  }
}

export async function createNotificationRule(input: NotificationRuleInput) {
  return await prisma.notificationRule.create({ data: input });
}

export async function updateNotificationRule(id: number, input: Partial<NotificationRuleInput>) {
  return await prisma.notificationRule.update({ where: { id }, data: input });
}

/** Evaluate a rule's conditionJson against event data */
export function evaluateRuleCondition(
  conditionJson: string,
  data: Record<string, unknown>,
): boolean {
  if (!conditionJson || conditionJson === "{}") return true;
  try {
    const condition = JSON.parse(conditionJson) as {
      field?: string;
      operator?: string;
      value?: unknown;
    };
    if (!condition.field || !condition.operator) return true;
    const actual = data[condition.field];
    const expected = condition.value;
    switch (condition.operator) {
      case "eq":  return actual === expected;
      case "neq": return actual !== expected;
      case "gt":  return Number(actual) > Number(expected);
      case "gte": return Number(actual) >= Number(expected);
      case "lt":  return Number(actual) < Number(expected);
      case "lte": return Number(actual) <= Number(expected);
      case "contains": return String(actual).includes(String(expected));
      default:    return true;
    }
  } catch {
    return true;
  }
}
