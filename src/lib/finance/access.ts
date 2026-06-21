/**
 * Finance read-API access helpers — Step 2M/2S (RBAC migration).
 *
 * Bridges Finance GET routes from the legacy `canManageFinance()` (roles.ts)
 * predicate to `access-control` permissions, while that predicate remains a
 * temporary fallback until every Finance-Operations role is granted the
 * equivalent `access-control` permission via /settings/identity.
 *
 * Step 2S added dedicated `Finance/Voucher`, `Finance/BankBook`,
 * `Finance/CashBook`, and `Finance/Conveyance` resources to
 * `PERMISSION_CATALOGUE`, closing the catalogue gaps Step 2M/2R had
 * documented (see docs/RBAC_MIGRATION_TRACKER.md §8/§11). Each helper below
 * now checks its dedicated resource first. No role is yet granted these new
 * permissions by the seed script (see docs/RBAC_MIGRATION_TRACKER.md §12),
 * so every helper still falls through to the prior closest-fit permission
 * and finally to `canManageFinance()` — this is the temporary bridge, kept
 * so no Finance-Operations user loses access while roles are migrated.
 */

import type { Session } from "next-auth";
import { hasPermission } from "@/lib/access-control";
import { canManageFinance } from "@/lib/roles";

function employeeIdOf(session: Session): number | undefined {
  return (session.user as { employeeId?: number }).employeeId;
}

/**
 * Chart-of-accounts (FinAccount) read gate. No dedicated `Account` resource
 * exists — `Finance/Payment/VIEW` remains the closest fit (the account list
 * is shared by both Bank Book and Cash Book UIs, not a ledger itself).
 * Temporary fallback retained until roles are fully granted dedicated
 * Finance permissions.
 */
export async function canViewFinancePayments(session: Session): Promise<boolean> {
  const employeeId = employeeIdOf(session);
  if (employeeId !== undefined && (await hasPermission(employeeId, "Finance", "Payment", "VIEW"))) {
    return true;
  }
  return canManageFinance(session.user);
}

/**
 * Bank Book read gate. Checks the dedicated `Finance/BankBook/VIEW`
 * permission first (added Step 2S). Falls through to `Finance/Payment/VIEW`
 * (the prior closest-fit bridge) and finally `canManageFinance()`.
 * Temporary fallback retained until roles are fully granted dedicated
 * Finance permissions.
 */
export async function canViewFinanceBankBook(session: Session): Promise<boolean> {
  const employeeId = employeeIdOf(session);
  if (employeeId !== undefined) {
    const [bankBookView, paymentView] = await Promise.all([
      hasPermission(employeeId, "Finance", "BankBook", "VIEW"),
      hasPermission(employeeId, "Finance", "Payment", "VIEW"),
    ]);
    if (bankBookView || paymentView) return true;
  }
  return canManageFinance(session.user);
}

/**
 * Cash Book read gate. Checks the dedicated `Finance/CashBook/VIEW`
 * permission first (added Step 2S). Falls through to `Finance/Payment/VIEW`
 * (the prior closest-fit bridge) and finally `canManageFinance()`.
 * Temporary fallback retained until roles are fully granted dedicated
 * Finance permissions.
 */
export async function canViewFinanceCashBook(session: Session): Promise<boolean> {
  const employeeId = employeeIdOf(session);
  if (employeeId !== undefined) {
    const [cashBookView, paymentView] = await Promise.all([
      hasPermission(employeeId, "Finance", "CashBook", "VIEW"),
      hasPermission(employeeId, "Finance", "Payment", "VIEW"),
    ]);
    if (cashBookView || paymentView) return true;
  }
  return canManageFinance(session.user);
}

/**
 * Voucher register / detail / sequence read gate. Checks the dedicated
 * `Finance/Voucher/VIEW` permission first (added Step 2S). Falls through to
 * `Finance/Payment/VIEW` OR `Settings/Finance/VIEW` (the prior closest-fit
 * bridge — the latter is the existing voucher-numbering/config permission
 * already used by the Finance-admin routes) and finally `canManageFinance()`.
 * Temporary fallback retained until roles are fully granted dedicated
 * Finance permissions.
 */
export async function canViewFinanceVouchers(session: Session): Promise<boolean> {
  const employeeId = employeeIdOf(session);
  if (employeeId !== undefined) {
    const [voucherView, paymentView, settingsFinanceView] = await Promise.all([
      hasPermission(employeeId, "Finance", "Voucher", "VIEW"),
      hasPermission(employeeId, "Finance", "Payment", "VIEW"),
      hasPermission(employeeId, "Settings", "Finance", "VIEW"),
    ]);
    if (voucherView || paymentView || settingsFinanceView) return true;
  }
  return canManageFinance(session.user);
}

/**
 * Finance Dashboard read gate. Any one of the Finance read permissions is
 * sufficient — the dashboard aggregates across Expense/Payment/Advance and
 * (since Step 2S) Voucher, so a role granted only one of those should still
 * see the dashboard. Falls back to `canManageFinance()`.
 */
export async function canViewFinanceDashboard(session: Session): Promise<boolean> {
  const employeeId = employeeIdOf(session);
  if (employeeId !== undefined) {
    const [expenseView, paymentView, advanceView, voucherView] = await Promise.all([
      hasPermission(employeeId, "Finance", "Expense", "VIEW"),
      hasPermission(employeeId, "Finance", "Payment", "VIEW"),
      hasPermission(employeeId, "Finance", "Advance", "VIEW"),
      hasPermission(employeeId, "Finance", "Voucher", "VIEW"),
    ]);
    if (expenseView || paymentView || advanceView || voucherView) return true;
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
 * Local Conveyance (TravelClaim) full-visibility gate. Checks the dedicated
 * `Finance/Conveyance/VIEW` permission first (added Step 2S). Falls through
 * to `Finance/Expense/VIEW` (the prior closest-fit bridge — conveyance is
 * travel-expense reimbursement) and finally `canManageFinance()`, which is
 * equivalent to the original inline `isManager || isAccounts ||
 * isOperationsHead` check. Temporary fallback retained until roles are fully
 * granted dedicated Finance permissions.
 */
export async function canViewAllConveyance(session: Session): Promise<boolean> {
  const employeeId = employeeIdOf(session);
  if (employeeId !== undefined) {
    const [conveyanceView, expenseView] = await Promise.all([
      hasPermission(employeeId, "Finance", "Conveyance", "VIEW"),
      hasPermission(employeeId, "Finance", "Expense", "VIEW"),
    ]);
    if (conveyanceView || expenseView) return true;
  }
  return canManageFinance(session.user);
}

/** True when the request's target employeeId is the caller's own record. */
export function isSelfFinanceRequest(
  session: Session,
  employeeId: number | null | undefined,
): boolean {
  const sessionEmployeeId = employeeIdOf(session);
  return sessionEmployeeId !== undefined && employeeId === sessionEmployeeId;
}
