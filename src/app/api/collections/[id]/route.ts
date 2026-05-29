import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.collection.findUnique({ where: { id: Number(id) }, select: { employeeId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!session.user.isManager && existing.employeeId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const row = await prisma.collection.update({
    where: { id: Number(id) },
    data: {
      invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : undefined,
      invoiceNo: body.invoiceNo,
      customerName: body.customerName,
      invoiceValueLakhs: body.invoiceValueLakhs !== undefined ? Number(body.invoiceValueLakhs) : undefined,
      amountWithoutGstLakhs: body.amountWithoutGstLakhs !== undefined ? Number(body.amountWithoutGstLakhs) : undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      paymentReceivedDate: body.paymentReceivedDate !== undefined
        ? (body.paymentReceivedDate ? new Date(body.paymentReceivedDate) : null)
        : undefined,
      amountReceivedLakhs: body.amountReceivedLakhs !== undefined ? Number(body.amountReceivedLakhs) : undefined,
      collectionStatus: body.collectionStatus,
      remarks: body.remarks,
    },
    include: { employee: { select: { name: true } } },
  });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.collection.findUnique({ where: { id: Number(id) }, select: { employeeId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!session.user.isManager && existing.employeeId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.collection.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
