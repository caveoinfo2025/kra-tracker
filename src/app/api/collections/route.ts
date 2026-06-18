import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { canSeeAllCollections } from "@/lib/roles";

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!canSeeAllCollections(session?.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { ids } = await req.json() as { ids: number[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No ids provided" }, { status: 400 });
  }
  await prisma.collection.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ success: true, deleted: ids.length });
}

export async function GET(req: Request) {
  const session = await getSession();
  const { searchParams } = new URL(req.url);
  const empId = searchParams.get("employeeId");

  const isManagerOrAccounts = canSeeAllCollections(session?.user);

  const where = isManagerOrAccounts
    ? empId ? { employeeId: Number(empId) } : {}
    : { employeeId: session?.user?.employeeId };

  const rows = await prisma.collection.findMany({
    where,
    include: { employee: { select: { name: true } } },
    orderBy: { invoiceDate: "desc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await getSession();
  const body = await req.json();
  const isManagerOrAccounts = canSeeAllCollections(session?.user);
  const employeeId = isManagerOrAccounts
    ? Number(body.employeeId ?? session?.user?.employeeId)
    : session?.user?.employeeId;

  if (!employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.collection.create({
    data: {
      employeeId,
      invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : new Date(),
      invoiceNo: body.invoiceNo ?? "",
      customerName: body.customerName,
      customerId: body.customerId ? Number(body.customerId) : null,
      invoiceValueLakhs: Number(body.invoiceValueLakhs),
      amountWithoutGstLakhs: Number(body.amountWithoutGstLakhs ?? 0),
      dueDate: new Date(body.dueDate),
      paymentReceivedDate: body.paymentReceivedDate ? new Date(body.paymentReceivedDate) : null,
      amountReceivedLakhs: Number(body.amountReceivedLakhs ?? 0),
      collectionStatus: body.collectionStatus ?? "Pending",
      remarks: body.remarks ?? "",
    },
    include: { employee: { select: { name: true } } },
  });
  return NextResponse.json(row, { status: 201 });
}
