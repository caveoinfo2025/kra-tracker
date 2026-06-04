"use client";

import { useState } from "react";
import { CreditCard, CheckCircle2, X, AlertCircle } from "lucide-react";
import { MonthlyStatement, fmtINR, monthlyBadge } from "../data";

interface Props {
  statements: MonthlyStatement[];
  onPay: (ids: number[], mode: string) => void;
  onClose: () => void;
}

const PAYMENT_MODES = ["Bank Transfer", "UPI"] as const;

export default function MonthlySettlementPanel({ statements, onPay, onClose }: Props) {
  const [month,    setMonth]    = useState("June 2026");
  const [mode,     setMode]     = useState<string>("Bank Transfer");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [step,     setStep]     = useState<"select" | "confirm" | "done">("select");

  const MONTHS = [...new Set(statements.map((s) => s.month))];
  const eligible = statements.filter(
    (s) => s.month === month && ["Approved", "Payment Pending"].includes(s.status)
  );
  const pendingPay = eligible.reduce((s, m) => s + (m.approvedAmount - m.paidAmount), 0);

  const selectedStmts = eligible.filter((s) => selected.has(s.id));
  const totalSelected = selectedStmts.reduce((s, m) => s + (m.approvedAmount - m.paidAmount), 0);

  function toggleAll() {
    if (selected.size === eligible.length) setSelected(new Set());
    else setSelected(new Set(eligible.map((s) => s.id)));
  }
  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handlePay() {
    onPay([...selected], mode);
    setStep("done");
  }

  if (step === "done") {
    return (
      <div className="detail-overlay" onClick={onClose}>
        <div className="detail-pane" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
          <div style={{ padding: "60px 32px", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(31,157,85,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <CheckCircle2 size={32} color="var(--success)" />
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Payment Processed</div>
            <div style={{ fontSize: 13.5, color: "var(--fg-3)", lineHeight: 1.6 }}>
              {selectedStmts.length} employee{selectedStmts.length > 1 ? "s" : ""} · {fmtINR(totalSelected)} via {mode}.<br />
              Employee ledgers updated. Finance expense entry created.
            </div>
            <button className="btn-cav btn-cav-primary" style={{ marginTop: 24 }} onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-pane" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dp-header">
          <div>
            <div className="dp-title">Monthly Payment Settlement</div>
            <div className="dp-sub">Local Conveyance · Batch Payment</div>
          </div>
          <button className="dp-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="dp-body">
          {/* Month + mode */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Select Month</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
                value={month}
                onChange={(e) => { setMonth(e.target.value); setSelected(new Set()); }}
              >
                {MONTHS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment Mode</label>
              <div style={{ display: "flex", gap: 8 }}>
                {PAYMENT_MODES.map((m) => (
                  <button key={m} type="button"
                    onClick={() => setMode(m)}
                    style={{
                      flex: 1, border: `1.5px solid ${mode === m ? "var(--caveo-red)" : "var(--border)"}`,
                      background: mode === m ? "rgba(200,16,46,0.06)" : "var(--bg-elev)",
                      borderRadius: 8, padding: "7px 0", cursor: "pointer",
                      fontSize: 12.5, fontWeight: 600, color: mode === m ? "var(--caveo-red)" : "var(--fg-2)",
                      fontFamily: "var(--font-sans)",
                    }}
                  >{m}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Eligible amount */}
          <div style={{ background: "var(--bg-muted)", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12.5, color: "var(--fg-3)" }}>Eligible for payment ({eligible.length} employees)</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--success)" }}>{fmtINR(pendingPay)}</span>
          </div>

          {/* Employee list */}
          {eligible.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--fg-4)" }}>
              <AlertCircle size={28} strokeWidth={1.2} style={{ display: "block", margin: "0 auto 8px", opacity: 0.5 }} />
              No approved claims pending payment for {month}.
            </div>
          ) : (
            <div className="card" style={{ overflow: "hidden" }}>
              <table className="crm-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input type="checkbox" checked={selected.size === eligible.length} onChange={toggleAll} />
                    </th>
                    <th>Employee</th>
                    <th>Dept</th>
                    <th className="num">Trips</th>
                    <th className="num">Net Payable</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {eligible.map((stmt) => {
                    const net = stmt.approvedAmount - stmt.paidAmount;
                    return (
                      <tr key={stmt.id}>
                        <td><input type="checkbox" checked={selected.has(stmt.id)} onChange={() => toggle(stmt.id)} /></td>
                        <td style={{ fontWeight: 500 }}>{stmt.employee}</td>
                        <td style={{ fontSize: 12 }}>{stmt.department}</td>
                        <td className="num">{stmt.trips}</td>
                        <td className="num" style={{ fontWeight: 700, color: "var(--success)" }}>{fmtINR(net)}</td>
                        <td><span className={`badge ${monthlyBadge(stmt.status)}`}>{stmt.status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Selected total */}
          {selected.size > 0 && (
            <div style={{ background: "rgba(31,157,85,0.07)", border: "1px solid rgba(31,157,85,0.2)", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12.5, color: "var(--fg-2)", fontWeight: 600 }}>
                {selected.size} selected · {mode}
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--success)" }}>{fmtINR(totalSelected)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="dp-footer">
          <button className="btn-cav btn-cav-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-cav btn-cav-primary"
            disabled={selected.size === 0}
            style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
            onClick={() => setStep("confirm")}
          >
            <CreditCard size={14} /> Generate Payment — {fmtINR(totalSelected)}
          </button>
        </div>

        {/* Confirm modal */}
        {step === "confirm" && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(15,17,21,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, borderRadius: 14,
          }}>
            <div style={{ background: "var(--bg-elev)", borderRadius: 12, padding: "28px 32px", maxWidth: 360, boxShadow: "var(--shadow-lg)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Confirm Payment</div>
              <div style={{ fontSize: 13, color: "var(--fg-3)", lineHeight: 1.6, marginBottom: 18 }}>
                Pay <b style={{ color: "var(--fg-1)" }}>{fmtINR(totalSelected)}</b> to{" "}
                <b style={{ color: "var(--fg-1)" }}>{selected.size} employee{selected.size > 1 ? "s" : ""}</b>{" "}
                via <b style={{ color: "var(--fg-1)" }}>{mode}</b> for {month}?<br />
                This will mark the claims as Paid and create a Finance expense entry.
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn-cav btn-cav-secondary" onClick={() => setStep("select")}>Cancel</button>
                <button className="btn-cav btn-cav-primary" style={{ background: "var(--success)", border: "none" }} onClick={handlePay}>
                  Confirm &amp; Pay
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
