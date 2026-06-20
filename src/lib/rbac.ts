/**
 * FROZEN — This legacy RBAC file backs the old /admin Roles UI only. It is not
 * used for runtime authorization. Do not add new enforcement logic here.
 * Use src/lib/access-control for all new permissions.
 * See docs/RBAC_MIGRATION_TRACKER.md for the full migration plan.
 *
 * Role-based access control helpers.
 *
 * PAGES  — the canonical list of pages/features that can have per-role permissions.
 * DEFAULT_ROLES — seed data for roles matching the real employee roles in the DB.
 * hasPermission() — call this in API routes or server components to gate access.
 * seedDefaultRoles() — seeds AppRole + RolePageAccess rows if none exist yet.
 */
import prisma from "./prisma";
import type { Session } from "next-auth";

// ── Canonical page registry ──────────────────────────────────────────────────
export type PageAction = "canView" | "canCreate" | "canEdit" | "canDelete";

export const PAGES: { key: string; label: string; group: string }[] = [
  // Dashboard
  { key: "dashboard",             label: "Dashboard",              group: "Overview" },
  // Pipeline
  { key: "pipeline.leads",        label: "Leads",                  group: "Pipeline" },
  { key: "pipeline.tasks",        label: "Tasks",                  group: "Pipeline" },
  { key: "pipeline.deals",        label: "Deals / Opportunities",  group: "Pipeline" },
  { key: "pipeline.analytics",    label: "Analytics",              group: "Pipeline" },
  // Operations
  { key: "collections",           label: "Collections",            group: "Operations" },
  { key: "daily_updates",         label: "Daily Updates",          group: "Operations" },
  { key: "lead_generation",       label: "Lead Generation",        group: "Operations" },
  { key: "sales_funnel",          label: "Sales Funnel",           group: "Operations" },
  // People
  { key: "kras",                  label: "My KRAs",                group: "People" },
  { key: "employees",             label: "Team / Employees",       group: "People" },
  { key: "import",                label: "Import",                 group: "People" },
  // Finance
  { key: "accounts",              label: "Payment Tracker",        group: "Finance" },
  // Admin
  { key: "admin",                 label: "Admin Panel",            group: "Admin" },
];

export const PAGE_GROUPS = [...new Set(PAGES.map((p) => p.group))];

// ── Default roles matching actual employee data ───────────────────────────────
//
//  level: 100 = top of hierarchy, lower = less access.
//  Permissions: full matrix per page.
//  "own" concept is handled at the API layer — here we grant the flag,
//  API routes filter by session.user.employeeId when !isManager.

const ALL_PAGES_FULL = PAGES.map((p) => ({
  pageKey: p.key,
  canView: true, canCreate: true, canEdit: true, canDelete: true,
}));

const SALES_PAGES_STANDARD = [
  { pageKey: "dashboard",          canView: true,  canCreate: false, canEdit: false, canDelete: false },
  { pageKey: "pipeline.leads",     canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
  { pageKey: "pipeline.tasks",     canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
  { pageKey: "pipeline.deals",     canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
  { pageKey: "pipeline.analytics", canView: false, canCreate: false, canEdit: false, canDelete: false },
  { pageKey: "collections",        canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
  { pageKey: "daily_updates",      canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
  { pageKey: "lead_generation",    canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
  { pageKey: "sales_funnel",       canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
  { pageKey: "kras",               canView: true,  canCreate: false, canEdit: false, canDelete: false },
  { pageKey: "employees",          canView: false, canCreate: false, canEdit: false, canDelete: false },
  { pageKey: "import",             canView: false, canCreate: false, canEdit: false, canDelete: false },
  { pageKey: "accounts",           canView: false, canCreate: false, canEdit: false, canDelete: false },
  { pageKey: "admin",              canView: false, canCreate: false, canEdit: false, canDelete: false },
];

export const DEFAULT_ROLES: {
  name: string;
  label: string;
  level: number;
  color: string;
  isSystem: boolean;
  description: string;
  pageAccess: { pageKey: string; canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }[];
}[] = [
  {
    name: "Head of Sales",
    label: "Head of Sales",
    level: 100,
    color: "#C8102E",
    isSystem: true,
    description: "Full access to all pages and admin panel.",
    pageAccess: ALL_PAGES_FULL,
  },
  {
    name: "Business Development Manager",
    label: "Business Development Manager",
    level: 70,
    color: "#7c3aed",
    isSystem: false,
    description: "Senior sales role — full pipeline access, can view analytics and team.",
    pageAccess: [
      { pageKey: "dashboard",          canView: true,  canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "pipeline.leads",     canView: true,  canCreate: true,  canEdit: true,  canDelete: true  },
      { pageKey: "pipeline.tasks",     canView: true,  canCreate: true,  canEdit: true,  canDelete: true  },
      { pageKey: "pipeline.deals",     canView: true,  canCreate: true,  canEdit: true,  canDelete: true  },
      { pageKey: "pipeline.analytics", canView: true,  canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "collections",        canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
      { pageKey: "daily_updates",      canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
      { pageKey: "lead_generation",    canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
      { pageKey: "sales_funnel",       canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
      { pageKey: "kras",               canView: true,  canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "employees",          canView: true,  canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "import",             canView: false, canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "accounts",           canView: false, canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "admin",              canView: false, canCreate: false, canEdit: false, canDelete: false },
    ],
  },
  {
    name: "BDE",
    label: "Business Development Executive",
    level: 40,
    color: "#0284c7",
    isSystem: false,
    description: "Standard sales role — own pipeline, collections and daily updates.",
    pageAccess: SALES_PAGES_STANDARD,
  },
  {
    name: "Inside Sales",
    label: "Inside Sales",
    level: 40,
    color: "#0891b2",
    isSystem: false,
    description: "Inside sales representative — same access as BDE.",
    pageAccess: SALES_PAGES_STANDARD,
  },
  {
    name: "ISR",
    label: "Inside Sales Representative",
    level: 35,
    color: "#059669",
    isSystem: false,
    description: "Inside sales support — pipeline and lead generation access.",
    pageAccess: SALES_PAGES_STANDARD,
  },
  {
    name: "Sales Coordinator",
    label: "Sales Coordinator",
    level: 30,
    color: "#d97706",
    isSystem: false,
    description: "Coordinates sales activities — daily updates and collections.",
    pageAccess: [
      { pageKey: "dashboard",          canView: true,  canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "pipeline.leads",     canView: true,  canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "pipeline.tasks",     canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
      { pageKey: "pipeline.deals",     canView: true,  canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "pipeline.analytics", canView: false, canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "collections",        canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
      { pageKey: "daily_updates",      canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
      { pageKey: "lead_generation",    canView: true,  canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "sales_funnel",       canView: true,  canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "kras",               canView: true,  canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "employees",          canView: false, canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "import",             canView: false, canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "accounts",           canView: false, canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "admin",              canView: false, canCreate: false, canEdit: false, canDelete: false },
    ],
  },
  {
    name: "Accounts",
    label: "Accounts",
    level: 20,
    color: "#16a34a",
    isSystem: false,
    description: "Finance team — full collections and payment tracker access.",
    pageAccess: [
      { pageKey: "dashboard",          canView: true,  canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "pipeline.leads",     canView: false, canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "pipeline.tasks",     canView: false, canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "pipeline.deals",     canView: false, canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "pipeline.analytics", canView: false, canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "collections",        canView: true,  canCreate: true,  canEdit: true,  canDelete: true  },
      { pageKey: "daily_updates",      canView: true,  canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "lead_generation",    canView: false, canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "sales_funnel",       canView: false, canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "kras",               canView: true,  canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "employees",          canView: false, canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "import",             canView: false, canCreate: false, canEdit: false, canDelete: false },
      { pageKey: "accounts",           canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
      { pageKey: "admin",              canView: false, canCreate: false, canEdit: false, canDelete: false },
    ],
  },
];

// ── Seed default roles if none exist ─────────────────────────────────────────
export async function seedDefaultRoles() {
  const count = await prisma.appRole.count();
  if (count > 0) return; // Already seeded

  for (const role of DEFAULT_ROLES) {
    await prisma.appRole.create({
      data: {
        name: role.name,
        label: role.label,
        level: role.level,
        color: role.color,
        isSystem: role.isSystem,
        description: role.description,
        pageAccess: { create: role.pageAccess },
      },
    });
  }
}

// ── Permission check ──────────────────────────────────────────────────────────
export type PermissionCache = Map<string, Record<PageAction, boolean>>;

/** Load all page permissions for a role name (cached per request via Map). */
export async function loadRolePermissions(roleName: string): Promise<Record<string, Record<PageAction, boolean>>> {
  const role = await prisma.appRole.findUnique({
    where: { name: roleName },
    include: { pageAccess: true },
  });
  if (!role) return {};

  const map: Record<string, Record<PageAction, boolean>> = {};
  for (const pa of role.pageAccess) {
    map[pa.pageKey] = {
      canView: pa.canView,
      canCreate: pa.canCreate,
      canEdit: pa.canEdit,
      canDelete: pa.canDelete,
    };
  }
  return map;
}

/**
 * Check if a session has a specific permission on a page.
 * Managers (isManager=true) always have full access regardless of role config.
 */
export async function hasPermission(
  session: Session | null,
  pageKey: string,
  action: PageAction = "canView"
): Promise<boolean> {
  if (!session?.user) return false;
  // Managers always have full access
  if (session.user.isManager) return true;

  const role = (session.user as { role?: string }).role;
  if (!role) return false;

  const perms = await loadRolePermissions(role);
  return perms[pageKey]?.[action] ?? false;
}
