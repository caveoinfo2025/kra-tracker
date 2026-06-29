/**
 * POST /api/pipeline/meetings — schedule a meeting against a lead/opportunity.
 * GET  /api/pipeline/meetings?leadId=123 — meetings for a lead.
 *
 * Body: { title, meetingDate, notes?, location?, attendees?, leadId?, opportunityId?, employeeId? }
 *   employeeId = who the meeting is assigned to (defaults to the caller).
 * Fires a notification to the assignee (if not the caller).
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { captureDailyActivityEvent } from "@/lib/daily-activity";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId");
  const oppId = searchParams.get("opportunityId");

  const meetings = await prisma.crmMeeting.findMany({
    where: {
      ...(leadId ? { leadId: Number(leadId) } : {}),
      ...(oppId ? { opportunityId: Number(oppId) } : {}),
    },
    include: { employee: { select: { id: true, name: true } } },
    orderBy: { meetingDate: "desc" },
  });
  return NextResponse.json(meetings);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const callerId = session.user.employeeId!;

  if (!body.title || !body.meetingDate) {
    return NextResponse.json({ error: "title and meetingDate are required" }, { status: 400 });
  }

  const leadId = body.leadId ? Number(body.leadId) : null;
  const opportunityId = body.opportunityId ? Number(body.opportunityId) : null;
  const assigneeId = body.employeeId ? Number(body.employeeId) : callerId;

  // RBAC: if attached to a lead, caller must be the owner or a manager
  if (leadId) {
    const lead = await prisma.crmLead.findUnique({ where: { id: leadId }, select: { assignedToId: true, companyName: true, title: true } });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (!session.user.isManager && lead.assignedToId !== callerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const meeting = await prisma.crmMeeting.create({
    data: {
      title: body.title,
      meetingDate: new Date(body.meetingDate),
      notes: body.notes ?? "",
      location: body.location ?? "",
      attendees: body.attendees ?? "",
      leadId,
      opportunityId,
      employeeId: assigneeId,
    },
    include: { employee: { select: { id: true, name: true } } },
  });

  // Activity log on the lead
  if (leadId) {
    await prisma.crmActivity.create({
      data: {
        entityType: "lead",
        entityId: leadId,
        action: "meeting_scheduled",
        description: `Meeting scheduled: ${meeting.title} (${meeting.employee.name})`,
        performedById: callerId,
        leadId,
      },
    });
  }

  // Daily Activity capture (Phase W2) — attributed to the assignee (who the meeting is
  // scheduled for/by), matching how the activity is meant to reflect their productivity.
  captureDailyActivityEvent({
    employeeId: assigneeId,
    activityType: "MEETING_SCHEDULED",
    sourceType: "MEETING",
    sourceId: meeting.id,
    sourceTable: "CrmMeeting",
    sourceAction: "scheduled",
    leadId,
    opportunityId,
    meetingId: meeting.id,
    employeeRole: session.user.role,
  }).catch(() => {});

  // Notify the assignee if it's not the person creating it
  if (assigneeId !== callerId) {
    await prisma.notification.create({
      data: {
        recipientId: assigneeId,
        type: "system",
        title: `Meeting assigned: ${meeting.title}`,
        body: `${new Date(meeting.meetingDate).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`,
        link: leadId ? `/pipeline/leads/${leadId}` : "/pipeline/tasks",
      },
    });
  }

  return NextResponse.json(meeting, { status: 201 });
}
