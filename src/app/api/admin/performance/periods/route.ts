import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import {
  listPerformancePeriods,
  createPerformancePeriod,
  updatePerformancePeriod,
} from "@/lib/performance-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "Performance", "EDIT");
  if (deny) return deny;

  const companyId = req.nextUrl.searchParams.get("companyId");
  const periods = await listPerformancePeriods(companyId ? Number(companyId) : undefined);
  return NextResponse.json(periods);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "Performance", "EDIT");
  if (deny) return deny;

  const body = await req.json();
  if (!body.name || !body.startDate || !body.endDate) {
    return NextResponse.json({ error: "name, startDate, endDate required" }, { status: 400 });
  }

  const period = await createPerformancePeriod(body as unknown as Parameters<typeof createPerformancePeriod>[0]);
  return NextResponse.json(period, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "Performance", "EDIT");
  if (deny) return deny;

  const body = await req.json();
  const { id, ...input } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const period = await updatePerformancePeriod(Number(id), input);
  return NextResponse.json(period);
}
