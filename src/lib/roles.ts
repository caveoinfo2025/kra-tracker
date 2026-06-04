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

function roleText(user?: SessionUser | null): string {
  return (user?.role ?? "").toLowerCase();
}

/**
 * Operations Head — sits above Accounts, reports to the sales head.
 * Matched flexibly so variants like "Operations Head", "HR & Operations Head",
 * or "Head of Operations" all qualify.
 */
export function isOperationsHead(user?: SessionUser | null): boolean {
  const r = roleText(user);
  return (
    r.includes("operations head") ||
    r.includes("head of operations") ||
    (r.includes("operations") && r.includes("head"))
  );
}

/** Accounts staff (also matches "Accounts Manager", "Accounts Executive", etc.). */
export function isAccounts(user?: SessionUser | null): boolean {
  return roleText(user).includes("accounts");
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

/**
 * Can access the Finance Operations module (/finance/* routes).
 * Same set as canManagePayments — managers, Accounts, and Operations Head.
 */
export function canManageFinance(user?: SessionUser | null): boolean {
  return !!user?.isManager || isAccounts(user) || isOperationsHead(user);
}

/**
 * Is Head of Sales — matched flexibly so "Head of Sales", "Sales Head",
 * "VP Sales" etc. all qualify.
 */
export function isHeadOfSales(user?: SessionUser | null): boolean {
  const r = roleText(user);
  return (
    (r.includes("head") && r.includes("sales")) ||
    r.includes("sales head") ||
    r.includes("vp sales") ||
    r.includes("vp of sales")
  );
}

/**
 * Can access Settings (Administration, Users & Roles, Approval Engine config).
 * Operations Head = full config admin. Head of Sales = full access.
 */
export function canAccessSettings(user?: SessionUser | null): boolean {
  return isOperationsHead(user) || isHeadOfSales(user);
}

// ── Phase 3 migration bridge ──────────────────────────────────────────────────
// The predicates above are the legacy role-string system (AppRole + isManager).
// New code should prefer the DB-driven permission service:
//
//   import { hasPermission, canAccessScope } from "@/lib/access-control";
//   const ok = await hasPermission(userId, "CRM", "Lead", "EDIT");
//
// Phase 3 will gradually replace each predicate above with hasPermission() calls
// so both systems remain live until the migration is complete.
