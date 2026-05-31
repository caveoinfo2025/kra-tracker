/**
 * GET  /api/admin/roles      — all roles with page access and employee counts
 * POST /api/admin/roles      — create a new role
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { seedDefaultRoles } from "@/lib/rbac";
import prisma from "@/lib/prisma";

async function requireManager() {
  const session = await getSession();
  if (!session?.user) return { error: "Unauthorized", status: 401 as const };
  if (!session.user.isManager) return { error: "Forbidden", status: 403 as const };
  return { session };
}

export async function GET() {
  const check = await requireManager();
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  // Seed defaults on first call
  await seedDefaultRoles();

  const roles = await prisma.appRole.findMany({
    include: {
      pageAccess: { orderBy: { pageKey: "asc" } },
    },
    orderBy: { level: "desc" },
  });

  // Attach employee counts
  const empCounts = await prisma.employee.groupBy({ by: ["role"], _count: { id: true } });
  const countMap: Record<string, number> = {};
  for (const e of empCounts) countMap[e.role] = e._count.id;

  const result = roles.map((r) => ({
    ...r,
    employeeCount: countMap[r.name] ?? 0,
  }));

  return NextResponse.json({ roles: result });
}

export async function POST(req: Request) {
  const check = await requireManager();
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  const body = await req.json();
  const { name, label, level, color, description } = body;

  if (!name || !label || typeof level !== "number") {
    return NextResponse.json({ error: "name, label and level are required" }, { status: 400 });
  }

  const { PAGES } = await import("@/lib/rbac");
  const role = await prisma.appRole.create({
    data: {
      name, label, level,
      color: color ?? "#6b7280",
      description: description ?? "",
      isSystem: false,
      pageAccess: {
        create: PAGES.map((p) => ({
          pageKey: p.key,
          canView: false, canCreate: false, canEdit: false, canDelete: false,
        })),
      },
    },
    include: { pageAccess: true },
  });

  return NextResponse.json({ role }, { status: 201 });
}
