"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LeadSerialized, LEAD_STAGES, LEAD_STAGE_LABELS, LEAD_SOURCES, TaskSerialized, NoteSerialized, ActivitySerialized } from "@/types/pipeline";
import { LeadStageBadge } from "@/components/pipeline/StageBadge";
import { ActivityFeed } from "@/components/pipeline/ActivityFeed";
import { PriorityBadge } from "@/components/pipeline/StageBadge";

type Employee = { id: number; name: string; role?: string; department?: string; isManager?: boolean };

type Meeting = { id: number; title: string; meetingDate: string; notes: string; location: string; employee: { id: number; name: string } };

type FullLead = LeadSerialized & {
  tasks: (TaskSerialized & { assignedTo: { id: number; name: string } })[];
  meetings: Meeting[];
  activities: ActivitySerialized[];
  notes: NoteSerialized[];
};

function isPresales(e: Employee) {
  const hay = `${e.role ?? ""} ${e.department ?? ""}`.toLowerCase();
  return hay.includes("presales") || hay.includes("pre-sales") || hay.includes("pre sales");
}

// ─── Edit Lead modal ────────────────────────────────────────────────────────────
function EditLeadModal({
  lead, onClose, onSaved,
}: {
  lead: FullLead;
  onClose: () => void;
  onSaved: (updated: FullLead) => void;
}) {
  const [form, setForm] = useState({
    title: lead.title ?? "",
    companyName: lead.companyName ?? "",
    contactPerson: lead.contactPerson ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    source: lead.source ?? "Direct",
    oemName: lead.oemName ?? "",
    categoryName: lead.categoryName ?? "",
    productName: lead.productName ?? "",
    customerName: lead.customerName ?? "",
    expectedValue: String(lead.expectedValue ?? 0),
    remarks: lead.remarks ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function f<K extends keyof typeof form>(k: K, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.companyName.trim()) { setError("Company name is required."); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/pipeline/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, expectedValue: Number(form.expectedValue) || 0 }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed to save."); return; }
      const updated = await res.json();
      onSaved(updated);
      onClose();
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const FIELDS: [keyof typeof form, string, string?][] = [
    ["companyName", "Company *"],
    ["title", "Opportunity / Title"],
    ["contactPerson", "Contact Person"],
    ["email", "Email", "email"],
    ["phone", "Phone", "tel"],
    ["oemName", "OEM"],
    ["categoryName", "Category"],
    ["productName", "Product"],
    ["customerName", "Customer"],
    ["expectedValue", "Expected Value (₹L)", "number"],
  ];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Edit Lead</h3>
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded border border-red-200 mb-3">{error}</div>}
        <form onSubmit={save} className="grid grid-cols-2 gap-3">
          {FIELDS.map(([key, label, type]) => (
            <div key={key} className={key === "companyName" || key === "title" ? "col-span-2" : ""}>
              <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
              <input
                type={type ?? "text"} step={type === "number" ? "0.1" : undefined}
                value={form[key]} onChange={(e) => f(key, e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Source</label>
            <select value={form.source} onChange={(e) => f("source", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
              {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
            <textarea rows={2} value={form.remarks} onChange={(e) => f("remarks", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
          </div>
          <div className="col-span-2 flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 bg-[#CC2229] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#A81B21] disabled:opacity-50">
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Schedule Meeting modal ─────────────────────────────────────────────────────
function ScheduleMeetingModal({
  leadId, employees, currentEmployeeId, defaultTitle, defaultPresales, onClose, onSaved,
}: {
  leadId: number;
  employees: Employee[];
  currentEmployeeId?: number;
  defaultTitle?: string;
  defaultPresales?: boolean;
  onClose: () => void;
  onSaved: (m: Meeting) => void;
}) {
  // Default assignee: first presales person if defaultPresales, else self
  const presales = employees.filter(isPresales);
  const initialAssignee = defaultPresales && presales.length > 0
    ? presales[0].id
    : (currentEmployeeId ?? employees[0]?.id ?? 0);

  const [title, setTitle] = useState(defaultTitle ?? "");
  const [meetingDate, setMeetingDate] = useState("");
  const [location, setLocation] = useState("");
  const [assigneeId, setAssigneeId] = useState<number>(initialAssignee);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim() || !meetingDate) { setError("Title and date/time are required."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/pipeline/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, meetingDate, location, notes, leadId, employeeId: assigneeId }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed to schedule."); return; }
      const m = await res.json();
      onSaved(m);
      onClose();
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-1">Schedule Meeting</h3>
        <p className="text-sm text-gray-500 mb-4">Assign to yourself or someone else; they’ll be notified.</p>
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded border border-red-200 mb-3">{error}</div>}
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. POC / Demo session"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date & Time</label>
              <input type="datetime-local" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Online / On-site"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Assign to</label>
            <select value={assigneeId} onChange={(e) => setAssigneeId(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
              {currentEmployeeId && (
                <option value={currentEmployeeId}>Myself</option>
              )}
              {presales.length > 0 && (
                <optgroup label="Presales">
                  {presales.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </optgroup>
              )}
              <optgroup label="All team">
                {employees.filter((e) => e.id !== currentEmployeeId).map((e) => (
                  <option key={e.id} value={e.id}>{e.name}{isPresales(e) ? " · Presales" : ""}</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 bg-[#CC2229] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#A81B21] disabled:opacity-50">
              {saving ? "Scheduling…" : "Schedule"}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── POC/Demo assign-to-presales prompt ─────────────────────────────────────────
function PocDemoPrompt({
  leadId, employees, currentEmployeeId, onClose, onDone,
}: {
  leadId: number;
  employees: Employee[];
  currentEmployeeId?: number;
  onClose: () => void;
  onDone: (meeting: Meeting | null, task: (TaskSerialized & { assignedTo: { id: number; name: string } }) | null) => void;
}) {
  const presales = employees.filter(isPresales);
  const [presalesId, setPresalesId] = useState<number>(presales[0]?.id ?? currentEmployeeId ?? employees[0]?.id ?? 0);
  const [meetingDate, setMeetingDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!meetingDate) { setError("Pick a date/time for the POC/Demo."); return; }
    setSaving(true);
    try {
      // 1. Schedule the meeting
      const mRes = await fetch("/api/pipeline/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "POC / Demo", meetingDate, leadId, employeeId: presalesId, notes: "Auto-created on moving to POC/Demo stage." }),
      });
      const meeting = mRes.ok ? await mRes.json() : null;

      // 2. Create the follow-up task for presales
      const tRes = await fetch("/api/pipeline/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Run POC / Demo",
          dueDate: meetingDate,
          priority: "high",
          leadId,
          assignedToId: presalesId,
          description: "Prepare and deliver the POC/Demo for this lead.",
        }),
      });
      const task = tRes.ok ? await tRes.json() : null;

      onDone(meeting, task);
      onClose();
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-1">Assign POC / Demo to Presales</h3>
        <p className="text-sm text-gray-500 mb-4">
          Moving to POC/Demo — schedule the session and create a task for the presales owner.
        </p>
        {presales.length === 0 && (
          <div className="bg-amber-50 text-amber-800 text-xs px-3 py-2 rounded border border-amber-200 mb-3">
            No employee has a “Presales” role yet — you can still pick anyone below. Set someone’s role to “Presales” on the Team page to surface them here.
          </div>
        )}
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded border border-red-200 mb-3">{error}</div>}
        <form onSubmit={run} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Presales owner</label>
            <select value={presalesId} onChange={(e) => setPresalesId(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
              {presales.length > 0 && (
                <optgroup label="Presales">
                  {presales.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </optgroup>
              )}
              <optgroup label="All team">
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}{isPresales(e) ? " · Presales" : ""}</option>)}
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">POC / Demo date & time</label>
            <input type="datetime-local" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 bg-[#CC2229] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#A81B21] disabled:opacity-50">
              {saving ? "Assigning…" : "Schedule + Assign"}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50">Skip</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────
export default function LeadDetailClient({
  lead: initialLead,
  employees,
  isManager,
  currentEmployeeId,
}: {
  lead: FullLead;
  employees: Employee[];
  isManager: boolean;
  currentEmployeeId?: number;
}) {
  const router = useRouter();
  const [lead, setLead]     = useState(initialLead);
  const [tab,  setTab]      = useState<"overview" | "tasks" | "meetings" | "notes" | "activity">("overview");
  const [loading, setLoading] = useState(false);

  // Modals
  const [showEdit, setShowEdit] = useState(false);
  const [showMeeting, setShowMeeting] = useState<{ title?: string; presales?: boolean } | null>(null);
  const [showPoc, setShowPoc] = useState(false);

  const canEdit = isManager || lead.assignedTo.id === currentEmployeeId;

  // ── Stage updater ──────────────────────────────────────────────────────────
  async function changeStage(stage: string) {
    if (stage === lead.stage) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pipeline/leads/${lead.id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLead((p) => ({ ...p, stage: updated.stage, opportunity: updated.opportunity }));
        // PROPOSAL_SENT → opportunity auto-created: navigate directly to it
        if (stage === "PROPOSAL_SENT" && updated.opportunity?.id) {
          router.push(`/pipeline/opportunities/${updated.opportunity.id}`);
          return;
        }
        router.refresh();
        // Entering POC/Demo → prompt to assign presales
        if (stage === "POC_DEMO") setShowPoc(true);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Add note ───────────────────────────────────────────────────────────────
  const [noteText, setNoteText] = useState("");
  async function addNote() {
    if (!noteText.trim()) return;
    const res = await fetch("/api/pipeline/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteText, leadId: lead.id }),
    });
    if (res.ok) {
      const note = await res.json();
      setLead((p) => ({ ...p, notes: [note, ...p.notes] }));
      setNoteText("");
      router.refresh();
    }
  }

  // ── Add task (with assignee) ────────────────────────────────────────────────
  const [taskForm, setTaskForm] = useState({ title: "", dueDate: "", priority: "medium", assignedToId: currentEmployeeId ?? 0 });
  const [showTaskForm, setShowTaskForm] = useState(false);
  async function addTask() {
    if (!taskForm.title || !taskForm.dueDate) return;
    const res = await fetch("/api/pipeline/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...taskForm, leadId: lead.id }),
    });
    if (res.ok) {
      const task = await res.json();
      setLead((p) => ({ ...p, tasks: [...p.tasks, task] }));
      setShowTaskForm(false);
      setTaskForm({ title: "", dueDate: "", priority: "medium", assignedToId: currentEmployeeId ?? 0 });
      router.refresh();
    }
  }

  async function completeTask(taskId: number) {
    const res = await fetch(`/api/pipeline/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    if (res.ok) {
      setLead((p) => ({ ...p, tasks: p.tasks.map((t) => t.id === taskId ? { ...t, status: "completed" } : t) }));
      router.refresh();
    }
  }

  // ── Reassign lead owner (manager only) ──────────────────────────────────────
  async function reassign(assignedToId: number) {
    const res = await fetch(`/api/pipeline/leads/${lead.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId }),
    });
    if (res.ok) { const updated = await res.json(); setLead((p) => ({ ...p, assignedTo: updated.assignedTo })); }
  }

  const overdueTasks = lead.tasks.filter((t) => t.status !== "completed" && new Date(t.dueDate) < new Date());
  const openTasks    = lead.tasks.filter((t) => t.status !== "completed");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── Left: main info ─────────────────────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-4">
        {/* Header card */}
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{lead.companyName}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{lead.title}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <LeadStageBadge stage={lead.stage} />
                {lead.opportunity && (
                  <Link href={`/pipeline/opportunities/${lead.opportunity.id}`}
                    className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold hover:bg-amber-200">
                    Opportunity →
                  </Link>
                )}
              </div>
            </div>
            <div className="text-right">
              {lead.expectedValue > 0 && (
                <p className="text-2xl font-bold text-[#CC2229]">₹{lead.expectedValue.toFixed(1)}L</p>
              )}
              <p className="text-xs text-gray-400">{lead.source}</p>
              {canEdit && (
                <button onClick={() => setShowEdit(true)}
                  className="mt-2 text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700">
                  ✎ Edit Lead
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stage pipeline bar */}
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Move Stage</p>
          <div className="flex gap-1 flex-wrap">
            {LEAD_STAGES.map((s) => (
              <button key={s} onClick={() => canEdit && changeStage(s)} disabled={loading || !canEdit}
                className={`px-2 py-1 text-xs rounded-lg font-medium transition ${
                  lead.stage === s
                    ? "bg-[#CC2229] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                } ${!canEdit ? "opacity-60 cursor-not-allowed" : ""}`}>
                {LEAD_STAGE_LABELS[s]}
              </button>
            ))}
          </div>
          {lead.stage === "POC_DEMO" && (
            <button onClick={() => setShowPoc(true)} disabled={!canEdit}
              className="mt-3 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              Assign POC/Demo to Presales →
            </button>
          )}
          {lead.stage === "PROPOSAL_SENT" && lead.opportunity && (
            <p className="text-xs text-green-700 mt-2 font-medium">
              ✓ Opportunity created — deal is now in the sales funnel
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="flex gap-1 p-2 border-b overflow-x-auto">
            {(["overview", "tasks", "meetings", "notes", "activity"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition ${
                  tab === t ? "bg-[#CC2229] text-white" : "text-gray-600 hover:bg-gray-100"
                }`}>
                {t}
                {t === "tasks"    && openTasks.length    > 0 && <span className={`ml-1 ${overdueTasks.length > 0 ? "text-red-300" : "text-white/70"}`}>({openTasks.length})</span>}
                {t === "meetings" && lead.meetings.length > 0 && <span className="ml-1 text-white/70">({lead.meetings.length})</span>}
                {t === "notes"    && lead.notes.length    > 0 && <span className="ml-1 text-white/70">({lead.notes.length})</span>}
                {t === "activity" && lead.activities.length > 0 && <span className="ml-1 text-white/70">({lead.activities.length})</span>}
              </button>
            ))}
          </div>

          <div className="p-4">
            {/* Overview */}
            {tab === "overview" && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ["Contact",  lead.contactPerson],
                  ["Email",    lead.email   || "—"],
                  ["Phone",    lead.phone   || "—"],
                  ["OEM",      lead.oemName  || "—"],
                  ["Category", lead.categoryName || "—"],
                  ["Product",  lead.productName  || "—"],
                  ["Customer", lead.customerName || "—"],
                  ["Created",  lead.createdAt.slice(0, 10)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-gray-500">{k}</p>
                    <p className="font-medium text-gray-800">{v}</p>
                  </div>
                ))}
                {lead.remarks && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Remarks</p>
                    <p className="text-gray-800">{lead.remarks}</p>
                  </div>
                )}
              </div>
            )}

            {/* Tasks */}
            {tab === "tasks" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-gray-700">
                    {openTasks.length} open · {overdueTasks.length > 0 && <span className="text-red-600">{overdueTasks.length} overdue</span>}
                  </p>
                  {canEdit && (
                    <button onClick={() => setShowTaskForm(true)}
                      className="text-xs bg-[#CC2229] text-white px-3 py-1 rounded-lg hover:bg-[#A81B21]">
                      + Add Task
                    </button>
                  )}
                </div>

                {showTaskForm && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2 border">
                    <input placeholder="Task title" value={taskForm.title}
                      onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
                      className="w-full border rounded px-3 py-1.5 text-sm" />
                    <div className="flex gap-2 flex-wrap">
                      <input type="datetime-local" value={taskForm.dueDate}
                        onChange={(e) => setTaskForm((p) => ({ ...p, dueDate: e.target.value }))}
                        className="flex-1 border rounded px-3 py-1.5 text-sm min-w-[160px]" />
                      <select value={taskForm.priority} onChange={(e) => setTaskForm((p) => ({ ...p, priority: e.target.value }))}
                        className="border rounded px-3 py-1.5 text-sm">
                        <option>low</option><option>medium</option><option>high</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Assign to</label>
                      <select value={taskForm.assignedToId} onChange={(e) => setTaskForm((p) => ({ ...p, assignedToId: Number(e.target.value) }))}
                        className="w-full border rounded px-3 py-1.5 text-sm">
                        {currentEmployeeId && <option value={currentEmployeeId}>Myself</option>}
                        {employees.filter((e) => e.id !== currentEmployeeId).map((e) => (
                          <option key={e.id} value={e.id}>{e.name}{isPresales(e) ? " · Presales" : ""}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={addTask} className="text-xs bg-[#CC2229] text-white px-3 py-1 rounded-lg">Save</button>
                      <button onClick={() => setShowTaskForm(false)} className="text-xs border px-3 py-1 rounded-lg">Cancel</button>
                    </div>
                  </div>
                )}

                {lead.tasks.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No tasks yet.</p>}
                {lead.tasks.map((t) => {
                  const overdue = t.status !== "completed" && new Date(t.dueDate) < new Date();
                  return (
                    <div key={t.id} className={`flex items-start gap-3 p-3 rounded-lg border ${overdue ? "bg-red-50 border-red-200" : "bg-white"}`}>
                      <input type="checkbox" checked={t.status === "completed"} onChange={() => t.status !== "completed" && completeTask(t.id)}
                        className="mt-0.5 accent-[#CC2229]" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${t.status === "completed" ? "line-through text-gray-400" : "text-gray-800"}`}>{t.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <PriorityBadge priority={t.priority} />
                          <span className={`text-xs ${overdue ? "text-red-600 font-semibold" : "text-gray-400"}`}>
                            Due {new Date(t.dueDate).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="text-xs text-gray-400">· {t.assignedTo.name}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Meetings */}
            {tab === "meetings" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-gray-700">{lead.meetings.length} meeting{lead.meetings.length !== 1 ? "s" : ""}</p>
                  {canEdit && (
                    <button onClick={() => setShowMeeting({})}
                      className="text-xs bg-[#CC2229] text-white px-3 py-1 rounded-lg hover:bg-[#A81B21]">
                      + Schedule Meeting
                    </button>
                  )}
                </div>
                {lead.meetings.length === 0
                  ? <p className="text-sm text-gray-400 py-4 text-center">No meetings yet.</p>
                  : lead.meetings.map((m) => (
                    <div key={m.id} className="border rounded-lg p-3">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium text-gray-800">{m.title}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(m.meetingDate).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">👤 {m.employee.name}{m.location ? ` · 📍 ${m.location}` : ""}</p>
                      {m.notes && <p className="text-xs text-gray-600 mt-1">{m.notes}</p>}
                    </div>
                  ))
                }
              </div>
            )}

            {/* Notes */}
            {tab === "notes" && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={2}
                    placeholder="Add a note…"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
                  <button onClick={addNote} disabled={!noteText.trim()}
                    className="self-end text-xs bg-[#CC2229] text-white px-3 py-2 rounded-lg hover:bg-[#A81B21] disabled:opacity-50">
                    Add
                  </button>
                </div>
                {lead.notes.map((n) => (
                  <div key={n.id} className="bg-gray-50 rounded-lg p-3 border">
                    <p className="text-sm text-gray-800">{n.content}</p>
                    <p className="text-xs text-gray-400 mt-1">{n.author.name} · {n.createdAt.slice(0, 10)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Activity */}
            {tab === "activity" && <ActivityFeed activities={lead.activities} />}
          </div>
        </div>
      </div>

      {/* ── Right sidebar ────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Owner */}
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Ownership</p>
          <p className="text-sm text-gray-700"><span className="font-medium">Assigned:</span> {lead.assignedTo.name}</p>
          <p className="text-sm text-gray-500 mt-1">Created by: {lead.createdBy.name}</p>
          {isManager && (
            <div className="mt-3">
              <label className="block text-xs text-gray-500 mb-1">Reassign owner to</label>
              <select onChange={(e) => reassign(Number(e.target.value))} defaultValue=""
                className="w-full border rounded-lg px-2 py-1.5 text-sm">
                <option value="" disabled>Select employee…</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Quick Stats</p>
          {[
            ["Tasks", lead.tasks.length, overdueTasks.length > 0 ? "text-red-600" : ""],
            ["Meetings", lead.meetings.length, ""],
            ["Notes", lead.notes.length, ""],
          ].map(([k, v, cls]) => (
            <div key={k as string} className="flex justify-between items-center py-1 border-b last:border-0">
              <span className="text-sm text-gray-600">{k}</span>
              <span className={`text-sm font-semibold ${cls ?? ""}`}>{String(v)}</span>
            </div>
          ))}
        </div>

        {/* Opportunity link */}
        {lead.opportunity && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <p className="text-xs font-semibold text-amber-800 uppercase mb-2">Linked Opportunity</p>
            <p className="text-sm font-medium text-amber-900">₹{lead.opportunity.value.toFixed(1)}L</p>
            <p className="text-xs text-amber-700">{lead.opportunity.stage} · {lead.opportunity.probability}%</p>
            <Link href={`/pipeline/opportunities/${lead.opportunity.id}`}
              className="block text-xs text-amber-800 hover:underline mt-2 font-medium">
              View opportunity →
            </Link>
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showEdit && (
        <EditLeadModal
          lead={lead}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => { setLead(updated); router.refresh(); }}
        />
      )}
      {showMeeting && (
        <ScheduleMeetingModal
          leadId={lead.id}
          employees={employees}
          currentEmployeeId={currentEmployeeId}
          defaultTitle={showMeeting.title}
          defaultPresales={showMeeting.presales}
          onClose={() => setShowMeeting(null)}
          onSaved={(m) => { setLead((p) => ({ ...p, meetings: [m, ...p.meetings] })); router.refresh(); }}
        />
      )}
      {showPoc && (
        <PocDemoPrompt
          leadId={lead.id}
          employees={employees}
          currentEmployeeId={currentEmployeeId}
          onClose={() => setShowPoc(false)}
          onDone={(meeting, task) => {
            setLead((p) => ({
              ...p,
              meetings: meeting ? [meeting, ...p.meetings] : p.meetings,
              tasks: task ? [...p.tasks, task] : p.tasks,
            }));
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
