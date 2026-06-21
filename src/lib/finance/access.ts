/**
 * Finance read-API access helpers — Step 2M (RBAC migration).
 *
 * Bridges Finance GET routes from the legacy `canManageFinance()` (roles.ts)
 * predicate to `access-control` permissions, while that predicate remains a
 * temporary fallback until every Finance-Operations role is granted the
 * equivalent `access-control` permission via /settings/identity.
 *
 * Catalogue gaps (see docs/RBAC_MIGRATION_TRACKER.md §8 and
 * docs/modules/finance/FINANCE_WRITE_ACCESS_CONTROL_PLAN.md §3/§12):
 *   - No dedicated BankBook / CashBook / Voucher / Conveyance resource exists
 *     in PERMISSION_CATALOGUE — `Finance/Payment/VIEW` is used as the closest
 *     fit for BankBook/CashBook/Accounts/Vouchers, and `Finance/Expense/VIEW`
 *     for Conveyance (conveyance is travel-expense reimbursement on the
 *     TravelClaim model).
 *   - No permission was invented to fill these gaps.
 */

import type { Session } from "next-auth";
import { hasPermission } from "@/lib/access-control";
import { canManageFinance } from "@/lib/roles";

function employeeIdOf(session: Session): number | undefined {
  return (session.user as { employeeId?: number }).employeeId;
}

/**
 * Finance Operations (Bank Book / Cash Book / Accounts) read gate.
 * `Finance/Payment/VIEW` is the closest existing permission — no dedicated
 * BankBook/CashBook/Account resource exists in the catalogue (documented
 * gap). Falls back to `canManageFinance()` until Finance-Operations roles
 * hold the real grant.
 */
export async function canViewFinancePayments(session: Session): Promise<boolean> {
  const employeeId = employeeIdOf(session);
  if (employeeId !== undefined && (await hasPermission(employeeId, "Finance", "Payment", "VIEW"))) {
    return true;
  }
  return canManageFinance(session.user);
}

/**
 * Voucher register / detail / sequence read gate. `Finance/Voucher` does not
 * exist as a resource at all (documented gap) — `Finance/Payment/VIEW` is
 * the closest fit, OR'd with `Settings/Finance/VIEW` (the existing
 * voucher-numbering/config permission already used by the Finance-admin
 * routes). Falls back to `canManageFinance()`.
 */
export async function canViewFinanceVouchers(session: Session): Promise<boolean> {
  const employeeId = employeeIdOf(session);
  if (employeeId !== undefined) {
    const [paymentView, settingsFinanceView] = await Promise.all([
      hasPermission(employeeId, "Finance", "Payment", "VIEW"),
      hasPermission(employeeId, "Settings", "Finance", "VIEW"),
    ]);
    if (paymentView || settingsFinanceView) return true;
  }
  return canManageFinance(session.user);
}

/**
 * Finance Dashboard read gate. Any one of the Finance read permissions is
 * sufficient — the dashboard aggregates across Expense/Payment/Advance, so a
 * role granted only one of those should still see the dashboard. Falls back
 * to `canManageFinance()`.
 */
export async function canViewFinanceDashboard(session: Session): Promise<boolean> {
  const employeeId = employeeIdOf(session);
  if (employeeId !== undefined) {
    const [expenseView, paymentView, advanceView] = await Promise.all([
      hasPermission(employeeId, "Finance", "Expense", "VIEW"),
      hasPermission(employeeId, "Finance", "Payment", "VIEW"),
      hasPermission(employeeId, "Finance", "Advance", "VIEW"),
    ]);
    if (expenseView || paymentView || advanceView) return true;
  }
  return canManageFinance(session.user);
}

/**
 * Expense Register full-visibility (all employees') gate. Grants scoped
 * cross-employee access via `Finance/Expense/VIEW`; otherwise the caller
 * must fall back to own-data-only filtering. Falls back to
 * `canManageFinance()`.
 */
export async function canViewAllFinanceExpenses(session: Session): Promise<boolean> {
  const employeeId = employeeIdOf(session);
  if (employeeId !== undefined && (await hasPermission(employeeId, "Finance", "Expense", "VIEW"))) {
    return true;
  }
  return canManageFinance(session.user);
}

/**
 * Employee Advances full-visibility (all employees') gate via
 * `Finance/Advance/VIEW`. Falls back to `canManageFinance()`.
 */
export async function canViewAllFinanceAdvances(session: Session): Promise<boolean> {
  const employeeId = employeeIdOf(session);
  if (employeeId !== undefined && (await hasPermission(employeeId, "Finance", "Advance", "VIEW"))) {
    return true;
  }
  return canManageFinance(session.user);
}

/**
 * Local Conveyance (TravelClaim) full-visibility gate. No dedicated
 * `Finance/Conveyance` resource exists (documented gap) — conveyance is
 * travel-expense reimbursement, so `Finance/Expense/VIEW` is the closest
 * fit. Preserves the prior inline `isManager || isAccounts || isOperationsHead`
 * behavior via the `canManageFinance()` fallback.
 */
export async function canViewAllConveyance(session: Session): Promise<boolean> {
  return canViewAllFinanceExpenses(session);
}

/** True when the request's target employeeId is the caller's own record. */
export function isSelfFinanceRequest(
  session: Session,
  employeeId: number | null | undefined,
): boolean {
  const sessionEmployeeId = employeeIdOf(session);
  return sessionEmployeeId !== undefined && employeeId === sessionEmployeeId;
}
