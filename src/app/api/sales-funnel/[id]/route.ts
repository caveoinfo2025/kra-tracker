import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.salesFunnel.findUnique({
    where: { id: Number(id) },
    select: { closedDate: true, poDate: true, employeeId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!session.user.isManager && existing.employeeId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  // Resolve effective PO date (incoming value, else keep existing)
  const poDateIn = body.poDate !== undefined
    ? (body.poDate ? new Date(body.poDate) : null)
    : existing.poDate;

  // PO Date is mandatory for Closed Won orders
  if (body.stage === "Closed Won" && !poDateIn) {
    return NextResponse.json({ error: "PO Date is required for Closed Won orders" }, { status: 400 });
  }

  // closedDate: for Closed Won mirror the PO date; otherwise honour explicit closedDate
  let closedDate: Date | null | undefined = undefined;
  if (body.stage === "Closed Won") {
    closedDate = poDateIn;
  } else if (body.closedDate !== undefined) {
    closedDate = body.closedDate ? new Date(body.closedDate) : null;
  }

  const row = await prisma.salesFunnel.update({
    where: { id: Number(id) },
    data: {
      customerName: body.customerName,
      customerId: body.customerId !== undefined ? (body.customerId ? Number(body.customerId) : null) : undefined,
      solutionCategory: body.solutionCategory,
      opportunityName: body.opportunityName,
      stage: body.stage,
      dealValueLakhs: body.dealValueLakhs !== undefined ? Number(body.dealValueLakhs) : undefined,
      billingValueLakhs: body.billingValueLakhs !== undefined ? Number(body.billingValueLakhs) : undefined,
      grossProfitPct: body.grossProfitPct !== undefined ? Number(body.grossProfitPct) : undefined,
      proposalDate: body.proposalDate ? new Date(body.proposalDate) : undefined,
      expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : undefined,
      poDate: body.poDate !== undefined ? poDateIn : undefined,
      closedDate: closedDate,
      probabilityPct: body.probabilityPct !== undefined ? Number(body.probabilityPct) : undefined,
      status: body.status,
      newCustomerFlag: body.newCustomerFlag !== undefined ? Boolean(body.newCustomerFlag) : undefined,
      pocFlag: body.pocFlag !== undefined ? Boolean(body.pocFlag) : undefined,
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
  const existing = await prisma.salesFunnel.findUnique({ where: { id: Number(id) }, select: { employeeId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!session.user.isManager && existing.employeeId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.salesFunnel.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
