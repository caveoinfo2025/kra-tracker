"use client";
import { useState } from "react";
import { Filter, RotateCcw, ChevronDown } from "lucide-react";
import { VENDOR_TYPES, COMPANY_TYPES, VENDOR_STATUSES, GST_STATUSES, STATE_NAMES } from "../data";

export interface VendorFilterValues {
  status: string;
  vendorType: string;
  companyType: string;
  state: string;
  msme: string;
  gstStatus: string;
  search: string;
}

export const EMPTY_VENDOR_FILTERS: VendorFilterValues = {
  status: "", vendorType: "", companyType: "", state: "", msme: "", gstStatus: "", search: "",
};

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

export default function VendorFilters({
  value, onApply, onReset,
}: {
  value: VendorFilterValues;
  onApply: (v: VendorFilterValues) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState<VendorFilterValues>(value);
  const [open, setOpen] = useState(false);
  const set = (k: keyof VendorFilterValues, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const activeCount = Object.entries(value).filter(([k, v]) => k !== "search" && v).length;

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
              <label className={labelCls}>Status</label>
              <select value={draft.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
                <option value="">All</option>
                {VENDOR_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Vendor Type</label>
              <select value={draft.vendorType} onChange={(e) => set("vendorType", e.target.value)} className={inputCls}>
                <option value="">All</option>
                {VENDOR_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Company Type</label>
              <select value={draft.companyType} onChange={(e) => set("companyType", e.target.value)} className={inputCls}>
                <option value="">All</option>
                {COMPANY_TYPES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Primary State</label>
              <select value={draft.state} onChange={(e) => set("state", e.target.value)} className={inputCls}>
                <option value="">All</option>
                {STATE_NAMES.slice(0, 20).map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>MSME Registered</label>
              <select value={draft.msme} onChange={(e) => set("msme", e.target.value)} className={inputCls}>
                <option value="">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>GST Status</label>
              <select value={draft.gstStatus} onChange={(e) => set("gstStatus", e.target.value)} className={inputCls}>
                <option value="">All</option>
                {GST_STATUSES.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button className="btn-cav btn-cav-ghost btn-cav-sm" onClick={() => { setDraft(EMPTY_VENDOR_FILTERS); onReset(); }}>
              <RotateCcw size={13} /> Reset
            </button>
            <button className="btn-cav btn-cav-primary btn-cav-sm" onClick={() => onApply(draft)}>Apply Filter</button>
          </div>
        </div>
      )}
    </div>
  );
}
