"use client";

/**
 * Phase W8 — Daily Activity → Enterprise KRA mapping admin UI (CONFIG ONLY).
 *
 * Views/creates/edits `KRAMetric` rows with calculationSource="DAILY_ACTIVITY". It deliberately
 * has NO convert-to-achievement action and NO monthly write workflow — those are a later phase.
 * All calls go to /api/admin/performance/daily-activity-mapping (config only).
 */
import { useState } from "react";

type KRAMetric = {
  id: number;
  name: string;
  code: string;
  description: string;
  metricType: string;
  calculationSource: string;
  formulaJson: string;
  status: string;
};

type Props = { metrics: unknown[] };

const DEFAULT_CODES = [
  "DAILY_ACTIVITY_COVERAGE",
  "DAILY_ACTIVITY_PRODUCTIVITY",
  "DAILY_ACTIVITY_COMPLIANCE",
];

export default function DailyActivityKraMapping({ metrics }: Props) {
  const typed = metrics as KRAMetric[];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [draftJson, setDraftJson] = useState("");

  async function createDefaults() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/performance/daily-activity-mapping", { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to create default mappings");
      } else {
        window.location.reload();
      }
    } finally {
      setBusy(false);
    }
  }

  async function save(id: number, patch: { formulaJson?: string; status?: string }) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/performance/daily-activity-mapping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to save");
      } else {
        window.location.reload();
      }
    } finally {
      setBusy(false);
    }
  }

  const missingDefaults = DEFAULT_CODES.filter((c) => !typed.some((m) => m.code === c));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Daily Activity → KRA Mapping</h2>
        <button
          onClick={createDefaults}
          disabled={busy}
          style={{ background: "var(--caveo-red)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: busy ? "default" : "pointer", fontSize: 14, opacity: busy ? 0.6 : 1 }}
        >
          {missingDefaults.length ? "Create Default Daily Activity KRA Mapping" : "Re-sync Default Mapping"}
        </button>
      </div>

      {/* Mandatory warning — this config does not write achievements. */}
      <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", color: "#92400e", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
        ⚠ This mapping config does not write achievements. KRAAchievement conversion will be added in
        a later phase. These metrics define how Daily Activity will <em>eventually</em> feed Enterprise
        KRA; nothing is scored or written here.
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 12 }}>{error}</div>
      )}

      {typed.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", border: "1px dashed #e5e7eb", borderRadius: 8 }}>
          No Daily Activity KRA metrics yet. Click <strong>Create Default Daily Activity KRA Mapping</strong> to set up the three recommended metrics.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {typed.map((m) => (
            <div key={m.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{m.name}</div>
                  <code style={{ fontSize: 12, color: "#6b7280" }}>{m.code}</code>
                  <span style={{ marginLeft: 8, fontSize: 11, padding: "1px 8px", borderRadius: 999, background: m.status === "active" ? "#dcfce7" : "#f3f4f6", color: m.status === "active" ? "#166534" : "#6b7280" }}>
                    {m.status}
                  </span>
                  <span style={{ marginLeft: 6, fontSize: 11, padding: "1px 8px", borderRadius: 999, background: "#eef2ff", color: "#4338ca" }}>{m.calculationSource}</span>
                  <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: 13 }}>{m.description}</p>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => save(m.id, { status: m.status === "active" ? "inactive" : "active" })}
                    disabled={busy}
                    style={{ background: "none", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}
                  >
                    {m.status === "active" ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => { setEditId(editId === m.id ? null : m.id); setDraftJson(m.formulaJson || ""); }}
                    disabled={busy}
                    style={{ background: "none", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}
                  >
                    {editId === m.id ? "Cancel" : "Edit config"}
                  </button>
                </div>
              </div>

              {editId === m.id && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: 12, color: "#6b7280" }}>formulaJson (validated server-side: source/version/metricType/eligibleStatuses)</label>
                  <textarea
                    value={draftJson}
                    onChange={(e) => setDraftJson(e.target.value)}
                    rows={10}
                    style={{ width: "100%", fontFamily: "monospace", fontSize: 12, padding: 10, border: "1px solid #d1d5db", borderRadius: 6, marginTop: 4 }}
                  />
                  <button
                    onClick={() => save(m.id, { formulaJson: draftJson })}
                    disabled={busy}
                    style={{ marginTop: 8, background: "var(--caveo-red)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: 14 }}
                  >
                    Save config
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
