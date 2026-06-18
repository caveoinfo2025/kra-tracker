import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import {
  listNotificationTemplates,
  createNotificationTemplate,
  updateNotificationTemplate,
  logCommunicationAudit,
} from "@/lib/communication-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "CommunicationAdmin", "EDIT");
  if (deny) return deny;

  const eventId = req.nextUrl.searchParams.get("eventId");
  const templates = await listNotificationTemplates(eventId ? Number(eventId) : undefined);
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "CommunicationAdmin", "EDIT");
  if (deny) return deny;

  const body = await req.json();
  if (!body.templateName) {
    return NextResponse.json({ error: "templateName required" }, { status: 400 });
  }

  const tmpl = await createNotificationTemplate(body as unknown as Parameters<typeof createNotificationTemplate>[0]);
  await logCommunicationAudit({
    entityType:  "notification_template",
    entityId:    tmpl.id,
    action:      "CREATE",
    newValue:    JSON.stringify({ templateName: tmpl.templateName }),
    performedBy: session?.user?.employeeId ?? 0,
  });
  return NextResponse.json(tmpl, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "CommunicationAdmin", "EDIT");
  if (deny) return deny;

  const body = await req.json();
  const { id, ...input } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const tmpl = await updateNotificationTemplate(Number(id), input);
  await logCommunicationAudit({
    entityType:  "notification_template",
    entityId:    Number(id),
    action:      "UPDATE",
    newValue:    JSON.stringify(input),
    performedBy: session?.user?.employeeId ?? 0,
  });
  return NextResponse.json(tmpl);
}
