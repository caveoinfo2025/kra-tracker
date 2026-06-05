"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import { OpportunitySerialized, OPP_STAGES, OPP_STAGE_LABELS, TaskSerialized, ActivitySerialized } from "@/types/pipeline";
import { OppStageBadge, PriorityBadge } from "@/components/pipeline/StageBadge";
import { ActivityFeed } from "@/components/pipeline/ActivityFeed";

type FullOpp = OpportunitySerialized & {
  lead: {
    id: number; title: string; companyName: string; contactPerson: string;
    assignedTo: { id: number; name: string }; oemName: string; categoryName: string;
  };
  tasks: (TaskSerialized & { assignedTo: { id: number; name: string } })[];
  meetings: { id: number; title: string; meetingDate: string; notes: string; employee: { name: string } }[];
  activities: ActivitySerialized[];
};

const TERMINAL = ["WON", "LOST"] as const;
const isTerminalStage = (s: string) => TERMINAL.includes(s as typeof TERMINAL[number]);

// ── Closing modal for WON / LOST ─────────────────────────────────────────────

function CloseModal({
  targetStage,
  currentValue,
  onConfirm,
  onCancel,
}: {
  targetStage: "WON" | "LOST";
  currentValue: number;
  onConfirm: (data: Record<string, string | number>) => Promise<void>;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    dealValueExTax: String(currentValue),
    netProfitLakhs: "",
    poNumber: "",
    poDate: "",
    lostReason: "",
  });

  function f(k: keyof typeof form, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (targetStage === "WON") {
      if (!form.poNumber.trim()) { setError("PO Number is required."); return; }
      if (!form.dealValueExTax || Number(form.dealValueExTax) <= 0) { setError("Deal Value (ex-tax) must be > 0."); return; }
    }
    if (targetStage === "LOST" && !form.lostReason.trim()) {
      setError("Please provide the reason for losing this deal.");
      return;
    }

    setSaving(true);
    try {
      await onConfirm({
        stage:          targetStage,
        dealValueExTax: Number(form.dealValueExTax),
        netProfitLakhs: Number(form.netProfitLakhs),
        poNumber:       form.poNumber,
        poDate:         form.poDate || "",
        lostReason:     form.lostReason,
      });
    } catch {
      setError("Failed to save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className={`text-lg font-bold mb-1 ${targetStage === "WON" ? "text-green-700" : "text-red-700"}`}>
          {targetStage === "WON" ? "🎉 Mark as Closed Won" : "😔 Mark as Closed Lost"}
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          {targetStage === "WON"
            ? "Fill in the final deal details. This cannot be undone."
            : "Record the reason. This cannot be undone."}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-3">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          {targetStage === "WON" && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Deal Value (ex-tax) ₹L *
                </label>
                <input
                  type="number" step="0.01" required min={0.01}
                  value={form.dealValueExTax}
                  onChange={(e) => f("dealValueExTax", e.target.value)}
                  placeholder="e.g. 12.5"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Net Profit (₹L)
                </label>
                <input
                  type="number" step="0.01" min={0}
                  value={form.netProfitLakhs}
                  onChange={(e) => f("netProfitLakhs", e.target.value)}
                  placeholder="e.g. 2.5"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  PO Number *
                </label>
                <input
                  type="text" required
                  value={form.poNumber}
                  onChange={(e) => f("poNumber", e.target.value)}
                  placeholder="e.g. PO-2026-00123"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  PO Date
                </label>
                <input
                  type="date"
                  value={form.poDate}
                  onChange={(e) => f("poDate", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </>
          )}

          {targetStage === "LOST" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Reason for Loss *
              </label>
              <textarea
                required rows={3}
                value={form.lostReason}
                onChange={(e) => f("lostReason", e.target.value)}
                placeholder="e.g. Budget constraints, competitor pricing…"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit" disabled={saving}
              className={`flex-1 text-white text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-50 ${
                targetStage === "WON" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {saving ? "Saving…" : targetStage === "WON" ? "Confirm Won" : "Confirm Lost"}
            </button>
            <button
              type="button" onClick={onCancel} disabled={saving}
              className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

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
  const [opp, setOpp] = useState(initialOpp);
  const [tab, setTab] = useState<"overview" | "tasks" | "activity">("overview");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [closeTarget, setCloseTarget] = useState<"WON" | "LOST" | null>(null);

  const isClosed = isTerminalStage(opp.stage);
  const canEdit  = !isClosed || isManager;

  // Editable form state (only used when open)
  const [form, setForm] = useState({
    stage:               opp.stage,
    value:               String(opp.value),
    probability:         String(opp.probability),
    expectedClosureDate: opp.expectedClosureDate?.slice(0, 10) ?? "",
    discountPct:         String(opp.discountPct ?? 0),
  });

  function f<K extends keyof typeof form>(k: K, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  // When stage selector changes to WON/LOST, open the closing modal instead
  function handleStageChange(newStage: string) {
    if (newStage === "WON" || newStage === "LOST") {
      setCloseTarget(newStage);
      return;
    }
    f("stage", newStage);
  }

  async function saveForm() {
    setError(""); setSaving(true);
    const res = await fetch(`/api/pipeline/opportunities/${opp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage:               form.stage,
        value:               Number(form.value),
        probability:         Number(form.probability),
        expectedClosureDate: form.expectedClosureDate || null,
        discountPct:         Number(form.discountPct),
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setOpp((p) => ({ ...p, ...updated }));
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({})) as { error?: string };
      setError(d.error ?? "Save failed");
    }
    setSaving(false);
  }

  async function handleClose(data: Record<string, string | number>) {
    const res = await fetch(`/api/pipeline/opportunities/${opp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(d.error ?? "Save failed");
    }
    const updated = await res.json();
    setOpp((p) => ({ ...p, ...updated }));
    setCloseTarget(null);
    router.refresh();
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
    <>
      {/* Closing modal */}
      {closeTarget && (
        <CloseModal
          targetStage={closeTarget}
          currentValue={opp.value}
          onConfirm={handleClose}
          onCancel={() => setCloseTarget(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Header card */}
          <div className={`bg-white rounded-xl border p-6 shadow-sm ${
            opp.stage === "WON" ? "border-green-200 bg-green-50/30" :
            opp.stage === "LOST" ? "border-red-200 bg-red-50/20" : ""
          }`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{opp.lead.companyName}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{opp.lead.title}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <OppStageBadge stage={opp.stage} />
                  {isClosed && (
                    <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                      <Lock size={11} /> Closed
                    </span>
                  )}
                  <Link href={`/pipeline/leads/${opp.leadId}`}
                    className="text-xs text-blue-600 hover:underline">← Lead</Link>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-[#CC2229]">₹{opp.value.toFixed(1)}L</p>
                {opp.stage === "WON" && opp.dealValueExTax > 0 && (
                  <p className="text-xs text-green-700 font-medium mt-0.5">
                    ₹{opp.dealValueExTax.toFixed(2)}L ex-tax · ₹{opp.netProfitLakhs.toFixed(2)}L profit
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Edit / Closed panel */}
          {isClosed ? (
            /* ── Read-only closed summary ── */
            <div className={`rounded-xl border p-5 shadow-sm ${
              opp.stage === "WON" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <Lock size={14} className={opp.stage === "WON" ? "text-green-700" : "text-red-700"} />
                <p className={`text-sm font-semibold ${opp.stage === "WON" ? "text-green-800" : "text-red-800"}`}>
                  {opp.stage === "WON" ? "Deal Closed Won — locked" : "Deal Closed Lost — locked"}
                </p>
              </div>

              {opp.stage === "WON" ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    ["Deal Value (ex-tax)", opp.dealValueExTax > 0 ? `₹${opp.dealValueExTax.toFixed(2)}L` : "—"],
                    ["Net Profit",          opp.netProfitLakhs > 0 ? `₹${opp.netProfitLakhs.toFixed(2)}L` : "—"],
                    ["PO Number",           opp.poNumber || "—"],
                    ["PO Date",             opp.poDate?.slice(0, 10) ?? "—"],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="text-xs text-green-700">{k}</p>
                      <p className="font-semibold text-green-900">{v}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <p className="text-xs text-red-700 mb-1">Reason</p>
                  <p className="text-sm font-medium text-red-900">{opp.lostReason || "—"}</p>
                </div>
              )}

              {isManager && (
                <p className="text-xs text-gray-400 mt-4">
                  As a manager you can still update via the API, but the UI is locked for data integrity.
                </p>
              )}
            </div>
          ) : (
            /* ── Editable form (open deals) ── */
            <div className="bg-white rounded-xl border p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-4">Update Opportunity</p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-3">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Stage — WON/LOST open the close modal */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Stage</label>
                  <select
                    value={form.stage}
                    onChange={(e) => handleStageChange(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
                  >
                    {OPP_STAGES.map((s) => (
                      <option key={s} value={s}>{OPP_STAGE_LABELS[s]}</option>
                    ))}
                  </select>
                  {(form.stage === "WON" || form.stage === "LOST") && (
                    <p className="text-xs text-amber-600 mt-0.5">
                      Selecting {form.stage === "WON" ? "Won" : "Lost"} will open a closing form.
                    </p>
                  )}
                </div>

                {/* Deal Value */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Deal Value (₹L)</label>
                  <input
                    type="number" step="0.1" min={0}
                    value={form.value}
                    onChange={(e) => f("value", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
                  />
                </div>

                {/* Probability */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Probability (%)</label>
                  <input
                    type="number" min={0} max={100}
                    value={form.probability}
                    onChange={(e) => f("probability", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
                  />
                </div>

                {/* Expected close date */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Expected Close Date</label>
                  <input
                    type="date"
                    value={form.expectedClosureDate}
                    onChange={(e) => f("expectedClosureDate", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
                  />
                </div>

                {/* Discount */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Discount (%)</label>
                  <input
                    type="number" min={0} max={100} step="0.1"
                    value={form.discountPct}
                    onChange={(e) => f("discountPct", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
                  />
                </div>
              </div>

              {/* Close buttons */}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <button
                  onClick={saveForm} disabled={saving}
                  className="bg-[#CC2229] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#A81B21] disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>

                <div className="flex-1" />

                <button
                  onClick={() => setCloseTarget("WON")}
                  className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  ✓ Close Won
                </button>
                <button
                  onClick={() => setCloseTarget("LOST")}
                  className="bg-gray-100 text-red-700 border border-red-200 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-50 transition"
                >
                  ✗ Close Lost
                </button>
              </div>
            </div>
          )}

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

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Deal Summary</p>
            {([
              ["Stage",       <OppStageBadge key="s" stage={opp.stage} />],
              ["Value",       `₹${opp.value.toFixed(1)}L`],
              ["Probability", `${opp.probability}%`],
              ["Close Date",  opp.expectedClosureDate?.slice(0, 10) ?? "—"],
              ...(opp.discountPct > 0 ? [["Discount", `${opp.discountPct}%`]] : []),
            ] as [string, React.ReactNode][]).map(([k, v]) => (
              <div key={k} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="text-sm text-gray-500">{k}</span>
                <span className="text-sm font-medium text-gray-800">{v}</span>
              </div>
            ))}
          </div>

          {/* Won details card */}
          {opp.stage === "WON" && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-green-700 uppercase mb-3">Closed Won Details</p>
              {[
                ["Deal Value (ex-tax)", opp.dealValueExTax > 0 ? `₹${opp.dealValueExTax.toFixed(2)}L` : "—"],
                ["Net Profit",          opp.netProfitLakhs > 0 ? `₹${opp.netProfitLakhs.toFixed(2)}L` : "—"],
                ["PO Number",           opp.poNumber || "—"],
                ["PO Date",             opp.poDate?.slice(0, 10) ?? "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center py-1.5 border-b border-green-100 last:border-0">
                  <span className="text-xs text-green-700">{k}</span>
                  <span className="text-sm font-semibold text-green-900">{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Lost details card */}
          {opp.stage === "LOST" && opp.lostReason && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-red-700 uppercase mb-2">Lost Reason</p>
              <p className="text-sm text-red-800">{opp.lostReason}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
