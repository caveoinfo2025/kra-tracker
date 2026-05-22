import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  const { id } = await params;
  await prisma.dailyUpdate.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
