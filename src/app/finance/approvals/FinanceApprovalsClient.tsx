"use client";

import { useState } from "react";
import { ApprovalRequest, ApprovalCaps } from "@/app/settings/workflow/approval-engine/data";
import ApprovalInbox        from "@/app/settings/workflow/approval-engine/components/ApprovalInbox";
import ApprovalDetailDrawer from "@/app/settings/workflow/approval-engine/components/ApprovalDetailDrawer";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

interface Props {
  caps: ApprovalCaps;
  requests: ApprovalRequest[];
}

type SubTab = "all" | "expenses" | "advances" | "conveyance" | "payments";

const SUB_TABS: { key: SubTab; label: string; txType?: string }[] = [
  { key: "all",        label: "All Finance" },
  { key: "expenses",   label: "Expenses",       txType: "Expense" },
  { key: "advances",   label: "Advances",       txType: "Employee Advance" },
  { key: "conveyance", label: "Conveyance",     txType: "Local Conveyance" },
  { key: "payments",   label: "Payments",       txType: "Payment" },
];

export default function FinanceApprovalsClient({ caps, requests }: Props) {
  const [subTab, setSubTab] = useState<SubTab>("all");
  const [allRequests, setAllRequests] = useState<ApprovalRequest[]>(requests);
  const [viewRequest, setViewRequest] = useState<ApprovalRequest | null>(null);

  const filtered = subTab === "all"
    ? allRequests
    : allRequests.filter((r) => {
        const tab = SUB_TABS.find((t) => t.key === subTab);
        return tab?.txType ? r.transactionType === tab.txType : true;
      });

  const counts = Object.fromEntries(
    SUB_TABS.map((t) => [
      t.key,
      t.key === "all"
        ? allRequests.length
        : allRequests.filter((r) => r.transactionType === t.txType).length,
    ])
  ) as Record<SubTab, number>;

  function doApprove(id: number, remarks: string) {
    setAllRequests((rs) => rs.map((r) => r.id !== id ? r : {
      ...r, status: "Approved",
      history: [...r.history, { action: "Approved", approver: caps.currentUser, date: "2026-06-04T12:00:00", level: r.currentLevel, remarks }],
    }));
    setViewRequest(null);
  }

  function doReject(id: number, remarks: string) {
    setAllRequests((rs) => rs.map((r) => r.id !== id ? r : {
      ...r, status: "Rejected",
      history: [...r.history, { action: "Rejected", approver: caps.currentUser, date: "2026-06-04T12:00:00", level: r.currentLevel, remarks }],
    }));
    setViewRequest(null);
  }

  function doRequestChanges(id: number, remarks: string) {
    setAllRequests((rs) => rs.map((r) => r.id !== id ? r : {
      ...r,
      history: [...r.history, { action: "Changes Requested", approver: caps.currentUser, date: "2026-06-04T12:00:00", level: r.currentLevel, remarks }],
    }));
    setViewRequest(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Sub-module filter strip */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div className="seg-control">
          {SUB_TABS.map((t) => (
            <button key={t.key} className={subTab === t.key ? "active" : ""} onClick={() => setSubTab(t.key)}>
              {t.label}
              {counts[t.key] > 0 && (
                <span style={{ marginLeft: 5, fontSize: 10, background: subTab === t.key ? "rgba(200,16,46,0.12)" : "var(--bg-muted)", borderRadius: 8, padding: "1px 6px", color: subTab === t.key ? "var(--caveo-red)" : "var(--fg-4)" }}>
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Deep-link to global inbox */}
        <Link href="/approvals" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--fg-4)", textDecoration: "none" }}>
          <ExternalLink size={12} />
          All Modules Inbox
        </Link>
      </div>

      {/* Reuse the shared ApprovalInbox with Finance-scoped data */}
      <ApprovalInbox
        requests={filtered}
        caps={caps}
        onView={setViewRequest}
        onApprove={(r) => doApprove(r.id, "Quick approved from Finance Approvals")}
        onReject={(r) => doReject(r.id, "Quick rejected from Finance Approvals")}
      />

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
