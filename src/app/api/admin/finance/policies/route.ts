import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import prisma from "@/lib/prisma";

const ALLOWED_TYPES = ["EXPENSE", "CONVEYANCE", "ADVANCE", "CUSTOMER_CREDIT", "VENDOR", "COLLECTION"] as const;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deny = await requirePermission(session, "Settings", "Finance", "VIEW");
  if (deny) return deny;

  const policyType = req.nextUrl.searchParams.get("policyType") ?? undefined;
  try {
    const policies = await prisma.financePolicy.findMany({
      where: { status: "active", ...(policyType ? { policyType } : {}) },
      orderBy: [{ policyType: "asc" }, { policyName: "asc" }],
    });
    return NextResponse.json({ policies });
  } catch {
    return NextResponse.json({ policies: [] });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deny = await requirePermission(session, "Settings", "Finance", "EDIT");
  if (deny) return deny;

  const body = await req.json() as {
    companyId?: number;
    policyName: string;
    policyType: string;
    policyCode?: string;
    description?: string;
  };

  if (!body.policyName || !body.policyType) {
    return NextResponse.json({ error: "policyName and policyType are required" }, { status: 400 });
  }
  if (!(ALLOWED_TYPES as readonly string[]).includes(body.policyType)) {
    return NextResponse.json({ error: `policyType must be one of: ${ALLOWED_TYPES.join(", ")}` }, { status: 400 });
  }

  try {
    const policy = await prisma.financePolicy.create({
      data: {
        companyId:   body.companyId ?? null,
        policyName:  body.policyName,
        policyType:  body.policyType,
        policyCode:  body.policyCode ?? "",
        description: body.description ?? "",
      },
    });
    return NextResponse.json({ policy }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deny = await requirePermission(session, "Settings", "Finance", "EDIT");
  if (deny) return deny;

  const body = await req.json() as { id: number; [key: string]: unknown };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { id, ...data } = body;
  try {
    const policy = await prisma.financePolicy.update({
      where: { id },
      data: data as Record<string, unknown>,
    });
    return NextResponse.json({ policy });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
