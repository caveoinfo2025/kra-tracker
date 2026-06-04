/**
 * GET /api/admin/identity/users
 * Returns all employees joined with their EmployeeProfile + UserRoles.
 * Falls back to mock data when DB is unavailable.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { canAccessSettings } from "@/lib/roles";

async function requireSettingsAccess() {
  const session = await getSession();
  if (!session?.user) return { error: "Unauthorized", status: 401 as const };
  if (!canAccessSettings(session.user)) return { error: "Forbidden", status: 403 as const };
  return { session };
}

export async function GET() {
  const check = await requireSettingsAccess();
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  try {
    const prisma = (await import("@/lib/prisma")).default;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const employees = await (prisma.employee as any).findMany({
      orderBy: { name: "asc" },
      include: {
        employeeProfile: {
          include: {
            company:         { select: { companyName: true } },
            branch:          { select: { branchName: true } },
            department:      { select: { name: true } },
            team:            { select: { name: true } },
            designation:     { select: { title: true } },
            reportingManager: { select: { name: true } },
          },
        },
        userRoles: {
          include: { role: { select: { id: true, name: true } } },
        },
      },
    }) as Array<Record<string, unknown>>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const users = employees.map((e: any) => ({
      id:                    e.id,
      employeeCode:          e.employeeProfile?.employeeCode ?? `EMP${String(e.id).padStart(3, "0")}`,
      name:                  e.name,
      email:                 e.email,
      legacyRole:            e.role,
      isManager:             e.isManager,
      companyName:           e.employeeProfile?.company?.companyName ?? null,
      branchName:            e.employeeProfile?.branch?.branchName ?? null,
      departmentName:        e.employeeProfile?.department?.name ?? e.department ?? null,
      teamName:              e.employeeProfile?.team?.name ?? null,
      designationTitle:      e.employeeProfile?.designation?.title ?? null,
      reportingManagerName:  e.employeeProfile?.reportingManager?.name ?? null,
      employmentStatus:      (e.employeeProfile?.employmentStatus ?? "ACTIVE") as "ACTIVE" | "DRAFT" | "SUSPENDED" | "INACTIVE",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assignedRoles:         (e.userRoles ?? []).map((ur: any) => ({ id: ur.role.id, name: ur.role.name })),
      lastLoginAt:           null,
    }));

    return NextResponse.json(users);
  } catch {
    const { MOCK_USERS } = await import("@/app/settings/identity/data/identityDefaults");
    return NextResponse.json(MOCK_USERS);
  }
}
