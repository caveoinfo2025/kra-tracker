import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { canManageFinance } from "@/lib/roles";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

/** Serialize a Float (₹ Lakhs, DOUBLE) as a 2-decimal string. */
function fmtMoney(v: number): string {
  return (Math.round(v * 100) / 100).toFixed(2);
}

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

function mapApprovalStatus(status: string): string {
  switch (status) {
    case "draft":     return "DRAFT";
    case "submitted": return "PENDING_APPROVAL";
    case "approved":  return "APPROVED";
    case "rejected":  return "REJECTED";
    case "paid":      return "PAID";
    default:          return status.toUpperCase();
  }
}

function deriveExpenseType(expense: { customerName: string; vendorId: number | null }): string {
  if (expense.customerName) return "CUSTOMER_EXPENSE";
  if (expense.vendorId !== null) return "VENDOR_EXPENSE";
  return "GENERAL_EXPENSE";
}

function parseAttachments(json: string): { fileName: string; fileUrl: string }[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * GET /api/finance/expenses
 *
 * Read-only paginated expense register with summary aggregations.
 * Does NOT modify, replace, or conflict with GET /api/expenses (mobile route).
 *
 * Query params:
 *   page         — 1-based (default 1)
 *   pageSize     — rows per page (default 25, max 100)
 *   status       — draft | submitted | approved | rejected | paid
 *   category     — Expense.category exact match
 *   employeeId   — filter by employee (managers only — ignored for non-managers)
 *   vendorId     — filter by vendor
 *   dateFrom     — YYYY-MM-DD inclusive
 *   dateTo       — YYYY-MM-DD inclusive
 *   search       — text search on narration, category, customerName
 *
 * Permission:
 *   canManageFinance → all expenses
 *   Regular employee → own expenses only (same RBAC as /api/expenses)
 *
 * Money: returned as 2-decimal strings in ₹ Lakhs (same unit as DB).
 * UI layer converts to ₹ rupees (× 100,000) for display.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isFinanceManager = canManageFinance(session.user);
  const empId = session.user.employeeId!;

  const sp = req.nextUrl.searchParams;

  // ── Pagination ────────────────────────────────────────────────────────────────
  const page     = Math.max(1, Number(sp.get("page")     ?? "1"));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(sp.get("pageSize") ?? String(DEFAULT_PAGE_SIZE))),
  );

  // ── Filter params ─────────────────────────────────────────────────────────────
  const statusParam    = (sp.get("status")   ?? "").trim().toLowerCase() || null;
  const categoryParam  = (sp.get("category") ?? "").trim()              || null;
  const searchParam    = (sp.get("search")   ?? "").trim()              || null;

  const employeeIdRaw = sp.get("employeeId");
  const vendorIdRaw   = sp.get("vendorId");
  const dateFromParam = sp.get("dateFrom");
  const dateToParam   = sp.get("dateTo");

  let employeeIdFilter: number | undefined;
  if (employeeIdRaw) {
    const n = Number(employeeIdRaw);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
      return NextResponse.json({ error: "Invalid employeeId" }, { status: 400 });
    }
    employeeIdFilter = n;
  }

  let vendorIdFilter: number | undefined;
  if (vendorIdRaw) {
    const n = Number(vendorIdRaw);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
      return NextResponse.json({ error: "Invalid vendorId" }, { status: 400 });
    }
    vendorIdFilter = n;
  }

  let dateFrom: Date | undefined;
  let dateTo: Date | undefined;

  if (dateFromParam) {
    dateFrom = new Date(dateFromParam + "T00:00:00.000Z");
    if (isNaN(dateFrom.getTime())) {
      return NextResponse.json({ error: "Invalid dateFrom — expected YYYY-MM-DD" }, { status: 400 });
    }
  }
  if (dateToParam) {
    dateTo = new Date(dateToParam + "T23:59:59.999Z");
    if (isNaN(dateTo.getTime())) {
      return NextResponse.json({ error: "Invalid dateTo — expected YYYY-MM-DD" }, { status: 400 });
    }
  }
  if (dateFrom && dateTo && dateFrom > dateTo) {
    return NextResponse.json({ error: "dateFrom must not be after dateTo" }, { status: 400 });
  }

  // ── RBAC scope ────────────────────────────────────────────────────────────────
  // Finance managers see all; everyone else sees only their own.
  // Explicit employeeId filter is allowed only for finance managers.
  const ownerFilter = isFinanceManager
    ? (employeeIdFilter !== undefined ? { employeeId: employeeIdFilter } : {})
    : { employeeId: empId };

  const dateFilter = (dateFrom || dateTo)
    ? { expenseDate: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } }
    : {};

  // ── Summary scope (date + owner scope; no status / search / vendor filter) ───
  const summaryWhere = { ...ownerFilter, ...dateFilter };

  // Today boundaries (UTC)
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);

  // Run summary aggregations in parallel
  const [
    sumTotal,
    sumToday,
    sumPending,
    sumApproved,
    sumDraft,
    sumCustomer,
    sumGst,
  ] = await Promise.all([
    prisma.expense.aggregate({
      where: summaryWhere,
      _sum: { amountLakhs: true, gstAmountLakhs: true },
    }),
    prisma.expense.aggregate({
      where: { ...summaryWhere, expenseDate: { gte: todayStart, lte: todayEnd } },
      _sum: { amountLakhs: true, gstAmountLakhs: true },
    }),
    prisma.expense.aggregate({
      where: { ...summaryWhere, status: "submitted" },
      _sum: { amountLakhs: true, gstAmountLakhs: true },
    }),
    prisma.expense.aggregate({
      where: { ...summaryWhere, status: { in: ["approved", "paid"] } },
      _sum: { amountLakhs: true, gstAmountLakhs: true },
    }),
    prisma.expense.aggregate({
      where: { ...summaryWhere, status: "draft" },
      _sum: { amountLakhs: true, gstAmountLakhs: true },
    }),
    prisma.expense.aggregate({
      where: { ...summaryWhere, customerName: { not: "" } },
      _sum: { amountLakhs: true, gstAmountLakhs: true },
    }),
    prisma.expense.aggregate({
      where: { ...summaryWhere, gstAmountLakhs: { gt: 0 } },
      _sum: { gstAmountLakhs: true },
    }),
  ]);

  const totalExpenses         = r2((sumTotal._sum.amountLakhs    ?? 0) + (sumTotal._sum.gstAmountLakhs    ?? 0));
  const todayExpenses         = r2((sumToday._sum.amountLakhs    ?? 0) + (sumToday._sum.gstAmountLakhs    ?? 0));
  const pendingApprovalAmount = r2((sumPending._sum.amountLakhs  ?? 0) + (sumPending._sum.gstAmountLakhs  ?? 0));
  const approvedExpenses      = r2((sumApproved._sum.amountLakhs ?? 0) + (sumApproved._sum.gstAmountLakhs ?? 0));
  const customerExpenses      = r2((sumCustomer._sum.amountLakhs ?? 0) + (sumCustomer._sum.gstAmountLakhs ?? 0));
  const gstInputAmount        = r2(sumGst._sum.gstAmountLakhs ?? 0);
  // employeeClaimsPending: draft + submitted (best-effort — no expenseType field in schema)
  const employeeClaimsPending = r2(
    pendingApprovalAmount +
    (sumDraft._sum.amountLakhs ?? 0) +
    (sumDraft._sum.gstAmountLakhs ?? 0),
  );

  // ── List query ────────────────────────────────────────────────────────────────
  const listWhere: Record<string, unknown> = {
    ...ownerFilter,
    ...dateFilter,
    ...(statusParam        ? { status:   statusParam }       : {}),
    ...(categoryParam      ? { category: categoryParam }     : {}),
    ...(vendorIdFilter !== undefined ? { vendorId: vendorIdFilter } : {}),
  };

  if (searchParam) {
    listWhere.OR = [
      { narration:    { contains: searchParam } },
      { category:     { contains: searchParam } },
      { customerName: { contains: searchParam } },
    ];
  }

  const [total, rawExpenses] = await Promise.all([
    prisma.expense.count({ where: listWhere }),
    prisma.expense.findMany({
      where:   listWhere,
      include: {
        employee:   { select: { name: true } },
        vendor:     { select: { name: true } },
        voucher:    { select: { voucherNo: true } },
        approvedBy: { select: { name: true } },
      },
      orderBy: { expenseDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  const expenses = rawExpenses.map((e) => ({
    id:             String(e.id),
    expenseDate:    e.expenseDate.toISOString().slice(0, 10),
    expenseNumber:  `EXP/26-27/${String(e.id).padStart(5, "0")}`,
    expenseType:    deriveExpenseType(e),
    category:       e.category,
    subCategory:    null,
    description:    e.narration,
    customerName:   e.customerName || null,
    vendorName:     e.vendor?.name  ?? null,
    employeeName:   e.employee.name,
    paymentMode:    null,          // paymentMode field not yet in schema
    accountName:    null,          // finAccountId field not yet in schema
    baseAmount:     fmtMoney(e.amountLakhs),
    gstAmount:      fmtMoney(e.gstAmountLakhs),
    totalAmount:    fmtMoney(r2(e.amountLakhs + e.gstAmountLakhs)),
    voucherNumber:  e.voucher?.voucherNo ?? null,
    approvalStatus: mapApprovalStatus(e.status),
    paymentStatus:  e.status === "paid" ? "PAID" : "UNPAID",
    billAvailable:  parseAttachments(e.attachmentsJson).length > 0,
    gstApplicable:  e.gstRate > 0,
    createdBy:      e.employee.name,
  }));

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        totalExpenses:          fmtMoney(totalExpenses),
        todayExpenses:          fmtMoney(todayExpenses),
        pendingApprovalAmount:  fmtMoney(pendingApprovalAmount),
        approvedExpenses:       fmtMoney(approvedExpenses),
        employeeClaimsPending:  fmtMoney(employeeClaimsPending),
        customerExpenses:       fmtMoney(customerExpenses),
        gstInputAmount:         fmtMoney(gstInputAmount),
      },
      expenses,
      pagination: { page, pageSize, total, totalPages },
    },
  });
}
