"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LeadSerialized, LEAD_STAGES, LEAD_STAGE_LABELS, TaskSerialized, NoteSerialized, ActivitySerialized } from "@/types/pipeline";
import { LeadStageBadge } from "@/components/pipeline/StageBadge";
import { ActivityFeed } from "@/components/pipeline/ActivityFeed";
import { PriorityBadge } from "@/components/pipeline/StageBadge";

type FullLead = LeadSerialized & {
  tasks: (TaskSerialized & { assignedTo: { id: number; name: string } })[];
  meetings: { id: number; title: string; meetingDate: string; notes: string; location: string; employee: { id: number; name: string } }[];
  activities: ActivitySerialized[];
  notes: NoteSerialized[];
};

export default function LeadDetailClient({
  lead: initialLead,
  employees,
  isManager,
  currentEmployeeId,
}: {
  lead: FullLead;
  employees: { id: number; name: string }[];
  isManager: boolean;
  currentEmployeeId?: number;
}) {
  const router = useRouter();
  const [lead, setLead]     = useState(initialLead);
  const [tab,  setTab]      = useState<"overview" | "tasks" | "meetings" | "notes" | "activity">("overview");
  const [loading, setLoading] = useState(false);

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
        router.refresh();
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

  // ── Add task ───────────────────────────────────────────────────────────────
  const [taskForm, setTaskForm] = useState({ title: "", dueDate: "", priority: "medium" });
  const [showTaskForm, setShowTaskForm] = useState(false);
  async function addTask() {
    if (!taskForm.title || !taskForm.dueDate) return;
    const res = await fetch("/api/pipeline/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...taskForm, leadId: lead.id, assignedToId: currentEmployeeId }),
    });
    if (res.ok) {
      const task = await res.json();
      setLead((p) => ({ ...p, tasks: [...p.tasks, task] }));
      setShowTaskForm(false);
      setTaskForm({ title: "", dueDate: "", priority: "medium" });
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

  // ── Reassign (manager only) ────────────────────────────────────────────────
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
            </div>
          </div>
        </div>

        {/* Stage pipeline bar */}
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Move Stage</p>
          <div className="flex gap-1 flex-wrap">
            {LEAD_STAGES.map((s) => (
              <button key={s} onClick={() => changeStage(s)} disabled={loading}
                className={`px-2 py-1 text-xs rounded-lg font-medium transition ${
                  lead.stage === s
                    ? "bg-[#CC2229] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                {LEAD_STAGE_LABELS[s]}
              </button>
            ))}
          </div>
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
                  <button onClick={() => setShowTaskForm(true)}
                    className="text-xs bg-[#CC2229] text-white px-3 py-1 rounded-lg hover:bg-[#A81B21]">
                    + Add Task
                  </button>
                </div>

                {showTaskForm && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2 border">
                    <input placeholder="Task title" value={taskForm.title}
                      onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
                      className="w-full border rounded px-3 py-1.5 text-sm" />
                    <div className="flex gap-2">
                      <input type="datetime-local" value={taskForm.dueDate}
                        onChange={(e) => setTaskForm((p) => ({ ...p, dueDate: e.target.value }))}
                        className="flex-1 border rounded px-3 py-1.5 text-sm" />
                      <select value={taskForm.priority} onChange={(e) => setTaskForm((p) => ({ ...p, priority: e.target.value }))}
                        className="border rounded px-3 py-1.5 text-sm">
                        <option>low</option><option>medium</option><option>high</option>
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
                        <div className="flex items-center gap-2 mt-1">
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
              <div>
                {lead.meetings.length === 0
                  ? <p className="text-sm text-gray-400 py-4 text-center">No meetings yet.</p>
                  : lead.meetings.map((m) => (
                    <div key={m.id} className="border-b py-3 last:border-0">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium text-gray-800">{m.title}</p>
                        <p className="text-xs text-gray-400">{m.meetingDate.slice(0, 10)}</p>
                      </div>
                      {m.location && <p className="text-xs text-gray-500 mt-0.5">📍 {m.location}</p>}
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
              <label className="block text-xs text-gray-500 mb-1">Reassign to</label>
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
    </div>
  );
}
