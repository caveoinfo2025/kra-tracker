"use client";

import { useState } from "react";

type KRAMetric = { id: number; name: string; code: string; metricType: string };
type TemplateItem = {
  metricId: number;
  weightage: number;
  targetType: string;
  minimumTarget: number;
  expectedTarget: number;
  stretchTarget: number;
  sortOrder: number;
};
type KRATemplate = {
  id: number;
  name: string;
  description: string;
  roleId: number | null;
  status: string;
  items: (TemplateItem & { metric: KRAMetric })[];
};

type Props = { templates: unknown[]; metrics: unknown[] };

export default function KRATemplateManager({ templates, metrics }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const typedTemplates = templates as KRATemplate[];
  const typedMetrics = metrics as KRAMetric[];

  const totalWeight = items.reduce((s, i) => s + i.weightage, 0);

  function addItem() {
    setItems([
      ...items,
      { metricId: typedMetrics[0]?.id ?? 0, weightage: 0, targetType: "AMOUNT", minimumTarget: 0, expectedTarget: 0, stretchTarget: 0, sortOrder: items.length },
    ]);
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof TemplateItem, value: number | string) {
    setItems(items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Math.abs(totalWeight - 100) > 0.01) {
      setError(`Weights must total 100%. Current: ${totalWeight.toFixed(2)}%`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/performance/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, items }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create template");
      } else {
        setShowForm(false);
        setName(""); setDescription(""); setItems([]);
        window.location.reload();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>KRA Templates</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ background: "var(--caveo-red)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: 14 }}
        >
          + New Template
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit}
          style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Template Name *
              <input required value={name} onChange={(e) => setName(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
            </label>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Description
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, resize: "vertical" }} />
            </label>
          </div>

          {/* KRA Items */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>KRA Items</h3>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 13, color: Math.abs(totalWeight - 100) < 0.01 ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                  Total weight: {totalWeight.toFixed(1)}% {Math.abs(totalWeight - 100) < 0.01 ? "✓" : "(must be 100%)"}
                </span>
                <button type="button" onClick={addItem}
                  style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 4, padding: "4px 12px", cursor: "pointer", fontSize: 13 }}>
                  + Add KRA
                </button>
              </div>
            </div>

            {items.length === 0 && (
              <div style={{ textAlign: "center", color: "#9ca3af", padding: "20px 0", fontSize: 13 }}>
                Click "+ Add KRA" to add KRA items to this template
              </div>
            )}

            {items.map((item, idx) => (
              <div key={idx} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: 12, marginBottom: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
                  <label style={{ fontSize: 12, fontWeight: 500 }}>
                    Metric
                    <select value={item.metricId} onChange={(e) => updateItem(idx, "metricId", Number(e.target.value))}
                      style={{ display: "block", width: "100%", marginTop: 2, padding: "5px 8px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 12 }}>
                      {typedMetrics.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.metricType})</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: 12, fontWeight: 500 }}>
                    Weight %
                    <input type="number" min="0" max="100" value={item.weightage}
                      onChange={(e) => updateItem(idx, "weightage", parseFloat(e.target.value) || 0)}
                      style={{ display: "block", width: "100%", marginTop: 2, padding: "5px 8px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 12 }} />
                  </label>
                  <label style={{ fontSize: 12, fontWeight: 500 }}>
                    Min Target
                    <input type="number" min="0" value={item.minimumTarget}
                      onChange={(e) => updateItem(idx, "minimumTarget", parseFloat(e.target.value) || 0)}
                      style={{ display: "block", width: "100%", marginTop: 2, padding: "5px 8px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 12 }} />
                  </label>
                  <label style={{ fontSize: 12, fontWeight: 500 }}>
                    Expected Target
                    <input type="number" min="0" value={item.expectedTarget}
                      onChange={(e) => updateItem(idx, "expectedTarget", parseFloat(e.target.value) || 0)}
                      style={{ display: "block", width: "100%", marginTop: 2, padding: "5px 8px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 12 }} />
                  </label>
                  <label style={{ fontSize: 12, fontWeight: 500 }}>
                    Stretch Target
                    <input type="number" min="0" value={item.stretchTarget}
                      onChange={(e) => updateItem(idx, "stretchTarget", parseFloat(e.target.value) || 0)}
                      style={{ display: "block", width: "100%", marginTop: 2, padding: "5px 8px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 12 }} />
                  </label>
                  <button type="button" onClick={() => removeItem(idx)}
                    style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 4, padding: "5px 10px", cursor: "pointer", fontSize: 13 }}>
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          {error && <div style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>{error}</div>}
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button type="submit" disabled={saving}
              style={{ background: "var(--caveo-red)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: 13 }}>
              {saving ? "Saving…" : "Create Template"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: 13 }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {typedTemplates.length === 0 ? (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 40, fontSize: 14 }}>
          No KRA templates defined yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {typedTemplates.map((t) => (
            <div key={t.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</div>
                  {t.description && <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{t.description}</div>}
                </div>
                <span style={{ fontSize: 12, background: "#f3f4f6", borderRadius: 4, padding: "2px 8px", color: "#374151" }}>
                  {t.items.length} KRA{t.items.length !== 1 ? "s" : ""}
                </span>
              </div>
              {t.items.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {t.items.map((item, i) => (
                    <span key={i} style={{ fontSize: 12, background: "#eff6ff", color: "#1d4ed8", borderRadius: 4, padding: "2px 8px" }}>
                      {item.metric?.name ?? `Metric #${item.metricId}`} ({item.weightage}%)
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
