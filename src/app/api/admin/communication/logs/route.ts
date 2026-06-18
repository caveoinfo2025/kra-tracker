import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import { listDeliveryLogs, listCommunicationAudit } from "@/lib/communication-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "CommunicationAdmin", "EDIT");
  if (deny) return deny;

  const type    = req.nextUrl.searchParams.get("type") ?? "delivery";
  const channel = req.nextUrl.searchParams.get("channel") ?? undefined;
  const status  = req.nextUrl.searchParams.get("status")  ?? undefined;

  if (type === "audit") {
    const entityType = req.nextUrl.searchParams.get("entityType") ?? undefined;
    const logs = await listCommunicationAudit({ ...(entityType ? { entityType } : {}) });
    return NextResponse.json(logs);
  }

  const logs = await listDeliveryLogs({
    ...(channel ? { channel } : {}),
    ...(status  ? { status }  : {}),
  });
  return NextResponse.json(logs);
}
