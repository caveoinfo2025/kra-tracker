"use client";
import { useState } from "react";
import MobileHeader from "@/components/mobile/MobileHeader";
import MobileAppShell from "@/components/mobile/MobileAppShell";
import MobileFilterChips from "@/components/mobile/MobileFilterChips";
import MobileListCard from "@/components/mobile/MobileListCard";
import MobileStatusPill from "@/components/mobile/MobileStatusPill";
import MobileEmptyState from "@/components/mobile/MobileEmptyState";
import { mockApprovals } from "../mock-data";

interface ApprovalsScreenProps {
  onBack?: () => void;
  onApprovalClick: (id: string) => void;
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "history", label: "History" },
];

const PRIORITY: Record<string, { status: "danger" | "pending" | "info"; label: string }> = {
  high: { status: "danger", label: "High" },
  medium: { status: "pending", label: "Medium" },
  low: { status: "info", label: "Low" },
};

export default function ApprovalsScreen({ onBack, onApprovalClick }: ApprovalsScreenProps) {
  const [filter, setFilter] = useState("pending");
  const items = filter === "history" ? [] : mockApprovals;

  return (
    <div className="m-screen">
      <MobileHeader variant="page" eyebrow="Manager workflow" title="Approval Queue" onBack={onBack} />
      <MobileAppShell hasHeader>
        <MobileFilterChips chips={FILTERS} active={filter} onChange={setFilter} />

        <div className="m-section">
          {items.length === 0 ? (
            <MobileEmptyState icon="shield" title="No pending approvals" description="You're all caught up — nothing needs your sign-off right now." />
          ) : (
            items.map((a) => (
              <MobileListCard
                key={a.id}
                accentTop={a.priority === "high"}
                title={a.person}
                subtitle={a.type}
                trailing={<MobileStatusPill {...PRIORITY[a.priority]} />}
                meta={
                  <>
                    <span style={{ fontWeight: 700, color: "var(--fg-1)" }}>{a.amount}</span>
                    <span>{a.date}</span>
                  </>
                }
                footer={
                  <>
                    <button className="reject">Reject</button>
                    <button className="approve" onClick={() => onApprovalClick(a.id)}>Review</button>
                  </>
                }
              />
            ))
          )}
        </div>
      </MobileAppShell>
    </div>
  );
}
