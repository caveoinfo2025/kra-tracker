"use client";

import { useState } from "react";

type CommEvent = { id: number; module: string; eventCode: string; eventName: string };
type NotifRule = {
  id: number; ruleName: string; eventId: number; status: string;
  conditionJson: string; recipientJson: string; channelJson: string; frequencyJson: string;
  event: CommEvent;
};

const RECIPIENT_TYPES = ["USER", "ROLE", "REPORTING_MANAGER", "DEPARTMENT_HEAD", "TEAM", "RECORD_OWNER", "REQUESTER", "APPROVER"];
const CHANNELS        = ["IN_APP", "EMAIL", "SMS", "WHATSAPP", "TEAMS"];
const FREQUENCIES     = ["IMMEDIATE", "DAILY_DIGEST", "WEEKLY", "ONCE"];

type Props = { rules: unknown[]; events: unknown[] };

export default function NotificationRuleManager({ rules, events }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    eventId:       "",
    ruleName:      "",
    recipientType: "RECORD_OWNER",
    recipientValue:"",
    channels:      ["IN_APP"] as string[],
    frequency:     "IMMEDIATE",
    conditionField:"",
    conditionOp:   "gt",
    conditionValue:"",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const typedRules  = rules  as NotifRule[];
  const typedEvents = events as CommEvent[];

  function toggleChannel(ch: string) {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter((c) => c !== ch) : [...f.channels, ch],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const conditionJson = form.conditionField
      ? JSON.stringify({ field: form.conditionField, operator: form.conditionOp, value: form.conditionValue })
      : "{}";
    try {
      const res = await fetch("/api/admin/communication/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId:       Number(form.eventId),
          ruleName:      form.ruleName,
          conditionJson,
          recipientJson: JSON.stringify({ type: form.recipientType, value: form.recipientValue }),
          channelJson:   JSON.stringify({ channels: form.channels }),
          frequencyJson: JSON.stringify({ type: form.frequency }),
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed"); return; }
      setShowForm(false);
      window.location.reload();
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Notification Rules</h2>
        <button onClick={() => setShowForm(!showForm)}
          style={{ background: "var(--caveo-red)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: 14 }}>
          + New Rule
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit}
          style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px", color: "#374151" }}>No-Code Rule Builder</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              WHEN (Event) *
              <select required value={form.eventId} onChange={(e) => setForm({ ...form, eventId: e.target.value })}
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}>
                <option value="">Select event…</option>
                {typedEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.module} › {ev.eventName}</option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Rule Name *
              <input required value={form.ruleName} onChange={(e) => setForm({ ...form, ruleName: e.target.value })}
                placeholder="e.g. Notify Owner on Lead Created"
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
            </label>
          </div>

          {/* Condition (IF) */}
          <div style={{ marginTop: 12, padding: "12px 16px", background: "#eff6ff", borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1d4ed8", marginBottom: 8 }}>IF (optional condition)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 1fr", gap: 8 }}>
              <input value={form.conditionField} onChange={(e) => setForm({ ...form, conditionField: e.target.value })}
                placeholder="Field (e.g. amount)"
                style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
              <select value={form.conditionOp} onChange={(e) => setForm({ ...form, conditionOp: e.target.value })}
                style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}>
                <option value="eq">equals</option>
                <option value="neq">not equals</option>
                <option value="gt">&gt;</option>
                <option value="gte">&gt;=</option>
                <option value="lt">&lt;</option>
                <option value="lte">&lt;=</option>
                <option value="contains">contains</option>
              </select>
              <input value={form.conditionValue} onChange={(e) => setForm({ ...form, conditionValue: e.target.value })}
                placeholder="Value (e.g. 5000000)"
                style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
            </div>
          </div>

          {/* Recipients (THEN notify) */}
          <div style={{ marginTop: 12, padding: "12px 16px", background: "#f0fdf4", borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#15803d", marginBottom: 8 }}>THEN Notify</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label style={{ fontSize: 13 }}>
                Recipient Type
                <select value={form.recipientType} onChange={(e) => setForm({ ...form, recipientType: e.target.value })}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}>
                  {RECIPIENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 13 }}>
                Value (Role name / User ID / etc.)
                <input value={form.recipientValue} onChange={(e) => setForm({ ...form, recipientValue: e.target.value })}
                  placeholder="e.g. Head of Sales"
                  style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
              </label>
            </div>
          </div>

          {/* Channels */}
          <div style={{ marginTop: 12, padding: "12px 16px", background: "#fef9c3", borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#713f12", marginBottom: 8 }}>CHANNEL</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CHANNELS.map((ch) => (
                <label key={ch} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.channels.includes(ch)} onChange={() => toggleChannel(ch)} />
                  {ch}
                </label>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              FREQUENCY
              <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                style={{ display: "block", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}>
                {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
              </select>
            </label>
          </div>

          {error && <div style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>{error}</div>}
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button type="submit" disabled={saving}
              style={{ background: "var(--caveo-red)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: 13 }}>
              {saving ? "Saving…" : "Create Rule"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: 13 }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {typedRules.length === 0 ? (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 40, fontSize: 14 }}>No notification rules configured yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {typedRules.map((rule) => {
            let recipient = "—";
            let channels: string[] = [];
            let frequency = "IMMEDIATE";
            try { const r = JSON.parse(rule.recipientJson); recipient = `${r.type}${r.value ? ` › ${r.value}` : ""}`; } catch { /* ok */ }
            try { const c = JSON.parse(rule.channelJson);   channels  = c.channels ?? []; } catch { /* ok */ }
            try { const f = JSON.parse(rule.frequencyJson); frequency = f.type ?? "IMMEDIATE"; } catch { /* ok */ }
            return (
              <div key={rule.id} style={{
                background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "14px 20px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{rule.ruleName}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>
                      Event: <span style={{ color: "#1e40af", fontFamily: "monospace" }}>{rule.event?.eventCode ?? `#${rule.eventId}`}</span>
                      {" · "}Notify: {recipient}
                      {" · "}Frequency: {frequency}
                    </div>
                    {channels.length > 0 && (
                      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                        {channels.map((ch) => (
                          <span key={ch} style={{ fontSize: 11, background: "#e0f2fe", color: "#0369a1", borderRadius: 4, padding: "2px 6px", fontWeight: 600 }}>{ch}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, borderRadius: 12, padding: "3px 10px",
                    background: rule.status === "active" ? "#dcfce7" : "#f3f4f6",
                    color: rule.status === "active" ? "#15803d" : "#6b7280",
                  }}>{rule.status.toUpperCase()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
