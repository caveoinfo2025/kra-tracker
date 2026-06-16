"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckSquare, Loader2, RefreshCw } from "lucide-react";
import {
  ApprovalCaps,
  ApprovalRequest,
  Module,
  Priority,
  RequestStatus,
} from "../settings/workflow/approval-engine/data";
import ApprovalInbox from "../settings/workflow/approval-engine/components/ApprovalInbox";
import ApprovalDetailDrawer from "../settings/workflow/approval-engine/components/ApprovalDetailDrawer";

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

function mapEntityType(et: string): { module: Module; transactionType: string } {
  const u = et.toUpperCase();
  if (u === "EXPENSE")          return { module: "Finance",     transactionType: "Expense" };
  if (u === "ADVANCE")          return { module: "Finance",     transactionType: "Employee Advance" };
  if (u === "TRAVEL_CLAIM")     return { module: "Finance",     transactionType: "Local Conveyance" };
  if (u.includes("VENDOR"))     return { module: "Procurement", transactionType: "Vendor Onboarding" };
  if (u.includes("DISCOUNT"))   return { module: "Sales",       transactionType: "Discount Approval" };
  if (u.includes("OPPORTUNIT")) return { module: "Sales",       transactionType: "Quote Approval" };
  if (u.includes("LEAVE"))      return { module: "HR",          transactionType: "Leave Approval" };
  if (u.includes("ASSET"))      return { module: "HR",          transactionType: "Asset Request" };
  if (u.includes("PROJECT"))    return { module: "Projects",    transactionType: "Project Budget" };
  return { module: "Admin", transactionType: et };
}

function safeJson(s: string | null | undefined): Record<string, unknown> {
  if (!s) return {};
  try { return JSON.parse(s) as Record<string, unknown>; }
  catch { return {}; }
}

function mapApiRequest(
  req: ApiApprovalRequest,
  currentUserName: string,
  isInbox: boolean,
): ApprovalRequest {
  const { module, transactionType } = mapEntityType(req.entityType);
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
    `${transactionType} — ref ${req.entityId}`;

  return {
    id:              req.id,
    requestNo:       `APR/${req.entityType}/${String(req.id).padStart(4, "0")}`,
    workflowId:      req.workflowId,
    workflowName:    `${transactionType} Workflow`,
    module,
    transactionType,
    requestedBy:     `Employee #${req.requestedBy}`,
    requestedByDept: "",
    amount,
    amountUnit:      "₹",
    details,
    submittedAt:     req.submittedAt,
    currentLevel:    req.currentStep,
    totalLevels:     req.currentStep,
    // Inbox items are assigned to the current user per the API filter — set as
    // currentApprover so the drawer's canAct check enables action buttons.
    currentApprover: isInbox ? currentUserName : "",
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

// ─── Props / tab config ───────────────────────────────────────────────────────

interface Props {
  caps:       ApprovalCaps;
  employeeId: number;
}

type WorkspaceTab = "inbox" | "approved" | "rejected" | "delegated" | "my-requests";

const WORKSPACE_TABS: { key: WorkspaceTab; label: string }[] = [
  { key: "inbox",        label: "Pending" },
  { key: "approved",     label: "Approved" },
  { key: "rejected",     label: "Rejected" },
  { key: "delegated",    label: "Delegated" },
  { key: "my-requests",  label: "My Requests" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ApprovalInboxPage({ caps, employeeId }: Props) {
  const [inboxItems,       setInboxItems]       = useState<ApprovalRequest[]>([]);
  const [historyItems,     setHistoryItems]      = useState<ApprovalRequest[]>([]);
  const [myItems,          setMyItems]           = useState<ApprovalRequest[]>([]);
  const [approvedToday,    setApprovedToday]     = useState(0);
  const [loading,          setLoading]           = useState(true);
  const [error,            setError]             = useState<string | null>(null);
  const [viewRequest,      setViewRequest]       = useState<ApprovalRequest | null>(null);
  const [workspaceTab,     setWorkspaceTab]      = useState<WorkspaceTab>("inbox");
  const [actionLoading,    setActionLoading]     = useState(false);
  const [toast,            setToast]             = useState("");
  const abortRef = useRef<AbortController | null>(null);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  // ── Data fetch ──────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);

    try {
      const hasId = employeeId > 0;
      const [inboxRes, histRes, myRes] = await Promise.all([
        fetch("/api/approvals?inbox=true", { signal: ctrl.signal }),
        hasId ? fetch(`/api/approvals?approverId=${employeeId}`, { signal: ctrl.signal }) : Promise.resolve(null),
        hasId ? fetch(`/api/approvals?requestedBy=${employeeId}`, { signal: ctrl.signal }) : Promise.resolve(null),
      ]);

      if (inboxRes.status === 401 || inboxRes.status === 403) {
        setError("You don't have permission to view approvals.");
        return;
      }
      if (!inboxRes.ok) throw new Error(`HTTP ${inboxRes.status}`);

      const inboxJson = await inboxRes.json() as { requests?: ApiApprovalRequest[] };
      const inbox     = (inboxJson.requests ?? []).map((r) => mapApiRequest(r, caps.currentUser, true));
      setInboxItems(inbox);

      if (histRes?.ok) {
        const histJson = await histRes.json() as { requests?: ApiApprovalRequest[] };
        const raw      = histJson.requests ?? [];
        const hist     = raw.map((r) => mapApiRequest(r, caps.currentUser, false));
        setHistoryItems(hist);
        const todayStr = new Date().toDateString();
        setApprovedToday(
          raw.filter((r) => r.status === "APPROVED" && r.completedAt && new Date(r.completedAt).toDateString() === todayStr).length,
        );
      }

      if (myRes?.ok) {
        const myJson = await myRes.json() as { requests?: ApiApprovalRequest[] };
        setMyItems((myJson.requests ?? []).map((r) => mapApiRequest(r, caps.currentUser, false)));
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError("Unable to load approvals. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [caps.currentUser, employeeId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // ── Tab data ────────────────────────────────────────────────────────────────

  const acted = [
    ...inboxItems.filter((i) => i.status !== "Pending"),
    ...historyItems.filter((h) => !inboxItems.some((i) => i.id === h.id)),
  ];

  const tabRequests: ApprovalRequest[] = (() => {
    switch (workspaceTab) {
      case "inbox":        return inboxItems.filter((r) => r.status === "Pending");
      case "approved":     return acted.filter((r) => r.status === "Approved");
      case "rejected":     return acted.filter((r) => r.status === "Rejected");
      case "delegated":    return acted.filter((r) => r.history?.some((h) => h.action === "Delegated"));
      case "my-requests":  return myItems;
      default:             return [];
    }
  })();

  const counts: Record<WorkspaceTab, number> = {
    inbox:         inboxItems.filter((r) => r.status === "Pending").length,
    approved:      acted.filter((r) => r.status === "Approved").length,
    rejected:      acted.filter((r) => r.status === "Rejected").length,
    delegated:     acted.filter((r) => r.history?.some((h) => h.action === "Delegated")).length,
    "my-requests": myItems.length,
  };

  const overdueCount = inboxItems.filter((r) => r.breachedSLA && r.status === "Pending").length;

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function submitAction(
    id: number,
    action: "APPROVE" | "REJECT" | "RETURN",
    comments: string,
  ) {
    if (action === "REJECT" && !comments.trim()) {
      flash("Rejection requires remarks.");
      return;
    }
    if (action === "RETURN" && !comments.trim()) {
      flash("Request Changes requires remarks.");
      return;
    }

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
        action === "APPROVE" ? "Request approved successfully." :
        action === "REJECT"  ? "Request rejected." :
        "Changes requested successfully.",
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

  // ── Render ──────────────────────────────────────────────────────────────────

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

      {/* KPI strip */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        <div
          className={`kpi${workspaceTab === "inbox" ? " kpi-accent" : ""}`}
          style={{ cursor: "pointer" }}
          onClick={() => setWorkspaceTab("inbox")}
        >
          <div className="kpi-label">My Pending</div>
          <div className="kpi-value" style={{ fontSize: 28 }}>
            {loading ? <Loader2 size={20} className="animate-spin" style={{ color: "var(--caveo-red)" }} /> : counts.inbox}
          </div>
        </div>

        <div
          className={`kpi${workspaceTab === "approved" ? " kpi-accent" : ""}`}
          style={{ cursor: "pointer" }}
          onClick={() => setWorkspaceTab("approved")}
        >
          <div className="kpi-label">Approved Today</div>
          <div className="kpi-value" style={{ fontSize: 28 }}>
            {loading ? "—" : approvedToday}
          </div>
        </div>

        <div
          className={`kpi${workspaceTab === "rejected" ? " kpi-accent" : ""}`}
          style={{ cursor: "pointer" }}
          onClick={() => setWorkspaceTab("rejected")}
        >
          <div className="kpi-label">Rejected</div>
          <div className="kpi-value" style={{ fontSize: 28 }}>
            {loading ? "—" : counts.rejected}
          </div>
        </div>

        <div className="kpi" style={{ cursor: "default" }}>
          <div className="kpi-label">Overdue</div>
          <div
            className="kpi-value"
            style={{ fontSize: 28, color: overdueCount > 0 ? "var(--caveo-red)" : "inherit" }}
          >
            {loading ? "—" : overdueCount}
          </div>
        </div>

        <div
          className={`kpi${workspaceTab === "delegated" ? " kpi-accent" : ""}`}
          style={{ cursor: "pointer" }}
          onClick={() => setWorkspaceTab("delegated")}
        >
          <div className="kpi-label">Delegated</div>
          <div className="kpi-value" style={{ fontSize: 28 }}>
            {loading ? "—" : counts.delegated}
          </div>
        </div>
      </div>

      {/* Tab strip */}
      <div className="seg-control">
        {WORKSPACE_TABS.map((t) => (
          <button
            key={t.key}
            className={workspaceTab === t.key ? "active" : ""}
            onClick={() => setWorkspaceTab(t.key)}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span style={{
                marginLeft: 5, fontSize: 10,
                background: workspaceTab === t.key ? "rgba(200,16,46,0.12)" : "var(--bg-muted)",
                borderRadius: 8, padding: "1px 6px",
                color: workspaceTab === t.key ? "var(--caveo-red)" : "var(--fg-4)",
              }}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
        {loading && <Loader2 size={14} className="animate-spin" style={{ color: "var(--caveo-red)", marginLeft: 8 }} />}
      </div>

      {/* Empty state */}
      {!loading && tabRequests.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: "52px 24px" }}>
          <CheckSquare size={40} style={{ margin: "0 auto 14px", color: "var(--fg-4)", display: "block" }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>
            {workspaceTab === "inbox" ? "No pending approvals" :
             workspaceTab === "approved" ? "No approved requests" :
             workspaceTab === "rejected" ? "No rejected requests" :
             workspaceTab === "delegated" ? "No delegated requests" :
             "No requests submitted by you"}
          </div>
          <div style={{ fontSize: 13, color: "var(--fg-4)" }}>
            {workspaceTab === "inbox"
              ? "Approval requests assigned to you will appear here."
              : "Records will appear here once available."}
          </div>
        </div>
      )}

      {/* Approval table */}
      {(loading || tabRequests.length > 0) && (
        <ApprovalInbox
          requests={tabRequests}
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

      {/* Detail drawer */}
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
