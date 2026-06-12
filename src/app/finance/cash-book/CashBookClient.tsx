"use client";

/**
 * Cash Book — orchestrator (Step 2D: wired to live read-only APIs).
 *
 * Accounts:     GET /api/finance/accounts?type=CASH
 * Transactions: GET /api/finance/cash-book
 *
 * Write actions remain visible but are feature-gated until Cash Book write APIs
 * are implemented. CashEntryForm and doTransfer are kept intact for Step 2H.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus, Minus, ArrowDownLeft, ArrowUpRight, SlidersHorizontal,
  FileSpreadsheet, FileText, X, Wallet, Users, UserCog,
  AlertCircle, RefreshCw, CheckCircle2,
} from "lucide-react";
import {
  CashAccount, CashTxn, CashCaps, ReconHistoryRow, SourceLink,
  ApiCashAccount, ApiCashTransaction, ApiCashSummary, ApiPagination,
  CASH_ACCOUNTS, RECON_HISTORY, CASH_TXN_TYPES, EXPENSE_CATEGORIES,
  FY, fmtINR, fmtDate, isCashCredit, lakhsToRupees,
  mapApiCashAccount, mapApiCashTransaction,
} from "./data";
import {
  OPEN_COLLECTIONS, CUSTOMER_ADVANCES, PAYABLE_EXPENSES, BANK_ACCOUNTS, BankTxn,
} from "../bank-book/data";
import { pushCashTxn, pushBankTxn, nextExtraBankId } from "../_shared/transferStore";
import CashBalanceCard from "./components/CashBalanceCard";
import CashFilters, { CashFilterValues, EMPTY_CASH_FILTERS } from "./components/CashFilters";
import CashTransactionTable from "./components/CashTransactionTable";
import CashTransactionDrawer from "./components/CashTransactionDrawer";
import CashSummaryPanel from "./components/CashSummaryPanel";
import CashReconciliationPanel from "./components/CashReconciliationPanel";
import CashTransferPanel from "./components/CashTransferPanel";
import CashVoucherPanel from "./components/CashVoucherPanel";

const PAGE_SIZE_DEFAULT = 25;

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";
const todayStr = new Date().toISOString().slice(0, 10);

type Modal = null | "in" | "expense" | "adjustment" | "from-bank" | "to-bank";

const WRITE_GATE_MSG = "This action will be enabled after Cash Book write APIs are implemented.";

export default function CashBookClient({ caps, currentUser }: { caps: CashCaps; currentUser: string }) {
  // ── Account state ──
  const [apiAccounts, setApiAccounts] = useState<ApiCashAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  // ── Transaction state ──
  const [apiTxns, setApiTxns] = useState<ApiCashTransaction[]>([]);
  const [summary, setSummary] = useState<ApiCashSummary | null>(null);
  const [pagination, setPagination] = useState<ApiPagination>({
    page: 1, pageSize: PAGE_SIZE_DEFAULT, total: 0, totalPages: 0,
  });
  const [txnLoading, setTxnLoading] = useState(false);
  const [txnError, setTxnError] = useState<string | null>(null);

  // ── UI state ──
  // filters.accountId is the source of truth for selected cash account.
  const [filters, setFilters] = useState<CashFilterValues>({ ...EMPTY_CASH_FILTERS });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(PAGE_SIZE_DEFAULT);
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerTxn, setDrawerTxn] = useState<CashTxn | null>(null);
  const [drawerAccountName, setDrawerAccountName] = useState<string | undefined>(undefined);
  const [modal, setModal] = useState<Modal>(null);
  const [reconHistory, setReconHistory] = useState<ReconHistoryRow[]>(RECON_HISTORY);
  const [toast, setToast] = useState("");
  const [empFilter, setEmpFilter] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  }

  // ── Fetch accounts ──
  const fetchAccounts = useCallback(async () => {
    setAccountsLoading(true);
    setAccountsError(null);
    try {
      const res = await fetch("/api/finance/accounts?type=CASH");
      if (res.status === 401 || res.status === 403) {
        setAccountsError("You don't have permission to view cash accounts.");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const accounts: ApiCashAccount[] = json?.data?.accounts ?? [];
      setApiAccounts(accounts);
      // Auto-select first account
      if (accounts.length > 0) {
        setFilters((f) => {
          if (f.accountId === "all") return { ...f, accountId: accounts[0].id };
          return f;
        });
      }
    } catch {
      setAccountsError("Unable to load cash accounts. Please try again.");
    } finally {
      setAccountsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch transactions ──
  const fetchTxns = useCallback(async (
    activeFilters: CashFilterValues,
    currentPage: number,
    currentPageSize: number,
    search: string,
  ) => {
    setTxnLoading(true);
    setTxnError(null);
    try {
      const p = new URLSearchParams();
      const accountId = activeFilters.accountId;
      if (accountId !== "all") p.set("accountId", accountId);
      if (activeFilters.dateFrom)  p.set("dateFrom", activeFilters.dateFrom);
      if (activeFilters.dateTo)    p.set("dateTo", activeFilters.dateTo);
      if (activeFilters.branch)    p.set("branchId", activeFilters.branch);
      if (activeFilters.txnType)   p.set("transactionType", activeFilters.txnType.toLowerCase().replace(/ /g, "_"));
      if (activeFilters.category)  p.set("expenseCategory", activeFilters.category);
      if (activeFilters.approval)  p.set("status", activeFilters.approval === "Approved" ? "RECONCILED" : "UNRECONCILED");
      // customer / vendor / employee → best-effort text search (Ledger has no FK)
      const searchTerm = search || activeFilters.customer || activeFilters.vendor || activeFilters.employee;
      if (searchTerm) p.set("search", searchTerm);
      p.set("page", String(currentPage));
      p.set("pageSize", String(currentPageSize));

      const res = await fetch(`/api/finance/cash-book?${p.toString()}`);
      if (res.status === 401 || res.status === 403) {
        setTxnError("You don't have permission to view this cash book.");
        return;
      }
      if (res.status === 400) {
        const j = await res.json().catch(() => ({}));
        setTxnError(j.error ?? "Invalid request parameters.");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setApiTxns(json?.data?.transactions ?? []);
      setSummary(json?.data?.summary ?? null);
      setPagination(json?.data?.pagination ?? {
        page: 1, pageSize: currentPageSize, total: 0, totalPages: 0,
      });
    } catch {
      setTxnError("Unable to load cash book data. Please try again.");
    } finally {
      setTxnLoading(false);
    }
  }, []);

  // ── Initial load ──
  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  // ── Re-fetch on filter / page / search change ──
  useEffect(() => {
    fetchTxns(filters, page, pageSize, searchQuery);
  }, [filters, page, pageSize, searchQuery, fetchTxns]);

  // ── Debounced search ──
  function handleSearch(q: string) {
    setSearchQuery(q);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => { setPage(1); }, 350);
  }

  function handleAccountChange(id: string) {
    setFilters((f) => ({ ...f, accountId: id }));
    setPage(1);
    setSearchQuery("");
  }

  function handleApplyFilters(v: CashFilterValues) {
    setFilters(v);
    setPage(1);
  }
  function handleResetFilters() {
    setFilters({ ...EMPTY_CASH_FILTERS, accountId: filters.accountId });
    setPage(1);
    setSearchQuery("");
  }

  function handlePageChange(p: number) { setPage(p); }

  // ── Map API data to legacy UI types ──
  const uiAccounts: CashAccount[] = apiAccounts.map(mapApiCashAccount);

  const selectedApiAccount = filters.accountId !== "all"
    ? apiAccounts.find((a) => a.id === filters.accountId)
    : null;

  const uiTxns: CashTxn[] = apiTxns.map((t) =>
    mapApiCashTransaction(t, filters.accountId !== "all" ? filters.accountId : t.id),
  );

  const balanceById = new Map<number, number>(
    apiTxns.map((t) => [parseInt(t.id, 10), lakhsToRupees(t.runningBalance)]),
  );

  // ── Balance metrics ──
  const currentBalance = selectedApiAccount
    ? lakhsToRupees(selectedApiAccount.currentBalance)
    : apiAccounts.reduce((s, a) => s + lakhsToRupees(a.currentBalance), 0);

  const openingBalance = summary
    ? lakhsToRupees(summary.openingBalance)
    : (selectedApiAccount ? lakhsToRupees(selectedApiAccount.openingBalance) : 0);

  const totalCashIn  = summary ? lakhsToRupees(summary.totalCashIn)  : 0;
  const totalCashOut = summary ? lakhsToRupees(summary.totalCashOut) : 0;

  // ── Customer / Employee subsets (current page only) ──
  const customerRows = uiTxns.filter((t) => t.customer);
  const employeeRows = uiTxns.filter((t) =>
    ["Employee Advance", "Advance Settlement", "Employee Reimbursement"].includes(t.type) &&
    (!empFilter || t.employee === empFilter));
  const employees = Array.from(new Set(uiTxns.filter((t) => t.employee).map((t) => t.employee))).sort();

  // ── Reconcile (optimistic UI — gated until write APIs) ──
  function reconcile(ids: number[]) {
    flash("Reconciliation will be enabled after Cash Book write APIs are implemented.");
    setDrawerTxn((d) => (d && ids.includes(d.id) ? { ...d, recon: "Reconciled" } : d));
  }
  function submitRecon(row: Omit<ReconHistoryRow, "id" | "accountId">) {
    flash("Cash reconciliation will be enabled after Cash Book write APIs are implemented.");
    setReconHistory((h) => [
      { ...row, id: Math.max(0, ...h.map((x) => x.id)) + 1, accountId: filters.accountId },
      ...h,
    ]);
  }

  // ── doTransfer — kept for Step 2H (currently never called) ──
  function doTransfer(a: {
    cashAccountId: string; bankAccountId: string; amount: number;
    date: string; ref: string; mode: "from-bank" | "to-bank";
  }) {
    const bank = BANK_ACCOUNTS.find((b) => b.id === a.bankAccountId);
    const cashAcc = CASH_ACCOUNTS.find((c) => c.id === a.cashAccountId);
    const fromBank = a.mode === "from-bank";
    const cashId = Math.max(0, ...uiTxns.map((t) => t.id), 0) + 1;
    const cashTxnNo = `CB/${FY}/${String(cashId).padStart(4, "0")}`;
    const bankId = nextExtraBankId();
    const bankTxnNo = `BB/${FY}/${String(bankId).padStart(4, "0")}`;
    const cashEntry: CashTxn = {
      id: cashId, accountId: a.cashAccountId, date: a.date, txnNo: cashTxnNo, refNo: a.ref || bankTxnNo,
      type: fromBank ? "Bank Transfer In" : "Bank Transfer Out",
      description: fromBank ? `Cash withdrawn from ${bank?.name}` : `Cash deposited to ${bank?.name}`,
      category: "", customer: "", project: "", salesOrder: "", vendor: "", employee: "",
      debit: fromBank ? 0 : a.amount, credit: fromBank ? a.amount : 0,
      createdBy: currentUser, recon: "Unreconciled", approval: "Approved", adjusted: false, reversed: false,
      bankTransferRef: bankTxnNo,
    };
    const bankEntry: BankTxn = {
      id: bankId, accountId: a.bankAccountId, date: a.date, txnNo: bankTxnNo, refNo: a.ref || cashTxnNo,
      type: fromBank ? "Cash Withdrawal" : "Cash Deposit",
      description: fromBank ? `Cash withdrawn to ${cashAcc?.name}` : `Cash deposit from ${cashAcc?.name}`,
      party: cashAcc?.name ?? "", partyKind: "", mode: "Bank Transfer",
      debit: fromBank ? a.amount : 0, credit: fromBank ? 0 : a.amount,
      createdBy: currentUser, recon: "Unreconciled", approval: "Approved", imported: false,
    };
    pushCashTxn(cashEntry);
    pushBankTxn(bankEntry);
    setModal(null);
  }

  // ── addTxn — kept for Step 2H (currently never called) ──
  function addTxn(_partial: Omit<CashTxn, "id" | "txnNo">) {
    setModal(null);
  }

  function exportData(kind: "excel" | "pdf") {
    if (kind === "excel") {
      const head = ["Date", "Txn No", "Ref", "Type", "Description", "Category", "Customer", "Employee", "Debit", "Credit", "Balance", "Status"];
      const body = uiTxns.map((t) => [
        fmtDate(t.date), t.txnNo, t.refNo, t.type, t.description,
        t.category, t.customer, t.employee,
        t.debit || "", t.credit || "", balanceById.get(t.id) ?? "", t.recon,
      ]);
      const esc = (v: string | number) => `<td>${String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</td>`;
      const html = `<table border="1"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map(esc).join("")}</tr>`).join("")}</tbody></table>`;
      const blob = new Blob([`﻿${html}`], { type: "application/vnd.ms-excel" });
      const el = document.createElement("a"); el.href = URL.createObjectURL(blob); el.download = "CashBook.xls"; el.click(); URL.revokeObjectURL(el.href);
    } else {
      const acctLabel = selectedApiAccount?.accountName ?? "All Accounts";
      const rowsHtml = uiTxns.map((t) =>
        `<tr><td>${fmtDate(t.date)}</td><td>${t.txnNo}</td><td>${t.type}</td><td>${t.description}</td><td style="text-align:right;color:#8E0A1F">${t.debit ? fmtINR(t.debit) : ""}</td><td style="text-align:right;color:#1F7A3F">${t.credit ? fmtINR(t.credit) : ""}</td><td style="text-align:right;font-weight:600">${fmtINR(balanceById.get(t.id) ?? 0)}</td><td>${t.recon}</td></tr>`
      ).join("");
      const html = `<!doctype html><html><head><title>Cash Book</title><style>body{font-family:Inter,Arial,sans-serif;padding:24px;color:#0F1115}h1{font-size:18px;margin:0 0 12px}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#EEF0F3;text-align:left;padding:7px 8px;font-size:9px;text-transform:uppercase;color:#5B626C}td{padding:6px 8px;border-bottom:1px solid #E3E6EB}</style></head><body><h1>Cash Book — ${acctLabel}</h1><table><thead><tr><th>Date</th><th>Txn No</th><th>Type</th><th>Description</th><th style="text-align:right">Debit</th><th style="text-align:right">Credit</th><th style="text-align:right">Balance</th><th>Status</th></tr></thead><tbody>${rowsHtml}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`;
      const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); }
    }
  }

  // ── Loading skeleton ──
  const SkeletonCard = () => (
    <div className="kpi" style={{ animation: "pulse 1.5s infinite" }}>
      <div style={{ height: 12, width: "60%", background: "var(--border)", borderRadius: 4, marginBottom: 8 }} />
      <div style={{ height: 24, width: "80%", background: "var(--border)", borderRadius: 4 }} />
    </div>
  );
  const SkeletonRow = () => (
    <tr>
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <td key={i}><div style={{ height: 14, background: "var(--border)", borderRadius: 3, animation: "pulse 1.5s infinite" }} /></td>
      ))}
    </tr>
  );

  // ── No accounts ──
  if (!accountsLoading && !accountsError && apiAccounts.length === 0) {
    return (
      <div className="card">
        <div style={{ textAlign: "center", padding: "64px 16px", color: "var(--fg-4)" }}>
          <Wallet size={40} strokeWidth={1.2} style={{ opacity: 0.5 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--fg-3)", marginTop: 12 }}>No cash accounts configured</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Ask your Finance Administrator to set up cash accounts.</div>
          <button className="btn-cav btn-cav-secondary btn-cav-sm" style={{ marginTop: 20 }} disabled>Go to Finance Settings</button>
        </div>
      </div>
    );
  }

  // ── Accounts error ──
  if (accountsError) {
    return (
      <div className="card">
        <div style={{ textAlign: "center", padding: "64px 16px", color: "var(--fg-4)" }}>
          <AlertCircle size={40} strokeWidth={1.2} style={{ color: "var(--caveo-red)", opacity: 0.7 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-2)", marginTop: 12 }}>{accountsError}</div>
          <button className="btn-cav btn-cav-primary btn-cav-sm" style={{ marginTop: 20 }} onClick={fetchAccounts}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const headerAccountLabel = filters.accountId === "all"
    ? `${apiAccounts.length} account${apiAccounts.length === 1 ? "" : "s"} · FY ${FY}`
    : selectedApiAccount ? `${selectedApiAccount.branchName} · FY ${FY}` : "";

  const summaryAccount: CashAccount = selectedApiAccount
    ? mapApiCashAccount(selectedApiAccount)
    : { id: "all", name: "All Accounts", branch: "", openingBalance, reservedFloat: 0 };

  const defaultCashId = filters.accountId !== "all"
    ? filters.accountId
    : (apiAccounts[0]?.id ?? CASH_ACCOUNTS[0]?.id ?? "cash-ho");

  return (
    <div className="space-y-4">
      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          background: "var(--fg-1)", color: "#fff", borderRadius: 10,
          padding: "10px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 8,
          boxShadow: "var(--shadow-lg)",
        }}>
          <CheckCircle2 size={15} style={{ color: "#4ade80", flexShrink: 0 }} />
          {toast}
        </div>
      )}

      {/* ── Header: account dropdown + quick actions ── */}
      <div className="card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(200,16,46,0.08)", color: "var(--caveo-red)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wallet size={20} />
          </span>
          <div>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-3)", fontWeight: 600 }}>Cash Account</div>
            {accountsLoading ? (
              <div style={{ height: 24, width: 160, background: "var(--border)", borderRadius: 4, animation: "pulse 1.5s infinite" }} />
            ) : (
              <select
                value={filters.accountId}
                onChange={(e) => handleAccountChange(e.target.value)}
                style={{ border: "none", background: "transparent", fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--fg-1)", padding: 0, cursor: "pointer", outline: "none" }}
              >
                <option value="all">All Accounts</option>
                {apiAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.accountName}</option>
                ))}
              </select>
            )}
            <div style={{ fontSize: 11.5, color: "var(--fg-4)" }}>{headerAccountLabel}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {caps.canAdd && (
            <button className="btn-cav btn-cav-primary" onClick={() => flash(WRITE_GATE_MSG)}>
              <Plus size={14} /> Cash In
            </button>
          )}
          {caps.canAdd && (
            <button className="btn-cav btn-cav-secondary" onClick={() => flash(WRITE_GATE_MSG)}>
              <Minus size={14} /> Cash Expense
            </button>
          )}
          {caps.canAdd && (
            <button className="btn-cav btn-cav-secondary" onClick={() => flash(WRITE_GATE_MSG)}>
              <ArrowDownLeft size={14} /> Transfer From Bank
            </button>
          )}
          {caps.canAdd && (
            <button className="btn-cav btn-cav-secondary" onClick={() => flash(WRITE_GATE_MSG)}>
              <ArrowUpRight size={14} /> Deposit To Bank
            </button>
          )}
          {caps.canApproveRecon && (
            <button className="btn-cav btn-cav-secondary" onClick={() => flash(WRITE_GATE_MSG)}>
              <SlidersHorizontal size={14} /> Cash Adjustment
            </button>
          )}
          <button className="btn-cav btn-cav-secondary" onClick={() => exportData("excel")}><FileSpreadsheet size={14} /> Excel</button>
          <button className="btn-cav btn-cav-secondary" onClick={() => exportData("pdf")}><FileText size={14} /> PDF</button>
        </div>
      </div>

      {/* ── Filters ── */}
      <CashFilters
        accounts={uiAccounts}
        users={[]}
        value={filters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      {/* ── Balance cards ── */}
      <div className="kpi-grid">
        {accountsLoading ? (
          <><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
        ) : (
          <>
            <CashBalanceCard label="Current Cash Balance" value={currentBalance} accent sub={selectedApiAccount?.accountName ?? "All accounts"} />
            <CashBalanceCard label="Opening Balance"      value={openingBalance} sub="For selected period" />
            <CashBalanceCard label="Period Cash In"       value={totalCashIn}    tone="credit" sub={txnLoading ? "Loading…" : "Selected range"} />
            <CashBalanceCard label="Period Cash Out"      value={totalCashOut}   tone="debit"  sub={txnLoading ? "Loading…" : "Selected range"} />
          </>
        )}
      </div>

      {/* ── Reconciliation ── */}
      <CashReconciliationPanel
        systemBalance={currentBalance}
        caps={caps}
        history={reconHistory.filter((h) => filters.accountId === "all" || h.accountId === filters.accountId)}
        currentUser={currentUser}
        onSubmit={submitRecon}
      />

      {/* ── Transaction error ── */}
      {txnError && (
        <div className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <AlertCircle size={18} style={{ color: "var(--caveo-red)", flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 13.5, color: "var(--fg-2)" }}>{txnError}</div>
          <button
            className="btn-cav btn-cav-secondary btn-cav-sm"
            onClick={() => fetchTxns(filters, page, pageSize, searchQuery)}
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* ── Ledger loading skeleton ── */}
      {txnLoading && (
        <div className="card">
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ height: 32, width: 220, background: "var(--border)", borderRadius: 8, animation: "pulse 1.5s infinite" }} />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="crm-table">
              <tbody>{[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <SkeletonRow key={i} />)}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Ledger empty state ── */}
      {!txnLoading && !txnError && uiTxns.length === 0 && (
        <div className="card">
          <div style={{ textAlign: "center", padding: "56px 16px", color: "var(--fg-4)" }}>
            <Wallet size={36} strokeWidth={1.2} style={{ opacity: 0.6 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-3)", marginTop: 10 }}>No cash transactions found</div>
            <div style={{ fontSize: 12.5, marginTop: 3 }}>Adjust filters or record a cash entry once write APIs are live.</div>
          </div>
        </div>
      )}

      {/* ── Ledger table ── */}
      {!txnLoading && !txnError && uiTxns.length > 0 && (
        <CashTransactionTable
          rows={uiTxns}
          balanceById={balanceById}
          caps={caps}
          onRowClick={(txn) => {
            setDrawerTxn(txn);
            setDrawerAccountName(selectedApiAccount?.accountName);
          }}
          onExport={exportData}
          search={searchQuery}
          onSearch={handleSearch}
          apiPagination={{
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            totalPages: pagination.totalPages,
            onPageChange: handlePageChange,
          }}
        />
      )}

      {/* ── Account summary ── */}
      {!accountsLoading && (
        <CashSummaryPanel
          account={summaryAccount}
          txns={uiTxns}
          apiSummary={summary ?? undefined}
        />
      )}

      {/* ── Customer cost visibility ── */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={15} style={{ color: "var(--fg-3)" }} />
            <div className="ch-title">Customer Cost Visibility</div>
          </div>
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

      {/* ── Employee finance ── */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <UserCog size={15} style={{ color: "var(--fg-3)" }} />
            <div className="ch-title">Employee Finance</div>
          </div>
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
      <CashVoucherPanel txns={uiTxns} onView={setDrawerTxn} />

      {/* ── Drawer ── */}
      {drawerTxn && (
        <CashTransactionDrawer
          txn={drawerTxn}
          caps={caps}
          onClose={() => setDrawerTxn(null)}
          onReconcile={(id) => reconcile([id])}
          accountName={drawerAccountName}
        />
      )}

      {/* ── Entry forms — kept for Step 2H, currently never shown ── */}
      {(modal === "in" || modal === "expense" || modal === "adjustment") && (
        <CashEntryForm
          mode={modal}
          accounts={uiAccounts.length > 0 ? uiAccounts : CASH_ACCOUNTS}
          defaultAccountId={defaultCashId}
          currentUser={currentUser}
          onClose={() => setModal(null)}
          onSave={addTxn}
        />
      )}
      {(modal === "from-bank" || modal === "to-bank") && (
        <CashTransferPanel
          mode={modal}
          cashAccounts={uiAccounts.length > 0 ? uiAccounts : CASH_ACCOUNTS}
          defaultCashId={defaultCashId}
          onClose={() => setModal(null)}
          onSave={doTransfer}
        />
      )}
    </div>
  );
}

// ─── Cash entry form (kept for Step 2H write APIs) ─────────────────────────────

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

          {isIn && type === "Advance Settlement" && (
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
