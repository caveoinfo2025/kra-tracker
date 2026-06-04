// Types and mock data for the Identity & Access Management module.
// API shapes must match these types exactly when wired to the DB.

export type UserStatus        = "DRAFT" | "ACTIVE" | "SUSPENDED" | "INACTIVE";
export type RoleStatus        = "ACTIVE" | "INACTIVE";
export type DelegationStatus  = "ACTIVE" | "EXPIRED" | "CANCELLED";
export type DataScope         = "OWN" | "TEAM" | "DEPARTMENT" | "BRANCH" | "COMPANY" | "ALL";
export type AuditAction       =
  | "USER_CREATED" | "USER_DEACTIVATED" | "USER_SUSPENDED"
  | "ROLE_CREATED"  | "ROLE_MODIFIED"   | "ROLE_ASSIGNED" | "ROLE_REVOKED"
  | "PERMISSION_GRANTED" | "PERMISSION_REVOKED"
  | "POLICY_UPDATED" | "DELEGATION_ADDED" | "DELEGATION_CANCELLED";

export const ACTIONS_ALL = ["VIEW", "CREATE", "EDIT", "DELETE", "APPROVE", "EXPORT", "IMPORT", "ASSIGN"] as const;
export type PermissionAction = (typeof ACTIONS_ALL)[number];

export const SCOPE_RANK: Record<DataScope, number> = {
  OWN: 1, TEAM: 2, DEPARTMENT: 3, BRANCH: 4, COMPANY: 5, ALL: 6,
};

// ── User ──────────────────────────────────────────────────────────────────────

export interface IdentityUser {
  id:                    number;
  employeeCode:          string;
  name:                  string;
  email:                 string;
  mobile?:               string;
  legacyRole:            string;   // Employee.role (string)
  isManager:             boolean;
  companyName?:          string;
  branchName?:           string;
  departmentName?:       string;
  teamName?:             string;
  designationTitle?:     string;
  reportingManagerName?: string;
  employmentStatus:      UserStatus;
  assignedRoles:         Array<{ id: number; name: string }>;
  lastLoginAt?:          string;
}

// ── Role ──────────────────────────────────────────────────────────────────────

export interface IdentityRole {
  id:              number;
  name:            string;
  description:     string;
  level:           number;
  isSystemRole:    boolean;
  status:          RoleStatus;
  permissionCount: number;
  userCount:       number;
}

// ── Permission (single entry from the catalogue, with granted flag) ───────────

export interface PermissionEntry {
  id:          number;
  module:      string;
  resource:    string;
  action:      string;
  description: string;
  granted:     boolean;
}

// ── Data Access Policy ────────────────────────────────────────────────────────

export interface PolicyRow {
  id?:    number;
  module: string;
  scope:  DataScope;
}

// ── Delegation ────────────────────────────────────────────────────────────────

export interface DelegationRule {
  id:           number;
  fromUserId:   number;
  fromUserName: string;
  toUserId:     number;
  toUserName:   string;
  scope:        string;   // "all" or module name
  fromDate:     string;
  toDate:       string;
  reason:       string;
  status:       DelegationStatus;
}

// ── Audit ─────────────────────────────────────────────────────────────────────

export interface IdentityAuditRecord {
  id:        number;
  date:      string;
  actor:     string;
  action:    AuditAction;
  target:    string;
  oldValue?: string;
  newValue?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function userStatusBadge(s: UserStatus): string {
  return s === "ACTIVE" ? "badge-success" : s === "SUSPENDED" ? "badge-warning" : "badge-neutral";
}

export function roleStatusBadge(s: RoleStatus): string {
  return s === "ACTIVE" ? "badge-success" : "badge-neutral";
}

export function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
}

// ── Mock data (used as initial state + fallback before API responds) ───────────

export const MOCK_USERS: IdentityUser[] = [
  {
    id: 1, employeeCode: "EMP001", name: "Vijesh Vijayan", email: "vijesh@caveoinfosystems.com",
    legacyRole: "Head of Sales", isManager: true,
    companyName: "Caveo Infosystems", branchName: "Head Office",
    departmentName: "Sales", teamName: "Enterprise Sales", designationTitle: "Sales Head",
    employmentStatus: "ACTIVE", assignedRoles: [{ id: 3, name: "Sales Head" }],
    lastLoginAt: "2026-06-04T09:15:00Z",
  },
  {
    id: 2, employeeCode: "EMP002", name: "Deepak Sharma", email: "deepak@caveoinfosystems.com",
    legacyRole: "Operations Head", isManager: true,
    companyName: "Caveo Infosystems", branchName: "Head Office",
    departmentName: "Operations", designationTitle: "Operations Head",
    employmentStatus: "ACTIVE", assignedRoles: [{ id: 1, name: "Super Admin" }, { id: 2, name: "Business Head" }],
    lastLoginAt: "2026-06-03T14:30:00Z",
  },
  {
    id: 3, employeeCode: "EMP003", name: "Priya Nair", email: "priya@caveoinfosystems.com",
    legacyRole: "Account Manager", isManager: false,
    companyName: "Caveo Infosystems", branchName: "Head Office",
    departmentName: "Sales", teamName: "Enterprise Sales", designationTitle: "Account Manager",
    reportingManagerName: "Vijesh Vijayan",
    employmentStatus: "ACTIVE", assignedRoles: [{ id: 5, name: "Account Manager" }],
    lastLoginAt: "2026-06-04T08:00:00Z",
  },
  {
    id: 4, employeeCode: "EMP004", name: "Rahul Kumar", email: "rahul@caveoinfosystems.com",
    legacyRole: "Sales Manager", isManager: false,
    companyName: "Caveo Infosystems", branchName: "Head Office",
    departmentName: "Sales", designationTitle: "Sales Manager",
    reportingManagerName: "Vijesh Vijayan",
    employmentStatus: "ACTIVE", assignedRoles: [{ id: 4, name: "Sales Manager" }],
    lastLoginAt: "2026-06-02T11:00:00Z",
  },
  {
    id: 5, employeeCode: "EMP005", name: "Priyadharshini R", email: "priyadharshini@caveoinfosystems.com",
    legacyRole: "Finance Manager", isManager: false,
    companyName: "Caveo Infosystems", branchName: "Head Office",
    departmentName: "Finance", designationTitle: "Finance Manager",
    reportingManagerName: "Deepak Sharma",
    employmentStatus: "ACTIVE", assignedRoles: [{ id: 6, name: "Finance Manager" }],
    lastLoginAt: "2026-06-04T10:45:00Z",
  },
  {
    id: 6, employeeCode: "EMP006", name: "Sanjay Menon", email: "sanjay@caveoinfosystems.com",
    legacyRole: "Account Manager", isManager: false,
    companyName: "Caveo Infosystems", branchName: "Head Office",
    departmentName: "Sales", designationTitle: "Account Manager",
    reportingManagerName: "Vijesh Vijayan",
    employmentStatus: "SUSPENDED", assignedRoles: [{ id: 5, name: "Account Manager" }],
  },
  {
    id: 7, employeeCode: "EMP007", name: "Anjali Pillai", email: "anjali@caveoinfosystems.com",
    legacyRole: "Account Manager", isManager: false,
    companyName: "Caveo Infosystems", branchName: "Head Office",
    departmentName: "Sales", designationTitle: "Account Manager",
    reportingManagerName: "Vijesh Vijayan",
    employmentStatus: "DRAFT", assignedRoles: [],
  },
];

export const MOCK_ROLES: IdentityRole[] = [
  { id: 1, name: "Super Admin",     description: "Full system access — all modules, all actions, all scopes.", level: 100, isSystemRole: true,  status: "ACTIVE", permissionCount: 57, userCount: 1 },
  { id: 2, name: "Business Head",   description: "Company-wide visibility with approval authority.",           level: 90,  isSystemRole: true,  status: "ACTIVE", permissionCount: 45, userCount: 1 },
  { id: 3, name: "Sales Head",      description: "Full CRM access + team-wide report visibility.",            level: 70,  isSystemRole: true,  status: "ACTIVE", permissionCount: 28, userCount: 1 },
  { id: 4, name: "Sales Manager",   description: "Team-scoped CRM with lead/opportunity management.",         level: 50,  isSystemRole: true,  status: "ACTIVE", permissionCount: 18, userCount: 1 },
  { id: 5, name: "Account Manager", description: "Own-scoped CRM activity logging and lead management.",      level: 30,  isSystemRole: true,  status: "ACTIVE", permissionCount: 10, userCount: 3 },
  { id: 6, name: "Finance Manager", description: "Finance module with expense and voucher approval.",         level: 60,  isSystemRole: false, status: "ACTIVE", permissionCount: 22, userCount: 1 },
];

export const MOCK_POLICIES: Record<number, PolicyRow[]> = {
  1: [
    { module: "CRM",      scope: "ALL"        },
    { module: "Finance",  scope: "ALL"        },
    { module: "Settings", scope: "ALL"        },
    { module: "Reports",  scope: "ALL"        },
    { module: "Masters",  scope: "ALL"        },
    { module: "Workflow", scope: "ALL"        },
  ],
  2: [
    { module: "CRM",      scope: "COMPANY"    },
    { module: "Finance",  scope: "COMPANY"    },
    { module: "Reports",  scope: "COMPANY"    },
    { module: "Masters",  scope: "COMPANY"    },
  ],
  3: [
    { module: "CRM",      scope: "BRANCH"     },
    { module: "Finance",  scope: "BRANCH"     },
    { module: "Reports",  scope: "TEAM"       },
  ],
  4: [
    { module: "CRM",      scope: "TEAM"       },
    { module: "Reports",  scope: "TEAM"       },
  ],
  5: [
    { module: "CRM",      scope: "OWN"        },
    { module: "Reports",  scope: "OWN"        },
  ],
  6: [
    { module: "Finance",  scope: "DEPARTMENT" },
    { module: "Reports",  scope: "DEPARTMENT" },
  ],
};

export const MOCK_DELEGATIONS: DelegationRule[] = [
  {
    id: 1, fromUserId: 1, fromUserName: "Vijesh Vijayan", toUserId: 4, toUserName: "Rahul Kumar",
    scope: "CRM", fromDate: "2026-06-10", toDate: "2026-06-17",
    reason: "Annual leave — team coverage", status: "ACTIVE",
  },
  {
    id: 2, fromUserId: 2, fromUserName: "Deepak Sharma", toUserId: 1, toUserName: "Vijesh Vijayan",
    scope: "all", fromDate: "2026-05-20", toDate: "2026-05-27",
    reason: "Conference travel", status: "EXPIRED",
  },
];

export const MOCK_AUDIT: IdentityAuditRecord[] = [
  { id: 1, date: "2026-06-04T09:00:00Z", actor: "Vijesh Vijayan",   action: "ROLE_ASSIGNED",     target: "Priyadharshini R",  oldValue: "",                    newValue: "Finance Manager" },
  { id: 2, date: "2026-06-04T08:30:00Z", actor: "Deepak Sharma",   action: "PERMISSION_GRANTED", target: "Finance Manager",   oldValue: "",                    newValue: "Finance/Expense/APPROVE" },
  { id: 3, date: "2026-06-03T16:00:00Z", actor: "Deepak Sharma",   action: "USER_SUSPENDED",     target: "Sanjay Menon",      oldValue: "ACTIVE",              newValue: "SUSPENDED" },
  { id: 4, date: "2026-06-03T14:00:00Z", actor: "Vijesh Vijayan",   action: "ROLE_CREATED",       target: "Finance Manager",   oldValue: "",                    newValue: "level 60, non-system" },
  { id: 5, date: "2026-06-02T11:00:00Z", actor: "Deepak Sharma",   action: "DELEGATION_ADDED",   target: "Vijesh Vijayan",    oldValue: "",                    newValue: "CRM: 10–17 Jun 2026" },
  { id: 6, date: "2026-06-01T09:00:00Z", actor: "Deepak Sharma",   action: "USER_CREATED",       target: "Anjali Pillai",     oldValue: "",                    newValue: "DRAFT" },
];
