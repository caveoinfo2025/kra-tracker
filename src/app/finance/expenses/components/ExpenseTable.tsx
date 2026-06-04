"use client";
import { useMemo, useState } from "react";
import {
  Search, ChevronUp, ChevronDown, Columns3, Download, CheckCheck, FileText, BadgeIndianRupee,
} from "lucide-react";
import {
  Expense, ExpenseCaps, fmtINR, fmtINRorDash, fmtDate, approvalBadge, paymentBadge,
} from "../data";

type SortKey = "date" | "expenseNo" | "amount" | "total";
type SortDir = "asc" | "desc";

const ALL_COLUMNS = [
  { key: "date", label: "Expense Date" }, { key: "expenseNo", label: "Expense No" },
  { key: "category", label: "Category" }, { key: "subCategory", label: "Sub Category" },
  { key: "description", label: "Description" }, { key: "customer", label: "Customer" },
  { key: "vendor", label: "Vendor" }, { key: "employee", label: "Employee" },
  { key: "paymentMode", label: "Payment Mode" }, { key: "amount", label: "Amount" },
  { key: "gst", label: "GST Amount" }, { key: "total", label: "Total Amount" },
  { key: "voucher", label: "Voucher No" }, { key: "approval", label: "Approval Status" },
  { key: "payment", label: "Payment Status" }, { key: "createdBy", label: "Created By" },
] as const;
type ColKey = (typeof ALL_COLUMNS)[number]["key"];

const PAGE_SIZE = 8;

export default function ExpenseTable({
  rows, caps, onRowClick, onExport, onBulk,
}: {
  rows: Expense[];
  caps: ExpenseCaps;
  onRowClick: (e: Expense) => void;
  onExport: (kind: "excel" | "pdf") => void;
  onBulk: (action: "approve" | "voucher" | "paid", ids: number[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [hidden, setHidden] = useState<Set<ColKey>>(new Set(["subCategory", "vendor", "createdBy", "paymentMode"]));
  const [showCols, setShowCols] = useState(false);
  const [sel, setSel] = useState<Set<number>>(new Set());

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [r.expenseNo, r.category, r.subCategory, r.description, r.customer, r.vendor, r.employee, r.voucherNo, r.createdBy].some((v) => (v || "").toLowerCase().includes(q)));
  }, [rows, search]);

  const sorted = useMemo(() => {
    const arr = [...searched];
    arr.sort((a, b) => {
      let av: number | string, bv: number | string;
      switch (sortKey) {
        case "expenseNo": av = a.expenseNo; bv = b.expenseNo; break;
        case "amount": av = a.baseAmount; bv = b.baseAmount; break;
        case "total": av = a.totalAmount; bv = b.totalAmount; break;
        default: av = a.date + String(a.id).padStart(5, "0"); bv = b.date + String(b.id).padStart(5, "0");
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [searched, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function toggleSort(k: SortKey) { if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc")); else { setSortKey(k); setSortDir(k === "date" ? "desc" : "asc"); } }
  const visible = (k: ColKey) => !hidden.has(k);
  const SortIcon = ({ k }: { k: SortKey }) => sortKey !== k ? null : sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />;
  const canSelect = caps.canApprove || caps.canEdit || caps.canExport;

  function toggle(id: number) { setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function toggleAll() { const ids = pageRows.map((r) => r.id); setSel((s) => { const all = ids.every((i) => s.has(i)); const n = new Set(s); ids.forEach((i) => all ? n.delete(i) : n.add(i)); return n; }); }
  function runBulk(a: "approve" | "voucher" | "paid") { onBulk(a, [...sel]); setSel(new Set()); }

  return (
    <div className="card" style={{ overflow: "visible" }}>
      <div className="card-header" style={{ flexWrap: "wrap", gap: 8 }}>
        <div className="tb-search" style={{ minWidth: 200, maxWidth: 280 }}>
          <Search size={14} className="tb-search-icon" />
          <input className="tb-search-input" placeholder="Search expenses…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto", position: "relative", flexWrap: "wrap" }}>
          {sel.size > 0 && (
            <>
              {caps.canApprove && <button className="btn-cav btn-cav-primary btn-cav-sm" onClick={() => runBulk("approve")}><CheckCheck size={13} /> Approve ({sel.size})</button>}
              {caps.canApprove && <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={() => runBulk("voucher")}><FileText size={13} /> Generate Vouchers</button>}
              {caps.canApprove && <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={() => runBulk("paid")}><BadgeIndianRupee size={13} /> Mark Paid</button>}
            </>
          )}
          <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={() => setShowCols((s) => !s)}><Columns3 size={13} /> Columns</button>
          <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={() => onExport("excel")}><Download size={13} /> Export</button>
          {showCols && (
            <div style={{ position: "absolute", top: 36, right: 0, zIndex: 30, width: 210, maxHeight: 300, overflowY: "auto", background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "var(--shadow-lg)", padding: 8 }}>
              {ALL_COLUMNS.map((c) => (
                <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", fontSize: 12.5, cursor: "pointer" }}>
                  <input type="checkbox" checked={visible(c.key)} onChange={() => setHidden((h) => { const n = new Set(h); n.has(c.key) ? n.delete(c.key) : n.add(c.key); return n; })} style={{ accentColor: "var(--caveo-red)" }} />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="crm-table">
          <thead>
            <tr>
              {canSelect && <th style={{ width: 36 }}><input type="checkbox" onChange={toggleAll} checked={pageRows.length > 0 && pageRows.every((r) => sel.has(r.id))} style={{ accentColor: "var(--caveo-red)" }} /></th>}
              {visible("date") && <th onClick={() => toggleSort("date")} style={{ cursor: "pointer" }}>Date <SortIcon k="date" /></th>}
              {visible("expenseNo") && <th onClick={() => toggleSort("expenseNo")} style={{ cursor: "pointer" }}>Expense No <SortIcon k="expenseNo" /></th>}
              {visible("category") && <th>Category</th>}
              {visible("subCategory") && <th>Sub Category</th>}
              {visible("description") && <th>Description</th>}
              {visible("customer") && <th>Customer</th>}
              {visible("vendor") && <th>Vendor</th>}
              {visible("employee") && <th>Employee</th>}
              {visible("paymentMode") && <th>Mode</th>}
              {visible("amount") && <th className="th-right" onClick={() => toggleSort("amount")} style={{ cursor: "pointer" }}>Amount <SortIcon k="amount" /></th>}
              {visible("gst") && <th className="th-right">GST</th>}
              {visible("total") && <th className="th-right" onClick={() => toggleSort("total")} style={{ cursor: "pointer" }}>Total <SortIcon k="total" /></th>}
              {visible("voucher") && <th>Voucher</th>}
              {visible("approval") && <th>Approval</th>}
              {visible("payment") && <th>Payment</th>}
              {visible("createdBy") && <th>Created By</th>}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.id} onClick={() => onRowClick(r)}>
                {canSelect && <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} style={{ accentColor: "var(--caveo-red)" }} /></td>}
                {visible("date") && <td className="cell-strong" style={{ whiteSpace: "nowrap" }}>{fmtDate(r.date)}</td>}
                {visible("expenseNo") && <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--caveo-red)", whiteSpace: "nowrap" }}>{r.expenseNo}</td>}
                {visible("category") && <td>{r.category}</td>}
                {visible("subCategory") && <td className="cell-sub">{r.subCategory || "—"}</td>}
                {visible("description") && <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description}</td>}
                {visible("customer") && <td className="cell-sub">{r.customer || "—"}</td>}
                {visible("vendor") && <td className="cell-sub">{r.vendor || "—"}</td>}
                {visible("employee") && <td className="cell-sub">{r.employee || "—"}</td>}
                {visible("paymentMode") && <td className="cell-sub">{r.paymentMode}</td>}
                {visible("amount") && <td className="td-right">{fmtINR(r.baseAmount)}</td>}
                {visible("gst") && <td className="td-right cell-sub">{fmtINRorDash(r.gstAmount)}</td>}
                {visible("total") && <td className="td-right cell-strong">{fmtINR(r.totalAmount)}</td>}
                {visible("voucher") && <td style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: r.voucherNo ? "var(--caveo-red)" : "var(--fg-4)" }}>{r.voucherNo || "—"}</td>}
                {visible("approval") && <td><span className={`badge ${approvalBadge(r.approvalStatus)}`}>{r.approvalStatus}</span></td>}
                {visible("payment") && <td><span className={`badge ${paymentBadge(r.paymentStatus)}`}>{r.paymentStatus}</span></td>}
                {visible("createdBy") && <td className="cell-sub" style={{ whiteSpace: "nowrap" }}>{r.createdBy}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
          {sorted.length === 0 ? "0 results" : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, sorted.length)} of ${sorted.length}`}{sel.size > 0 && ` · ${sel.size} selected`}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button className="btn-cav btn-cav-secondary btn-cav-sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} style={safePage <= 1 ? { opacity: 0.4 } : undefined}>Prev</button>
          <span style={{ fontSize: 12, color: "var(--fg-2)", fontWeight: 600 }}>{safePage} / {totalPages}</span>
          <button className="btn-cav btn-cav-secondary btn-cav-sm" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} style={safePage >= totalPages ? { opacity: 0.4 } : undefined}>Next</button>
        </div>
      </div>
    </div>
  );
}
