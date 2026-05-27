"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OpportunitySerialized, OPP_STAGES, OPP_STAGE_LABELS, TaskSerialized, ActivitySerialized } from "@/types/pipeline";
import { OppStageBadge, PriorityBadge } from "@/components/pipeline/StageBadge";
import { ActivityFeed } from "@/components/pipeline/ActivityFeed";

type FullOpp = OpportunitySerialized & {
  lead: { id: number; title: string; companyName: string; contactPerson: string; assignedTo: { id: number; name: string }; oemName: string; categoryName: string };
  tasks: (TaskSerialized & { assignedTo: { id: number; name: string } })[];
  meetings: { id: number; title: string; meetingDate: string; notes: string; employee: { name: string } }[];
  activities: ActivitySerialized[];
};

export default function OppDetailClient({
  opp: initialOpp,
  isManager,
  currentEmployeeId,
}: {
  opp: FullOpp;
  isManager: boolean;
  currentEmployeeId?: number;
}) {
  const router = useRouter();
  const [opp,  setOpp]   = useState(initialOpp);
  const [tab,  setTab]   = useState<"overview" | "tasks" | "activity">("overview");
  const [form, setForm]  = useState({
    stage:               opp.stage,
    value:               String(opp.value),
    probability:         String(opp.probability),
    expectedClosureDate: opp.expectedClosureDate?.slice(0, 10) ?? "",
    lostReason:          opp.lostReason,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/pipeline/opportunities/${opp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage:               form.stage,
        value:               Number(form.value),
        probability:         Number(form.probability),
        expectedClosureDate: form.expectedClosureDate || null,
        lostReason:          form.lostReason,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setOpp((p) => ({ ...p, stage: updated.stage, value: updated.value, probability: updated.probability, expectedClosureDate: updated.expectedClosureDate, lostReason: updated.lostReason }));
      router.refresh();
    }
    setSaving(false);
  }

  async function completeTask(taskId: number) {
    const res = await fetch(`/api/pipeline/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    if (res.ok) {
      setOpp((p) => ({ ...p, tasks: p.tasks.map((t) => t.id === taskId ? { ...t, status: "completed" } : t) }));
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{opp.lead.companyName}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{opp.lead.title}</p>
              <div className="flex items-center gap-2 mt-2">
                <OppStageBadge stage={opp.stage} />
                <Link href={`/pipeline/leads/${opp.leadId}`}
                  className="text-xs text-blue-600 hover:underline">← Lead</Link>
              </div>
            </div>
            <p className="text-2xl font-bold text-[#CC2229]">₹{opp.value.toFixed(1)}L</p>
          </div>
        </div>

        {/* Edit form */}
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-4">Update Opportunity</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Stage</label>
              <select value={form.stage} onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
                {OPP_STAGES.map((s) => <option key={s} value={s}>{OPP_STAGE_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Value (₹L)</label>
              <input type="number" step="0.1" value={form.value}
                onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Probability (%)</label>
              <input type="number" min={0} max={100} value={form.probability}
                onChange={(e) => setForm((p) => ({ ...p, probability: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Expected Close Date</label>
              <input type="date" value={form.expectedClosureDate}
                onChange={(e) => setForm((p) => ({ ...p, expectedClosureDate: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
            </div>
            {form.stage === "LOST" && (
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Lost Reason</label>
                <input value={form.lostReason} onChange={(e) => setForm((p) => ({ ...p, lostReason: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
              </div>
            )}
          </div>
          <button onClick={save} disabled={saving}
            className="mt-4 bg-[#CC2229] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#A81B21] disabled:opacity-50">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="flex gap-1 p-2 border-b">
            {(["overview", "tasks", "activity"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition ${tab === t ? "bg-[#CC2229] text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="p-4">
            {tab === "overview" && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ["Contact",  opp.lead.contactPerson],
                  ["OEM",      opp.lead.oemName || "—"],
                  ["Category", opp.lead.categoryName || "—"],
                  ["Owner",    opp.lead.assignedTo.name],
                  ["Created",  opp.createdAt.slice(0, 10)],
                  ["Updated",  opp.updatedAt.slice(0, 10)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-gray-500">{k}</p>
                    <p className="font-medium text-gray-800">{v}</p>
                  </div>
                ))}
                {opp.meetings.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 font-semibold uppercase mb-2 mt-2">Meetings</p>
                    {opp.meetings.map((m) => (
                      <div key={m.id} className="py-2 border-t text-sm">
                        <p className="font-medium">{m.title}</p>
                        <p className="text-xs text-gray-400">{m.meetingDate.slice(0, 10)} · {m.employee.name}</p>
                        {m.notes && <p className="text-xs text-gray-500 mt-1">{m.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {tab === "tasks" && (
              <div className="space-y-2">
                {opp.tasks.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No tasks.</p>}
                {opp.tasks.map((t) => {
                  const overdue = t.status !== "completed" && new Date(t.dueDate) < new Date();
                  return (
                    <div key={t.id} className={`flex items-start gap-3 p-3 rounded-lg border ${overdue ? "bg-red-50 border-red-200" : "bg-white"}`}>
                      <input type="checkbox" checked={t.status === "completed"}
                        onChange={() => t.status !== "completed" && completeTask(t.id)}
                        className="mt-0.5 accent-[#CC2229]" />
                      <div>
                        <p className={`text-sm font-medium ${t.status === "completed" ? "line-through text-gray-400" : ""}`}>{t.title}</p>
                        <div className="flex gap-2 mt-1">
                          <PriorityBadge priority={t.priority} />
                          <span className="text-xs text-gray-400">Due {t.dueDate.slice(0, 10)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {tab === "activity" && <ActivityFeed activities={opp.activities} />}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Deal Summary</p>
          {[
            ["Stage",       <OppStageBadge key="s" stage={opp.stage} />],
            ["Value",       `₹${opp.value.toFixed(1)}L`],
            ["Probability", `${opp.probability}%`],
            ["Close Date",  opp.expectedClosureDate?.slice(0, 10) ?? "—"],
          ].map(([k, v]) => (
            <div key={k as string} className="flex justify-between items-center py-2 border-b last:border-0">
              <span className="text-sm text-gray-500">{k}</span>
              <span className="text-sm font-medium text-gray-800">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
