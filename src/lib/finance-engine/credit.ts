import prisma from "@/lib/prisma";

export type CustomerCreditPolicyRecord = {
  id: number;
  companyId: number | null;
  customerType: string;
  defaultCreditLimitLakhs: number;
  maxCreditLimitLakhs: number;
  approvalAboveLimit: boolean;
  paymentTermsDays: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function listCreditPolicies(companyId?: number): Promise<CustomerCreditPolicyRecord[]> {
  try {
    return await prisma.customerCreditPolicy.findMany({
      where: { status: "active", ...(companyId ? { companyId } : {}) },
      orderBy: { customerType: "asc" },
    });
  } catch {
    return [];
  }
}

export async function createCreditPolicy(data: {
  companyId?: number;
  customerType?: string;
  defaultCreditLimitLakhs: number;
  maxCreditLimitLakhs: number;
  approvalAboveLimit?: boolean;
  paymentTermsDays?: number;
}): Promise<CustomerCreditPolicyRecord> {
  return prisma.customerCreditPolicy.create({
    data: {
      companyId: data.companyId ?? null,
      customerType: data.customerType ?? "STANDARD",
      defaultCreditLimitLakhs: data.defaultCreditLimitLakhs,
      maxCreditLimitLakhs: data.maxCreditLimitLakhs,
      approvalAboveLimit: data.approvalAboveLimit ?? true,
      paymentTermsDays: data.paymentTermsDays ?? 30,
    },
  });
}

export async function updateCreditPolicy(
  id: number,
  data: Partial<{
    customerType: string;
    defaultCreditLimitLakhs: number;
    maxCreditLimitLakhs: number;
    approvalAboveLimit: boolean;
    paymentTermsDays: number;
    status: string;
  }>
): Promise<CustomerCreditPolicyRecord> {
  return prisma.customerCreditPolicy.update({ where: { id }, data });
}

export async function checkCustomerCredit(params: {
  customerType: string;
  requestedLakhs: number;
  companyId?: number;
}): Promise<{ approved: boolean; requiresApproval: boolean; limit: number }> {
  try {
    const policy = await prisma.customerCreditPolicy.findFirst({
      where: {
        customerType: params.customerType,
        status: "active",
        ...(params.companyId ? { companyId: params.companyId } : {}),
      },
    });
    if (!policy) return { approved: true, requiresApproval: false, limit: 0 };
    if (params.requestedLakhs > policy.maxCreditLimitLakhs) {
      return { approved: false, requiresApproval: true, limit: policy.maxCreditLimitLakhs };
    }
    if (params.requestedLakhs > policy.defaultCreditLimitLakhs && policy.approvalAboveLimit) {
      return { approved: false, requiresApproval: true, limit: policy.defaultCreditLimitLakhs };
    }
    return { approved: true, requiresApproval: false, limit: policy.maxCreditLimitLakhs };
  } catch {
    return { approved: true, requiresApproval: false, limit: 0 }; // fail-open
  }
}
