"use client";

import { WorkflowStep } from "@/lib/workflow-engine";
import ApproverSelector from "./ApproverSelector";

type DraftStep = Omit<WorkflowStep, "id" | "workflowId">;

interface Props {
  steps:    DraftStep[];
  onChange: (steps: DraftStep[]) => void;
  disabled?: boolean;
}

function emptyStep(stepNumber: number): DraftStep {
  return {
    stepNumber,
    stepName:        `Step ${stepNumber}`,
    approvalType:    "REPORTING_MANAGER",
    approverId:      null,
    approverRoleId:  null,
    approvalMode:    "SEQUENTIAL",
    isMandatory:     true,
    timeoutHours:    24,
    requireComments: false,
  };
}

export default function ApprovalStepBuilder({ steps, onChange, disabled }: Props) {
  function updateStep(index: number, field: string, value: unknown) {
    const updated = steps.map((s, i) => i === index ? { ...s, [field]: value } : s);
    onChange(updated);
  }

  function addStep() {
    onChange([...steps, emptyStep(steps.length + 1)]);
  }

  function removeStep(index: number) {
    const updated = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepNumber: i + 1 }));
    onChange(updated);
  }

  function moveStep(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= steps.length) return;
    const updated = [...steps];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    onChange(updated.map((s, i) => ({ ...s, stepNumber: i + 1 })));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {steps.map((step, i) => (
        <div key={i} className="card" style={{ padding: 16, borderLeft: "3px solid var(--caveo-red)" }}>
          {/* Step header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "var(--caveo-red)", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
              <input
                className="input"
                style={{ fontWeight: 600, fontSize: 14, width: 240 }}
                value={step.stepName}
                disabled={disabled}
                onChange={(e) => updateStep(i, "stepName", e.target.value)}
              />
            </div>
            {!disabled && (
              <div style={{ display: "flex", gap: 4 }}>
                <button className="btn-ghost" style={{ padding: "2px 8px" }} onClick={() => moveStep(i, -1)} disabled={i === 0}>↑</button>
                <button className="btn-ghost" style={{ padding: "2px 8px" }} onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1}>↓</button>
                <button className="btn-ghost" style={{ padding: "2px 8px", color: "#ef4444" }} onClick={() => removeStep(i)}>Remove</button>
              </div>
            )}
          </div>

          {/* Approver selection */}
          <ApproverSelector
            approvalType={step.approvalType}
            approverId={step.approverId}
            approverRoleId={step.approverRoleId}
            disabled={disabled}
            onChange={(field, value) => updateStep(i, field, value)}
          />

          {/* Step config */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
            <div>
              <label className="form-label">Approval Mode</label>
              <select className="input" value={step.approvalMode} disabled={disabled} onChange={(e) => updateStep(i, "approvalMode", e.target.value)}>
                <option value="SEQUENTIAL">Sequential</option>
                <option value="PARALLEL">Parallel (Any)</option>
              </select>
            </div>
            <div>
              <label className="form-label">Timeout (hours)</label>
              <input className="input" type="number" min={1} value={step.timeoutHours} disabled={disabled} onChange={(e) => updateStep(i, "timeoutHours", Number(e.target.value))} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "flex-end" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={step.isMandatory} disabled={disabled} onChange={(e) => updateStep(i, "isMandatory", e.target.checked)} />
                Mandatory step
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={step.requireComments} disabled={disabled} onChange={(e) => updateStep(i, "requireComments", e.target.checked)} />
                Require comments
              </label>
            </div>
          </div>
        </div>
      ))}

      {!disabled && (
        <button className="btn-ghost" onClick={addStep} style={{ alignSelf: "flex-start", fontSize: 13 }}>
          + Add Approval Step
        </button>
      )}

      {steps.length === 0 && (
        <div style={{ color: "var(--fg-4)", fontSize: 13, padding: "12px 0" }}>No steps yet. Add at least one approval step.</div>
      )}
    </div>
  );
}
