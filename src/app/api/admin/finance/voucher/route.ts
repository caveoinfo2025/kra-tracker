import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { listVoucherConfigs, createVoucherConfig, updateVoucherConfig } from "@/lib/finance-engine";

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const configs = await listVoucherConfigs();
  return NextResponse.json({ configs });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as Parameters<typeof createVoucherConfig>[0];
  if (!body.voucherType || !body.prefix) {
    return NextResponse.json({ error: "voucherType and prefix are required" }, { status: 400 });
  }

  const config = await createVoucherConfig(body);
  return NextResponse.json({ config }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { id: number; [key: string]: unknown };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { id, ...data } = body;
  const config = await updateVoucherConfig(id, data as Parameters<typeof updateVoucherConfig>[1]);
  return NextResponse.json({ config });
}
