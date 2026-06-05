"use client";

import { useState } from "react";
import { Plus, ChevronRight } from "lucide-react";
import { WorkflowDefinition, WorkflowStep } from "@/lib/workflow-engine";
import TriggerSelector     from "./TriggerSelector";
import ApprovalStepBuilder from "./ApprovalStepBuilder";

type DraftStep = Omit<WorkflowStep, "id" | "workflowId">;

interface Props {
  canEdit:   boolean;
  workflow?: WorkflowDefinition | null;
  onSaved?:  (wf: WorkflowDefinition) => void;
  onCancel?: () => void;
}

function blankForm() {
  return { name: "", code: "", description: "", module: "", triggerEvent: "" };
}

// ── Empty state ────────────────────────────────────────────────────────────────
function DesignerEmpty({ onNew }: { onNew: () => void }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "60px 32px", gap: 16, textAlign: "center",
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 12,
        background: "rgba(200,16,46,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Plus size={24} color="var(--caveo-red)" strokeWidth={2} />
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: "var(--fg-1)" }}>
          Create a New Workflow
        </div>
        <div style={{ fontSize: 13, color: "var(--fg-3)", maxWidth: 360, lineHeight: 1.6 }}>
          Define the trigger event, approval steps and escalation rules for a new automated workflow.
        </div>
      </div>
      <button
        onClick={onNew}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 22px", fontSize: 13, fontWeight: 600,
          borderRadius: 8, border: "none", cursor: "pointer",
          background: "var(--caveo-red)", color: "#fff",
        }}
      >
        New Workflow
      </button>
    </div>
  );
}

// ── Workflow form ──────────────────────────────────────────────────────────────
function WorkflowForm({
  workflow, canEdit, onSaved, onCancel,
}: {
  workflow?: WorkflowDefinition | null;
  canEdit:   boolean;
  onSaved?:  (wf: WorkflowDefinition) => void;
  onCancel?: () => void;
}) {
  const editing  = !!workflow;
  const disabled = !canEdit;

  const [step,  setStep]  = useState<"details" | "steps">("details");
  const [form,  setForm]  = useState(() =>
    workflow
      ? { name: workflow.name, code: workflow.code, description: workflow.description, module: workflow.module, triggerEvent: workflow.triggerEvent }
      : blankForm()
  );
  const [steps,  setSteps]  = useState<DraftStep[]>(
    workflow?.steps?.map((s) => ({
      stepNumber: s.stepNumber, stepName: s.stepName,
      approvalType: s.approvalType, approverId: s.approverId,
      approverRoleId: s.approverRoleId, approvalMode: s.approvalMode,
      isMandatory: s.isMandatory, timeoutHours: s.timeoutHours,
      requireComments: s.requireComments,
    })) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  async function handleSave() {
    if (!form.name || !form.code || !form.module || !form.triggerEvent) {
      setStep("details");
      setError("Name, Code, Module and Trigger Event are required.");
      return;
    }
    if (steps.length === 0) {
      setError("Add at least one approval step before saving.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = { ...form, steps };
      const res = editing
        ? await fetch(`/api/workflows/${workflow!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/workflows",                  { method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json() as { workflow?: WorkflowDefinition; error?: string };
      if (!res.ok) { setError(data.error ?? "Save failed."); return; }
      if (data.workflow && onSaved) onSaved(data.workflow);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--fg-1)" }}>
          {editing ? `Edit: ${workflow!.name}` : "New Workflow"}
        </h2>
        <p style={{ fontSize: 13, color: "var(--fg-3)", marginTop: 4 }}>
          {editing ? "Update workflow details and approval steps." : "Configure the trigger, details and approval chain."}
        </p>
      </div>

      {/* Step pills */}
      <div style={{ display: "flex", marginBottom: 24 }}>
        {(["details", "steps"] as const).map((s, i) => {
          const active = step === s;
          const label  = s === "details" ? "1 · Details" : `2 · Approval Steps (${steps.length})`;
          return (
            <button
              key={s}
              onClick={() => setStep(s)}
              style={{
                padding:    "8px 20px", fontSize: 13, cursor: "pointer",
                fontWeight: active ? 600 : 400,
                border:     "1px solid var(--border)",
                borderLeft: i === 1 ? "none" : "1px solid var(--border)",
                borderRadius: i === 0 ? "7px 0 0 7px" : "0 7px 7px 0",
                background: active ? "var(--accent)" : "var(--bg-elev)",
                color:      active ? "#fff"          : "var(--fg-3)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Details ── */}
      {step === "details" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={card}>
            <div style={cardTitle}>Workflow Identity</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label className="form-label">Name *</label>
                <input className="input" value={form.name} disabled={disabled}
                  placeholder="e.g. Expense Approval"
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Code *</label>
                <input className="input" value={form.code} disabled={disabled || editing}
                  placeholder="EXPENSE_APPROVAL"
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, "_") })} />
                {!editing && <p className="form-hint">Auto-formatted. Cannot be changed after creation.</p>}
              </div>
            </div>
            <div>
              <label className="form-label">Description</label>
              <textarea className="input" rows={2} value={form.description} disabled={disabled}
                placeholder="What does this workflow approve? Who does it involve?"
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>

          <div style={card}>
            <div style={cardTitle}>Trigger Configuration</div>
            <TriggerSelector
              module={form.module} triggerEvent={form.triggerEvent}
              disabled={disabled}
              onChange={(field, value) => setForm({ ...form, [field]: value })}
            />
          </div>

          {error && <div style={errorBox}>{error}</div>}

          {canEdit && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-primary" onClick={() => setStep("steps")} style={{ gap: 6 }}>
                Next: Approval Steps <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Steps ── */}
      {step === "steps" && (
        <div>
          <div style={card}>
            <div style={cardTitle}>Approval Chain</div>
            <p style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 16, marginTop: 0 }}>
              Define who approves at each step, in what order, and what happens if they don't respond in time.
            </p>
            <ApprovalStepBuilder steps={steps} onChange={setSteps} disabled={disabled} />
          </div>

          {error && <div style={{ ...errorBox, marginTop: 12 }}>{error}</div>}

          {canEdit && (
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setStep("details")}>← Back</button>
              {onCancel && <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Workflow"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Default export: Designer host ──────────────────────────────────────────────
export default function WorkflowDesigner({ canEdit, workflow, onSaved, onCancel }: Props) {
  const [showForm, setShowForm] = useState(!!workflow);

  if (!showForm && !workflow) {
    return <DesignerEmpty onNew={() => setShowForm(true)} />;
  }

  return (
    <WorkflowForm
      workflow={workflow}
      canEdit={canEdit}
      onSaved={(wf) => { setShowForm(false); onSaved?.(wf); }}
      onCancel={() => { setShowForm(false); onCancel?.(); }}
    />
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "var(--bg-elev)", border: "1px solid var(--border)",
  borderRadius: 10, padding: "20px 24px",
};
const cardTitle: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, marginBottom: 14, color: "var(--fg-1)",
};
const errorBox: React.CSSProperties = {
  background: "rgba(239,68,68,0.08)", color: "#ef4444",
  border: "1px solid rgba(239,68,68,0.2)",
  borderRadius: 8, padding: "10px 14px", fontSize: 13,
};
