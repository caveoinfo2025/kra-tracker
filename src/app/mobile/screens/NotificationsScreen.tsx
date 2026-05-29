"use client";
import MIcon from "../components/MIcon";

interface Props {
  onBack: () => void;
}

const NOTIFICATIONS = [
  { type: "stage",  title: "Lead moved to Negotiation",  sub: "12 min ago",            icon: "trend-up", color: "var(--caveo-red)" },
  { type: "alert",  title: "Meeting scheduled for tomorrow", sub: "Calendar · Tomorrow 10:00 AM", icon: "calendar", color: "var(--infra-blue)" },
  { type: "alert",  title: "3 invoices overdue",          sub: "Collections · view breakdown",    icon: "alert",    color: "var(--caveo-red)" },
  { type: "msg",    title: "Manager approved your KRA review", sub: "KRAs · 2 hours ago",       icon: "check",    color: "var(--success)" },
  { type: "stage",  title: "Deal Closed Won 🎉",           sub: "This morning",                  icon: "check",    color: "var(--success)" },
  { type: "alert",  title: "OEM pricing needed by Thursday", sub: "Sneha flagged a blocker",    icon: "alert",    color: "var(--ot-orange)" },
  { type: "msg",    title: "New RFP arriving end-of-week", sub: "Yesterday",                     icon: "doc",      color: "var(--infra-blue)" },
];

export default function NotificationsScreen({ onBack }: Props) {
  return (
    <div className="m-screen m-screen-enter">
      <div className="m-content has-tabbar">
        {/* Navbar */}
        <div className="m-navbar">
          <button className="m-back" onClick={onBack}>
            <MIcon name="back" size={18} /> Today
          </button>
          <div style={{ flex: 1 }} />
          <button
            style={{ fontSize: 13, color: "var(--caveo-red)", fontWeight: 600, padding: 6, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            Mark all read
          </button>
        </div>

        {/* Header */}
        <div className="m-header">
          <h1 className="m-title">Notifications</h1>
          <div className="m-subtitle">{NOTIFICATIONS.length} new since yesterday</div>
        </div>

        {/* This morning */}
        <div className="m-section">
          <div className="m-section-label">This Morning</div>
          <div className="m-list">
            {NOTIFICATIONS.slice(0, 3).map((n, i) => (
              <div className="m-list-row" key={i}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: n.color, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <MIcon name={n.icon} size={16} color="#fff" />
                </div>
                <div className="row-main">
                  <div className="row-title">{n.title}</div>
                  <div className="row-sub">{n.sub}</div>
                </div>
                <MIcon name="chev" size={14} color="var(--fg-4)" />
              </div>
            ))}
          </div>
        </div>

        {/* Earlier */}
        <div className="m-section">
          <div className="m-section-label">Earlier</div>
          <div className="m-list">
            {NOTIFICATIONS.slice(3).map((n, i) => (
              <div className="m-list-row" key={i} style={{ opacity: 0.85 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: n.color, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <MIcon name={n.icon} size={16} color="#fff" />
                </div>
                <div className="row-main">
                  <div className="row-title">{n.title}</div>
                  <div className="row-sub">{n.sub}</div>
                </div>
                <MIcon name="chev" size={14} color="var(--fg-4)" />
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}
