"use client";

import { useState } from "react";

type KRAMetric = {
  id: number;
  name: string;
  code: string;
  description: string;
  metricType: string;
  calculationSource: string;
  status: string;
};

type Props = { metrics: unknown[] };

export default function KRALibrary({ metrics }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    metricType: "AMOUNT",
    calculationSource: "MANUAL",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const typedMetrics = metrics as KRAMetric[];
  const filtered = typedMetrics.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.code.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/performance/kra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create metric");
      } else {
        setShowForm(false);
        setForm({ name: "", code: "", description: "", metricType: "AMOUNT", calculationSource: "MANUAL" });
        window.location.reload();
      }
    } finally {
      setSaving(false);
    }
  }

  const METRIC_TYPE_COLORS: Record<string, string> = {
    AMOUNT: "#6366f1",
    PERCENTAGE: "#22c55e",
    COUNT: "#0ea5e9",
  };

  const METRIC_TYPE_HELP: Record<string, string> = {
    AMOUNT: "Actual money target (₹ Lakhs, ₹, etc.)",
    PERCENTAGE: "A percentage target (0-100%)",
    COUNT: "An activity/count target (calls, deals, leads, etc.)",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>KRA Metrics Library</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ background: "var(--caveo-red)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: 14 }}
        >
          + New Metric
        </button>
      </div>

      <input
        placeholder="Search metrics…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, marginBottom: 16 }}
      />

      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20, marginBottom: 20 }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Metric Name *
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
            </label>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Code * (unique)
              <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. REVENUE_TARGET"
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
            </label>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Metric Type
              <select value={form.metricType} onChange={(e) => setForm({ ...form, metricType: e.target.value })}
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}>
                <option value="AMOUNT">Amount</option>
                <option value="PERCENTAGE">Percentage</option>
                <option value="COUNT">Count</option>
              </select>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{METRIC_TYPE_HELP[form.metricType]}</div>
            </label>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Calculation Source
              <select value={form.calculationSource} onChange={(e) => setForm({ ...form, calculationSource: e.target.value })}
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}>
                <option value="MANUAL">Manual Entry</option>
                <option value="PIPELINE">Pipeline (auto)</option>
                <option value="BILLING">Billing (auto)</option>
              </select>
            </label>
            <label style={{ fontSize: 13, fontWeight: 500, gridColumn: "1 / -1" }}>
              Description
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, resize: "vertical" }} />
            </label>
          </div>
          {error && <div style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>{error}</div>}
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button type="submit" disabled={saving}
              style={{ background: "var(--caveo-red)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: 13 }}>
              {saving ? "Saving…" : "Create Metric"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: 13 }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 40, fontSize: 14 }}>
          {search ? "No metrics match your search." : "No KRA metrics defined yet."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {filtered.map((m) => (
            <div key={m.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace" }}>{m.code}</div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  background: `${METRIC_TYPE_COLORS[m.metricType] ?? "#9ca3af"}20`,
                  color: METRIC_TYPE_COLORS[m.metricType] ?? "#9ca3af",
                  borderRadius: 4, padding: "2px 8px",
                }}>
                  {m.metricType}
                </span>
              </div>
              {m.description && (
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>{m.description}</div>
              )}
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>Source: {m.calculationSource}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
