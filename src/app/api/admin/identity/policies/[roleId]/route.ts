/**
 * POST /api/admin/identity/policies/[roleId]
 * Upserts data access policy scopes for the given role.
 * Body: { policies: Array<{ module: string; scope: string }> }
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { canAccessSettings } from "@/lib/roles";

async function requireSettingsEdit() {
  const session = await getSession();
  if (!session?.user) return { error: "Unauthorized", status: 401 as const };
  if (!canAccessSettings(session.user)) return { error: "Forbidden", status: 403 as const };
  return { session };
}

const VALID_SCOPES = ["OWN", "TEAM", "DEPARTMENT", "BRANCH", "COMPANY", "ALL"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const check = await requireSettingsEdit();
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

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
