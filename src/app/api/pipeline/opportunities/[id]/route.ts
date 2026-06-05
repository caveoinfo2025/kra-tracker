import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { OPP_STAGES } from "@/types/pipeline";
import { startApproval, getWorkflowByCode } from "@/lib/workflow-engine";
import { executeAutomation } from "@/lib/crm-engine";

// Thresholds (in ₹ Lakhs, matching ApprovalRule seed)
const LARGE_DEAL_THRESHOLD_L = 50;  // > ₹50 L triggers large-deal approval
const DISCOUNT_THRESHOLD_PCT  = 0;  // any discount > 0% triggers discount approval

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const opp = await prisma.crmOpportunity.findUnique({
    where: { id: Number(id) },
    include: {
      lead: { include: { assignedTo: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } } } },
      tasks:     { include: { assignedTo: { select: { id: true, name: true } } }, orderBy: { dueDate: "asc" } },
      meetings:  { include: { employee: { select: { id: true, name: true } } }, orderBy: { meetingDate: "desc" } },
      activities:{ include: { performedBy: { select: { id: true, name: true } } }, orderBy: { timestamp: "desc" } },
    },
  });
  if (!opp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!session.user.isManager && opp.lead.assignedToId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(opp);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const empId = session.user.employeeId!;

  const opp = await prisma.crmOpportunity.findUnique({
    where: { id: Number(id) },
    include: { lead: true },
  });
  if (!opp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!session.user.isManager && opp.lead.assignedToId !== empId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate stage if provided
  if (body.stage && !OPP_STAGES.includes(body.stage)) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  }

  const prevStage = opp.stage;

  // Block edits on closed deals (WON/LOST) except by managers
  const isTerminal = ["WON", "LOST"].includes(opp.stage);
  if (isTerminal && !session.user.isManager) {
    return NextResponse.json({ error: "Cannot edit a closed opportunity" }, { status: 403 });
  }

  // Validate WON closing fields
  if (body.stage === "WON") {
    if (!body.poNumber?.trim()) return NextResponse.json({ error: "PO Number is required to close as Won" }, { status: 400 });
    if (body.dealValueExTax === undefined || Number(body.dealValueExTax) <= 0) {
      return NextResponse.json({ error: "Deal Value (ex-tax) is required to close as Won" }, { status: 400 });
    }
  }
  if (body.stage === "LOST" && !body.lostReason?.trim()) {
    return NextResponse.json({ error: "Lost reason is required" }, { status: 400 });
  }

  const updated = await prisma.crmOpportunity.update({
    where: { id: Number(id) },
    data: {
      stage:               body.stage               ?? undefined,
      value:               body.value !== undefined  ? Number(body.value) : undefined,
      discountPct:         body.discountPct !== undefined ? Number(body.discountPct) : undefined,
      expectedClosureDate: body.expectedClosureDate ? new Date(body.expectedClosureDate) : undefined,
      probability:         body.probability !== undefined ? Number(body.probability) : undefined,
      lostReason:          body.lostReason          ?? undefined,
      dealValueExTax:      body.dealValueExTax !== undefined ? Number(body.dealValueExTax) : undefined,
      netProfitLakhs:      body.netProfitLakhs !== undefined ? Number(body.netProfitLakhs) : undefined,
      poNumber:            body.poNumber             ?? undefined,
      poDate:              body.poDate ? new Date(body.poDate) : undefined,
      status:              body.status              ?? undefined,
    },
    include: {
      lead: { include: { assignedTo: { select: { id: true, name: true } } } },
      _count: { select: { tasks: true, meetings: true } },
    },
  });

  if (body.stage && body.stage !== prevStage) {
    await prisma.crmActivity.create({
      data: {
        entityType:    "opportunity",
        entityId:      opp.id,
        action:        "stage_changed",
        description:   `Stage: ${prevStage} → ${body.stage}`,
        performedById: empId,
        leadId:        opp.leadId,
        opportunityId: opp.id,
      },
    });

    // Fire-and-forget: automation rules for stage change
    const automationEvent = body.stage === "WON" ? "opportunity.won"
      : body.stage === "LOST" ? "opportunity.lost"
      : "opportunity.stage_changed";
    executeAutomation(automationEvent, {
      opportunityId: opp.id,
      leadId:        opp.leadId,
      stage:         body.stage,
      prevStage,
      assignedToId:  empId,
    }).catch(() => {/* never block response */});
  }

  // ── Approval triggers (fire-and-forget; never block the save) ──────────────
  const approvalResults: Record<string, number | null> = {};

  // 1. Large-deal approval: value newly crosses the threshold
  const newValue       = updated.value;
  const prevValue      = opp.value;
  const valueCrossed   = newValue > LARGE_DEAL_THRESHOLD_L && prevValue <= LARGE_DEAL_THRESHOLD_L;
  const valueSet       = body.value !== undefined && newValue > LARGE_DEAL_THRESHOLD_L && prevValue === 0;
  if (valueCrossed || valueSet) {
    const wf = await getWorkflowByCode("LARGE_DEAL_APPROVAL");
    if (wf) {
      const req = await startApproval({
        workflowId:  wf.id,
        entityType:  "OPPORTUNITY",
        entityId:    String(updated.id),
        requestedBy: empId,
        contextJson: JSON.stringify({ value: newValue, threshold: LARGE_DEAL_THRESHOLD_L, leadId: opp.leadId }),
      });
      approvalResults.largeDeal = req?.id ?? null;
    }
  }

  // 2. Discount approval: discountPct newly set above threshold
  const newDiscount  = body.discountPct !== undefined ? Number(body.discountPct) : (opp as Record<string, unknown>).discountPct as number ?? 0;
  const prevDiscount = (opp as Record<string, unknown>).discountPct as number ?? 0;
  if (newDiscount > DISCOUNT_THRESHOLD_PCT && prevDiscount === 0) {
    const wf = await getWorkflowByCode("DISCOUNT_APPROVAL");
    if (wf) {
      const req = await startApproval({
        workflowId:  wf.id,
        entityType:  "OPPORTUNITY",
        entityId:    String(updated.id),
        requestedBy: empId,
        contextJson: JSON.stringify({ discountPct: newDiscount, value: newValue, leadId: opp.leadId }),
      });
      approvalResults.discount = req?.id ?? null;
    }
  }

  return NextResponse.json({ ...updated, approvalResults });
}
