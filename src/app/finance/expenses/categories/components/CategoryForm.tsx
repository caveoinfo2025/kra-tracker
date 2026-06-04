"use client";
import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import {
  ExpenseCategory, CatCaps, CategoryStatus, BillRequired,
  CAT_PAYMENT_MODES, ATTACHMENT_TYPES, GST_RATES,
  APPROVER_OPTIONS, EMPLOYEE_GRADES, USAGE_KEYS, USAGE_LABELS,
  BILL_LABELS, CATEGORY_STATUSES, CATEGORIES, todayISO,
} from "../data";

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="section-label">{title}</div>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}>
      <div
        onClick={() => !disabled && onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 10, position: "relative", flexShrink: 0,
          background: checked ? "var(--caveo-red)" : "var(--border)",
          transition: "background .15s", cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <div style={{
          position: "absolute", top: 2, left: checked ? 18 : 2,
          width: 16, height: 16, borderRadius: "50%", background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,.25)", transition: "left .15s",
        }} />
      </div>
      <span style={{ fontSize: 13, color: "var(--fg-1)", fontWeight: 500 }}>{label}</span>
    </label>
  );
}

function CheckGroup({ options, selected, onChange }: { options: readonly string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {options.map((o) => (
        <label key={o} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} style={{ accentColor: "var(--caveo-red)" }} />
          {o}
        </label>
      ))}
    </div>
  );
}

export default function CategoryForm({
  initial, presetParentId, caps, currentUser, nextId, onClose, onSave,
}: {
  initial: ExpenseCategory | null;
  presetParentId?: number | null;
  caps: CatCaps;
  currentUser: string;
  nextId: number;
  onClose: () => void;
  onSave: (cat: ExpenseCategory) => void;
}) {
  const ed = initial;
  const isReadOnly = !caps.canEdit && !caps.canCreate;

  // A. Basic Details
  const [name, setName] = useState(ed?.name ?? "");
  const [code, setCode] = useState(ed?.code ?? "");
  const [description, setDescription] = useState(ed?.description ?? "");
  const [parentId, setParentId] = useState<number | null>(ed?.parentId ?? presetParentId ?? null);
  const [status, setStatus] = useState<CategoryStatus>(ed?.status ?? "Active");

  // B. Usage
  const [forGeneral, setForGeneral] = useState(ed?.forGeneral ?? true);
  const [forCustomer, setForCustomer] = useState(ed?.forCustomer ?? false);
  const [forEmployee, setForEmployee] = useState(ed?.forEmployee ?? false);
  const [forAdvanceSettlement, setForAdvanceSettlement] = useState(ed?.forAdvanceSettlement ?? false);
  const [forConveyance, setForConveyance] = useState(ed?.forConveyance ?? false);
  const [forVendor, setForVendor] = useState(ed?.forVendor ?? false);

  // C. Payment Modes
  const [allowedPaymentModes, setAllowedPaymentModes] = useState<string[]>(
    ed?.allowedPaymentModes ?? ["Cash", "Bank Transfer", "UPI", "Cheque", "Corporate Card"]
  );

  // D. Document Rules
  const [billRequired, setBillRequired] = useState<BillRequired>(ed?.billRequired ?? "amount_based");
  const [billAmountThreshold, setBillAmountThreshold] = useState(String(ed?.billAmountThreshold ?? 500));
  const [allowedAttachments, setAllowedAttachments] = useState<string[]>(ed?.allowedAttachments ?? ["Image", "PDF"]);

  // E. GST
  const [gstEnabled, setGstEnabled] = useState(ed?.gstEnabled ?? false);
  const [gstRate, setGstRate] = useState(ed?.gstRate ?? 18);
  const [gstType, setGstType] = useState<"goods" | "services">(ed?.gstType ?? "services");
  const [inputCreditEligible, setInputCreditEligible] = useState(ed?.inputCreditEligible ?? false);

  // F. Approval
  const [approvalRequired, setApprovalRequired] = useState(ed?.approvalRequired ?? false);
  const [approvalRule, setApprovalRule] = useState<"always" | "amount_based">(ed?.approvalRule ?? "amount_based");
  const [approvalThreshold, setApprovalThreshold] = useState(String(ed?.approvalThreshold ?? 5000));
  const [approvers, setApprovers] = useState<string[]>(ed?.approvers ?? ["Manager"]);

  // G. HR / Grade Policy
  const [hrRulesEnabled, setHrRulesEnabled] = useState(ed?.hrRulesEnabled ?? false);
  const [gradePolicies, setGradePolicies] = useState(
    ed?.gradePolicies ?? [] as { grade: string; dailyLimit: number; monthlyLimit: number; requiresApproval: boolean }[]
  );

  // H. Customer Expense
  const [customerTrackingEnabled, setCustomerTrackingEnabled] = useState(ed?.customerTrackingEnabled ?? false);
  const [allowLinkCustomer, setAllowLinkCustomer] = useState(ed?.allowLinkCustomer ?? false);
  const [allowLinkProject, setAllowLinkProject] = useState(ed?.allowLinkProject ?? false);
  const [allowLinkSalesOrder, setAllowLinkSalesOrder] = useState(ed?.allowLinkSalesOrder ?? false);
  const [allowLinkTicket, setAllowLinkTicket] = useState(ed?.allowLinkTicket ?? false);

  // I. Tally
  const [tallyLedger, setTallyLedger] = useState(ed?.tallyLedger ?? "");
  const [tallyCostCenterRequired, setTallyCostCenterRequired] = useState(ed?.tallyCostCenterRequired ?? false);
  const [tallyGSTLedger, setTallyGSTLedger] = useState(ed?.tallyGSTLedger ?? "");
  const [tallyExportEnabled, setTallyExportEnabled] = useState(ed?.tallyExportEnabled ?? true);

  const [error, setError] = useState("");

  const parents = CATEGORIES.filter((c) => c.parentId === null && (!ed || c.id !== ed.id));

  function addGradePolicy() {
    setGradePolicies((ps) => [...ps, { grade: "Engineer", dailyLimit: 500, monthlyLimit: 5000, requiresApproval: false }]);
  }
  function removeGradePolicy(i: number) {
    setGradePolicies((ps) => ps.filter((_, idx) => idx !== i));
  }
  function updateGradePolicy(i: number, patch: Partial<typeof gradePolicies[0]>) {
    setGradePolicies((ps) => ps.map((p, idx) => idx === i ? { ...p, ...patch } : p));
  }

  function handleSave() {
    if (!name.trim()) { setError("Category Name is required."); return; }
    if (!code.trim()) { setError("Category Code is required."); return; }
    setError("");

    const now = todayISO();
    const cat: ExpenseCategory = {
      id: ed?.id ?? nextId,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description.trim(),
      parentId,
      status,
      createdBy: ed?.createdBy ?? currentUser,
      createdAt: ed?.createdAt ?? now,
      modifiedBy: ed ? currentUser : undefined,
      modifiedAt: ed ? now : undefined,
      auditHistory: ed
        ? [...ed.auditHistory, { action: "Updated", by: currentUser, at: now }]
        : [{ action: "Created", by: currentUser, at: now }],
      forGeneral, forCustomer, forEmployee, forAdvanceSettlement, forConveyance, forVendor,
      allowedPaymentModes,
      billRequired, billAmountThreshold: parseFloat(billAmountThreshold) || 0, allowedAttachments,
      gstEnabled, gstRate, gstType, inputCreditEligible,
      approvalRequired, approvalRule, approvalThreshold: parseFloat(approvalThreshold) || 0, approvers,
      hrRulesEnabled, gradePolicies,
      customerTrackingEnabled, allowLinkCustomer, allowLinkProject, allowLinkSalesOrder, allowLinkTicket,
      tallyLedger: tallyLedger.trim(), tallyCostCenterRequired,
      tallyGSTLedger: tallyGSTLedger.trim(), tallyExportEnabled,
    };
    onSave(cat);
  }

  const title = ed ? `Edit — ${ed.name}` : presetParentId ? "Add Sub Category" : "New Category";

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-pane" style={{ width: "min(600px, 95vw)" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dp-head">
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-1)" }}>{title}</div>
            {ed && <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--caveo-red)", marginTop: 2 }}>{ed.code}</div>}
            {isReadOnly && <span className="badge badge-neutral" style={{ fontSize: 10, marginTop: 6, display: "inline-block" }}>View Only</span>}
          </div>
          <button onClick={onClose} className="btn-cav btn-cav-ghost btn-cav-sm"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="dp-body">
          {error && (
            <div style={{ background: "#FFF0F0", border: "1px solid #FCCACA", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, color: "var(--caveo-red)" }}>
              {error}
            </div>
          )}

          {/* A. Basic Details */}
          <Section title="A. Basic Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Category Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Office Expense" disabled={isReadOnly} />
              </div>
              <div>
                <label className={labelCls}>Category Code *</label>
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className={inputCls} placeholder="e.g. OFF-EXP" disabled={isReadOnly} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} rows={2} placeholder="Brief description of this category…" disabled={isReadOnly} />
              </div>
              <div>
                <label className={labelCls}>Parent Category</label>
                <select value={parentId ?? ""} onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)} className={inputCls} disabled={isReadOnly}>
                  <option value="">— None (Top-level) —</option>
                  {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as CategoryStatus)} className={inputCls} disabled={isReadOnly}>
                  {CATEGORY_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </Section>

          {/* B. Expense Usage */}
          <Section title="B. Expense Usage">
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 10 }}>Select where this category can be used.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {USAGE_KEYS.map((k) => {
                const vals: Record<string, boolean> = { forGeneral, forCustomer, forEmployee, forAdvanceSettlement, forConveyance, forVendor };
                const setters: Record<string, (v: boolean) => void> = { forGeneral: setForGeneral, forCustomer: setForCustomer, forEmployee: setForEmployee, forAdvanceSettlement: setForAdvanceSettlement, forConveyance: setForConveyance, forVendor: setForVendor };
                return <Toggle key={k} label={USAGE_LABELS[k]} checked={vals[k]} onChange={setters[k]} disabled={isReadOnly} />;
              })}
            </div>
          </Section>

          {/* C. Payment Modes */}
          <Section title="C. Allowed Payment Modes">
            <CheckGroup options={CAT_PAYMENT_MODES} selected={allowedPaymentModes} onChange={isReadOnly ? () => {} : setAllowedPaymentModes} />
          </Section>

          {/* D. Document Rules */}
          <Section title="D. Document Rules">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Bill Required</label>
                <select value={billRequired} onChange={(e) => setBillRequired(e.target.value as BillRequired)} className={inputCls} disabled={isReadOnly}>
                  {(["always", "amount_based", "optional"] as BillRequired[]).map((v) => (
                    <option key={v} value={v}>{BILL_LABELS[v]}</option>
                  ))}
                </select>
              </div>
              {billRequired === "amount_based" && (
                <div>
                  <label className={labelCls}>Bill Required Above (₹)</label>
                  <input type="number" min="0" value={billAmountThreshold} onChange={(e) => setBillAmountThreshold(e.target.value)} className={inputCls} placeholder="500" disabled={isReadOnly} />
                </div>
              )}
              <div className="sm:col-span-2">
                <label className={labelCls}>Allowed Attachment Types</label>
                <CheckGroup options={ATTACHMENT_TYPES} selected={allowedAttachments} onChange={isReadOnly ? () => {} : setAllowedAttachments} />
              </div>
            </div>
          </Section>

          {/* E. GST Configuration */}
          <Section title="E. GST Configuration">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Toggle label="Enable GST" checked={gstEnabled} onChange={setGstEnabled} disabled={isReadOnly} />
              {gstEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Default GST Rate</label>
                    <select value={gstRate} onChange={(e) => setGstRate(Number(e.target.value))} className={inputCls} disabled={isReadOnly}>
                      {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>GST Type</label>
                    <div className="seg-control">
                      <button type="button" className={gstType === "goods" ? "active" : ""} onClick={() => !isReadOnly && setGstType("goods")}>Goods</button>
                      <button type="button" className={gstType === "services" ? "active" : ""} onClick={() => !isReadOnly && setGstType("services")}>Services</button>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Toggle label="Input Credit Eligible" checked={inputCreditEligible} onChange={setInputCreditEligible} disabled={isReadOnly} />
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* F. Approval Configuration */}
          <Section title="F. Approval Configuration">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Toggle label="Approval Required" checked={approvalRequired} onChange={setApprovalRequired} disabled={isReadOnly} />
              {approvalRequired && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Approval Rule</label>
                    <div className="seg-control">
                      <button type="button" className={approvalRule === "always" ? "active" : ""} onClick={() => !isReadOnly && setApprovalRule("always")}>Always</button>
                      <button type="button" className={approvalRule === "amount_based" ? "active" : ""} onClick={() => !isReadOnly && setApprovalRule("amount_based")}>Amount Based</button>
                    </div>
                  </div>
                  {approvalRule === "amount_based" && (
                    <div>
                      <label className={labelCls}>Threshold Amount (₹)</label>
                      <input type="number" min="0" value={approvalThreshold} onChange={(e) => setApprovalThreshold(e.target.value)} className={inputCls} placeholder="5000" disabled={isReadOnly} />
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Approvers</label>
                    <CheckGroup options={APPROVER_OPTIONS} selected={approvers} onChange={isReadOnly ? () => {} : setApprovers} />
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* G. Employee Policy */}
          <Section title="G. Employee Policy">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Toggle label="Enable HR / Grade-based Rules" checked={hrRulesEnabled} onChange={setHrRulesEnabled} disabled={isReadOnly} />
              {hrRulesEnabled && (
                <div>
                  <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 8 }}>
                    Configure spending limits per employee grade.
                  </div>
                  {gradePolicies.length > 0 && (
                    <div style={{ overflowX: "auto", marginBottom: 8 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                        <thead>
                          <tr style={{ background: "var(--bg-muted)" }}>
                            <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600, color: "var(--fg-3)" }}>Grade</th>
                            <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600, color: "var(--fg-3)" }}>Daily Limit (₹)</th>
                            <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600, color: "var(--fg-3)" }}>Monthly Limit (₹)</th>
                            <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: 600, color: "var(--fg-3)" }}>Approval</th>
                            {!isReadOnly && <th style={{ width: 32 }} />}
                          </tr>
                        </thead>
                        <tbody>
                          {gradePolicies.map((p, i) => (
                            <tr key={i} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                              <td style={{ padding: "4px 6px" }}>
                                {isReadOnly ? p.grade : (
                                  <select value={p.grade} onChange={(e) => updateGradePolicy(i, { grade: e.target.value })}
                                    style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "3px 6px", fontSize: 12, width: "100%" }}>
                                    {EMPLOYEE_GRADES.map((g) => <option key={g}>{g}</option>)}
                                  </select>
                                )}
                              </td>
                              <td style={{ padding: "4px 6px" }}>
                                {isReadOnly ? <span style={{ display: "block", textAlign: "right" }}>{p.dailyLimit}</span> : (
                                  <input type="number" min="0" value={p.dailyLimit}
                                    onChange={(e) => updateGradePolicy(i, { dailyLimit: Number(e.target.value) })}
                                    style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "3px 6px", fontSize: 12, width: "100%", textAlign: "right" }} />
                                )}
                              </td>
                              <td style={{ padding: "4px 6px" }}>
                                {isReadOnly ? <span style={{ display: "block", textAlign: "right" }}>{p.monthlyLimit}</span> : (
                                  <input type="number" min="0" value={p.monthlyLimit}
                                    onChange={(e) => updateGradePolicy(i, { monthlyLimit: Number(e.target.value) })}
                                    style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "3px 6px", fontSize: 12, width: "100%", textAlign: "right" }} />
                                )}
                              </td>
                              <td style={{ padding: "4px 6px", textAlign: "center" }}>
                                <input type="checkbox" checked={p.requiresApproval}
                                  onChange={(e) => !isReadOnly && updateGradePolicy(i, { requiresApproval: e.target.checked })}
                                  style={{ accentColor: "var(--caveo-red)" }} disabled={isReadOnly} />
                              </td>
                              {!isReadOnly && (
                                <td style={{ padding: "4px 6px" }}>
                                  <button type="button" onClick={() => removeGradePolicy(i)} style={{ color: "var(--caveo-red)", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {!isReadOnly && (
                    <button type="button" className="btn-cav btn-cav-secondary btn-cav-sm" onClick={addGradePolicy}>
                      <Plus size={13} /> Add Grade Rule
                    </button>
                  )}
                </div>
              )}
            </div>
          </Section>

          {/* H. Customer Expense */}
          <Section title="H. Customer Expense Configuration">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Toggle label="Enable Customer Cost Tracking" checked={customerTrackingEnabled} onChange={(v) => { setCustomerTrackingEnabled(v); if (!v) { setAllowLinkCustomer(false); setAllowLinkProject(false); setAllowLinkSalesOrder(false); setAllowLinkTicket(false); } }} disabled={isReadOnly} />
              {customerTrackingEnabled && (
                <div>
                  <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 10 }}>Expenses can be linked to:</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <Toggle label="Customer" checked={allowLinkCustomer} onChange={setAllowLinkCustomer} disabled={isReadOnly} />
                    <Toggle label="Project" checked={allowLinkProject} onChange={setAllowLinkProject} disabled={isReadOnly} />
                    <Toggle label="Sales Order" checked={allowLinkSalesOrder} onChange={setAllowLinkSalesOrder} disabled={isReadOnly} />
                    <Toggle label="Ticket" checked={allowLinkTicket} onChange={setAllowLinkTicket} disabled={isReadOnly} />
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* I. Tally Mapping */}
          <Section title="I. Tally Mapping">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Tally Ledger Name</label>
                <input value={tallyLedger} onChange={(e) => setTallyLedger(e.target.value)} className={inputCls} placeholder="e.g. Travelling Expense" disabled={isReadOnly} />
              </div>
              <div>
                <label className={labelCls}>GST Ledger Mapping</label>
                <input value={tallyGSTLedger} onChange={(e) => setTallyGSTLedger(e.target.value)} className={inputCls} placeholder="e.g. GST Input - Services 18%" disabled={isReadOnly} />
              </div>
              <div className="sm:col-span-2" style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <Toggle label="Cost Centre Required" checked={tallyCostCenterRequired} onChange={setTallyCostCenterRequired} disabled={isReadOnly} />
                <Toggle label="Export Enabled" checked={tallyExportEnabled} onChange={setTallyExportEnabled} disabled={isReadOnly} />
              </div>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-cav btn-cav-ghost" onClick={onClose}>Cancel</button>
          {!isReadOnly && (
            <button className="btn-cav btn-cav-primary" onClick={handleSave}>
              {ed ? "Save Changes" : "Create Category"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
