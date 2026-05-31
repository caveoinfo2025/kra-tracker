"use client";
/**
 * Roles & Access admin panel.
 * Left panel: role list sorted by hierarchy level.
 * Right panel: role meta editor + page permission matrix.
 */
import { useState, useEffect, useCallback } from "react";
import {
  Shield, Plus, Trash2, Save, Users, AlertTriangle,
  ChevronUp, ChevronDown, Lock
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface PageAccess {
  pageKey: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface Role {
  id: number;
  name: string;
  label: string;
  level: number;
  color: string;
  isSystem: boolean;
  description: string;
  employeeCount: number;
  pageAccess: PageAccess[];
}

interface PageDef { key: string; label: string; group: string }

// Page definitions (mirrored from rbac.ts — no server import in client component)
const PAGES: PageDef[] = [
  { key: "dashboard",          label: "Dashboard",             group: "Overview"    },
  { key: "pipeline.leads",     label: "Leads",                 group: "Pipeline"    },
  { key: "pipeline.tasks",     label: "Tasks",                 group: "Pipeline"    },
  { key: "pipeline.deals",     label: "Deals / Opportunities", group: "Pipeline"    },
  { key: "pipeline.analytics", label: "Analytics",             group: "Pipeline"    },
  { key: "collections",        label: "Collections",           group: "Operations"  },
  { key: "daily_updates",      label: "Daily Updates",         group: "Operations"  },
  { key: "lead_generation",    label: "Lead Generation",       group: "Operations"  },
  { key: "sales_funnel",       label: "Sales Funnel",          group: "Operations"  },
  { key: "kras",               label: "My KRAs",               group: "People"      },
  { key: "employees",          label: "Team / Employees",      group: "People"      },
  { key: "import",             label: "Import",                group: "People"      },
  { key: "accounts",           label: "Payment Tracker",       group: "Finance"     },
  { key: "admin",              label: "Admin Panel",           group: "Admin"       },
];
const PAGE_GROUPS = [...new Set(PAGES.map((p) => p.group))];
const ACTIONS: { key: keyof PageAccess; label: string; color: string }[] = [
  { key: "canView",   label: "View",   color: "#2563eb" },
  { key: "canCreate", label: "Create", color: "#16a34a" },
  { key: "canEdit",   label: "Edit",   color: "#d97706" },
  { key: "canDelete", label: "Delete", color: "#dc2626" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getPageAccess(role: Role, pageKey: string): PageAccess {
  return (
    role.pageAccess.find((p) => p.pageKey === pageKey) ?? {
      pageKey, canView: false, canCreate: false, canEdit: false, canDelete: false,
    }
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RolesClient() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Role | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", label: "", level: 50, color: "#6b7280", description: "" });

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  // Load roles
  const loadRoles = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/roles");
    if (res.ok) {
      const data = await res.json();
      setRoles(data.roles);
      if (data.roles.length > 0 && !selectedId) {
        setSelectedId(data.roles[0].id);
        setDraft(JSON.parse(JSON.stringify(data.roles[0])));
      }
    }
    setLoading(false);
  }, [selectedId]);

  useEffect(() => { loadRoles(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function selectRole(role: Role) {
    setSelectedId(role.id);
    setDraft(JSON.parse(JSON.stringify(role)));
    setDirty(false);
  }

  function togglePermission(pageKey: string, action: keyof PageAccess) {
    if (!draft) return;
    const current = getPageAccess(draft, pageKey);
    const next = { ...current, [action]: !current[action] };
    // If disabling View, disable everything else too
    if (action === "canView" && !next.canView) {
      next.canCreate = false; next.canEdit = false; next.canDelete = false;
    }
    // If enabling Create/Edit/Delete, auto-enable View
    if ((action === "canCreate" || action === "canEdit" || action === "canDelete") && next[action]) {
      next.canView = true;
    }
    const existing = draft.pageAccess.find((p) => p.pageKey === pageKey);
    const updatedAccess = existing
      ? draft.pageAccess.map((p) => (p.pageKey === pageKey ? next : p))
      : [...draft.pageAccess, next];
    setDraft({ ...draft, pageAccess: updatedAccess });
    setDirty(true);
  }

  function updateMeta(field: string, value: unknown) {
    if (!draft) return;
    setDraft({ ...draft, [field]: value });
    setDirty(true);
  }

  // Grant / revoke entire page row
  function toggleRow(pageKey: string, grant: boolean) {
    if (!draft) return;
    const next: PageAccess = grant
      ? { pageKey, canView: true, canCreate: true, canEdit: true, canDelete: true }
      : { pageKey, canView: false, canCreate: false, canEdit: false, canDelete: false };
    const existing = draft.pageAccess.find((p) => p.pageKey === pageKey);
    const updatedAccess = existing
      ? draft.pageAccess.map((p) => (p.pageKey === pageKey ? next : p))
      : [...draft.pageAccess, next];
    setDraft({ ...draft, pageAccess: updatedAccess });
    setDirty(true);
  }

  async function save() {
    if (!draft || !dirty) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/roles/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          label: draft.label,
          level: draft.level,
          color: draft.color,
          description: draft.description,
          pageAccess: draft.pageAccess,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRoles((prev) => prev.map((r) => (r.id === data.role.id ? { ...r, ...data.role } : r)));
        setDraft(data.role);
        setDirty(false);
        showToast("ok", "Role saved");
      } else {
        showToast("err", "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteRole(id: number) {
    const role = roles.find((r) => r.id === id);
    if (!role || role.isSystem) return;
    if (!confirm(`Delete role "${role.label}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/roles/${id}`, { method: "DELETE" });
    if (res.ok) {
      const remaining = roles.filter((r) => r.id !== id);
      setRoles(remaining);
      if (selectedId === id) {
        setSelectedId(remaining[0]?.id ?? null);
        setDraft(remaining[0] ? JSON.parse(JSON.stringify(remaining[0])) : null);
      }
      showToast("ok", "Role deleted");
    } else {
      showToast("err", "Cannot delete role");
    }
  }

  async function createRole() {
    if (!newRole.name || !newRole.label) return;
    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRole),
    });
    if (res.ok) {
      const data = await res.json();
      const full = { ...data.role, employeeCount: 0 };
      setRoles((prev) => [...prev, full].sort((a, b) => b.level - a.level));
      setSelectedId(full.id);
      setDraft(JSON.parse(JSON.stringify(full)));
      setShowNewForm(false);
      setNewRole({ name: "", label: "", level: 50, color: "#6b7280", description: "" });
      showToast("ok", "Role created");
    } else {
      showToast("err", "Failed to create role");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Loading roles…</div>;
  }

  return (
    <div style={{ display: "flex", gap: 20, minHeight: 600 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 99999,
          padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: toast.type === "ok" ? "#dcfce7" : "#fee2e2",
          color: toast.type === "ok" ? "#166534" : "#991b1b",
          border: `1px solid ${toast.type === "ok" ? "#bbf7d0" : "#fecaca"}`,
          boxShadow: "0 4px 12px rgba(0,0,0,.1)",
        }}>{toast.msg}</div>
      )}

      {/* ── Left: Role list ── */}
      <div style={{ width: 240, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".06em" }}>
            Roles ({roles.length})
          </span>
          <button
            onClick={() => setShowNewForm((o) => !o)}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "#C8102E", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            <Plus size={12} /> New
          </button>
        </div>

        {/* New role form */}
        {showNewForm && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>New Role</div>
            <input placeholder="Role key (e.g. BDE)" value={newRole.name}
              onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
              style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "5px 8px", fontSize: 12, marginBottom: 6, boxSizing: "border-box" }} />
            <input placeholder="Display label" value={newRole.label}
              onChange={(e) => setNewRole({ ...newRole, label: e.target.value })}
              style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "5px 8px", fontSize: 12, marginBottom: 6, boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input type="number" placeholder="Level" value={newRole.level}
                onChange={(e) => setNewRole({ ...newRole, level: Number(e.target.value) })}
                style={{ flex: 1, border: "1px solid #d1d5db", borderRadius: 6, padding: "5px 8px", fontSize: 12 }} />
              <input type="color" value={newRole.color}
                onChange={(e) => setNewRole({ ...newRole, color: e.target.value })}
                style={{ width: 34, height: 34, border: "1px solid #d1d5db", borderRadius: 6, padding: 2, cursor: "pointer" }} />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={createRole} style={{ flex: 1, background: "#C8102E", color: "#fff", border: "none", borderRadius: 6, padding: "6px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Create
              </button>
              <button onClick={() => setShowNewForm(false)} style={{ flex: 1, background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 6, padding: "6px 0", fontSize: 12, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Role cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {roles.map((role, idx) => (
            <button
              key={role.id}
              onClick={() => selectRole(role)}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
                background: selectedId === role.id ? "#fff5f5" : "#fff",
                border: `1px solid ${selectedId === role.id ? "#fca5a5" : "#e5e7eb"}`,
                borderLeft: `4px solid ${role.color}`,
                borderRadius: 8, cursor: "pointer", textAlign: "left",
                transition: "border-color .15s",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {role.label}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>Lv {role.level}</span>
                  {role.employeeCount > 0 && (
                    <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10, color: "#6b7280" }}>
                      <Users size={10} /> {role.employeeCount}
                    </span>
                  )}
                  {role.isSystem && <Lock size={10} color="#C8102E" />}
                </div>
              </div>
              {/* Hierarchy arrows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 1, opacity: .4 }}>
                <ChevronUp size={10} />
                <ChevronDown size={10} />
              </div>
            </button>
          ))}
        </div>

        {/* Hierarchy legend */}
        <div style={{ marginTop: 16, padding: 12, background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>Hierarchy</div>
          {roles.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
              <div style={{ flex: 1, height: 4, background: r.color, opacity: .3, borderRadius: 2, maxWidth: `${r.level}%` }} />
              <span style={{ fontSize: 10, color: "#9ca3af", width: 24, textAlign: "right" }}>{r.level}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: Role detail + permission matrix ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!draft ? (
          <div style={{ textAlign: "center", color: "#9ca3af", padding: 40 }}>Select a role to edit</div>
        ) : (
          <>
            {/* Header */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: draft.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Shield size={16} color="#fff" />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>{draft.label}</span>
                      {draft.isSystem && (
                        <span style={{ fontSize: 10, background: "#fef2f2", color: "#C8102E", borderRadius: 999, padding: "2px 8px", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                          <Lock size={9} /> System Role
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                      Level {draft.level} · {draft.employeeCount} employee{draft.employeeCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                {/* Meta fields inline */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 3 }}>Role key</label>
                    <input value={draft.name} onChange={(e) => updateMeta("name", e.target.value)} disabled={draft.isSystem}
                      style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "5px 10px", fontSize: 12, width: 180, background: draft.isSystem ? "#f9fafb" : "#fff" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 3 }}>Display label</label>
                    <input value={draft.label} onChange={(e) => updateMeta("label", e.target.value)}
                      style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "5px 10px", fontSize: 12, width: 220 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 3 }}>Level (1–100)</label>
                    <input type="number" min={1} max={100} value={draft.level} onChange={(e) => updateMeta("level", Number(e.target.value))}
                      style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "5px 10px", fontSize: 12, width: 80 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 3 }}>Color</label>
                    <input type="color" value={draft.color} onChange={(e) => updateMeta("color", e.target.value)}
                      style={{ width: 38, height: 30, border: "1px solid #d1d5db", borderRadius: 6, padding: 2, cursor: "pointer" }} />
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 3 }}>Description</label>
                  <input value={draft.description} onChange={(e) => updateMeta("description", e.target.value)} placeholder="Short description of this role…"
                    style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "5px 10px", fontSize: 12, width: "100%", maxWidth: 500, boxSizing: "border-box" }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {!draft.isSystem && (
                  <button onClick={() => deleteRole(draft.id)}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "1px solid #fecaca", background: "#fff5f5", color: "#dc2626", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>
                    <Trash2 size={13} /> Delete
                  </button>
                )}
                <button onClick={save} disabled={!dirty || saving}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 16px", borderRadius: 8, border: "none", background: dirty ? "#C8102E" : "#e5e7eb", color: dirty ? "#fff" : "#9ca3af", cursor: dirty ? "pointer" : "default", fontSize: 12, fontWeight: 600 }}>
                  <Save size={13} /> {saving ? "Saving…" : "Save Role"}
                </button>
              </div>
            </div>

            {/* Permission matrix */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
              {/* Column headers */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 80px 60px", borderBottom: "2px solid #e5e7eb", padding: "10px 16px", background: "#f9fafb" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".06em" }}>Page / Feature</span>
                {ACTIONS.map((a) => (
                  <span key={a.key} style={{ fontSize: 11, fontWeight: 700, color: a.color, textAlign: "center", textTransform: "uppercase", letterSpacing: ".06em" }}>
                    {a.label}
                  </span>
                ))}
                <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textAlign: "center", textTransform: "uppercase", letterSpacing: ".06em" }}>All</span>
              </div>

              {PAGE_GROUPS.map((group) => {
                const groupPages = PAGES.filter((p) => p.group === group);
                return (
                  <div key={group}>
                    {/* Group header */}
                    <div style={{ padding: "6px 16px", background: "#f3f4f6", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".08em" }}>{group}</span>
                    </div>

                    {groupPages.map((page, i) => {
                      const pa = getPageAccess(draft, page.key);
                      const isLast = i === groupPages.length - 1;
                      const allOn = pa.canView && pa.canCreate && pa.canEdit && pa.canDelete;
                      return (
                        <div
                          key={page.key}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 80px 80px 80px 80px 60px",
                            padding: "10px 16px",
                            borderBottom: isLast ? "none" : "1px solid #f3f4f6",
                            alignItems: "center",
                            background: pa.canView ? "#fffbfb" : "#fff",
                            transition: "background .1s",
                          }}
                        >
                          <span style={{ fontSize: 13, color: pa.canView ? "#111" : "#9ca3af", fontWeight: pa.canView ? 500 : 400 }}>
                            {page.label}
                          </span>
                          {ACTIONS.map((action) => {
                            const val = pa[action.key] as boolean;
                            // Disable create/edit/delete if view is off
                            const disabled = action.key !== "canView" && !pa.canView;
                            return (
                              <div key={action.key} style={{ display: "flex", justifyContent: "center" }}>
                                <button
                                  onClick={() => !disabled && togglePermission(page.key, action.key)}
                                  disabled={disabled}
                                  title={disabled ? "Enable View first" : `Toggle ${action.label}`}
                                  style={{
                                    width: 28, height: 28, borderRadius: 6, border: "2px solid",
                                    borderColor: val ? action.color : "#d1d5db",
                                    background: val ? action.color : "#fff",
                                    cursor: disabled ? "not-allowed" : "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    opacity: disabled ? .3 : 1,
                                    transition: "all .1s",
                                  }}
                                >
                                  {val && <span style={{ color: "#fff", fontSize: 14, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                                </button>
                              </div>
                            );
                          })}
                          {/* All toggle */}
                          <div style={{ display: "flex", justifyContent: "center" }}>
                            <button
                              onClick={() => toggleRow(page.key, !allOn)}
                              style={{
                                width: 28, height: 28, borderRadius: 6, border: "2px solid",
                                borderColor: allOn ? "#111" : "#d1d5db",
                                background: allOn ? "#111" : "#fff",
                                cursor: "pointer", fontSize: 10, fontWeight: 700,
                                color: allOn ? "#fff" : "#6b7280",
                                transition: "all .1s",
                              }}
                            >
                              {allOn ? "✓" : "–"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Warning about manager override */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 12, padding: "10px 14px", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8 }}>
              <AlertTriangle size={14} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: "#92400e", margin: 0, lineHeight: 1.5 }}>
                Employees with <strong>isManager = true</strong> always have full access regardless of role permissions.
                To restrict a manager, uncheck <em>isManager</em> on their employee record first.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
