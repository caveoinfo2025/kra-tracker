"use client";

import { useState, useEffect } from "react";

type AuditEntry = {
  id: number; actorType: string; actorId: string | null;
  action: string; resourceType: string; resourceId: string | null;
  detail: string | null; createdAt: string;
};

const ACTION_COLORS: Record<string, string> = {
  EVENT_CREATED:    "#6366f1",
  RULE_CREATED:     "#0ea5e9",
  RULE_UPDATED:     "#0ea5e9",
  TEMPLATE_CREATED: "#22c55e",
  TEMPLATE_UPDATED: "#22c55e",
  CHANNEL_UPDATED:  "#f59e0b",
  NOTIFICATION_SENT:"#15803d",
  NOTIFICATION_FAILED: "#dc2626",
  TRIGGER_RECEIVED: "#8b5cf6",
};

export default function CommunicationAuditView() {
  const [entries, setEntries]       = useState<AuditEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [actionFilter, setActionFilter]     = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (resourceFilter) params.set("resourceType", resourceFilter);
    if (actionFilter)   params.set("action", actionFilter);
    fetch(`/api/admin/communication/audit?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setEntries(d as AuditEntry[]);
      })
      .catch(() => setError("Failed to load audit log"))
      .finally(() => setLoading(false));
  }, [resourceFilter, actionFilter]);

  const resourceTypes = [...new Set(entries.map((e) => e.resourceType))];
  const actions       = [...new Set(entries.map((e) => e.action))];

  function formatDate(d: string) {
    return new Date(d).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "medium" });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
          Communication Audit Log
          {!loading && <span style={{ fontSize: 13, fontWeight: 400, color: "#9ca3af", marginLeft: 8 }}>({entries.length})</span>}
        </h2>
        <button onClick={() => { setResourceFilter(""); setActionFilter(""); }}
          style={{ fontSize: 13, padding: "6px 14px", border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", cursor: "pointer" }}>
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <select value={resourceFilter} onChange={(e) => setResourceFilter(e.target.value)}
          style={{ padding: "7px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}>
          <option value="">All resources</option>
          {resourceTypes.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
          style={{ padding: "7px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}>
          <option value="">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 60, fontSize: 14 }}>Loading audit log…</div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 60, fontSize: 14 }}>No audit entries found.</div>
      ) : (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#374151" }}>When</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Action</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Resource</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Actor</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => {
                const color = ACTION_COLORS[entry.action] ?? "#6b7280";
                return (
                  <tr key={entry.id}
                    style={{ borderBottom: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "10px 14px", color: "#6b7280", whiteSpace: "nowrap", fontSize: 12 }}>
                      {formatDate(entry.createdAt)}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, background: color + "20", color, borderRadius: 4, padding: "2px 7px", whiteSpace: "nowrap" }}>
                        {entry.action}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontWeight: 500, color: "#374151" }}>{entry.resourceType}</div>
                      {entry.resourceId && (
                        <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>#{entry.resourceId}</div>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#374151" }}>
                      <div>{entry.actorType}</div>
                      {entry.actorId && <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>#{entry.actorId}</div>}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#6b7280", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.detail ?? "—"}
                    </td>
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
