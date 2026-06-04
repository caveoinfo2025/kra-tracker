"use client";

/**
 * Bank Book — orchestrator (Phase 2, UI only).
 * Composes the reusable Bank* components over mock data. No backend.
 */

import { useMemo, useState } from "react";
import {
  Plus, ArrowLeftRight, Upload, FileSpreadsheet, FileText, X, Info, Banknote,
} from "lucide-react";
import {
  BankAccount, BankTxn, ImportHistoryRow, BankCaps, SourceLink,
  BANK_ACCOUNTS, BANK_TXNS, IMPORT_HISTORY, TXN_TYPES, PAYMENT_MODES,
  OPEN_COLLECTIONS, CUSTOMER_ADVANCES, PAYABLE_EXPENSES,
  FY, fmtINR, fmtDate, computeBalances, isCreditType,
} from "./data";
import BankBalanceCard from "./components/BankBalanceCard";
import BankSummaryPanel from "./components/BankSummaryPanel";
import BankFilters, { BankFilterValues, EMPTY_FILTERS } from "./components/BankFilters";
import BankTransactionTable from "./components/BankTransactionTable";
import BankTransactionDrawer from "./components/BankTransactionDrawer";
import BankImportWizard from "./components/BankImportWizard";
import { getExtraBankTxns } from "../_shared/transferStore";

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

export default function BankBookClient({ caps, currentUser }: { caps: BankCaps; currentUser: string }) {
  // Seed from the mock data plus any Bank↔Cash transfer entries created this session.
  const [txns, setTxns] = useState<BankTxn[]>(() => [...BANK_TXNS, ...getExtraBankTxns()]);
  const [history, setHistory] = useState<ImportHistoryRow[]>(IMPORT_HISTORY);
  const [filters, setFilters] = useState<BankFilterValues>({ ...EMPTY_FILTERS, accountId: "hdfc" });
  const [drawerTxn, setDrawerTxn] = useState<BankTxn | null>(null);
  const [modal, setModal] = useState<null | "add" | "transfer" | "import">(null);

  // ── Running balance across all accounts ──
  const balanceById = useMemo(() => {
    const m = new Map<number, number>();
    for (const acc of BANK_ACCOUNTS) computeBalances(acc, txns).forEach((v, k) => m.set(k, v));
    return m;
  }, [txns]);

  const selectedAccounts: BankAccount[] = filters.accountId === "all"
    ? BANK_ACCOUNTS
    : BANK_ACCOUNTS.filter((a) => a.id === filters.accountId);

  // ── Header balance metrics ──
  const metrics = useMemo(() => {
    let current = 0, available = 0, mCredit = 0, mDebit = 0;
    for (const acc of selectedAccounts) {
      const accTxns = txns.filter((t) => t.accountId === acc.id);
      const net = accTxns.reduce((s, t) => s + t.credit - t.debit, 0);
      current += acc.openingBalance + net;
      available += acc.openingBalance + net + acc.overdraftLimit;
      for (const t of accTxns) {
        if (new Date(t.date + "T00:00:00").getMonth() === 5) { // June = current month (mock)
          mCredit += t.credit; mDebit += t.debit;
        }
      }
    }
    return { current, available, mCredit, mDebit };
  }, [selectedAccounts, txns]);

  // ── Apply filters ──
  const filtered = useMemo(() => {
    return txns.filter((t) => {
      if (filters.accountId !== "all" && t.accountId !== filters.accountId) return false;
      if (filters.dateFrom && t.date < filters.dateFrom) return false;
      if (filters.dateTo && t.date > filters.dateTo) return false;
      if (filters.branch) {
        const acc = BANK_ACCOUNTS.find((a) => a.id === t.accountId);
        if (acc?.branch !== filters.branch) return false;
      }
      if (filters.txnType && t.type !== filters.txnType) return false;
      if (filters.mode && t.mode !== filters.mode) return false;
      if (filters.approval && t.approval !== filters.approval) return false;
      if (filters.customer && !(t.partyKind === "customer" && t.party.toLowerCase().includes(filters.customer.toLowerCase()))) return false;
      if (filters.vendor && !(t.partyKind === "vendor" && t.party.toLowerCase().includes(filters.vendor.toLowerCase()))) return false;
      if (filters.employee && !(t.partyKind === "employee" && t.party.toLowerCase().includes(filters.employee.toLowerCase()))) return false;
      return true;
    });
  }, [txns, filters]);

  // Reconciliation tallies for the selected account(s)
  const recon = useMemo(() => {
    const scope = txns.filter((t) => filters.accountId === "all" || t.accountId === filters.accountId);
    return {
      reconciled: scope.filter((t) => t.recon === "Reconciled").length,
      unreconciled: scope.filter((t) => t.recon === "Unreconciled").length,
      partial: scope.filter((t) => t.recon === "Partially Reconciled").length,
    };
  }, [txns, filters.accountId]);

  // ── Mutations ──
  function reconcile(ids: number[]) {
    setTxns((ts) => ts.map((t) => (ids.includes(t.id) ? { ...t, recon: "Reconciled" as const } : t)));
    setDrawerTxn((d) => (d && ids.includes(d.id) ? { ...d, recon: "Reconciled" } : d));
  }

  function addEntry(data: Omit<BankTxn, "id" | "txnNo" | "createdBy" | "recon" | "approval" | "imported">) {
    const id = Math.max(0, ...txns.map((t) => t.id)) + 1;
    const entry: BankTxn = {
      ...data, id, txnNo: `BB/${FY}/${String(id).padStart(4, "0")}`,
      createdBy: currentUser, recon: "Unreconciled", approval: "Pending", imported: false,
    };
    setTxns((ts) => [...ts, entry]);
    setModal(null);
  }

  function transfer(fromId: string, toId: string, amount: number, date: string, ref: string) {
    let id = Math.max(0, ...txns.map((t) => t.id));
    const from = BANK_ACCOUNTS.find((a) => a.id === fromId)!;
    const to = BANK_ACCOUNTS.find((a) => a.id === toId)!;
    const mk = (accountId: string, debit: number, credit: number, desc: string): BankTxn => {
      id += 1;
      return {
        id, accountId, date, txnNo: `BB/${FY}/${String(id).padStart(4, "0")}`,
        refNo: ref || `TRF-${id}`, type: "Bank Transfer", description: desc, party: "", partyKind: "",
        mode: "Bank Transfer", debit, credit, createdBy: currentUser, recon: "Unreconciled",
        approval: "Pending", imported: false,
      };
    };
    setTxns((ts) => [
      ...ts,
      mk(fromId, amount, 0, `Transfer to ${to.name}`),
      mk(toId, 0, amount, `Transfer from ${from.name}`),
    ]);
    setModal(null);
  }

  function completeImport(row: ImportHistoryRow) {
    setHistory((h) => [row, ...h]);
  }

  function exportData(kind: "excel" | "pdf") {
    if (kind === "excel") {
      const head = ["Date", "Txn No", "Ref", "Type", "Description", "Party", "Mode", "Debit", "Credit", "Balance", "Status"];
      const body = filtered.map((t) => [
        fmtDate(t.date), t.txnNo, t.refNo, t.type, t.description, t.party, t.mode,
        t.debit || "", t.credit || "", balanceById.get(t.id) ?? "", t.recon,
      ]);
      const esc = (v: string | number) => `<td>${String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</td>`;
      const html = `<table border="1"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map(esc).join("")}</tr>`).join("")}</tbody></table>`;
      const blob = new Blob([`﻿${html}`], { type: "application/vnd.ms-excel" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "BankBook.xls"; a.click(); URL.revokeObjectURL(a.href);
    } else {
      const rowsHtml = filtered.map((t) => `<tr><td>${fmtDate(t.date)}</td><td>${t.txnNo}</td><td>${t.type}</td><td>${t.description}</td><td style="text-align:right;color:#8E0A1F">${t.debit ? fmtINR(t.debit) : ""}</td><td style="text-align:right;color:#1F7A3F">${t.credit ? fmtINR(t.credit) : ""}</td><td style="text-align:right;font-weight:600">${fmtINR(balanceById.get(t.id) ?? 0)}</td><td>${t.recon}</td></tr>`).join("");
      const html = `<!doctype html><html><head><title>Bank Book</title><style>body{font-family:Inter,Arial,sans-serif;padding:24px;color:#0F1115}h1{font-size:18px;margin:0 0 12px}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#EEF0F3;text-align:left;padding:7px 8px;font-size:9px;text-transform:uppercase;color:#5B626C}td{padding:6px 8px;border-bottom:1px solid #E3E6EB}</style></head><body><h1>Bank Book — ${filters.accountId === "all" ? "All Accounts" : BANK_ACCOUNTS.find((a) => a.id === filters.accountId)?.name}</h1><table><thead><tr><th>Date</th><th>Txn No</th><th>Type</th><th>Description</th><th style="text-align:right">Debit</th><th style="text-align:right">Credit</th><th style="text-align:right">Balance</th><th>Status</th></tr></thead><tbody>${rowsHtml}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`;
      const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); }
    }
  }

  const headerAccount = filters.accountId === "all" ? null : BANK_ACCOUNTS.find((a) => a.id === filters.accountId);

  return (
    <div className="space-y-4">
      {/* ── Header: account dropdown + quick actions ── */}
      <div className="card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(200,16,46,0.08)", color: "var(--caveo-red)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Banknote size={20} />
          </span>
          <div>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-3)", fontWeight: 600 }}>Bank Account</div>
            <select
              value={filters.accountId}
              onChange={(e) => setFilters((f) => ({ ...f, accountId: e.target.value }))}
              style={{ border: "none", background: "transparent", fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--fg-1)", padding: 0, cursor: "pointer", outline: "none" }}
            >
              <option value="all">All Accounts</option>
              {BANK_ACCOUNTS.map((a) => <option key={a.id} value={a.id}>{a.name} {a.maskedNo}</option>)}
            </select>
            <div style={{ fontSize: 11.5, color: "var(--fg-4)" }}>
              {headerAccount ? `${headerAccount.branch} · ${headerAccount.maskedNo}` : `${BANK_ACCOUNTS.length} accounts · FY ${FY}`}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {caps.canAdd && <button className="btn-cav btn-cav-primary" onClick={() => setModal("add")}><Plus size={14} /> Add Bank Entry</button>}
          {caps.canAdd && <button className="btn-cav btn-cav-secondary" onClick={() => setModal("transfer")}><ArrowLeftRight size={14} /> Transfer Funds</button>}
          {caps.canImport && <button className="btn-cav btn-cav-secondary" onClick={() => setModal("import")}><Upload size={14} /> Import Statement</button>}
          <button className="btn-cav btn-cav-secondary" onClick={() => exportData("excel")}><FileSpreadsheet size={14} /> Excel</button>
          <button className="btn-cav btn-cav-secondary" onClick={() => exportData("pdf")}><FileText size={14} /> PDF</button>
        </div>
      </div>

      {/* ── Filters (collapsible, top) ── */}
      <BankFilters
        accounts={BANK_ACCOUNTS}
        value={filters}
        onApply={(v) => setFilters(v)}
        onReset={() => setFilters({ ...EMPTY_FILTERS, accountId: filters.accountId })}
      />

      {/* ── Balance cards ── */}
      <div className="kpi-grid">
        <BankBalanceCard label="Current Balance" value={metrics.current} accent sub={headerAccount ? headerAccount.name : "All accounts"} />
        <BankBalanceCard label="Available Balance" value={metrics.available} accent sub="Incl. overdraft limit" />
        <BankBalanceCard label="Monthly Credits" value={metrics.mCredit} tone="credit" sub="This month" />
        <BankBalanceCard label="Monthly Debits" value={metrics.mDebit} tone="debit" sub="This month" />
      </div>

      {/* ── Role / permission note ── */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-4)" }}>
        <Info size={12} />
        Signed in as <b style={{ color: "var(--fg-3)" }}>{caps.roleLabel}</b> · illustrative data (bank-book API ships in a later phase).
      </div>

      {/* ── Reconciliation strip ── */}
      <div className="card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-2)" }}>Reconciliation</div>
        <span className="badge badge-success">{recon.reconciled} Reconciled</span>
        <span className="badge badge-warning">{recon.partial} Partial</span>
        <span className="badge badge-neutral">{recon.unreconciled} Unreconciled</span>
        <button className="btn-cav btn-cav-ghost btn-cav-sm" style={{ marginLeft: "auto" }}>View Reconciliation History</button>
      </div>

      {/* ── Ledger table OR empty state ── */}
      {filtered.length === 0 ? (
        <div className="card">
          <div style={{ textAlign: "center", padding: "56px 16px", color: "var(--fg-4)" }}>
            <Banknote size={36} strokeWidth={1.2} style={{ opacity: 0.6 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-3)", marginTop: 10 }}>No bank transactions found</div>
            <div style={{ fontSize: 12.5, marginTop: 3 }}>Adjust filters, add an entry, or import a statement.</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
              {caps.canAdd && <button className="btn-cav btn-cav-primary btn-cav-sm" onClick={() => setModal("add")}><Plus size={13} /> Add First Transaction</button>}
              {caps.canImport && <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={() => setModal("import")}><Upload size={13} /> Import Bank Statement</button>}
            </div>
          </div>
        </div>
      ) : (
        <BankTransactionTable
          rows={filtered}
          balanceById={balanceById}
          caps={caps}
          onRowClick={setDrawerTxn}
          onBulkReconcile={reconcile}
          onExport={exportData}
        />
      )}

      {/* ── Account summary ── */}
      {headerAccount && <BankSummaryPanel account={headerAccount} txns={txns} />}

      {/* ── Drawer ── */}
      {drawerTxn && (
        <BankTransactionDrawer txn={drawerTxn} caps={caps} onClose={() => setDrawerTxn(null)} onReconcile={(id) => reconcile([id])} />
      )}

      {/* ── Import wizard ── */}
      {modal === "import" && (
        <BankImportWizard
          accounts={BANK_ACCOUNTS}
          defaultAccountId={filters.accountId}
          currentUser={currentUser}
          onClose={() => setModal(null)}
          onComplete={completeImport}
        />
      )}

      {/* ── Add Bank Entry ── */}
      {modal === "add" && (
        <AddEntryForm
          accounts={BANK_ACCOUNTS}
          defaultAccountId={filters.accountId === "all" ? BANK_ACCOUNTS[0].id : filters.accountId}
          onClose={() => setModal(null)}
          onSave={addEntry}
        />
      )}

      {/* ── Transfer Funds ── */}
      {modal === "transfer" && (
        <TransferForm accounts={BANK_ACCOUNTS} onClose={() => setModal(null)} onSave={transfer} />
      )}
    </div>
  );
}

// ─── Add Bank Entry slide-in ──────────────────────────────────────────────────

function AddEntryForm({
  accounts, defaultAccountId, onClose, onSave,
}: {
  accounts: BankAccount[];
  defaultAccountId: string;
  onClose: () => void;
  onSave: (data: Omit<BankTxn, "id" | "txnNo" | "createdBy" | "recon" | "approval" | "imported">) => void;
}) {
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<typeof TXN_TYPES[number]>("Customer Receipt");
  const [mode, setMode] = useState<typeof PAYMENT_MODES[number]>("NEFT");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [refNo, setRefNo] = useState("");
  const [party, setParty] = useState("");
  const [partyKind, setPartyKind] = useState<BankTxn["partyKind"]>("");
  const [source, setSource] = useState<SourceLink | undefined>(undefined);
  // For Customer Receipt: settle an Invoice or an Advance
  const [settleKind, setSettleKind] = useState<"collection" | "advance">("collection");
  const [error, setError] = useState("");

  const credit = isCreditType(type);
  // Which source documents can this transaction type settle?
  const linksCustomer = type === "Customer Receipt";
  const linksExpense = type === "Vendor Payment" || type === "Expense Payment";

  function clearLink() { setSource(undefined); }

  function pickCollection(id: string) {
    const c = OPEN_COLLECTIONS.find((x) => x.id === id);
    if (!c) { clearLink(); return; }
    setSource({ kind: "collection", id: c.id, label: `${c.invoiceNo} · ${c.customer}` });
    setAmount(String(c.amount)); setParty(c.customer); setPartyKind("customer");
    setDescription(`Receipt against ${c.invoiceNo}`);
  }
  function pickAdvance(id: string) {
    const a = CUSTOMER_ADVANCES.find((x) => x.id === id);
    if (!a) { clearLink(); return; }
    setSource({ kind: "advance", id: a.id, label: `${a.ref} · ${a.customer}` });
    setAmount(String(a.amount)); setParty(a.customer); setPartyKind("customer");
    setDescription(`Advance received — ${a.customer}`);
  }
  function pickExpense(id: string) {
    const e = PAYABLE_EXPENSES.find((x) => x.id === id);
    if (!e) { clearLink(); return; }
    setSource({ kind: "expense", id: e.id, label: `${e.expenseNo} · ${e.vendor}` });
    setAmount(String(e.amount)); setParty(e.vendor); setPartyKind("vendor");
    setMode(e.mode as typeof PAYMENT_MODES[number]);
    setDescription(`${e.category} — ${e.vendor}`);
  }

  function submit() {
    setError("");
    const amt = parseFloat(amount) || 0;
    if (!(amt > 0)) return setError("Enter an amount greater than zero.");
    if (!description.trim()) return setError("Description is required.");
    onSave({
      accountId, date, type, mode, refNo: refNo.trim(), description: description.trim(),
      party: party.trim(), partyKind,
      debit: credit ? 0 : amt, credit: credit ? amt : 0,
      source,
    });
  }

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-pane" onClick={(e) => e.stopPropagation()}>
        <div className="dp-head">
          <div style={{ fontSize: 15, fontWeight: 600 }}>Add Bank Entry</div>
          <button onClick={onClose} className="btn-cav btn-cav-ghost btn-cav-sm"><X size={16} /></button>
        </div>
        <div className="dp-body">
          {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded border border-red-200">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={labelCls}>Bank Account</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputCls}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} {a.maskedNo}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Transaction Type</label>
              <select value={type} onChange={(e) => { setType(e.target.value as typeof TXN_TYPES[number]); clearLink(); setPartyKind(""); }} className={inputCls}>
                {TXN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Payment Mode</label>
              <select value={mode} onChange={(e) => setMode(e.target.value as typeof PAYMENT_MODES[number])} className={inputCls}>
                {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* ── Map to a source document ── */}
          {(linksCustomer || linksExpense) && (
            <div style={{ marginTop: 16, padding: 14, background: "var(--bg-muted)", borderRadius: 10 }}>
              <div className="section-label" style={{ marginBottom: 10 }}>
                {linksCustomer ? "Settle a customer receipt" : "Pay against an approved expense"}
              </div>

              {linksCustomer && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Settlement Type</label>
                    <select value={settleKind} onChange={(e) => { setSettleKind(e.target.value as "collection" | "advance"); clearLink(); }} className={inputCls}>
                      <option value="collection">Invoice (Collection)</option>
                      <option value="advance">Customer Advance</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{settleKind === "collection" ? "Open Invoice" : "Advance"}</label>
                    {settleKind === "collection" ? (
                      <select value={source?.kind === "collection" ? source.id : ""} onChange={(e) => pickCollection(e.target.value)} className={inputCls}>
                        <option value="">Select invoice…</option>
                        {OPEN_COLLECTIONS.map((c) => <option key={c.id} value={c.id}>{c.invoiceNo} · {c.customer} · {fmtINR(c.amount)}</option>)}
                      </select>
                    ) : (
                      <select value={source?.kind === "advance" ? source.id : ""} onChange={(e) => pickAdvance(e.target.value)} className={inputCls}>
                        <option value="">Select advance…</option>
                        {CUSTOMER_ADVANCES.map((a) => <option key={a.id} value={a.id}>{a.ref} · {a.customer} · {fmtINR(a.amount)}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              )}

              {linksExpense && (
                <div>
                  <label className={labelCls}>Approved Expense</label>
                  <select value={source?.kind === "expense" ? source.id : ""} onChange={(e) => pickExpense(e.target.value)} className={inputCls}>
                    <option value="">Select expense…</option>
                    {PAYABLE_EXPENSES.map((x) => <option key={x.id} value={x.id}>{x.expenseNo} · {x.vendor} · {fmtINR(x.amount)} ({x.mode})</option>)}
                  </select>
                </div>
              )}

              {source && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--fg-2)" }}>
                  <span className="badge badge-accent">Linked</span>
                  <span style={{ flex: 1 }}>{source.label}</span>
                  <button className="btn-cav btn-cav-ghost btn-cav-sm" onClick={clearLink}>Unlink</button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginTop: 16 }}>
            <div><label className={labelCls}>Amount (₹) · {credit ? "Credit" : "Debit"}</label>
              <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder="0.00" />
            </div>
            <div><label className={labelCls}>Reference No</label><input value={refNo} onChange={(e) => setRefNo(e.target.value)} className={inputCls} placeholder="UTR / cheque no" /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Customer / Vendor / Payee</label><input value={party} onChange={(e) => setParty(e.target.value)} className={inputCls} placeholder="Counterparty name" /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Description</label><input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} placeholder="Narration" /></div>
          </div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-cav btn-cav-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-cav btn-cav-primary" onClick={submit}>Save Entry</button>
        </div>
      </div>
    </div>
  );
}

// ─── Transfer Funds slide-in ──────────────────────────────────────────────────

function TransferForm({
  accounts, onClose, onSave,
}: {
  accounts: BankAccount[];
  onClose: () => void;
  onSave: (fromId: string, toId: string, amount: number, date: string, ref: string) => void;
}) {
  const [fromId, setFromId] = useState(accounts[0].id);
  const [toId, setToId] = useState(accounts[1]?.id ?? accounts[0].id);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [ref, setRef] = useState("");
  const [error, setError] = useState("");

  function submit() {
    setError("");
    const amt = parseFloat(amount) || 0;
    if (fromId === toId) return setError("Choose two different accounts.");
    if (!(amt > 0)) return setError("Enter an amount greater than zero.");
    onSave(fromId, toId, amt, date, ref.trim());
  }

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-pane" onClick={(e) => e.stopPropagation()}>
        <div className="dp-head">
          <div style={{ fontSize: 15, fontWeight: 600 }}>Transfer Funds</div>
          <button onClick={onClose} className="btn-cav btn-cav-ghost btn-cav-sm"><X size={16} /></button>
        </div>
        <div className="dp-body">
          {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded border border-red-200">{error}</div>}
          <div className="grid grid-cols-1 gap-4">
            <div><label className={labelCls}>From Account</label>
              <select value={fromId} onChange={(e) => setFromId(e.target.value)} className={inputCls}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} {a.maskedNo}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "center", color: "var(--fg-4)" }}><ArrowLeftRight size={16} /></div>
            <div><label className={labelCls}>To Account</label>
              <select value={toId} onChange={(e) => setToId(e.target.value)} className={inputCls}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} {a.maskedNo}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>Amount (₹)</label><input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder="0.00" /></div>
              <div><label className={labelCls}>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>
            </div>
            <div><label className={labelCls}>Reference No</label><input value={ref} onChange={(e) => setRef(e.target.value)} className={inputCls} placeholder="Transfer reference" /></div>
          </div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-cav btn-cav-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-cav btn-cav-primary" onClick={submit}>Transfer</button>
        </div>
      </div>
    </div>
  );
}
