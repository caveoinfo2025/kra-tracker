"use client";

import { useState, useEffect, useCallback } from "react";
import { Save } from "lucide-react";
import type { IdentityRole, PolicyRow, DataScope } from "../data/identityDefaults";
import { MOCK_ROLES, MOCK_POLICIES, SCOPE_RANK } from "../data/identityDefaults";

const MODULES = ["CRM", "Finance", "Workflow", "Settings", "Reports", "Masters"] as const;
const SCOPES: DataScope[] = ["OWN", "TEAM", "DEPARTMENT", "BRANCH", "COMPANY", "ALL"];

const SCOPE_DESC: Record<DataScope, string> = {
  OWN:        "Own records only",
  TEAM:       "Own team's records",
  DEPARTMENT: "Entire department",
  BRANCH:     "Entire branch",
  COMPANY:    "All companies",
  ALL:        "System-wide (admin)",
};

const SCOPE_COLOR: Record<DataScope, string> = {
  OWN:        "#C8102E",
  TEAM:       "#FF6B00",
  DEPARTMENT: "#FF6B00",
  BRANCH:     "#1F9D55",
  COMPANY:    "#0066FF",
  ALL:        "#0066FF",
};

interface Props { canEdit: boolean; }

export default function DataAccessPolicyPanel({ canEdit }: Props) {
  const [roles, setRoles]           = useState<IdentityRole[]>(MOCK_ROLES);
  const [selectedRoleId, setSelectedRoleId] = useState<number>(MOCK_ROLES[0]?.id ?? 0);
  const [policies, setPolicies]     = useState<PolicyRow[]>([]);
  const [dirty, setDirty]           = useState<Record<string, DataScope>>({});
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState("");

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  const loadRoles = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/identity/roles");
      if (r.ok) setRoles(await r.json());
    } catch { /* keep mock */ }
  }, []);

  const loadPolicies = useCallback(async (roleId: number) => {
    try {
      const r = await fetch(`/api/admin/identity/policies?roleId=${roleId}`);
      if (r.ok) { setPolicies(await r.json()); return; }
    } catch { /* fallback */ }
    setPolicies(MOCK_POLICIES[roleId] ?? []);
  }, []);

  useEffect(() => { loadRoles(); }, [loadRoles]);
  useEffect(() => { if (selectedRoleId) { setDirty({}); loadPolicies(selectedRoleId); } }, [selectedRoleId, loadPolicies]);

  function getScope(module: string): DataScope {
    if (dirty[module] !== undefined) return dirty[module];
    return policies.find((p) => p.module === module)?.scope ?? "OWN";
  }

  function setScope(module: string, scope: DataScope) {
    setDirty((d) => ({ ...d, [module]: scope }));
  }

  async function handleSave() {
    if (Object.keys(dirty).length === 0) return;
    setSaving(true);
    try {
      const updates = Object.entries(dirty).map(([module, scope]) => ({ module, scope }));
      const r = await fetch(`/api/admin/identity/policies/${selectedRoleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policies: updates }),
      });
      if (!r.ok) { flash("Save failed."); setSaving(false); return; }
      flash("Data access policies saved."); setDirty({}); loadPolicies(selectedRoleId);
    } catch { flash("Network error."); }
    setSaving(false);
  }

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const hasDirty     = Object.keys(dirty).length > 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg-1)" }}>Data Access Policies</div>
          <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 2 }}>
            Configure what data scope each role can see per module.
          </div>
        </div>
        {canEdit && hasDirty && (
          <button onClick={handleSave} disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: "var(--radius-sm)", background: saving ? "var(--border)" : "var(--caveo-red)", color: saving ? "var(--fg-4)" : "#fff", border: "none", fontSize: 12.5, fontWeight: 600, cursor: saving ? "default" : "pointer" }}>
            <Save size={13} strokeWidth={2} /> {saving ? "Saving…" : "Save Policies"}
          </button>
        )}
      </div>

      {/* Role selector */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)", display: "block", marginBottom: 6 }}>Select Role</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
          {roles.filter((r) => r.status === "ACTIVE").sort((a, b) => b.level - a.level).map((role) => {
            const active = selectedRoleId === role.id;
            return (
              <button key={role.id} onClick={() => setSelectedRoleId(role.id)}
                style={{ padding: "6px 14px", borderRadius: "var(--radius-sm)", border: `1px solid ${active ? "var(--caveo-red)" : "var(--border)"}`, background: active ? "rgba(200,16,46,0.07)" : "transparent", fontSize: 12.5, fontWeight: active ? 700 : 500, color: active ? "var(--caveo-red)" : "var(--fg-3)", cursor: "pointer" }}>
                {role.name}
              </button>
            );
          })}
        </div>
      </div>

      {selectedRole && (
        <>
          {/* Selected role summary */}
          <div style={{ padding: "10px 14px", background: "var(--bg-muted)", borderRadius: "var(--radius-md)", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-1)" }}>{selectedRole.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 1 }}>{selectedRole.description}</div>
            </div>
            <div style={{ fontSize: 11, color: "var(--fg-4)" }}>Level {selectedRole.level} · {selectedRole.userCount} user{selectedRole.userCount !== 1 ? "s" : ""}</div>
          </div>

          {/* Policy grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {MODULES.map((module) => {
              const scope = getScope(module);
              const isDirty = dirty[module] !== undefined;
              return (
                <div key={module} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", background: isDirty ? "rgba(0,102,255,0.04)" : "var(--surface)", border: `1px solid ${isDirty ? "rgba(0,102,255,0.2)" : "var(--border)"}`, borderRadius: "var(--radius-md)" }}>
                  {/* Module label */}
                  <div style={{ width: 100, flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>{module}</div>
                    {isDirty && <div style={{ fontSize: 10, color: "var(--infra-blue)", marginTop: 1 }}>unsaved</div>}
                  </div>

                  {/* Scope pills */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, flex: 1 }}>
                    {SCOPES.map((s) => {
                      const active = scope === s;
                      const color  = active ? SCOPE_COLOR[s] : "var(--fg-4)";
                      return (
                        <button key={s} onClick={() => canEdit && setScope(module, s)} disabled={!canEdit}
                          style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${active ? color : "var(--border)"}`, background: active ? `${color}14` : "transparent", fontSize: 11.5, fontWeight: active ? 700 : 400, color: active ? color : "var(--fg-4)", cursor: canEdit ? "pointer" : "default", transition: "all 0.1s" }}>
                          {s}
                        </button>
                      );
                    })}
                  </div>

                  {/* Scope description */}
                  <div style={{ fontSize: 11.5, color: "var(--fg-4)", minWidth: 160, textAlign: "right" }}>
                    {SCOPE_DESC[scope]}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scope legend */}
          <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--bg-muted)", borderRadius: "var(--radius-md)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-4)", marginBottom: 8 }}>SCOPE REFERENCE (widest wins when a user has multiple roles)</div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px 24px" }}>
              {SCOPES.map((s) => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: SCOPE_COLOR[s] }} />
                  <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}><strong>{s}</strong> — {SCOPE_DESC[s]}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 70, padding: "10px 16px", background: "var(--fg-1)", color: "var(--fg-inverse)", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 500, boxShadow: "var(--shadow-md)" }}>{toast}</div>}
    </div>
  );
}
