import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { canManageFinance } from "@/lib/roles";

// ── Money helpers (consistent with existing Finance APIs) ─────────────────────

/** Serialize a Float (₹ Lakhs, DOUBLE) as a 2-decimal string. */
function fmtMoney(v: number): string {
  return (Math.round(v * 100) / 100).toFixed(2);
}

/** Round to 2 decimal places for safe intermediate arithmetic. */
function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function parseDate(s: string, endOfDay = false): Date | null {
  const suffix = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
  const d = new Date(s + suffix);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Parse a financial year string "26-27" to an absolute date range.
 * Indian FY runs April 1 → March 31.
 */
function parseFY(fy: string): { from: Date; to: Date } | null {
  const m = fy.match(/^(\d{2})-(\d{2})$/);
  if (!m) return null;
  const startYear = 2000 + parseInt(m[1], 10);
  return {
    from: new Date(`${startYear}-04-01T00:00:00.000Z`),
    to:   new Date(`${startYear + 1}-03-31T23:59:59.999Z`),
  };
}

/** Human-readable period label for the response. */
function periodLabel(from: Date, to: Date): string {
  const sameMonth = from.toISOString().slice(0, 7) === to.toISOString().slice(0, 7);
  const fmt = (d: Date, style: "long" | "short") =>
    d.toLocaleDateString("en-IN", { month: style, year: "numeric", timeZone: "UTC" });
  return sameMonth
    ? fmt(from, "long")
    : `${fmt(from, "short")} – ${fmt(to, "short")}`;
}

/**
 * GET /api/finance/dashboard
 *
 * Read-only Finance Dashboard aggregations.
 * All monetary values returned as 2-decimal strings in ₹ Lakhs (same unit as DB).
 * UI layer converts to ₹ rupees (× 100,000) for display.
 *
 * Query params:
 *   dateFrom       — YYYY-MM-DD (inclusive). Defaults to 1st of current month.
 *   dateTo         — YYYY-MM-DD (inclusive). Defaults to last day of current month.
 *   financialYear  — "26-27" overrides dateFrom/dateTo for expense/ledger queries.
 *   branchId       — maps to FinAccount.branchName (no FK branch entity in schema).
 *   accountId      — restricts Ledger cash/bank flow queries to one FinAccount.
 *   departmentId   — no department column on finance models; accepted but ignored.
 *
 * Permission: canManageFinance (Accounts, Operations Head, Manager).
 *
 * Assumptions documented in FINANCE_API_WIRING_PLAN.md § Step 2G.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageFinance(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;

  // ── Period resolution ─────────────────────────────────────────────────────────
  let dateFrom: Date;
  let dateTo: Date;

  const fyParam = (sp.get("financialYear") ?? "").trim();
  if (fyParam) {
    const fy = parseFY(fyParam);
    if (!fy) {
      return NextResponse.json(
        { error: "Invalid financialYear — expected format: 26-27" },
        { status: 400 },
      );
    }
    dateFrom = fy.from;
    dateTo   = fy.to;
  } else {
    const fromParam = sp.get("dateFrom");
    const toParam   = sp.get("dateTo");

    if (fromParam) {
      const d = parseDate(fromParam);
      if (!d) return NextResponse.json({ error: "Invalid dateFrom — expected YYYY-MM-DD" }, { status: 400 });
      dateFrom = d;
    } else {
      const now = new Date();
      dateFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    }

    if (toParam) {
      const d = parseDate(toParam, true);
      if (!d) return NextResponse.json({ error: "Invalid dateTo — expected YYYY-MM-DD" }, { status: 400 });
      dateTo = d;
    } else {
      const now = new Date();
      dateTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    }

    if (dateFrom > dateTo) {
      return NextResponse.json({ error: "dateFrom must not be after dateTo" }, { status: 400 });
    }
  }

  // ── Optional filters ──────────────────────────────────────────────────────────
  // branchId → FinAccount.branchName (string; no FK branch entity in schema)
  const branchParam    = sp.get("branchId") ?? null;
  const accountIdRaw   = sp.get("accountId");
  // departmentId: no dept column on Expense/Ledger — accepted, ignored, documented.

  let accountIdFilter: number | undefined;
  if (accountIdRaw) {
    const n = Number(accountIdRaw);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
      return NextResponse.json({ error: "Invalid accountId" }, { status: 400 });
    }
    accountIdFilter = n;
  }

  // Today boundaries (UTC)
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);

  // ── Base where clauses ────────────────────────────────────────────────────────

  const acctWhere = (type: "cash" | "bank") => ({
    type,
    isActive: true,
    ...(branchParam ? { branchName: branchParam } : {}),
  });

  // Ledger entries restricted to the selected period (and optional single account)
  const ledgerPeriodBase = {
    entryDate: { gte: dateFrom, lte: dateTo },
    ...(accountIdFilter !== undefined ? { accountId: accountIdFilter } : {}),
  };

  // Expense entries restricted to the selected period
  const expensePeriodWhere = { expenseDate: { gte: dateFrom, lte: dateTo } };

  // For 6-month trend: start 5 full months before the first month of dateFrom
  const trendStart = new Date(Date.UTC(dateFrom.getUTCFullYear(), dateFrom.getUTCMonth() - 5, 1));

  // ── Run all aggregations in parallel ─────────────────────────────────────────
  const [
    cashBalAgg,         // 1
    bankBalAgg,         // 2
    todayExpAgg,        // 3
    monthExpAgg,        // 4
    pendingApprCount,   // 5  — from workflow ApprovalRequest engine
    customerExpAgg,     // 6
    advancesAgg,        // 7
    claimsAgg,          // 8
    cashInAgg,          // 9
    cashOutAgg,         // 10
    bankCreditAgg,      // 11
    bankDebitAgg,       // 12
    catBreakdown,       // 13
    trendExpenses,      // 14
    unpaidExpCount,     // 15
    pendingAdvCount,    // 16
    pendingClaimsCount, // 17
  ] = await Promise.all([

    // 1. Cash balance — sum of currentBalance across active cash accounts
    prisma.finAccount.aggregate({
      where: acctWhere("cash"),
      _sum:  { currentBalance: true },
    }),

    // 2. Bank balance — sum of currentBalance across active bank accounts
    prisma.finAccount.aggregate({
      where: acctWhere("bank"),
      _sum:  { currentBalance: true },
    }),

    // 3. Today's expense total (base + GST)
    prisma.expense.aggregate({
      where: { expenseDate: { gte: todayStart, lte: todayEnd } },
      _sum:  { amountLakhs: true, gstAmountLakhs: true },
    }),

    // 4. Period expense total (base + GST)
    prisma.expense.aggregate({
      where: expensePeriodWhere,
      _sum:  { amountLakhs: true, gstAmountLakhs: true },
    }),

    // 5. Pending approvals — uses global Workflow ApprovalRequest engine.
    //    Counts finance entity types in PENDING status.
    //    Falls back safely to 0 if no records exist.
    prisma.approvalRequest.count({
      where: {
        entityType: { in: ["EXPENSE", "ADVANCE", "TRAVEL_CLAIM"] },
        status:     "PENDING",
      },
    }),

    // 6. Customer expenses in period (customerName is denormalized on Expense)
    prisma.expense.aggregate({
      where: { ...expensePeriodWhere, customerName: { not: "" } },
      _sum:  { amountLakhs: true, gstAmountLakhs: true },
    }),

    // 7. Advances outstanding — disbursed advances with uncollected balance.
    //    EmployeeAdvance.balanceLakhs is a CACHED field (disbursed − settled).
    prisma.employeeAdvance.aggregate({
      where: { status: "disbursed" },
      _sum:  { balanceLakhs: true },
    }),

    // 8. Employee claims pending — submitted TravelClaims awaiting reimbursement.
    //    Expense submissions are already captured in pendingApprovals above.
    prisma.travelClaim.aggregate({
      where: { status: "submitted" },
      _sum:  { amountLakhs: true },
    }),

    // 9. Cash In — credits posted to CASH accounts in period.
    //    Convention: Ledger direction="credit" = money arriving in the cash box.
    prisma.ledger.aggregate({
      where: { ...ledgerPeriodBase, account: { type: "cash" }, direction: "credit" },
      _sum:  { amountLakhs: true },
    }),

    // 10. Cash Out — debits on CASH accounts in period.
    prisma.ledger.aggregate({
      where: { ...ledgerPeriodBase, account: { type: "cash" }, direction: "debit" },
      _sum:  { amountLakhs: true },
    }),

    // 11. Bank Credits in period.
    prisma.ledger.aggregate({
      where: { ...ledgerPeriodBase, account: { type: "bank" }, direction: "credit" },
      _sum:  { amountLakhs: true },
    }),

    // 12. Bank Debits in period.
    prisma.ledger.aggregate({
      where: { ...ledgerPeriodBase, account: { type: "bank" }, direction: "debit" },
      _sum:  { amountLakhs: true },
    }),

    // 13. Expense breakdown by category within period (all categories, ordered by amount desc)
    prisma.expense.groupBy({
      by:       ["category"],
      where:    expensePeriodWhere,
      _sum:     { amountLakhs: true, gstAmountLakhs: true },
      _count:   { id: true },
      orderBy:  { _sum: { amountLakhs: "desc" } },
    }),

    // 14. Expenses for the 6-month trend (lightweight: date + amounts only)
    prisma.expense.findMany({
      where:  { expenseDate: { gte: trendStart } },
      select: { expenseDate: true, amountLakhs: true, gstAmountLakhs: true },
    }),

    // 15. Unpaid expenses count — approved but not yet paid
    prisma.expense.count({ where: { status: "approved" } }),

    // 16. Pending advances count — pending or approved (not yet disbursed)
    prisma.employeeAdvance.count({ where: { status: { in: ["pending", "approved"] } } }),

    // 17. Pending travel claims count
    prisma.travelClaim.count({ where: { status: "submitted" } }),
  ]);

  // ── Compute scalar values ─────────────────────────────────────────────────────

  const cashBalance    = cashBalAgg._sum.currentBalance ?? 0;
  const bankBalance    = bankBalAgg._sum.currentBalance ?? 0;
  const todayExp       = r2((todayExpAgg._sum.amountLakhs   ?? 0) + (todayExpAgg._sum.gstAmountLakhs   ?? 0));
  const monthlyExp     = r2((monthExpAgg._sum.amountLakhs   ?? 0) + (monthExpAgg._sum.gstAmountLakhs   ?? 0));
  const customerExp    = r2((customerExpAgg._sum.amountLakhs ?? 0) + (customerExpAgg._sum.gstAmountLakhs ?? 0));
  const advOutstanding = advancesAgg._sum.balanceLakhs ?? 0;
  const claimsPending  = claimsAgg._sum.amountLakhs    ?? 0;

  const totalCashIn  = cashInAgg._sum.amountLakhs    ?? 0;
  const totalCashOut = cashOutAgg._sum.amountLakhs   ?? 0;
  const netCashFlow  = r2(totalCashIn  - totalCashOut);
  const totalCredits = bankCreditAgg._sum.amountLakhs ?? 0;
  const totalDebits  = bankDebitAgg._sum.amountLakhs  ?? 0;
  const netBankFlow  = r2(totalCredits - totalDebits);

  // ── Expense breakdown by category ─────────────────────────────────────────────
  const expenseBreakdown = catBreakdown.map((c) => ({
    category: c.category || "Uncategorized",
    amount:   fmtMoney(r2((c._sum.amountLakhs ?? 0) + (c._sum.gstAmountLakhs ?? 0))),
    count:    c._count.id,
  }));

  // ── Monthly expense trend (group by month in JS — avoids raw SQL) ─────────────
  const monthMap: Record<string, number> = {};
  for (const e of trendExpenses) {
    const mo = e.expenseDate.toISOString().slice(0, 7); // "2026-06"
    monthMap[mo] = r2((monthMap[mo] ?? 0) + e.amountLakhs + e.gstAmountLakhs);
  }
  const monthlyExpenseTrend = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount: fmtMoney(amount) }));

  // ── Top 5 expense categories by amount ────────────────────────────────────────
  // catBreakdown is already ordered by amountLakhs desc (from groupBy orderBy).
  // Percentage computed read-only for display; no mutation of money fields.
  const totalForPct = monthlyExp > 0 ? monthlyExp : 1; // guard against divide-by-zero
  const topExpenseCategories = catBreakdown.slice(0, 5).map((c) => {
    const amt = r2((c._sum.amountLakhs ?? 0) + (c._sum.gstAmountLakhs ?? 0));
    return {
      category:   c.category || "Uncategorized",
      amount:     fmtMoney(amt),
      percentage: fmtMoney(r2((amt / totalForPct) * 100)),
    };
  });

  // ── Shape and return ──────────────────────────────────────────────────────────
  return NextResponse.json({
    success: true,
    data: {
      period: {
        dateFrom: dateFrom.toISOString().slice(0, 10),
        dateTo:   dateTo.toISOString().slice(0, 10),
        label:    periodLabel(dateFrom, dateTo),
      },
      summaryCards: {
        cashBalance:           fmtMoney(cashBalance),
        bankBalance:           fmtMoney(bankBalance),
        todayExpense:          fmtMoney(todayExp),
        monthlyExpense:        fmtMoney(monthlyExp),
        pendingApprovals:      pendingApprCount,   // count (integer), not money
        employeeClaimsPending: fmtMoney(claimsPending),
        advancesOutstanding:   fmtMoney(advOutstanding),
        customerExpenses:      fmtMoney(customerExp),
      },
      cashFlow: {
        totalCashIn:  fmtMoney(totalCashIn),
        totalCashOut: fmtMoney(totalCashOut),
        netCashFlow:  fmtMoney(netCashFlow),
      },
      bankFlow: {
        totalCredits: fmtMoney(totalCredits),
        totalDebits:  fmtMoney(totalDebits),
        netBankFlow:  fmtMoney(netBankFlow),
      },
      expenseBreakdown,
      monthlyExpenseTrend,
      topExpenseCategories,
      pendingItems: {
        approvals:       pendingApprCount,   // from ApprovalRequest engine
        unpaidExpenses:  unpaidExpCount,     // approved but not paid
        pendingAdvances: pendingAdvCount,    // pending|approved advances
        pendingClaims:   pendingClaimsCount, // submitted travel claims
      },
    },
  });
}
