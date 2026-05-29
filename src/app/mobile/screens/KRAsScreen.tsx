"use client";
import { useEffect, useState } from "react";
import MIcon from "../components/MIcon";

type KRA = {
  id: number;
  title: string;
  description: string;
  target: string;
  weight: number;
  status: string;
  reviews: { progress: number; score: number; notes: string; week: number; year: number }[];
};

interface Props {
  userName: string;
  employeeId: number;
  onBack: () => void;
}

export default function KRAsScreen({ userName, employeeId, onBack }: Props) {
  const [kras, setKras] = useState<KRA[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/kras/me")
      .then(r => r.json())
      .then(data => {
        setKras(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [employeeId]);

  const getProgress = (kra: KRA) => kra.reviews?.[0]?.progress ?? 0;
  const activeKras = kras.filter(k => k.status === "active" || !k.status);

  // Weighted score
  const totalWeight = activeKras.reduce((s, k) => s + k.weight, 0);
  const weighted = totalWeight > 0
    ? activeKras.reduce((s, k) => s + getProgress(k) * (k.weight / totalWeight), 0)
    : 0;

  const CIRCUMFERENCE = 2 * Math.PI * 40; // r=40

  const firstName = userName.split(" ")[0];

  return (
    <div className="m-screen m-screen-enter">
      <div className="m-content has-tabbar">
        {/* Navbar */}
        <div className="m-navbar">
          <button className="m-back" onClick={onBack}>
            <MIcon name="back" size={18} /> Me
          </button>
          <div style={{ flex: 1 }} />
          <div className="m-nav-icon">
            <MIcon name="more" size={16} />
          </div>
        </div>

        {/* Header */}
        <div className="m-header">
          <div className="m-eyebrow">FY26-27</div>
          <h1 className="m-title">My KRAs</h1>
          <div className="m-subtitle">{firstName}'s performance tracking</div>
        </div>

        {/* Overall score donut */}
        <div className="m-section">
          <div className="m-card" style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {loading ? (
              <div className="m-skeleton" style={{ width: 92, height: 92, borderRadius: 50 }} />
            ) : (
              <svg width="92" height="92" viewBox="0 0 92 92">
                <circle cx="46" cy="46" r="40" stroke="var(--bg-muted)" strokeWidth="9" fill="none" />
                <circle
                  cx="46" cy="46" r="40"
                  stroke="var(--caveo-red)" strokeWidth="9" fill="none"
                  strokeDasharray={`${(weighted / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                  transform="rotate(-90 46 46)"
                  strokeLinecap="round"
                />
                <text x="46" y="49" textAnchor="middle" fontFamily="var(--font-display)" fontSize="22" fontWeight="700" fill="var(--fg-1)">
                  {Math.round(weighted)}%
                </text>
                <text x="46" y="64" textAnchor="middle" fontSize="9" letterSpacing="0.12em" fill="var(--fg-3)">
                  SCORE
                </text>
              </svg>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600 }}>
                Weighted Score
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-1)", marginTop: 4, lineHeight: 1.35 }}>
                {weighted >= 75 ? "On track to hit plan" : weighted >= 50 ? "Needs attention" : "Behind plan"}
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4, lineHeight: 1.45 }}>
                {activeKras.length} active KRA{activeKras.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </div>

        {/* KRAs list */}
        <div className="m-section">
          <div className="m-section-label">Active KRAs</div>
          {loading ? (
            [1,2,3].map(i => (
              <div key={i} className="m-card" style={{ marginBottom: 8 }}>
                <div className="m-skeleton" style={{ height: 14, width: "65%", marginBottom: 8 }} />
                <div className="m-skeleton" style={{ height: 6, borderRadius: 999 }} />
              </div>
            ))
          ) : activeKras.length === 0 ? (
            <div className="m-empty">
              <div className="m-empty-title">No active KRAs</div>
              <div className="m-empty-sub">Your manager will assign KRAs for this quarter.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {activeKras.map(k => {
                const progress = getProgress(k);
                const color = progress >= 75 ? "var(--success)" : progress >= 50 ? "var(--ot-orange)" : "var(--caveo-red)";
                return (
                  <div className="m-card" key={k.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-1)" }}>{k.title}</div>
                        {k.target && (
                          <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4, lineHeight: 1.4 }}>
                            <span style={{ color: "var(--fg-2)", fontWeight: 500 }}>Target:</span> {k.target}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>
                          {progress}%
                        </div>
                        <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          Wt {k.weight}%
                        </div>
                      </div>
                    </div>
                    <div className="m-progress" style={{ marginTop: 12 }}>
                      <span style={{ width: `${progress}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}
