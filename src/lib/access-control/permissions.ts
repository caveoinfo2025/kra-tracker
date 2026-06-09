/**
 * Canonical permission catalogue.
 *
 * Every combination of (MODULE, RESOURCE, ACTION) in this file is the
 * single source of truth for what gets seeded into the `Permission` table
 * and what callers pass to `hasPermission()`.
 *
 * Naming conventions:
 *   MODULE   — PascalCase, matches `Permission.module` in the DB.
 *   RESOURCE — PascalCase, matches `Permission.resource`.
 *   ACTION   — UPPER_SNAKE, matches `Permission.action`.
 */

export const MODULE = {
  CRM:      "CRM",
  FINANCE:  "Finance",
  WORKFLOW: "Workflow",
  SETTINGS: "Settings",
  REPORTS:  "Reports",
  MASTERS:  "Masters",
} as const;

export type Module = (typeof MODULE)[keyof typeof MODULE];

export const ACTION = {
  VIEW:    "VIEW",
  CREATE:  "CREATE",
  EDIT:    "EDIT",
  DELETE:  "DELETE",
  APPROVE: "APPROVE",
  EXPORT:  "EXPORT",
  IMPORT:  "IMPORT",
  ASSIGN:  "ASSIGN",
} as const;

export type Action = (typeof ACTION)[keyof typeof ACTION];

export const SCOPE = {
  OWN:        "OWN",
  TEAM:       "TEAM",
  DEPARTMENT: "DEPARTMENT",
  BRANCH:     "BRANCH",
  COMPANY:    "COMPANY",
  ALL:        "ALL",
} as const;

export type Scope = (typeof SCOPE)[keyof typeof SCOPE];

/** All (module, resource, action) triples that should exist in the DB. */
export interface PermissionDef {
  module:      Module;
  resource:    string;
  action:      Action;
  description: string;
}

export const PERMISSION_CATALOGUE: PermissionDef[] = [
  // ── CRM ──────────────────────────────────────────────────────────────────
  { module: "CRM", resource: "Lead",        action: "VIEW",    description: "View CRM leads" },
  { module: "CRM", resource: "Lead",        action: "CREATE",  description: "Create CRM leads" },
  { module: "CRM", resource: "Lead",        action: "EDIT",    description: "Edit CRM leads" },
  { module: "CRM", resource: "Lead",        action: "DELETE",  description: "Delete CRM leads" },
  { module: "CRM", resource: "Lead",        action: "ASSIGN",  description: "Assign leads to reps" },
  { module: "CRM", resource: "Opportunity", action: "VIEW",    description: "View opportunities" },
  { module: "CRM", resource: "Opportunity", action: "CREATE",  description: "Create opportunities" },
  { module: "CRM", resource: "Opportunity", action: "EDIT",    description: "Edit opportunities" },
  { module: "CRM", resource: "Opportunity", action: "DELETE",  description: "Delete opportunities" },
  { module: "CRM", resource: "Opportunity", action: "APPROVE", description: "Approve opportunity stage changes" },
  { module: "CRM", resource: "Activity",    action: "VIEW",    description: "View activity feed" },
  { module: "CRM", resource: "Activity",    action: "CREATE",  description: "Log activities" },
  { module: "CRM", resource: "Report",      action: "VIEW",    description: "View CRM reports" },
  { module: "CRM", resource: "Report",      action: "EXPORT",  description: "Export CRM reports" },

  // ── Finance ───────────────────────────────────────────────────────────────
  { module: "Finance", resource: "Invoice",  action: "VIEW",    description: "View invoices and collections" },
  { module: "Finance", resource: "Invoice",  action: "CREATE",  description: "Create invoices" },
  { module: "Finance", resource: "Invoice",  action: "EDIT",    description: "Edit invoices" },
  { module: "Finance", resource: "Invoice",  action: "DELETE",  description: "Delete invoices" },
  { module: "Finance", resource: "Invoice",  action: "APPROVE", description: "Approve invoice payments" },
  { module: "Finance", resource: "Invoice",  action: "EXPORT",  description: "Export invoice data" },
  { module: "Finance", resource: "Expense",  action: "VIEW",    description: "View expense register" },
  { module: "Finance", resource: "Expense",  action: "CREATE",  description: "Submit expenses" },
  { module: "Finance", resource: "Expense",  action: "EDIT",    description: "Edit expense entries" },
  { module: "Finance", resource: "Expense",  action: "DELETE",  description: "Delete expense entries" },
  { module: "Finance", resource: "Expense",  action: "APPROVE", description: "Approve expenses" },
  { module: "Finance", resource: "Payment",  action: "VIEW",    description: "View payment records" },
  { module: "Finance", resource: "Payment",  action: "CREATE",  description: "Record payments" },
  { module: "Finance", resource: "Payment",  action: "APPROVE", description: "Approve payments" },
  { module: "Finance", resource: "Advance",  action: "VIEW",    description: "View advances" },
  { module: "Finance", resource: "Advance",  action: "CREATE",  description: "Request advances" },
  { module: "Finance", resource: "Advance",  action: "APPROVE", description: "Approve advances" },

  // ── Workflow ──────────────────────────────────────────────────────────────
  { module: "Workflow", resource: "ApprovalRequest",    action: "VIEW",    description: "View approval requests" },
  { module: "Workflow", resource: "ApprovalRequest",    action: "APPROVE", description: "Approve/reject requests" },
  { module: "Workflow", resource: "WorkflowDefinition", action: "VIEW",    description: "View workflow configs" },
  { module: "Workflow", resource: "WorkflowDefinition", action: "EDIT",    description: "Edit workflow definitions" },

  // ── Settings ──────────────────────────────────────────────────────────────
  { module: "Settings", resource: "Configuration",  action: "VIEW",   description: "View system configuration" },
  { module: "Settings", resource: "Configuration",  action: "EDIT",   description: "Edit system configuration" },
  { module: "Settings", resource: "UserManagement", action: "VIEW",   description: "View user directory" },
  { module: "Settings", resource: "UserManagement", action: "CREATE", description: "Invite users" },
  { module: "Settings", resource: "UserManagement", action: "EDIT",   description: "Edit user profiles" },
  { module: "Settings", resource: "RoleManagement", action: "VIEW",   description: "View roles and permissions" },
  { module: "Settings", resource: "RoleManagement", action: "EDIT",   description: "Edit roles and permissions" },
  { module: "Settings", resource: "Organization",   action: "VIEW",   description: "View organization structure" },
  { module: "Settings", resource: "Organization",   action: "EDIT",   description: "Manage companies, branches, departments, teams and designations" },
  { module: "Settings", resource: "Identity",       action: "VIEW",   description: "View identity & access management" },
  { module: "Settings", resource: "Identity",       action: "EDIT",   description: "Manage users, roles, permissions, and data access policies" },
  { module: "Settings", resource: "Policy",         action: "VIEW",   description: "View business policy rules and configurations" },
  { module: "Settings", resource: "Policy",         action: "EDIT",   description: "Create, edit and publish business policy rules" },
  { module: "Settings", resource: "Workflow",       action: "VIEW",   description: "View approval workflow engine configurations" },
  { module: "Settings", resource: "Workflow",       action: "EDIT",   description: "Create, edit and deploy approval workflows" },

  // ── Reports ───────────────────────────────────────────────────────────────
  { module: "Reports", resource: "Dashboard", action: "VIEW",   description: "Access dashboards" },
  { module: "Reports", resource: "Dashboard", action: "EXPORT", description: "Export dashboard data" },
  { module: "Reports", resource: "Analytics", action: "VIEW",   description: "View analytics reports" },
  { module: "Reports", resource: "Analytics", action: "EXPORT", description: "Export analytics data" },

  // ── Masters ───────────────────────────────────────────────────────────────
  { module: "Masters", resource: "CustomerMaster", action: "VIEW",   description: "View customer master" },
  { module: "Masters", resource: "CustomerMaster", action: "CREATE", description: "Add customers to master" },
  { module: "Masters", resource: "CustomerMaster", action: "EDIT",   description: "Edit customer master records" },
  { module: "Masters", resource: "CustomerMaster", action: "DELETE", description: "Remove customer records" },
  { module: "Masters", resource: "CustomerMaster", action: "IMPORT", description: "Bulk import customers" },
  { module: "Masters", resource: "VendorMaster",   action: "VIEW",   description: "View vendor master" },
  { module: "Masters", resource: "VendorMaster",   action: "CREATE", description: "Add vendors to master" },
  { module: "Masters", resource: "VendorMaster",   action: "EDIT",   description: "Edit vendor records" },
  { module: "Masters", resource: "VendorMaster",   action: "DELETE", description: "Remove vendor records" },

  // ── Settings / Masters ────────────────────────────────────────────────────
  { module: "Settings", resource: "Masters", action: "VIEW", description: "View master data management (categories, definitions, values)" },
  { module: "Settings", resource: "Masters", action: "EDIT", description: "Create and manage master data categories, definitions, values and overrides" },

  // ── Settings / Finance Administration (Phase 9) ───────────────────────────
  { module: "Settings", resource: "Finance", action: "VIEW", description: "View finance administration (expense categories, conveyance, credit, voucher, collection)" },
  { module: "Settings", resource: "Finance", action: "EDIT", description: "Create and modify finance policies, expense limits, conveyance rates, credit limits, voucher configs and collection rules" },

  // ── Settings / Performance Management (Phase 10) ─────────────────────────
  { module: "Settings", resource: "Performance", action: "VIEW", description: "View performance management (periods, KRA library, templates, targets, reviews)" },
  { module: "Settings", resource: "Performance", action: "EDIT", description: "Create and modify performance periods, KRA metrics, templates, employee targets and review workflows" },

  // ── Settings / Communication Center (Phase 11) ───────────────────────────
  { module: "Settings", resource: "CommunicationAdmin",    action: "VIEW", description: "View communication center (events, rules, templates, channels, delivery logs)" },
  { module: "Settings", resource: "CommunicationAdmin",    action: "EDIT", description: "Create and manage notification events, rules, templates and channel configuration" },
  { module: "Settings", resource: "CommunicationTemplate", action: "EDIT", description: "Create and edit notification templates with variable substitution" },
  { module: "Settings", resource: "CommunicationLog",      action: "VIEW", description: "View notification delivery logs and audit trail" },
];
