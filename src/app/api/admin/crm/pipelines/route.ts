// CRM Admin: Pipelines API — Phase 8
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import { listPipelines, createPipeline } from "@/lib/crm-engine";

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const pipelines = await listPipelines();
  return NextResponse.json({ pipelines });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    name: string;
    code: string;
    description?: string;
    isDefault?: boolean;
    companyId?: number;
  };

  if (!body.name || !body.code) {
    return NextResponse.json({ error: "name and code are required" }, { status: 400 });
  }

  const pipeline = await createPipeline(body);
  return NextResponse.json({ pipeline }, { status: 201 });
}
