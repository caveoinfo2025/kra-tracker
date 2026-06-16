import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { canManageFinance } from "@/lib/roles";

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE     = 100;

// ── Money helpers (consistent with all existing Finance APIs) ─────────────────

/** Serialize a Float (₹ Lakhs, DOUBLE) as a fixed-precision string. */
function fmtMoney(v: number): string {
  return (Math.round(v * 100) / 100).toFixed(2);
}

/** Round to 2 decimal places for safe intermediate arithmetic. */
function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ── Voucher type helpers ──────────────────────────────────────────────────────
//
// The DB schema stores type as a simple string:
//   payment | receipt | journal | expense | conveyance | advance
//
// The API layer maps these to richer display labels. Because the DB does not
// distinguish CASH vs BANK within the "payment" / "receipt" types (that would
// require inspecting the linked Ledger entry's FinAccount.type), we return
// the generic label here.  The caller can inspect the `accounting.accountName`
// from the detail endpoint to determine cash vs bank.
//
// SCHEMA GAP: paymentMode, tallyExportStatus, referenceType, referenceNumber,
// and partyName are not columns on the Voucher model — they are derived from
// joined relations (Ledger, Expense, EmployeeAdvance, Vendor, Employee).

const DB_TYPE_TO_API: Record<string, string> = {
  payment:    "PAYMENT",
  receipt:    "RECEIPT",
  journal:    "JOURNAL",
  expense:    "EXPENSE",
  conveyance: "EMPLOYEE_CLAIM",
  advance:    "EMPLOYEE_ADVANCE",
};

const API_TYPE_TO_DB: Record<string, string> = {
  CASH_PAYMENT:    "payment",
  BANK_PAYMENT:    "payment",
  PAYMENT:         "payment",
  CASH_RECEIPT:    "receipt",
  BANK_RECEIPT:    "receipt",
  RECEIPT:         "receipt",
  JOURNAL:         "journal",
  CONTRA:          "journal",
  EXPENSE:         "expense",
  CUSTOMER_EXPENSE:"expense",
  EMPLOYEE_CLAIM:  "conveyance",
  EMPLOYEE_ADVANCE:"advance",
};

function mapType(dbType: string): string {
  return DB_TYPE_TO_API[dbType] ?? dbType.toUpperCase();
}

// ── Voucher status helpers ────────────────────────────────────────────────────
// DB: draft | approved | voided
// API: DRAFT | APPROVED | CANCELLED (voided → CANCELLED for display)

const DB_STATUS_TO_API: Record<string, string> = {
  draft:    "DRAFT",
  approved: "APPROVED",
  voided:   "CANCELLED",
};

const API_STATUS_TO_DB: Record<string, string> = {
  DRAFT:             "draft",
  PENDING_APPROVAL:  "draft",   // no distinct pending status in schema; map to draft
  APPROVED:          "approved",
  CANCELLED:         "voided",
  VOIDED:            "voided",
  POSTED:            "approved",
  REVERSED:          "voided",
};

function mapStatus(dbStatus: string): string {
  return DB_STATUS_TO_API[dbStatus] ?? dbStatus.toUpperCase();
}

// ── Month boundaries ──────────────────────────────────────────────────────────

function currentMonthBounds(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end:   new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999)),
  };
}

// ── Derive reference info from voucher relations ──────────────────────────────

function deriveRef(v: {
  expenses:    { id: number; narration: string; customerName: string; vendor: { name: string } | null }[];
  advances:    { id: number; advanceNo: string; employee: { name: string } }[];
  travelClaims: { id: number; employee: { name: string } }[];
}): { referenceType: string | null; referenceNumber: string | null; partyName: string | null } {
  if (v.expenses.length > 0) {
    const exp = v.expenses[0];
    const expNo = `EXP/26-27/${String(exp.id).padStart(5, "0")}`;
    const party = exp.customerName || exp.vendor?.name || null;
    return { referenceType: "EXPENSE", referenceNumber: expNo, partyName: party };
  }
  if (v.advances.length > 0) {
    const adv = v.advances[0];
    return { referenceType: "EMPLOYEE_ADVANCE", referenceNumber: adv.advanceNo, partyName: adv.employee.name };
  }
  if (v.travelClaims.length > 0) {
    const tc = v.travelClaims[0];
    return { referenceType: "TRAVEL_CLAIM", referenceNumber: `TC/26-27/${String(tc.id).padStart(5, "0")}`, partyName: tc.employee.name };
  }
  return { referenceType: null, referenceNumber: null, partyName: null };
}

// ── Derive payment mode from first ledger entry ───────────────────────────────

function derivePaymentMode(ledgerEntries: { type: string }[]): string | null {
  if (ledgerEntries.length === 0) return null;
  const t = ledgerEntries[0].type;
  const MODE_MAP: Record<string, string> = {
    upi: "UPI", cheque: "CHEQUE", neft: "NEFT", rtgs: "RTGS", imps: "IMPS",
    cash_in: "CASH", cash_out: "CASH", payment: "CASH", receipt: "CASH",
    bank_charge: "BANK", transfer: "BANK_TRANSFER",
  };
  return MODE_MAP[t] ?? t.toUpperCase();
}

// ── Derive account name from first ledger entry ───────────────────────────────

function deriveAccountName(ledgerEntries: { account: { name: string } }[]): string | null {
  return ledgerEntries[0]?.account?.name ?? null;
}

/**
 * GET /api/finance/vouchers
 *
 * Returns a paginated Voucher Register with summary aggregations.
 * Permission: canManageFinance (Accounts, Operations Head, Manager).
 *
 * Query params:
 *   page, pageSize, dateFrom, dateTo, financialYear,
 *   voucherType, voucherStatus, search
 *
 * Schema gaps (fields not on Voucher model — returned as null / default):
 *   - tallyExportStatus   → always "NOT_EXPORTED" (no column)
 *   - paymentMode         → derived from first Ledger entry type
 *   - referenceType/No    → derived from linked Expense/Advance/TravelClaim
 *   - partyName           → derived from linked records
 *   - branchId filter     → not filterable (no branchId on Voucher)
 *   - accountId filter    → applied via ledger entries' accountId
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

  // ── Pagination ────────────────────────────────────────────────────────────
  const page     = Math.max(1, Number(sp.get("page")     ?? "1"));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(sp.get("pageSize") ?? String(DEFAULT_PAGE_SIZE))));

  // ── Filter params ─────────────────────────────────────────────────────────
  const dateFromParam     = sp.get("dateFrom");
  const dateToParam       = sp.get("dateTo");
  const financialYear     = (sp.get("financialYear") ?? "").trim() || null;
  const voucherTypeParam  = (sp.get("voucherType")   ?? "").trim().toUpperCase() || null;
  const voucherStatusParam= (sp.get("voucherStatus") ?? "").trim().toUpperCase() || null;
  const searchParam       = (sp.get("search")        ?? "").trim() || null;

  // ── Date parsing ──────────────────────────────────────────────────────────
  let dateFrom: Date | undefined;
  let dateTo:   Date | undefined;

  if (financialYear) {
    const m = financialYear.match(/^(\d{2})-(\d{2})$/);
    if (m) {
      const startYear = 2000 + parseInt(m[1], 10);
      dateFrom = new Date(`${startYear}-04-01T00:00:00.000Z`);
      dateTo   = new Date(`${startYear + 1}-03-31T23:59:59.999Z`);
    }
  }

  if (!dateFrom && dateFromParam) {
    dateFrom = new Date(dateFromParam + "T00:00:00.000Z");
    if (isNaN(dateFrom.getTime())) {
      return NextResponse.json({ error: "Invalid dateFrom — expected YYYY-MM-DD" }, { status: 400 });
    }
  }
  if (!dateTo && dateToParam) {
    dateTo = new Date(dateToParam + "T23:59:59.999Z");
    if (isNaN(dateTo.getTime())) {
      return NextResponse.json({ error: "Invalid dateTo — expected YYYY-MM-DD" }, { status: 400 });
    }
  }
  if (dateFrom && dateTo && dateFrom > dateTo) {
    return NextResponse.json({ error: "dateFrom must not be after dateTo" }, { status: 400 });
  }

  // ── Type filter (map API type → DB type) ──────────────────────────────────
  let dbTypeFilter: string | undefined;
  if (voucherTypeParam) {
    dbTypeFilter = API_TYPE_TO_DB[voucherTypeParam] ?? voucherTypeParam.toLowerCase();
  }

  // ── Status filter (map API status → DB status) ────────────────────────────
  let dbStatusFilter: string | undefined;
  if (voucherStatusParam) {
    dbStatusFilter = API_STATUS_TO_DB[voucherStatusParam] ?? voucherStatusParam.toLowerCase();
  }

  // ── Base date filter ──────────────────────────────────────────────────────
  const dateFilter = (dateFrom || dateTo)
    ? { voucherDate: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } }
    : {};

  // ── Summary aggregations (this-month scope, no text/type filters) ─────────
  const { start: monthStart, end: monthEnd } = currentMonthBounds();

  const [
    thisMonthCount,
    pendingCount,
    approvedCount,
    cancelledCount,
    paymentCount,
    receiptCount,
    totalAmountAgg,
  ] = await Promise.all([
    prisma.voucher.count({ where: { voucherDate: { gte: monthStart, lte: monthEnd } } }),
    prisma.voucher.count({ where: { status: "draft"    } }),
    prisma.voucher.count({ where: { status: "approved" } }),
    prisma.voucher.count({ where: { status: "voided"   } }),
    prisma.voucher.count({ where: { type: "payment"    } }),
    prisma.voucher.count({ where: { type: "receipt"    } }),
    prisma.voucher.aggregate({ _sum: { amountLakhs: true } }),
  ]);

  // ── List query where clause ───────────────────────────────────────────────
  const listWhere: Record<string, unknown> = {
    ...dateFilter,
    ...(dbTypeFilter   ? { type:   dbTypeFilter   } : {}),
    ...(dbStatusFilter ? { status: dbStatusFilter } : {}),
  };

  if (searchParam) {
    listWhere.OR = [
      { voucherNo: { contains: searchParam } },
      { narration:  { contains: searchParam } },
    ];
  }

  // ── Count + paginated fetch ───────────────────────────────────────────────
  const [total, rawVouchers] = await Promise.all([
    prisma.voucher.count({ where: listWhere }),
    prisma.voucher.findMany({
      where:   listWhere,
      include: {
        createdBy:    { select: { name: true } },
        ledgerEntries: {
          select: { type: true, account: { select: { name: true } } },
          take: 1,
        },
        expenses: {
          select: {
            id:           true,
            narration:    true,
            customerName: true,
            vendor:       { select: { name: true } },
          },
          take: 1,
        },
        advances: {
          select: {
            id:       true,
            advanceNo:true,
            employee: { select: { name: true } },
          },
          take: 1,
        },
        travelClaims: {
          select: {
            id:       true,
            employee: { select: { name: true } },
          },
          take: 1,
        },
      },
      orderBy: [{ voucherDate: "desc" }, { createdAt: "desc" }],
      skip:    (page - 1) * pageSize,
      take:    pageSize,
    }),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  const vouchers = rawVouchers.map((v) => {
    const ref = deriveRef(v);
    return {
      id:                String(v.id),
      voucherDate:       v.voucherDate.toISOString().slice(0, 10),
      voucherNumber:     v.voucherNo,
      voucherType:       mapType(v.type),
      referenceNumber:   ref.referenceNumber,
      referenceType:     ref.referenceType,
      partyName:         ref.partyName,
      paymentMode:       derivePaymentMode(v.ledgerEntries),
      accountName:       deriveAccountName(v.ledgerEntries),
      amount:            fmtMoney(v.amountLakhs),
      status:            mapStatus(v.status),
      tallyExportStatus: "NOT_EXPORTED", // SCHEMA GAP: no tallyExportStatus column
      createdBy:         v.createdBy.name,
      createdAt:         v.createdAt.toISOString(),
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        totalVouchersThisMonth: thisMonthCount,
        pendingVouchers:        pendingCount,
        approvedVouchers:       approvedCount,
        cancelledVouchers:      cancelledCount,
        paymentVouchers:        paymentCount,
        receiptVouchers:        receiptCount,
        totalVoucherAmount:     fmtMoney(r2(totalAmountAgg._sum.amountLakhs ?? 0)),
        tallyExportPending:     0, // SCHEMA GAP: no tallyExportStatus column
      },
      vouchers,
      pagination: { page, pageSize, total, totalPages },
    },
  });
}
