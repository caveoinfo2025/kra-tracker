import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body  = await req.json();
  const empId = session.user.employeeId!;

  // Verify lead access
  const lead = await prisma.crmLead.findUnique({ where: { id: Number(body.leadId) } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!session.user.isManager && lead.assignedToId !== empId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const note = await prisma.crmNote.create({
    data: { content: body.content, leadId: Number(body.leadId), authorId: empId },
    include: { author: { select: { id: true, name: true } } },
  });

  await prisma.crmActivity.create({
    data: {
      entityType:    "lead",
      entityId:      Number(body.leadId),
      action:        "note_added",
      description:   `Note added`,
      performedById: empId,
      leadId:        Number(body.leadId),
    },
  });

  return NextResponse.json(note, { status: 201 });
}
