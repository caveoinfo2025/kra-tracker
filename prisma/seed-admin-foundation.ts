/**
 * Admin Console Phase 2 — Foundation seed
 *
 * Seeds:
 *   - Default Tenant    (Caveo Infosystems)
 *   - Default Company   (Caveo Infosystems Pvt. Ltd.)
 *   - Default Branch    (Head Office — Chennai)
 *   - Default Department(Sales)
 *   - 6 enterprise Roles
 *   - Full Permission catalogue (from access-control/permissions.ts)
 *   - RolePermission grants per role
 *   - DataAccessPolicy per role+module
 *
 * Idempotent — safe to run multiple times (guards on existing rows / upsert).
 *
 * Run standalone:
 *   npx tsx prisma/seed-admin-foundation.ts
 *
 * Or called from seed.ts for automatic execution during `npx prisma db seed`.
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PERMISSION_CATALOGUE, MODULE, ACTION, SCOPE } from "../src/lib/access-control/permissions";
import type { PermissionDef } from "../src/lib/access-control/permissions";

interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

function resolveDbConfig(): DbConfig {
  if (process.env.DB_HOST) {
    return {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER ?? "",
      password: process.env.DB_PASSWORD ?? "",
      database: process.env.DB_NAME ?? "",
    };
  }
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set (and no DB_HOST fallback)");
  const url = new URL(raw.replace(/\\(.)/g, "$1"));
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
  };
}

// ── Role definitions ─────────────────────────────────────────────────────────

interface RoleDef {
  name: string;
  description: string;
  level: number;
  isSystemRole: boolean;
}

const ROLE_DEFS: RoleDef[] = [
  { name: "Super Admin",       description: "Full system access — all modules, all actions", level: 100, isSystemRole: true  },
  { name: "Business Head",     description: "Organisation-wide view and approval authority",  level: 80,  isSystemRole: true  },
  { name: "Sales Head",        description: "CRM full access + reports",                      level: 60,  isSystemRole: true  },
  { name: "Sales Manager",     description: "CRM team-scope + own finance",                   level: 40,  isSystemRole: false },
  { name: "Account Manager",   description: "Finance module + own CRM records",               level: 30,  isSystemRole: false },
  { name: "Finance Manager",   description: "Full Finance module + reports",                  level: 50,  isSystemRole: true  },
];

// ── Permission grants per role ────────────────────────────────────────────────
// Each entry: [roleName, module, resource, actions[]]
type Grant = [string, string, string, string[]];

const ROLE_GRANTS: Grant[] = [
  // Super Admin — all permissions
  // (handled programmatically below: grants every permission in the catalogue)

  // Business Head — all-scope view + approve across modules
  ["Business Head", MODULE.CRM,      "Lead",               [ACTION.VIEW, ACTION.ASSIGN]],
  ["Business Head", MODULE.CRM,      "Opportunity",        [ACTION.VIEW, ACTION.APPROVE]],
  ["Business Head", MODULE.CRM,      "Activity",           [ACTION.VIEW]],
  ["Business Head", MODULE.CRM,      "Report",             [ACTION.VIEW, ACTION.EXPORT]],
  ["Business Head", MODULE.FINANCE,  "Invoice",            [ACTION.VIEW, ACTION.APPROVE, ACTION.EXPORT]],
  ["Business Head", MODULE.FINANCE,  "Expense",            [ACTION.VIEW, ACTION.APPROVE]],
  ["Business Head", MODULE.FINANCE,  "Payment",            [ACTION.VIEW, ACTION.APPROVE]],
  ["Business Head", MODULE.FINANCE,  "Advance",            [ACTION.VIEW, ACTION.APPROVE]],
  ["Business Head", MODULE.WORKFLOW, "ApprovalRequest",    [ACTION.VIEW, ACTION.APPROVE]],
  ["Business Head", MODULE.REPORTS,  "Dashboard",          [ACTION.VIEW, ACTION.EXPORT]],
  ["Business Head", MODULE.REPORTS,  "Analytics",          [ACTION.VIEW, ACTION.EXPORT]],
  ["Business Head", MODULE.MASTERS,  "CustomerMaster",     [ACTION.VIEW]],
  ["Business Head", MODULE.MASTERS,  "VendorMaster",       [ACTION.VIEW]],

  // Sales Head — full CRM + reports
  ["Sales Head", MODULE.CRM,      "Lead",           [ACTION.VIEW, ACTION.CREATE, ACTION.EDIT, ACTION.DELETE, ACTION.ASSIGN]],
  ["Sales Head", MODULE.CRM,      "Opportunity",    [ACTION.VIEW, ACTION.CREATE, ACTION.EDIT, ACTION.DELETE, ACTION.APPROVE]],
  ["Sales Head", MODULE.CRM,      "Activity",       [ACTION.VIEW, ACTION.CREATE]],
  ["Sales Head", MODULE.CRM,      "Report",         [ACTION.VIEW, ACTION.EXPORT]],
  ["Sales Head", MODULE.REPORTS,  "Dashboard",      [ACTION.VIEW, ACTION.EXPORT]],
  ["Sales Head", MODULE.REPORTS,  "Analytics",      [ACTION.VIEW, ACTION.EXPORT]],
  ["Sales Head", MODULE.MASTERS,  "CustomerMaster", [ACTION.VIEW, ACTION.CREATE, ACTION.EDIT, ACTION.IMPORT]],

  // Sales Manager — team-scope CRM
  ["Sales Manager", MODULE.CRM,     "Lead",        [ACTION.VIEW, ACTION.CREATE, ACTION.EDIT, ACTION.ASSIGN]],
  ["Sales Manager", MODULE.CRM,     "Opportunity", [ACTION.VIEW, ACTION.CREATE, ACTION.EDIT]],
  ["Sales Manager", MODULE.CRM,     "Activity",    [ACTION.VIEW, ACTION.CREATE]],
  ["Sales Manager", MODULE.CRM,     "Report",      [ACTION.VIEW]],
  ["Sales Manager", MODULE.REPORTS, "Dashboard",   [ACTION.VIEW]],
  ["Sales Manager", MODULE.MASTERS, "CustomerMaster", [ACTION.VIEW]],

  // Account Manager — own CRM + basic finance view
  ["Account Manager", MODULE.CRM,     "Lead",        [ACTION.VIEW, ACTION.CREATE, ACTION.EDIT]],
  ["Account Manager", MODULE.CRM,     "Opportunity", [ACTION.VIEW, ACTION.CREATE, ACTION.EDIT]],
  ["Account Manager", MODULE.CRM,     "Activity",    [ACTION.VIEW, ACTION.CREATE]],
  ["Account Manager", MODULE.FINANCE, "Invoice",     [ACTION.VIEW]],
  ["Account Manager", MODULE.FINANCE, "Payment",     [ACTION.VIEW]],
  ["Account Manager", MODULE.FINANCE, "Expense",     [ACTION.VIEW, ACTION.CREATE]],
  ["Account Manager", MODULE.REPORTS, "Dashboard",   [ACTION.VIEW]],

  // Finance Manager — full Finance + reports
  ["Finance Manager", MODULE.FINANCE,  "Invoice",  [ACTION.VIEW, ACTION.CREATE, ACTION.EDIT, ACTION.DELETE, ACTION.APPROVE, ACTION.EXPORT]],
  ["Finance Manager", MODULE.FINANCE,  "Expense",  [ACTION.VIEW, ACTION.CREATE, ACTION.EDIT, ACTION.DELETE, ACTION.APPROVE]],
  ["Finance Manager", MODULE.FINANCE,  "Payment",  [ACTION.VIEW, ACTION.CREATE, ACTION.APPROVE]],
  ["Finance Manager", MODULE.FINANCE,  "Advance",  [ACTION.VIEW, ACTION.CREATE, ACTION.APPROVE]],
  ["Finance Manager", MODULE.WORKFLOW, "ApprovalRequest", [ACTION.VIEW, ACTION.APPROVE]],
  ["Finance Manager", MODULE.REPORTS,  "Dashboard", [ACTION.VIEW, ACTION.EXPORT]],
  ["Finance Manager", MODULE.REPORTS,  "Analytics", [ACTION.VIEW, ACTION.EXPORT]],
  ["Finance Manager", MODULE.MASTERS,  "VendorMaster",   [ACTION.VIEW, ACTION.CREATE, ACTION.EDIT]],
  ["Finance Manager", MODULE.MASTERS,  "CustomerMaster", [ACTION.VIEW]],
];

// ── Data access policies per role ─────────────────────────────────────────────
// [roleName, module, scope]
type PolicyDef = [string, string, string];

const POLICY_DEFS: PolicyDef[] = [
  ["Super Admin",     MODULE.CRM,      SCOPE.ALL],
  ["Super Admin",     MODULE.FINANCE,  SCOPE.ALL],
  ["Super Admin",     MODULE.WORKFLOW, SCOPE.ALL],
  ["Super Admin",     MODULE.SETTINGS, SCOPE.ALL],
  ["Super Admin",     MODULE.REPORTS,  SCOPE.ALL],
  ["Super Admin",     MODULE.MASTERS,  SCOPE.ALL],

  ["Business Head",   MODULE.CRM,      SCOPE.COMPANY],
  ["Business Head",   MODULE.FINANCE,  SCOPE.COMPANY],
  ["Business Head",   MODULE.WORKFLOW, SCOPE.COMPANY],
  ["Business Head",   MODULE.REPORTS,  SCOPE.COMPANY],
  ["Business Head",   MODULE.MASTERS,  SCOPE.COMPANY],

  ["Sales Head",      MODULE.CRM,      SCOPE.COMPANY],
  ["Sales Head",      MODULE.REPORTS,  SCOPE.COMPANY],
  ["Sales Head",      MODULE.MASTERS,  SCOPE.COMPANY],

  ["Sales Manager",   MODULE.CRM,      SCOPE.TEAM],
  ["Sales Manager",   MODULE.REPORTS,  SCOPE.TEAM],
  ["Sales Manager",   MODULE.MASTERS,  SCOPE.TEAM],

  ["Account Manager", MODULE.CRM,      SCOPE.OWN],
  ["Account Manager", MODULE.FINANCE,  SCOPE.OWN],
  ["Account Manager", MODULE.REPORTS,  SCOPE.OWN],

  ["Finance Manager", MODULE.FINANCE,  SCOPE.COMPANY],
  ["Finance Manager", MODULE.WORKFLOW, SCOPE.COMPANY],
  ["Finance Manager", MODULE.REPORTS,  SCOPE.COMPANY],
  ["Finance Manager", MODULE.MASTERS,  SCOPE.COMPANY],
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const cfg = resolveDbConfig();
  const adapter = new PrismaMariaDb({ ...cfg, connectionLimit: 5 });
  const prisma = new PrismaClient({ adapter });

  try {
    // ── Tenant ────────────────────────────────────────────────────────────────
    const tenant = await prisma.tenant.upsert({
      where:  { code: "CAVEO" },
      update: {},
      create: { name: "Caveo Infosystems", code: "CAVEO", status: "ACTIVE" },
    });
    console.log(`Tenant ready: ${tenant.name} (id ${tenant.id})`);

    // ── Company ───────────────────────────────────────────────────────────────
    const existingCompany = await prisma.company.findFirst({
      where: { tenantId: tenant.id },
    });
    const company = existingCompany ?? await prisma.company.create({
      data: {
        tenantId:    tenant.id,
        companyName: "Caveo Infosystems",
        legalName:   "Caveo Infosystems Pvt. Ltd.",
        companyCode: "CAVEO-HO",
        email:       "info@caveoinfosystems.com",
        website:     "https://www.caveoinfosystems.com",
        status:      "ACTIVE",
      },
    });
    console.log(`Company ready: ${company.companyName} (id ${company.id})`);

    // ── Branch ────────────────────────────────────────────────────────────────
    const existingBranch = await prisma.branch.findFirst({
      where: { companyId: company.id, branchCode: "HO" },
    });
    const branch = existingBranch ?? await prisma.branch.create({
      data: {
        companyId:  company.id,
        branchName: "Head Office",
        branchCode: "HO",
        city:       "Chennai",
        state:      "Tamil Nadu",
        country:    "India",
        timezone:   "Asia/Kolkata",
        status:     "ACTIVE",
      },
    });
    console.log(`Branch ready: ${branch.branchName} (id ${branch.id})`);

    // ── Department ────────────────────────────────────────────────────────────
    const deptData = [
      { code: "SALES", name: "Sales",     description: "CRM, pipeline and business development" },
      { code: "FIN",   name: "Finance",   description: "Accounts, collections and expense management" },
      { code: "OPS",   name: "Operations",description: "Operations and HR" },
    ];
    for (const d of deptData) {
      const exists = await prisma.department.findFirst({
        where: { companyId: company.id, code: d.code },
      });
      if (!exists) {
        await prisma.department.create({
          data: { companyId: company.id, ...d, status: "ACTIVE" },
        });
        console.log(`Department created: ${d.name}`);
      }
    }

    // ── Permissions ───────────────────────────────────────────────────────────
    let permCreated = 0;
    for (const def of PERMISSION_CATALOGUE as PermissionDef[]) {
      await prisma.permission.upsert({
        where: { module_resource_action: { module: def.module, resource: def.resource, action: def.action } },
        update: { description: def.description },
        create: { module: def.module, resource: def.resource, action: def.action, description: def.description },
      });
      permCreated++;
    }
    console.log(`Permissions upserted: ${permCreated}`);

    // ── Roles ─────────────────────────────────────────────────────────────────
    const roleMap = new Map<string, number>(); // name → id

    for (const def of ROLE_DEFS) {
      const existing = await prisma.role.findFirst({
        where: { tenantId: tenant.id, name: def.name },
      });
      const role = existing ?? await prisma.role.create({
        data: { tenantId: tenant.id, ...def, status: "ACTIVE" },
      });
      roleMap.set(role.name, role.id);
    }
    console.log(`Roles ready: ${roleMap.size} (${[...roleMap.keys()].join(", ")})`);

    // ── Super Admin gets ALL permissions ──────────────────────────────────────
    const superAdminId = roleMap.get("Super Admin");
    if (superAdminId) {
      const allPerms = await prisma.permission.findMany({ select: { id: true } });
      for (const perm of allPerms) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: superAdminId, permissionId: perm.id } },
          update: {},
          create: { roleId: superAdminId, permissionId: perm.id },
        });
      }
      console.log(`Super Admin granted ${allPerms.length} permissions`);
    }

    // ── Remaining role grants ─────────────────────────────────────────────────
    let grantCount = 0;
    for (const [roleName, mod, resource, actions] of ROLE_GRANTS) {
      const roleId = roleMap.get(roleName);
      if (!roleId) continue;
      for (const action of actions) {
        const perm = await prisma.permission.findUnique({
          where: { module_resource_action: { module: mod, resource, action } },
          select: { id: true },
        });
        if (!perm) continue;
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId, permissionId: perm.id } },
          update: {},
          create: { roleId, permissionId: perm.id },
        });
        grantCount++;
      }
    }
    console.log(`Role grants upserted: ${grantCount}`);

    // ── DataAccessPolicies ────────────────────────────────────────────────────
    let policyCount = 0;
    for (const [roleName, module, scope] of POLICY_DEFS) {
      const roleId = roleMap.get(roleName);
      if (!roleId) continue;
      await prisma.dataAccessPolicy.upsert({
        where: { roleId_module: { roleId, module } },
        update: { scope },
        create: { roleId, module, scope },
      });
      policyCount++;
    }
    console.log(`DataAccessPolicies upserted: ${policyCount}`);

    console.log("\nAdmin Console Phase 2 seed complete.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
