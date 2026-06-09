import prisma from "@/lib/prisma";

export type CollectionPolicyRecord = {
  id: number;
  companyId: number | null;
  reminderDays: number;
  escalationDays: number;
  creditHoldDays: number;
  policyCode: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function listCollectionPolicies(companyId?: number): Promise<CollectionPolicyRecord[]> {
  try {
    return await prisma.collectionPolicy.findMany({
      where: { status: "active", ...(companyId ? { companyId } : {}) },
      orderBy: { id: "asc" },
    });
  } catch {
    return [];
  }
}

export async function createCollectionPolicy(data: {
  companyId?: number;
  reminderDays?: number;
  escalationDays?: number;
  creditHoldDays?: number;
  policyCode?: string;
}): Promise<CollectionPolicyRecord> {
  return prisma.collectionPolicy.create({
    data: {
      companyId: data.companyId ?? null,
      reminderDays: data.reminderDays ?? 7,
      escalationDays: data.escalationDays ?? 14,
      creditHoldDays: data.creditHoldDays ?? 30,
      policyCode: data.policyCode ?? "",
    },
  });
}

export async function updateCollectionPolicy(
  id: number,
  data: Partial<{
    reminderDays: number;
    escalationDays: number;
    creditHoldDays: number;
    policyCode: string;
    status: string;
  }>
): Promise<CollectionPolicyRecord> {
  return prisma.collectionPolicy.update({ where: { id }, data });
}

export function getCollectionAction(daysPastDue: number, policy: CollectionPolicyRecord): "none" | "reminder" | "escalate" | "hold" {
  if (daysPastDue >= policy.creditHoldDays) return "hold";
  if (daysPastDue >= policy.escalationDays) return "escalate";
  if (daysPastDue >= policy.reminderDays) return "reminder";
  return "none";
}
