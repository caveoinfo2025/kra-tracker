"use client";
import MIcon from "../components/MIcon";
import MobileHeader from "@/components/mobile/MobileHeader";
import MobileAppShell from "@/components/mobile/MobileAppShell";
import MobileStatusPill from "@/components/mobile/MobileStatusPill";
import MobileTimeline from "@/components/mobile/MobileTimeline";
import { mockApprovalDetail } from "../mock-data";

interface ApprovalDetailScreenProps {
  onBack: () => void;
  onDecided: (msg: string) => void;
}

export default function ApprovalDetailScreen({ onBack, onDecided }: ApprovalDetailScreenProps) {
  const d = mockApprovalDetail;

  return (
    <div className="m-screen">
      <MobileHeader variant="page" eyebrow={d.id} title="Expense report" onBack={onBack} />
      <MobileAppShell hasHeader>
        <div className="m-section">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <MobileStatusPill status="danger" label="Action required" />
              <div style={{ fontSize: 13, color: "var(--fg-3)", marginTop: 6 }}>Submitted by {d.requester}</div>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>{d.totalAmount}</div>
          </div>
        </div>

        <div className="m-section">
          <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-3)", margin: "0 0 8px" }}>
            Expense breakdown
          </h4>
          <div className="m-list">
            {d.items.map((item, i) => (
              <div className="m-list-row" key={i}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MIcon name={item.icon} size={14} />
                </span>
                <div className="row-main row-title">{item.label}</div>
                <div className="row-trailing row-value">{item.amount}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="m-section">
          <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-3)", margin: "0 0 8px" }}>
            Receipts
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {d.receipts.map((r, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: "1",
                  borderRadius: 10,
                  background: "var(--bg-muted)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  color: "var(--fg-3)",
                  textAlign: "center",
                  padding: 4,
                }}
              >
                <MIcon name="doc" size={18} color="var(--fg-3)" />
              </div>
            ))}
          </div>
        </div>

        <div className="m-section">
          <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-3)", margin: "0 0 8px" }}>
            Workflow history
          </h4>
          <div className="m-card">
            <MobileTimeline items={d.workflow} />
          </div>
        </div>

        <div className="m-section" style={{ display: "flex", gap: 8 }}>
          <button className="m-btn m-btn-secondary" onClick={() => onDecided("Returned for clarification")}>Return</button>
          <button className="m-btn" style={{ background: "transparent", color: "var(--caveo-red)", border: "1px solid var(--caveo-red)" }} onClick={() => onDecided("Expense rejected")}>
            Reject
          </button>
          <button className="m-btn" onClick={() => onDecided("Expense approved")}>Approve</button>
        </div>
      </MobileAppShell>
    </div>
  );
}
