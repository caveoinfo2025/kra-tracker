import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { captureDailyActivityEvent } from "@/lib/daily-activity";

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

  // Daily Activity capture (Phase W2) — CrmNote has no channel field (call/email/WhatsApp
  // undifferentiated, docs/webapp/DAILY_ACTIVITY_SCHEMA_DESIGN_REVIEW.md §11), so this is
  // conservatively captured as FOLLOW_UP_ADDED rather than guessed at a specific channel type.
  captureDailyActivityEvent({
    employeeId: empId,
    activityType: "FOLLOW_UP_ADDED",
    sourceType: "NOTE",
    sourceId: note.id,
    sourceTable: "CrmNote",
    sourceAction: "note_added",
    leadId: Number(body.leadId),
    employeeRole: session.user.role,
  }).catch(() => {});

  return NextResponse.json(note, { status: 201 });
}
