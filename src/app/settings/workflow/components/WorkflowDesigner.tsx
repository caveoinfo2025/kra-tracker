"use client";

import { useState } from "react";
import { ArrowLeft, Plus, ChevronRight } from "lucide-react";
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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 32px", gap: 16, textAlign: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(200,16,46,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Plus size={24} color="var(--caveo-red)" strokeWidth={2} />
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-1)", marginBottom: 6 }}>Create a New Workflow</div>
        <div style={{ fontSize: 13, color: "var(--fg-3)", maxWidth: 360, lineHeight: 1.6 }}>
          Define the trigger event, approval steps and escalation rules for a new automated workflow.
        </div>
      </div>
      <button onClick={onNew} style={primaryBtn}>New Workflow</button>
    </div>
  );
}

// ── Workflow form ──────────────────────────────────────────────────────────────
function WorkflowForm({ workflow, canEdit, onSaved, onCancel }: {
  workflow?: WorkflowDefinition | null;
  canEdit:   boolean;
  onSaved?:  (wf: WorkflowDefinition) => void;
  onCancel?: () => void;
}) {
  const editing  = !!workflow;
  const disabled = !canEdit;

  const [step,   setStep]   = useState<"details" | "steps">("details");
  const [form,   setForm]   = useState(() =>
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
      setStep("details"); setError("Name, Code, Module and Trigger Event are required."); return;
    }
    if (steps.length === 0) { setError("Add at least one approval step before saving."); return; }
    setError(null); setSaving(true);
    try {
      const res = editing
        ? await fetch(`/api/workflows/${workflow!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, steps }) })
        : await fetch("/api/workflows",                  { method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, steps }) });
      const data = await res.json() as { workflow?: WorkflowDefinition; error?: string };
      if (!res.ok) { setError(data.error ?? "Save failed."); return; }
      if (data.workflow && onSaved) onSaved(data.workflow);
    } catch { setError("Network error. Please try again."); }
    finally  { setSaving(false); }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--fg-1)" }}>
          {editing ? `Edit: ${workflow!.name}` : "New Workflow"}
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--fg-3)" }}>
          {editing ? "Update workflow details and approval steps." : "Configure the trigger, details and approval chain."}
        </p>
      </div>

      {/* Step switcher */}
      <div style={{ display: "flex", marginBottom: 24, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", width: "fit-content" }}>
        {(["details", "steps"] as const).map((s, i) => {
          const active = step === s;
          const label  = s === "details" ? "1  Details" : `2  Approval Steps (${steps.length})`;
          return (
            <button key={s} onClick={() => setStep(s)} style={{
              padding: "9px 20px", fontSize: 13, fontWeight: active ? 600 : 400,
              background: active ? "var(--caveo-red)" : "var(--bg-elev)",
              color: active ? "#fff" : "var(--fg-3)",
              border: "none", borderRight: i === 0 ? "1px solid var(--border)" : "none",
              cursor: "pointer",
            }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <div style={label}>Name *</div>
                <input style={disabled ? disabledInput : activeInput} value={form.name} disabled={disabled}
                  placeholder="e.g. Expense Approval"
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <div style={label}>Code *</div>
                <input style={disabled || editing ? disabledInput : activeInput} value={form.code} disabled={disabled || editing}
                  placeholder="EXPENSE_APPROVAL"
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, "_") })} />
                {!editing && <div style={hint}>Auto-formatted. Cannot be changed after creation.</div>}
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={label}>Description</div>
              <textarea style={{ ...(disabled ? disabledInput : activeInput), resize: "vertical" as const }} rows={2}
                value={form.description} disabled={disabled}
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
              <button onClick={() => setStep("steps")} style={{ ...primaryBtn, gap: 6 }}>
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
            <p style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 0, marginBottom: 16 }}>
              Define who approves at each step, in what order, and the timeout before escalation.
            </p>
            <ApprovalStepBuilder steps={steps} onChange={setSteps} disabled={disabled} />
          </div>

          {error && <div style={{ ...errorBox, marginTop: 12 }}>{error}</div>}

          {canEdit && (
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setStep("details")} style={secondaryBtn}>
                <ArrowLeft size={13} /> Back
              </button>
              {onCancel && <button onClick={onCancel} style={ghostBtnSt}>Cancel</button>}
              <button onClick={handleSave} disabled={saving} style={primaryBtn}>
                {saving ? "Saving..." : editing ? "Save Changes" : "Create Workflow"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Default export ─────────────────────────────────────────────────────────────
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

// ── Shared inline styles ───────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "var(--bg-elev)", border: "1px solid var(--border)",
  borderRadius: 10, padding: "20px 24px",
};
const cardTitle: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: "var(--fg-1)", marginBottom: 16,
};
const label: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6,
};
const hint: React.CSSProperties = {
  fontSize: 11, color: "var(--fg-4)", marginTop: 4,
};
const baseInput: React.CSSProperties = {
  display: "block", width: "100%", boxSizing: "border-box",
  padding: "9px 12px", fontSize: 13, borderRadius: 7,
  border: "1px solid var(--border)", fontFamily: "var(--font-sans)",
};
const activeInput: React.CSSProperties = {
  ...baseInput, background: "var(--bg-elev)", color: "var(--fg-1)",
};
const disabledInput: React.CSSProperties = {
  ...baseInput, background: "var(--bg-muted)", color: "var(--fg-3)", cursor: "not-allowed",
};
const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "9px 20px", fontSize: 13, fontWeight: 600,
  borderRadius: 7, border: "none", cursor: "pointer",
  background: "var(--caveo-red)", color: "#fff",
};
const secondaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "9px 16px", fontSize: 13, fontWeight: 500,
  borderRadius: 7, border: "1px solid var(--border)",
  background: "var(--bg-elev)", color: "var(--fg-2)", cursor: "pointer",
};
const ghostBtnSt: React.CSSProperties = {
  padding: "9px 16px", fontSize: 13, fontWeight: 500,
  borderRadius: 7, border: "1px solid var(--border)",
  background: "transparent", color: "var(--fg-3)", cursor: "pointer",
};
const errorBox: React.CSSProperties = {
  background: "rgba(239,68,68,0.08)", color: "#ef4444",
  border: "1px solid rgba(239,68,68,0.2)",
  borderRadius: 8, padding: "10px 14px", fontSize: 13,
};
