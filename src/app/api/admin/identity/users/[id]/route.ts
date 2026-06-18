/**
 * PATCH /api/admin/identity/users/[id]
 * Updates employmentStatus on EmployeeProfile (upserts if profile doesn't exist yet).
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
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
  const userId = parseInt(id, 10);
  if (isNaN(userId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json();
  const { employmentStatus } = body as { employmentStatus?: string };

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
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Service unavailable — DB not ready" }, { status: 503 });
  }
}
