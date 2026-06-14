"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Users, UserPlus, Upload, FileSpreadsheet, FileText, Info, Receipt,
  CalendarDays, Clock, CheckCircle2, Wallet, TrendingUp, Percent, Loader2, AlertCircle,
} from "lucide-react";
import {
  Expense, ExpenseCaps, ExpenseType, ApprovalEvent, FY, fmtINR, fmtDate, todayISO,
  ApiExpenseSummary, ApiExpenseItem, ApiExpensePagination, ApiExpenseDetail,
  lakhsToRupees,
} from "./data";
import ExpenseSummaryCard from "./components/ExpenseSummaryCard";
import ExpenseFilters, { ExpenseFilterValues, EMPTY_EXPENSE_FILTERS } from "./components/ExpenseFilters";
import ExpenseTable from "./components/ExpenseTable";
import ExpenseDetailsDrawer from "./components/ExpenseDetailsDrawer";

const WRITE_GATE_MSG = "This action will be enabled after Expense write APIs are implemented.";

const todayStr = new Date().toISOString().slice(0, 10);

// ── Status mapping helpers ────────────────────────────────────────────────────

function uiStatusToApi(s: string): string {
  switch (s) {
    case "Draft":            return "draft";
    case "Pending Approval": return "submitted";
    case "Approved":         return "approved";
    case "Rejected":         return "rejected";
    case "Paid":             return "paid";
    default:                 return "";
  }
}

function mapApiStatus(s: string): Expense["approvalStatus"] {
  switch (s) {
    case "DRAFT":            return "Draft";
    case "PENDING_APPROVAL": return "Pending Approval";
    case "APPROVED":         return "Approved";
    case "REJECTED":         return "Rejected";
    case "PAID":             return "Paid";
    default:                 return "Draft";
  }
}

function mapApiType(t: string): ExpenseType {
  switch (t) {
    case "CUSTOMER_EXPENSE": return "Customer Expense";
    case "VENDOR_EXPENSE":   return "Vendor Expense";
    default:                 return "General Expense";
  }
}

function mapApiExpenseItem(item: ApiExpenseItem): Expense {
  const base  = lakhsToRupees(item.baseAmount);
  const gst   = lakhsToRupees(item.gstAmount);
  const total = lakhsToRupees(item.totalAmount);
  return {
    id:                    Number(item.id),
    expenseNo:             item.expenseNumber,
    date:                  item.expenseDate,
    branch:                "",
    department:            "",
    type:                  mapApiType(item.expenseType),
    category:              item.category,
    subCategory:           item.subCategory ?? "",
    description:           item.description ?? "",
    paymentMode:           "Cash",
    cashAccount:           item.accountName ?? "",
    bankAccount:           "",
    customer:              item.customerName ?? "",
    opportunity:           "",
    salesOrder:            "",
    project:               "",
    ticketRef:             "",
    vendor:                item.vendorName ?? "",
    employee:              item.employeeName,
    claimRef:              "",
    advanceAdjustment:     0,
    reimbursementRequired: false,
    baseAmount:            base,
    gstApplicable:         item.gstApplicable,
    gstNumber:             "",
    taxable:               base,
    cgst:                  0,
    sgst:                  0,
    igst:                  0,
    gstAmount:             gst,
    totalAmount:           total,
    billAvailable:         item.billAvailable,
    invoiceNo:             "",
    invoiceDate:           "",
    voucherGenerated:      !!item.voucherNumber,
    voucherNo:             item.voucherNumber ?? "",
    approvalStatus:        mapApiStatus(item.approvalStatus),
    paymentStatus:         item.paymentStatus === "PAID" ? "Paid" : "Unpaid",
    createdBy:             item.createdBy,
    attachments:           [],
    approvalHistory:       [],
  };
}

function mapApiApprovalHistory(events: ApiExpenseDetail["approvalHistory"]): ApprovalEvent[] {
  return events.map((h) => {
    const ev = h.event;
    const stage =
      ev === "SUBMITTED" ? "Submitted for Approval"
      : ev === "APPROVED" ? "Approved"
      : ev === "REJECTED" ? "Rejected"
      : ev.charAt(0) + ev.slice(1).toLowerCase();
    const state: "done" | "rejected" | "pending" =
      ev === "REJECTED" ? "rejected" : "done";
    return { stage, by: h.by, date: h.at.slice(0, 10), note: h.comments ?? undefined, state };
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExpenseRegisterClient({ caps, currentUser }: { caps: ExpenseCaps; currentUser: string }) {
  // ── API state ──
  const [apiItems,   setApiItems]   = useState<ApiExpenseItem[]>([]);
  const [apiSummary, setApiSummary] = useState<ApiExpenseSummary | null>(null);
  const [apiPag,     setApiPag]     = useState<ApiExpensePagination>({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── UI state ──
  const [filters,     setFilters]     = useState<ExpenseFilterValues>(EMPTY_EXPENSE_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [search,      setSearch]      = useState("");
  const [page,        setPage]        = useState(1);
  const [drawer,      setDrawer]      = useState<Expense | null>(null);
  const [toast,       setToast]       = useState("");
  const searchDebRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(""), 2400); }

  // ── Fetch ──
  const fetchExpenses = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo)   params.set("dateTo",   filters.dateTo);
    const apiStatus = uiStatusToApi(filters.status);
    if (apiStatus)         params.set("status",   apiStatus);
    if (filters.category)  params.set("category", filters.category);
    if (search.trim())     params.set("search",   search.trim());

    try {
      const res = await fetch(`/api/finance/expenses?${params}`, { signal: ac.signal });
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "API error");
      setApiItems(json.data.expenses);
      setApiSummary(json.data.summary);
      setApiPag(json.data.pagination);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [filters, page, search]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  // ── Search debounce ──
  function handleSearch(v: string) {
    setSearchInput(v);
    if (searchDebRef.current) clearTimeout(searchDebRef.current);
    searchDebRef.current = setTimeout(() => { setSearch(v); setPage(1); }, 300);
  }

  // ── Mapped expenses (API → Expense shape for table/drawer) ──
  const mappedExpenses = useMemo(() => apiItems.map(mapApiExpenseItem), [apiItems]);

  // ── Open drawer: show immediately with list data, enrich with detail fetch ──
  async function openDrawer(row: Expense) {
    setDrawer(row);
    try {
      const res = await fetch(`/api/finance/expenses/${row.id}`);
      if (!res.ok) return;
      const json = await res.json();
      if (!json.success) return;
      const d: ApiExpenseDetail = json.data;
      setDrawer((prev) => {
        if (!prev || prev.id !== row.id) return prev;
        return {
          ...prev,
          approvalHistory: mapApiApprovalHistory(d.approvalHistory),
          attachments:     d.attachments.map((a) => ({ name: a.fileName, kind: "pdf" as const })),
          voucherGenerated: !!d.voucher,
          voucherNo:        d.voucher?.voucherNumber ?? "",
        };
      });
    } catch { /* drawer shows with partial list data on error */ }
  }

  // ── Analytics (from current page of results) ──
  const analytics = useMemo(() => {
    const group = (key: (e: Expense) => string) => {
      const map: Record<string, number> = {};
      for (const e of mappedExpenses) { const k = key(e); if (!k) continue; map[k] = (map[k] ?? 0) + e.totalAmount; }
      return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    };
    const months: Record<string, number> = {};
    for (const e of mappedExpenses) {
      const mo = new Date(e.date + "T00:00:00").toLocaleDateString("en-IN", { month: "short" });
      months[mo] = (months[mo] ?? 0) + e.totalAmount;
    }
    return {
      byCategory: group((e) => e.category),
      byEmployee: group((e) => e.employee),
      byCustomer: group((e) => e.customer),
      monthly:    Object.entries(months),
    };
  }, [mappedExpenses]);

  // ── Summary helpers ──
  const lr = (s: string | undefined) => lakhsToRupees(s ?? "0");
  const BUDGET = 1500000;
  const totalForBudget = lr(apiSummary?.totalExpenses);
  const budgetPct = Math.min(100, Math.round((totalForBudget / BUDGET) * 100));

  const maxCat     = Math.max(...analytics.byCategory.map(([, v]) => v), 1);
  const maxMonthly = Math.max(...analytics.monthly.map(([, v]) => v), 1);

  // ── Export (current page) ──
  function exportData(kind: "excel" | "pdf") {
    if (kind === "excel") {
      const head = ["Date", "Expense No", "Type", "Category", "Description", "Customer", "Vendor", "Employee", "Amount", "GST", "Total", "Status"];
      const body = mappedExpenses.map((e) => [fmtDate(e.date), e.expenseNo, e.type, e.category, e.description, e.customer, e.vendor, e.employee, e.baseAmount, e.gstAmount, e.totalAmount, e.approvalStatus]);
      const esc = (v: string | number) => `<td>${String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</td>`;
      const html = `<table border="1"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map(esc).join("")}</tr>`).join("")}</tbody></table>`;
      const blob = new Blob([`﻿${html}`], { type: "application/vnd.ms-excel" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ExpenseRegister.xls"; a.click(); URL.revokeObjectURL(a.href);
    } else {
      const rowsHtml = mappedExpenses.map((e) => `<tr><td>${fmtDate(e.date)}</td><td>${e.expenseNo}</td><td>${e.category}</td><td>${e.description}</td><td style="text-align:right">${fmtINR(e.totalAmount)}</td><td>${e.approvalStatus}</td></tr>`).join("");
      const html = `<!doctype html><html><head><title>Expense Register</title><style>body{font-family:Inter,Arial,sans-serif;padding:24px;color:#0F1115}h1{font-size:18px}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#EEF0F3;text-align:left;padding:7px 8px;font-size:9px;text-transform:uppercase;color:#5B626C}td{padding:6px 8px;border-bottom:1px solid #E3E6EB}</style></head><body><h1>Expense Register — FY ${FY}</h1><table><thead><tr><th>Date</th><th>Expense No</th><th>Category</th><th>Description</th><th style="text-align:right">Total</th><th>Status</th></tr></thead><tbody>${rowsHtml}</tbody></table><script>window.onload=function(){window.print()}<\/script></body></html>`;
      const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); }
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Quick actions — write actions feature-gated */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <button className="btn-cav btn-cav-primary"   onClick={() => flash(WRITE_GATE_MSG)}><Plus size={14} /> Add Expense</button>
        <button className="btn-cav btn-cav-secondary" onClick={() => flash(WRITE_GATE_MSG)}><Users size={14} /> Customer Expense</button>
        <button className="btn-cav btn-cav-secondary" onClick={() => flash(WRITE_GATE_MSG)}><UserPlus size={14} /> Employee Claim</button>
        <button className="btn-cav btn-cav-secondary" onClick={() => flash("Import wizard — coming soon")}><Upload size={14} /> Import</button>
        {caps.canExport && <button className="btn-cav btn-cav-secondary" onClick={() => exportData("excel")}><FileSpreadsheet size={14} /> Excel</button>}
        {caps.canExport && <button className="btn-cav btn-cav-secondary" onClick={() => exportData("pdf")}><FileText size={14} /> PDF</button>}
      </div>

      {/* Filters */}
      <ExpenseFilters
        value={filters}
        onApply={(f) => { setFilters(f); setPage(1); }}
        onReset={() => { setFilters(EMPTY_EXPENSE_FILTERS); setPage(1); setSearch(""); setSearchInput(""); }}
        onSaveView={() => flash("Filter view saved")}
      />

      {/* Summary cards from live API */}
      <div className="kpi-grid">
        <ExpenseSummaryCard label="Total Expenses" value={lr(apiSummary?.totalExpenses)} icon={Receipt} accent />
        <ExpenseSummaryCard label="Today's Expenses" value={lr(apiSummary?.todayExpenses)} icon={CalendarDays} sub={todayStr} />
        <ExpenseSummaryCard label="Pending Approval" value={lr(apiSummary?.pendingApprovalAmount)} icon={Clock} tone="warn" />
        <ExpenseSummaryCard label="Approved Expenses" value={lr(apiSummary?.approvedExpenses)} icon={CheckCircle2} tone="credit" />
        <ExpenseSummaryCard label="Employee Claims Pending" value={lr(apiSummary?.employeeClaimsPending)} icon={Wallet} />
        <ExpenseSummaryCard label="Customer Expenses" value={lr(apiSummary?.customerExpenses)} icon={Users} />
        <ExpenseSummaryCard label="GST Input" value={lr(apiSummary?.gstInputAmount)} icon={Percent} tone="credit" />
        <ExpenseSummaryCard label="Budget Utilization" value={`${budgetPct}%`} money={false} icon={TrendingUp} sub={`${fmtINR(totalForBudget)} / ${fmtINR(BUDGET)}`} accent />
      </div>

      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-4)" }}>
        <Info size={12} /> Signed in as <b style={{ color: "var(--fg-3)" }}>{caps.roleLabel}</b> ({caps.scope === "own" ? "own expenses" : "all expenses"}) · live data.
      </div>

      {/* Loading / Error / Empty / Table */}
      {loading && apiItems.length === 0 ? (
        <div className="card">
          <div style={{ textAlign: "center", padding: "56px 16px", color: "var(--fg-4)" }}>
            <Loader2 size={28} style={{ opacity: 0.5 }} className="spin" />
            <div style={{ marginTop: 10, fontSize: 13 }}>Loading expenses…</div>
          </div>
        </div>
      ) : error ? (
        <div className="card">
          <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--fg-3)" }}>
            <AlertCircle size={24} style={{ color: "var(--caveo-red)", opacity: 0.7 }} />
            <div style={{ marginTop: 8, fontSize: 13 }}>{error}</div>
            <button className="btn-cav btn-cav-secondary btn-cav-sm" style={{ marginTop: 12 }} onClick={fetchExpenses}>Retry</button>
          </div>
        </div>
      ) : !loading && mappedExpenses.length === 0 ? (
        <div className="card">
          <div style={{ textAlign: "center", padding: "56px 16px", color: "var(--fg-4)" }}>
            <Receipt size={36} strokeWidth={1.2} style={{ opacity: 0.6 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-3)", marginTop: 10 }}>No expenses found</div>
            <div style={{ fontSize: 12.5, marginTop: 3 }}>Try adjusting your filters or search.</div>
          </div>
        </div>
      ) : (
        <>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg-4)", padding: "2px 0" }}>
              <Loader2 size={13} className="spin" /> Refreshing…
            </div>
          )}
          <ExpenseTable
            rows={mappedExpenses}
            caps={caps}
            onRowClick={openDrawer}
            onExport={exportData}
            onBulk={(_a, _ids) => flash(WRITE_GATE_MSG)}
            search={searchInput}
            onSearch={handleSearch}
            apiPagination={{ ...apiPag, onPageChange: (p) => setPage(p) }}
          />
        </>
      )}

      {/* Analytics charts */}
      <div className="grid-12">
        <div className="col-6"><MiniBars title="Category-wise Expense" rows={analytics.byCategory} max={maxCat} /></div>
        <div className="col-6"><MiniBars title="Customer-wise Expense" rows={analytics.byCustomer} max={Math.max(...analytics.byCustomer.map(([, v]) => v), 1)} /></div>
        <div className="col-6"><MiniBars title="Employee-wise Expense" rows={analytics.byEmployee} max={Math.max(...analytics.byEmployee.map(([, v]) => v), 1)} /></div>
        <div className="col-6"><MiniBars title="Monthly Trend" rows={analytics.monthly} max={maxMonthly} accent /></div>
      </div>

      {/* Details Drawer — write actions feature-gated */}
      {drawer && (
        <ExpenseDetailsDrawer
          expense={drawer}
          caps={caps}
          customerExisting={0}
          onClose={() => setDrawer(null)}
          onEdit={() => flash(WRITE_GATE_MSG)}
          onApprove={() => flash(WRITE_GATE_MSG)}
          onReject={() => flash(WRITE_GATE_MSG)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "var(--cyber-black)", color: "#fff", fontSize: 13, fontWeight: 600, padding: "10px 18px", borderRadius: 999, boxShadow: "var(--shadow-lg)", zIndex: 9999, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={14} /> {toast}
        </div>
      )}
    </div>
  );
}

// ── Mini horizontal-bar analytics card ───────────────────────────────────────

function MiniBars({ title, rows, max, accent }: { title: string; rows: [string, number][]; max: number; accent?: boolean }) {
  return (
    <div className="card" style={{ height: "100%" }}>
      <div className="card-header"><div className="ch-title">{title}</div></div>
      <div className="card-body">
        {rows.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--fg-4)", padding: "8px 0" }}>No data.</div>
        ) : rows.map(([label, value]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
            <div style={{ width: 110, fontSize: 11.5, color: "var(--fg-2)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
            <div style={{ flex: 1, height: 10, background: "var(--bg-muted)", borderRadius: 5, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(value / max) * 100}%`, background: accent ? "var(--infra-blue)" : "var(--caveo-red)", borderRadius: 5 }} />
            </div>
            <div style={{ width: 64, fontSize: 11.5, fontWeight: 600, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINR(value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
