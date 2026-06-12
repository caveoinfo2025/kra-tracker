"use client";
import { X, Printer, Download, FileText, CheckCircle2, Link2, History } from "lucide-react";
import { CashTxn, CashCaps, fmtINR, fmtDate, reconBadge, SOURCE_META } from "../data";

export default function CashTransactionDrawer({
  txn, caps, onClose, onReconcile, accountName,
}: {
  txn: CashTxn;
  caps: CashCaps;
  onClose: () => void;
  onReconcile: (id: number) => void;
  accountName?: string;
}) {
  const displayAccount = accountName ?? txn.accountId;
  const amount = txn.debit || txn.credit;
  const dir = txn.debit ? "Debit" : "Credit";

  const Row = ({ k, v }: { k: string; v?: string }) =>
    v ? (<><div className="kv-key">{k}</div><div className="kv-val">{v}</div></>) : null;

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-pane" onClick={(e) => e.stopPropagation()}>
        <div className="dp-head">
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--caveo-red)", textDecoration: txn.reversed ? "line-through" : undefined }}>{txn.txnNo}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg-1)", marginTop: 2 }}>
              {dir === "Credit" ? "+" : "−"}{fmtINR(amount)}
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className={`badge ${reconBadge(txn.recon)}`}>{txn.recon}</span>
              <span className={`badge ${txn.approval === "Approved" ? "badge-success" : "badge-warning"}`}>{txn.approval}</span>
              {txn.adjusted && <span className="badge badge-warning">Adjusted</span>}
              {txn.reversed && <span className="badge badge-danger">Reversed</span>}
            </div>
          </div>
          <button onClick={onClose} className="btn-cav btn-cav-ghost btn-cav-sm" aria-label="Close"><X size={16} /></button>
        </div>

        <div className="dp-body">
          {/* Basic */}
          <div>
            <div className="section-label">Basic Information</div>
            <div className="kv-grid">
              <Row k="Txn No" v={txn.txnNo} />
              <Row k="Date" v={fmtDate(txn.date)} />
              <Row k="Cash Account" v={displayAccount} />
              <Row k="Amount" v={`${fmtINR(amount)} (${dir})`} />
              <Row k="Type" v={txn.type} />
              <Row k="Category" v={txn.category} />
              <Row k="Reference" v={txn.refNo} />
              <Row k="Description" v={txn.description} />
            </div>
          </div>

          {/* Mapped source */}
          {txn.source && (
            <div>
              <div className="section-label">Mapped To</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface-alt)" }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(200,16,46,0.06)", color: "var(--caveo-red)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Link2 size={15} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className={`badge ${SOURCE_META[txn.source.kind].badge}`}>{SOURCE_META[txn.source.kind].label}</span>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg-1)", marginTop: 4 }}>{txn.source.label}</div>
                </div>
              </div>
            </div>
          )}

          {/* Related */}
          {(txn.customer || txn.vendor || txn.employee || txn.voucherRef || txn.expenseRef || txn.bankTransferRef || txn.salesOrder) && (
            <div>
              <div className="section-label">Related Information</div>
              <div className="kv-grid">
                <Row k="Customer" v={txn.customer} />
                <Row k="Project" v={txn.project} />
                <Row k="Sales Order" v={txn.salesOrder} />
                <Row k="Vendor" v={txn.vendor} />
                <Row k="Employee" v={txn.employee} />
                <Row k="Expense Ref" v={txn.expenseRef} />
                <Row k="Voucher Ref" v={txn.voucherRef} />
                <Row k="Bank Transfer Ref" v={txn.bankTransferRef} />
              </div>
            </div>
          )}

          {/* Attachments */}
          <div>
            <div className="section-label">Attachments</div>
            {txn.attachments && txn.attachments.length > 0 ? (
              txn.attachments.map((a) => (
                <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 6 }}>
                  <FileText size={16} style={{ color: "var(--fg-3)" }} />
                  <span style={{ flex: 1, fontSize: 12.5 }}>{a.name}</span>
                  <button className="btn-cav btn-cav-ghost btn-cav-sm"><Download size={13} /></button>
                </div>
              ))
            ) : <div style={{ fontSize: 12.5, color: "var(--fg-4)" }}>No attachments.</div>}
          </div>

          {/* Approval */}
          <div>
            <div className="section-label">Approval Information</div>
            <div className="kv-grid">
              <Row k="Status" v={txn.approval} />
              <Row k="Approved By" v={txn.approvedBy ?? (txn.approval === "Approved" ? txn.createdBy : "—")} />
              <Row k="Approved Date" v={txn.approvedDate ? fmtDate(txn.approvedDate) : (txn.approval === "Approved" ? fmtDate(txn.date) : "—")} />
            </div>
          </div>

          {/* Audit */}
          <div>
            <div className="section-label">Audit Information</div>
            <div className="kv-grid">
              <Row k="Created By" v={txn.createdBy} />
              <Row k="Created Date" v={fmtDate(txn.date)} />
              <Row k="Modified By" v={txn.modifiedBy ?? "—"} />
              <Row k="Modified Date" v={txn.modifiedDate ? fmtDate(txn.modifiedDate) : "—"} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="btn-cav btn-cav-ghost" onClick={() => window.print()}><Printer size={14} /> Print</button>
          <button className="btn-cav btn-cav-ghost"><History size={14} /> Audit Trail</button>
          {caps.canApproveRecon && txn.recon !== "Reconciled" && (
            <button className="btn-cav btn-cav-primary" onClick={() => onReconcile(txn.id)}><CheckCircle2 size={14} /> Mark Reconciled</button>
          )}
        </div>
      </div>
    </div>
  );
}
