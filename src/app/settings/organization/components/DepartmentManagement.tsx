"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit2, Power, X, Layers } from "lucide-react";
import type { OrgDepartment, OrgCompany } from "../data/organization.types";
import { statusBadge, MOCK_DEPARTMENTS } from "../data/organization.types";

interface Props { canEdit: boolean; companies: OrgCompany[]; onRefresh?: () => void; }
type FormData = { companyId: string; name: string; code: string; description: string; };
const EMPTY: FormData = { companyId: "", name: "", code: "", description: "" };

export default function DepartmentManagement({ canEdit, companies, onRefresh }: Props) {
  const [depts, setDepts]           = useState<OrgDepartment[]>(MOCK_DEPARTMENTS);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterCo, setFilterCo]     = useState("");
  const [formOpen, setFormOpen]     = useState(false);
  const [editTarget, setEditTarget] = useState<OrgDepartment | null>(null);
  const [form, setForm]             = useState<FormData>(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [confirmId, setConfirmId]   = useState<number | null>(null);
  const [toast, setToast]           = useState("");
  const [error, setError]           = useState("");

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/settings/organization/departments");
      if (r.ok) setDepts(await r.json());
    } catch { /* keep mock */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditTarget(null);
    setForm({ ...EMPTY, companyId: companies[0]?.id.toString() ?? "" });
    setError(""); setFormOpen(true);
  }

  function openEdit(d: OrgDepartment) {
    setEditTarget(d);
    setForm({ companyId: d.companyId.toString(), name: d.name, code: d.code, description: d.description });
    setError(""); setFormOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Department name is required."); return; }
    setSaving(true); setError("");
    try {
      const url    = editTarget ? `/api/settings/organization/departments/${editTarget.id}` : "/api/settings/organization/departments";
      const method = editTarget ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Save failed."); setSaving(false); return; }
      flash(editTarget ? "Department updated." : "Department created.");
      setFormOpen(false); load(); onRefresh?.();
    } catch { setError("Network error."); }
    setSaving(false);
  }

  async function handleStatus(id: number, status: "ACTIVE" | "INACTIVE") {
    try {
      const r = await fetch(`/api/settings/organization/departments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (!r.ok) { flash("Status update failed."); return; }
      setDepts((ds) => ds.map((d) => d.id === id ? { ...d, status } : d));
      flash(status === "ACTIVE" ? "Department activated." : "Department deactivated.");
      onRefresh?.();
    } catch { flash("Network error."); }
    setConfirmId(null);
  }

  const filtered = depts.filter((d) => {
    const q = search.toLowerCase();
    const ok = !search || d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q);
    const okCo = !filterCo || d.companyId.toString() === filterCo;
    return ok && okCo;
  });

  const inp = (label: string, key: keyof FormData, placeholder?: string, required?: boolean) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)" }}>{label}{required && <span style={{ color: "var(--danger)" }}> *</span>}</label>
      <input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={placeholder ?? label}
        style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13, background: "var(--surface)", color: "var(--fg-1)", outline: "none" }}
        onFocus={(e) => (e.target.style.borderColor = "var(--infra-blue)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
    </div>
  );

  return (
    <div style={{ position: "relative" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" as const }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 280 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-4)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search departments…"
            style={{ width: "100%", paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-1)", outline: "none" }} />
        </div>
        {companies.length > 1 && (
          <select value={filterCo} onChange={(e) => setFilterCo(e.target.value)}
            style={{ padding: "7px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-2)", outline: "none" }}>
            <option value="">All Companies</option>
            {companies.map((c) => <option key={c.id} value={c.id.toString()}>{c.companyName}</option>)}
          </select>
        )}
        {canEdit && (
          <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: "var(--radius-sm)", background: "var(--caveo-red)", color: "#fff", border: "none", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={13} strokeWidth={2.5} /> Add Department
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-4)", fontSize: 13 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)" }}>
          <Layers size={28} style={{ color: "var(--fg-4)", marginBottom: 8 }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-3)" }}>No departments found</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-muted)" }}>
                {["Department", "Code", "Company", "Teams", "Employees", "Status", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--fg-4)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => (
                <tr key={d.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 600, color: "var(--fg-1)" }}>{d.name}</div>
                    {d.description && <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 1 }}>{d.description}</div>}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--bg-muted)", padding: "2px 6px", borderRadius: 4 }}>{d.code || "—"}</span>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--fg-3)" }}>{d.companyName}</td>
                  <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 600 }}>{d.teamCount ?? 0}</td>
                  <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 600 }}>{d.employeeCount ?? 0}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span className={`badge ${statusBadge(d.status)}`} style={{ fontSize: 10 }}>{d.status}</span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {canEdit && (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => openEdit(d)} style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: 11, color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 4 }}>
                          <Edit2 size={11} strokeWidth={2} /> Edit
                        </button>
                        <button onClick={() => d.status === "ACTIVE" ? setConfirmId(d.id) : handleStatus(d.id, "ACTIVE")}
                          style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${d.status === "ACTIVE" ? "rgba(200,16,46,0.3)" : "rgba(31,157,85,0.3)"}`, background: "transparent", cursor: "pointer", fontSize: 11, color: d.status === "ACTIVE" ? "var(--danger)" : "#1F9D55", display: "flex", alignItems: "center", gap: 4 }}>
                          <Power size={11} strokeWidth={2} /> {d.status === "ACTIVE" ? "Deactivate" : "Activate"}
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
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-1)" }}>{editTarget ? "Edit Department" : "New Department"}</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 2 }}>e.g. Sales, Finance, Operations</div>
              </div>
              <button onClick={() => setFormOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-4)", padding: 4 }}><X size={16} strokeWidth={2} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)" }}>Company <span style={{ color: "var(--danger)" }}>*</span></label>
                  <select value={form.companyId} onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))}
                    style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13, background: "var(--surface)", color: "var(--fg-1)", outline: "none" }}>
                    {companies.map((c) => <option key={c.id} value={c.id.toString()}>{c.companyName}</option>)}
                  </select>
                </div>
                {inp("Department Name", "name", "e.g. Sales", true)}
                {inp("Department Code", "code", "e.g. SALES")}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)" }}>Description</label>
                  <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief description of this department's function" rows={3}
                    style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13, background: "var(--surface)", color: "var(--fg-1)", outline: "none", resize: "vertical" as const, fontFamily: "var(--font-sans)" }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--infra-blue)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
                </div>
                {error && <div style={{ padding: "8px 12px", background: "rgba(200,16,46,0.06)", border: "1px solid rgba(200,16,46,0.2)", borderRadius: 4, fontSize: 12, color: "var(--danger)" }}>{error}</div>}
              </div>
            </div>
            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setFormOpen(false)} style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "transparent", fontSize: 13, fontWeight: 500, cursor: "pointer", color: "var(--fg-2)" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: "8px 18px", borderRadius: "var(--radius-sm)", border: "none", background: saving ? "var(--border)" : "var(--caveo-red)", color: saving ? "var(--fg-4)" : "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer" }}>
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Create Department"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmId !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,17,21,0.5)" }} onClick={() => setConfirmId(null)} />
          <div style={{ position: "relative", background: "var(--surface)", borderRadius: "var(--radius-lg)", padding: 24, width: 360, boxShadow: "var(--shadow-lg)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-1)", marginBottom: 8 }}>Deactivate Department?</div>
            <div style={{ fontSize: 13, color: "var(--fg-3)", marginBottom: 20 }}>This marks the department inactive. Teams and employees linked here remain unchanged. Reactivate at any time.</div>
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
