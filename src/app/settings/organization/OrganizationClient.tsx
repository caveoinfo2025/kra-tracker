"use client";

import { useState, useEffect, useCallback } from "react";
import { Building2, GitBranch, Layers, Users, Award, Network, ClipboardList, LayoutDashboard, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { OrgCompany, OrgBranch, OrgDepartment, OrgTeam, OrgDesignation, OrgEmployee } from "./data/organization.types";
import { MOCK_COMPANIES, MOCK_BRANCHES, MOCK_DEPARTMENTS, MOCK_TEAMS, MOCK_DESIGNATIONS, MOCK_EMPLOYEES } from "./data/organization.types";
import OrganizationOverview    from "./components/OrganizationOverview";
import CompanyManagement       from "./components/CompanyManagement";
import BranchManagement        from "./components/BranchManagement";
import DepartmentManagement    from "./components/DepartmentManagement";
import TeamManagement          from "./components/TeamManagement";
import DesignationManagement   from "./components/DesignationManagement";
import OrganizationTree        from "./components/OrganizationTree";
import OrganizationAudit       from "./components/OrganizationAudit";

type TabId = "overview" | "companies" | "branches" | "departments" | "teams" | "designations" | "hierarchy" | "audit";

interface TabDef {
  id: TabId;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
}

const TABS: TabDef[] = [
  { id: "overview",      label: "Overview",      Icon: LayoutDashboard },
  { id: "companies",     label: "Companies",     Icon: Building2        },
  { id: "branches",      label: "Branches",      Icon: GitBranch        },
  { id: "departments",   label: "Departments",   Icon: Layers           },
  { id: "teams",         label: "Teams",         Icon: Users            },
  { id: "designations",  label: "Designations",  Icon: Award            },
  { id: "hierarchy",     label: "Hierarchy",     Icon: Network          },
  { id: "audit",         label: "Audit",         Icon: ClipboardList    },
];

interface Props {
  canEdit: boolean;
}

export default function OrganizationClient({ canEdit }: Props) {
  const [activeTab, setActiveTab]     = useState<TabId>("overview");
  const [companies, setCompanies]     = useState<OrgCompany[]>(MOCK_COMPANIES);
  const [branches, setBranches]       = useState<OrgBranch[]>(MOCK_BRANCHES);
  const [departments, setDepartments] = useState<OrgDepartment[]>(MOCK_DEPARTMENTS);
  const [teams, setTeams]             = useState<OrgTeam[]>(MOCK_TEAMS);
  const [designations, setDesigs]     = useState<OrgDesignation[]>(MOCK_DESIGNATIONS);
  const [employees]                   = useState<OrgEmployee[]>(MOCK_EMPLOYEES);

  // Load all data once on mount (all tabs share this data for cross-selects)
  const loadAll = useCallback(async () => {
    const safeJson = async (url: string) => {
      try { const r = await fetch(url); return r.ok ? r.json() : null; }
      catch { return null; }
    };
    const [cos, brs, depts, tms, desgs] = await Promise.all([
      safeJson("/api/settings/organization/companies"),
      safeJson("/api/settings/organization/branches"),
      safeJson("/api/settings/organization/departments"),
      safeJson("/api/settings/organization/teams"),
      safeJson("/api/settings/organization/designations"),
    ]);
    if (cos)   setCompanies(cos);
    if (brs)   setBranches(brs);
    if (depts) setDepartments(depts);
    if (tms)   setTeams(tms);
    if (desgs) setDesigs(desgs);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  return (
    <div style={{ maxWidth: 1180, padding: "28px 32px" }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Link href="/settings" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--fg-4)" }}>
            <ArrowLeft size={12} strokeWidth={2} /> Admin Console
          </Link>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "rgba(0,102,255,0.09)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 size={19} strokeWidth={1.6} style={{ color: "#0066FF" }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--fg-1)", fontFamily: "var(--font-display)" }}>
                Organization Management
              </h1>
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--fg-3)", marginTop: 3 }}>
                Company hierarchy, branches, departments, teams and designations
              </p>
            </div>
          </div>
          {!canEdit && (
            <div style={{ padding: "6px 12px", background: "var(--bg-muted)", borderRadius: "var(--radius-md)", fontSize: 11.5, color: "var(--fg-4)", border: "1px solid var(--border)" }}>
              View-only mode
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--border)", marginBottom: 24, overflowX: "auto" as const }}>
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 14px",
                border: "none",
                borderBottom: active ? "2px solid var(--caveo-red)" : "2px solid transparent",
                background: "transparent",
                fontSize: 12.5,
                fontWeight: active ? 700 : 500,
                color: active ? "var(--caveo-red)" : "var(--fg-3)",
                cursor: "pointer",
                whiteSpace: "nowrap" as const,
                transition: "color var(--duration-fast)",
                marginBottom: -1,
              }}
            >
              <Icon size={13} strokeWidth={2} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "overview" && (
          <OrganizationOverview
            companies={companies}
            branches={branches}
            departments={departments}
            teams={teams}
            designations={designations}
          />
        )}
        {activeTab === "companies" && (
          <CompanyManagement canEdit={canEdit} />
        )}
        {activeTab === "branches" && (
          <BranchManagement canEdit={canEdit} companies={companies} />
        )}
        {activeTab === "departments" && (
          <DepartmentManagement canEdit={canEdit} companies={companies} onRefresh={loadAll} />
        )}
        {activeTab === "teams" && (
          <TeamManagement canEdit={canEdit} departments={departments} employees={employees} />
        )}
        {activeTab === "designations" && (
          <DesignationManagement canEdit={canEdit} companies={companies} />
        )}
        {activeTab === "hierarchy" && (
          <OrganizationTree companies={companies} branches={branches} departments={departments} teams={teams} />
        )}
        {activeTab === "audit" && (
          <OrganizationAudit />
        )}
      </div>
    </div>
  );
}
