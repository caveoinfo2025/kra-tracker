"use client";
import { useEffect, useState } from "react";
import MIcon from "../components/MIcon";
import type { MobileLead } from "../types";

type Activity = {
  id: number;
  action: string;
  description: string;
  createdAt: string;
  performedBy?: { name: string } | null;
};

interface Props {
  lead: MobileLead;
  onBack: () => void;
}

const STAGES = ["NEW_LEAD", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "CLOSED_WON"];
const STAGE_LABELS: Record<string, string> = {
  NEW_LEAD: "New", CONTACTED: "Contacted", QUALIFIED: "Qualified",
  PROPOSAL_SENT: "Proposal", NEGOTIATION: "Negotiation", CLOSED_WON: "Won",
};

const AVATAR_COLORS = ["#5B626C","#0046B0","#B05000","#1F7A3F","#2A2A55","#702D5B"];

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function fmtLakhs(val: number) {
  if (val >= 100) return `₹${(val / 100).toFixed(2)} Cr`;
  return `₹${val.toFixed(0)} L`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function DealDetailScreen({ lead, onBack }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMoveStage, setShowMoveStage] = useState(false);
  const [currentStage, setCurrentStage] = useState(lead.stage);
  const [moving, setMoving] = useState(false);

  const currIdx = STAGES.indexOf(currentStage);

  useEffect(() => {
    fetch(`/api/pipeline/leads/${lead.id}/activity`)
      .then(r => r.json())
      .then(data => {
        setActivities(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [lead.id]);

  async function moveStage(newStage: string) {
    setMoving(true);
    try {
      await fetch(`/api/pipeline/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      setCurrentStage(newStage);
      setShowMoveStage(false);
    } catch {
      alert("Failed to update stage.");
    }
    setMoving(false);
  }

  const ownerName = lead.assignedTo?.name ?? "Unassigned";
  const ownerId   = lead.assignedTo?.id ?? 0;

  return (
    <div className="m-screen m-screen-enter">
      <div className="m-content" style={{ paddingBottom: 90 }}>
        {/* Navbar */}
        <div className="m-navbar">
          <button className="m-back" onClick={onBack}>
            <MIcon name="back" size={18} /> Pipeline
          </button>
          <div style={{ flex: 1 }} />
          <div className="m-nav-icon">
            <MIcon name="more" size={16} />
          </div>
        </div>

        {/* Header */}
        <div className="m-header">
          <div className="m-eyebrow">{lead.categoryName || lead.source}</div>
          <h1 className="m-title" style={{ fontSize: 24, lineHeight: 1.15 }}>{lead.title}</h1>
          <div className="m-subtitle">{lead.companyName}</div>
        </div>

        {/* Value KPIs */}
        <div className="m-section">
          <div className="m-kpi-row">
            <div className="m-kpi m-kpi-accent">
              <div className="m-kpi-label">Deal Value</div>
              <div className="m-kpi-value">
                {lead.expectedValue >= 100
                  ? <>{(lead.expectedValue / 100).toFixed(2)}<span className="unit">Cr</span></>
                  : <>{lead.expectedValue.toFixed(0)}<span className="unit">L</span></>
                }
              </div>
              <div className="m-kpi-delta up">
                <MIcon name="trend-up" size={11} color="var(--success)" /> Active
              </div>
            </div>
            <div className="m-kpi">
              <div className="m-kpi-label">Stage</div>
              <div style={{ marginTop: 6 }}>
                <span className={`m-pill ${
                  { NEW_LEAD:"lead",CONTACTED:"lead",QUALIFIED:"qual",
                    PROPOSAL_SENT:"prop",NEGOTIATION:"neg",CLOSED_WON:"won" }[currentStage] ?? "lead"
                }`} style={{ fontSize: 12, padding: "4px 10px" }}>
                  {STAGE_LABELS[currentStage] ?? currentStage}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 6 }}>
                {currIdx + 1} of {STAGES.length}
              </div>
            </div>
          </div>
        </div>

        {/* Stage track */}
        <div className="m-section">
          <div className="m-section-label">Stage Progress</div>
          <div className="m-card">
            <div className="m-stage-track">
              {STAGES.map((s, i) => {
                const isPast = currIdx > i;
                const isCurr = currIdx === i;
                return (
                  <div
                    key={s}
                    className={`step${isPast ? " is-past" : ""}${isCurr ? " is-curr" : ""}`}
                  >
                    <div className={`dot${isPast ? " past" : ""}${isCurr ? " curr" : ""}`}>
                      {isPast ? "✓" : i + 1}
                    </div>
                    {i < STAGES.length - 1 && (
                      <div className="line" style={isPast ? { background: "var(--caveo-red)" } : undefined} />
                    )}
                    <div className="step-label">{STAGE_LABELS[s]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Details list */}
        <div className="m-section">
          <div className="m-section-label">Details</div>
          <div className="m-list">
            <div className="m-list-row">
              <div className="row-main">
                <div className="row-sub">Owner</div>
                <div className="row-title" style={{ fontSize: 13.5, fontWeight: 500, marginTop: 2 }}>{ownerName}</div>
              </div>
              <div className="m-avatar" style={{ background: AVATAR_COLORS[ownerId % AVATAR_COLORS.length] }}>
                {initials(ownerName)}
              </div>
            </div>
            {lead.contactPerson && (
              <div className="m-list-row">
                <div className="row-main">
                  <div className="row-sub">Contact</div>
                  <div className="row-title" style={{ fontSize: 13.5, fontWeight: 500, marginTop: 2 }}>{lead.contactPerson}</div>
                </div>
                <MIcon name="user" size={16} color="var(--fg-4)" />
              </div>
            )}
            {lead.phone && (
              <div className="m-list-row">
                <div className="row-main">
                  <div className="row-sub">Phone</div>
                  <div className="row-title" style={{ fontSize: 13.5, fontWeight: 500, marginTop: 2 }}>{lead.phone}</div>
                </div>
                <MIcon name="phone" size={16} color="var(--fg-4)" />
              </div>
            )}
            {lead.email && (
              <div className="m-list-row">
                <div className="row-main">
                  <div className="row-sub">Email</div>
                  <div className="row-title" style={{ fontSize: 13.5, fontWeight: 500, marginTop: 2 }}>{lead.email}</div>
                </div>
                <MIcon name="mail" size={16} color="var(--fg-4)" />
              </div>
            )}
            <div className="m-list-row">
              <div className="row-main">
                <div className="row-sub">Source</div>
                <div className="row-title" style={{ fontSize: 13.5, fontWeight: 500, marginTop: 2 }}>{lead.source || "—"}</div>
              </div>
              <MIcon name="target" size={16} color="var(--fg-4)" />
            </div>
            <div className="m-list-row">
              <div className="row-main">
                <div className="row-sub">Last updated</div>
                <div className="row-title" style={{ fontSize: 13.5, fontWeight: 500, marginTop: 2 }}>
                  {new Date(lead.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                </div>
              </div>
              <MIcon name="calendar" size={16} color="var(--fg-4)" />
            </div>
            {lead.oemName && (
              <div className="m-list-row">
                <div className="row-main">
                  <div className="row-sub">OEM / Solution</div>
                  <div className="row-title" style={{ fontSize: 13.5, fontWeight: 500, marginTop: 2 }}>{lead.oemName}</div>
                </div>
                <MIcon name="shield" size={16} color="var(--fg-4)" />
              </div>
            )}
          </div>
        </div>

        {/* Remarks */}
        {lead.remarks && (
          <div className="m-section">
            <div className="m-section-label">Remarks</div>
            <div className="m-card">
              <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.5 }}>{lead.remarks}</div>
            </div>
          </div>
        )}

        {/* Activity */}
        <div className="m-section">
          <div className="m-section-label">
            Activity
            <span className="more">+ Log new</span>
          </div>
          <div className="m-card">
            {loading ? (
              <div className="m-skeleton" style={{ height: 80, borderRadius: 8 }} />
            ) : activities.length === 0 ? (
              <div style={{ textAlign: "center", padding: "16px 0", color: "var(--fg-3)", fontSize: 13 }}>
                No activity logged yet.
              </div>
            ) : (
              <div className="m-timeline">
                {activities.slice(0, 6).map(a => (
                  <div className="m-timeline-item" key={a.id}>
                    <div className="body">{a.description}</div>
                    <div className="when">
                      {timeAgo(a.createdAt)}
                      {a.performedBy ? ` · ${a.performedBy.name}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ height: 8 }} />
      </div>

      {/* Action footer */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "12px 18px calc(env(safe-area-inset-bottom, 0px) + 16px)",
        background: "var(--bg-elev)",
        borderTop: "1px solid var(--border)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
        zIndex: 5,
      }}>
        <button className="m-btn m-btn-secondary">
          <MIcon name="phone" size={15} /> Log call
        </button>
        <button className="m-btn" onClick={() => setShowMoveStage(true)}>
          <MIcon name="trend-up" size={15} color="#fff" /> Move stage
        </button>
      </div>

      {/* Move Stage sheet */}
      {showMoveStage && (
        <div className="m-sheet-overlay" onClick={() => setShowMoveStage(false)}>
          <div className="m-sheet-body" onClick={e => e.stopPropagation()}>
            <div className="m-sheet-grabber" />
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>
              Move to stage
            </h2>
            {STAGES.filter(s => s !== currentStage && s !== "CLOSED_LOST").map(s => (
              <button
                key={s}
                onClick={() => moveStage(s)}
                disabled={moving}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  padding: "14px 0",
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid var(--border-subtle)",
                  cursor: "pointer",
                  gap: 12,
                  fontFamily: "var(--font-sans)",
                }}
              >
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: ({ NEW_LEAD:"var(--fg-4)",CONTACTED:"var(--fg-3)",QUALIFIED:"var(--infra-blue)",
                    PROPOSAL_SENT:"var(--ot-orange)",NEGOTIATION:"var(--caveo-red)",CLOSED_WON:"var(--success)" } as Record<string,string>)[s] ?? "var(--border)",
                }} />
                <span style={{ fontSize: 15, fontWeight: 500, color: "var(--fg-1)" }}>
                  {STAGE_LABELS[s] ?? s}
                </span>
              </button>
            ))}
            <div style={{ height: 8 }} />
          </div>
        </div>
      )}
    </div>
  );
}
