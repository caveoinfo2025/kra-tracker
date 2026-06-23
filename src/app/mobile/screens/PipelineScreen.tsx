"use client";
import { useEffect, useState } from "react";
import MIcon from "../components/MIcon";
import type { MobileLead } from "../types";
import { inrToLakhsEquivalent } from "@/lib/money";

// ── Leads ──────────────────────────────────────────────────────────────────────

const LEAD_STAGE_GROUPS = [
  { key: "NEW_LEAD",      label: "New Lead",      pill: "lead" },
  { key: "CONTACTED",     label: "Contacted",     pill: "lead" },
  { key: "QUALIFIED",     label: "Qualified",     pill: "qual" },
  { key: "PROPOSAL_SENT", label: "Proposal Sent", pill: "prop" },
  { key: "NEGOTIATION",   label: "Negotiation",   pill: "neg"  },
  { key: "CLOSED_WON",    label: "Closed Won",    pill: "won"  },
];

const LEAD_STAGE_COLORS: Record<string, string> = {
  NEW_LEAD:      "var(--fg-4)",
  CONTACTED:     "var(--fg-3)",
  QUALIFIED:     "var(--infra-blue)",
  PROPOSAL_SENT: "var(--ot-orange)",
  NEGOTIATION:   "var(--caveo-red)",
  CLOSED_WON:    "var(--success)",
};

// ── Opportunities ──────────────────────────────────────────────────────────────

type Opp = {
  id: number;
  stage: string;
  value: number;
  probability: number;
  expectedClosureDate: string | null;
  updatedAt: string;
  lead: {
    title: string;
    companyName: string;
    source: string;
    assignedTo: { id: number; name: string } | null;
  };
  _count: { tasks: number; meetings: number };
};

const OPP_STAGE_GROUPS = [
  { key: "PROPOSAL_SENT", label: "Proposal Sent", pill: "prop" },
  { key: "FOLLOW_UP",     label: "Follow Up",     pill: "prop" },
  { key: "NEGOTIATION",   label: "Negotiation",   pill: "neg"  },
  { key: "WON",           label: "Won",            pill: "won"  },
  { key: "ON_HOLD",       label: "On Hold",        pill: "lead" },
  { key: "LOST",          label: "Lost",           pill: "lost" },
];

const OPP_STAGE_COLORS: Record<string, string> = {
  PROPOSAL_SENT: "var(--ot-orange)",
  FOLLOW_UP:     "var(--ot-orange)",
  NEGOTIATION:   "var(--caveo-red)",
  WON:           "var(--success)",
  ON_HOLD:       "var(--fg-3)",
  LOST:          "var(--fg-4)",
};

// ── Shared helpers ─────────────────────────────────────────────────────────────

const AVATAR_COLORS = ["#5B626C","#0046B0","#B05000","#1F7A3F","#2A2A55","#702D5B"];

// `val` is actual ₹ INR (Decimal Release 2) — convert to ₹-Lakhs-equivalent for this Cr/L display.
function fmtLakhs(val: number) {
  const lakhs = inrToLakhsEquivalent(val);
  if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(2)} Cr`;
  return `₹${lakhs.toFixed(0)} L`;
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  isManager: boolean;
  onDealClick: (lead: MobileLead) => void;
  onScanCard: () => void;
}

type View = "leads" | "opps";

export default function PipelineScreen({ isManager, onDealClick, onScanCard }: Props) {
  // Leads state
  const [leads, setLeads] = useState<MobileLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadSeg, setLeadSeg] = useState<"all" | "open">("all");
  const [q, setQ] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Opportunities state
  const [opps, setOpps] = useState<Opp[]>([]);
  const [oppsLoading, setOppsLoading] = useState(false);
  const [oppsFetched, setOppsFetched] = useState(false);
  const [oppSeg, setOppSeg] = useState<"active" | "won" | "all">("active");

  // Top-level view: Leads | Opportunities
  const [view, setView] = useState<View>("leads");

  useEffect(() => {
    fetch("/api/pipeline/leads?limit=100")
      .then(r => r.json())
      .then(data => {
        setLeads(data.rows ?? []);
        setLeadsLoading(false);
      })
      .catch(() => setLeadsLoading(false));
  }, []);

  function switchView(v: View) {
    setView(v);
    setShowSearch(false);
    if (v === "opps" && !oppsFetched) {
      setOppsLoading(true);
      fetch("/api/pipeline/opportunities?limit=100")
        .then(r => r.json())
        .then(data => {
          setOpps(data.rows ?? []);
          setOppsLoading(false);
          setOppsFetched(true);
        })
        .catch(() => { setOppsLoading(false); setOppsFetched(true); });
    }
  }

  // ── Leads rendering ──────────────────────────────────────────────────────────

  const filteredLeads = leads.filter(l => {
    if (leadSeg === "open" && (l.stage === "CLOSED_WON" || l.stage === "CLOSED_LOST")) return false;
    if (q) {
      const lq = q.toLowerCase();
      return l.title.toLowerCase().includes(lq) || l.companyName.toLowerCase().includes(lq);
    }
    return true;
  });

  const leadTotalVal = filteredLeads
    .filter(l => l.stage !== "CLOSED_WON" && l.stage !== "CLOSED_LOST")
    .reduce((s, l) => s + (l.expectedValue || 0), 0);

  // ── Opportunities rendering ──────────────────────────────────────────────────

  const filteredOpps = opps.filter(o => {
    if (oppSeg === "active") return o.stage !== "WON" && o.stage !== "LOST";
    if (oppSeg === "won") return o.stage === "WON";
    return true;
  });

  const oppTotalVal = filteredOpps.reduce((s, o) => s + (o.value || 0), 0);
  const wonVal = opps.filter(o => o.stage === "WON").reduce((s, o) => s + (o.value || 0), 0);

  return (
    <div className="m-screen">
      <div className="m-content has-tabbar">
        {/* Navbar */}
        <div className="m-navbar">
          <button className="m-nav-icon" onClick={() => { setShowSearch(s => !s); setQ(""); }}>
            <MIcon name="search" size={17} />
          </button>
          <div className="m-nav-title">Pipeline</div>
          <button className="m-nav-icon" onClick={onScanCard} aria-label="Scan business card">
            <MIcon name="doc" size={17} color="var(--caveo-red)" />
          </button>
        </div>

        {/* Top view switcher: Leads | Opportunities */}
        <div style={{ padding: "0 18px 12px" }}>
          <div className="m-seg">
            <button className={view === "leads" ? "active" : ""} onClick={() => switchView("leads")}>
              Leads
            </button>
            <button className={view === "opps" ? "active" : ""} onClick={() => switchView("opps")}>
              Opportunities
            </button>
          </div>
        </div>

        {/* ─────────── LEADS VIEW ─────────── */}
        {view === "leads" && (
          <>
            {/* Search bar */}
            {showSearch && (
              <div style={{ padding: "0 18px 10px" }}>
                <input
                  className="m-input"
                  placeholder="Search leads…"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {/* Header */}
            <div className="m-header" style={{ paddingTop: 4 }}>
              <div className="m-eyebrow">{isManager ? "All Deals" : "My Deals"} · FY26-27</div>
              <h1 className="m-title">Leads</h1>
              <div className="m-subtitle">
                {filteredLeads.length} leads · {fmtLakhs(leadTotalVal)} open
              </div>
            </div>

            {/* Sub-segment */}
            <div style={{ padding: "0 18px 14px" }}>
              <div className="m-seg">
                <button className={leadSeg === "all" ? "active" : ""} onClick={() => setLeadSeg("all")}>All</button>
                <button className={leadSeg === "open" ? "active" : ""} onClick={() => setLeadSeg("open")}>Active</button>
              </div>
            </div>

            {leadsLoading ? (
              <div className="m-section">
                {[1,2,3].map(i => (
                  <div key={i} className="m-card" style={{ marginBottom: 8 }}>
                    <div className="m-skeleton" style={{ height: 14, width: "60%", marginBottom: 8 }} />
                    <div className="m-skeleton" style={{ height: 12, width: "40%" }} />
                  </div>
                ))}
              </div>
            ) : (
              LEAD_STAGE_GROUPS.map(sg => {
                const items = filteredLeads
                  .filter(l => l.stage === sg.key)
                  .sort((a, b) => (b.expectedValue || 0) - (a.expectedValue || 0));
                if (items.length === 0) return null;
                const stageTotal = items.reduce((s, l) => s + (l.expectedValue || 0), 0);
                return (
                  <div className="m-section" key={sg.key}>
                    <div className="m-section-label">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span className={`m-pill ${sg.pill}`} style={{ padding: "1px 8px" }}>{sg.label}</span>
                        <span>· {items.length}</span>
                      </span>
                      <span style={{ color: "var(--fg-3)", fontWeight: 600 }}>{fmtLakhs(stageTotal)}</span>
                    </div>
                    <div className="m-list">
                      {items.map(lead => {
                        const ownerName = lead.assignedTo?.name ?? "Unassigned";
                        const ownerId = lead.assignedTo?.id ?? 0;
                        return (
                          <div className="m-list-row" key={lead.id} onClick={() => onDealClick(lead)}>
                            <div style={{
                              width: 4, alignSelf: "stretch", borderRadius: 2,
                              background: LEAD_STAGE_COLORS[lead.stage] ?? "var(--border)",
                              flexShrink: 0,
                            }} />
                            <div className="row-main">
                              <div className="row-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {lead.title}
                              </div>
                              <div className="row-sub">{lead.companyName}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                                <div className="m-avatar sm" style={{ background: AVATAR_COLORS[ownerId % AVATAR_COLORS.length] }}>
                                  {initials(ownerName)}
                                </div>
                                <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{ownerName.split(" ")[0]}</span>
                                <span style={{ fontSize: 11, color: "var(--fg-4)" }}>·</span>
                                <span style={{ fontSize: 11, color: "var(--fg-3)" }}>
                                  {new Date(lead.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                                </span>
                              </div>
                            </div>
                            <div className="row-trailing">
                              <div className="row-value">{fmtLakhs(lead.expectedValue || 0)}</div>
                              <MIcon name="chev" size={14} color="var(--fg-4)" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}

            {!leadsLoading && filteredLeads.length === 0 && (
              <div className="m-section">
                <div className="m-empty">
                  <div className="m-empty-title">No leads found</div>
                  <div className="m-empty-sub">Try adjusting your search or filters.</div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ─────────── OPPORTUNITIES VIEW ─────────── */}
        {view === "opps" && (
          <>
            {/* Header */}
            <div className="m-header" style={{ paddingTop: 4 }}>
              <div className="m-eyebrow">{isManager ? "All Opportunities" : "My Opportunities"} · FY26-27</div>
              <h1 className="m-title">Opportunities</h1>
              <div className="m-subtitle">
                {filteredOpps.length} open · {fmtLakhs(wonVal)} won
              </div>
            </div>

            {/* KPI summary */}
            <div className="m-section">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div className="m-kpi">
                  <div className="m-kpi-label">Active</div>
                  <div className="m-kpi-value" style={{ fontSize: 18 }}>
                    {opps.filter(o => o.stage !== "WON" && o.stage !== "LOST").length}
                  </div>
                </div>
                <div className="m-kpi">
                  <div className="m-kpi-label">Pipeline</div>
                  <div className="m-kpi-value" style={{ fontSize: 18 }}>
                    {oppTotalVal >= 100
                      ? <>{(oppTotalVal / 100).toFixed(1)}<span className="unit">Cr</span></>
                      : <>{oppTotalVal.toFixed(0)}<span className="unit">L</span></>}
                  </div>
                </div>
                <div className="m-kpi" style={{ borderLeft: "3px solid var(--success)" }}>
                  <div className="m-kpi-label">Won</div>
                  <div className="m-kpi-value" style={{ fontSize: 18, color: "var(--success)" }}>
                    {wonVal >= 100
                      ? <>{(wonVal / 100).toFixed(1)}<span className="unit">Cr</span></>
                      : <>{wonVal.toFixed(0)}<span className="unit">L</span></>}
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-segment */}
            <div style={{ padding: "0 18px 14px" }}>
              <div className="m-seg">
                <button className={oppSeg === "active" ? "active" : ""} onClick={() => setOppSeg("active")}>Active</button>
                <button className={oppSeg === "won" ? "active" : ""} onClick={() => setOppSeg("won")}>Won</button>
                <button className={oppSeg === "all" ? "active" : ""} onClick={() => setOppSeg("all")}>All</button>
              </div>
            </div>

            {oppsLoading ? (
              <div className="m-section">
                {[1,2,3].map(i => (
                  <div key={i} className="m-card" style={{ marginBottom: 8 }}>
                    <div className="m-skeleton" style={{ height: 14, width: "60%", marginBottom: 8 }} />
                    <div className="m-skeleton" style={{ height: 12, width: "40%" }} />
                  </div>
                ))}
              </div>
            ) : (
              OPP_STAGE_GROUPS.map(sg => {
                const items = filteredOpps
                  .filter(o => o.stage === sg.key)
                  .sort((a, b) => (b.value || 0) - (a.value || 0));
                if (items.length === 0) return null;
                const stageTotal = items.reduce((s, o) => s + (o.value || 0), 0);
                return (
                  <div className="m-section" key={sg.key}>
                    <div className="m-section-label">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span className={`m-pill ${sg.pill}`} style={{ padding: "1px 8px" }}>{sg.label}</span>
                        <span>· {items.length}</span>
                      </span>
                      <span style={{ color: "var(--fg-3)", fontWeight: 600 }}>{fmtLakhs(stageTotal)}</span>
                    </div>
                    <div className="m-list">
                      {items.map(opp => {
                        const ownerName = opp.lead.assignedTo?.name ?? "Unassigned";
                        const ownerId = opp.lead.assignedTo?.id ?? 0;
                        return (
                          <div className="m-list-row" key={opp.id}>
                            <div style={{
                              width: 4, alignSelf: "stretch", borderRadius: 2,
                              background: OPP_STAGE_COLORS[opp.stage] ?? "var(--border)",
                              flexShrink: 0,
                            }} />
                            <div className="row-main">
                              <div className="row-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {opp.lead.title}
                              </div>
                              <div className="row-sub">{opp.lead.companyName}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                                <div className="m-avatar sm" style={{ background: AVATAR_COLORS[ownerId % AVATAR_COLORS.length] }}>
                                  {initials(ownerName)}
                                </div>
                                <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{ownerName.split(" ")[0]}</span>
                                {opp.probability > 0 && (
                                  <>
                                    <span style={{ fontSize: 11, color: "var(--fg-4)" }}>·</span>
                                    <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{opp.probability}%</span>
                                  </>
                                )}
                                {opp._count.tasks > 0 && (
                                  <>
                                    <span style={{ fontSize: 11, color: "var(--fg-4)" }}>·</span>
                                    <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{opp._count.tasks} task{opp._count.tasks !== 1 ? "s" : ""}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="row-trailing">
                              <div className="row-value">{fmtLakhs(opp.value || 0)}</div>
                              {opp.expectedClosureDate && (
                                <div className="row-meta">
                                  {new Date(opp.expectedClosureDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}

            {!oppsLoading && oppsFetched && filteredOpps.length === 0 && (
              <div className="m-section">
                <div className="m-empty">
                  <div className="m-empty-title">
                    {oppSeg === "won" ? "No won deals yet" : "No active opportunities"}
                  </div>
                  <div className="m-empty-sub">
                    {oppSeg === "won"
                      ? "Win your first deal to see it here."
                      : "Move a lead to Proposal Sent to create an opportunity."}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}
