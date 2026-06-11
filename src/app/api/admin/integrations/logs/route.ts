import { NextRequest, NextResponse } from "next/server";
import { getSession }               from "@/lib/dev-session";
import { listIntegrationLogs }      from "@/lib/integration-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
