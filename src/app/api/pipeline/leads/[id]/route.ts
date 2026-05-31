import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

const LEAD_INCLUDE = {
  assignedTo:  { select: { id: true, name: true } },
  createdBy:   { select: { id: true, name: true } },
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
  if (!session.user.isManager && lead.assignedToId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(lead);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lead = await prisma.crmLead.findUnique({ where: { id: Number(id) } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!session.user.isManager && lead.assignedToId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body   = await req.json();
  const empId  = session.user.employeeId!;
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
      expectedValue:  body.expectedValue !== undefined ? Number(body.expectedValue) : undefined,
      remarks:        body.remarks       ?? undefined,
      // Only managers can reassign
      ...(session.user.isManager && body.assignedToId
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
  }

  return NextResponse.json(updated);
}

/** PATCH /api/pipeline/leads/[id] — lightweight stage update (used by mobile) */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lead = await prisma.crmLead.findUnique({ where: { id: Number(id) } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!session.user.isManager && lead.assignedToId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const empId = session.user.employeeId!;

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
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.crmLead.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
