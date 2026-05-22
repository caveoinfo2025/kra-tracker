import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/../auth";

export async function GET(req: Request) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const empId = searchParams.get("employeeId");

  const where = session?.user?.isManager
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
  const session = await auth();
  const body = await req.json();
  const employeeId = session?.user?.isManager
    ? Number(body.employeeId ?? session?.user?.employeeId)
    : session?.user?.employeeId;

  if (!employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.collection.create({
    data: {
      employeeId,
      invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : new Date(),
      invoiceNo: body.invoiceNo ?? "",
      customerName: body.customerName,
      invoiceValueLakhs: Number(body.invoiceValueLakhs),
      dueDate: new Date(body.dueDate),
      amountReceivedLakhs: Number(body.amountReceivedLakhs ?? 0),
      collectionStatus: body.collectionStatus ?? "Pending",
      remarks: body.remarks ?? "",
    },
    include: { employee: { select: { name: true } } },
  });
  return NextResponse.json(row, { status: 201 });
}
