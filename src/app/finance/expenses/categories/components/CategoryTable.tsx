"use client";
import { useMemo, useState } from "react";
import {
  Search, ChevronUp, ChevronDown, Columns3, Download,
  Eye, Pencil, Ban, FolderPlus,
} from "lucide-react";
import {
  ExpenseCategory, CatCaps, USAGE_KEYS, USAGE_SHORT, statusBadge, getParentName, fmtDate,
} from "../data";

type SortKey = "code" | "name" | "parent" | "status" | "createdAt";
type SortDir = "asc" | "desc";

const ALL_COLUMNS = [
  { key: "code", label: "Category Code" },
  { key: "name", label: "Category Name" },
  { key: "parent", label: "Parent Category" },
  { key: "usage", label: "Expense Type" },
  { key: "gst", label: "GST" },
  { key: "approval", label: "Approval" },
  { key: "tally", label: "Tally Ledger" },
  { key: "status", label: "Status" },
  { key: "createdBy", label: "Created By" },
] as const;
type ColKey = (typeof ALL_COLUMNS)[number]["key"];

const PAGE_SIZE = 10;

export default function CategoryTable({
  rows, allCats, caps,
  onView, onEdit, onDisable, onAddSub,
}: {
  rows: ExpenseCategory[];
  allCats: ExpenseCategory[];
  caps: CatCaps;
  onView: (c: ExpenseCategory) => void;
  onEdit: (c: ExpenseCategory) => void;
  onDisable: (ids: number[]) => void;
  onAddSub: (parent: ExpenseCategory) => void;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("code");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [hidden, setHidden] = useState<Set<ColKey>>(new Set(["createdBy"]));
  const [showCols, setShowCols] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.code, r.name, r.description, r.tallyLedger, getParentName(allCats, r.parentId)]
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [rows, search, allCats]);

  const sorted = useMemo(() => {
    const arr = [...searched];
    arr.sort((a, b) => {
      let av: string, bv: string;
      switch (sortKey) {
        case "name": av = a.name; bv = b.name; break;
        case "parent": av = getParentName(allCats, a.parentId); bv = getParentName(allCats, b.parentId); break;
        case "status": av = a.status; bv = b.status; break;
        case "createdAt": av = a.createdAt; bv = b.createdAt; break;
        default: av = a.code; bv = b.code;
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [searched, sortKey, sortDir, allCats]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
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

  function handleExport() {
    const head = ["Code", "Name", "Parent", "Usage", "GST", "Approval", "Tally Ledger", "Status", "Created By", "Created At"];
    const body = sorted.map((r) => [
      r.code, r.name, getParentName(allCats, r.parentId),
      USAGE_KEYS.filter((k) => r[k]).map((k) => USAGE_SHORT[k]).join(", "),
      r.gstEnabled ? `Yes (${r.gstRate}%)` : "No",
      r.approvalRequired ? "Yes" : "No",
      r.tallyLedger, r.status, r.createdBy, fmtDate(r.createdAt),
    ]);
    const esc = (v: string) => `<td>${String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</td>`;
    const html = `<table border="1"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map(esc).join("")}</tr>`).join("")}</tbody></table>`;
    const blob = new Blob([`﻿${html}`], { type: "application/vnd.ms-excel" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ExpenseCategories.xls"; a.click(); URL.revokeObjectURL(a.href);
  }

  return (
    <div className="card" style={{ overflow: "visible" }}>
      {/* Toolbar */}
      <div className="card-header" style={{ flexWrap: "wrap", gap: 8 }}>
        <div className="tb-search" style={{ minWidth: 200, maxWidth: 300 }}>
          <Search size={14} className="tb-search-icon" />
          <input
            className="tb-search-input"
            placeholder="Search categories…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto", position: "relative" }}>
          {caps.canDisable && selected.size > 0 && (
            <button
              className="btn-cav btn-cav-secondary btn-cav-sm"
              style={{ color: "var(--caveo-red)" }}
              onClick={() => { onDisable([...selected]); setSelected(new Set()); }}
            >
              <Ban size={13} /> Disable ({selected.size})
            </button>
          )}
          <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={() => setShowCols((s) => !s)}>
            <Columns3 size={13} /> Columns
          </button>
          {caps.canExport && (
            <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={handleExport}>
              <Download size={13} /> Export
            </button>
          )}
          {showCols && (
            <div style={{ position: "absolute", top: 36, right: 0, zIndex: 30, width: 200, background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "var(--shadow-lg)", padding: 8 }}>
              <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-3)", fontWeight: 600, padding: "4px 8px" }}>Toggle columns</div>
              {ALL_COLUMNS.map((c) => (
                <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", fontSize: 12.5, cursor: "pointer" }}>
                  <input type="checkbox" checked={visible(c.key)} style={{ accentColor: "var(--caveo-red)" }}
                    onChange={() => setHidden((h) => { const n = new Set(h); n.has(c.key) ? n.delete(c.key) : n.add(c.key); return n; })} />
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
              {caps.canDisable && (
                <th style={{ width: 36 }}>
                  <input type="checkbox" style={{ accentColor: "var(--caveo-red)" }}
                    checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))}
                    onChange={toggleSelAll} />
                </th>
              )}
              {visible("code") && <th onClick={() => toggleSort("code")} style={{ cursor: "pointer" }}>Code <SortIcon k="code" /></th>}
              {visible("name") && <th onClick={() => toggleSort("name")} style={{ cursor: "pointer" }}>Name <SortIcon k="name" /></th>}
              {visible("parent") && <th onClick={() => toggleSort("parent")} style={{ cursor: "pointer" }}>Parent <SortIcon k="parent" /></th>}
              {visible("usage") && <th>Expense Type</th>}
              {visible("gst") && <th>GST</th>}
              {visible("approval") && <th>Approval</th>}
              {visible("tally") && <th>Tally Ledger</th>}
              {visible("status") && <th onClick={() => toggleSort("status")} style={{ cursor: "pointer" }}>Status <SortIcon k="status" /></th>}
              {visible("createdBy") && <th>Created By</th>}
              <th style={{ width: 130 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => {
              const usages = USAGE_KEYS.filter((k) => r[k]);
              const isParent = r.parentId === null;
              return (
                <tr key={r.id} onClick={() => onView(r)} style={r.status === "Inactive" ? { opacity: 0.6 } : undefined}>
                  {caps.canDisable && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(r.id)} style={{ accentColor: "var(--caveo-red)" }}
                        onChange={() => toggleSel(r.id)} />
                    </td>
                  )}
                  {visible("code") && (
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--caveo-red)", whiteSpace: "nowrap" }}>
                      {r.code}
                    </td>
                  )}
                  {visible("name") && (
                    <td className="cell-strong">
                      {r.parentId !== null && <span style={{ color: "var(--fg-4)", marginRight: 6 }}>↳</span>}
                      {r.name}
                    </td>
                  )}
                  {visible("parent") && (
                    <td className="cell-sub">
                      {isParent ? <span className="badge badge-neutral" style={{ fontSize: 10 }}>Parent</span> : getParentName(allCats, r.parentId)}
                    </td>
                  )}
                  {visible("usage") && (
                    <td>
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                        {usages.slice(0, 3).map((k) => (
                          <span key={k} className="badge badge-neutral" style={{ fontSize: 10 }}>{USAGE_SHORT[k]}</span>
                        ))}
                        {usages.length > 3 && <span className="badge badge-neutral" style={{ fontSize: 10 }}>+{usages.length - 3}</span>}
                      </div>
                    </td>
                  )}
                  {visible("gst") && (
                    <td>
                      {r.gstEnabled
                        ? <span className="badge badge-success" style={{ fontSize: 10 }}>{r.gstRate}%</span>
                        : <span className="badge badge-neutral" style={{ fontSize: 10 }}>No</span>}
                    </td>
                  )}
                  {visible("approval") && (
                    <td>
                      {r.approvalRequired
                        ? <span className="badge badge-warning" style={{ fontSize: 10 }}>Required</span>
                        : <span className="badge badge-neutral" style={{ fontSize: 10 }}>—</span>}
                    </td>
                  )}
                  {visible("tally") && (
                    <td className="cell-sub" style={{ maxWidth: 160 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.tallyLedger || "—"}</div>
                    </td>
                  )}
                  {visible("status") && (
                    <td><span className={`badge ${statusBadge(r.status)}`} style={{ fontSize: 10 }}>{r.status}</span></td>
                  )}
                  {visible("createdBy") && <td className="cell-sub" style={{ whiteSpace: "nowrap" }}>{r.createdBy}</td>}
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button title="View" className="btn-cav btn-cav-ghost btn-cav-sm" style={{ padding: "4px 6px" }} onClick={() => onView(r)}><Eye size={13} /></button>
                      {caps.canEdit && <button title="Edit" className="btn-cav btn-cav-ghost btn-cav-sm" style={{ padding: "4px 6px" }} onClick={() => onEdit(r)}><Pencil size={13} /></button>}
                      {caps.canDisable && r.status === "Active" && <button title="Disable" className="btn-cav btn-cav-ghost btn-cav-sm" style={{ padding: "4px 6px", color: "var(--caveo-red)" }} onClick={() => onDisable([r.id])}><Ban size={13} /></button>}
                      {caps.canCreate && isParent && <button title="Add Sub Category" className="btn-cav btn-cav-ghost btn-cav-sm" style={{ padding: "4px 6px" }} onClick={() => onAddSub(r)}><FolderPlus size={13} /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer: count + pagination */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
          {sorted.length === 0 ? "0 results" : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, sorted.length)} of ${sorted.length}`}
          {selected.size > 0 && ` · ${selected.size} selected`}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button className="btn-cav btn-cav-secondary btn-cav-sm" disabled={safePage <= 1} style={safePage <= 1 ? { opacity: 0.4 } : undefined} onClick={() => setPage(safePage - 1)}>Prev</button>
          <span style={{ fontSize: 12, color: "var(--fg-2)", fontWeight: 600 }}>{safePage} / {totalPages}</span>
          <button className="btn-cav btn-cav-secondary btn-cav-sm" disabled={safePage >= totalPages} style={safePage >= totalPages ? { opacity: 0.4 } : undefined} onClick={() => setPage(safePage + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
