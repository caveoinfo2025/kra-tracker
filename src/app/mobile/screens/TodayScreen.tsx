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

type CollectionStats = {
  overdue: number;
  openCount: number;
  outstandingLakhs: number;
  collectedTodayLakhs: number;
};

interface TodayScreenProps {
  userName: string;
  isManager: boolean;
  onNotifications: () => void;
  onDealClick: (lead: MobileLead) => void;
  onQuickLog: (type: string) => void;
  onKRAs: () => void;
  onUpdates: () => void;
  onViewPipeline: () => void;
  onCollections: () => void;
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
  return `₹${Math.abs(val).toFixed(0)} L`;
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

function isOverdueDate(dateStr: string, status: string): boolean {
  if (status === "Fully Received") return false;
  return new Date(dateStr) < new Date();
}

export default function TodayScreen({
  userName,
  isManager,
  onNotifications,
  onDealClick,
  onQuickLog,
  onKRAs,
  onUpdates,
  onViewPipeline,
  onCollections,
}: TodayScreenProps) {
  const [leads, setLeads] = useState<MobileLead[]>([]);
  const [kras, setKras] = useState<KRA[]>([]);
  const [loading, setLoading] = useState(true);
  const [payToday, setPayToday] = useState<{ totalLakhs: number; count: number } | null>(null);
  const [collStats, setCollStats] = useState<CollectionStats | null>(null);

  useEffect(() => {
    // Core data: leads + KRAs
    Promise.all([
      fetch("/api/pipeline/leads?limit=20").then(r => r.json()).catch(() => ({ rows: [] })),
      fetch("/api/kras/me").then(r => r.json()).catch(() => []),
    ]).then(([leadsData, krasData]) => {
      setLeads(leadsData.rows ?? []);
      setKras(Array.isArray(krasData) ? krasData : []);
      setLoading(false);
    });

    // Payments today
    fetch("/api/payments/today")
      .then(r => r.json())
      .then(d => setPayToday({ totalLakhs: d.totalLakhs ?? 0, count: d.count ?? 0 }))
      .catch(() => {});

    // Collections stats
    fetch("/api/collections")
      .then(r => r.json())
      .then((rows: Array<{ collectionStatus: string; dueDate: string; invoiceValueLakhs: number; amountReceivedLakhs: number; paymentReceivedDate: string | null }>) => {
        if (!Array.isArray(rows)) return;
        const overdue = rows.filter(r => isOverdueDate(r.dueDate, r.collectionStatus)).length;
        const openRows = rows.filter(r => r.collectionStatus !== "Fully Received");
        const outstandingLakhs = openRows.reduce((s, r) => s + (r.invoiceValueLakhs - r.amountReceivedLakhs), 0);
        const collectedTodayLakhs = rows
          .filter(r => isToday(r.paymentReceivedDate))
          .reduce((s, r) => s + r.amountReceivedLakhs, 0);
        setCollStats({ overdue, openCount: openRows.length, outstandingLakhs, collectedTodayLakhs });
      })
      .catch(() => {});
  }, []);

  const activeLeads = leads.filter(l => l.stage !== "CLOSED_WON" && l.stage !== "CLOSED_LOST");
  const wonLeads    = leads.filter(l => l.stage === "CLOSED_WON");
  const pipelineVal = activeLeads.reduce((s, l) => s + (l.expectedValue || 0), 0);
  const bookingsVal = wonLeads.reduce((s, l) => s + (l.expectedValue || 0), 0);
  const topFocus    = [...activeLeads].sort((a, b) => (b.expectedValue || 0) - (a.expectedValue || 0)).slice(0, 3);

  const displayKras = kras.slice(0, 2);
  const avgKraProgress = kras.length
    ? Math.round(kras.reduce((s, k) => s + (k.reviews?.[0]?.progress ?? 0), 0) / kras.length)
    : 0;

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
          {isManager ? (
            <div className="hint">
              Team pipeline — {activeLeads.length} active deal{activeLeads.length !== 1 ? "s" : ""} tracked.
            </div>
          ) : (
            <div className="hint">
              {kras.length > 0
                ? `KRA progress: ${avgKraProgress}% avg across ${kras.length} area${kras.length !== 1 ? "s" : ""}.`
                : "Welcome back. Let's make today count."}
            </div>
          )}
          <div className="stat-row">
            <div className="stat">
              <div className="val">
                {pipelineVal >= 100
                  ? <>{(pipelineVal / 100).toFixed(1)}<span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginLeft: 2 }}>Cr</span></>
                  : <>{pipelineVal.toFixed(0)}<span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginLeft: 2 }}>L</span></>
                }
              </div>
              <div className="label">Pipeline</div>
            </div>
            <div className="stat">
              <div className="val">
                {bookingsVal >= 100
                  ? <>{(bookingsVal / 100).toFixed(2)}<span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginLeft: 2 }}>Cr</span></>
                  : <>{bookingsVal.toFixed(0)}<span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginLeft: 2 }}>L</span></>
                }
              </div>
              <div className="label">Won</div>
            </div>
            <div className="stat">
              <div className="val">{activeLeads.length}</div>
              <div className="label">Open</div>
            </div>
            {!isManager && kras.length > 0 && (
              <div className="stat">
                <div className="val">{avgKraProgress}%</div>
                <div className="label">KRA Avg</div>
              </div>
            )}
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
          <button className="m-action" onClick={onCollections}>
            <div className="ico"><MIcon name="wallet" size={14} color="var(--caveo-red)" /></div>
            Collections
          </button>
          <button className="m-action" onClick={onUpdates}>
            <div className="ico"><MIcon name="updates" size={14} color="var(--caveo-red)" /></div>
            Daily Update
          </button>
        </div>

        {/* Collections summary card */}
        {collStats && (collStats.openCount > 0 || collStats.collectedTodayLakhs > 0) && (
          <div className="m-section">
            <div className="m-section-label">
              Collections
              <span className="more" onClick={onCollections} style={{ cursor: "pointer" }}>View all →</span>
            </div>

            {/* Overdue alert */}
            {collStats.overdue > 0 && (
              <button
                onClick={onCollections}
                className="m-card"
                style={{
                  width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 8,
                  display: "flex", alignItems: "center", gap: 12,
                  background: "rgba(200,16,46,0.05)",
                  border: "1px solid rgba(200,16,46,0.2)",
                }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: "rgba(200,16,46,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <MIcon name="alert" size={17} color="var(--caveo-red)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--caveo-red)" }}>
                    {collStats.overdue} overdue invoice{collStats.overdue !== 1 ? "s" : ""}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 1 }}>
                    Tap to view & follow up
                  </div>
                </div>
                <MIcon name="chev" size={14} color="var(--caveo-red)" />
              </button>
            )}

            {/* Outstanding + open */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div className="m-kpi">
                <div className="m-kpi-label">Outstanding</div>
                <div className="m-kpi-value" style={{ fontSize: 20, color: collStats.overdue > 0 ? "var(--caveo-red)" : "var(--fg-1)" }}>
                  {collStats.outstandingLakhs >= 100
                    ? <>{(collStats.outstandingLakhs / 100).toFixed(1)}<span className="unit">Cr</span></>
                    : <>{Math.max(0, collStats.outstandingLakhs).toFixed(0)}<span className="unit">L</span></>}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 2 }}>{collStats.openCount} open</div>
              </div>
              {collStats.collectedTodayLakhs > 0 ? (
                <div className="m-kpi" style={{ borderLeft: "3px solid var(--success)" }}>
                  <div className="m-kpi-label">Collected Today</div>
                  <div className="m-kpi-value" style={{ fontSize: 20, color: "var(--success)" }}>
                    {collStats.collectedTodayLakhs >= 100
                      ? <>{(collStats.collectedTodayLakhs / 100).toFixed(1)}<span className="unit">Cr</span></>
                      : <>{collStats.collectedTodayLakhs.toFixed(0)}<span className="unit">L</span></>}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 2 }}>received</div>
                </div>
              ) : (
                <div className="m-kpi">
                  <div className="m-kpi-label">Open Invoices</div>
                  <div className="m-kpi-value" style={{ fontSize: 20 }}>{collStats.openCount}</div>
                  <div style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 2 }}>awaiting payment</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payments received today (managers - from payments ledger) */}
        {isManager && payToday && payToday.count > 0 && (
          <div className="m-section">
            <div
              className="m-card"
              style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(31,157,85,0.06)", border: "1px solid rgba(31,157,85,0.2)" }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(31,157,85,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <MIcon name="check" size={20} color="var(--success)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                  Payments Received Today
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--success)", lineHeight: 1.1 }}>
                  {payToday.totalLakhs >= 100 ? `₹${(payToday.totalLakhs / 100).toFixed(2)} Cr` : `₹${payToday.totalLakhs.toFixed(2)} L`}
                </div>
                <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
                  {payToday.count} payment{payToday.count !== 1 ? "s" : ""} · tap the bell for details
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Today's Focus */}
        <div className="m-section">
          <div className="m-section-label">
            Today's Focus
            <span className="more" onClick={onViewPipeline} style={{ cursor: "pointer" }}>View all →</span>
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

        {/* KRAs preview — employees only */}
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
