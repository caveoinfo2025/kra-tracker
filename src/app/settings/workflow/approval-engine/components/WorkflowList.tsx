"use client";

import { useState } from "react";
import { Search, Plus, Copy, Power, Edit2, Eye, ChevronDown, ChevronUp } from "lucide-react";
import {
  Workflow, ApprovalCaps, workflowStatusBadge, moduleBadge, fmtDate,
  MODULES, WORKFLOW_STATUSES,
} from "../data";

interface Props {
  workflows: Workflow[];
  caps: ApprovalCaps;
  onView:    (w: Workflow) => void;
  onEdit:    (w: Workflow) => void;
  onClone:   (w: Workflow) => void;
  onToggle:  (w: Workflow) => void;
  onCreate:  () => void;
}

type SortKey = "name" | "module" | "triggerEvent" | "status" | "updatedAt" | "pendingCount";

export default function WorkflowList({ workflows, caps, onView, onEdit, onClone, onToggle, onCreate }: Props) {
  const [search,  setSearch]  = useState("");
  const [module,  setModule]  = useState("");
  const [status,  setStatus]  = useState("");
  const [sort,    setSort]    = useState<{ key: SortKey; dir: 1|-1 }>({ key: "name", dir: 1 });
  const [page,    setPage]    = useState(1);
  const PAGE_SIZE = 10;

  function toggleSort(key: SortKey) {
    setSort((s) => s.key === key ? { key, dir: (s.dir * -1) as 1|-1 } : { key, dir: 1 });
    setPage(1);
  }

  const filtered = workflows.filter((w) => {
    if (search && !w.name.toLowerCase().includes(search.toLowerCase()) &&
        !w.transactionType.toLowerCase().includes(search.toLowerCase())) return false;
    if (module && w.module !== module) return false;
    if (status && w.status !== status) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sort.key] as string | number;
    const bv = b[sort.key] as string | number;
    return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir;
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function SortIcon({ k }: { k: SortKey }) {
    if (sort.key !== k) return <ChevronDown size={10} style={{ opacity: 0.25 }} />;
    return sort.dir === 1 ? <ChevronUp size={10} /> : <ChevronDown size={10} />;
  }

  function Th({ label, k, right }: { label: string; k: SortKey; right?: boolean }) {
    return (
      <th onClick={() => toggleSort(k)} style={{ cursor: "pointer", userSelect: "none", textAlign: right ? "right" : "left" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>{label}<SortIcon k={k} /></span>
      </th>
    );
  }

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {/* Toolbar */}
      <div className="card-header">
        <div style={{ display: "flex", gap: 8, flex: 1, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 200px" }}>
            <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--fg-4)" }} />
            <input
              placeholder="Search workflows…"
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: 28, border: "1px solid var(--border)", borderRadius: 7, padding: "6px 10px 6px 28px", fontSize: 12.5, width: "100%", background: "var(--bg-elev)", color: "var(--fg-1)" }}
            />
          </div>
          <select value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }}
            style={{ border: "1px solid var(--border)", borderRadius: 7, padding: "6px 10px", fontSize: 12.5, background: "var(--bg-elev)", color: "var(--fg-1)" }}>
            <option value="">All Modules</option>
            {MODULES.map((m) => <option key={m}>{m}</option>)}
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            style={{ border: "1px solid var(--border)", borderRadius: 7, padding: "6px 10px", fontSize: 12.5, background: "var(--bg-elev)", color: "var(--fg-1)" }}>
            <option value="">All Status</option>
            {WORKFLOW_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        {caps.canConfigureWorkflows && (
          <button className="btn-cav btn-cav-primary btn-cav-sm" onClick={onCreate}>
            <Plus size={13} /> New Workflow
          </button>
        )}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="crm-table">
          <thead>
            <tr>
              <Th label="Workflow Name" k="name" />
              <Th label="Module" k="module" />
              <Th label="Trigger" k="triggerEvent" />
              <th>Levels</th>
              <Th label="Pending" k="pendingCount" right />
              <Th label="Status" k="status" />
              <th>Created By</th>
              <Th label="Last Modified" k="updatedAt" />
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: "32px", color: "var(--fg-4)", fontSize: 13 }}>No workflows found</td></tr>
            )}
            {paged.map((w) => (
              <tr key={w.id} style={{ cursor: "pointer" }} onClick={() => onView(w)}>
                <td style={{ fontWeight: 600 }}>
                  {w.name}
                  <div style={{ fontSize: 11, color: "var(--fg-4)", fontWeight: 400, marginTop: 1 }}>{w.transactionType}</div>
                </td>
                <td><span className={`badge ${moduleBadge(w.module)}`}>{w.module}</span></td>
                <td style={{ fontSize: 12, color: "var(--fg-2)" }}>{w.triggerEvent}</td>
                <td style={{ fontSize: 12 }}>
                  <span style={{ fontWeight: 700 }}>{w.levels.length}</span>
                  <span style={{ color: "var(--fg-4)", marginLeft: 3 }}>level{w.levels.length !== 1 ? "s" : ""}</span>
                </td>
                <td className="num">
                  {w.pendingCount > 0
                    ? <span style={{ fontWeight: 700, color: "var(--ot-orange)" }}>{w.pendingCount}</span>
                    : <span style={{ color: "var(--fg-4)" }}>—</span>}
                </td>
                <td><span className={`badge ${workflowStatusBadge(w.status)}`}>{w.status}</span></td>
                <td style={{ fontSize: 12, color: "var(--fg-3)" }}>{w.createdBy}</td>
                <td style={{ fontSize: 12, color: "var(--fg-3)" }}>{fmtDate(w.updatedAt)} <span style={{ color: "var(--fg-4)" }}>v{w.version}</span></td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className="btn-cav btn-cav-secondary btn-cav-sm" title="View" onClick={() => onView(w)}><Eye size={12} /></button>
                    {caps.canConfigureWorkflows && (
                      <>
                        <button className="btn-cav btn-cav-secondary btn-cav-sm" title="Edit" onClick={() => onEdit(w)}><Edit2 size={12} /></button>
                        <button className="btn-cav btn-cav-secondary btn-cav-sm" title="Clone" onClick={() => onClone(w)}><Copy size={12} /></button>
                        <button
                          className="btn-cav btn-cav-secondary btn-cav-sm"
                          title={w.status === "Active" ? "Disable" : "Enable"}
                          style={{ color: w.status === "Active" ? "var(--caveo-red)" : "var(--success)" }}
                          onClick={() => onToggle(w)}
                        ><Power size={12} /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderTop: "1px solid var(--border-subtle)", fontSize: 12, color: "var(--fg-3)" }}>
          <span>{filtered.length} workflows</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="btn-cav btn-cav-secondary btn-cav-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>←</button>
            <span style={{ padding: "3px 8px", fontSize: 12 }}>Page {page} / {totalPages}</span>
            <button className="btn-cav btn-cav-secondary btn-cav-sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>→</button>
          </div>
        </div>
      )}
    </div>
  );
}
