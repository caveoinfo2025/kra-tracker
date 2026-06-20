import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import { isAccounts, isOperationsHead } from "@/lib/roles";
import { hasPermission } from "@/lib/access-control";
import VendorMasterClient from "./VendorMasterClient";
import { deriveVendorCaps } from "./data";

/**
 * Global Vendor Master.
 *
 * Step 2M: page access now requires Masters/VendorMaster/VIEW (access-control),
 * OR'd with isManager — the same manager-bypass shape Step 2J's
 * getNavigationCapabilities() already gives the sidebar link for this page (manager
 * gets ALL_TRUE, everyone else needs the real grant; no separate isOpsHead bridge),
 * so the page guard and the sidebar link agree on who can reach this page. A
 * non-manager employee with no real Masters/VendorMaster/VIEW grant via
 * /settings/identity will now be redirected — this closes the "accessible to all
 * authenticated users" gap flagged in RBAC_AUDIT_REPORT.md §2.4/§4. Write/finance
 * capability tiers (Create/Edit/Disable/Bank/GST/Export) remain governed by
 * deriveVendorCaps (roles.ts) for button-level UX only — see data.ts TODO.
 *
 * Used by: Finance, Expense, Procurement, Inventory, Projects, Support, AMC, Assets, Tally.
 */
export default async function VendorMasterPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const user      = session.user;
  const userId    = user.employeeId!;
  const isManager = !!user.isManager;

  const canView = await hasPermission(userId, "Masters", "VendorMaster", "VIEW");
  if (!canView && !isManager) redirect("/dashboard");

  const caps = deriveVendorCaps({
    isManager: !!user.isManager,
    isAccounts: isAccounts(user),
    isOpsHead: isOperationsHead(user),
  });
  const currentUser = user.employeeName ?? user.name ?? "You";

  return (
    <SheetLayout
      title="Vendor Master"
      description="Global vendor registry — used across Finance, Expense, Procurement, Inventory, Projects, Support, and Tally Export. One vendor record, referenced everywhere."
    >
      <VendorMasterClient caps={caps} currentUser={currentUser} />
    </SheetLayout>
  );
}
