/**
 * Central role helpers — single source of truth for access checks so gating
 * stays consistent across pages and API routes.
 */

export type SessionUser = {
  isManager?: boolean;
  role?: string | null;
};

/** Roles that operate the finance/accounts module. */
export const ACCOUNTS_ROLE = "Accounts";
export const OPERATIONS_HEAD_ROLE = "Operations Head";

/** Operations Head — sits above Accounts, reports to the sales head. */
export function isOperationsHead(user?: SessionUser | null): boolean {
  return user?.role === OPERATIONS_HEAD_ROLE;
}

/** Accounts staff. */
export function isAccounts(user?: SessionUser | null): boolean {
  return user?.role === ACCOUNTS_ROLE;
}

/**
 * Can view ALL billing/collections/payments (not just their own).
 * Managers, Accounts, and the Operations Head all get full finance visibility.
 */
export function canSeeAllCollections(user?: SessionUser | null): boolean {
  return !!user?.isManager || isAccounts(user) || isOperationsHead(user);
}

/**
 * Can record/modify payments and advances.
 * Same set as full-visibility finance users.
 */
export function canManagePayments(user?: SessionUser | null): boolean {
  return !!user?.isManager || isAccounts(user) || isOperationsHead(user);
}

/**
 * Has manager-level reach across the app (dashboards, team views, etc.).
 * The Operations Head gets a manager-like experience without the isManager flag.
 */
export function hasManagerReach(user?: SessionUser | null): boolean {
  return !!user?.isManager || isOperationsHead(user);
}

/** Should the sidebar render the Finance/Accounts navigation group? */
export function usesFinanceNav(user?: SessionUser | null): boolean {
  // Pure Accounts and Operations Head (when not already a manager) use the
  // finance-focused sidebar.
  return !user?.isManager && (isAccounts(user) || isOperationsHead(user));
}
