import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import {
  listNotificationRules,
  createNotificationRule,
  updateNotificationRule,
  logCommunicationAudit,
} from "@/lib/communication-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const eventId = req.nextUrl.searchParams.get("eventId");
  const rules = await listNotificationRules(eventId ? Number(eventId) : undefined);
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.eventId || !body.ruleName) {
    return NextResponse.json({ error: "eventId and ruleName required" }, { status: 400 });
  }

  const rule = await createNotificationRule(body as unknown as Parameters<typeof createNotificationRule>[0]);
  await logCommunicationAudit({
    entityType:  "notification_rule",
    entityId:    rule.id,
    action:      "CREATE",
    newValue:    JSON.stringify(rule),
    performedBy: session.user.employeeId ?? 0,
  });
  return NextResponse.json(rule, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, ...input } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const rule = await updateNotificationRule(Number(id), input);
  await logCommunicationAudit({
    entityType:  "notification_rule",
    entityId:    Number(id),
    action:      "UPDATE",
    newValue:    JSON.stringify(input),
    performedBy: session.user.employeeId ?? 0,
  });
  return NextResponse.json(rule);
}
