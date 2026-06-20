import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import { isAccounts, isOperationsHead } from "@/lib/roles";
import { hasPermission } from "@/lib/access-control";
import CustomerMasterClient from "./CustomerMasterClient";
import { deriveCustomerCaps } from "./data";

/**
 * Global Customer Master — enterprise customer registry.
 *
 * Step 2M: page access now requires Masters/CustomerMaster/VIEW (access-control),
 * OR'd with isManager — the same manager-bypass shape Step 2J's
 * getNavigationCapabilities() already gives the sidebar link for this page (manager
 * gets ALL_TRUE, everyone else needs the real grant; no separate isOpsHead bridge),
 * so the page guard and the sidebar link agree on who can reach this page. A
 * non-manager employee with no real Masters/CustomerMaster/VIEW grant via
 * /settings/identity will now be redirected — this closes the "accessible to all
 * authenticated users" gap flagged in RBAC_AUDIT_REPORT.md §2.4/§4. Write/finance
 * capability tiers (Create/Edit/Disable/GST/Export) remain governed by
 * deriveCustomerCaps (roles.ts) for button-level UX only — see data.ts TODO.
 *
 * GLOBAL CRM MASTER — single source of truth referenced by CRM Sales, Opportunities,
 * Quotations, Orders, Projects, Implementation, Support, AMC, Asset Management,
 * Finance, Customer Profitability, Engineer Visits, Local Conveyance, and Billing.
 *
 * This is the UI-structure phase (mock data). It EXTENDS — does not duplicate — the
 * existing `Customer` Prisma model; backend wiring to that table is a later phase.
 * The operational customer list with live CRM import/dedupe remains at /customers.
 */
export default async function GlobalCustomerMasterPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const user      = session.user;
  const userId    = user.employeeId!;
  const isManager = !!user.isManager;

  const canView = await hasPermission(userId, "Masters", "CustomerMaster", "VIEW");
  if (!canView && !isManager) redirect("/dashboard");

  const caps = deriveCustomerCaps({
    isManager: !!user.isManager,
    isAccounts: isAccounts(user),
    isOpsHead: isOperationsHead(user),
  });
  const currentUser = user.employeeName ?? user.name ?? "You";

  return (
    <SheetLayout
      title="Customer Master"
      description="Global customer registry — used across CRM Sales, Projects, Support, AMC, Assets, Finance, and Profitability. One customer record, referenced everywhere."
    >
      <CustomerMasterClient caps={caps} currentUser={currentUser} />
    </SheetLayout>
  );
}
