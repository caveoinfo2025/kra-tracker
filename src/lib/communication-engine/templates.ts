import prisma from "@/lib/prisma";

export type NotificationTemplateInput = {
  eventId?: number;
  channelId?: number;
  templateName: string;
  subject?: string;
  body?: string;
  variablesJson?: string;
  status?: string;
};

export async function listNotificationTemplates(eventId?: number) {
  try {
    return await prisma.notificationTemplate.findMany({
      where: eventId ? { eventId } : undefined,
      include: { event: true, channel: true },
      orderBy: { templateName: "asc" },
    });
  } catch {
    return [];
  }
}

export async function getNotificationTemplate(id: number) {
  try {
    return await prisma.notificationTemplate.findUnique({
      where: { id },
      include: { event: true, channel: true },
    });
  } catch {
    return null;
  }
}

export async function createNotificationTemplate(input: NotificationTemplateInput) {
  return await prisma.notificationTemplate.create({ data: input });
}

export async function updateNotificationTemplate(id: number, input: Partial<NotificationTemplateInput>) {
  return await prisma.notificationTemplate.update({ where: { id }, data: input });
}

/** Replace {{variable}} placeholders in subject and body */
export function renderTemplate(
  template: { subject: string; body: string },
  variables: Record<string, string>,
): { subject: string; body: string } {
  const replace = (text: string) =>
    text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? `{{${key}}}`);
  return {
    subject: replace(template.subject),
    body:    replace(template.body),
  };
}

/** Extract all {{variable}} names from a template body/subject */
export function extractVariables(text: string): string[] {
  const matches = text.matchAll(/\{\{(\w+)\}\}/g);
  return [...new Set([...matches].map((m) => m[1]))];
}
