"use client";

import { useState } from "react";
import { X, Check, AlertTriangle, Clock, Paperclip, MessageSquare } from "lucide-react";
import {
  ApprovalRequest, ApprovalCaps, requestStatusBadge, priorityBadge, moduleBadge,
  fmtDateTime, fmtDate, fmtINR,
} from "../data";

interface Props {
  request: ApprovalRequest;
  caps: ApprovalCaps;
  onClose: () => void;
  onApprove: (id: number, remarks: string) => void;
  onReject:  (id: number, remarks: string) => void;
  onRequestChanges: (id: number, remarks: string) => void;
}

export default function ApprovalDetailDrawer({ request: r, caps, onClose, onApprove, onReject, onRequestChanges }: Props) {
  const [remarks, setRemarks] = useState("");
  const [action,  setAction]  = useState<"approve" | "reject" | "changes" | null>(null);

  const canAct = caps.canApprove && r.status === "Pending" && r.currentApprover === caps.currentUser;

  function commit() {
    if (!action) return;
    if (action === "approve")  onApprove(r.id, remarks);
    if (action === "reject")   onReject(r.id, remarks);
    if (action === "changes")  onRequestChanges(r.id, remarks);
  }

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-pane" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dp-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="dp-title" style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>{r.requestNo}</div>
              <span className={`badge ${requestStatusBadge(r.status)}`}>{r.status}</span>
              <span className={`badge ${priorityBadge(r.priority)}`}>{r.priority}</span>
            </div>
            <div className="dp-sub">{r.workflowName}</div>
          </div>
          <button className="dp-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="dp-body">
          {/* SLA breach banner */}
          {r.breachedSLA && r.status === "Pending" && (
            <div style={{ background: "rgba(200,16,46,0.07)", border: "1px solid rgba(200,16,46,0.25)", borderRadius: 8, padding: "9px 12px", display: "flex", gap: 8, fontSize: 12.5, color: "var(--caveo-red)", alignItems: "center" }}>
              <AlertTriangle size={14} />
              <span><b>SLA Breached.</b> This request was due by {fmtDateTime(r.slaDeadline)}.</span>
            </div>
          )}

          {/* Meta grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: "var(--border)", borderRadius: 10, overflow: "hidden" }}>
            <MetaCell label="Module"        value={r.module}           badge={moduleBadge(r.module)} />
            <MetaCell label="Type"          value={r.transactionType} />
            <MetaCell label="Requested By"  value={r.requestedBy} sub={r.requestedByDept} />
          </div>

          {/* Amount / details */}
          {r.amount != null && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div className="kpi kpi-accent" style={{ padding: "12px 14px" }}>
                <div className="kpi-label">Amount</div>
                <div className="kpi-value" style={{ fontSize: 20 }}>
                  {r.amountUnit === "%" ? `${r.amount}%` : fmtINR(r.amount)}
                </div>
              </div>
              <div className="kpi" style={{ padding: "12px 14px" }}>
                <div className="kpi-label">Approval Level</div>
                <div className="kpi-value" style={{ fontSize: 20 }}>{r.currentLevel} / {r.totalLevels}</div>
              </div>
            </div>
          )}

          {/* Details */}
          <Section title="Request Details">
            <p style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.65, margin: 0 }}>{r.details}</p>
            {r.referenceId && (
              <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--fg-4)" }}>
                Reference: <span style={{ fontFamily: "var(--font-mono)", color: "var(--caveo-red)" }}>{r.referenceId}</span>
              </div>
            )}
          </Section>

          {/* Timing */}
          <Section title="Timeline">
            <div style={{ display: "flex", gap: 20, fontSize: 12, flexWrap: "wrap" }}>
              <span style={{ color: "var(--fg-3)" }}>Submitted: <b style={{ color: "var(--fg-1)" }}>{fmtDateTime(r.submittedAt)}</b></span>
              <span style={{ color: "var(--fg-3)" }}>SLA: <b style={{ color: r.breachedSLA ? "var(--caveo-red)" : "var(--fg-1)" }}>{r.slaHours}h</b></span>
              <span style={{ color: "var(--fg-3)" }}>Deadline: <b style={{ color: r.breachedSLA ? "var(--caveo-red)" : "var(--fg-1)" }}>{fmtDateTime(r.slaDeadline)}</b></span>
              <span style={{ color: "var(--fg-3)" }}>Current Approver: <b style={{ color: "var(--fg-1)" }}>{r.currentApprover}</b></span>
            </div>
          </Section>

          {/* Attachments */}
          {r.attachments.length > 0 && (
            <Section title="Attachments">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {r.attachments.map((a) => (
                  <div key={a} style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "var(--fg-2)" }}>
                    <Paperclip size={11} /> {a}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Approval Timeline */}
          <Section title="Approval Timeline">
            <div className="timeline">
              {r.history.map((h, i) => {
                const isApproved = h.action === "Approved";
                const isRejected = h.action === "Rejected";
                const color = isApproved ? "var(--success)" : isRejected ? "var(--caveo-red)" : "var(--fg-3)";
                return (
                  <div key={i} className="timeline-item">
                    <div style={{ position: "absolute", left: -18, top: 2, width: 14, height: 14, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                      {isApproved ? <Check size={8} /> : isRejected ? <X size={8} /> : <Clock size={8} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {h.action}
                        {h.level > 0 && <span style={{ color: "var(--fg-4)", fontSize: 11, marginLeft: 6 }}>Level {h.level}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 1 }}>
                        {h.approver} · {fmtDateTime(h.date)}
                      </div>
                      {h.remarks && (
                        <div style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 4, background: "var(--bg-muted)", borderRadius: 6, padding: "5px 9px", display: "flex", gap: 5, alignItems: "flex-start" }}>
                          <MessageSquare size={11} style={{ marginTop: 1, flexShrink: 0 }} />
                          {h.remarks}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {r.status === "Pending" && (
                <div className="timeline-item" style={{ opacity: 0.5 }}>
                  <div style={{ position: "absolute", left: -18, top: 2, width: 14, height: 14, borderRadius: "50%", background: "var(--fg-4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Clock size={8} color="#fff" />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--fg-4)" }}>Awaiting Level {r.currentLevel} — {r.currentApprover}</div>
                </div>
              )}
            </div>
          </Section>

          {/* Action panel */}
          {canAct && (
            <Section title="Your Action">
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                {(["approve", "reject", "changes"] as const).map((a) => (
                  <button key={a} type="button" onClick={() => setAction(action === a ? null : a)}
                    style={{
                      flex: 1, border: `1.5px solid ${action === a ? "var(--caveo-red)" : "var(--border)"}`,
                      background: action === a ? "rgba(200,16,46,0.06)" : "var(--bg-elev)",
                      borderRadius: 8, padding: "8px 0", cursor: "pointer",
                      fontSize: 12.5, fontWeight: 600, fontFamily: "var(--font-sans)",
                      color: action === a ? "var(--caveo-red)" : "var(--fg-2)",
                    }}>
                    {a === "approve" ? "✓ Approve" : a === "reject" ? "✗ Reject" : "⟳ Request Changes"}
                  </button>
                ))}
              </div>
              {action && (
                <>
                  <textarea
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
                    rows={2} placeholder="Add remarks (optional)…"
                    value={remarks} onChange={(e) => setRemarks(e.target.value)} style={{ resize: "vertical", width: "100%" }} />
                  <button
                    className="btn-cav btn-cav-primary"
                    style={{ marginTop: 8, background: action === "approve" ? "var(--success)" : action === "reject" ? "var(--caveo-red)" : undefined, border: "none" }}
                    onClick={commit}>
                    Confirm {action === "approve" ? "Approval" : action === "reject" ? "Rejection" : "Change Request"}
                  </button>
                </>
              )}
            </Section>
          )}
        </div>

        <div className="dp-footer">
          <button className="btn-cav btn-cav-secondary" onClick={onClose} style={{ marginLeft: "auto" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--fg-4)", marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function MetaCell({ label, value, sub, badge }: { label: string; value: string; sub?: string; badge?: string }) {
  return (
    <div style={{ background: "var(--bg-muted)", padding: "10px 14px" }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.08em", color: "var(--fg-4)", marginBottom: 3 }}>{label}</div>
      {badge
        ? <span className={`badge ${badge}`}>{value}</span>
        : <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>{value}</div>
      }
      {sub && <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 1 }}>{sub}</div>}
    </div>
  );
}
