"use client";
import { useMemo, useState } from "react";
import { Search, ChevronUp, ChevronDown, Columns3, Download, Eye, Pencil, Ban, GitBranch } from "lucide-react";
import {
  Customer, CustomerCaps, primarySite, primaryContact, allGSTINs,
  statusBadge, gstStatusBadge, getParentName,
} from "../data";

type SortKey = "code" | "name" | "type" | "industry" | "location" | "status";
type SortDir = "asc" | "desc";

const ALL_COLUMNS = [
  { key: "code", label: "Customer Code" },
  { key: "name", label: "Customer Name" },
  { key: "industry", label: "Industry" },
  { key: "type", label: "Customer Type" },
  { key: "location", label: "Primary Location" },
  { key: "gstStatus", label: "GST Status" },
  { key: "sites", label: "Sites" },
  { key: "owner", label: "Account Manager" },
  { key: "status", label: "Status" },
] as const;
type ColKey = (typeof ALL_COLUMNS)[number]["key"];

const PAGE_SIZE = 10;

export default function CustomerTable({
  rows, allCustomers, caps, search,
  onView, onEdit, onDisable,
}: {
  rows: Customer[];
  allCustomers: Customer[];
  caps: CustomerCaps;
  search: string;
  onView: (c: Customer) => void;
  onEdit: (c: Customer) => void;
  onDisable: (ids: number[]) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("code");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [hidden, setHidden] = useState<Set<ColKey>>(new Set(["owner"]));
  const [showCols, setShowCols] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) =>
      [c.customerCode, c.legalName, c.tradeName, c.pan, c.industry, c.customerType,
        primarySite(c)?.city ?? "", primarySite(c)?.state ?? "", c.accountOwner]
        .some((s) => s.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    const arr = [...searched];
    arr.sort((a, b) => {
      let av: string, bv: string;
      switch (sortKey) {
        case "name": av = a.legalName; bv = b.legalName; break;
        case "type": av = a.customerType; bv = b.customerType; break;
        case "industry": av = a.industry; bv = b.industry; break;
        case "location": av = primarySite(a)?.city ?? ""; bv = primarySite(b)?.city ?? ""; break;
        case "status": av = a.status; bv = b.status; break;
        default: av = a.customerCode; bv = b.customerCode;
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [searched, sortKey, sortDir]);

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
    const head = ["Code", "Legal Name", "Trade Name", "Industry", "Type", "Location", "GST", "Sites", "Account Manager", "Status", "PAN"];
    const body = sorted.map((c) => {
      const ps = primarySite(c);
      return [c.customerCode, c.legalName, c.tradeName, c.industry, c.customerType, ps ? `${ps.city}, ${ps.state}` : "", ps?.gstStatus ?? "", c.sites.length, c.accountOwner, c.status, c.pan];
    });
    const esc = (v: string | number) => `<td>${String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</td>`;
    const html = `<table border="1"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map(esc).join("")}</tr>`).join("")}</tbody></table>`;
    const blob = new Blob([`﻿${html}`], { type: "application/vnd.ms-excel" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "CustomerMaster.xls"; a.click(); URL.revokeObjectURL(a.href);
  }

  return (
    <div className="card" style={{ overflow: "visible" }}>
      <div className="card-header" style={{ flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
          {sorted.length} customer{sorted.length !== 1 ? "s" : ""}
          {selected.size > 0 && ` · ${selected.size} selected`}
        </div>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto", position: "relative" }}>
          {caps.canDisable && selected.size > 0 && (
            <button className="btn-cav btn-cav-secondary btn-cav-sm" style={{ color: "var(--caveo-red)" }}
              onClick={() => { onDisable([...selected]); setSelected(new Set()); }}>
              <Ban size={13} /> Disable ({selected.size})
            </button>
          )}
          <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={() => setShowCols((s) => !s)}><Columns3 size={13} /> Columns</button>
          {caps.canExport && <button className="btn-cav btn-cav-secondary btn-cav-sm" onClick={handleExport}><Download size={13} /> Export</button>}
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

      <div style={{ overflowX: "auto" }}>
        <table className="crm-table">
          <thead>
            <tr>
              {caps.canDisable && <th style={{ width: 36 }}><input type="checkbox" style={{ accentColor: "var(--caveo-red)" }} checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))} onChange={toggleSelAll} /></th>}
              {visible("code") && <th onClick={() => toggleSort("code")} style={{ cursor: "pointer" }}>Code <SortIcon k="code" /></th>}
              {visible("name") && <th onClick={() => toggleSort("name")} style={{ cursor: "pointer" }}>Customer Name <SortIcon k="name" /></th>}
              {visible("industry") && <th onClick={() => toggleSort("industry")} style={{ cursor: "pointer" }}>Industry <SortIcon k="industry" /></th>}
              {visible("type") && <th onClick={() => toggleSort("type")} style={{ cursor: "pointer" }}>Type <SortIcon k="type" /></th>}
              {visible("location") && <th onClick={() => toggleSort("location")} style={{ cursor: "pointer" }}>Location <SortIcon k="location" /></th>}
              {visible("gstStatus") && <th>GST</th>}
              {visible("sites") && <th>Sites</th>}
              {visible("owner") && <th>Account Mgr</th>}
              {visible("status") && <th onClick={() => toggleSort("status")} style={{ cursor: "pointer" }}>Status <SortIcon k="status" /></th>}
              <th style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((c) => {
              const ps = primarySite(c);
              const gstSt = ps?.gstRegistered ? ps.gstStatus : null;
              return (
                <tr key={c.id} onClick={() => onView(c)} style={c.status === "Inactive" ? { opacity: 0.6 } : undefined}>
                  {caps.canDisable && <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.has(c.id)} style={{ accentColor: "var(--caveo-red)" }} onChange={() => toggleSel(c.id)} /></td>}
                  {visible("code") && <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--caveo-red)", whiteSpace: "nowrap" }}>{c.customerCode}</td>}
                  {visible("name") && (
                    <td>
                      <div className="cell-strong" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {c.parentId !== null && <GitBranch size={12} style={{ color: "var(--fg-4)" }} />}
                        {c.legalName}
                      </div>
                      {c.parentId !== null && <div className="cell-sub">↳ {getParentName(allCustomers, c.parentId)}</div>}
                      {c.parentId === null && c.tradeName !== c.legalName && <div className="cell-sub">{c.tradeName}</div>}
                    </td>
                  )}
                  {visible("industry") && <td className="cell-sub">{c.industry}</td>}
                  {visible("type") && <td><span className="badge badge-neutral" style={{ fontSize: 10 }}>{c.customerType}</span></td>}
                  {visible("location") && <td className="cell-sub">{ps ? `${ps.city}, ${ps.state}` : "—"}</td>}
                  {visible("gstStatus") && <td>{gstSt ? <span className={`badge ${gstStatusBadge(gstSt)}`} style={{ fontSize: 10 }}>{gstSt}</span> : <span className="badge badge-neutral" style={{ fontSize: 10 }}>No GST</span>}</td>}
                  {visible("sites") && <td style={{ textAlign: "center", fontSize: 13, fontWeight: 600 }}>{c.sites.length}</td>}
                  {visible("owner") && <td className="cell-sub">{c.accountOwner}</td>}
                  {visible("status") && <td><span className={`badge ${statusBadge(c.status)}`} style={{ fontSize: 10 }}>{c.status}</span></td>}
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button title="View" className="btn-cav btn-cav-ghost btn-cav-sm" style={{ padding: "4px 6px" }} onClick={() => onView(c)}><Eye size={13} /></button>
                      {caps.canEdit && <button title="Edit" className="btn-cav btn-cav-ghost btn-cav-sm" style={{ padding: "4px 6px" }} onClick={() => onEdit(c)}><Pencil size={13} /></button>}
                      {caps.canDisable && c.status !== "Inactive" && <button title="Disable" className="btn-cav btn-cav-ghost btn-cav-sm" style={{ padding: "4px 6px", color: "var(--caveo-red)" }} onClick={() => onDisable([c.id])}><Ban size={13} /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
          {sorted.length === 0 ? "0 results" : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, sorted.length)} of ${sorted.length}`}
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
