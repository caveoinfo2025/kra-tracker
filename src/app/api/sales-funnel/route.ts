import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export async function GET(req: Request) {
  const session = await getSession();
  const { searchParams } = new URL(req.url);
  const empId = searchParams.get("employeeId");

  const where = session?.user?.isManager
    ? empId ? { employeeId: Number(empId) } : {}
    : { employeeId: session?.user?.employeeId };

  const rows = await prisma.salesFunnel.findMany({
    where,
    include: { employee: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await getSession();
  const body = await req.json();
  const employeeId = session?.user?.isManager
    ? Number(body.employeeId ?? session?.user?.employeeId)
    : session?.user?.employeeId;

  if (!employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const count = await prisma.salesFunnel.count();
  const row = await prisma.salesFunnel.create({
    data: {
      employeeId,
      opportunityId: `SF-${String(count + 1).padStart(3, "0")}`,
      createdDate: body.createdDate ? new Date(body.createdDate) : new Date(),
      territory: body.territory ?? "",
      customerName: body.customerName,
      solutionCategory: body.solutionCategory ?? "",
      opportunityName: body.opportunityName,
      stage: body.stage ?? "Lead",
      dealValueLakhs: Number(body.dealValueLakhs ?? 0),
      billingValueLakhs: Number(body.billingValueLakhs ?? 0),
      grossProfitPct: Number(body.grossProfitPct ?? 0),
      proposalDate: body.proposalDate ? new Date(body.proposalDate) : null,
      expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
      closedDate: body.closedDate
        ? new Date(body.closedDate)
        : (body.stage === "Closed Won" ? new Date() : null),
      probabilityPct: Number(body.probabilityPct ?? 0),
      status: body.status ?? "Active",
      newCustomerFlag: Boolean(body.newCustomerFlag),
      pocFlag: Boolean(body.pocFlag),
      remarks: body.remarks ?? "",
    },
    include: { employee: { select: { name: true } } },
  });
  return NextResponse.json(row, { status: 201 });
}

