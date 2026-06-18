import { NextRequest, NextResponse } from "next/server";
import { getSession }               from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import { listIntegrationLogs }      from "@/lib/integration-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "IntegrationAdmin", "EDIT");
  if (deny) return deny;

  const params   = req.nextUrl.searchParams;
  const connId   = params.get("connectionId");
  const status   = params.get("status") ?? undefined;
  const limitStr = params.get("limit");

  const logs = await listIntegrationLogs({
    connectionId: connId ? Number(connId) : undefined,
    status,
    limit: limitStr ? Number(limitStr) : 100,
  });

  return NextResponse.json(logs);
}
