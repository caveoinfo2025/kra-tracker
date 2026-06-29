import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import { parseMoneyInput, moneyToNumberForDisplay } from "@/lib/money";
import { captureDailyActivityEvent, type DailyActivityType, type DailyActivitySourceType } from "@/lib/daily-activity";

/** Shared Daily Activity capture for a lead stage transition — same qualification/proposal-sent
 *  rules as /api/pipeline/leads/[id]/stage/route.ts (Phase W2). Used by this route's PUT/PATCH
 *  legacy stage-change fallbacks so all three lead-mutation paths capture consistently. */
function captureLeadStageChange(opts: {
  empId: number; leadId: number; prevStage: string; newStage: string; role?: string | null; opportunityId?: number | null;
}) {
  if (opts.prevStage === opts.newStage) return;
  let activityType: DailyActivityType = "LEAD_UPDATED";
  let sourceType: DailyActivitySourceType = "LEAD";
  if (opts.newStage === "QUALIFIED" && opts.prevStage !== "QUALIFIED") {
    activityType = "QUALIFIED_LEAD_CREATED";
  } else if (opts.newStage === "PROPOSAL_SENT" && opts.prevStage !== "PROPOSAL_SENT") {
    activityType = "PROPOSAL_SENT";
    sourceType = "PROPOSAL";
  }
  captureDailyActivityEvent({
    employeeId: opts.empId,
    activityType,
    sourceType,
    sourceId: opts.leadId,
    sourceTable: "CrmLead",
    sourceAction: `stage:${opts.prevStage}->${opts.newStage}`,
    leadId: opts.leadId,
    opportunityId: opts.opportunityId ?? null,
    employeeRole: opts.role,
  }).catch(() => {});
}

/** Daily Activity capture for a non-stage lead edit (Phase W2). Gated to leads that have moved
 *  past raw/unqualified intake (stage !== "NEW_LEAD") — per the qualified-lead rule, raw/data
 *  entry on a not-yet-qualified lead must not score (docs/webapp/
 *  DAILY_ACTIVITY_PRODUCTIVITY_WORKFLOW_PLAN.md §5). Only fires when at least one editable
 *  field actually changed, to avoid scoring a no-op resave. */
function captureLeadFieldUpdate(opts: { empId: number; leadId: number; stage: string; changed: boolean; role?: string | null }) {
  if (!opts.changed || opts.stage === "NEW_LEAD") return;
  captureDailyActivityEvent({
    employeeId: opts.empId,
    activityType: "LEAD_UPDATED",
    sourceType: "LEAD",
    sourceId: opts.leadId,
    sourceTable: "CrmLead",
    sourceAction: "fields_updated",
    leadId: opts.leadId,
    employeeRole: opts.role,
  }).catch(() => {});
}

function leadForResponse<T extends {
  expectedValue: unknown;
  opportunity?: { value: unknown; dealValueExTax: unknown; netProfitLakhs: unknown } | null;
}>(l: T) {
  return {
    ...l,
    expectedValue: moneyToNumberForDisplay(l.expectedValue as never),
    ...(l.opportunity ? {
      opportunity: {
        ...l.opportunity,
        value: moneyToNumberForDisplay(l.opportunity.value as never),
        dealValueExTax: moneyToNumberForDisplay(l.opportunity.dealValueExTax as never),
        netProfitLakhs: moneyToNumberForDisplay(l.opportunity.netProfitLakhs as never),
      },
    } : {}),
  };
}

const LEAD_INCLUDE = {
  assignedTo:  { select: { id: true, name: true } },
  createdBy:   { select: { id: true, name: true } },
  customerRef: { select: { id: true, name: true } },
  opportunity: { include: { activities: { orderBy: { timestamp: "desc" as const }, take: 20 } } },
  tasks:       { include: { assignedTo: { select: { id: true, name: true } } }, orderBy: { dueDate: "asc" as const } },
  meetings:    { include: { employee: { select: { id: true, name: true } } }, orderBy: { meetingDate: "desc" as const } },
  activities:  { include: { performedBy: { select: { id: true, name: true } } }, orderBy: { timestamp: "desc" as const }, take: 50 },
  notes:       { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" as const } },
} as const;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lead = await prisma.crmLead.findUnique({ where: { id: Number(id) }, include: LEAD_INCLUDE });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // RBAC: employees can only see their assigned leads
  if (!session?.user?.isManager && lead.assignedToId !== session?.user?.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(leadForResponse(lead));
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lead = await prisma.crmLead.findUnique({ where: { id: Number(id) } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!session?.user?.isManager && lead.assignedToId !== session?.user?.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body   = await req.json();
  const empId  = session?.user?.employeeId!;
  const prevStage = lead.stage;

  const updated = await prisma.crmLead.update({
    where: { id: Number(id) },
    data: {
      title:          body.title         ?? undefined,
      companyName:    body.companyName   ?? undefined,
      contactPerson:  body.contactPerson ?? undefined,
      email:          body.email         ?? undefined,
      phone:          body.phone         ?? undefined,
      source:         body.source        ?? undefined,
      categoryId:     body.categoryId    !== undefined ? body.categoryId  : undefined,
      categoryName:   body.categoryName  ?? undefined,
      oemId:          body.oemId         !== undefined ? body.oemId       : undefined,
      oemName:        body.oemName       ?? undefined,
      productId:      body.productId     !== undefined ? body.productId   : undefined,
      productName:    body.productName   ?? undefined,
      customerId:     body.customerId    !== undefined ? body.customerId  : undefined,
      customerName:   body.customerName  ?? undefined,
      customerRefId:  body.customerRefId !== undefined ? (body.customerRefId ? Number(body.customerRefId) : null) : undefined,
      expectedValue:  body.expectedValue !== undefined ? parseMoneyInput(body.expectedValue) : undefined,
      remarks:        body.remarks       ?? undefined,
      // Only managers can reassign
      ...(session?.user?.isManager && body.assignedToId
        ? { assignedToId: Number(body.assignedToId) }
        : {}),
    },
    include: LEAD_INCLUDE,
  });

  // Log if stage changed (should use /stage endpoint, but just in case)
  if (body.stage && body.stage !== prevStage) {
    await prisma.crmActivity.create({
      data: {
        entityType:    "lead",
        entityId:      updated.id,
        action:        "stage_changed",
        description:   `Stage: ${prevStage} → ${body.stage}`,
        performedById: empId,
        leadId:        updated.id,
      },
    });
    captureLeadStageChange({
      empId, leadId: updated.id, prevStage, newStage: body.stage,
      role: session?.user?.role, opportunityId: updated.opportunity?.id ?? null,
    });
  } else {
    const changed = ["title", "companyName", "contactPerson", "email", "phone", "source", "categoryId",
      "categoryName", "oemId", "oemName", "productId", "productName", "customerId", "customerName",
      "customerRefId", "expectedValue", "remarks", "assignedToId"]
      .some((k) => body[k] !== undefined && body[k] !== (lead as Record<string, unknown>)[k]);
    captureLeadFieldUpdate({ empId, leadId: updated.id, stage: updated.stage, changed, role: session?.user?.role });
  }

  return NextResponse.json(leadForResponse(updated));
}

/** PATCH /api/pipeline/leads/[id] — lightweight stage update (used by mobile) */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lead = await prisma.crmLead.findUnique({ where: { id: Number(id) } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!session?.user?.isManager && lead.assignedToId !== session?.user?.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const empId = session?.user?.employeeId!;

  const updated = await prisma.crmLead.update({
    where: { id: Number(id) },
    data: { ...(body.stage ? { stage: body.stage } : {}) },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  if (body.stage && body.stage !== lead.stage) {
    await prisma.crmActivity.create({
      data: {
        entityType: "lead", entityId: lead.id,
        action: "stage_changed",
        description: `Stage updated: ${lead.stage} → ${body.stage} (via mobile)`,
        performedById: empId,
        leadId: lead.id,
      },
    });
    captureLeadStageChange({ empId, leadId: lead.id, prevStage: lead.stage, newStage: body.stage, role: session?.user?.role });
  }

  return NextResponse.json(leadForResponse(updated));
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leadId = Number(id);
  const lead = await prisma.crmLead.findUnique({
    where: { id: leadId },
    include: { assignedTo: { select: { name: true } } },
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Managers can delete any lead; employees can only delete their own
  if (!session.user.isManager && lead.assignedToId !== session.user.employeeId) {
    return NextResponse.json({ error: "You can only delete leads assigned to you" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const reason: string = (body.reason ?? "").toString().trim();
  if (!reason) return NextResponse.json({ error: "Deletion reason is required" }, { status: 400 });

  const empId = session.user.employeeId!;

  // Log before deleting so the snapshot is preserved
  await prisma.auditLog.create({
    data: {
      entityType:    "lead",
      entityId:      leadId,
      action:        "delete",
      performedById: empId,
      notes:         reason,
      changes:       JSON.stringify({
        title:       lead.title,
        companyName: lead.companyName,
        stage:       lead.stage,
        assignedTo:  lead.assignedTo?.name ?? null,
        expectedValue: lead.expectedValue,
      }),
    },
  });

  await prisma.crmLead.delete({ where: { id: leadId } });
  return NextResponse.json({ success: true });
}
