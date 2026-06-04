"use client";
import { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { validateGSTIN, gstStatusBadge } from "../data";

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

interface GSTFormState {
  gstin: string;
  gstLegalName: string;
  gstStatus: "Verified" | "Not Verified" | "Invalid";
  gstLedgerMapping: string;
}

export const EMPTY_GST_FORM: GSTFormState = {
  gstin: "", gstLegalName: "", gstStatus: "Not Verified", gstLedgerMapping: "",
};

/** Inline GSTIN validator + form — used inside VendorForm and VendorBranchManager */
export default function GSTRegistrationPanel({
  value, onChange, branchStateCode, branchStateName, readOnly,
}: {
  value: GSTFormState;
  onChange: (v: GSTFormState) => void;
  branchStateCode?: string;
  branchStateName?: string;
  readOnly?: boolean;
}) {
  const set = (patch: Partial<GSTFormState>) => onChange({ ...value, ...patch });
  const validation = value.gstin ? validateGSTIN(value.gstin, branchStateCode) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label className={labelCls}>GSTIN *</label>
        <input
          value={value.gstin}
          onChange={(e) => set({ gstin: e.target.value.toUpperCase() })}
          className={inputCls}
          maxLength={15}
          placeholder="e.g. 33ABCDE1234F1Z5"
          disabled={readOnly}
          style={{ fontFamily: "var(--font-mono)", letterSpacing: 1 }}
        />
        {/* Validation feedback */}
        {validation && (
          <div style={{ marginTop: 6, fontSize: 12, display: "flex", alignItems: "flex-start", gap: 6 }}>
            {validation.error ? (
              <><XCircle size={13} style={{ color: "var(--caveo-red)", flexShrink: 0, marginTop: 1 }} /><span style={{ color: "var(--caveo-red)" }}>{validation.error}</span></>
            ) : validation.warning ? (
              <><AlertTriangle size={13} style={{ color: "var(--ot-orange)", flexShrink: 0, marginTop: 1 }} /><span style={{ color: "var(--ot-orange)" }}>{validation.warning}</span></>
            ) : (
              <><CheckCircle2 size={13} style={{ color: "var(--success)", flexShrink: 0, marginTop: 1 }} />
              <span style={{ color: "var(--success)" }}>Valid · State: <b>{validation.stateName}</b> ({validation.stateCode})</span></>
            )}
          </div>
        )}
        {branchStateName && (
          <div style={{ marginTop: 4, fontSize: 11, color: "var(--fg-4)", display: "flex", alignItems: "center", gap: 4 }}>
            <Info size={11} /> Branch state: {branchStateName} ({branchStateCode})
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>GST Legal Name</label>
          <input value={value.gstLegalName} onChange={(e) => set({ gstLegalName: e.target.value })} className={inputCls} placeholder="As per GST certificate" disabled={readOnly} />
        </div>
        <div>
          <label className={labelCls}>GST Status</label>
          <select value={value.gstStatus} onChange={(e) => set({ gstStatus: e.target.value as GSTFormState["gstStatus"] })} className={inputCls} disabled={readOnly}>
            <option value="Not Verified">Not Verified</option>
            <option value="Verified">Verified</option>
            <option value="Invalid">Invalid</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Tally GST Ledger Mapping</label>
          <input value={value.gstLedgerMapping} onChange={(e) => set({ gstLedgerMapping: e.target.value })} className={inputCls} placeholder="e.g. GST Input - Services 18%" disabled={readOnly} />
        </div>
      </div>
    </div>
  );
}

/** Read-only GSTIN badge row — used in overview and tables */
export function GSTINBadge({ gstin, status, stateName }: { gstin: string; status: string; stateName?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-alt)", fontSize: 12 }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 600, color: "var(--caveo-red)", letterSpacing: 0.5 }}>{gstin}</span>
      <span className={`badge ${gstStatusBadge(status as "Verified" | "Not Verified" | "Invalid")}`} style={{ fontSize: 10 }}>{status}</span>
      {stateName && <span className="cell-sub">{stateName}</span>}
    </div>
  );
}
