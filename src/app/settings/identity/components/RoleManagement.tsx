"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Copy, Power, Shield, ShieldOff } from "lucide-react";
import type { IdentityRole } from "../data/identityDefaults";
import { MOCK_ROLES, roleStatusBadge } from "../data/identityDefaults";
import RoleEditor from "./RoleEditor";

interface Props { canEdit: boolean; }

export default function RoleManagement({ canEdit }: Props) {
  const [roles, setRoles]       = useState<IdentityRole[]>(MOCK_ROLES);
  const [loading, setLoading]   = useState(true);
  const [editorRole, setEditorRole] = useState<IdentityRole | null | "new">(undefined as unknown as null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [toast, setToast]       = useState("");
  const [confirmDisable, setConfirmDisable] = useState<IdentityRole | null>(null);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/identity/roles");
      if (r.ok) setRoles(await r.json());
    } catch { /* keep mock */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate()                         { setEditorRole(null); setEditorOpen(true); }
  function openEdit(role: IdentityRole)         { setEditorRole(role); setEditorOpen(true); }

  async function handleClone(role: IdentityRole) {
    try {
      const r = await fetch("/api/admin/identity/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${role.name} (Copy)`, description: role.description, level: role.level }),
      });
      if (!r.ok) { flash("Clone failed."); return; }
      flash(`"${role.name}" cloned.`); load();
    } catch { flash("Network error."); }
  }

  async function handleToggleStatus(role: IdentityRole) {
    const newStatus = role.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const r = await fetch(`/api/admin/identity/roles/${role.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!r.ok) { flash("Status update failed."); return; }
      setRoles((rs) => rs.map((ro) => ro.id === role.id ? { ...ro, status: newStatus } : ro));
      flash(newStatus === "ACTIVE" ? `${role.name} activated.` : `${role.name} disabled.`);
    } catch { flash("Network error."); }
    setConfirmDisable(null);
  }

  const sorted = [...roles].sort((a, b) => b.level - a.level);

  return (
    <div style={{ position: "relative" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg-1)" }}>Role Management</div>
          <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 2 }}>
            Define roles, set authority levels and assign permissions via the Permissions tab.
          </div>
        </div>
        {canEdit && (
          <button onClick={openCreate}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: "var(--radius-sm)", background: "var(--caveo-red)", color: "#fff", border: "none", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={13} strokeWidth={2.5} /> Create Role
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-4)", fontSize: 13 }}>Loading…</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-muted)" }}>
                {["Role", "Level", "Permissions", "Users", "Type", "Status", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--fg-4)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((role, i) => (
                <tr key={role.id} style={{ borderBottom: i < sorted.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: role.status === "ACTIVE" ? "rgba(200,16,46,0.09)" : "var(--bg-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {role.status === "ACTIVE"
                          ? <Shield size={13} strokeWidth={1.8} style={{ color: "var(--caveo-red)" }} />
                          : <ShieldOff size={13} strokeWidth={1.8} style={{ color: "var(--fg-4)" }} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: role.status === "ACTIVE" ? "var(--fg-1)" : "var(--fg-4)" }}>{role.name}</div>
                        <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 1, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{role.description}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, background: "var(--bg-muted)", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", fontFamily: "var(--font-mono)" }}>
                      {role.level}
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--fg-2)" }}>{role.permissionCount}</td>
                  <td style={{ padding: "12px 14px", textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--fg-2)" }}>{role.userCount}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: role.isSystemRole ? "#0066FF" : "var(--fg-4)", background: role.isSystemRole ? "rgba(0,102,255,0.09)" : "var(--bg-muted)", padding: "2px 7px", borderRadius: 999 }}>
                      {role.isSystemRole ? "System" : "Custom"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span className={`badge ${roleStatusBadge(role.status)}`} style={{ fontSize: 10 }}>{role.status}</span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {canEdit && (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => openEdit(role)}
                          style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: 11, color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 4 }}>
                          <Edit2 size={11} strokeWidth={2} /> Edit
                        </button>
                        {!role.isSystemRole && (
                          <button onClick={() => handleClone(role)}
                            style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: 11, color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 4 }}>
                            <Copy size={11} strokeWidth={2} /> Clone
                          </button>
                        )}
                        {!role.isSystemRole && (
                          <button onClick={() => role.status === "ACTIVE" ? setConfirmDisable(role) : handleToggleStatus(role)}
                            style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${role.status === "ACTIVE" ? "rgba(200,16,46,0.3)" : "rgba(31,157,85,0.3)"}`, background: "transparent", cursor: "pointer", fontSize: 11, color: role.status === "ACTIVE" ? "var(--danger)" : "#1F9D55", display: "flex", alignItems: "center", gap: 4 }}>
                            <Power size={11} strokeWidth={2} /> {role.status === "ACTIVE" ? "Disable" : "Enable"}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--fg-4)" }}>
        {roles.filter((r) => r.status === "ACTIVE").length} active · {roles.filter((r) => r.isSystemRole).length} system roles
      </div>

      {/* Role editor slide-over */}
      {editorOpen && (
        <RoleEditor
          role={editorRole as IdentityRole | null}
          onClose={() => setEditorOpen(false)}
          onSaved={() => { setEditorOpen(false); flash(editorRole ? "Role updated." : "Role created."); load(); }}
        />
      )}

      {/* Confirm disable */}
      {confirmDisable && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,17,21,0.5)" }} onClick={() => setConfirmDisable(null)} />
          <div style={{ position: "relative", background: "var(--surface)", borderRadius: "var(--radius-lg)", padding: 24, width: 360, boxShadow: "var(--shadow-lg)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-1)", marginBottom: 8 }}>Disable Role?</div>
            <div style={{ fontSize: 13, color: "var(--fg-3)", marginBottom: 20 }}>
              Disabling <strong>{confirmDisable.name}</strong> will revoke access for all {confirmDisable.userCount} assigned user{confirmDisable.userCount !== 1 ? "s" : ""}. This can be re-enabled at any time.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDisable(null)} style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "transparent", fontSize: 13, cursor: "pointer", color: "var(--fg-2)" }}>Cancel</button>
              <button onClick={() => handleToggleStatus(confirmDisable)} style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "none", background: "var(--danger)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Disable</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 70, padding: "10px 16px", background: "var(--fg-1)", color: "var(--fg-inverse)", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 500, boxShadow: "var(--shadow-md)" }}>{toast}</div>}
    </div>
  );
}
