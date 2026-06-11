import { NextRequest, NextResponse } from "next/server";
import { getSession }               from "@/lib/dev-session";
import {
  listProviders,
  createProvider,
  updateProviderStatus,
} from "@/lib/integration-engine";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const providers = await listProviders();
  return NextResponse.json(providers);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.name || !body.code || !body.category) {
    return NextResponse.json({ error: "name, code, category required" }, { status: 400 });
  }

  const provider = await createProvider(body);
  return NextResponse.json(provider, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, status } = body;
  if (!id || !status) return NextResponse.json({ error: "id, status required" }, { status: 400 });

  const provider = await updateProviderStatus(Number(id), status);
  return NextResponse.json(provider);
}
