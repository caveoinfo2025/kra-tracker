"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/Badge";
import CustomerNameCombobox from "@/components/CustomerNameCombobox";

type Lead = {
  id: number; date: string; employeeId: number; employee: { name: string };
  territory: string; leadSource: string; customerName: string; contactPerson: string;
  activityType: string; activityCount: number; leadStatus: string;
  qualifiedFlag: boolean; remarks: string;
};
type Employee = { id: number; name: string };

const LEAD_SOURCES = ["Outbound Calls", "Existing Customer", "Referral", "OEM Lead", "Website", "Event", "Partner"];
const ACTIVITY_TYPES = ["Call", "Connect", "Meeting", "Demo", "Follow-up", "Proposal Discussion", "Collection Follow-up"];
const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Disqualified", "Converted", "Nurture"];

const statusVariant = (s: string) =>
  s === "Qualified" || s === "Converted" ? "success" : s === "Disqualified" ? "danger" : "neutral";

const empty = {
  employeeId: "", date: "", territory: "", leadSource: "", customerName: "",
  contactPerson: "", phoneEmail: "", activityType: "", activityCount: "1",
  leadStatus: "New", qualifiedFlag: false, nextActionDate: "", remarks: "",
};

export default function LeadGenClient({
  initialLeads, employees, isManager, currentEmployeeId,
}: {
  initialLeads: Lead[]; employees: Employee[]; isManager: boolean; currentEmployeeId?: number;
}) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...empty, employeeId: String(currentEmployeeId ?? "") });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Filter state ────────────────────────────────────────────────────────────
  const [search, setSearch]           = useState("");
  const [empFilter, setEmpFilter]     = useState("");
  const [statusFilter, setStatusFilter]   = useState("");
  const [activityFilter, setActivityFilter] = useState("");

  function f(k: string, v: string | boolean) { setForm((p) => ({ ...p, [k]: v })); }

  function openEdit(l: Lead) {
    setEditId(l.id);
    setForm({
      employeeId: String(l.employeeId), date: l.date.slice(0, 10),
      territory: l.territory, leadSource: l.leadSource, customerName: l.customerName,
      contactPerson: l.contactPerson, phoneEmail: "", activityType: l.activityType,
      activityCount: String(l.activityCount), leadStatus: l.leadStatus,
      qualifiedFlag: l.qualifiedFlag, nextActionDate: "", remarks: l.remarks,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const method = editId ? "PUT" : "POST";
      const url = editId ? `/api/lead-generation/${editId}` : "/api/lead-generation";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, activityCount: Number(form.activityCount) }),
      });
      if (!res.ok) { setError("Failed to save."); return; }
      setShowForm(false); setEditId(null);
      router.refresh();
      const saved = await res.json();
      setLeads((prev) => editId
        ? prev.map((l) => l.id === editId ? saved : l)
        : [saved, ...prev]);
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this lead entry?")) return;
    await fetch(`/api/lead-generation/${id}`, { method: "DELETE" });
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }

  // ── Filtered rows ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (empFilter && String(l.employeeId) !== empFilter) return false;
      if (statusFilter && l.leadStatus !== statusFilter) return false;
      if (activityFilter && l.activityType !== activityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !l.customerName.toLowerCase().includes(q) &&
          !l.contactPerson.toLowerCase().includes(q) &&
          !(l.territory ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [leads, empFilter, statusFilter, activityFilter, search]);

  const hasFilter = !!(search || empFilter || statusFilter || activityFilter);
  const qualified = leads.filter((l) => l.qualifiedFlag).length;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Entries",   value: leads.length },
          { label: "Qualified Leads", value: qualified },
          { label: "Converted",       value: leads.filter((l) => l.leadStatus === "Converted").length },
          { label: "Calls Made",      value: leads.filter((l) => l.activityType === "Call").reduce((s, l) => s + l.activityCount, 0) },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-[#CC2229]">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search customer / contact / territory…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
        />
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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
        >
          <option value="">All Statuses</option>
          {LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select
          value={activityFilter}
          onChange={(e) => setActivityFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
        >
          <option value="">All Activities</option>
          {ACTIVITY_TYPES.map((s) => <option key={s}>{s}</option>)}
        </select>
        {hasFilter && (
          <button
            onClick={() => { setSearch(""); setEmpFilter(""); setStatusFilter(""); setActivityFilter(""); }}
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
            + Add Lead Entry
          </button>
        </div>
      </div>

      {hasFilter && (
        <p className="text-xs text-gray-500">
          Showing <strong>{filtered.length}</strong> of {leads.length} records
        </p>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">{editId ? "Edit" : "Add"} Lead Entry</h3>
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">Territory</label>
                  <input type="text" placeholder="Chennai" value={form.territory} onChange={(e) => f("territory", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name *</label>
                <CustomerNameCombobox
                  value={form.customerName}
                  onChange={(v) => f("customerName", v)}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Contact Person</label>
                  <input type="text" value={form.contactPerson} onChange={(e) => f("contactPerson", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lead Source</label>
                  <select value={form.leadSource} onChange={(e) => f("leadSource", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Select</option>
                    {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Activity Type</label>
                  <select value={form.activityType} onChange={(e) => f("activityType", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Select</option>
                    {ACTIVITY_TYPES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Activity Count</label>
                  <input type="number" min={1} value={form.activityCount} onChange={(e) => f("activityCount", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lead Status</label>
                  <select value={form.leadStatus} onChange={(e) => f("leadStatus", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    {LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id="qf" checked={form.qualifiedFlag as boolean}
                    onChange={(e) => f("qualifiedFlag", e.target.checked)}
                    className="w-4 h-4 accent-[#CC2229]" />
                  <label htmlFor="qf" className="text-sm text-gray-700 font-medium">Qualified Lead</label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
                <textarea rows={2} value={form.remarks} onChange={(e) => f("remarks", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading}
                  className="flex-1 bg-[#CC2229] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#A81B21] disabled:opacity-50">
                  {loading ? "Saving…" : editId ? "Update" : "Add Entry"}
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

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium">{hasFilter ? "No records match the current filter." : "No lead entries yet. Add your first activity."}</p>
            {hasFilter && (
              <button onClick={() => { setSearch(""); setEmpFilter(""); setStatusFilter(""); setActivityFilter(""); }}
                className="mt-2 text-sm text-[#CC2229] hover:underline">Clear filters</button>
            )}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Date", isManager ? "Employee" : null, "Customer", "Activity", "Count", "Source", "Status", "Qualified", ""].filter(Boolean).map((h) => (
                  <th key={h!} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{l.date.slice(0, 10)}</td>
                  {isManager && <td className="px-4 py-3 font-medium">{l.employee.name}</td>}
                  <td className="px-4 py-3 font-medium">{l.customerName}</td>
                  <td className="px-4 py-3">{l.activityType}</td>
                  <td className="px-4 py-3 text-center">{l.activityCount}</td>
                  <td className="px-4 py-3 text-gray-500">{l.leadSource}</td>
                  <td className="px-4 py-3"><Badge label={l.leadStatus} variant={statusVariant(l.leadStatus)} /></td>
                  <td className="px-4 py-3 text-center">{l.qualifiedFlag ? "Yes" : "—"}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => openEdit(l)} className="text-xs text-[#CC2229] hover:underline">Edit</button>
                    <button onClick={() => handleDelete(l.id)} className="text-xs text-red-500 hover:underline">Del</button>
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
