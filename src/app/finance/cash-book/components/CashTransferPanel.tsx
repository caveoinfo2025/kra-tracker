"use client";
import { useState } from "react";
import { X, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { CashAccount, fmtINR } from "../data";
import { BANK_ACCOUNTS } from "../../bank-book/data";

/**
 * CashTransferPanel — Bank ↔ Cash movement.
 *  - "from-bank"  → Bank Withdrawal → posts a Cash In (credit) + links a Bank Book debit.
 *  - "to-bank"    → Cash Deposit    → posts a Bank Transfer Out (debit) + links a Bank Book credit.
 */
export default function CashTransferPanel({
  mode, cashAccounts, defaultCashId, onClose, onSave,
}: {
  mode: "from-bank" | "to-bank";
  cashAccounts: CashAccount[];
  defaultCashId: string;
  onClose: () => void;
  onSave: (args: { cashAccountId: string; bankAccountId: string; amount: number; date: string; ref: string; mode: "from-bank" | "to-bank" }) => void;
}) {
  const [cashAccountId, setCashId] = useState(defaultCashId);
  const [bankAccountId, setBankId] = useState(BANK_ACCOUNTS[0].id);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [ref, setRef] = useState("");
  const [error, setError] = useState("");

  const fromBank = mode === "from-bank";
  const title = fromBank ? "Transfer From Bank" : "Deposit To Bank";

  function submit() {
    setError("");
    const amt = parseFloat(amount) || 0;
    if (!(amt > 0)) return setError("Enter an amount greater than zero.");
    onSave({ cashAccountId, bankAccountId, amount: amt, date, ref: ref.trim(), mode });
  }

  const amt = parseFloat(amount) || 0;

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-pane" onClick={(e) => e.stopPropagation()}>
        <div className="dp-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: fromBank ? "rgba(31,157,85,0.12)" : "rgba(200,16,46,0.10)", color: fromBank ? "var(--success)" : "var(--caveo-red)" }}>
              {fromBank ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
            </span>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
          </div>
          <button onClick={onClose} className="btn-cav btn-cav-ghost btn-cav-sm"><X size={16} /></button>
        </div>
        <div className="dp-body">
          {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded border border-red-200">{error}</div>}

          <div style={{ background: "var(--bg-muted)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--fg-2)", display: "flex", alignItems: "center", gap: 8 }}>
            {fromBank
              ? <>Bank withdrawal <ArrowDownLeft size={13} /> creates a <b>Cash In</b> entry &amp; a linked Bank Book debit.</>
              : <>Cash deposit <ArrowUpRight size={13} /> creates a <b>Bank Transfer Out</b> entry &amp; a linked Bank Book credit.</>}
          </div>

          <div className="grid grid-cols-1 gap-4" style={{ marginTop: 14 }}>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{fromBank ? "From Bank Account" : "To Bank Account"}</label>
              <select value={bankAccountId} onChange={(e) => setBankId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
                {BANK_ACCOUNTS.map((a) => <option key={a.id} value={a.id}>{a.name} {a.maskedNo}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{fromBank ? "To Cash Account" : "From Cash Account"}</label>
              <select value={cashAccountId} onChange={(e) => setCashId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
                {cashAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Reference No</label>
              <input value={ref} onChange={(e) => setRef(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" placeholder="Slip / UTR / cheque no" />
            </div>
          </div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-cav btn-cav-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-cav btn-cav-primary" onClick={submit}>{title}{amt > 0 ? ` · ${fmtINR(amt)}` : ""}</button>
        </div>
      </div>
    </div>
  );
}
