"use client";

/**
 * Cash Book — orchestrator (Phase 2, UI only). Mirrors the Bank Book module and
 * reuses its balance card, helpers, RBAC tiers, and source-link model. No backend.
 */

import { useMemo, useState } from "react";
import {
  Plus, Minus, ArrowDownLeft, ArrowUpRight, SlidersHorizontal,
  FileSpreadsheet, FileText, X, Info, Wallet, Users, UserCog,
} from "lucide-react";
import {
  CashAccount, CashTxn, CashCaps, ReconHistoryRow, SourceLink,
  CASH_ACCOUNTS, CASH_TXNS, RECON_HISTORY, CASH_TXN_TYPES, EXPENSE_CATEGORIES,
  FY, fmtINR, fmtDate, isCashCredit, computeCashBalances,
} from "./data";
import { OPEN_COLLECTIONS, CUSTOMER_ADVANCES, PAYABLE_EXPENSES, BANK_ACCOUNTS, BankTxn } from "../bank-book/data";
import { getExtraCashTxns, pushCashTxn, pushBankTxn, nextExtraBankId } from "../_shared/transferStore";
import CashBalanceCard from "./components/CashBalanceCard";
import CashFilters, { CashFilterValues, EMPTY_CASH_FILTERS } from "./components/CashFilters";
import CashTransactionTable from "./components/CashTransactionTable";
import CashTransactionDrawer from "./components/CashTransactionDrawer";
import CashSummaryPanel from "./components/CashSummaryPanel";
import CashReconciliationPanel from "./components/CashReconciliationPanel";
import CashTransferPanel from "./components/CashTransferPanel";
import CashVoucherPanel from "./components/CashVoucherPanel";

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";
const todayStr = new Date().toISOString().slice(0, 10);

type Modal = null | "in" | "expense" | "adjustment" | "from-bank" | "to-bank";

export default function CashBookClient({ caps, currentUser }: { caps: CashCaps; currentUser: string }) {
  // Seed from the mock data plus any cross-module transfer entries created this session.
  const [txns, setTxns] = useState<CashTxn[]>(() => [...CASH_TXNS, ...getExtraCashTxns()]);
  const [reconHistory, setReconHistory] = useState<ReconHistoryRow[]>(RECON_HISTORY);
  const [filters, setFilters] = useState<CashFilterValues>({ ...EMPTY_CASH_FILTERS, accountId: "cash-ho" });
  const [drawerTxn, setDrawerTxn] = useState<CashTxn | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [empFilter, setEmpFilter] = useState("");

  // ── Running balances across accounts ──
  const balanceById = useMemo(() => {
    const m = new Map<number, number>();
    for (const a of CASH_ACCOUNTS) computeCashBalances(a, txns).forEach((v, k) => m.set(k, v));
    return m;
  }, [txns]);

  const selectedAccounts: CashAccount[] = filters.accountId === "all"
    ? CASH_ACCOUNTS : CASH_ACCOUNTS.filter((a) => a.id === filters.accountId);

  const users = useMemo(() => Array.from(new Set(txns.map((t) => t.createdBy))).sort(), [txns]);

  // ── Header metrics ──
  const metrics = useMemo(() => {
    let current = 0, reserved = 0, pendingOut = 0, todayIn = 0, todayOut = 0, mIn = 0, mOut = 0;
    for (const acc of selectedAccounts) {
      const accTxns = txns.filter((t) => t.accountId === acc.id);
      const net = accTxns.reduce((s, t) => s + t.credit - t.debit, 0);
      current += acc.openingBalance + net;
      reserved += acc.reservedFloat;
      for (const t of accTxns) {
        if (t.approval === "Pending") pendingOut += t.debit;
        if (t.date === todayStr) { todayIn += t.credit; todayOut += t.debit; }
        if (new Date(t.date + "T00:00:00").getMonth() === 5) { mIn += t.credit; mOut += t.debit; }
      }
    }
    // Available = cash on hand minus reserved float and minus cash committed but not yet approved.
    const available = Math.max(0, current - reserved - pendingOut);
    return { current, available, todayIn, todayOut, mIn, mOut };
  }, [selectedAccounts, txns]);

  // ── Apply filters ──
  const filtered = useMemo(() => txns.filter((t) => {
    if (filters.accountId !== "all" && t.accountId !== filters.accountId) return false;
    if (filters.dateFrom && t.date < filters.dateFrom) return false;
    if (filters.dateTo && t.date > filters.dateTo) return false;
    if (filters.branch) { const a = CASH_ACCOUNTS.find((x) => x.id === t.accountId); if (a?.branch !== filters.branch) return false; }
    if (filters.txnType && t.type !== filters.txnType) return false;
    if (filters.category && t.category !== filters.category) return false;
    if (filters.approval && t.approval !== filters.approval) return false;
    if (filters.createdBy && t.createdBy !== filters.createdBy) return false;
    if (filters.customer && !t.customer.toLowerCase().includes(filters.customer.toLowerCase())) return false;
    if (filters.vendor && !t.vendor.toLowerCase().includes(filters.vendor.toLowerCase())) return false;
    if (filters.employee && !t.employee.toLowerCase().includes(filters.employee.toLowerCase())) return false;
    return true;
  }), [txns, filters]);

  // System balance for reconciliation = current balance of the selected account
  const systemBalance = metrics.current;

  // ── Customer-linked + employee-linked subsets (scoped to selected account) ──
  const scoped = txns.filter((t) => filters.accountId === "all" || t.accountId === filters.accountId);
  const customerRows = scoped.filter((t) => t.customer);
  const employeeRows = scoped.filter((t) =>
    ["Employee Advance", "Advance Settlement", "Employee Reimbursement"].includes(t.type) &&
    (!empFilter || t.employee === empFilter));
  const employees = Array.from(new Set(scoped.filter((t) => t.employee).map((t) => t.employee))).sort();

  // ── Mutations ──
  const nextId = () => Math.max(0, ...txns.map((t) => t.id)) + 1;
  function addTxn(partial: Omit<CashTxn, "id" | "txnNo">) {
    const id = nextId();
    setTxns((ts) => [...ts, { ...partial, id, txnNo: `CB/${FY}/${String(id).padStart(4, "0")}` }]);
    setModal(null);
  }
  function reconcile(ids: number[]) {
    setTxns((ts) => ts.map((t) => (ids.includes(t.id) ? { ...t, recon: "Reconciled" as const } : t)));
    setDrawerTxn((d) => (d && ids.includes(d.id) ? { ...d, recon: "Reconciled" } : d));
  }
  function submitRecon(row: Omit<ReconHistoryRow, "id" | "accountId">) {
    setReconHistory((h) => [{ ...row, id: Math.max(0, ...h.map((x) => x.id)) + 1, accountId: filters.accountId }, ...h]);
  }
  function doTransfer(a: { cashAccountId: string; bankAccountId: string; amount: number; date: string; ref: string; mode: "from-bank" | "to-bank" }) {
    const bank = BANK_ACCOUNTS.find((b) => b.id === a.bankAccountId);
    const cashAcc = CASH_ACCOUNTS.find((c) => c.id === a.cashAccountId);
    const fromBank = a.mode === "from-bank";

    // Pre-compute both transaction numbers so each leg can reference the other.
    const cashId = nextId();
    const cashTxnNo = `CB/${FY}/${String(cashId).padStart(4, "0")}`;
    const bankId = nextExtraBankId();
    const bankTxnNo = `BB/${FY}/${String(bankId).padStart(4, "0")}`;

    // ── Cash leg ──
    const cashEntry: CashTxn = {
      id: cashId, accountId: a.cashAccountId, date: a.date, txnNo: cashTxnNo, refNo: a.ref || bankTxnNo,
      type: fromBank ? "Bank Transfer In" : "Bank Transfer Out",
      description: fromBank ? `Cash withdrawn from ${bank?.name}` : `Cash deposited to ${bank?.name}`,
      category: "", customer: "", project: "", salesOrder: "", vendor: "", employee: "",
      debit: fromBank ? 0 : a.amount, credit: fromBank ? a.amount : 0,
      createdBy: currentUser, recon: "Unreconciled", approval: "Approved", adjusted: false, reversed: false,
      bankTransferRef: bankTxnNo,
    };

    // ── Paired Bank leg (mirror direction) ──
    const bankEntry: BankTxn = {
      id: bankId, accountId: a.bankAccountId, date: a.date, txnNo: bankTxnNo, refNo: a.ref || cashTxnNo,
      type: fromBank ? "Cash Withdrawal" : "Cash Deposit",
      description: fromBank ? `Cash withdrawn to ${cashAcc?.name}` : `Cash deposit from ${cashAcc?.name}`,
      party: cashAcc?.name ?? "", partyKind: "", mode: "Bank Transfer",
      debit: fromBank ? a.amount : 0, credit: fromBank ? 0 : a.amount,
      createdBy: currentUser, recon: "Unreconciled", approval: "Approved", imported: false,
    };

    // Persist both legs to the shared store so each book picks them up on mount…
    pushCashTxn(cashEntry);
    pushBankTxn(bankEntry);
    // …and reflect the cash leg immediately in this view.
    setTxns((ts) => [...ts, cashEntry]);
    setModal(null);
  }

  function exportData(kind: "excel" | "pdf") {
    if (kind === "excel") {
      const head = ["Date", "Txn No", "Ref", "Type", "Description", "Category", "Customer", "Employee", "Debit", "Credit", "Balance", "Status"];
      const body = filtered.map((t) => [fmtDate(t.date), t.txnNo, t.refNo, t.type, t.description, t.category, t.customer, t.employee, t.debit || "", t.credit || "", balanceById.get(t.id) ?? "", t.recon]);
      const esc = (v: string | number) => `<td>${String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</td>`;
      const html = `<table border="1"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map(esc).join("")}</tr>`).join("")}</tbody></table>`;
      const blob = new Blob([`﻿${html}`], { type: "application/vnd.ms-excel" });
      const el = document.createElement("a"); el.href = URL.createObjectURL(blob); el.download = "CashBook.xls"; el.click(); URL.revokeObjectURL(el.href);
    } else {
      const rowsHtml = filtered.map((t) => `<tr><td>${fmtDate(t.date)}</td><td>${t.txnNo}</td><td>${t.type}</td><td>${t.description}</td><td style="text-align:right;color:#8E0A1F">${t.debit ? fmtINR(t.debit) : ""}</td><td style="text-align:right;color:#1F7A3F">${t.credit ? fmtINR(t.credit) : ""}</td><td style="text-align:right;font-weight:600">${fmtINR(balanceById.get(t.id) ?? 0)}</td><td>${t.recon}</td></tr>`).join("");
      const html = `<!doctype html><html><head><title>Cash Book</title><style>body{font-family:Inter,Arial,sans-serif;padding:24px;color:#0F1115}h1{font-size:18px;margin:0 0 12px}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#EEF0F3;text-align:left;padding:7px 8px;font-size:9px;text-transform:uppercase;color:#5B626C}td{padding:6px 8px;border-bottom:1px solid #E3E6EB}</style></head><body><h1>Cash Book — ${filters.accountId === "all" ? "All Accounts" : CASH_ACCOUNTS.find((a) => a.id === filters.accountId)?.name}</h1><table><thead><tr><th>Date</th><th>Txn No</th><th>Type</th><th>Description</th><th style="text-align:right">Debit</th><th style="text-align:right">Credit</th><th style="text-align:right">Balance</th><th>Status</th></tr></thead><tbody>${rowsHtml}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`;
      const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); }
    }
  }

  const headerAccount = filters.accountId === "all" ? null : CASH_ACCOUNTS.find((a) => a.id === filters.accountId);
  const defaultCashId = filters.accountId === "all" ? CASH_ACCOUNTS[0].id : filters.accountId;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(200,16,46,0.08)", color: "var(--caveo-red)", display: "flex", alignItems: "center", justifyContent: "center" }}><Wallet size={20} /></span>
          <div>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-3)", fontWeight: 600 }}>Cash Account</div>
            <select value={filters.accountId} onChange={(e) => setFilters((f) => ({ ...f, accountId: e.target.value }))}
              style={{ border: "none", background: "transparent", fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--fg-1)", padding: 0, cursor: "pointer", outline: "none" }}>
              <option value="all">All Accounts</option>
              {CASH_ACCOUNTS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <div style={{ fontSize: 11.5, color: "var(--fg-4)" }}>{headerAccount ? headerAccount.branch : `${CASH_ACCOUNTS.length} accounts`} · FY {FY}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {caps.canAdd && <button className="btn-cav btn-cav-primary" onClick={() => setModal("in")}><Plus size={14} /> Cash In</button>}
          {caps.canAdd && <button className="btn-cav btn-cav-secondary" onClick={() => setModal("expense")}><Minus size={14} /> Cash Expense</button>}
          {caps.canAdd && <button className="btn-cav btn-cav-secondary" onClick={() => setModal("from-bank")}><ArrowDownLeft size={14} /> Transfer From Bank</button>}
          {caps.canAdd && <button className="btn-cav btn-cav-secondary" onClick={() => setModal("to-bank")}><ArrowUpRight size={14} /> Deposit To Bank</button>}
          {caps.canApproveRecon && <button className="btn-cav btn-cav-secondary" onClick={() => setModal("adjustment")}><SlidersHorizontal size={14} /> Cash Adjustment</button>}
          <button className="btn-cav btn-cav-secondary" onClick={() => exportData("excel")}><FileSpreadsheet size={14} /> Excel</button>
          <button className="btn-cav btn-cav-secondary" onClick={() => exportData("pdf")}><FileText size={14} /> PDF</button>
        </div>
      </div>

      {/* ── Filters (collapsible, top) ── */}
      <CashFilters accounts={CASH_ACCOUNTS} users={users} value={filters}
        onApply={(v) => setFilters(v)} onReset={() => setFilters({ ...EMPTY_CASH_FILTERS, accountId: filters.accountId })} />

      {/* ── Balance cards (6) ── */}
      <div className="kpi-grid">
        <CashBalanceCard label="Current Cash Balance" value={metrics.current} accent sub={headerAccount ? headerAccount.name : "All accounts"} />
        <CashBalanceCard label="Available Cash" value={metrics.available} accent sub="Less float & pending" />
        <CashBalanceCard label="Today's Cash In" value={metrics.todayIn} tone="credit" sub={todayStr} />
        <CashBalanceCard label="Today's Cash Out" value={metrics.todayOut} tone="debit" sub={todayStr} />
        <CashBalanceCard label="Monthly Cash In" value={metrics.mIn} tone="credit" sub="This month" />
        <CashBalanceCard label="Monthly Cash Out" value={metrics.mOut} tone="debit" sub="This month" />
      </div>

      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-4)" }}>
        <Info size={12} /> Signed in as <b style={{ color: "var(--fg-3)" }}>{caps.roleLabel}</b> · illustrative data (cash-book API ships in a later phase).
      </div>

      {/* ── Reconciliation ── */}
      <CashReconciliationPanel systemBalance={systemBalance} caps={caps}
        history={reconHistory.filter((h) => filters.accountId === "all" || h.accountId === filters.accountId)}
        currentUser={currentUser} onSubmit={submitRecon} />

      {/* ── Ledger OR empty state ── */}
      {filtered.length === 0 ? (
        <div className="card">
          <div style={{ textAlign: "center", padding: "56px 16px", color: "var(--fg-4)" }}>
            <Wallet size={36} strokeWidth={1.2} style={{ opacity: 0.6 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-3)", marginTop: 10 }}>No cash transactions found</div>
            <div style={{ fontSize: 12.5, marginTop: 3 }}>Adjust filters, or record a cash entry.</div>
            {caps.canAdd && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
                <button className="btn-cav btn-cav-primary btn-cav-sm" onClick={() => setModal("in")}><Plus size={13} /> Add Cash Entry</button>
                <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={() => setModal("expense")}><Minus size={13} /> Add Expense</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <CashTransactionTable rows={filtered} balanceById={balanceById} caps={caps} onRowClick={setDrawerTxn} onExport={exportData} />
      )}

      {/* ── Account summary ── */}
      {headerAccount && <CashSummaryPanel account={headerAccount} txns={txns} />}

      {/* ── Customer cost visibility ── */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Users size={15} style={{ color: "var(--fg-3)" }} /><div className="ch-title">Customer Cost Visibility</div></div>
          <div className="ch-sub">{customerRows.length} customer-linked entries</div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="crm-table">
            <thead><tr><th>Customer</th><th>Project</th><th>Order Ref</th><th>Category</th><th className="th-right">Amount</th></tr></thead>
            <tbody>
              {customerRows.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: "24px", color: "var(--fg-4)" }}>No customer-linked cash spend.</td></tr>
              ) : customerRows.map((t) => (
                <tr key={t.id} onClick={() => setDrawerTxn(t)}>
                  <td className="cell-strong">{t.customer}</td>
                  <td className="cell-sub">{t.project || "—"}</td>
                  <td className="cell-sub" style={{ fontFamily: "var(--font-mono)", fontSize: 11.5 }}>{t.salesOrder || "—"}</td>
                  <td className="cell-sub">{t.category || "—"}</td>
                  <td className="td-right cell-strong">{fmtINR(t.debit || t.credit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "8px 16px", fontSize: 11, color: "var(--fg-4)", borderTop: "1px solid var(--border-subtle)" }}>Feeds future Customer Profitability reports.</div>
      </div>

      {/* ── Employee finance integration ── */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><UserCog size={15} style={{ color: "var(--fg-3)" }} /><div className="ch-title">Employee Finance</div></div>
          <select value={empFilter} onChange={(e) => setEmpFilter(e.target.value)} className={inputCls} style={{ width: "auto", height: 30, padding: "2px 8px" }}>
            <option value="">All employees</option>
            {employees.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="crm-table">
            <thead><tr><th>Employee</th><th>Type</th><th>Date</th><th>Description</th><th className="th-right">Amount</th><th>Status</th></tr></thead>
            <tbody>
              {employeeRows.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "var(--fg-4)" }}>No employee advances / claims.</td></tr>
              ) : employeeRows.map((t) => (
                <tr key={t.id} onClick={() => setDrawerTxn(t)}>
                  <td className="cell-strong">{t.employee}</td>
                  <td><span className={`badge ${isCashCredit(t.type) ? "badge-success" : "badge-neutral"}`}>{t.type}</span></td>
                  <td className="cell-sub">{fmtDate(t.date)}</td>
                  <td className="cell-sub" style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description}</td>
                  <td className="td-right cell-strong">{fmtINR(t.debit || t.credit)}</td>
                  <td><span className={`badge ${t.approval === "Approved" ? "badge-success" : "badge-warning"}`}>{t.approval}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Vouchers ── */}
      <CashVoucherPanel txns={scoped} onView={setDrawerTxn} />

      {/* ── Drawer ── */}
      {drawerTxn && <CashTransactionDrawer txn={drawerTxn} caps={caps} onClose={() => setDrawerTxn(null)} onReconcile={(id) => reconcile([id])} />}

      {/* ── Entry forms ── */}
      {(modal === "in" || modal === "expense" || modal === "adjustment") && (
        <CashEntryForm mode={modal} accounts={CASH_ACCOUNTS} defaultAccountId={defaultCashId} currentUser={currentUser}
          onClose={() => setModal(null)} onSave={addTxn} />
      )}
      {(modal === "from-bank" || modal === "to-bank") && (
        <CashTransferPanel mode={modal} cashAccounts={CASH_ACCOUNTS} defaultCashId={defaultCashId}
          onClose={() => setModal(null)} onSave={doTransfer} />
      )}
    </div>
  );
}

// ─── Cash entry form (Cash In / Cash Expense / Cash Adjustment) ────────────────

function CashEntryForm({
  mode, accounts, defaultAccountId, currentUser, onClose, onSave,
}: {
  mode: "in" | "expense" | "adjustment";
  accounts: CashAccount[];
  defaultAccountId: string;
  currentUser: string;
  onClose: () => void;
  onSave: (t: Omit<CashTxn, "id" | "txnNo">) => void;
}) {
  const isIn = mode === "in";
  const isExpense = mode === "expense";
  const isAdj = mode === "adjustment";

  const inTypes = CASH_TXN_TYPES.filter((t) => ["Cash In", "Advance Settlement", "Refund"].includes(t));
  const expenseTypes = CASH_TXN_TYPES.filter((t) => ["Expense Payment", "Customer Expense", "Employee Advance", "Employee Reimbursement", "Cash Withdrawal", "Other"].includes(t));

  const [accountId, setAccountId] = useState(defaultAccountId);
  const [date, setDate] = useState(todayStr);
  const [type, setType] = useState<CashTxn["type"]>(isIn ? "Cash In" : isExpense ? "Expense Payment" : "Cash Adjustment");
  const [adjDir, setAdjDir] = useState<"short" | "excess">("short");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [customer, setCustomer] = useState("");
  const [project, setProject] = useState("");
  const [salesOrder, setSalesOrder] = useState("");
  const [vendor, setVendor] = useState("");
  const [employee, setEmployee] = useState("");
  const [refNo, setRefNo] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState<SourceLink | undefined>();
  const [error, setError] = useState("");

  const isCustomerExpense = type === "Customer Expense";
  const isEmployeeType = ["Employee Advance", "Advance Settlement", "Employee Reimbursement"].includes(type);
  const credit = isIn || (isAdj && adjDir === "excess");

  function pickExpense(id: string) {
    const e = PAYABLE_EXPENSES.find((x) => x.id === id);
    if (!e) { setSource(undefined); return; }
    setSource({ kind: "expense", id: e.id, label: `${e.expenseNo} · ${e.vendor}` });
    setAmount(String(e.amount)); setVendor(e.vendor); setCategory(e.category); setDescription(`${e.category} — ${e.vendor}`);
  }
  function pickCollection(id: string) {
    const c = OPEN_COLLECTIONS.find((x) => x.id === id);
    if (!c) { setSource(undefined); return; }
    setSource({ kind: "collection", id: c.id, label: `${c.invoiceNo} · ${c.customer}` });
    setCustomer(c.customer);
  }
  function pickAdvance(id: string) {
    const a = CUSTOMER_ADVANCES.find((x) => x.id === id);
    if (!a) { setSource(undefined); return; }
    setSource({ kind: "advance", id: a.id, label: `${a.ref} · ${a.customer}` });
    setAmount(String(a.amount)); setCustomer(a.customer);
  }

  function submit() {
    setError("");
    const amt = parseFloat(amount) || 0;
    if (!(amt > 0)) return setError("Enter an amount greater than zero.");
    if (!description.trim()) return setError("Description is required.");
    if (isCustomerExpense && !customer.trim()) return setError("Customer is required for a customer expense.");
    onSave({
      accountId, date, refNo: refNo.trim(),
      type: isAdj ? "Cash Adjustment" : type,
      description: description.trim(), category, customer: customer.trim(), project: project.trim(),
      salesOrder: salesOrder.trim(), vendor: vendor.trim(), employee: employee.trim(),
      debit: credit ? 0 : amt, credit: credit ? amt : 0,
      createdBy: currentUser, recon: "Unreconciled",
      approval: isAdj ? "Approved" : "Pending",
      adjusted: isAdj, reversed: false, source,
    });
  }

  const title = isIn ? "Record Cash In" : isExpense ? "Record Cash Expense" : "Cash Adjustment";

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-pane" onClick={(e) => e.stopPropagation()}>
        <div className="dp-head">
          <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
          <button onClick={onClose} className="btn-cav btn-cav-ghost btn-cav-sm"><X size={16} /></button>
        </div>
        <div className="dp-body">
          {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded border border-red-200">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={labelCls}>Cash Account</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputCls}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>

            {!isAdj && (
              <div><label className={labelCls}>Transaction Type</label>
                <select value={type} onChange={(e) => { setType(e.target.value as CashTxn["type"]); setSource(undefined); }} className={inputCls}>
                  {(isIn ? inTypes : expenseTypes).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
            {isAdj && (
              <div><label className={labelCls}>Adjustment</label>
                <div className="seg-control">
                  <button type="button" className={adjDir === "short" ? "active" : ""} onClick={() => setAdjDir("short")}>Short (−)</button>
                  <button type="button" className={adjDir === "excess" ? "active" : ""} onClick={() => setAdjDir("excess")}>Excess (+)</button>
                </div>
              </div>
            )}
            <div><label className={labelCls}>Amount (₹) · {credit ? "Credit" : "Debit"}</label>
              <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder="0.00" />
            </div>
          </div>

          {/* Expense-specific: category + map to source */}
          {isExpense && (
            <div style={{ marginTop: 16, padding: 14, background: "var(--bg-muted)", borderRadius: 10 }}>
              <div className="section-label" style={{ marginBottom: 10 }}>Expense details</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={labelCls}>Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                    <option value="">Select…</option>
                    {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Pay against approved expense</label>
                  <select value={source?.kind === "expense" ? source.id : ""} onChange={(e) => pickExpense(e.target.value)} className={inputCls}>
                    <option value="">None</option>
                    {PAYABLE_EXPENSES.map((x) => <option key={x.id} value={x.id}>{x.expenseNo} · {x.vendor} · {fmtINR(x.amount)}</option>)}
                  </select>
                </div>
                {isCustomerExpense && (
                  <>
                    <div><label className={labelCls}>Link customer (invoice)</label>
                      <select value={source?.kind === "collection" ? source.id : ""} onChange={(e) => pickCollection(e.target.value)} className={inputCls}>
                        <option value="">None</option>
                        {OPEN_COLLECTIONS.map((c) => <option key={c.id} value={c.id}>{c.invoiceNo} · {c.customer}</option>)}
                      </select>
                    </div>
                    <div><label className={labelCls}>Project</label><input value={project} onChange={(e) => setProject(e.target.value)} className={inputCls} placeholder="Project" /></div>
                    <div><label className={labelCls}>Sales Order</label><input value={salesOrder} onChange={(e) => setSalesOrder(e.target.value)} className={inputCls} placeholder="SO ref" /></div>
                  </>
                )}
                <div><label className={labelCls}>{isEmployeeType ? "Employee" : "Vendor"}</label>
                  <input value={isEmployeeType ? employee : vendor} onChange={(e) => isEmployeeType ? setEmployee(e.target.value) : setVendor(e.target.value)} className={inputCls} placeholder={isEmployeeType ? "Employee name" : "Vendor name"} />
                </div>
              </div>
              {source && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <span className="badge badge-accent">Linked</span><span style={{ flex: 1 }}>{source.label}</span>
                  <button className="btn-cav btn-cav-ghost btn-cav-sm" onClick={() => setSource(undefined)}>Unlink</button>
                </div>
              )}
            </div>
          )}

          {/* Cash In employee/customer linking */}
          {isIn && (type === "Advance Settlement") && (
            <div style={{ marginTop: 16 }}>
              <label className={labelCls}>Employee</label>
              <input value={employee} onChange={(e) => setEmployee(e.target.value)} className={inputCls} placeholder="Employee returning advance" />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginTop: 16 }}>
            <div><label className={labelCls}>Reference No</label><input value={refNo} onChange={(e) => setRefNo(e.target.value)} className={inputCls} placeholder="Voucher / slip no" /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Description</label><input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} placeholder="Narration" /></div>
          </div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-cav btn-cav-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-cav btn-cav-primary" onClick={submit}>Save</button>
        </div>
      </div>
    </div>
  );
}
