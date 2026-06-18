import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import {
  listCommunicationEvents,
  registerEvent,
  updateCommunicationEvent,
} from "@/lib/communication-engine";
import { logCommunicationAudit } from "@/lib/communication-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "CommunicationAdmin", "EDIT");
  if (deny) return deny;

  const module = req.nextUrl.searchParams.get("module") ?? undefined;
  const events = await listCommunicationEvents(module);
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "CommunicationAdmin", "EDIT");
  if (deny) return deny;

  const body = await req.json();
  if (!body.module || !body.eventCode || !body.eventName) {
    return NextResponse.json({ error: "module, eventCode, eventName required" }, { status: 400 });
  }

  const event = await registerEvent(body);
  await logCommunicationAudit({
    entityType:  "communication_event",
    entityId:    event.id,
    action:      "CREATE",
    newValue:    JSON.stringify(event),
    performedBy: session?.user?.employeeId ?? 0,
  });
  return NextResponse.json(event, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "CommunicationAdmin", "EDIT");
  if (deny) return deny;

  const body = await req.json();
  const { id, ...input } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const event = await updateCommunicationEvent(Number(id), input);
  await logCommunicationAudit({
    entityType:  "communication_event",
    entityId:    Number(id),
    action:      "UPDATE",
    newValue:    JSON.stringify(input),
    performedBy: session?.user?.employeeId ?? 0,
  });
  return NextResponse.json(event);
}
