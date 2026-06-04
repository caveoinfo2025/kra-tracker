import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import { isAccounts, isOperationsHead } from "@/lib/roles";
import VendorMasterClient from "./VendorMasterClient";
import { deriveVendorCaps } from "./data";

/**
 * Global Vendor Master — accessible to all authenticated users.
 * Write access is gated by RBAC caps (Manager, Accounts Admin, Accounts Team).
 * Used by: Finance, Expense, Procurement, Inventory, Projects, Support, AMC, Assets, Tally.
 */
export default async function VendorMasterPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const user = session.user;
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
