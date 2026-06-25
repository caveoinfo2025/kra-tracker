"use client";
import MIcon from "../components/MIcon";
import MobileHeader from "@/components/mobile/MobileHeader";
import MobileAppShell from "@/components/mobile/MobileAppShell";
import MobileSectionHeader from "@/components/mobile/MobileSectionHeader";
import MobileListCard from "@/components/mobile/MobileListCard";
import MobileStatusPill from "@/components/mobile/MobileStatusPill";
import MobileTimeline from "@/components/mobile/MobileTimeline";
import { mockFinance } from "../mock-data";

export default function FinanceScreen() {
  const f = mockFinance;

  return (
    <div className="m-screen">
      <MobileHeader variant="shell" roleBadge="FINANCE" />
      <MobileAppShell hasBottomNav hasHeader>
        <div className="m-header">
          <h1 className="m-title" style={{ fontSize: 22 }}>Finance Self-Service</h1>
        </div>

        <div className="m-section">
          <div className="m-kpi m-kpi-accent" style={{ width: "100%" }}>
            <span className="m-kpi-label">Pending reimbursement</span>
            <div className="m-kpi-value" style={{ fontSize: 28 }}>{f.pendingReimbursement}</div>
          </div>
        </div>

        <div className="m-section">
          <div className="m-card" style={{ borderStyle: "dashed", textAlign: "center", padding: "22px 16px" }}>
            <MIcon name="upload" size={22} color="var(--fg-3)" />
            <p style={{ fontSize: 12.5, color: "var(--fg-3)", margin: "8px 0 12px" }}>
              Drop a receipt here or submit a new expense
            </p>
            <button className="m-btn" style={{ maxWidth: 180, margin: "0 auto" }}>New entry</button>
          </div>
        </div>

        <div className="m-section">
          <MobileSectionHeader label="Recent claims" />
          {f.claims.map((claim) => (
            <MobileListCard
              key={claim.id}
              title={claim.title}
              subtitle={`${claim.id} · ${claim.date}`}
              trailing={<MobileStatusPill status={claim.status === "action-required" ? "danger" : "pending"} label={claim.status === "action-required" ? "Action required" : "Processing"} />}
              meta={<span style={{ fontWeight: 700, color: "var(--fg-1)" }}>{claim.amount}</span>}
            />
          ))}
        </div>

        <div className="m-section">
          <MobileSectionHeader label="Claim status — EXP-3381" />
          <div className="m-card">
            <MobileTimeline items={f.statusTimeline} />
          </div>
        </div>
      </MobileAppShell>
    </div>
  );
}
