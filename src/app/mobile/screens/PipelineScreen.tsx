"use client";
import { useEffect, useState } from "react";
import MIcon from "../components/MIcon";
import type { MobileLead } from "../types";

interface Props {
  isManager: boolean;
  onDealClick: (lead: MobileLead) => void;
}

const STAGE_GROUPS = [
  { key: "NEW_LEAD",      label: "New Lead",      pill: "lead" },
  { key: "CONTACTED",     label: "Contacted",     pill: "lead" },
  { key: "QUALIFIED",     label: "Qualified",     pill: "qual" },
  { key: "PROPOSAL_SENT", label: "Proposal Sent", pill: "prop" },
  { key: "NEGOTIATION",   label: "Negotiation",   pill: "neg"  },
  { key: "CLOSED_WON",    label: "Closed Won",    pill: "won"  },
];

const STAGE_COLORS: Record<string, string> = {
  NEW_LEAD:      "var(--fg-4)",
  CONTACTED:     "var(--fg-3)",
  QUALIFIED:     "var(--infra-blue)",
  PROPOSAL_SENT: "var(--ot-orange)",
  NEGOTIATION:   "var(--caveo-red)",
  CLOSED_WON:    "var(--success)",
};

const AVATAR_COLORS = ["#5B626C","#0046B0","#B05000","#1F7A3F","#2A2A55","#702D5B"];

function fmtLakhs(val: number) {
  if (val >= 100) return `₹${(val / 100).toFixed(2)} Cr`;
  return `₹${val.toFixed(0)} L`;
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function PipelineScreen({ isManager, onDealClick }: Props) {
  const [leads, setLeads] = useState<MobileLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [seg, setSeg] = useState<"all" | "mine" | "open">("all");
  const [q, setQ] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    fetch("/api/pipeline/leads?limit=100")
      .then(r => r.json())
      .then(data => {
        setLeads(data.rows ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = leads.filter(l => {
    if (seg === "open" && (l.stage === "CLOSED_WON" || l.stage === "CLOSED_LOST")) return false;
    if (q) {
      const lq = q.toLowerCase();
      return l.title.toLowerCase().includes(lq) || l.companyName.toLowerCase().includes(lq);
    }
    return true;
  });

  const totalVal = filtered.filter(l => l.stage !== "CLOSED_WON" && l.stage !== "CLOSED_LOST").reduce((s, l) => s + (l.expectedValue || 0), 0);

  return (
    <div className="m-screen">
      <div className="m-content has-tabbar">
        {/* Navbar */}
        <div className="m-navbar">
          <button className="m-nav-icon" onClick={() => setShowSearch(s => !s)}>
            <MIcon name="search" size={17} />
          </button>
          <div className="m-nav-title">Pipeline</div>
          <button className="m-nav-icon">
            <MIcon name="filter" size={16} />
          </button>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div style={{ padding: "0 18px 10px" }}>
            <input
              className="m-input"
              placeholder="Search leads..."
              value={q}
              onChange={e => setQ(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {/* Header */}
        <div className="m-header">
          <div className="m-eyebrow">
            {isManager ? "All Deals" : "My Deals"} · FY26-27
          </div>
          <h1 className="m-title">Pipeline</h1>
          <div className="m-subtitle">
            {filtered.length} leads · {fmtLakhs(totalVal)} open
          </div>
        </div>

        {/* Segment */}
        <div style={{ padding: "0 18px 14px" }}>
          <div className="m-seg">
            <button className={seg === "all" ? "active" : ""} onClick={() => setSeg("all")}>All</button>
            <button className={seg === "open" ? "active" : ""} onClick={() => setSeg("open")}>Active</button>
            <button className={seg === "mine" ? "active" : ""} onClick={() => setSeg("mine")}>Mine</button>
          </div>
        </div>

        {loading ? (
          <div className="m-section">
            {[1,2,3].map(i => (
              <div key={i} className="m-card" style={{ marginBottom: 8 }}>
                <div className="m-skeleton" style={{ height: 14, width: "60%", marginBottom: 8 }} />
                <div className="m-skeleton" style={{ height: 12, width: "40%" }} />
              </div>
            ))}
          </div>
        ) : (
          STAGE_GROUPS.map(sg => {
            const items = filtered.filter(l => l.stage === sg.key).sort((a, b) => (b.expectedValue || 0) - (a.expectedValue || 0));
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
                          width: 4,
                          alignSelf: "stretch",
                          borderRadius: 2,
                          background: STAGE_COLORS[lead.stage] ?? "var(--border)",
                          flexShrink: 0,
                        }} />
                        <div className="row-main">
                          <div className="row-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {lead.title}
                          </div>
                          <div className="row-sub">
                            {lead.companyName}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                            <div
                              className="m-avatar sm"
                              style={{ background: AVATAR_COLORS[ownerId % AVATAR_COLORS.length] }}
                            >
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

        {!loading && filtered.length === 0 && (
          <div className="m-section">
            <div className="m-empty">
              <div className="m-empty-title">No leads found</div>
              <div className="m-empty-sub">Try adjusting your search or filters.</div>
            </div>
          </div>
        )}

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}
