"use client";
import type { CSSProperties } from "react";
import MobileHeader from "@/components/mobile/MobileHeader";
import MobileAppShell from "@/components/mobile/MobileAppShell";
import MobileKpiCard from "@/components/mobile/MobileKpiCard";
import MobileInsightCard from "@/components/mobile/MobileInsightCard";
import MobileQuickActionButton from "@/components/mobile/MobileQuickActionButton";
import MobileSectionHeader from "@/components/mobile/MobileSectionHeader";
import MobileTimeline from "@/components/mobile/MobileTimeline";
import { mockHomeKpis, mockHomeActivity } from "../mock-data";

interface HomeScreenProps {
  userName: string;
  isManager: boolean;
  onNotifications: () => void;
  onAttendance: () => void;
  onDailyUpdates: () => void;
  onApprovals: () => void;
  onKra: () => void;
}

export default function HomeScreen({
  userName,
  isManager,
  onNotifications,
  onAttendance,
  onDailyUpdates,
  onApprovals,
  onKra,
}: HomeScreenProps) {
  const firstName = userName.split(" ")[0];

  const quickActions = [
    { icon: "fingerprint", label: "Attendance", onClick: onAttendance },
    { icon: "doc", label: "Daily update", onClick: onDailyUpdates },
    { icon: "target", label: "KRA", onClick: onKra },
    ...(isManager ? [{ icon: "shield", label: "Approvals", onClick: onApprovals }] : []),
  ];

  return (
    <div className="m-screen">
      <MobileHeader variant="shell" roleBadge={isManager ? "MANAGER" : "EMPLOYEE"} onBell={onNotifications} notificationDot />
      <MobileAppShell hasBottomNav hasHeader>
        <div className="m-header">
          <h1 className="m-title" style={{ fontSize: 24 }}>Good morning, {firstName}</h1>
          <p className="m-subtitle">
            Enterprise readiness is nominal. System performance across critical nodes remains stable within expected
            parameters.
          </p>
        </div>

        {isManager && (
          <div className="m-section">
            <MobileInsightCard
              icon="alert"
              title="Urgent approvals pending"
              description="3 critical infrastructure modification requests require immediate authorization."
              ctaLabel="Review"
              onCta={onApprovals}
            />
          </div>
        )}

        <div className="m-section">
          <MobileSectionHeader label="Today's snapshot" />
          <div className="m-kpi-row">
            {mockHomeKpis.map((kpi) => (
              <MobileKpiCard key={kpi.label} label={kpi.label} value={kpi.value} unit={kpi.unit} accent={kpi.accent ? "left" : "none"} />
            ))}
          </div>
        </div>

        <div className="m-section">
          <MobileSectionHeader label="Quick actions" />
          <div className="m-quick-grid" style={{ "--quick-grid-cols": quickActions.length } as CSSProperties}>
            {quickActions.map((action) => (
              <MobileQuickActionButton key={action.label} icon={action.icon} label={action.label} onClick={action.onClick} />
            ))}
          </div>
        </div>

        <div className="m-section">
          <div className="m-card">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, margin: "0 0 14px" }}>
              Recent activity
            </h3>
            <MobileTimeline items={mockHomeActivity} />
          </div>
        </div>
      </MobileAppShell>
    </div>
  );
}
