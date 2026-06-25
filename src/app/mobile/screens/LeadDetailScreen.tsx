"use client";
import MIcon from "../components/MIcon";
import MobileHeader from "@/components/mobile/MobileHeader";
import MobileAppShell from "@/components/mobile/MobileAppShell";
import MobileTimeline from "@/components/mobile/MobileTimeline";
import { mockLeadDetail } from "../mock-data";

interface LeadDetailScreenProps {
  onBack: () => void;
}

const INTERACTION_ICON: Record<string, string> = { call: "phone", mail: "mail", note: "doc" };

export default function LeadDetailScreen({ onBack }: LeadDetailScreenProps) {
  const l = mockLeadDetail;

  return (
    <div className="m-screen">
      <MobileHeader variant="page" eyebrow={l.location} title={l.company} onBack={onBack} />
      <MobileAppShell hasHeader>
        <div className="m-section">
          <div className="m-kpi-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <MobileKpiAccent label="Deal value" value={l.dealValue} />
            <MobileKpiAccent label="Current stage" value={l.stage} />
          </div>
        </div>

        <div className="m-section">
          <div className="m-card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="m-avatar lg">{l.contact.name.split(" ").map((n) => n[0]).join("")}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{l.contact.name}</div>
              <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{l.contact.title}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <span className="m-nav-icon"><MIcon name="phone" size={14} /></span>
              <span className="m-nav-icon"><MIcon name="mail" size={14} /></span>
              <span className="m-nav-icon"><MIcon name="calendar" size={14} /></span>
            </div>
          </div>
        </div>

        <div className="m-section">
          <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-3)", margin: "0 0 8px" }}>
            Deal timeline
          </h4>
          <div className="m-card">
            <MobileTimeline items={l.timeline} />
          </div>
        </div>

        <div className="m-section">
          <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-3)", margin: "0 0 8px" }}>
            Interaction history
          </h4>
          <div className="m-list">
            {l.interactions.map((it, i) => (
              <div className="m-list-row" key={i}>
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: "var(--bg-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <MIcon name={INTERACTION_ICON[it.type]} size={14} />
                </span>
                <div className="row-main">
                  <div className="row-title">{it.title}</div>
                  <div className="row-sub">{it.body}</div>
                  <div className="row-meta">{it.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </MobileAppShell>
    </div>
  );
}

function MobileKpiAccent({ label, value }: { label: string; value: string }) {
  return (
    <div className="m-kpi top-accent">
      <span className="m-kpi-label">{label}</span>
      <div className="m-kpi-value" style={{ fontSize: 17 }}>{value}</div>
    </div>
  );
}
