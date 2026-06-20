/**
 * GET  /api/admin/identity/roles  — list all Roles with permission + user counts
 * POST /api/admin/identity/roles  — create a new custom role
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deny = await requirePermission(session, "Settings", "Identity", "VIEW");
  if (deny) return deny;

  try {
    const prisma = (await import("@/lib/prisma")).default;

    const roles = await prisma.role.findMany({
      orderBy: { level: "desc" },
      include: {
        _count: {
          select: { rolePermissions: true, userRoles: true },
        },
      },
    });

    const result = roles.map((r) => ({
      id:              r.id,
      name:            r.name,
      description:     r.description,
      level:           r.level,
      isSystemRole:    r.isSystemRole,
      status:          r.status as "ACTIVE" | "INACTIVE",
      permissionCount: r._count.rolePermissions,
      userCount:       r._count.userRoles,
    }));

    return NextResponse.json(result);
  } catch {
    const { MOCK_ROLES } = await import("@/app/settings/identity/data/identityDefaults");
    return NextResponse.json(MOCK_ROLES);
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deny = await requirePermission(session, "Settings", "Identity", "EDIT");
  if (deny) return deny;

  const body = await req.json();
  const { name, description, level } = body as { name?: string; description?: string; level?: number };

  if (!name || typeof level !== "number") {
    return NextResponse.json({ error: "name and level are required" }, { status: 400 });
  }

  try {
    const prisma = (await import("@/lib/prisma")).default;

    const role = await prisma.role.create({
      data: {
        name:        name.trim(),
        description: description?.trim() ?? "",
        level,
        isSystemRole: false,
        status:       "ACTIVE",
      },
    });

    return NextResponse.json({
      id: role.id, name: role.name, description: role.description,
      level: role.level, isSystemRole: role.isSystemRole, status: role.status,
      permissionCount: 0, userCount: 0,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Service unavailable — DB not ready" }, { status: 503 });
  }
}
