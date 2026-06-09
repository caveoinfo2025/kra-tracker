"use client";

import { useState } from "react";

type CommChannel = {
  id: number; channelCode: string; channelName: string;
  description: string | null; status: string;
  // configJson intentionally OMITTED — never sent to frontend
};

type Props = { channels: unknown[] };

const CHANNEL_ICONS: Record<string, string> = {
  IN_APP: "🔔", EMAIL: "📧", SMS: "💬", WHATSAPP: "📱", TEAMS: "💼",
};

const ENV_VAR_EXAMPLES: Record<string, string[]> = {
  EMAIL:     ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"],
  SMS:       ["SMS_API_KEY", "SMS_SENDER_ID", "SMS_PROVIDER"],
  WHATSAPP:  ["WHATSAPP_API_KEY", "WHATSAPP_PHONE_ID", "WHATSAPP_BUSINESS_ACCOUNT_ID"],
  TEAMS:     ["TEAMS_WEBHOOK_URL"],
  IN_APP:    [],
};

export default function ChannelManager({ channels }: Props) {
  const typedChannels = channels as CommChannel[];
  const [editId, setEditId]     = useState<number | null>(null);
  const [configKeys, setConfigKeys] = useState<Record<string, string>>({});
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [message, setMessage]   = useState("");

  function startEdit(ch: CommChannel) {
    setEditId(ch.id);
    setConfigKeys({});
    setError(""); setMessage("");
  }

  function setKeyValue(key: string, value: string) {
    setConfigKeys((prev) => ({ ...prev, [key]: value }));
  }

  async function saveChannel(ch: CommChannel, newStatus?: string) {
    setSaving(true); setError(""); setMessage("");
    try {
      // configJson stores only env var KEY REFERENCES — never raw secrets
      const configJson = Object.keys(configKeys).length > 0
        ? JSON.stringify(
            Object.fromEntries(
              Object.entries(configKeys).map(([k, v]) => [k, v.trim()])
            )
          )
        : undefined;
      const body: Record<string, unknown> = { status: newStatus ?? ch.status };
      if (configJson !== undefined) body.configJson = configJson;

      const res = await fetch(`/api/admin/communication/channels?id=${ch.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed"); return; }
      setMessage("Saved successfully.");
      setEditId(null);
      window.location.reload();
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Notification Channels</h2>
      </div>

      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#78350f" }}>
        🔒 <strong>Security:</strong> Channel configuration stores only <em>environment variable key names</em> (e.g. <code>SMTP_PASS</code>),
        never raw secrets. Add the actual values to your <code>.env</code> file on the server.
        Config keys are never returned to the frontend.
      </div>

      {error   && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {message && <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6, padding: "10px 14px", color: "#15803d", fontSize: 13, marginBottom: 12 }}>{message}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {typedChannels.map((ch) => {
          const envKeys = ENV_VAR_EXAMPLES[ch.channelCode] ?? [];
          const isEditing = editId === ch.id;
          const isInApp = ch.channelCode === "IN_APP";

          return (
            <div key={ch.id} style={{
              background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
              overflow: "hidden",
            }}>
              {/* Channel header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{CHANNEL_ICONS[ch.channelCode] ?? "📡"}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{ch.channelName}</div>
                    {ch.description && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{ch.description}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {/* Toggle active/inactive */}
                  <button
                    onClick={() => saveChannel(ch, ch.status === "active" ? "inactive" : "active")}
                    disabled={saving || isInApp}
                    title={isInApp ? "IN_APP is always active" : undefined}
                    style={{
                      fontSize: 12, padding: "5px 12px", borderRadius: 12, border: "none",
                      background: ch.status === "active" ? "#dcfce7" : "#f3f4f6",
                      color: ch.status === "active" ? "#15803d" : "#6b7280",
                      cursor: isInApp ? "default" : "pointer", fontWeight: 600,
                    }}>
                    {ch.status === "active" ? "Active" : "Inactive"}
                  </button>
                  {!isInApp && (
                    <button
                      onClick={() => isEditing ? setEditId(null) : startEdit(ch)}
                      style={{ fontSize: 12, padding: "5px 14px", border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", cursor: "pointer" }}>
                      {isEditing ? "Cancel" : "Configure"}
                    </button>
                  )}
                </div>
              </div>

              {/* Config panel */}
              {isEditing && (
                <div style={{ borderTop: "1px solid #e5e7eb", padding: "16px 20px", background: "#f9fafb" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 12 }}>
                    Environment Variable Keys
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
                    Enter only the <strong>key name</strong> of the environment variable — not the value.
                    The server reads <code>process.env[keyName]</code> at send time.
                  </div>

                  {envKeys.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#9ca3af" }}>No configuration required for this channel.</div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {envKeys.map((key) => (
                        <label key={key} style={{ fontSize: 13, fontWeight: 500 }}>
                          {key}
                          <input
                            value={configKeys[key] ?? ""}
                            onChange={(e) => setKeyValue(key, e.target.value)}
                            placeholder={key}
                            style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, fontFamily: "monospace" }} />
                        </label>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                    <button onClick={() => saveChannel(ch)} disabled={saving}
                      style={{ background: "var(--caveo-red)", color: "#fff", border: "none", borderRadius: 6, padding: "7px 18px", cursor: "pointer", fontSize: 13 }}>
                      {saving ? "Saving…" : "Save Config"}
                    </button>
                    <button onClick={() => saveChannel(ch, ch.status === "active" ? "inactive" : "active")} disabled={saving}
                      style={{ background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, padding: "7px 18px", cursor: "pointer", fontSize: 13 }}>
                      {ch.status === "active" ? "Disable Channel" : "Enable Channel"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {typedChannels.length === 0 && (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 40, fontSize: 14 }}>
          No channels found. Run the seed script to create defaults.
        </div>
      )}
    </div>
  );
}
