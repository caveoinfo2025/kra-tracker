import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { canViewFinanceCashBook } from "@/lib/finance/access";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE     = 100;

/**
 * Format a Float (₹ Lakhs stored as DOUBLE) as a 2-decimal string.
 * Guards against JS floating-point drift (e.g. 50000.000000000004).
 */
function fmtMoney(v: number): string {
  return (Math.round(v * 100) / 100).toFixed(2);
}

/** Round to 2 decimal places for intermediate arithmetic. */
function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Cash Book display convention (double-entry from the cash perspective):
 *   Cash In  (money arrives in the physical cash box) → Ledger direction = "credit" → Debit column
 *   Cash Out (money leaves the physical cash box)     → Ledger direction = "debit"  → Credit column
 *
 * This is the opposite of bank-statement convention but matches cash-register accounting.
 */

/**
 * Map a Ledger.type string to the Cash Book transaction type enum expected by the UI.
 * Unmapped values are returned as-is uppercased (safe degradation).
 */
function mapTxnType(ledgerType: string): string {
  const t = ledgerType.toLowerCase();
  const MAP: Record<string, string> = {
    opening_balance:       "OPENING_BALANCE",
    cash_in:               "CASH_IN",
    cash_withdrawal:       "CASH_WITHDRAWAL",
    cash_out:              "CASH_WITHDRAWAL",
    expense_payment:       "EXPENSE_PAYMENT",
    customer_expense:      "CUSTOMER_EXPENSE",
    employee_advance:      "EMPLOYEE_ADVANCE",
    advance_settlement:    "ADVANCE_SETTLEMENT",
    employee_reimbursement:"EMPLOYEE_REIMBURSEMENT",
    bank_transfer_in:      "BANK_TRANSFER_IN",
    transfer_in:           "BANK_TRANSFER_IN",
    bank_transfer_out:     "BANK_TRANSFER_OUT",
    transfer_out:          "BANK_TRANSFER_OUT",
    transfer:              "BANK_TRANSFER_OUT",
    cash_adjustment:       "CASH_ADJUSTMENT",
    refund:                "REFUND",
  };
  return MAP[t] ?? t.toUpperCase();
}

/**
 * GET /api/finance/cash-book
 *
 * Returns read-only cash ledger transactions from the Ledger table.
 *
 * Query params:
 *   accountId       — FinAccount.id (must be a cash account)
 *   branchId        — filter by FinAccount.branchName
 *   dateFrom        — YYYY-MM-DD  (inclusive)
 *   dateTo          — YYYY-MM-DD  (inclusive)
 *   transactionType — Ledger.type value
 *   expenseCategory — free-text match on narration (Ledger has no category FK)
 *   customerId      — ignored silently (no customer FK on Ledger)
 *   vendorId        — ignored silently (no vendor FK on Ledger)
 *   employeeId      — filter by Ledger.recordedById
 *   status          — RECONCILED | UNRECONCILED
 *   search          — text search on narration, referenceNo, payee, chequeNo, voucherNo
 *   page            — 1-based (default 1)
 *   pageSize        — rows per page (default 25, max 100)
 *
 * Balance semantics:
 *   openingBalance = FinAccount.openingBalance + net of ALL cash entries before dateFrom.
 *   Running balance per row is computed from ALL entries in chronological order,
 *   independent of search / type / status filters.
 *   Balances are NEVER mutated here.
 *
 * Cash Book column convention:
 *   direction = "credit" (cash arriving)  → debit  column  (Cash In)
 *   direction = "debit"  (cash departing) → credit column  (Cash Out)
 *
 * Permission: Finance/CashBook/VIEW (dedicated resource added Step 2S),
 * falling back to Finance/Payment/VIEW (prior closest-fit bridge) and then
 * canManageFinance() (Accounts, Operations Head, Manager). No self-service
 * access.
 */
export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────────
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await canViewFinanceCashBook(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;

  const accountIdRaw      = sp.get("accountId");
  const branchParam       = sp.get("branchId") ?? null;
  const dateFromParam     = sp.get("dateFrom");
  const dateToParam       = sp.get("dateTo");
  const txnTypeParam      = (sp.get("transactionType") ?? "").trim();
  const expenseCatParam   = (sp.get("expenseCategory") ?? "").trim();
  const employeeIdRaw     = sp.get("employeeId");
  const statusParam       = (sp.get("status") ?? "").toUpperCase();
  const searchParam       = (sp.get("search") ?? "").trim();
  const page              = Math.max(1, Number(sp.get("page")     ?? "1"));
  const pageSize          = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(sp.get("pageSize") ?? String(DEFAULT_PAGE_SIZE))),
  );

  // customerId / vendorId: Ledger has no FK to Customer or Vendor — accepted but not filtered
  // (safe degradation per spec).

  // ── Parse accountId ───────────────────────────────────────────────────────────
  let accountId: number | undefined;
  if (accountIdRaw !== null) {
    const n = Number(accountIdRaw);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
      return NextResponse.json({ error: "Invalid accountId" }, { status: 400 });
    }
    accountId = n;
  }

  // ── Parse employeeId ──────────────────────────────────────────────────────────
  let employeeId: number | undefined;
  if (employeeIdRaw !== null) {
    const n = Number(employeeIdRaw);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
      return NextResponse.json({ error: "Invalid employeeId" }, { status: 400 });
    }
    employeeId = n;
  }

  // ── Parse date range ──────────────────────────────────────────────────────────
  let dateFrom: Date | undefined;
  let dateTo: Date | undefined;

  if (dateFromParam) {
    dateFrom = new Date(dateFromParam + "T00:00:00.000Z");
    if (isNaN(dateFrom.getTime())) {
      return NextResponse.json(
        { error: "Invalid dateFrom — expected YYYY-MM-DD" },
        { status: 400 },
      );
    }
  }
  if (dateToParam) {
    dateTo = new Date(dateToParam + "T23:59:59.999Z");
    if (isNaN(dateTo.getTime())) {
      return NextResponse.json(
        { error: "Invalid dateTo — expected YYYY-MM-DD" },
        { status: 400 },
      );
    }
  }
  if (dateFrom && dateTo && dateFrom > dateTo) {
    return NextResponse.json(
      { error: "dateFrom must not be after dateTo" },
      { status: 400 },
    );
  }

  // ── Validate accountId → must exist and be a cash account ────────────────────
  let accountOpeningBalance = 0;
  if (accountId !== undefined) {
    const acct = await prisma.finAccount.findUnique({
      where: { id: accountId },
      select: { id: true, type: true, openingBalance: true, isActive: true },
    });
    if (!acct) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    if (acct.type !== "cash") {
      return NextResponse.json(
        { error: "Account is not a cash account" },
        { status: 400 },
      );
    }
    accountOpeningBalance = acct.openingBalance;
  }

  // ── Build account filter ──────────────────────────────────────────────────────
  const accountFilter = {
    type: "cash" as const,
    isActive: true,
    ...(accountId   !== undefined ? { id: accountId }           : {}),
    ...(branchParam !== null      ? { branchName: branchParam } : {}),
  };

  // ── Date-range filter ─────────────────────────────────────────────────────────
  const entryDateFilter: Record<string, Date> = {};
  if (dateFrom) entryDateFilter.gte = dateFrom;
  if (dateTo)   entryDateFilter.lte = dateTo;
  const hasDateFilter = Object.keys(entryDateFilter).length > 0;

  // ── Period-opening balance ────────────────────────────────────────────────────
  // = FinAccount.openingBalance + net of ALL entries BEFORE dateFrom.
  // Meaningful when a single account is selected.
  let periodOpeningBalance = accountOpeningBalance;

  if (accountId !== undefined && dateFrom) {
    const [priorCashIn, priorCashOut] = await Promise.all([
      // Cash In = direction "credit" (cash arrives)
      prisma.ledger.aggregate({
        where: {
          account:   accountFilter,
          direction: "credit",
          entryDate: { lt: dateFrom },
        },
        _sum: { amountLakhs: true },
      }),
      // Cash Out = direction "debit" (cash departs)
      prisma.ledger.aggregate({
        where: {
          account:   accountFilter,
          direction: "debit",
          entryDate: { lt: dateFrom },
        },
        _sum: { amountLakhs: true },
      }),
    ]);
    periodOpeningBalance = r2(
      accountOpeningBalance +
      (priorCashIn._sum.amountLakhs  ?? 0) -
      (priorCashOut._sum.amountLakhs ?? 0),
    );
  }

  // ── Summary aggregation (all entries in range, before search/type filters) ───
  const summaryWhere = {
    account: accountFilter,
    ...(hasDateFilter ? { entryDate: entryDateFilter } : {}),
  };

  const [sumCashIn, sumCashOut] = await Promise.all([
    prisma.ledger.aggregate({
      where: { ...summaryWhere, direction: "credit" },
      _sum: { amountLakhs: true },
    }),
    prisma.ledger.aggregate({
      where: { ...summaryWhere, direction: "debit" },
      _sum: { amountLakhs: true },
    }),
  ]);

  const totalCashIn    = r2(sumCashIn._sum.amountLakhs  ?? 0);
  const totalCashOut   = r2(sumCashOut._sum.amountLakhs ?? 0);
  const closingBalance = r2(periodOpeningBalance + totalCashIn - totalCashOut);

  // ── Fetch ALL entries in range for running-balance computation ────────────────
  // Running balance is computed from ALL transactions in chronological order.
  // It is NOT affected by search / type / status / expenseCategory filters below.
  const allEntries = await prisma.ledger.findMany({
    where: {
      account: accountFilter,
      ...(hasDateFilter ? { entryDate: entryDateFilter } : {}),
      ...(employeeId !== undefined ? { recordedById: employeeId } : {}),
    },
    include: {
      recordedBy: { select: { name: true } },
      voucher:    { select: { voucherNo: true } },
    },
    orderBy: [{ entryDate: "asc" }, { id: "asc" }],
  });

  // Build id → runningBalance map (Cash In adds, Cash Out subtracts).
  let running = periodOpeningBalance;
  const runningBalanceMap = new Map<number, number>();
  for (const entry of allEntries) {
    // direction = "credit" → cash in → balance increases
    // direction = "debit"  → cash out → balance decreases
    running = entry.direction === "credit"
      ? r2(running + entry.amountLakhs)
      : r2(running - entry.amountLakhs);
    runningBalanceMap.set(entry.id, running);
  }

  // ── Apply in-memory filters (type / status / expenseCategory / search) ────────
  let filtered = allEntries;

  if (txnTypeParam) {
    const lower = txnTypeParam.toLowerCase();
    filtered = filtered.filter((e) => e.type.toLowerCase() === lower);
  }

  // expenseCategory: Ledger has no category FK; match against narration as a best-effort filter.
  if (expenseCatParam) {
    const lower = expenseCatParam.toLowerCase();
    filtered = filtered.filter((e) => e.narration.toLowerCase().includes(lower));
  }

  if (statusParam === "RECONCILED") {
    filtered = filtered.filter((e) => e.reconciled);
  } else if (statusParam === "UNRECONCILED") {
    filtered = filtered.filter((e) => !e.reconciled);
  }

  if (searchParam) {
    const lower = searchParam.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.narration.toLowerCase().includes(lower)    ||
        e.referenceNo.toLowerCase().includes(lower)  ||
        e.payee.toLowerCase().includes(lower)        ||
        e.chequeNo.toLowerCase().includes(lower)     ||
        (e.voucher?.voucherNo ?? "").toLowerCase().includes(lower),
    );
  }

  // ── Paginate ──────────────────────────────────────────────────────────────────
  const total      = filtered.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const offset     = (page - 1) * pageSize;
  const pageRows   = filtered.slice(offset, offset + pageSize);

  // ── Shape transactions ────────────────────────────────────────────────────────
  const transactions = pageRows.map((entry) => {
    const rb       = runningBalanceMap.get(entry.id) ?? 0;
    const isCashIn = entry.direction === "credit"; // cash arriving → debit col
    const txnNo    = entry.voucher?.voucherNo ?? `LDG/${String(entry.id).padStart(6, "0")}`;
    const refNo    = entry.referenceNo || entry.chequeNo || "";

    return {
      id:                String(entry.id),
      transactionDate:   entry.entryDate.toISOString().slice(0, 10),
      transactionNumber: txnNo,
      referenceNumber:   refNo,
      transactionType:   mapTxnType(entry.type),
      description:       entry.narration,
      // Ledger.payee holds the counter-party; no separate customer/vendor/employee FK exists.
      category:          null,          // no category FK on Ledger
      customerName:      isCashIn  ? entry.payee || null : null,
      vendorName:        !isCashIn ? entry.payee || null : null,
      employeeName:      entry.recordedBy.name,
      // Cash Book display convention: Cash In → Debit; Cash Out → Credit
      debit:             isCashIn  ? fmtMoney(entry.amountLakhs) : "0.00",
      credit:            !isCashIn ? fmtMoney(entry.amountLakhs) : "0.00",
      runningBalance:    fmtMoney(rb),
      createdBy:         entry.recordedBy.name,
      status:            entry.reconciled ? "POSTED" : "UNRECONCILED",
      voucherNumber:     entry.voucher?.voucherNo ?? null,
      createdAt:         entry.createdAt.toISOString(),
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        openingBalance:    fmtMoney(periodOpeningBalance),
        totalCashIn:       fmtMoney(totalCashIn),
        totalCashOut:      fmtMoney(totalCashOut),
        closingBalance:    fmtMoney(closingBalance),
        physicalCashBalance: null,   // requires physical count entry — not in schema
        lastReconciledAt:    null,   // no aggregate reconciliation timestamp in schema
      },
      transactions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    },
  });
}
