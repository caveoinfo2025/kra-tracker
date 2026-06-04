"use client";
import { useState } from "react";
import { Plus, Pencil, Check, X, Star, Landmark, ShieldCheck, Clock, XCircle } from "lucide-react";
import { VendorBankAccount, VendorCaps, VendorBranch, ACCOUNT_TYPES } from "../data";

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

const EMPTY_BANK: Omit<VendorBankAccount, "id"> = {
  accountHolderName: "", bankName: "", accountNumber: "", ifsc: "", branch: "",
  accountType: "Current", linkedBranchId: null, isPrimary: false, verificationStatus: "Pending",
};

const verifyIcon = (s: string) => s === "Verified" ? <ShieldCheck size={13} style={{ color: "var(--success)" }} /> : s === "Failed" ? <XCircle size={13} style={{ color: "var(--caveo-red)" }} /> : <Clock size={13} style={{ color: "var(--fg-3)" }} />;

function BankCard({ bank, branches, caps, onEdit, onSetPrimary }: { bank: VendorBankAccount; branches: VendorBranch[]; caps: VendorCaps; onEdit: () => void; onSetPrimary: () => void }) {
  const linkedBranch = branches.find((b) => b.id === bank.linkedBranchId);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", borderRadius: 10, border: `1px solid ${bank.isPrimary ? "var(--caveo-red)" : "var(--border)"}`, background: bank.isPrimary ? "rgba(200,16,46,0.02)" : "var(--surface-alt)" }}>
      <Landmark size={18} style={{ color: "var(--fg-3)", marginTop: 2, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-1)" }}>{bank.bankName}</span>
          <span className="badge badge-neutral" style={{ fontSize: 10 }}>{bank.accountType}</span>
          {bank.isPrimary && <span className="badge badge-accent" style={{ fontSize: 10 }}>Primary</span>}
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: bank.verificationStatus === "Verified" ? "var(--success)" : "var(--fg-3)" }}>
            {verifyIcon(bank.verificationStatus)}{bank.verificationStatus}
          </span>
        </div>
        <div className="cell-sub" style={{ marginTop: 4 }}>
          {bank.accountHolderName} · A/c: <span style={{ fontFamily: "var(--font-mono)" }}>{bank.accountNumber}</span>
        </div>
        <div className="cell-sub">IFSC: <span style={{ fontFamily: "var(--font-mono)" }}>{bank.ifsc}</span>{bank.branch ? ` · ${bank.branch}` : ""}</div>
        {linkedBranch && <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>Linked to: {linkedBranch.branchName}</div>}
      </div>
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        {!bank.isPrimary && caps.canManageBank && <button title="Set Primary" className="btn-cav btn-cav-ghost btn-cav-sm" style={{ padding: "4px 6px" }} onClick={onSetPrimary}><Star size={13} /></button>}
        {caps.canManageBank && <button title="Edit" className="btn-cav btn-cav-ghost btn-cav-sm" style={{ padding: "4px 6px" }} onClick={onEdit}><Pencil size={13} /></button>}
      </div>
    </div>
  );
}

function BankForm({ initial, branches, onSave, onCancel }: { initial: Partial<VendorBankAccount>; branches: VendorBranch[]; onSave: (b: Omit<VendorBankAccount, "id">) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ ...EMPTY_BANK, ...initial });
  const set = (k: keyof typeof form, v: string | number | null) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div style={{ border: "1px solid var(--caveo-red)", borderRadius: 10, padding: 14, background: "rgba(200,16,46,0.01)" }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={labelCls}>Account Holder Name *</label><input value={form.accountHolderName} onChange={(e) => set("accountHolderName", e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Bank Name *</label><input value={form.bankName} onChange={(e) => set("bankName", e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Account Number *</label><input value={form.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} className={inputCls} style={{ fontFamily: "var(--font-mono)" }} /></div>
        <div><label className={labelCls}>IFSC Code *</label><input value={form.ifsc} onChange={(e) => set("ifsc", e.target.value.toUpperCase())} className={inputCls} style={{ fontFamily: "var(--font-mono)" }} maxLength={11} /></div>
        <div><label className={labelCls}>Branch Name</label><input value={form.branch} onChange={(e) => set("branch", e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Account Type</label>
          <select value={form.accountType} onChange={(e) => set("accountType", e.target.value)} className={inputCls}>
            {ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div><label className={labelCls}>Linked Branch</label>
          <select value={form.linkedBranchId ?? ""} onChange={(e) => set("linkedBranchId", e.target.value ? Number(e.target.value) : null)} className={inputCls}>
            <option value="">— None —</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.branchName}</option>)}
          </select>
        </div>
        <div><label className={labelCls}>Verification Status</label>
          <select value={form.verificationStatus} onChange={(e) => set("verificationStatus", e.target.value)} className={inputCls}>
            <option value="Pending">Pending</option>
            <option value="Verified">Verified</option>
            <option value="Failed">Failed</option>
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
        <button className="btn-cav btn-cav-ghost btn-cav-sm" onClick={onCancel}><X size={13} /> Cancel</button>
        <button className="btn-cav btn-cav-primary btn-cav-sm" onClick={() => onSave(form)}><Check size={13} /> Save Account</button>
      </div>
    </div>
  );
}

export default function VendorBankManager({ bankAccounts, branches, caps, onChange }: { bankAccounts: VendorBankAccount[]; branches: VendorBranch[]; caps: VendorCaps; onChange: (b: VendorBankAccount[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  let nextId = Math.max(0, ...bankAccounts.map((b) => b.id)) + 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {bankAccounts.map((b) =>
        editingId === b.id ? (
          <BankForm key={b.id} initial={b} branches={branches} onSave={(d) => { onChange(bankAccounts.map((x) => x.id === b.id ? { ...d, id: b.id } : x)); setEditingId(null); }} onCancel={() => setEditingId(null)} />
        ) : (
          <BankCard key={b.id} bank={b} branches={branches} caps={caps} onEdit={() => setEditingId(b.id)} onSetPrimary={() => onChange(bankAccounts.map((x) => ({ ...x, isPrimary: x.id === b.id })))} />
        )
      )}
      {adding && <BankForm initial={{}} branches={branches} onSave={(d) => { onChange([...bankAccounts, { ...d, id: nextId++ }]); setAdding(false); }} onCancel={() => setAdding(false)} />}
      {!adding && caps.canManageBank && <button className="btn-cav btn-cav-secondary btn-cav-sm" style={{ alignSelf: "flex-start" }} onClick={() => setAdding(true)}><Plus size={13} /> Add Bank Account</button>}
    </div>
  );
}
