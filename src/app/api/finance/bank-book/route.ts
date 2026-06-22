import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { canViewFinanceBankBook } from "@/lib/finance/access";
import { toMoneyDecimal, addMoney, subtractMoney, moneyToNumberForDisplay } from "@/lib/money";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE     = 100;

/**
 * Format a Float (₹ Lakhs stored as DOUBLE) as a fixed-precision string.
 * Guards against JS floating-point drift on repeated additions.
 */
function fmtMoney(v: number): string {
  return (Math.round(v * 100) / 100).toFixed(2);
}

/** Round to 2 decimal places (used for intermediate arithmetic). */
function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * GET /api/finance/bank-book
 *
 * Returns read-only bank ledger transactions from the Ledger table.
 *
 * Query params:
 *   accountId       - FinAccount.id  (must be a bank account)
 *   branchId        - filter by FinAccount.branchName (no FK branch entity exists)
 *   dateFrom        - YYYY-MM-DD  (inclusive start of entry date range)
 *   dateTo          - YYYY-MM-DD  (inclusive end of entry date range)
 *   transactionType - Ledger.type value (neft | rtgs | upi | cheque | imps | …)
 *   paymentMode     - alias for transactionType (both map to Ledger.type)
 *   status          - RECONCILED | UNRECONCILED
 *   search          - text search on narration / referenceNo / payee / voucherNo
 *   page            - 1-based page number  (default 1)
 *   pageSize        - rows per page  (default 25, max 100)
 *
 * Balance semantics:
 *   openingBalance  = FinAccount.openingBalance + net of ALL entries before dateFrom.
 *   Running balance  per row is computed from ALL entries in chronological order —
 *   it is NOT affected by search / type filters, matching real bank-statement behaviour.
 *   Balances are NEVER calculated or mutated here; only read from the DB / derived
 *   read-only from existing rows.
 *
 * Permission: Finance/BankBook/VIEW (dedicated resource added Step 2S),
 * falling back to Finance/Payment/VIEW (prior closest-fit bridge) and then
 * canManageFinance() (Accounts, Operations Head, Manager). No self-service
 * access.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await canViewFinanceBankBook(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;

  const accountIdRaw  = sp.get("accountId");
  const branchParam   = sp.get("branchId") ?? null;
  const dateFromParam = sp.get("dateFrom");
  const dateToParam   = sp.get("dateTo");
  const txnTypeParam  = sp.get("transactionType");
  const modeParam     = sp.get("paymentMode");   // alias for transactionType
  const statusParam   = (sp.get("status") ?? "").toUpperCase();
  const searchParam   = (sp.get("search") ?? "").trim();
  const page          = Math.max(1, Number(sp.get("page")     ?? "1"));
  const pageSize      = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(sp.get("pageSize") ?? String(DEFAULT_PAGE_SIZE))),
  );

  // ── Parse accountId ───────────────────────────────────────────────────────────
  let accountId: number | undefined;
  if (accountIdRaw !== null) {
    const n = Number(accountIdRaw);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
      return NextResponse.json({ error: "Invalid accountId" }, { status: 400 });
    }
    accountId = n;
  }

  // ── Parse date range ──────────────────────────────────────────────────────────
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

  // ── Validate accountId → must exist and be a bank account ────────────────────
  let accountOpeningBalance = 0;
  if (accountId !== undefined) {
    const acct = await prisma.finAccount.findUnique({
      where: { id: accountId },
      select: { id: true, type: true, openingBalance: true, isActive: true },
    });
    if (!acct) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    if (acct.type !== "bank") {
      return NextResponse.json({ error: "Account is not a bank account" }, { status: 400 });
    }
    accountOpeningBalance = acct.openingBalance;
  }

  // ── Build account filter (applied to the related FinAccount on every query) ──
  // FinAccount has no FK branch entity; branchParam is matched against branchName.
  const accountFilter = {
    type: "bank" as const,
    ...(accountId  !== undefined ? { id: accountId }       : {}),
    ...(branchParam !== null     ? { branchName: branchParam } : {}),
  };

  // ── Date-range filter ─────────────────────────────────────────────────────────
  const entryDateFilter: Record<string, Date> = {};
  if (dateFrom) entryDateFilter.gte = dateFrom;
  if (dateTo)   entryDateFilter.lte = dateTo;
  const hasDateFilter = Object.keys(entryDateFilter).length > 0;

  // ── Compute period-opening balance ────────────────────────────────────────────
  // = FinAccount.openingBalance + net credits/debits for ALL entries before dateFrom.
  // Only meaningful when a single account is selected (accountId is provided).
  let periodOpeningBalance = accountOpeningBalance;

  if (accountId !== undefined && dateFrom) {
    const [priorCredits, priorDebits] = await Promise.all([
      prisma.ledger.aggregate({
        where: { account: accountFilter, direction: "credit", entryDate: { lt: dateFrom } },
        _sum: { amountLakhs: true },
      }),
      prisma.ledger.aggregate({
        where: { account: accountFilter, direction: "debit",  entryDate: { lt: dateFrom } },
        _sum: { amountLakhs: true },
      }),
    ]);
    periodOpeningBalance = r2(
      accountOpeningBalance +
      (priorCredits._sum.amountLakhs ?? 0) -
      (priorDebits._sum.amountLakhs ?? 0),
    );
  }

  // ── Summary aggregation (all entries in range, before search/type filters) ───
  const summaryWhere = {
    account: accountFilter,
    ...(hasDateFilter ? { entryDate: entryDateFilter } : {}),
  };

  const [sumCredits, sumDebits] = await Promise.all([
    prisma.ledger.aggregate({
      where: { ...summaryWhere, direction: "credit" },
      _sum: { amountLakhs: true },
    }),
    prisma.ledger.aggregate({
      where: { ...summaryWhere, direction: "debit" },
      _sum: { amountLakhs: true },
    }),
  ]);

  const totalCredits   = r2(sumCredits._sum.amountLakhs ?? 0);
  const totalDebits    = r2(sumDebits._sum.amountLakhs  ?? 0);
  const closingBalance = r2(periodOpeningBalance + totalCredits - totalDebits);

  // ── Fetch ALL entries in range (sorted) for running-balance computation ───────
  // Running balance reflects ALL transactions chronologically, independent of
  // search / type / status filters applied below.
  const allEntries = await prisma.ledger.findMany({
    where: {
      account: accountFilter,
      ...(hasDateFilter ? { entryDate: entryDateFilter } : {}),
    },
    include: {
      recordedBy: { select: { name: true } },
      voucher:    { select: { voucherNo: true } },
    },
    orderBy: [{ entryDate: "asc" }, { id: "asc" }],
  });

  // Build id → runningBalance map using periodOpeningBalance as the starting point.
  // Use money helper internally; preserve number response shape until Decimal API migration.
  let runningDecimal = toMoneyDecimal(periodOpeningBalance);
  const runningBalanceMap = new Map<number, number>();
  for (const entry of allEntries) {
    runningDecimal = entry.direction === "credit"
      ? addMoney(runningDecimal, entry.amountLakhs)
      : subtractMoney(runningDecimal, entry.amountLakhs);
    runningBalanceMap.set(entry.id, moneyToNumberForDisplay(runningDecimal));
  }

  // ── Apply search / type / status filters in memory ───────────────────────────
  // transactionType and paymentMode both map to Ledger.type (schema has one field).
  const typeFilter = (txnTypeParam ?? modeParam ?? "").toLowerCase();

  let filtered = allEntries;

  if (typeFilter) {
    filtered = filtered.filter((e) => e.type.toLowerCase() === typeFilter);
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
        e.narration.toLowerCase().includes(lower) ||
        e.referenceNo.toLowerCase().includes(lower) ||
        e.payee.toLowerCase().includes(lower) ||
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
    const isCredit = entry.direction === "credit";
    // Use linked voucher number if available; else synthesise a ledger reference.
    const txnNo    = entry.voucher?.voucherNo ?? `LDG/${String(entry.id).padStart(6, "0")}`;
    // referenceNo takes priority; fall back to chequeNo for cheque entries.
    const refNo    = entry.referenceNo || entry.chequeNo || "";

    return {
      id:                String(entry.id),
      transactionDate:   entry.entryDate.toISOString().slice(0, 10),
      transactionNumber: txnNo,
      referenceNumber:   refNo,
      // Ledger.type stores both "what kind" and "payment mode" in one field.
      transactionType:   entry.type.toUpperCase(),
      description:       entry.narration,
      partyName:         entry.payee,
      paymentMode:       entry.type.toUpperCase(),
      debit:             isCredit ? "0.00" : fmtMoney(entry.amountLakhs),
      credit:            isCredit ? fmtMoney(entry.amountLakhs) : "0.00",
      runningBalance:    fmtMoney(rb),
      createdBy:         entry.recordedBy.name,
      status:            entry.reconciled ? "RECONCILED" : "UNRECONCILED",
      voucherRef:        entry.voucher?.voucherNo ?? null,
      createdAt:         entry.createdAt.toISOString(),
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        openingBalance: fmtMoney(periodOpeningBalance),
        totalCredits:   fmtMoney(totalCredits),
        totalDebits:    fmtMoney(totalDebits),
        closingBalance: fmtMoney(closingBalance),
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
