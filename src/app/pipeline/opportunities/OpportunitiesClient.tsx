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

// ── Legacy funnel types & constants ───────────────────────────────────────────

type LegacyFunnelRow = {
  id: number; opportunityId: string; employeeId: number; employee: { name: string };
  customerName: string; solutionCategory: string; opportunityName: string;
  stage: string; dealValueLakhs: number; billingValueLakhs: number;
  grossProfitPct: number; expectedCloseDate: string | null; closedDate: string | null;
  probabilityPct: number; status: string; newCustomerFlag: boolean; pocFlag: boolean; remarks: string;
};

const FUNNEL_STAGES    = ["Lead","Qualified","Solutioning","Proposal Sent","Negotiation","Closed Won","Closed Lost"];
const FUNNEL_SOLUTIONS = ["Network & Security","Server & Storage","MSSP services","Cloud Security & Services","Other"];

const funnelEmpty = {
  employeeId: "", customerName: "", solutionCategory: "", opportunityName: "",
  stage: "Lead", dealValueLakhs: "0", billingValueLakhs: "0", grossProfitPct: "0",
  expectedCloseDate: "", closedDate: "", probabilityPct: "50", status: "Active",
  newCustomerFlag: false, pocFlag: false, remarks: "",
};

function sfStageToOppStage(sfStage: string): string {
  switch (sfStage) {
    case "Closed Won":    return "WON";
    case "Closed Lost":   return "LOST";
    case "Negotiation":   return "NEGOTIATION";
    case "Proposal Sent": return "PROPOSAL_SENT";
    default:              return "FOLLOW_UP";
  }
}

function oppStageToSfStage(oppStage: string): string {
  switch (oppStage) {
    case "WON":           return "Closed Won";
    case "LOST":          return "Closed Lost";
    case "NEGOTIATION":   return "Negotiation";
    case "PROPOSAL_SENT": return "Proposal Sent";
    default:              return "Solutioning";
  }
}

// ── Unified merged opportunity type ──────────────────────────────────────────

type MergedOpp = {
  uid: string;        // "crm-{id}" | "sf-{id}"
  isLegacy: boolean;
  stage: string;      // CRM OppStage enum value
  companyName: string;
  opportunityName: string;
  value: number;      // in Lakhs
  probability: number;
  expectedClosureDate?: string | null;
  ownerName: string;
  ownerId?: number;
  // CRM-specific
  crmId?: number;
  leadTitle?: string;
  // Legacy-specific
  sfId?: number;
  legacyStage?: string;
  solutionCategory?: string;
  grossProfitPct?: number;
  newCustomerFlag?: boolean;
  pocFlag?: boolean;
};

// ── Merged Kanban card ────────────────────────────────────────────────────────

function MergedCard({ item, onEdit }: { item: MergedOpp; onEdit?: (sfId: number) => void }) {
  const days = item.expectedClosureDate
    ? Math.ceil((new Date(item.expectedClosureDate).getTime() - Date.now()) / 86400000)
    : null;

  const inner = (
    <div className={`bg-white rounded-lg p-3 shadow-sm border transition-all ${
      item.isLegacy
        ? "border-amber-200 hover:border-amber-400"
        : "border-gray-200 hover:shadow-md hover:border-[#CC2229]/30"
    }`}>
      <div className="flex items-start justify-between mb-0.5">
        <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-1 flex-1">
          {item.companyName}
        </p>
        {item.isLegacy && (
          <span className="ml-1 text-[9px] font-bold bg-amber-100 text-amber-700 px-1 py-0.5 rounded shrink-0">
            Legacy
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-2 line-clamp-1">
        {item.isLegacy ? item.opportunityName : item.leadTitle}
      </p>

      <div className="flex items-center justify-between mb-2">
        {item.isLegacy ? (
          <span className="text-[10px] font-medium bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-200">
            {item.legacyStage}
          </span>
        ) : (
          <OppStageBadge stage={item.stage} />
        )}
        <span className="text-sm font-bold text-[#CC2229]">₹{item.value.toFixed(1)}L</span>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{item.probability}% prob.</span>
        {days !== null && (
          <span className={days < 0 ? "text-red-600 font-semibold" : days <= 7 ? "text-amber-600" : ""}>
            {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-400 truncate flex-1">{item.ownerName}</p>
        {item.isLegacy && onEdit && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(item.sfId!); }}
            className="text-[10px] text-[#CC2229] hover:underline ml-2 shrink-0"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );

  if (!item.isLegacy && item.crmId) {
    return <Link href={`/pipeline/opportunities/${item.crmId}`}>{inner}</Link>;
  }
  return inner;
}

// ── Column colour map ─────────────────────────────────────────────────────────

const OPP_COL_COLORS: Record<string, string> = {
  PROPOSAL_SENT: "bg-amber-200 text-amber-800",
  FOLLOW_UP:     "bg-cyan-200 text-cyan-700",
  NEGOTIATION:   "bg-yellow-200 text-yellow-800",
  WON:           "bg-green-200 text-green-800",
  LOST:          "bg-red-200 text-red-700",
  ON_HOLD:       "bg-gray-200 text-gray-600",
};

// ── CRM opp type ──────────────────────────────────────────────────────────────

type OppWithLead = OpportunitySerialized & {
  lead: {
    id: number; title: string; companyName: string;
    assignedTo: { id: number; name: string };
    createdBy:  { id: number; name: string };
  };
  _count?: { tasks: number; meetings: number };
};

// ── Main component ────────────────────────────────────────────────────────────

export default function OpportunitiesClient({
  initialOpps,
  employees,
  isManager,
  initialView,
  initialFunnelRows,
  currentEmployeeId,
}: {
  initialOpps: OppWithLead[];
  employees: { id: number; name: string }[];
  isManager: boolean;
  initialView: "table" | "kanban";
  initialFunnelRows: LegacyFunnelRow[];
  currentEmployeeId?: number;
}) {
  const router = useRouter();

  const [opps,       setOpps]       = useState(initialOpps);
  const [funnelRows, setFunnelRows] = useState(initialFunnelRows);
  const [view,       setView]       = useState<"table" | "kanban">(initialView);
  const [empF,       setEmpF]       = useState("");
  const [search,     setSearch]     = useState("");

  // ── Legacy entry form state ─────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editSfId, setEditSfId] = useState<number | null>(null);
  const [form,     setForm]     = useState({ ...funnelEmpty, employeeId: String(currentEmployeeId ?? "") });
  const [saving,   setSaving]   = useState(false);

  function ff(k: string, v: string | boolean) { setForm((p) => ({ ...p, [k]: v })); }

  function openAddLegacy() {
    setEditSfId(null);
    setForm({ ...funnelEmpty, employeeId: String(currentEmployeeId ?? "") });
    setShowForm(true);
  }

  function openEditLegacy(sfId: number) {
    const r = funnelRows.find((row) => row.id === sfId);
    if (!r) return;
    setEditSfId(sfId);
    setForm({
      employeeId:       String(r.employeeId),
      customerName:     r.customerName,
      solutionCategory: r.solutionCategory,
      opportunityName:  r.opportunityName,
      stage:            r.stage,
      dealValueLakhs:   String(r.dealValueLakhs),
      billingValueLakhs:String(r.billingValueLakhs),
      grossProfitPct:   String(r.grossProfitPct),
      expectedCloseDate:r.expectedCloseDate?.slice(0, 10) ?? "",
      closedDate:       r.closedDate?.slice(0, 10) ?? "",
      probabilityPct:   String(r.probabilityPct),
      status:           r.status,
      newCustomerFlag:  r.newCustomerFlag,
      pocFlag:          r.pocFlag,
      remarks:          r.remarks,
    });
    setShowForm(true);
  }

  async function handleLegacySubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const method = editSfId ? "PUT" : "POST";
    const url    = editSfId ? `/api/sales-funnel/${editSfId}` : "/api/sales-funnel";
    const res    = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        dealValueLakhs:    Number(form.dealValueLakhs),
        billingValueLakhs: Number(form.billingValueLakhs),
        grossProfitPct:    Number(form.grossProfitPct),
        probabilityPct:    Number(form.probabilityPct),
        closedDate:        form.closedDate || null,
      }),
    });
    if (res.ok) {
      const saved = await res.json();
      setFunnelRows((p) => editSfId ? p.map((r) => r.id === editSfId ? saved : r) : [saved, ...p]);
      setShowForm(false); setEditSfId(null); router.refresh();
    }
    setSaving(false);
  }

  async function handleLegacyDelete(sfId: number) {
    if (!confirm("Delete this legacy opportunity?")) return;
    await fetch(`/api/sales-funnel/${sfId}`, { method: "DELETE" });
    setFunnelRows((p) => p.filter((r) => r.id !== sfId));
  }

  // ── Merged dataset ──────────────────────────────────────────────────────────

  const merged = useMemo<MergedOpp[]>(() => {
    const crmItems: MergedOpp[] = opps
      .filter((o) => {
        if (empF && String(o.lead.assignedTo.id) !== empF) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!o.lead.companyName.toLowerCase().includes(q) && !o.lead.title.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .map((o) => ({
        uid:                 `crm-${o.id}`,
        isLegacy:            false,
        stage:               o.stage,
        companyName:         o.lead.companyName,
        opportunityName:     o.lead.title,
        value:               o.value,
        probability:         o.probability,
        expectedClosureDate: o.expectedClosureDate,
        ownerName:           o.lead.assignedTo.name,
        ownerId:             o.lead.assignedTo.id,
        crmId:               o.id,
        leadTitle:           o.lead.title,
      }));

    const sfItems: MergedOpp[] = funnelRows
      .filter((r) => {
        if (empF && String(r.employeeId) !== empF) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!r.customerName.toLowerCase().includes(q) && !r.opportunityName.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .map((r) => ({
        uid:                 `sf-${r.id}`,
        isLegacy:            true,
        stage:               sfStageToOppStage(r.stage),
        companyName:         r.customerName,
        opportunityName:     r.opportunityName,
        value:               r.dealValueLakhs,
        probability:         r.probabilityPct,
        expectedClosureDate: r.expectedCloseDate,
        ownerName:           r.employee?.name ?? "—",
        ownerId:             r.employeeId,
        sfId:                r.id,
        legacyStage:         r.stage,
        solutionCategory:    r.solutionCategory,
        grossProfitPct:      r.grossProfitPct,
        newCustomerFlag:     r.newCustomerFlag,
        pocFlag:             r.pocFlag,
      }));

    return [...crmItems, ...sfItems];
  }, [opps, funnelRows, empF, search]);

  // ── Stats ───────────────────────────────────────────────────────────────────

  const totalValue = merged
    .filter((o) => !["WON", "LOST"].includes(o.stage))
    .reduce((s, o) => s + o.value, 0);
  const wonValue   = merged
    .filter((o) => o.stage === "WON")
    .reduce((s, o) => s + o.value, 0);
  const weighted   = merged
    .filter((o) => !["WON", "LOST"].includes(o.stage))
    .reduce((s, o) => s + o.value * (o.probability / 100), 0);

  // ── Kanban columns ──────────────────────────────────────────────────────────

  const kanbanCols: KanbanColumn<MergedOpp>[] = OPP_STAGES.map((s) => ({
    key:   s,
    label: OPP_STAGE_LABELS[s],
    color: OPP_COL_COLORS[s] ?? "bg-gray-200 text-gray-600",
    items: merged.filter((o) => o.stage === s),
  }));

  async function handleKanbanMove(uid: number | string, _from: string, toStage: string) {
    const uidStr = String(uid);

    if (uidStr.startsWith("crm-")) {
      const crmId = Number(uidStr.replace("crm-", ""));
      const res   = await fetch(`/api/pipeline/opportunities/${crmId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: toStage }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOpps((p) => p.map((o) => o.id === updated.id ? { ...o, stage: updated.stage } : o));
        router.refresh();
      }
    } else if (uidStr.startsWith("sf-")) {
      const sfId  = Number(uidStr.replace("sf-", ""));
      const row   = funnelRows.find((r) => r.id === sfId);
      if (!row) return;
      const res   = await fetch(`/api/sales-funnel/${sfId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId:        String(row.employeeId),
          customerName:      row.customerName,
          solutionCategory:  row.solutionCategory,
          opportunityName:   row.opportunityName,
          stage:             oppStageToSfStage(toStage),
          dealValueLakhs:    row.dealValueLakhs,
          billingValueLakhs: row.billingValueLakhs,
          grossProfitPct:    row.grossProfitPct,
          expectedCloseDate: row.expectedCloseDate?.slice(0, 10) ?? "",
          closedDate:        row.closedDate?.slice(0, 10) ?? null,
          probabilityPct:    row.probabilityPct,
          status:            row.status,
          newCustomerFlag:   row.newCustomerFlag,
          pocFlag:           row.pocFlag,
          remarks:           row.remarks,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setFunnelRows((p) => p.map((r) => r.id === sfId ? updated : r));
        router.refresh();
      }
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active Pipeline",   value: `₹${totalValue.toFixed(1)}L` },
          { label: "Weighted Forecast", value: `₹${weighted.toFixed(1)}L`,   color: "text-blue-700" },
          { label: "Won Value",         value: `₹${wonValue.toFixed(1)}L`,    color: "text-green-700" },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-xl p-4 text-center">
            <p className={`text-xl font-bold ${s.color ?? "text-[#CC2229]"}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
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
          <button
            onClick={openAddLegacy}
            className="bg-amber-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-amber-600 transition whitespace-nowrap"
          >
            + Legacy Entry
          </button>
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

      {/* Legacy entry modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">{editSfId ? "Edit" : "Add"} Legacy Opportunity</h3>
            <form onSubmit={handleLegacySubmit} className="space-y-3">
              {isManager && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Employee</label>
                  <select required value={form.employeeId} onChange={(e) => ff("employeeId", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Select employee</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name *</label>
                <input required type="text" value={form.customerName} onChange={(e) => ff("customerName", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Opportunity Name *</label>
                <input required type="text" value={form.opportunityName} onChange={(e) => ff("opportunityName", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Solution Category</label>
                  <select value={form.solutionCategory} onChange={(e) => ff("solutionCategory", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Select</option>
                    {FUNNEL_SOLUTIONS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Stage</label>
                  <select value={form.stage} onChange={(e) => ff("stage", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    {FUNNEL_STAGES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Deal Value (₹L)</label>
                  <input type="number" step="0.01" value={form.dealValueLakhs} onChange={(e) => ff("dealValueLakhs", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Billing Value (₹L)</label>
                  <input type="number" step="0.01" value={form.billingValueLakhs} onChange={(e) => ff("billingValueLakhs", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">GP %</label>
                  <input type="number" step="0.1" value={form.grossProfitPct} onChange={(e) => ff("grossProfitPct", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Expected Close</label>
                  <input type="date" value={form.expectedCloseDate} onChange={(e) => ff("expectedCloseDate", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Probability %</label>
                  <input type="number" min={0} max={100} value={form.probabilityPct} onChange={(e) => ff("probabilityPct", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              {form.stage === "Closed Won" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Actual Close Date</label>
                  <input type="date" value={form.closedDate} onChange={(e) => ff("closedDate", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
                </div>
              )}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.newCustomerFlag as boolean} onChange={(e) => ff("newCustomerFlag", e.target.checked)} className="accent-[#CC2229]" />
                  New Customer
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.pocFlag as boolean} onChange={(e) => ff("pocFlag", e.target.checked)} className="accent-[#CC2229]" />
                  PoC
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
                <textarea rows={2} value={form.remarks} onChange={(e) => ff("remarks", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-[#CC2229] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#A81B21] disabled:opacity-50">
                  {saving ? "Saving…" : editSfId ? "Update" : "Add"}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kanban */}
      {view === "kanban" && (
        <KanbanBoard<MergedOpp>
          columns={kanbanCols}
          getId={(o) => o.uid}
          renderCard={(o) => <MergedCard item={o} onEdit={openEditLegacy} />}
          onMove={handleKanbanMove}
        />
      )}

      {/* Table */}
      {view === "table" && (
        <div className="bg-white rounded-xl border shadow-sm overflow-auto">
          {merged.length === 0 ? (
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
                  {["Company / Opportunity", "Stage", "Value (₹L)", "Prob %", "Close Date", "Owner", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {merged.map((o) => {
                  const days = o.expectedClosureDate
                    ? Math.ceil((new Date(o.expectedClosureDate).getTime() - Date.now()) / 86400000)
                    : null;
                  return (
                    <tr key={o.uid} className={`hover:bg-gray-50 ${o.isLegacy ? "bg-amber-50/30" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                          {o.companyName}
                          {o.isLegacy && (
                            <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1 py-0.5 rounded">Legacy</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 truncate max-w-[200px]">{o.opportunityName}</p>
                      </td>
                      <td className="px-4 py-3">
                        {o.isLegacy ? (
                          <span className="text-xs font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                            {o.legacyStage}
                          </span>
                        ) : (
                          <OppStageBadge stage={o.stage} />
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-[#CC2229]">₹{o.value.toFixed(1)}L</td>
                      <td className="px-4 py-3 text-gray-600">{o.probability}%</td>
                      <td className="px-4 py-3">
                        {o.expectedClosureDate ? (
                          <span className={
                            days !== null && days < 0
                              ? "text-red-600 font-semibold"
                              : days !== null && days <= 7
                              ? "text-amber-600"
                              : "text-gray-600"
                          }>
                            {o.expectedClosureDate.slice(0, 10)}
                            {days !== null && days < 0 && (
                              <span className="text-xs ml-1">({Math.abs(days)}d late)</span>
                            )}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{o.ownerName}</td>
                      <td className="px-4 py-3">
                        {o.isLegacy ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditLegacy(o.sfId!)}
                              className="text-xs text-[#CC2229] hover:underline font-medium"
                            >Edit</button>
                            <button
                              onClick={() => handleLegacyDelete(o.sfId!)}
                              className="text-xs text-red-500 hover:underline"
                            >Del</button>
                          </div>
                        ) : (
                          <Link
                            href={`/pipeline/opportunities/${o.crmId}`}
                            className="text-xs text-[#CC2229] hover:underline font-medium"
                          >View →</Link>
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
