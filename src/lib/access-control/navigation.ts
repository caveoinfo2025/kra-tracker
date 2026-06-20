/**
 * Navigation visibility helper — Step 2J.
 *
 * Computes which sidebar sections a session should see, derived from
 * access-control's actual (module, resource, action) grants instead of
 * hardcoded role-name checks. Loads all of a user's permissions ONCE per
 * request (a single DB round-trip via getAllPermissions()) rather than
 * calling hasPermission() once per nav item.
 *
 * Manager fallback: isManager employees see everything, matching
 * hasPermission()'s own backward-compatible manager bypass (index.ts:42).
 *
 * This is UX-only — it controls what's SHOWN, not what's ALLOWED. API and
 * page guards remain the real security boundary and are unaffected by this
 * file. See docs/RBAC_MIGRATION_TRACKER.md §8 for catalogue gaps referenced
 * in the comments below (no Settings/CRM, no Finance/Voucher, etc).
 */
import type { Session } from "next-auth";
import { getAllPermissions } from "./index";

export interface NavigationCapabilities {
  settings: {
    canViewSettings: boolean;
    canViewIdentity: boolean;
    canViewMasters: boolean;
    canViewFinanceSettings: boolean;
    canViewCRMSettings: boolean;
    canViewPolicy: boolean;
  };
  masters: {
    canViewCustomerMaster: boolean;
    canViewVendorMaster: boolean;
  };
  finance: {
    canViewFinance: boolean;
    canViewExpenses: boolean;
    canViewAdvances: boolean;
    canViewPayments: boolean;
    canViewVouchers: boolean;
    canApproveFinance: boolean;
  };
  workflow: {
    canViewApprovals: boolean;
    canViewWorkflowEngine: boolean;
  };
  crm: {
    canViewPipeline: boolean;
    canViewEmployees: boolean;
    canViewReports: boolean;
  };
}

const ALL_TRUE: NavigationCapabilities = {
  settings: { canViewSettings: true, canViewIdentity: true, canViewMasters: true, canViewFinanceSettings: true, canViewCRMSettings: true, canViewPolicy: true },
  masters:  { canViewCustomerMaster: true, canViewVendorMaster: true },
  finance:  { canViewFinance: true, canViewExpenses: true, canViewAdvances: true, canViewPayments: true, canViewVouchers: true, canApproveFinance: true },
  workflow: { canViewApprovals: true, canViewWorkflowEngine: true },
  crm:      { canViewPipeline: true, canViewEmployees: true, canViewReports: true },
};

const ALL_FALSE: NavigationCapabilities = {
  settings: { canViewSettings: false, canViewIdentity: false, canViewMasters: false, canViewFinanceSettings: false, canViewCRMSettings: false, canViewPolicy: false },
  masters:  { canViewCustomerMaster: false, canViewVendorMaster: false },
  finance:  { canViewFinance: false, canViewExpenses: false, canViewAdvances: false, canViewPayments: false, canViewVouchers: false, canApproveFinance: false },
  // Global Approvals stays a self-service inbox for everyone (§6 of the brief) — not access-control-gated.
  workflow: { canViewApprovals: true, canViewWorkflowEngine: false },
  crm:      { canViewPipeline: false, canViewEmployees: false, canViewReports: false },
};

export async function getNavigationCapabilities(
  session: Session | null | undefined,
): Promise<NavigationCapabilities> {
  if (!session?.user) return ALL_FALSE;
  if (session.user.isManager) return ALL_TRUE;

  const userId = (session.user as { employeeId?: number }).employeeId;
  if (!userId) return ALL_FALSE;

  const perms = await getAllPermissions(userId);
  const has = (module: string, resource: string, action: string) =>
    perms.some((p) => p.module === module && p.resource === resource && p.action === action);

  const canViewIdentity        = has("Settings", "Identity", "VIEW")  || has("Settings", "Identity", "EDIT");
  const canViewMasters         = has("Settings", "Masters", "VIEW")   || has("Settings", "Masters", "EDIT");
  const canViewFinanceSettings = has("Settings", "Finance", "VIEW")   || has("Settings", "Finance", "EDIT");
  const canViewPolicy          = has("Settings", "Policy", "VIEW")    || has("Settings", "Policy", "EDIT");
  const canViewOrganization    = has("Settings", "Organization", "VIEW") || has("Settings", "Organization", "EDIT");
  const canViewCommunication   = has("Settings", "CommunicationAdmin", "VIEW") || has("Settings", "CommunicationAdmin", "EDIT");
  const canViewIntegration     = has("Settings", "IntegrationAdmin", "VIEW")   || has("Settings", "IntegrationAdmin", "EDIT");
  const canViewSecurity        = has("Settings", "SecurityAdmin", "VIEW")      || has("Settings", "SecurityAdmin", "EDIT");
  // Settings/CRM does not exist in the catalogue yet (documented gap) — always false until it's added.
  const canViewCRMSettings = false;

  const canViewExpenses = has("Finance", "Expense", "VIEW");
  const canViewAdvances = has("Finance", "Advance", "VIEW");
  const canViewPayments = has("Finance", "Payment", "VIEW");
  // Finance/Voucher does not exist in the catalogue (documented gap) — always
  // false; the Vouchers nav item keeps relying on the legacy canManageFinance
  // bridge in SidebarLinks instead of this flag.
  const canViewVouchers = false;
  const canApproveFinance =
    has("Finance", "Expense", "APPROVE") ||
    has("Finance", "Advance", "APPROVE") ||
    has("Workflow", "ApprovalRequest", "APPROVE");

  const canViewSettings =
    canViewIdentity || canViewMasters || canViewFinanceSettings || canViewCRMSettings ||
    canViewPolicy || canViewOrganization || canViewCommunication || canViewIntegration || canViewSecurity;

  // Backs the approval-engine config screen; no dedicated Workflow/Engine
  // resource exists in the catalogue, so Settings/Workflow is the closest match.
  const canViewWorkflowEngine = has("Settings", "Workflow", "VIEW") || has("Settings", "Workflow", "EDIT");

  return {
    settings: { canViewSettings, canViewIdentity, canViewMasters, canViewFinanceSettings, canViewCRMSettings, canViewPolicy },
    masters: {
      canViewCustomerMaster: has("Masters", "CustomerMaster", "VIEW"),
      canViewVendorMaster:   has("Masters", "VendorMaster", "VIEW"),
    },
    finance: {
      canViewFinance: canViewExpenses || canViewPayments || canViewVouchers || canViewFinanceSettings,
      canViewExpenses, canViewAdvances, canViewPayments, canViewVouchers, canApproveFinance,
    },
    workflow: { canViewApprovals: true, canViewWorkflowEngine },
    crm: {
      // Pipeline/Daily Updates/KRA/Tasks/Employees remain roles.ts/self-service
      // governed per scope (§7 of the Step 2J brief) — not migrated this step,
      // so these are always true and SidebarLinks does not yet consult them.
      canViewPipeline: true, canViewEmployees: true, canViewReports: true,
    },
  };
}
