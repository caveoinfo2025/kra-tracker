"use client";
import MIcon from "../components/MIcon";
import MobileHeader from "@/components/mobile/MobileHeader";
import MobileAppShell from "@/components/mobile/MobileAppShell";
import { mockProfile } from "../mock-data";

interface ProfileScreenProps {
  userName: string;
  userEmail: string;
  isManager: boolean;
  onKra: () => void;
  onSignOut: () => void;
}

export default function ProfileScreen({ userName, userEmail, isManager, onKra, onSignOut }: ProfileScreenProps) {
  const p = mockProfile;
  const initials = userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="m-screen">
      <MobileHeader variant="shell" roleBadge={isManager ? "MANAGER" : "EMPLOYEE"} />
      <MobileAppShell hasBottomNav hasHeader>
        <div className="m-section" style={{ marginTop: 14 }}>
          <div className="m-card" style={{ borderTop: "3px solid var(--caveo-red)", textAlign: "center", padding: "22px 16px" }}>
            <span className="m-avatar" style={{ width: 64, height: 64, fontSize: 22, margin: "0 auto" }}>{initials}</span>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, marginTop: 12 }}>{userName}</div>
            <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--fg-3)", marginTop: 2 }}>ID: {p.employeeId}</div>
            <div style={{ fontSize: 12.5, color: "var(--fg-3)", marginTop: 4 }}>
              {p.role} · {p.department}
            </div>
          </div>
        </div>

        <div className="m-section">
          <div className="m-card">
            <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-3)", margin: "0 0 10px" }}>
              Org structure
            </h4>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="m-avatar sm">{p.reportingManager.split(" ").map((n) => n[0]).join("")}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.reportingManager}</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>Reporting manager</div>
              </div>
            </div>
          </div>
        </div>

        <div className="m-section">
          <div className="m-list">
            <div className="m-list-row" style={{ cursor: "default" }}>
              <MIcon name="mail" size={15} color="var(--fg-3)" />
              <div className="row-main"><div className="row-sub">{userEmail}</div></div>
            </div>
            <div className="m-list-row" style={{ cursor: "default" }}>
              <MIcon name="phone" size={15} color="var(--fg-3)" />
              <div className="row-main"><div className="row-sub">{p.phone}</div></div>
            </div>
          </div>
        </div>

        <div className="m-section">
          <div className="m-list">
            <div className="m-list-row" onClick={onKra}>
              <MIcon name="target" size={15} color="var(--fg-3)" />
              <div className="row-main row-title">KRA performance</div>
              <MIcon name="chev" size={15} color="var(--fg-4)" />
            </div>
            {p.preferences.map((pref, i) => (
              <div
                className="m-list-row"
                key={i}
                onClick={pref.label === "Sign out" ? onSignOut : undefined}
                style={{ color: pref.label === "Sign out" ? "var(--caveo-red)" : undefined }}
              >
                <MIcon name={pref.icon} size={15} color={pref.label === "Sign out" ? "var(--caveo-red)" : "var(--fg-3)"} />
                <div className="row-main row-title" style={{ color: pref.label === "Sign out" ? "var(--caveo-red)" : undefined }}>
                  {pref.label}
                </div>
                <MIcon name="chev" size={15} color="var(--fg-4)" />
              </div>
            ))}
          </div>
        </div>
      </MobileAppShell>
    </div>
  );
}
