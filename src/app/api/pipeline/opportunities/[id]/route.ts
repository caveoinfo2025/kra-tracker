import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { OPP_STAGES } from "@/types/pipeline";

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
  const updated = await prisma.crmOpportunity.update({
    where: { id: Number(id) },
    data: {
      stage:               body.stage               ?? undefined,
      value:               body.value !== undefined  ? Number(body.value) : undefined,
      expectedClosureDate: body.expectedClosureDate ? new Date(body.expectedClosureDate) : undefined,
      probability:         body.probability !== undefined ? Number(body.probability) : undefined,
      lostReason:          body.lostReason          ?? undefined,
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
  }

  return NextResponse.json(updated);
}
