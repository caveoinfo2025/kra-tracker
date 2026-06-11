"use client";

import { useState } from "react";
import { Search, AlertTriangle, Clock } from "lucide-react";
import {
  ApprovalRequest, ApprovalCaps, requestStatusBadge, priorityBadge, moduleBadge,
  REQUEST_STATUSES, MODULES, fmtDateTime, timeSince, fmtINR,
} from "../data";

interface Props {
  requests: ApprovalRequest[];
  caps: ApprovalCaps;
  onView:    (r: ApprovalRequest) => void;
  onApprove: (r: ApprovalRequest) => void;
  onReject:  (r: ApprovalRequest) => void;
}

type Segment = "pending" | "approved" | "rejected" | "overdue";

export default function ApprovalInbox({ requests, caps, onView, onApprove, onReject }: Props) {
  const [seg,    setSeg]    = useState<Segment>("pending");
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("");

  const today = "2026-06-04";

  const segmented = requests.filter((r) => {
    if (seg === "pending")  return r.status === "Pending";
    if (seg === "approved") return r.status === "Approved" && r.history.some((h) => h.action === "Approved" && h.date.startsWith(today));
    if (seg === "rejected") return r.status === "Rejected";
    if (seg === "overdue")  return r.breachedSLA && r.status === "Pending";
    return true;
  });

  const filtered = segmented.filter((r) => {
    if (module && r.module !== module) return false;
    if (search && !r.requestNo.toLowerCase().includes(search.toLowerCase()) &&
        !r.requestedBy.toLowerCase().includes(search.toLowerCase()) &&
        !r.transactionType.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    pending:  requests.filter((r) => r.status === "Pending").length,
    approved: requests.filter((r) => r.status === "Approved" && r.history.some((h) => h.action === "Approved" && h.date.startsWith(today))).length,
    rejected: requests.filter((r) => r.status === "Rejected").length,
    overdue:  requests.filter((r) => r.breachedSLA && r.status === "Pending").length,
  };

  const SEGMENTS: { key: Segment; label: string }[] = [
    { key: "pending",  label: `Pending (${counts.pending})` },
    { key: "approved", label: `Approved Today (${counts.approved})` },
    { key: "rejected", label: `Rejected (${counts.rejected})` },
    { key: "overdue",  label: `Overdue (${counts.overdue})` },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Segment + search */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div className="seg-control">
          {SEGMENTS.map((s) => (
            <button key={s.key} className={seg === s.key ? "active" : ""} data-testid={`approval-segment-${s.key}`} onClick={() => setSeg(s.key)}>
              {s.label}
              {s.key === "overdue" && counts.overdue > 0 && (
                <AlertTriangle size={10} style={{ marginLeft: 4, color: "var(--caveo-red)" }} />
              )}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--fg-4)" }} />
            <input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 26, border: "1px solid var(--border)", borderRadius: 7, padding: "6px 10px 6px 26px", fontSize: 12.5, background: "var(--bg-elev)", color: "var(--fg-1)", width: 180 }} />
          </div>
          <select value={module} onChange={(e) => setModule(e.target.value)}
            style={{ border: "1px solid var(--border)", borderRadius: 7, padding: "6px 10px", fontSize: 12.5, background: "var(--bg-elev)", color: "var(--fg-1)" }}>
            <option value="">All Modules</option>
            {MODULES.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="crm-table">
          <thead>
            <tr>
              <th>Request No.</th>
              <th>Module</th>
              <th>Requested By</th>
              <th>Details</th>
              <th className="num">Amount</th>
              <th>Submitted</th>
              <th>Pending Since</th>
              <th>SLA</th>
              <th>Priority</th>
              <th>Level</th>
              <th>Status</th>
              {caps.canApprove && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={12} style={{ textAlign: "center", padding: 32, color: "var(--fg-4)", fontSize: 13 }}>
                No {seg} requests
              </td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => onView(r)}>
                <td>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--caveo-red)" }}>{r.requestNo}</span>
                  {r.breachedSLA && r.status === "Pending" && (
                    <span className="badge badge-danger" style={{ fontSize: 9, marginLeft: 5 }}>SLA</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${moduleBadge(r.module)}`} style={{ fontSize: 10 }}>{r.module}</span>
                  <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 1 }}>{r.transactionType}</div>
                </td>
                <td>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{r.requestedBy}</div>
                  <div style={{ fontSize: 11, color: "var(--fg-4)" }}>{r.requestedByDept}</div>
                </td>
                <td style={{ maxWidth: 200 }}>
                  <div style={{ fontSize: 12.5, color: "var(--fg-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.details}</div>
                  {r.referenceId && <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 1 }}>{r.referenceId}</div>}
                </td>
                <td className="num" style={{ fontWeight: 600, fontSize: 13 }}>
                  {r.amount != null
                    ? (r.amountUnit === "%" ? `${r.amount}%` : fmtINR(r.amount))
                    : "—"}
                </td>
                <td style={{ fontSize: 12, color: "var(--fg-3)" }}>{fmtDateTime(r.submittedAt)}</td>
                <td style={{ fontSize: 12, color: r.breachedSLA && r.status === "Pending" ? "var(--caveo-red)" : "var(--fg-3)" }}>
                  {r.status === "Pending" ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={11} /> {timeSince(r.submittedAt)}
                    </span>
                  ) : "—"}
                </td>
                <td>
                  {r.breachedSLA
                    ? <span className="badge badge-danger" style={{ fontSize: 10 }}>Breached</span>
                    : r.slaDeadline
                      ? <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{fmtDateTime(r.slaDeadline)}</span>
                      : <span style={{ fontSize: 11, color: "var(--fg-4)" }}>—</span>}
                </td>
                <td><span className={`badge ${priorityBadge(r.priority)}`}>{r.priority}</span></td>
                <td style={{ fontSize: 12 }}>
                  <span style={{ fontWeight: 700 }}>{r.currentLevel}</span>
                  <span style={{ color: "var(--fg-4)" }}>/{r.totalLevels}</span>
                </td>
                <td><span className={`badge ${requestStatusBadge(r.status)}`}>{r.status}</span></td>
                {caps.canApprove && (
                  <td onClick={(e) => e.stopPropagation()}>
                    {r.status === "Pending" && r.currentApprover === caps.currentUser ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          data-testid={`approval-quick-approve-${r.id}`}
                          className="btn-cav btn-cav-sm"
                          style={{ background: "var(--success)", color: "#fff", border: "none", fontSize: 11, padding: "3px 9px", borderRadius: 5 }}
                          onClick={() => onApprove(r)}>✓</button>
                        <button
                          data-testid={`approval-quick-reject-${r.id}`}
                          className="btn-cav btn-cav-sm"
                          style={{ color: "var(--caveo-red)", borderColor: "rgba(200,16,46,0.3)", fontSize: 11, padding: "3px 9px", borderRadius: 5 }}
                          onClick={() => onReject(r)}>✗</button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--fg-4)" }}>—</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
