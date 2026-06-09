"use client";

import { useState } from "react";
import type { AdvancePolicyRecord } from "@/lib/finance-engine";

interface Props {
  initialPolicies: AdvancePolicyRecord[];
}

export default function AdvancePolicyManager({ initialPolicies }: Props) {
  const [policies, setPolicies] = useState(initialPolicies);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ maxAdvanceLakhs: "", settlementDays: "30", approvalRequired: true, policyCode: "" });

  async function handleCreate() {
    if (!form.maxAdvanceLakhs) { setError("Max advance amount is required"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/finance/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxAdvanceLakhs: Number(form.maxAdvanceLakhs),
          settlementDays: Number(form.settlementDays),
          approvalRequired: form.approvalRequired,
          policyCode: form.policyCode,
        }),
      });
      const data = await res.json() as { policy?: AdvancePolicyRecord; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      if (data.policy) setPolicies((prev) => [...prev, data.policy!]);
      setForm({ maxAdvanceLakhs: "", settlementDays: "30", approvalRequired: true, policyCode: "" });
      setShowForm(false);
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  async function handleToggle(p: AdvancePolicyRecord) {
    const newStatus = p.status === "active" ? "inactive" : "active";
    const res = await fetch("/api/admin/finance/advance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, status: newStatus }),
    });
    if (res.ok) setPolicies((prev) => prev.map((x) => x.id === p.id ? { ...x, status: newStatus } : x));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: "var(--foreground)" }}>Advance Policies</h2>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
            Maximum advance amounts and settlement periods.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: "7px 14px", fontSize: 13, fontWeight: 600, borderRadius: 7, background: "var(--caveo-red)", color: "#fff", border: "none", cursor: "pointer" }}
        >
          + Add Policy
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 16px" }}>New Advance Policy</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Max Advance (₹ Lakhs) *</label>
              <input
                type="number" min="0" step="0.25"
                value={form.maxAdvanceLakhs}
                onChange={(e) => setForm((f) => ({ ...f, maxAdvanceLakhs: e.target.value }))}
                placeholder="e.g. 1.0"
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Settlement Days</label>
              <input
                type="number" min="1"
                value={form.settlementDays}
                onChange={(e) => setForm((f) => ({ ...f, settlementDays: e.target.value }))}
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Policy Code</label>
              <input
                value={form.policyCode}
                onChange={(e) => setForm((f) => ({ ...f, policyCode: e.target.value.toUpperCase() }))}
                placeholder="Optional code"
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box", fontFamily: "monospace" }}
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", alignSelf: "flex-end", paddingBottom: 2 }}>
              <input type="checkbox" checked={form.approvalRequired} onChange={(e) => setForm((f) => ({ ...f, approvalRequired: e.target.checked }))} />
              Approval Required
            </label>
          </div>
          {error && <p style={{ fontSize: 12, color: "var(--caveo-red)", marginTop: 8 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={handleCreate} disabled={saving} style={{ padding: "7px 16px", fontSize: 13, fontWeight: 600, borderRadius: 6, background: "var(--caveo-red)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving…" : "Save Policy"}
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: "7px 16px", fontSize: 13, borderRadius: 6, background: "transparent", border: "1px solid var(--border)", cursor: "pointer", color: "var(--foreground)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {policies.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted-foreground)", fontSize: 13 }}>
            No advance policies configured yet.
          </div>
        ) : policies.map((p) => (
          <div key={p.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>
                  Max ₹{p.maxAdvanceLakhs}L
                </span>
                <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Settle in {p.settlementDays} days</span>
                {p.policyCode && <span style={{ fontSize: 11, fontFamily: "monospace", background: "var(--accent)", padding: "1px 6px", borderRadius: 4, color: "var(--muted-foreground)" }}>{p.policyCode}</span>}
                {p.approvalRequired && <span style={{ fontSize: 10, background: "rgba(255,107,0,0.1)", color: "#FF6B00", padding: "1px 6px", borderRadius: 10, fontWeight: 600 }}>APPROVAL REQUIRED</span>}
                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, fontWeight: 600, background: p.status === "active" ? "rgba(0,180,0,0.1)" : "rgba(200,16,46,0.1)", color: p.status === "active" ? "#00AA00" : "var(--caveo-red)" }}>
                  {p.status.toUpperCase()}
                </span>
              </div>
            </div>
            <button onClick={() => handleToggle(p)} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--muted-foreground)" }}>
              {p.status === "active" ? "Deactivate" : "Activate"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
