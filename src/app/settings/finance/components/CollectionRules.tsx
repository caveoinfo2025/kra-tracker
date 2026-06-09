"use client";

import { useState } from "react";
import type { CollectionPolicyRecord } from "@/lib/finance-engine";

interface Props {
  initialPolicies: CollectionPolicyRecord[];
}

export default function CollectionRules({ initialPolicies }: Props) {
  const [policies, setPolicies] = useState(initialPolicies);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ reminderDays: "7", escalationDays: "14", creditHoldDays: "30", policyCode: "" });

  async function handleCreate() {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/finance/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reminderDays: Number(form.reminderDays),
          escalationDays: Number(form.escalationDays),
          creditHoldDays: Number(form.creditHoldDays),
          policyCode: form.policyCode,
        }),
      });
      const data = await res.json() as { policy?: CollectionPolicyRecord; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      if (data.policy) setPolicies((prev) => [...prev, data.policy!]);
      setForm({ reminderDays: "7", escalationDays: "14", creditHoldDays: "30", policyCode: "" });
      setShowForm(false);
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  async function handleToggle(p: CollectionPolicyRecord) {
    const newStatus = p.status === "active" ? "inactive" : "active";
    const res = await fetch("/api/admin/finance/collection", {
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
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: "var(--foreground)" }}>Collection Rules</h2>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
            Configure overdue reminder, escalation, and credit-hold thresholds.
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
          <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 16px" }}>New Collection Policy</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>First Reminder (days)</label>
              <input type="number" min="1" value={form.reminderDays} onChange={(e) => setForm((f) => ({ ...f, reminderDays: e.target.value }))}
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Escalation (days)</label>
              <input type="number" min="1" value={form.escalationDays} onChange={(e) => setForm((f) => ({ ...f, escalationDays: e.target.value }))}
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Credit Hold (days)</label>
              <input type="number" min="1" value={form.creditHoldDays} onChange={(e) => setForm((f) => ({ ...f, creditHoldDays: e.target.value }))}
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Policy Code</label>
              <input value={form.policyCode} onChange={(e) => setForm((f) => ({ ...f, policyCode: e.target.value.toUpperCase() }))} placeholder="Optional"
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box", fontFamily: "monospace" }} />
            </div>
          </div>

          {/* Visual timeline */}
          <div style={{ marginTop: 16, padding: "10px 14px", background: "var(--accent)", borderRadius: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 0, fontSize: 11, color: "var(--muted-foreground)" }}>
              <span style={{ fontWeight: 600, color: "var(--foreground)" }}>Due date</span>
              <div style={{ flex: 1, height: 2, background: "var(--border)", margin: "0 8px" }} />
              <span>+{form.reminderDays}d Reminder</span>
              <div style={{ flex: 1, height: 2, background: "var(--border)", margin: "0 8px" }} />
              <span>+{form.escalationDays}d Escalate</span>
              <div style={{ flex: 1, height: 2, background: "var(--border)", margin: "0 8px" }} />
              <span style={{ color: "var(--caveo-red)", fontWeight: 600 }}>+{form.creditHoldDays}d Credit Hold</span>
            </div>
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
            No collection policies configured yet.
          </div>
        ) : policies.map((p) => (
          <div key={p.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)" }}>{p.reminderDays}</div>
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>Reminder</div>
                </div>
                <div style={{ fontSize: 16, color: "var(--muted-foreground)" }}>→</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#FF6B00" }}>{p.escalationDays}</div>
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>Escalate</div>
                </div>
                <div style={{ fontSize: 16, color: "var(--muted-foreground)" }}>→</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--caveo-red)" }}>{p.creditHoldDays}</div>
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>Hold</div>
                </div>
                <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>days overdue</span>
                {p.policyCode && <span style={{ fontSize: 11, fontFamily: "monospace", background: "var(--accent)", padding: "1px 6px", borderRadius: 4, color: "var(--muted-foreground)" }}>{p.policyCode}</span>}
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
