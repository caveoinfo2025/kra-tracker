import prisma from "@/lib/prisma";

export type KRAMetricInput = {
  companyId?: number;
  name: string;
  code: string;
  description?: string;
  metricType?: string;
  calculationSource?: string;
  formulaJson?: string;
  status?: string;
};

export async function listKRAMetrics(companyId?: number) {
  try {
    return await prisma.kRAMetric.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: { name: "asc" },
    });
  } catch {
    return [];
  }
}

export async function getKRAMetric(id: number) {
  try {
    return await prisma.kRAMetric.findUnique({ where: { id } });
  } catch {
    return null;
  }
}

export async function getKRAMetricByCode(code: string) {
  try {
    return await prisma.kRAMetric.findUnique({ where: { code } });
  } catch {
    return null;
  }
}

export async function createKRAMetric(input: KRAMetricInput) {
  return await prisma.kRAMetric.create({ data: input });
}

export async function updateKRAMetric(id: number, input: Partial<KRAMetricInput>) {
  return await prisma.kRAMetric.update({ where: { id }, data: input });
}
