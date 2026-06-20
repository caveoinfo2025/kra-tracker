/**
 * GET /api/admin/identity/permissions?roleId=X
 * Returns all permissions in the catalogue, each annotated with `granted: boolean`
 * indicating whether the specified role has that permission via RolePermission.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deny = await requirePermission(session, "Settings", "Identity", "VIEW");
  if (deny) return deny;

  const { searchParams } = new URL(req.url);
  const roleId = parseInt(searchParams.get("roleId") ?? "", 10);
  if (isNaN(roleId)) return NextResponse.json({ error: "roleId is required" }, { status: 400 });

  try {
    const prisma = (await import("@/lib/prisma")).default;

    const [permissions, rolePerms] = await Promise.all([
      prisma.permission.findMany({ orderBy: [{ module: "asc" }, { resource: "asc" }, { action: "asc" }] }),
      prisma.rolePermission.findMany({ where: { roleId }, select: { permissionId: true } }),
    ]);

    const grantedIds = new Set(rolePerms.map((rp) => rp.permissionId));

    const result = permissions.map((p) => ({
      id:          p.id,
      module:      p.module,
      resource:    p.resource,
      action:      p.action,
      description: p.description,
      granted:     grantedIds.has(p.id),
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
