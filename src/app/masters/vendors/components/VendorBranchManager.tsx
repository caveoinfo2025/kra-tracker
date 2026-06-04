"use client";
import { useState } from "react";
import { Plus, Pencil, Check, X, Star, Building2 } from "lucide-react";
import {
  VendorBranch, VendorCaps, ADDRESS_TYPES, STATE_NAMES, STATE_TO_CODE,
} from "../data";
import GSTRegistrationPanel, { EMPTY_GST_FORM } from "./GSTRegistrationPanel";

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

const EMPTY_BRANCH: Omit<VendorBranch, "id"> = {
  branchName: "", addressType: "Registered Office", address: "", city: "",
  state: "Tamil Nadu", stateCode: "33", country: "India", pinCode: "",
  contactPerson: "", phone: "", email: "", isPrimary: false,
  gstRegistered: false, gstin: "", gstLegalName: "", gstStatus: "Not Verified", gstLedgerMapping: "",
};

function BranchCard({ branch, caps, onEdit, onSetPrimary }: { branch: VendorBranch; caps: VendorCaps; onEdit: () => void; onSetPrimary: () => void }) {
  return (
    <div style={{ border: `1px solid ${branch.isPrimary ? "var(--caveo-red)" : "var(--border)"}`, borderRadius: 12, padding: "14px 16px", background: branch.isPrimary ? "rgba(200,16,46,0.02)" : "var(--surface-alt)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <Building2 size={16} style={{ color: "var(--fg-3)", marginTop: 2, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg-1)" }}>{branch.branchName}</span>
            <span className="badge badge-neutral" style={{ fontSize: 10 }}>{branch.addressType}</span>
            {branch.isPrimary && <span className="badge badge-accent" style={{ fontSize: 10 }}>Primary</span>}
          </div>
          <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4 }}>{branch.address}, {branch.city}, {branch.state} — {branch.pinCode}</div>
          {branch.contactPerson && <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>{branch.contactPerson} · {branch.phone}</div>}
          {branch.gstRegistered && branch.gstin && (
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span className="badge badge-neutral" style={{ fontSize: 10 }}>GST</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--caveo-red)" }}>{branch.gstin}</span>
              <span className={`badge ${branch.gstStatus === "Verified" ? "badge-success" : branch.gstStatus === "Invalid" ? "badge-danger" : "badge-neutral"}`} style={{ fontSize: 10 }}>{branch.gstStatus}</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {!branch.isPrimary && caps.canEdit && (
            <button title="Set as Primary" className="btn-cav btn-cav-ghost btn-cav-sm" style={{ padding: "4px 6px" }} onClick={onSetPrimary}><Star size={13} /></button>
          )}
          {caps.canEdit && <button title="Edit" className="btn-cav btn-cav-ghost btn-cav-sm" style={{ padding: "4px 6px" }} onClick={onEdit}><Pencil size={13} /></button>}
        </div>
      </div>
    </div>
  );
}

function BranchForm({
  initial, onSave, onCancel,
}: {
  initial: Partial<VendorBranch> & Partial<Omit<VendorBranch, "id">>;
  onSave: (b: Omit<VendorBranch, "id">) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_BRANCH, ...initial });
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  function handleStateChange(stateName: string) {
    const code = STATE_TO_CODE[stateName] ?? "";
    setForm((f) => ({ ...f, state: stateName, stateCode: code }));
  }

  const gstVal = { gstin: form.gstin, gstLegalName: form.gstLegalName, gstStatus: form.gstStatus as "Verified" | "Not Verified" | "Invalid", gstLedgerMapping: form.gstLedgerMapping };

  return (
    <div style={{ border: "1px solid var(--caveo-red)", borderRadius: 12, padding: "16px", background: "rgba(200,16,46,0.01)" }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Branch Name *</label>
          <input value={form.branchName} onChange={(e) => set("branchName", e.target.value)} className={inputCls} placeholder="e.g. Chennai HQ" />
        </div>
        <div>
          <label className={labelCls}>Address Type</label>
          <select value={form.addressType} onChange={(e) => set("addressType", e.target.value)} className={inputCls}>
            {ADDRESS_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Address</label>
          <textarea value={form.address} onChange={(e) => set("address", e.target.value)} className={inputCls} rows={2} placeholder="Street / Building" />
        </div>
        <div>
          <label className={labelCls}>City</label>
          <input value={form.city} onChange={(e) => set("city", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>State</label>
          <select value={form.state} onChange={(e) => handleStateChange(e.target.value)} className={inputCls}>
            {STATE_NAMES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>PIN Code</label>
          <input value={form.pinCode} onChange={(e) => set("pinCode", e.target.value)} className={inputCls} maxLength={6} />
        </div>
        <div>
          <label className={labelCls}>Contact Person</label>
          <input value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} type="email" />
        </div>
      </div>

      {/* GST Section */}
      <div style={{ marginTop: 14 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <input type="checkbox" checked={form.gstRegistered} onChange={(e) => set("gstRegistered", e.target.checked)} style={{ accentColor: "var(--caveo-red)" }} />
          GST Registered for this branch
        </label>
        {form.gstRegistered && (
          <div style={{ marginTop: 12 }}>
            <GSTRegistrationPanel
              value={gstVal}
              onChange={(g) => setForm((f) => ({ ...f, gstin: g.gstin, gstLegalName: g.gstLegalName, gstStatus: g.gstStatus, gstLedgerMapping: g.gstLedgerMapping }))}
              branchStateCode={form.stateCode}
              branchStateName={form.state}
            />
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
        <button className="btn-cav btn-cav-ghost btn-cav-sm" onClick={onCancel}><X size={13} /> Cancel</button>
        <button className="btn-cav btn-cav-primary btn-cav-sm" onClick={() => onSave(form)}><Check size={13} /> Save Branch</button>
      </div>
    </div>
  );
}

export default function VendorBranchManager({
  branches, caps, onChange,
}: {
  branches: VendorBranch[];
  caps: VendorCaps;
  onChange: (branches: VendorBranch[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  let nextId = Math.max(0, ...branches.map((b) => b.id)) + 1;

  function addBranch(data: Omit<VendorBranch, "id">) {
    onChange([...branches, { ...data, id: nextId++ }]);
    setAdding(false);
  }
  function editBranch(id: number, data: Omit<VendorBranch, "id">) {
    onChange(branches.map((b) => b.id === id ? { ...data, id } : b));
    setEditingId(null);
  }
  function setPrimary(id: number) {
    onChange(branches.map((b) => ({ ...b, isPrimary: b.id === id })));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {branches.map((b) =>
        editingId === b.id ? (
          <BranchForm key={b.id} initial={b} onSave={(d) => editBranch(b.id, d)} onCancel={() => setEditingId(null)} />
        ) : (
          <BranchCard key={b.id} branch={b} caps={caps} onEdit={() => setEditingId(b.id)} onSetPrimary={() => setPrimary(b.id)} />
        )
      )}
      {adding && <BranchForm initial={{}} onSave={addBranch} onCancel={() => setAdding(false)} />}
      {!adding && caps.canEdit && (
        <button className="btn-cav btn-cav-secondary btn-cav-sm" style={{ alignSelf: "flex-start" }} onClick={() => setAdding(true)}>
          <Plus size={13} /> Add Branch
        </button>
      )}
    </div>
  );
}
