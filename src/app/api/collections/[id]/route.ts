import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { logSoftDelete } from "@/lib/audit-log";
import { parseMoneyInput, moneyToNumberForDisplay } from "@/lib/money";

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
      customerId: body.customerId !== undefined ? (body.customerId ? Number(body.customerId) : null) : undefined,
      invoiceValueLakhs: body.invoiceValueLakhs !== undefined ? parseMoneyInput(body.invoiceValueLakhs) : undefined,
      amountWithoutGstLakhs: body.amountWithoutGstLakhs !== undefined ? parseMoneyInput(body.amountWithoutGstLakhs) : undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      paymentReceivedDate: body.paymentReceivedDate !== undefined
        ? (body.paymentReceivedDate ? new Date(body.paymentReceivedDate) : null)
        : undefined,
      amountReceivedLakhs: body.amountReceivedLakhs !== undefined ? parseMoneyInput(body.amountReceivedLakhs) : undefined,
      collectionStatus: body.collectionStatus,
      remarks: body.remarks,
    },
    include: { employee: { select: { name: true } } },
  });
  return NextResponse.json({
    ...row,
    invoiceValueLakhs: moneyToNumberForDisplay(row.invoiceValueLakhs),
    amountWithoutGstLakhs: moneyToNumberForDisplay(row.amountWithoutGstLakhs),
    amountReceivedLakhs: moneyToNumberForDisplay(row.amountReceivedLakhs),
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const numId = Number(id);
  const existing = await prisma.collection.findFirst({ where: { id: numId, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!session.user.isManager && existing.employeeId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Step 3D: existing Collections UI sends no request body on DELETE — the
  // reason field is supported but optional, falling back to a default so the
  // current delete button keeps working unmodified (see SOFT_DELETE_DECISION_LOG.md).
  const body = await req.json().catch(() => ({} as { deleteReason?: string }));
  const deleteReason = (body.deleteReason ?? "").toString().trim() || "Deleted by user";
  const empId = session.user.employeeId!;

  await prisma.collection.update({
    where: { id: numId },
    data: { deletedAt: new Date(), deletedById: empId, deleteReason },
  });

  await logSoftDelete({
    entityType: "collection",
    entityId: numId,
    performedById: empId,
    reason: deleteReason,
    oldValues: {
      invoiceNo:         existing.invoiceNo,
      customerName:      existing.customerName,
      invoiceValueLakhs: existing.invoiceValueLakhs,
      dueDate:           existing.dueDate,
      collectionStatus:  existing.collectionStatus,
      employeeId:        existing.employeeId,
    },
  });

  return NextResponse.json({ success: true });
}
