"use client";

import { useState } from "react";

type CommEvent   = { id: number; module: string; eventCode: string; eventName: string };
type CommChannel = { id: number; channelCode: string; channelName: string };
type NotifTemplate = {
  id: number; templateName: string; subject: string | null;
  body: string; status: string;
  event: CommEvent | null; channel: CommChannel | null;
};

type Props = { templates: unknown[]; events: unknown[]; channels: unknown[] };

const VARIABLE_HINT = "Available variables: {{employee_name}}, {{event_name}}, {{date}}, {{amount}}, {{record_name}}, {{link}}, {{custom_field}}";

export default function TemplateManager({ templates, events, channels }: Props) {
  const typedTemplates = templates as NotifTemplate[];
  const typedEvents    = events    as CommEvent[];
  const typedChannels  = channels  as CommChannel[];

  const [showForm, setShowForm]     = useState(false);
  const [preview, setPreview]       = useState<NotifTemplate | null>(null);
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    templateName: "", eventId: "", channelId: "", channelCode: "",
    subject: "", body: "", status: "active",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  function insertVariable(varName: string) {
    setForm((f) => ({ ...f, body: f.body + `{{${varName}}}` }));
  }

  function renderPreview(template: string, vars: Record<string, string>) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
  }

  function extractVariables(template: string): string[] {
    const matches = template.matchAll(/\{\{(\w+)\}\}/g);
    return [...new Set([...matches].map((m) => m[1]))];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const body: Record<string, unknown> = {
        templateName: form.templateName,
        channelCode:  form.channelCode,
        body: form.body,
        status:       form.status,
      };
      if (form.eventId)   body.eventId   = Number(form.eventId);
      if (form.channelId) body.channelId = Number(form.channelId);
      if (form.subject)   body.subject   = form.subject;
      const res = await fetch("/api/admin/communication/templates", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed"); return; }
      setShowForm(false);
      window.location.reload();
    } finally { setSaving(false); }
  }

  const CHANNEL_COLORS: Record<string, string> = {
    IN_APP: "#6366f1", EMAIL: "#0ea5e9", SMS: "#22c55e", WHATSAPP: "#25d366", TEAMS: "#6264a7",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Notification Templates</h2>
        <button onClick={() => setShowForm(!showForm)}
          style={{ background: "var(--caveo-red)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: 14 }}>
          + New Template
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit}
          style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px", color: "#374151" }}>Template Editor</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Template Name *
              <input required value={form.templateName} onChange={(e) => setForm({ ...form, templateName: e.target.value })}
                placeholder="Lead Created — In-App"
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
            </label>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Event (optional)
              <select value={form.eventId} onChange={(e) => setForm({ ...form, eventId: e.target.value })}
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}>
                <option value="">Any / unlinked</option>
                {typedEvents.map((ev) => <option key={ev.id} value={ev.id}>{ev.module} › {ev.eventName}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Channel *
              <select required value={form.channelCode}
                onChange={(e) => {
                  const ch = typedChannels.find((c) => c.channelCode === e.target.value);
                  setForm({ ...form, channelCode: e.target.value, channelId: ch ? String(ch.id) : "" });
                }}
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}>
                <option value="">Select channel…</option>
                {typedChannels.map((ch) => <option key={ch.id} value={ch.channelCode}>{ch.channelName}</option>)}
              </select>
            </label>
          </div>

          {/* Subject (email only) */}
          {(form.channelCode === "EMAIL") && (
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginTop: 12 }}>
              Subject *
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="New lead assigned: {{record_name}}"
                style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
            </label>
          )}

          {/* Quick-insert variables */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Quick insert:</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {["employee_name","event_name","date","amount","record_name","link"].map((v) => (
                <button key={v} type="button" onClick={() => insertVariable(v)}
                  style={{ fontSize: 11, padding: "2px 8px", border: "1px solid #d1d5db", borderRadius: 4, background: "#fff", cursor: "pointer", fontFamily: "monospace" }}>
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginTop: 12 }}>
            Body Template *
            <textarea required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={5} placeholder={`Hi {{employee_name}}, a new lead has been created. View: {{link}}`}
              style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, fontFamily: "monospace", resize: "vertical" }} />
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{VARIABLE_HINT}</div>
          </label>

          {error && <div style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>{error}</div>}
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button type="submit" disabled={saving}
              style={{ background: "var(--caveo-red)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: 13 }}>
              {saving ? "Saving…" : "Save Template"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: 13 }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Preview modal */}
      {preview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 600, width: "90%", maxHeight: "80vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Template Preview</h3>
              <button onClick={() => setPreview(null)} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>×</button>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>Fill preview variables:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              {extractVariables(preview.body).map((v) => (
                <label key={v} style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "monospace", color: "#6366f1", width: 160, flexShrink: 0 }}>{`{{${v}}}`}</span>
                  <input value={previewVars[v] ?? ""} onChange={(e) => setPreviewVars({ ...previewVars, [v]: e.target.value })}
                    placeholder={`value for ${v}`}
                    style={{ flex: 1, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
                </label>
              ))}
            </div>
            {preview.subject && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Subject</div>
                <div style={{ fontSize: 13, padding: "8px 12px", background: "#f9fafb", borderRadius: 6, marginTop: 4 }}>
                  {renderPreview(preview.subject, previewVars)}
                </div>
              </div>
            )}
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Body</div>
            <div style={{ fontSize: 13, padding: "12px", background: "#f9fafb", borderRadius: 6, whiteSpace: "pre-wrap", fontFamily: preview.channel?.channelCode === "IN_APP" ? "inherit" : "monospace" }}>
              {renderPreview(preview.body, previewVars)}
            </div>
          </div>
        </div>
      )}

      {typedTemplates.length === 0 ? (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 40, fontSize: 14 }}>No templates yet. Create one or run the seed script.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {typedTemplates.map((t) => (
            <div key={t.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "14px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, background: CHANNEL_COLORS[t.channel?.channelCode ?? ""] ?? "#6b7280",
                      color: "#fff", borderRadius: 4, padding: "2px 6px",
                    }}>{t.channel?.channelCode ?? "—"}</span>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{t.templateName}</span>
                  </div>
                  {t.event && (
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>
                      Event: <span style={{ fontFamily: "monospace", color: "#1e40af" }}>{t.event.eventCode}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 500 }}>
                    {t.body.substring(0, 100)}{t.body.length > 100 ? "…" : ""}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => { setPreview(t); setPreviewVars({}); }}
                    style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #d1d5db", borderRadius: 4, background: "#fff", cursor: "pointer" }}>
                    Preview
                  </button>
                  <span style={{
                    fontSize: 11, fontWeight: 600, borderRadius: 12, padding: "3px 10px",
                    background: t.status === "active" ? "#dcfce7" : "#f3f4f6",
                    color: t.status === "active" ? "#15803d" : "#6b7280",
                  }}>{t.status.toUpperCase()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
