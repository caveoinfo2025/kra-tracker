import prisma from "@/lib/prisma";

export type AdvancePolicyRecord = {
  id: number;
  companyId: number | null;
  maxAdvanceLakhs: number;
  settlementDays: number;
  approvalRequired: boolean;
  policyCode: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function listAdvancePolicies(companyId?: number): Promise<AdvancePolicyRecord[]> {
  try {
    return await prisma.advancePolicy.findMany({
      where: { status: "active", ...(companyId ? { companyId } : {}) },
      orderBy: { id: "asc" },
    });
  } catch {
    return [];
  }
}

export async function createAdvancePolicy(data: {
  companyId?: number;
  maxAdvanceLakhs: number;
  settlementDays?: number;
  approvalRequired?: boolean;
  policyCode?: string;
}): Promise<AdvancePolicyRecord> {
  return prisma.advancePolicy.create({
    data: {
      companyId: data.companyId ?? null,
      maxAdvanceLakhs: data.maxAdvanceLakhs,
      settlementDays: data.settlementDays ?? 30,
      approvalRequired: data.approvalRequired ?? true,
      policyCode: data.policyCode ?? "",
    },
  });
}

export async function updateAdvancePolicy(
  id: number,
  data: Partial<{
    maxAdvanceLakhs: number;
    settlementDays: number;
    approvalRequired: boolean;
    policyCode: string;
    status: string;
  }>
): Promise<AdvancePolicyRecord> {
  return prisma.advancePolicy.update({ where: { id }, data });
}
