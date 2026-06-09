import prisma from "@/lib/prisma";

export type PeriodInput = {
  companyId?: number;
  name: string;
  financialYear?: string;
  periodType?: string;
  startDate: Date | string;
  endDate: Date | string;
  status?: string;
};

export async function listPerformancePeriods(companyId?: number) {
  try {
    return await prisma.performancePeriod.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: [{ financialYear: "desc" }, { startDate: "desc" }],
    });
  } catch {
    return [];
  }
}

export async function getPerformancePeriod(id: number) {
  try {
    return await prisma.performancePeriod.findUnique({ where: { id } });
  } catch {
    return null;
  }
}

export async function createPerformancePeriod(input: PeriodInput) {
  return await prisma.performancePeriod.create({
    data: {
      ...input,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
    },
  });
}

export async function updatePerformancePeriod(id: number, input: Partial<PeriodInput>) {
  const data: Record<string, unknown> = { ...input };
  if (input.startDate) data.startDate = new Date(input.startDate);
  if (input.endDate) data.endDate = new Date(input.endDate);
  return await prisma.performancePeriod.update({ where: { id }, data });
}

export async function getActivePeriod(companyId?: number) {
  try {
    return await prisma.performancePeriod.findFirst({
      where: { status: "active", ...(companyId ? { companyId } : {}) },
      orderBy: { startDate: "desc" },
    });
  } catch {
    return null;
  }
}
