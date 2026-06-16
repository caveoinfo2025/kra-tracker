"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckSquare, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import {
  ApprovalCaps,
  ApprovalRequest,
  Priority,
  RequestStatus,
} from "@/app/settings/workflow/approval-engine/data";
import ApprovalInbox        from "@/app/settings/workflow/approval-engine/components/ApprovalInbox";
import ApprovalDetailDrawer from "@/app/settings/workflow/approval-engine/components/ApprovalDetailDrawer";

// ─── Finance entity type constants ────────────────────────────────────────────

const FINANCE_ENTITY_TYPES = new Set([
  "EXPENSE", "ADVANCE", "TRAVEL_CLAIM",
  "VENDOR_PAYMENT", "CASH_ADJUSTMENT", "VOUCHER", "BANK_TRANSFER",
]);

function txLabel(et: string): string {
  const MAP: Record<string, string> = {
    EXPENSE:         "Expense",
    ADVANCE:         "Employee Advance",
    TRAVEL_CLAIM:    "Local Conveyance",
    VENDOR_PAYMENT:  "Vendor Payment",
    CASH_ADJUSTMENT: "Cash Adjustment",
    VOUCHER:         "Voucher",
    BANK_TRANSFER:   "Bank Transfer",
  };
  return MAP[et.toUpperCase()] ?? et;
}

// ─── API shape (sparse DB record from workflow-engine) ────────────────────────

interface ApiApprovalRequest {
  id:           number;
  workflowId:   number;
  entityType:   string;
  entityId:     string;
  requestedBy:  number;
  status:       string;
  currentStep:  number;
  contextJson?: string | null;
  submittedAt:  string;
  completedAt?: string | null;
  createdAt:    string;
  updatedAt:    string;
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function mapStatus(s: string): RequestStatus {
  const MAP: Record<string, RequestStatus> = {
    PENDING:   "Pending",
    APPROVED:  "Approved",
    REJECTED:  "Rejected",
    RETURNED:  "Changes Requested",
    CANCELLED: "Cancelled",
  };
  return (MAP[s] ?? "Pending") as RequestStatus;
}

function safeJson(s: string | null | undefined): Record<string, unknown> {
  if (!s) return {};
  try { return JSON.parse(s) as Record<string, unknown>; }
  catch { return {}; }
}

// Map a sparse DB record to the UI ApprovalRequest type.
// inboxIds = IDs of pending requests assigned to the current user — these get
// currentApprover set so the drawer's canAct check enables action buttons.
function mapFinanceRequest(
  req:             ApiApprovalRequest,
  currentUserName: string,
  inboxIds:        Set<number>,
): ApprovalRequest {
  const ctx         = safeJson(req.contextJson);
  const submitted   = new Date(req.submittedAt);
  const slaHours    = 48;
  const slaDeadline = new Date(submitted.getTime() + slaHours * 3_600_000);
  const breachedSLA = req.status === "PENDING" && Date.now() > slaDeadline.getTime();

  const amount =
    typeof ctx.amount      === "number" ? (ctx.amount as number) :
    typeof ctx.amountLakhs === "number" ? Math.round((ctx.amountLakhs as number) * 100_000) :
    undefined;

  const details =
    typeof ctx.description === "string" ? ctx.description :
    typeof ctx.details     === "string" ? ctx.details :
    `${txLabel(req.entityType)} — ref ${req.entityId}`;

  return {
    id:              req.id,
    requestNo:       `FIN/${req.entityType}/${String(req.id).padStart(4, "0")}`,
    workflowId:      req.workflowId,
    workflowName:    `${txLabel(req.entityType)} Workflow`,
    module:          "Finance",
    transactionType: txLabel(req.entityType),
    requestedBy:     `Employee #${req.requestedBy}`,
    requestedByDept: "",
    amount,
    amountUnit:      "₹",
    details,
    submittedAt:     req.submittedAt,
    currentLevel:    req.currentStep,
    totalLevels:     req.currentStep,
    currentApprover: inboxIds.has(req.id) ? currentUserName : "",
    status:          mapStatus(req.status),
    priority:        "Medium" as Priority,
    slaHours,
    slaDeadline:     slaDeadline.toISOString(),
    breachedSLA,
    history:         [],
    attachments:     [],
    referenceId:     `${req.entityType}/${req.entityId}`,
  };
}

// ─── Sub-tab config ───────────────────────────────────────────────────────────

type SubTab = "all" | "expenses" | "advances" | "conveyance" | "payments";

const SUB_TABS: { key: SubTab; label: string; txTypes: string[] }[] = [
  { key: "all",        label: "All Finance",  txTypes: [] },
  { key: "expenses",   label: "Expenses",     txTypes: ["Expense"] },
  { key: "advances",   label: "Advances",     txTypes: ["Employee Advance"] },
  { key: "conveyance", label: "Conveyance",   txTypes: ["Local Conveyance"] },
  { key: "payments",   label: "Payments",     txTypes: ["Vendor Payment", "Cash Adjustment", "Voucher", "Bank Transfer"] },
];

const PAYMENT_TX_TYPES = ["Vendor Payment", "Cash Adjustment", "Voucher", "Bank Transfer"];

// ─── Component ────────────────────────────────────────────────────────────────

export default function FinanceApprovalsClient({ caps }: { caps: ApprovalCaps }) {
  const [allItems,      setAllItems]      = useState<ApprovalRequest[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [subTab,        setSubTab]        = useState<SubTab>("all");
  const [viewRequest,   setViewRequest]   = useState<ApprovalRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast,         setToast]         = useState("");
  const abortRef = useRef<AbortController | null>(null);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────
  // Two parallel requests:
  //  1. inbox=true  → pending requests assigned to current user (all types)
  //  2. (unfiltered) → all approval requests (any status, any type), take 100
  // Both are filtered client-side to FINANCE_ENTITY_TYPES.
  // Limitation: the unfiltered call returns at most 100 rows; if there are >100
  // total approval requests in the system, older finance items may be omitted.

  const fetchAll = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);

    try {
      const [inboxRes, allRes] = await Promise.all([
        fetch("/api/approvals?inbox=true", { signal: ctrl.signal }),
        fetch("/api/approvals",            { signal: ctrl.signal }),
      ]);

      if ([inboxRes.status, allRes.status].some((s) => s === 401 || s === 403)) {
        setError("You don't have permission to view finance approvals.");
        return;
      }
      if (!inboxRes.ok) throw new Error(`HTTP ${inboxRes.status}`);
      if (!allRes.ok)   throw new Error(`HTTP ${allRes.status}`);

      const inboxJson = await inboxRes.json() as { requests?: ApiApprovalRequest[] };
      const allJson   = await allRes.json()   as { requests?: ApiApprovalRequest[] };

      // IDs of pending finance approvals assigned to the current user
      const inboxIds = new Set<number>(
        (inboxJson.requests ?? [])
          .filter((r) => FINANCE_ENTITY_TYPES.has(r.entityType.toUpperCase()))
          .map((r) => r.id),
      );

      const items = (allJson.requests ?? [])
        .filter((r) => FINANCE_ENTITY_TYPES.has(r.entityType.toUpperCase()))
        .map((r) => mapFinanceRequest(r, caps.currentUser, inboxIds));

      setAllItems(items);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError("Unable to load finance approvals. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [caps.currentUser]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // ── Derived counts ─────────────────────────────────────────────────────────

  const pending    = allItems.filter((r) => r.status === "Pending");
  const overdue    = pending.filter((r) => r.breachedSLA);

  function pendingCountFor(txTypes: string[]): number {
    if (txTypes.length === 0) return pending.length;
    return pending.filter((r) => txTypes.includes(r.transactionType)).length;
  }

  const tabItems: ApprovalRequest[] = (() => {
    const tab = SUB_TABS.find((t) => t.key === subTab)!;
    if (tab.txTypes.length === 0) return allItems;
    return allItems.filter((r) => tab.txTypes.includes(r.transactionType));
  })();

  // ── Actions ────────────────────────────────────────────────────────────────

  async function submitAction(
    id:       number,
    action:   "APPROVE" | "REJECT" | "RETURN",
    comments: string,
  ) {
    if (action === "REJECT" && !comments.trim()) { flash("Rejection requires remarks."); return; }
    if (action === "RETURN" && !comments.trim()) { flash("Request Changes requires remarks."); return; }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/approvals/${id}/action`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, comments: comments || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as Record<string, unknown>;
        flash(typeof j.error === "string" ? j.error : "Action failed. Please try again.");
        return;
      }
      flash(
        action === "APPROVE" ? "Approved successfully." :
        action === "REJECT"  ? "Rejected." :
        "Changes requested.",
      );
      setViewRequest(null);
      await fetchAll();
    } catch {
      flash("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  function doApprove(id: number, remarks: string)        { void submitAction(id, "APPROVE", remarks); }
  function doReject(id: number, remarks: string)         { void submitAction(id, "REJECT",  remarks); }
  function doRequestChanges(id: number, remarks: string) { void submitAction(id, "RETURN",  remarks); }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "var(--cyber-black)", color: "#fff", padding: "10px 22px",
          borderRadius: 8, fontSize: 13, zIndex: 9999, maxWidth: 440, textAlign: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}>
          {toast}
        </div>
      )}

      {/* Error banner */}
      {error && !loading && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
          background: "rgba(200,16,46,0.06)", border: "1px solid rgba(200,16,46,0.2)",
          borderRadius: 10,
        }}>
          <AlertCircle size={18} color="var(--caveo-red)" />
          <span style={{ fontSize: 13.5, color: "var(--fg-2)", flex: 1 }}>{error}</span>
          <button
            onClick={fetchAll}
            style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 12.5,
              color: "var(--caveo-red)", background: "none", border: "none",
              cursor: "pointer", fontWeight: 600,
            }}
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* Finance KPI strip — 6 tiles */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
        {([
          { label: "Finance Pending", val: pendingCountFor([]) },
          { label: "Expense",         val: pendingCountFor(["Expense"]) },
          { label: "Advance",         val: pendingCountFor(["Employee Advance"]) },
          { label: "Conveyance",      val: pendingCountFor(["Local Conveyance"]) },
          { label: "Payments",        val: pendingCountFor(PAYMENT_TX_TYPES) },
          { label: "Overdue",         val: overdue.length, red: true },
        ] as { label: string; val: number; red?: boolean }[]).map((k) => (
          <div key={k.label} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div
              className="kpi-value"
              style={{ fontSize: 26, color: k.red && k.val > 0 ? "var(--caveo-red)" : "inherit" }}
            >
              {loading
                ? <Loader2 size={16} className="animate-spin" style={{ color: "var(--caveo-red)" }} />
                : k.val}
            </div>
          </div>
        ))}
      </div>

      {/* Sub-tab strip + all-modules link */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div className="seg-control">
          {SUB_TABS.map((t) => {
            const cnt = t.txTypes.length === 0
              ? allItems.length
              : allItems.filter((r) => t.txTypes.includes(r.transactionType)).length;
            return (
              <button
                key={t.key}
                className={subTab === t.key ? "active" : ""}
                onClick={() => setSubTab(t.key)}
              >
                {t.label}
                {cnt > 0 && (
                  <span style={{
                    marginLeft: 5, fontSize: 10,
                    background: subTab === t.key ? "rgba(200,16,46,0.12)" : "var(--bg-muted)",
                    borderRadius: 8, padding: "1px 6px",
                    color: subTab === t.key ? "var(--caveo-red)" : "var(--fg-4)",
                  }}>
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
          {loading && (
            <Loader2 size={13} className="animate-spin" style={{ color: "var(--caveo-red)", marginLeft: 8 }} />
          )}
        </div>

        <Link
          href="/approvals"
          style={{
            marginLeft: "auto", display: "flex", alignItems: "center", gap: 5,
            fontSize: 12, color: "var(--fg-4)", textDecoration: "none",
          }}
        >
          <ExternalLink size={12} /> All Modules Inbox
        </Link>
      </div>

      {/* Empty state */}
      {!loading && tabItems.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: "52px 24px" }}>
          <CheckSquare size={40} style={{ margin: "0 auto 14px", color: "var(--fg-4)", display: "block" }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>
            No finance approvals pending
          </div>
          <div style={{ fontSize: 13, color: "var(--fg-4)" }}>
            Expense, advance, conveyance, and payment approvals will appear here.
          </div>
        </div>
      )}

      {/* Approval table — reuses shared ApprovalInbox component */}
      {(loading || tabItems.length > 0) && (
        <ApprovalInbox
          requests={tabItems}
          caps={caps}
          onView={setViewRequest}
          onApprove={(r) => { void submitAction(r.id, "APPROVE", ""); }}
          onReject={(r) => setViewRequest(r)}
        />
      )}

      {/* Action loading overlay */}
      {actionLoading && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
          zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "var(--bg-elev)", borderRadius: 12, padding: "20px 32px",
            display: "flex", gap: 12, alignItems: "center",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}>
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--caveo-red)" }} />
            <span style={{ fontSize: 14 }}>Processing…</span>
          </div>
        </div>
      )}

      {/* Detail drawer — reuses shared ApprovalDetailDrawer component */}
      {viewRequest && (
        <ApprovalDetailDrawer
          request={viewRequest}
          caps={caps}
          onClose={() => setViewRequest(null)}
          onApprove={doApprove}
          onReject={doReject}
          onRequestChanges={doRequestChanges}
        />
      )}
    </div>
  );
}
