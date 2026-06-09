"use client";

import { useState } from "react";
import CommunicationDashboard from "./components/CommunicationDashboard";
import EventRegistry          from "./components/EventRegistry";
import NotificationRuleManager from "./components/NotificationRuleManager";
import TemplateManager        from "./components/TemplateManager";
import ChannelManager         from "./components/ChannelManager";
import DeliveryLogs           from "./components/DeliveryLogs";
import CommunicationAuditView from "./components/CommunicationAudit";

type Tab = "overview" | "events" | "rules" | "templates" | "channels" | "logs" | "audit";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview",   label: "Overview"        },
  { key: "events",     label: "Events"          },
  { key: "rules",      label: "Rules"           },
  { key: "templates",  label: "Templates"       },
  { key: "channels",   label: "Channels"        },
  { key: "logs",       label: "Delivery Logs"   },
  { key: "audit",      label: "Audit"           },
];

type Props = {
  initialEvents:    unknown[];
  initialChannels:  unknown[];
  initialTemplates: unknown[];
  initialRules:     unknown[];
  initialQueue:     unknown[];
  queueCounts:      Record<string, number>;
};

export default function CommunicationAdminClient({
  initialEvents,
  initialChannels,
  initialTemplates,
  initialRules,
  initialQueue,
  queueCounts,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--caveo-red)" }}>
          Communication Center
        </h1>
        <p style={{ margin: "4px 0 0", color: "#666", fontSize: 14 }}>
          Event registry, notification rules, templates, channels and delivery logs
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 4, borderBottom: "2px solid #e5e7eb",
        marginBottom: 24, overflowX: "auto",
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "8px 16px", border: "none", background: "none",
              cursor: "pointer", fontSize: 14, whiteSpace: "nowrap",
              fontWeight: activeTab === tab.key ? 600 : 400,
              color:      activeTab === tab.key ? "var(--caveo-red)" : "#6b7280",
              borderBottom: activeTab === tab.key ? "2px solid var(--caveo-red)" : "2px solid transparent",
              marginBottom: -2,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview"  && (
        <CommunicationDashboard
          events={initialEvents}
          rules={initialRules}
          queueCounts={queueCounts}
          channels={initialChannels}
        />
      )}
      {activeTab === "events"    && <EventRegistry    events={initialEvents}   />}
      {activeTab === "rules"     && <NotificationRuleManager rules={initialRules} events={initialEvents} />}
      {activeTab === "templates" && <TemplateManager  templates={initialTemplates} events={initialEvents} channels={initialChannels} />}
      {activeTab === "channels"  && <ChannelManager   channels={initialChannels} />}
      {activeTab === "logs"      && <DeliveryLogs     queue={initialQueue} />}
      {activeTab === "audit"     && <CommunicationAuditView />}
    </div>
  );
}
