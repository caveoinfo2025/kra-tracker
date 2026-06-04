/**
 * Condition evaluator for the Policy Engine.
 *
 * Conditions are stored as JSON in PolicyRule.conditionJson.
 * Supports simple leaf conditions and composite AND/OR trees.
 *
 * Leaf shape:    { field, operator, value }
 * Composite:     { and: [...] }  or  { or: [...] }
 */

export type Operator =
  | "="   | "!="
  | ">"   | "<"  | ">=" | "<="
  | "IN"  | "NOT_IN"
  | "CONTAINS";

export interface LeafCondition {
  field:    string;
  operator: Operator;
  value:    unknown;
}

export interface AndCondition  { and: ConditionNode[]; }
export interface OrCondition   { or:  ConditionNode[]; }

export type ConditionNode = LeafCondition | AndCondition | OrCondition;

/** Resolve a dot-path value from a flat data object: "order.amount" → data["order.amount"] or nested */
function resolve(data: Record<string, unknown>, field: string): unknown {
  if (field in data) return data[field];
  // support simple dot-notation for nested objects
  const parts = field.split(".");
  let cur: unknown = data;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function compare(actual: unknown, op: Operator, expected: unknown): boolean {
  switch (op) {
    case "=":        return actual == expected;                                          // eslint-disable-line eqeqeq
    case "!=":       return actual != expected;                                          // eslint-disable-line eqeqeq
    case ">":        return Number(actual)  >  Number(expected);
    case "<":        return Number(actual)  <  Number(expected);
    case ">=":       return Number(actual)  >= Number(expected);
    case "<=":       return Number(actual)  <= Number(expected);
    case "IN":       return Array.isArray(expected) && expected.includes(actual);
    case "NOT_IN":   return Array.isArray(expected) && !expected.includes(actual);
    case "CONTAINS": {
      const s = String(actual).toLowerCase();
      const e = String(expected).toLowerCase();
      return s.includes(e);
    }
    default:         return false;
  }
}

export function evaluateCondition(node: ConditionNode, data: Record<string, unknown>): boolean {
  if ("and" in node) {
    return node.and.every((child) => evaluateCondition(child, data));
  }
  if ("or" in node) {
    return node.or.some((child) => evaluateCondition(child, data));
  }
  // leaf
  const leaf = node as LeafCondition;
  const actual = resolve(data, leaf.field);
  return compare(actual, leaf.operator, leaf.value);
}

/** Parse conditionJson string and evaluate it. Returns false on malformed JSON. */
export function evaluateConditionJson(json: string, data: Record<string, unknown>): boolean {
  try {
    const node: ConditionNode = JSON.parse(json);
    return evaluateCondition(node, data);
  } catch {
    return false;
  }
}
