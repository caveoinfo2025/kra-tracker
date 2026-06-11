import { NextRequest, NextResponse } from "next/server";
import { getSession }               from "@/lib/dev-session";
import {
  listConnections,
  createConnection,
  updateConnection,
} from "@/lib/integration-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const companyId = req.nextUrl.searchParams.get("companyId");
  const connections = await listConnections(companyId ? Number(companyId) : undefined);

  // Strip secretRef from response — never expose to frontend
  return NextResponse.json(
    connections.map(c => ({ ...c, secretRef: c.secretRef ? "[set]" : null }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.providerId || !body.connectionName || !body.authType) {
    return NextResponse.json({ error: "providerId, connectionName, authType required" }, { status: 400 });
  }

  // secretRef must be an env var name, never a raw secret
  if (body.secretRef && body.secretRef.includes(" ")) {
    return NextResponse.json({ error: "secretRef must be an environment variable name (no spaces)" }, { status: 400 });
  }

  const conn = await createConnection(body);
  return NextResponse.json({ ...conn, secretRef: conn.secretRef ? "[set]" : null }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, ...input } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (input.secretRef && input.secretRef.includes(" ")) {
    return NextResponse.json({ error: "secretRef must be an environment variable name (no spaces)" }, { status: 400 });
  }

  const conn = await updateConnection(Number(id), input);
  return NextResponse.json({ ...conn, secretRef: conn.secretRef ? "[set]" : null });
}
