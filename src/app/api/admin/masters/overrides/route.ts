import { NextResponse } from "next/server";
import { getSession }   from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import { listOverrides, upsertOverride } from "@/lib/master-data";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deny = await requirePermission(session, "Settings", "Masters", "VIEW");
  if (deny) return deny;

  const { searchParams } = new URL(req.url);
  const masterValueId    = searchParams.get("masterValueId");
  const scopeType        = searchParams.get("scopeType");
  const scopeId          = searchParams.get("scopeId");

  try {
    const overrides = await listOverrides({
      masterValueId: masterValueId ? Number(masterValueId) : undefined,
      scopeType:     scopeType ?? undefined,
      scopeId:       scopeId   ? Number(scopeId)           : undefined,
    });
    return NextResponse.json({ overrides });
  } catch {
    return NextResponse.json({ overrides: [] });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deny = await requirePermission(session, "Settings", "Masters", "EDIT");
  if (deny) return deny;

  const actorId = session.user.employeeId!;

  try {
    const body = await req.json() as Record<string, unknown>;
    const override = await upsertOverride({
      masterValueId: body.masterValueId as number,
      scopeType:     body.scopeType     as string,
      scopeId:       body.scopeId       as number,
      customValue:   body.customValue   as string | undefined,
      isEnabled:     body.isEnabled     as boolean | undefined,
      actorId,
    });
    if (!override) return NextResponse.json({ error: "Failed to save override" }, { status: 503 });
    return NextResponse.json({ override }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
