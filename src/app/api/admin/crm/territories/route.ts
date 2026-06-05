import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { listTerritories, createTerritory } from "@/lib/crm-engine";

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const territories = await listTerritories();
  return NextResponse.json({ territories });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    name: string;
    description?: string;
    companyId?: number;
    rules?: Array<{ conditionJson: string }>;
  };

  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const territory = await createTerritory(body);
  return NextResponse.json({ territory }, { status: 201 });
}
