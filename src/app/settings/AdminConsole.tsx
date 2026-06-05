"use client";

import Link from "next/link";
import {
  Building2, ShieldCheck, GitBranch, Database,
  ScrollText, Target, ChevronRight, SlidersHorizontal,
} from "lucide-react";

interface SettingsItem {
  href:        string;
  label:       string;
  description: string;
  icon:        React.ElementType;
  iconColor:   string;
  iconBg:      string;
  status?:     "beta" | "coming-soon";
}

const SETTINGS_ITEMS: SettingsItem[] = [
  {
    href:        "/settings/organization",
    label:       "Organization",
    description: "Companies, branches, departments and teams",
    icon:        Building2,
    iconColor:   "#0066FF",
    iconBg:      "rgba(0,102,255,0.1)",
  },
  {
    href:        "/settings/identity",
    label:       "Identity & Access",
    description: "Users, roles and permissions",
    icon:        ShieldCheck,
    iconColor:   "#C8102E",
    iconBg:      "rgba(200,16,46,0.1)",
  },
  {
    href:        "/settings/crm",
    label:       "CRM Administration",
    description: "Pipelines, territories, assignment rules and automation",
    icon:        SlidersHorizontal,
    iconColor:   "#FF6B00",
    iconBg:      "rgba(255,107,0,0.1)",
  },
  {
    href:        "/settings/workflow",
    label:       "Workflow Engine",
    description: "Approval workflows, delegation and escalation",
    icon:        GitBranch,
    iconColor:   "#FF6B00",
    iconBg:      "rgba(255,107,0,0.1)",
  },
  {
    href:        "/settings/masters",
    label:       "Master Data",
    description: "Global masters, overrides and governance policies",
    icon:        Database,
    iconColor:   "#0066FF",
    iconBg:      "rgba(0,102,255,0.1)",
  },
  {
    href:        "/settings/policies",
    label:       "Policy Engine",
    description: "Business rules, thresholds and policy enforcement",
    icon:        ScrollText,
    iconColor:   "#C8102E",
    iconBg:      "rgba(200,16,46,0.1)",
  },
  {
    href:        "/settings/performance",
    label:       "Performance",
    description: "KRA, KPI targets and review cycles",
    icon:        Target,
    iconColor:   "#FF6B00",
    iconBg:      "rgba(255,107,0,0.1)",
  },
];

export default function AdminConsole() {
  return (
    <div style={{ maxWidth: 680, padding: "32px 32px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
          Settings
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
          Configure your CRM, workflows, masters and access controls.
        </p>
      </div>

      {/* Settings list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {SETTINGS_ITEMS.map(({ href, label, description, icon: Icon, iconColor, iconBg, status }) => (
          <Link
            key={href}
            href={href}
            style={{
              display:        "flex",
              alignItems:     "center",
              gap:            14,
              padding:        "14px 16px",
              borderRadius:   10,
              border:         "1px solid var(--border)",
              background:     "var(--card)",
              textDecoration: "none",
              color:          "inherit",
              transition:     "background 0.12s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--accent)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--card)")}
          >
            {/* Icon */}
            <div style={{
              width:        38,
              height:       38,
              borderRadius: 8,
              background:   iconBg,
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              flexShrink:   0,
            }}>
              <Icon size={18} color={iconColor} strokeWidth={1.8} />
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>
                  {label}
                </span>
                {status === "beta" && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "1px 6px",
                    borderRadius: 10, background: "rgba(255,107,0,0.12)", color: "#FF6B00",
                  }}>BETA</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                {description}
              </div>
            </div>

            {/* Arrow */}
            <ChevronRight size={15} color="var(--muted-foreground)" strokeWidth={2} style={{ flexShrink: 0 }} />
          </Link>
        ))}
      </div>
    </div>
  );
}
