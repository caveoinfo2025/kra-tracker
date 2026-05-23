"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/Badge";

type Row = {
  id: number; date: string; employeeId: number; employee: { name: string };
  topUpdates: string; keyMovement: string; blockers: string;
  topDealThisWeek: string; managerSupportRequired: boolean; updateStatus: string;
};
type Employee = { id: number; name: string };

const STATUSES = ["On Track", "At Risk", "Blocked", "Ahead"];
const statusVariant = (s: string) =>
  s === "On Track" || s === "Ahead" ? "success" : s === "Blocked" ? "danger" : "warning";

const empty = {
  employeeId: "", date: "", topUpdates: "", keyMovement: "",
  blockers: "", topDealThisWeek: "", managerSupportRequired: false, updateStatus: "On Track",
};

export default function DailyUpdatesClient({ initialRows, employees, isManager, currentEmployeeId }: {
  initialRows: Row[]; employees: Employee[]; isManager: boolean; currentEmployeeId?: number;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...empty, employeeId: String(currentEmployeeId ?? "") });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Filter state ────────────────────────────────────────────────────────────
  const [empFilter, setEmpFilter]       = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom]         = useState("");
  const [dateTo, setDateTo]             = useState("");

  function f(k: string, v: string | boolean) { setForm((p) => ({ ...p, [k]: v })); }

  function openEdit(r: Row) {
    setEditId(r.id);
    setForm({
      employeeId: String(r.employeeId), date: r.date.slice(0, 10),
      topUpdates: r.topUpdates, keyMovement: r.keyMovement, blockers: r.blockers,
      topDealThisWeek: r.topDealThisWeek, managerSupportRequired: r.managerSupportRequired,
      updateStatus: r.updateStatus,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const method = editId ? "PUT" : "POST";
      const url = editId ? `/api/daily-updates/${editId}` : "/api/daily-updates";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { setError("Failed to save."); return; }
      setShowForm(false); setEditId(null);
      const saved = await res.json();
      setRows((prev) => editId ? prev.map((r) => r.id === editId ? saved : r) : [saved, ...prev]);
      router.refresh();
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this update?")) return;
    await fetch(`/api/daily-updates/${id}`, { method: "DELETE" });
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  // ── Filtered rows ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (empFilter && String(r.employeeId) !== empFilter) return false;
      if (statusFilter && r.updateStatus !== statusFilter) return false;
      if (dateFrom && r.date.slice(0, 10) < dateFrom) return false;
      if (dateTo   && r.date.slice(0, 10) > dateTo)   return false;
      return true;
    });
  }, [rows, empFilter, statusFilter, dateFrom, dateTo]);

  const hasFilter = !!(empFilter || statusFilter || dateFrom || dateTo);

  return (
    <div className="space-y-4">
      {/* ── Filter bar + Add button ────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Status quick badges */}
        <div className="flex gap-3 text-xs text-gray-500">
          {["On Track", "At Risk", "Blocked"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
              className={`px-2.5 py-1 rounded-full border transition ${
                statusFilter === s
                  ? "bg-[#CC2229] text-white border-[#CC2229]"
                  : "bg-white border-gray-300 hover:border-[#CC2229] hover:text-[#CC2229]"
              }`}
            >
              {s}: <strong>{rows.filter((r) => r.updateStatus === s).length}</strong>
            </button>
          ))}
        </div>

        {isManager && (
          <select
            value={empFilter}
            onChange={(e) => setEmpFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
          >
            <option value="">All Employees</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        )}

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          title="From date"
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
        />
        <span className="text-xs text-gray-400">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          title="To date"
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
        />

        {hasFilter && (
          <button
            onClick={() => { setEmpFilter(""); setStatusFilter(""); setDateFrom(""); setDateTo(""); }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
        )}

        <div className="ml-auto">
          <button
            onClick={() => { setEditId(null); setForm({ ...empty, employeeId: String(currentEmployeeId ?? "") }); setShowForm(true); }}
            className="bg-[#CC2229] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#A81B21] transition"
          >
            + Add Update
          </button>
        </div>
      </div>

      {hasFilter && (
        <p className="text-xs text-gray-500">
          Showing <strong>{filtered.length}</strong> of {rows.length} updates
        </p>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">{editId ? "Edit" : "Add"} Daily Update</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded border border-red-200">{error}</div>}
              {isManager && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Employee</label>
                  <select required value={form.employeeId} onChange={(e) => f("employeeId", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Select employee</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                  <input type="date" value={form.date} onChange={(e) => f("date", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select value={form.updateStatus} onChange={(e) => f("updateStatus", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Top Updates *</label>
                <textarea required rows={3} placeholder="What did you accomplish today?"
                  value={form.topUpdates} onChange={(e) => f("topUpdates", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Key Movement</label>
                <input type="text" placeholder="Deal moved forward, customer call done…"
                  value={form.keyMovement} onChange={(e) => f("keyMovement", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Blockers</label>
                <input type="text" placeholder="Any blockers or risks?"
                  value={form.blockers} onChange={(e) => f("blockers", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Top Deal This Week</label>
                <input type="text" placeholder="Deal name / value"
                  value={form.topDealThisWeek} onChange={(e) => f("topDealThisWeek", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.managerSupportRequired as boolean}
                  onChange={(e) => f("managerSupportRequired", e.target.checked)} className="accent-[#CC2229]" />
                Manager Support Required
              </label>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading}
                  className="flex-1 bg-[#CC2229] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#A81B21] disabled:opacity-50">
                  {loading ? "Saving…" : editId ? "Update" : "Submit"}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border text-gray-400">
            <p className="font-medium">{hasFilter ? "No updates match the current filter." : "No updates yet."}</p>
            {hasFilter && (
              <button onClick={() => { setEmpFilter(""); setStatusFilter(""); setDateFrom(""); setDateTo(""); }}
                className="mt-2 text-sm text-[#CC2229] hover:underline">Clear filters</button>
            )}
          </div>
        ) : filtered.map((r) => (
          <div key={r.id} className="bg-white border rounded-xl p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-700">{r.date.slice(0, 10)}</span>
                {isManager && <span className="text-sm text-[#CC2229] font-medium">{r.employee.name}</span>}
                <Badge label={r.updateStatus} variant={statusVariant(r.updateStatus)} />
                {r.managerSupportRequired && <Badge label="Manager Support" variant="danger" />}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(r)} className="text-xs text-[#CC2229] hover:underline">Edit</button>
                <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:underline">Del</button>
              </div>
            </div>
            <p className="text-sm text-gray-700 mt-2">{r.topUpdates}</p>
            {r.keyMovement && <p className="text-sm text-gray-500 mt-1">Movement: {r.keyMovement}</p>}
            {r.blockers && <p className="text-sm text-yellow-700 bg-yellow-50 px-2 py-1 rounded mt-1">Blocker: {r.blockers}</p>}
            {r.topDealThisWeek && <p className="text-sm text-green-700 mt-1">Top deal: {r.topDealThisWeek}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
