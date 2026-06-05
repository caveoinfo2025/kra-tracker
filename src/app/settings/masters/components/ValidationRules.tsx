"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";

interface Rule { id: number; masterDefinitionId: number; ruleName: string; policyId: number | null; isActive: boolean }
interface Definition { id: number; name: string; code: string }

interface Props { canEdit: boolean; currentUserId: number }

export default function ValidationRules({ canEdit, currentUserId: _uid }: Props) {
  const [defs, setDefs]         = useState<Definition[]>([]);
  const [defId, setDefId]       = useState<number | "">("");
  const [rules, setRules]       = useState<Rule[]>([]);
  const [loading, setLoading]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [rName, setRName]       = useState("");
  const [policyId, setPolicyId] = useState("");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/masters?type=definitions");
        if (res.ok) {
          const j = await res.json() as { definitions?: Definition[] };
          setDefs(j.definitions ?? []);
        }
      } catch { /* pre-migration */ }
    })();
  }, []);

  async function loadRules(id: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/masters?type=validation-rules&definitionId=${id}`);
      if (res.ok) {
        const j = await res.json() as { rules?: Rule[] };
        setRules(j.rules ?? []);
      }
    } finally { setLoading(false); }
  }

  function onDefChange(id: number | "") {
    setDefId(id);
    setRules([]);
    if (id) void loadRules(id as number);
  }

  async function handleCreate() {
    if (!defId || !rName.trim()) { setError("Definition and Rule Name are required."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/masters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type:               "validation-rule",
          masterDefinitionId: defId,
          ruleName:           rName,
          policyId:           policyId ? Number(policyId) : null,
        }),
      });
      if (res.ok) {
        setRName(""); setPolicyId(""); setShowForm(false);
        await loadRules(defId as number);
      } else {
        const j = await res.json() as { error?: string };
        setError(j.error ?? "Failed to create rule.");
      }
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>Validation Rules</span>
        <div style={{ display: "flex", gap: 8 }}>
          {defId && <button onClick={() => void loadRules(defId as number)} style={btnStyle("#888")}><RefreshCw size={13} /> Refresh</button>}
          {canEdit && defId && (
            <button onClick={() => setShowForm(!showForm)} style={btnStyle("var(--primary)")}><Plus size={13} /> Add Rule</button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Select Master Definition</label>
        <select value={defId} onChange={e => onDefChange(e.target.value ? Number(e.target.value) : "")} style={{ ...inputStyle, maxWidth: 400 }}>
          <option value="">— choose a definition —</option>
          {defs.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
        </select>
      </div>

      {showForm && defId && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Rule Name *</label>
              <input value={rName} onChange={e => setRName(e.target.value)} style={inputStyle} placeholder="e.g. REQUIRED, MAX_LENGTH" />
            </div>
            <div>
              <label style={labelStyle}>Policy ID (optional)</label>
              <input value={policyId} onChange={e => setPolicyId(e.target.value)} type="number" style={inputStyle} placeholder="Policy Engine rule ID" />
            </div>
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
                {["Rule Name", "Policy ID", "Active"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "var(--muted-foreground)", fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} style={{ padding: 24, textAlign: "center", color: "var(--muted-foreground)" }}>Loading…</td></tr>
              ) : rules.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: 24, textAlign: "center", color: "var(--muted-foreground)" }}>No validation rules.</td></tr>
              ) : rules.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={cellStyle}>{r.ruleName}</td>
                  <td style={{ ...cellStyle, color: "var(--muted-foreground)" }}>{r.policyId ?? "—"}</td>
                  <td style={cellStyle}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                      background: r.isActive ? "#1F9D5520" : "#88888820",
                      color:      r.isActive ? "#1F9D55"   : "#888",
                    }}>{r.isActive ? "Active" : "Inactive"}</span>
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
