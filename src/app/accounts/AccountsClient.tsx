"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/Badge";

type Row = {
  id: number;
  invoiceDate: string;
  invoiceNo: string;
  employeeId: number;
  employee: { name: string };
  customerName: string;
  invoiceValueLakhs: number;
  amountWithoutGstLakhs: number;
  dueDate: string;
  paymentReceivedDate: string | null;
  amountReceivedLakhs: number;
  collectionStatus: string;
  remarks: string;
};
type Employee = { id: number; name: string };

const STATUSES = ["Pending", "Partially Received", "Fully Received", "Overdue"];

const statusVariant = (s: string) =>
  s === "Fully Received"
    ? "success"
    : s === "Overdue"
    ? "danger"
    : s === "Partially Received"
    ? "warning"
    : "neutral";

function daysBetween(a: string, b: string) {
  return Math.ceil(
    (new Date(a).getTime() - new Date(b).getTime()) / 86400000
  );
}

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

// ── Quick-update modal: only shows the payment fields ──────────────────────────
function QuickUpdateModal({
  row,
  onClose,
  onSaved,
}: {
  row: Row;
  onClose: () => void;
  onSaved: (updated: Row) => void;
}) {
  const [paymentDate, setPaymentDate] = useState(
    row.paymentReceivedDate ? row.paymentReceivedDate.slice(0, 10) : ""
  );
  const [amountReceived, setAmountReceived] = useState(
    String(row.amountReceivedLakhs)
  );
  const [status, setStatus] = useState(row.collectionStatus);
  const [remarks, setRemarks] = useState(row.remarks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isLate = paymentDate && paymentDate > row.dueDate.slice(0, 10);
  const daysLate = isLate ? daysBetween(paymentDate, row.dueDate.slice(0, 10)) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/collections/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentReceivedDate: paymentDate || null,
          amountReceivedLakhs: Number(amountReceived),
          collectionStatus: status,
          remarks,
        }),
      });
      if (!res.ok) { setError("Failed to save."); return; }
      const saved = await res.json();
      onSaved(saved);
      onClose();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-1">Update Payment</h3>
        <p className="text-sm text-gray-500 mb-4">
          {row.customerName} — Invoice {row.invoiceNo || "#" + row.id}
          <span className="ml-2 text-gray-400">
            (₹{row.invoiceValueLakhs.toFixed(2)}L, due {row.dueDate.slice(0, 10)})
          </span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded border border-red-200">
              {error}
            </div>
          )}

          {/* Payment Received Date — primary field */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Payment Received Date
              <span className="ml-1 text-gray-400 font-normal">
                (actual date customer paid)
              </span>
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
            />
            {paymentDate && (
              <p
                className={`text-xs mt-1 font-semibold ${
                  isLate ? "text-red-600" : "text-green-600"
                }`}
              >
                {isLate
                  ? `⚠ Late by ${daysLate} day${daysLate !== 1 ? "s" : ""}`
                  : "✓ On-time payment"}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Amount Received (₹L)
              </label>
              <input
                type="number"
                step="0.01"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
              >
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Remarks
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#CC2229] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#A81B21] disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save Payment"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AccountsClient({
  initialRows,
  employees,
  isManager,
}: {
  initialRows: Row[];
  employees: Employee[];
  isManager: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [view, setView] = useState("pending-payment");
  const [search, setSearch] = useState("");
  const [empFilter, setEmpFilter] = useState("");

  function handleSaved(updated: Row) {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    router.refresh();
  }

  // ── Filtered rows ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (view === "pending-payment" && r.paymentReceivedDate) return false;
      if (view === "overdue" && !isOverdue(r)) return false;
      if (view === "upcoming" && !isUpcoming(r)) return false;
      if (view === "late-payment") {
        if (!r.paymentReceivedDate) return false;
        if (r.paymentReceivedDate.slice(0, 10) <= r.dueDate.slice(0, 10)) return false;
      }
      if (view === "on-time") {
        if (!r.paymentReceivedDate) return false;
        if (r.paymentReceivedDate.slice(0, 10) > r.dueDate.slice(0, 10)) return false;
      }
      if (view === "all") { /* no filter */ }
      if (empFilter && String(r.employeeId) !== empFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.customerName.toLowerCase().includes(q) &&
          !r.invoiceNo.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [rows, view, empFilter, search]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalInvoiced   = rows.reduce((s, r) => s + r.invoiceValueLakhs, 0);
  const totalReceived   = rows.reduce((s, r) => s + r.amountReceivedLakhs, 0);
  const outstanding     = totalInvoiced - totalReceived;
  const overdueCount    = rows.filter(isOverdue).length;
  const upcomingCount   = rows.filter(isUpcoming).length;
  const pendingPaymentCount = rows.filter((r) => !r.paymentReceivedDate && r.collectionStatus !== "Fully Received").length;
  const lateCount       = rows.filter(
    (r) => r.paymentReceivedDate && r.paymentReceivedDate.slice(0, 10) > r.dueDate.slice(0, 10)
  ).length;
  const onTimeCount     = rows.filter(
    (r) => r.paymentReceivedDate && r.paymentReceivedDate.slice(0, 10) <= r.dueDate.slice(0, 10)
  ).length;

  const TABS = [
    { key: "pending-payment", label: "Pending Entry", count: pendingPaymentCount, color: "text-amber-600" },
    { key: "overdue",         label: "Overdue",        count: overdueCount,        color: "text-red-600" },
    { key: "upcoming",        label: "Upcoming (30d)", count: upcomingCount,        color: "text-blue-600" },
    { key: "late-payment",    label: "Late Payments",  count: lateCount,            color: "text-orange-600" },
    { key: "on-time",         label: "On-Time",        count: onTimeCount,          color: "text-green-600" },
    { key: "all",             label: "All",            count: rows.length,          color: "text-gray-600" },
  ];

  const collRate = totalInvoiced > 0 ? ((totalReceived / totalInvoiced) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-4">
      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Invoiced",    value: `₹${totalInvoiced.toFixed(2)}L` },
          { label: "Total Received",    value: `₹${totalReceived.toFixed(2)}L`,   color: "text-green-700" },
          { label: "Outstanding",       value: `₹${outstanding.toFixed(2)}L`,     color: outstanding > 0 ? "text-red-600" : "text-green-600" },
          { label: "Collection Rate",   value: `${collRate}%` },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-xl p-4 text-center">
            <p className={`text-xl font-bold ${s.color ?? "text-[#CC2229]"}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              view === t.key
                ? "bg-white shadow text-[#CC2229]"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.label}
            <span
              className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                view === t.key
                  ? "bg-red-50 text-[#CC2229]"
                  : `bg-white ${t.color}`
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Search + filter bar ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search customer / invoice no…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
        />
        <select
          value={empFilter}
          onChange={(e) => setEmpFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]"
        >
          <option value="">All Salespeople</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        {(search || empFilter || view !== "pending-payment") && (
          <button
            onClick={() => {
              setSearch("");
              setEmpFilter("");
              setView("pending-payment");
            }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Showing <strong>{filtered.length}</strong> of {rows.length} records
        {view === "pending-payment" && (
          <span className="ml-2 text-amber-600">
            — invoices with no payment date recorded yet
          </span>
        )}
      </p>

      {/* ── Modal ───────────────────────────────────────────────────────────── */}
      {editRow && (
        <QuickUpdateModal
          row={editRow}
          onClose={() => setEditRow(null)}
          onSaved={handleSaved}
        />
      )}

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border shadow-sm overflow-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium">No records match the current filter.</p>
            <button
              onClick={() => {
                setSearch("");
                setEmpFilter("");
                setView("all");
              }}
              className="mt-2 text-sm text-[#CC2229] hover:underline"
            >
              Show all records
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Salesperson",
                  "Customer",
                  "Invoice No",
                  "Invoice (₹L)",
                  "Received (₹L)",
                  "Balance (₹L)",
                  "Due Date",
                  "Paid On",
                  "Days Late",
                  "Status",
                  "Action",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => {
                const balance = r.invoiceValueLakhs - r.amountReceivedLakhs;
                const overdue = isOverdue(r);
                const paid    = r.paymentReceivedDate;
                const paidDate = paid ? paid.slice(0, 10) : null;
                const dueDate  = r.dueDate.slice(0, 10);
                const isLate   = paidDate && paidDate > dueDate;
                const daysLate = isLate ? daysBetween(paidDate!, dueDate) : 0;
                const noPaidDate = !paid && r.collectionStatus !== "Fully Received";

                return (
                  <tr
                    key={r.id}
                    className={`hover:bg-gray-50 ${
                      overdue && !paid ? "bg-red-50/40" : noPaidDate ? "bg-amber-50/30" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {r.employee?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-medium">{r.customerName}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {r.invoiceNo || "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {r.invoiceValueLakhs.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-green-700">
                      {r.amountReceivedLakhs.toFixed(2)}
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold ${
                        balance > 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {balance.toFixed(2)}
                    </td>
                    <td
                      className={`px-4 py-3 ${
                        overdue ? "text-red-600 font-semibold" : "text-gray-500"
                      }`}
                    >
                      {dueDate}
                    </td>
                    <td className="px-4 py-3">
                      {paidDate ? (
                        <span
                          className={`text-xs font-semibold ${
                            isLate ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {paidDate}
                        </span>
                      ) : (
                        <span className="text-amber-500 text-xs font-medium">
                          Not recorded
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isLate ? (
                        <span className="text-xs text-red-600 font-semibold">
                          {daysLate}d
                        </span>
                      ) : paidDate ? (
                        <span className="text-xs text-green-600 font-semibold">
                          On-time
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={r.collectionStatus}
                        variant={statusVariant(r.collectionStatus)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEditRow(r)}
                        className="text-xs bg-[#CC2229] text-white px-3 py-1 rounded-lg hover:bg-[#A81B21] transition whitespace-nowrap"
                      >
                        Update Payment
                      </button>
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
