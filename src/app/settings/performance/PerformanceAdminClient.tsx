"use client";

import { useState } from "react";
import PerformanceDashboard from "./components/PerformanceDashboard";
import PerformanceCalendar from "./components/PerformanceCalendar";
import KRALibrary from "./components/KRALibrary";
import KRATemplateManager from "./components/KRATemplateManager";
import TargetManager from "./components/TargetManager";
import TeamTargetManager from "./components/TeamTargetManager";
import ReviewWorkflowManager from "./components/ReviewWorkflowManager";
import PerformanceAudit from "./components/PerformanceAudit";
import DailyActivityKraMapping from "./components/DailyActivityKraMapping";

type Tab =
  | "overview"
  | "calendar"
  | "kra-library"
  | "templates"
  | "targets"
  | "team-targets"
  | "daily-activity-kra"
  | "reviews"
  | "audit";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "calendar", label: "Performance Calendar" },
  { key: "kra-library", label: "KRA Library" },
  { key: "daily-activity-kra", label: "Daily Activity KRA" },
  { key: "templates", label: "KRA Templates" },
  { key: "targets", label: "Employee Targets" },
  { key: "team-targets", label: "Team Targets" },
  { key: "reviews", label: "Review Workflow" },
  { key: "audit", label: "Audit" },
];

type Props = {
  initialPeriods: unknown[];
  initialMetrics: unknown[];
  initialTemplates: unknown[];
  initialEmployeeTargets: unknown[];
  initialTeamTargets: unknown[];
  initialDailyActivityMetrics: unknown[];
  initialEmployeeProfiles: unknown[];
};

export default function PerformanceAdminClient({
  initialPeriods,
  initialMetrics,
  initialTemplates,
  initialEmployeeTargets,
  initialTeamTargets,
  initialDailyActivityMetrics,
  initialEmployeeProfiles,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--caveo-red)" }}>
          Performance Management Engine
        </h1>
        <p style={{ margin: "4px 0 0", color: "#666", fontSize: 14 }}>
          KRA templates, performance periods, targets, achievement tracking and review workflows
        </p>
      </div>

      {/* Tabs — wrap so no tab (e.g. Daily Activity KRA) hides behind horizontal overflow */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "2px solid #e5e7eb",
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "8px 16px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? "var(--caveo-red)" : "#6b7280",
              borderBottom: activeTab === tab.key ? "2px solid var(--caveo-red)" : "2px solid transparent",
              marginBottom: -2,
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <PerformanceDashboard
          periods={initialPeriods}
          metrics={initialMetrics}
          templates={initialTemplates}
          employeeTargets={initialEmployeeTargets}
        />
      )}
      {activeTab === "calendar" && <PerformanceCalendar periods={initialPeriods} />}
      {activeTab === "kra-library" && <KRALibrary metrics={initialMetrics} />}
      {activeTab === "templates" && (
        <KRATemplateManager templates={initialTemplates} metrics={initialMetrics} />
      )}
      {activeTab === "targets" && (
        <TargetManager
          employeeTargets={initialEmployeeTargets}
          periods={initialPeriods}
          templates={initialTemplates}
          employeeProfiles={initialEmployeeProfiles}
        />
      )}
      {activeTab === "team-targets" && (
        <TeamTargetManager teamTargets={initialTeamTargets} periods={initialPeriods} />
      )}
      {activeTab === "daily-activity-kra" && (
        <DailyActivityKraMapping metrics={initialDailyActivityMetrics} />
      )}
      {activeTab === "reviews" && <ReviewWorkflowManager />}
      {activeTab === "audit" && <PerformanceAudit />}
    </div>
  );
}
