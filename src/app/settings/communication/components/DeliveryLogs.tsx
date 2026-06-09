"use client";

import { useState, useMemo } from "react";

type QueueItem = {
  id: number; status: string; channel: string; priority: number;
  createdAt: string; processedAt: string | null; errorMessage: string | null;
  event: { eventCode: string; eventName: string } | null;
  template: { templateName: string } | null;
  recipientJson: string;
};

type Props = { queue: unknown[] };

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDING:   { bg: "#fef9c3", color: "#713f12" },
  SENT:      { bg: "#dcfce7", color: "#15803d" },
  FAILED:    { bg: "#fef2f2", color: "#dc2626" },
  CANCELLED: { bg: "#f3f4f6", color: "#6b7280" },
};

const CHANNEL_COLORS: Record<string, string> = {
  IN_APP: "#6366f1", EMAIL: "#0ea5e9", SMS: "#22c55e", WHATSAPP: "#25d366", TEAMS: "#6264a7",
};

export default function DeliveryLogs({ queue }: Props) {
  const typedQueue = queue as QueueItem[];

  const [channelFilter, setChannelFilter] = useState("");
  const [statusFilter,  setStatusFilter]  = useState("");
  const [search,        setSearch]        = useState("");

  const filtered = useMemo(() => {
    return typedQueue.filter((item) => {
      if (channelFilter && item.channel  !== channelFilter) return false;
      if (statusFilter  && item.status   !== statusFilter)  return false;
      if (search) {
        const s = search.toLowerCase();
        const eventMatch    = item.event?.eventCode?.toLowerCase().includes(s) || item.event?.eventName?.toLowerCase().includes(s);
        const templateMatch = item.template?.templateName?.toLowerCase().includes(s);
        const recipientMatch = item.recipientJson.toLowerCase().includes(s);
        if (!eventMatch && !templateMatch && !recipientMatch) return false;
      }
      return true;
    });
  }, [typedQueue, channelFilter, statusFilter, search]);

  const channels = [...new Set(typedQueue.map((i) => i.channel))];
  const statuses  = [...new Set(typedQueue.map((i) => i.status))];

  function parseRecipient(json: string): string {
    try {
      const r = JSON.parse(json);
      if (r.employeeId) return `Employee #${r.employeeId}`;
      if (r.type)       return `${r.type}${r.value ? ` › ${r.value}` : ""}`;
      return json;
    } catch { return json; }
  }

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
          Delivery Logs
          <span style={{ fontSize: 13, fontWeight: 400, color: "#9ca3af", marginLeft: 8 }}>
            ({filtered.length} of {typedQueue.length})
          </span>
        </h2>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search event / template / recipient…"
          style={{ flex: 1, minWidth: 200, padding: "7px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }} />
        <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}
          style={{ padding: "7px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}>
          <option value="">All channels</option>
          {channels.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "7px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}>
          <option value="">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {(channelFilter || statusFilter || search) && (
          <button onClick={() => { setChannelFilter(""); setStatusFilter(""); setSearch(""); }}
            style={{ padding: "7px 14px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, cursor: "pointer", background: "#fff" }}>
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 60, fontSize: 14 }}>
          No delivery logs match the current filters.
        </div>
      ) : (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#374151" }}>ID</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Event</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Channel</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Recipient</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Template</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Status</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Created</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Processed</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => {
                const sc = STATUS_COLORS[item.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
                return (
                  <tr key={item.id}
                    style={{ borderBottom: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}
                    title={item.errorMessage ?? undefined}>
                    <td style={{ padding: "10px 14px", color: "#9ca3af", fontFamily: "monospace" }}>#{item.id}</td>
                    <td style={{ padding: "10px 14px" }}>
                      {item.event ? (
                        <div>
                          <div style={{ fontFamily: "monospace", color: "#1e40af", fontSize: 12 }}>{item.event.eventCode}</div>
                          <div style={{ color: "#6b7280", fontSize: 11 }}>{item.event.eventName}</div>
                        </div>
                      ) : <span style={{ color: "#9ca3af" }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        background: CHANNEL_COLORS[item.channel] ?? "#6b7280",
                        color: "#fff", borderRadius: 4, padding: "2px 6px",
                      }}>{item.channel}</span>
                    </td>
                    <td style={{ padding: "10px 14px", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {parseRecipient(item.recipientJson)}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#374151" }}>
                      {item.template?.templateName ?? <span style={{ color: "#9ca3af" }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 12, padding: "3px 10px", background: sc.bg, color: sc.color }}>
                        {item.status}
                      </span>
                      {item.errorMessage && (
                        <div style={{ fontSize: 11, color: "#ef4444", marginTop: 3, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.errorMessage}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#6b7280", whiteSpace: "nowrap" }}>{formatDate(item.createdAt)}</td>
                    <td style={{ padding: "10px 14px", color: "#6b7280", whiteSpace: "nowrap" }}>{formatDate(item.processedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
