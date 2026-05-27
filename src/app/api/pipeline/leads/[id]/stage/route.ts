/**
 * PATCH /api/pipeline/leads/[id]/stage
 * Body: { stage: LeadStage }
 *
 * Key logic:
 *  - Validates stage transition
 *  - When stage → PROPOSAL_SENT, auto-creates CrmOpportunity
 *  - Logs activity
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { LEAD_STAGES } from "@/types/pipeline";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stage } = await req.json();
  if (!LEAD_STAGES.includes(stage)) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  }

  const lead = await prisma.crmLead.findUnique({
    where: { id: Number(id) },
    include: { opportunity: true },
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // RBAC
  if (!session.user.isManager && lead.assignedToId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const prevStage = lead.stage;
  const empId     = session.user.employeeId!;

  // Update stage
  const updated = await prisma.crmLead.update({
    where: { id: Number(id) },
    data:  { stage },
    include: {
      assignedTo:  { select: { id: true, name: true } },
      createdBy:   { select: { id: true, name: true } },
      opportunity: true,
      _count: { select: { tasks: true, meetings: true, notes: true } },
    },
  });

  // Auto-create Opportunity when stage moves to PROPOSAL_SENT
  let opportunity = updated.opportunity;
  if (stage === "PROPOSAL_SENT" && !opportunity) {
    opportunity = await prisma.crmOpportunity.create({
      data: {
        leadId:      lead.id,
        stage:       "PROPOSAL_SENT",
        value:       lead.expectedValue,
        probability: 60,
        status:      "active",
      },
    });

    await prisma.crmActivity.create({
      data: {
        entityType:    "opportunity",
        entityId:      opportunity.id,
        action:        "created",
        description:   `Opportunity auto-created from lead "${lead.title}"`,
        performedById: empId,
        leadId:        lead.id,
        opportunityId: opportunity.id,
      },
    });
  }

  // Log stage change activity
  await prisma.crmActivity.create({
    data: {
      entityType:    "lead",
      entityId:      lead.id,
      action:        "stage_changed",
      description:   `Stage changed: ${prevStage} → ${stage}`,
      performedById: empId,
      leadId:        lead.id,
    },
  });

  return NextResponse.json({ ...updated, opportunity });
}
