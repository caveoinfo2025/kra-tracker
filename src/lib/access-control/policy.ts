/**
 * Data access scope helpers.
 *
 * canAccessScope() decides whether a user is allowed to read/write a record
 * based on the DataAccessPolicy rows stored for their roles.
 *
 * Phase 2: queries the DB for policies. Falls back to ALLOW if no policy
 * exists for the module so existing pages keep working during migration.
 */

import prisma from "@/lib/prisma";
import type { Scope } from "./permissions";
import { SCOPE } from "./permissions";

export interface ScopeRecord {
  /** The employee who owns the record (e.g. expense.employeeId). */
  ownerEmployeeId?: number | null;
  /** The branch the record belongs to. */
  branchId?: number | null;
  /** The department the record belongs to. */
  departmentId?: number | null;
}

/**
 * Resolves the effective scope for a user against a module.
 * Returns the widest scope found across all of the user's roles.
 * Returns null if no DataAccessPolicy exists for this user+module pair
 * (caller should default to ALLOW for backward compatibility).
 */
export async function resolveScope(
  userId: number,
  module: string,
): Promise<Scope | null> {
  // Get all roleIds for this employee
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    select: { roleId: true },
  });
  if (userRoles.length === 0) return null;

  const roleIds = userRoles.map((r) => r.roleId);

  // Fetch all DataAccessPolicy rows for those roles and this module
  const policies = await prisma.dataAccessPolicy.findMany({
    where: { roleId: { in: roleIds }, module },
    select: { scope: true },
  });
  if (policies.length === 0) return null;

  // Return the widest scope (ALL > COMPANY > BRANCH > DEPARTMENT > TEAM > OWN)
  const SCOPE_RANK: Record<string, number> = {
    [SCOPE.OWN]:        1,
    [SCOPE.TEAM]:       2,
    [SCOPE.DEPARTMENT]: 3,
    [SCOPE.BRANCH]:     4,
    [SCOPE.COMPANY]:    5,
    [SCOPE.ALL]:        6,
  };

  let best = SCOPE.OWN as Scope;
  for (const { scope } of policies) {
    if ((SCOPE_RANK[scope] ?? 0) > (SCOPE_RANK[best] ?? 0)) {
      best = scope as Scope;
    }
  }
  return best;
}

/**
 * Returns true if the user can access the given record according to their
 * DataAccessPolicy for the specified module.
 *
 * Falls back to true (ALLOW) when no policy is configured — this preserves
 * backward compatibility while Phase 3 wires all existing gates.
 */
export async function canAccessScope(
  userId: number,
  module: string,
  record: ScopeRecord,
): Promise<boolean> {
  const scope = await resolveScope(userId, module);

  // No policy configured → allow (backward-compatible fallback)
  if (scope === null) return true;

  switch (scope) {
    case SCOPE.ALL:
    case SCOPE.COMPANY:
      return true;

    case SCOPE.BRANCH: {
      if (!record.branchId) return true; // no branch constraint on record
      const profile = await prisma.employeeProfile.findUnique({
        where: { userId },
        select: { branchId: true },
      });
      return profile?.branchId === record.branchId;
    }

    case SCOPE.DEPARTMENT: {
      if (!record.departmentId) return true;
      const profile = await prisma.employeeProfile.findUnique({
        where: { userId },
        select: { departmentId: true },
      });
      return profile?.departmentId === record.departmentId;
    }

    case SCOPE.TEAM: {
      // Team scope: the record owner must be in the same team as the user.
      if (!record.ownerEmployeeId) return false;
      const [userProfile, ownerProfile] = await Promise.all([
        prisma.employeeProfile.findUnique({
          where: { userId },
          select: { teamId: true },
        }),
        prisma.employeeProfile.findUnique({
          where: { userId: record.ownerEmployeeId },
          select: { teamId: true },
        }),
      ]);
      if (!userProfile?.teamId) return false;
      return userProfile.teamId === ownerProfile?.teamId;
    }

    case SCOPE.OWN:
    default:
      return record.ownerEmployeeId === userId;
  }
}
