"use client";
import MIcon from "../components/MIcon";
import MobileHeader from "@/components/mobile/MobileHeader";
import MobileAppShell from "@/components/mobile/MobileAppShell";
import MobileFormField from "@/components/mobile/MobileFormField";
import MobileSectionHeader from "@/components/mobile/MobileSectionHeader";
import MobileStatusPill from "@/components/mobile/MobileStatusPill";
import { mockDailyUpdates } from "../mock-data";

interface DailyUpdatesScreenProps {
  onBack: () => void;
  onSubmitted?: () => void;
}

export default function DailyUpdatesScreen({ onBack, onSubmitted }: DailyUpdatesScreenProps) {
  return (
    <div className="m-screen">
      <MobileHeader variant="page" title="Daily updates" eyebrow="Operations log" onBack={onBack} />
      <MobileAppShell hasHeader>
        <div className="m-section">
          <MobileSectionHeader label="Today's log" />
          <div className="m-card">
            <MobileFormField label="Commitment">
              <textarea className="m-textarea" placeholder="What will you commit to today?" />
            </MobileFormField>
            <MobileFormField label="Completed work">
              <textarea className="m-textarea" placeholder="What did you complete?" />
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
          {mockDailyUpdates.map((update, i) => (
            <div className="m-list-card" key={i}>
              <div className="lc-head">
                <div>
                  <div className="lc-title">{update.date}</div>
                  <div className="lc-sub">{update.time}</div>
                </div>
                <MobileStatusPill status={update.status === "reviewed" ? "approved" : "pending"} label={update.status === "reviewed" ? "Reviewed" : "Pending review"} />
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                <p style={{ margin: "6px 0" }}>
                  <strong>C:</strong> {update.commitment}
                </p>
                <p style={{ margin: "6px 0" }}>
                  <strong>W:</strong> {update.completed}
                </p>
                <p style={{ margin: "6px 0" }}>
                  <strong>B:</strong> {update.blockers}
                </p>
              </div>
              {update.managerComment && (
                <div
                  style={{
                    background: "var(--bg-muted)",
                    borderRadius: 10,
                    padding: "8px 10px",
                    fontSize: 12,
                    fontStyle: "italic",
                    color: "var(--fg-2)",
                  }}
                >
                  “{update.managerComment}” — Manager
                </div>
              )}
            </div>
          ))}
        </div>
      </MobileAppShell>
    </div>
  );
}
