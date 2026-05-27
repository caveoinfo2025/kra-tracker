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

// ── New-lead form modal (unchanged) ──────────────────────────────────────────

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

// ── Legacy activity types & constants ─────────────────────────────────────────

type LegacyActivity = {
  id: number; date: string; employeeId: number; employee: { name: string };
  territory: string; leadSource: string; customerName: string; contactPerson: string;
  activityType: string; activityCount: number; leadStatus: string;
  qualifiedFlag: boolean; remarks: string;
};

const ACT_SOURCES  = ["Outbound Calls","Existing Customer","Referral","OEM Lead","Website","Event","Partner"];
const ACT_TYPES    = ["Call","Connect","Meeting","Demo","Follow-up","Proposal Discussion","Collection Follow-up"];
const ACT_STATUSES = ["New","Contacted","Qualified","Disqualified","Converted","Nurture"];

const actEmpty = {
  employeeId: "", date: "", territory: "", leadSource: "", customerName: "",
  contactPerson: "", activityType: "", activityCount: "1",
  leadStatus: "New", qualifiedFlag: false, remarks: "",
};

/** Map legacy leadStatus → CRM LEAD_STAGE enum */
function actStatusToLeadStage(status: string): string {
  switch (status) {
    case "Converted":     return "PROPOSAL_SENT";
    case "Qualified":     return "QUALIFIED";
    case "Contacted":     return "CONTACTED";
    case "Disqualified":  return "CONTACTED";   // no DISQUALIFIED stage; park in Contacted
    case "Nurture":       return "NEW_LEAD";
    default:              return "NEW_LEAD";     // "New"
  }
}

/** Map CRM LEAD_STAGE enum → legacy leadStatus */
function leadStageToActStatus(stage: string): string {
  switch (stage) {
    case "PROPOSAL_SENT":        return "Converted";
    case "QUALIFIED":
    case "REQUIREMENT_GATHERED":
    case "SOLUTION_PROPOSED":
    case "POC_DEMO":             return "Qualified";
    case "CONTACTED":            return "Contacted";
    default:                     return "New";
  }
}

// ── Unified merged-lead type ──────────────────────────────────────────────────

type MergedLead = {
  uid: string;        // "crm-{id}" | "act-{id}"
  isLegacy: boolean;
  stage: string;      // LEAD_STAGE enum value
  companyName: string;
  contactPerson: string;
  ownerName: string;
  ownerId?: number;
  // CRM-specific
  crmId?: number;
  leadTitle?: string;
  expectedValue?: number;
  source?: string;
  updatedAt?: string;
  // Legacy-specific
  actId?: number;
  activityType?: string;
  activityCount?: number;
  legacyStatus?: string;
  qualifiedFlag?: boolean;
  date?: string;
  leadSource?: string;
};

// ── Legacy activity card for Kanban ──────────────────────────────────────────

function ActivityCard({ item, onEdit }: { item: MergedLead; onEdit: (id: number) => void }) {
  const actColor =
    item.activityType === "Call"    ? "bg-blue-50 text-blue-700 border-blue-200"
    : item.activityType === "Meeting" ? "bg-violet-50 text-violet-700 border-violet-200"
    : item.activityType === "Connect" ? "bg-cyan-50 text-cyan-700 border-cyan-200"
    : "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-amber-200 hover:border-amber-400 transition-all">
      <div className="flex items-start justify-between mb-1">
        <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-1 flex-1">
          {item.companyName}
        </p>
        <span className="ml-1 text-[9px] font-bold bg-amber-100 text-amber-700 px-1 py-0.5 rounded shrink-0">
          Legacy
        </span>
      </div>
      {item.contactPerson && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-1">{item.contactPerson}</p>
      )}

      <div className="flex items-center justify-between mb-1">
        {item.activityType ? (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${actColor}`}>
            {item.activityType} {item.activityCount && item.activityCount > 1 ? `×${item.activityCount}` : ""}
          </span>
        ) : (
          <span className="text-[10px] text-gray-400">—</span>
        )}
        {item.qualifiedFlag && (
          <span className="text-[9px] font-bold bg-green-100 text-green-700 px-1 py-0.5 rounded">✓ Qualified</span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-400 truncate max-w-[100px]">{item.ownerName}</p>
          {item.date && <p className="text-[10px] text-gray-300">{item.date.slice(0, 10)}</p>}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(item.actId!); }}
          className="text-[10px] text-[#CC2229] hover:underline shrink-0 ml-2"
        >Edit</button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LeadsClient({
  initialLeads,
  employees,
  isManager,
  currentEmployeeId,
  initialView,
  initialActivities,
}: {
  initialLeads: LeadSerialized[];
  employees: { id: number; name: string }[];
  isManager: boolean;
  currentEmployeeId?: number;
  initialView: "table" | "kanban";
  initialActivities: LegacyActivity[];
}) {
  const router = useRouter();

  const [leads,      setLeads]      = useState(initialLeads);
  const [activities, setActivities] = useState(initialActivities);
  const [view,       setView]       = useState<"table" | "kanban">(initialView);
  const [showLeadForm, setShowLeadForm] = useState(false);

  // Filters
  const [search,  setSearch]  = useState("");
  const [stageF,  setStageF]  = useState("");
  const [sourceF, setSourceF] = useState("");
  const [empF,    setEmpF]    = useState("");

  // Legacy activity form
  const [showActForm, setShowActForm] = useState(false);
  const [editActId,   setEditActId]   = useState<number | null>(null);
  const [actForm,     setActForm]     = useState({ ...actEmpty, employeeId: String(currentEmployeeId ?? "") });
  const [savingAct,   setSavingAct]   = useState(false);

  function fa(k: string, v: string | boolean) { setActForm((p) => ({ ...p, [k]: v })); }

  function openAddActivity() {
    setEditActId(null);
    setActForm({ ...actEmpty, employeeId: String(currentEmployeeId ?? "") });
    setShowActForm(true);
  }

  function openEditActivity(actId: number) {
    const a = activities.find((x) => x.id === actId);
    if (!a) return;
    setEditActId(actId);
    setActForm({
      employeeId:    String(a.employeeId),
      date:          a.date.slice(0, 10),
      territory:     a.territory,
      leadSource:    a.leadSource,
      customerName:  a.customerName,
      contactPerson: a.contactPerson,
      activityType:  a.activityType,
      activityCount: String(a.activityCount),
      leadStatus:    a.leadStatus,
      qualifiedFlag: a.qualifiedFlag,
      remarks:       a.remarks,
    });
    setShowActForm(true);
  }

  async function handleActivitySubmit(e: React.FormEvent) {
    e.preventDefault(); setSavingAct(true);
    const method = editActId ? "PUT" : "POST";
    const url    = editActId ? `/api/lead-generation/${editActId}` : "/api/lead-generation";
    const res    = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...actForm, activityCount: Number(actForm.activityCount) }),
    });
    if (res.ok) {
      const saved = await res.json();
      setActivities((p) => editActId ? p.map((a) => a.id === editActId ? saved : a) : [saved, ...p]);
      setShowActForm(false); setEditActId(null); router.refresh();
    }
    setSavingAct(false);
  }

  async function handleActivityDelete(actId: number) {
    if (!confirm("Delete this activity entry?")) return;
    await fetch(`/api/lead-generation/${actId}`, { method: "DELETE" });
    setActivities((p) => p.filter((a) => a.id !== actId));
  }

  function handleLeadCreated(l: LeadSerialized) {
    setLeads((p) => [l, ...p]);
    router.refresh();
  }

  // ── Merged dataset (filtered) ──────────────────────────────────────────────

  const merged = useMemo<MergedLead[]>(() => {
    const crmItems: MergedLead[] = leads
      .filter((l) => {
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
      })
      .map((l) => ({
        uid:           `crm-${l.id}`,
        isLegacy:      false,
        stage:         l.stage,
        companyName:   l.companyName,
        contactPerson: l.contactPerson,
        ownerName:     l.assignedTo.name,
        ownerId:       l.assignedToId,
        crmId:         l.id,
        leadTitle:     l.title,
        expectedValue: l.expectedValue,
        source:        l.source,
        updatedAt:     l.updatedAt,
      }));

    const actItems: MergedLead[] = activities
      .filter((a) => {
        if (empF && String(a.employeeId) !== empF) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!a.customerName.toLowerCase().includes(q) &&
              !a.contactPerson.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .map((a) => ({
        uid:           `act-${a.id}`,
        isLegacy:      true,
        stage:         actStatusToLeadStage(a.leadStatus),
        companyName:   a.customerName,
        contactPerson: a.contactPerson,
        ownerName:     a.employee?.name ?? "—",
        ownerId:       a.employeeId,
        actId:         a.id,
        activityType:  a.activityType,
        activityCount: a.activityCount,
        legacyStatus:  a.leadStatus,
        qualifiedFlag: a.qualifiedFlag,
        date:          a.date,
        leadSource:    a.leadSource,
      }));

    return [...crmItems, ...actItems];
  }, [leads, activities, stageF, sourceF, empF, search]);

  // ── KRA-aligned stats (computed from full unfiltered scope) ─────────────────
  // KRA engine reads: activityType=Call (outbound), Connect (connects),
  // Meeting (appointments), qualifiedFlag (qualified leads)

  const scopedActs = empF
    ? activities.filter((a) => String(a.employeeId) === empF)
    : activities;

  const kraOutbound    = scopedActs.filter((a) => a.activityType === "Call").reduce((s, a) => s + a.activityCount, 0);
  const kraConnects    = scopedActs.filter((a) => a.activityType === "Connect").reduce((s, a) => s + a.activityCount, 0);
  const kraQualified   = scopedActs.filter((a) => a.qualifiedFlag).length;
  const kraAppointments= scopedActs.filter((a) => a.activityType === "Meeting").reduce((s, a) => s + a.activityCount, 0);

  // CRM stats from filtered merged set
  const crmLeads    = merged.filter((m) => !m.isLegacy).length;
  const crmQual     = merged.filter((m) => !m.isLegacy &&
    ["QUALIFIED","REQUIREMENT_GATHERED","SOLUTION_PROPOSED","POC_DEMO","PROPOSAL_SENT"].includes(m.stage)).length;
  const crmProposal = merged.filter((m) => !m.isLegacy && m.stage === "PROPOSAL_SENT").length;

  // ── Kanban columns ─────────────────────────────────────────────────────────

  const qualStages = LEAD_STAGES.filter((s) => s !== "PROPOSAL_SENT");
  const kanbanCols: KanbanColumn<MergedLead>[] = [
    ...qualStages,
    "PROPOSAL_SENT" as string,
  ].map((s) => ({
    key:   s,
    label: LEAD_STAGE_LABELS[s as keyof typeof LEAD_STAGE_LABELS] ?? s,
    color: s === "NEW_LEAD"            ? "bg-slate-200 text-slate-700"
         : s === "CONTACTED"           ? "bg-blue-200 text-blue-700"
         : s === "QUALIFIED"           ? "bg-indigo-200 text-indigo-700"
         : s === "REQUIREMENT_GATHERED"? "bg-violet-200 text-violet-700"
         : s === "SOLUTION_PROPOSED"   ? "bg-purple-200 text-purple-700"
         : s === "POC_DEMO"            ? "bg-fuchsia-200 text-fuchsia-700"
         : "bg-orange-200 text-orange-700",
    items: merged.filter((m) => m.stage === s),
  }));

  async function handleKanbanMove(uid: number | string, _from: string, toStage: string) {
    const uidStr = String(uid);

    if (uidStr.startsWith("crm-")) {
      const crmId = Number(uidStr.replace("crm-", ""));
      const res   = await fetch(`/api/pipeline/leads/${crmId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: toStage }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLeads((p) => p.map((l) => l.id === updated.id
          ? { ...l, stage: updated.stage, opportunity: updated.opportunity } : l));
        router.refresh();
      }
    } else if (uidStr.startsWith("act-")) {
      const actId   = Number(uidStr.replace("act-", ""));
      const row     = activities.find((a) => a.id === actId);
      if (!row) return;
      const newStatus = leadStageToActStatus(toStage);
      const res = await fetch(`/api/lead-generation/${actId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId:    String(row.employeeId),
          date:          row.date.slice(0, 10),
          territory:     row.territory,
          leadSource:    row.leadSource,
          customerName:  row.customerName,
          contactPerson: row.contactPerson,
          activityType:  row.activityType,
          activityCount: row.activityCount,
          leadStatus:    newStatus,
          qualifiedFlag: row.qualifiedFlag,
          remarks:       row.remarks,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setActivities((p) => p.map((a) => a.id === actId ? updated : a));
        router.refresh();
      }
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* CRM lead stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Leads",  value: crmLeads,    color: "text-[#CC2229]" },
          { label: "Qualified+",   value: crmQual,     color: "text-indigo-700" },
          { label: "At Proposal",  value: crmProposal, color: "text-amber-700" },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* KRA activity metrics */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
          KRA Activity Metrics (Legacy)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Outbound Calls",   value: kraOutbound,     color: "text-blue-700" },
            { label: "Connects",         value: kraConnects,     color: "text-cyan-700" },
            { label: "Qualified Leads",  value: kraQualified,    color: "text-green-700" },
            { label: "Appointments",     value: kraAppointments, color: "text-violet-700" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-amber-100 rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
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
          <button onClick={openAddActivity}
            className="bg-amber-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-amber-600 transition whitespace-nowrap">
            + Activity
          </button>
        </div>

        <div className="flex gap-2 items-center shrink-0">
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
          <button onClick={() => setShowLeadForm(true)}
            className="bg-[#CC2229] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#A81B21] transition">
            + New Lead
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500">{merged.filter((m) => !m.isLegacy).length} CRM leads · {merged.filter((m) => m.isLegacy).length} legacy activities</p>

      {/* New lead modal */}
      {showLeadForm && (
        <LeadFormModal
          employees={employees}
          currentEmployeeId={currentEmployeeId}
          isManager={isManager}
          onClose={() => setShowLeadForm(false)}
          onCreated={handleLeadCreated}
        />
      )}

      {/* Activity form modal */}
      {showActForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">{editActId ? "Edit" : "Add"} Activity Entry</h3>
            <form onSubmit={handleActivitySubmit} className="space-y-3">
              {isManager && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Employee</label>
                  <select required value={actForm.employeeId} onChange={(e) => fa("employeeId", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Select employee</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                  <input type="date" value={actForm.date} onChange={(e) => fa("date", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Territory</label>
                  <input type="text" value={actForm.territory} onChange={(e) => fa("territory", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name *</label>
                <input required type="text" value={actForm.customerName} onChange={(e) => fa("customerName", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Contact Person</label>
                  <input type="text" value={actForm.contactPerson} onChange={(e) => fa("contactPerson", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lead Source</label>
                  <select value={actForm.leadSource} onChange={(e) => fa("leadSource", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Select</option>
                    {ACT_SOURCES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Activity Type</label>
                  <select value={actForm.activityType} onChange={(e) => fa("activityType", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Select</option>
                    {ACT_TYPES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Activity Count</label>
                  <input type="number" min={1} value={actForm.activityCount} onChange={(e) => fa("activityCount", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lead Status</label>
                  <select value={actForm.leadStatus} onChange={(e) => fa("leadStatus", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    {ACT_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id="qf-act" checked={actForm.qualifiedFlag as boolean}
                    onChange={(e) => fa("qualifiedFlag", e.target.checked)}
                    className="w-4 h-4 accent-[#CC2229]" />
                  <label htmlFor="qf-act" className="text-sm text-gray-700 font-medium">Qualified Lead</label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
                <textarea rows={2} value={actForm.remarks} onChange={(e) => fa("remarks", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={savingAct}
                  className="flex-1 bg-[#CC2229] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#A81B21] disabled:opacity-50">
                  {savingAct ? "Saving…" : editActId ? "Update" : "Add Entry"}
                </button>
                <button type="button" onClick={() => setShowActForm(false)}
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
        <KanbanBoard<MergedLead>
          columns={kanbanCols}
          getId={(m) => m.uid}
          renderCard={(m) =>
            m.isLegacy
              ? <ActivityCard item={m} onEdit={openEditActivity} />
              : <LeadCard lead={leads.find((l) => l.id === m.crmId)!} />
          }
          onMove={handleKanbanMove}
        />
      )}

      {/* Table */}
      {view === "table" && (
        <div className="bg-white rounded-xl border shadow-sm overflow-auto">
          {merged.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="font-medium">No leads found.</p>
              <button onClick={() => setShowLeadForm(true)}
                className="mt-2 text-sm text-[#CC2229] hover:underline">Create your first lead →</button>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["Company / Contact", "Stage / Activity", "Value / Count", "Source", "Owner", "Date", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {merged.map((m) => (
                  <tr key={m.uid} className={`hover:bg-gray-50 ${m.isLegacy ? "bg-amber-50/30" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                        {m.companyName}
                        {m.isLegacy && (
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1 py-0.5 rounded">Legacy</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">{m.contactPerson}</p>
                      {!m.isLegacy && m.leadTitle && (
                        <p className="text-xs text-gray-500 italic">{m.leadTitle}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {m.isLegacy ? (
                        <div className="space-y-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                            m.legacyStatus === "Qualified" || m.legacyStatus === "Converted"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : m.legacyStatus === "Disqualified"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>{m.legacyStatus}</span>
                          {m.activityType && (
                            <p className="text-[11px] text-gray-500">{m.activityType}</p>
                          )}
                          {m.qualifiedFlag && (
                            <span className="text-[9px] bg-green-100 text-green-700 px-1 py-0.5 rounded font-bold">✓ Qualified</span>
                          )}
                        </div>
                      ) : (
                        <LeadStageBadge stage={m.stage} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {m.isLegacy ? (
                        <span className="text-gray-600 text-sm">{m.activityCount ?? "—"}</span>
                      ) : (
                        <span className="font-semibold text-[#CC2229]">
                          {(m.expectedValue ?? 0) > 0 ? `₹${(m.expectedValue ?? 0).toFixed(1)}L` : "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {m.isLegacy ? m.leadSource : m.source}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{m.ownerName}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {m.isLegacy ? m.date?.slice(0, 10) : m.updatedAt?.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {m.isLegacy ? (
                        <div className="flex gap-2">
                          <button onClick={() => openEditActivity(m.actId!)}
                            className="text-xs text-[#CC2229] hover:underline font-medium">Edit</button>
                          <button onClick={() => handleActivityDelete(m.actId!)}
                            className="text-xs text-red-500 hover:underline">Del</button>
                        </div>
                      ) : (
                        <Link href={`/pipeline/leads/${m.crmId}`}
                          className="text-xs text-[#CC2229] hover:underline font-medium">View →</Link>
                      )}
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
