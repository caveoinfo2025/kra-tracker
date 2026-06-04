"use client";
import { useState } from "react";
import { Filter, RotateCcw, ChevronDown } from "lucide-react";
import { CATEGORY_STATUSES, USAGE_LABELS, USAGE_KEYS, ExpenseCategory } from "../data";

export interface CatFilterValues {
  status: string;
  parentId: string;
  usageKey: string;
  gstApplicable: string;
  approvalRequired: string;
  customerEnabled: string;
  employeeEnabled: string;
}

export const EMPTY_CAT_FILTERS: CatFilterValues = {
  status: "", parentId: "", usageKey: "", gstApplicable: "",
  approvalRequired: "", customerEnabled: "", employeeEnabled: "",
};

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

export default function CategoryFilters({
  value, parents, onApply, onReset,
}: {
  value: CatFilterValues;
  parents: ExpenseCategory[];
  onApply: (v: CatFilterValues) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState<CatFilterValues>(value);
  const [open, setOpen] = useState(false);
  const set = (k: keyof CatFilterValues, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const activeCount = Object.values(value).filter(Boolean).length;

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
            <div>
              <label className={labelCls}>Category Status</label>
              <select value={draft.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
                <option value="">All</option>
                {CATEGORY_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Parent Category</label>
              <select value={draft.parentId} onChange={(e) => set("parentId", e.target.value)} className={inputCls}>
                <option value="">All</option>
                {parents.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Expense Type</label>
              <select value={draft.usageKey} onChange={(e) => set("usageKey", e.target.value)} className={inputCls}>
                <option value="">All</option>
                {USAGE_KEYS.map((k) => <option key={k} value={k}>{USAGE_LABELS[k]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>GST Applicable</label>
              <select value={draft.gstApplicable} onChange={(e) => set("gstApplicable", e.target.value)} className={inputCls}>
                <option value="">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Approval Required</label>
              <select value={draft.approvalRequired} onChange={(e) => set("approvalRequired", e.target.value)} className={inputCls}>
                <option value="">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Customer Expense Enabled</label>
              <select value={draft.customerEnabled} onChange={(e) => set("customerEnabled", e.target.value)} className={inputCls}>
                <option value="">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Employee Claim Enabled</label>
              <select value={draft.employeeEnabled} onChange={(e) => set("employeeEnabled", e.target.value)} className={inputCls}>
                <option value="">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button className="btn-cav btn-cav-ghost btn-cav-sm" onClick={() => { setDraft(EMPTY_CAT_FILTERS); onReset(); }}>
              <RotateCcw size={13} /> Reset
            </button>
            <button className="btn-cav btn-cav-primary btn-cav-sm" onClick={() => onApply(draft)}>
              Apply Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
