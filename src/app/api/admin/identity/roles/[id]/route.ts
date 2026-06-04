/**
 * PATCH /api/admin/identity/roles/[id]
 * Updates name, description, level, or status on a Role.
 * System roles cannot have their level or name changed.
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireSettingsEdit();
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id } = await params;
  const roleId = parseInt(id, 10);
  if (isNaN(roleId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json();
  const { name, description, level, status } = body as {
    name?: string; description?: string; level?: number; status?: string;
  };

  try {
    const prisma = (await import("@/lib/prisma")).default;

    const existing = await prisma.role.findUnique({ where: { id: roleId } });
    if (!existing) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (description !== undefined)  data.description = description.trim();
    if (status !== undefined && ["ACTIVE", "INACTIVE"].includes(status)) data.status = status;
    if (!existing.isSystemRole) {
      if (name !== undefined)     data.name  = name.trim();
      if (level !== undefined)    data.level = level;
    }

    const updated = await prisma.role.update({ where: { id: roleId }, data });

    return NextResponse.json({ ok: true, id: updated.id });
  } catch {
    return NextResponse.json({ error: "Service unavailable — DB not ready" }, { status: 503 });
  }
}
