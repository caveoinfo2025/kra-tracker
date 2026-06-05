"use client";

import { useState } from "react";
import { WorkflowDefinition, WorkflowStep } from "@/lib/workflow-engine";
import TriggerSelector       from "./TriggerSelector";
import ApprovalStepBuilder   from "./ApprovalStepBuilder";

type DraftStep = Omit<WorkflowStep, "id" | "workflowId">;

interface Props {
  workflow?: WorkflowDefinition | null;
  canEdit:   boolean;
  onSaved?:  (wf: WorkflowDefinition) => void;
  onCancel?: () => void;
}

function blankForm() {
  return { name: "", code: "", description: "", module: "", triggerEvent: "", conditionJson: "" };
}

export default function WorkflowDesigner({ workflow, canEdit, onSaved, onCancel }: Props) {
  const editing = !!workflow;
  const [form,   setForm]  = useState(() => workflow ? {
    name:          workflow.name,
    code:          workflow.code,
    description:   workflow.description,
    module:        workflow.module,
    triggerEvent:  workflow.triggerEvent,
    conditionJson: workflow.conditionJson ?? "",
  } : blankForm());
  const [steps,  setSteps] = useState<DraftStep[]>(workflow?.steps?.map((s) => ({
    stepNumber:      s.stepNumber,
    stepName:        s.stepName,
    approvalType:    s.approvalType,
    approverId:      s.approverId,
    approverRoleId:  s.approverRoleId,
    approvalMode:    s.approvalMode,
    isMandatory:     s.isMandatory,
    timeoutHours:    s.timeoutHours,
    requireComments: s.requireComments,
  })) ?? []);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [section, setSection] = useState<"info" | "steps">("info");

  const disabled = !canEdit;

  async function handleSave() {
    if (!form.name || !form.code || !form.module || !form.triggerEvent) {
      setError("Name, Code, Module and Trigger Event are required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = { ...form, steps, conditionJson: form.conditionJson || undefined };
      const res = editing
        ? await fetch(`/api/workflows/${workflow!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/workflows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json() as { workflow?: WorkflowDefinition; error?: string };
      if (!res.ok) { setError(data.error ?? "Save failed"); return; }
      if (data.workflow && onSaved) onSaved(data.workflow);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Tabs */}
      <div className="seg-control" style={{ marginBottom: 20 }}>
        <button className={section === "info"  ? "active" : ""} onClick={() => setSection("info")}>1. Details</button>
        <button className={section === "steps" ? "active" : ""} onClick={() => setSection("steps")}>2. Approval Steps ({steps.length})</button>
      </div>

      {section === "info" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label className="form-label">Workflow Name *</label>
              <input className="input" value={form.name} disabled={disabled} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Expense Approval" />
            </div>
            <div>
              <label className="form-label">Code *</label>
              <input className="input" value={form.code} disabled={disabled || editing} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, "_") })} placeholder="EXPENSE_APPROVAL" />
              <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>Unique identifier. Cannot be changed after creation.</div>
            </div>
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea className="input" rows={2} value={form.description} disabled={disabled} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What does this workflow approve?" />
          </div>
          <TriggerSelector
            module={form.module}
            triggerEvent={form.triggerEvent}
            disabled={disabled}
            onChange={(field, value) => setForm({ ...form, [field]: value })}
          />
          <div>
            <label className="form-label">Condition JSON (optional)</label>
            <textarea className="input" rows={3} value={form.conditionJson} disabled={disabled} onChange={(e) => setForm({ ...form, conditionJson: e.target.value })} placeholder='{"field":"amount","op":"gt","value":50000}' style={{ fontFamily: "monospace", fontSize: 12 }} />
            <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>JSON condition — workflow only triggers when this evaluates true. Leave blank to always trigger.</div>
          </div>
        </div>
      )}

      {section === "steps" && (
        <ApprovalStepBuilder steps={steps} onChange={setSteps} disabled={disabled} />
      )}

      {error && (
        <div style={{ background: "#ef444418", color: "#ef4444", borderRadius: 6, padding: "10px 14px", fontSize: 13, marginTop: 12 }}>{error}</div>
      )}

      {canEdit && (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          {onCancel && <button className="btn-ghost" onClick={onCancel}>Cancel</button>}
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save Changes" : "Create Workflow"}
          </button>
        </div>
      )}
    </div>
  );
}
