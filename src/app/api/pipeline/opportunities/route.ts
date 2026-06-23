import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { moneyToNumberForDisplay } from "@/lib/money";

function oppForResponse<T extends {
  value: unknown; dealValueExTax: unknown; netProfitLakhs: unknown;
  lead?: { expectedValue: unknown } | null;
}>(o: T) {
  return {
    ...o,
    value: moneyToNumberForDisplay(o.value as never),
    dealValueExTax: moneyToNumberForDisplay(o.dealValueExTax as never),
    netProfitLakhs: moneyToNumberForDisplay(o.netProfitLakhs as never),
    ...(o.lead ? { lead: { ...o.lead, expectedValue: moneyToNumberForDisplay(o.lead.expectedValue as never) } } : {}),
  };
}

const OPP_INCLUDE = {
  lead: {
    include: {
      assignedTo: { select: { id: true, name: true } },
      createdBy:  { select: { id: true, name: true } },
    },
  },
  _count: { select: { tasks: true, meetings: true } },
} as const;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const stageFilter = searchParams.get("stage") ?? "";
  const empFilter   = searchParams.get("assignedTo") ?? "";
  const search      = searchParams.get("q") ?? "";
  const page        = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit       = Math.min(100, Number(searchParams.get("limit") ?? "50"));

  const isManager = session.user.isManager;
  const empId     = session.user.employeeId;

  // For employees, scope to leads assigned to them
  const leadWhere = {
    ...(isManager ? {} : { assignedToId: empId }),
    ...(empFilter  ? { assignedToId: Number(empFilter) } : {}),
  };

  const where = {
    ...(stageFilter ? { stage: stageFilter } : {}),
    status: "active",
    lead: { ...leadWhere, ...(search ? {
      OR: [
        { companyName:   { contains: search } },
        { title:         { contains: search } },
        { contactPerson: { contains: search } },
      ],
    } : {}) },
  };

  const [total, rows] = await Promise.all([
    prisma.crmOpportunity.count({ where }),
    prisma.crmOpportunity.findMany({
      where,
      include: OPP_INCLUDE,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({ rows: rows.map(oppForResponse), total, page, limit });
}
