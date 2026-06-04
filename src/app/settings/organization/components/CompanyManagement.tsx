"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit2, Power, X, Globe, Mail, Phone, Building2 } from "lucide-react";
import type { OrgCompany } from "../data/organization.types";
import { statusBadge, fmtDate, MOCK_COMPANIES } from "../data/organization.types";

interface Props {
  canEdit: boolean;
}

type FormData = {
  companyName: string; legalName: string; companyCode: string;
  gstNumber: string; panNumber: string; email: string; phone: string; website: string;
};

const EMPTY_FORM: FormData = {
  companyName: "", legalName: "", companyCode: "", gstNumber: "", panNumber: "", email: "", phone: "", website: "",
};

export default function CompanyManagement({ canEdit }: Props) {
  const [companies, setCompanies]     = useState<OrgCompany[]>(MOCK_COMPANIES);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [formOpen, setFormOpen]       = useState(false);
  const [editTarget, setEditTarget]   = useState<OrgCompany | null>(null);
  const [form, setForm]               = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [confirmId, setConfirmId]     = useState<number | null>(null);
  const [toast, setToast]             = useState("");
  const [error, setError]             = useState("");

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/settings/organization/companies");
      if (r.ok) setCompanies(await r.json());
    } catch { /* keep mock data */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setError("");
    setFormOpen(true);
  }

  function openEdit(co: OrgCompany) {
    setEditTarget(co);
    setForm({ companyName: co.companyName, legalName: co.legalName, companyCode: co.companyCode, gstNumber: co.gstNumber, panNumber: co.panNumber, email: co.email, phone: co.phone, website: co.website });
    setError("");
    setFormOpen(true);
  }

  async function handleSave() {
    if (!form.companyName.trim()) { setError("Company name is required."); return; }
    setSaving(true); setError("");
    try {
      const url   = editTarget ? `/api/settings/organization/companies/${editTarget.id}` : "/api/settings/organization/companies";
      const method = editTarget ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Save failed."); setSaving(false); return; }
      flash(editTarget ? `${form.companyName} updated.` : `${form.companyName} created.`);
      setFormOpen(false);
      load();
    } catch { setError("Network error."); }
    setSaving(false);
  }

  async function handleStatus(id: number, newStatus: "ACTIVE" | "INACTIVE") {
    try {
      const r = await fetch(`/api/settings/organization/companies/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }),
      });
      const data = await r.json();
      if (!r.ok) { flash(data.error ?? "Status update failed."); return; }
      setCompanies((cs) => cs.map((c) => c.id === id ? { ...c, status: newStatus } : c));
      flash(newStatus === "ACTIVE" ? "Company activated." : "Company deactivated.");
    } catch { flash("Network error."); }
    setConfirmId(null);
  }

  const filtered = companies.filter((c) =>
    !search || c.companyName.toLowerCase().includes(search.toLowerCase()) ||
    c.companyCode.toLowerCase().includes(search.toLowerCase())
  );

  const field = (label: string, key: keyof FormData, placeholder?: string, required?: boolean) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)" }}>
        {label}{required && <span style={{ color: "var(--danger)" }}> *</span>}
      </label>
      <input
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder ?? label}
        style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13, background: "var(--surface)", color: "var(--fg-1)", outline: "none" }}
        onFocus={(e) => (e.target.style.borderColor = "var(--infra-blue)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      />
    </div>
  );

  return (
    <div style={{ position: "relative" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-4)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies…"
            style={{ width: "100%", paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12.5, background: "var(--surface)", color: "var(--fg-1)", outline: "none" }}
          />
        </div>
        {canEdit && (
          <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: "var(--radius-sm)", background: "var(--caveo-red)", color: "#fff", border: "none", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={13} strokeWidth={2.5} /> Add Company
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-4)", fontSize: 13 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)" }}>
          <Building2 size={28} style={{ color: "var(--fg-4)", marginBottom: 8 }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-3)" }}>{search ? "No companies match your search" : "No companies yet"}</div>
          {!search && canEdit && <div style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 4 }}>Click "Add Company" to create the first one.</div>}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-muted)" }}>
                {["Company Name", "Code", "GST", "PAN", "Branches", "Employees", "Status", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--fg-4)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((co, i) => (
                <tr key={co.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 600, color: "var(--fg-1)" }}>{co.companyName}</div>
                    <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 1 }}>{co.legalName}</div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--bg-muted)", padding: "2px 6px", borderRadius: 4 }}>{co.companyCode || "—"}</span>
                  </td>
                  <td style={{ padding: "12px 14px", color: "var(--fg-3)", fontSize: 12 }}>{co.gstNumber || <span style={{ color: "var(--fg-4)" }}>—</span>}</td>
                  <td style={{ padding: "12px 14px", color: "var(--fg-3)", fontSize: 12 }}>{co.panNumber || <span style={{ color: "var(--fg-4)" }}>—</span>}</td>
                  <td style={{ padding: "12px 14px", textAlign: "center", color: "var(--fg-2)", fontWeight: 600 }}>{co.branchCount ?? 0}</td>
                  <td style={{ padding: "12px 14px", textAlign: "center", color: "var(--fg-2)", fontWeight: 600 }}>{co.employeeCount ?? 0}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span className={`badge ${statusBadge(co.status)}`} style={{ fontSize: 10 }}>{co.status}</span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {canEdit && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <button onClick={() => openEdit(co)} title="Edit" style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: 11, color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 4 }}>
                          <Edit2 size={11} strokeWidth={2} /> Edit
                        </button>
                        <button
                          onClick={() => co.status === "ACTIVE" ? setConfirmId(co.id) : handleStatus(co.id, "ACTIVE")}
                          title={co.status === "ACTIVE" ? "Deactivate" : "Activate"}
                          style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${co.status === "ACTIVE" ? "rgba(200,16,46,0.3)" : "rgba(31,157,85,0.3)"}`, background: "transparent", cursor: "pointer", fontSize: 11, color: co.status === "ACTIVE" ? "var(--danger)" : "#1F9D55", display: "flex", alignItems: "center", gap: 4 }}>
                          <Power size={11} strokeWidth={2} /> {co.status === "ACTIVE" ? "Deactivate" : "Activate"}
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

      {/* Slide-over form */}
      {formOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,17,21,0.4)" }} onClick={() => setFormOpen(false)} />
          <div style={{ position: "relative", width: 440, background: "var(--surface)", height: "100%", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-lg)" }}>
            {/* Header */}
            <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-1)" }}>{editTarget ? "Edit Company" : "New Company"}</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 2 }}>Fill in the company details below</div>
              </div>
              <button onClick={() => setFormOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-4)", padding: 4 }}>
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--fg-4)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Building2 size={11} strokeWidth={2} /> Company Information
                </div>
                {field("Company Name", "companyName", "e.g. Caveo Infosystems", true)}
                {field("Legal Name", "legalName", "e.g. Caveo Infosystems Pvt. Ltd.")}
                {field("Company Code", "companyCode", "e.g. CAVEO-HO")}
                {field("GST Number", "gstNumber", "e.g. 33AABCC1234F1ZX")}
                {field("PAN Number", "panNumber", "e.g. AABCC1234F")}

                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--fg-4)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <Mail size={11} strokeWidth={2} /> Contact
                </div>
                {field("Email", "email", "info@company.com")}
                {field("Phone", "phone", "+91 00 0000 0000")}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 5 }}>
                    <Globe size={11} /> Website
                  </label>
                  <input
                    value={form.website}
                    onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                    placeholder="https://www.company.com"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13, background: "var(--surface)", color: "var(--fg-1)", outline: "none" }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--infra-blue)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                  />
                </div>

                {error && (
                  <div style={{ padding: "8px 12px", background: "rgba(200,16,46,0.06)", border: "1px solid rgba(200,16,46,0.2)", borderRadius: "var(--radius-sm)", fontSize: 12, color: "var(--danger)" }}>
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setFormOpen(false)} style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "transparent", fontSize: 13, fontWeight: 500, cursor: "pointer", color: "var(--fg-2)" }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} style={{ padding: "8px 18px", borderRadius: "var(--radius-sm)", border: "none", background: saving ? "var(--border)" : "var(--caveo-red)", color: saving ? "var(--fg-4)" : "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer" }}>
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Create Company"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm deactivate */}
      {confirmId !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,17,21,0.5)" }} onClick={() => setConfirmId(null)} />
          <div style={{ position: "relative", background: "var(--surface)", borderRadius: "var(--radius-lg)", padding: 24, width: 380, boxShadow: "var(--shadow-lg)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-1)", marginBottom: 8 }}>Deactivate Company?</div>
            <div style={{ fontSize: 13, color: "var(--fg-3)", marginBottom: 20 }}>
              This will mark the company as inactive. Existing records will not be deleted. You can reactivate it later.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmId(null)} style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "transparent", fontSize: 13, cursor: "pointer", color: "var(--fg-2)" }}>
                Cancel
              </button>
              <button onClick={() => handleStatus(confirmId, "INACTIVE")} style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "none", background: "var(--danger)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 70, padding: "10px 16px", background: "var(--fg-1)", color: "var(--fg-inverse)", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 500, boxShadow: "var(--shadow-md)" }}>
          {toast}
        </div>
      )}

      {/* Footer meta */}
      <div style={{ marginTop: 14, fontSize: 11.5, color: "var(--fg-4)" }}>
        Showing {filtered.length} of {companies.length} {companies.length === 1 ? "company" : "companies"}
        {companies[0]?.createdAt && ` · Last updated ${fmtDate(companies[0].updatedAt)}`}
      </div>
    </div>
  );
}
