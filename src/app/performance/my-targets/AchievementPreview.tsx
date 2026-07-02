"use client";

/**
 * Phase W9 — read-only Enterprise KRA achievement PREVIEW sections.
 *
 * Employee: "My KRA Achievement Preview" (self-scoped). Manager: additional read-only "Team KRA
 * Preview". No edit/convert buttons, no raw JSON, no raw employee IDs, no raw Daily Activity point
 * logs (the employee endpoint already redacts point counts). Fetches the W9 preview APIs.
 */
import { useCallback, useEffect, useState } from "react";

type KpiPreview = {
  metricCode: string;
  metricName: string;
  category: string;
  source: string;
  unit: string;
  targetValue: number;
  actualValue: number | null;
  achievementPercent: number | null;
  weight: number;
  weightedPreviewScore: number | null;
  frequency: string;
  status: string;
  sourceStatus: string;
  needsReview: boolean;
  notes: string;
  exclusionSummary?: string;
};
type TargetPreview = {
  targetId: number;
  period: string;
  templateName: string;
  status: string;
  rangeLabel: string;
  kpis: KpiPreview[];
  weightedPreviewTotal: number | null;
};
type EmployeePreview = {
  employeeProfileId: number;
  employeeName: string;
  designation: string;
  targets: TargetPreview[];
};

type ConversionRowResult = {
  targetId: number;
  metricCode: string;
  metricName: string;
  source: string;
  sourceReference: string;
  outcome: "CREATED" | "REPLACED" | "SKIPPED";
  reason?: string;
  achievementId?: number;
};
type ConversionSummary = {
  employeeProfileId: number;
  periodStart: string | null;
  periodEnd: string | null;
  mode: string;
  created: number;
  replaced: number;
  skipped: number;
  unsupported: number;
  needsReview: number;
  rows: ConversionRowResult[];
};

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  NOT_STARTED: { bg: "#f3f4f6", fg: "#6b7280" },
  BELOW_TARGET: { bg: "#fee2e2", fg: "#dc2626" },
  ON_TRACK: { bg: "#e0f2fe", fg: "#0369a1" },
  ACHIEVED: { bg: "#dcfce7", fg: "#15803d" },
  EXCEEDED: { bg: "#dcfce7", fg: "#166534" },
  NOT_IMPLEMENTED: { bg: "#f3f4f6", fg: "#9ca3af" },
  NEEDS_REVIEW: { bg: "#fef3c7", fg: "#b45309" },
};
const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Not started",
  BELOW_TARGET: "Below target",
  ON_TRACK: "On track",
  ACHIEVED: "Achieved",
  EXCEEDED: "Exceeded",
  NOT_IMPLEMENTED: "Not available yet",
  NEEDS_REVIEW: "Needs review",
};

/** Display-only ₹ formatting for AMOUNT-unit KPIs (Opportunity Value / Pipeline Value etc.) — never
 *  used for persistence, just makes large rupee actuals/targets readable in the preview table. */
function formatKpiValue(value: number | null, unit: string): string {
  if (value == null) return "—";
  if ((unit || "").toUpperCase() === "AMOUNT") {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
  }
  return String(value);
}

function StatusChip({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.NOT_STARTED;
  return (
    <span style={{ fontSize: 12, fontWeight: 600, background: c.bg, color: c.fg, borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap" }}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, marginBottom: 16 };

function PreviewKpiTable({ kpis, showActual }: { kpis: KpiPreview[]; showActual: boolean }) {
  if (kpis.length === 0) return <div style={{ color: "#9ca3af", fontSize: 13, padding: "6px 2px" }}>No KPI targets to preview.</div>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
            <th style={{ padding: "8px 10px", fontWeight: 600 }}>KPI</th>
            <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right" }}>Target</th>
            <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right" }}>{showActual ? "Actual" : "Progress"}</th>
            <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right" }}>Achievement %</th>
            <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right" }}>Weight</th>
            <th style={{ padding: "8px 10px", fontWeight: 600 }}>Status</th>
            <th style={{ padding: "8px 10px", fontWeight: 600 }}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {kpis.map((k, i) => (
            <tr key={`${k.metricCode}-${i}`} style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "8px 10px", fontWeight: 500 }}>
                {k.metricName}
                <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400 }}> · {k.source}{k.unit ? ` · ${k.unit}` : ""}</span>
              </td>
              <td style={{ padding: "8px 10px", textAlign: "right" }}>{formatKpiValue(k.targetValue, k.unit)}</td>
              <td style={{ padding: "8px 10px", textAlign: "right" }}>
                {k.sourceStatus === "NOT_IMPLEMENTED"
                  ? "—"
                  : showActual
                  ? formatKpiValue(k.actualValue, k.unit)
                  : (k.achievementPercent != null ? `${k.achievementPercent}%` : "—")}
              </td>
              <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>
                {k.achievementPercent != null ? `${k.achievementPercent}%` : "—"}
              </td>
              <td style={{ padding: "8px 10px", textAlign: "right" }}>{k.weight}</td>
              <td style={{ padding: "8px 10px" }}><StatusChip status={k.status} /></td>
              <td style={{ padding: "8px 10px", color: "#6b7280", fontSize: 12 }}>
                {k.exclusionSummary || k.notes || (k.needsReview ? "Needs review" : "")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const OUTCOME_COLORS: Record<string, { bg: string; fg: string }> = {
  CREATED: { bg: "#dcfce7", fg: "#15803d" },
  REPLACED: { bg: "#e0f2fe", fg: "#0369a1" },
  SKIPPED: { bg: "#f3f4f6", fg: "#6b7280" },
};

/** Manager-only conversion result summary — shows created/replaced/skipped counts + per-row reasons. */
function ConversionResultPanel({ summary, onClose }: { summary: ConversionSummary; onClose: () => void }) {
  return (
    <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 13 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <strong>Conversion result</strong>
        <span style={{ color: "#6b7280" }}>{summary.periodStart} → {summary.periodEnd} · mode: {summary.mode}</span>
        <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 12 }}>Dismiss</button>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
        <span>Created: <strong>{summary.created}</strong></span>
        <span>Replaced: <strong>{summary.replaced}</strong></span>
        <span>Skipped: <strong>{summary.skipped}</strong></span>
        <span>Unsupported: <strong>{summary.unsupported}</strong></span>
        <span>Needs review: <strong>{summary.needsReview}</strong></span>
      </div>
      {summary.rows.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#6b7280" }}>
              <th style={{ padding: "4px 6px" }}>KPI</th>
              <th style={{ padding: "4px 6px" }}>Outcome</th>
              <th style={{ padding: "4px 6px" }}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((r, i) => {
              const c = OUTCOME_COLORS[r.outcome] ?? OUTCOME_COLORS.SKIPPED;
              return (
                <tr key={`${r.metricCode}-${i}`} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "4px 6px" }}>{r.metricName}</td>
                  <td style={{ padding: "4px 6px" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, background: c.bg, color: c.fg, borderRadius: 4, padding: "1px 6px" }}>{r.outcome}</span>
                  </td>
                  <td style={{ padding: "4px 6px", color: "#6b7280" }}>{r.reason ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** Manager/admin-only explicit conversion action — confirmation + mode + remarks. Never shown to employees. */
function ConvertModal({
  employeeProfileId, employeeName, month, onClose, onDone,
}: {
  employeeProfileId: number;
  employeeName: string;
  month: string;
  onClose: () => void;
  onDone: (summary: ConversionSummary) => void;
}) {
  const [mode, setMode] = useState<"CREATE_ONLY" | "REPLACE_EXISTING">("CREATE_ONLY");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/performance/achievement-preview/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeProfileId, ...(month ? { month } : {}), mode, remarks }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const summary: ConversionSummary = await res.json();
      onDone(summary);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 20, width: 420, maxWidth: "92vw" }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600 }}>Convert to KRA Achievement</h3>
        <p style={{ margin: "0 0 14px", color: "#6b7280", fontSize: 13 }}>
          This writes real <strong>KRAAchievement</strong> rows for <strong>{employeeName}</strong>'s
          supported KPI previews only. Unsupported / config-required / needs-review rows are skipped.
        </p>

        <label style={{ display: "block", fontSize: 12, color: "#374151", marginBottom: 4 }}>Mode</label>
        <select value={mode} onChange={(e) => setMode(e.target.value as "CREATE_ONLY" | "REPLACE_EXISTING")}
          style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: 13, marginBottom: 12 }}>
          <option value="CREATE_ONLY">Create only (skip already-converted rows)</option>
          <option value="REPLACE_EXISTING">Replace existing (update matching rows)</option>
        </select>

        <label style={{ display: "block", fontSize: 12, color: "#374151", marginBottom: 4 }}>Manager remarks (optional)</label>
        <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3}
          placeholder="Approval note for the audit log…"
          style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: 13, resize: "vertical", marginBottom: 12 }} />

        {error && <div style={{ color: "#dc2626", fontSize: 12, marginBottom: 10 }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={submitting}
            style={{ background: "#fff", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 14px", fontSize: 13, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={submit} disabled={submitting}
            style={{ background: "#CC2229", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 13, cursor: "pointer", opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "Converting…" : "Convert / Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TargetPreviewBlock({ t, showActual }: { t: TargetPreview; showActual: boolean }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6, fontSize: 13 }}>
        <strong>{t.rangeLabel || t.period}</strong>
        <span style={{ color: "#6b7280" }}>{t.templateName ? `Template: ${t.templateName}` : "Custom"}</span>
        {t.weightedPreviewTotal != null && (
          <span style={{ marginLeft: "auto", color: "#374151" }}>Weighted preview: <strong>{t.weightedPreviewTotal}</strong></span>
        )}
      </div>
      <PreviewKpiTable kpis={t.kpis} showActual={showActual} />
    </div>
  );
}

export default function AchievementPreview({ isManager }: { isManager: boolean }) {
  const [mine, setMine] = useState<EmployeePreview | null>(null);
  const [team, setTeam] = useState<EmployeePreview[]>([]);
  const [month, setMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(isManager);
  const [error, setError] = useState("");
  const [convertTarget, setConvertTarget] = useState<{ employeeProfileId: number; employeeName: string } | null>(null);
  const [conversionResults, setConversionResults] = useState<Record<number, ConversionSummary>>({});

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const qs = month ? `?month=${month}` : "";
    fetch(`/api/performance/my-achievement-preview${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Failed (${r.status})`))))
      .then((d) => setMine({ employeeProfileId: 0, employeeName: d.employee?.employeeName ?? "", designation: d.employee?.designation ?? "", targets: d.targets ?? [] }))
      .catch((e) => setError(e.message ?? "Failed to load preview"))
      .finally(() => setLoading(false));

    if (isManager) {
      setTeamLoading(true);
      fetch(`/api/admin/performance/achievement-preview${qs}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Failed (${r.status})`))))
        .then((d) => setTeam(Array.isArray(d.employees) ? d.employees : []))
        .catch(() => setTeam([]))
        .finally(() => setTeamLoading(false));
    }
  }, [month, isManager]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>My KRA Achievement Preview</h2>
        <label style={{ fontSize: 12, color: "#6b7280", marginLeft: "auto" }}>
          Month&nbsp;
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            style={{ padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }} />
          {month && <button onClick={() => setMonth("")} style={{ marginLeft: 6, background: "#fff", border: "1px solid #d1d5db", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 12 }}>Full period</button>}
        </label>
      </div>
      <p style={{ margin: "0 0 14px", color: "#6b7280", fontSize: 13 }}>
        Live progress against your assigned targets. This is a <strong>preview only</strong> — nothing is saved or finalised.
      </p>

      <div style={card}>
        {loading ? (
          <div style={{ color: "#9ca3af", fontSize: 14, padding: 12 }}>Loading preview…</div>
        ) : error ? (
          <div style={{ color: "#dc2626", fontSize: 14, padding: 12 }}>{error}</div>
        ) : !mine || mine.targets.length === 0 ? (
          <div style={{ color: "#9ca3af", fontSize: 14, padding: 12 }}>No assigned targets to preview yet.</div>
        ) : (
          mine.targets.map((t, i) => <TargetPreviewBlock key={i} t={t} showActual={false} />)
        )}
      </div>

      {isManager && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>Team KRA Preview</h2>
          <p style={{ margin: "0 0 14px", color: "#6b7280", fontSize: 13 }}>
            Read-only achievement preview for your direct reports. Converting to a real KRA Achievement
            is an explicit, manager-approved action — nothing converts automatically.
          </p>
          {teamLoading ? (
            <div style={{ ...card, color: "#9ca3af", fontSize: 14 }}>Loading team preview…</div>
          ) : team.length === 0 ? (
            <div style={{ ...card, color: "#9ca3af", fontSize: 14 }}>No direct reports with previewable targets.</div>
          ) : (
            team.map((emp) => (
              <div key={emp.employeeProfileId} style={card}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    <strong style={{ color: "#111827", fontSize: 15 }}>{emp.employeeName}</strong>
                    {emp.designation ? <> · {emp.designation}</> : null}
                  </div>
                  {emp.targets.length > 0 && (
                    <button
                      onClick={() => setConvertTarget({ employeeProfileId: emp.employeeProfileId, employeeName: emp.employeeName })}
                      style={{ marginLeft: "auto", background: "#CC2229", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      Convert to KRA Achievement
                    </button>
                  )}
                </div>
                {conversionResults[emp.employeeProfileId] && (
                  <ConversionResultPanel
                    summary={conversionResults[emp.employeeProfileId]}
                    onClose={() => setConversionResults((p) => { const n = { ...p }; delete n[emp.employeeProfileId]; return n; })}
                  />
                )}
                {emp.targets.map((t, i) => <TargetPreviewBlock key={i} t={t} showActual={true} />)}
              </div>
            ))
          )}
        </div>
      )}

      {convertTarget && (
        <ConvertModal
          employeeProfileId={convertTarget.employeeProfileId}
          employeeName={convertTarget.employeeName}
          month={month}
          onClose={() => setConvertTarget(null)}
          onDone={(summary) => {
            setConversionResults((p) => ({ ...p, [summary.employeeProfileId]: summary }));
            load();
            // Phase W11.2 — let the (separately-mounted) MyReviews section know a conversion just
            // happened, so its "Team Reviews" candidates list can refresh without a manual page
            // reload. Plain window event — no shared state/context needed for one signal.
            window.dispatchEvent(new CustomEvent("enterprise-kra-converted", { detail: { employeeProfileId: summary.employeeProfileId } }));
          }}
        />
      )}
    </div>
  );
}
