import prisma from "@/lib/prisma";

export type ExpenseCategoryRecord = {
  id: number;
  companyId: number | null;
  name: string;
  code: string;
  description: string;
  requiresReceipt: boolean;
  requiresApproval: boolean;
  parentId: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ExpenseLimitRuleRecord = {
  id: number;
  expenseCategoryId: number;
  scopeType: string;
  scopeId: string;
  dailyLimit: number;
  monthlyLimit: number;
  yearlyLimit: number;
  policyCode: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function listExpenseCategories(companyId?: number): Promise<ExpenseCategoryRecord[]> {
  try {
    return await prisma.expenseCategory.findMany({
      where: { status: "active", ...(companyId ? { companyId } : {}) },
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
    });
  } catch {
    return [];
  }
}

export async function createExpenseCategory(data: {
  companyId?: number;
  name: string;
  code: string;
  description?: string;
  requiresReceipt?: boolean;
  requiresApproval?: boolean;
  parentId?: number;
}): Promise<ExpenseCategoryRecord> {
  return prisma.expenseCategory.create({
    data: {
      companyId: data.companyId ?? null,
      name: data.name,
      code: data.code,
      description: data.description ?? "",
      requiresReceipt: data.requiresReceipt ?? false,
      requiresApproval: data.requiresApproval ?? false,
      parentId: data.parentId ?? null,
    },
  });
}

export async function updateExpenseCategory(
  id: number,
  data: Partial<{
    name: string;
    description: string;
    requiresReceipt: boolean;
    requiresApproval: boolean;
    parentId: number | null;
    status: string;
  }>
): Promise<ExpenseCategoryRecord> {
  return prisma.expenseCategory.update({ where: { id }, data });
}

export async function listExpenseLimitRules(categoryId?: number): Promise<ExpenseLimitRuleRecord[]> {
  try {
    return await prisma.expenseLimitRule.findMany({
      where: categoryId ? { expenseCategoryId: categoryId } : {},
      orderBy: { id: "asc" },
    });
  } catch {
    return [];
  }
}

export async function upsertExpenseLimitRule(data: {
  expenseCategoryId: number;
  scopeType: string;
  scopeId: string;
  dailyLimit: number;
  monthlyLimit: number;
  yearlyLimit: number;
  policyCode?: string;
}): Promise<ExpenseLimitRuleRecord> {
  const existing = await prisma.expenseLimitRule.findFirst({
    where: {
      expenseCategoryId: data.expenseCategoryId,
      scopeType: data.scopeType,
      scopeId: data.scopeId,
    },
  });
  if (existing) {
    return prisma.expenseLimitRule.update({
      where: { id: existing.id },
      data: {
        dailyLimit: data.dailyLimit,
        monthlyLimit: data.monthlyLimit,
        yearlyLimit: data.yearlyLimit,
        policyCode: data.policyCode ?? "",
      },
    });
  }
  return prisma.expenseLimitRule.create({ data: { ...data, policyCode: data.policyCode ?? "" } });
}

export async function validateExpense(params: {
  categoryId: number;
  amount: number;
  scopeType: string;
  scopeId: string;
}): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const rule = await prisma.expenseLimitRule.findFirst({
      where: {
        expenseCategoryId: params.categoryId,
        scopeType: params.scopeType,
        scopeId: params.scopeId,
      },
    });
    if (!rule) return { allowed: true };
    if (rule.dailyLimit > 0 && params.amount > rule.dailyLimit) {
      return { allowed: false, reason: `Exceeds daily limit of ${rule.dailyLimit}` };
    }
    return { allowed: true };
  } catch {
    return { allowed: true }; // fail-open
  }
}
