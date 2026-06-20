/**
 * POST /api/admin/identity/policies/[roleId]
 * Upserts data access policy scopes for the given role.
 * Body: { policies: Array<{ module: string; scope: string }> }
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";

const VALID_SCOPES = ["OWN", "TEAM", "DEPARTMENT", "BRANCH", "COMPANY", "ALL"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deny = await requirePermission(session, "Settings", "Identity", "EDIT");
  if (deny) return deny;

  const { roleId: roleIdStr } = await params;
  const roleId = parseInt(roleIdStr, 10);
  if (isNaN(roleId)) return NextResponse.json({ error: "Invalid roleId" }, { status: 400 });

  const body = await req.json();
  const policies: Array<{ module: string; scope: string }> = body.policies ?? [];
  if (!policies.length) return NextResponse.json({ ok: true, applied: 0 });

  const invalid = policies.find((p) => !VALID_SCOPES.includes(p.scope));
  if (invalid) return NextResponse.json({ error: `Invalid scope: ${invalid.scope}` }, { status: 400 });

  try {
    const prisma = (await import("@/lib/prisma")).default;

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    for (const { module, scope } of policies) {
      await prisma.dataAccessPolicy.upsert({
        where:  { roleId_module: { roleId, module } },
        update: { scope },
        create: { roleId, module, scope },
      });
    }

    return NextResponse.json({ ok: true, applied: policies.length });
  } catch {
    return NextResponse.json({ error: "Service unavailable — DB not ready" }, { status: 503 });
  }
}
