import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import {
  listNotificationChannels,
  createNotificationChannel,
  updateNotificationChannel,
  logCommunicationAudit,
} from "@/lib/communication-engine";

export async function GET() {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "CommunicationAdmin", "EDIT");
  if (deny) return deny;

  const channels = await listNotificationChannels();
  // Strip configJson from response — never expose to frontend
  const safe = channels.map(({ configJson: _cfg, ...c }) => c);
  return NextResponse.json(safe);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "CommunicationAdmin", "EDIT");
  if (deny) return deny;

  const body = await req.json();
  if (!body.channelName || !body.channelCode) {
    return NextResponse.json({ error: "channelName and channelCode required" }, { status: 400 });
  }

  // configJson must only contain env var key references, not raw secrets
  const channel = await createNotificationChannel(body as unknown as Parameters<typeof createNotificationChannel>[0]);
  await logCommunicationAudit({
    entityType:  "notification_channel",
    entityId:    channel.id,
    action:      "CREATE",
    newValue:    JSON.stringify({ channelCode: channel.channelCode }),
    performedBy: session?.user?.employeeId ?? 0,
  });
  return NextResponse.json({ ...channel, configJson: undefined }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "CommunicationAdmin", "EDIT");
  if (deny) return deny;

  const body = await req.json();
  // Accept id from query param (?id=) or from body
  const queryId = req.nextUrl.searchParams.get("id");
  const id = queryId ? Number(queryId) : body.id;
  const { id: _bodyId, ...input } = body;
  void _bodyId;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const channel = await updateNotificationChannel(Number(id), input);
  await logCommunicationAudit({
    entityType:  "notification_channel",
    entityId:    Number(id),
    action:      channel.status === "inactive" ? "CHANNEL_DISABLED" : "UPDATE",
    newValue:    JSON.stringify({ status: channel.status }),
    performedBy: session?.user?.employeeId ?? 0,
  });
  return NextResponse.json({ ...channel, configJson: undefined });
}
