import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.salesFunnel.findUnique({
    where: { id: Number(id) },
    select: { closedDate: true, employeeId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!session.user.isManager && existing.employeeId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  let closedDate: Date | null | undefined = undefined;
  if (body.closedDate !== undefined) {
    closedDate = body.closedDate ? new Date(body.closedDate) : null;
  } else if (body.stage === "Closed Won" && !existing.closedDate) {
    closedDate = new Date();
  }

  const row = await prisma.salesFunnel.update({
    where: { id: Number(id) },
    data: {
      customerName: body.customerName,
      solutionCategory: body.solutionCategory,
      opportunityName: body.opportunityName,
      stage: body.stage,
      dealValueLakhs: body.dealValueLakhs !== undefined ? Number(body.dealValueLakhs) : undefined,
      billingValueLakhs: body.billingValueLakhs !== undefined ? Number(body.billingValueLakhs) : undefined,
      grossProfitPct: body.grossProfitPct !== undefined ? Number(body.grossProfitPct) : undefined,
      proposalDate: body.proposalDate ? new Date(body.proposalDate) : undefined,
      expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : undefined,
      closedDate: closedDate,
      probabilityPct: body.probabilityPct !== undefined ? Number(body.probabilityPct) : undefined,
      status: body.status,
      newCustomerFlag: body.newCustomerFlag !== undefined ? Boolean(body.newCustomerFlag) : undefined,
      pocFlag: body.pocFlag !== undefined ? Boolean(body.pocFlag) : undefined,
      remarks: body.remarks,
    },
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
