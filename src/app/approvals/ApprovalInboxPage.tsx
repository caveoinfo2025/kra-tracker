"use client";

import { useState } from "react";
import { ApprovalRequest, ApprovalCaps } from "../settings/workflow/approval-engine/data";
import ApprovalInbox        from "../settings/workflow/approval-engine/components/ApprovalInbox";
import ApprovalDetailDrawer from "../settings/workflow/approval-engine/components/ApprovalDetailDrawer";

interface Props {
  caps: ApprovalCaps;
  allRequests: ApprovalRequest[];
}

type WorkspaceTab = "inbox" | "approved" | "rejected" | "my-requests";

const WORKSPACE_TABS: { key: WorkspaceTab; label: string }[] = [
  { key: "inbox",       label: "Pending" },
  { key: "approved",    label: "Approved" },
  { key: "rejected",    label: "Rejected" },
  { key: "my-requests", label: "My Requests" },
];

export default function ApprovalInboxPage({ caps, allRequests }: Props) {
  const [requests,     setRequests]    = useState<ApprovalRequest[]>(allRequests);
  const [viewRequest,  setViewRequest] = useState<ApprovalRequest | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("inbox");

  /* Filter by workspace tab */
  const tabRequests = requests.filter((r) => {
    if (workspaceTab === "inbox")       return r.status === "Pending";
    if (workspaceTab === "approved")    return r.status === "Approved";
    if (workspaceTab === "rejected")    return r.status === "Rejected";
    if (workspaceTab === "my-requests") return r.requestedBy === caps.currentUser;
    return true;
  });

  const counts = {
    inbox:        requests.filter((r) => r.status === "Pending").length,
    approved:     requests.filter((r) => r.status === "Approved").length,
    rejected:     requests.filter((r) => r.status === "Rejected").length,
    "my-requests": requests.filter((r) => r.requestedBy === caps.currentUser).length,
  } as Record<WorkspaceTab, number>;

  function doApprove(id: number, remarks: string) {
    setRequests((rs) => rs.map((r) => r.id !== id ? r : {
      ...r, status: "Approved",
      history: [...r.history, { action: "Approved", approver: caps.currentUser, date: "2026-06-04T12:00:00", level: r.currentLevel, remarks }],
    }));
    setViewRequest(null);
  }

  function doReject(id: number, remarks: string) {
    setRequests((rs) => rs.map((r) => r.id !== id ? r : {
      ...r, status: "Rejected",
      history: [...r.history, { action: "Rejected", approver: caps.currentUser, date: "2026-06-04T12:00:00", level: r.currentLevel, remarks }],
    }));
    setViewRequest(null);
  }

  function doRequestChanges(id: number, remarks: string) {
    setRequests((rs) => rs.map((r) => r.id !== id ? r : {
      ...r,
      history: [...r.history, { action: "Changes Requested", approver: caps.currentUser, date: "2026-06-04T12:00:00", level: r.currentLevel, remarks }],
    }));
    setViewRequest(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* KPI cards scoped to this user */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {WORKSPACE_TABS.map((t) => (
          <div
            key={t.key}
            className={`kpi${workspaceTab === t.key ? " kpi-accent" : ""}`}
            style={{ cursor: "pointer" }}
            onClick={() => setWorkspaceTab(t.key)}
          >
            <div className="kpi-label">{t.label}</div>
            <div className="kpi-value" style={{ fontSize: 28 }}>{counts[t.key]}</div>
          </div>
        ))}
      </div>

      {/* Tab strip */}
      <div className="seg-control">
        {WORKSPACE_TABS.map((t) => (
          <button key={t.key} className={workspaceTab === t.key ? "active" : ""} onClick={() => setWorkspaceTab(t.key)}>
            {t.label}
            {counts[t.key] > 0 && (
              <span style={{ marginLeft: 5, fontSize: 10, background: workspaceTab === t.key ? "rgba(200,16,46,0.12)" : "var(--bg-muted)", borderRadius: 8, padding: "1px 6px", color: workspaceTab === t.key ? "var(--caveo-red)" : "var(--fg-4)" }}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Inbox table (reuse shared component) */}
      <ApprovalInbox
        requests={tabRequests}
        caps={caps}
        onView={setViewRequest}
        onApprove={(r) => doApprove(r.id, "Quick approved from workspace")}
        onReject={(r) => doReject(r.id, "Quick rejected from workspace")}
      />

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
