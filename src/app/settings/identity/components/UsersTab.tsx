"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Eye, Power, Users } from "lucide-react";
import type { IdentityUser, UserStatus } from "../data/identityDefaults";
import { MOCK_USERS, userStatusBadge, fmtDate } from "../data/identityDefaults";
import UserProfileDrawer from "./UserProfileDrawer";

interface Props { canEdit: boolean; }

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "",           label: "All Users"    },
  { value: "ACTIVE",     label: "Active"       },
  { value: "SUSPENDED",  label: "Suspended"    },
  { value: "DRAFT",      label: "Draft"        },
  { value: "INACTIVE",   label: "Inactive"     },
];

export default function UsersTab({ canEdit }: Props) {
  const [users, setUsers]             = useState<IdentityUser[]>(MOCK_USERS);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [viewUser, setViewUser]       = useState<IdentityUser | null>(null);
  const [toast, setToast]             = useState("");

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/identity/users");
      if (r.ok) setUsers(await r.json());
    } catch { /* keep mock */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleQuickStatus(user: IdentityUser, newStatus: UserStatus) {
    try {
      const r = await fetch(`/api/admin/identity/users/${user.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employmentStatus: newStatus }),
      });
      if (!r.ok) { flash("Status update failed."); return; }
      setUsers((us) => us.map((u) => u.id === user.id ? { ...u, employmentStatus: newStatus } : u));
      flash(`${user.name} ${newStatus === "ACTIVE" ? "activated" : "suspended"}.`);
    } catch { flash("Network error."); }
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const okQ = !search || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.employeeCode.toLowerCase().includes(q) || (u.departmentName ?? "").toLowerCase().includes(q);
    const okS = !filterStatus || u.employmentStatus === filterStatus;
    return okQ && okS;
  });

  const activeCount    = users.filter((u) => u.employmentStatus === "ACTIVE").length;
  const suspendedCount = users.filter((u) => u.employmentStatus === "SUSPENDED").length;
  const draftCount     = users.filter((u) => u.employmentStatus === "DRAFT").length;

  return (
    <div style={{ position: "relative" }}>
      {/* KPI row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" as const }}>
        {[
          { label: "Total Users",  value: users.length,    color: "#0066FF" },
          { label: "Active",       value: activeCount,     color: "#1F9D55" },
          { label: "Suspended",    value: suspendedCount,  color: "#FF6B00" },
          { label: "Draft",        value: draftCount,      color: "var(--fg-4)" },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: "12px 20px", flex: "1 1 120px", borderLeft: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "var(--font-display)" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" as const }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 320 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-4)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, code, dept…"
            style={{ width: "100%", paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-1)", outline: "none" }} />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: "7px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-2)", outline: "none" }}>
          {STATUS_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-4)", fontSize: 13 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)" }}>
          <Users size={28} style={{ color: "var(--fg-4)", marginBottom: 8 }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-3)" }}>No users found</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-muted)" }}>
                  {["Code", "Name / Email", "Department", "Designation", "Role", "Status", "Last Login", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--fg-4)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, background: "var(--bg-muted)", padding: "2px 6px", borderRadius: 4 }}>{u.employeeCode}</span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(200,16,46,0.09)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--caveo-red)", flexShrink: 0 }}>
                          {u.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--fg-1)" }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 1 }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--fg-3)" }}>{u.departmentName ?? u.legacyRole.split(" ").slice(-1)[0] ?? "—"}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--fg-3)" }}>{u.designationTitle ?? "—"}</td>
                    <td style={{ padding: "11px 14px" }}>
                      {u.assignedRoles.length > 0
                        ? u.assignedRoles.map((r) => (
                          <span key={r.id} style={{ fontSize: 10.5, fontWeight: 600, background: "rgba(200,16,46,0.08)", color: "var(--caveo-red)", padding: "2px 7px", borderRadius: 999, marginRight: 4, whiteSpace: "nowrap" }}>
                            {r.name}
                          </span>
                        ))
                        : <span style={{ fontSize: 11.5, color: "var(--fg-4)", fontStyle: "italic" }}>No role</span>}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span className={`badge ${userStatusBadge(u.employmentStatus)}`} style={{ fontSize: 10 }}>{u.employmentStatus}</span>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--fg-4)", whiteSpace: "nowrap" }}>
                      {u.lastLoginAt ? fmtDate(u.lastLoginAt) : "—"}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => setViewUser(u)}
                          data-testid={`identity-user-view-${u.id}`}
                          style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: 11, color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 4 }}>
                          <Eye size={11} strokeWidth={2} /> View
                        </button>
                        {canEdit && u.employmentStatus !== "INACTIVE" && (
                          <button onClick={() => handleQuickStatus(u, u.employmentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}
                            data-testid={`identity-user-toggle-${u.id}`}
                            style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${u.employmentStatus === "ACTIVE" ? "rgba(200,16,46,0.3)" : "rgba(31,157,85,0.3)"}`, background: "transparent", cursor: "pointer", fontSize: 11, color: u.employmentStatus === "ACTIVE" ? "var(--danger)" : "#1F9D55", display: "flex", alignItems: "center", gap: 4 }}>
                            <Power size={11} strokeWidth={2} /> {u.employmentStatus === "ACTIVE" ? "Suspend" : "Activate"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--fg-4)" }}>
        {filtered.length} of {users.length} user{users.length !== 1 ? "s" : ""}
      </div>

      {/* Profile drawer */}
      {viewUser && (
        <UserProfileDrawer
          user={viewUser}
          canEdit={canEdit}
          onClose={() => setViewUser(null)}
          onUpdated={() => { setViewUser(null); load(); }}
        />
      )}

      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 70, padding: "10px 16px", background: "var(--fg-1)", color: "var(--fg-inverse)", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 500, boxShadow: "var(--shadow-md)" }}>{toast}</div>}
    </div>
  );
}
