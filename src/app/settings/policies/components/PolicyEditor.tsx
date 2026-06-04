"use client";

import { useState } from "react";
import { X, Save, ChevronRight, GitCommit, Eye } from "lucide-react";
import type { PolicySummary, PolicyCategory, PolicyStatus, ScopeType } from "../data/policyDefaults";
import { statusColor, statusBadge } from "../data/policyDefaults";
import RuleBuilder          from "./RuleBuilder";
import PolicyVersionHistory from "./PolicyVersionHistory";

type EditorSection = "details" | "rules" | "history";

const SCOPE_TYPES: ScopeType[] = ["GLOBAL", "COMPANY", "BRANCH", "DEPARTMENT", "ROLE", "USER"];

const LIFECYCLE_ACTIONS: Record<PolicyStatus, Array<{ target: PolicyStatus; label: string; color: string }>> = {
  DRAFT:    [{ target: "REVIEW",  label: "Submit for Review", color: "#FF6B00" }],
  REVIEW:   [{ target: "ACTIVE",  label: "Publish",           color: "#1F9D55" },
             { target: "DRAFT",   label: "Send Back to Draft", color: "#6B7280" }],
  ACTIVE:   [{ target: "INACTIVE", label: "Deactivate",       color: "#9CA3AF" }],
  INACTIVE: [{ target: "ACTIVE",  label: "Reactivate",        color: "#1F9D55" },
             { target: "ARCHIVED", label: "Archive",           color: "#6B7280" }],
  ARCHIVED: [],
};

interface Props {
  policy?:     PolicySummary;
  categories:  PolicyCategory[];
  canEdit:     boolean;
  onClose:     () => void;
  onSaved:     () => void;
}

export default function PolicyEditor({ policy, categories, canEdit, onClose, onSaved }: Props) {
  const isCreate = !policy;
  const readOnly = !canEdit || (policy && policy.status !== "DRAFT");

  const [section, setSection]       = useState<EditorSection>("details");
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [form, setForm]             = useState({
    categoryId:    policy?.categoryId    ?? (categories[0]?.id ?? 0),
    name:          policy?.name          ?? "",
    code:          policy?.code          ?? "",
    description:   policy?.description   ?? "",
    scopeType:     (policy?.scopeType    ?? "GLOBAL") as ScopeType,
    effectiveFrom: policy?.effectiveFrom ? policy.effectiveFrom.slice(0, 10) : "",
    effectiveTo:   policy?.effectiveTo   ? policy.effectiveTo.slice(0, 10)   : "",
  });
  const [rules, setRules] = useState(policy?.rules ?? []);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2800); }

  async function handleSave() {
    if (!form.name || !form.code || !form.categoryId) { flash("Name, code and category are required."); return; }
    setSaving(true);
    try {
      const body = {
        ...form,
        effectiveFrom: form.effectiveFrom || null,
        effectiveTo:   form.effectiveTo   || null,
        rules,
      };
      const url    = isCreate ? "/api/admin/policies" : `/api/admin/policies/${policy!.id}`;
      const method = isCreate ? "POST" : "PATCH";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) { flash("Save failed — try again."); setSaving(false); return; }
      flash(isCreate ? "Policy created." : "Policy saved.");
      setTimeout(onSaved, 1000);
    } catch { flash("Network error."); }
    setSaving(false);
  }

  async function handleTransition(target: PolicyStatus) {
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/policies/${policy!.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: target, changeReason }),
      });
      if (!r.ok) { flash("Transition failed."); setSaving(false); return; }
      flash(`Policy ${target === "ACTIVE" ? "published" : "updated"}.`);
      setTimeout(onSaved, 1000);
    } catch { flash("Network error."); }
    setSaving(false);
  }

  const sectionTabs: Array<{ id: EditorSection; label: string }> = [
    { id: "details", label: "Details" },
    { id: "rules",   label: `Rules${rules.length ? ` (${rules.length})` : ""}` },
    ...(policy ? [{ id: "history" as EditorSection, label: "Version History" }] : []),
  ];

  const lifecycleActions = policy ? LIFECYCLE_ACTIONS[policy.status] : [];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,17,21,0.4)" }} onClick={onClose} />
      <div style={{ position: "relative", width: 560, background: "var(--surface)", height: "100%", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-lg)" }}>

        {/* Header */}
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-1)" }}>
              {isCreate ? "New Policy" : policy!.name}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
              {!isCreate && <><span style={{ fontFamily: "var(--font-mono)" }}>{policy!.code}</span> · </>}
              {!isCreate && <span className={`badge ${statusBadge(policy!.status)}`} style={{ fontSize: 10 }}>{policy!.status}</span>}
              {!isCreate && <span>v{policy!.version}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-4)", padding: 4 }}><X size={16} strokeWidth={2} /></button>
        </div>

        {/* Section tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 20px" }}>
          {sectionTabs.map(({ id, label }) => {
            const active = section === id;
            return (
              <button key={id} onClick={() => setSection(id)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "9px 12px", border: "none", borderBottom: active ? "2px solid var(--caveo-red)" : "2px solid transparent", background: "transparent", fontSize: 12, fontWeight: active ? 700 : 500, color: active ? "var(--caveo-red)" : "var(--fg-3)", cursor: "pointer", marginBottom: -1 }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>

          {section === "details" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <FormRow label="Category">
                <select value={form.categoryId} disabled={!!readOnly}
                  onChange={(e) => setForm({ ...form, categoryId: parseInt(e.target.value) })}
                  style={inputStyle}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </FormRow>

              <FormRow label="Policy Name">
                <input value={form.name} disabled={!!readOnly}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Large Deal Review"
                  style={inputStyle} />
              </FormRow>

              <FormRow label="Code">
                <input value={form.code} disabled={!!readOnly || !isCreate}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") })}
                  placeholder="CRM_LARGE_DEAL_REVIEW"
                  style={{ ...inputStyle, fontFamily: "var(--font-mono)" }} />
                {isCreate && <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 3 }}>Uppercase letters, digits, underscores only. Cannot be changed after creation.</div>}
              </FormRow>

              <FormRow label="Description">
                <textarea value={form.description} disabled={!!readOnly}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3} placeholder="What does this policy enforce?"
                  style={{ ...inputStyle, resize: "vertical" as const, minHeight: 72 }} />
              </FormRow>

              <FormRow label="Scope">
                <select value={form.scopeType} disabled={!!readOnly}
                  onChange={(e) => setForm({ ...form, scopeType: e.target.value as ScopeType })}
                  style={inputStyle}>
                  {SCOPE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormRow>

              <div style={{ display: "flex", gap: 12 }}>
                <FormRow label="Effective From" style={{ flex: 1 }}>
                  <input type="date" value={form.effectiveFrom} disabled={!!readOnly}
                    onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                    style={inputStyle} />
                </FormRow>
                <FormRow label="Effective To" style={{ flex: 1 }}>
                  <input type="date" value={form.effectiveTo} disabled={!!readOnly}
                    onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })}
                    style={inputStyle} />
                </FormRow>
              </div>

              {/* Lifecycle actions */}
              {!isCreate && lifecycleActions.length > 0 && (
                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 14 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)", marginBottom: 8 }}>Lifecycle Actions</div>
                  <textarea value={changeReason} onChange={(e) => setChangeReason(e.target.value)}
                    rows={2} placeholder="Change reason (optional)"
                    style={{ ...inputStyle, resize: "vertical" as const, marginBottom: 8 }} />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                    {lifecycleActions.map(({ target, label, color }) => (
                      <button key={target} onClick={() => handleTransition(target)} disabled={saving || !canEdit}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: "var(--radius-sm)", border: `1px solid ${color}`, background: "transparent", fontSize: 12.5, fontWeight: 600, color, cursor: "pointer" }}>
                        <ChevronRight size={12} strokeWidth={2} /> {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Status indicator when read-only */}
              {!isCreate && policy!.status !== "DRAFT" && (
                <div style={{ padding: "10px 14px", background: `${statusColor(policy!.status)}0e`, border: `1px solid ${statusColor(policy!.status)}30`, borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Eye size={13} style={{ color: statusColor(policy!.status) }} />
                  <span style={{ fontSize: 12.5, color: statusColor(policy!.status), fontWeight: 600 }}>
                    {policy!.status === "ACTIVE" ? "Active — this policy is evaluated at runtime" : `Status: ${policy!.status} — rules are not evaluated`}
                  </span>
                </div>
              )}
            </div>
          )}

          {section === "rules" && (
            <div>
              <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginBottom: 16 }}>
                Rules are evaluated in priority order (lowest number first). The first BLOCK action short-circuits all remaining rules.
              </div>
              <RuleBuilder rules={rules} onChange={setRules} readOnly={!!readOnly} />
            </div>
          )}

          {section === "history" && policy && (
            <PolicyVersionHistory policyId={policy.id} currentVersion={policy.version} />
          )}
        </div>

        {/* Footer — save button (only for DRAFT in edit mode) */}
        {canEdit && (isCreate || policy?.status === "DRAFT") && (
          <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "transparent", fontSize: 13, cursor: "pointer", color: "var(--fg-2)" }}>Cancel</button>
            <button onClick={handleSave} disabled={saving}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: "var(--radius-sm)", background: saving ? "var(--border)" : "var(--caveo-red)", color: saving ? "var(--fg-4)" : "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer" }}>
              <Save size={13} strokeWidth={2} /> {saving ? "Saving…" : isCreate ? "Create Policy" : "Save Changes"}
            </button>
          </div>
        )}

        {/* Version history icon in header */}
        {!isCreate && <div style={{ position: "absolute", bottom: 80, right: 20, opacity: 0.3, pointerEvents: "none" }}>
          <GitCommit size={80} strokeWidth={0.5} style={{ color: "var(--fg-3)" }} />
        </div>}

        {toast && <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 70, padding: "10px 16px", background: "var(--fg-1)", color: "var(--fg-inverse)", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 500, boxShadow: "var(--shadow-md)" }}>{toast}</div>}
      </div>
    </div>
  );
}

// ── Local helpers ──────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "7px 10px", borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)",
  color: "var(--fg-1)", outline: "none",
};

function FormRow({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-4)", textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>{label}</label>
      {children}
    </div>
  );
}
