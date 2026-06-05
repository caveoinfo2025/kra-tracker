import prisma from "@/lib/prisma";
import type { TerritoryModel as Territory } from "@/generated/prisma/models/Territory";
import type { TerritoryRuleModel as TerritoryRule } from "@/generated/prisma/models/TerritoryRule";

export type { Territory, TerritoryRule };
export type TerritoryWithRules = Territory & { rules: TerritoryRule[] };

export async function listTerritories(companyId?: number): Promise<TerritoryWithRules[]> {
  try {
    return await prisma.territory.findMany({
      where: { status: "active", ...(companyId ? { companyId } : {}) },
      include: { rules: true },
      orderBy: { name: "asc" },
    });
  } catch {
    return [];
  }
}

export async function getTerritory(id: number): Promise<TerritoryWithRules | null> {
  try {
    return await prisma.territory.findUnique({
      where: { id },
      include: { rules: true },
    });
  } catch {
    return null;
  }
}

export async function createTerritory(data: {
  name: string;
  description?: string;
  companyId?: number;
  rules?: Array<{ conditionJson: string }>;
}): Promise<TerritoryWithRules> {
  return prisma.territory.create({
    data: {
      name: data.name,
      description: data.description ?? "",
      companyId: data.companyId ?? null,
      rules: data.rules
        ? { create: data.rules.map((r) => ({ conditionJson: r.conditionJson })) }
        : undefined,
    },
    include: { rules: true },
  });
}

export async function updateTerritory(
  id: number,
  data: Partial<{ name: string; description: string; status: string }>
): Promise<Territory> {
  return prisma.territory.update({ where: { id }, data });
}

export async function addTerritoryRule(
  territoryId: number,
  conditionJson: string
): Promise<TerritoryRule> {
  return prisma.territoryRule.create({ data: { territoryId, conditionJson } });
}

export async function deleteTerritoryRule(ruleId: number): Promise<void> {
  await prisma.territoryRule.delete({ where: { id: ruleId } });
}

// Resolve which territory a record (lead/account) belongs to by evaluating rule conditions
export async function resolveTerritory(
  record: Record<string, unknown>
): Promise<Territory | null> {
  try {
    const territories = await listTerritories();
    for (const territory of territories) {
      for (const rule of territory.rules) {
        let condition: Record<string, unknown>;
        try {
          condition = JSON.parse(rule.conditionJson);
        } catch {
          continue;
        }
        if (matchesCondition(record, condition)) return territory;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function matchesCondition(
  record: Record<string, unknown>,
  condition: Record<string, unknown>
): boolean {
  for (const [key, expected] of Object.entries(condition)) {
    if (key === "$and" && Array.isArray(expected)) {
      if (!expected.every((c) => matchesCondition(record, c as Record<string, unknown>))) return false;
    } else if (key === "$or" && Array.isArray(expected)) {
      if (!expected.some((c) => matchesCondition(record, c as Record<string, unknown>))) return false;
    } else {
      if (record[key] !== expected) return false;
    }
  }
  return true;
}
