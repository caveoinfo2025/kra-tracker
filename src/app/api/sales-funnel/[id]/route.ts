import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
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
  const { id } = await params;
  await prisma.salesFunnel.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
