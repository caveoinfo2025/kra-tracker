"use client";

import { useState } from "react";

type CommEvent = { id: number; module: string; eventCode: string; eventName: string; description: string; status: string };

const MODULES = ["CRM", "Workflow", "Finance", "Performance", "Security"];

type Props = { events: unknown[] };

export default function EventRegistry({ events }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ module: "CRM", eventCode: "", eventName: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");

  const typedEvents = events as CommEvent[];
  const filtered = moduleFilter ? typedEvents.filter((e) => e.module === moduleFilter) : typedEvents;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/communication/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed"); return; }
      setShowForm(false);
      setForm({ module: "CRM", eventCode: "", eventName: "", description: "" });
      window.location.reload();
    } finally { setSaving(false); }
  }

  const MODULE_COLORS: Record<string, string> = {
    CRM: "#6366f1", Workflow: "#0ea5e9", Finance: "#22c55e",
    Performance: "#f59e0b", Security: "#ef4444",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Event Registry</h2>
          <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}
            style={{ padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}>
            <option value="">All modules</option>
            {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ background: "var(--caveo-red)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: 14 }}>
          + Register Event
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit}
          style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Module *
              <select required value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })}
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}>
                {MODULES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Event Code * (UPPER_SNAKE)
              <input required value={form.eventCode}
                onChange={(e) => setForm({ ...form, eventCode: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
                placeholder="LEAD_CREATED"
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, fontFamily: "monospace" }} />
            </label>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Event Name *
              <input required value={form.eventName} onChange={(e) => setForm({ ...form, eventName: e.target.value })}
                placeholder="Lead Created"
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
            </label>
            <label style={{ fontSize: 13, fontWeight: 500, gridColumn: "1 / -1" }}>
              Description
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
            </label>
          </div>
          {error && <div style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>{error}</div>}
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button type="submit" disabled={saving}
              style={{ background: "var(--caveo-red)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: 13 }}>
              {saving ? "Saving…" : "Register"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: 13 }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Group by module */}
      {MODULES.filter((m) => !moduleFilter || m === moduleFilter).map((mod) => {
        const modEvents = filtered.filter((e) => e.module === mod);
        if (modEvents.length === 0) return null;
        return (
          <div key={mod} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: MODULE_COLORS[mod] ?? "#374151", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {mod}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {modEvents.map((ev) => (
                <div key={ev.id} style={{
                  background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
                  padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600, color: "#1e40af" }}>{ev.eventCode}</span>
                    <span style={{ fontSize: 13, color: "#374151", marginLeft: 12 }}>{ev.eventName}</span>
                    {ev.description && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{ev.description}</div>}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, borderRadius: 12, padding: "2px 8px",
                    background: ev.status === "active" ? "#dcfce7" : "#f3f4f6",
                    color: ev.status === "active" ? "#15803d" : "#6b7280",
                    textTransform: "uppercase",
                  }}>{ev.status}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 40, fontSize: 14 }}>
          No events registered yet. Use "+ Register Event" or run the seed script.
        </div>
      )}
    </div>
  );
}
