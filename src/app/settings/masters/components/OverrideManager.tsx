"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";

interface Override {
  id: number; masterValueId: number; scopeType: string; scopeId: number;
  customValue: string; isEnabled: boolean;
}

interface Props { canEdit: boolean; currentUserId: number }

export default function OverrideManager({ canEdit, currentUserId: _uid }: Props) {
  const [rows, setRows]         = useState<Override[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [valueId, setValueId]   = useState("");
  const [scope, setScope]       = useState<"COMPANY" | "BRANCH">("COMPANY");
  const [scopeId, setScopeId]   = useState("");
  const [custom, setCustom]     = useState("");
  const [enabled, setEnabled]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/masters/overrides");
      if (res.ok) {
        const json = await res.json() as { overrides?: Override[] };
        setRows(json.overrides ?? []);
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function handleCreate() {
    if (!valueId || !scopeId) { setError("Value ID and Scope ID are required."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/masters/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterValueId: Number(valueId), scopeType: scope, scopeId: Number(scopeId), customValue: custom, isEnabled: enabled }),
      });
      if (res.ok) {
        setValueId(""); setScopeId(""); setCustom(""); setShowForm(false);
        await load();
      } else {
        const j = await res.json() as { error?: string };
        setError(j.error ?? "Failed to create override.");
      }
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>Value Overrides</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} style={btnStyle("#888")}><RefreshCw size={13} /> Refresh</button>
          {canEdit && (
            <button onClick={() => setShowForm(!showForm)} style={btnStyle("var(--primary)")}><Plus size={13} /> Add Override</button>
          )}
        </div>
      </div>

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Master Value ID *</label>
              <input value={valueId} onChange={e => setValueId(e.target.value)} style={inputStyle} type="number" placeholder="Value ID" />
            </div>
            <div>
              <label style={labelStyle}>Scope Type *</label>
              <select value={scope} onChange={e => setScope(e.target.value as "COMPANY" | "BRANCH")} style={inputStyle}>
                <option value="COMPANY">Company</option>
                <option value="BRANCH">Branch</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Scope ID *</label>
              <input value={scopeId} onChange={e => setScopeId(e.target.value)} style={inputStyle} type="number" placeholder="Company / Branch ID" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, marginBottom: 12, alignItems: "end" }}>
            <div>
              <label style={labelStyle}>Custom Value</label>
              <input value={custom} onChange={e => setCustom(e.target.value)} style={inputStyle} placeholder="Override display name (optional)" />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, paddingBottom: 8 }}>
              <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
              Enabled
            </label>
          </div>
          {error && <p style={{ color: "#C8102E", fontSize: 12, marginBottom: 10 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleCreate} disabled={saving} style={btnStyle("var(--primary)")}>{saving ? "Saving…" : "Create"}</button>
            <button onClick={() => { setShowForm(false); setError(""); }} style={btnStyle("#888")}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
              {["Value ID", "Scope", "Scope ID", "Custom Value", "Enabled"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "var(--muted-foreground)", fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--muted-foreground)" }}>No overrides configured.</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={cellStyle}>{r.masterValueId}</td>
                <td style={cellStyle}>{r.scopeType}</td>
                <td style={cellStyle}>{r.scopeId}</td>
                <td style={{ ...cellStyle, color: "var(--muted-foreground)" }}>{r.customValue || "—"}</td>
                <td style={cellStyle}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                    background: r.isEnabled ? "#1F9D5520" : "#88888820",
                    color:      r.isEnabled ? "#1F9D55"   : "#888",
                  }}>{r.isEnabled ? "Yes" : "No"}</span>
                </td>
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
const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, color: "var(--muted-foreground)", marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 7, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" };
const cellStyle: React.CSSProperties  = { padding: "10px 16px" };
