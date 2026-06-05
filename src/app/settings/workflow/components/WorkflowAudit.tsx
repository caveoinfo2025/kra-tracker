"use client";

import { useState, useEffect } from "react";
import { WorkflowAuditEntry } from "@/lib/workflow-engine";

interface Props {
  entityType?: "WORKFLOW_DEFINITION" | "APPROVAL_REQUEST";
  entityId?:   number;
}

const ACTION_COLOURS: Record<string, string> = {
  CREATED:            "#3b82f6",
  APPROVED:           "#22c55e",
  REJECTED:           "#ef4444",
  RETURNED:           "#f59e0b",
  ESCALATED:          "#f97316",
  DELEGATED:          "#8b5cf6",
  CANCELLED:          "#6b7280",
  COMPLETED:          "#10b981",
  STEP_ADVANCED:      "#6366f1",
  DEFINITION_UPDATED: "#0ea5e9",
};

export default function WorkflowAudit({ entityType, entityId }: Props) {
  const [entries, setEntries] = useState<WorkflowAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("ALL");

  useEffect(() => {
    setLoading(true);
    let url = "/api/workflows/audit?";
    if (entityType) url += `entityType=${entityType}&`;
    if (entityId)   url += `entityId=${entityId}&`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [entityType, entityId]);

  const filtered = entries.filter((e) => {
    const matchSearch = !search || (e.actorName ?? "").toLowerCase().includes(search.toLowerCase()) || e.action.includes(search.toUpperCase());
    const matchFilter = filter === "ALL" || e.action === filter;
    return matchSearch && matchFilter;
  });

  const actions = Array.from(new Set(entries.map((e) => e.action)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          className="input"
          placeholder="Search actor or actionâ€¦"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 180 }}>
          <option value="ALL">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ color: "var(--fg-4)", padding: 32, textAlign: "center" }}>Loadingâ€¦</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "var(--fg-4)", padding: 32, textAlign: "center" }}>No audit entries found.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Entity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: "nowrap", color: "var(--fg-4)", fontSize: 13 }}>
                    {new Date(e.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td>
                    <span style={{
                      background: `${ACTION_COLOURS[e.action] ?? "#6b7280"}18`,
                      color:       ACTION_COLOURS[e.action]  ?? "#6b7280",
                      borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
                    }}>
                      {e.action}
                    </span>
                  </td>
                  <td style={{ fontSize: 13 }}>{e.actorName ?? `#${e.actorId}`}</td>
                  <td style={{ fontSize: 13, color: "var(--fg-4)" }}>
                    {e.entityType === "APPROVAL_REQUEST" ? `Request #${e.entityId}` : `Workflow #${e.entityId}`}
                  </td>
                  <td style={{ fontSize: 12, color: "var(--fg-4)", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.details ?? "â€”"}
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

