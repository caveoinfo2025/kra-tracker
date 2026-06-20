import { NextResponse } from "next/server";
import { getSession }   from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import { getVendorPolicy, upsertVendorPolicy } from "@/lib/master-data";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deny = await requirePermission(session, "Settings", "Masters", "VIEW");
  if (deny) return deny;

  const { searchParams } = new URL(req.url);
  const companyId        = searchParams.get("companyId");

  try {
    const policy = await getVendorPolicy(companyId ? Number(companyId) : undefined);
    return NextResponse.json({ policy });
  } catch {
    return NextResponse.json({ policy: null });
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
    const policy = await upsertVendorPolicy({
      companyId:                body.companyId                as number  | undefined,
      gstRequired:              body.gstRequired              as boolean | undefined,
      panRequired:              body.panRequired              as boolean | undefined,
      bankVerificationRequired: body.bankVerificationRequired as boolean | undefined,
      approvalRequired:         body.approvalRequired         as boolean | undefined,
      actorId,
    });
    if (!policy) return NextResponse.json({ error: "Failed to save policy" }, { status: 503 });
    return NextResponse.json({ policy }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
