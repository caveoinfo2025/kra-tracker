"use client";
import { useState, useMemo, useEffect } from "react";
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

type Advance = {
  id: number;
  salesFunnelId: number | null;
  customerName: string;
  amountLakhs: number;
  receivedDate: string;
  mode: string;
  referenceNo: string;
  notes: string;
  status: string;
  appliedToCollectionId: number | null;
  appliedDate: string | null;
  recordedBy?: { name: string } | null;
};

type PaymentEntry = {
  id: number;
  amountLakhs: number;
  paymentDate: string;
  mode: string;
  referenceNo: string;
  notes: string;
  recordedBy?: { name: string } | null;
};

const PAYMENT_MODES = ["Bank Transfer", "Cheque", "UPI", "Cash", "Other"];

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

// ── Record-payment modal: adds an entry to the invoice's payment ledger ────────
function RecordPaymentModal({
  row,
  advances,
  onClose,
  onSaved,
  onAdvanceApplied,
}: {
  row: Row;
  advances: Advance[];
  onClose: () => void;
  onSaved: (updated: Row) => void;
  onAdvanceApplied: (advanceId: number) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const balance = Math.max(0, row.invoiceValueLakhs - row.amountReceivedLakhs);

  const [amount, setAmount] = useState(balance > 0 ? balance.toFixed(2) : "");
  const [paymentDate, setPaymentDate] = useState(today);
  const [mode, setMode] = useState("Bank Transfer");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ledger, setLedger] = useState<PaymentEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(true);

  // unapplied advances for this customer
  const custAdvances = advances.filter(
    (a) => a.status === "unapplied" && a.customerName.toLowerCase() === row.customerName.toLowerCase()
  );

  useEffect(() => {
    fetch(`/api/payments?collectionId=${row.id}`)
      .then((r) => r.json())
      .then((d) => { setLedger(Array.isArray(d) ? d : []); setLedgerLoading(false); })
      .catch(() => setLedgerLoading(false));
  }, [row.id]);

  const isLate = paymentDate && paymentDate > row.dueDate.slice(0, 10);
  const daysLate = isLate ? daysBetween(paymentDate, row.dueDate.slice(0, 10)) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const amt = Number(amount);
    if (!(amt > 0)) { setError("Enter a positive amount."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionId: row.id,
          amountLakhs: amt,
          paymentDate,
          mode,
          referenceNo,
          notes,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to record payment.");
        return;
      }
      const { collection } = await res.json();
      onSaved(collection);
      onClose();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyAdvance(advanceId: number) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/advances/${advanceId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId: row.id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to apply advance.");
        return;
      }
      const { collection } = await res.json();
      onSaved(collection);
      onAdvanceApplied(advanceId);
      onClose();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-1">Record Payment</h3>
        <p className="text-sm text-gray-500 mb-1">
          {row.customerName} — Invoice {row.invoiceNo || "#" + row.id}
        </p>
        <p className="text-xs text-gray-400 mb-4">
          ₹{row.invoiceValueLakhs.toFixed(2)}L invoiced · ₹{row.amountReceivedLakhs.toFixed(2)}L received ·
          <span className={balance > 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}> ₹{balance.toFixed(2)}L balance</span>
        </p>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded border border-red-200 mb-3">{error}</div>
        )}

        {/* Apply unapplied advance for this customer */}
        {custAdvances.length > 0 && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-xs font-semibold text-blue-800 mb-2">
              Unapplied advances for {row.customerName}
            </div>
            {custAdvances.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm py-1">
                <span className="text-gray-700">
                  ₹{a.amountLakhs.toFixed(2)}L · {a.mode}{a.referenceNo ? ` · ${a.referenceNo}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => handleApplyAdvance(a.id)}
                  disabled={loading}
                  className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Apply to this invoice
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Amount (₹L)</label>
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment Date</label>
              <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
            </div>
          </div>
          {paymentDate && (
            <p className={`text-xs font-semibold ${isLate ? "text-red-600" : "text-green-600"}`}>
              {isLate ? `⚠ Late by ${daysLate} day${daysLate !== 1 ? "s" : ""}` : "✓ On-time"}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mode</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
                {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Reference No</label>
              <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="UTR / Cheque #"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 bg-[#CC2229] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#A81B21] disabled:opacity-50">
              {loading ? "Saving…" : "Record Payment"}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </form>

        {/* Existing ledger */}
        <div className="mt-5 pt-4 border-t">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Payment History</div>
          {ledgerLoading ? (
            <div className="text-xs text-gray-400">Loading…</div>
          ) : ledger.length === 0 ? (
            <div className="text-xs text-gray-400">No payments recorded yet.</div>
          ) : (
            <div className="space-y-1.5">
              {ledger.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <div>
                    <span className="font-semibold text-green-700">₹{p.amountLakhs.toFixed(2)}L</span>
                    <span className="text-gray-400 ml-2">{p.paymentDate.slice(0, 10)} · {p.mode}</span>
                    {p.referenceNo && <span className="text-gray-400 ml-1">· {p.referenceNo}</span>}
                  </div>
                  <span className="text-gray-400">{p.recordedBy?.name ?? ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Record-advance modal: capture an advance against a Closed Won order ─────────
function RecordAdvanceModal({
  customers,
  onClose,
  onSaved,
}: {
  customers: string[];
  onClose: () => void;
  onSaved: (a: Advance) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [customerName, setCustomerName] = useState("");
  const [amountLakhs, setAmountLakhs] = useState("");
  const [receivedDate, setReceivedDate] = useState(today);
  const [mode, setMode] = useState("Bank Transfer");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!customerName.trim() || !(Number(amountLakhs) > 0)) {
      setError("Customer and a positive amount are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, amountLakhs: Number(amountLakhs), receivedDate, mode, referenceNo, notes }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to record advance.");
        return;
      }
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
        <h3 className="text-lg font-semibold mb-1">Record Advance Payment</h3>
        <p className="text-sm text-gray-500 mb-4">
          Advance received against a Closed Won order, before invoicing. Held as a credit until applied.
        </p>
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded border border-red-200 mb-3">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Customer</label>
            <input list="adv-customers" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
            <datalist id="adv-customers">
              {customers.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Amount (₹L)</label>
              <input type="number" step="0.01" value={amountLakhs} onChange={(e) => setAmountLakhs(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Received Date</label>
              <input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mode</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]">
                {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Reference No</label>
              <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 bg-[#CC2229] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#A81B21] disabled:opacity-50">
              {loading ? "Saving…" : "Record Advance"}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AccountsClient({
  initialRows,
  initialAdvances = [],
  employees,
  isManager,
  canManage = false,
}: {
  initialRows: Row[];
  initialAdvances?: Advance[];
  employees: Employee[];
  isManager: boolean;
  canManage?: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [advances, setAdvances] = useState<Advance[]>(initialAdvances);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [view, setView] = useState("pending-payment");
  const [search, setSearch] = useState("");
  const [empFilter, setEmpFilter] = useState("");
  const [today, setToday] = useState<{ totalLakhs: number; count: number } | null>(null);

  // Daily payment summary
  useEffect(() => {
    fetch("/api/payments/today")
      .then((r) => r.json())
      .then((d) => setToday({ totalLakhs: d.totalLakhs ?? 0, count: d.count ?? 0 }))
      .catch(() => {});
  }, [rows]);

  function handleSaved(updated: Row) {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    router.refresh();
  }

  const unappliedAdvances = advances.filter((a) => a.status === "unapplied");
  const customerNames = useMemo(
    () => Array.from(new Set(rows.map((r) => r.customerName))).sort(),
    [rows]
  );

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
      {/* ── Received today banner + actions ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2">
            <span className="text-xs text-green-700 font-medium uppercase tracking-wide">Received Today</span>
            <div className="text-lg font-bold text-green-800">
              ₹{(today?.totalLakhs ?? 0).toFixed(2)}L
              <span className="text-xs font-normal text-green-600 ml-2">
                {today?.count ?? 0} payment{(today?.count ?? 0) !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAdvanceModal(true)}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            + Record Advance
          </button>
        )}
      </div>

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

      {/* ── Unapplied advances panel ─────────────────────────────────────────── */}
      {unappliedAdvances.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-sm font-semibold text-blue-900 mb-2">
            Unapplied Advances ({unappliedAdvances.length}) · ₹{unappliedAdvances.reduce((s, a) => s + a.amountLakhs, 0).toFixed(2)}L held
          </div>
          <div className="flex flex-wrap gap-2">
            {unappliedAdvances.map((a) => (
              <div key={a.id} className="bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-xs">
                <span className="font-semibold text-gray-800">{a.customerName}</span>
                <span className="text-blue-700 font-semibold ml-2">₹{a.amountLakhs.toFixed(2)}L</span>
                <span className="text-gray-400 ml-2">{a.mode}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Open “Record Payment” on a matching customer’s invoice to apply an advance.
          </p>
        </div>
      )}

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

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {editRow && (
        <RecordPaymentModal
          row={editRow}
          advances={advances}
          onClose={() => setEditRow(null)}
          onSaved={handleSaved}
          onAdvanceApplied={(advanceId) =>
            setAdvances((prev) => prev.map((a) => a.id === advanceId ? { ...a, status: "applied" } : a))
          }
        />
      )}
      {showAdvanceModal && (
        <RecordAdvanceModal
          customers={customerNames}
          onClose={() => setShowAdvanceModal(false)}
          onSaved={(a) => setAdvances((prev) => [a, ...prev])}
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
                        Record Payment
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
