import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { startApproval, getWorkflowByCode } from "@/lib/workflow-engine";

// Auto-approve threshold: ≤ ₹0.10 L (₹10,000) needs no approval flow
const AUTO_APPROVE_LIMIT_L = 0.10;

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

  if (body.submit && body.amountLakhs > AUTO_APPROVE_LIMIT_L) {
    const wf = await getWorkflowByCode("EXPENSE_APPROVAL");
    if (wf) {
      const req = await startApproval({
        workflowId:  wf.id,
        entityType:  "EXPENSE",
        entityId:    String(expense.id),
        requestedBy: empId,
        contextJson: JSON.stringify({
          category:    expense.category,
          amountLakhs: expense.amountLakhs,
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
      ...(isManager ? {} : { employeeId: empId }),
      ...(searchParams.get("status") ? { status: searchParams.get("status")! } : {}),
    },
    include: { employee: { select: { id: true, name: true } } },
    orderBy: { expenseDate: "desc" },
    take:    Math.min(200, Number(searchParams.get("limit") ?? "100")),
  });

  return NextResponse.json({ expenses });
}
