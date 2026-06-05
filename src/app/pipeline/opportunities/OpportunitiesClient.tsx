"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  OpportunitySerialized,
  OPP_STAGES,
  OPP_STAGE_LABELS,
} from "@/types/pipeline";
import { OppStageBadge } from "@/components/pipeline/StageBadge";
import { KanbanBoard, KanbanColumn } from "@/components/pipeline/KanbanBoard";

// ── Types ─────────────────────────────────────────────────────────────────────

type OppWithLead = OpportunitySerialized & {
  isLegacy?: boolean;
  legacyId?: number;
  legacyStage?: string;
  poDate?: string | null;
  closedDate?: string | null;
  lead: {
    id: number; title: string; companyName: string;
    assignedTo: { id: number; name: string };
    createdBy:  { id: number; name: string };
  };
  _count?: { tasks: number; meetings: number };
};

// SLA thresholds for opportunity proposal response (kept in sync with SLA seed)
const SLA_PROPOSAL_RESPONSE_H = 48; // PROPOSAL_SENT → response within 48h

function oppSlaBadge(stage: string, updatedAt: string) {
  if (!["PROPOSAL_SENT", "FOLLOW_UP"].includes(stage)) return null;
  const elapsedH = (Date.now() - new Date(updatedAt).getTime()) / 3_600_000;
  if (elapsedH >= SLA_PROPOSAL_RESPONSE_H)
    return (
      <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded-full">
        SLA
      </span>
    );
  if (elapsedH >= SLA_PROPOSAL_RESPONSE_H * 0.75)
    return (
      <span className="text-[9px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">
        ⚠SLA
      </span>
    );
  return null;
}

// ── Column colours ────────────────────────────────────────────────────────────

const OPP_COL_COLORS: Record<string, string> = {
  PROPOSAL_SENT: "bg-amber-200 text-amber-800",
  FOLLOW_UP:     "bg-cyan-200 text-cyan-700",
  NEGOTIATION:   "bg-yellow-200 text-yellow-800",
  WON:           "bg-green-200 text-green-800",
  LOST:          "bg-red-200 text-red-700",
  ON_HOLD:       "bg-gray-200 text-gray-600",
};

// ── Kanban card ───────────────────────────────────────────────────────────────

function OppCard({ opp, onPromote, promoting }: { opp: OppWithLead; onPromote?: (o: OppWithLead) => void; promoting?: boolean }) {
  const days = opp.expectedClosureDate
    ? Math.ceil((new Date(opp.expectedClosureDate).getTime() - Date.now()) / 86400000)
    : null;
  const poDateStr = opp.poDate ? opp.poDate.slice(0, 10) : null;
  const slaBadge = !opp.isLegacy ? oppSlaBadge(opp.stage, opp.updatedAt) : null;

  const body = (
    <div className={`bg-white rounded-lg p-3 shadow-sm border transition-all ${
      opp.isLegacy
        ? "border-gray-200 border-dashed"
        : "border-gray-200 hover:shadow-md hover:border-[#CC2229]/30"
    }`}>
      <div className="flex items-start justify-between gap-1 mb-0.5">
        <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-1">
          {opp.lead.companyName}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          {slaBadge}
          {opp.isLegacy && (
            <span className="text-[9px] font-bold uppercase tracking-wide bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
              Legacy
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-2 line-clamp-1">{opp.lead.title}</p>

      <div className="flex items-center justify-between mb-2">
        <OppStageBadge stage={opp.stage} />
        <span className="text-sm font-bold text-[#CC2229]">₹{opp.value.toFixed(1)}L</span>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{opp.probability}% prob.</span>
        {days !== null && !["WON", "LOST"].includes(opp.stage) && (
          <span className={days < 0 ? "text-red-600 font-semibold" : days <= 7 ? "text-amber-600" : ""}>
            {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
          </span>
        )}
      </div>

      {/* PO date for Closed Won legacy deals */}
      {opp.stage === "WON" && (
        <div className="text-xs text-gray-500 mt-1">
          PO Date: <span className={poDateStr ? "text-gray-700 font-medium" : "text-red-500 font-medium"}>
            {poDateStr ?? "Not set"}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-400 truncate flex-1">{opp.lead.assignedTo.name}</p>
        {opp.isLegacy && onPromote && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPromote(opp); }}
            disabled={promoting}
            className="text-xs text-[#CC2229] hover:underline font-medium shrink-0 disabled:opacity-50"
          >
            {promoting ? "Opening…" : "Open →"}
          </button>
        )}
      </div>
    </div>
  );

  // Legacy SalesFunnel rows have no detail page — render as a static card.
  if (opp.isLegacy) return body;

  return (
    <Link href={`/pipeline/opportunities/${opp.id}`} style={{ textDecoration: "none" }}>
      {body}
    </Link>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OpportunitiesClient({
  initialOpps,
  employees,
  isManager,
  initialView,
  initialSearch = "",
}: {
  initialOpps: OppWithLead[];
  employees: { id: number; name: string }[];
  isManager: boolean;
  initialView: "table" | "kanban";
  initialSearch?: string;
}) {
  const router = useRouter();

  const [opps,   setOpps]   = useState(initialOpps);
  const [view,   setView]   = useState<"table" | "kanban">(initialView);
  const [empF,   setEmpF]   = useState("");
  const [search, setSearch] = useState(initialSearch);
  const [promotingId, setPromotingId] = useState<number | null>(null);

  // Promote a legacy SalesFunnel deal to a real CrmOpportunity, then open it.
  // Gives imported deals the full edit + close-won/lost flow.
  async function promoteLegacy(opp: OppWithLead) {
    if (!opp.legacyId || promotingId) return;
    setPromotingId(opp.legacyId);
    try {
      const res = await fetch("/api/pipeline/opportunities/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salesFunnelId: opp.legacyId }),
      });
      if (res.ok) {
        const d = await res.json() as { opportunityId: number };
        router.push(`/pipeline/opportunities/${d.opportunityId}`);
        return;
      }
    } catch { /* fall through */ }
    setPromotingId(null);
  }

  // ── KRA-aligned pipeline metrics ──────────────────────────────────────────
  // Maps CRM opportunity stages to KRA tracking rules:
  //   Proposals sent  → PROPOSAL_SENT (outbound proposal activity)
  //   Follow-ups      → FOLLOW_UP (active engagement)
  //   Negotiations    → NEGOTIATION (advanced deals)
  //   Won deals       → WON (closed revenue)

  // Legacy SalesFunnel rows are merged into `opps` (negative ids, isLegacy flag),
  // so every count and total derives from the single unified list.
  const scopedOpps      = empF ? opps.filter((o) => String(o.lead.assignedTo.id) === empF) : opps;
  const kraProposals    = scopedOpps.filter((o) => o.stage === "PROPOSAL_SENT").length;
  const kraFollowUps    = scopedOpps.filter((o) => o.stage === "FOLLOW_UP").length;
  const kraNegotiations = scopedOpps.filter((o) => o.stage === "NEGOTIATION").length;
  const kraWon          = scopedOpps.filter((o) => o.stage === "WON").length;

  // ── Filtered dataset ───────────────────────────────────────────────────────

  const filtered = useMemo(() =>
    opps.filter((o) => {
      if (empF && String(o.lead.assignedTo.id) !== empF) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!o.lead.companyName.toLowerCase().includes(q) &&
            !o.lead.title.toLowerCase().includes(q)) return false;
      }
      return true;
    }),
  [opps, empF, search]);

  // ── Stats from filtered set ────────────────────────────────────────────────

  const totalValue = filtered
    .filter((o) => !["WON", "LOST"].includes(o.stage))
    .reduce((s, o) => s + o.value, 0);
  const wonValue = filtered
    .filter((o) => o.stage === "WON")
    .reduce((s, o) => s + o.value, 0);
  const weighted = filtered
    .filter((o) => !["WON", "LOST"].includes(o.stage))
    .reduce((s, o) => s + o.value * (o.probability / 100), 0);

  // ── Kanban columns ─────────────────────────────────────────────────────────

  const kanbanCols: KanbanColumn<OppWithLead>[] = OPP_STAGES.map((s) => ({
    key:   s,
    label: OPP_STAGE_LABELS[s],
    color: OPP_COL_COLORS[s] ?? "bg-gray-200 text-gray-600",
    items: filtered.filter((o) => o.stage === s),
  }));

  async function handleKanbanMove(uid: number | string, _from: string, toStage: string) {
    const crmId = Number(String(uid));
    // Legacy SalesFunnel rows use negative ids and are read-only — ignore moves.
    if (crmId < 0) { router.refresh(); return; }
    const res = await fetch(`/api/pipeline/opportunities/${crmId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: toStage }),
    });
    if (res.ok) {
      const updated = await res.json();
      setOpps((p) => p.map((o) => o.id === updated.id ? { ...o, stage: updated.stage } : o));
      router.refresh();
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Pipeline stats ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active Pipeline",   value: `₹${totalValue.toFixed(1)}L`, color: "text-[#CC2229]" },
          { label: "Weighted Forecast", value: `₹${weighted.toFixed(1)}L`,   color: "text-blue-700" },
          { label: "Won Value",         value: `₹${wonValue.toFixed(1)}L`,   color: "text-green-700" },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-xl p-4 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── KRA Activity Metrics ── */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
          KRA Activity Metrics
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Proposals Sent",  value: kraProposals,    color: "text-amber-700",   hint: "Proposal Sent stage" },
            { label: "Follow-Ups",      value: kraFollowUps,    color: "text-cyan-700",    hint: "Follow-Up stage" },
            { label: "Negotiations",    value: kraNegotiations, color: "text-yellow-700",  hint: "Negotiation stage" },
            { label: "Deals Won",       value: kraWon,          color: "text-green-700",   hint: "Won stage" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-blue-50 rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s.hint}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="text" placeholder="Search company…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
          />
          {isManager && (
            <select value={empF} onChange={(e) => setEmpF(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
              <option value="">All Owners</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          )}
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
          <button onClick={() => setView("kanban")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition ${view === "kanban" ? "bg-white shadow text-[#CC2229]" : "text-gray-600"}`}>
            ⊞ Kanban
          </button>
          <button onClick={() => setView("table")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition ${view === "table" ? "bg-white shadow text-[#CC2229]" : "text-gray-600"}`}>
            ☰ Table
          </button>
        </div>
      </div>

      {/* ── Kanban ── */}
      {view === "kanban" && (
        <KanbanBoard<OppWithLead>
          columns={kanbanCols}
          getId={(o) => o.id}
          renderCard={(o) => <OppCard opp={o} onPromote={promoteLegacy} promoting={promotingId === o.legacyId} />}
          onMove={handleKanbanMove}
        />
      )}

      {/* ── Table ── */}
      {view === "table" && (
        <div className="bg-white rounded-xl border shadow-sm overflow-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p>No opportunities yet.</p>
              <Link href="/pipeline/leads" className="mt-2 text-sm text-[#CC2229] hover:underline block">
                Advance a lead to Proposal Sent to create one →
              </Link>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["Company / Opportunity", "Stage", "Value (₹L)", "Prob %", "Close Date", "PO Date", "Owner", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((o) => {
                  const days = o.expectedClosureDate
                    ? Math.ceil((new Date(o.expectedClosureDate).getTime() - Date.now()) / 86400000)
                    : null;
                  return (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{o.lead.companyName}</p>
                          {o.isLegacy && (
                            <span className="text-[9px] font-bold uppercase tracking-wide bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Legacy</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate max-w-[200px]">{o.lead.title}</p>
                      </td>
                      <td className="px-4 py-3"><OppStageBadge stage={o.stage} /></td>
                      <td className="px-4 py-3 font-bold text-[#CC2229]">₹{o.value.toFixed(1)}L</td>
                      <td className="px-4 py-3 text-gray-600">{o.probability}%</td>
                      <td className="px-4 py-3">
                        {o.expectedClosureDate ? (
                          <span className={
                            !["WON", "LOST"].includes(o.stage) && days !== null && days < 0 ? "text-red-600 font-semibold" :
                            !["WON", "LOST"].includes(o.stage) && days !== null && days <= 7 ? "text-amber-600" : "text-gray-600"
                          }>
                            {o.expectedClosureDate.slice(0, 10)}
                            {!["WON", "LOST"].includes(o.stage) && days !== null && days < 0 && <span className="text-xs ml-1">({Math.abs(days)}d late)</span>}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {o.stage === "WON" ? (
                          o.poDate
                            ? <span className="text-xs text-emerald-700 font-medium">{o.poDate.slice(0, 10)}</span>
                            : <span className="text-xs text-red-500 font-medium">Not set</span>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{o.lead.assignedTo.name}</td>
                      <td className="px-4 py-3">
                        {o.isLegacy ? (
                          <button onClick={() => promoteLegacy(o)} disabled={promotingId === o.legacyId}
                            className="text-xs text-[#CC2229] hover:underline font-medium disabled:opacity-50">
                            {promotingId === o.legacyId ? "Opening…" : "Open →"}
                          </button>
                        ) : (
                          <Link href={`/pipeline/opportunities/${o.id}`}
                            className="text-xs text-[#CC2229] hover:underline font-medium">View →</Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

    </div>
  );
}
