"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit2, Power, X, Users } from "lucide-react";
import type { OrgTeam, OrgDepartment, OrgEmployee } from "../data/organization.types";
import { statusBadge, MOCK_TEAMS } from "../data/organization.types";

interface Props { canEdit: boolean; departments: OrgDepartment[]; employees: OrgEmployee[]; }
type FormData = { departmentId: string; name: string; teamLeadId: string; };
const EMPTY: FormData = { departmentId: "", name: "", teamLeadId: "" };

export default function TeamManagement({ canEdit, departments, employees }: Props) {
  const [teams, setTeams]           = useState<OrgTeam[]>(MOCK_TEAMS);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [formOpen, setFormOpen]     = useState(false);
  const [editTarget, setEditTarget] = useState<OrgTeam | null>(null);
  const [form, setForm]             = useState<FormData>(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [confirmId, setConfirmId]   = useState<number | null>(null);
  const [toast, setToast]           = useState("");
  const [error, setError]           = useState("");

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/settings/organization/teams");
      if (r.ok) setTeams(await r.json());
    } catch { /* keep mock */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditTarget(null);
    setForm({ ...EMPTY, departmentId: departments[0]?.id.toString() ?? "" });
    setError(""); setFormOpen(true);
  }

  function openEdit(t: OrgTeam) {
    setEditTarget(t);
    setForm({ departmentId: t.departmentId.toString(), name: t.name, teamLeadId: t.teamLeadId?.toString() ?? "" });
    setError(""); setFormOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Team name is required."); return; }
    setSaving(true); setError("");
    try {
      const url    = editTarget ? `/api/settings/organization/teams/${editTarget.id}` : "/api/settings/organization/teams";
      const method = editTarget ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Save failed."); setSaving(false); return; }
      flash(editTarget ? "Team updated." : "Team created.");
      setFormOpen(false); load();
    } catch { setError("Network error."); }
    setSaving(false);
  }

  async function handleStatus(id: number, status: "ACTIVE" | "INACTIVE") {
    try {
      const r = await fetch(`/api/settings/organization/teams/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (!r.ok) { flash("Status update failed."); return; }
      setTeams((ts) => ts.map((t) => t.id === id ? { ...t, status } : t));
      flash(status === "ACTIVE" ? "Team activated." : "Team deactivated.");
    } catch { flash("Network error."); }
    setConfirmId(null);
  }

  const filtered = teams.filter((t) => {
    const q = search.toLowerCase();
    const ok = !search || t.name.toLowerCase().includes(q) || (t.departmentName ?? "").toLowerCase().includes(q);
    const okDept = !filterDept || t.departmentId.toString() === filterDept;
    return ok && okDept;
  });

  const activeDepts = departments.filter((d) => d.status === "ACTIVE");

  return (
    <div style={{ position: "relative" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" as const }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 280 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-4)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search teams…"
            style={{ width: "100%", paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-1)", outline: "none" }} />
        </div>
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
          style={{ padding: "7px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-2)", outline: "none" }}>
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d.id} value={d.id.toString()}>{d.name}</option>)}
        </select>
        {canEdit && (
          <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: "var(--radius-sm)", background: "var(--caveo-red)", color: "#fff", border: "none", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={13} strokeWidth={2.5} /> Add Team
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-4)", fontSize: 13 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)" }}>
          <Users size={28} style={{ color: "var(--fg-4)", marginBottom: 8 }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-3)" }}>No teams found</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-muted)" }}>
                {["Team", "Department", "Team Lead", "Members", "Status", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--fg-4)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={t.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px", fontWeight: 600, color: "var(--fg-1)" }}>{t.name}</td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--fg-3)" }}>{t.departmentName}</td>
                  <td style={{ padding: "12px 14px" }}>
                    {t.teamLeadName
                      ? <span style={{ fontSize: 12.5, color: "var(--fg-2)" }}>{t.teamLeadName}</span>
                      : <span style={{ fontSize: 11.5, color: "var(--fg-4)", fontStyle: "italic" }}>Not assigned</span>}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 600 }}>{t.memberCount ?? 0}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span className={`badge ${statusBadge(t.status)}`} style={{ fontSize: 10 }}>{t.status}</span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {canEdit && (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => openEdit(t)} style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: 11, color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 4 }}>
                          <Edit2 size={11} strokeWidth={2} /> Edit
                        </button>
                        <button onClick={() => t.status === "ACTIVE" ? setConfirmId(t.id) : handleStatus(t.id, "ACTIVE")}
                          style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${t.status === "ACTIVE" ? "rgba(200,16,46,0.3)" : "rgba(31,157,85,0.3)"}`, background: "transparent", cursor: "pointer", fontSize: 11, color: t.status === "ACTIVE" ? "var(--danger)" : "#1F9D55", display: "flex", alignItems: "center", gap: 4 }}>
                          <Power size={11} strokeWidth={2} /> {t.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Slide-over */}
      {formOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,17,21,0.4)" }} onClick={() => setFormOpen(false)} />
          <div style={{ position: "relative", width: 420, background: "var(--surface)", height: "100%", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-1)" }}>{editTarget ? "Edit Team" : "New Team"}</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 2 }}>e.g. Enterprise Sales, SOC Team</div>
              </div>
              <button onClick={() => setFormOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-4)", padding: 4 }}><X size={16} strokeWidth={2} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Department */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)" }}>Department <span style={{ color: "var(--danger)" }}>*</span></label>
                  <select value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
                    style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13, background: "var(--surface)", color: "var(--fg-1)", outline: "none" }}>
                    <option value="">Select department…</option>
                    {activeDepts.map((d) => <option key={d.id} value={d.id.toString()}>{d.name}</option>)}
                  </select>
                </div>
                {/* Team Name */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)" }}>Team Name <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Enterprise Sales"
                    style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13, background: "var(--surface)", color: "var(--fg-1)", outline: "none" }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--infra-blue)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
                </div>
                {/* Team Lead */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)" }}>Team Lead</label>
                  <select value={form.teamLeadId} onChange={(e) => setForm((f) => ({ ...f, teamLeadId: e.target.value }))}
                    style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13, background: "var(--surface)", color: "var(--fg-1)", outline: "none" }}>
                    <option value="">None / Unassigned</option>
                    {employees.map((e) => <option key={e.id} value={e.id.toString()}>{e.name} — {e.role}</option>)}
                  </select>
                </div>
                {error && <div style={{ padding: "8px 12px", background: "rgba(200,16,46,0.06)", border: "1px solid rgba(200,16,46,0.2)", borderRadius: 4, fontSize: 12, color: "var(--danger)" }}>{error}</div>}
              </div>
            </div>
            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setFormOpen(false)} style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "transparent", fontSize: 13, fontWeight: 500, cursor: "pointer", color: "var(--fg-2)" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: "8px 18px", borderRadius: "var(--radius-sm)", border: "none", background: saving ? "var(--border)" : "var(--caveo-red)", color: saving ? "var(--fg-4)" : "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer" }}>
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Create Team"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmId !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,17,21,0.5)" }} onClick={() => setConfirmId(null)} />
          <div style={{ position: "relative", background: "var(--surface)", borderRadius: "var(--radius-lg)", padding: 24, width: 360, boxShadow: "var(--shadow-lg)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-1)", marginBottom: 8 }}>Deactivate Team?</div>
            <div style={{ fontSize: 13, color: "var(--fg-3)", marginBottom: 20 }}>This marks the team inactive. Team members remain assigned to their existing records.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmId(null)} style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "transparent", fontSize: 13, cursor: "pointer", color: "var(--fg-2)" }}>Cancel</button>
              <button onClick={() => handleStatus(confirmId, "INACTIVE")} style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "none", background: "var(--danger)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Deactivate</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 70, padding: "10px 16px", background: "var(--fg-1)", color: "var(--fg-inverse)", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 500, boxShadow: "var(--shadow-md)" }}>{toast}</div>}
    </div>
  );
}
