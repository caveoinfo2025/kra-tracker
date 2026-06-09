"use client";

type Channel = { id: number; channelName: string; channelCode: string; status: string };

type Props = {
  events:      unknown[];
  rules:       unknown[];
  queueCounts: Record<string, number>;
  channels:    unknown[];
};

export default function CommunicationDashboard({ events, rules, queueCounts, channels }: Props) {
  const typedChannels = channels as Channel[];
  const activeChannels = typedChannels.filter((c) => c.status === "active");

  const stats = [
    { label: "Active Events",           value: (events as { status: string }[]).filter((e) => e.status === "active").length, color: "#6366f1" },
    { label: "Active Rules",            value: (rules  as { status: string }[]).filter((r) => r.status === "active").length, color: "#0ea5e9" },
    { label: "Pending Notifications",   value: queueCounts["PENDING"]  ?? 0, color: "#f59e0b" },
    { label: "Failed Deliveries",       value: queueCounts["FAILED"]   ?? 0, color: "#ef4444" },
  ];

  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
            padding: 20, borderLeft: `4px solid ${s.color}`,
          }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Channel status panel */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 16px" }}>Channel Status</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
          {typedChannels.map((ch) => (
            <div key={ch.id} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 14px", borderRadius: 8,
              background: ch.status === "active" ? "#f0fdf4" : "#f9fafb",
              border: `1px solid ${ch.status === "active" ? "#bbf7d0" : "#e5e7eb"}`,
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                background: ch.status === "active" ? "#22c55e" : "#9ca3af",
                flexShrink: 0,
              }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{ch.channelName}</div>
                <div style={{ fontSize: 11, color: ch.status === "active" ? "#15803d" : "#9ca3af", textTransform: "uppercase" }}>
                  {ch.status}
                </div>
              </div>
            </div>
          ))}
        </div>
        {activeChannels.length === 0 && (
          <div style={{ marginTop: 12, fontSize: 13, color: "#9ca3af" }}>
            Only IN_APP is active by default. Configure other channels to enable email/SMS/WhatsApp.
          </div>
        )}
      </div>
    </div>
  );
}
