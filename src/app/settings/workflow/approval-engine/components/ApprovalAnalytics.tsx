"use client";

import { Workflow, ApprovalRequest, fmtINR } from "../data";

interface Props {
  workflows: Workflow[];
  requests: ApprovalRequest[];
}

export default function ApprovalAnalytics({ workflows, requests }: Props) {
  const approved  = requests.filter((r) => r.status === "Approved");
  const rejected  = requests.filter((r) => r.status === "Rejected");
  const pending   = requests.filter((r) => r.status === "Pending");
  const breached  = requests.filter((r) => r.breachedSLA);
  const escalated = requests.filter((r) => r.status === "Escalated");

  const totalMonetary = approved.filter((r) => r.amount != null && r.amountUnit !== "%")
    .reduce((s, r) => s + (r.amount ?? 0), 0);

  const approvalRate = requests.length > 0
    ? Math.round((approved.length / requests.filter((r) => r.status !== "Pending").length) * 100) || 0
    : 0;

  const avgLevels = workflows.length > 0
    ? (workflows.reduce((s, w) => s + w.levels.length, 0) / workflows.length).toFixed(1)
    : "0";

  const avgApprovalHrs = workflows.filter((w) => w.avgApprovalHours > 0);
  const avgTime = avgApprovalHrs.length > 0
    ? (avgApprovalHrs.reduce((s, w) => s + w.avgApprovalHours, 0) / avgApprovalHrs.length).toFixed(1)
    : "0";

  /* Module breakdown */
  const moduleMap: Record<string, { total: number; approved: number; rejected: number; pending: number }> = {};
  for (const r of requests) {
    if (!moduleMap[r.module]) moduleMap[r.module] = { total: 0, approved: 0, rejected: 0, pending: 0 };
    moduleMap[r.module].total++;
    if (r.status === "Approved")  moduleMap[r.module].approved++;
    else if (r.status === "Rejected") moduleMap[r.module].rejected++;
    else if (r.status === "Pending")  moduleMap[r.module].pending++;
  }
  const moduleStats = Object.entries(moduleMap).sort((a, b) => b[1].total - a[1].total);

  /* Approver workload */
  const approverMap: Record<string, number> = {};
  for (const r of requests) {
    if (r.status === "Pending") {
      approverMap[r.currentApprover] = (approverMap[r.currentApprover] ?? 0) + 1;
    }
  }
  const approverWorkload = Object.entries(approverMap).sort((a, b) => b[1] - a[1]);

  /* Priority breakdown */
  const priorities = ["Critical", "High", "Medium", "Low"] as const;
  const priorityMap = Object.fromEntries(priorities.map((p) => [
    p,
    { total: requests.filter((r) => r.priority === p).length,
      breached: requests.filter((r) => r.priority === p && r.breachedSLA).length }
  ]));

  const priorityColor: Record<string, string> = {
    Critical: "var(--caveo-red)",
    High:     "var(--ot-orange)",
    Medium:   "var(--fg-2)",
    Low:      "var(--fg-4)",
  };

  const maxModuleTotal = Math.max(...moduleStats.map((m) => m[1].total), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Top KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="kpi kpi-accent">
          <div className="kpi-label">Approval Rate</div>
          <div className="kpi-value" style={{ fontSize: 28 }}>{approvalRate}%</div>
          <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 4 }}>{approved.length} approved of {approved.length + rejected.length} closed</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Avg. Approval Time</div>
          <div className="kpi-value" style={{ fontSize: 28 }}>{avgTime}h</div>
          <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 4 }}>Across active workflows</div>
        </div>
        <div className={`kpi${breached.length > 0 ? " kpi-accent" : ""}`}>
          <div className="kpi-label">SLA Breach Rate</div>
          <div className="kpi-value" style={{ fontSize: 28 }}>
            {requests.length > 0 ? Math.round((breached.length / requests.length) * 100) : 0}%
          </div>
          <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 4 }}>{breached.length} of {requests.length} requests</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Monetary Approved</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{fmtINR(totalMonetary)}</div>
          <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 4 }}>Total approved value</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Module breakdown */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--fg-1)", marginBottom: 14 }}>Requests by Module</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {moduleStats.map(([mod, s]) => (
              <div key={mod}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                  <span style={{ fontWeight: 600, color: "var(--fg-1)" }}>{mod}</span>
                  <span style={{ color: "var(--fg-4)" }}>
                    <span style={{ color: "var(--success)", fontWeight: 700 }}>{s.approved}</span>
                    {" / "}
                    <span style={{ color: "var(--caveo-red)" }}>{s.rejected}</span>
                    {" / "}
                    <span style={{ color: "var(--fg-3)" }}>{s.pending} pending</span>
                  </span>
                </div>
                <div style={{ height: 6, background: "var(--bg-muted)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${(s.total / maxModuleTotal) * 100}%`,
                    background: s.approved > s.rejected ? "var(--success)" : "var(--caveo-red)",
                    borderRadius: 99,
                  }} />
                </div>
              </div>
            ))}
            {moduleStats.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--fg-4)", fontSize: 12, padding: 16 }}>No data</div>
            )}
          </div>
        </div>

        {/* Priority distribution */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--fg-1)", marginBottom: 14 }}>Priority Distribution</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {priorities.map((p) => {
              const s = priorityMap[p];
              return (
                <div key={p} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: priorityColor[p], flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-1)", width: 60 }}>{p}</span>
                  <div style={{ flex: 1, height: 6, background: "var(--bg-muted)", borderRadius: 99 }}>
                    <div style={{
                      height: "100%",
                      width: `${requests.length > 0 ? (s.total / requests.length) * 100 : 0}%`,
                      background: priorityColor[p],
                      borderRadius: 99,
                    }} />
                  </div>
                  <span style={{ fontSize: 12, color: "var(--fg-3)", width: 32, textAlign: "right" }}>{s.total}</span>
                  {s.breached > 0 && (
                    <span style={{ fontSize: 10, color: "var(--caveo-red)", background: "rgba(200,16,46,0.08)", borderRadius: 4, padding: "1px 5px" }}>
                      {s.breached} SLA
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Approver workload */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--fg-1)", marginBottom: 14 }}>Approver Workload (Pending)</div>
          {approverWorkload.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--fg-4)", fontSize: 12, padding: 16 }}>No pending requests</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {approverWorkload.map(([name, count]) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--bg-muted)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--fg-2)", flexShrink: 0 }}>
                    {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-1)" }}>{name}</div>
                    <div style={{ height: 4, background: "var(--bg-muted)", borderRadius: 99, marginTop: 4 }}>
                      <div style={{ height: "100%", width: `${(count / (approverWorkload[0]?.[1] ?? 1)) * 100}%`, background: count >= 3 ? "var(--caveo-red)" : "var(--ot-orange)", borderRadius: 99 }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: count >= 3 ? "var(--caveo-red)" : "var(--fg-2)" }}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Workflow performance */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--fg-1)", marginBottom: 14 }}>Workflow Performance</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {workflows.filter((w) => w.status === "Active").map((w) => (
              <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.name}</div>
                  <div style={{ fontSize: 11, color: "var(--fg-4)" }}>{w.module} · {w.levels.length} levels</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: w.pendingCount > 2 ? "var(--ot-orange)" : "var(--fg-2)" }}>
                    {w.pendingCount} pending
                  </div>
                  <div style={{ fontSize: 11, color: "var(--fg-4)" }}>
                    {w.avgApprovalHours > 0 ? `${w.avgApprovalHours}h avg` : "No data"}
                  </div>
                </div>
              </div>
            ))}
            {workflows.filter((w) => w.status === "Active").length === 0 && (
              <div style={{ textAlign: "center", color: "var(--fg-4)", fontSize: 12, padding: 16 }}>No active workflows</div>
            )}
          </div>
        </div>
      </div>

      {/* Summary table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", fontWeight: 700, fontSize: 13 }}>All-time Summary</div>
        <table className="crm-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th className="num">Count</th>
              <th className="num">% of Total</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: "Total Requests",     count: requests.length,  pct: 100 },
              { label: "Approved",           count: approved.length,  pct: Math.round((approved.length / Math.max(requests.length,1))*100) },
              { label: "Rejected",           count: rejected.length,  pct: Math.round((rejected.length / Math.max(requests.length,1))*100) },
              { label: "Pending",            count: pending.length,   pct: Math.round((pending.length / Math.max(requests.length,1))*100) },
              { label: "Escalated",          count: escalated.length, pct: Math.round((escalated.length / Math.max(requests.length,1))*100) },
              { label: "SLA Breached",       count: breached.length,  pct: Math.round((breached.length / Math.max(requests.length,1))*100) },
            ].map((row) => (
              <tr key={row.label}>
                <td style={{ fontSize: 13 }}>{row.label}</td>
                <td className="num" style={{ fontWeight: 700 }}>{row.count}</td>
                <td className="num" style={{ color: "var(--fg-3)" }}>{row.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
