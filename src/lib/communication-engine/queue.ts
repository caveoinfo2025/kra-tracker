import prisma from "@/lib/prisma";

export type EnqueueInput = {
  eventId: number;
  templateId?: number;
  recipientUserId?: number;
  channel: string;
  payloadJson: string;
  scheduledAt?: Date;
};

export async function enqueueNotification(input: EnqueueInput) {
  return await prisma.notificationQueue.create({
    data: {
      eventId:         input.eventId,
      templateId:      input.templateId,
      recipientUserId: input.recipientUserId,
      channel:         input.channel,
      payloadJson:     input.payloadJson,
      status:          "PENDING",
      scheduledAt:     input.scheduledAt,
    },
  });
}

export async function listQueue(filters?: {
  status?: string;
  channel?: string;
  eventId?: number;
  recipientUserId?: number;
}) {
  try {
    return await prisma.notificationQueue.findMany({
      where: filters,
      include: { event: true, template: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  } catch {
    return [];
  }
}

export async function getPendingQueue(channel?: string) {
  try {
    return await prisma.notificationQueue.findMany({
      where: {
        status: "PENDING",
        ...(channel ? { channel } : {}),
        scheduledAt: { lte: new Date() },
      },
      include: { event: true, template: true },
      take: 100,
    });
  } catch {
    return [];
  }
}

export async function updateQueueStatus(
  id: number,
  status: "PENDING" | "SENT" | "FAILED" | "CANCELLED",
  extra?: { sentAt?: Date; failureReason?: string },
) {
  return await prisma.notificationQueue.update({
    where: { id },
    data: { status, ...extra },
  });
}

export async function countByStatus() {
  try {
    const rows = await prisma.notificationQueue.groupBy({
      by: ["status"],
      _count: { id: true },
    });
    return Object.fromEntries(rows.map((r) => [r.status, r._count.id]));
  } catch {
    return {};
  }
}
