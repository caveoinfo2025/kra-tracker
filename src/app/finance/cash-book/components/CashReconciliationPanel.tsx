"use client";
import { useState } from "react";
import { ClipboardCheck, History } from "lucide-react";
import { CashCaps, ReconHistoryRow, fmtINR, fmtDate, fmtDateTime } from "../data";

/**
 * CashReconciliationPanel — verify physical cash against the system balance.
 * Start → enter physical count → variance computed → submit (remarks required
 * when a variance exists). Mock only.
 */
export default function CashReconciliationPanel({
  systemBalance, caps, history, currentUser, onSubmit,
}: {
  systemBalance: number;
  caps: CashCaps;
  history: ReconHistoryRow[];
  currentUser: string;
  onSubmit: (row: Omit<ReconHistoryRow, "id" | "accountId">) => void;
}) {
  const [active, setActive] = useState(false);
  const [physical, setPhysical] = useState("");
  const [remarks, setRemarks] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState("");

  const physicalNum = parseFloat(physical) || 0;
  const variance = active && physical !== "" ? physicalNum - systemBalance : 0;
  const hasVariance = Math.abs(variance) > 0.001;
  const status: ReconHistoryRow["status"] = hasVariance ? "Variance Found" : "Reconciled";

  function submit() {
    setError("");
    if (physical === "") return setError("Enter the physical cash count.");
    if (hasVariance && !remarks.trim()) return setError("Remarks are required when a variance exists.");
    onSubmit({
      date: new Date().toISOString(), by: currentUser,
      systemBalance, physicalCount: physicalNum, variance, status, remarks: remarks.trim(),
    });
    setActive(false); setPhysical(""); setRemarks("");
  }

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ClipboardCheck size={15} style={{ color: "var(--fg-3)" }} />
          <div className="ch-title">Cash Reconciliation</div>
        </div>
        <button className="btn-cav btn-cav-ghost btn-cav-sm" onClick={() => setShowHistory((s) => !s)}>
          <History size={13} /> {showHistory ? "Hide" : "View"} History
        </button>
      </div>
      <div className="card-body">
        {!showHistory ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Tile label="System Balance" value={fmtINR(systemBalance)} />
              <Tile label="Physical Count" value={active ? (physical === "" ? "—" : fmtINR(physicalNum)) : "—"} />
              <Tile label="Difference" value={active && physical !== "" ? fmtINR(variance) : "—"}
                tone={!active || physical === "" ? undefined : hasVariance ? (variance < 0 ? "debit" : "credit") : "credit"} />
              <Tile label="Status" badge={!active ? "Not started" : status} />
            </div>

            {active && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Physical Cash Count (₹)</label>
                  <input type="number" min="0" step="0.01" value={physical} onChange={(e) => setPhysical(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" placeholder="Count notes & coins…" autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Remarks {hasVariance && <span className="text-[#C8102E]">* ({variance < 0 ? "Short Cash" : "Excess Cash"})</span>}
                  </label>
                  <input value={remarks} onChange={(e) => setRemarks(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" placeholder={hasVariance ? "Explain the variance…" : "Optional"} />
                </div>
              </div>
            )}

            {error && <div className="mt-3 bg-red-50 text-red-700 text-sm px-3 py-2 rounded border border-red-200">{error}</div>}

            <div className="flex gap-2 mt-3 justify-end">
              {!active ? (
                <button className="btn-cav btn-cav-primary btn-cav-sm" onClick={() => setActive(true)}>Start Reconciliation</button>
              ) : (
                <>
                  <button className="btn-cav btn-cav-ghost btn-cav-sm" onClick={() => { setActive(false); setPhysical(""); setRemarks(""); setError(""); }}>Cancel</button>
                  <button className="btn-cav btn-cav-primary btn-cav-sm" onClick={submit}>Submit Reconciliation</button>
                </>
              )}
            </div>
            {!caps.canApproveRecon && (
              <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 8 }}>Submissions are reviewed by an Accounts Admin / Manager for approval.</div>
            )}
          </>
        ) : (
          <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 10 }}>
            <table className="crm-table">
              <thead><tr><th>Date</th><th>By</th><th className="th-right">System</th><th className="th-right">Physical</th><th className="th-right">Variance</th><th>Status</th><th>Remarks</th></tr></thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "var(--fg-4)" }}>No reconciliations yet.</td></tr>
                ) : history.map((h) => (
                  <tr key={h.id}>
                    <td className="cell-sub" style={{ whiteSpace: "nowrap" }}>{fmtDateTime(h.date)}</td>
                    <td className="cell-sub">{h.by}</td>
                    <td className="td-right">{fmtINR(h.systemBalance)}</td>
                    <td className="td-right">{fmtINR(h.physicalCount)}</td>
                    <td className="td-right" style={{ color: h.variance < 0 ? "var(--caveo-red)" : h.variance > 0 ? "var(--success)" : "var(--fg-3)", fontWeight: 600 }}>{fmtINR(h.variance)}</td>
                    <td><span className={`badge ${h.status === "Reconciled" ? "badge-success" : "badge-warning"}`}>{h.status}</span></td>
                    <td className="cell-sub" style={{ maxWidth: 200 }}>{h.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, tone, badge }: { label: string; value?: string; tone?: "credit" | "debit"; badge?: string }) {
  return (
    <div style={{ background: "var(--bg-muted)", borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-3)", fontWeight: 600 }}>{label}</div>
      {badge ? (
        <div style={{ marginTop: 6 }}>
          <span className={`badge ${badge === "Reconciled" ? "badge-success" : badge === "Variance Found" ? "badge-warning" : "badge-neutral"}`}>{badge}</span>
        </div>
      ) : (
        <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, marginTop: 3, fontVariantNumeric: "tabular-nums", color: tone === "credit" ? "var(--success)" : tone === "debit" ? "var(--caveo-red)" : "var(--fg-1)" }}>{value}</div>
      )}
    </div>
  );
}
