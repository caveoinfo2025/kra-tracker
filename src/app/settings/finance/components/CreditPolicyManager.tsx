"use client";

import { useState } from "react";
import type { CustomerCreditPolicyRecord } from "@/lib/finance-engine";

const CUSTOMER_TYPES = ["STANDARD", "PREMIUM", "GOVERNMENT", "DISTRIBUTOR", "PARTNER", "STARTUP"];

interface Props {
  initialPolicies: CustomerCreditPolicyRecord[];
}

export default function CreditPolicyManager({ initialPolicies }: Props) {
  const [policies, setPolicies] = useState(initialPolicies);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customerType: "STANDARD",
    defaultCreditLimitLakhs: "",
    maxCreditLimitLakhs: "",
    approvalAboveLimit: true,
    paymentTermsDays: "30",
  });

  async function handleCreate() {
    if (!form.defaultCreditLimitLakhs || !form.maxCreditLimitLakhs) {
      setError("Credit limits are required"); return;
    }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/finance/credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerType: form.customerType,
          defaultCreditLimitLakhs: Number(form.defaultCreditLimitLakhs),
          maxCreditLimitLakhs: Number(form.maxCreditLimitLakhs),
          approvalAboveLimit: form.approvalAboveLimit,
          paymentTermsDays: Number(form.paymentTermsDays),
        }),
      });
      const data = await res.json() as { policy?: CustomerCreditPolicyRecord; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      if (data.policy) setPolicies((prev) => [...prev, data.policy!]);
      setForm({ customerType: "STANDARD", defaultCreditLimitLakhs: "", maxCreditLimitLakhs: "", approvalAboveLimit: true, paymentTermsDays: "30" });
      setShowForm(false);
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  async function handleToggle(p: CustomerCreditPolicyRecord) {
    const newStatus = p.status === "active" ? "inactive" : "active";
    const res = await fetch("/api/admin/finance/credit", {
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
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: "var(--foreground)" }}>Customer Credit Policies</h2>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
            Credit limits and payment terms by customer type.
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
          <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 16px" }}>New Credit Policy</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Customer Type *</label>
              <select
                value={form.customerType}
                onChange={(e) => setForm((f) => ({ ...f, customerType: e.target.value }))}
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }}
              >
                {CUSTOMER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Payment Terms (days)</label>
              <input
                type="number" min="0"
                value={form.paymentTermsDays}
                onChange={(e) => setForm((f) => ({ ...f, paymentTermsDays: e.target.value }))}
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Default Credit Limit (₹ Lakhs) *</label>
              <input
                type="number" min="0" step="0.5"
                value={form.defaultCreditLimitLakhs}
                onChange={(e) => setForm((f) => ({ ...f, defaultCreditLimitLakhs: e.target.value }))}
                placeholder="e.g. 5"
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Max Credit Limit (₹ Lakhs) *</label>
              <input
                type="number" min="0" step="0.5"
                value={form.maxCreditLimitLakhs}
                onChange={(e) => setForm((f) => ({ ...f, maxCreditLimitLakhs: e.target.value }))}
                placeholder="e.g. 20"
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }}
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={form.approvalAboveLimit} onChange={(e) => setForm((f) => ({ ...f, approvalAboveLimit: e.target.checked }))} />
              Approval Required Above Default Limit
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
            No credit policies configured yet.
          </div>
        ) : policies.map((p) => (
          <div key={p.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>{p.customerType}</span>
                <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                  Default: ₹{p.defaultCreditLimitLakhs}L · Max: ₹{p.maxCreditLimitLakhs}L
                </span>
                <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{p.paymentTermsDays}d terms</span>
                {p.approvalAboveLimit && <span style={{ fontSize: 10, background: "rgba(255,107,0,0.1)", color: "#FF6B00", padding: "1px 6px", borderRadius: 10, fontWeight: 600 }}>APPROVAL</span>}
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
