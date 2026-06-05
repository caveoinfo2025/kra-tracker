"use client";

import { useState, useEffect } from "react";
import { WorkflowDefinition } from "@/lib/workflow-engine";
import WorkflowDesigner from "./WorkflowDesigner";

interface Props {
  canEdit: boolean;
}

const STATUS_COLOURS: Record<string, string> = {
  ACTIVE:   "#22c55e",
  DRAFT:    "#f59e0b",
  INACTIVE: "#6b7280",
};

export default function WorkflowRulePanel({ canEdit }: Props) {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState<WorkflowDefinition | null>(null);
  const [creating,  setCreating]  = useState(false);
  const [filter,    setFilter]    = useState({ search: "", status: "ALL", module: "ALL" });

  const load = () => {
    setLoading(true);
    fetch("/api/workflows")
      .then((r) => r.json())
      .then((d) => setWorkflows(d.workflows ?? []))
      .catch(() => setWorkflows([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  async function handleStatusChange(wf: WorkflowDefinition, newStatus: string) {
    await fetch(`/api/workflows/${wf.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: newStatus }),
    });
    load();
  }

  const modules = Array.from(new Set(workflows.map((w) => w.module)));

  const filtered = workflows.filter((w) => {
    const s = filter.search.toLowerCase();
    const matchSearch = !s || w.name.toLowerCase().includes(s) || w.code.toLowerCase().includes(s);
    const matchStatus = filter.status === "ALL" || w.status === filter.status;
    const matchModule = filter.module === "ALL" || w.module === filter.module;
    return matchSearch && matchStatus && matchModule;
  });

  if (creating || selected) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button className="btn-ghost" onClick={() => { setCreating(false); setSelected(null); }}>← Back</button>
          <div style={{ fontWeight: 600 }}>{creating ? "New Workflow" : selected?.name}</div>
        </div>
        <WorkflowDesigner
          workflow={selected}
          canEdit={canEdit}
          onSaved={() => { setCreating(false); setSelected(null); load(); }}
          onCancel={() => { setCreating(false); setSelected(null); }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input className="input" placeholder="Search workflows…" value={filter.search} onChange={(e) => setFilter({ ...filter, search: e.target.value })} style={{ flex: 1, minWidth: 180 }} />
        <select className="input" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} style={{ width: 140 }}>
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <select className="input" value={filter.module} onChange={(e) => setFilter({ ...filter, module: e.target.value })} style={{ width: 160 }}>
          <option value="ALL">All modules</option>
          {modules.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        {canEdit && <button className="btn-primary" onClick={() => setCreating(true)}>+ New Workflow</button>}
      </div>

      {/* KPI row */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {["ACTIVE", "DRAFT", "INACTIVE"].map((s) => (
          <div key={s} className="kpi">
            <div className="kpi-label">{s}</div>
            <div className="kpi-value">{workflows.filter((w) => w.status === s).length}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ color: "var(--fg-4)", textAlign: "center", padding: 32 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "var(--fg-4)", textAlign: "center", padding: 32 }}>No workflows found.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Code</th><th>Module</th><th>Trigger</th><th>Steps</th><th>Version</th><th>Status</th>{canEdit && <th />}</tr>
            </thead>
            <tbody>
              {filtered.map((wf) => (
                <tr key={wf.id} style={{ cursor: "pointer" }} onClick={() => setSelected(wf)}>
                  <td style={{ fontWeight: 500 }}>{wf.name}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 12, color: "var(--fg-4)" }}>{wf.code}</td>
                  <td style={{ fontSize: 13 }}>{wf.module}</td>
                  <td style={{ fontSize: 12, color: "var(--fg-4)" }}>{wf.triggerEvent}</td>
                  <td style={{ fontSize: 13 }}>{wf.steps?.length ?? 0}</td>
                  <td style={{ fontSize: 12, color: "var(--fg-4)" }}>v{wf.version}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <span style={{ background: `${STATUS_COLOURS[wf.status] ?? "#6b7280"}18`, color: STATUS_COLOURS[wf.status] ?? "#6b7280", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                      {wf.status}
                    </span>
                  </td>
                  {canEdit && (
                    <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: "nowrap" }}>
                      {wf.status === "DRAFT"    && <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => handleStatusChange(wf, "ACTIVE")}>Activate</button>}
                      {wf.status === "ACTIVE"   && <button className="btn-ghost" style={{ fontSize: 12, color: "#ef4444" }} onClick={() => handleStatusChange(wf, "INACTIVE")}>Deactivate</button>}
                      {wf.status === "INACTIVE" && <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => handleStatusChange(wf, "ACTIVE")}>Re-activate</button>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
