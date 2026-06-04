"use client";

import { useState } from "react";
import { Filter, RotateCcw, ChevronDown } from "lucide-react";
import {
  TRIP_STATUSES, VEHICLE_TYPES, VISIT_PURPOSES, MOCK_CUSTOMERS,
} from "../data";

export interface ConveyanceFilterValues {
  dateFrom: string;
  dateTo: string;
  month: string;
  vehicle: string;
  purpose: string;
  customer: string;
  employee: string;
  status: string;
  billToCustomer: string;
}

export const EMPTY_FILTERS: ConveyanceFilterValues = {
  dateFrom: "", dateTo: "", month: "", vehicle: "", purpose: "",
  customer: "", employee: "", status: "", billToCustomer: "",
};

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]";
const labelCls = "block text-xs font-medium text-gray-600 mb-1";

const MONTHS = ["June 2026", "May 2026", "April 2026"];
const EMPLOYEES = ["Vijesh V", "Rahul M", "Sneha K", "Deepak N", "Arun P"];

export default function ConveyanceFilters({
  value, onApply, onReset, showEmployee = true,
}: {
  value: ConveyanceFilterValues;
  onApply: (v: ConveyanceFilterValues) => void;
  onReset: () => void;
  showEmployee?: boolean;
}) {
  const [draft, setDraft] = useState<ConveyanceFilterValues>(value);
  const [open, setOpen] = useState(false);

  const set = (k: keyof ConveyanceFilterValues, v: string) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const activeCount = Object.values(value).filter(Boolean).length;

  function apply() { onApply(draft); }
  function reset()  { setDraft(EMPTY_FILTERS); onReset(); }

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
        <ChevronDown
          size={16}
          style={{ color: "var(--fg-3)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}
        />
      </button>

      {open && (
        <div className="card-body" style={{ paddingTop: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
            <div>
              <label className={labelCls}>Date From</label>
              <input type="date" className={inputCls} value={draft.dateFrom} onChange={(e) => set("dateFrom", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Date To</label>
              <input type="date" className={inputCls} value={draft.dateTo} onChange={(e) => set("dateTo", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Month</label>
              <select className={inputCls} value={draft.month} onChange={(e) => set("month", e.target.value)}>
                <option value="">All Months</option>
                {MONTHS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Vehicle</label>
              <select className={inputCls} value={draft.vehicle} onChange={(e) => set("vehicle", e.target.value)}>
                <option value="">All Vehicles</option>
                {VEHICLE_TYPES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Purpose</label>
              <select className={inputCls} value={draft.purpose} onChange={(e) => set("purpose", e.target.value)}>
                <option value="">All Purposes</option>
                {VISIT_PURPOSES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Customer</label>
              <select className={inputCls} value={draft.customer} onChange={(e) => set("customer", e.target.value)}>
                <option value="">All Customers</option>
                {MOCK_CUSTOMERS.map((c) => <option key={c.name}>{c.name}</option>)}
              </select>
            </div>
            {showEmployee && (
              <div>
                <label className={labelCls}>Employee</label>
                <select className={inputCls} value={draft.employee} onChange={(e) => set("employee", e.target.value)}>
                  <option value="">All Employees</option>
                  {EMPLOYEES.map((e) => <option key={e}>{e}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={draft.status} onChange={(e) => set("status", e.target.value)}>
                <option value="">All Statuses</option>
                {TRIP_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Bill to Customer</label>
              <select className={inputCls} value={draft.billToCustomer} onChange={(e) => set("billToCustomer", e.target.value)}>
                <option value="">Any</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
            <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={reset}>
              <RotateCcw size={13} /> Reset
            </button>
            <button className="btn-cav btn-cav-primary btn-cav-sm" onClick={apply}>
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
