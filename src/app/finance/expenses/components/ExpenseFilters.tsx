"use client";
import { useState } from "react";
import { Filter, RotateCcw, Bookmark, ChevronDown } from "lucide-react";
import {
  BRANCHES, DEPARTMENTS, CATEGORIES, EXPENSE_TYPES, PAYMENT_MODES, APPROVAL_STATUSES, FY,
} from "../data";

export interface ExpenseFilterValues {
  dateFrom: string; dateTo: string; fy: string;
  branch: string; department: string;
  category: string; subCategory: string; type: string;
  paymentMode: string; cashAccount: string; bankAccount: string;
  customer: string; project: string; salesOrder: string; vendor: string; employee: string;
  status: string;
  gstApplicable: string; billAvailable: string; voucherGenerated: string;
}

export const EMPTY_EXPENSE_FILTERS: ExpenseFilterValues = {
  dateFrom: "", dateTo: "", fy: FY, branch: "", department: "", category: "", subCategory: "",
  type: "", paymentMode: "", cashAccount: "", bankAccount: "", customer: "", project: "",
  salesOrder: "", vendor: "", employee: "", status: "", gstApplicable: "", billAvailable: "", voucherGenerated: "",
};

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

export default function ExpenseFilters({
  value, onApply, onReset, onSaveView,
}: {
  value: ExpenseFilterValues;
  onApply: (v: ExpenseFilterValues) => void;
  onReset: () => void;
  onSaveView: () => void;
}) {
  const [draft, setDraft] = useState<ExpenseFilterValues>(value);
  const [open, setOpen] = useState(false);
  const set = (k: keyof ExpenseFilterValues, v: string) => setDraft((d) => ({ ...d, [k]: v }));
  const subs = draft.category ? CATEGORIES[draft.category] ?? [] : [];

  const activeCount = [
    value.dateFrom, value.dateTo, value.branch, value.department, value.type, value.category,
    value.subCategory, value.paymentMode, value.status, value.customer, value.vendor,
    value.employee, value.project, value.gstApplicable, value.billAvailable, value.voucherGenerated,
  ].filter(Boolean).length;

  return (
    <div className="card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="card-header"
        style={{ width: "100%", cursor: "pointer", background: "transparent", border: "none", fontFamily: "var(--font-sans)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Filter size={15} style={{ color: "var(--fg-3)" }} />
          <div className="ch-title">Filters</div>
          {activeCount > 0 && <span className="badge badge-accent">{activeCount}</span>}
        </div>
        <ChevronDown size={16} style={{ color: "var(--fg-3)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>
      {open && (
      <div className="card-body">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div><label className={labelCls}>From</label><input type="date" value={draft.dateFrom} onChange={(e) => set("dateFrom", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>To</label><input type="date" value={draft.dateTo} onChange={(e) => set("dateTo", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Financial Year</label>
            <select value={draft.fy} onChange={(e) => set("fy", e.target.value)} className={inputCls}><option value={FY}>{FY}</option><option value="25-26">25-26</option></select>
          </div>
          <div><label className={labelCls}>Branch</label>
            <select value={draft.branch} onChange={(e) => set("branch", e.target.value)} className={inputCls}><option value="">All</option>{BRANCHES.map((b) => <option key={b}>{b}</option>)}</select>
          </div>
          <div><label className={labelCls}>Department</label>
            <select value={draft.department} onChange={(e) => set("department", e.target.value)} className={inputCls}><option value="">All</option>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select>
          </div>
          <div><label className={labelCls}>Expense Type</label>
            <select value={draft.type} onChange={(e) => set("type", e.target.value)} className={inputCls}><option value="">All</option>{EXPENSE_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          </div>
          <div><label className={labelCls}>Category</label>
            <select value={draft.category} onChange={(e) => { set("category", e.target.value); set("subCategory", ""); }} className={inputCls}><option value="">All</option>{Object.keys(CATEGORIES).map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div><label className={labelCls}>Sub Category</label>
            <select value={draft.subCategory} onChange={(e) => set("subCategory", e.target.value)} className={inputCls} disabled={!draft.category}><option value="">All</option>{subs.map((s) => <option key={s}>{s}</option>)}</select>
          </div>
          <div><label className={labelCls}>Payment Mode</label>
            <select value={draft.paymentMode} onChange={(e) => set("paymentMode", e.target.value)} className={inputCls}><option value="">All</option>{PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}</select>
          </div>
          <div><label className={labelCls}>Status</label>
            <select value={draft.status} onChange={(e) => set("status", e.target.value)} className={inputCls}><option value="">All</option>{APPROVAL_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          </div>
          <div><label className={labelCls}>Customer</label><input value={draft.customer} onChange={(e) => set("customer", e.target.value)} className={inputCls} placeholder="Contains…" /></div>
          <div><label className={labelCls}>Vendor</label><input value={draft.vendor} onChange={(e) => set("vendor", e.target.value)} className={inputCls} placeholder="Contains…" /></div>
          <div><label className={labelCls}>Employee</label><input value={draft.employee} onChange={(e) => set("employee", e.target.value)} className={inputCls} placeholder="Contains…" /></div>
          <div><label className={labelCls}>Project</label><input value={draft.project} onChange={(e) => set("project", e.target.value)} className={inputCls} placeholder="Contains…" /></div>
          <div><label className={labelCls}>GST Applicable</label>
            <select value={draft.gstApplicable} onChange={(e) => set("gstApplicable", e.target.value)} className={inputCls}><option value="">All</option><option value="yes">Yes</option><option value="no">No</option></select>
          </div>
          <div><label className={labelCls}>Bill Available</label>
            <select value={draft.billAvailable} onChange={(e) => set("billAvailable", e.target.value)} className={inputCls}><option value="">All</option><option value="yes">Yes</option><option value="no">No</option></select>
          </div>
          <div><label className={labelCls}>Voucher Generated</label>
            <select value={draft.voucherGenerated} onChange={(e) => set("voucherGenerated", e.target.value)} className={inputCls}><option value="">All</option><option value="yes">Yes</option><option value="no">No</option></select>
          </div>
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <button className="btn-cav btn-cav-ghost btn-cav-sm" onClick={onSaveView}><Bookmark size={13} /> Save Filter View</button>
          <button className="btn-cav btn-cav-ghost btn-cav-sm" onClick={() => { setDraft(EMPTY_EXPENSE_FILTERS); onReset(); }}><RotateCcw size={13} /> Reset</button>
          <button className="btn-cav btn-cav-primary btn-cav-sm" onClick={() => onApply(draft)}>Apply Filter</button>
        </div>
      </div>
      )}
    </div>
  );
}
