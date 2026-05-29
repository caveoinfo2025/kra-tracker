import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.dailyUpdate.findUnique({ where: { id: Number(id) }, select: { employeeId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!session.user.isManager && existing.employeeId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const row = await prisma.dailyUpdate.update({
    where: { id: Number(id) },
    data: {
      date: body.date ? new Date(body.date) : undefined,
      topUpdates: body.topUpdates,
      keyMovement: body.keyMovement,
      blockers: body.blockers,
      topDealThisWeek: body.topDealThisWeek,
      managerSupportRequired: body.managerSupportRequired !== undefined ? Boolean(body.managerSupportRequired) : undefined,
      updateStatus: body.updateStatus,
    },
  });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.dailyUpdate.findUnique({ where: { id: Number(id) }, select: { employeeId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!session.user.isManager && existing.employeeId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.dailyUpdate.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
