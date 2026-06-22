import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { startApproval, getWorkflowByCode } from "@/lib/workflow-engine";
import { moneyToNumberForDisplay } from "@/lib/money";

// Auto-approve threshold: ≤ ₹10,000 needs no approval flow.
// Step 3Q (Release 1): Expense.amountLakhs is now Decimal ₹ INR (not ₹ Lakhs) — this
// threshold was previously 0.10 (₹0.10 L); updated to the equivalent ₹10,000 INR value.
const AUTO_APPROVE_LIMIT_INR = 10000;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    category:       string;
    categoryCode?:  string;
    narration:      string;
    amountLakhs:    number;
    gstRate?:       number;
    gstAmountLakhs?: number;
    vendorId?:      number;
    customerName?:  string;
    expenseDate?:   string;
    submit?:        boolean;   // true = submitted for approval; false = draft
  };

  const empId = session.user.employeeId!;

  if (!body.category || !body.narration) {
    return NextResponse.json({ error: "category and narration are required" }, { status: 400 });
  }
  if (typeof body.amountLakhs !== "number" || body.amountLakhs <= 0) {
    return NextResponse.json({ error: "amountLakhs must be a positive number" }, { status: 400 });
  }

  const status = body.submit ? "submitted" : "draft";

  const expense = await prisma.expense.create({
    data: {
      category:       body.category,
      categoryCode:   body.categoryCode ?? "",
      narration:      body.narration,
      amountLakhs:    body.amountLakhs,
      gstRate:        body.gstRate        ?? 0,
      gstAmountLakhs: body.gstAmountLakhs ?? 0,
      vendorId:       body.vendorId       ?? null,
      customerName:   body.customerName   ?? "",
      expenseDate:    body.expenseDate ? new Date(body.expenseDate) : new Date(),
      employeeId:     empId,
      status,
    },
  });

  // ── Approval trigger on submit ─────────────────────────────────────────────
  let approvalRequestId: number | null = null;

  if (body.submit && body.amountLakhs > AUTO_APPROVE_LIMIT_INR) {
    const wf = await getWorkflowByCode("EXPENSE_APPROVAL");
    if (wf) {
      const req = await startApproval({
        workflowId:  wf.id,
        entityType:  "EXPENSE",
        entityId:    String(expense.id),
        requestedBy: empId,
        contextJson: JSON.stringify({
          category:    expense.category,
          amountLakhs: moneyToNumberForDisplay(expense.amountLakhs),
          narration:   expense.narration,
        }),
      });
      approvalRequestId = req?.id ?? null;
    }
  }

  return NextResponse.json({ expense, approvalRequestId }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const empId    = session.user.employeeId!;
  const isManager = session.user.isManager;

  const expenses = await prisma.expense.findMany({
    where: {
      deletedAt: null,
      ...(isManager ? {} : { employeeId: empId }),
      ...(searchParams.get("status") ? { status: searchParams.get("status")! } : {}),
    },
    include: { employee: { select: { id: true, name: true } } },
    orderBy: { expenseDate: "desc" },
    take:    Math.min(200, Number(searchParams.get("limit") ?? "100")),
  });

  return NextResponse.json({ expenses });
}
