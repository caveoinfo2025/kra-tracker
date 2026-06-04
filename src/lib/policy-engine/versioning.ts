/**
 * Policy versioning helpers.
 *
 * Every time a policy is published (DRAFT → ACTIVE), a PolicyVersion
 * snapshot is created capturing the full policy + rules state.
 * This enables rollback and historical audit.
 */

import type { PolicyActionDef } from "./actions";
import type { ConditionNode } from "./conditions";

export interface PolicySnapshot {
  id:            number;
  code:          string;
  name:          string;
  description:   string;
  version:       number;
  status:        string;
  scopeType:     string;
  scopeId:       number | null;
  effectiveFrom: string | null;
  effectiveTo:   string | null;
  rules: Array<{
    id:        number;
    ruleName:  string;
    priority:  number;
    condition: ConditionNode;
    action:    PolicyActionDef;
    isActive:  boolean;
  }>;
  snapshotAt: string;
}

/** Build a PolicySnapshot from Prisma-shaped data. */
export function buildSnapshot(
  policy: {
    id: number; code: string; name: string; description: string;
    version: number; status: string; scopeType: string; scopeId: number | null;
    effectiveFrom: Date | null; effectiveTo: Date | null;
    rules: Array<{
      id: number; ruleName: string; priority: number;
      conditionJson: string; actionJson: string; isActive: boolean;
    }>;
  }
): PolicySnapshot {
  return {
    id:            policy.id,
    code:          policy.code,
    name:          policy.name,
    description:   policy.description,
    version:       policy.version,
    status:        policy.status,
    scopeType:     policy.scopeType,
    scopeId:       policy.scopeId,
    effectiveFrom: policy.effectiveFrom?.toISOString() ?? null,
    effectiveTo:   policy.effectiveTo?.toISOString() ?? null,
    rules: policy.rules.map((r) => ({
      id:        r.id,
      ruleName:  r.ruleName,
      priority:  r.priority,
      condition: safeParseJson<ConditionNode>(r.conditionJson, { field: "_error", operator: "=", value: true }),
      action:    safeParseJson<PolicyActionDef>(r.actionJson, { type: "ALLOW" }),
      isActive:  r.isActive,
    })),
    snapshotAt: new Date().toISOString(),
  };
}

function safeParseJson<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T; } catch { return fallback; }
}
