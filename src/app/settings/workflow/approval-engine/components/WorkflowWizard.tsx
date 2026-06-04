"use client";

import { useState } from "react";
import {
  X, Plus, Trash2, ChevronUp, ChevronDown, Check, Bell,
  GitBranch, Layers, AlertTriangle, Info, Settings2,
} from "lucide-react";
import {
  Workflow, ApprovalLevel, ApprovalCondition, EscalationRule, NotificationConfig,
  MODULES, MODULE_TRANSACTION_TYPES, TRIGGER_EVENTS, APPROVER_TYPES, APPROVAL_MODES,
  CONDITION_FIELDS, OPERATORS, NOTIFICATION_EVENTS, NOTIFICATION_CHANNELS,
  makeBlankWorkflow, fmtDate,
} from "../data";

interface Props {
  initial: Workflow | null;
  currentUser: string;
  onClose: () => void;
  onSave: (w: Workflow) => void;
}

const STEPS = [
  { key: "info",        label: "Workflow Info",    icon: Info },
  { key: "trigger",     label: "Trigger & Rules",  icon: GitBranch },
  { key: "conditions",  label: "Conditions",       icon: Settings2 },
  { key: "levels",      label: "Approval Levels",  icon: Layers },
  { key: "escalation",  label: "Escalation",       icon: AlertTriangle },
  { key: "notify",      label: "Notifications",    icon: Bell },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

const inputCls  = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]";
const labelCls  = "block text-xs font-medium text-gray-700 mb-1";

export default function WorkflowWizard({ initial, currentUser, onClose, onSave }: Props) {
  const [step,  setStep]  = useState<StepKey>("info");
  const [draft, setDraft] = useState<Workflow>(() =>
    initial
      ? { ...initial, levels: initial.levels.map((l) => ({ ...l })), conditions: initial.conditions.map((c) => ({ ...c })) }
      : { ...makeBlankWorkflow(), createdBy: currentUser, createdAt: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString().slice(0, 10) }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setField<K extends keyof Workflow>(k: K, v: Workflow[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k as string]; return n; });
  }

  const stepIdx = STEPS.findIndex((s) => s.key === step);

  function validateStep(): boolean {
    const errs: Record<string, string> = {};
    if (step === "info") {
      if (!draft.name.trim())          errs.name = "Workflow name is required.";
      if (!draft.transactionType)      errs.transactionType = "Transaction type is required.";
    }
    if (step === "levels") {
      if (draft.levels.length === 0)   errs.levels = "At least one approval level is required.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function goNext() {
    if (!validateStep()) return;
    const next = STEPS[stepIdx + 1];
    if (next) setStep(next.key);
  }
  function goBack() {
    const prev = STEPS[stepIdx - 1];
    if (prev) setStep(prev.key);
  }

  function handleSave() {
    if (!validateStep()) return;
    const ts = new Date().toISOString().slice(0, 10);
    onSave({ ...draft, updatedAt: ts, id: draft.id || Date.now() });
  }

  const transactionTypes = MODULE_TRANSACTION_TYPES[draft.module] ?? [];

  // ── Step renderers ────────────────────────────────────────────────────────

  function StepInfo() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className={labelCls}>Workflow Name *</label>
            <input className={inputCls} value={draft.name} placeholder="e.g. High Value Expense Approval"
              onChange={(e) => setField("name", e.target.value)} />
            {errors.name && <p style={{ fontSize: 11, color: "var(--caveo-red)", marginTop: 3 }}>{errors.name}</p>}
          </div>
          <div>
            <label className={labelCls}>Module *</label>
            <select className={inputCls} value={draft.module}
              onChange={(e) => { setField("module", e.target.value as Workflow["module"]); setField("transactionType", ""); }}>
              {MODULES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Transaction Type *</label>
            <select className={inputCls} value={draft.transactionType}
              onChange={(e) => setField("transactionType", e.target.value)}>
              <option value="">Select…</option>
              {transactionTypes.map((t) => <option key={t}>{t}</option>)}
            </select>
            {errors.transactionType && <p style={{ fontSize: 11, color: "var(--caveo-red)", marginTop: 3 }}>{errors.transactionType}</p>}
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className={labelCls}>Description</label>
            <textarea className={inputCls} rows={2} value={draft.description}
              placeholder="Describe when this workflow is used…"
              onChange={(e) => setField("description", e.target.value)} style={{ resize: "vertical" }} />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["Active", "Inactive", "Draft"] as const).map((s) => (
                <button key={s} type="button" onClick={() => setField("status", s)}
                  style={{
                    flex: 1, border: `1.5px solid ${draft.status === s ? "var(--caveo-red)" : "var(--border)"}`,
                    background: draft.status === s ? "rgba(200,16,46,0.06)" : "var(--bg-elev)",
                    borderRadius: 8, padding: "7px 0", cursor: "pointer",
                    fontSize: 12.5, fontWeight: 600, fontFamily: "var(--font-sans)",
                    color: draft.status === s ? "var(--caveo-red)" : "var(--fg-2)",
                  }}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function StepTrigger() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label className={labelCls} style={{ marginBottom: 8 }}>When should this workflow trigger? *</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {TRIGGER_EVENTS.map((t) => (
              <button key={t} type="button" onClick={() => setField("triggerEvent", t)}
                style={{
                  border: `1.5px solid ${draft.triggerEvent === t ? "var(--caveo-red)" : "var(--border)"}`,
                  background: draft.triggerEvent === t ? "rgba(200,16,46,0.06)" : "var(--bg-elev)",
                  borderRadius: 10, padding: "10px 14px", cursor: "pointer", textAlign: "left",
                  fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
                  color: draft.triggerEvent === t ? "var(--caveo-red)" : "var(--fg-1)",
                }}>
                {t}
                <div style={{ fontSize: 11, color: "var(--fg-4)", fontWeight: 400, marginTop: 2 }}>
                  {t === "On Create" && "Triggers when a record is first created"}
                  {t === "On Submit" && "Triggers when the user submits a form"}
                  {t === "On Amount Limit" && "Triggers when value crosses a defined threshold"}
                  {t === "On Field Change" && "Triggers when a specific field value changes"}
                  {t === "On Status Change" && "Triggers when a record status is updated"}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div style={{ background: "var(--bg-muted)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--fg-3)", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>The trigger event fires for <b>{draft.module} → {draft.transactionType || "all transactions"}</b>. Additional conditions can be configured in the next step.</span>
        </div>
      </div>
    );
  }

  function StepConditions() {
    function addCond() {
      setField("conditions", [
        ...draft.conditions,
        { id: Date.now(), field: "Amount", operator: ">", value: "", conjunction: "AND" } as ApprovalCondition,
      ]);
    }
    function removeCond(id: number) {
      setField("conditions", draft.conditions.filter((c) => c.id !== id));
    }
    function setCond<K extends keyof ApprovalCondition>(id: number, k: K, v: ApprovalCondition[K]) {
      setField("conditions", draft.conditions.map((c) => c.id === id ? { ...c, [k]: v } : c));
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6 }}>
          Define conditions that must be met for this workflow to activate. Leave empty to always require approval.
        </div>

        {draft.conditions.length === 0 && (
          <div style={{ textAlign: "center", padding: "20px 12px", color: "var(--fg-4)", fontSize: 12.5, background: "var(--bg-muted)", borderRadius: 8 }}>
            No conditions — workflow always triggers on <b>{draft.triggerEvent}</b>
          </div>
        )}

        {draft.conditions.map((cond, idx) => (
          <div key={cond.id} style={{ display: "grid", gridTemplateColumns: "80px 1fr 120px 1fr 80px auto", gap: 8, alignItems: "center", background: "var(--bg-muted)", borderRadius: 8, padding: "10px 12px" }}>
            {idx === 0
              ? <span style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-3)" }}>IF</span>
              : (
                <select style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", fontSize: 12, background: "var(--bg-elev)" }}
                  value={cond.conjunction} onChange={(e) => setCond(cond.id, "conjunction", e.target.value as "AND" | "OR")}>
                  <option>AND</option>
                  <option>OR</option>
                </select>
              )}
            <select className={inputCls} style={{ fontSize: 12 }} value={cond.field}
              onChange={(e) => setCond(cond.id, "field", e.target.value as ApprovalCondition["field"])}>
              {CONDITION_FIELDS.map((f) => <option key={f}>{f}</option>)}
            </select>
            <select className={inputCls} style={{ fontSize: 12 }} value={cond.operator}
              onChange={(e) => setCond(cond.id, "operator", e.target.value as ApprovalCondition["operator"])}>
              {OPERATORS.map((o) => <option key={o}>{o}</option>)}
            </select>
            <div style={{ display: "flex", gap: 4 }}>
              <input className={inputCls} style={{ fontSize: 12 }} placeholder={cond.field === "Amount" ? "e.g. 10000" : "value"}
                value={cond.value} onChange={(e) => setCond(cond.id, "value", e.target.value)} />
              {cond.operator === "Between" && (
                <>
                  <span style={{ alignSelf: "center", color: "var(--fg-4)", fontSize: 12 }}>–</span>
                  <input className={inputCls} style={{ fontSize: 12 }} placeholder="max"
                    value={cond.value2 ?? ""} onChange={(e) => setCond(cond.id, "value2", e.target.value)} />
                </>
              )}
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-4)", textAlign: "center" }}>THEN</span>
            <button type="button" onClick={() => removeCond(cond.id)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--caveo-red)", padding: 4, borderRadius: 4 }}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}

        {draft.conditions.length > 0 && (
          <div style={{ fontSize: 12, color: "var(--fg-3)", padding: "6px 12px", background: "rgba(31,157,85,0.07)", borderRadius: 6, border: "1px solid rgba(31,157,85,0.2)" }}>
            → <b>Approval Required</b>
          </div>
        )}

        <button className="btn-cav btn-cav-secondary btn-cav-sm" style={{ alignSelf: "flex-start" }} onClick={addCond}>
          <Plus size={12} /> Add Condition
        </button>
      </div>
    );
  }

  function StepLevels() {
    function addLevel() {
      const n = draft.levels.length + 1;
      setField("levels", [
        ...draft.levels,
        { id: Date.now(), level: n, label: `Level ${n} Approval`, approverType: "Reporting Manager", approverValue: "", approvalMode: "Any One Approver", requireRemarks: false, attachmentAllowed: true, allowDelegate: true, allowReject: true, allowRequestChanges: true, slaHours: 24 } as ApprovalLevel,
      ]);
    }
    function removeLevel(id: number) {
      setField("levels", draft.levels.filter((l) => l.id !== id).map((l, i) => ({ ...l, level: i + 1 })));
    }
    function moveLevel(id: number, dir: -1 | 1) {
      const arr = [...draft.levels];
      const idx = arr.findIndex((l) => l.id === id);
      if (idx + dir < 0 || idx + dir >= arr.length) return;
      [arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]];
      setField("levels", arr.map((l, i) => ({ ...l, level: i + 1 })));
    }
    function setLevelField<K extends keyof ApprovalLevel>(id: number, k: K, v: ApprovalLevel[K]) {
      setField("levels", draft.levels.map((l) => l.id === id ? { ...l, [k]: v } : l));
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {errors.levels && <p style={{ fontSize: 12, color: "var(--caveo-red)" }}>{errors.levels}</p>}

        {draft.levels.map((lv, idx) => (
          <div key={lv.id} className="card" style={{ border: "1.5px solid var(--border)", padding: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-muted)", borderRadius: "8px 8px 0 0" }}>
              <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--caveo-red)", color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{idx + 1}</span>
              <input value={lv.label} onChange={(e) => setLevelField(lv.id, "label", e.target.value)}
                style={{ flex: 1, border: "none", background: "transparent", fontWeight: 600, fontSize: 13, outline: "none", color: "var(--fg-1)" }} />
              <div style={{ display: "flex", gap: 3, marginLeft: "auto" }}>
                <button type="button" onClick={() => moveLevel(lv.id, -1)} disabled={idx === 0}
                  style={{ background: "none", border: "none", cursor: "pointer", opacity: idx === 0 ? 0.3 : 1, padding: 3 }}><ChevronUp size={14} /></button>
                <button type="button" onClick={() => moveLevel(lv.id, 1)} disabled={idx === draft.levels.length - 1}
                  style={{ background: "none", border: "none", cursor: "pointer", opacity: idx === draft.levels.length - 1 ? 0.3 : 1, padding: 3 }}><ChevronDown size={14} /></button>
                <button type="button" onClick={() => removeLevel(lv.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--caveo-red)", padding: 3 }}><Trash2 size={13} /></button>
              </div>
            </div>
            <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <label className={labelCls}>Approver Type</label>
                <select className={inputCls} style={{ fontSize: 12 }} value={lv.approverType}
                  onChange={(e) => setLevelField(lv.id, "approverType", e.target.value as ApprovalLevel["approverType"])}>
                  {APPROVER_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              {(lv.approverType === "User" || lv.approverType === "Role") && (
                <div>
                  <label className={labelCls}>{lv.approverType} Name</label>
                  <input className={inputCls} style={{ fontSize: 12 }} placeholder={lv.approverType === "User" ? "Employee name…" : "Role name…"}
                    value={lv.approverValue} onChange={(e) => setLevelField(lv.id, "approverValue", e.target.value)} />
                </div>
              )}
              <div>
                <label className={labelCls}>Approval Mode</label>
                <select className={inputCls} style={{ fontSize: 12 }} value={lv.approvalMode}
                  onChange={(e) => setLevelField(lv.id, "approvalMode", e.target.value as ApprovalLevel["approvalMode"])}>
                  {APPROVAL_MODES.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>SLA (hours)</label>
                <input type="number" className={inputCls} style={{ fontSize: 12 }} min={1} value={lv.slaHours}
                  onChange={(e) => setLevelField(lv.id, "slaHours", Number(e.target.value))} />
              </div>
            </div>
            {/* Actions row */}
            <div style={{ display: "flex", gap: 16, padding: "8px 14px 12px", flexWrap: "wrap" }}>
              {([
                ["requireRemarks",    "Require Remarks"],
                ["attachmentAllowed", "Allow Attachments"],
                ["allowDelegate",     "Allow Delegate"],
                ["allowReject",       "Allow Reject"],
                ["allowRequestChanges","Allow Request Changes"],
              ] as [keyof ApprovalLevel, string][]).map(([k, label]) => (
                <label key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer", color: "var(--fg-2)" }}>
                  <input type="checkbox" checked={!!lv[k]} onChange={(e) => setLevelField(lv.id, k, e.target.checked as ApprovalLevel[typeof k])} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        ))}

        <button className="btn-cav btn-cav-secondary btn-cav-sm" style={{ alignSelf: "flex-start" }} onClick={addLevel}>
          <Plus size={12} /> Add Approval Level
        </button>
      </div>
    );
  }

  function StepEscalation() {
    const esc = draft.escalation;
    function setEsc<K extends keyof EscalationRule>(k: K, v: EscalationRule[K]) {
      setField("escalation", esc ? { ...esc, [k]: v } : { id: 1, afterHours: 24, escalateTo: "Next Level", [k]: v });
    }
    const enabled = !!esc;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input type="checkbox" checked={enabled}
            onChange={(e) => setField("escalation", e.target.checked ? { id: 1, afterHours: 24, escalateTo: "Next Level" } : undefined)} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Enable Escalation Rules</span>
        </label>

        {enabled && esc && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, background: "var(--bg-muted)", borderRadius: 10, padding: "14px 16px" }}>
            <div>
              <label className={labelCls}>Escalate after (hours)</label>
              <input type="number" className={inputCls} min={1} value={esc.afterHours}
                onChange={(e) => setEsc("afterHours", Number(e.target.value))} />
            </div>
            <div>
              <label className={labelCls}>Escalate To</label>
              <select className={inputCls} value={esc.escalateTo}
                onChange={(e) => setEsc("escalateTo", e.target.value as EscalationRule["escalateTo"])}>
                <option>Manager</option>
                <option>Next Level</option>
                <option>Specific User</option>
              </select>
            </div>
            {esc.escalateTo === "Specific User" && (
              <div>
                <label className={labelCls}>User Name</label>
                <input className={inputCls} placeholder="Employee name…" value={esc.specificUser ?? ""}
                  onChange={(e) => setEsc("specificUser", e.target.value)} />
              </div>
            )}
            <div>
              <label className={labelCls}>Repeat every (hours)</label>
              <input type="number" className={inputCls} min={1} value={esc.repeatEvery ?? ""}
                placeholder="Optional" onChange={(e) => setEsc("repeatEvery", e.target.value ? Number(e.target.value) : undefined)} />
            </div>
            <div>
              <label className={labelCls}>Max escalations</label>
              <input type="number" className={inputCls} min={1} value={esc.maxEscalations ?? ""}
                placeholder="Optional" onChange={(e) => setEsc("maxEscalations", e.target.value ? Number(e.target.value) : undefined)} />
            </div>
          </div>
        )}

        {!enabled && (
          <div style={{ background: "var(--bg-muted)", borderRadius: 8, padding: "14px", fontSize: 13, color: "var(--fg-3)" }}>
            No escalation — pending items remain with the approver until action is taken.
          </div>
        )}
      </div>
    );
  }

  function StepNotifications() {
    function toggleChannel(evtIdx: number, ch: string) {
      const notifs = [...draft.notifications];
      const existing = notifs[evtIdx];
      const channels = existing.channels.includes(ch as never)
        ? existing.channels.filter((c) => c !== ch)
        : [...existing.channels, ch as never];
      notifs[evtIdx] = { ...existing, channels };
      setField("notifications", notifs);
    }
    function toggleEnabled(evtIdx: number) {
      const notifs = [...draft.notifications];
      notifs[evtIdx] = { ...notifs[evtIdx], enabled: !notifs[evtIdx].enabled };
      setField("notifications", notifs);
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 13, color: "var(--fg-2)", marginBottom: 8, lineHeight: 1.6 }}>
          Configure which channels receive alerts for each approval event.
        </div>
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="crm-table">
            <thead>
              <tr>
                <th>Event</th>
                <th style={{ textAlign: "center" }}>Enabled</th>
                {NOTIFICATION_CHANNELS.map((ch) => <th key={ch} style={{ textAlign: "center" }}>{ch}</th>)}
              </tr>
            </thead>
            <tbody>
              {NOTIFICATION_EVENTS.map((event, ei) => {
                const notif = draft.notifications.find((n) => n.event === event) as NotificationConfig | undefined;
                const channels = notif?.channels ?? [];
                const enabled  = notif?.enabled ?? false;
                return (
                  <tr key={event} style={{ opacity: enabled ? 1 : 0.5 }}>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>{event}</td>
                    <td style={{ textAlign: "center" }}>
                      <input type="checkbox" checked={enabled} onChange={() => toggleEnabled(ei)} />
                    </td>
                    {NOTIFICATION_CHANNELS.map((ch) => (
                      <td key={ch} style={{ textAlign: "center" }}>
                        <input type="checkbox" checked={channels.includes(ch as never)} disabled={!enabled}
                          onChange={() => toggleChannel(ei, ch)} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 4 }}>
          WhatsApp notifications are planned for a future release.
        </div>
      </div>
    );
  }

  const stepContent: Record<StepKey, React.ReactNode> = {
    info: <StepInfo />,
    trigger: <StepTrigger />,
    conditions: <StepConditions />,
    levels: <StepLevels />,
    escalation: <StepEscalation />,
    notify: <StepNotifications />,
  };

  const isLast = stepIdx === STEPS.length - 1;
  const isFirst = stepIdx === 0;

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-pane" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dp-header">
          <div>
            <div className="dp-title">{initial ? "Edit Workflow" : "New Workflow"}</div>
            <div className="dp-sub">{draft.name || "Untitled"} · Step {stepIdx + 1} of {STEPS.length}</div>
          </div>
          <button className="dp-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Step nav pills */}
        <div style={{ display: "flex", gap: 0, padding: "0 20px", borderBottom: "1px solid var(--border-subtle)", overflowX: "auto" }}>
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = s.key === step;
            const done   = i < stepIdx;
            return (
              <button key={s.key} type="button" onClick={() => setStep(s.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "11px 14px",
                  border: "none", borderBottom: active ? "2px solid var(--caveo-red)" : "2px solid transparent",
                  background: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                  color: active ? "var(--caveo-red)" : done ? "var(--success)" : "var(--fg-3)",
                  fontFamily: "var(--font-sans)",
                }}>
                {done ? <Check size={12} /> : <Icon size={12} />}
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Step body */}
        <div className="dp-body">
          {stepContent[step]}
        </div>

        {/* Footer */}
        <div className="dp-footer">
          <button className="btn-cav btn-cav-secondary" onClick={onClose}>Cancel</button>
          {!isFirst && (
            <button className="btn-cav btn-cav-secondary" onClick={goBack}>← Back</button>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {isLast ? (
              <button className="btn-cav btn-cav-primary" onClick={handleSave}>
                <Check size={13} /> {initial ? "Save Changes" : "Create Workflow"}
              </button>
            ) : (
              <button className="btn-cav btn-cav-primary" onClick={goNext}>
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
