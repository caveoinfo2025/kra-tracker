"use client";
import { useEffect, useState } from "react";
import MIcon from "../components/MIcon";
import type { MobileLead } from "../types";

type KRA = {
  id: number;
  title: string;
  target: string;
  weight: number;
  reviews: { progress: number }[];
};

interface TodayScreenProps {
  userName: string;
  isManager: boolean;
  onNotifications: () => void;
  onDealClick: (lead: MobileLead) => void;
  onQuickLog: (type: string) => void;
  onKRAs: () => void;
  onUpdates: () => void;
}

const AVATAR_COLORS = ["#5B626C", "#0046B0", "#B05000", "#1F7A3F", "#2A2A55", "#702D5B"];

function stagePill(stage: string) {
  const map: Record<string, string> = {
    NEW_LEAD: "lead", CONTACTED: "lead", QUALIFIED: "qual",
    PROPOSAL_SENT: "prop", NEGOTIATION: "neg",
    CLOSED_WON: "won", CLOSED_LOST: "lost",
  };
  return map[stage] ?? "lead";
}

function stageLabel(stage: string) {
  const map: Record<string, string> = {
    NEW_LEAD: "New Lead", CONTACTED: "Contacted", QUALIFIED: "Qualified",
    PROPOSAL_SENT: "Proposal Sent", NEGOTIATION: "Negotiation",
    CLOSED_WON: "Closed Won", CLOSED_LOST: "Closed Lost",
  };
  return map[stage] ?? stage;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function todayLabel() {
  return new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
}

function fmtLakhs(val: number) {
  if (val >= 100) return `₹${(val / 100).toFixed(2)} Cr`;
  return `₹${val.toFixed(0)} L`;
}

export default function TodayScreen({
  userName,
  isManager,
  onNotifications,
  onDealClick,
  onQuickLog,
  onKRAs,
  onUpdates,
}: TodayScreenProps) {
  const [leads, setLeads] = useState<MobileLead[]>([]);
  const [kras, setKras] = useState<KRA[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/pipeline/leads?limit=20").then(r => r.json()).catch(() => ({ rows: [] })),
      fetch("/api/kras/me").then(r => r.json()).catch(() => []),
    ]).then(([leadsData, krasData]) => {
      setLeads(leadsData.rows ?? []);
      setKras(Array.isArray(krasData) ? krasData : []);
      setLoading(false);
    });
  }, []);

  const activeLeads = leads.filter(l => l.stage !== "CLOSED_WON" && l.stage !== "CLOSED_LOST");
  const wonLeads    = leads.filter(l => l.stage === "CLOSED_WON");
  const pipelineVal = activeLeads.reduce((s, l) => s + (l.expectedValue || 0), 0);
  const bookingsVal = wonLeads.reduce((s, l) => s + (l.expectedValue || 0), 0);
  const topFocus    = [...activeLeads].sort((a, b) => (b.expectedValue || 0) - (a.expectedValue || 0)).slice(0, 3);

  const displayKras = kras.slice(0, 2);

  const firstName = userName.split(" ")[0];

  return (
    <div className="m-screen">
      <div className="m-content has-tabbar">
        {/* Navbar */}
        <div className="m-navbar">
          <div style={{ width: 36 }} />
          <div className="m-nav-title" style={{ fontFamily: "var(--font-display)", fontSize: 17, letterSpacing: "-0.01em" }}>Caveo</div>
          <button className="m-nav-icon" onClick={onNotifications}>
            <MIcon name="bell" size={18} />
          </button>
        </div>

        {/* Greeting card */}
        <div className="m-greeting">
          <div className="eyebrow">{todayLabel()}</div>
          <div className="name">{getGreeting()}, {firstName}</div>
          {isManager && (
            <div className="hint">
              Team pipeline overview — {activeLeads.length} active deals tracked.
            </div>
          )}
          <div className="stat-row">
            <div className="stat">
              <div className="val">
                {pipelineVal >= 100
                  ? <>₹{(pipelineVal / 100).toFixed(1)}<span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginLeft: 2 }}>Cr</span></>
                  : <>₹{pipelineVal.toFixed(0)}<span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginLeft: 2 }}>L</span></>
                }
              </div>
              <div className="label">Pipeline</div>
            </div>
            <div className="stat">
              <div className="val">
                {bookingsVal >= 100
                  ? <>₹{(bookingsVal / 100).toFixed(2)}<span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginLeft: 2 }}>Cr</span></>
                  : <>₹{bookingsVal.toFixed(0)}<span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginLeft: 2 }}>L</span></>
                }
              </div>
              <div className="label">Won</div>
            </div>
            <div className="stat">
              <div className="val">{activeLeads.length}</div>
              <div className="label">Open</div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="m-action-strip">
          <button className="m-action" onClick={() => onQuickLog("call")}>
            <div className="ico"><MIcon name="phone" size={14} color="var(--caveo-red)" /></div>
            Log Call
          </button>
          <button className="m-action" onClick={() => onQuickLog("meeting")}>
            <div className="ico"><MIcon name="calendar" size={14} color="var(--caveo-red)" /></div>
            Log Meeting
          </button>
          <button className="m-action" onClick={() => onQuickLog("deal")}>
            <div className="ico"><MIcon name="doc" size={14} color="var(--caveo-red)" /></div>
            New Lead
          </button>
          <button className="m-action" onClick={onUpdates}>
            <div className="ico"><MIcon name="updates" size={14} color="var(--caveo-red)" /></div>
            Daily Update
          </button>
        </div>

        {/* Today's Focus */}
        <div className="m-section">
          <div className="m-section-label">
            Today's Focus
            <span className="more" onClick={() => {}}>View all →</span>
          </div>
          {loading ? (
            <>
              <div className="m-card" style={{ marginBottom: 8 }}>
                <div className="m-skeleton" style={{ height: 14, width: "60%", marginBottom: 8 }} />
                <div className="m-skeleton" style={{ height: 12, width: "40%" }} />
              </div>
              <div className="m-card">
                <div className="m-skeleton" style={{ height: 14, width: "55%", marginBottom: 8 }} />
                <div className="m-skeleton" style={{ height: 12, width: "35%" }} />
              </div>
            </>
          ) : topFocus.length === 0 ? (
            <div className="m-card">
              <div style={{ textAlign: "center", padding: "20px 0", color: "var(--fg-3)", fontSize: 13 }}>
                No active deals — add a new lead to get started.
              </div>
            </div>
          ) : (
            topFocus.map(lead => (
              <button
                key={lead.id}
                className="m-card"
                style={{ width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 8, display: "block" }}
                onClick={() => onDealClick(lead)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: "var(--caveo-red)", fontWeight: 600, letterSpacing: "0.04em" }}>
                      {lead.assignedTo?.name ?? "Unassigned"}
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--fg-1)", marginTop: 4, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {lead.title}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {lead.companyName}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>
                      {fmtLakhs(lead.expectedValue || 0)}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 2 }}>
                      {new Date(lead.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                  <span className={`m-pill ${stagePill(lead.stage)}`}>{stageLabel(lead.stage)}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* KRAs preview */}
        {!isManager && (
          <div className="m-section">
            <div className="m-section-label">
              My KRAs
              <span className="more" onClick={onKRAs}>All KRAs →</span>
            </div>
            {loading ? (
              <div className="m-card">
                <div className="m-skeleton" style={{ height: 12, width: "70%", marginBottom: 10 }} />
                <div className="m-skeleton" style={{ height: 6, borderRadius: 999 }} />
              </div>
            ) : displayKras.length === 0 ? (
              <div className="m-card" style={{ textAlign: "center", padding: "20px 0", color: "var(--fg-3)", fontSize: 13 }}>
                No active KRAs found.
              </div>
            ) : (
              <div className="m-card">
                {displayKras.map((k, i) => {
                  const progress = k.reviews?.[0]?.progress ?? 0;
                  const color = progress >= 75 ? "var(--success)" : progress >= 50 ? "var(--ot-orange)" : "var(--caveo-red)";
                  return (
                    <div
                      key={k.id}
                      style={{
                        paddingTop: i === 0 ? 0 : 14,
                        marginTop: i === 0 ? 0 : 14,
                        borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg-1)" }}>{k.title}</div>
                          <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>
                            {k.target} · Weight {k.weight}%
                          </div>
                        </div>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color, lineHeight: 1 }}>
                          {progress}%
                        </div>
                      </div>
                      <div className="m-progress" style={{ marginTop: 8 }}>
                        <span style={{ width: `${progress}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}
