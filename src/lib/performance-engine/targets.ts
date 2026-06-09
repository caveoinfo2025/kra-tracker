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
      },
      orderBy: { createdAt: "desc" },
    });
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
