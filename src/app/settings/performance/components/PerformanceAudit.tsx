"use client";

/**
 * Performance Audit tab — Phase W8.3 (read-only visibility).
 *
 * Reads enriched audit rows from GET /api/admin/performance/audit (the W8.3 read endpoint) and shows
 * a business table: Time · Action · Entity · Employee · Performed By · Summary. Friendly action labels
 * replace raw codes; no raw JSON is shown. Simple filters: Action, Entity, Employee, Date range.
 * Viewing is read-only — this tab performs no writes.
 */
import { useState, useEffect, useCallback } from "react";

type AuditRow = {
  id: number;
  action: string;
  actionLabel: string;
  entityType: string;
  entityLabel: string;
  entityId: number;
  employeeName: string;
  performedBy: number;
  performedByName: string;
  summary: string;
  createdAt: string;
};

type Profile = { employeeProfileId: number; name: string };

const ENTITY_OPTIONS = [
  { value: "", label: "All entities" },
  { value: "EmployeeTarget", label: "Employee Target" },
  { value: "KRAMetric", label: "KRA Metric" },
  { value: "performance_review", label: "Performance Review" },
  { value: "team_target", label: "Team Target" },
  { value: "kra_template", label: "KRA Template" },
  { value: "performance_period", label: "Performance Period" },
];

const ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "employee_target_template_applied", label: "Template Applied" },
  { value: "employee_target_updated", label: "Employee Target Updated" },
  { value: "DAILY_ACTIVITY_MAPPING_CREATE", label: "Daily Activity Mapping Created" },
  { value: "DAILY_ACTIVITY_MAPPING_UPDATE", label: "Daily Activity Mapping Updated" },
  { value: "DAILY_ACTIVITY_MAPPING_RECONCILE", label: "Daily Activity Mapping Reconciled" },
];

const selStyle: React.CSSProperties = { padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 };

function actionColor(action: string): { bg: string; fg: string } {
  if (action === "employee_target_template_applied") return { bg: "#dcfce7", fg: "#15803d" };
  if (action === "employee_target_updated") return { bg: "#e0f2fe", fg: "#0369a1" };
  if (action.startsWith("DAILY_ACTIVITY_MAPPING")) return { bg: "#fef3c7", fg: "#b45309" };
  if (action === "DELETE") return { bg: "#fee2e2", fg: "#dc2626" };
  return { bg: "#f3f4f6", fg: "#374151" };
}

export default function PerformanceAudit({ employeeProfiles = [] }: { employeeProfiles?: unknown[] }) {
  const profiles = employeeProfiles as Profile[];
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [employeeProfileId, setEmployeeProfileId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const qs = new URLSearchParams();
    if (entityType) qs.set("entityType", entityType);
    if (action) qs.set("action", action);
    if (employeeProfileId) qs.set("employeeProfileId", employeeProfileId);
    if (startDate) qs.set("startDate", startDate);
    if (endDate) qs.set("endDate", endDate);
    fetch(`/api/admin/performance/audit?${qs.toString()}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error ?? `Request failed (${r.status})`);
        }
        return r.json();
      })
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch((e) => { setRows([]); setError(e.message ?? "Failed to load audit"); })
      .finally(() => setLoading(false));
  }, [entityType, action, employeeProfileId, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Performance Audit Log</h2>
        <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 13 }}>
          Read-only history of Enterprise KRA actions (employee targets, Daily Activity mappings).
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: "#374151" }}>
          Action
          <select value={action} onChange={(e) => setAction(e.target.value)} style={{ ...selStyle, display: "block", marginTop: 4 }}>
            {ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12, color: "#374151" }}>
          Entity
          <select value={entityType} onChange={(e) => setEntityType(e.target.value)} style={{ ...selStyle, display: "block", marginTop: 4 }}>
            {ENTITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12, color: "#374151" }}>
          Employee
          <select value={employeeProfileId} onChange={(e) => setEmployeeProfileId(e.target.value)} style={{ ...selStyle, display: "block", marginTop: 4, minWidth: 160 }}>
            <option value="">All employees</option>
            {profiles.map((p) => <option key={p.employeeProfileId} value={p.employeeProfileId}>{p.name}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12, color: "#374151" }}>
          From
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ ...selStyle, display: "block", marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 12, color: "#374151" }}>
          To
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ ...selStyle, display: "block", marginTop: 4 }} />
        </label>
        {(action || entityType || employeeProfileId || startDate || endDate) && (
          <button
            onClick={() => { setAction(""); setEntityType(""); setEmployeeProfileId(""); setStartDate(""); setEndDate(""); }}
            style={{ background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, padding: "7px 14px", cursor: "pointer", fontSize: 13 }}>
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 40 }}>Loading…</div>
      ) : error ? (
        <div style={{ textAlign: "center", color: "#dc2626", padding: 40, fontSize: 14 }}>{error}</div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 40, fontSize: 14 }}>
          No audit entries found.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Time</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Action</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Entity</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Employee</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Performed By</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Summary</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const c = actionColor(r.action);
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "8px 12px", color: "#6b7280", whiteSpace: "nowrap" }}>
                      {new Date(r.createdAt).toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, background: c.bg, color: c.fg, borderRadius: 4, padding: "2px 8px" }}>
                        {r.actionLabel}
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px", color: "#374151" }}>
                      {r.entityLabel} <span style={{ color: "#9ca3af" }}>#{r.entityId}</span>
                    </td>
                    <td style={{ padding: "8px 12px" }}>{r.employeeName || "—"}</td>
                    <td style={{ padding: "8px 12px", color: "#6b7280" }}>{r.performedByName}</td>
                    <td style={{ padding: "8px 12px", color: "#374151" }}>{r.summary}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
