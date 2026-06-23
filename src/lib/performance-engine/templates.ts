import prisma from "@/lib/prisma";

export type KRATemplateInput = {
  companyId?: number;
  name: string;
  description?: string;
  roleId?: number;
  departmentId?: number;
  status?: string;
};

export type KRATemplateItemInput = {
  metricId: number;
  weightage: number;
  targetType?: string;
  minimumTarget?: number;
  expectedTarget?: number;
  stretchTarget?: number;
  sortOrder?: number;
  status?: string;
};

export type KRATemplateWithItems = KRATemplateInput & {
  items: KRATemplateItemInput[];
};

export async function listKRATemplates(companyId?: number) {
  try {
    return await prisma.kRATemplate.findMany({
      where: companyId ? { companyId } : undefined,
      include: { items: { include: { metric: true } } },
      orderBy: { name: "asc" },
    });
  } catch {
    return [];
  }
}

export async function getKRATemplate(id: number) {
  try {
    return await prisma.kRATemplate.findUnique({
      where: { id },
      include: { items: { include: { metric: true }, orderBy: { sortOrder: "asc" } } },
    });
  } catch {
    return null;
  }
}

export async function createKRATemplate(input: KRATemplateWithItems) {
  const { items, ...template } = input;

  // Validate total weightage = 100
  const totalWeight = items.reduce((sum, item) => sum + item.weightage, 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    throw new Error(`KRA template weights must total 100%. Got ${totalWeight.toFixed(2)}%`);
  }

  return await prisma.kRATemplate.create({
    data: {
      ...template,
      items: { create: items },
    },
    include: { items: { include: { metric: true } } },
  });
}

export type KRATemplateItemUpdateInput = {
  metricId?: number;
  weightage?: number;
  targetType?: string;
  minimumTarget?: number;
  expectedTarget?: number;
  stretchTarget?: number;
  sortOrder?: number;
  status?: string;
};

// Updates a single template item in place (no delete/recreate of siblings).
// Use this for re-linking one item's metric without disturbing other items
// in the same template — unlike updateKRATemplate(), which replaces the
// entire item set and would change every sibling item's id.
export async function updateKRATemplateItem(id: number, input: KRATemplateItemUpdateInput) {
  return await prisma.kRATemplateItem.update({
    where: { id },
    data: input,
    include: { metric: true },
  });
}

export async function updateKRATemplate(id: number, input: Partial<KRATemplateWithItems>) {
  const { items, ...template } = input;

  if (items) {
    const totalWeight = items.reduce((sum, item) => sum + item.weightage, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error(`KRA template weights must total 100%. Got ${totalWeight.toFixed(2)}%`);
    }
    // Replace all items
    await prisma.kRATemplateItem.deleteMany({ where: { templateId: id } });
    await prisma.kRATemplateItem.createMany({
      data: items.map(item => ({ ...item, templateId: id })),
    });
  }

  return await prisma.kRATemplate.update({
    where: { id },
    data: template,
    include: { items: { include: { metric: true } } },
  });
}

export function validateKRATemplate(items: KRATemplateItemInput[]): string | null {
  if (items.length === 0) return "Template must have at least one KRA item";
  const totalWeight = items.reduce((sum, item) => sum + item.weightage, 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    return `KRA weights must total 100%. Current total: ${totalWeight.toFixed(2)}%`;
  }
  const hasDuplicateMetric = items.length !== new Set(items.map(i => i.metricId)).size;
  if (hasDuplicateMetric) return "Each KRA metric can appear only once per template";
  return null;
}
