"use client";

import { useState } from "react";

type Period = { id: number; name: string; financialYear: string };
type TeamTarget = {
  id: number;
  teamId: number;
  periodId: number;
  status: string;
  period: Period;
};

type Props = { teamTargets: unknown[]; periods: unknown[] };

export default function TeamTargetManager({ teamTargets, periods }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ teamId: "", periodId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const typedTargets = teamTargets as TeamTarget[];
  const typedPeriods = periods as Period[];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/performance/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "team", teamId: Number(form.teamId), periodId: Number(form.periodId) }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create team target");
      } else {
        setShowForm(false);
        setForm({ teamId: "", periodId: "" });
        window.location.reload();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Team Targets</h2>
        <button onClick={() => setShowForm(!showForm)}
          style={{ background: "var(--caveo-red)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: 14 }}>
          + Assign Team Target
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit}
          style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Team ID *
              <input required type="number" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}
                placeholder="Team ID"
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
            </label>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Performance Period *
              <select required value={form.periodId} onChange={(e) => setForm({ ...form, periodId: e.target.value })}
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}>
                <option value="">Select period…</option>
                {typedPeriods.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.financialYear})</option>)}
              </select>
            </label>
          </div>
          {error && <div style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>{error}</div>}
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button type="submit" disabled={saving}
              style={{ background: "var(--caveo-red)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: 13 }}>
              {saving ? "Saving…" : "Assign"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: 13 }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {typedTargets.length === 0 ? (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 40, fontSize: 14 }}>
          No team targets assigned yet.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Team ID</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Period</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {typedTargets.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 12px" }}>Team #{t.teamId}</td>
                  <td style={{ padding: "10px 12px" }}>{t.period?.name ?? `Period #${t.periodId}`}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontSize: 12, background: "#dcfce7", color: "#15803d", borderRadius: 4, padding: "2px 8px" }}>{t.status}</span>
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
