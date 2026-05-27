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

// ── Embedded legacy funnel section ────────────────────────────────────────────

function LegacyFunnelSection({
  initialRows, employees, isManager, currentEmployeeId,
}: {
  initialRows: LegacyFunnelRow[]; employees: { id: number; name: string }[];
  isManager: boolean; currentEmployeeId?: number;
}) {
  const router = useRouter();
  const [rows, setRows]         = useState(initialRows);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState<number | null>(null);
  const [form, setForm]         = useState({ ...funnelEmpty, employeeId: String(currentEmployeeId ?? "") });
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState("");
  const [empF, setEmpF]         = useState("");
  const [stageF, setStageF]     = useState("");
  const [solF, setSolF]         = useState("");

  function ff(k: string, v: string | boolean) { setForm((p) => ({ ...p, [k]: v })); }

  function openEdit(r: LegacyFunnelRow) {
    setEditId(r.id);
    setForm({
      employeeId: String(r.employeeId), customerName: r.customerName,
      solutionCategory: r.solutionCategory, opportunityName: r.opportunityName,
      stage: r.stage, dealValueLakhs: String(r.dealValueLakhs),
      billingValueLakhs: String(r.billingValueLakhs), grossProfitPct: String(r.grossProfitPct),
      expectedCloseDate: r.expectedCloseDate?.slice(0, 10) ?? "",
      closedDate: r.closedDate?.slice(0, 10) ?? "",
      probabilityPct: String(r.probabilityPct), status: r.status,
      newCustomerFlag: r.newCustomerFlag, pocFlag: r.pocFlag, remarks: r.remarks,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const method = editId ? "PUT" : "POST";
    const url    = editId ? `/api/sales-funnel/${editId}` : "/api/sales-funnel";
    const res    = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        dealValueLakhs: Number(form.dealValueLakhs),
        billingValueLakhs: Number(form.billingValueLakhs),
        grossProfitPct: Number(form.grossProfitPct),
        probabilityPct: Number(form.probabilityPct),
        closedDate: form.closedDate || null,
      }),
    });
    if (res.ok) {
      const saved = await res.json();
      setRows((p) => editId ? p.map((r) => r.id === editId ? saved : r) : [saved, ...p]);
      setShowForm(false); setEditId(null); router.refresh();
    }
    setLoading(false);
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this opportunity?")) return;
    await fetch(`/api/sales-funnel/${id}`, { method: "DELETE" });
    setRows((p) => p.filter((r) => r.id !== id));
  }

  const filtered = useMemo(() => rows.filter((r) => {
    if (empF   && String(r.employeeId) !== empF) return false;
    if (stageF && r.stage !== stageF)            return false;
    if (solF   && r.solutionCategory !== solF)   return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.customerName.toLowerCase().includes(q) && !r.opportunityName.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [rows, empF, stageF, solF, search]);

  const pipeline  = rows.filter((r) => r.status === "Active" && !["Closed Won","Closed Lost"].includes(r.stage)).reduce((s, r) => s + r.dealValueLakhs, 0);
  const closedWon = rows.filter((r) => r.stage === "Closed Won").reduce((s, r) => s + r.dealValueLakhs, 0);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Pipeline",    value: `₹${pipeline.toFixed(1)}L` },
          { label: "Closed Won",         value: `₹${closedWon.toFixed(1)}L` },
          { label: "Total Opportunities",value: String(rows.length) },
          { label: "New Customers",      value: String(rows.filter((r) => r.newCustomerFlag && r.stage === "Closed Won").length) },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-[#CC2229]">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <input type="text" placeholder="Search customer / opportunity…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[180px] focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
        {isManager && (
          <select value={empF} onChange={(e) => setEmpF(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
            <option value="">All Employees</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        )}
        <select value={stageF} onChange={(e) => setStageF(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
          <option value="">All Stages</option>
          {FUNNEL_STAGES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={solF} onChange={(e) => setSolF(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
          <option value="">All Solutions</option>
          {FUNNEL_SOLUTIONS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button
          onClick={() => { setEditId(null); setForm({ ...funnelEmpty, employeeId: String(currentEmployeeId ?? "") }); setShowForm(true); }}
          className="ml-auto bg-[#CC2229] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#A81B21] transition">
          + Add Opportunity
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">{editId ? "Edit" : "Add"} Opportunity</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
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
                <button type="submit" disabled={loading}
                  className="flex-1 bg-[#CC2229] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#A81B21] disabled:opacity-50">
                  {loading ? "Saving…" : editId ? "Update" : "Add"}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="font-medium">No funnel entries yet.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["ID", isManager ? "Employee" : null, "Customer", "Opportunity", "Solution", "Stage", "Deal (₹L)", "GP (₹L)", "Exp. Close", "Closed On", "Flags", ""].filter(Boolean).map((h) => (
                  <th key={h!} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.opportunityId}</td>
                  {isManager && <td className="px-4 py-3 font-medium">{r.employee?.name ?? "—"}</td>}
                  <td className="px-4 py-3 font-medium">{r.customerName}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[150px] truncate">{r.opportunityName}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.solutionCategory}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      r.stage === "Closed Won" ? "bg-green-100 text-green-700" :
                      r.stage === "Closed Lost" ? "bg-red-100 text-red-700" :
                      ["Proposal Sent","Negotiation"].includes(r.stage) ? "bg-amber-100 text-amber-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>{r.stage}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#CC2229]">{r.dealValueLakhs.toFixed(1)}</td>
                  <td className="px-4 py-3 text-gray-600">{(r.dealValueLakhs * r.grossProfitPct / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.expectedCloseDate?.slice(0, 10) ?? "—"}</td>
                  <td className="px-4 py-3 text-xs font-medium text-emerald-700">{r.closedDate?.slice(0, 10) ?? "—"}</td>
                  <td className="px-4 py-3 text-center text-xs">
                    {r.newCustomerFlag && <span className="mr-1">New</span>}
                    {r.pocFlag && <span>PoC</span>}
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => openEdit(r)} className="text-xs text-[#CC2229] hover:underline">Edit</button>
                    <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:underline">Del</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

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
  const [opps, setOpps] = useState(initialOpps);
  const [view, setView] = useState<"table" | "kanban" | "funnel">(initialView);
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
          <button onClick={() => setView("funnel")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition ${view === "funnel" ? "bg-white shadow text-[#CC2229]" : "text-gray-600"}`}>
            📋 Funnel
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

      {/* ── Legacy funnel view ───────────────────────────────────────────────── */}
      {view === "funnel" && (
        <LegacyFunnelSection
          initialRows={initialFunnelRows}
          employees={employees}
          isManager={isManager}
          currentEmployeeId={currentEmployeeId}
        />
      )}
    </div>
  );
}
