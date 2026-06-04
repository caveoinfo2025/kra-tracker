"use client";

import type { PolicyAction, ActionType } from "../data/policyDefaults";

const ACTION_TYPES: Array<{ value: ActionType; label: string; color: string }> = [
  { value: "ALLOW",              label: "Allow",                color: "#1F9D55" },
  { value: "BLOCK",              label: "Block",                color: "#C8102E" },
  { value: "REQUIRE_APPROVAL",   label: "Require Approval",     color: "#FF6B00" },
  { value: "SEND_NOTIFICATION",  label: "Send Notification",    color: "#0066FF" },
  { value: "CREATE_TASK",        label: "Create Task",          color: "#6B21A8" },
  { value: "ESCALATE",           label: "Escalate",             color: "#FF6B00" },
];

interface Props {
  action:   PolicyAction;
  onChange: (a: PolicyAction) => void;
  readOnly?: boolean;
}

export default function ActionBuilder({ action, onChange, readOnly }: Props) {
  const def = ACTION_TYPES.find((t) => t.value === action.type);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--fg-4)", textTransform: "uppercase" as const, letterSpacing: "0.07em", minWidth: 30 }}>THEN</span>

      {/* Action type */}
      <select value={action.type} disabled={readOnly}
        onChange={(e) => onChange({ type: e.target.value as ActionType })}
        style={{ padding: "5px 10px", borderRadius: "var(--radius-sm)", border: `1px solid ${def?.color ?? "var(--border)"}`, fontSize: 12.5, background: "var(--surface)", color: def?.color ?? "var(--fg-2)", fontWeight: 600, outline: "none" }}>
        {ACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>

      {/* Level (for REQUIRE_APPROVAL / ESCALATE) */}
      {(action.type === "REQUIRE_APPROVAL" || action.type === "ESCALATE") && (
        <>
          <span style={{ fontSize: 12, color: "var(--fg-4)" }}>Level</span>
          <select value={action.level ?? 1} disabled={readOnly}
            onChange={(e) => onChange({ ...action, level: parseInt(e.target.value) })}
            style={{ padding: "5px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-2)", outline: "none" }}>
            <option value={1}>1 — Direct Manager</option>
            <option value={2}>2 — Sales Head / Finance Mgr</option>
            <option value={3}>3 — Business Head</option>
          </select>
        </>
      )}

      {/* Reason (for BLOCK) */}
      {action.type === "BLOCK" && (
        <>
          <span style={{ fontSize: 12, color: "var(--fg-4)" }}>Reason</span>
          <input value={action.reason ?? ""} disabled={readOnly}
            onChange={(e) => onChange({ ...action, reason: e.target.value })}
            placeholder="Block reason (optional)"
            style={{ padding: "5px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-1)", outline: "none", width: 220 }} />
        </>
      )}

      {/* Template key (for SEND_NOTIFICATION) */}
      {action.type === "SEND_NOTIFICATION" && (
        <>
          <span style={{ fontSize: 12, color: "var(--fg-4)" }}>Template</span>
          <input value={action.templateKey ?? ""} disabled={readOnly}
            onChange={(e) => onChange({ ...action, templateKey: e.target.value })}
            placeholder="notification.template.key"
            style={{ padding: "5px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-1)", outline: "none", width: 220, fontFamily: "var(--font-mono)" }} />
        </>
      )}

      {/* Task title (for CREATE_TASK) */}
      {action.type === "CREATE_TASK" && (
        <>
          <span style={{ fontSize: 12, color: "var(--fg-4)" }}>Title</span>
          <input value={action.title ?? ""} disabled={readOnly}
            onChange={(e) => onChange({ ...action, title: e.target.value })}
            placeholder="Task title"
            style={{ padding: "5px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-1)", outline: "none", width: 220 }} />
        </>
      )}
    </div>
  );
}
