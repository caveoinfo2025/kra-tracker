"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, CheckSquare, Square } from "lucide-react";
import type { IdentityRole, PermissionEntry } from "../data/identityDefaults";
import { MOCK_ROLES, ACTIONS_ALL } from "../data/identityDefaults";

// Groups to display in the matrix rows
const MODULE_GROUPS: Array<{ module: string; resources: string[] }> = [
  { module: "CRM",      resources: ["Lead", "Opportunity", "Activity", "Report"] },
  { module: "Finance",  resources: ["Invoice", "Expense", "Payment", "Advance"] },
  { module: "Workflow", resources: ["ApprovalRequest", "WorkflowDefinition"] },
  { module: "Settings", resources: ["Configuration", "UserManagement", "RoleManagement", "Organization"] },
  { module: "Reports",  resources: ["Dashboard", "Analytics"] },
  { module: "Masters",  resources: ["CustomerMaster", "VendorMaster"] },
];

const MODULE_COLOR: Record<string, string> = {
  CRM: "#0066FF", Finance: "#1F9D55", Workflow: "#FF6B00",
  Settings: "#C8102E", Reports: "#6B21A8", Masters: "#0F766E",
};

const ACTION_SHORT: Record<string, string> = {
  VIEW: "View", CREATE: "Create", EDIT: "Edit", DELETE: "Delete",
  APPROVE: "Approve", EXPORT: "Export", IMPORT: "Import", ASSIGN: "Assign",
};

// Not all module/resource/action combos exist in the catalogue
const NOT_APPLICABLE = new Set([
  "CRM/Lead/APPROVE", "CRM/Lead/IMPORT",
  "CRM/Activity/DELETE", "CRM/Activity/APPROVE", "CRM/Activity/IMPORT", "CRM/Activity/ASSIGN",
  "CRM/Report/CREATE", "CRM/Report/EDIT", "CRM/Report/DELETE", "CRM/Report/APPROVE", "CRM/Report/IMPORT", "CRM/Report/ASSIGN",
  "Finance/Payment/CREATE", "Finance/Payment/EDIT", "Finance/Payment/DELETE", "Finance/Payment/IMPORT", "Finance/Payment/ASSIGN",
  "Finance/Advance/CREATE", "Finance/Advance/EDIT", "Finance/Advance/DELETE", "Finance/Advance/IMPORT", "Finance/Advance/ASSIGN",
  "Workflow/ApprovalRequest/CREATE", "Workflow/ApprovalRequest/EDIT", "Workflow/ApprovalRequest/DELETE", "Workflow/ApprovalRequest/IMPORT", "Workflow/ApprovalRequest/ASSIGN",
  "Workflow/WorkflowDefinition/DELETE", "Workflow/WorkflowDefinition/IMPORT", "Workflow/WorkflowDefinition/ASSIGN",
  "Settings/Configuration/DELETE", "Settings/Configuration/IMPORT", "Settings/Configuration/ASSIGN", "Settings/Configuration/APPROVE",
  "Settings/UserManagement/DELETE", "Settings/UserManagement/APPROVE", "Settings/UserManagement/IMPORT", "Settings/UserManagement/ASSIGN",
  "Settings/RoleManagement/DELETE", "Settings/RoleManagement/APPROVE", "Settings/RoleManagement/IMPORT", "Settings/RoleManagement/ASSIGN",
  "Settings/Organization/DELETE", "Settings/Organization/APPROVE", "Settings/Organization/IMPORT", "Settings/Organization/ASSIGN",
  "Reports/Dashboard/CREATE", "Reports/Dashboard/EDIT", "Reports/Dashboard/DELETE", "Reports/Dashboard/APPROVE", "Reports/Dashboard/IMPORT", "Reports/Dashboard/ASSIGN",
  "Reports/Analytics/CREATE", "Reports/Analytics/EDIT", "Reports/Analytics/DELETE", "Reports/Analytics/APPROVE", "Reports/Analytics/IMPORT", "Reports/Analytics/ASSIGN",
  "Masters/CustomerMaster/APPROVE", "Masters/CustomerMaster/ASSIGN",
  "Masters/VendorMaster/APPROVE", "Masters/VendorMaster/ASSIGN",
]);

// Permissions keyed by "module/resource/action"
type GrantMap = Record<string, { id: number; granted: boolean }>;

// Sensible defaults for mock when real API isn't available (Super Admin has everything)
function buildMockGrants(roleId: number): GrantMap {
  const map: GrantMap = {};
  let id = 1;
  for (const { module, resources } of MODULE_GROUPS) {
    for (const resource of resources) {
      for (const action of ACTIONS_ALL) {
        const key = `${module}/${resource}/${action}`;
        if (NOT_APPLICABLE.has(key)) continue;
        const granted = roleId === 1
          ? true
          : roleId === 2
            ? !key.includes("Settings") && !key.includes("DELETE")
            : roleId === 3
              ? key.startsWith("CRM") && !key.includes("DELETE")
              : roleId === 4
                ? key.startsWith("CRM") && (key.includes("VIEW") || key.includes("CREATE") || key.includes("EDIT"))
                : roleId === 5
                  ? key.startsWith("CRM") && key.includes("VIEW")
                  : key.startsWith("Finance");
        map[key] = { id: id++, granted };
      }
    }
  }
  return map;
}

interface Props { canEdit: boolean; }

export default function PermissionMatrix({ canEdit }: Props) {
  const [roles, setRoles]               = useState<IdentityRole[]>(MOCK_ROLES);
  const [selectedRoleId, setSelectedRoleId] = useState<number>(MOCK_ROLES[0]?.id ?? 0);
  const [grants, setGrants]             = useState<GrantMap>({});
  const [dirty, setDirty]               = useState<Record<string, boolean>>({});
  const [saving, setSaving]             = useState(false);
  const [toast, setToast]               = useState("");

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  const loadRoles = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/identity/roles");
      if (r.ok) setRoles(await r.json());
    } catch { /* keep mock */ }
  }, []);

  const loadPermissions = useCallback(async (roleId: number) => {
    setDirty({});
    try {
      const r = await fetch(`/api/admin/identity/permissions?roleId=${roleId}`);
      if (r.ok) {
        const data: PermissionEntry[] = await r.json();
        const map: GrantMap = {};
        for (const p of data) map[`${p.module}/${p.resource}/${p.action}`] = { id: p.id, granted: p.granted };
        setGrants(map);
        return;
      }
    } catch { /* fallback */ }
    setGrants(buildMockGrants(roleId));
  }, []);

  useEffect(() => { loadRoles(); }, [loadRoles]);
  useEffect(() => { if (selectedRoleId) loadPermissions(selectedRoleId); }, [selectedRoleId, loadPermissions]);

  function isGranted(key: string): boolean {
    if (dirty[key] !== undefined) return dirty[key];
    return grants[key]?.granted ?? false;
  }

  function toggle(key: string) {
    if (!canEdit || NOT_APPLICABLE.has(key)) return;
    const current = isGranted(key);
    setDirty((d) => ({ ...d, [key]: !current }));
  }

  async function handleSave() {
    if (Object.keys(dirty).length === 0) return;
    setSaving(true);
    try {
      const changes = Object.entries(dirty).map(([key, granted]) => {
        const [module, resource, action] = key.split("/");
        return { module, resource, action, granted };
      });
      const r = await fetch(`/api/admin/identity/permissions/${selectedRoleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes }),
      });
      if (!r.ok) { flash("Save failed."); setSaving(false); return; }
      flash("Permissions saved."); setDirty({}); loadPermissions(selectedRoleId);
    } catch { flash("Network error."); }
    setSaving(false);
  }

  const hasDirty      = Object.keys(dirty).length > 0;
  const selectedRole  = roles.find((r) => r.id === selectedRoleId);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg-1)" }}>Permission Matrix</div>
          <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 2 }}>Select a role and configure module-level permissions using the grid below.</div>
        </div>
        {canEdit && hasDirty && (
          <button onClick={handleSave} disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: "var(--radius-sm)", background: saving ? "var(--border)" : "var(--caveo-red)", color: saving ? "var(--fg-4)" : "#fff", border: "none", fontSize: 12.5, fontWeight: 600, cursor: saving ? "default" : "pointer" }}>
            <Save size={13} strokeWidth={2} /> {saving ? "Saving…" : `Save ${Object.keys(dirty).length} change${Object.keys(dirty).length !== 1 ? "s" : ""}`}
          </button>
        )}
      </div>

      {/* Role selector */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)", display: "block", marginBottom: 6 }}>Select Role to Edit</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
          {[...roles].sort((a, b) => b.level - a.level).map((role) => {
            const active = selectedRoleId === role.id;
            return (
              <button key={role.id} onClick={() => setSelectedRoleId(role.id)}
                style={{ padding: "6px 14px", borderRadius: "var(--radius-sm)", border: `1px solid ${active ? "var(--caveo-red)" : "var(--border)"}`, background: active ? "rgba(200,16,46,0.07)" : "transparent", fontSize: 12.5, fontWeight: active ? 700 : 500, color: active ? "var(--caveo-red)" : "var(--fg-3)", cursor: "pointer", opacity: role.status === "INACTIVE" ? 0.5 : 1 }}>
                {role.name}
              </button>
            );
          })}
        </div>
      </div>

      {selectedRole && (
        <div style={{ padding: "8px 14px", background: "var(--bg-muted)", borderRadius: "var(--radius-md)", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: "var(--fg-1)" }}>{selectedRole.name}</div>
          <div style={{ fontSize: 11.5, color: "var(--fg-4)" }}>Level {selectedRole.level}</div>
          {hasDirty && <div style={{ fontSize: 11, color: "var(--infra-blue)", fontWeight: 600 }}>{Object.keys(dirty).length} unsaved change{Object.keys(dirty).length !== 1 ? "s" : ""}</div>}
        </div>
      )}

      {/* Matrix table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, tableLayout: "auto" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)", background: "var(--bg-muted)" }}>
              <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", color: "var(--fg-4)", textTransform: "uppercase" as const, minWidth: 200, position: "sticky", left: 0, background: "var(--bg-muted)", zIndex: 1 }}>
                MODULE / RESOURCE
              </th>
              {ACTIONS_ALL.map((a) => (
                <th key={a} style={{ padding: "10px 8px", textAlign: "center", fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", color: "var(--fg-4)", textTransform: "uppercase" as const, minWidth: 64, whiteSpace: "nowrap" }}>
                  {ACTION_SHORT[a]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULE_GROUPS.map(({ module, resources }) => {
              const color = MODULE_COLOR[module] ?? "var(--fg-3)";
              return [
                // Module header row
                <tr key={`hdr-${module}`} style={{ background: `${color}09`, borderBottom: "1px solid var(--border-subtle)" }}>
                  <td colSpan={ACTIONS_ALL.length + 1} style={{ padding: "7px 14px", position: "sticky", left: 0, background: `${color}09` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>{module}</span>
                    </div>
                  </td>
                </tr>,
                // Resource rows
                ...resources.map((resource, ri) => (
                  <tr key={`${module}-${resource}`} style={{ borderBottom: ri < resources.length - 1 ? "1px solid var(--border-subtle)" : `1px solid var(--border)` }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "9px 14px 9px 22px", fontWeight: 500, color: "var(--fg-2)", position: "sticky", left: 0, background: "var(--surface)", fontSize: 12.5 }}>
                      {resource}
                    </td>
                    {ACTIONS_ALL.map((action) => {
                      const key = `${module}/${resource}/${action}`;
                      const na  = NOT_APPLICABLE.has(key);
                      const on  = !na && isGranted(key);
                      const isDirtyCell = dirty[key] !== undefined;
                      return (
                        <td key={action} style={{ padding: "9px 8px", textAlign: "center" }}>
                          {na ? (
                            <span style={{ fontSize: 11, color: "var(--fg-5, var(--fg-4))", opacity: 0.4 }}>—</span>
                          ) : (
                            <button onClick={() => toggle(key)} disabled={!canEdit}
                              title={`${action}: ${on ? "Granted" : "Denied"}`}
                              style={{ background: "none", border: "none", cursor: canEdit ? "pointer" : "default", padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", outline: isDirtyCell ? `2px solid ${color}` : "none", borderRadius: 3 }}>
                              {on
                                ? <CheckSquare size={16} strokeWidth={1.8} style={{ color: isDirtyCell ? color : "#1F9D55" }} />
                                : <Square     size={16} strokeWidth={1.8} style={{ color: isDirtyCell ? color : "var(--border)" }} />}
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--fg-4)", display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><CheckSquare size={12} style={{ color: "#1F9D55" }} /> Granted</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Square size={12} style={{ color: "var(--border)" }} /> Denied</span>
        <span>— Not applicable</span>
      </div>

      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 70, padding: "10px 16px", background: "var(--fg-1)", color: "var(--fg-inverse)", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 500, boxShadow: "var(--shadow-md)" }}>{toast}</div>}
    </div>
  );
}
