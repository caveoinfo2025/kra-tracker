"use client";

import { useState } from "react";
import { GitBranch } from "lucide-react";
import WorkflowRulePanel  from "./components/WorkflowRulePanel";
import WorkflowDesigner   from "./components/WorkflowDesigner";
import DelegationManager  from "./components/DelegationManager";
import EscalationManager  from "./components/EscalationManager";
import WorkflowAudit      from "./components/WorkflowAudit";

interface Props {
  canEdit:    boolean;
  engineCaps: {
    isManager:   boolean;
    isOpsHead:   boolean;
    currentUser: string;
  };
}

type Tab = "workflows" | "designer" | "delegation" | "escalation" | "audit";

const TABS: { key: Tab; label: string }[] = [
  { key: "workflows",  label: "Workflows"  },
  { key: "designer",   label: "Designer"   },
  { key: "delegation", label: "Delegation" },
  { key: "escalation", label: "Escalation" },
  { key: "audit",      label: "Audit"      },
];

export default function WorkflowCenter({ canEdit, engineCaps: _caps }: Props) {
  const [tab, setTab] = useState<Tab>("workflows");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ background: "rgba(200,16,46,0.1)", borderRadius: 8, padding: 8 }}>
          <GitBranch size={20} color="var(--caveo-red)" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Workflow Engine</div>
          <div style={{ fontSize: 13, color: "var(--fg-4)" }}>Configure multi-level approval workflows, delegation rules and escalation policies</div>
        </div>
        {!canEdit && (
          <span style={{ marginLeft: "auto", background: "var(--bg-muted)", borderRadius: 4, padding: "3px 10px", fontSize: 12, color: "var(--fg-4)" }}>View Only</span>
        )}
      </div>

      {/* Tab strip */}
      <div className="seg-control" style={{ marginBottom: 24 }}>
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "workflows"  && <WorkflowRulePanel canEdit={canEdit} />}
      {tab === "designer"   && <WorkflowDesigner  canEdit={canEdit} />}
      {tab === "delegation" && <DelegationManager canEdit={canEdit} />}
      {tab === "escalation" && <EscalationManager canEdit={canEdit} />}
      {tab === "audit"      && <WorkflowAudit />}
    </div>
  );
}
