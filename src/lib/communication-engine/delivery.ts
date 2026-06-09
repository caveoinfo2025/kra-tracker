import prisma from "@/lib/prisma";
import { updateQueueStatus } from "./queue";

/**
 * Process the notification queue.
 *
 * Phase 11 rules:
 *  - IN_APP  → create a Notification row + mark queue SENT immediately
 *  - EMAIL / SMS / WHATSAPP / TEAMS → keep PENDING (real providers not wired yet)
 *    unless COMM_MOCK_MODE=true env var is set, in which case mark SENT + log mock response
 */
export async function processNotificationQueue(queueIds?: number[]): Promise<{
  processed: number;
  sent: number;
  pending: number;
  failed: number;
}> {
  const mockMode = process.env.COMM_MOCK_MODE === "true";
  let processed = 0, sent = 0, pending = 0, failed = 0;

  try {
    const where = queueIds?.length
      ? { id: { in: queueIds }, status: "PENDING" }
      : { status: "PENDING" as const };

    const items = await prisma.notificationQueue.findMany({
      where,
      include: { event: true, template: true },
      take: 100,
    });

    for (const item of items) {
      processed++;
      try {
        if (item.channel === "IN_APP") {
          // Create a real in-app Notification row if we have a recipient
          if (item.recipientUserId) {
            const payload = safeParseJson(item.payloadJson);
            await prisma.notification.create({
              data: {
                recipientId: item.recipientUserId,
                type:  item.event.eventCode,
                title: String(payload.subject ?? item.event.eventName),
                body:  String(payload.body   ?? ""),
                link:  String(payload.link   ?? ""),
              },
            });
          }
          await updateQueueStatus(item.id, "SENT", { sentAt: new Date() });
          await logDelivery(item.id, "IN_APP", "in_app", "SENT", "{}");
          sent++;
        } else {
          // External channel — not wired in Phase 11
          if (mockMode) {
            await updateQueueStatus(item.id, "SENT", { sentAt: new Date() });
            await logDelivery(item.id, item.channel, "mock", "SENT",
              JSON.stringify({ note: "COMM_MOCK_MODE=true — not actually sent" }));
            sent++;
          } else {
            // Leave as PENDING; external send will be wired in Phase 12
            await logDelivery(item.id, item.channel, item.channel.toLowerCase(), "PENDING",
              JSON.stringify({ note: "External channel not yet configured" }));
            pending++;
          }
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        await updateQueueStatus(item.id, "FAILED", { failureReason: reason }).catch(() => null);
        await logDelivery(item.id, item.channel, "", "FAILED", JSON.stringify({ error: reason }));
        failed++;
      }
    }
  } catch {
    // processQueue must never throw
  }

  return { processed, sent, pending, failed };
}

async function logDelivery(
  queueId: number,
  channel: string,
  provider: string,
  status: string,
  responseJson: string,
) {
  try {
    await prisma.notificationDeliveryLog.create({
      data: { queueId, channel, provider, status, responseJson },
    });
  } catch {
    // audit must never block
  }
}

export async function listDeliveryLogs(filters?: {
  channel?: string;
  status?: string;
  queueId?: number;
}) {
  try {
    return await prisma.notificationDeliveryLog.findMany({
      where: filters,
      include: { queue: { include: { event: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
  } catch {
    return [];
  }
}

function safeParseJson(s: string): Record<string, unknown> {
  try { return JSON.parse(s); } catch { return {}; }
}
