import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.leadGeneration.findUnique({ where: { id: Number(id) }, select: { employeeId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!session.user.isManager && existing.employeeId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const row = await prisma.leadGeneration.update({
    where: { id: Number(id) },
    data: {
      date: body.date ? new Date(body.date) : undefined,
      territory: body.territory,
      leadSource: body.leadSource,
      customerName: body.customerName,
      customerId: body.customerId !== undefined ? (body.customerId ? Number(body.customerId) : null) : undefined,
      contactPerson: body.contactPerson,
      phoneEmail: body.phoneEmail,
      activityType: body.activityType,
      activityCount: body.activityCount !== undefined ? Number(body.activityCount) : undefined,
      leadStatus: body.leadStatus,
      qualifiedFlag: body.qualifiedFlag !== undefined ? Boolean(body.qualifiedFlag) : undefined,
      nextActionDate: body.nextActionDate ? new Date(body.nextActionDate) : null,
      remarks: body.remarks,
    },
    include: {
      employee: { select: { name: true } },
      customer: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.leadGeneration.findUnique({ where: { id: Number(id) }, select: { employeeId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!session.user.isManager && existing.employeeId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.leadGeneration.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
