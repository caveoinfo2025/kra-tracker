import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const row = await prisma.leadGeneration.update({
    where: { id: Number(id) },
    data: {
      date: body.date ? new Date(body.date) : undefined,
      territory: body.territory,
      leadSource: body.leadSource,
      customerName: body.customerName,
      contactPerson: body.contactPerson,
      phoneEmail: body.phoneEmail,
      activityType: body.activityType,
      activityCount: body.activityCount !== undefined ? Number(body.activityCount) : undefined,
      leadStatus: body.leadStatus,
      qualifiedFlag: body.qualifiedFlag !== undefined ? Boolean(body.qualifiedFlag) : undefined,
      nextActionDate: body.nextActionDate ? new Date(body.nextActionDate) : null,
      remarks: body.remarks,
    },
  });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.leadGeneration.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
