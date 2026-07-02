/**
 * Organization Management — types and mock seed data.
 * Shape matches the Phase 2 Prisma models (Company, Branch, Department, Team, Designation).
 * Mock data is used as fallback when the DB migration has not been applied yet.
 */

// ── Core entity types ────────────────────────────────────────────────────────

export interface OrgCompany {
  id: number;
  tenantId: number;
  companyName: string;
  legalName: string;
  companyCode: string;
  gstNumber: string;
  panNumber: string;
  email: string;
  phone: string;
  website: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  // computed
  branchCount?: number;
  employeeCount?: number;
}

export interface OrgBranch {
  id: number;
  companyId: number;
  companyName?: string;
  branchName: string;
  branchCode: string;
  address: string;
  city: string;
  state: string;
  country: string;
  timezone: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  // computed
  employeeCount?: number;
}

export interface OrgDepartment {
  id: number;
  companyId: number;
  companyName?: string;
  name: string;
  code: string;
  description: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  // computed
  teamCount?: number;
  employeeCount?: number;
}

export interface OrgTeam {
  id: number;
  departmentId: number;
  departmentName?: string;
  name: string;
  teamLeadId: number | null;
  teamLeadName?: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  // computed
  memberCount?: number;
}

export interface OrgDesignation {
  id: number;
  companyId: number;
  companyName?: string;
  title: string;
  level: number;
  description: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  // computed
  employeeCount?: number;
}

export interface OrgEmployee {
  id: number;
  name: string;
  role: string;
  email: string;
}

// ── Overview stats ────────────────────────────────────────────────────────────

export interface OrgStats {
  totalCompanies: number;
  activeBranches: number;
  departments: number;
  employees: number;
}

// ── Audit record ─────────────────────────────────────────────────────────────

export type AuditAction = "CREATED" | "UPDATED" | "ACTIVATED" | "DEACTIVATED";

export interface OrgAuditRecord {
  id: number;
  entity: string;
  entityName: string;
  action: AuditAction;
  actor: string;
  date: string;
  oldValue?: string;
  newValue?: string;
}

// ── Tree node ─────────────────────────────────────────────────────────────────

export interface OrgTreeNode {
  id: string;
  label: string;
  type: "tenant" | "company" | "branch" | "department" | "team";
  status: "ACTIVE" | "INACTIVE";
  count?: number;
  children?: OrgTreeNode[];
}

// ── Mock data (fallback for pre-migration state) ──────────────────────────────

const NOW = new Date().toISOString();
const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString();
const LAST_WEEK = new Date(Date.now() - 7 * 86_400_000).toISOString();

export const MOCK_COMPANIES: OrgCompany[] = [
  {
    id: 1,
    tenantId: 1,
    companyName: "Caveo Infosystems",
    legalName: "Caveo Infosystems Pvt. Ltd.",
    companyCode: "CAVEO-HO",
    gstNumber: "33AABCC1234F1ZX",
    panNumber: "AABCC1234F",
    email: "info@caveoinfosystems.com",
    phone: "+91 44 0000 0000",
    website: "https://www.caveoinfosystems.com",
    status: "ACTIVE",
    createdAt: LAST_WEEK,
    updatedAt: YESTERDAY,
    branchCount: 3,
    employeeCount: 7,
  },
];

export const MOCK_BRANCHES: OrgBranch[] = [
  {
    id: 1,
    companyId: 1,
    companyName: "Caveo Infosystems",
    branchName: "Head Office",
    branchCode: "HO",
    address: "Plot 12, Mount Road",
    city: "Chennai",
    state: "Tamil Nadu",
    country: "India",
    timezone: "Asia/Kolkata",
    status: "ACTIVE",
    createdAt: LAST_WEEK,
    updatedAt: YESTERDAY,
    employeeCount: 5,
  },
  {
    id: 2,
    companyId: 1,
    companyName: "Caveo Infosystems",
    branchName: "Bangalore Office",
    branchCode: "BLR",
    address: "Koramangala, 5th Block",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    timezone: "Asia/Kolkata",
    status: "ACTIVE",
    createdAt: LAST_WEEK,
    updatedAt: LAST_WEEK,
    employeeCount: 1,
  },
  {
    id: 3,
    companyId: 1,
    companyName: "Caveo Infosystems",
    branchName: "Mumbai Office",
    branchCode: "MUM",
    address: "Andheri East",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    timezone: "Asia/Kolkata",
    status: "INACTIVE",
    createdAt: LAST_WEEK,
    updatedAt: NOW,
    employeeCount: 0,
  },
];

export const MOCK_DEPARTMENTS: OrgDepartment[] = [
  {
    id: 1,
    companyId: 1,
    companyName: "Caveo Infosystems",
    name: "Sales",
    code: "SALES",
    description: "CRM, pipeline and business development",
    status: "ACTIVE",
    createdAt: LAST_WEEK,
    updatedAt: LAST_WEEK,
    teamCount: 2,
    employeeCount: 4,
  },
  {
    id: 2,
    companyId: 1,
    companyName: "Caveo Infosystems",
    name: "Finance",
    code: "FIN",
    description: "Accounts, collections and expense management",
    status: "ACTIVE",
    createdAt: LAST_WEEK,
    updatedAt: LAST_WEEK,
    teamCount: 1,
    employeeCount: 2,
  },
  {
    id: 3,
    companyId: 1,
    companyName: "Caveo Infosystems",
    name: "Operations",
    code: "OPS",
    description: "Operations and HR",
    status: "ACTIVE",
    createdAt: LAST_WEEK,
    updatedAt: LAST_WEEK,
    teamCount: 1,
    employeeCount: 1,
  },
  {
    id: 4,
    companyId: 1,
    companyName: "Caveo Infosystems",
    name: "Pre-Sales",
    code: "PRESALES",
    description: "Technical pre-sales, solution engineering and demos",
    status: "ACTIVE",
    createdAt: LAST_WEEK,
    updatedAt: LAST_WEEK,
    teamCount: 1,
    employeeCount: 1,
  },
];

export const MOCK_TEAMS: OrgTeam[] = [
  {
    id: 1,
    departmentId: 1,
    departmentName: "Sales",
    name: "Enterprise Sales",
    teamLeadId: 2,
    teamLeadName: "Vijesh Vijayan",
    status: "ACTIVE",
    createdAt: LAST_WEEK,
    updatedAt: LAST_WEEK,
    memberCount: 3,
  },
  {
    id: 2,
    departmentId: 1,
    departmentName: "Sales",
    name: "SMB & Commercial Sales",
    teamLeadId: null,
    teamLeadName: undefined,
    status: "ACTIVE",
    createdAt: LAST_WEEK,
    updatedAt: LAST_WEEK,
    memberCount: 1,
  },
  {
    id: 3,
    departmentId: 2,
    departmentName: "Finance",
    name: "Accounts Team",
    teamLeadId: null,
    teamLeadName: undefined,
    status: "ACTIVE",
    createdAt: LAST_WEEK,
    updatedAt: LAST_WEEK,
    memberCount: 2,
  },
  {
    id: 4,
    departmentId: 3,
    departmentName: "Operations",
    name: "Operations Team",
    teamLeadId: 3,
    teamLeadName: "Deepak Sharma",
    status: "ACTIVE",
    createdAt: LAST_WEEK,
    updatedAt: LAST_WEEK,
    memberCount: 1,
  },
];

export const MOCK_DESIGNATIONS: OrgDesignation[] = [
  { id: 1, companyId: 1, companyName: "Caveo Infosystems", title: "CEO",              level: 100, description: "Chief Executive Officer",       status: "ACTIVE", createdAt: LAST_WEEK, updatedAt: LAST_WEEK, employeeCount: 0 },
  { id: 2, companyId: 1, companyName: "Caveo Infosystems", title: "Business Head",    level: 90,  description: "Organisation-wide head",        status: "ACTIVE", createdAt: LAST_WEEK, updatedAt: LAST_WEEK, employeeCount: 1 },
  { id: 3, companyId: 1, companyName: "Caveo Infosystems", title: "Sales Head",       level: 80,  description: "Head of Sales & CRM",           status: "ACTIVE", createdAt: LAST_WEEK, updatedAt: LAST_WEEK, employeeCount: 1 },
  { id: 4, companyId: 1, companyName: "Caveo Infosystems", title: "Finance Manager",  level: 70,  description: "Finance and accounts head",     status: "ACTIVE", createdAt: LAST_WEEK, updatedAt: LAST_WEEK, employeeCount: 1 },
  { id: 5, companyId: 1, companyName: "Caveo Infosystems", title: "Sales Manager",    level: 50,  description: "Territory and team management", status: "ACTIVE", createdAt: LAST_WEEK, updatedAt: LAST_WEEK, employeeCount: 1 },
  { id: 6, companyId: 1, companyName: "Caveo Infosystems", title: "Account Manager",  level: 40,  description: "Enterprise account ownership",  status: "ACTIVE", createdAt: LAST_WEEK, updatedAt: LAST_WEEK, employeeCount: 2 },
  { id: 7, companyId: 1, companyName: "Caveo Infosystems", title: "Operations Head",  level: 60,  description: "Operations and HR",             status: "ACTIVE", createdAt: LAST_WEEK, updatedAt: LAST_WEEK, employeeCount: 1 },
  { id: 8, companyId: 1, companyName: "Caveo Infosystems", title: "Pre-Sales Engineer", level: 30, description: "Technical pre-sales & demos",  status: "ACTIVE", createdAt: LAST_WEEK, updatedAt: LAST_WEEK, employeeCount: 1 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function statusBadge(status: string): string {
  return status === "ACTIVE" ? "badge-success" : "badge-neutral";
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function buildMockTree(
  companies: OrgCompany[],
  branches: OrgBranch[],
  departments: OrgDepartment[],
  teams: OrgTeam[],
): OrgTreeNode[] {
  return companies.map((co) => ({
    id: `co-${co.id}`,
    label: co.companyName,
    type: "company" as const,
    status: co.status,
    count: co.branchCount,
    children: branches
      .filter((b) => b.companyId === co.id)
      .map((br) => ({
        id: `br-${br.id}`,
        label: `${br.branchName} — ${br.city}`,
        type: "branch" as const,
        status: br.status,
        count: br.employeeCount,
        children: departments
          .filter((d) => d.companyId === co.id)
          .map((dept) => ({
            id: `dept-${dept.id}`,
            label: dept.name,
            type: "department" as const,
            status: dept.status,
            count: dept.teamCount,
            children: teams
              .filter((t) => t.departmentId === dept.id)
              .map((team) => ({
                id: `team-${team.id}`,
                label: team.name,
                type: "team" as const,
                status: team.status,
                count: team.memberCount,
              })),
          })),
      })),
  }));
}
