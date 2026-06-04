"use client";
import { X, Pencil, Ban, Copy, CheckCircle2 } from "lucide-react";
import {
  ExpenseCategory, CatCaps, USAGE_KEYS, USAGE_LABELS, BILL_LABELS,
  statusBadge, getParentName, fmtDate, CATEGORIES,
} from "../data";

export default function CategoryDrawer({
  cat, caps, onClose, onEdit, onDisable, onClone,
}: {
  cat: ExpenseCategory;
  caps: CatCaps;
  onClose: () => void;
  onEdit: (c: ExpenseCategory) => void;
  onDisable: (ids: number[]) => void;
  onClone: (c: ExpenseCategory) => void;
}) {
  const Row = ({ k, v }: { k: string; v?: string | React.ReactNode }) =>
    v ? (
      <>
        <div className="kv-key">{k}</div>
        <div className="kv-val">{v}</div>
      </>
    ) : null;

  const parentName = getParentName(CATEGORIES, cat.parentId);
  const usages = USAGE_KEYS.filter((k) => cat[k]).map((k) => USAGE_LABELS[k]);
  const subCats = CATEGORIES.filter((c) => c.parentId === cat.id);

  const YN = (v: boolean) => v
    ? <span className="badge badge-success" style={{ fontSize: 10 }}>Yes</span>
    : <span className="badge badge-neutral" style={{ fontSize: 10 }}>No</span>;

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-pane" style={{ width: "min(560px, 95vw)" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dp-head">
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--caveo-red)" }}>{cat.code}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg-1)", marginTop: 2 }}>{cat.name}</div>
            <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className={`badge ${statusBadge(cat.status)}`}>{cat.status}</span>
              {cat.parentId === null && <span className="badge badge-info" style={{ fontSize: 10 }}>Parent Category</span>}
              {cat.gstEnabled && <span className="badge badge-warning" style={{ fontSize: 10 }}>GST {cat.gstRate}%</span>}
              {cat.approvalRequired && <span className="badge badge-neutral" style={{ fontSize: 10 }}>Approval Required</span>}
            </div>
          </div>
          <button onClick={onClose} className="btn-cav btn-cav-ghost btn-cav-sm"><X size={16} /></button>
        </div>

        <div className="dp-body">
          {/* Category Information */}
          <div>
            <div className="section-label">Category Information</div>
            <div className="kv-grid">
              <Row k="Code" v={<span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{cat.code}</span>} />
              <Row k="Name" v={cat.name} />
              <Row k="Parent" v={cat.parentId === null ? "— (Top-level)" : parentName} />
              <Row k="Description" v={cat.description || "—"} />
              <Row k="Status" v={<span className={`badge ${statusBadge(cat.status)}`}>{cat.status}</span>} />
            </div>
          </div>

          {/* Usage Rules */}
          <div>
            <div className="section-label">Usage Rules</div>
            {usages.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {usages.map((u) => <span key={u} className="badge badge-neutral" style={{ fontSize: 11 }}>{u}</span>)}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: "var(--fg-4)" }}>No usage types configured.</div>
            )}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11.5, color: "var(--fg-3)", fontWeight: 600, marginBottom: 4 }}>Allowed Payment Modes</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {cat.allowedPaymentModes.map((m) => <span key={m} className="badge badge-neutral" style={{ fontSize: 10 }}>{m}</span>)}
              </div>
            </div>
          </div>

          {/* Document Rules */}
          <div>
            <div className="section-label">Document Rules</div>
            <div className="kv-grid">
              <Row k="Bill Required" v={BILL_LABELS[cat.billRequired]} />
              {cat.billRequired === "amount_based" && (
                <Row k="Bill Threshold" v={`₹${cat.billAmountThreshold.toLocaleString("en-IN")} and above`} />
              )}
              <Row k="Attachments" v={cat.allowedAttachments.join(", ")} />
            </div>
          </div>

          {/* GST Settings */}
          <div>
            <div className="section-label">GST Settings</div>
            <div className="kv-grid">
              <Row k="GST Enabled" v={YN(cat.gstEnabled)} />
              {cat.gstEnabled && (
                <>
                  <Row k="GST Rate" v={`${cat.gstRate}%`} />
                  <Row k="GST Type" v={cat.gstType === "goods" ? "Goods" : "Services"} />
                  <Row k="Input Credit" v={YN(cat.inputCreditEligible)} />
                </>
              )}
            </div>
          </div>

          {/* Approval Rules */}
          <div>
            <div className="section-label">Approval Rules</div>
            <div className="kv-grid">
              <Row k="Approval Required" v={YN(cat.approvalRequired)} />
              {cat.approvalRequired && (
                <>
                  <Row k="Approval Rule" v={cat.approvalRule === "always" ? "Always" : `Above ₹${cat.approvalThreshold.toLocaleString("en-IN")}`} />
                  <Row k="Approvers" v={cat.approvers.join(", ")} />
                </>
              )}
            </div>
          </div>

          {/* Employee Limits */}
          {cat.hrRulesEnabled && cat.gradePolicies.length > 0 && (
            <div>
              <div className="section-label">Employee Grade Limits</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: "var(--bg-muted)" }}>
                      <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600, color: "var(--fg-3)" }}>Grade</th>
                      <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600, color: "var(--fg-3)" }}>Daily</th>
                      <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600, color: "var(--fg-3)" }}>Monthly</th>
                      <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: 600, color: "var(--fg-3)" }}>Approval</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.gradePolicies.map((p, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "5px 8px", fontWeight: 500 }}>{p.grade}</td>
                        <td style={{ padding: "5px 8px", textAlign: "right" }}>₹{p.dailyLimit.toLocaleString("en-IN")}</td>
                        <td style={{ padding: "5px 8px", textAlign: "right" }}>₹{p.monthlyLimit.toLocaleString("en-IN")}</td>
                        <td style={{ padding: "5px 8px", textAlign: "center" }}>
                          {p.requiresApproval ? <CheckCircle2 size={13} style={{ color: "var(--success)" }} /> : <span style={{ color: "var(--fg-4)" }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Customer Mapping */}
          {cat.customerTrackingEnabled && (
            <div>
              <div className="section-label">Customer Expense Configuration</div>
              <div className="kv-grid">
                <Row k="Customer Tracking" v={YN(true)} />
                <Row k="Link Customer" v={YN(cat.allowLinkCustomer)} />
                <Row k="Link Project" v={YN(cat.allowLinkProject)} />
                <Row k="Link Sales Order" v={YN(cat.allowLinkSalesOrder)} />
                <Row k="Link Ticket" v={YN(cat.allowLinkTicket)} />
              </div>
            </div>
          )}

          {/* Tally Mapping */}
          <div>
            <div className="section-label">Tally Mapping</div>
            <div className="kv-grid">
              <Row k="Tally Ledger" v={cat.tallyLedger || "—"} />
              <Row k="GST Ledger" v={cat.tallyGSTLedger || "—"} />
              <Row k="Cost Centre" v={YN(cat.tallyCostCenterRequired)} />
              <Row k="Export Enabled" v={YN(cat.tallyExportEnabled)} />
            </div>
          </div>

          {/* Sub-categories (if parent) */}
          {subCats.length > 0 && (
            <div>
              <div className="section-label">Sub-categories ({subCats.length})</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {subCats.map((s) => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-alt)", fontSize: 12.5 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--caveo-red)" }}>{s.code}</span>
                    <span style={{ fontWeight: 500 }}>{s.name}</span>
                    <span className={`badge ${statusBadge(s.status)}`} style={{ fontSize: 9 }}>{s.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit History */}
          {cat.auditHistory.length > 0 && (
            <div>
              <div className="section-label">Audit History</div>
              <div className="timeline">
                {cat.auditHistory.map((e, i) => (
                  <div key={i} className="timeline-item">
                    <div className="body">
                      <b>{e.action}</b> by {e.by}
                      {e.oldVal && e.newVal && (
                        <span style={{ marginLeft: 6, fontSize: 11.5, color: "var(--fg-3)" }}>
                          {e.oldVal} → {e.newVal}
                        </span>
                      )}
                      {e.reason && <span style={{ marginLeft: 6, color: "var(--fg-3)", fontSize: 11.5 }}>({e.reason})</span>}
                    </div>
                    <div className="when">{fmtDate(e.at)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {caps.canCreate && (
            <button className="btn-cav btn-cav-ghost" onClick={() => onClone(cat)}><Copy size={14} /> Clone</button>
          )}
          {caps.canDisable && cat.status === "Active" && (
            <button className="btn-cav btn-cav-ghost" style={{ color: "var(--caveo-red)" }} onClick={() => { onDisable([cat.id]); onClose(); }}>
              <Ban size={14} /> Disable
            </button>
          )}
          {caps.canEdit && (
            <button className="btn-cav btn-cav-primary" onClick={() => { onClose(); onEdit(cat); }}>
              <Pencil size={14} /> Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
