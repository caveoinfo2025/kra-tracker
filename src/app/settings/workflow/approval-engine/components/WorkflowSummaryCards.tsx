"use client";

import { Workflow, ApprovalRequest } from "../data";

interface Props {
  workflows: Workflow[];
  requests: ApprovalRequest[];
}

export default function WorkflowSummaryCards({ workflows, requests }: Props) {
  const active  = workflows.filter((w) => w.status === "Active").length;
  const pending = requests.filter((r) => r.status === "Pending").length;
  const breached = requests.filter((r) => r.breachedSLA).length;
  const escalated = requests.filter((r) => r.status === "Escalated").length;
  const avgTime = workflows.filter((w) => w.avgApprovalHours > 0)
    .reduce((s, w, _, a) => s + w.avgApprovalHours / a.length, 0);
  const approvedToday = requests.filter((r) =>
    r.status === "Approved" &&
    r.history.some((h) => h.action === "Approved" && h.date.startsWith("2026-06-04"))
  ).length;

  const cards = [
    { label: "Total Workflows",    value: workflows.length,        sub: `${active} active`,         accent: false },
    { label: "Active Workflows",   value: active,                  sub: "Running workflows",        accent: true },
    { label: "Pending Approvals",  value: pending,                 sub: "Across all modules",       accent: false },
    { label: "Avg. Approval Time", value: `${avgTime.toFixed(1)}h`,sub: "All active workflows",     accent: false },
    { label: "SLA Breached",       value: breached,                sub: "Need immediate attention", accent: breached > 0 },
    { label: "Escalations",        value: escalated,               sub: "Escalated today",          accent: escalated > 0 },
  ];

  return (
    <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
      {cards.map((c) => (
        <div key={c.label} className={`kpi${c.accent ? " kpi-accent" : ""}`}>
          <div className="kpi-label">{c.label}</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{c.value}</div>
          <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 4 }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
