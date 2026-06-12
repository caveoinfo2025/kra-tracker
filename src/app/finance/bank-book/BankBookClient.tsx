"use client";

/**
 * Bank Book — orchestrator (Step 2B: wired to live APIs).
 *
 * Accounts:     GET /api/finance/accounts?type=BANK
 * Transactions: GET /api/finance/bank-book
 *
 * Write actions (Add Entry, Transfer Funds, Import Statement) remain
 * visible but are gated pending write API implementation.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus, ArrowLeftRight, Upload, FileSpreadsheet, FileText,
  Banknote, AlertCircle, RefreshCw, CheckCircle2,
} from "lucide-react";
import {
  BankAccount, BankTxn, BankCaps, ImportHistoryRow,
  ApiAccount, ApiTransaction, ApiSummary, ApiPagination,
  BANK_ACCOUNTS, IMPORT_HISTORY,
  FY, fmtINR, fmtDate,
  mapApiBankAccount, mapApiTransaction, lakhsToRupees,
} from "./data";
import BankBalanceCard from "./components/BankBalanceCard";
import BankSummaryPanel from "./components/BankSummaryPanel";
import BankFilters, { BankFilterValues, EMPTY_FILTERS } from "./components/BankFilters";
import BankTransactionTable from "./components/BankTransactionTable";
import BankTransactionDrawer from "./components/BankTransactionDrawer";
import BankImportWizard from "./components/BankImportWizard";

const PAGE_SIZE_DEFAULT = 25;

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

export default function BankBookClient({ caps, currentUser }: { caps: BankCaps; currentUser: string }) {
  // ── Account state ──
  const [apiAccounts, setApiAccounts] = useState<ApiAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  // ── Transaction state ──
  const [apiTxns, setApiTxns] = useState<ApiTransaction[]>([]);
  const [summary, setSummary] = useState<ApiSummary | null>(null);
  const [pagination, setPagination] = useState<ApiPagination>({ page: 1, pageSize: PAGE_SIZE_DEFAULT, total: 0, totalPages: 0 });
  const [txnLoading, setTxnLoading] = useState(false);
  const [txnError, setTxnError] = useState<string | null>(null);

  // ── UI state ──
  const [filters, setFilters] = useState<BankFilterValues>({ ...EMPTY_FILTERS });
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerTxn, setDrawerTxn] = useState<BankTxn | null>(null);
  const [drawerAccountName, setDrawerAccountName] = useState<string | undefined>(undefined);
  const [modal, setModal] = useState<null | "import">(null);
  const [history, setHistory] = useState<ImportHistoryRow[]>(IMPORT_HISTORY);
  const [toast, setToast] = useState("");
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
      const res = await fetch("/api/finance/accounts?type=BANK");
      if (res.status === 401 || res.status === 403) {
        setAccountsError("You don't have permission to view bank accounts.");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const accounts: ApiAccount[] = json?.data?.accounts ?? [];
      setApiAccounts(accounts);
      // Auto-select first active account
      if (accounts.length > 0 && selectedAccountId === "all") {
        setSelectedAccountId(accounts[0].id);
      }
    } catch {
      setAccountsError("Unable to load bank accounts. Please try again.");
    } finally {
      setAccountsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch transactions ──
  const fetchTxns = useCallback(async (
    accountId: string,
    activeFilters: BankFilterValues,
    currentPage: number,
    currentPageSize: number,
    search: string,
  ) => {
    setTxnLoading(true);
    setTxnError(null);
    try {
      const p = new URLSearchParams();
      if (accountId !== "all") p.set("accountId", accountId);
      if (activeFilters.dateFrom) p.set("dateFrom", activeFilters.dateFrom);
      if (activeFilters.dateTo)   p.set("dateTo", activeFilters.dateTo);
      if (activeFilters.branch)   p.set("branchId", activeFilters.branch);
      if (activeFilters.txnType)  p.set("transactionType", activeFilters.txnType.toLowerCase().replace(/ /g, "_"));
      if (activeFilters.mode)     p.set("paymentMode", activeFilters.mode.toLowerCase());
      if (activeFilters.approval) p.set("status", activeFilters.approval === "Approved" ? "RECONCILED" : "UNRECONCILED");
      // Search: combine customer / vendor / employee / direct search into one param
      const searchTerm = search || activeFilters.customer || activeFilters.vendor || activeFilters.employee;
      if (searchTerm) p.set("search", searchTerm);
      p.set("page", String(currentPage));
      p.set("pageSize", String(currentPageSize));

      const res = await fetch(`/api/finance/bank-book?${p.toString()}`);
      if (res.status === 401 || res.status === 403) {
        setTxnError("You don't have permission to view this bank book.");
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
      setPagination(json?.data?.pagination ?? { page: 1, pageSize: currentPageSize, total: 0, totalPages: 0 });
    } catch {
      setTxnError("Unable to load bank book data. Please try again.");
    } finally {
      setTxnLoading(false);
    }
  }, []);

  // ── Initial load ──
  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  // ── Re-fetch transactions when account / filters / page changes ──
  useEffect(() => {
    fetchTxns(selectedAccountId, filters, page, pageSize, searchQuery);
  }, [selectedAccountId, filters, page, pageSize, searchQuery, fetchTxns]);

  // ── Debounced search handler ──
  function handleSearch(q: string) {
    setSearchQuery(q);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(1); // reset to page 1 on search
    }, 350);
  }

  // ── Account change ──
  function handleAccountChange(id: string) {
    setSelectedAccountId(id);
    setPage(1);
    setSearchQuery("");
  }

  // ── Filter apply / reset ──
  function handleApplyFilters(v: BankFilterValues) {
    setFilters(v);
    setPage(1);
  }
  function handleResetFilters() {
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setSearchQuery("");
  }

  // ── Pagination ──
  function handlePageChange(p: number) { setPage(p); }
  function handlePageSizeChange(ps: number) { setPageSize(ps); setPage(1); }

  // ── Map API data to legacy UI types ──
  const uiAccounts: BankAccount[] = apiAccounts.map(mapApiBankAccount);

  const selectedApiAccount = selectedAccountId !== "all"
    ? apiAccounts.find((a) => a.id === selectedAccountId)
    : null;

  const uiTxns: BankTxn[] = apiTxns.map((t) =>
    mapApiTransaction(t, selectedAccountId !== "all" ? selectedAccountId : t.id),
  );

  // Running balance map: id → rupees (from API runningBalance field)
  const balanceById = new Map<number, number>(
    apiTxns.map((t) => [parseInt(t.id, 10), lakhsToRupees(t.runningBalance)]),
  );

  // ── Header balance metrics (from selected account or aggregated) ──
  const currentBalance = selectedApiAccount
    ? lakhsToRupees(selectedApiAccount.currentBalance)
    : apiAccounts.reduce((s, a) => s + lakhsToRupees(a.currentBalance), 0);

  const openingBalance = selectedApiAccount
    ? lakhsToRupees(selectedApiAccount.openingBalance)
    : apiAccounts.reduce((s, a) => s + lakhsToRupees(a.openingBalance), 0);

  // Summary card values from API summary (for date-range-aware totals)
  const summaryCredits = summary ? lakhsToRupees(summary.totalCredits) : 0;
  const summaryDebits  = summary ? lakhsToRupees(summary.totalDebits)  : 0;

  // ── Reconciliation tallies (from current page) ──
  const reconCounts = uiTxns.reduce(
    (acc, t) => {
      if (t.recon === "Reconciled") acc.reconciled++;
      else if (t.recon === "Partially Reconciled") acc.partial++;
      else acc.unreconciled++;
      return acc;
    },
    { reconciled: 0, partial: 0, unreconciled: 0 },
  );

  // ── Reconcile action (read-only for now — optimistic UI only) ──
  function reconcile(ids: number[]) {
    flash("Reconciliation will be enabled after Bank Book write APIs are implemented.");
    setDrawerTxn((d) => (d && ids.includes(d.id) ? { ...d, recon: "Reconciled" } : d));
  }

  // ── Feature-gated write actions ──
  function handleAddEntry() {
    flash("Add Bank Entry will be enabled after Bank Book write APIs are implemented.");
  }
  function handleTransfer() {
    flash("Transfer Funds will be enabled after Bank Book write APIs are implemented.");
  }
  function handleImport() {
    flash("Import Bank Statement will be enabled after Bank Book write APIs are implemented.");
  }

  // ── Export (local, from current page) ──
  function exportData(kind: "excel" | "pdf") {
    if (kind === "excel") {
      const head = ["Date", "Txn No", "Ref", "Type", "Description", "Party", "Mode", "Debit", "Credit", "Balance", "Status"];
      const body = uiTxns.map((t) => [
        fmtDate(t.date), t.txnNo, t.refNo, t.type, t.description, t.party, t.mode,
        t.debit || "", t.credit || "", balanceById.get(t.id) ?? "", t.recon,
      ]);
      const esc = (v: string | number) => `<td>${String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</td>`;
      const html = `<table border="1"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map(esc).join("")}</tr>`).join("")}</tbody></table>`;
      const blob = new Blob([`﻿${html}`], { type: "application/vnd.ms-excel" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "BankBook.xls"; a.click(); URL.revokeObjectURL(a.href);
    } else {
      const acctLabel = selectedApiAccount?.accountName ?? "All Accounts";
      const rowsHtml = uiTxns.map((t) => `<tr><td>${fmtDate(t.date)}</td><td>${t.txnNo}</td><td>${t.type}</td><td>${t.description}</td><td style="text-align:right;color:#8E0A1F">${t.debit ? fmtINR(t.debit) : ""}</td><td style="text-align:right;color:#1F7A3F">${t.credit ? fmtINR(t.credit) : ""}</td><td style="text-align:right;font-weight:600">${fmtINR(balanceById.get(t.id) ?? 0)}</td><td>${t.recon}</td></tr>`).join("");
      const html = `<!doctype html><html><head><title>Bank Book</title><style>body{font-family:Inter,Arial,sans-serif;padding:24px;color:#0F1115}h1{font-size:18px;margin:0 0 12px}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#EEF0F3;text-align:left;padding:7px 8px;font-size:9px;text-transform:uppercase;color:#5B626C}td{padding:6px 8px;border-bottom:1px solid #E3E6EB}</style></head><body><h1>Bank Book — ${acctLabel}</h1><table><thead><tr><th>Date</th><th>Txn No</th><th>Type</th><th>Description</th><th style="text-align:right">Debit</th><th style="text-align:right">Credit</th><th style="text-align:right">Balance</th><th>Status</th></tr></thead><tbody>${rowsHtml}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`;
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
      {[1,2,3,4,5,6,7].map((i) => (
        <td key={i}><div style={{ height: 14, background: "var(--border)", borderRadius: 3, animation: "pulse 1.5s infinite" }} /></td>
      ))}
    </tr>
  );

  // ── No accounts empty state ──
  if (!accountsLoading && !accountsError && apiAccounts.length === 0) {
    return (
      <div className="card">
        <div style={{ textAlign: "center", padding: "64px 16px", color: "var(--fg-4)" }}>
          <Banknote size={40} strokeWidth={1.2} style={{ opacity: 0.5 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--fg-3)", marginTop: 12 }}>No bank accounts configured</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Ask your Finance Administrator to set up bank accounts.</div>
          <button className="btn-cav btn-cav-secondary btn-cav-sm" style={{ marginTop: 20 }} disabled>Go to Finance Settings</button>
        </div>
      </div>
    );
  }

  // ── Accounts fetch error ──
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

  const headerAccountLabel = selectedAccountId === "all"
    ? `${apiAccounts.length} account${apiAccounts.length === 1 ? "" : "s"} · FY ${FY}`
    : selectedApiAccount ? `${selectedApiAccount.branchName} · ${selectedApiAccount.bankName}` : "";

  // Derive a BankAccount for BankSummaryPanel (legacy shape)
  const summaryAccount: BankAccount = selectedApiAccount
    ? mapApiBankAccount(selectedApiAccount)
    : { id: "all", name: "All Accounts", maskedNo: "", branch: "", openingBalance, overdraftLimit: 0 };

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
            <Banknote size={20} />
          </span>
          <div>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-3)", fontWeight: 600 }}>Bank Account</div>
            {accountsLoading ? (
              <div style={{ height: 24, width: 160, background: "var(--border)", borderRadius: 4, animation: "pulse 1.5s infinite" }} />
            ) : (
              <select
                value={selectedAccountId}
                onChange={(e) => handleAccountChange(e.target.value)}
                style={{ border: "none", background: "transparent", fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--fg-1)", padding: 0, cursor: "pointer", outline: "none" }}
              >
                <option value="all">All Accounts</option>
                {apiAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.accountName} {a.bankName ? `(${a.bankName})` : ""}</option>
                ))}
              </select>
            )}
            <div style={{ fontSize: 11.5, color: "var(--fg-4)" }}>{headerAccountLabel}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {caps.canAdd && (
            <button className="btn-cav btn-cav-primary" onClick={handleAddEntry}>
              <Plus size={14} /> Add Bank Entry
            </button>
          )}
          {caps.canAdd && (
            <button className="btn-cav btn-cav-secondary" onClick={handleTransfer}>
              <ArrowLeftRight size={14} /> Transfer Funds
            </button>
          )}
          {caps.canImport && (
            <button className="btn-cav btn-cav-secondary" onClick={handleImport}>
              <Upload size={14} /> Import Statement
            </button>
          )}
          <button className="btn-cav btn-cav-secondary" onClick={() => exportData("excel")}><FileSpreadsheet size={14} /> Excel</button>
          <button className="btn-cav btn-cav-secondary" onClick={() => exportData("pdf")}><FileText size={14} /> PDF</button>
        </div>
      </div>

      {/* ── Filters ── */}
      <BankFilters
        accounts={uiAccounts}
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
            <BankBalanceCard label="Current Balance"  value={currentBalance}   accent sub={selectedApiAccount?.accountName ?? "All accounts"} />
            <BankBalanceCard label="Opening Balance"  value={openingBalance}   sub="For selected period" />
            <BankBalanceCard label="Period Credits"   value={summaryCredits}   tone="credit" sub={txnLoading ? "Loading…" : "Selected range"} />
            <BankBalanceCard label="Period Debits"    value={summaryDebits}    tone="debit"  sub={txnLoading ? "Loading…" : "Selected range"} />
          </>
        )}
      </div>

      {/* ── Reconciliation strip ── */}
      <div className="card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-2)" }}>Reconciliation</div>
        <span className="badge badge-success">{reconCounts.reconciled} Reconciled</span>
        <span className="badge badge-warning">{reconCounts.partial} Partial</span>
        <span className="badge badge-neutral">{reconCounts.unreconciled} Unreconciled</span>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-4)", display: "flex", alignItems: "center", gap: 4 }}>
          Signed in as <b style={{ color: "var(--fg-3)" }}>{caps.roleLabel}</b>
        </div>
      </div>

      {/* ── Transaction error ── */}
      {txnError && (
        <div className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <AlertCircle size={18} style={{ color: "var(--caveo-red)", flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 13.5, color: "var(--fg-2)" }}>{txnError}</div>
          <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={() => fetchTxns(selectedAccountId, filters, page, pageSize, searchQuery)}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* ── Ledger table: loading skeleton ── */}
      {txnLoading && (
        <div className="card">
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ height: 32, width: 220, background: "var(--border)", borderRadius: 8, animation: "pulse 1.5s infinite" }} />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="crm-table">
              <tbody>{[1,2,3,4,5,6,7,8].map((i) => <SkeletonRow key={i} />)}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Ledger table: empty state ── */}
      {!txnLoading && !txnError && uiTxns.length === 0 && (
        <div className="card">
          <div style={{ textAlign: "center", padding: "56px 16px", color: "var(--fg-4)" }}>
            <Banknote size={36} strokeWidth={1.2} style={{ opacity: 0.6 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-3)", marginTop: 10 }}>No bank transactions found</div>
            <div style={{ fontSize: 12.5, marginTop: 3 }}>Adjust filters or add your first bank entry.</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
              {caps.canAdd && (
                <button className="btn-cav btn-cav-primary btn-cav-sm" onClick={handleAddEntry}>
                  <Plus size={13} /> Add Bank Entry
                </button>
              )}
              {caps.canImport && (
                <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={handleImport}>
                  <Upload size={13} /> Import Bank Statement
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Ledger table ── */}
      {!txnLoading && !txnError && uiTxns.length > 0 && (
        <BankTransactionTable
          rows={uiTxns}
          balanceById={balanceById}
          caps={caps}
          onRowClick={(txn) => {
            setDrawerTxn(txn);
            const acct = apiAccounts.find((a) => a.id === selectedAccountId);
            setDrawerAccountName(acct ? `${acct.accountName} (${acct.bankName})` : undefined);
          }}
          onBulkReconcile={reconcile}
          onExport={exportData}
          search={searchQuery}
          onSearch={handleSearch}
          apiPagination={{
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            totalPages: pagination.totalPages,
            onPageChange: handlePageChange,
            onPageSizeChange: handlePageSizeChange,
          }}
        />
      )}

      {/* ── Account summary ── */}
      {!accountsLoading && (
        <BankSummaryPanel
          account={summaryAccount}
          txns={uiTxns}
          apiSummary={summary ?? undefined}
        />
      )}

      {/* ── Transaction drawer ── */}
      {drawerTxn && (
        <BankTransactionDrawer
          txn={drawerTxn}
          caps={caps}
          onClose={() => setDrawerTxn(null)}
          onReconcile={(id) => reconcile([id])}
          accountName={drawerAccountName}
        />
      )}

      {/* ── Import wizard (gated) ── */}
      {modal === "import" && (
        <BankImportWizard
          accounts={uiAccounts.length > 0 ? uiAccounts : BANK_ACCOUNTS}
          defaultAccountId={selectedAccountId !== "all" ? selectedAccountId : (uiAccounts[0]?.id ?? BANK_ACCOUNTS[0].id)}
          currentUser={currentUser}
          onClose={() => setModal(null)}
          onComplete={(row: ImportHistoryRow) => setHistory((h) => [row, ...h])}
        />
      )}
    </div>
  );
}

