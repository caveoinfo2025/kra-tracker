import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { canViewAllFinanceExpenses } from "@/lib/finance/access";

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
  if (expense.customerName)      return "CUSTOMER_EXPENSE";
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
 * GET /api/finance/expenses/[id]
 *
 * Full expense detail for the drawer/detail view.
 * Includes vendor, employee, GST breakdown, voucher, attachments,
 * approval history (from ApprovalRequest/ApprovalAction), and audit trail.
 *
 * Permission:
 *   Finance/Expense/VIEW (temporary canManageFinance() fallback) → any expense
 *   Regular employee → own expense only (403 otherwise)
 *
 * Money: returned as 2-decimal strings in ₹ Lakhs.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idRaw } = await params;
  const id = Number(idRaw);
  if (!Number.isFinite(id) || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      employee:   { select: { id: true, name: true } },
      vendor:     true,
      voucher:    { select: { voucherNo: true, status: true } },
      approvedBy: { select: { id: true, name: true } },
    },
  });

  if (!expense) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Ownership check: non-finance employees may only view their own expenses.
  const isFinanceManager = await canViewAllFinanceExpenses(session);
  if (!isFinanceManager && expense.employeeId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Approval history ──────────────────────────────────────────────────────────
  const approvalRequests = await prisma.approvalRequest.findMany({
    where: { entityType: "EXPENSE", entityId: String(id) },
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

  const pendingAR = approvalRequests.find((ar) => ar.status === "PENDING");
  const pendingApprovalRequestId: number | null = pendingAR?.id ?? null;

  // ── Audit trail ───────────────────────────────────────────────────────────────
  const auditLogs = await prisma.auditLog.findMany({
    where: { entityType: "expense", entityId: id },
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

  const attachments = parseAttachments(expense.attachmentsJson);

  // ── Shape core expense ────────────────────────────────────────────────────────
  const baseExpense = {
    id:              String(expense.id),
    expenseDate:     expense.expenseDate.toISOString().slice(0, 10),
    expenseNumber:   `EXP/26-27/${String(expense.id).padStart(5, "0")}`,
    expenseType:     deriveExpenseType(expense),
    category:        expense.category,
    categoryCode:    expense.categoryCode,
    subCategory:     null,
    description:     expense.narration,
    customerName:    expense.customerName || null,
    vendorName:      expense.vendor?.name ?? null,
    employeeName:    expense.employee.name,
    paymentMode:     null,   // paymentMode field not yet in schema
    accountName:     null,   // finAccountId field not yet in schema
    baseAmount:      fmtMoney(expense.amountLakhs),
    gstRate:         expense.gstRate,
    gstAmount:       fmtMoney(expense.gstAmountLakhs),
    totalAmount:     fmtMoney(r2(expense.amountLakhs + expense.gstAmountLakhs)),
    vendorInvoiceNo: expense.vendorInvoiceNo || null,
    voucherNumber:   expense.voucher?.voucherNo ?? null,
    approvalStatus:  mapApprovalStatus(expense.status),
    paymentStatus:   expense.status === "paid" ? "PAID" : "UNPAID",
    billAvailable:   attachments.length > 0,
    gstApplicable:   expense.gstRate > 0,
    approvedBy:      expense.approvedBy?.name ?? null,
    approvedAt:      expense.approvedAt?.toISOString() ?? null,
    paidDate:        expense.paidDate?.toISOString().slice(0, 10) ?? null,
    createdBy:       expense.employee.name,
    createdAt:       expense.createdAt.toISOString(),
    updatedAt:       expense.updatedAt.toISOString(),
  };

  return NextResponse.json({
    success: true,
    data: {
      expense: baseExpense,
      customer: expense.customerName
        ? {
            id:              null,
            name:            expense.customerName,
            project:         null,
            salesOrder:      null,
            ticketReference: null,
          }
        : null,
      vendor: expense.vendor
        ? {
            id:            String(expense.vendor.id),
            name:          expense.vendor.name,
            gstin:         expense.vendor.gstin    || null,
            invoiceNumber: expense.vendorInvoiceNo || null,
            invoiceDate:   null,   // no invoiceDate field on Expense model
          }
        : null,
      employee: {
        id:                String(expense.employee.id),
        name:              expense.employee.name,
        claimReference:    null,     // no claimRef field on Expense model
        advanceAdjustment: "0.00",   // no advanceAdjustment field on Expense model
      },
      // Schema stores total GST only (gstAmountLakhs); no CGST/SGST/IGST split columns.
      gst: {
        taxableAmount: fmtMoney(expense.amountLakhs),
        cgst:          "0.00",
        sgst:          "0.00",
        igst:          "0.00",
        totalGst:      fmtMoney(expense.gstAmountLakhs),
      },
      voucher: expense.voucher
        ? {
            voucherNumber: expense.voucher.voucherNo,
            status:        expense.voucher.status.toUpperCase(),
          }
        : null,
      attachments: attachments.map((a) => ({
        fileName: a.fileName,
        fileUrl:  a.fileUrl,
      })),
      pendingApprovalRequestId,
      approvalHistory,
      auditHistory,
    },
  });
}
