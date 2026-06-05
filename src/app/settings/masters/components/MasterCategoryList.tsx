"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";

interface Category {
  id: number; name: string; code: string; description: string; status: string;
}

interface Props { canEdit: boolean; currentUserId: number }

export default function MasterCategoryList({ canEdit, currentUserId: _uid }: Props) {
  const [rows, setRows]     = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName]       = useState("");
  const [code, setCode]       = useState("");
  const [desc, setDesc]       = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/masters?type=categories");
      if (res.ok) {
        const json = await res.json() as { categories?: Category[] };
        setRows(json.categories ?? []);
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function handleCreate() {
    if (!name.trim() || !code.trim()) { setError("Name and Code are required."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/masters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "category", name, code, description: desc }),
      });
      if (res.ok) {
        setName(""); setCode(""); setDesc(""); setShowForm(false);
        await load();
      } else {
        const j = await res.json() as { error?: string };
        setError(j.error ?? "Failed to create category.");
      }
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>Master Categories</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} style={btnStyle("#888")}>
            <RefreshCw size={13} /> Refresh
          </button>
          {canEdit && (
            <button onClick={() => setShowForm(!showForm)} style={btnStyle("var(--primary)")}>
              <Plus size={13} /> New Category
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="e.g. Payment Terms" />
            </div>
            <div>
              <label style={labelStyle}>Code *</label>
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} style={inputStyle} placeholder="e.g. PAYMENT_TERMS" />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Description</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} style={inputStyle} placeholder="Optional description" />
          </div>
          {error && <p style={{ color: "#C8102E", fontSize: 12, marginBottom: 10 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleCreate} disabled={saving} style={btnStyle("var(--primary)")}>
              {saving ? "Saving…" : "Create"}
            </button>
            <button onClick={() => { setShowForm(false); setError(""); }} style={btnStyle("#888")}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
              {["Name", "Code", "Description", "Status"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "var(--muted-foreground)", fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ padding: 24, textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 24, textAlign: "center", color: "var(--muted-foreground)" }}>No categories yet.</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={cellStyle}>{r.name}</td>
                <td style={{ ...cellStyle, fontFamily: "monospace", fontSize: 12 }}>{r.code}</td>
                <td style={{ ...cellStyle, color: "var(--muted-foreground)" }}>{r.description || "—"}</td>
                <td style={cellStyle}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                    background: r.status === "ACTIVE" ? "#1F9D5520" : "#88888820",
                    color:      r.status === "ACTIVE" ? "#1F9D55"   : "#888",
                  }}>{r.status}</span>
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
