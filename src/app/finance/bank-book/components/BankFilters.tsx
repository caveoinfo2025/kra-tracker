"use client";
import { useState } from "react";
import { Filter, RotateCcw, ChevronDown } from "lucide-react";
import {
  BankAccount, BRANCHES, TXN_TYPES, PAYMENT_MODES, APPROVAL_STATUSES,
} from "../data";

export interface BankFilterValues {
  accountId: string;        // "all" | account.id
  dateFrom: string;
  dateTo: string;
  branch: string;
  txnType: string;
  mode: string;
  customer: string;
  vendor: string;
  employee: string;
  approval: string;
}

export const EMPTY_FILTERS: BankFilterValues = {
  accountId: "all", dateFrom: "", dateTo: "", branch: "", txnType: "",
  mode: "", customer: "", vendor: "", employee: "", approval: "",
};

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

/**
 * BankFilters — collapsible filter panel with a draft buffer.
 * Changes only take effect when "Apply Filters" is clicked.
 */
export default function BankFilters({
  accounts, value, onApply, onReset,
}: {
  accounts: BankAccount[];
  value: BankFilterValues;
  onApply: (v: BankFilterValues) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState<BankFilterValues>(value);
  const [open, setOpen] = useState(false);
  const set = (k: keyof BankFilterValues, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const activeCount = [
    value.dateFrom, value.dateTo, value.branch, value.txnType,
    value.mode, value.customer, value.vendor, value.employee, value.approval,
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
          <div>
            <label className={labelCls}>Bank Account</label>
            <select value={draft.accountId} onChange={(e) => set("accountId", e.target.value)} className={inputCls}>
              <option value="all">All Accounts</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} {a.maskedNo}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>From</label>
            <input type="date" value={draft.dateFrom} onChange={(e) => set("dateFrom", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>To</label>
            <input type="date" value={draft.dateTo} onChange={(e) => set("dateTo", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Branch</label>
            <select value={draft.branch} onChange={(e) => set("branch", e.target.value)} className={inputCls}>
              <option value="">All</option>
              {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Transaction Type</label>
            <select value={draft.txnType} onChange={(e) => set("txnType", e.target.value)} className={inputCls}>
              <option value="">All</option>
              {TXN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Payment Mode</label>
            <select value={draft.mode} onChange={(e) => set("mode", e.target.value)} className={inputCls}>
              <option value="">All</option>
              {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Customer</label>
            <input value={draft.customer} onChange={(e) => set("customer", e.target.value)} className={inputCls} placeholder="Name contains…" />
          </div>
          <div>
            <label className={labelCls}>Vendor</label>
            <input value={draft.vendor} onChange={(e) => set("vendor", e.target.value)} className={inputCls} placeholder="Name contains…" />
          </div>
          <div>
            <label className={labelCls}>Employee</label>
            <input value={draft.employee} onChange={(e) => set("employee", e.target.value)} className={inputCls} placeholder="Name contains…" />
          </div>
          <div>
            <label className={labelCls}>Approval Status</label>
            <select value={draft.approval} onChange={(e) => set("approval", e.target.value)} className={inputCls}>
              <option value="">All</option>
              {APPROVAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-4 justify-end">
          <button
            className="btn-cav btn-cav-ghost btn-cav-sm"
            onClick={() => { setDraft(EMPTY_FILTERS); onReset(); }}
          >
            <RotateCcw size={13} /> Reset Filters
          </button>
          <button className="btn-cav btn-cav-primary btn-cav-sm" onClick={() => onApply(draft)}>
            Apply Filters
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
