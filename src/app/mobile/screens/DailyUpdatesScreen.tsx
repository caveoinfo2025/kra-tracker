"use client";
import { useEffect, useState, useCallback } from "react";
import MIcon from "../components/MIcon";
import MobileHeader from "@/components/mobile/MobileHeader";
import MobileAppShell from "@/components/mobile/MobileAppShell";
import MobileFormField from "@/components/mobile/MobileFormField";
import MobileSectionHeader from "@/components/mobile/MobileSectionHeader";
import MobileStatusPill from "@/components/mobile/MobileStatusPill";
import MobileSkeleton from "@/components/mobile/MobileSkeleton";
import MobileEmptyState from "@/components/mobile/MobileEmptyState";

interface DailyUpdatesScreenProps {
  employeeId: number;
  onBack: () => void;
  onSubmitted?: () => void;
}

type DailyUpdateRow = {
  id: number;
  date: string;
  topUpdates: string;
  keyMovement: string;
  blockers: string;
  topDealThisWeek: string;
  managerSupportRequired: boolean;
  updateStatus: string;
};

const STATUS_PILL: Record<string, { status: "approved" | "pending" | "danger" | "info"; label: string }> = {
  "On Track": { status: "approved", label: "On track" },
  Ahead: { status: "approved", label: "Ahead" },
  "At Risk": { status: "pending", label: "At risk" },
  Blocked: { status: "danger", label: "Blocked" },
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function DailyUpdatesScreen({ employeeId, onBack, onSubmitted }: DailyUpdatesScreenProps) {
  const [rows, setRows] = useState<DailyUpdateRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(() => {
    setRows(null);
    setLoadError(false);
    fetch(`/api/daily-updates?employeeId=${employeeId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Request failed");
        return res.json();
      })
      .then((data: DailyUpdateRow[]) => setRows(Array.isArray(data) ? data.slice(0, 10) : []))
      .catch(() => setLoadError(true));
  }, [employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="m-screen">
      <MobileHeader variant="page" title="Daily updates" eyebrow="Operations log" onBack={onBack} />
      <MobileAppShell hasHeader>
        <div className="m-section">
          <MobileSectionHeader label="Today's log" />
          <div className="m-card">
            <MobileFormField label="Top updates" hint="What did you accomplish today?">
              <textarea className="m-textarea" placeholder="Summarize today's progress" />
            </MobileFormField>
            <MobileFormField label="Key movement" hint="Optional">
              <textarea className="m-textarea" placeholder="Deal moved forward, customer call done…" />
            </MobileFormField>
            <MobileFormField label="Blockers" hint="Leave blank if none">
              <textarea className="m-textarea" placeholder="Anything blocking progress?" />
            </MobileFormField>
            <button className="m-btn" onClick={onSubmitted}>
              <MIcon name="check" size={14} color="#fff" />
              Submit update
            </button>
          </div>
        </div>

        <div className="m-section">
          <MobileSectionHeader label="History" />

          {rows === null && !loadError && (
            <>
              <MobileSkeleton variant="card" height={92} />
              <div style={{ height: 8 }} />
              <MobileSkeleton variant="card" height={92} />
            </>
          )}

          {loadError && (
            <MobileEmptyState
              icon="alert"
              tone="error"
              title="Couldn't load your updates"
              description="Something went wrong while fetching your daily update history."
              actionLabel="Retry"
              onAction={load}
            />
          )}

          {rows !== null && !loadError && rows.length === 0 && (
            <MobileEmptyState
              icon="doc"
              title="No updates yet"
              description="Updates you log will show up here, visible to your manager."
            />
          )}

          {rows !== null && !loadError && rows.length > 0 && rows.map((update) => {
            const pill = STATUS_PILL[update.updateStatus] ?? { status: "info" as const, label: update.updateStatus };
            return (
              <div className="m-list-card" key={update.id}>
                <div className="lc-head">
                  <div className="lc-title">{formatDate(update.date)}</div>
                  <MobileStatusPill status={pill.status} label={pill.label} />
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--fg-2)" }}>
                  <p style={{ margin: "6px 0" }}>{update.topUpdates}</p>
                  {update.keyMovement && (
                    <p style={{ margin: "6px 0" }}>
                      <strong>Movement:</strong> {update.keyMovement}
                    </p>
                  )}
                  {update.blockers && (
                    <p style={{ margin: "6px 0", color: "var(--ot-orange)" }}>
                      <strong>Blocker:</strong> {update.blockers}
                    </p>
                  )}
                  {update.topDealThisWeek && (
                    <p style={{ margin: "6px 0" }}>
                      <strong>Top deal:</strong> {update.topDealThisWeek}
                    </p>
                  )}
                </div>
                {update.managerSupportRequired && (
                  <MobileStatusPill status="info" label="Manager support requested" />
                )}
              </div>
            );
          })}
        </div>
      </MobileAppShell>
    </div>
  );
}
