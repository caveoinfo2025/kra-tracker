"use client";

import { Building2, GitBranch, Layers, Users, Activity, CheckCircle, AlertCircle } from "lucide-react";
import type { OrgCompany, OrgBranch, OrgDepartment, OrgTeam, OrgDesignation } from "../data/organization.types";
import { fmtDate } from "../data/organization.types";

interface Props {
  companies: OrgCompany[];
  branches: OrgBranch[];
  departments: OrgDepartment[];
  teams: OrgTeam[];
  designations: OrgDesignation[];
}

export default function OrganizationOverview({ companies, branches, departments, teams, designations }: Props) {
  const activeCompanies  = companies.filter((c) => c.status === "ACTIVE").length;
  const activeBranches   = branches.filter((b) => b.status === "ACTIVE").length;
  const activeDepts      = departments.filter((d) => d.status === "ACTIVE").length;
  const totalEmployees   = companies.reduce((s, c) => s + (c.employeeCount ?? 0), 0);
  const activeTeams      = teams.filter((t) => t.status === "ACTIVE").length;
  const totalDesigs      = designations.filter((d) => d.status === "ACTIVE").length;

  const stats = [
    { label: "Companies",   value: activeCompanies,  sub: "registered",        color: "#0066FF", Icon: Building2 },
    { label: "Branches",    value: activeBranches,   sub: "active locations",  color: "#1F9D55", Icon: GitBranch },
    { label: "Departments", value: activeDepts,       sub: "functional units",  color: "#FF6B00", Icon: Layers    },
    { label: "Employees",   value: totalEmployees,   sub: "mapped to org",     color: "#C8102E", Icon: Users     },
  ];

  // Health checks
  const healthIssues: string[] = [];
  if (companies.some((c) => !c.gstNumber)) healthIssues.push("Some companies are missing GST numbers.");
  if (departments.some((d) => !d.code))    healthIssues.push("Some departments have no department code.");
  if (teams.some((t) => !t.teamLeadId))    healthIssues.push("Some teams have no assigned team lead.");
  const isHealthy = healthIssues.length === 0;

  // Recent changes (sorted by updatedAt)
  const allChanges = [
    ...companies.map((c)  => ({ label: `Company: ${c.companyName}`,        date: c.updatedAt, status: c.status })),
    ...branches.map((b)   => ({ label: `Branch: ${b.branchName} (${b.city})`, date: b.updatedAt, status: b.status })),
    ...departments.map((d)=> ({ label: `Department: ${d.name}`,              date: d.updatedAt, status: d.status })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {stats.map((s) => (
          <div key={s.label} className="kpi" style={{ borderLeft: `3px solid ${s.color}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <s.Icon size={14} style={{ color: s.color }} strokeWidth={2} />
              <span className="kpi-label">{s.label}</span>
            </div>
            <div className="kpi-value" style={{ fontSize: 28 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "var(--fg-4)", fontWeight: 500, marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Org health */}
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Activity size={14} strokeWidth={2} style={{ color: "var(--fg-3)" }} />
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--fg-4)" }}>
              Organization Health
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 14px", borderRadius: "var(--radius-md)", background: isHealthy ? "rgba(31,157,85,0.06)" : "rgba(255,107,0,0.06)", border: `1px solid ${isHealthy ? "rgba(31,157,85,0.2)" : "rgba(255,107,0,0.2)"}` }}>
            {isHealthy
              ? <CheckCircle size={16} style={{ color: "#1F9D55", flexShrink: 0 }} strokeWidth={2} />
              : <AlertCircle size={16} style={{ color: "#FF6B00", flexShrink: 0 }} strokeWidth={2} />}
            <span style={{ fontSize: 12.5, fontWeight: 600, color: isHealthy ? "#1F9D55" : "#FF6B00" }}>
              {isHealthy ? "All checks passed" : `${healthIssues.length} issue${healthIssues.length > 1 ? "s" : ""} detected`}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "Teams configured",   ok: activeTeams > 0,    val: `${activeTeams} active` },
              { label: "Designations set",   ok: totalDesigs > 0,    val: `${totalDesigs} titles` },
              { label: "GST numbers filled", ok: companies.every((c) => !!c.gstNumber), val: companies.every((c) => !!c.gstNumber) ? "All filled" : "Incomplete" },
              { label: "Team leads assigned",ok: !teams.some((t) => !t.teamLeadId), val: teams.some((t) => !t.teamLeadId) ? "Some missing" : "All assigned" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "var(--fg-3)" }}>{item.label}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: item.ok ? "#1F9D55" : "#FF6B00" }}>{item.val}</span>
              </div>
            ))}
            {healthIssues.map((issue, i) => (
              <div key={i} style={{ fontSize: 11.5, color: "#FF6B00", padding: "4px 8px", background: "rgba(255,107,0,0.06)", borderRadius: 4 }}>
                ↳ {issue}
              </div>
            ))}
          </div>
        </div>

        {/* Recent changes */}
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Activity size={14} strokeWidth={2} style={{ color: "var(--fg-3)" }} />
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--fg-4)" }}>
              Recently Modified
            </span>
          </div>

          {allChanges.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--fg-4)", textAlign: "center", padding: "24px 0" }}>
              No records yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {allChanges.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.status === "ACTIVE" ? "#1F9D55" : "var(--fg-4)", marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: "var(--fg-2)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 1 }}>{fmtDate(item.date)}</div>
                  </div>
                  <span className={`badge ${item.status === "ACTIVE" ? "badge-success" : "badge-neutral"}`} style={{ fontSize: 10, flexShrink: 0 }}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: "Active Teams",       value: activeTeams,  color: "#0066FF" },
          { label: "Active Designations",value: totalDesigs,  color: "#1F9D55" },
          { label: "Inactive Branches",  value: branches.filter((b) => b.status === "INACTIVE").length, color: "var(--fg-4)" },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
