"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { PolicyRuleUI, PolicyCondition, PolicyAction } from "../data/policyDefaults";
import ConditionBuilder from "./ConditionBuilder";
import ActionBuilder    from "./ActionBuilder";

const DEFAULT_CONDITION: PolicyCondition = { field: "amount", operator: ">", value: 0 };
const DEFAULT_ACTION:    PolicyAction    = { type: "REQUIRE_APPROVAL", level: 1 };

function ruleToUI(rule: PolicyRuleUI): PolicyRuleUI {
  try {
    return {
      ...rule,
      condition: rule.condition ?? JSON.parse(rule.conditionJson),
      action:    rule.action    ?? JSON.parse(rule.actionJson),
    };
  } catch { return rule; }
}

function uiToRule(rule: PolicyRuleUI): PolicyRuleUI {
  return {
    ...rule,
    conditionJson: JSON.stringify(rule.condition ?? JSON.parse(rule.conditionJson)),
    actionJson:    JSON.stringify(rule.action    ?? JSON.parse(rule.actionJson)),
  };
}

interface Props {
  rules:     PolicyRuleUI[];
  onChange:  (rules: PolicyRuleUI[]) => void;
  readOnly?: boolean;
}

export default function RuleBuilder({ rules, onChange, readOnly }: Props) {
  const uiRules = rules.map(ruleToUI);

  function addRule() {
    const newRule: PolicyRuleUI = {
      ruleName:      `Rule ${uiRules.length + 1}`,
      priority:      (uiRules.length + 1) * 10,
      conditionJson: JSON.stringify(DEFAULT_CONDITION),
      actionJson:    JSON.stringify(DEFAULT_ACTION),
      isActive:      true,
      condition:     { ...DEFAULT_CONDITION },
      action:        { ...DEFAULT_ACTION },
    };
    onChange([...rules, uiToRule(newRule)]);
  }

  function updateRule(index: number, updated: PolicyRuleUI) {
    const next = [...uiRules];
    next[index] = updated;
    onChange(next.map(uiToRule));
  }

  function removeRule(index: number) {
    const next = uiRules.filter((_, i) => i !== index);
    onChange(next.map(uiToRule));
  }

  function toggleActive(index: number) {
    const next = [...uiRules];
    next[index] = { ...next[index], isActive: !next[index].isActive };
    onChange(next.map(uiToRule));
  }

  if (uiRules.length === 0 && !readOnly) {
    return (
      <div>
        <div style={{ textAlign: "center", padding: "24px", border: "1px dashed var(--border)", borderRadius: "var(--radius-md)", marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: "var(--fg-3)", marginBottom: 10 }}>No rules yet — add a rule to define when this policy fires</div>
          <button onClick={addRule}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: "var(--radius-sm)", background: "var(--caveo-red)", color: "#fff", border: "none", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={13} strokeWidth={2} /> Add First Rule
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {uiRules.map((rule, i) => (
          <RuleRow key={i} rule={rule} index={i} readOnly={readOnly}
            onChange={(r) => updateRule(i, r)}
            onRemove={() => removeRule(i)}
            onToggle={() => toggleActive(i)} />
        ))}
      </div>

      {!readOnly && (
        <button onClick={addRule}
          style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: "var(--radius-sm)", border: "1px dashed var(--border)", background: "transparent", fontSize: 12.5, color: "var(--fg-3)", cursor: "pointer" }}>
          <Plus size={13} strokeWidth={2} /> Add Rule
        </button>
      )}
    </div>
  );
}

// ── Individual rule row ────────────────────────────────────────────────────────

interface RowProps {
  rule:      PolicyRuleUI;
  index:     number;
  readOnly?: boolean;
  onChange:  (r: PolicyRuleUI) => void;
  onRemove:  () => void;
  onToggle:  () => void;
}

function RuleRow({ rule, index, readOnly, onChange, onRemove, onToggle }: RowProps) {
  const [nameEdit, setNameEdit] = useState(false);

  return (
    <div style={{ border: `1px solid ${rule.isActive ? "var(--border)" : "var(--border-subtle)"}`, borderRadius: "var(--radius-md)", background: rule.isActive ? "var(--surface)" : "var(--bg-muted)", overflow: "hidden", opacity: rule.isActive ? 1 : 0.6 }}>
      {/* Rule header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-muted)" }}>
        <GripVertical size={13} style={{ color: "var(--fg-4)", cursor: readOnly ? "default" : "grab" }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-4)", fontFamily: "var(--font-mono)", minWidth: 20 }}>#{index + 1}</span>

        {nameEdit && !readOnly ? (
          <input autoFocus value={rule.ruleName}
            onChange={(e) => onChange({ ...rule, ruleName: e.target.value })}
            onBlur={() => setNameEdit(false)}
            onKeyDown={(e) => e.key === "Enter" && setNameEdit(false)}
            style={{ flex: 1, padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-1)", outline: "none", fontWeight: 600 }} />
        ) : (
          <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: "var(--fg-1)", cursor: readOnly ? "default" : "text" }}
            onClick={() => !readOnly && setNameEdit(true)}>
            {rule.ruleName}
          </span>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 10.5, color: "var(--fg-4)" }}>Priority</span>
          <input type="number" value={rule.priority} disabled={readOnly}
            onChange={(e) => onChange({ ...rule, priority: parseInt(e.target.value) || 10 })}
            style={{ width: 52, padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)", fontSize: 11.5, background: "var(--surface)", color: "var(--fg-2)", outline: "none", textAlign: "center", fontFamily: "var(--font-mono)" }} />
        </div>

        {!readOnly && (
          <>
            <button onClick={onToggle}
              style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 999, border: `1px solid ${rule.isActive ? "var(--border)" : "rgba(31,157,85,0.4)"}`, background: "transparent", color: rule.isActive ? "var(--fg-4)" : "#1F9D55", cursor: "pointer" }}>
              {rule.isActive ? "Disable" : "Enable"}
            </button>
            <button onClick={onRemove}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 2, display: "flex" }}>
              <Trash2 size={13} strokeWidth={2} />
            </button>
          </>
        )}
      </div>

      {/* Condition + Action */}
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        <ConditionBuilder readOnly={readOnly}
          condition={rule.condition ?? { field: "amount", operator: ">", value: 0 }}
          onChange={(c) => onChange({ ...rule, condition: c, conditionJson: JSON.stringify(c) })} />

        <ActionBuilder readOnly={readOnly}
          action={rule.action ?? { type: "REQUIRE_APPROVAL", level: 1 }}
          onChange={(a) => onChange({ ...rule, action: a, actionJson: JSON.stringify(a) })} />
      </div>
    </div>
  );
}
