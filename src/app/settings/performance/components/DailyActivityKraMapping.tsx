"use client";

/**
 * Phase W8 / W8.1 — Daily Activity → Enterprise KRA mapping admin UI (CONFIG ONLY, form-based).
 *
 * Business users configure mappings entirely through form controls (dropdowns, checkboxes,
 * toggles, number fields) — there is NO raw JSON anywhere. The component works with the parsed
 * `config` object the API returns; the API/engine convert it to/from `KRAMetric.formulaJson`.
 *
 * No convert-to-achievement action and no monthly write workflow — those are a later phase.
 */
import { useState } from "react";

type MetricConfig = {
  metricType: "COVERAGE" | "PRODUCTIVITY" | "COMPLIANCE";
  period: "MONTHLY" | "WEEKLY";
  eligibleStatuses: string[];
  excludedStatuses: string[];
  pointsVisibility: "MANAGER_ONLY" | "EMPLOYEE_BAND_ONLY";
  requiresManagerApprovalForConversion: boolean;
  minimumCoveragePercent: number | null;
  minimumProductiveDays: number | null;
  minimumEligiblePoints: number | null;
  workingDayBasis: string;
};
type Metric = {
  id: number;
  name: string;
  code: string;
  description: string;
  calculationSource: string;
  status: string;
  config: MetricConfig;
};

type Props = { metrics: unknown[] };

const DEFAULT_CODES = ["DAILY_ACTIVITY_COVERAGE", "DAILY_ACTIVITY_PRODUCTIVITY", "DAILY_ACTIVITY_COMPLIANCE"];

const METRIC_TYPE_LABELS: Record<MetricConfig["metricType"], string> = {
  COVERAGE: "Coverage",
  PRODUCTIVITY: "Productivity",
  COMPLIANCE: "Compliance / Exceptions",
};
const ELIGIBLE_STATUS_OPTIONS = [
  { value: "CLOSED", label: "Closed" },
  { value: "LATE_SUBMITTED", label: "Late Submitted" },
];
const EXCLUDED_STATUS_OPTIONS = [
  { value: "NO_ACTIVITY", label: "No Activity" },
  { value: "SUMMARY_PENDING", label: "Summary Pending" },
  { value: "INCOMPLETE", label: "Incomplete" },
  { value: "REOPENED", label: "Reopened" },
  { value: "PENDING_CORRECTION", label: "Pending Correction" },
];
const WORKING_DAY_BASIS_OPTIONS = [
  { value: "CALENDAR_DAYS_EXCLUDING_WEEKENDS_PENDING_DECISION", label: "Working days (excl. weekends)" },
  { value: "ALL_CALENDAR_DAYS", label: "All calendar days" },
];

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 };

export default function DailyActivityKraMapping({ metrics }: Props) {
  const typed = metrics as Metric[];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [draft, setDraft] = useState<MetricConfig | null>(null);

  async function createDefaults() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/performance/daily-activity-mapping", { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to create default mappings");
      } else window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  async function save(id: number, patch: { status?: string; config?: MetricConfig }) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/performance/daily-activity-mapping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to save");
      } else window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  function startEdit(m: Metric) {
    setEditId(editId === m.id ? null : m.id);
    setDraft({ ...m.config });
  }
  function setDraftField<K extends keyof MetricConfig>(k: K, v: MetricConfig[K]) {
    setDraft((d) => (d ? { ...d, [k]: v } : d));
  }
  function toggleInList(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
  }

  const missingDefaults = DEFAULT_CODES.filter((c) => !typed.some((m) => m.code === c));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Daily Activity → KRA Mapping</h2>
        <button onClick={createDefaults} disabled={busy}
          style={{ background: "var(--caveo-red)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: busy ? "default" : "pointer", fontSize: 14, opacity: busy ? 0.6 : 1 }}>
          {missingDefaults.length ? "Create Default Daily Activity KRA Mapping" : "Re-sync Default Mapping"}
        </button>
      </div>

      <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", color: "#92400e", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
        ⚠ This mapping config does not write achievements. KRAAchievement conversion will be added in
        a later phase. These settings define how Daily Activity will <em>eventually</em> feed Enterprise
        KRA; nothing is scored or written here.
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 12 }}>{error}</div>
      )}

      {typed.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", border: "1px dashed #e5e7eb", borderRadius: 8 }}>
          No Daily Activity KRA metrics yet. Click <strong>Create Default Daily Activity KRA Mapping</strong> to set up the three recommended metrics.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {typed.map((m) => (
            <div key={m.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{m.name}</div>
                  <code style={{ fontSize: 12, color: "#6b7280" }}>{m.code}</code>
                  <span style={{ marginLeft: 8, fontSize: 11, padding: "1px 8px", borderRadius: 999, background: m.status === "active" ? "#dcfce7" : "#f3f4f6", color: m.status === "active" ? "#166534" : "#6b7280" }}>
                    {m.status === "active" ? "Active" : "Inactive"}
                  </span>
                  <span style={{ marginLeft: 6, fontSize: 11, padding: "1px 8px", borderRadius: 999, background: "#eef2ff", color: "#4338ca" }}>
                    {METRIC_TYPE_LABELS[m.config.metricType]}
                  </span>
                  <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: 13 }}>{m.description}</p>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => save(m.id, { status: m.status === "active" ? "inactive" : "active" })} disabled={busy}
                    style={{ background: "none", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>
                    {m.status === "active" ? "Disable" : "Enable"}
                  </button>
                  <button onClick={() => startEdit(m)} disabled={busy}
                    style={{ background: "none", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>
                    {editId === m.id ? "Cancel" : "Edit settings"}
                  </button>
                </div>
              </div>

              {editId === m.id && draft && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f3f4f6", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Metric type</label>
                    <select value={draft.metricType} onChange={(e) => setDraftField("metricType", e.target.value as MetricConfig["metricType"])} style={inputStyle}>
                      <option value="COVERAGE">Coverage</option>
                      <option value="PRODUCTIVITY">Productivity</option>
                      <option value="COMPLIANCE">Compliance / Exceptions</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Period</label>
                    <select value={draft.period} onChange={(e) => setDraftField("period", e.target.value as MetricConfig["period"])} style={inputStyle}>
                      <option value="MONTHLY">Monthly</option>
                      <option value="WEEKLY">Weekly (coming later)</option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Eligible statuses (count toward KRA)</label>
                    {ELIGIBLE_STATUS_OPTIONS.map((o) => (
                      <label key={o.value} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginBottom: 4 }}>
                        <input type="checkbox" checked={draft.eligibleStatuses.includes(o.value)} onChange={() => setDraftField("eligibleStatuses", toggleInList(draft.eligibleStatuses, o.value))} />
                        {o.label}
                      </label>
                    ))}
                  </div>
                  <div>
                    <label style={labelStyle}>Excluded statuses (do not count)</label>
                    {EXCLUDED_STATUS_OPTIONS.map((o) => (
                      <label key={o.value} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginBottom: 4 }}>
                        <input type="checkbox" checked={draft.excludedStatuses.includes(o.value)} onChange={() => setDraftField("excludedStatuses", toggleInList(draft.excludedStatuses, o.value))} />
                        {o.label}
                      </label>
                    ))}
                  </div>

                  <div>
                    <label style={labelStyle}>Manager approval required for conversion</label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                      <input type="checkbox" checked={draft.requiresManagerApprovalForConversion} onChange={(e) => setDraftField("requiresManagerApprovalForConversion", e.target.checked)} />
                      {draft.requiresManagerApprovalForConversion ? "Yes — manager must approve" : "No"}
                    </label>
                  </div>
                  <div>
                    <label style={labelStyle}>Points visibility</label>
                    <select value={draft.pointsVisibility} onChange={(e) => setDraftField("pointsVisibility", e.target.value as MetricConfig["pointsVisibility"])} style={inputStyle}>
                      <option value="MANAGER_ONLY">Manager only</option>
                      <option value="EMPLOYEE_BAND_ONLY">Employee band/status only</option>
                    </select>
                  </div>

                  <div style={{ gridColumn: "1 / -1", borderTop: "1px dashed #e5e7eb", paddingTop: 12, fontSize: 12, fontWeight: 600, color: "#6b7280" }}>
                    Target settings
                  </div>
                  <div>
                    <label style={labelStyle}>Minimum coverage %</label>
                    <input type="number" value={draft.minimumCoveragePercent ?? ""} placeholder="e.g. 90"
                      onChange={(e) => setDraftField("minimumCoveragePercent", e.target.value === "" ? null : Number(e.target.value))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Minimum productive days</label>
                    <input type="number" value={draft.minimumProductiveDays ?? ""} placeholder="optional"
                      onChange={(e) => setDraftField("minimumProductiveDays", e.target.value === "" ? null : Number(e.target.value))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Minimum eligible points</label>
                    <input type="number" value={draft.minimumEligiblePoints ?? ""} placeholder="optional"
                      onChange={(e) => setDraftField("minimumEligiblePoints", e.target.value === "" ? null : Number(e.target.value))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Working-day basis</label>
                    <select value={draft.workingDayBasis} onChange={(e) => setDraftField("workingDayBasis", e.target.value)} style={inputStyle}>
                      {WORKING_DAY_BASIS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <button onClick={() => save(m.id, { config: draft })} disabled={busy}
                      style={{ background: "var(--caveo-red)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: 14 }}>
                      Save settings
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
