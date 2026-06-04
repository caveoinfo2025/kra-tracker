"use client";
import { Printer } from "lucide-react";
import { fmtINR, fmtDate } from "../data";

/** VoucherPreviewPanel — preview of the cash voucher (CI/YY-YY/00001). */
export default function VoucherPreviewPanel({
  voucherNo, date, amount, payee, narration,
}: {
  voucherNo: string; date: string; amount: number; payee: string; narration: string;
}) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", background: "var(--surface-alt)" }}>
      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-display)" }}>CAVEO INFOSYSTEMS</div>
          <div style={{ fontSize: 10.5, color: "var(--fg-4)" }}>Payment Voucher</div>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--caveo-red)", fontWeight: 600 }}>{voucherNo}</div>
      </div>
      <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "90px 1fr", gap: "8px 12px", fontSize: 12.5 }}>
        <span style={{ color: "var(--fg-3)" }}>Date</span><span style={{ color: "var(--fg-1)", fontWeight: 500 }}>{fmtDate(date)}</span>
        <span style={{ color: "var(--fg-3)" }}>Amount</span><span style={{ color: "var(--fg-1)", fontWeight: 700 }}>{fmtINR(amount)}</span>
        <span style={{ color: "var(--fg-3)" }}>Paid To</span><span style={{ color: "var(--fg-1)" }}>{payee || "—"}</span>
        <span style={{ color: "var(--fg-3)" }}>Narration</span><span style={{ color: "var(--fg-1)" }}>{narration || "—"}</span>
      </div>
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10.5, color: "var(--fg-4)" }}>Prepared by ____ · Approved by ____</span>
        <button type="button" className="btn-cav btn-cav-ghost btn-cav-sm" onClick={() => window.print()}><Printer size={13} /> Print</button>
      </div>
    </div>
  );
}
