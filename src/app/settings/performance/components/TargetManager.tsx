"use client";

/**
 * Employee Targets — Phase W8.1: employee-wise KRA target assignment by NAME (no raw profile IDs).
 * Role templates are offered only as a starting point; each employee's target is individual and
 * can be customised. EmployeeTarget rows are per-employee — nothing is auto-assigned to a hierarchy.
 */
import { useState } from "react";

type Period = { id: number; name: string; financialYear: string };
type Template = { id: number; name: string };
type Profile = {
  employeeProfileId: number;
  name: string;
  designation: string;
  department: string;
  team: string;
  reportingManager: string;
};
type EmployeeTarget = {
  id: number;
  employeeProfileId: number;
  periodId: number;
  templateId: number | null;
  status: string;
  period: Period;
  employeeProfile?: {
    employee?: { name: string };
    designation?: { title: string };
    department?: { name: string };
    reportingManager?: { name: string };
  };
};

type Props = { employeeTargets: unknown[]; periods: unknown[]; templates: unknown[]; employeeProfiles: unknown[] };

export default function TargetManager({ employeeTargets, periods, templates, employeeProfiles }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeProfileId: "", periodId: "", templateId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const typedTargets = employeeTargets as EmployeeTarget[];
  const typedPeriods = periods as Period[];
  const typedTemplates = templates as Template[];
  const typedProfiles = employeeProfiles as Profile[];

  const templateName = (id: number | null) => (id ? typedTemplates.find((t) => t.id === id)?.name ?? `Template #${id}` : "—");
  const selectedProfile = typedProfiles.find((p) => String(p.employeeProfileId) === form.employeeProfileId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/performance/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeProfileId: Number(form.employeeProfileId),
          periodId: Number(form.periodId),
          templateId: form.templateId ? Number(form.templateId) : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create target");
      } else {
        setShowForm(false);
        setForm({ employeeProfileId: "", periodId: "", templateId: "" });
        window.location.reload();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Employee Targets</h2>
        <button onClick={() => setShowForm(!showForm)}
          style={{ background: "var(--caveo-red)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: 14 }}>
          + Assign Target
        </button>
      </div>

      {/* Employee-wise guidance */}
      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
        KRA targets are assigned to <strong>individual employees</strong>. Role templates are used only as a
        starting point and can be customized per employee — Priya, Sangeetha and Vijesh can each have
        different targets even on the same role template.
      </div>

      {showForm && (
        <form onSubmit={handleSubmit}
          style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Employee *
              <select required value={form.employeeProfileId} onChange={(e) => setForm({ ...form, employeeProfileId: e.target.value })}
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}>
                <option value="">Select employee…</option>
                {typedProfiles.map((p) => (
                  <option key={p.employeeProfileId} value={p.employeeProfileId}>
                    {p.name}{p.designation ? ` — ${p.designation}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Performance Period *
              <select required value={form.periodId} onChange={(e) => setForm({ ...form, periodId: e.target.value })}
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}>
                <option value="">Select period…</option>
                {typedPeriods.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.financialYear})</option>)}
              </select>
            </label>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Role template (starting point)
              <select value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })}
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}>
                <option value="">No template (custom)</option>
                {typedTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          </div>
          {selectedProfile && (
            <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
              {selectedProfile.designation && <>Role: <strong>{selectedProfile.designation}</strong>&nbsp;·&nbsp;</>}
              {selectedProfile.department && <>Dept: {selectedProfile.department}&nbsp;·&nbsp;</>}
              {selectedProfile.reportingManager && <>Reports to: {selectedProfile.reportingManager}</>}
              <div style={{ marginTop: 4, fontStyle: "italic" }}>
                The role template seeds this employee&apos;s targets; you can override them per employee afterwards.
              </div>
            </div>
          )}
          {error && <div style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>{error}</div>}
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button type="submit" disabled={saving}
              style={{ background: "var(--caveo-red)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: 13 }}>
              {saving ? "Saving…" : "Assign Target"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: 13 }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {typedTargets.length === 0 ? (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 40, fontSize: 14 }}>
          No employee targets assigned yet.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Employee</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Role</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Reports to</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Period</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Template (starting point)</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {typedTargets.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 500 }}>{t.employeeProfile?.employee?.name ?? `Profile #${t.employeeProfileId}`}</td>
                  <td style={{ padding: "10px 12px", color: "#6b7280" }}>{t.employeeProfile?.designation?.title ?? "—"}</td>
                  <td style={{ padding: "10px 12px", color: "#6b7280" }}>{t.employeeProfile?.reportingManager?.name ?? "—"}</td>
                  <td style={{ padding: "10px 12px" }}>{t.period?.name ?? `Period #${t.periodId}`}</td>
                  <td style={{ padding: "10px 12px", color: "#6b7280" }}>{templateName(t.templateId)}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontSize: 12, background: "#dcfce7", color: "#15803d", borderRadius: 4, padding: "2px 8px" }}>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
