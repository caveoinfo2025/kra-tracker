import { NextRequest, NextResponse } from "next/server";
import { getSession }               from "@/lib/dev-session";
import { testConnection }           from "@/lib/integration-engine";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.connectionId) return NextResponse.json({ error: "connectionId required" }, { status: 400 });

  const result = await testConnection(Number(body.connectionId));
  return NextResponse.json(result);
}
