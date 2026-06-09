import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { listQueue, updateQueueStatus, processNotificationQueue } from "@/lib/communication-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status  = req.nextUrl.searchParams.get("status")  ?? undefined;
  const channel = req.nextUrl.searchParams.get("channel") ?? undefined;
  const eventId = req.nextUrl.searchParams.get("eventId");

  const queue = await listQueue({
    ...(status  ? { status }  : {}),
    ...(channel ? { channel } : {}),
    ...(eventId ? { eventId: Number(eventId) } : {}),
  });
  return NextResponse.json(queue);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  // action: "process" → run queue processor
  if (body.action === "process") {
    const result = await processNotificationQueue(body.ids);
    return NextResponse.json(result);
  }

  // action: "cancel" → cancel a specific queue item
  if (body.action === "cancel" && body.id) {
    await updateQueueStatus(Number(body.id), "CANCELLED");
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
