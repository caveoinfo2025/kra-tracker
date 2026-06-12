"use client";
import { X, Printer, Download, FileText, CheckCircle2, Link2 } from "lucide-react";
import { BankTxn, BankCaps, fmtINR, fmtDate, reconBadge, SOURCE_META } from "../data";

/**
 * BankTransactionDrawer — right-side detail pane for one transaction.
 * Reuses `.detail-overlay` / `.detail-pane` / `.kv-grid` / `.timeline`.
 */
export default function BankTransactionDrawer({
  txn, caps, onClose, onReconcile, accountName,
}: {
  txn: BankTxn;
  caps: BankCaps;
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
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--caveo-red)" }}>{txn.txnNo}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg-1)", marginTop: 2 }}>
              {dir === "Credit" ? "+" : "−"}{fmtINR(amount)}
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className={`badge ${reconBadge(txn.recon)}`}>{txn.recon}</span>
              <span className={`badge ${txn.approval === "Approved" ? "badge-success" : "badge-warning"}`}>{txn.approval}</span>
              {txn.imported && <span className="badge badge-info">Imported</span>}
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
              <Row k="Account" v={displayAccount} />
              <Row k="Amount" v={`${fmtINR(amount)} (${dir})`} />
              <Row k="Type" v={txn.type} />
              <Row k="Mode" v={txn.mode} />
              <Row k="Reference" v={txn.refNo} />
              <Row k="Description" v={txn.description} />
            </div>
          </div>

          {/* Linked source document */}
          {txn.source && (
            <div>
              <div className="section-label">Mapped To</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface-alt)" }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(200,16,46,0.06)", color: "var(--caveo-red)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Link2 size={15} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className={`badge ${SOURCE_META[txn.source.kind].badge}`}>{SOURCE_META[txn.source.kind].label}</span>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg-1)", marginTop: 4 }}>{txn.source.label}</div>
                </div>
              </div>
            </div>
          )}

          {/* Related */}
          {(txn.party || txn.voucherRef || txn.expenseRef) && (
            <div>
              <div className="section-label">Related Information</div>
              <div className="kv-grid">
                {txn.partyKind === "customer" && <Row k="Customer" v={txn.party} />}
                {txn.partyKind === "vendor" && <Row k="Vendor" v={txn.party} />}
                {txn.partyKind === "employee" && <Row k="Employee" v={txn.party} />}
                {txn.partyKind === "" && txn.party && <Row k="Counterparty" v={txn.party} />}
                <Row k="Voucher Ref" v={txn.voucherRef} />
                <Row k="Expense Ref" v={txn.expenseRef} />
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
            ) : (
              <div style={{ fontSize: 12.5, color: "var(--fg-4)" }}>No attachments.</div>
            )}
          </div>

          {/* Audit trail */}
          <div>
            <div className="section-label">Audit Trail</div>
            <div className="timeline">
              <div className="timeline-item">
                <div className="body">Created by <b>{txn.createdBy}</b></div>
                <div className="when">{fmtDate(txn.date)}</div>
              </div>
              {txn.approvedBy && (
                <div className="timeline-item">
                  <div className="body">Approved by <b>{txn.approvedBy}</b></div>
                </div>
              )}
              {txn.imported && (
                <div className="timeline-item">
                  <div className="body">Imported from statement <b>{txn.importRef}</b></div>
                </div>
              )}
              {txn.modifiedBy && (
                <div className="timeline-item">
                  <div className="body">Last modified by <b>{txn.modifiedBy}</b></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="btn-cav btn-cav-ghost" onClick={() => window.print()}><Printer size={14} /> Print</button>
          {caps.canApproveRecon && txn.recon !== "Reconciled" && (
            <button className="btn-cav btn-cav-primary" onClick={() => onReconcile(txn.id)}>
              <CheckCircle2 size={14} /> Mark Reconciled
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
