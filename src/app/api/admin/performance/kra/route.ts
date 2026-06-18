import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import { listKRAMetrics, createKRAMetric, updateKRAMetric } from "@/lib/performance-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "Performance", "EDIT");
  if (deny) return deny;

  const companyId = req.nextUrl.searchParams.get("companyId");
  const metrics = await listKRAMetrics(companyId ? Number(companyId) : undefined);
  return NextResponse.json(metrics);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "Performance", "EDIT");
  if (deny) return deny;

  const body = await req.json();
  if (!body.name || !body.code) {
    return NextResponse.json({ error: "name and code required" }, { status: 400 });
  }

  const metric = await createKRAMetric(body as unknown as Parameters<typeof createKRAMetric>[0]);
  return NextResponse.json(metric, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "Performance", "EDIT");
  if (deny) return deny;

  const body = await req.json();
  const { id, ...input } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const metric = await updateKRAMetric(Number(id), input);
  return NextResponse.json(metric);
}
