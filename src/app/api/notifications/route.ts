/**
 * GET   /api/notifications        — current user's notifications (newest first)
 * PATCH /api/notifications        — mark all as read  { markAllRead: true }
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.employeeId) return NextResponse.json({ notifications: [], unread: 0 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Number(searchParams.get("limit") ?? "30"));

  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId: session.user.employeeId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({
      where: { recipientId: session.user.employeeId, isRead: false },
    }),
  ]);

  return NextResponse.json({ notifications, unread });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body.markAllRead) {
    await prisma.notification.updateMany({
      where: { recipientId: session.user.employeeId, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ ok: true });
  }
  if (body.id) {
    await prisma.notification.updateMany({
      where: { id: Number(body.id), recipientId: session.user.employeeId },
      data: { isRead: true },
    });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
}
