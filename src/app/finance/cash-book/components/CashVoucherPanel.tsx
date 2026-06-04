"use client";
import { FileText, Eye, Printer, Download } from "lucide-react";
import { CashTxn, fmtINR, fmtDate } from "../data";

/**
 * CashVoucherPanel — vouchers generated for cash transactions, with view /
 * print / download actions. Status is derived from the transaction's approval.
 */
export default function CashVoucherPanel({ txns, onView }: { txns: CashTxn[]; onView: (t: CashTxn) => void }) {
  const vouchers = txns.filter((t) => t.voucherRef);

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileText size={15} style={{ color: "var(--fg-3)" }} />
          <div className="ch-title">Vouchers</div>
        </div>
        <div className="ch-sub">{vouchers.length} linked</div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="crm-table">
          <thead>
            <tr><th>Voucher No</th><th>Date</th><th>Type</th><th className="th-right">Amount</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {vouchers.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "var(--fg-4)" }}>No vouchers linked to cash transactions.</td></tr>
            ) : vouchers.map((t) => (
              <tr key={t.id} onClick={() => onView(t)}>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--caveo-red)" }}>{t.voucherRef}</td>
                <td className="cell-sub">{fmtDate(t.date)}</td>
                <td className="cell-sub">{t.type}</td>
                <td className="td-right cell-strong">{fmtINR(t.debit || t.credit)}</td>
                <td><span className={`badge ${t.approval === "Approved" ? "badge-success" : "badge-warning"}`}>{t.approval === "Approved" ? "Approved" : "Pending"}</span></td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className="btn-cav btn-cav-ghost btn-cav-sm" title="View" onClick={() => onView(t)}><Eye size={13} /></button>
                    <button className="btn-cav btn-cav-ghost btn-cav-sm" title="Print" onClick={() => window.print()}><Printer size={13} /></button>
                    <button className="btn-cav btn-cav-ghost btn-cav-sm" title="Download PDF"><Download size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
