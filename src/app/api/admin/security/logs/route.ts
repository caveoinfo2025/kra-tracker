import { NextRequest, NextResponse } from "next/server";
import { getSession }               from "@/lib/dev-session";
import { listSecurityLogs }         from "@/lib/security-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const p         = req.nextUrl.searchParams;
  const userId    = p.get("userId");
  const eventType = p.get("eventType") ?? undefined;
  const limit     = p.get("limit");
  const offset    = p.get("offset");

  const logs = await listSecurityLogs({
    userId:    userId    ? Number(userId) : undefined,
    eventType,
    limit:     limit     ? Number(limit)  : 100,
    offset:    offset    ? Number(offset) : 0,
  });

  return NextResponse.json(logs);
}
