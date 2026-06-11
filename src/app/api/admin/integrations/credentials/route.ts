import { NextRequest, NextResponse } from "next/server";
import { getSession }               from "@/lib/dev-session";
import {
  listCredentials,
  createCredential,
  updateCredential,
} from "@/lib/integration-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const companyId = req.nextUrl.searchParams.get("companyId");
  const creds = await listCredentials(companyId ? Number(companyId) : undefined);
  // isResolved tells the UI whether the env var is set — never returns the actual value
  return NextResponse.json(creds);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.name || !body.environmentVariableName) {
    return NextResponse.json({ error: "name, environmentVariableName required" }, { status: 400 });
  }
  if (body.environmentVariableName.includes(" ")) {
    return NextResponse.json({ error: "environmentVariableName must not contain spaces" }, { status: 400 });
  }

  const cred = await createCredential(body);
  return NextResponse.json(cred, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, ...input } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const cred = await updateCredential(Number(id), input);
  return NextResponse.json(cred);
}
