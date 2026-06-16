"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle, ChevronDown, ChevronRight, CircleDollarSign, Clock,
  Eye, Loader2, Plus, RefreshCw, Search, ThumbsDown, ThumbsUp, Undo2,
  Wallet, X, ExternalLink,
} from "lucide-react";
import type { AdvanceCaps } from "./page";

// ── API types ──────────────────────────────────────────────────────────────────

interface ApiSummary {
  totalThisMonth:   string;
  pendingApproval:  string;
  approved:         string;
  outstanding:      string;
  settled:          string;
  rejected:         string;
  pendingCount:     number;
  approvedCount:    number;
  outstandingCount: number;
}

const ADVANCE_CATEGORIES = [
  "Customer Project",
  "Travel",
  "Office Supplies",
  "Training",
  "Medical",
  "Other",
] as const;

type AdvanceCategory = (typeof ADVANCE_CATEGORIES)[number];

const CATEGORY_BADGE: Record<string, string> = {
  "Customer Project": "badge-accent",
  "Travel":          "badge-info",
  "Office Supplies": "badge-neutral",
  "Training":        "badge-success",
  "Medical":         "badge-warning",
  "Other":           "badge-neutral",
};

function categoryBadge(c: string): string { return CATEGORY_BADGE[c] ?? "badge-neutral"; }

interface ApiAdvance {
  id:                   number;
  advanceNo:            string;
  employeeId:           number;
  employeeName:         string;
  category:             string;
  purpose:              string;
  amountLakhs:          string;
  requestDate:          string;
  requiredByDate:       string | null;
  status:               string;
  approvedByName:       string | null;
  approvedAt:           string | null;
  disbursedDate:        string | null;
  disbursedAmountLakhs: string | null;
  disbursedFromType:    string;
  settledDate:          string | null;
  settledAmountLakhs:   string | null;
  balanceLakhs:         string;
  voucherId:            number | null;
  remarks:              string;
  approvalRequestId:    number | null;
  approvalStatus:       string | null;
}

interface ApiResponse {
  success: boolean;
  data: {
    summary:    ApiSummary;
    advances:   ApiAdvance[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  };
}

// ── Money helpers ─────────────────────────────────────────────────────────────

function lakhsToRupees(s: string): number {
  return Math.round(Number(s) * 100000 * 100) / 100;
}

function fmtINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function fmtLakhs(s: string): string {
  return fmtINR(lakhsToRupees(s));
}

// ── Status helpers ────────────────────────────────────────────────────────────

type AdvanceStatus = "pending" | "approved" | "disbursed" | "settled" | "rejected";

const STATUS_LABELS: Record<string, string> = {
  pending:   "Pending Approval",
  approved:  "Approved",
  disbursed: "Disbursed",
  settled:   "Settled",
  rejected:  "Rejected",
};

const STATUS_BADGE: Record<string, string> = {
  pending:   "badge-warning",
  approved:  "badge-success",
  disbursed: "badge-accent",
  settled:   "badge-neutral",
  rejected:  "badge-danger",
};

function statusLabel(s: string): string  { return STATUS_LABELS[s] ?? s; }
function statusBadge(s: string): string  { return STATUS_BADGE[s]  ?? "badge-neutral"; }

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

// ── Form state ────────────────────────────────────────────────────────────────

interface AdvanceForm {
  category:      AdvanceCategory;
  purpose:       string;
  amountLakhs:   string;
  requiredByDate: string;
  remarks:       string;
}

const EMPTY_FORM: AdvanceForm = {
  category: "Other", purpose: "", amountLakhs: "", requiredByDate: "", remarks: "",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdvancesClient({ caps }: { caps: AdvanceCaps }) {
  // ── Data state ─────────────────────────────────────────────────────────────
  const [summary,    setSummary]    = useState<ApiSummary | null>(null);
  const [advances,   setAdvances]   = useState<ApiAdvance[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  // ── Filters state ──────────────────────────────────────────────────────────
  const [filters,     setFilters]    = useState<Filters>(EMPTY_FILTERS);
  const [appliedFilters, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);

  // ── Drawer state ───────────────────────────────────────────────────────────
  const [viewItem,  setViewItem]  = useState<ApiAdvance | null>(null);
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState<AdvanceForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating,  setCreating]  = useState(false);
  const [toast,     setToast]     = useState<string | null>(null);

  // ── Approval action state ──────────────────────────────────────────────────
  const [actionMode,     setActionMode]     = useState<"approve" | "reject" | "return" | null>(null);
  const [actionRemarks,  setActionRemarks]  = useState("");
  const [actionLoading,  setActionLoading]  = useState(false);
  const [actionError,    setActionError]    = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback((f: Filters, page: number) => {
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(page));
    if (f.status)     params.set("status",     f.status);
    if (f.category)   params.set("category",   f.category);
    if (f.dateFrom)   params.set("dateFrom",   f.dateFrom);
    if (f.dateTo)     params.set("dateTo",     f.dateTo);
    if (f.search)     params.set("search",     f.search);
    if (f.employeeId && caps.canManage) params.set("employeeId", f.employeeId);

    fetch(`/api/finance/advances?${params.toString()}`, { signal: ac.signal })
      .then(async (res) => {
        const json = await res.json() as ApiResponse;
        if (!res.ok || !json.success) throw new Error("Failed to load advances");
        setSummary(json.data.summary);
        setAdvances(json.data.advances);
        setPagination(json.data.pagination);
      })
      .catch((e: Error) => { if (e.name !== "AbortError") setError(e.message); })
      .finally(() => setLoading(false));
  }, [caps.canManage]);

  useEffect(() => {
    fetchData(appliedFilters, currentPage);
    return () => { abortRef.current?.abort(); };
  }, [fetchData, appliedFilters, currentPage]);

  function applyFilters() {
    setCurrentPage(1);
    setApplied({ ...filters });
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setCurrentPage(1);
    setApplied(EMPTY_FILTERS);
  }

  // ── Toast helper ───────────────────────────────────────────────────────────
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  // ── Create advance ─────────────────────────────────────────────────────────
  async function submitCreate() {
    setFormError(null);
    if (!form.purpose.trim())  { setFormError("Purpose is required."); return; }
    const amt = Number(form.amountLakhs);
    if (!form.amountLakhs || isNaN(amt) || amt <= 0) { setFormError("Amount must be a positive number."); return; }

    setCreating(true);
    try {
      const res = await fetch("/api/finance/advances", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          category:      form.category,
          purpose:       form.purpose.trim(),
          amountLakhs:   amt,
          requiredByDate: form.requiredByDate || undefined,
          remarks:       form.remarks.trim() || undefined,
        }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to create advance");
      setShowForm(false);
      setForm(EMPTY_FORM);
      showToast("Advance request submitted successfully.");
      fetchData(appliedFilters, currentPage);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setCreating(false);
    }
  }

  // ── Approval action ────────────────────────────────────────────────────────
  async function submitAction() {
    if (!viewItem?.approvalRequestId || !actionMode) return;
    if ((actionMode === "reject" || actionMode === "return") && !actionRemarks.trim()) {
      setActionError("Remarks are required for this action.");
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/approvals/${viewItem.approvalRequestId}/action`, {
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
      setViewItem(null);
      setActionMode(null);
      setActionRemarks("");
      fetchData(appliedFilters, currentPage);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  function closeDrawer() {
    setViewItem(null);
    setActionMode(null);
    setActionRemarks("");
    setActionError(null);
  }

  // ── KPI cards ──────────────────────────────────────────────────────────────
  const KPI_CARDS = summary ? [
    { label: "Total This Month",  value: fmtLakhs(summary.totalThisMonth),  sub: "requested",          icon: CircleDollarSign, color: "var(--fg-2)"           },
    { label: "Pending Approval",  value: fmtLakhs(summary.pendingApproval), sub: `${summary.pendingCount} request${summary.pendingCount !== 1 ? "s" : ""}`, icon: Clock,            color: "var(--caveo-orange, #E67E22)" },
    { label: "Approved",          value: fmtLakhs(summary.approved),        sub: `${summary.approvedCount} request${summary.approvedCount !== 1 ? "s" : ""}`, icon: ThumbsUp,         color: "var(--fg-success, #27AE60)"  },
    { label: "Outstanding",       value: fmtLakhs(summary.outstanding),     sub: `${summary.outstandingCount} disbursed`,                                      icon: Wallet,           color: "var(--caveo-red)"            },
    { label: "Settled",           value: fmtLakhs(summary.settled),         sub: "fully settled",       icon: ThumbsDown,       color: "var(--fg-3)"           },
    { label: "Rejected",          value: fmtLakhs(summary.rejected),        sub: "not approved",        icon: X,                color: "var(--fg-danger, #C0392B)" },
  ] : [];

  // ── Derived: can act on approval in drawer ─────────────────────────────────
  const canActOnDrawerItem =
    viewItem !== null &&
    viewItem.status === "pending" &&
    viewItem.approvalRequestId !== null &&
    caps.canApprove;

  // ─────────────────────────────────────────────────────────────────────────
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
          {caps.scope === "all"
            ? "Viewing all employee advances"
            : "Viewing your advance requests"}
        </div>
        <button
          className="btn-cav btn-cav-primary"
          style={{ display: "flex", alignItems: "center", gap: 6 }}
          onClick={() => { setShowForm(true); setForm(EMPTY_FORM); setFormError(null); }}
        >
          <Plus size={15} /> Request Advance
        </button>
      </div>

      {/* KPI cards */}
      {loading && !summary ? (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ flex: "1 1 160px", minWidth: 140, height: 84, borderRadius: 10, background: "var(--bg-2)", animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      ) : summary ? (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {KPI_CARDS.map((c) => (
            <div key={c.label} style={{
              flex: "1 1 160px", minWidth: 140,
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
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 160px", minWidth: 140 }}>
          <label style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 500 }}>From</label>
          <input type="date" className="input-cav" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 160px", minWidth: 140 }}>
          <label style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 500 }}>To</label>
          <input type="date" className="input-cav" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 140px", minWidth: 130 }}>
          <label style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 500 }}>Status</label>
          <select className="input-cav" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">All Statuses</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="disbursed">Disbursed</option>
            <option value="settled">Settled</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 150px", minWidth: 140 }}>
          <label style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 500 }}>Category</label>
          <select className="input-cav" value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}>
            <option value="">All Categories</option>
            {ADVANCE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "2 1 200px", minWidth: 160 }}>
          <label style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 500 }}>Search Purpose</label>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-3)" }} />
            <input
              type="text" className="input-cav" placeholder="Search purpose…"
              value={filters.search}
              style={{ paddingLeft: 30 }}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") applyFilters(); }}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignSelf: "flex-end" }}>
          <button className="btn-cav btn-cav-primary" onClick={applyFilters} style={{ height: 34, padding: "0 14px", fontSize: 13 }}>Apply</button>
          <button className="btn-cav" onClick={clearFilters} style={{ height: 34, padding: "0 10px", fontSize: 13 }} title="Clear filters">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--bg-danger-muted, #fdecea)", border: "1px solid var(--caveo-red)", borderRadius: 8, color: "var(--caveo-red)", fontSize: 13 }}>
          <AlertCircle size={16} />
          {error}
          <button style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--caveo-red)", fontSize: 12 }} onClick={() => fetchData(appliedFilters, currentPage)}>
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-2)" }}>
            Advance Register
            {!loading && <span style={{ marginLeft: 8, color: "var(--fg-4)", fontWeight: 400 }}>({pagination.total})</span>}
          </span>
          {loading && <Loader2 size={14} style={{ animation: "spin 1s linear infinite", color: "var(--fg-3)" }} />}
        </div>

        {loading && advances.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
            <Loader2 size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
            Loading advances…
          </div>
        ) : advances.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <Wallet size={36} strokeWidth={1.2} style={{ color: "var(--fg-4)", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-3)", marginBottom: 6 }}>No advances found</div>
            <div style={{ fontSize: 12, color: "var(--fg-4)" }}>
              {Object.values(appliedFilters).some(Boolean)
                ? "Try adjusting your filters."
                : "Request an advance using the button above."}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg-2)" }}>
                  {["Advance No", caps.scope === "all" ? "Employee" : null, "Category", "Purpose", "Amount", "Request Date", "Required By", "Status", "Balance", ""].filter(Boolean).map((h) => (
                    <th key={h!} style={{ padding: "9px 14px", textAlign: "left", fontWeight: 600, color: "var(--fg-3)", fontSize: 11, whiteSpace: "nowrap", borderBottom: "1px solid var(--border-1)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {advances.map((a, i) => (
                  <tr
                    key={a.id}
                    style={{ borderTop: i > 0 ? "1px solid var(--border-1)" : undefined, cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover, var(--bg-2))")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    onClick={() => { setViewItem(a); setActionMode(null); setActionRemarks(""); setActionError(null); }}
                  >
                    <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12, color: "var(--fg-2)", whiteSpace: "nowrap" }}>{a.advanceNo}</td>
                    {caps.scope === "all" && <td style={{ padding: "10px 14px", color: "var(--fg-2)", whiteSpace: "nowrap" }}>{a.employeeName}</td>}
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      <span className={`badge ${categoryBadge(a.category)}`} style={{ fontSize: 11 }}>{a.category}</span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--fg-2)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.purpose}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--fg-1)", whiteSpace: "nowrap" }}>{fmtLakhs(a.amountLakhs)}</td>
                    <td style={{ padding: "10px 14px", color: "var(--fg-3)", whiteSpace: "nowrap" }}>{a.requestDate}</td>
                    <td style={{ padding: "10px 14px", color: "var(--fg-3)", whiteSpace: "nowrap" }}>{a.requiredByDate ?? "—"}</td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      <span className={`badge ${statusBadge(a.status)}`} style={{ fontSize: 11 }}>{statusLabel(a.status)}</span>
                    </td>
                    <td style={{ padding: "10px 14px", color: Number(a.balanceLakhs) > 0 ? "var(--caveo-red)" : "var(--fg-4)", fontWeight: Number(a.balanceLakhs) > 0 ? 600 : 400, whiteSpace: "nowrap" }}>
                      {Number(a.balanceLakhs) > 0 ? fmtLakhs(a.balanceLakhs) : "—"}
                    </td>
                    <td style={{ padding: "10px 14px" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-cav"
                        style={{ padding: "4px 8px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                        onClick={() => { setViewItem(a); setActionMode(null); setActionRemarks(""); setActionError(null); }}
                      >
                        <Eye size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ fontSize: 12, color: "var(--fg-3)" }}>
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} records
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn-cav" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)} style={{ padding: "4px 10px", fontSize: 12 }}>
                ← Prev
              </button>
              <button className="btn-cav" disabled={currentPage >= pagination.totalPages} onClick={() => setCurrentPage((p) => p + 1)} style={{ padding: "4px 10px", fontSize: 12 }}>
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Drawer ──────────────────────────────────────────────────────── */}
      {viewItem && (
        <>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000 }}
            onClick={closeDrawer}
          />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: "min(520px, 95vw)",
            background: "var(--bg-0, #fff)", zIndex: 1001,
            display: "flex", flexDirection: "column",
            boxShadow: "-4px 0 32px rgba(0,0,0,0.15)",
          }}>
            {/* Drawer header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-1)" }}>{viewItem.advanceNo}</div>
                <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>{viewItem.employeeName}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className={`badge ${statusBadge(viewItem.status)}`}>{statusLabel(viewItem.status)}</span>
                <button onClick={closeDrawer} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-3)", display: "flex", alignItems: "center" }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Drawer body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`badge ${categoryBadge(viewItem.category)}`}>{viewItem.category}</span>
              </div>
              <FieldGrid items={[
                { label: "Purpose",     value: viewItem.purpose },
                { label: "Amount",      value: fmtLakhs(viewItem.amountLakhs) },
                { label: "Request Date",value: viewItem.requestDate },
                { label: "Required By", value: viewItem.requiredByDate ?? "Not specified" },
                { label: "Remarks",     value: viewItem.remarks || "—" },
              ]} />

              {(viewItem.approvedByName || viewItem.disbursedDate || viewItem.settledDate) && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-3)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Disbursement & Settlement</div>
                  <FieldGrid items={[
                    { label: "Approved By",     value: viewItem.approvedByName   ?? "—" },
                    { label: "Approved At",      value: viewItem.approvedAt       ?? "—" },
                    { label: "Disbursed Date",   value: viewItem.disbursedDate    ?? "—" },
                    { label: "Disbursed Amount", value: viewItem.disbursedAmountLakhs ? fmtLakhs(viewItem.disbursedAmountLakhs) : "—" },
                    { label: "Disburse From",    value: viewItem.disbursedFromType || "—" },
                    { label: "Settled Date",     value: viewItem.settledDate      ?? "—" },
                    { label: "Settled Amount",   value: viewItem.settledAmountLakhs ? fmtLakhs(viewItem.settledAmountLakhs) : "—" },
                    { label: "Outstanding Balance", value: Number(viewItem.balanceLakhs) > 0 ? fmtLakhs(viewItem.balanceLakhs) : "Nil" },
                  ]} />
                </div>
              )}

              {/* Approval section */}
              <div style={{ marginTop: 20, padding: 14, background: "var(--bg-2)", borderRadius: 8, border: "1px solid var(--border-1)" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Approval Workflow</div>
                {viewItem.approvalRequestId ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontSize: 12, color: "var(--fg-2)" }}>
                      Request #{viewItem.approvalRequestId} ·{" "}
                      <span className={viewItem.approvalStatus === "PENDING" ? "badge badge-warning" : "badge badge-neutral"} style={{ fontSize: 11 }}>
                        {viewItem.approvalStatus ?? "—"}
                      </span>
                    </div>
                    <a href="/approvals" style={{ fontSize: 12, color: "var(--caveo-red)", display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
                      View in Inbox <ExternalLink size={11} />
                    </a>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--fg-4)" }}>
                    No approval workflow configured. Set up an{" "}
                    <a href="/settings/workflow/approval-engine" style={{ color: "var(--caveo-red)" }}>ADVANCE_APPROVAL</a>
                    {" "}workflow to enable approvals.
                  </div>
                )}
              </div>

              {/* Approval action buttons */}
              {canActOnDrawerItem && !actionMode && (
                <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="btn-cav"
                    style={{ flex: 1, minWidth: 100, padding: "8px 12px", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "var(--fg-success, #27AE60)", color: "#fff", border: "none", borderRadius: 6 }}
                    onClick={() => setActionMode("approve")}
                  >
                    <ThumbsUp size={13} /> Approve
                  </button>
                  <button
                    className="btn-cav"
                    style={{ flex: 1, minWidth: 100, padding: "8px 12px", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "var(--caveo-red)", color: "#fff", border: "none", borderRadius: 6 }}
                    onClick={() => setActionMode("reject")}
                  >
                    <ThumbsDown size={13} /> Reject
                  </button>
                  <button
                    className="btn-cav"
                    style={{ flex: 1, minWidth: 100, padding: "8px 12px", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    onClick={() => setActionMode("return")}
                  >
                    <Undo2 size={13} /> Return
                  </button>
                </div>
              )}

              {canActOnDrawerItem && actionMode && (
                <div style={{ marginTop: 16, padding: 14, background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    {actionMode === "approve" ? <ThumbsUp size={14} /> : actionMode === "reject" ? <ThumbsDown size={14} /> : <Undo2 size={14} />}
                    {actionMode === "approve" ? "Confirm Approval" : actionMode === "reject" ? "Confirm Rejection" : "Return for Changes"}
                  </div>
                  {(actionMode === "reject" || actionMode === "return") && (
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 500, marginBottom: 4, display: "block" }}>
                        Remarks <span style={{ color: "var(--caveo-red)" }}>*</span>
                      </label>
                      <textarea
                        className="input-cav"
                        rows={3}
                        placeholder="Provide reason…"
                        value={actionRemarks}
                        onChange={(e) => setActionRemarks(e.target.value)}
                        style={{ width: "100%", resize: "vertical", fontSize: 13 }}
                      />
                    </div>
                  )}
                  {actionMode === "approve" && (
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 500, marginBottom: 4, display: "block" }}>
                        Remarks (optional)
                      </label>
                      <textarea
                        className="input-cav"
                        rows={2}
                        placeholder="Add a note…"
                        value={actionRemarks}
                        onChange={(e) => setActionRemarks(e.target.value)}
                        style={{ width: "100%", resize: "vertical", fontSize: 13 }}
                      />
                    </div>
                  )}
                  {actionError && (
                    <div style={{ fontSize: 12, color: "var(--caveo-red)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <AlertCircle size={13} /> {actionError}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn-cav btn-cav-primary"
                      disabled={actionLoading}
                      onClick={() => { void submitAction(); }}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                      {actionLoading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : null}
                      Confirm
                    </button>
                    <button
                      className="btn-cav"
                      disabled={actionLoading}
                      onClick={() => { setActionMode(null); setActionRemarks(""); setActionError(null); }}
                      style={{ padding: "0 16px" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Disabled finance actions */}
              {caps.canManage && (
                <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ position: "relative", flex: 1, minWidth: 120 }} title="Disbursement API will be enabled in Phase 6">
                    <button
                      className="btn-cav"
                      disabled
                      style={{ width: "100%", padding: "8px 12px", fontSize: 13, opacity: 0.45, cursor: "not-allowed" }}
                    >
                      Disburse
                    </button>
                  </div>
                  <div style={{ position: "relative", flex: 1, minWidth: 120 }} title="Settlement API will be enabled in Phase 6">
                    <button
                      className="btn-cav"
                      disabled
                      style={{ width: "100%", padding: "8px 12px", fontSize: 13, opacity: 0.45, cursor: "not-allowed" }}
                    >
                      Mark Settled
                    </button>
                  </div>
                </div>
              )}

              {caps.canManage && (
                <p style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 8, textAlign: "center" }}>
                  Disbursement and settlement will be enabled in Phase 6.
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Request Advance Drawer ─────────────────────────────────────────────── */}
      {showForm && (
        <>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000 }}
            onClick={() => { setShowForm(false); }}
          />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: "min(460px, 95vw)",
            background: "var(--bg-0, #fff)", zIndex: 1001,
            display: "flex", flexDirection: "column",
            boxShadow: "-4px 0 32px rgba(0,0,0,0.15)",
          }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-1)" }}>Request Advance</div>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-3)", display: "flex", alignItems: "center" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6, display: "block" }}>
                  Category <span style={{ color: "var(--caveo-red)" }}>*</span>
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {ADVANCE_CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, category: c }))}
                      style={{
                        padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                        border: form.category === c ? "2px solid var(--caveo-red)" : "1px solid var(--border-1)",
                        background: form.category === c ? "var(--caveo-red)" : "var(--bg-2)",
                        color: form.category === c ? "#fff" : "var(--fg-2)",
                        fontWeight: form.category === c ? 600 : 400,
                        transition: "all 0.15s",
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6, display: "block" }}>
                  Purpose <span style={{ color: "var(--caveo-red)" }}>*</span>
                </label>
                <textarea
                  className="input-cav"
                  rows={3}
                  placeholder="Describe the purpose of the advance…"
                  value={form.purpose}
                  onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
                  style={{ width: "100%", resize: "vertical", fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6, display: "block" }}>
                  Amount (₹ Lakhs) <span style={{ color: "var(--caveo-red)" }}>*</span>
                </label>
                <input
                  type="number" className="input-cav" min="0.01" step="0.01"
                  placeholder="e.g. 0.50 for ₹50,000"
                  value={form.amountLakhs}
                  onChange={(e) => setForm((f) => ({ ...f, amountLakhs: e.target.value }))}
                  style={{ width: "100%", fontSize: 13 }}
                />
                {form.amountLakhs && Number(form.amountLakhs) > 0 && (
                  <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>
                    = {fmtLakhs(Number(form.amountLakhs).toFixed(2))}
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6, display: "block" }}>
                  Required By Date
                </label>
                <input
                  type="date" className="input-cav"
                  value={form.requiredByDate}
                  onChange={(e) => setForm((f) => ({ ...f, requiredByDate: e.target.value }))}
                  style={{ width: "100%", fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6, display: "block" }}>
                  Remarks
                </label>
                <textarea
                  className="input-cav"
                  rows={2}
                  placeholder="Any additional notes…"
                  value={form.remarks}
                  onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                  style={{ width: "100%", resize: "vertical", fontSize: 13 }}
                />
              </div>
              {formError && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "var(--bg-danger-muted, #fdecea)", border: "1px solid var(--caveo-red)", borderRadius: 6, color: "var(--caveo-red)", fontSize: 12 }}>
                  <AlertCircle size={14} /> {formError}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  className="btn-cav btn-cav-primary"
                  disabled={creating}
                  onClick={() => { void submitCreate(); }}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0" }}
                >
                  {creating ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={14} />}
                  Submit Request
                </button>
                <button
                  className="btn-cav"
                  disabled={creating}
                  onClick={() => setShowForm(false)}
                  style={{ padding: "0 20px" }}
                >
                  Cancel
                </button>
              </div>
              <p style={{ fontSize: 11, color: "var(--fg-4)", textAlign: "center" }}>
                Advance will be submitted for approval via the configured workflow.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-component: field grid ──────────────────────────────────────────────────

function FieldGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
      {items.map((it) => (
        <div key={it.label} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 500 }}>{it.label}</span>
          <span style={{ fontSize: 13, color: "var(--fg-1)", wordBreak: "break-word" }}>{it.value || "—"}</span>
        </div>
      ))}
    </div>
  );
}
