"use client";
import { useEffect, useState } from "react";
import MIcon from "../components/MIcon";

type TeamMember = {
  id: number;
  name: string;
  pipeline: number;
  won: number;
  openLeads: number;
  kraCount: number;
  avgKra: number;
};

type TeamData = {
  team: TeamMember[];
  totals: { pipeline: number; won: number; openLeads: number; avgKra: number };
};

interface Props {
  /** "pipeline" → Team Overview, "kra" → Team KRAs */
  mode: "pipeline" | "kra";
  onBack: () => void;
}

const AVATAR_COLORS = ["#5B626C", "#0046B0", "#B05000", "#1F7A3F", "#2A2A55", "#702D5B"];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function fmtLakhs(val: number) {
  if (val >= 100) return `₹${(val / 100).toFixed(2)} Cr`;
  return `₹${val.toFixed(0)} L`;
}

export default function TeamScreen({ mode, onBack }: Props) {
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mobile/team")
      .then((r) => r.json())
      .then((d) => {
        setData(d && Array.isArray(d.team) ? d : { team: [], totals: { pipeline: 0, won: 0, openLeads: 0, avgKra: 0 } });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const isKra = mode === "kra";
  const team = data?.team ?? [];
  const totals = data?.totals;

  const sorted = [...team].sort((a, b) =>
    isKra ? b.avgKra - a.avgKra : (b.pipeline + b.won) - (a.pipeline + a.won)
  );

  return (
    <div className="m-screen m-screen-enter">
      <div className="m-content has-tabbar">
        {/* Navbar */}
        <div className="m-navbar">
          <button className="m-back" onClick={onBack}>
            <MIcon name="back" size={18} /> Me
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ width: 36 }} />
        </div>

        {/* Header */}
        <div className="m-header">
          <div className="m-eyebrow">Manager View · FY26-27</div>
          <h1 className="m-title">{isKra ? "Team KRAs" : "Team Overview"}</h1>
          <div className="m-subtitle">
            {team.length} team member{team.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Totals card */}
        <div className="m-section">
          <div className="m-card">
            {loading ? (
              <div className="m-skeleton" style={{ height: 48, borderRadius: 8 }} />
            ) : isKra ? (
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 700, color: "var(--caveo-red)", lineHeight: 1 }}>
                  {totals?.avgKra ?? 0}%
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
                    Team Avg Progress
                  </div>
                  <div style={{ fontSize: 13, color: "var(--fg-2)", marginTop: 2 }}>
                    Across {team.reduce((s, t) => s + t.kraCount, 0)} active KRAs
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>{fmtLakhs(totals?.pipeline ?? 0)}</div>
                  <div style={{ fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>Pipeline</div>
                </div>
                <div style={{ width: 1, background: "var(--border-subtle)" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--success)" }}>{fmtLakhs(totals?.won ?? 0)}</div>
                  <div style={{ fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>Won</div>
                </div>
                <div style={{ width: 1, background: "var(--border-subtle)" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>{totals?.openLeads ?? 0}</div>
                  <div style={{ fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>Open</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Team list */}
        <div className="m-section">
          <div className="m-section-label">{isKra ? "By Performance" : "By Value"}</div>
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="m-card" style={{ marginBottom: 8 }}>
                <div className="m-skeleton" style={{ height: 14, width: "55%", marginBottom: 8 }} />
                <div className="m-skeleton" style={{ height: 6, borderRadius: 999 }} />
              </div>
            ))
          ) : sorted.length === 0 ? (
            <div className="m-empty">
              <div className="m-empty-title">No team data</div>
              <div className="m-empty-sub">No team members found.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sorted.map((m) => {
                const color = m.avgKra >= 75 ? "var(--success)" : m.avgKra >= 50 ? "var(--ot-orange)" : "var(--caveo-red)";
                return (
                  <div className="m-card" key={m.id}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div className="m-avatar" style={{ background: AVATAR_COLORS[m.id % AVATAR_COLORS.length], flexShrink: 0 }}>
                        {initials(m.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-1)" }}>{m.name}</div>
                        {isKra ? (
                          <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 1 }}>
                            {m.kraCount} active KRA{m.kraCount !== 1 ? "s" : ""}
                          </div>
                        ) : (
                          <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 1 }}>
                            {m.openLeads} open · Won {fmtLakhs(m.won)}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {isKra ? (
                          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>
                            {m.avgKra}%
                          </div>
                        ) : (
                          <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, lineHeight: 1 }}>
                            {fmtLakhs(m.pipeline)}
                          </div>
                        )}
                      </div>
                    </div>
                    {isKra && (
                      <div className="m-progress" style={{ marginTop: 10 }}>
                        <span style={{ width: `${m.avgKra}%`, background: color }} />
                      </div>
                    )}
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
