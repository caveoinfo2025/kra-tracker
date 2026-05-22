"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/Badge";

type Row = {
  id: number; invoiceDate: string; invoiceNo: string; employeeId: number;
  employee: { name: string }; customerName: string; invoiceValueLakhs: number;
  dueDate: string; amountReceivedLakhs: number; collectionStatus: string; remarks: string;
};
type Employee = { id: number; name: string };

const STATUSES = ["Pending", "Partially Received", "Fully Received", "Overdue"];
const statusVariant = (s: string) =>
  s === "Fully Received" ? "success" : s === "Overdue" ? "danger" : s === "Partially Received" ? "warning" : "neutral";

const empty = {
  employeeId: "", invoiceDate: "", invoiceNo: "", customerName: "",
  invoiceValueLakhs: "0", dueDate: "", amountReceivedLakhs: "0",
  collectionStatus: "Pending", remarks: "",
};

export default function CollectionsClient({ initialRows, employees, isManager, currentEmployeeId }: {
  initialRows: Row[]; employees: Employee[]; isManager: boolean; currentEmployeeId?: number;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...empty, employeeId: String(currentEmployeeId ?? "") });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function f(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  function openEdit(r: Row) {
    setEditId(r.id);
    setForm({
      employeeId: String(r.employeeId), invoiceDate: r.invoiceDate.slice(0, 10),
      invoiceNo: r.invoiceNo, customerName: r.customerName,
      invoiceValueLakhs: String(r.invoiceValueLakhs), dueDate: r.dueDate.slice(0, 10),
      amountReceivedLakhs: String(r.amountReceivedLakhs),
      collectionStatus: r.collectionStatus, remarks: r.remarks,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const method = editId ? "PUT" : "POST";
      const url = editId ? `/api/collections/${editId}` : "/api/collections";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          invoiceValueLakhs: Number(form.invoiceValueLakhs),
          amountReceivedLakhs: Number(form.amountReceivedLakhs),
        }),
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
    if (!confirm("Delete this collection record?")) return;
    await fetch(`/api/collections/${id}`, { method: "DELETE" });
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  const totalInvoiced = rows.reduce((s, r) => s + r.invoiceValueLakhs, 0);
  const totalReceived = rows.reduce((s, r) => s + r.amountReceivedLakhs, 0);
  const collRate = totalInvoiced > 0 ? ((totalReceived / totalInvoiced) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Invoiced", value: `₹${totalInvoiced.toFixed(1)}L` },
          { label: "Total Received", value: `₹${totalReceived.toFixed(1)}L` },
          { label: "Collection Rate", value: `${collRate}%` },
          { label: "Overdue", value: rows.filter((r) => r.collectionStatus === "Overdue").length },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-indigo-600">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={() => { setEditId(null); setForm({ ...empty, employeeId: String(currentEmployeeId ?? "") }); setShowForm(true); }}
          className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
          + Add Invoice
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">{editId ? "Edit" : "Add"} Invoice / Collection</h3>
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Date</label>
                  <input type="date" value={form.invoiceDate} onChange={(e) => f("invoiceDate", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Invoice No</label>
                  <input type="text" value={form.invoiceNo} onChange={(e) => f("invoiceNo", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name *</label>
                <input required type="text" value={form.customerName} onChange={(e) => f("customerName", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Value (₹L) *</label>
                  <input required type="number" step="0.01" value={form.invoiceValueLakhs} onChange={(e) => f("invoiceValueLakhs", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Due Date *</label>
                  <input required type="date" value={form.dueDate} onChange={(e) => f("dueDate", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Amount Received (₹L)</label>
                  <input type="number" step="0.01" value={form.amountReceivedLakhs} onChange={(e) => f("amountReceivedLakhs", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select value={form.collectionStatus} onChange={(e) => f("collectionStatus", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
                <textarea rows={2} value={form.remarks} onChange={(e) => f("remarks", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading}
                  className="flex-1 bg-indigo-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
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
        {rows.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><p className="text-3xl mb-2">💳</p><p className="text-sm">No collection records yet.</p></div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Invoice No", isManager ? "Employee" : null, "Customer", "Invoice Date", "Invoice (₹L)", "Received (₹L)", "Balance", "Due Date", "Status", ""].filter(Boolean).map((h) => (
                  <th key={h!} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => {
                const balance = r.invoiceValueLakhs - r.amountReceivedLakhs;
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{r.invoiceNo || "—"}</td>
                    {isManager && <td className="px-4 py-3 font-medium">{r.employee.name}</td>}
                    <td className="px-4 py-3 font-medium">{r.customerName}</td>
                    <td className="px-4 py-3 text-gray-500">{r.invoiceDate.slice(0, 10)}</td>
                    <td className="px-4 py-3 font-semibold">{r.invoiceValueLakhs.toFixed(2)}</td>
                    <td className="px-4 py-3 text-green-700">{r.amountReceivedLakhs.toFixed(2)}</td>
                    <td className={`px-4 py-3 font-semibold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>{balance.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500">{r.dueDate.slice(0, 10)}</td>
                    <td className="px-4 py-3"><Badge label={r.collectionStatus} variant={statusVariant(r.collectionStatus)} /></td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => openEdit(r)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:underline">Del</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
