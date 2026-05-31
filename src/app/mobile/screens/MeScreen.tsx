"use client";
import MIcon from "../components/MIcon";

interface Props {
  userName: string;
  userEmail: string;
  isManager: boolean;
  employeeId: number;
  onKRAs: () => void;
}

const AVATAR_COLORS = ["#5B626C","#0046B0","#B05000","#1F7A3F","#2A2A55","#702D5B"];

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function MeScreen({ userName, userEmail, isManager, employeeId, onKRAs }: Props) {
  const menuItems = [
    { icon: "target", label: "My KRAs", sub: "Targets & progress tracking", action: onKRAs, show: !isManager },
    { icon: "calendar", label: "My Schedule", sub: "Today's calls & meetings", action: () => {} },
    { icon: "doc", label: "Proposals & Quotes", sub: "Docs you've sent this month", action: () => {} },
    { icon: "shield", label: "Pipeline Tasks", sub: "Open follow-ups & actions", action: () => {} },
  ].filter(m => m.show !== false);

  const managerItems = isManager ? [
    { icon: "user", label: "Team Overview", sub: "View team pipeline & KRAs", action: () => {} },
    { icon: "trend-up", label: "Team KRAs", sub: "Review team performance", action: () => {} },
  ] : [];

  return (
    <div className="m-screen">
      <div className="m-content has-tabbar">
        {/* Navbar */}
        <div className="m-navbar">
          <div style={{ width: 36 }} />
          <div className="m-nav-title">Me</div>
          <div style={{ width: 36 }} />
        </div>

        {/* Profile card */}
        <div className="m-section" style={{ marginTop: 8 }}>
          <div className="m-card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              className="m-avatar lg"
              style={{
                background: AVATAR_COLORS[employeeId % AVATAR_COLORS.length],
                width: 56, height: 56, fontSize: 18,
              }}
            >
              {initials(userName)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>
                {userName}
              </div>
              <div style={{ fontSize: 12, color: "var(--caveo-red)", fontWeight: 600, marginTop: 2 }}>
                {isManager ? "Manager" : "Sales Executive"}
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 1 }}>{userEmail}</div>
            </div>
          </div>
        </div>

        {/* Menu items */}
        {menuItems.length > 0 && (
          <div className="m-section">
            <div className="m-section-label">Quick Access</div>
            <div className="m-list">
              {menuItems.map(item => (
                <button
                  key={item.label}
                  className="m-list-row"
                  style={{ width: "100%", textAlign: "left" }}
                  onClick={item.action}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "rgba(200, 16, 46, 0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <MIcon name={item.icon} size={17} color="var(--caveo-red)" />
                  </div>
                  <div className="row-main">
                    <div className="row-title">{item.label}</div>
                    <div className="row-sub">{item.sub}</div>
                  </div>
                  <MIcon name="chev" size={14} color="var(--fg-4)" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manager section */}
        {managerItems.length > 0 && (
          <div className="m-section">
            <div className="m-section-label">Manager View</div>
            <div className="m-list">
              {managerItems.map(item => (
                <button
                  key={item.label}
                  className="m-list-row"
                  style={{ width: "100%", textAlign: "left" }}
                  onClick={item.action}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "rgba(0, 102, 255, 0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <MIcon name={item.icon} size={17} color="var(--infra-blue)" />
                  </div>
                  <div className="row-main">
                    <div className="row-title">{item.label}</div>
                    <div className="row-sub">{item.sub}</div>
                  </div>
                  <MIcon name="chev" size={14} color="var(--fg-4)" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="m-section">
          <div className="m-section-label">Account</div>
          <div className="m-list">
            <div className="m-list-row">
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "var(--bg-muted)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <MIcon name="bell" size={17} color="var(--fg-3)" />
              </div>
              <div className="row-main">
                <div className="row-title">Notifications</div>
                <div className="row-sub">Manage alerts & reminders</div>
              </div>
              <MIcon name="chev" size={14} color="var(--fg-4)" />
            </div>
            <a
              href="/dashboard"
              className="m-list-row"
              style={{ textDecoration: "none" }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "var(--bg-muted)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <MIcon name="pipeline" size={17} color="var(--fg-3)" />
              </div>
              <div className="row-main">
                <div className="row-title" style={{ color: "var(--fg-1)" }}>Open Desktop View</div>
                <div className="row-sub">Switch to the full web app</div>
              </div>
              <MIcon name="chev" size={14} color="var(--fg-4)" />
            </a>
          </div>
        </div>

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}
