"use client";

import type { PolicyCondition, Operator } from "../data/policyDefaults";

const OPERATORS: Array<{ value: Operator; label: string }> = [
  { value: "=",        label: "equals"         },
  { value: "!=",       label: "not equals"     },
  { value: ">",        label: "greater than"   },
  { value: ">=",       label: "≥"              },
  { value: "<",        label: "less than"      },
  { value: "<=",       label: "≤"              },
  { value: "IN",       label: "is one of"      },
  { value: "NOT_IN",   label: "is not one of"  },
  { value: "CONTAINS", label: "contains"       },
];

const FIELD_SUGGESTIONS = [
  "amount", "rowCount", "quantity", "employeeId", "roleId",
  "department", "status", "category", "customerId", "days",
];

interface Props {
  condition: PolicyCondition;
  onChange:  (c: PolicyCondition) => void;
  readOnly?: boolean;
}

export default function ConditionBuilder({ condition, onChange, readOnly }: Props) {
  const isMulti = condition.operator === "IN" || condition.operator === "NOT_IN";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--fg-4)", textTransform: "uppercase" as const, letterSpacing: "0.07em", minWidth: 20 }}>IF</span>

      {/* Field */}
      <div style={{ position: "relative" }}>
        <input
          list="policy-fields"
          value={condition.field}
          disabled={readOnly}
          onChange={(e) => onChange({ ...condition, field: e.target.value })}
          placeholder="field name"
          style={{ padding: "5px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-1)", outline: "none", width: 140, fontFamily: "var(--font-mono)" }} />
        <datalist id="policy-fields">
          {FIELD_SUGGESTIONS.map((f) => <option key={f} value={f} />)}
        </datalist>
      </div>

      {/* Operator */}
      <select value={condition.operator} disabled={readOnly}
        onChange={(e) => onChange({ ...condition, operator: e.target.value as Operator, value: "" })}
        style={{ padding: "5px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-2)", outline: "none" }}>
        {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {/* Value */}
      {isMulti ? (
        <input
          value={Array.isArray(condition.value) ? condition.value.join(", ") : String(condition.value)}
          disabled={readOnly}
          onChange={(e) => onChange({ ...condition, value: e.target.value.split(",").map((s) => s.trim()) })}
          placeholder="value1, value2, …"
          style={{ padding: "5px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-1)", outline: "none", width: 180, fontFamily: "var(--font-mono)" }} />
      ) : (
        <input
          value={String(condition.value ?? "")}
          disabled={readOnly}
          type="text"
          inputMode="numeric"
          onChange={(e) => {
            const raw = e.target.value;
            const num = Number(raw);
            onChange({ ...condition, value: !isNaN(num) && raw !== "" ? num : raw });
          }}
          placeholder="value"
          style={{ padding: "5px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-1)", outline: "none", width: 120, fontFamily: "var(--font-mono)" }} />
      )}
    </div>
  );
}
