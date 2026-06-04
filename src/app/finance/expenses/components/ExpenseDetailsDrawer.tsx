"use client";
import { X, Printer, Download, Pencil, Check, Ban } from "lucide-react";
import { Expense, ExpenseCaps, fmtINR, fmtDate, approvalBadge, paymentBadge } from "../data";
import ExpenseApprovalTimeline from "./ExpenseApprovalTimeline";
import ExpenseAttachmentViewer from "./ExpenseAttachmentViewer";
import VoucherPreviewPanel from "./VoucherPreviewPanel";
import CustomerExpensePanel from "./CustomerExpensePanel";
import EmployeeClaimPanel from "./EmployeeClaimPanel";

export default function ExpenseDetailsDrawer({
  expense, caps, customerExisting, onClose, onEdit, onApprove, onReject,
}: {
  expense: Expense;
  caps: ExpenseCaps;
  customerExisting: number;
  onClose: () => void;
  onEdit: (e: Expense) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}) {
  const e = expense;
  const Row = ({ k, v }: { k: string; v?: string }) => v ? (<><div className="kv-key">{k}</div><div className="kv-val">{v}</div></>) : null;
  const canAct = caps.canApprove && (e.approvalStatus === "Pending Approval" || e.approvalStatus === "Draft");

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-pane" onClick={(ev) => ev.stopPropagation()}>
        <div className="dp-head">
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--caveo-red)" }}>{e.expenseNo}</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{fmtINR(e.totalAmount)}</div>
            <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className={`badge ${approvalBadge(e.approvalStatus)}`}>{e.approvalStatus}</span>
              <span className={`badge ${paymentBadge(e.paymentStatus)}`}>{e.paymentStatus}</span>
              <span className="badge badge-neutral">{e.type}</span>
            </div>
          </div>
          <button onClick={onClose} className="btn-cav btn-cav-ghost btn-cav-sm"><X size={16} /></button>
        </div>

        <div className="dp-body">
          <div>
            <div className="section-label">Basic Information</div>
            <div className="kv-grid">
              <Row k="Expense No" v={e.expenseNo} /><Row k="Date" v={fmtDate(e.date)} />
              <Row k="Amount" v={fmtINR(e.baseAmount)} /><Row k="Category" v={`${e.category}${e.subCategory ? ` · ${e.subCategory}` : ""}`} />
              <Row k="Branch" v={e.branch} /><Row k="Description" v={e.description} />
            </div>
          </div>

          {(e.customer || e.project || e.vendor || e.employee || e.salesOrder) && (
            <div>
              <div className="section-label">Linked Information</div>
              <div className="kv-grid">
                <Row k="Customer" v={e.customer} /><Row k="Project" v={e.project} />
                <Row k="Opportunity" v={e.opportunity} /><Row k="Sales Order" v={e.salesOrder} />
                <Row k="Vendor" v={e.vendor} /><Row k="Employee" v={e.employee} />
                <Row k="Claim Ref" v={e.claimRef} />
              </div>
            </div>
          )}

          <div>
            <div className="section-label">Financial</div>
            <div className="kv-grid">
              <Row k="Payment Mode" v={e.paymentMode} />
              <Row k="Account" v={e.bankAccount || e.cashAccount} />
              <Row k="Base Amount" v={fmtINR(e.baseAmount)} />
              {e.gstApplicable && <Row k="GST" v={`${fmtINR(e.gstAmount)} (GSTIN ${e.gstNumber || "—"})`} />}
              <Row k="Total" v={fmtINR(e.totalAmount)} />
              <Row k="Ledger Impact" v={`${e.bankAccount ? "Bank" : "Cash"} debit ${fmtINR(e.totalAmount)}`} />
            </div>
          </div>

          {e.type === "Customer Expense" && e.customer && (
            <div><div className="section-label">Customer Profitability</div>
              <CustomerExpensePanel customer={e.customer} existingExpenses={customerExisting} thisExpense={e.totalAmount} />
            </div>
          )}

          {e.type === "Employee Expense" && e.employee && (
            <div><div className="section-label">Employee Advance</div>
              <EmployeeClaimPanel employee={e.employee} claimAmount={e.totalAmount} adjust={e.advanceAdjustment} />
            </div>
          )}

          <div>
            <div className="section-label">Documents</div>
            <ExpenseAttachmentViewer readOnly noBill={!e.billAvailable} items={e.attachments.map((a, i) => ({ id: String(i), name: a.name, isPdf: a.kind === "pdf" }))} />
            {e.voucherGenerated && (
              <div style={{ marginTop: 10 }}>
                <VoucherPreviewPanel voucherNo={e.voucherNo} date={e.date} amount={e.totalAmount} payee={e.vendor || e.employee || e.customer} narration={e.description} />
              </div>
            )}
          </div>

          <div>
            <div className="section-label">Approval</div>
            <ExpenseApprovalTimeline history={e.approvalHistory} />
          </div>

          <div>
            <div className="section-label">Audit</div>
            <div className="kv-grid">
              <Row k="Created By" v={e.createdBy} /><Row k="Created" v={fmtDate(e.date)} />
              <Row k="Modified By" v={e.modifiedBy ?? "—"} />
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="btn-cav btn-cav-ghost" onClick={() => window.print()}><Printer size={14} /> Print</button>
          {caps.canEdit && <button className="btn-cav btn-cav-secondary" onClick={() => onEdit(e)}><Pencil size={14} /> Edit</button>}
          {canAct && <button className="btn-cav btn-cav-secondary" onClick={() => onReject(e.id)}><Ban size={14} /> Reject</button>}
          {canAct && <button className="btn-cav btn-cav-primary" onClick={() => onApprove(e.id)}><Check size={14} /> Approve</button>}
        </div>
      </div>
    </div>
  );
}
