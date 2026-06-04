/**
 * Rule evaluation for the Policy Engine.
 *
 * Each PolicyRule has a conditionJson and an actionJson.
 * Rules are sorted by priority (lower number = higher priority).
 * The first matching rule wins unless combineAll is set.
 */

import { evaluateConditionJson } from "./conditions";
import { parseActionJson, type PolicyActionDef } from "./actions";

export interface RuleData {
  id:            number;
  ruleName:      string;
  priority:      number;
  conditionJson: string;
  actionJson:    string;
  isActive:      boolean;
}

export interface RuleMatch {
  ruleId:   number;
  ruleName: string;
  action:   PolicyActionDef;
}

/**
 * Evaluate a list of rules against a data payload.
 *
 * @param rules    - Active rules sorted by priority asc (highest priority first)
 * @param data     - The event payload to test conditions against
 * @param combineAll - If true, collect all matching rules; if false (default), stop at first BLOCK
 * @returns Array of matched rules in priority order
 */
export function evaluateRules(
  rules: RuleData[],
  data: Record<string, unknown>,
  combineAll = true,
): RuleMatch[] {
  const active = rules
    .filter((r) => r.isActive)
    .sort((a, b) => a.priority - b.priority);

  const matches: RuleMatch[] = [];

  for (const rule of active) {
    const conditionMet = evaluateConditionJson(rule.conditionJson, data);
    if (!conditionMet) continue;

    const action = parseActionJson(rule.actionJson);
    if (!action) continue;

    matches.push({ ruleId: rule.id, ruleName: rule.ruleName, action });

    // Short-circuit on BLOCK unless combineAll is set
    if (!combineAll && action.type === "BLOCK") break;
  }

  return matches;
}
