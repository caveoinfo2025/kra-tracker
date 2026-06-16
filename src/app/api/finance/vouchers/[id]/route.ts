import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { canManageFinance } from "@/lib/roles";

// ── Money helpers ─────────────────────────────────────────────────────────────

function fmtMoney(v: number): string {
  return (Math.round(v * 100) / 100).toFixed(2);
}

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ── Type / status maps (identical to list route) ──────────────────────────────

const DB_TYPE_TO_API: Record<string, string> = {
  payment:    "PAYMENT",
  receipt:    "RECEIPT",
  journal:    "JOURNAL",
  expense:    "EXPENSE",
  conveyance: "EMPLOYEE_CLAIM",
  advance:    "EMPLOYEE_ADVANCE",
};

const DB_STATUS_TO_API: Record<string, string> = {
  draft:    "DRAFT",
  approved: "APPROVED",
  voided:   "CANCELLED",
};

function mapType(t: string): string   { return DB_TYPE_TO_API[t]   ?? t.toUpperCase(); }
function mapStatus(s: string): string { return DB_STATUS_TO_API[s] ?? s.toUpperCase(); }

// ── Amount in words ───────────────────────────────────────────────────────────

function numberToWords(n: number): string {
  if (n === 0) return "Zero";
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function below100(x: number): string {
    return x < 20 ? ones[x] : tens[Math.floor(x / 10)] + (x % 10 ? " " + ones[x % 10] : "");
  }
  function below1000(x: number): string {
    return x < 100
      ? below100(x)
      : ones[Math.floor(x / 100)] + " Hundred" + (x % 100 ? " " + below100(x % 100) : "");
  }

  const cr   = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thou = Math.floor((n % 100_000) / 1_000);
  const rem  = n % 1_000;
  const parts: string[] = [];
  if (cr)   parts.push(below1000(cr)   + " Crore");
  if (lakh) parts.push(below1000(lakh) + " Lakh");
  if (thou) parts.push(below1000(thou) + " Thousand");
  if (rem)  parts.push(below1000(rem));
  return parts.join(" ");
}

function amountInWords(lakhs: number): string {
  const rupees = r2(lakhs * 100_000);
  const whole  = Math.floor(rupees);
  const paise  = Math.round((rupees - whole) * 100);
  let result   = "Rupees " + numberToWords(whole);
  if (paise > 0) result += " and " + numberToWords(paise) + " Paise";
  return result + " Only";
}

// ── Payment mode from ledger ──────────────────────────────────────────────────

const LEDGER_TYPE_TO_MODE: Record<string, string> = {
  upi:        "UPI",
  cheque:     "CHEQUE",
  neft:       "NEFT",
  rtgs:       "RTGS",
  imps:       "IMPS",
  cash_in:    "CASH",
  cash_out:   "CASH",
  payment:    "CASH",
  receipt:    "CASH",
  bank_charge:"BANK",
  transfer:   "BANK_TRANSFER",
};

function derivePaymentMode(entries: { type: string }[]): string | null {
  if (!entries.length) return null;
  return LEDGER_TYPE_TO_MODE[entries[0].type] ?? entries[0].type.toUpperCase();
}

/**
 * GET /api/finance/vouchers/[id]
 *
 * Full voucher detail for the Voucher Details Drawer.
 * Permission: canManageFinance.
 *
 * Schema gaps (returned as null / empty — no columns in current schema):
 *   - tallyExportStatus  → always "NOT_EXPORTED"
 *   - costCenter         → null
 *   - branchName         → from first Ledger → FinAccount.branchName
 *   - chequeNumber       → from first Ledger.chequeNo
 *   - payee              → from first Ledger.payee
 *   - modifiedBy         → null (no updatedById column)
 *   - cancelledBy        → null (no cancelledById column)
 *   - auditHistory       → from AuditLog table (entityType="voucher")
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageFinance(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: idRaw } = await params;
  const id = Number(idRaw);
  if (!Number.isFinite(id) || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid voucher id" }, { status: 400 });
  }

  const voucher = await prisma.voucher.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      ledgerEntries: {
        include: { account: { select: { name: true, type: true, branchName: true } } },
        orderBy: { id: "asc" },
      },
      expenses: {
        include: {
          vendor:   { select: { id: true, name: true, gstin: true } },
          employee: { select: { id: true, name: true } },
        },
        take: 1,
      },
      advances: {
        include: {
          employee: { select: { id: true, name: true } },
        },
        take: 1,
      },
      travelClaims: {
        include: {
          employee: { select: { id: true, name: true } },
        },
        take: 1,
      },
    },
  });

  if (!voucher) {
    return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
  }

  // ── Approval history from ApprovalRequest ─────────────────────────────────
  const approvalRequests = await prisma.approvalRequest.findMany({
    where: { entityType: "VOUCHER", entityId: String(id) },
    include: {
      requester: { select: { name: true } },
      actions: {
        include: { approver: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { submittedAt: "asc" },
  });

  const approvalHistory = approvalRequests.flatMap((ar) => [
    {
      event:    "SUBMITTED",
      by:       ar.requester.name,
      at:       ar.submittedAt.toISOString(),
      status:   ar.status,
      comments: null,
    },
    ...ar.actions.map((a) => ({
      event:    a.action,
      by:       a.approver.name,
      at:       a.createdAt.toISOString(),
      status:   a.action,
      comments: a.comments ?? null,
    })),
  ]);

  // ── Audit history ─────────────────────────────────────────────────────────
  const auditLogs = await prisma.auditLog.findMany({
    where:   { entityType: "voucher", entityId: id },
    include: { performedBy: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const auditHistory = auditLogs.map((log) => ({
    action:      log.action,
    performedBy: log.performedBy.name,
    at:          log.createdAt.toISOString(),
    changes:     log.changes || null,
    notes:       log.notes   || null,
  }));

  // ── Derive related data ───────────────────────────────────────────────────
  const firstEntry   = voucher.ledgerEntries[0] ?? null;
  const paymentMode  = derivePaymentMode(voucher.ledgerEntries);

  // Debit entry (direction=debit) and credit entry (direction=credit) for accounting
  const debitEntry  = voucher.ledgerEntries.find((e) => (e as unknown as { direction: string }).direction === "debit")  ?? firstEntry;
  const creditEntry = voucher.ledgerEntries.find((e) => (e as unknown as { direction: string }).direction === "credit") ?? null;

  // Reference from first linked record
  let referenceType:   string | null = null;
  let referenceNumber: string | null = null;
  let partyData: {
    customer: null;
    vendor: { id: string; name: string; gstin: string | null } | null;
    employee: { id: string; name: string } | null;
  } = { customer: null, vendor: null, employee: null };

  if (voucher.expenses.length > 0) {
    const exp = voucher.expenses[0];
    referenceType   = "EXPENSE";
    referenceNumber = `EXP/26-27/${String(exp.id).padStart(5, "0")}`;
    partyData = {
      customer: null,
      vendor:   exp.vendor ? { id: String(exp.vendor.id), name: exp.vendor.name, gstin: exp.vendor.gstin || null } : null,
      employee: { id: String(exp.employee.id), name: exp.employee.name },
    };
  } else if (voucher.advances.length > 0) {
    const adv = voucher.advances[0];
    referenceType   = "EMPLOYEE_ADVANCE";
    referenceNumber = adv.advanceNo;
    partyData = {
      customer: null,
      vendor:   null,
      employee: { id: String(adv.employee.id), name: adv.employee.name },
    };
  } else if (voucher.travelClaims.length > 0) {
    const tc = voucher.travelClaims[0];
    referenceType   = "TRAVEL_CLAIM";
    referenceNumber = `TC/26-27/${String(tc.id).padStart(5, "0")}`;
    partyData = {
      customer: null,
      vendor:   null,
      employee: { id: String(tc.employee.id), name: tc.employee.name },
    };
  }

  // Determine CASH vs BANK account
  const cashAccountName = firstEntry?.account.type === "cash" ? firstEntry.account.name : null;
  const bankAccountName = firstEntry?.account.type === "bank" ? firstEntry.account.name : null;
  const branchName      = firstEntry?.account.branchName ?? null;

  // chequeNo and payee from ledger entry (fields exist on Ledger model)
  const chequeNo = (firstEntry as unknown as { chequeNo?: string })?.chequeNo || null;
  const payee    = (firstEntry as unknown as { payee?: string   })?.payee    || null;

  return NextResponse.json({
    success: true,
    data: {
      voucher: {
        id:            String(voucher.id),
        voucherNumber: voucher.voucherNo,
        voucherDate:   voucher.voucherDate.toISOString().slice(0, 10),
        voucherType:   mapType(voucher.type),
        status:        mapStatus(voucher.status),
        amount:        fmtMoney(voucher.amountLakhs),
        amountInWords: amountInWords(voucher.amountLakhs),
        narration:     voucher.narration || null,
        paymentMode,
        pdfAvailable:  !!voucher.pdfUrl,
        voidedAt:      voucher.voidedAt?.toISOString() ?? null,
        voidReason:    voucher.voidReason || null,
        createdBy:     voucher.createdBy.name,
        createdAt:     voucher.createdAt.toISOString(),
        updatedAt:     voucher.updatedAt.toISOString(),
      },
      reference: {
        referenceType,
        referenceId:     referenceNumber ? String(voucher.expenses[0]?.id ?? voucher.advances[0]?.id ?? voucher.travelClaims[0]?.id) : null,
        referenceNumber,
        expenseNumber:   referenceType === "EXPENSE" ? referenceNumber : null,
        advanceNumber:   referenceType === "EMPLOYEE_ADVANCE" ? referenceNumber : null,
        claimNumber:     referenceType === "TRAVEL_CLAIM" ? referenceNumber : null,
      },
      party:       partyData,
      accounting: {
        debitLedger:  debitEntry  ? (debitEntry  as unknown as { account: { name: string } }).account?.name ?? null : null,
        creditLedger: creditEntry ? (creditEntry as unknown as { account: { name: string } }).account?.name ?? null : null,
        accountName:  firstEntry?.account.name ?? null,
        costCenter:   null, // SCHEMA GAP: no costCenter field
        branchName,
        gstDetails:   null, // SCHEMA GAP: GST breakdown not on Voucher (on Expense)
      },
      payment: {
        paymentMode,
        chequeNumber:  chequeNo,
        upiReference:  null, // SCHEMA GAP: no upiReference field (would be in referenceNo)
        bankReference: (firstEntry as unknown as { referenceNo?: string })?.referenceNo || null,
        cashAccount:   cashAccountName,
        bankAccount:   bankAccountName,
        payee,
      },
      documents: {
        attachments:        [], // SCHEMA GAP: no attachments on Voucher (attachments are on Expense)
        voucherPdfAvailable: !!voucher.pdfUrl,
        voucherPdfUrl:      voucher.pdfUrl || null,
      },
      approval: {
        approvalStatus:  approvalRequests.length > 0 ? approvalRequests[approvalRequests.length - 1].status : mapStatus(voucher.status),
        approvalHistory,
      },
      audit: {
        createdBy:   voucher.createdBy.name,
        createdAt:   voucher.createdAt.toISOString(),
        modifiedBy:  null, // SCHEMA GAP: no updatedById on Voucher
        cancelledBy: null, // SCHEMA GAP: no cancelledById on Voucher
        cancelReason: voucher.voidReason || null,
        history:     auditHistory,
      },
      // Tally export not implemented — field does not exist in current schema
      tallyExport: {
        status:      "NOT_EXPORTED",
        exportedAt:  null,
        exportRef:   null,
      },
    },
  });
}
