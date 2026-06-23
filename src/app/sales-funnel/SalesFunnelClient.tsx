"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/Badge";
import CustomerNameCombobox from "@/components/CustomerNameCombobox";

type Row = {
  id: number; opportunityId: string; employeeId: number; employee: { name: string };
  customerName: string; solutionCategory: string; opportunityName: string;
  stage: string; dealValueLakhs: number; billingValueLakhs: number;
  grossProfitPct: number; expectedCloseDate: string | null; poDate: string | null; closedDate: string | null;
  probabilityPct: number; status: string; newCustomerFlag: boolean; pocFlag: boolean; remarks: string;
};
type Employee = { id: number; name: string };

const STAGES = ["Lead", "Qualified", "Solutioning", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"];
const SOLUTIONS = ["Network & Security", "Server & Storage", "MSSP services", "Cloud Security & Services", "Other"];
const STATUSES = ["Active", "On Hold", "Lost"];

const stageVariant = (s: string) =>
  s === "Closed Won" ? "success" : s === "Closed Lost" ? "danger" : s === "Proposal Sent" || s === "Negotiation" ? "warning" : "neutral";

const empty = {
  employeeId: "", customerName: "", customerId: null as number | null,
  solutionCategory: "", opportunityName: "",
  stage: "Lead", dealValueLakhs: "0", billingValueLakhs: "0", grossProfitPct: "0",
  expectedCloseDate: "", poDate: "", closedDate: "", probabilityPct: "50", status: "Active",
  newCustomerFlag: false, pocFlag: false, remarks: "",
};

export default function SalesFunnelClient({ initialRows, employees, isManager, currentEmployeeId }: {
  initialRows: Row[]; employees: Employee[]; isManager: boolean; currentEmployeeId?: number;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...empty, employeeId: String(currentEmployeeId ?? "") });
  const [linkedCustomerId, setLinkedCustomerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Filter state ────────────────────────────────────────────────────────────
  const [search, setSearch]             = useState("");
  const [empFilter, setEmpFilter]       = useState("");
  const [stageFilter, setStageFilter]   = useState("");
  const [solutionFilter, setSolutionFilter] = useState("");

  function f(k: string, v: string | boolean) { setForm((p) => ({ ...p, [k]: v })); }

  function openEdit(r: Row) {
    setEditId(r.id);
    const rid = (r as Row & { customerId?: number | null }).customerId ?? null;
    setLinkedCustomerId(rid);
    setForm({
      employeeId: String(r.employeeId), customerName: r.customerName, customerId: rid,
      solutionCategory: r.solutionCategory, opportunityName: r.opportunityName,
      stage: r.stage, dealValueLakhs: String(r.dealValueLakhs),
      billingValueLakhs: String(r.billingValueLakhs), grossProfitPct: String(r.grossProfitPct),
      expectedCloseDate: r.expectedCloseDate?.slice(0, 10) ?? "",
      poDate: r.poDate?.slice(0, 10) ?? "",
      closedDate: r.closedDate?.slice(0, 10) ?? "",
      probabilityPct: String(r.probabilityPct), status: r.status,
      newCustomerFlag: r.newCustomerFlag, pocFlag: r.pocFlag, remarks: r.remarks,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError("");

    // PO Date is mandatory for Closed Won orders
    if (form.stage === "Closed Won" && !form.poDate) {
      setError("PO Date is required for Closed Won orders.");
      return;
    }

    setLoading(true);
    try {
      const method = editId ? "PUT" : "POST";
      const url = editId ? `/api/sales-funnel/${editId}` : "/api/sales-funnel";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dealValueLakhs: Number(form.dealValueLakhs),
          billingValueLakhs: Number(form.billingValueLakhs),
          grossProfitPct: Number(form.grossProfitPct),
          probabilityPct: Number(form.probabilityPct),
          poDate: form.poDate || null,
          closedDate: form.closedDate || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to save.");
        return;
      }
      setShowForm(false); setEditId(null);
      const saved = await res.json();
      setRows((prev) => editId ? prev.map((r) => r.id === editId ? saved : r) : [saved, ...prev]);
      router.refresh();
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this opportunity?")) return;
    await fetch(`/api/sales-funnel/${id}`, { method: "DELETE" });
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  // ── Filtered rows ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (empFilter && String(r.employeeId) !== empFilter) return false;
      if (stageFilter && r.stage !== stageFilter) return false;
      if (solutionFilter && r.solutionCategory !== solutionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.customerName.toLowerCase().includes(q) &&
          !r.opportunityName.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [rows, empFilter, stageFilter, solutionFilter, search]);

  const hasFilter = !!(search || empFilter || stageFilter || solutionFilter);

  // Stats always over all rows
  const totalPipeline = rows
    .filter((r) => r.status === "Active" && r.stage !== "Closed Won" && r.stage !== "Closed Lost")
    .reduce((s, r) => s + r.dealValueLakhs, 0);
  const closedWon = rows.filter((r) => r.stage === "Closed Won").reduce((s, r) => s + r.dealValueLakhs, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Pipeline",   value: `₹${totalPipeline.toFixed(2)}` },
          { label: "Closed Won",        value: `₹${closedWon.toFixed(2)}` },
          { label: "Total Opportunities", value: rows.length },
          { label: "New Customers",     value: rows.filter((r) => r.newCustomerFlag && r.stage === "Closed Won").length },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-[#CC2229]">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search customer / opportunity…"
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
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
        >
          <option value="">All Stages</option>
          {STAGES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select
          value={solutionFilter}
          onChange={(e) => setSolutionFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
        >
          <option value="">All Solutions</option>
          {SOLUTIONS.map((s) => <option key={s}>{s}</option>)}
        </select>
        {hasFilter && (
          <button
            onClick={() => { setSearch(""); setEmpFilter(""); setStageFilter(""); setSolutionFilter(""); }}
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
            + Add Opportunity
          </button>
        </div>
      </div>

      {hasFilter && (
        <p className="text-xs text-gray-500">
          Showing <strong>{filtered.length}</strong> of {rows.length} records
        </p>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">{editId ? "Edit" : "Add"} Opportunity</h3>
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
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name *</label>
                <CustomerNameCombobox
                  value={form.customerName}
                  onChange={(v) => f("customerName", v)}
                  onSelect={(name, cid) => { f("customerName", name); setLinkedCustomerId(cid); setForm(p => ({ ...p, customerId: cid })); }}
                  linkedId={linkedCustomerId}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Opportunity Name *</label>
                <input required type="text" value={form.opportunityName} onChange={(e) => f("opportunityName", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Solution Category</label>
                  <select value={form.solutionCategory} onChange={(e) => f("solutionCategory", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Select</option>
                    {SOLUTIONS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Stage</label>
                  <select value={form.stage} onChange={(e) => f("stage", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    {STAGES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Deal Value (₹)</label>
                  <input type="number" step="0.01" value={form.dealValueLakhs} onChange={(e) => f("dealValueLakhs", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Billing Value (₹)</label>
                  <input type="number" step="0.01" value={form.billingValueLakhs} onChange={(e) => f("billingValueLakhs", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">GP %</label>
                  <input type="number" step="0.1" value={form.grossProfitPct} onChange={(e) => f("grossProfitPct", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Expected Close</label>
                  <input type="date" value={form.expectedCloseDate} onChange={(e) => f("expectedCloseDate", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Probability %</label>
                  <input type="number" min={0} max={100} value={form.probabilityPct} onChange={(e) => f("probabilityPct", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              {form.stage === "Closed Won" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    PO Date <span className="text-red-500">*</span>
                    <span className="text-gray-400 ml-1">(Purchase Order date — used as the close date)</span>
                  </label>
                  <input type="date" required value={form.poDate}
                    onChange={(e) => f("poDate", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
                </div>
              )}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.newCustomerFlag as boolean} onChange={(e) => f("newCustomerFlag", e.target.checked)} className="accent-[#CC2229]" />
                  New Customer
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.pocFlag as boolean} onChange={(e) => f("pocFlag", e.target.checked)} className="accent-[#CC2229]" />
                  PoC
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
                <textarea rows={2} value={form.remarks} onChange={(e) => f("remarks", e.target.value)}
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

      <div className="bg-white rounded-xl border shadow-sm overflow-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium">{hasFilter ? "No records match the current filter." : "No opportunities yet."}</p>
            {hasFilter && (
              <button onClick={() => { setSearch(""); setEmpFilter(""); setStageFilter(""); setSolutionFilter(""); }}
                className="mt-2 text-sm text-[#CC2229] hover:underline">Clear filters</button>
            )}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["ID", isManager ? "Employee" : null, "Customer", "Opportunity", "Solution", "Stage", "Deal (₹)", "Gross Profit (₹)", "Exp. Close", "Closed On", "Flags", ""].filter(Boolean).map((h) => (
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
                  <td className="px-4 py-3"><Badge label={r.stage} variant={stageVariant(r.stage)} /></td>
                  <td className="px-4 py-3 font-semibold text-[#CC2229]">{r.dealValueLakhs.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-600">{(r.dealValueLakhs * r.grossProfitPct / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.expectedCloseDate?.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-xs font-medium text-emerald-700">{r.closedDate?.slice(0, 10) ?? "—"}</td>
                  <td className="px-4 py-3 text-center text-sm">
                    {r.newCustomerFlag && <span title="New Customer" className="mr-1">New</span>}
                    {r.pocFlag && <span title="PoC">PoC</span>}
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
