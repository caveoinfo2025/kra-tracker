/**
 * ONE-TIME USE: Phase 16 RBAC seed trigger.
 * DELETE THIS FILE after running once on UAT.
 * Protected by a static secret token.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const SEED_SECRET = "caveo-phase16-rbac-seed-2026";

const PERMISSIONS = [
  // CRM
  { module: "CRM", resource: "Lead",        action: "VIEW",    description: "View CRM leads" },
  { module: "CRM", resource: "Lead",        action: "CREATE",  description: "Create CRM leads" },
  { module: "CRM", resource: "Lead",        action: "EDIT",    description: "Edit CRM leads" },
  { module: "CRM", resource: "Lead",        action: "DELETE",  description: "Delete CRM leads" },
  { module: "CRM", resource: "Lead",        action: "ASSIGN",  description: "Assign leads to reps" },
  { module: "CRM", resource: "Lead",        action: "IMPORT",  description: "Import CRM leads" },
  { module: "CRM", resource: "Opportunity", action: "VIEW",    description: "View opportunities" },
  { module: "CRM", resource: "Opportunity", action: "CREATE",  description: "Create opportunities" },
  { module: "CRM", resource: "Opportunity", action: "EDIT",    description: "Edit opportunities" },
  { module: "CRM", resource: "Opportunity", action: "DELETE",  description: "Delete opportunities" },
  { module: "CRM", resource: "Opportunity", action: "APPROVE", description: "Approve opportunity stage changes" },
  { module: "CRM", resource: "Activity",    action: "VIEW",    description: "View activity feed" },
  { module: "CRM", resource: "Activity",    action: "CREATE",  description: "Log activities" },
  { module: "CRM", resource: "Report",      action: "VIEW",    description: "View CRM reports" },
  { module: "CRM", resource: "Report",      action: "EXPORT",  description: "Export CRM reports" },
  { module: "CRM", resource: "SalesFunnel", action: "VIEW",    description: "View sales funnel" },
  { module: "CRM", resource: "SalesFunnel", action: "CREATE",  description: "Add sales funnel entries" },
  { module: "CRM", resource: "SalesFunnel", action: "EDIT",    description: "Edit sales funnel entries" },
  { module: "CRM", resource: "SalesFunnel", action: "DELETE",  description: "Delete sales funnel entries" },
  { module: "CRM", resource: "LeadGen",     action: "VIEW",    description: "View lead generation data" },
  { module: "CRM", resource: "LeadGen",     action: "CREATE",  description: "Add lead generation entries" },
  { module: "CRM", resource: "LeadGen",     action: "EDIT",    description: "Edit lead generation entries" },
  { module: "CRM", resource: "Collection",  action: "VIEW",    description: "View collections" },
  { module: "CRM", resource: "Collection",  action: "CREATE",  description: "Record collections" },
  { module: "CRM", resource: "Collection",  action: "EDIT",    description: "Edit collections" },
  { module: "CRM", resource: "Collection",  action: "DELETE",  description: "Delete collections" },
  { module: "CRM", resource: "DailyUpdate", action: "VIEW",    description: "View daily updates" },
  { module: "CRM", resource: "DailyUpdate", action: "CREATE",  description: "Create daily updates" },
  { module: "CRM", resource: "DailyUpdate", action: "EDIT",    description: "Edit daily updates" },
  { module: "CRM", resource: "KRA",         action: "VIEW",    description: "View KRA tracker" },
  { module: "CRM", resource: "KRA",         action: "EDIT",    description: "Manage KRA targets" },
  { module: "CRM", resource: "KRA",         action: "APPROVE", description: "Approve KRA achievements" },
  { module: "CRM", resource: "Employee",    action: "VIEW",    description: "View employee directory" },
  { module: "CRM", resource: "Employee",    action: "CREATE",  description: "Add employees" },
  { module: "CRM", resource: "Employee",    action: "EDIT",    description: "Edit employee records" },
  { module: "CRM", resource: "Employee",    action: "DELETE",  description: "Remove employees" },
  // Finance
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
  // Settings
  { module: "Settings", resource: "Configuration",      action: "VIEW",   description: "View system configuration" },
  { module: "Settings", resource: "Configuration",      action: "EDIT",   description: "Edit system configuration" },
  { module: "Settings", resource: "UserManagement",     action: "VIEW",   description: "View user directory" },
  { module: "Settings", resource: "UserManagement",     action: "CREATE", description: "Invite users" },
  { module: "Settings", resource: "UserManagement",     action: "EDIT",   description: "Edit user profiles" },
  { module: "Settings", resource: "RoleManagement",     action: "VIEW",   description: "View roles and permissions" },
  { module: "Settings", resource: "RoleManagement",     action: "EDIT",   description: "Edit roles and permissions" },
  { module: "Settings", resource: "Organization",       action: "VIEW",   description: "View organization structure" },
  { module: "Settings", resource: "Organization",       action: "EDIT",   description: "Manage org structure" },
  { module: "Settings", resource: "Finance",            action: "VIEW",   description: "View finance settings" },
  { module: "Settings", resource: "Finance",            action: "EDIT",   description: "Edit finance settings" },
  { module: "Settings", resource: "Performance",        action: "VIEW",   description: "View performance settings" },
  { module: "Settings", resource: "Performance",        action: "EDIT",   description: "Edit performance settings" },
  { module: "Settings", resource: "CommunicationAdmin", action: "VIEW",   description: "View communication settings" },
  { module: "Settings", resource: "CommunicationAdmin", action: "EDIT",   description: "Edit communication settings" },
  { module: "Settings", resource: "IntegrationAdmin",   action: "VIEW",   description: "View integration settings" },
  { module: "Settings", resource: "IntegrationAdmin",   action: "EDIT",   description: "Edit integration settings" },
  { module: "Settings", resource: "SecurityAdmin",      action: "VIEW",   description: "View security settings" },
  { module: "Settings", resource: "SecurityAdmin",      action: "EDIT",   description: "Edit security settings" },
  { module: "Settings", resource: "Identity",           action: "VIEW",   description: "View identity settings" },
  { module: "Settings", resource: "Identity",           action: "EDIT",   description: "Edit identity settings" },
  // Reports
  { module: "Reports", resource: "Dashboard", action: "VIEW",   description: "Access dashboards" },
  { module: "Reports", resource: "Dashboard", action: "EXPORT", description: "Export dashboard data" },
  { module: "Reports", resource: "Analytics", action: "VIEW",   description: "View analytics reports" },
  { module: "Reports", resource: "Analytics", action: "EXPORT", description: "Export analytics data" },
  // Masters
  { module: "Masters", resource: "CustomerMaster", action: "VIEW",   description: "View customer master" },
  { module: "Masters", resource: "CustomerMaster", action: "CREATE", description: "Add customers" },
  { module: "Masters", resource: "CustomerMaster", action: "EDIT",   description: "Edit customers" },
  { module: "Masters", resource: "CustomerMaster", action: "DELETE", description: "Remove customers" },
  { module: "Masters", resource: "CustomerMaster", action: "IMPORT", description: "Import customers" },
  { module: "Masters", resource: "VendorMaster",   action: "VIEW",   description: "View vendor master" },
  { module: "Masters", resource: "VendorMaster",   action: "CREATE", description: "Add vendors" },
  { module: "Masters", resource: "VendorMaster",   action: "EDIT",   description: "Edit vendors" },
  { module: "Masters", resource: "VendorMaster",   action: "DELETE", description: "Remove vendors" },
] as const;

const ALL_PERM_KEYS = PERMISSIONS.map(p => `${p.module}:${p.resource}:${p.action}`);

const ROLE_DEFS = [
  {
    name: "Head of Sales",
    description: "Full access to all modules and admin settings.",
    level: 100,
    isSystemRole: true,
    roleStringPatterns: ["head of sales", "sales head", "vp sales", "vp of sales"],
    permissionGrants: ALL_PERM_KEYS,
    dataAccessPolicies: [
      { module: "CRM", scope: "ALL" }, { module: "Finance", scope: "ALL" },
      { module: "Settings", scope: "ALL" }, { module: "Reports", scope: "ALL" },
      { module: "Masters", scope: "ALL" },
    ],
  },
  {
    name: "Operations Head",
    description: "Finance admin + all-scope visibility. Approves advances and expenses.",
    level: 90,
    isSystemRole: false,
    roleStringPatterns: ["operations head", "head of operations"],
    permissionGrants: [
      "Finance:Invoice:VIEW","Finance:Invoice:CREATE","Finance:Invoice:EDIT","Finance:Invoice:APPROVE","Finance:Invoice:EXPORT",
      "Finance:Expense:VIEW","Finance:Expense:CREATE","Finance:Expense:EDIT","Finance:Expense:APPROVE",
      "Finance:Payment:VIEW","Finance:Payment:CREATE","Finance:Payment:APPROVE",
      "Finance:Advance:VIEW","Finance:Advance:CREATE","Finance:Advance:APPROVE",
      "CRM:Lead:VIEW","CRM:Opportunity:VIEW","CRM:Activity:VIEW",
      "CRM:SalesFunnel:VIEW","CRM:LeadGen:VIEW",
      "CRM:Collection:VIEW","CRM:Collection:CREATE","CRM:Collection:EDIT",
      "CRM:DailyUpdate:VIEW","CRM:KRA:VIEW","CRM:Employee:VIEW",
      "Settings:Configuration:VIEW","Settings:Configuration:EDIT",
      "Settings:UserManagement:VIEW","Settings:UserManagement:EDIT",
      "Settings:RoleManagement:VIEW","Settings:RoleManagement:EDIT",
      "Settings:Organization:VIEW","Settings:Organization:EDIT",
      "Settings:Finance:VIEW","Settings:Finance:EDIT",
      "Settings:Performance:VIEW","Settings:Performance:EDIT",
      "Settings:CommunicationAdmin:VIEW","Settings:CommunicationAdmin:EDIT",
      "Settings:IntegrationAdmin:VIEW","Settings:IntegrationAdmin:EDIT",
      "Settings:SecurityAdmin:VIEW","Settings:SecurityAdmin:EDIT",
      "Reports:Dashboard:VIEW","Reports:Dashboard:EXPORT",
      "Reports:Analytics:VIEW","Reports:Analytics:EXPORT",
      "Masters:CustomerMaster:VIEW","Masters:VendorMaster:VIEW",
    ],
    dataAccessPolicies: [
      { module: "CRM", scope: "ALL" }, { module: "Finance", scope: "ALL" },
      { module: "Reports", scope: "ALL" }, { module: "Masters", scope: "ALL" },
    ],
  },
  {
    name: "Business Development Manager",
    description: "Senior sales role — full pipeline, analytics, team visibility.",
    level: 70,
    isSystemRole: false,
    roleStringPatterns: ["business development manager", "bdm", "sales manager"],
    permissionGrants: [
      "CRM:Lead:VIEW","CRM:Lead:CREATE","CRM:Lead:EDIT","CRM:Lead:DELETE","CRM:Lead:ASSIGN",
      "CRM:Opportunity:VIEW","CRM:Opportunity:CREATE","CRM:Opportunity:EDIT","CRM:Opportunity:DELETE","CRM:Opportunity:APPROVE",
      "CRM:Activity:VIEW","CRM:Activity:CREATE",
      "CRM:Report:VIEW","CRM:Report:EXPORT",
      "CRM:SalesFunnel:VIEW","CRM:SalesFunnel:CREATE","CRM:SalesFunnel:EDIT","CRM:SalesFunnel:DELETE",
      "CRM:LeadGen:VIEW","CRM:LeadGen:CREATE","CRM:LeadGen:EDIT",
      "CRM:Collection:VIEW","CRM:Collection:CREATE","CRM:Collection:EDIT",
      "CRM:DailyUpdate:VIEW","CRM:DailyUpdate:CREATE","CRM:DailyUpdate:EDIT",
      "CRM:KRA:VIEW","CRM:Employee:VIEW",
      "Reports:Dashboard:VIEW","Reports:Analytics:VIEW",
      "Masters:CustomerMaster:VIEW","Masters:CustomerMaster:CREATE","Masters:CustomerMaster:EDIT",
      "Masters:VendorMaster:VIEW",
    ],
    dataAccessPolicies: [
      { module: "CRM", scope: "TEAM" }, { module: "Finance", scope: "TEAM" },
      { module: "Reports", scope: "TEAM" },
    ],
  },
  {
    name: "BDE",
    description: "Business Development Executive — own pipeline and activities.",
    level: 40,
    isSystemRole: false,
    roleStringPatterns: ["bde", "business development executive"],
    permissionGrants: [
      "CRM:Lead:VIEW","CRM:Lead:CREATE","CRM:Lead:EDIT",
      "CRM:Opportunity:VIEW","CRM:Opportunity:CREATE","CRM:Opportunity:EDIT",
      "CRM:Activity:VIEW","CRM:Activity:CREATE",
      "CRM:SalesFunnel:VIEW","CRM:SalesFunnel:CREATE","CRM:SalesFunnel:EDIT",
      "CRM:LeadGen:VIEW","CRM:LeadGen:CREATE","CRM:LeadGen:EDIT",
      "CRM:Collection:VIEW","CRM:Collection:CREATE","CRM:Collection:EDIT",
      "CRM:DailyUpdate:VIEW","CRM:DailyUpdate:CREATE","CRM:DailyUpdate:EDIT",
      "CRM:KRA:VIEW","Reports:Dashboard:VIEW","Masters:CustomerMaster:VIEW",
    ],
    dataAccessPolicies: [
      { module: "CRM", scope: "OWN" }, { module: "Finance", scope: "OWN" },
    ],
  },
  {
    name: "Inside Sales",
    description: "Inside sales representative — own pipeline and lead generation.",
    level: 40,
    isSystemRole: false,
    roleStringPatterns: ["inside sales"],
    permissionGrants: [
      "CRM:Lead:VIEW","CRM:Lead:CREATE","CRM:Lead:EDIT",
      "CRM:Opportunity:VIEW","CRM:Opportunity:CREATE","CRM:Opportunity:EDIT",
      "CRM:Activity:VIEW","CRM:Activity:CREATE",
      "CRM:SalesFunnel:VIEW","CRM:SalesFunnel:CREATE","CRM:SalesFunnel:EDIT",
      "CRM:LeadGen:VIEW","CRM:LeadGen:CREATE","CRM:LeadGen:EDIT",
      "CRM:Collection:VIEW","CRM:Collection:CREATE","CRM:Collection:EDIT",
      "CRM:DailyUpdate:VIEW","CRM:DailyUpdate:CREATE","CRM:DailyUpdate:EDIT",
      "CRM:KRA:VIEW","Reports:Dashboard:VIEW","Masters:CustomerMaster:VIEW",
    ],
    dataAccessPolicies: [
      { module: "CRM", scope: "OWN" }, { module: "Finance", scope: "OWN" },
    ],
  },
  {
    name: "ISR",
    description: "Inside Sales Representative — pipeline and lead gen access.",
    level: 35,
    isSystemRole: false,
    roleStringPatterns: ["isr"],
    permissionGrants: [
      "CRM:Lead:VIEW","CRM:Lead:CREATE","CRM:Lead:EDIT",
      "CRM:Opportunity:VIEW","CRM:Opportunity:CREATE",
      "CRM:Activity:VIEW","CRM:Activity:CREATE",
      "CRM:SalesFunnel:VIEW","CRM:SalesFunnel:CREATE","CRM:SalesFunnel:EDIT",
      "CRM:LeadGen:VIEW","CRM:LeadGen:CREATE","CRM:LeadGen:EDIT",
      "CRM:Collection:VIEW","CRM:Collection:CREATE",
      "CRM:DailyUpdate:VIEW","CRM:DailyUpdate:CREATE","CRM:DailyUpdate:EDIT",
      "CRM:KRA:VIEW","Reports:Dashboard:VIEW",
    ],
    dataAccessPolicies: [
      { module: "CRM", scope: "OWN" }, { module: "Finance", scope: "OWN" },
    ],
  },
  {
    name: "Sales Coordinator",
    description: "Coordinates sales activities — daily updates and collections.",
    level: 30,
    isSystemRole: false,
    roleStringPatterns: ["sales coordinator", "coordinator"],
    permissionGrants: [
      "CRM:Lead:VIEW","CRM:Opportunity:VIEW",
      "CRM:Activity:VIEW","CRM:Activity:CREATE",
      "CRM:SalesFunnel:VIEW","CRM:LeadGen:VIEW",
      "CRM:Collection:VIEW","CRM:Collection:CREATE","CRM:Collection:EDIT",
      "CRM:DailyUpdate:VIEW","CRM:DailyUpdate:CREATE","CRM:DailyUpdate:EDIT",
      "CRM:KRA:VIEW","Reports:Dashboard:VIEW",
    ],
    dataAccessPolicies: [
      { module: "CRM", scope: "OWN" }, { module: "Finance", scope: "OWN" },
    ],
  },
  {
    name: "Accounts",
    description: "Finance team — full collections, payments and billing access.",
    level: 20,
    isSystemRole: false,
    roleStringPatterns: ["accounts"],
    permissionGrants: [
      "Finance:Invoice:VIEW","Finance:Invoice:CREATE","Finance:Invoice:EDIT","Finance:Invoice:DELETE","Finance:Invoice:APPROVE","Finance:Invoice:EXPORT",
      "Finance:Expense:VIEW","Finance:Expense:CREATE","Finance:Expense:EDIT","Finance:Expense:APPROVE",
      "Finance:Payment:VIEW","Finance:Payment:CREATE","Finance:Payment:APPROVE",
      "Finance:Advance:VIEW","Finance:Advance:APPROVE",
      "CRM:Collection:VIEW","CRM:Collection:CREATE","CRM:Collection:EDIT","CRM:Collection:DELETE",
      "CRM:DailyUpdate:VIEW","CRM:KRA:VIEW",
      "Reports:Dashboard:VIEW","Masters:CustomerMaster:VIEW",
    ],
    dataAccessPolicies: [
      { module: "Finance", scope: "COMPANY" }, { module: "CRM", scope: "COMPANY" },
    ],
  },
];

function matchRole(employeeRole: string | null, patterns: string[]): boolean {
  const r = (employeeRole ?? "").toLowerCase().trim();
  return patterns.some(p => r.includes(p.toLowerCase()));
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== SEED_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const log: string[] = [];
  try {
    // 1. Seed permissions
    let permCreated = 0, permSkipped = 0;
    const permMap: Record<string, number> = {};

    for (const p of PERMISSIONS) {
      const existing = await prisma.permission.findUnique({
        where: { module_resource_action: { module: p.module, resource: p.resource, action: p.action } },
      });
      if (existing) {
        permMap[`${p.module}:${p.resource}:${p.action}`] = existing.id;
        permSkipped++;
      } else {
        const created = await prisma.permission.create({ data: { ...p } });
        permMap[`${p.module}:${p.resource}:${p.action}`] = created.id;
        permCreated++;
      }
    }
    log.push(`Permissions: ${permCreated} created, ${permSkipped} existed`);

    // 2. Seed roles + grants + policies
    const roleMap: Record<string, number> = {};
    for (const roleDef of ROLE_DEFS) {
      let role = await prisma.role.findFirst({ where: { name: roleDef.name } });
      if (!role) {
        role = await prisma.role.create({
          data: { name: roleDef.name, description: roleDef.description, level: roleDef.level, isSystemRole: roleDef.isSystemRole, status: "ACTIVE" },
        });
        log.push(`Created role: ${roleDef.name}`);
      } else {
        log.push(`Role exists: ${roleDef.name}`);
      }
      roleMap[roleDef.name] = role.id;

      for (const permKey of roleDef.permissionGrants) {
        const permId = permMap[permKey];
        if (!permId) continue;
        const existing = await prisma.rolePermission.findUnique({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
        });
        if (!existing) {
          await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permId } });
        }
      }

      for (const policy of roleDef.dataAccessPolicies) {
        const existing = await prisma.dataAccessPolicy.findUnique({
          where: { roleId_module: { roleId: role.id, module: policy.module } },
        });
        if (!existing) {
          await prisma.dataAccessPolicy.create({ data: { roleId: role.id, module: policy.module, scope: policy.scope } });
        }
      }
    }

    // 3. Assign UserRoles
    const employees = await prisma.employee.findMany({ select: { id: true, name: true, role: true, isManager: true } });
    let assigned = 0, skipped = 0;

    for (const emp of employees) {
      let targetRoleName: string | null = null;

      if (emp.isManager) {
        for (const roleDef of ROLE_DEFS) {
          if (matchRole(emp.role, roleDef.roleStringPatterns)) { targetRoleName = roleDef.name; break; }
        }
        if (!targetRoleName) targetRoleName = "Head of Sales";
      } else {
        for (const roleDef of ROLE_DEFS) {
          if (matchRole(emp.role, roleDef.roleStringPatterns)) { targetRoleName = roleDef.name; break; }
        }
        if (!targetRoleName) targetRoleName = "BDE";
      }

      const roleId = roleMap[targetRoleName];
      if (!roleId) continue;

      const existing = await prisma.userRole.findUnique({
        where: { userId_roleId: { userId: emp.id, roleId } },
      });
      if (existing) { skipped++; } else {
        await prisma.userRole.create({ data: { userId: emp.id, roleId } });
        log.push(`Assigned: ${emp.name} (${emp.role ?? "no role"}) → ${targetRoleName}`);
        assigned++;
      }
    }
    log.push(`UserRoles: ${assigned} assigned, ${skipped} existed`);

    return NextResponse.json({ ok: true, log });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err), log }, { status: 500 });
  }
}
