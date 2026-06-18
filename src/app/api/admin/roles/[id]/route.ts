/**
 * GET    /api/admin/roles/[id]  — single role detail
 * PATCH  /api/admin/roles/[id]  — update role meta + page permissions
 * DELETE /api/admin/roles/[id]  — delete role (non-system only)
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import prisma from "@/lib/prisma";

async function requireManager() {
  const session = await getSession();
  if (!session?.user) return { error: "Unauthorized", status: 401 as const };
  if (!session?.user?.isManager) return { error: "Forbidden", status: 403 as const };
  return { session };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireManager();
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id } = await params;
  const role = await prisma.appRole.findUnique({
    where: { id: Number(id) },
    include: { pageAccess: { orderBy: { pageKey: "asc" } } },
  });
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ role });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireManager();
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id } = await params;
  const body = await req.json();
  const { name, label, level, color, description, pageAccess } = body;

  const existing = await prisma.appRole.findUnique({ where: { id: Number(id) } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Update role meta
  await prisma.appRole.update({
    where: { id: Number(id) },
    data: {
      ...(name        !== undefined && { name }),
      ...(label       !== undefined && { label }),
      ...(level       !== undefined && { level }),
      ...(color       !== undefined && { color }),
      ...(description !== undefined && { description }),
    },
  });

  // Update page access if provided
  // pageAccess: Array<{ pageKey, canView, canCreate, canEdit, canDelete }>
  if (Array.isArray(pageAccess)) {
    for (const pa of pageAccess) {
      await prisma.rolePageAccess.upsert({
        where: { roleId_pageKey: { roleId: Number(id), pageKey: pa.pageKey } },
        create: {
          roleId: Number(id),
          pageKey: pa.pageKey,
          canView: pa.canView ?? false,
          canCreate: pa.canCreate ?? false,
          canEdit: pa.canEdit ?? false,
          canDelete: pa.canDelete ?? false,
        },
        update: {
          canView: pa.canView ?? false,
          canCreate: pa.canCreate ?? false,
          canEdit: pa.canEdit ?? false,
          canDelete: pa.canDelete ?? false,
        },
      });
    }
  }

  const updated = await prisma.appRole.findUnique({
    where: { id: Number(id) },
    include: { pageAccess: { orderBy: { pageKey: "asc" } } },
  });
  return NextResponse.json({ role: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireManager();
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id } = await params;
  const role = await prisma.appRole.findUnique({ where: { id: Number(id) } });
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role.isSystem) return NextResponse.json({ error: "System roles cannot be deleted" }, { status: 400 });

  await prisma.appRole.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
