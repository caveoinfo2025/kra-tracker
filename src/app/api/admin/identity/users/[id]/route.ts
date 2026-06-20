/**
 * PATCH /api/admin/identity/users/[id]
 * - { employmentStatus }  → upserts EmployeeProfile status
 * - { addRoleId }         → creates UserRole record (idempotent)
 * - { removeRoleId }      → deletes UserRole record
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deny = await requirePermission(session, "Settings", "Identity", "EDIT");
  if (deny) return deny;

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json();
  const { employmentStatus, addRoleId, removeRoleId } = body as {
    employmentStatus?: string;
    addRoleId?:        number;
    removeRoleId?:     number;
  };

  const validStatuses = ["ACTIVE", "DRAFT", "SUSPENDED", "INACTIVE"];
  if (employmentStatus && !validStatuses.includes(employmentStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const prisma = (await import("@/lib/prisma")).default;

    const employee = await prisma.employee.findUnique({ where: { id: userId } });
    if (!employee) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (employmentStatus) {
      await prisma.employeeProfile.upsert({
        where:  { userId },
        update: { employmentStatus },
        create: { userId, employmentStatus },
      });

      // HR automation: revoke all RBAC access when deactivating
      if (employmentStatus === "INACTIVE" || employmentStatus === "SUSPENDED") {
        await prisma.userRole.deleteMany({ where: { userId } });
      }
    }

    if (addRoleId) {
      const role = await prisma.role.findUnique({ where: { id: addRoleId } });
      if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
      // upsert — @@unique([userId, roleId]) makes create idempotent via skipDuplicates
      await prisma.userRole.upsert({
        where:  { userId_roleId: { userId, roleId: addRoleId } },
        update: {},
        create: { userId, roleId: addRoleId },
      });
    }

    if (removeRoleId) {
      await prisma.userRole.deleteMany({ where: { userId, roleId: removeRoleId } });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Service unavailable — DB not ready" }, { status: 503 });
  }
}
