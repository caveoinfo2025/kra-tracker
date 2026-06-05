"use client";
import { useState } from "react";
import { X, Plus } from "lucide-react";
import {
  Expense, ExpenseType, EXPENSE_TYPES, PAYMENT_MODES, CATEGORIES, FY, fmtINR, todayISO,
} from "../data";
import { useMasterValues } from "@/hooks/useMasterValues";
import GSTInputSection, { GSTState, EMPTY_GST, gstTotal } from "./GSTInputSection";
import ExpenseAttachmentViewer, { AttachmentItem } from "./ExpenseAttachmentViewer";
import CustomerExpensePanel from "./CustomerExpensePanel";
import EmployeeClaimPanel from "./EmployeeClaimPanel";
import VoucherPreviewPanel from "./VoucherPreviewPanel";

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

const VENDORS = ["Croma Retail", "Sify Technologies", "Blue Dart", "KPMG", "Bosch Service", "Amazon Business"];
const BRANCHES = ["Head Office", "Bangalore", "Chennai"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="section-label">{title}</div>
      {children}
    </div>
  );
}

export default function ExpenseForm({
  initial, presetType, currentUser, existingByCustomer, onClose, onSave,
}: {
  initial: Expense | null;
  presetType?: ExpenseType;
  currentUser: string;
  existingByCustomer: (c: string) => number;
  onClose: () => void;
  onSave: (e: Omit<Expense, "id" | "expenseNo" | "approvalHistory">, submit: boolean) => void;
}) {
  const ed = initial;
  const expenseCategories = useMasterValues("EXPENSE_CATEGORY_LIST", Object.keys(CATEGORIES));
  // Basic
  const [date, setDate] = useState(ed?.date ?? todayISO());
  const [branch, setBranch] = useState(ed?.branch ?? "Head Office");
  const [type, setType] = useState<ExpenseType>(ed?.type ?? presetType ?? "General Expense");
  const [category, setCategory] = useState(ed?.category ?? "");
  const [subCategory, setSubCategory] = useState(ed?.subCategory ?? "");
  const [description, setDescription] = useState(ed?.description ?? "");
  // Payment
  const [paymentMode, setPaymentMode] = useState(ed?.paymentMode ?? "Cash");
  const [cashAccount, setCashAccount] = useState(ed?.cashAccount ?? "Cash — Head Office");
  const [bankAccount, setBankAccount] = useState(ed?.bankAccount ?? "HDFC Current");
  const [baseAmount, setBaseAmount] = useState(ed ? String(ed.baseAmount) : "");
  // Customer
  const [customer, setCustomer] = useState(ed?.customer ?? "");
  const [opportunity, setOpportunity] = useState(ed?.opportunity ?? "");
  const [salesOrder, setSalesOrder] = useState(ed?.salesOrder ?? "");
  const [project, setProject] = useState(ed?.project ?? "");
  const [ticketRef, setTicketRef] = useState(ed?.ticketRef ?? "");
  // Vendor
  const [vendor, setVendor] = useState(ed?.vendor ?? "");
  const [newVendor, setNewVendor] = useState(false);
  const [invoiceAvailable, setInvoiceAvailable] = useState<"yes" | "no">(ed?.invoiceNo ? "yes" : "no");
  const [invoiceNo, setInvoiceNo] = useState(ed?.invoiceNo ?? "");
  const [invoiceDate, setInvoiceDate] = useState(ed?.invoiceDate ?? "");
  const [gst, setGst] = useState<GSTState>(ed?.gstApplicable
    ? { enabled: true, gstNumber: ed.gstNumber, taxable: String(ed.taxable), rate: 18, type: ed.igst ? "inter" : "intra", cgst: String(ed.cgst || ""), sgst: String(ed.sgst || ""), igst: String(ed.igst || "") }
    : EMPTY_GST);
  // Employee
  const [employee, setEmployee] = useState(ed?.employee ?? "");
  const [claimRef, setClaimRef] = useState(ed?.claimRef ?? "");
  const [advanceAdjustment, setAdvanceAdjustment] = useState(ed ? String(ed.advanceAdjustment) : "0");
  const [reimbursementRequired, setReimbursementRequired] = useState(ed?.reimbursementRequired ?? false);
  // Attachments
  const [atts, setAtts] = useState<AttachmentItem[]>(ed?.attachments.map((a, i) => ({ id: String(i), name: a.name, isPdf: a.kind === "pdf" })) ?? []);
  const [noBill, setNoBill] = useState(ed ? !ed.billAvailable : false);
  // Voucher
  const [genVoucher, setGenVoucher] = useState(ed?.voucherGenerated ?? false);
  const [error, setError] = useState("");

  const isCustomer = type === "Customer Expense";
  const isEmployee = type === "Employee Expense";
  const isVendor = type === "Vendor Expense" || type === "General Expense";
  const subs = category ? CATEGORIES[category] ?? [] : [];
  const usesBank = paymentMode !== "Cash";

  const base = parseFloat(baseAmount) || 0;
  const total = gst.enabled ? gstTotal(gst) : base;
  const previewVoucherNo = ed?.voucherNo || `CI/${FY}/${String(15).padStart(5, "0")}`;

  function addFiles(files: FileList) {
    setAtts((p) => [...p, ...Array.from(files).map((f) => ({ id: `${f.name}-${f.size}`, name: f.name, url: URL.createObjectURL(f), isPdf: f.type === "application/pdf" }))].slice(0, 6));
  }

  function build(submit: boolean): Omit<Expense, "id" | "expenseNo" | "approvalHistory"> {
    const gstAmount = gst.enabled ? (parseFloat(gst.cgst) || 0) + (parseFloat(gst.sgst) || 0) + (parseFloat(gst.igst) || 0) : 0;
    return {
      date, branch, department: "Sales", type, category, subCategory, description,
      paymentMode, cashAccount: usesBank ? "" : cashAccount, bankAccount: usesBank ? bankAccount : "",
      customer: isCustomer ? customer : "", opportunity: isCustomer ? opportunity : "", salesOrder: isCustomer ? salesOrder : "",
      project: isCustomer ? project : "", ticketRef: isCustomer ? ticketRef : "",
      vendor: isVendor ? vendor : "", employee: isEmployee ? employee : "",
      claimRef: isEmployee ? claimRef : "", advanceAdjustment: isEmployee ? (parseFloat(advanceAdjustment) || 0) : 0,
      reimbursementRequired: isEmployee ? reimbursementRequired : false,
      baseAmount: gst.enabled ? (parseFloat(gst.taxable) || 0) : base,
      gstApplicable: gst.enabled, gstNumber: gst.gstNumber, taxable: parseFloat(gst.taxable) || 0,
      cgst: parseFloat(gst.cgst) || 0, sgst: parseFloat(gst.sgst) || 0, igst: parseFloat(gst.igst) || 0,
      gstAmount, totalAmount: total,
      billAvailable: !noBill, invoiceNo: invoiceAvailable === "yes" ? invoiceNo : "", invoiceDate: invoiceAvailable === "yes" ? invoiceDate : "",
      voucherGenerated: genVoucher, voucherNo: genVoucher ? previewVoucherNo : "",
      approvalStatus: submit ? "Pending Approval" : "Draft", paymentStatus: "Unpaid",
      createdBy: ed?.createdBy ?? currentUser, modifiedBy: ed ? currentUser : undefined,
      attachments: atts.map((a) => ({ name: a.name, kind: a.isPdf ? "pdf" as const : "image" as const })),
    };
  }

  function save(submit: boolean) {
    setError("");
    if (!category) return setError("Select a category.");
    if (!description.trim()) return setError("Description is required.");
    if (!(total > 0)) return setError("Enter an amount greater than zero.");
    if (isCustomer && !customer.trim()) return setError("Customer is required for a customer expense.");
    if (isEmployee && !employee.trim()) return setError("Employee is required for an employee expense.");
    onSave(build(submit), submit);
  }

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-pane" onClick={(e) => e.stopPropagation()}>
        <div className="dp-head">
          <div style={{ fontSize: 15, fontWeight: 600 }}>{ed ? "Edit Expense" : "Add Expense"}</div>
          <button onClick={onClose} className="btn-cav btn-cav-ghost btn-cav-sm"><X size={16} /></button>
        </div>

        <div className="dp-body">
          {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded border border-red-200">{error}</div>}

          {/* A. Basic */}
          <Section title="Basic Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>Expense Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Branch</label><select value={branch} onChange={(e) => setBranch(e.target.value)} className={inputCls}>{BRANCHES.map((b) => <option key={b}>{b}</option>)}</select></div>
              <div><label className={labelCls}>Expense Type</label><select value={type} onChange={(e) => setType(e.target.value as ExpenseType)} className={inputCls}>{EXPENSE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
              <div><label className={labelCls}>Category</label><select value={category} onChange={(e) => { setCategory(e.target.value); setSubCategory(""); }} className={inputCls}><option value="">Select…</option>{expenseCategories.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div><label className={labelCls}>Sub Category</label><select value={subCategory} onChange={(e) => setSubCategory(e.target.value)} className={inputCls} disabled={!category}><option value="">{category ? "Select…" : "Pick category first"}</option>{subs.map((s) => <option key={s}>{s}</option>)}</select></div>
              <div className="sm:col-span-2"><label className={labelCls}>Description</label><input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} placeholder="Narration" /></div>
            </div>
          </Section>

          {/* B. Payment */}
          <Section title="Payment Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>Payment Mode</label><select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as Expense["paymentMode"])} className={inputCls}>{PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}</select></div>
              {usesBank
                ? <div><label className={labelCls}>Bank Account</label><select value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className={inputCls}><option>HDFC Current</option><option>ICICI Current</option><option>Axis Current</option></select></div>
                : <div><label className={labelCls}>Cash Account</label><select value={cashAccount} onChange={(e) => setCashAccount(e.target.value)} className={inputCls}><option>Cash — Head Office</option><option>Cash — Bangalore</option><option>Petty Cash — HO</option></select></div>}
              {!gst.enabled && <div><label className={labelCls}>Base Amount (₹)</label><input type="number" min="0" step="0.01" value={baseAmount} onChange={(e) => setBaseAmount(e.target.value)} className={inputCls} placeholder="0.00" /></div>}
              <div className={gst.enabled ? "sm:col-span-2" : ""}><label className={labelCls}>Total Amount</label><input value={fmtINR(total)} readOnly className={inputCls} style={{ background: "var(--bg-muted)", fontWeight: 600 }} /></div>
            </div>
          </Section>

          {/* C. Customer */}
          {isCustomer && (
            <Section title="Customer Expense">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={labelCls}>Customer</label><input value={customer} onChange={(e) => setCustomer(e.target.value)} className={inputCls} placeholder="Customer name" /></div>
                <div><label className={labelCls}>Opportunity</label><input value={opportunity} onChange={(e) => setOpportunity(e.target.value)} className={inputCls} placeholder="OPP ref" /></div>
                <div><label className={labelCls}>Sales Order</label><input value={salesOrder} onChange={(e) => setSalesOrder(e.target.value)} className={inputCls} placeholder="SO ref" /></div>
                <div><label className={labelCls}>Project</label><input value={project} onChange={(e) => setProject(e.target.value)} className={inputCls} placeholder="Project" /></div>
                <div><label className={labelCls}>Ticket Reference</label><input value={ticketRef} onChange={(e) => setTicketRef(e.target.value)} className={inputCls} placeholder="Support ticket" /></div>
              </div>
              {customer && <div style={{ marginTop: 12 }}><CustomerExpensePanel customer={customer} existingExpenses={existingByCustomer(customer)} thisExpense={total} /></div>}
            </Section>
          )}

          {/* D. Vendor (general/vendor) */}
          {isVendor && (
            <Section title="Vendor & Invoice">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Vendor</label>
                  {!newVendor ? (
                    <select value={vendor} onChange={(e) => setVendor(e.target.value)} className={inputCls}><option value="">Select…</option>{VENDORS.map((v) => <option key={v}>{v}</option>)}</select>
                  ) : (
                    <input value={vendor} onChange={(e) => setVendor(e.target.value)} className={inputCls} placeholder="New vendor name" autoFocus />
                  )}
                </div>
                <div className="flex items-end">
                  <button type="button" className="btn-cav btn-cav-secondary btn-cav-sm" onClick={() => setNewVendor((v) => !v)}><Plus size={13} /> {newVendor ? "Pick existing" : "Create new vendor"}</button>
                </div>
                <div><label className={labelCls}>Invoice Available?</label>
                  <div className="seg-control"><button type="button" className={invoiceAvailable === "no" ? "active" : ""} onClick={() => setInvoiceAvailable("no")}>No</button><button type="button" className={invoiceAvailable === "yes" ? "active" : ""} onClick={() => setInvoiceAvailable("yes")}>Yes</button></div>
                </div>
                <div />
                {invoiceAvailable === "yes" && <>
                  <div><label className={labelCls}>Invoice Number</label><input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className={inputCls} placeholder="INV-0001" /></div>
                  <div><label className={labelCls}>Invoice Date</label><input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className={inputCls} /></div>
                </>}
              </div>
              <div style={{ marginTop: 12, padding: 12, background: "var(--bg-muted)", borderRadius: 10 }}>
                <GSTInputSection value={gst} onChange={setGst} />
              </div>
            </Section>
          )}

          {/* E. Employee */}
          {isEmployee && (
            <Section title="Employee Claim">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={labelCls}>Employee Name</label><input value={employee} onChange={(e) => setEmployee(e.target.value)} className={inputCls} placeholder="Employee" /></div>
                <div><label className={labelCls}>Claim Reference</label><input value={claimRef} onChange={(e) => setClaimRef(e.target.value)} className={inputCls} placeholder="CLM-0001" /></div>
                <div><label className={labelCls}>Advance Adjustment (₹)</label><input type="number" min="0" value={advanceAdjustment} onChange={(e) => setAdvanceAdjustment(e.target.value)} className={inputCls} placeholder="0" /></div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--fg-2)", alignSelf: "end", paddingBottom: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={reimbursementRequired} onChange={(e) => setReimbursementRequired(e.target.checked)} style={{ accentColor: "var(--caveo-red)" }} /> Reimbursement required
                </label>
              </div>
              {employee && <div style={{ marginTop: 12 }}><EmployeeClaimPanel employee={employee} claimAmount={total} adjust={parseFloat(advanceAdjustment) || 0} /></div>}
            </Section>
          )}

          {/* F. Attachments */}
          <Section title="Attachments">
            <ExpenseAttachmentViewer items={atts} noBill={noBill} onAdd={addFiles} onRemove={(id) => setAtts((p) => p.filter((a) => a.id !== id))} onToggleNoBill={setNoBill} />
          </Section>

          {/* G. Voucher */}
          <Section title="Voucher">
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <input type="checkbox" checked={genVoucher} onChange={(e) => setGenVoucher(e.target.checked)} style={{ accentColor: "var(--caveo-red)" }} /> Generate Cash Voucher
            </label>
            {genVoucher && <div style={{ marginTop: 10 }}><VoucherPreviewPanel voucherNo={previewVoucherNo} date={date} amount={total} payee={vendor || employee || customer} narration={description} /></div>}
          </Section>
        </div>

        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-cav btn-cav-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-cav btn-cav-secondary" onClick={() => save(false)}>Save Draft</button>
          <button className="btn-cav btn-cav-primary" onClick={() => save(true)}>Save &amp; Submit</button>
        </div>
      </div>
    </div>
  );
}
