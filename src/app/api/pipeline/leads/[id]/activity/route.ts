/**
 * GET  /api/pipeline/leads/[id]/activity — activity timeline for a lead
 * POST /api/pipeline/leads/[id]/activity — log a new activity (call / note / meeting)
 * Used by the mobile Deal Detail screen.
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { captureDailyActivityEvent, type DailyActivityType } from "@/lib/daily-activity";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lead = await prisma.crmLead.findUnique({
    where: { id: Number(id) },
    select: { assignedToId: true },
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!session.user.isManager && lead.assignedToId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const activities = await prisma.crmActivity.findMany({
    where: { leadId: Number(id) },
    include: { performedBy: { select: { id: true, name: true } } },
    orderBy: { timestamp: "desc" },
    take: 20,
  });

  return NextResponse.json(
    activities.map(a => ({
      id: a.id,
      action: a.action,
      description: a.description,
      createdAt: a.timestamp,
      performedBy: a.performedBy,
    }))
  );
}

/**
 * POST — log a call / note / meeting against a lead.
 * Body: { action: "call" | "note" | "meeting", description: string }
 * Calls & meetings additionally create the corresponding CrmMeeting record so
 * they surface in the desktop lead detail too.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const leadId = Number(id);
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lead = await prisma.crmLead.findUnique({
    where: { id: leadId },
    select: { assignedToId: true },
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!session.user.isManager && lead.assignedToId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const action: string = body.action ?? "note";
  const description: string = (body.description ?? "").toString().trim();
  if (!description) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }
  const empId = session.user.employeeId!;

  // For meetings, also create a CrmMeeting so it appears in the desktop view
  if (action === "meeting") {
    await prisma.crmMeeting.create({
      data: {
        title: description.slice(0, 120),
        meetingDate: body.meetingDate ? new Date(body.meetingDate) : new Date(),
        notes: description,
        leadId,
        employeeId: empId,
      },
    });
  }

  const activity = await prisma.crmActivity.create({
    data: {
      entityType: "lead",
      entityId: leadId,
      action,
      description,
      performedById: empId,
      leadId,
    },
    include: { performedBy: { select: { id: true, name: true } } },
  });

  // Daily Activity capture (Phase W2). This endpoint's `action` field is the one place in the
  // codebase that already distinguishes "call" from a generic "note" — captured as
  // CALL_NOTE_ADDED accordingly. Email/WhatsApp still have no distinct source anywhere
  // (docs/webapp/DAILY_ACTIVITY_SCHEMA_DESIGN_REVIEW.md §11) — a plain "note" here is
  // conservatively captured as FOLLOW_UP_ADDED, same as the separate /api/pipeline/notes route.
  const activityType: DailyActivityType | null =
    action === "call" ? "CALL_NOTE_ADDED" :
    action === "meeting" ? "MEETING_SCHEDULED" :
    action === "note" ? "FOLLOW_UP_ADDED" : null;
  if (activityType) {
    captureDailyActivityEvent({
      employeeId: empId,
      activityType,
      sourceType: activityType === "MEETING_SCHEDULED" ? "MEETING" : "NOTE",
      sourceId: activity.id,
      sourceTable: "CrmActivity",
      sourceAction: action,
      leadId,
      employeeRole: session.user.role,
    }).catch(() => {});
  }

  return NextResponse.json({
    id: activity.id,
    action: activity.action,
    description: activity.description,
    createdAt: activity.timestamp,
    performedBy: activity.performedBy,
  }, { status: 201 });
}
