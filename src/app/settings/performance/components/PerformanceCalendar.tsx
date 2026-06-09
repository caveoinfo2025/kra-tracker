"use client";

import { useState } from "react";

type Period = {
  id: number;
  name: string;
  financialYear: string;
  periodType: string;
  startDate: string;
  endDate: string;
  status: string;
};

type Props = { periods: unknown[] };

export default function PerformanceCalendar({ periods }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    financialYear: "",
    periodType: "YEARLY",
    startDate: "",
    endDate: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const typedPeriods = periods as Period[];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/performance/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create period");
      } else {
        setShowForm(false);
        setForm({ name: "", financialYear: "", periodType: "YEARLY", startDate: "", endDate: "" });
        window.location.reload();
      }
    } finally {
      setSaving(false);
    }
  }

  const STATUS_COLORS: Record<string, string> = {
    active: "#22c55e",
    draft: "#f59e0b",
    closed: "#9ca3af",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Performance Periods</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: "var(--caveo-red)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          + New Period
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Period Name *
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. FY 2026-27 Annual"
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}
              />
            </label>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Financial Year
              <input
                value={form.financialYear}
                onChange={(e) => setForm({ ...form, financialYear: e.target.value })}
                placeholder="2026-27"
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}
              />
            </label>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Period Type
              <select
                value={form.periodType}
                onChange={(e) => setForm({ ...form, periodType: e.target.value })}
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}
              >
                <option value="YEARLY">Yearly</option>
                <option value="HALF_YEARLY">Half-Yearly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </label>
            <div />
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Start Date *
              <input
                required
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}
              />
            </label>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              End Date *
              <input
                required
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}
              />
            </label>
          </div>
          {error && <div style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>{error}</div>}
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button
              type="submit"
              disabled={saving}
              style={{ background: "var(--caveo-red)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: 13 }}
            >
              {saving ? "Saving…" : "Create Period"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{ background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: 13 }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {typedPeriods.length === 0 ? (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 40, fontSize: 14 }}>
          No performance periods defined yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {typedPeriods.map((p) => (
            <div
              key={p.id}
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "14px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                  {p.financialYear} · {p.periodType} ·{" "}
                  {new Date(p.startDate).toLocaleDateString("en-IN")} →{" "}
                  {new Date(p.endDate).toLocaleDateString("en-IN")}
                </div>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  background: `${STATUS_COLORS[p.status] ?? "#9ca3af"}20`,
                  color: STATUS_COLORS[p.status] ?? "#9ca3af",
                  borderRadius: 12,
                  padding: "3px 10px",
                  textTransform: "uppercase",
                }}
              >
                {p.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
