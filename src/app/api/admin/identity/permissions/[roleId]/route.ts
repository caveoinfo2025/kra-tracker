/**
 * POST /api/admin/identity/permissions/[roleId]
 * Applies a batch of permission changes (grant or revoke) for the given role.
 * Body: { changes: Array<{ module: string; resource: string; action: string; granted: boolean }> }
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";

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
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deny = await requirePermission(session, "Settings", "Identity", "EDIT");
  if (deny) return deny;

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
