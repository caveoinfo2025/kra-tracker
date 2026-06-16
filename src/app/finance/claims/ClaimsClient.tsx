"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle, CheckCircle, ChevronLeft, ChevronRight,
  CircleDollarSign, Clock, Eye, FileText, Loader2, Paperclip,
  RefreshCw, Search, ThumbsDown, ThumbsUp, TrendingUp, Undo2,
  User, X,
} from "lucide-react";
import type { ClaimsCaps } from "./page";

// ── API types ──────────────────────────────────────────────────────────────────

interface ApiSummary {
  totalExpenses:         string;
  todayExpenses:         string;
  pendingApprovalAmount: string;
  approvedExpenses:      string;
  employeeClaimsPending: string;
  customerExpenses:      string;
  gstInputAmount:        string;
}

interface ApiExpense {
  id:             string;
  expenseDate:    string;
  expenseNumber:  string;
  expenseType:    string;
  category:       string;
  description:    string;
  customerName:   string | null;
  vendorName:     string | null;
  employeeName:   string;
  baseAmount:     string;
  gstAmount:      string;
  totalAmount:    string;
  voucherNumber:  string | null;
  approvalStatus: string;
  paymentStatus:  string;
  billAvailable:  boolean;
  gstApplicable:  boolean;
  createdBy:      string;
}

interface ApiListResponse {
  success: boolean;
  data: {
    summary:    ApiSummary;
    expenses:   ApiExpense[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  };
}

interface ApprovalEvent {
  event:    string;
  by:       string;
  at:       string;
  status:   string;
  comments: string | null;
}

interface ApiDetail {
  success: boolean;
  data: {
    expense: {
      id:              string;
      expenseDate:     string;
      expenseNumber:   string;
      category:        string;
      description:     string;
      employeeName:    string;
      customerName:    string | null;
      vendorName:      string | null;
      baseAmount:      string;
      gstRate:         number;
      gstAmount:       string;
      totalAmount:     string;
      vendorInvoiceNo: string | null;
      voucherNumber:   string | null;
      approvalStatus:  string;
      paymentStatus:   string;
      approvedBy:      string | null;
      approvedAt:      string | null;
      paidDate:        string | null;
      billAvailable:   boolean;
    };
    customer:                 { name: string } | null;
    vendor:                   { name: string; gstin: string | null; invoiceNumber: string | null } | null;
    employee:                 { name: string };
    gst:                      { taxableAmount: string; totalGst: string };
    voucher:                  { voucherNumber: string; status: string } | null;
    attachments:              { fileName: string; fileUrl: string }[];
    pendingApprovalRequestId: number | null;
    approvalHistory:          ApprovalEvent[];
  };
}

// ── Money helpers ─────────────────────────────────────────────────────────────

function lakhsToRupees(s: string): number {
  return Math.round(Number(s) * 100_000 * 100) / 100;
}

function fmtINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function fmtLakhs(s: string): string { return fmtINR(lakhsToRupees(s)); }

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  DRAFT:            "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED:         "Approved",
  REJECTED:         "Rejected",
  PAID:             "Paid",
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT:            "badge-neutral",
  PENDING_APPROVAL: "badge-warning",
  APPROVED:         "badge-success",
  REJECTED:         "badge-danger",
  PAID:             "badge-accent",
};

function statusLabel(s: string): string { return STATUS_LABELS[s] ?? s; }
function statusBadge(s: string): string { return STATUS_BADGE[s]  ?? "badge-neutral"; }

// ── Expense type helpers ──────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  CUSTOMER_EXPENSE: "Customer",
  VENDOR_EXPENSE:   "Vendor",
  GENERAL_EXPENSE:  "General",
};

// ── Filters ───────────────────────────────────────────────────────────────────

interface Filters {
  status:     string;
  category:   string;
  dateFrom:   string;
  dateTo:     string;
  search:     string;
  employeeId: string;
}

const EMPTY_FILTERS: Filters = {
  status: "", category: "", dateFrom: "", dateTo: "", search: "", employeeId: "",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClaimsClient({ caps }: { caps: ClaimsCaps }) {
  // ── Data state ─────────────────────────────────────────────────────────────
  const [summary,    setSummary]    = useState<ApiSummary | null>(null);
  const [expenses,   setExpenses]   = useState<ApiExpense[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  // ── Filters state ──────────────────────────────────────────────────────────
  const [filters,        setFilters]  = useState<Filters>(EMPTY_FILTERS);
  const [appliedFilters, setApplied]  = useState<Filters>(EMPTY_FILTERS);
  const [currentPage,    setCurrentPage] = useState(1);

  // ── Drawer state ───────────────────────────────────────────────────────────
  const [viewItem,     setViewItem]    = useState<ApiExpense | null>(null);
  const [detail,       setDetail]      = useState<ApiDetail["data"] | null>(null);
  const [detailLoad,   setDetailLoad]  = useState(false);
  const [detailError,  setDetailError] = useState<string | null>(null);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null);

  // ── Approval action state ──────────────────────────────────────────────────
  const [actionMode,    setActionMode]    = useState<"approve" | "reject" | "return" | null>(null);
  const [actionRemarks, setActionRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError,   setActionError]   = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch list ─────────────────────────────────────────────────────────────
  const fetchData = useCallback((f: Filters, page: number) => {
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(page));
    if (f.status)     params.set("status",   f.status);
    if (f.category)   params.set("category", f.category);
    if (f.dateFrom)   params.set("dateFrom", f.dateFrom);
    if (f.dateTo)     params.set("dateTo",   f.dateTo);
    if (f.search)     params.set("search",   f.search);
    if (f.employeeId && caps.canManage) params.set("employeeId", f.employeeId);

    fetch(`/api/finance/expenses?${params.toString()}`, { signal: ac.signal })
      .then(async (res) => {
        const json = await res.json() as ApiListResponse;
        if (!res.ok || !json.success) throw new Error("Failed to load claims");
        setSummary(json.data.summary);
        setExpenses(json.data.expenses);
        setPagination(json.data.pagination);
      })
      .catch((e: Error) => { if (e.name !== "AbortError") setError(e.message); })
      .finally(() => setLoading(false));
  }, [caps.canManage]);

  useEffect(() => {
    fetchData(appliedFilters, currentPage);
    return () => { abortRef.current?.abort(); };
  }, [fetchData, appliedFilters, currentPage]);

  function applyFilters() { setCurrentPage(1); setApplied({ ...filters }); }
  function clearFilters()  { setFilters(EMPTY_FILTERS); setCurrentPage(1); setApplied(EMPTY_FILTERS); }

  // ── Toast helper ───────────────────────────────────────────────────────────
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  // ── Open detail ────────────────────────────────────────────────────────────
  function openDetail(item: ApiExpense) {
    setViewItem(item);
    setDetail(null);
    setDetailError(null);
    setActionMode(null);
    setActionRemarks("");
    setActionError(null);
    setDetailLoad(true);

    fetch(`/api/finance/expenses/${item.id}`)
      .then(async (res) => {
        const json = await res.json() as ApiDetail;
        if (!res.ok || !json.success) throw new Error("Failed to load details");
        setDetail(json.data);
      })
      .catch((e: Error) => setDetailError(e instanceof Error ? e.message : "Load failed"))
      .finally(() => setDetailLoad(false));
  }

  function closeDrawer() {
    setViewItem(null);
    setDetail(null);
    setActionMode(null);
    setActionRemarks("");
    setActionError(null);
  }

  // ── Approval action ────────────────────────────────────────────────────────
  async function submitAction() {
    const arId = detail?.pendingApprovalRequestId;
    if (!arId || !actionMode) return;
    if ((actionMode === "reject" || actionMode === "return") && !actionRemarks.trim()) {
      setActionError("Remarks are required for this action.");
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/approvals/${arId}/action`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          action:   actionMode.toUpperCase(),
          comments: actionRemarks.trim() || undefined,
        }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? "Action failed");
      const label = actionMode === "approve" ? "Approved" : actionMode === "reject" ? "Rejected" : "Returned for changes";
      showToast(`${label} successfully.`);
      closeDrawer();
      fetchData(appliedFilters, currentPage);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  // ── KPI cards ──────────────────────────────────────────────────────────────
  const KPI_CARDS = summary ? [
    { label: "Total Expenses",       value: fmtLakhs(summary.totalExpenses),         sub: "all time",             icon: CircleDollarSign, color: "var(--fg-2)"           },
    { label: "Today",                value: fmtLakhs(summary.todayExpenses),         sub: "submitted today",      icon: TrendingUp,       color: "var(--caveo-red)"      },
    { label: "Pending Approval",     value: fmtLakhs(summary.pendingApprovalAmount), sub: "awaiting approval",    icon: Clock,            color: "var(--caveo-orange, #E67E22)" },
    { label: "Approved",             value: fmtLakhs(summary.approvedExpenses),      sub: "approved + paid",      icon: ThumbsUp,         color: "var(--fg-success, #27AE60)" },
    { label: "Claims Pending",       value: fmtLakhs(summary.employeeClaimsPending), sub: "draft + submitted",    icon: FileText,         color: "var(--fg-3)"           },
    { label: "Customer Expenses",    value: fmtLakhs(summary.customerExpenses),      sub: "billable",             icon: User,             color: "var(--fg-accent, #2980B9)" },
    { label: "GST Input",            value: fmtLakhs(summary.gstInputAmount),        sub: "input tax credit",     icon: CheckCircle,      color: "var(--fg-3)"           },
    { label: "Bills Attached",       value: `${expenses.filter((e) => e.billAvailable).length}`, sub: `of ${expenses.length} on this page`, icon: Paperclip, color: "var(--fg-3)" },
  ] : [];

  const canActOnDetail =
    caps.canApprove &&
    detail !== null &&
    detail.pendingApprovalRequestId !== null &&
    viewItem?.approvalStatus === "PENDING_APPROVAL";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "0 0 40px" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          background: "var(--fg-success, #27AE60)", color: "#fff",
          borderRadius: 8, padding: "12px 20px", fontSize: 14, fontWeight: 500,
          boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
        }}>
          {toast}
        </div>
      )}

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 13, color: "var(--fg-3)" }}>
          {caps.scope === "all" ? "Viewing all employee expense claims" : "Viewing your expense claims"}
        </div>
        <div title="New claims are submitted from the mobile app" style={{ cursor: "not-allowed" }}>
          <button
            disabled
            className="btn-cav btn-cav-primary"
            style={{ opacity: 0.4, cursor: "not-allowed", pointerEvents: "none" }}
          >
            + New Claim
          </button>
        </div>
      </div>

      {/* KPI cards */}
      {loading && !summary ? (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ flex: "1 1 140px", minWidth: 130, height: 84, borderRadius: 10, background: "var(--bg-2)", animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      ) : summary ? (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {KPI_CARDS.map((c) => (
            <div key={c.label} style={{
              flex: "1 1 140px", minWidth: 130,
              background: "var(--bg-1)", border: "1px solid var(--border-1)",
              borderRadius: 10, padding: "14px 18px",
              display: "flex", flexDirection: "column", gap: 4,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--fg-3)", fontSize: 12 }}>
                <c.icon size={13} color={c.color} />
                {c.label}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--fg-1)", letterSpacing: "-0.3px" }}>{c.value}</div>
              <div style={{ fontSize: 11, color: "var(--fg-4)" }}>{c.sub}</div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Filters */}
      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end",
        padding: "14px 16px",
        background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: 10,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 140px", minWidth: 120 }}>
          <label style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 500 }}>From</label>
          <input type="date" className="input-cav" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 140px", minWidth: 120 }}>
          <label style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 500 }}>To</label>
          <input type="date" className="input-cav" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 140px", minWidth: 130 }}>
          <label style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 500 }}>Status</label>
          <select className="input-cav" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 160px", minWidth: 140 }}>
          <label style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 500 }}>Category</label>
          <input type="text" className="input-cav" placeholder="Filter by category…" value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "2 1 200px", minWidth: 180 }}>
          <label style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 500 }}>Search</label>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-4)" }} />
            <input
              type="text" className="input-cav" placeholder="Description, category, customer…"
              value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              style={{ paddingLeft: 30 }}
              onKeyDown={(e) => { if (e.key === "Enter") applyFilters(); }}
            />
          </div>
        </div>
        {caps.canManage && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 120px", minWidth: 110 }}>
            <label style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 500 }}>Employee ID</label>
            <input type="number" className="input-cav" placeholder="e.g. 3" value={filters.employeeId} onChange={(e) => setFilters((f) => ({ ...f, employeeId: e.target.value }))} />
          </div>
        )}
        <div style={{ display: "flex", gap: 8, alignSelf: "flex-end", paddingBottom: 1 }}>
          <button className="btn-cav btn-cav-primary" onClick={applyFilters} style={{ whiteSpace: "nowrap" }}>Apply</button>
          <button className="btn-cav btn-cav-ghost" onClick={clearFilters}>Clear</button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--bg-danger, #FEE2E2)", border: "1px solid var(--border-danger, #FCA5A5)", borderRadius: 8, color: "var(--fg-danger, #991B1B)", fontSize: 13 }}>
          <AlertCircle size={15} />
          <span>{error}</span>
          <button onClick={() => fetchData(appliedFilters, currentPage)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
            <RefreshCw size={13} />
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: "auto", border: "1px solid var(--border-1)", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-1)", background: "var(--bg-1)" }}>
              <th style={TH}>Expense No</th>
              <th style={TH}>Date</th>
              <th style={TH}>Category</th>
              <th style={TH}>Description</th>
              {caps.scope === "all" && <th style={TH}>Employee</th>}
              <th style={TH}>Type</th>
              <th style={{ ...TH, textAlign: "right" }}>Amount (₹)</th>
              <th style={TH}>Status</th>
              <th style={TH}>Bill</th>
              <th style={{ ...TH, textAlign: "center" }}>View</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={caps.scope === "all" ? 10 : 9} style={{ padding: "48px 0", textAlign: "center", color: "var(--fg-3)" }}>
                  <Loader2 size={20} style={{ animation: "spin 1s linear infinite", display: "inline-block" }} />
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={caps.scope === "all" ? 10 : 9} style={{ padding: "56px 0", textAlign: "center", color: "var(--fg-4)", fontSize: 13 }}>
                  No expense claims found. Try adjusting filters.
                </td>
              </tr>
            ) : expenses.map((exp, idx) => (
              <tr
                key={exp.id}
                style={{
                  borderBottom: idx < expenses.length - 1 ? "1px solid var(--border-1)" : "none",
                  background: "transparent",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "var(--bg-hover, var(--bg-2))"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                onClick={() => openDetail(exp)}
              >
                <td style={TD}>
                  <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--fg-2)" }}>{exp.expenseNumber}</span>
                </td>
                <td style={TD}>{exp.expenseDate}</td>
                <td style={TD}>
                  <span style={{ fontSize: 12, color: "var(--fg-2)", background: "var(--bg-2)", borderRadius: 4, padding: "2px 6px" }}>
                    {exp.category}
                  </span>
                </td>
                <td style={{ ...TD, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {exp.description || <span style={{ color: "var(--fg-4)" }}>—</span>}
                </td>
                {caps.scope === "all" && (
                  <td style={TD}>{exp.employeeName}</td>
                )}
                <td style={TD}>
                  <span style={{ fontSize: 11, color: "var(--fg-3)" }}>
                    {exp.customerName ? `${exp.customerName}` : TYPE_LABEL[exp.expenseType] ?? exp.expenseType}
                  </span>
                </td>
                <td style={{ ...TD, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {fmtLakhs(exp.totalAmount)}
                </td>
                <td style={TD}>
                  <span className={`badge ${statusBadge(exp.approvalStatus)}`} style={{ fontSize: 11 }}>
                    {statusLabel(exp.approvalStatus)}
                  </span>
                </td>
                <td style={{ ...TD, textAlign: "center" }}>
                  {exp.billAvailable
                    ? <Paperclip size={13} style={{ color: "var(--fg-success, #27AE60)" }} />
                    : <span style={{ color: "var(--fg-4)", fontSize: 11 }}>—</span>}
                </td>
                <td style={{ ...TD, textAlign: "center" }}>
                  <button
                    className="btn-cav btn-cav-ghost"
                    style={{ padding: "4px 10px", fontSize: 12 }}
                    onClick={(e) => { e.stopPropagation(); openDetail(exp); }}
                  >
                    <Eye size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 13, color: "var(--fg-3)" }}>
          <span>
            Showing {((pagination.page - 1) * pagination.pageSize) + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn-cav btn-cav-ghost"
              disabled={pagination.page <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              style={{ padding: "6px 10px", opacity: pagination.page <= 1 ? 0.4 : 1 }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ padding: "6px 12px", background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: 6 }}>
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              className="btn-cav btn-cav-ghost"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              style={{ padding: "6px 10px", opacity: pagination.page >= pagination.totalPages ? 0.4 : 1 }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {viewItem && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1200,
            display: "flex", alignItems: "flex-start", justifyContent: "flex-end",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeDrawer(); }}
        >
          {/* Backdrop */}
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.28)" }} onClick={closeDrawer} />

          {/* Panel */}
          <div style={{
            position: "relative", zIndex: 1, width: 520, maxWidth: "95vw",
            height: "100vh", background: "var(--bg-0)", boxShadow: "-8px 0 32px rgba(0,0,0,0.18)",
            display: "flex", flexDirection: "column", overflowY: "auto",
          }}>
            {/* Drawer header */}
            <div style={{
              padding: "20px 24px 16px",
              borderBottom: "1px solid var(--border-1)",
              display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
              position: "sticky", top: 0, background: "var(--bg-0)", zIndex: 2,
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "monospace" }}>{viewItem.expenseNumber}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-1)" }}>
                  {viewItem.description || viewItem.category}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span className={`badge ${statusBadge(viewItem.approvalStatus)}`}>{statusLabel(viewItem.approvalStatus)}</span>
                  {viewItem.customerName && (
                    <span className="badge badge-accent" style={{ fontSize: 11 }}>{viewItem.customerName}</span>
                  )}
                </div>
              </div>
              <button onClick={closeDrawer} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--fg-3)", marginTop: 2 }}>
                <X size={18} />
              </button>
            </div>

            {/* Drawer body */}
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>

              {detailLoad ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                  <Loader2 size={22} style={{ animation: "spin 1s linear infinite", color: "var(--fg-3)" }} />
                </div>
              ) : detailError ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--fg-danger, #C0392B)", fontSize: 13 }}>
                  <AlertCircle size={14} /> {detailError}
                </div>
              ) : detail ? (
                <>
                  {/* Core fields */}
                  <Section title="Expense Details">
                    <FieldGrid fields={[
                      { label: "Date",       value: detail.expense.expenseDate },
                      { label: "Category",   value: detail.expense.category },
                      { label: "Employee",   value: detail.employee.name },
                      { label: "Type",       value: TYPE_LABEL[viewItem.expenseType] ?? viewItem.expenseType },
                      ...(detail.customer    ? [{ label: "Customer", value: detail.customer.name }] : []),
                      ...(detail.vendor      ? [{ label: "Vendor",   value: detail.vendor.name   }] : []),
                      ...(detail.vendor?.invoiceNumber ? [{ label: "Invoice No", value: detail.vendor.invoiceNumber }] : []),
                      { label: "Description", value: detail.expense.description || "—" },
                    ]} />
                  </Section>

                  {/* Amount breakdown */}
                  <Section title="Amount">
                    <FieldGrid fields={[
                      { label: "Base Amount",  value: fmtLakhs(detail.expense.baseAmount) },
                      { label: "GST Rate",     value: detail.expense.gstRate > 0 ? `${detail.expense.gstRate}%` : "N/A" },
                      { label: "GST Amount",   value: fmtLakhs(detail.expense.gstAmount) },
                      { label: "Total Amount", value: fmtLakhs(detail.expense.totalAmount), highlight: true },
                    ]} />
                  </Section>

                  {/* Voucher / payment info */}
                  {(detail.voucher || detail.expense.approvedBy || detail.expense.paidDate) && (
                    <Section title="Payment Info">
                      <FieldGrid fields={[
                        ...(detail.expense.approvedBy ? [{ label: "Approved By", value: detail.expense.approvedBy }] : []),
                        ...(detail.expense.approvedAt ? [{ label: "Approved At", value: detail.expense.approvedAt.slice(0, 10) }] : []),
                        ...(detail.voucher ? [{ label: "Voucher", value: detail.voucher.voucherNumber }] : []),
                        ...(detail.expense.paidDate ? [{ label: "Paid Date", value: detail.expense.paidDate }] : []),
                      ]} />
                    </Section>
                  )}

                  {/* Attachments */}
                  <Section title={`Attachments (${detail.attachments.length})`}>
                    {detail.attachments.length === 0 ? (
                      <div style={{ fontSize: 13, color: "var(--fg-4)" }}>No bills or attachments uploaded.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {detail.attachments.map((att, i) => (
                          <div key={i} style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "8px 12px", borderRadius: 6,
                            background: "var(--bg-1)", border: "1px solid var(--border-1)",
                          }}>
                            <Paperclip size={13} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: "var(--fg-2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.fileName}</span>
                            {att.fileUrl && (
                              <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--caveo-red)", textDecoration: "none", flexShrink: 0 }}>
                                View
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Section>

                  {/* Approval timeline */}
                  {detail.approvalHistory.length > 0 && (
                    <Section title="Approval Timeline">
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {detail.approvalHistory.map((ev, i) => (
                          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--caveo-red)", marginTop: 5, flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: 13, color: "var(--fg-2)", fontWeight: 500 }}>
                                {ev.event} — {ev.by}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--fg-4)" }}>{ev.at.slice(0, 16).replace("T", " ")}</div>
                              {ev.comments && <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>{ev.comments}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Approval actions */}
                  {canActOnDetail && (
                    <Section title="Approval Action">
                      {actionMode ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          <div style={{ fontSize: 13, color: "var(--fg-2)", fontWeight: 500 }}>
                            {actionMode === "approve" ? "Approve claim" : actionMode === "reject" ? "Reject claim" : "Return for changes"}
                          </div>
                          <textarea
                            className="input-cav"
                            rows={3}
                            placeholder={actionMode === "approve" ? "Optional remarks…" : "Remarks (required)…"}
                            value={actionRemarks}
                            onChange={(e) => setActionRemarks(e.target.value)}
                            style={{ resize: "vertical" }}
                          />
                          {actionError && (
                            <div style={{ fontSize: 12, color: "var(--fg-danger, #C0392B)", display: "flex", gap: 6 }}>
                              <AlertCircle size={13} /> {actionError}
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="btn-cav btn-cav-primary"
                              onClick={submitAction}
                              disabled={actionLoading}
                              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                            >
                              {actionLoading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : null}
                              Confirm
                            </button>
                            <button
                              className="btn-cav btn-cav-ghost"
                              onClick={() => { setActionMode(null); setActionRemarks(""); setActionError(null); }}
                              disabled={actionLoading}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button className="btn-cav btn-cav-primary" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={() => setActionMode("approve")}>
                            <ThumbsUp size={13} /> Approve
                          </button>
                          <button className="btn-cav btn-cav-ghost" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={() => setActionMode("reject")}>
                            <ThumbsDown size={13} /> Reject
                          </button>
                          <button className="btn-cav btn-cav-ghost" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={() => setActionMode("return")}>
                            <Undo2 size={13} /> Return
                          </button>
                        </div>
                      )}
                    </Section>
                  )}

                  {/* Mark Paid — disabled */}
                  {detail.expense.approvalStatus === "APPROVED" && detail.expense.paymentStatus !== "PAID" && (
                    <Section title="Payment">
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button
                          disabled
                          className="btn-cav btn-cav-primary"
                          style={{ opacity: 0.4, cursor: "not-allowed" }}
                          title="Payment posting is not yet available"
                        >
                          Mark as Paid
                        </button>
                        <span style={{ fontSize: 12, color: "var(--fg-4)" }}>Payment posting coming soon</span>
                      </div>
                    </Section>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Table style helpers ───────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: "10px 14px", textAlign: "left", fontSize: 12,
  fontWeight: 600, color: "var(--fg-3)", whiteSpace: "nowrap",
};

const TD: React.CSSProperties = {
  padding: "10px 14px", fontSize: 13, color: "var(--fg-2)", verticalAlign: "middle",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function FieldGrid({ fields }: { fields: { label: string; value: string; highlight?: boolean }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
      {fields.map((f) => (
        <div key={f.label}>
          <div style={{ fontSize: 11, color: "var(--fg-4)", marginBottom: 2 }}>{f.label}</div>
          <div style={{ fontSize: 13, color: f.highlight ? "var(--fg-1)" : "var(--fg-2)", fontWeight: f.highlight ? 700 : 400 }}>
            {f.value}
          </div>
        </div>
      ))}
    </div>
  );
}
