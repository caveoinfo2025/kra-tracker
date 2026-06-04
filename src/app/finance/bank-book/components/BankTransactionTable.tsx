"use client";
import { useMemo, useState } from "react";
import {
  Search, ChevronUp, ChevronDown, Columns3, Download, CheckCheck, Upload as UploadIcon, Link2,
} from "lucide-react";
import {
  BankTxn, BankCaps, fmtINRorDash, fmtINR, fmtDate, reconBadge, isCreditType,
} from "../data";

type SortKey = "date" | "txnNo" | "debit" | "credit" | "balance";
type SortDir = "asc" | "desc";

const ALL_COLUMNS = [
  { key: "date", label: "Date" },
  { key: "txnNo", label: "Transaction No" },
  { key: "refNo", label: "Reference No" },
  { key: "type", label: "Type" },
  { key: "description", label: "Description" },
  { key: "party", label: "Customer/Vendor" },
  { key: "mode", label: "Payment Mode" },
  { key: "debit", label: "Debit" },
  { key: "credit", label: "Credit" },
  { key: "balance", label: "Running Balance" },
  { key: "createdBy", label: "Created By" },
  { key: "status", label: "Status" },
] as const;
type ColKey = (typeof ALL_COLUMNS)[number]["key"];

const PAGE_SIZE = 8;

export default function BankTransactionTable({
  rows, balanceById, caps, onRowClick, onBulkReconcile, onExport,
}: {
  rows: BankTxn[];
  balanceById: Map<number, number>;
  caps: BankCaps;
  onRowClick: (t: BankTxn) => void;
  onBulkReconcile: (ids: number[]) => void;
  onExport: (kind: "excel" | "pdf") => void;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [hidden, setHidden] = useState<Set<ColKey>>(new Set(["refNo", "createdBy"]));
  const [showCols, setShowCols] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const canSelect = caps.canApproveRecon || caps.canEdit;

  // ── Search ──
  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.txnNo, r.refNo, r.type, r.description, r.party, r.mode, r.createdBy]
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [rows, search]);

  // ── Sort ──
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

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "date" ? "desc" : "asc"); }
  }

  function toggleSel(id: number) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleSelAll() {
    const ids = pageRows.map((r) => r.id);
    setSelected((s) => {
      const allOn = ids.every((id) => s.has(id));
      const n = new Set(s);
      ids.forEach((id) => (allOn ? n.delete(id) : n.add(id)));
      return n;
    });
  }

  const visible = (k: ColKey) => !hidden.has(k);
  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? null : sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />;

  return (
    <div className="card" style={{ overflow: "visible" }}>
      {/* Toolbar */}
      <div className="card-header" style={{ flexWrap: "wrap", gap: 8 }}>
        <div className="tb-search" style={{ minWidth: 200, maxWidth: 280 }}>
          <Search size={14} className="tb-search-icon" />
          <input
            className="tb-search-input"
            placeholder="Search transactions…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginLeft: "auto", position: "relative" }}>
          {canSelect && selected.size > 0 && caps.canApproveRecon && (
            <button
              className="btn-cav btn-cav-primary btn-cav-sm"
              onClick={() => { onBulkReconcile([...selected]); setSelected(new Set()); }}
            >
              <CheckCheck size={13} /> Mark Reconciled ({selected.size})
            </button>
          )}
          <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={() => setShowCols((s) => !s)}>
            <Columns3 size={13} /> Columns
          </button>
          <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={() => onExport("excel")}>
            <Download size={13} /> Export
          </button>

          {showCols && (
            <div
              style={{
                position: "absolute", top: 36, right: 0, zIndex: 30, width: 200,
                background: "var(--bg-elev)", border: "1px solid var(--border)",
                borderRadius: 10, boxShadow: "var(--shadow-lg)", padding: 8,
              }}
            >
              <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-3)", fontWeight: 600, padding: "4px 8px" }}>
                Toggle columns
              </div>
              {ALL_COLUMNS.map((c) => (
                <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", fontSize: 12.5, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={visible(c.key)}
                    onChange={() => setHidden((h) => { const n = new Set(h); n.has(c.key) ? n.delete(c.key) : n.add(c.key); return n; })}
                    style={{ accentColor: "var(--caveo-red)" }}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table className="crm-table">
          <thead>
            <tr>
              {canSelect && (
                <th style={{ width: 36 }}>
                  <input type="checkbox" onChange={toggleSelAll}
                    checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))}
                    style={{ accentColor: "var(--caveo-red)" }} />
                </th>
              )}
              {visible("date") && <th onClick={() => toggleSort("date")} style={{ cursor: "pointer" }}>Date <SortIcon k="date" /></th>}
              {visible("txnNo") && <th onClick={() => toggleSort("txnNo")} style={{ cursor: "pointer" }}>Txn No <SortIcon k="txnNo" /></th>}
              {visible("refNo") && <th>Reference</th>}
              {visible("type") && <th>Type</th>}
              {visible("description") && <th>Description</th>}
              {visible("party") && <th>Customer/Vendor</th>}
              {visible("mode") && <th>Mode</th>}
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
                style={r.imported ? { background: "rgba(0,102,255,0.035)" } : undefined}
              >
                {canSelect && (
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSel(r.id)} style={{ accentColor: "var(--caveo-red)" }} />
                  </td>
                )}
                {visible("date") && <td className="cell-strong" style={{ whiteSpace: "nowrap" }}>{fmtDate(r.date)}</td>}
                {visible("txnNo") && (
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--caveo-red)", whiteSpace: "nowrap" }}>
                    {r.txnNo}
                    {r.imported && <span title="Imported from statement" style={{ marginLeft: 5, color: "var(--infra-blue)" }}><UploadIcon size={11} style={{ display: "inline" }} /></span>}
                  </td>
                )}
                {visible("refNo") && <td style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--fg-3)" }}>{r.refNo}</td>}
                {visible("type") && (
                  <td><span className={`badge ${isCreditType(r.type) ? "badge-success" : "badge-neutral"}`}>{r.type}</span></td>
                )}
                {visible("description") && (
                  <td style={{ maxWidth: 240 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description}</div>
                    {r.source && (
                      <div className="cell-sub" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--caveo-red)" }}>
                        <Link2 size={11} /> {r.source.label}
                      </div>
                    )}
                  </td>
                )}
                {visible("party") && <td className="cell-sub">{r.party || "—"}</td>}
                {visible("mode") && <td className="cell-sub">{r.mode}</td>}
                {visible("debit") && <td className="td-right" style={{ color: r.debit ? "var(--caveo-red)" : "var(--fg-4)", fontWeight: r.debit ? 600 : 400 }}>{fmtINRorDash(r.debit)}</td>}
                {visible("credit") && <td className="td-right" style={{ color: r.credit ? "var(--success)" : "var(--fg-4)", fontWeight: r.credit ? 600 : 400 }}>{fmtINRorDash(r.credit)}</td>}
                {visible("balance") && <td className="td-right cell-strong">{fmtINR(balanceById.get(r.id) ?? 0)}</td>}
                {visible("createdBy") && <td className="cell-sub" style={{ whiteSpace: "nowrap" }}>{r.createdBy}</td>}
                {visible("status") && <td><span className={`badge ${reconBadge(r.recon)}`}>{r.recon}</span></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer: pagination */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
          {sorted.length === 0 ? "0 results" : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, sorted.length)} of ${sorted.length}`}
          {selected.size > 0 && ` · ${selected.size} selected`}
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
