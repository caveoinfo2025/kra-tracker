/**
 * GET  /api/admin/policies  — list policies (with optional ?status= and ?categoryId= filters)
 * POST /api/admin/policies  — create a new policy (status=DRAFT)
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deny = await requirePermission(session, "Settings", "Policy", "VIEW");
  if (deny) return deny;

  const { searchParams } = new URL(req.url);
  const status     = searchParams.get("status") ?? undefined;
  const categoryId = searchParams.get("categoryId") ? parseInt(searchParams.get("categoryId")!) : undefined;

  try {
    const { listPolicies } = await import("@/lib/policy-engine");
    const policies = await listPolicies({ status: status as never, categoryId });
    return NextResponse.json(policies);
  } catch {
    const { MOCK_POLICIES } = await import("@/app/settings/policies/data/policyDefaults");
    return NextResponse.json(MOCK_POLICIES);
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deny = await requirePermission(session, "Settings", "Policy", "EDIT");
  if (deny) return deny;

  const userId = session.user.employeeId ?? 0;
  const body = await req.json();
  const { categoryId, name, code, description, scopeType, scopeId, effectiveFrom, effectiveTo } = body as {
    categoryId?: number; name?: string; code?: string; description?: string;
    scopeType?: string; scopeId?: number; effectiveFrom?: string; effectiveTo?: string;
  };

  if (!categoryId || !name || !code) {
    return NextResponse.json({ error: "categoryId, name and code are required" }, { status: 400 });
  }

  try {
    const prisma = (await import("@/lib/prisma")).default;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;

    const policy = await db.policy.create({
      data: {
        categoryId,
        name:        name.trim(),
        code:        code.trim().toUpperCase(),
        description: description?.trim() ?? "",
        scopeType:   scopeType ?? "GLOBAL",
        scopeId:     scopeId ?? null,
        status:      "DRAFT",
        version:     1,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
        effectiveTo:   effectiveTo   ? new Date(effectiveTo)   : null,
        createdBy:   userId,
      },
    }) as { id: number; code: string; status: string; name: string };

    // Audit log
    await db.policyAudit.create({
      data: { policyId: policy.id, action: "CREATED", newValue: policy.name, performedBy: userId },
    });

    return NextResponse.json({ id: policy.id, code: policy.code, status: policy.status }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Service unavailable — DB not ready" }, { status: 503 });
  }
}
