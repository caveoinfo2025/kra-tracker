"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LeadSerialized,
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  LEAD_SOURCES,
} from "@/types/pipeline";
import { LeadStageBadge } from "@/components/pipeline/StageBadge";
import { LeadCard } from "@/components/pipeline/LeadCard";
import { KanbanBoard, KanbanColumn } from "@/components/pipeline/KanbanBoard";
import { CrmSelect } from "@/components/pipeline/CrmSelect";

// ── Lead form ─────────────────────────────────────────────────────────────────

function LeadFormModal({
  employees,
  currentEmployeeId,
  isManager,
  onClose,
  onCreated,
}: {
  employees: { id: number; name: string }[];
  currentEmployeeId?: number;
  isManager: boolean;
  onClose: () => void;
  onCreated: (l: LeadSerialized) => void;
}) {
  const [form, setForm] = useState({
    title: "", companyName: "", contactPerson: "", email: "", phone: "",
    source: "Direct",
    categoryId: "", categoryName: "",
    oemId: "", oemName: "",
    productId: "", productName: "",
    customerId: "", customerName: "",
    expectedValue: "0", remarks: "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  function f(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch("/api/pipeline/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, expectedValue: Number(form.expectedValue) }),
      });
      if (!res.ok) { setError("Failed to create lead."); return; }
      const lead = await res.json();
      onCreated(lead);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-4 p-6">
        <h3 className="text-lg font-bold mb-4">New Lead</h3>
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded mb-3 border border-red-200">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Lead Title *</label>
              <input required value={form.title} onChange={(e) => f("title", e.target.value)}
                placeholder="e.g. NGFW Replacement Project"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Company *</label>
              <input required value={form.companyName} onChange={(e) => f("companyName", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contact Person *</label>
              <input required value={form.contactPerson} onChange={(e) => f("contactPerson", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => f("email", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input value={form.phone} onChange={(e) => f("phone", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Source</label>
              <select value={form.source} onChange={(e) => f("source", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
                {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* CRM data dropdowns */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <CrmSelect type="categories" value={form.categoryId} name={form.categoryName}
                onChange={(id, name) => setForm((p) => ({ ...p, categoryId: id, categoryName: name }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">OEM</label>
              <CrmSelect type="oems" value={form.oemId} name={form.oemName}
                onChange={(id, name) => setForm((p) => ({ ...p, oemId: id, oemName: name }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
              <CrmSelect type="products" value={form.productId} name={form.productName} oemId={form.oemId}
                onChange={(id, name) => setForm((p) => ({ ...p, productId: id, productName: name }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer (existing)</label>
              <CrmSelect type="customers" value={form.customerId} name={form.customerName}
                onChange={(id, name) => setForm((p) => ({ ...p, customerId: id, customerName: name }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Expected Value (₹L)</label>
              <input type="number" step="0.1" value={form.expectedValue} onChange={(e) => f("expectedValue", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
            <textarea rows={2} value={form.remarks} onChange={(e) => f("remarks", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={loading}
              className="flex-1 bg-[#CC2229] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#A81B21] disabled:opacity-50">
              {loading ? "Creating…" : "Create Lead"}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LeadsClient({
  initialLeads,
  employees,
  isManager,
  currentEmployeeId,
  initialView,
}: {
  initialLeads: LeadSerialized[];
  employees: { id: number; name: string }[];
  isManager: boolean;
  currentEmployeeId?: number;
  initialView: "table" | "kanban";
}) {
  const router      = useRouter();
  const [leads, setLeads]     = useState(initialLeads);
  const [view,  setView]      = useState<"table" | "kanban">(initialView);
  const [showForm, setShowForm] = useState(false);

  // Filters
  const [search,     setSearch]     = useState("");
  const [stageF,     setStageF]     = useState("");
  const [sourceF,    setSourceF]    = useState("");
  const [empF,       setEmpF]       = useState("");

  function handleCreated(l: LeadSerialized) {
    setLeads((p) => [l, ...p]);
    router.refresh();
  }

  // ── Filtered leads ─────────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    leads.filter((l) => {
      if (stageF  && l.stage  !== stageF)  return false;
      if (sourceF && l.source !== sourceF) return false;
      if (empF    && String(l.assignedToId) !== empF) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!l.title.toLowerCase().includes(q) &&
            !l.companyName.toLowerCase().includes(q) &&
            !l.contactPerson.toLowerCase().includes(q)) return false;
      }
      return true;
    }),
  [leads, stageF, sourceF, empF, search]);

  // ── Kanban columns ─────────────────────────────────────────────────────────
  const qualStages = LEAD_STAGES.filter((s) => s !== "PROPOSAL_SENT");
  const kanbanCols: KanbanColumn<LeadSerialized>[] = qualStages.map((s) => ({
    key: s, label: LEAD_STAGE_LABELS[s],
    color: s === "NEW_LEAD" ? "bg-slate-200 text-slate-700"
         : s === "CONTACTED" ? "bg-blue-200 text-blue-700"
         : s === "QUALIFIED" ? "bg-indigo-200 text-indigo-700"
         : s === "REQUIREMENT_GATHERED" ? "bg-violet-200 text-violet-700"
         : s === "SOLUTION_PROPOSED" ? "bg-purple-200 text-purple-700"
         : "bg-orange-200 text-orange-700",
    items: filtered.filter((l) => l.stage === s),
  }));

  async function handleKanbanMove(leadId: number | string, _from: string, toStage: string) {
    const res = await fetch(`/api/pipeline/leads/${leadId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: toStage }),
    });
    if (res.ok) {
      const updated = await res.json();
      setLeads((p) => p.map((l) => l.id === updated.id ? { ...l, stage: updated.stage, opportunity: updated.opportunity } : l));
      router.refresh();
    }
  }

  // ── Stats bar ──────────────────────────────────────────────────────────────
  const total     = filtered.length;
  const qualified = filtered.filter((l) => ["QUALIFIED","REQUIREMENT_GATHERED","SOLUTION_PROPOSED","POC_DEMO","PROPOSAL_SENT"].includes(l.stage)).length;
  const proposal  = filtered.filter((l) => l.stage === "PROPOSAL_SENT").length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Leads", value: total },
          { label: "Qualified+",  value: qualified, color: "text-indigo-700" },
          { label: "At Proposal", value: proposal,  color: "text-amber-700" },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color ?? "text-[#CC2229]"}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <input type="text" placeholder="Search company / contact…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
          <select value={stageF} onChange={(e) => setStageF(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
            <option value="">All Stages</option>
            {LEAD_STAGES.map((s) => <option key={s} value={s}>{LEAD_STAGE_LABELS[s]}</option>)}
          </select>
          <select value={sourceF} onChange={(e) => setSourceF(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
            <option value="">All Sources</option>
            {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
          </select>
          {isManager && (
            <select value={empF} onChange={(e) => setEmpF(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
              <option value="">All Owners</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          )}
        </div>

        <div className="flex gap-2 items-center">
          {/* View toggle */}
          <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
            <button onClick={() => setView("table")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${view === "table" ? "bg-white shadow text-[#CC2229]" : "text-gray-600"}`}>
              ☰ Table
            </button>
            <button onClick={() => setView("kanban")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${view === "kanban" ? "bg-white shadow text-[#CC2229]" : "text-gray-600"}`}>
              ⊞ Kanban
            </button>
          </div>
          <button onClick={() => setShowForm(true)}
            className="bg-[#CC2229] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#A81B21] transition">
            + New Lead
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500">{filtered.length} of {leads.length} leads</p>

      {/* Modal */}
      {showForm && (
        <LeadFormModal
          employees={employees}
          currentEmployeeId={currentEmployeeId}
          isManager={isManager}
          onClose={() => setShowForm(false)}
          onCreated={handleCreated}
        />
      )}

      {/* ── Kanban view ─────────────────────────────────────────────────────── */}
      {view === "kanban" && (
        <KanbanBoard<LeadSerialized>
          columns={kanbanCols}
          getId={(l) => l.id}
          renderCard={(l) => <LeadCard lead={l} />}
          onMove={handleKanbanMove}
        />
      )}

      {/* ── Table view ──────────────────────────────────────────────────────── */}
      {view === "table" && (
        <div className="bg-white rounded-xl border shadow-sm overflow-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="font-medium">No leads found.</p>
              <button onClick={() => setShowForm(true)}
                className="mt-2 text-sm text-[#CC2229] hover:underline">Create your first lead →</button>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["Company", "Contact", "Stage", "OEM / Category", "Value (₹L)", "Owner", "Updated", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{l.companyName}</p>
                      <p className="text-xs text-gray-400">{l.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{l.contactPerson}</p>
                      {l.email && <p className="text-xs text-gray-400">{l.email}</p>}
                    </td>
                    <td className="px-4 py-3"><LeadStageBadge stage={l.stage} /></td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-600">{l.oemName || "—"}</p>
                      <p className="text-xs text-gray-400">{l.categoryName}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#CC2229]">
                      {l.expectedValue > 0 ? `₹${l.expectedValue.toFixed(1)}L` : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{l.assignedTo.name}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{l.updatedAt.slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/pipeline/leads/${l.id}`}
                        className="text-xs text-[#CC2229] hover:underline font-medium whitespace-nowrap">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
