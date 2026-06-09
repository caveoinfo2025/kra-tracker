import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import {
  listKRATemplates,
  createKRATemplate,
  updateKRATemplate,
  validateKRATemplate,
} from "@/lib/performance-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const companyId = req.nextUrl.searchParams.get("companyId");
  const templates = await listKRATemplates(companyId ? Number(companyId) : undefined);
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const items = body.items ?? [];
  const validationError = validateKRATemplate(items);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const template = await createKRATemplate(body as unknown as Parameters<typeof createKRATemplate>[0]);
  return NextResponse.json(template, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, ...input } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (input.items) {
    const validationError = validateKRATemplate(input.items);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const template = await updateKRATemplate(Number(id), input);
  return NextResponse.json(template);
}
