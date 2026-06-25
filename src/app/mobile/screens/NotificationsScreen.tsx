"use client";
import MIcon from "../components/MIcon";
import MobileHeader from "@/components/mobile/MobileHeader";
import MobileAppShell from "@/components/mobile/MobileAppShell";
import MobileInsightCard from "@/components/mobile/MobileInsightCard";
import MobileSectionHeader from "@/components/mobile/MobileSectionHeader";
import { mockNotifications } from "../mock-data";

interface NotificationsScreenProps {
  onBack: () => void;
}

export default function NotificationsScreen({ onBack }: NotificationsScreenProps) {
  const n = mockNotifications;

  return (
    <div className="m-screen">
      <MobileHeader variant="page" eyebrow="System" title="Notifications" onBack={onBack} />
      <MobileAppShell hasHeader>
        <div className="m-section">
          <MobileInsightCard icon="alert" title={n.actionRequired.title} description={n.actionRequired.description} ctaLabel="Review" />
        </div>

        <div className="m-section">
          <MobileSectionHeader label="Recent alerts" />
          <div className="m-list">
            {n.recent.map((item, i) => (
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
                    color:
                      item.tone === "danger" ? "var(--caveo-red)" : item.tone === "warn" ? "var(--ot-orange)" : "var(--infra-blue)",
                  }}
                >
                  <MIcon name={item.icon} size={14} />
                </span>
                <div className="row-main">
                  <div className="row-meta">{item.category}</div>
                  <div className="row-title" style={{ fontWeight: 600 }}>{item.title}</div>
                </div>
                <div className="row-trailing row-meta">{item.time}</div>
              </div>
            ))}
          </div>
        </div>
      </MobileAppShell>
    </div>
  );
}
