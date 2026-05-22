import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const row = await prisma.collection.update({
    where: { id: Number(id) },
    data: {
      invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : undefined,
      invoiceNo: body.invoiceNo,
      customerName: body.customerName,
      invoiceValueLakhs: body.invoiceValueLakhs !== undefined ? Number(body.invoiceValueLakhs) : undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      amountReceivedLakhs: body.amountReceivedLakhs !== undefined ? Number(body.amountReceivedLakhs) : undefined,
      collectionStatus: body.collectionStatus,
      remarks: body.remarks,
    },
  });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.collection.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
