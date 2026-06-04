import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import { isAccounts, isOperationsHead } from "@/lib/roles";
import CustomerMasterClient from "./CustomerMasterClient";
import { deriveCustomerCaps } from "./data";

/**
 * Global Customer Master — enterprise customer registry.
 * Accessible to all authenticated users; write/finance access gated by RBAC caps.
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

  const user = session.user;
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
