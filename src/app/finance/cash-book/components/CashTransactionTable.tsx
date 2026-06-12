"use client";
import { useMemo, useState } from "react";
import {
  Search, ChevronUp, ChevronDown, Columns3, Download, Link2, Pencil, Undo2,
} from "lucide-react";
import {
  CashTxn, CashCaps, fmtINRorDash, fmtINR, fmtDate, reconBadge, isCashCredit,
} from "../data";

type SortKey = "date" | "txnNo" | "debit" | "credit" | "balance";
type SortDir = "asc" | "desc";

const ALL_COLUMNS = [
  { key: "date", label: "Date" }, { key: "txnNo", label: "Transaction No" },
  { key: "refNo", label: "Reference No" }, { key: "type", label: "Type" },
  { key: "description", label: "Description" }, { key: "category", label: "Category" },
  { key: "customer", label: "Customer" }, { key: "employee", label: "Employee" },
  { key: "debit", label: "Debit" }, { key: "credit", label: "Credit" },
  { key: "balance", label: "Running Balance" }, { key: "createdBy", label: "Created By" },
  { key: "status", label: "Status" },
] as const;
type ColKey = (typeof ALL_COLUMNS)[number]["key"];

const PAGE_SIZE = 8;

export interface CashApiPaginationControls {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onPageSizeChange?: (ps: number) => void;
}

export default function CashTransactionTable({
  rows, balanceById, onRowClick, onExport, search, onSearch, apiPagination,
}: {
  rows: CashTxn[];
  balanceById: Map<number, number>;
  caps: CashCaps;
  onRowClick: (t: CashTxn) => void;
  onExport: (kind: "excel" | "pdf") => void;
  search: string;
  onSearch: (q: string) => void;
  apiPagination?: CashApiPaginationControls;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [hidden, setHidden] = useState<Set<ColKey>>(new Set(["refNo", "createdBy"]));
  const [showCols, setShowCols] = useState(false);

  // When apiPagination is provided the API already filtered; no local search needed.
  const searched = useMemo(() => {
    if (apiPagination) return rows;
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.txnNo, r.refNo, r.type, r.description, r.category, r.customer, r.employee, r.vendor, r.createdBy]
        .some((v) => (v || "").toLowerCase().includes(q)));
  }, [rows, search, apiPagination]);

  const sorted = useMemo(() => {
    const arr = [...searched];
    arr.sort((a, b) => {
      let av: number | string, bv: number | string;
      switch (sortKey) {
        case "txnNo": av = a.txnNo; bv = b.txnNo; break;
        case "debit": av = a.debit; bv = b.debit; break;
        case "credit": av = a.credit; bv = b.credit; break;
        case "balance": av = balanceById.get(a.id) ?? 0; bv = balanceById.get(b.id) ?? 0; break;
        default: av = a.date + String(a.id).padStart(5, "0"); bv = b.date + String(b.id).padStart(5, "0");
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [searched, sortKey, sortDir, balanceById]);

  const totalPages = apiPagination ? apiPagination.totalPages : Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = apiPagination ? apiPagination.page : Math.min(page, totalPages);
  const pageRows = apiPagination ? sorted : sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "date" ? "desc" : "asc"); }
  }
  const visible = (k: ColKey) => !hidden.has(k);
  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? null : sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />;

  return (
    <div className="card" style={{ overflow: "visible" }}>
      <div className="card-header" style={{ flexWrap: "wrap", gap: 8 }}>
        <div className="tb-search" style={{ minWidth: 200, maxWidth: 280 }}>
          <Search size={14} className="tb-search-icon" />
          <input className="tb-search-input" placeholder="Search transactions…" value={search} onChange={(e) => { onSearch(e.target.value); if (!apiPagination) setPage(1); }} />
        </div>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto", position: "relative" }}>
          <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={() => setShowCols((s) => !s)}><Columns3 size={13} /> Columns</button>
          <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={() => onExport("excel")}><Download size={13} /> Export</button>
          {showCols && (
            <div style={{ position: "absolute", top: 36, right: 0, zIndex: 30, width: 200, background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "var(--shadow-lg)", padding: 8 }}>
              <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-3)", fontWeight: 600, padding: "4px 8px" }}>Toggle columns</div>
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
              {visible("date") && <th onClick={() => toggleSort("date")} style={{ cursor: "pointer" }}>Date <SortIcon k="date" /></th>}
              {visible("txnNo") && <th onClick={() => toggleSort("txnNo")} style={{ cursor: "pointer" }}>Txn No <SortIcon k="txnNo" /></th>}
              {visible("refNo") && <th>Reference</th>}
              {visible("type") && <th>Type</th>}
              {visible("description") && <th>Description</th>}
              {visible("category") && <th>Category</th>}
              {visible("customer") && <th>Customer</th>}
              {visible("employee") && <th>Employee</th>}
              {visible("debit") && <th className="th-right" onClick={() => toggleSort("debit")} style={{ cursor: "pointer" }}>Debit <SortIcon k="debit" /></th>}
              {visible("credit") && <th className="th-right" onClick={() => toggleSort("credit")} style={{ cursor: "pointer" }}>Credit <SortIcon k="credit" /></th>}
              {visible("balance") && <th className="th-right" onClick={() => toggleSort("balance")} style={{ cursor: "pointer" }}>Balance <SortIcon k="balance" /></th>}
              {visible("createdBy") && <th>Created By</th>}
              {visible("status") && <th>Status</th>}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr
                key={r.id}
                onClick={() => onRowClick(r)}
                style={
                  r.reversed ? { background: "rgba(200,16,46,0.04)" }
                  : r.adjusted ? { background: "rgba(255,107,0,0.05)" }
                  : undefined
                }
              >
                {visible("date") && <td className="cell-strong" style={{ whiteSpace: "nowrap" }}>{fmtDate(r.date)}</td>}
                {visible("txnNo") && (
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--caveo-red)", whiteSpace: "nowrap", textDecoration: r.reversed ? "line-through" : undefined }}>
                    {r.txnNo}
                    {r.adjusted && <span title="Adjusted" style={{ marginLeft: 5, color: "var(--ot-orange)" }}><Pencil size={10} style={{ display: "inline" }} /></span>}
                    {r.reversed && <span title="Reversed" style={{ marginLeft: 5, color: "var(--caveo-red)" }}><Undo2 size={10} style={{ display: "inline" }} /></span>}
                  </td>
                )}
                {visible("refNo") && <td style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--fg-3)" }}>{r.refNo || "—"}</td>}
                {visible("type") && <td><span className={`badge ${isCashCredit(r.type) ? "badge-success" : "badge-neutral"}`}>{r.type}</span></td>}
                {visible("description") && (
                  <td style={{ maxWidth: 230 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description}</div>
                    {(r.source || r.bankTransferRef) && (
                      <div className="cell-sub" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--caveo-red)" }}>
                        <Link2 size={11} /> {r.source ? r.source.label : r.bankTransferRef}
                      </div>
                    )}
                  </td>
                )}
                {visible("category") && <td className="cell-sub">{r.category || "—"}</td>}
                {visible("customer") && <td className="cell-sub">{r.customer || "—"}</td>}
                {visible("employee") && <td className="cell-sub">{r.employee || "—"}</td>}
                {visible("debit") && <td className="td-right" style={{ color: r.debit ? "var(--caveo-red)" : "var(--fg-4)", fontWeight: r.debit ? 600 : 400 }}>{fmtINRorDash(r.debit)}</td>}
                {visible("credit") && <td className="td-right" style={{ color: r.credit ? "var(--success)" : "var(--fg-4)", fontWeight: r.credit ? 600 : 400 }}>{fmtINRorDash(r.credit)}</td>}
                {visible("balance") && <td className="td-right cell-strong">{fmtINR(balanceById.get(r.id) ?? 0)}</td>}
                {visible("createdBy") && <td className="cell-sub" style={{ whiteSpace: "nowrap" }}>{r.createdBy}</td>}
                {visible("status") && (
                  <td>
                    <span className={`badge ${reconBadge(r.recon)}`}>{r.recon}</span>
                    {r.approval === "Pending" && <span className="badge badge-warning" style={{ marginLeft: 4 }}>Pending</span>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: 8 }}>
        {apiPagination ? (
          <>
            <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
              {apiPagination.total === 0 ? "0 results" : `Showing ${(apiPagination.page - 1) * apiPagination.pageSize + 1}–${Math.min(apiPagination.page * apiPagination.pageSize, apiPagination.total)} of ${apiPagination.total}`}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button className="btn-cav btn-cav-secondary btn-cav-sm" disabled={apiPagination.page <= 1} onClick={() => apiPagination.onPageChange(apiPagination.page - 1)} style={apiPagination.page <= 1 ? { opacity: 0.4 } : undefined}>Prev</button>
              <span style={{ fontSize: 12, color: "var(--fg-2)", fontWeight: 600 }}>{apiPagination.page} / {apiPagination.totalPages || 1}</span>
              <button className="btn-cav btn-cav-secondary btn-cav-sm" disabled={apiPagination.page >= apiPagination.totalPages} onClick={() => apiPagination.onPageChange(apiPagination.page + 1)} style={apiPagination.page >= apiPagination.totalPages ? { opacity: 0.4 } : undefined}>Next</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
              {sorted.length === 0 ? "0 results" : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, sorted.length)} of ${sorted.length}`}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button className="btn-cav btn-cav-secondary btn-cav-sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} style={safePage <= 1 ? { opacity: 0.4 } : undefined}>Prev</button>
              <span style={{ fontSize: 12, color: "var(--fg-2)", fontWeight: 600 }}>{safePage} / {totalPages}</span>
              <button className="btn-cav btn-cav-secondary btn-cav-sm" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} style={safePage >= totalPages ? { opacity: 0.4 } : undefined}>Next</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
