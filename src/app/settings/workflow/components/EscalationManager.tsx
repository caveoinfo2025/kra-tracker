"use client";

import { useState, useEffect } from "react";
import { EscalationRule, WorkflowDefinition } from "@/lib/workflow-engine";

interface Props {
  canEdit: boolean;
}

const ACTIONS = ["REMIND", "ESCALATE", "AUTO_APPROVE", "AUTO_REJECT"];

export default function EscalationManager({ canEdit }: Props) {
  const [rules,     setRules]     = useState<EscalationRule[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [form, setForm] = useState({ workflowId: "", afterHours: "24", action: "REMIND", escalateTo: "", repeatEvery: "", maxTriggers: "3" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/escalation-rules").then((r) => r.json()).catch(() => ({ rules: [] })),
      fetch("/api/workflows").then((r) => r.json()).catch(() => ({ workflows: [] })),
    ]).then(([r, w]) => {
      setRules(r.rules ?? []);
      setWorkflows(w.workflows ?? []);
    }).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!form.workflowId || !form.afterHours) return;
    setSaving(true);
    try {
      await fetch("/api/escalation-rules", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          workflowId:  Number(form.workflowId),
          afterHours:  Number(form.afterHours),
          action:      form.action,
          escalateTo:  form.escalateTo ? Number(form.escalateTo) : undefined,
          repeatEvery: form.repeatEvery ? Number(form.repeatEvery) : undefined,
          maxTriggers: Number(form.maxTriggers),
        }),
      });
      setShowForm(false);
      setForm({ workflowId: "", afterHours: "24", action: "REMIND", escalateTo: "", repeatEvery: "", maxTriggers: "3" });
    } finally {
      setSaving(false);
    }
  }

  const wfName = (id: number) => workflows.find((w) => w.id === id)?.name ?? `Workflow #${id}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 600 }}>Escalation Rules</div>
          <div style={{ fontSize: 13, color: "var(--fg-4)" }}>Automatically remind or escalate overdue approval requests</div>
        </div>
        {canEdit && <button className="btn-primary" onClick={() => setShowForm(true)}>+ New Rule</button>}
      </div>

      {showForm && (
        <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>New Escalation Rule</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="form-label">Workflow</label>
              <select className="input" value={form.workflowId} onChange={(e) => setForm({ ...form, workflowId: e.target.value })}>
                <option value="">Select workflow…</option>
                {workflows.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Action</label>
              <select className="input" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })}>
                {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Trigger after (hours)</label>
              <input className="input" type="number" min={1} value={form.afterHours} onChange={(e) => setForm({ ...form, afterHours: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Max triggers</label>
              <input className="input" type="number" min={1} value={form.maxTriggers} onChange={(e) => setForm({ ...form, maxTriggers: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Escalate to (Employee ID, optional)</label>
              <input className="input" type="number" placeholder="Leave blank to escalate to step approver" value={form.escalateTo} onChange={(e) => setForm({ ...form, escalateTo: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Repeat every (hours, optional)</label>
              <input className="input" type="number" placeholder="e.g. 24" value={form.repeatEvery} onChange={(e) => setForm({ ...form, repeatEvery: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: "var(--fg-4)", textAlign: "center", padding: 32 }}>Loading…</div>
      ) : rules.length === 0 ? (
        <div style={{ color: "var(--fg-4)", textAlign: "center", padding: 32 }}>No escalation rules defined.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Workflow</th><th>After Hours</th><th>Action</th><th>Max Triggers</th><th>Repeat</th><th>Active</th></tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontSize: 13 }}>{wfName(r.workflowId)}</td>
                  <td style={{ fontSize: 13 }}>{r.afterHours}h</td>
                  <td>
                    <span style={{ background: "#f9731618", color: "#f97316", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{r.action}</span>
                  </td>
                  <td style={{ fontSize: 13 }}>{r.maxTriggers}</td>
                  <td style={{ fontSize: 13, color: "var(--fg-4)" }}>{r.repeatEvery ? `Every ${r.repeatEvery}h` : "—"}</td>
                  <td>
                    <span style={{ background: r.isActive ? "#22c55e18" : "#6b728018", color: r.isActive ? "#22c55e" : "#6b7280", borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>
                      {r.isActive ? "Yes" : "No"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
