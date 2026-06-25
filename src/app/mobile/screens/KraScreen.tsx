"use client";
import MobileHeader from "@/components/mobile/MobileHeader";
import MobileAppShell from "@/components/mobile/MobileAppShell";
import { mockKra } from "../mock-data";

interface KraScreenProps {
  onBack: () => void;
}

export default function KraScreen({ onBack }: KraScreenProps) {
  const k = mockKra;

  return (
    <div className="m-screen">
      <MobileHeader variant="page" eyebrow="Performance" title="KRA Dashboard" onBack={onBack} />
      <MobileAppShell hasHeader>
        <div className="m-section">
          <div className="m-card" style={{ textAlign: "center", padding: "24px 16px" }}>
            <div style={{ fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-3)", fontWeight: 600 }}>
              Overall KRA score
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 700, color: "var(--caveo-red)", margin: "8px 0" }}>
              {k.overallScore}%
            </div>
            <div className="m-progress" style={{ maxWidth: 220, margin: "0 auto" }}>
              <span style={{ width: `${k.overallScore}%` }} />
            </div>
          </div>
        </div>

        <div className="m-section">
          {k.metrics.map((m) => (
            <div className="m-card" key={m.label} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>{m.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: m.percent >= 100 ? "var(--success)" : "var(--caveo-red)" }}>
                  {m.percent}%
                </span>
              </div>
              <div className="m-progress" style={{ marginBottom: 8 }}>
                <span style={{ width: `${Math.min(m.percent, 100)}%` }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--fg-3)" }}>
                <span>Target: {m.target}</span>
                <span>Achieved: {m.achieved}</span>
              </div>
            </div>
          ))}
        </div>
      </MobileAppShell>
    </div>
  );
}
