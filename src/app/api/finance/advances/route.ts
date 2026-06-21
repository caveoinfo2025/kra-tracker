import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { canViewAllFinanceAdvances } from "@/lib/finance/access";
import { startApproval, getWorkflowByCode } from "@/lib/workflow-engine";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

function fmt(v: number): string {
  return r2(v).toFixed(2);
}

/**
 * GET /api/finance/advances
 *
 * Lists EmployeeAdvance records with summary aggregations.
 * Finance/Advance/VIEW (temporary canManageFinance() fallback) sees all;
 * others see only their own.
 *
 * Query params:
 *   page, pageSize
 *   status      — pending|approved|disbursed|settled|rejected
 *   category    — Customer Project|Travel|Office Supplies|Training|Medical|Other
 *   employeeId  — filter by employee (managers only)
 *   dateFrom    — YYYY-MM-DD (requestDate gte)
 *   dateTo      — YYYY-MM-DD (requestDate lte)
 *   search      — text search on purpose
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isFinMgr = await canViewAllFinanceAdvances(session);
  const empId    = session.user.employeeId!;
  const sp       = req.nextUrl.searchParams;

  const page     = Math.max(1, Number(sp.get("page")     ?? "1"));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(sp.get("pageSize") ?? String(DEFAULT_PAGE_SIZE))));

  const statusParam   = (sp.get("status")   ?? "").trim().toLowerCase() || null;
  const categoryParam = (sp.get("category") ?? "").trim() || null;
  const searchParam   = (sp.get("search")   ?? "").trim() || null;
  const dateFromP     = sp.get("dateFrom");
  const dateToP       = sp.get("dateTo");
  const empIdRaw      = sp.get("employeeId");

  let employeeIdFilter: number | undefined;
  if (empIdRaw && isFinMgr) {
    const n = Number(empIdRaw);
    if (Number.isFinite(n) && Number.isInteger(n) && n > 0) employeeIdFilter = n;
  }

  let dateFrom: Date | undefined;
  let dateTo: Date | undefined;
  if (dateFromP) {
    dateFrom = new Date(dateFromP + "T00:00:00.000Z");
    if (isNaN(dateFrom.getTime())) return NextResponse.json({ error: "Invalid dateFrom" }, { status: 400 });
  }
  if (dateToP) {
    dateTo = new Date(dateToP + "T23:59:59.999Z");
    if (isNaN(dateTo.getTime())) return NextResponse.json({ error: "Invalid dateTo" }, { status: 400 });
  }

  const ownerWhere = isFinMgr
    ? (employeeIdFilter !== undefined ? { employeeId: employeeIdFilter } : {})
    : { employeeId: empId };

  const dateWhere = (dateFrom || dateTo)
    ? { requestDate: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } }
    : {};

  const now        = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  const base = ownerWhere;

  const [
    sumMonth, sumPending, sumApproved, sumOutstanding, sumSettled, sumRejected,
    cntPending, cntApproved, cntOutstanding,
  ] = await Promise.all([
    prisma.employeeAdvance.aggregate({ where: { ...base, requestDate: { gte: monthStart, lte: monthEnd } }, _sum: { amountLakhs: true } }),
    prisma.employeeAdvance.aggregate({ where: { ...base, status: "pending"   }, _sum: { amountLakhs: true } }),
    prisma.employeeAdvance.aggregate({ where: { ...base, status: "approved"  }, _sum: { amountLakhs: true } }),
    prisma.employeeAdvance.aggregate({ where: { ...base, status: "disbursed" }, _sum: { balanceLakhs: true } }),
    prisma.employeeAdvance.aggregate({ where: { ...base, status: "settled"   }, _sum: { settledAmountLakhs: true } }),
    prisma.employeeAdvance.aggregate({ where: { ...base, status: "rejected"  }, _sum: { amountLakhs: true } }),
    prisma.employeeAdvance.count({ where: { ...base, status: "pending"   } }),
    prisma.employeeAdvance.count({ where: { ...base, status: "approved"  } }),
    prisma.employeeAdvance.count({ where: { ...base, status: "disbursed" } }),
  ]);

  const listWhere: Record<string, unknown> = { ...ownerWhere, ...dateWhere };
  if (statusParam)   listWhere.status   = statusParam;
  if (categoryParam) listWhere.category = categoryParam;
  if (searchParam)   listWhere.purpose  = { contains: searchParam };

  const [total, rawList] = await Promise.all([
    prisma.employeeAdvance.count({ where: listWhere }),
    prisma.employeeAdvance.findMany({
      where:   listWhere,
      include: {
        employee:   { select: { name: true } },
        approvedBy: { select: { name: true } },
      },
      orderBy: { requestDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const ids = rawList.map((a) => String(a.id));
  const approvalRequests = ids.length > 0
    ? await prisma.approvalRequest.findMany({
        where:  { entityType: "ADVANCE", entityId: { in: ids } },
        select: { id: true, entityId: true, status: true },
      })
    : [];
  const arMap = new Map(approvalRequests.map((ar) => [ar.entityId, ar]));

  const advances = rawList.map((a) => {
    const ar = arMap.get(String(a.id));
    return {
      id:                   a.id,
      advanceNo:            a.advanceNo,
      employeeId:           a.employeeId,
      employeeName:         a.employee.name,
      category:             a.category,
      purpose:              a.purpose,
      amountLakhs:          fmt(a.amountLakhs),
      requestDate:          a.requestDate.toISOString().slice(0, 10),
      requiredByDate:       a.requiredByDate  ? a.requiredByDate.toISOString().slice(0, 10)  : null,
      status:               a.status,
      approvedByName:       a.approvedBy?.name  ?? null,
      approvedAt:           a.approvedAt     ? a.approvedAt.toISOString().slice(0, 10)     : null,
      disbursedDate:        a.disbursedDate  ? a.disbursedDate.toISOString().slice(0, 10)  : null,
      disbursedAmountLakhs: a.disbursedAmountLakhs !== null ? fmt(a.disbursedAmountLakhs) : null,
      disbursedFromType:    a.disbursedFromType,
      settledDate:          a.settledDate    ? a.settledDate.toISOString().slice(0, 10)    : null,
      settledAmountLakhs:   a.settledAmountLakhs !== null ? fmt(a.settledAmountLakhs)     : null,
      balanceLakhs:         fmt(a.balanceLakhs),
      voucherId:            a.voucherId,
      remarks:              a.remarks,
      approvalRequestId:    ar?.id   ?? null,
      approvalStatus:       ar?.status ?? null,
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        totalThisMonth:  fmt(sumMonth._sum.amountLakhs        ?? 0),
        pendingApproval: fmt(sumPending._sum.amountLakhs      ?? 0),
        approved:        fmt(sumApproved._sum.amountLakhs     ?? 0),
        outstanding:     fmt(sumOutstanding._sum.balanceLakhs ?? 0),
        settled:         fmt(sumSettled._sum.settledAmountLakhs ?? 0),
        rejected:        fmt(sumRejected._sum.amountLakhs     ?? 0),
        pendingCount:    cntPending,
        approvedCount:   cntApproved,
        outstandingCount: cntOutstanding,
      },
      advances,
      pagination: { page, pageSize, total, totalPages: total === 0 ? 0 : Math.ceil(total / pageSize) },
    },
  });
}

/**
 * POST /api/finance/advances
 *
 * Creates a new EmployeeAdvance with status "pending" and triggers the
 * ADVANCE_APPROVAL workflow if configured.
 *
 * Body: { category, purpose, amountLakhs, requiredByDate?, remarks? }
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const empId = session.user.employeeId!;

  const body = await req.json() as {
    category?:      string;
    purpose:        string;
    amountLakhs:    number;
    requiredByDate?: string;
    remarks?:       string;
  };

  if (!body.purpose?.trim()) {
    return NextResponse.json({ error: "purpose is required" }, { status: 400 });
  }
  if (typeof body.amountLakhs !== "number" || body.amountLakhs <= 0) {
    return NextResponse.json({ error: "amountLakhs must be a positive number" }, { status: 400 });
  }

  const VALID_CATEGORIES = ["Customer Project", "Travel", "Office Supplies", "Training", "Medical", "Other"];
  const category = VALID_CATEGORIES.includes(body.category ?? "") ? body.category! : "Other";

  // Create with a temporary unique advanceNo; update with proper format after id is known
  const advance = await prisma.employeeAdvance.create({
    data: {
      advanceNo:     `TEMP-${Date.now()}-${empId}`,
      employeeId:    empId,
      category,
      purpose:       body.purpose.trim(),
      amountLakhs:   body.amountLakhs,
      requiredByDate: body.requiredByDate ? new Date(body.requiredByDate + "T00:00:00.000Z") : null,
      remarks:       body.remarks?.trim() ?? "",
      status:        "pending",
    },
  });

  const advanceNo = `CI/ADV/26-27/${String(advance.id).padStart(5, "0")}`;
  await prisma.employeeAdvance.update({ where: { id: advance.id }, data: { advanceNo } });

  let approvalRequestId: number | null = null;
  const wf = await getWorkflowByCode("ADVANCE_APPROVAL");
  if (wf) {
    const ar = await startApproval({
      workflowId:  wf.id,
      entityType:  "ADVANCE",
      entityId:    String(advance.id),
      requestedBy: empId,
      contextJson: JSON.stringify({
        advanceNo,
        category:    advance.category,
        purpose:     advance.purpose,
        amountLakhs: advance.amountLakhs,
      }),
    });
    approvalRequestId = ar?.id ?? null;
  }

  return NextResponse.json(
    { success: true, advance: { ...advance, advanceNo }, approvalRequestId },
    { status: 201 },
  );
}
