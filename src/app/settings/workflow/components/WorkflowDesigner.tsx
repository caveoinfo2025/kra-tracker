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

// ── Standalone Designer (no workflow selected) ────────────────────────────────
function DesignerEmpty({ onNew }: { onNew: () => void }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "60px 32px", gap: 16, textAlign: "center",
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 12,
        background: "rgba(200,16,46,0.08)", display: "flex",
        alignItems: "center", justifyContent: "center",
      }}>
        <Plus size={24} color="var(--caveo-red)" strokeWidth={2} />
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Create a New Workflow</div>
        <div style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 360, lineHeight: 1.6 }}>
          Define the trigger event, approval steps and escalation rules for a new automated workflow.
        </div>
      </div>
      <button onClick={onNew} style={primaryBtn}>
        New Workflow <ChevronRight size={14} />
      </button>
    </div>
  );
}

// ── Workflow form ─────────────────────────────────────────────────────────────
function WorkflowForm({
  workflow,
  canEdit,
  onSaved,
  onCancel,
}: {
  workflow?: WorkflowDefinition | null;
  canEdit:   boolean;
  onSaved?:  (wf: WorkflowDefinition) => void;
  onCancel?: () => void;
}) {
  const editing  = !!workflow;
  const disabled = !canEdit;

  const [step, setStep]   = useState<"details" | "steps">("details");
  const [form, setForm]   = useState(() =>
    workflow
      ? { name: workflow.name, code: workflow.code, description: workflow.description, module: workflow.module, triggerEvent: workflow.triggerEvent }
      : blankForm()
  );
  const [steps, setSteps] = useState<DraftStep[]>(
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
        : await fetch("/api/workflows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
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
      {/* Form header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
          {editing ? `Edit: ${workflow!.name}` : "New Workflow"}
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
          {editing ? "Update workflow details and approval steps." : "Configure the trigger, details and approval chain."}
        </p>
      </div>

      {/* Step pills */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
        {(["details", "steps"] as const).map((s, i) => {
          const active = step === s;
          const label  = s === "details" ? "1 · Details" : `2 · Approval Steps (${steps.length})`;
          return (
            <button
              key={s}
              onClick={() => setStep(s)}
              style={{
                padding:      "8px 20px",
                fontSize:     13,
                fontWeight:   active ? 600 : 400,
                borderRadius: i === 0 ? "8px 0 0 8px" : "0 8px 8px 0",
                border:       "1px solid var(--border)",
                borderLeft:   i === 1 ? "none" : "1px solid var(--border)",
                background:   active ? "var(--primary)" : "var(--card)",
                color:        active ? "#fff" : "var(--muted-foreground)",
                cursor:       "pointer",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Details section */}
      {step === "details" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Name + Code */}
          <div style={sectionCard}>
            <div style={sectionTitle}>Workflow Identity</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={labelStyle}>Name *</label>
                <input
                  style={inputStyle} value={form.name} disabled={disabled}
                  placeholder="e.g. Expense Approval"
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label style={labelStyle}>Code *</label>
                <input
                  style={inputStyle} value={form.code} disabled={disabled || editing}
                  placeholder="EXPENSE_APPROVAL"
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
                />
                {!editing && (
                  <p style={hintStyle}>Auto-formatted. Cannot be changed after creation.</p>
                )}
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <label style={labelStyle}>Description</label>
              <textarea
                style={{ ...inputStyle, resize: "vertical" }} rows={2}
                value={form.description} disabled={disabled}
                placeholder="What does this workflow approve? Who does it involve?"
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>

          {/* Trigger */}
          <div style={sectionCard}>
            <div style={sectionTitle}>Trigger Configuration</div>
            <TriggerSelector
              module={form.module}
              triggerEvent={form.triggerEvent}
              disabled={disabled}
              onChange={(field, value) => setForm({ ...form, [field]: value })}
            />
          </div>

          {/* Next */}
          {canEdit && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setStep("steps")} style={primaryBtn}>
                Next: Approval Steps <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Steps section */}
      {step === "steps" && (
        <div>
          <div style={sectionCard}>
            <div style={sectionTitle}>Approval Chain</div>
            <p style={{ ...hintStyle, marginBottom: 16 }}>
              Define who approves at each step, in what order, and what happens if they don't respond in time.
            </p>
            <ApprovalStepBuilder steps={steps} onChange={setSteps} disabled={disabled} />
          </div>

          {error && (
            <div style={{
              background: "rgba(239,68,68,0.08)", color: "#ef4444",
              borderRadius: 8, padding: "10px 14px", fontSize: 13, marginTop: 16,
              border: "1px solid rgba(239,68,68,0.2)",
            }}>{error}</div>
          )}

          {canEdit && (
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button
                onClick={() => setStep("details")}
                style={{ padding: "9px 18px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", cursor: "pointer" }}
              >
                ← Back
              </button>
              {onCancel && (
                <button onClick={onCancel} style={{ padding: "9px 18px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--muted-foreground)", cursor: "pointer" }}>
                  Cancel
                </button>
              )}
              <button onClick={handleSave} disabled={saving} style={primaryBtn}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Workflow"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Default export: Designer tab host ─────────────────────────────────────────
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

// ── Shared styles ─────────────────────────────────────────────────────────────
const sectionCard: React.CSSProperties = {
  background: "var(--card)", border: "1px solid var(--border)",
  borderRadius: 10, padding: "20px 24px",
};
const sectionTitle: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, marginBottom: 16,
  color: "var(--foreground)",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600,
  color: "var(--foreground)", marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", fontSize: 13, borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--background)",
  color: "var(--foreground)", boxSizing: "border-box",
};
const hintStyle: React.CSSProperties = {
  fontSize: 11, color: "var(--muted-foreground)", marginTop: 4, marginBottom: 0,
};
const primaryBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6,
  padding: "9px 20px", fontSize: 13, fontWeight: 600,
  borderRadius: 8, border: "none",
  background: "var(--primary)", color: "#fff", cursor: "pointer",
};
