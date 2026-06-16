"use client";

/**
 * Voucher Management UI — Step 2O: wired to live read-only APIs.
 *
 *   GET /api/finance/vouchers            → list + summary + pagination
 *   GET /api/finance/vouchers/[id]       → full detail (drawer)
 *   GET /api/finance/voucher-sequences   → numbering status panel
 *
 * Write / PDF / Tally actions remain gated (disabled until later phases).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle, BarChart3, BookOpen, ChevronLeft, ChevronRight,
  CircleDollarSign, Clock, Download, Eye, FileCheck, FileText,
  Loader2, Printer, RefreshCw, Search, Settings, X, XCircle,
} from "lucide-react";
import type { VoucherCaps } from "./page";

// ─────────────────────────────────────────────────────────────────────────────
// API types (match the actual GET /api/finance/vouchers response shapes)
// ─────────────────────────────────────────────────────────────────────────────

interface ApiVoucher {
  id:                string;
  voucherDate:       string;          // "YYYY-MM-DD"
  voucherNumber:     string;          // "CI/26-27/000001"
  voucherType:       string;          // "PAYMENT" | "RECEIPT" | "JOURNAL" | "EXPENSE" | "EMPLOYEE_CLAIM" | "EMPLOYEE_ADVANCE"
  referenceNumber:   string | null;
  referenceType:     string | null;
  partyName:         string | null;
  paymentMode:       string | null;
  accountName:       string | null;
  amount:            string;          // ₹ Lakhs as string, e.g. "1.25"
  status:            string;          // "DRAFT" | "APPROVED" | "CANCELLED"
  tallyExportStatus: string;          // "NOT_EXPORTED" | "EXPORT_PENDING" | "EXPORTED" | "FAILED"
  createdBy:         string;
  createdAt:         string;          // ISO
}

interface ApiSummary {
  totalVouchersThisMonth: number;
  pendingVouchers:        number;
  approvedVouchers:       number;
  cancelledVouchers:      number;
  paymentVouchers:        number;
  receiptVouchers:        number;
  totalVoucherAmount:     string;     // money string
  tallyExportPending:     number;
}

interface ApiListResponse {
  success: boolean;
  data: {
    summary:    ApiSummary;
    vouchers:   ApiVoucher[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  };
}

// Detail response shape (GET /api/finance/vouchers/[id])
interface ApiApprovalEvent {
  event:    string;
  by:       string;
  at:       string;
  status:   string;
  comments: string | null;
}

interface ApiAuditEvent {
  action:      string;
  performedBy: string;
  at:          string;
  changes:     unknown;
  notes:       string | null;
}

interface ApiVoucherDetail {
  voucher: {
    id:            string;
    voucherNumber: string;
    voucherDate:   string;
    voucherType:   string;
    status:        string;
    amount:        string;
    amountInWords: string;
    narration:     string | null;
    paymentMode:   string | null;
    pdfAvailable:  boolean;
    voidedAt:      string | null;
    voidReason:    string | null;
    createdBy:     string;
    createdAt:     string;
    updatedAt:     string;
  };
  reference: {
    referenceType:   string | null;
    referenceId:     string | null;
    referenceNumber: string | null;
    expenseNumber:   string | null;
    advanceNumber:   string | null;
    claimNumber:     string | null;
  };
  party: {
    customer: null;
    vendor:   { id: string; name: string; gstin: string | null } | null;
    employee: { id: string; name: string } | null;
  };
  accounting: {
    debitLedger:  string | null;
    creditLedger: string | null;
    accountName:  string | null;
    costCenter:   null;
    branchName:   string | null;
    gstDetails:   null;
  };
  payment: {
    paymentMode:   string | null;
    chequeNumber:  string | null;
    upiReference:  null;
    bankReference: string | null;
    cashAccount:   string | null;
    bankAccount:   string | null;
    payee:         string | null;
  };
  documents: {
    attachments:         unknown[];
    voucherPdfAvailable: boolean;
    voucherPdfUrl:       string | null;
  };
  approval: {
    approvalStatus:  string;
    approvalHistory: ApiApprovalEvent[];
  };
  audit: {
    createdBy:    string;
    createdAt:    string;
    modifiedBy:   null;
    cancelledBy:  null;
    cancelReason: string | null;
    history:      ApiAuditEvent[];
  };
  tallyExport: {
    status:     string;
    exportedAt: null;
    exportRef:  null;
  };
}

interface ApiDetailResponse {
  success: boolean;
  data:    ApiVoucherDetail;
}

// Sequence response (GET /api/finance/voucher-sequences)
interface ApiSequence {
  id:            number;
  financialYear: string;
  lastNumber:    number;
  nextNumber:    number;
  formatPreview: string;
  status:        string; // "ACTIVE" | "INACTIVE" | "PENDING_INIT"
  updatedAt:     string;
}

interface ApiSequenceResponse {
  success: boolean;
  data: { sequences: ApiSequence[] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Display metadata maps (uppercase API values)
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; badge: string }> = {
  PAYMENT:          { label: "Payment Voucher",     badge: "badge-accent"  },
  RECEIPT:          { label: "Receipt Voucher",     badge: "badge-success" },
  JOURNAL:          { label: "Journal Voucher",     badge: "badge-info"    },
  EXPENSE:          { label: "Expense Voucher",     badge: "badge-warning" },
  EMPLOYEE_CLAIM:   { label: "Conveyance Voucher",  badge: "badge-neutral" },
  EMPLOYEE_ADVANCE: { label: "Advance Voucher",     badge: "badge-accent"  },
};

const STATUS_META: Record<string, { label: string; badge: string }> = {
  DRAFT:     { label: "Draft",     badge: "badge-neutral" },
  APPROVED:  { label: "Approved",  badge: "badge-success" },
  CANCELLED: { label: "Cancelled", badge: "badge-danger"  },
};

const TALLY_META: Record<string, { label: string; color: string }> = {
  NOT_EXPORTED:   { label: "Not Exported",   color: "var(--fg-4)"                  },
  EXPORT_PENDING: { label: "Export Pending", color: "var(--caveo-orange, #E67E22)" },
  EXPORTED:       { label: "Exported",       color: "var(--fg-success, #27AE60)"   },
  FAILED:         { label: "Export Failed",  color: "var(--fg-danger, #C0392B)"    },
};

function typeLabel(t: string)  { return TYPE_META[t]?.label   ?? t; }
function typeBadge(t: string)  { return TYPE_META[t]?.badge   ?? "badge-neutral"; }
function statusLabel(s: string){ return STATUS_META[s]?.label ?? s; }
function statusBadge(s: string){ return STATUS_META[s]?.badge ?? "badge-neutral"; }

// ─────────────────────────────────────────────────────────────────────────────
// Money helpers — amounts stored as ₹ Lakhs strings, displayed as ₹ rupees
// ─────────────────────────────────────────────────────────────────────────────

function lakhsToRupees(s: string): number {
  return Math.round(Number(s) * 100_000 * 100) / 100;
}

function fmtINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);
}

function fmtLakhs(s: string): string { return fmtINR(lakhsToRupees(s)); }

// ─────────────────────────────────────────────────────────────────────────────
// Filter state
// ─────────────────────────────────────────────────────────────────────────────

interface Filters {
  dateFrom:    string;
  dateTo:      string;
  voucherType: string;
  status:      string;
}

const EMPTY_FILTERS: Filters = { dateFrom: "", dateTo: "", voucherType: "", status: "" };

// ─────────────────────────────────────────────────────────────────────────────
// Gating messages (write / PDF / Tally not yet implemented)
// ─────────────────────────────────────────────────────────────────────────────

const GATE_MSG  = "This action will be enabled after Voucher write/export APIs are implemented.";
const PDF_MSG   = "Voucher PDF generation will be enabled after the Voucher PDF API is implemented.";
const TALLY_MSG = "Tally export will be enabled after Tally export APIs are implemented.";

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function VouchersClient({ caps }: { caps: VoucherCaps }) {
  // ── List data ──────────────────────────────────────────────────────────────
  const [summary,    setSummary]    = useState<ApiSummary | null>(null);
  const [vouchers,   setVouchers]   = useState<ApiVoucher[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [filters,     setFilters]  = useState<Filters>(EMPTY_FILTERS);
  const [applied,     setApplied]  = useState<Filters>(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Detail drawer ──────────────────────────────────────────────────────────
  const [viewItem,     setViewItem]     = useState<ApiVoucher | null>(null);
  const [detail,       setDetail]       = useState<ApiVoucherDetail | null>(null);
  const [detailLoading,setDetailLoading]= useState(false);
  const [detailError,  setDetailError]  = useState<string | null>(null);

  // ── Sequence panel ─────────────────────────────────────────────────────────
  const [sequences,     setSequences]     = useState<ApiSequence[]>([]);
  const [seqLoading,    setSeqLoading]    = useState(true);
  const [seqError,      setSeqError]      = useState<string | null>(null);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ msg: string; kind?: "info" | "warn" } | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch list ─────────────────────────────────────────────────────────────
  const fetchList = useCallback((f: Filters, search: string, page: number) => {
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError(null);

    const p = new URLSearchParams();
    p.set("page",     String(page));
    p.set("pageSize", String(25));
    if (f.dateFrom)    p.set("dateFrom",      f.dateFrom);
    if (f.dateTo)      p.set("dateTo",        f.dateTo);
    if (f.voucherType) p.set("voucherType",   f.voucherType);
    if (f.status)      p.set("voucherStatus", f.status);
    if (search)        p.set("search",        search);

    fetch(`/api/finance/vouchers?${p}`, { signal: ac.signal })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          setError("You don't have permission to view vouchers.");
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ApiListResponse;
        if (!json.success) throw new Error("Unexpected API response");
        setSummary(json.data.summary);
        setVouchers(json.data.vouchers);
        setPagination(json.data.pagination);
      })
      .catch((e: Error) => {
        if (e.name === "AbortError") return;
        setError("Unable to load voucher data. Please try again.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchList(applied, debouncedSearch, currentPage);
    return () => { abortRef.current?.abort(); };
  }, [fetchList, applied, debouncedSearch, currentPage]);

  // ── Debounced search ───────────────────────────────────────────────────────
  function handleSearchInput(v: string) {
    setSearchInput(v);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearch(v);
    }, 400);
  }

  function applyFilters() { setCurrentPage(1); setApplied({ ...filters }); }
  function clearFilters()  {
    setFilters(EMPTY_FILTERS);
    setSearchInput("");
    setCurrentPage(1);
    setApplied(EMPTY_FILTERS);
    setDebouncedSearch("");
  }

  // ── Fetch detail ───────────────────────────────────────────────────────────
  function openDrawer(v: ApiVoucher) {
    setViewItem(v);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);

    fetch(`/api/finance/vouchers/${v.id}`)
      .then(async (res) => {
        if (res.status === 404) { setDetailError("Voucher not found."); return; }
        if (res.status === 401 || res.status === 403) { setDetailError("Permission denied."); return; }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ApiDetailResponse;
        if (!json.success) throw new Error("Unexpected API response");
        setDetail(json.data);
      })
      .catch(() => setDetailError("Unable to load voucher details. Please try again."))
      .finally(() => setDetailLoading(false));
  }

  // ── Fetch sequences ────────────────────────────────────────────────────────
  useEffect(() => {
    setSeqLoading(true);
    fetch("/api/finance/voucher-sequences")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ApiSequenceResponse;
        if (!json.success) throw new Error("Unexpected API response");
        setSequences(json.data.sequences);
      })
      .catch(() => setSeqError("Unable to load numbering status."))
      .finally(() => setSeqLoading(false));
  }, []);

  function showToast(msg: string, kind: "info" | "warn" = "info") {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 4000);
  }
  function gatedAction(msg = GATE_MSG) { showToast(msg, "warn"); }

  // ── KPI cards ──────────────────────────────────────────────────────────────
  const KPI_CARDS = [
    { label: "Total This Month",     value: summary ? String(summary.totalVouchersThisMonth) : "0",         sub: "this month",          icon: CircleDollarSign, color: "var(--fg-2)"                   },
    { label: "Pending",              value: summary ? String(summary.pendingVouchers)         : "0",         sub: "draft / pending",     icon: Clock,            color: "var(--caveo-orange, #E67E22)"  },
    { label: "Approved",             value: summary ? String(summary.approvedVouchers)        : "0",         sub: "approved vouchers",   icon: FileCheck,        color: "var(--fg-success, #27AE60)"    },
    { label: "Cancelled",            value: summary ? String(summary.cancelledVouchers)       : "0",         sub: "voided / cancelled",  icon: XCircle,          color: "var(--fg-danger, #C0392B)"     },
    { label: "Payment Vouchers",     value: summary ? String(summary.paymentVouchers)         : "0",         sub: "cash / bank payment", icon: BookOpen,         color: "var(--caveo-red)"              },
    { label: "Receipt Vouchers",     value: summary ? String(summary.receiptVouchers)         : "0",         sub: "cash / bank receipt", icon: BarChart3,        color: "var(--fg-accent, #2980B9)"     },
    { label: "Total Amount",         value: summary ? fmtLakhs(summary.totalVoucherAmount)    : "₹0.00",     sub: "all vouchers",        icon: CircleDollarSign, color: "var(--fg-3)"                   },
    { label: "Tally Export Pending", value: summary ? String(summary.tallyExportPending)      : "0",         sub: "not yet exported",    icon: FileText,         color: "var(--fg-3)"                   },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "0 0 40px" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          background: toast.kind === "warn" ? "var(--caveo-orange, #E67E22)" : "var(--fg-success, #27AE60)",
          color: "#fff", borderRadius: 8, padding: "12px 20px", fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 16px rgba(0,0,0,0.18)", maxWidth: 420,
        }}>
          {toast.msg}
        </div>
      )}

      {/* Sequence / numbering status */}
      <VoucherSequencePanel
        sequences={sequences}
        loading={seqLoading}
        error={seqError}
        onGatedAction={gatedAction}
      />

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13, color: "var(--fg-3)" }}>
          {caps.roleLabel} — Viewing voucher register
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn-cav btn-cav-ghost"
            title={TALLY_MSG}
            onClick={() => gatedAction(TALLY_MSG)}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
          >
            <Download size={13} /> Tally Export
          </button>
          <button
            title={GATE_MSG}
            onClick={() => gatedAction()}
            className="btn-cav btn-cav-primary"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
          >
            + Generate Voucher
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
      ) : (
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
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--fg-1)", letterSpacing: "-0.3px" }}>
                {c.value}
              </div>
              <div style={{ fontSize: 11, color: "var(--fg-4)" }}>{c.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end",
        padding: "14px 16px",
        background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: 10,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 140px", minWidth: 120 }}>
          <label style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 500 }}>From</label>
          <input type="date" className="input-cav" value={filters.dateFrom}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 140px", minWidth: 120 }}>
          <label style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 500 }}>To</label>
          <input type="date" className="input-cav" value={filters.dateTo}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 150px", minWidth: 140 }}>
          <label style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 500 }}>Voucher Type</label>
          <select className="input-cav" value={filters.voucherType}
            onChange={(e) => setFilters((f) => ({ ...f, voucherType: e.target.value }))}>
            <option value="">All Types</option>
            <option value="PAYMENT">Payment Voucher</option>
            <option value="RECEIPT">Receipt Voucher</option>
            <option value="JOURNAL">Journal Voucher</option>
            <option value="EXPENSE">Expense Voucher</option>
            <option value="EMPLOYEE_CLAIM">Conveyance Voucher</option>
            <option value="EMPLOYEE_ADVANCE">Advance Voucher</option>
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 140px", minWidth: 120 }}>
          <label style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 500 }}>Status</label>
          <select className="input-cav" value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="APPROVED">Approved</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "2 1 200px", minWidth: 180 }}>
          <label style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 500 }}>Search</label>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-4)" }} />
            <input
              type="text" className="input-cav"
              placeholder="Voucher no, narration, party…"
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { clearTimeout(searchTimerRef.current!); setCurrentPage(1); setDebouncedSearch(searchInput); } }}
              style={{ paddingLeft: 30 }}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignSelf: "flex-end", paddingBottom: 1 }}>
          <button className="btn-cav btn-cav-primary" onClick={applyFilters} style={{ whiteSpace: "nowrap" }}>Apply</button>
          <button className="btn-cav btn-cav-ghost"   onClick={clearFilters}><RefreshCw size={13} /></button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", borderRadius: 8, fontSize: 13,
          background: "var(--bg-danger-muted, #fdecea)",
          border: "1px solid var(--caveo-red)", color: "var(--caveo-red)",
        }}>
          <AlertCircle size={15} />
          <span>{error}</span>
          <button onClick={() => fetchList(applied, debouncedSearch, currentPage)}
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
            <RefreshCw size={13} />
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-2)" }}>
            Voucher Register
            {!loading && (
              <span style={{ marginLeft: 8, color: "var(--fg-4)", fontWeight: 400 }}>({pagination.total})</span>
            )}
          </span>
          {loading && <Loader2 size={14} style={{ animation: "spin 1s linear infinite", color: "var(--fg-3)" }} />}
        </div>

        {loading && vouchers.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
            <Loader2 size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px", display: "block" }} />
            Loading vouchers…
          </div>
        ) : !loading && vouchers.length === 0 ? (
          <div style={{ padding: "64px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <FileText size={40} strokeWidth={1.2} style={{ color: "var(--fg-4)" }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-2)" }}>No vouchers created</div>
            <div style={{ fontSize: 13, color: "var(--fg-4)", maxWidth: 420, lineHeight: 1.6 }}>
              Approved expenses, advances, claims, and payments will appear here once voucher generation is enabled.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                className="btn-cav btn-cav-ghost"
                style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => gatedAction()}
              >
                <Settings size={13} /> Configure Number Series
              </button>
              <a href="/finance/expenses" className="btn-cav btn-cav-ghost"
                style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
                <Eye size={13} /> View Expense Register
              </a>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg-2)" }}>
                  {["Date","Voucher No","Type","Reference","Party","Mode","Account","Amount","Status","Tally",""].map((h) => (
                    <th key={h} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v, idx) => (
                  <tr
                    key={v.id}
                    style={{ borderTop: idx > 0 ? "1px solid var(--border-1)" : undefined, cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--bg-hover, var(--bg-2))")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
                    onClick={() => openDrawer(v)}
                  >
                    <td style={TD}>{v.voucherDate}</td>
                    <td style={{ ...TD, fontFamily: "monospace", fontSize: 12, color: "var(--fg-2)", whiteSpace: "nowrap" }}>{v.voucherNumber}</td>
                    <td style={TD}>
                      <span className={`badge ${typeBadge(v.voucherType)}`} style={{ fontSize: 11 }}>
                        {typeLabel(v.voucherType)}
                      </span>
                    </td>
                    <td style={{ ...TD, fontSize: 12, color: "var(--fg-3)", whiteSpace: "nowrap" }}>
                      {v.referenceNumber ?? "—"}
                    </td>
                    <td style={{ ...TD, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {v.partyName ?? "—"}
                    </td>
                    <td style={{ ...TD, fontSize: 12, color: "var(--fg-3)" }}>{v.paymentMode ?? "—"}</td>
                    <td style={{ ...TD, fontSize: 12, color: "var(--fg-3)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {v.accountName ?? "—"}
                    </td>
                    <td style={{ ...TD, fontWeight: 600, whiteSpace: "nowrap" }}>{fmtLakhs(v.amount)}</td>
                    <td style={TD}>
                      <span className={`badge ${statusBadge(v.status)}`} style={{ fontSize: 11 }}>
                        {statusLabel(v.status)}
                      </span>
                    </td>
                    <td style={TD}>
                      <TallyBadge status={v.tallyExportStatus} />
                    </td>
                    <td style={{ ...TD, textAlign: "center" }}>
                      <button
                        className="btn-cav btn-cav-ghost"
                        style={{ padding: "4px 10px", fontSize: 12 }}
                        onClick={(e) => { e.stopPropagation(); openDrawer(v); }}
                      >
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 13, color: "var(--fg-3)" }}>
          <span>
            Showing {((pagination.page - 1) * pagination.pageSize) + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-cav btn-cav-ghost"
              disabled={pagination.page <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              style={{ padding: "6px 10px", opacity: pagination.page <= 1 ? 0.4 : 1 }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ padding: "6px 12px", background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: 6 }}>
              {pagination.page} / {pagination.totalPages}
            </span>
            <button className="btn-cav btn-cav-ghost"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              style={{ padding: "6px 10px", opacity: pagination.page >= pagination.totalPages ? 0.4 : 1 }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {viewItem && (
        <VoucherDrawer
          listItem={viewItem}
          detail={detail}
          detailLoading={detailLoading}
          detailError={detailError}
          caps={caps}
          onClose={() => { setViewItem(null); setDetail(null); }}
          onGatedAction={gatedAction}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VoucherSequencePanel
// ─────────────────────────────────────────────────────────────────────────────

function VoucherSequencePanel({
  sequences, loading, error, onGatedAction,
}: {
  sequences:    ApiSequence[];
  loading:      boolean;
  error:        string | null;
  onGatedAction:(msg?: string) => void;
}) {
  if (loading) {
    return (
      <div style={{ height: 44, borderRadius: 8, background: "var(--bg-2)", animation: "pulse 1.5s ease-in-out infinite" }} />
    );
  }

  if (error) {
    return (
      <div style={{ padding: "10px 16px", borderRadius: 8, background: "var(--bg-1)", border: "1px solid var(--border-1)", fontSize: 12, color: "var(--fg-3)" }}>
        <Settings size={13} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
        Number Series status unavailable — {error}
      </div>
    );
  }

  const active = sequences.find((s) => s.status === "ACTIVE");
  const pending = sequences.find((s) => s.status === "PENDING_INIT");

  if (!active && !pending && sequences.length === 0) {
    return (
      <div style={{
        padding: "12px 16px", borderRadius: 8,
        background: "var(--bg-1)", border: "1px solid var(--caveo-orange, #E67E22)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <Settings size={15} style={{ color: "var(--caveo-orange, #E67E22)", flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: "var(--fg-2)", flex: 1 }}>
          <strong>Voucher numbering is not configured.</strong>{" "}
          Please configure Number Series before enabling voucher generation.
        </div>
        <button
          className="btn-cav btn-cav-ghost"
          style={{ fontSize: 12, opacity: 0.6, cursor: "not-allowed", whiteSpace: "nowrap" }}
          onClick={() => onGatedAction("Number Series configuration page is not yet available.")}
          title="Number Series configuration page is not yet available."
        >
          Configure Number Series
        </button>
      </div>
    );
  }

  const seq = active ?? pending;
  const isActive = seq?.status === "ACTIVE";

  return (
    <div style={{
      padding: "10px 16px", borderRadius: 8,
      background: "var(--bg-1)", border: "1px solid var(--border-1)",
      display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
    }}>
      <Settings size={14} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
      <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap", flex: 1, fontSize: 12 }}>
        <span style={{ color: "var(--fg-3)" }}>
          <strong style={{ color: "var(--fg-2)" }}>Voucher Series</strong>{" "}
          FY {seq?.financialYear ?? "—"}
        </span>
        <span style={{ color: "var(--fg-3)" }}>
          Next:{" "}
          <code style={{ fontSize: 11, background: "var(--bg-2)", padding: "1px 6px", borderRadius: 3, color: "var(--fg-2)" }}>
            {seq?.formatPreview ?? "—"}
          </code>
        </span>
        <span style={{ color: "var(--fg-3)" }}>
          Issued so far: <strong style={{ color: "var(--fg-2)" }}>{seq?.lastNumber ?? 0}</strong>
        </span>
        <span style={{
          padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
          background: isActive ? "var(--bg-success-muted, #e8f8f0)" : "var(--bg-2)",
          color: isActive ? "var(--fg-success, #27AE60)" : "var(--fg-3)",
        }}>
          {isActive ? "Active" : seq?.status ?? "Unknown"}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TallyBadge
// ─────────────────────────────────────────────────────────────────────────────

function TallyBadge({ status }: { status: string }) {
  const meta = TALLY_META[status] ?? TALLY_META.NOT_EXPORTED;
  return <span style={{ fontSize: 11, color: meta.color, whiteSpace: "nowrap" }}>{meta.label}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// VoucherDrawer
// ─────────────────────────────────────────────────────────────────────────────

function VoucherDrawer({
  listItem, detail, detailLoading, detailError, caps, onClose, onGatedAction,
}: {
  listItem:      ApiVoucher;
  detail:        ApiVoucherDetail | null;
  detailLoading: boolean;
  detailError:   string | null;
  caps:          VoucherCaps;
  onClose:       () => void;
  onGatedAction: (msg?: string) => void;
}) {
  const v = detail?.voucher;
  const amount = v?.amount ?? listItem.amount;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1200, display: "flex", alignItems: "flex-start", justifyContent: "flex-end" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.28)" }} onClick={onClose} />
      <div style={{
        position: "relative", zIndex: 1, width: 580, maxWidth: "95vw", height: "100vh",
        background: "var(--bg-0)", boxShadow: "-8px 0 32px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column", overflowY: "auto",
      }}>
        {/* Sticky header */}
        <div style={{
          padding: "20px 24px 16px", borderBottom: "1px solid var(--border-1)",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
          position: "sticky", top: 0, background: "var(--bg-0)", zIndex: 2,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "monospace" }}>{listItem.voucherNumber}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-1)" }}>{typeLabel(listItem.voucherType)}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className={`badge ${statusBadge(listItem.status)}`}>{statusLabel(listItem.status)}</span>
              <TallyBadge status={listItem.tallyExportStatus} />
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--fg-3)", marginTop: 2 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>

          {/* Detail loading */}
          {detailLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--fg-3)", fontSize: 13 }}>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              Loading voucher details…
            </div>
          )}

          {/* Detail error */}
          {detailError && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--fg-danger, #C0392B)", fontSize: 13 }}>
              <AlertCircle size={14} />{detailError}
            </div>
          )}

          {/* Voucher Information */}
          <DrawerSection title="Voucher Information">
            <FieldGrid fields={[
              { label: "Voucher Number", value: v?.voucherNumber ?? listItem.voucherNumber },
              { label: "Date",           value: v?.voucherDate   ?? listItem.voucherDate  },
              { label: "Type",           value: typeLabel(v?.voucherType ?? listItem.voucherType) },
              { label: "Status",         value: statusLabel(v?.status ?? listItem.status) },
              { label: "Amount",         value: fmtLakhs(amount), highlight: true },
              { label: "Amount in Words",value: v?.amountInWords ?? "—" },
              { label: "Narration",      value: v?.narration || "Not available" },
              { label: "Payment Mode",   value: v?.paymentMode ?? listItem.paymentMode ?? "Not available" },
              { label: "Created By",     value: v?.createdBy ?? listItem.createdBy },
              { label: "Created At",     value: (v?.createdAt ?? listItem.createdAt).slice(0, 10) },
              ...(v?.updatedAt ? [{ label: "Updated At", value: v.updatedAt.slice(0, 10) }] : []),
              ...(v?.voidedAt  ? [{ label: "Voided At",  value: v.voidedAt.slice(0, 10) }, { label: "Void Reason", value: v.voidReason || "—" }] : []),
            ]} />
          </DrawerSection>

          {/* Reference Information */}
          <DrawerSection title="Reference Information">
            {detail ? (
              <FieldGrid fields={[
                { label: "Reference Type",   value: detail.reference.referenceType   ?? "Not available" },
                { label: "Reference Number", value: detail.reference.referenceNumber ?? "Not available" },
                { label: "Expense Number",   value: detail.reference.expenseNumber   ?? "Not available" },
                { label: "Advance Number",   value: detail.reference.advanceNumber   ?? "Not available" },
                { label: "Claim Number",     value: detail.reference.claimNumber     ?? "Not available" },
              ]} />
            ) : (
              <FieldGrid fields={[
                { label: "Reference",  value: listItem.referenceNumber ?? "Not available" },
                { label: "Party Name", value: listItem.partyName       ?? "Not available" },
              ]} />
            )}
          </DrawerSection>

          {/* Party Information */}
          {detail && (
            <DrawerSection title="Party Information">
              <FieldGrid fields={[
                { label: "Customer",  value: detail.party.customer ? "See customer master" : "Not available" },
                { label: "Vendor",    value: detail.party.vendor   ? `${detail.party.vendor.name}${detail.party.vendor.gstin ? ` (${detail.party.vendor.gstin})` : ""}` : "Not available" },
                { label: "Employee",  value: detail.party.employee ? detail.party.employee.name : "Not available" },
              ]} />
            </DrawerSection>
          )}

          {/* Accounting Information */}
          <DrawerSection title="Accounting Information">
            {detail ? (
              <FieldGrid fields={[
                { label: "Debit Ledger",  value: detail.accounting.debitLedger  ?? "Not available" },
                { label: "Credit Ledger", value: detail.accounting.creditLedger ?? "Not available" },
                { label: "Account",       value: detail.accounting.accountName  ?? "Not available" },
                { label: "Branch",        value: detail.accounting.branchName   ?? "Not available" },
                { label: "Cost Centre",   value: "Not available" },
                { label: "GST Details",   value: "Not available" },
              ]} />
            ) : (
              <div style={{ fontSize: 12, color: "var(--fg-4)", fontStyle: "italic" }}>
                Ledger detail will load momentarily…
              </div>
            )}
          </DrawerSection>

          {/* Payment Information */}
          {detail && (
            <DrawerSection title="Payment Information">
              <FieldGrid fields={[
                { label: "Payment Mode",  value: detail.payment.paymentMode   ?? "Not available" },
                { label: "Cheque Number", value: detail.payment.chequeNumber  ?? "Not available" },
                { label: "UPI Reference", value: "Not available" },
                { label: "Bank Reference",value: detail.payment.bankReference ?? "Not available" },
                { label: "Cash Account",  value: detail.payment.cashAccount   ?? "Not available" },
                { label: "Bank Account",  value: detail.payment.bankAccount   ?? "Not available" },
                { label: "Payee",         value: detail.payment.payee         ?? "Not available" },
              ]} />
            </DrawerSection>
          )}

          {/* Documents */}
          {detail && (
            <DrawerSection title="Documents">
              <FieldGrid fields={[
                { label: "Attachments",   value: detail.documents.attachments.length > 0 ? `${detail.documents.attachments.length} file(s)` : "No records available" },
                { label: "Voucher PDF",   value: detail.documents.voucherPdfAvailable ? "Available" : "Not generated" },
              ]} />
            </DrawerSection>
          )}

          {/* Approval */}
          <DrawerSection title="Approval">
            {detail ? (
              detail.approval.approvalHistory.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 4 }}>
                    Status: <strong style={{ color: "var(--fg-2)" }}>{detail.approval.approvalStatus}</strong>
                  </div>
                  {detail.approval.approvalHistory.map((ev, i) => (
                    <div key={i} style={{
                      padding: "8px 12px", borderRadius: 6,
                      background: "var(--bg-2)", border: "1px solid var(--border-1)", fontSize: 12,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                        <strong style={{ color: "var(--fg-2)" }}>{ev.event}</strong>
                        <span style={{ color: "var(--fg-4)" }}>{ev.at.slice(0, 10)}</span>
                      </div>
                      <div style={{ color: "var(--fg-3)" }}>{ev.by}</div>
                      {ev.comments && <div style={{ color: "var(--fg-4)", marginTop: 4 }}>{ev.comments}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "var(--fg-4)" }}>No approval history available.</div>
              )
            ) : (
              <div style={{ fontSize: 12, color: "var(--fg-4)" }}>Loading approval data…</div>
            )}
          </DrawerSection>

          {/* Audit */}
          <DrawerSection title="Audit">
            {detail ? (
              <FieldGrid fields={[
                { label: "Created By",    value: detail.audit.createdBy },
                { label: "Created At",    value: detail.audit.createdAt.slice(0, 10) },
                { label: "Modified By",   value: "Not available" },
                { label: "Cancelled By",  value: "Not available" },
                { label: "Cancel Reason", value: detail.audit.cancelReason ?? "Not available" },
              ]} />
            ) : (
              <FieldGrid fields={[
                { label: "Created By", value: listItem.createdBy },
                { label: "Created At", value: listItem.createdAt.slice(0, 10) },
              ]} />
            )}
          </DrawerSection>

          {/* Tally Export */}
          <DrawerSection title="Tally Export">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <TallyBadge status={detail?.tallyExport.status ?? listItem.tallyExportStatus} />
              <button
                className="btn-cav btn-cav-ghost"
                style={{ fontSize: 12, opacity: 0.5, cursor: "not-allowed" }}
                onClick={() => onGatedAction(TALLY_MSG)}
                title={TALLY_MSG}
              >
                <Download size={12} style={{ marginRight: 4 }} /> Export to Tally
              </button>
            </div>
          </DrawerSection>

          {/* Voucher Preview */}
          <DrawerSection title="Voucher Preview">
            <VoucherPreviewPanel
              voucherNumber={v?.voucherNumber ?? listItem.voucherNumber}
              voucherDate={v?.voucherDate   ?? listItem.voucherDate}
              voucherType={v?.voucherType   ?? listItem.voucherType}
              amount={amount}
              amountInWords={v?.amountInWords ?? "—"}
              narration={v?.narration ?? null}
              paymentMode={v?.paymentMode ?? listItem.paymentMode}
              partyName={detail?.party.employee?.name ?? detail?.party.vendor?.name ?? listItem.partyName}
              referenceNumber={detail?.reference.referenceNumber ?? listItem.referenceNumber}
              createdBy={v?.createdBy ?? listItem.createdBy}
            />
          </DrawerSection>

          {/* Actions */}
          <DrawerSection title="Actions">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn-cav btn-cav-ghost"
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.5, cursor: "not-allowed" }}
                title={PDF_MSG}
                onClick={() => onGatedAction(PDF_MSG)}
              >
                <Printer size={13} /> Print Voucher
              </button>
              <button
                className="btn-cav btn-cav-ghost"
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.5, cursor: "not-allowed" }}
                title={PDF_MSG}
                onClick={() => onGatedAction(PDF_MSG)}
              >
                <Download size={13} /> Download PDF
              </button>
              {caps.canCancel && listItem.status !== "CANCELLED" && (
                <button
                  className="btn-cav btn-cav-ghost"
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg-danger, #C0392B)", opacity: 0.5, cursor: "not-allowed" }}
                  title={GATE_MSG}
                  onClick={() => onGatedAction()}
                >
                  <XCircle size={13} /> Cancel Voucher
                </button>
              )}
            </div>
          </DrawerSection>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VoucherPreviewPanel
// ─────────────────────────────────────────────────────────────────────────────

function VoucherPreviewPanel({
  voucherNumber, voucherDate, voucherType, amount, amountInWords,
  narration, paymentMode, partyName, referenceNumber, createdBy,
}: {
  voucherNumber:   string;
  voucherDate:     string;
  voucherType:     string;
  amount:          string;
  amountInWords:   string;
  narration:       string | null;
  paymentMode:     string | null;
  partyName:       string | null;
  referenceNumber: string | null;
  createdBy:       string;
}) {
  const rupees = lakhsToRupees(amount);
  const isReceipt = voucherType === "RECEIPT";

  // "CASH PAYMENT VOUCHER", "RECEIPT VOUCHER", etc.
  const previewTitle =
    voucherType === "PAYMENT"          ? "CASH PAYMENT VOUCHER" :
    voucherType === "RECEIPT"          ? "RECEIPT VOUCHER"      :
    voucherType === "JOURNAL"          ? "JOURNAL VOUCHER"      :
    voucherType === "EXPENSE"          ? "EXPENSE VOUCHER"      :
    voucherType === "EMPLOYEE_CLAIM"   ? "CONVEYANCE VOUCHER"   :
    voucherType === "EMPLOYEE_ADVANCE" ? "ADVANCE VOUCHER"      :
    typeLabel(voucherType).toUpperCase();

  return (
    <div style={{
      border: "1px solid var(--border-1)", borderRadius: 8, padding: "20px 24px",
      background: "var(--bg-0)", fontFamily: "serif",
    }}>
      {/* Company header */}
      <div style={{ textAlign: "center", marginBottom: 16, borderBottom: "2px solid var(--fg-2)", paddingBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg-1)", letterSpacing: "0.05em" }}>
          CAVEO INFOSYSTEMS PVT. LTD.
        </div>
        <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>
          IT Infrastructure &amp; Security Solutions
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-1)", marginTop: 10, letterSpacing: "0.08em" }}>
          {previewTitle}
        </div>
      </div>

      {/* Fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", marginBottom: 16, fontSize: 12 }}>
        <div>
          <span style={{ color: "var(--fg-3)" }}>Voucher No: </span>
          <strong style={{ fontFamily: "monospace" }}>{voucherNumber}</strong>
        </div>
        <div>
          <span style={{ color: "var(--fg-3)" }}>Date: </span>
          <strong>{voucherDate}</strong>
        </div>
        {partyName && (
          <div style={{ gridColumn: "1 / -1" }}>
            <span style={{ color: "var(--fg-3)" }}>{isReceipt ? "Received From: " : "Paid To: "}</span>
            <strong>{partyName}</strong>
          </div>
        )}
        <div style={{ gridColumn: "1 / -1" }}>
          <span style={{ color: "var(--fg-3)" }}>Amount: </span>
          <strong style={{ fontSize: 14 }}>{fmtINR(rupees)}</strong>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <span style={{ color: "var(--fg-3)" }}>Amount in Words: </span>
          <em>{amountInWords !== "—" ? amountInWords : "—"}</em>
        </div>
        {narration && (
          <div style={{ gridColumn: "1 / -1" }}>
            <span style={{ color: "var(--fg-3)" }}>Towards: </span>{narration}
          </div>
        )}
        {paymentMode && (
          <div>
            <span style={{ color: "var(--fg-3)" }}>Mode: </span>
            <strong>{paymentMode}</strong>
          </div>
        )}
        {referenceNumber && (
          <div>
            <span style={{ color: "var(--fg-3)" }}>Reference: </span>
            <span style={{ fontFamily: "monospace", fontSize: 11 }}>{referenceNumber}</span>
          </div>
        )}
        <div>
          <span style={{ color: "var(--fg-3)" }}>Prepared By: </span>
          <strong>{createdBy}</strong>
        </div>
      </div>

      {/* Signature section */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px 12px", marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border-1)" }}>
        {["Prepared By", "Checked By", "Approved By", "Received By"].map((sig) => (
          <div key={sig} style={{ textAlign: "center" }}>
            <div style={{ height: 32, borderBottom: "1px solid var(--fg-3)", marginBottom: 4 }} />
            <div style={{ fontSize: 10, color: "var(--fg-3)" }}>{sig}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, textAlign: "center", fontSize: 10, color: "var(--fg-4)", fontFamily: "sans-serif" }}>
        Print / Download PDF will be enabled after the Voucher PDF API is implemented.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
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
        <div key={f.label} style={f.value.length > 40 ? { gridColumn: "1 / -1" } : undefined}>
          <div style={{ fontSize: 11, color: "var(--fg-4)", marginBottom: 2 }}>{f.label}</div>
          <div style={{ fontSize: 13, color: f.highlight ? "var(--fg-1)" : "var(--fg-2)", fontWeight: f.highlight ? 700 : 400 }}>
            {f.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Table style helpers
// ─────────────────────────────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: "9px 14px", textAlign: "left", fontSize: 11,
  fontWeight: 600, color: "var(--fg-3)", whiteSpace: "nowrap",
  borderBottom: "1px solid var(--border-1)",
};

const TD: React.CSSProperties = {
  padding: "10px 14px", fontSize: 13, color: "var(--fg-2)", verticalAlign: "middle",
};
