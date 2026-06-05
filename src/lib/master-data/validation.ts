/**
 * Master Data — Validation Service
 *
 * Validates data against MasterValidationRule entries.
 * Integrates with the Policy Engine for policy-based rules.
 */

export interface ValidationResult {
  valid:    boolean;
  errors:   string[];
  warnings: string[];
}

export interface MasterValidationRule {
  id:                 number;
  masterDefinitionId: number;
  policyId:           number | null;
  ruleName:           string;
  isActive:           boolean;
}

export async function listValidationRules(masterDefinitionId: number): Promise<MasterValidationRule[]> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (prisma as any).masterValidationRule.findMany({
      where:   { masterDefinitionId, isActive: true },
      orderBy: { id: "asc" },
    }) as Array<Record<string, unknown>>;
    return rows.map(_mapRule);
  } catch {
    return [];
  }
}

export async function createValidationRule(data: {
  masterDefinitionId: number;
  ruleName:           string;
  policyId?:          number;
  isActive?:          boolean;
}): Promise<MasterValidationRule | null> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await (prisma as any).masterValidationRule.create({
      data: {
        masterDefinitionId: data.masterDefinitionId,
        ruleName:           data.ruleName,
        policyId:           data.policyId  ?? null,
        isActive:           data.isActive  ?? true,
      },
    }) as Record<string, unknown>;
    return _mapRule(row);
  } catch {
    return null;
  }
}

/**
 * Validate a value against all active rules for a master definition.
 * Rules with a policyId are evaluated via the Policy Engine.
 */
export async function validateMasterData(opts: {
  masterDefinitionId: number;
  value:              string;
  context?:           Record<string, unknown>;
}): Promise<ValidationResult> {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] };

  try {
    const rules = await listValidationRules(opts.masterDefinitionId);
    if (rules.length === 0) return result;

    const policyRules = rules.filter((r) => r.policyId !== null);

    if (policyRules.length > 0) {
      try {
        const { evaluatePolicy } = await import("@/lib/policy-engine");

        for (const rule of policyRules) {
          const evalResult = await evaluatePolicy({
            module: "MASTERS",
            event:  rule.ruleName,
            data:   { policyId: rule.policyId!, value: opts.value, ...(opts.context ?? {}) },
          });

          if (evalResult && !evalResult.allowed) {
            result.valid = false;
            result.errors.push(`Validation rule "${rule.ruleName}" failed`);
          }
        }
      } catch {
        // Policy engine not available — skip policy-based rules
        result.warnings.push("Policy engine unavailable; policy-based rules skipped");
      }
    }
  } catch {
    // Pre-migration safe
  }

  return result;
}

function _mapRule(r: Record<string, unknown>): MasterValidationRule {
  return {
    id:                 r.id                 as number,
    masterDefinitionId: r.masterDefinitionId as number,
    policyId:           r.policyId           as number | null,
    ruleName:           r.ruleName           as string,
    isActive:           Boolean(r.isActive),
  };
}
