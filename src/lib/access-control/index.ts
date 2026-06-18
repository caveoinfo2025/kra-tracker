/**
 * Enterprise Access Control — public API
 *
 * Usage in API routes:
 *   import { requirePermission } from "@/lib/access-control";
 *
 *   const deny = await requirePermission(session, "CRM", "Lead", "EDIT");
 *   if (deny) return deny; // returns 401 or 403 NextResponse
 *
 * Lower-level helpers:
 *   hasPermission(userId, module, resource, action) → boolean
 *   canAccessScope(userId, module, { ownerEmployeeId }) → boolean
 *
 * Backward-compatibility:
 *   - hasPermission returns true for isManager=true employees regardless of UserRole rows.
 *   - canAccessScope returns true (allow-all) when no DataAccessPolicy is configured.
 *   - Existing routes using isManager predicates continue to work unchanged.
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { Session } from "next-auth";

// ── requirePermission ─────────────────────────────────────────────────────────
// Drop-in for API routes. Returns a 401/403 NextResponse on failure, or null on
// success. isManager employees always pass regardless of UserRole rows.
//
//   const deny = await requirePermission(session, "Settings", "Configuration", "EDIT");
//   if (deny) return deny;
//
export async function requirePermission(
  session: Session | null | undefined,
  module: string,
  resource: string,
  action: string,
): Promise<NextResponse | null> {
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Managers always have full access (backward-compatible)
  if (session.user.isManager) return null;

  const userId = (session.user as { employeeId?: number }).employeeId;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await hasPermission(userId, module, resource, action);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// ── requireManager ────────────────────────────────────────────────────────────
// Shorthand for routes that still use the simple isManager gate.
// Returns 401/403 NextResponse, or null if the user is a manager.
export function requireManager(
  session: Session | null | undefined,
): NextResponse | null {
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

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
