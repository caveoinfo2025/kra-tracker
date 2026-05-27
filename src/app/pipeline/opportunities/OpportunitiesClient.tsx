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
import { OpportunityCard } from "@/components/pipeline/OpportunityCard";
import { KanbanBoard, KanbanColumn } from "@/components/pipeline/KanbanBoard";

type OppWithLead = OpportunitySerialized & {
  lead: { id: number; title: string; companyName: string; assignedTo: { id: number; name: string }; createdBy: { id: number; name: string } };
  _count?: { tasks: number; meetings: number };
};

const OPP_COL_COLORS: Record<string, string> = {
  PROPOSAL_SENT: "bg-amber-200 text-amber-800",
  FOLLOW_UP:     "bg-cyan-200 text-cyan-700",
  NEGOTIATION:   "bg-yellow-200 text-yellow-800",
  WON:           "bg-green-200 text-green-800",
  LOST:          "bg-red-200 text-red-700",
  ON_HOLD:       "bg-gray-200 text-gray-600",
};

export default function OpportunitiesClient({
  initialOpps,
  employees,
  isManager,
  initialView,
}: {
  initialOpps: OppWithLead[];
  employees: { id: number; name: string }[];
  isManager: boolean;
  initialView: "table" | "kanban";
}) {
  const router = useRouter();
  const [opps, setOpps] = useState(initialOpps);
  const [view, setView] = useState<"table" | "kanban">(initialView);
  const [empF,  setEmpF]  = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() =>
    opps.filter((o) => {
      if (empF && String(o.lead.assignedTo.id) !== empF) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!o.lead.companyName.toLowerCase().includes(q) && !o.lead.title.toLowerCase().includes(q)) return false;
      }
      return true;
    }),
  [opps, empF, search]);

  // Stats
  const totalValue    = filtered.filter((o) => !["WON","LOST"].includes(o.stage)).reduce((s, o) => s + o.value, 0);
  const wonValue      = filtered.filter((o) => o.stage === "WON").reduce((s, o) => s + o.value, 0);
  const weighted      = filtered.filter((o) => !["WON","LOST"].includes(o.stage)).reduce((s, o) => s + o.value * (o.probability / 100), 0);

  // Kanban
  const kanbanCols: KanbanColumn<OppWithLead>[] = OPP_STAGES.map((s) => ({
    key: s, label: OPP_STAGE_LABELS[s], color: OPP_COL_COLORS[s] ?? "bg-gray-200 text-gray-600",
    items: filtered.filter((o) => o.stage === s),
  }));

  async function handleKanbanMove(oppId: number | string, _from: string, toStage: string) {
    const res = await fetch(`/api/pipeline/opportunities/${oppId}`, {
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

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active Pipeline",    value: `₹${totalValue.toFixed(1)}L` },
          { label: "Weighted Forecast",  value: `₹${weighted.toFixed(1)}L`,  color: "text-blue-700" },
          { label: "Won Value",          value: `₹${wonValue.toFixed(1)}L`,   color: "text-green-700" },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-xl p-4 text-center">
            <p className={`text-xl font-bold ${s.color ?? "text-[#CC2229]"}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          <input type="text" placeholder="Search company…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
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

      {view === "kanban" && (
        <KanbanBoard<OppWithLead>
          columns={kanbanCols}
          getId={(o) => o.id}
          renderCard={(o) => <OpportunityCard opp={o} />}
          onMove={handleKanbanMove}
        />
      )}

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
                  {["Company", "Stage", "Value (₹L)", "Prob %", "Close Date", "Owner", ""].map((h) => (
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
                        <p className="font-semibold text-gray-900">{o.lead.companyName}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[180px]">{o.lead.title}</p>
                      </td>
                      <td className="px-4 py-3"><OppStageBadge stage={o.stage} /></td>
                      <td className="px-4 py-3 font-bold text-[#CC2229]">₹{o.value.toFixed(1)}L</td>
                      <td className="px-4 py-3 text-gray-600">{o.probability}%</td>
                      <td className="px-4 py-3">
                        {o.expectedClosureDate ? (
                          <span className={days !== null && days < 0 ? "text-red-600 font-semibold" : days !== null && days <= 7 ? "text-amber-600" : "text-gray-600"}>
                            {o.expectedClosureDate.slice(0, 10)}
                            {days !== null && days < 0 && <span className="text-xs ml-1">({Math.abs(days)}d late)</span>}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{o.lead.assignedTo.name}</td>
                      <td className="px-4 py-3">
                        <Link href={`/pipeline/opportunities/${o.id}`}
                          className="text-xs text-[#CC2229] hover:underline font-medium">View →</Link>
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
