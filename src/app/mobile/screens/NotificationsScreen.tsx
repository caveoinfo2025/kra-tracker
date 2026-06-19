"use client";
import { useEffect, useState } from "react";
import MIcon from "../components/MIcon";

interface Props {
  onBack: () => void;
}

type Notification = {
  id: number;
  type: string;
  title: string;
  body: string;
  link: string;
  amountLakhs: number | null;
  isRead: boolean;
  createdAt: string;
};

function iconFor(type: string) {
  switch (type) {
    case "payment": return { icon: "check", color: "var(--success)" };
    case "advance": return { icon: "trend-up", color: "var(--infra-blue)" };
    default:        return { icon: "bell", color: "var(--caveo-red)" };
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function NotificationsScreen({ onBack }: Props) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => { setItems(Array.isArray(d.notifications) ? d.notifications : []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    }).catch(() => {});
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  const unread = items.filter((n) => !n.isRead).length;

  return (
    <div className="m-screen m-screen-enter">
      <div className="m-content has-tabbar">
        {/* Navbar */}
        <div className="m-navbar">
          <button className="m-back" onClick={onBack}>
            <MIcon name="back" size={18} /> Today
          </button>
          <div style={{ flex: 1 }} />
          {unread > 0 && (
            <button
              onClick={markAllRead}
              style={{ fontSize: 13, color: "var(--caveo-red)", fontWeight: 600, padding: 6, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Header */}
        <div className="m-header">
          <h1 className="m-title">Notifications</h1>
          <div className="m-subtitle">
            {loading ? "Loading…" : unread > 0 ? `${unread} unread` : "All caught up"}
          </div>
        </div>

        <div className="m-section">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="m-card" style={{ marginBottom: 8 }}>
                <div className="m-skeleton" style={{ height: 14, width: "70%", marginBottom: 8 }} />
                <div className="m-skeleton" style={{ height: 11, width: "40%" }} />
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="m-empty">
              <div className="m-empty-title">No notifications</div>
              <div className="m-empty-sub">Payment and deal updates will show up here.</div>
            </div>
          ) : (
            <div className="m-list">
              {items.map((n) => {
                const cfg = iconFor(n.type);
                return (
                  <div
                    key={n.id}
                    className="m-list-row"
                    style={{ background: n.isRead ? undefined : "rgba(200,16,46,0.03)" }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <MIcon name={cfg.icon} size={17} color={cfg.color} />
                    </div>
                    <div className="row-main">
                      <div className="row-title" style={{ fontWeight: n.isRead ? 500 : 700 }}>{n.title}</div>
                      {n.body && <div className="row-sub">{n.body}</div>}
                      <div style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 2 }}>{timeAgo(n.createdAt)}</div>
                    </div>
                    {!n.isRead && (
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--caveo-red)", flexShrink: 0, alignSelf: "center" }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}
