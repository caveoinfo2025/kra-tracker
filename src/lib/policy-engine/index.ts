/**
 * Policy Engine — public API
 *
 * Usage (server components / API routes / business logic):
 *
 *   import { evaluatePolicy } from "@/lib/policy-engine";
 *
 *   const result = await evaluatePolicy({
 *     module: "FINANCE",
 *     event:  "EXPENSE_SUBMIT",
 *     data:   { amount: 75000, employeeId: 3 },
 *   });
 *
 *   if (!result.allowed) return { error: "Blocked by policy" };
 *   const needsApproval = result.actions.some(a => a.type === "REQUIRE_APPROVAL");
 *
 * The engine:
 *   1. Loads all ACTIVE policies for the given module/event.
 *   2. Evaluates each policy's rules against the data payload.
 *   3. Collects all matched actions across all policies.
 *   4. Returns allowed=false if any action is BLOCK; true otherwise.
 *
 * Falls back to { allowed: true, actions: [] } when the DB tables don't
 * exist yet (pre-migration), so existing flows are never broken.
 */

export { evaluateCondition, evaluateConditionJson } from "./conditions";
export { parseActionJson, isBlockingAction } from "./actions";
export { evaluateRules } from "./rules";
export { buildSnapshot } from "./versioning";
export { listPolicies, transitionPolicyStatus } from "./policy";
export type { PolicySummary, PolicyStatus, ScopeType } from "./policy";
export type { ConditionNode, LeafCondition, Operator } from "./conditions";
export type { PolicyActionDef, ActionType } from "./actions";
export type { RuleData, RuleMatch } from "./rules";
export type { PolicySnapshot } from "./versioning";

import { evaluateRules }    from "./rules";
import { isBlockingAction, type PolicyActionDef } from "./actions";

export interface EvaluatePolicyInput {
  /** The admin module this event belongs to: FINANCE | CRM | SECURITY | etc. */
  module: string;
  /** The business event being triggered: EXPENSE_SUBMIT | DEAL_CREATE | EXPORT | etc. */
  event:  string;
  /** The data payload the rules are evaluated against. */
  data:   Record<string, unknown>;
}

export interface EvaluatePolicyResult {
  allowed:  boolean;
  actions:  PolicyActionDef[];
  /** Which policy codes fired (useful for debugging / audit). */
  matched:  string[];
}

/**
 * Evaluate all active policies that match the given module and event.
 * Safe to call before DB migration — returns allow-all on DB error.
 */
export async function evaluatePolicy(
  input: EvaluatePolicyInput,
): Promise<EvaluatePolicyResult> {
  try {
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;

    // Load active policies for this module.
    // The module is stored in the category code or can be queried via category.
    // We store the module reference in Policy.code prefix (e.g. "CRM_LARGE_DEAL")
    // OR we rely on category.code matching the module name.
    const policies = await (db.policy as {
      findMany: (args: unknown) => Promise<Array<{
        id: number; code: string; status: string;
        rules: Array<{ id: number; ruleName: string; priority: number; conditionJson: string; actionJson: string; isActive: boolean }>;
        category: { code: string };
      }>>;
    }).findMany({
      where: {
        status: "ACTIVE",
        category: { code: input.module },
      },
      include: {
        rules:    true,
        category: { select: { code: true } },
      },
    });

    const allActions: PolicyActionDef[] = [];
    const matched: string[] = [];

    for (const policy of policies) {
      const ruleMatches = evaluateRules(policy.rules, { ...input.data, _event: input.event });

      if (ruleMatches.length > 0) {
        matched.push(policy.code);
        allActions.push(...ruleMatches.map((m) => m.action));
      }
    }

    const blocked = allActions.some(isBlockingAction);

    return {
      allowed: !blocked,
      actions: allActions,
      matched,
    };
  } catch {
    // Pre-migration or DB error — fail open to preserve existing flows.
    return { allowed: true, actions: [], matched: [] };
  }
}
