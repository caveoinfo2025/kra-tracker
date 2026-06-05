"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

interface AuditEntry {
  id: number; masterId: number; masterType: string; action: string;
  oldValue: string | null; newValue: string | null; performedBy: number; createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  CREATED:          "#1F9D55",
  UPDATED:          "#0066FF",
  STATUS_CHANGED:   "#FF6B00",
  OVERRIDE_ADDED:   "#9B59B6",
  OVERRIDE_UPDATED: "#9B59B6",
  VALUE_IMPORTED:   "#1F9D55",
  POLICY_UPDATED:   "#C8102E",
};

export default function MasterAudit() {
  const [rows, setRows]       = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/masters?type=audit");
      if (res.ok) {
        const j = await res.json() as { audit?: AuditEntry[] };
        setRows(j.audit ?? []);
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const visible = filter
    ? rows.filter(r =>
        r.masterType.includes(filter.toUpperCase()) ||
        r.action.includes(filter.toUpperCase()) ||
        String(r.masterId).includes(filter),
      )
    : rows;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>Audit Log</span>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter by type, action or ID…"
            style={{ padding: "7px 12px", fontSize: 12, borderRadius: 7, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", width: 240 }}
          />
          <button onClick={load} style={btnStyle("#888")}><RefreshCw size={13} /> Refresh</button>
        </div>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
              {["Time", "Type", "ID", "Action", "Old Value", "New Value", "By"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "var(--muted-foreground)", fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "var(--muted-foreground)" }}>No audit entries.</td></tr>
            ) : visible.map(r => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ ...cellStyle, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
                  {new Date(r.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                </td>
                <td style={cellStyle}>{r.masterType}</td>
                <td style={cellStyle}>{r.masterId}</td>
                <td style={cellStyle}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                    background: `${ACTION_COLORS[r.action] ?? "#888"}20`,
                    color:       ACTION_COLORS[r.action] ?? "#888",
                  }}>{r.action}</span>
                </td>
                <td style={{ ...cellStyle, color: "var(--muted-foreground)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.oldValue ?? "—"}
                </td>
                <td style={{ ...cellStyle, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.newValue ?? "—"}
                </td>
                <td style={{ ...cellStyle, color: "var(--muted-foreground)" }}>{r.performedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const btnStyle = (color: string): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: 5,
  padding: "7px 13px", fontSize: 12, fontWeight: 600,
  borderRadius: 7, border: `1px solid ${color}`,
  color: color, background: "transparent", cursor: "pointer",
});
const cellStyle: React.CSSProperties = { padding: "10px 16px" };
