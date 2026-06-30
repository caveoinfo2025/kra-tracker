import prisma from "@/lib/prisma";

export type EmployeeTargetInput = {
  employeeProfileId: number;
  periodId: number;
  templateId?: number;
  targetJson?: string;
  status?: string;
};

export type TeamTargetInput = {
  teamId: number;
  periodId: number;
  targetJson?: string;
  status?: string;
};

export async function listEmployeeTargets(filters?: {
  employeeProfileId?: number;
  periodId?: number;
}) {
  try {
    return await prisma.employeeTarget.findMany({
      where: filters,
      include: {
        period: true,
        achievements: { include: { metric: true } },
        // Surface employee NAME + role context so the UI never shows raw profile IDs (Phase W8.1).
        employeeProfile: {
          include: {
            employee: { select: { name: true } },
            designation: { select: { title: true } },
            department: { select: { name: true } },
            team: { select: { name: true } },
            reportingManager: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return [];
  }
}

/**
 * Phase W8.1 — list employee profiles for the "assign target" name-search dropdown, so the UI can
 * pick an employee by NAME (and show role/department/manager) instead of asking for a raw profile
 * ID. Read-only; never throws.
 */
export async function listEmployeeProfilesForTargeting() {
  try {
    const profiles = await prisma.employeeProfile.findMany({
      where: { employmentStatus: "ACTIVE" },
      include: {
        employee: { select: { name: true } },
        designation: { select: { title: true } },
        department: { select: { name: true } },
        team: { select: { name: true } },
        reportingManager: { select: { name: true } },
      },
    });
    return profiles
      .map((p) => ({
        employeeProfileId: p.id,
        name: p.employee?.name ?? `Profile #${p.id}`,
        designation: p.designation?.title ?? "",
        department: p.department?.name ?? "",
        team: p.team?.name ?? "",
        reportingManager: p.reportingManager?.name ?? "",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export async function getEmployeeTarget(id: number) {
  try {
    return await prisma.employeeTarget.findUnique({
      where: { id },
      include: {
        period: true,
        achievements: { include: { metric: true } },
        reviews: true,
      },
    });
  } catch {
    return null;
  }
}

export async function createEmployeeTarget(input: EmployeeTargetInput) {
  return await prisma.employeeTarget.create({ data: input });
}

export async function updateEmployeeTarget(id: number, input: Partial<EmployeeTargetInput>) {
  return await prisma.employeeTarget.update({ where: { id }, data: input });
}

export async function listTeamTargets(filters?: { teamId?: number; periodId?: number }) {
  try {
    return await prisma.teamTarget.findMany({
      where: filters,
      include: { period: true },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return [];
  }
}

export async function createTeamTarget(input: TeamTargetInput) {
  return await prisma.teamTarget.create({ data: input });
}

export async function updateTeamTarget(id: number, input: Partial<TeamTargetInput>) {
  return await prisma.teamTarget.update({ where: { id }, data: input });
}
