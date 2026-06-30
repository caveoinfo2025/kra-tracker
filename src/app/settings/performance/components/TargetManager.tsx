"use client";

/**
 * Employee Targets — Phase W8.1 + W8.2.
 *
 * W8.1: assign a target to an employee BY NAME (no raw profile IDs). Role templates are offered
 *       only as a starting point; each employee's target row is individual.
 * W8.2: per-KPI target editing. Open a target → apply a role template as a starting point →
 *       edit each KPI's target value / weight / frequency / active flag → save. Two ISRs on the
 *       same template can carry DIFFERENT targets (Priya 35 leads, Sangeetha 45). The per-KPI
 *       rows are stored internally in EmployeeTarget.targetJson — this UI never shows that JSON
 *       and never asks for a raw employee ID.
 */
import React, { useState } from "react";

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

type KpiRow = {
  metricCode: string;
  metricName: string;
  category: string;
  source: string;
  unit: string;
  targetValue: number;
  weight: number;
  frequency: string;
  isActive: boolean;
  notes: string;
};

type TargetDetail = {
  id: number;
  employeeName: string;
  designation: string;
  department: string;
  reportingManager: string;
  periodName: string;
  templateId: number | null;
  templateName: string;
  status: string;
  rows: KpiRow[];
};

const FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"];
const SOURCES = [
  "DAILY_ACTIVITY",
  "CRM_LEADS",
  "CRM_MEETINGS",
  "CRM_PIPELINE",
  "CRM_OPPORTUNITY",
  "FINANCE_COLLECTION",
  "MANUAL",
];

type Props = { employeeTargets: unknown[]; periods: unknown[]; templates: unknown[]; employeeProfiles: unknown[] };

export default function TargetManager({ employeeTargets, periods, templates, employeeProfiles }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeProfileId: "", periodId: "", templateId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // W8.2 — KPI editor state (per-target).
  const [editId, setEditId] = useState<number | null>(null);
  const [detail, setDetail] = useState<TargetDetail | null>(null);
  const [rows, setRows] = useState<KpiRow[]>([]);
  const [applyTemplateId, setApplyTemplateId] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editorBusy, setEditorBusy] = useState(false);
  const [editorMsg, setEditorMsg] = useState("");
  const [editorErr, setEditorErr] = useState("");

  const typedTargets = employeeTargets as EmployeeTarget[];
  const typedPeriods = periods as Period[];
  const typedTemplates = templates as Template[];
  const typedProfiles = employeeProfiles as Profile[];

  const templateName = (id: number | null) => (id ? typedTemplates.find((t) => t.id === id)?.name ?? `Template #${id}` : "—");
  const selectedProfile = typedProfiles.find((p) => String(p.employeeProfileId) === form.employeeProfileId);

  const totalActiveWeight = rows.filter((r) => r.isActive).reduce((s, r) => s + (Number(r.weight) || 0), 0);
  const weightOff = rows.some((r) => r.isActive) && Math.abs(totalActiveWeight - 100) > 0.01;

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

  async function openEditor(t: EmployeeTarget) {
    if (editId === t.id) {
      setEditId(null);
      setDetail(null);
      setRows([]);
      return;
    }
    setEditId(t.id);
    setDetail(null);
    setRows([]);
    setEditorMsg("");
    setEditorErr("");
    setApplyTemplateId(t.templateId ? String(t.templateId) : "");
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/performance/employee-targets/${t.id}`);
      if (res.ok) {
        const d: TargetDetail = await res.json();
        setDetail(d);
        setRows(d.rows ?? []);
        if (d.templateId) setApplyTemplateId(String(d.templateId));
      } else {
        setEditorErr("Failed to load target details");
      }
    } finally {
      setLoadingDetail(false);
    }
  }

  async function applyTemplate() {
    if (!editId || !applyTemplateId) return;
    if (rows.length > 0 && !confirm("Apply template? This replaces the current KPI rows for this employee with the template's starting values (you can still edit before saving).")) return;
    setEditorBusy(true);
    setEditorErr("");
    setEditorMsg("");
    try {
      const res = await fetch("/api/admin/performance/employee-targets/apply-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: editId, templateId: Number(applyTemplateId) }),
      });
      const data = await res.json();
      if (res.ok) {
        setRows(data.rows ?? []);
        setEditorMsg(`Template applied — ${data.rows?.length ?? 0} KPI rows seeded. Edit values, then Save.`);
      } else {
        setEditorErr(data.error ?? "Failed to apply template");
      }
    } finally {
      setEditorBusy(false);
    }
  }

  function updateRow(i: number, patch: Partial<KpiRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function saveRows() {
    if (!editId) return;
    setEditorBusy(true);
    setEditorErr("");
    setEditorMsg("");
    try {
      const res = await fetch(`/api/admin/performance/employee-targets/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (res.ok) {
        const warn = data.validation?.warnings?.length ? ` (${data.validation.warnings.join(" ")})` : "";
        setEditorMsg(`Saved.${warn}`);
      } else {
        const v = data.validation?.errors?.length ? ` ${data.validation.errors.join("; ")}` : "";
        setEditorErr((data.error ?? "Failed to save") + v);
      }
    } finally {
      setEditorBusy(false);
    }
  }

  const inputStyle: React.CSSProperties = { width: "100%", padding: "4px 6px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 12 };

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
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#374151" }}>KPI Targets</th>
              </tr>
            </thead>
            <tbody>
              {typedTargets.map((t) => (
                <React.Fragment key={t.id}>
                  <tr style={{ borderBottom: editId === t.id ? "none" : "1px solid #f3f4f6" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 500 }}>{t.employeeProfile?.employee?.name ?? `Profile #${t.employeeProfileId}`}</td>
                    <td style={{ padding: "10px 12px", color: "#6b7280" }}>{t.employeeProfile?.designation?.title ?? "—"}</td>
                    <td style={{ padding: "10px 12px", color: "#6b7280" }}>{t.employeeProfile?.reportingManager?.name ?? "—"}</td>
                    <td style={{ padding: "10px 12px" }}>{t.period?.name ?? `Period #${t.periodId}`}</td>
                    <td style={{ padding: "10px 12px", color: "#6b7280" }}>{templateName(t.templateId)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 12, background: "#dcfce7", color: "#15803d", borderRadius: 4, padding: "2px 8px" }}>{t.status}</span>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      <button onClick={() => openEditor(t)}
                        style={{ background: editId === t.id ? "#374151" : "#fff", color: editId === t.id ? "#fff" : "var(--caveo-red)", border: "1px solid var(--caveo-red)", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>
                        {editId === t.id ? "Close" : "Edit KPIs"}
                      </button>
                    </td>
                  </tr>
                  {editId === t.id && (
                    <tr>
                      <td colSpan={7} style={{ padding: 0, borderBottom: "1px solid #f3f4f6" }}>
                        <div style={{ background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 8, margin: "0 8px 12px", padding: 16 }}>
                          {loadingDetail ? (
                            <div style={{ color: "#9ca3af", fontSize: 13, padding: 12 }}>Loading KPI targets…</div>
                          ) : (
                            <>
                              {detail && (
                                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
                                  Targets for <strong style={{ color: "#111827" }}>{detail.employeeName}</strong>
                                  {detail.designation ? ` — ${detail.designation}` : ""} · {detail.periodName}
                                  {detail.department ? ` · ${detail.department}` : ""}
                                  {detail.reportingManager ? ` · reports to ${detail.reportingManager}` : ""}
                                </div>
                              )}
                              <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                                <label style={{ fontSize: 12, fontWeight: 500 }}>
                                  Role template (starting point)
                                  <select value={applyTemplateId} onChange={(e) => setApplyTemplateId(e.target.value)}
                                    style={{ display: "block", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, minWidth: 200 }}>
                                    <option value="">Select template…</option>
                                    {typedTemplates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
                                  </select>
                                </label>
                                <button onClick={applyTemplate} disabled={!applyTemplateId || editorBusy}
                                  style={{ background: "#fff", color: "var(--caveo-red)", border: "1px solid var(--caveo-red)", borderRadius: 6, padding: "8px 16px", cursor: applyTemplateId ? "pointer" : "not-allowed", fontSize: 13 }}>
                                  Apply Template
                                </button>
                                <div style={{ marginLeft: "auto", fontSize: 12, color: weightOff ? "#b45309" : "#15803d", fontWeight: 500 }}>
                                  Total active weight: {totalActiveWeight.toFixed(1)}%{weightOff ? " ⚠ ideally 100%" : " ✓"}
                                </div>
                              </div>

                              {rows.length === 0 ? (
                                <div style={{ color: "#9ca3af", fontSize: 13, padding: "8px 4px" }}>
                                  No KPI targets yet. Pick a role template above and click <strong>Apply Template</strong> to seed the KPI rows, then customise the target values for this employee.
                                </div>
                              ) : (
                                <div style={{ overflowX: "auto" }}>
                                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                    <thead>
                                      <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
                                        <th style={{ padding: "6px 8px" }}>KPI</th>
                                        <th style={{ padding: "6px 8px" }}>Category</th>
                                        <th style={{ padding: "6px 8px" }}>Unit</th>
                                        <th style={{ padding: "6px 8px", textAlign: "right" }}>Target</th>
                                        <th style={{ padding: "6px 8px", textAlign: "right" }}>Weight %</th>
                                        <th style={{ padding: "6px 8px" }}>Frequency</th>
                                        <th style={{ padding: "6px 8px" }}>Source</th>
                                        <th style={{ padding: "6px 8px" }}>Notes</th>
                                        <th style={{ padding: "6px 8px", textAlign: "center" }}>Active</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rows.map((r, i) => (
                                        <tr key={r.metricCode || i} style={{ borderBottom: "1px solid #eee", opacity: r.isActive ? 1 : 0.5 }}>
                                          <td style={{ padding: "6px 8px", fontWeight: 500 }}>{r.metricName || r.metricCode}</td>
                                          <td style={{ padding: "6px 8px", color: "#6b7280" }}>{r.category}</td>
                                          <td style={{ padding: "6px 8px", color: "#6b7280" }}>{r.unit}</td>
                                          <td style={{ padding: "6px 8px", width: 90 }}>
                                            <input type="number" min={0} step="any" value={r.targetValue}
                                              onChange={(e) => updateRow(i, { targetValue: Number(e.target.value) })}
                                              style={{ ...inputStyle, textAlign: "right" }} />
                                          </td>
                                          <td style={{ padding: "6px 8px", width: 80 }}>
                                            <input type="number" min={0} max={100} step="any" value={r.weight}
                                              onChange={(e) => updateRow(i, { weight: Number(e.target.value) })}
                                              style={{ ...inputStyle, textAlign: "right" }} />
                                          </td>
                                          <td style={{ padding: "6px 8px", width: 120 }}>
                                            <select value={r.frequency} onChange={(e) => updateRow(i, { frequency: e.target.value })} style={inputStyle}>
                                              {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
                                            </select>
                                          </td>
                                          <td style={{ padding: "6px 8px", width: 150 }}>
                                            <select value={r.source} onChange={(e) => updateRow(i, { source: e.target.value })} style={inputStyle}>
                                              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                          </td>
                                          <td style={{ padding: "6px 8px", minWidth: 120 }}>
                                            <input type="text" value={r.notes} placeholder="Optional"
                                              onChange={(e) => updateRow(i, { notes: e.target.value })} style={inputStyle} />
                                          </td>
                                          <td style={{ padding: "6px 8px", textAlign: "center" }}>
                                            <input type="checkbox" checked={r.isActive} onChange={(e) => updateRow(i, { isActive: e.target.checked })} />
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {editorErr && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 10 }}>{editorErr}</div>}
                              {editorMsg && <div style={{ color: "#15803d", fontSize: 12, marginTop: 10 }}>{editorMsg}</div>}
                              {weightOff && rows.length > 0 && (
                                <div style={{ color: "#b45309", fontSize: 12, marginTop: 8 }}>
                                  Warning: total active KPI weight is {totalActiveWeight.toFixed(1)}% (ideally 100%). You can still save.
                                </div>
                              )}

                              {rows.length > 0 && (
                                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                                  <button onClick={saveRows} disabled={editorBusy}
                                    style={{ background: "var(--caveo-red)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: 13 }}>
                                    {editorBusy ? "Saving…" : "Save Targets"}
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
