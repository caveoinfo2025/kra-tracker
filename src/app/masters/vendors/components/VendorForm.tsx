"use client";
import { useState } from "react";
import { X } from "lucide-react";
import {
  Vendor, VendorBranch, VendorCaps, VendorType, CompanyType, VendorStatus,
  VENDOR_TYPES, COMPANY_TYPES, VENDOR_STATUSES, BUSINESS_CATEGORIES,
  STATE_NAMES, STATE_TO_CODE, nextVendorCode, todayISO,
} from "../data";
import { VENDORS } from "../data";
import VendorBranchManager from "./VendorBranchManager";

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><div className="section-label">{title}</div>{children}</div>;
}

const DEFAULT_BRANCH: Omit<VendorBranch, "id"> = {
  branchName: "Head Office", addressType: "Registered Office", address: "", city: "",
  state: "Tamil Nadu", stateCode: "33", country: "India", pinCode: "",
  contactPerson: "", phone: "", email: "", isPrimary: true,
  gstRegistered: false, gstin: "", gstLegalName: "", gstStatus: "Not Verified", gstLedgerMapping: "",
};

export default function VendorForm({
  initial, caps, currentUser, allVendors, nextId, onClose, onSave,
}: {
  initial: Vendor | null;
  caps: VendorCaps;
  currentUser: string;
  allVendors: Vendor[];
  nextId: number;
  onClose: () => void;
  onSave: (v: Vendor) => void;
}) {
  const ed = initial;
  const isReadOnly = !caps.canEdit && !caps.canCreate;

  // A. Basic
  const [legalName, setLegalName] = useState(ed?.legalName ?? "");
  const [tradeName, setTradeName] = useState(ed?.tradeName ?? "");
  const [vendorType, setVendorType] = useState<VendorType>(ed?.vendorType ?? "Service Provider");
  const [businessCategory, setBusinessCategory] = useState(ed?.businessCategory ?? "IT Infrastructure");
  const [status, setStatus] = useState<VendorStatus>(ed?.status ?? "Active");
  const [tallyLedger, setTallyLedger] = useState(ed?.tallyLedger ?? "");

  // B. Registration
  const [pan, setPan] = useState(ed?.pan ?? "");
  const [msmeRegistered, setMsmeRegistered] = useState(ed?.msmeRegistered ?? false);
  const [msmeNumber, setMsmeNumber] = useState(ed?.msmeNumber ?? "");
  const [companyType, setCompanyType] = useState<CompanyType>(ed?.companyType ?? "Private Limited");

  // Branches (managed via VendorBranchManager)
  const [branches, setBranches] = useState<VendorBranch[]>(
    ed?.branches ?? [{ ...DEFAULT_BRANCH, id: 1 }]
  );

  const [error, setError] = useState("");

  function handleSave() {
    if (!legalName.trim()) { setError("Legal Vendor Name is required."); return; }
    if (!pan.trim()) { setError("PAN Number is required."); return; }
    setError("");
    const now = todayISO();
    const vendor: Vendor = {
      id: ed?.id ?? nextId,
      vendorCode: ed?.vendorCode ?? nextVendorCode(allVendors),
      legalName: legalName.trim(),
      tradeName: tradeName.trim() || legalName.trim(),
      vendorType,
      businessCategory,
      status,
      pan: pan.trim().toUpperCase(),
      msmeRegistered,
      msmeNumber: msmeRegistered ? msmeNumber.trim() : "",
      companyType,
      branches,
      contacts: ed?.contacts ?? [],
      bankAccounts: ed?.bankAccounts ?? [],
      documents: ed?.documents ?? [],
      tallyLedger: tallyLedger.trim(),
      createdBy: ed?.createdBy ?? currentUser,
      createdAt: ed?.createdAt ?? now,
      modifiedBy: ed ? currentUser : undefined,
      modifiedAt: ed ? now : undefined,
      auditHistory: ed
        ? [...ed.auditHistory, { action: "Updated", by: currentUser, at: now }]
        : [{ action: "Created", by: currentUser, at: now }],
    };
    onSave(vendor);
  }

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-pane" style={{ width: "min(640px, 95vw)" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dp-head">
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{ed ? `Edit — ${ed.legalName}` : "New Vendor"}</div>
            {ed && <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--caveo-red)", marginTop: 2 }}>{ed.vendorCode}</div>}
            {isReadOnly && <span className="badge badge-neutral" style={{ fontSize: 10, marginTop: 6, display: "inline-block" }}>View Only</span>}
          </div>
          <button onClick={onClose} className="btn-cav btn-cav-ghost btn-cav-sm"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="dp-body">
          {error && <div style={{ background: "#FFF0F0", border: "1px solid #FCCACA", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, color: "var(--caveo-red)" }}>{error}</div>}

          {/* A. Basic Information */}
          <Section title="A. Basic Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ed && (
                <div className="sm:col-span-2">
                  <label className={labelCls}>Vendor Code</label>
                  <input value={ed.vendorCode} readOnly className={inputCls} style={{ background: "var(--bg-muted)", fontFamily: "var(--font-mono)", color: "var(--caveo-red)" }} />
                </div>
              )}
              <div className="sm:col-span-2">
                <label className={labelCls}>Legal Vendor Name *</label>
                <input value={legalName} onChange={(e) => setLegalName(e.target.value)} className={inputCls} placeholder="As registered with GST/PAN" disabled={isReadOnly} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Trade Name / Display Name</label>
                <input value={tradeName} onChange={(e) => setTradeName(e.target.value)} className={inputCls} placeholder="Common name (leave blank to use legal name)" disabled={isReadOnly} />
              </div>
              <div>
                <label className={labelCls}>Vendor Type</label>
                <select value={vendorType} onChange={(e) => setVendorType(e.target.value as VendorType)} className={inputCls} disabled={isReadOnly}>
                  {VENDOR_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Business Category</label>
                <select value={businessCategory} onChange={(e) => setBusinessCategory(e.target.value)} className={inputCls} disabled={isReadOnly}>
                  {BUSINESS_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as VendorStatus)} className={inputCls} disabled={isReadOnly}>
                  {VENDOR_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Tally Ledger Name</label>
                <input value={tallyLedger} onChange={(e) => setTallyLedger(e.target.value)} className={inputCls} placeholder="e.g. Sify Technologies Ltd" disabled={isReadOnly} />
              </div>
            </div>
          </Section>

          {/* B. Business Registration */}
          <Section title="B. Business Registration">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>PAN Number *</label>
                <input value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} className={inputCls} maxLength={10} placeholder="AABCC1234A" style={{ fontFamily: "var(--font-mono)", letterSpacing: 1 }} disabled={isReadOnly} />
              </div>
              <div>
                <label className={labelCls}>Company Type</label>
                <select value={companyType} onChange={(e) => setCompanyType(e.target.value as CompanyType)} className={inputCls} disabled={isReadOnly}>
                  {COMPANY_TYPES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <input type="checkbox" checked={msmeRegistered} onChange={(e) => setMsmeRegistered(e.target.checked)} style={{ accentColor: "var(--caveo-red)" }} disabled={isReadOnly} />
                  MSME Registered
                </label>
                {msmeRegistered && (
                  <div style={{ marginTop: 10 }}>
                    <label className={labelCls}>MSME / Udyam Registration Number</label>
                    <input value={msmeNumber} onChange={(e) => setMsmeNumber(e.target.value.toUpperCase())} className={inputCls} placeholder="UDYAM-TN-XX-XXXXXXX" disabled={isReadOnly} />
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* Branches */}
          <Section title="Branches & GST Registrations">
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 10 }}>
              Each branch can have its own GST registration. GST state code is validated against the branch state.
            </div>
            <VendorBranchManager branches={branches} caps={caps} onChange={setBranches} />
          </Section>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-cav btn-cav-ghost" onClick={onClose}>Cancel</button>
          {!isReadOnly && (
            <button className="btn-cav btn-cav-primary" onClick={handleSave}>
              {ed ? "Save Changes" : "Create Vendor"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
