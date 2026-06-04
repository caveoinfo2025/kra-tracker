/**
 * Enterprise Access Control — public API
 *
 * Usage (server component / API route):
 *   import { hasPermission, canAccessScope } from "@/lib/access-control";
 *
 *   const allowed = await hasPermission(session.user.id, "CRM", "Opportunity", "EDIT");
 *   const inScope = await canAccessScope(session.user.id, "CRM", { ownerEmployeeId: lead.assignedToId });
 *
 * Phase 2 behaviour:
 *   - Returns false from hasPermission when the user has NO UserRole rows (new table empty).
 *   - Returns true  from canAccessScope when no DataAccessPolicy exists (backward-compatible).
 *   - All existing pages continue to use roles.ts predicates unchanged.
 *   - Phase 3 will wire hasPermission into roles.ts predicates one by one.
 */

import prisma from "@/lib/prisma";
export { canAccessScope } from "./policy";
export { PERMISSION_CATALOGUE, MODULE, ACTION, SCOPE } from "./permissions";
export type { Module, Action, Scope, PermissionDef } from "./permissions";
export type { ScopeRecord } from "./policy";

/**
 * Returns true if the employee (identified by their Employee.id) holds a role
 * that has been granted the specified (module, resource, action) permission.
 *
 * Caching: results are NOT cached here — wrap in React `cache()` or a
 * per-request Map in server components that call this multiple times.
 */
export async function hasPermission(
  userId: number,
  module: string,
  resource: string,
  action: string,
): Promise<boolean> {
  // Resolve all role IDs for this employee
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    select: { roleId: true },
  });
  if (userRoles.length === 0) return false;

  const roleIds = userRoles.map((r) => r.roleId);

  // Check if any of those roles has the requested permission
  const match = await prisma.rolePermission.findFirst({
    where: {
      roleId: { in: roleIds },
      permission: { module, resource, action },
    },
    select: { id: true },
  });

  return match !== null;
}

/**
 * Returns every (module, resource, action) tuple the employee is allowed to
 * perform — useful for building client-side capability maps without hitting
 * the DB once per permission check.
 */
export async function getAllPermissions(
  userId: number,
): Promise<Array<{ module: string; resource: string; action: string }>> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    select: { roleId: true },
  });
  if (userRoles.length === 0) return [];

  const roleIds = userRoles.map((r) => r.roleId);

  const rows = await prisma.rolePermission.findMany({
    where: { roleId: { in: roleIds } },
    include: { permission: { select: { module: true, resource: true, action: true } } },
  });

  // Deduplicate (multiple roles may grant the same permission)
  const seen = new Set<string>();
  const result: Array<{ module: string; resource: string; action: string }> = [];
  for (const row of rows) {
    const key = `${row.permission.module}:${row.permission.resource}:${row.permission.action}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(row.permission);
    }
  }
  return result;
}
