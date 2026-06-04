/**
 * POST /api/admin/identity/permissions/[roleId]
 * Applies a batch of permission changes (grant or revoke) for the given role.
 * Body: { changes: Array<{ module: string; resource: string; action: string; granted: boolean }> }
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

interface PermissionChange {
  module:   string;
  resource: string;
  action:   string;
  granted:  boolean;
}

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
  const changes: PermissionChange[] = body.changes ?? [];
  if (!changes.length) return NextResponse.json({ ok: true, applied: 0 });

  try {
    const prisma = (await import("@/lib/prisma")).default;

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    let applied = 0;
    for (const change of changes) {
      const perm = await prisma.permission.findUnique({
        where: { module_resource_action: { module: change.module, resource: change.resource, action: change.action } },
      });
      if (!perm) continue;

      if (change.granted) {
        await prisma.rolePermission.upsert({
          where:  { roleId_permissionId: { roleId, permissionId: perm.id } },
          update: {},
          create: { roleId, permissionId: perm.id },
        });
      } else {
        await prisma.rolePermission.deleteMany({ where: { roleId, permissionId: perm.id } });
      }
      applied++;
    }

    return NextResponse.json({ ok: true, applied });
  } catch {
    return NextResponse.json({ error: "Service unavailable — DB not ready" }, { status: 503 });
  }
}
