/**
 * PATCH /api/pipeline/meetings/[id] — controlled status update for a scheduled meeting.
 *
 * Phase W9.3: the only supported edit is `status` (SCHEDULED|COMPLETED|CANCELLED|RESCHEDULED) —
 * mirrors the existing `PATCH /api/pipeline/tasks/[id]` status-transition pattern. Fires the
 * Daily Activity `MEETING_COMPLETED` capture ONLY on an actual SCHEDULED/RESCHEDULED → COMPLETED
 * transition (never on a no-op re-save of an already-COMPLETED meeting, and never for a meeting
 * that has already earned a MEETING_COMPLETED event once — see the guard below).
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { captureDailyActivityEvent } from "@/lib/daily-activity";

const MEETING_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED"] as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const callerId = session.user.employeeId!;

  const meeting = await prisma.crmMeeting.findUnique({ where: { id: Number(id) } });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!session.user.isManager && meeting.employeeId !== callerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (body.status === undefined || !(MEETING_STATUSES as readonly string[]).includes(body.status)) {
    return NextResponse.json({ error: `status must be one of: ${MEETING_STATUSES.join(", ")}` }, { status: 400 });
  }

  const prevStatus = meeting.status;
  const newStatus: string = body.status;

  const updated = await prisma.crmMeeting.update({
    where: { id: meeting.id },
    data: { status: newStatus },
    include: { employee: { select: { id: true, name: true } } },
  });

  // Activity log on the lead, mirroring the meeting_scheduled entry created on POST.
  if (meeting.leadId && prevStatus !== newStatus) {
    await prisma.crmActivity.create({
      data: {
        entityType: "lead",
        entityId: meeting.leadId,
        action: "meeting_status_changed",
        description: `Meeting "${meeting.title}" → ${newStatus}`,
        performedById: callerId,
        leadId: meeting.leadId,
      },
    });
  }

  // Daily Activity capture (Phase W9.3) — MEETING_COMPLETED only on an actual transition INTO
  // COMPLETED (not a re-save of an already-COMPLETED meeting, and not for CANCELLED/RESCHEDULED).
  // Business rule (recommended): a meeting that has already earned a MEETING_COMPLETED event once
  // does not count again even if reopened/rescheduled and completed a second time — so this also
  // guards against re-completion, not just same-day re-save (the DailyActivityLog unique
  // constraint only blocks same-day duplicates).
  const completingNow = prevStatus !== "COMPLETED" && newStatus === "COMPLETED";
  if (completingNow) {
    const alreadyCompletedOnce = await prisma.dailyActivityLog.findFirst({
      where: { sourceType: "MEETING", sourceId: meeting.id, activityType: "MEETING_COMPLETED" },
      select: { id: true },
    });
    if (!alreadyCompletedOnce) {
      captureDailyActivityEvent({
        employeeId: meeting.employeeId,
        activityType: "MEETING_COMPLETED",
        sourceType: "MEETING",
        sourceId: meeting.id,
        sourceTable: "CrmMeeting",
        sourceAction: "meeting_completed",
        leadId: meeting.leadId,
        opportunityId: meeting.opportunityId,
        meetingId: meeting.id,
        employeeRole: session.user.role,
      }).catch(() => {});
    }
  }

  return NextResponse.json(updated);
}
