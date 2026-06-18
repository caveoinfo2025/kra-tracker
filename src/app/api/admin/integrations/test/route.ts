import { NextRequest, NextResponse } from "next/server";
import { getSession }               from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import { testConnection }           from "@/lib/integration-engine";

export async function POST(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "IntegrationAdmin", "EDIT");
  if (deny) return deny;

  const body = await req.json();
  if (!body.connectionId) return NextResponse.json({ error: "connectionId required" }, { status: 400 });

  const result = await testConnection(Number(body.connectionId));
  return NextResponse.json(result);
}
