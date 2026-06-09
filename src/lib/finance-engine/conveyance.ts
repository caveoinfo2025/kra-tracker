import prisma from "@/lib/prisma";

export type ConveyancePolicyRecord = {
  id: number;
  companyId: number | null;
  vehicleType: string;
  ratePerKm: number;
  monthlyLimitRupees: number;
  googleMapRequired: boolean;
  allowManualOverride: boolean;
  overrideApprovalRequired: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function listConveyancePolicies(companyId?: number): Promise<ConveyancePolicyRecord[]> {
  try {
    return await prisma.conveyancePolicy.findMany({
      where: { status: "active", ...(companyId ? { companyId } : {}) },
      orderBy: { vehicleType: "asc" },
    });
  } catch {
    return [];
  }
}

export async function createConveyancePolicy(data: {
  companyId?: number;
  vehicleType: string;
  ratePerKm: number;
  monthlyLimitRupees?: number;
  googleMapRequired?: boolean;
  allowManualOverride?: boolean;
  overrideApprovalRequired?: boolean;
}): Promise<ConveyancePolicyRecord> {
  return prisma.conveyancePolicy.create({
    data: {
      companyId: data.companyId ?? null,
      vehicleType: data.vehicleType,
      ratePerKm: data.ratePerKm,
      monthlyLimitRupees: data.monthlyLimitRupees ?? 0,
      googleMapRequired: data.googleMapRequired ?? false,
      allowManualOverride: data.allowManualOverride ?? true,
      overrideApprovalRequired: data.overrideApprovalRequired ?? false,
    },
  });
}

export async function updateConveyancePolicy(
  id: number,
  data: Partial<{
    vehicleType: string;
    ratePerKm: number;
    monthlyLimitRupees: number;
    googleMapRequired: boolean;
    allowManualOverride: boolean;
    overrideApprovalRequired: boolean;
    status: string;
  }>
): Promise<ConveyancePolicyRecord> {
  return prisma.conveyancePolicy.update({ where: { id }, data });
}

export function calculateConveyance(
  vehicleType: string,
  distanceKm: number,
  policies: ConveyancePolicyRecord[]
): { amount: number; ratePerKm: number } {
  const policy = policies.find((p) => p.vehicleType === vehicleType && p.status === "active");
  if (!policy) return { amount: 0, ratePerKm: 0 };
  return { amount: distanceKm * policy.ratePerKm, ratePerKm: policy.ratePerKm };
}
