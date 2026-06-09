"use client";

import { useState, useEffect } from "react";

type AuditEntry = {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  performedBy: number;
  createdAt: string;
  oldValue: string;
  newValue: string;
};

const ENTITY_TYPES = [
  { value: "", label: "All entities" },
  { value: "performance_review", label: "Reviews" },
  { value: "employee_target", label: "Employee Targets" },
  { value: "team_target", label: "Team Targets" },
  { value: "kra_template", label: "KRA Templates" },
  { value: "performance_period", label: "Periods" },
];

export default function PerformanceAudit() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState("");

  useEffect(() => {
    const url = entityType
      ? `/api/admin/performance/reviews?auditEntityType=${entityType}`
      : "/api/admin/performance/reviews?audit=1";
    // Direct audit fetch
    fetch(
      entityType
        ? `/api/audit?entityType=${entityType}&module=performance`
        : "/api/audit?module=performance",
    )
      .then((r) => r.json())
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [entityType]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Performance Audit Log</h2>
        <select
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setLoading(true); }}
          style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
        >
          {ENTITY_TYPES.map((et) => (
            <option key={et.value} value={et.value}>{et.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 40 }}>Loading…</div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 40, fontSize: 14 }}>
          No audit entries found.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Time</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Entity</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Action</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>By</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "8px 12px", color: "#6b7280" }}>
                    {new Date(e.createdAt).toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    {e.entityType} #{e.entityId}
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      background: e.action === "CREATE" ? "#dcfce7" : e.action === "DELETE" ? "#fee2e2" : "#e0f2fe",
                      color: e.action === "CREATE" ? "#15803d" : e.action === "DELETE" ? "#dc2626" : "#0369a1",
                      borderRadius: 4, padding: "2px 8px",
                    }}>
                      {e.action}
                    </span>
                  </td>
                  <td style={{ padding: "8px 12px", color: "#6b7280" }}>#{e.performedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
