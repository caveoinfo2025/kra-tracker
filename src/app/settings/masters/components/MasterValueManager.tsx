"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";

interface Definition { id: number; name: string; code: string; categoryName?: string }
interface MasterValue { id: number; masterDefinitionId: number; value: string; code: string; description: string; sortOrder: number; status: string }

interface Props { canEdit: boolean; currentUserId: number }

export default function MasterValueManager({ canEdit, currentUserId: _uid }: Props) {
  const [defs, setDefs]         = useState<Definition[]>([]);
  const [defId, setDefId]       = useState<number | "">("");
  const [values, setValues]     = useState<MasterValue[]>([]);
  const [loading, setLoading]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [val, setVal]           = useState("");
  const [code, setCode]         = useState("");
  const [desc, setDesc]         = useState("");
  const [order, setOrder]       = useState("0");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/masters?type=definitions");
        if (res.ok) {
          const json = await res.json() as { definitions?: Definition[] };
          setDefs(json.definitions ?? []);
        }
      } catch { /* pre-migration */ }
    })();
  }, []);

  async function loadValues(id: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/masters/values?definitionId=${id}`);
      if (res.ok) {
        const json = await res.json() as { values?: MasterValue[] };
        setValues(json.values ?? []);
      }
    } finally { setLoading(false); }
  }

  function onDefChange(id: number | "") {
    setDefId(id);
    setValues([]);
    if (id) void loadValues(id as number);
  }

  async function handleCreate() {
    if (!defId || !val.trim() || !code.trim()) { setError("Definition, Value and Code are required."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/masters/values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterDefinitionId: defId, value: val, code, description: desc, sortOrder: Number(order) }),
      });
      if (res.ok) {
        setVal(""); setCode(""); setDesc(""); setOrder("0"); setShowForm(false);
        await loadValues(defId as number);
      } else {
        const j = await res.json() as { error?: string };
        setError(j.error ?? "Failed to create value.");
      }
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>Master Values</span>
        {canEdit && defId && (
          <button onClick={() => setShowForm(!showForm)} style={btnStyle("var(--primary)")}>
            <Plus size={13} /> Add Value
          </button>
        )}
      </div>

      {/* Definition selector */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Select Master Definition</label>
        <select
          value={defId}
          onChange={e => onDefChange(e.target.value ? Number(e.target.value) : "")}
          style={{ ...inputStyle, maxWidth: 400 }}
        >
          <option value="">— choose a definition —</option>
          {defs.map(d => (
            <option key={d.id} value={d.id}>{d.categoryName ? `${d.categoryName} › ` : ""}{d.name}</option>
          ))}
        </select>
      </div>

      {showForm && defId && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Value *</label>
              <input value={val} onChange={e => setVal(e.target.value)} style={inputStyle} placeholder="e.g. Net 30 Days" />
            </div>
            <div>
              <label style={labelStyle}>Code *</label>
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} style={inputStyle} placeholder="NET_30" />
            </div>
            <div>
              <label style={labelStyle}>Sort</label>
              <input value={order} onChange={e => setOrder(e.target.value)} type="number" style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Description</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} style={inputStyle} placeholder="Optional" />
          </div>
          {error && <p style={{ color: "#C8102E", fontSize: 12, marginBottom: 10 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleCreate} disabled={saving} style={btnStyle("var(--primary)")}>{saving ? "Saving…" : "Create"}</button>
            <button onClick={() => { setShowForm(false); setError(""); }} style={btnStyle("#888")}>Cancel</button>
          </div>
        </div>
      )}

      {defId && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
                {["Value", "Code", "Description", "Sort", "Status"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "var(--muted-foreground)", fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</td></tr>
              ) : values.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--muted-foreground)" }}>No values yet.</td></tr>
              ) : values.map(v => (
                <tr key={v.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={cellStyle}>{v.value}</td>
                  <td style={{ ...cellStyle, fontFamily: "monospace", fontSize: 12 }}>{v.code}</td>
                  <td style={{ ...cellStyle, color: "var(--muted-foreground)" }}>{v.description || "—"}</td>
                  <td style={cellStyle}>{v.sortOrder}</td>
                  <td style={cellStyle}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                      background: v.status === "ACTIVE" ? "#1F9D5520" : "#88888820",
                      color:      v.status === "ACTIVE" ? "#1F9D55"   : "#888",
                    }}>{v.status}</span>
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

const btnStyle = (color: string): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: 5,
  padding: "7px 13px", fontSize: 12, fontWeight: 600,
  borderRadius: 7, border: `1px solid ${color}`,
  color: color, background: "transparent", cursor: "pointer",
});
const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, color: "var(--muted-foreground)", marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 7, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" };
const cellStyle: React.CSSProperties  = { padding: "10px 16px" };
