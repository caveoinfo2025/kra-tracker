"use client";

import { useState } from "react";
import {
  Workflow, ApprovalRequest, DelegationRule, ApprovalCaps,
  MOCK_WORKFLOWS, MOCK_REQUESTS, MOCK_DELEGATIONS,
} from "./data";
import WorkflowSummaryCards  from "./components/WorkflowSummaryCards";
import WorkflowList          from "./components/WorkflowList";
import WorkflowWizard        from "./components/WorkflowWizard";
import ApprovalHistoryPanel  from "./components/ApprovalHistoryPanel";
import DelegationPanel       from "./components/DelegationPanel";
import ApprovalAnalytics     from "./components/ApprovalAnalytics";
import EscalationRulesPanel  from "./components/EscalationRulesPanel";
import ApprovalRulesPanel    from "./components/ApprovalRulesPanel";

interface Props { caps: ApprovalCaps }

type Tab = "overview" | "workflows" | "rules" | "delegation" | "escalation" | "audit";

const TABS: { key: Tab; label: string; guard?: (c: ApprovalCaps) => boolean }[] = [
  { key: "overview",    label: "Overview" },
  { key: "workflows",   label: "Workflows",  guard: (c) => c.canConfigureWorkflows || c.canViewAllRequests },
  { key: "rules",       label: "Rules",      guard: (c) => c.canConfigureWorkflows || c.canViewAllRequests },
  { key: "delegation",  label: "Delegation", guard: (c) => c.canDelegate || c.canManageDelegations },
  { key: "escalation",  label: "Escalation", guard: (c) => c.canConfigureWorkflows || c.canViewAllRequests },
  { key: "audit",       label: "Audit Log",  guard: (c) => c.canViewAllRequests || c.canApprove },
];

export default function ApprovalEngineClient({ caps }: Props) {
  const [workflows,   setWorkflows]   = useState<Workflow[]>(MOCK_WORKFLOWS);
  const [requests,    setRequests]    = useState<ApprovalRequest[]>(MOCK_REQUESTS);
  const [delegations, setDelegations] = useState<DelegationRule[]>(MOCK_DELEGATIONS);

  const [tab,   setTab]   = useState<Tab>("overview");
  const [wizard, setWizard] = useState<{ workflow?: Workflow } | null>(null);

  const visibleTabs = TABS.filter((t) => !t.guard || t.guard(caps));

  /* ── Workflow CRUD ── */
  function handleCreate() { setWizard({}); }
  function handleEdit(w: Workflow) { setWizard({ workflow: w }); }
  function handleClone(w: Workflow) {
    const clone: Workflow = {
      ...w, id: Date.now(), name: `${w.name} (Copy)`,
      status: "Draft", version: 1, pendingCount: 0,
      createdAt: "2026-06-04", updatedAt: "2026-06-04",
    };
    setWorkflows((ws) => [...ws, clone]);
  }
  function handleToggle(w: Workflow) {
    setWorkflows((ws) =>
      ws.map((x) => x.id === w.id ? { ...x, status: x.status === "Active" ? "Inactive" : "Active" } : x)
    );
  }
  function handleSaveWorkflow(w: Workflow) {
    setWorkflows((ws) => {
      const idx = ws.findIndex((x) => x.id === w.id);
      if (idx >= 0) { const next = [...ws]; next[idx] = w; return next; }
      return [...ws, w];
    });
    setWizard(null);
  }

  /* ── Delegation ── */
  function addDelegation(d: Omit<DelegationRule, "id">) {
    setDelegations((ds) => [...ds, { ...d, id: Date.now() }]);
  }
  function removeDelegation(id: number) {
    setDelegations((ds) => ds.filter((d) => d.id !== id));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Tab bar + role badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="seg-control">
          {visibleTabs.map((t) => (
            <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        <span className="badge badge-info" style={{ fontSize: 11 }}>{caps.roleLabel}</span>
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <WorkflowSummaryCards workflows={workflows} requests={requests} />
          {caps.canConfigureWorkflows && (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-cav btn-cav-primary btn-cav-sm" onClick={handleCreate}>
                + Create Workflow
              </button>
              <button className="btn-cav btn-cav-secondary btn-cav-sm">
                ↑ Import Rules
              </button>
              <button className="btn-cav btn-cav-secondary btn-cav-sm">
                ↓ Export Configuration
              </button>
            </div>
          )}
          <ApprovalAnalytics workflows={workflows} requests={requests} />
        </div>
      )}

      {/* ── Workflows ── */}
      {tab === "workflows" && (
        <WorkflowList
          workflows={workflows}
          caps={caps}
          onView={(w) => setWizard({ workflow: w })}
          onEdit={handleEdit}
          onClone={handleClone}
          onToggle={handleToggle}
          onCreate={handleCreate}
        />
      )}

      {/* ── Rules ── */}
      {tab === "rules" && (
        <ApprovalRulesPanel workflows={workflows} />
      )}

      {/* ── Delegation ── */}
      {tab === "delegation" && (
        <DelegationPanel
          delegations={delegations}
          caps={caps}
          onAdd={addDelegation}
          onRemove={removeDelegation}
        />
      )}

      {/* ── Escalation ── */}
      {tab === "escalation" && (
        <EscalationRulesPanel workflows={workflows} />
      )}

      {/* ── Audit Log ── */}
      {tab === "audit" && (
        <ApprovalHistoryPanel requests={requests} />
      )}

      {/* ── Wizard overlay ── */}
      {wizard && (
        <WorkflowWizard
          initial={wizard.workflow ?? null}
          currentUser={caps.currentUser}
          onSave={handleSaveWorkflow}
          onClose={() => setWizard(null)}
        />
      )}
    </div>
  );
}
