import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { listDeliveryLogs, listCommunicationAudit } from "@/lib/communication-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
