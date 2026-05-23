"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/Badge";
import ProgressBar from "@/components/ProgressBar";
import type { EmployeeSerialized, KRASerialized } from "@/lib/types";

type Employee = Pick<EmployeeSerialized, "id" | "name" | "kras">;

const statusVariant = (s: string) =>
  s === "active" ? "success" : s === "completed" ? "info" : "neutral";

export default function KRASection({ employee, isManager }: { employee: Employee; isManager: boolean }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [editKRA, setEditKRA] = useState<KRASerialized | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    target: "",
    deadline: "",
    weight: "100",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function openAdd() {
    setEditKRA(null);
    setForm({ title: "", description: "", target: "", deadline: "", weight: "100" });
    setShowForm(true);
  }

  function openEdit(kra: KRASerialized) {
    setEditKRA(kra);
    setForm({
      title: kra.title,
      description: kra.description,
      target: kra.target,
      deadline: kra.deadline.slice(0, 10),
      weight: String(kra.weight),
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (editKRA) {
        await fetch(`/api/kras/${editKRA.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, weight: Number(form.weight) }),
        });
      } else {
        await fetch(`/api/employees/${employee.id}/kras`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, weight: Number(form.weight) }),
        });
      }
      setShowForm(false);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(kraId: number) {
    if (!confirm("Delete this KRA? All its reviews will also be deleted.")) return;
    await fetch(`/api/kras/${kraId}`, { method: "DELETE" });
    router.refresh();
  }

  async function toggleStatus(kra: KRASerialized) {
    const newStatus = kra.status === "active" ? "completed" : "active";
    await fetch(`/api/kras/${kra.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-gray-800">Key Result Areas (KRAs)</h2>
        <div className="flex items-center gap-2">
          {syncMsg && (
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded">
              {syncMsg}
            </span>
          )}
          {isManager && (
            <>
              <button
                onClick={async () => {
                  setSyncing(true); setSyncMsg("");
                  const res = await fetch("/api/kra-sync", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ employeeId: employee.id }),
                  });
                  const data = await res.json();
                  setSyncMsg(`✓ Synced ${data.synced} KRAs (Wk ${data.week})`);
                  setSyncing(false);
                  router.refresh();
                }}
                disabled={syncing}
                className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {syncing ? "Syncing…" : "⚡ Sync from Data"}
              </button>
              <button
                onClick={openAdd}
                className="text-sm bg-[#CC2229] text-white px-3 py-1.5 rounded-lg hover:bg-[#A81B21] transition"
              >
                + Add KRA
              </button>
            </>
          )}
        </div>
      </div>

      {/* KRA Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editKRA ? "Edit KRA" : "Add KRA"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Improve code review coverage"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Describe the KRA in detail"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target / Goal</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 80% coverage by Q3"
                  value={form.target}
                  onChange={(e) => setForm({ ...form, target: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                  <input
                    required
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (%)</label>
                  <input
                    required
                    type="number"
                    min={1}
                    max={100}
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#CC2229] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#A81B21] transition disabled:opacity-50"
                >
                  {loading ? "Saving…" : editKRA ? "Update KRA" : "Add KRA"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KRA List */}
      {employee.kras.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl border text-gray-400">
          <p className="text-3xl mb-2">🎯</p>
          <p className="text-sm">No KRAs yet. Add the first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {employee.kras.map((kra) => {
            const lastReview = kra.reviews[0];
            const prog = lastReview?.progress ?? 0;
            const daysLeft = Math.ceil(
              (new Date(kra.deadline).getTime() - Date.now()) / 86400000
            );
            const deadlineVariant =
              daysLeft < 0 ? "danger" : daysLeft < 14 ? "warning" : "neutral";

            return (
              <div key={kra.id} className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{kra.title}</h3>
                      <Badge label={kra.status} variant={statusVariant(kra.status)} />
                      <Badge
                        label={
                          daysLeft < 0
                            ? `${Math.abs(daysLeft)}d overdue`
                            : `${daysLeft}d left`
                        }
                        variant={deadlineVariant}
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{kra.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      🎯 Target: {kra.target} &nbsp;·&nbsp; Weight: {kra.weight}%
                    </p>
                  </div>
                  {isManager && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => toggleStatus(kra)}
                        className="text-xs border px-2 py-1 rounded text-gray-600 hover:bg-gray-50"
                      >
                        {kra.status === "active" ? "Mark Done" : "Reopen"}
                      </button>
                      <button
                        onClick={() => openEdit(kra)}
                        className="text-xs border px-2 py-1 rounded text-gray-600 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(kra.id)}
                        className="text-xs border px-2 py-1 rounded text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1">
                    <ProgressBar value={prog} />
                  </div>
                  <span className="text-xs text-gray-500">{prog}%</span>
                  {lastReview && (
                    <span className="text-xs text-gray-400">
                      Score: {lastReview.score}/10 (Wk {lastReview.week})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
