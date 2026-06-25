"use client";
import MIcon from "../components/MIcon";
import MobileHeader from "@/components/mobile/MobileHeader";
import MobileAppShell from "@/components/mobile/MobileAppShell";
import MobileTimeline from "@/components/mobile/MobileTimeline";
import MobileKpiCard from "@/components/mobile/MobileKpiCard";
import { mockLeadDetail } from "../mock-data";

interface LeadDetailScreenProps {
  onBack: () => void;
  onToast?: (message: string) => void;
}

const INTERACTION_ICON: Record<string, string> = { call: "phone", mail: "mail", note: "doc" };

export default function LeadDetailScreen({ onBack, onToast }: LeadDetailScreenProps) {
  const l = mockLeadDetail;

  return (
    <div className="m-screen">
      <MobileHeader variant="page" eyebrow={l.location} title={l.company} onBack={onBack} />
      <MobileAppShell hasHeader>
        <div className="m-section">
          <div className="m-kpi-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <MobileKpiCard label="Deal value" value={l.dealValue} accent="top" valueSize={17} />
            <MobileKpiCard label="Current stage" value={l.stage} accent="top" valueSize={17} />
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
              <button className="m-nav-icon" aria-label="Call" onClick={() => onToast?.("Calling is not available in this preview")}>
                <MIcon name="phone" size={14} />
              </button>
              <button className="m-nav-icon" aria-label="Email" onClick={() => onToast?.("Email is not available in this preview")}>
                <MIcon name="mail" size={14} />
              </button>
              <button className="m-nav-icon" aria-label="Schedule" onClick={() => onToast?.("Scheduling is not available in this preview")}>
                <MIcon name="calendar" size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="m-section">
          <h4 className="m-subhead">Deal timeline</h4>
          <div className="m-card">
            <MobileTimeline items={l.timeline} />
          </div>
        </div>

        <div className="m-section">
          <h4 className="m-subhead">Interaction history</h4>
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
