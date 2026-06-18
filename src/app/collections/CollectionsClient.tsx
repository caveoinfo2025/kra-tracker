"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/Badge";
import CustomerNameCombobox from "@/components/CustomerNameCombobox";

type Row = {
  id: number; invoiceDate: string; invoiceNo: string; employeeId: number;
  employee: { name: string }; customerName: string; invoiceValueLakhs: number;
  amountWithoutGstLakhs: number; dueDate: string; paymentReceivedDate: string | null;
  amountReceivedLakhs: number; collectionStatus: string; remarks: string;
};
type Employee = { id: number; name: string };

const STATUSES = ["Pending", "Partially Received", "Fully Received", "Overdue"];
const statusVariant = (s: string) =>
  s === "Fully Received" ? "success" : s === "Overdue" ? "danger" : s === "Partially Received" ? "warning" : "neutral";

const GST_RATE = 0.18; // 18 % — used for auto-fill helper

const empty = {
  employeeId: "", invoiceDate: "", invoiceNo: "", customerName: "", customerId: null as number | null,
  invoiceValueLakhs: "0", amountWithoutGstLakhs: "0", dueDate: "",
  paymentReceivedDate: "", amountReceivedLakhs: "0", collectionStatus: "Pending", remarks: "",
};

// ─── Filter / date helpers ─────────────────────────────────────────────────────

function isOverdue(row: Row): boolean {
  const due = new Date(row.dueDate); due.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return due < today && row.collectionStatus !== "Fully Received";
}

function isUpcoming(row: Row): boolean {
  const due = new Date(row.dueDate); due.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const in30 = new Date(today); in30.setDate(today.getDate() + 30);
  return due >= today && due <= in30 && row.collectionStatus !== "Fully Received";
}

// ─── Revenue by salesperson aggregation ────────────────────────────────────────

type RevRow = {
  empId: number; empName: string; invoiceCount: number;
  totalBilled: number; totalWithoutGst: number; totalGst: number;
  totalCollected: number; outstanding: number;
};

function buildRevenueTable(rows: Row[]): RevRow[] {
  const map: Record<number, RevRow> = {};
  for (const r of rows) {
    if (!map[r.employeeId]) {
      map[r.employeeId] = {
        empId: r.employeeId, empName: r.employee?.name ?? "Unknown",
        invoiceCount: 0, totalBilled: 0, totalWithoutGst: 0,
        totalGst: 0, totalCollected: 0, outstanding: 0,
      };
    }
    const e = map[r.employeeId];
    e.invoiceCount++;
    e.totalBilled     += r.invoiceValueLakhs;
    e.totalWithoutGst += r.amountWithoutGstLakhs;
    e.totalGst        += (r.invoiceValueLakhs - r.amountWithoutGstLakhs);
    e.totalCollected  += r.amountReceivedLakhs;
    e.outstanding     += (r.invoiceValueLakhs - r.amountReceivedLakhs);
  }
  return Object.values(map).sort((a, b) => b.totalBilled - a.totalBilled);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CollectionsClient({
  initialRows, employees, isManager, currentEmployeeId, initialView, initialEmpId, initialSearch,
}: {
  initialRows: Row[]; employees: Employee[]; isManager: boolean;
  currentEmployeeId?: number; initialView?: string; initialEmpId?: string; initialSearch?: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...empty, employeeId: String(currentEmployeeId ?? "") });
  const [linkedCustomerId, setLinkedCustomerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [view, setView]           = useState(initialView ?? "all");
  const [search, setSearch]       = useState(initialSearch ?? "");
  const [empFilter, setEmpFilter] = useState(initialEmpId ?? "");

  function f(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  // Auto-fill without-GST when invoice value changes
  function handleInvoiceValueChange(v: string) {
    const num = parseFloat(v);
    setForm((p) => ({
      ...p,
      invoiceValueLakhs: v,
      // Only auto-fill if without-GST hasn't been manually set yet (still at 0 or auto-derived)
      amountWithoutGstLakhs:
        p.amountWithoutGstLakhs === "0" || p.amountWithoutGstLakhs === ""
          ? isNaN(num) ? "0" : (num / (1 + GST_RATE)).toFixed(4)
          : p.amountWithoutGstLakhs,
    }));
  }

  function calcWithoutGst() {
    const inv = parseFloat(form.invoiceValueLakhs);
    if (!isNaN(inv)) {
      f("amountWithoutGstLakhs", (inv / (1 + GST_RATE)).toFixed(4));
    }
  }

  function openEdit(r: Row) {
    setEditId(r.id);
    const rid = (r as Row & { customerId?: number | null }).customerId ?? null;
    setLinkedCustomerId(rid);
    setForm({
      employeeId: String(r.employeeId), invoiceDate: r.invoiceDate.slice(0, 10),
      invoiceNo: r.invoiceNo, customerName: r.customerName, customerId: rid,
      invoiceValueLakhs: String(r.invoiceValueLakhs),
      amountWithoutGstLakhs: String(r.amountWithoutGstLakhs),
      dueDate: r.dueDate.slice(0, 10),
      paymentReceivedDate: r.paymentReceivedDate ? r.paymentReceivedDate.slice(0, 10) : "",
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
          amountWithoutGstLakhs: Number(form.amountWithoutGstLakhs),
          amountReceivedLakhs: Number(form.amountReceivedLakhs),
          paymentReceivedDate: form.paymentReceivedDate || null,
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
    if (!confirm("Delete this billing record?")) return;
    await fetch(`/api/collections/${id}`, { method: "DELETE" });
    setRows((prev) => prev.filter((r) => r.id !== id));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (filtered.every((r) => selectedIds.has(r.id))) {
      // Deselect all visible
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      // Select all visible
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((r) => next.add(r.id));
        return next;
      });
    }
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} selected record${ids.length !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/collections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Bulk delete failed");
      setRows((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
    } catch {
      alert("Failed to delete selected records. Please try again.");
    } finally {
      setBulkDeleting(false);
    }
  }

  // ── Filtered rows ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (view === "overdue"        && !isOverdue(r))  return false;
      if (view === "upcoming"       && !isUpcoming(r)) return false;
      if (view === "Fully Received" && r.collectionStatus !== "Fully Received") return false;
      if (view === "Pending"        && r.collectionStatus !== "Pending")        return false;
      if (view === "Partially Received" && r.collectionStatus !== "Partially Received") return false;
      if (empFilter && String(r.employeeId) !== empFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.customerName.toLowerCase().includes(q) && !r.invoiceNo.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, view, empFilter, search]);

  // ── Revenue table (always over ALL rows, not filtered) ────────────────────────
  const revenueTable = useMemo(() => buildRevenueTable(rows), [rows]);

  // ── Summary stats ─────────────────────────────────────────────────────────────
  const totalInvoiced  = filtered.reduce((s, r) => s + r.invoiceValueLakhs, 0);
  const totalWithoutGst = filtered.reduce((s, r) => s + r.amountWithoutGstLakhs, 0);
  const totalReceived  = filtered.reduce((s, r) => s + r.amountReceivedLakhs, 0);
  const collRate       = totalInvoiced > 0 ? ((totalReceived / totalInvoiced) * 100).toFixed(1) : "0";
  const overdueCount   = rows.filter(isOverdue).length;
  const upcomingCount  = rows.filter(isUpcoming).length;

  const TABS = [
    { key: "all",            label: "All",           count: rows.length },
    { key: "overdue",        label: "Overdue",        count: overdueCount,   color: "text-red-600" },
    { key: "upcoming",       label: "Upcoming (30d)", count: upcomingCount,  color: "text-amber-600" },
    { key: "Fully Received", label: "Received",       count: rows.filter((r) => r.collectionStatus === "Fully Received").length, color: "text-green-600" },
    { key: "revenue",        label: "Revenue Summary", count: null,          color: "text-indigo-600" },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Invoiced (filtered)",        value: `₹${totalInvoiced.toFixed(2)}L` },
          { label: "Total (Without GST)",        value: `₹${totalWithoutGst.toFixed(2)}L` },
          { label: "Collected (filtered)",       value: `₹${totalReceived.toFixed(2)}L` },
          { label: "Collection Rate",            value: `${collRate}%` },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-[#CC2229]">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Quick-filter tabs ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              view === t.key ? "bg-white shadow text-[#CC2229]" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.label}
            {t.count !== null && (
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                view === t.key ? "bg-red-50 text-[#CC2229]" : `bg-white ${t.color ?? "text-gray-500"}`
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Revenue Summary view ─────────────────────────────────────────────── */}
      {view === "revenue" ? (
        <div className="bg-white rounded-xl border shadow-sm overflow-auto">
          <div className="px-5 py-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-800">Sales Revenue on Billing — by Salesperson</h3>
            <p className="text-xs text-gray-500 mt-0.5">Aggregated from all billing records. GST = Invoice Value − Without-GST Amount.</p>
          </div>
          {revenueTable.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No billing data yet.</div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {["Salesperson", "Invoices", "Total Billed (₹L)", "Total (Without GST) (₹L)", "GST Amount (₹L)", "Collected (₹L)", "Outstanding (₹L)", "Collection %"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {revenueTable.map((r) => {
                    const pct = r.totalBilled > 0 ? ((r.totalCollected / r.totalBilled) * 100).toFixed(1) : "0";
                    return (
                      <tr key={r.empId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-900">{r.empName}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{r.invoiceCount}</td>
                        <td className="px-4 py-3 font-bold text-[#CC2229]">{r.totalBilled.toFixed(2)}</td>
                        <td className="px-4 py-3 font-semibold text-indigo-700">{r.totalWithoutGst.toFixed(2)}</td>
                        <td className="px-4 py-3 text-gray-500">{r.totalGst > 0 ? r.totalGst.toFixed(2) : "—"}</td>
                        <td className="px-4 py-3 text-green-700 font-semibold">{r.totalCollected.toFixed(2)}</td>
                        <td className={`px-4 py-3 font-semibold ${r.outstanding > 0 ? "text-red-600" : "text-green-600"}`}>{r.outstanding.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-1.5 min-w-[60px]">
                              <div
                                className="bg-[#CC2229] h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, Number(pct))}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600 w-10 text-right">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals footer */}
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td className="px-4 py-3 font-bold text-gray-700">Total</td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-700">
                      {revenueTable.reduce((s, r) => s + r.invoiceCount, 0)}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#CC2229]">
                      {revenueTable.reduce((s, r) => s + r.totalBilled, 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-bold text-indigo-700">
                      {revenueTable.reduce((s, r) => s + r.totalWithoutGst, 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-600">
                      {revenueTable.reduce((s, r) => s + r.totalGst, 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-bold text-green-700">
                      {revenueTable.reduce((s, r) => s + r.totalCollected, 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-bold text-red-600">
                      {revenueTable.reduce((s, r) => s + r.outstanding, 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {(() => {
                        const tb = revenueTable.reduce((s, r) => s + r.totalBilled, 0);
                        const tc = revenueTable.reduce((s, r) => s + r.totalCollected, 0);
                        return tb > 0 ? `${((tc / tb) * 100).toFixed(1)}%` : "—";
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </>
          )}
        </div>
      ) : (
        <>
          {/* ── Filter bar ───────────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="Search customer / invoice no…"
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
            {(search || empFilter || view !== "all") && (
              <button
                onClick={() => { setSearch(""); setEmpFilter(""); setView("all"); setSelectedIds(new Set()); }}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Clear filters
              </button>
            )}
            <div className="ml-auto flex items-center gap-2">
              {isManager && selectedIds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="bg-red-50 border border-red-300 text-red-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-100 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {bulkDeleting ? "Deleting…" : `🗑 Delete ${selectedIds.size} selected`}
                </button>
              )}
              <button
                onClick={() => {
                  setEditId(null);
                  setForm({ ...empty, employeeId: String(currentEmployeeId ?? "") });
                  setShowForm(true);
                }}
                className="bg-[#CC2229] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#A81B21] transition"
              >
                + Add Invoice
              </button>
            </div>
          </div>

          {(search || empFilter || view !== "all") && (
            <p className="text-xs text-gray-500">
              Showing <strong>{filtered.length}</strong> of {rows.length} records
            </p>
          )}

          {/* ── Modal form ───────────────────────────────────────────────────── */}
          {showForm && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">{editId ? "Edit" : "Add"} Invoice / Billing</h3>
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
                    <CustomerNameCombobox
                      value={form.customerName}
                      onChange={(v) => f("customerName", v)}
                      onSelect={(name, cid) => { f("customerName", name); setLinkedCustomerId(cid); setForm(p => ({ ...p, customerId: cid })); }}
                      linkedId={linkedCustomerId}
                      required
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>

                  {/* Invoice Value + Without GST side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Value (₹L) *</label>
                      <input required type="number" step="0.01" value={form.invoiceValueLakhs}
                        onChange={(e) => handleInvoiceValueChange(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Total (Without GST) (₹L)
                        <button type="button" onClick={calcWithoutGst}
                          className="ml-2 text-[10px] text-[#CC2229] underline hover:text-[#A81B21]">
                          Auto (18%)
                        </button>
                      </label>
                      <input type="number" step="0.0001" value={form.amountWithoutGstLakhs}
                        onChange={(e) => f("amountWithoutGstLakhs", e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>

                  {/* GST helper display */}
                  {Number(form.invoiceValueLakhs) > 0 && Number(form.amountWithoutGstLakhs) > 0 && (
                    <p className="text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded">
                      GST component: <strong>₹{(Number(form.invoiceValueLakhs) - Number(form.amountWithoutGstLakhs)).toFixed(4)}L</strong>
                      {" "}({((( Number(form.invoiceValueLakhs) - Number(form.amountWithoutGstLakhs)) / Number(form.invoiceValueLakhs)) * 100).toFixed(1)}%)
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Due Date *</label>
                      <input required type="date" value={form.dueDate} onChange={(e) => f("dueDate", e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Amount Received (₹L)</label>
                      <input type="number" step="0.01" value={form.amountReceivedLakhs} onChange={(e) => f("amountReceivedLakhs", e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Payment Received Date
                      <span className="ml-1 text-gray-400 font-normal">(actual date payment was received)</span>
                    </label>
                    <input type="date" value={form.paymentReceivedDate} onChange={(e) => f("paymentReceivedDate", e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm" />
                    {form.paymentReceivedDate && form.dueDate && (
                      <p className={`text-xs mt-1 font-medium ${form.paymentReceivedDate > form.dueDate ? "text-red-600" : "text-green-600"}`}>
                        {form.paymentReceivedDate > form.dueDate
                          ? `⚠ Late by ${Math.ceil((new Date(form.paymentReceivedDate).getTime() - new Date(form.dueDate).getTime()) / 86400000)} day(s)`
                          : "✓ On-time payment"}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                    <select value={form.collectionStatus} onChange={(e) => f("collectionStatus", e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm">
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
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

          {/* ── Billing table ────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border shadow-sm overflow-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="font-medium">No records match the current filter.</p>
                <button onClick={() => { setSearch(""); setEmpFilter(""); setView("all"); }}
                  className="mt-2 text-sm text-[#CC2229] hover:underline">Clear filters</button>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {isManager && (
                      <th className="px-3 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id))}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300 text-[#CC2229] focus:ring-[#CC2229] cursor-pointer"
                          title="Select all visible"
                        />
                      </th>
                    )}
                    {[
                      "Invoice No",
                      isManager ? "Employee" : null,
                      "Customer",
                      "Invoice Date",
                      "Invoice (₹L)",
                      "Total (Without GST) (₹L)",
                      "Received (₹L)",
                      "Balance",
                      "Due Date",
                      "Paid On",
                      "Status",
                      "",
                    ].filter(Boolean).map((h) => (
                      <th key={h!} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((r) => {
                    const balance = r.invoiceValueLakhs - r.amountReceivedLakhs;
                    const overdue = isOverdue(r);
                    const isSelected = selectedIds.has(r.id);
                    return (
                      <tr key={r.id} className={`hover:bg-gray-50 ${overdue ? "bg-red-50/40" : ""} ${isSelected ? "bg-red-50/60" : ""}`}>
                        {isManager && (
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(r.id)}
                              className="rounded border-gray-300 text-[#CC2229] focus:ring-[#CC2229] cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 text-gray-500">{r.invoiceNo || "—"}</td>
                        {isManager && <td className="px-4 py-3 font-medium">{r.employee?.name ?? "—"}</td>}
                        <td className="px-4 py-3 font-medium">{r.customerName}</td>
                        <td className="px-4 py-3 text-gray-500">{r.invoiceDate.slice(0, 10)}</td>
                        <td className="px-4 py-3 font-semibold">{r.invoiceValueLakhs.toFixed(2)}</td>
                        <td className="px-4 py-3 font-semibold text-indigo-700">
                          {r.amountWithoutGstLakhs > 0 ? r.amountWithoutGstLakhs.toFixed(2) : "—"}
                        </td>
                        <td className="px-4 py-3 text-green-700">{r.amountReceivedLakhs.toFixed(2)}</td>
                        <td className={`px-4 py-3 font-semibold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>{balance.toFixed(2)}</td>
                        <td className={`px-4 py-3 ${overdue ? "text-red-600 font-semibold" : "text-gray-500"}`}>{r.dueDate.slice(0, 10)}</td>
                        <td className="px-4 py-3">
                          {r.paymentReceivedDate ? (
                            <span className={`text-xs font-semibold ${r.paymentReceivedDate > r.dueDate ? "text-red-600" : "text-green-600"}`}>
                              {r.paymentReceivedDate.slice(0, 10)}
                              {r.paymentReceivedDate > r.dueDate && (
                                <span className="ml-1 text-red-400 font-normal">
                                  (+{Math.ceil((new Date(r.paymentReceivedDate).getTime() - new Date(r.dueDate).getTime()) / 86400000)}d late)
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3"><Badge label={r.collectionStatus} variant={statusVariant(r.collectionStatus)} /></td>
                        <td className="px-4 py-3 flex gap-2">
                          <button onClick={() => openEdit(r)} className="text-xs text-[#CC2229] hover:underline">Edit</button>
                          <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:underline">Del</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
