"use client";

import { useState } from "react";
import { Search, Check, X, Clock, RotateCcw } from "lucide-react";
import {
  ApprovalRequest, requestStatusBadge, priorityBadge, moduleBadge,
  MODULES, fmtDateTime, fmtINR,
} from "../data";

interface Props {
  requests: ApprovalRequest[];
}

export default function ApprovalHistoryPanel({ requests }: Props) {
  const [search, setSearch]   = useState("");
  const [module, setModule]   = useState("");
  const [status, setStatus]   = useState("");
  const [page,   setPage]     = useState(1);
  const PAGE_SIZE = 15;

  const completed = requests.filter((r) => r.status !== "Pending");

  const filtered = completed.filter((r) => {
    if (module && r.module !== module) return false;
    if (status && r.status !== status) return false;
    if (search &&
        !r.requestNo.toLowerCase().includes(search.toLowerCase()) &&
        !r.requestedBy.toLowerCase().includes(search.toLowerCase()) &&
        !r.workflowName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const STATUSES = ["Approved", "Rejected", "Escalated", "Withdrawn"];

  function ActionIcon({ action }: { action: string }) {
    if (action === "Approved")  return <Check  size={10} />;
    if (action === "Rejected")  return <X      size={10} />;
    if (action === "Escalated") return <RotateCcw size={10} />;
    return <Clock size={10} />;
  }

  function actionColor(action: string) {
    if (action === "Approved")  return "var(--success)";
    if (action === "Rejected")  return "var(--caveo-red)";
    if (action === "Escalated") return "var(--ot-orange)";
    return "var(--fg-4)";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Filters */}
      <div className="card" style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 200px" }}>
            <Search size={13} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--fg-4)" }} />
            <input
              placeholder="Search by request no., requester, workflow…"
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: 26, border: "1px solid var(--border)", borderRadius: 7, padding: "6px 10px 6px 26px", fontSize: 12.5, width: "100%", background: "var(--bg-elev)", color: "var(--fg-1)" }}
            />
          </div>
          <select value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }}
            style={{ border: "1px solid var(--border)", borderRadius: 7, padding: "6px 10px", fontSize: 12.5, background: "var(--bg-elev)", color: "var(--fg-1)" }}>
            <option value="">All Modules</option>
            {MODULES.map((m) => <option key={m}>{m}</option>)}
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            style={{ border: "1px solid var(--border)", borderRadius: 7, padding: "6px 10px", fontSize: 12.5, background: "var(--bg-elev)", color: "var(--fg-1)" }}>
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <span style={{ fontSize: 12, color: "var(--fg-4)", marginLeft: "auto" }}>{filtered.length} records</span>
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="crm-table">
          <thead>
            <tr>
              <th>Request No.</th>
              <th>Workflow</th>
              <th>Module</th>
              <th>Requested By</th>
              <th className="num">Amount</th>
              <th>Submitted</th>
              <th>Final Action</th>
              <th>Decided By</th>
              <th>Decided On</th>
              <th>Status</th>
              <th>Levels</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (
              <tr><td colSpan={11} style={{ textAlign: "center", padding: 32, color: "var(--fg-4)", fontSize: 13 }}>
                No history records found
              </td></tr>
            )}
            {paged.map((r) => {
              const last = r.history[r.history.length - 1];
              return (
                <tr key={r.id}>
                  <td>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--caveo-red)" }}>{r.requestNo}</span>
                  </td>
                  <td style={{ fontSize: 12.5, fontWeight: 500 }}>
                    {r.workflowName}
                    <div style={{ fontSize: 11, color: "var(--fg-4)", fontWeight: 400 }}>{r.transactionType}</div>
                  </td>
                  <td>
                    <span className={`badge ${moduleBadge(r.module)}`} style={{ fontSize: 10 }}>{r.module}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{r.requestedBy}</div>
                    <div style={{ fontSize: 11, color: "var(--fg-4)" }}>{r.requestedByDept}</div>
                  </td>
                  <td className="num" style={{ fontWeight: 600, fontSize: 13 }}>
                    {r.amount != null
                      ? (r.amountUnit === "%" ? `${r.amount}%` : fmtINR(r.amount))
                      : "—"}
                  </td>
                  <td style={{ fontSize: 12, color: "var(--fg-3)" }}>{fmtDateTime(r.submittedAt)}</td>
                  <td>
                    {last ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 18, height: 18, borderRadius: "50%", background: actionColor(last.action), display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
                          <ActionIcon action={last.action} />
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: actionColor(last.action) }}>{last.action}</span>
                      </div>
                    ) : "—"}
                  </td>
                  <td style={{ fontSize: 12, color: "var(--fg-3)" }}>{last?.approver ?? "—"}</td>
                  <td style={{ fontSize: 12, color: "var(--fg-3)" }}>{last ? fmtDateTime(last.date) : "—"}</td>
                  <td><span className={`badge ${requestStatusBadge(r.status)}`}>{r.status}</span></td>
                  <td style={{ fontSize: 12 }}>
                    <span style={{ fontWeight: 700 }}>{r.totalLevels}</span>
                    <span style={{ color: "var(--fg-4)" }}> level{r.totalLevels !== 1 ? "s" : ""}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderTop: "1px solid var(--border-subtle)", fontSize: 12, color: "var(--fg-3)" }}>
            <span>{filtered.length} records</span>
            <div style={{ display: "flex", gap: 4 }}>
              <button className="btn-cav btn-cav-secondary btn-cav-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>←</button>
              <span style={{ padding: "3px 8px" }}>Page {page} / {totalPages}</span>
              <button className="btn-cav btn-cav-secondary btn-cav-sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
