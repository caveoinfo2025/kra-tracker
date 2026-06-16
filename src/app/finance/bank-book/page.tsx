import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import { canManageFinance, isAccounts, isOperationsHead } from "@/lib/roles";
import BankBookClient from "./BankBookClient";
import { deriveCaps } from "./data";
import FinanceModuleStatusBanner from "@/app/finance/_shared/FinanceModuleStatusBanner";

export default async function BankBookPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!canManageFinance(session.user)) redirect("/dashboard");

  const user = session.user;
  // Map existing RBAC predicates → Bank Book capability tiers.
  const caps = deriveCaps({
    isManager: !!user.isManager,
    isAccounts: isAccounts(user),
    isOpsHead: isOperationsHead(user),
  });

  const userName = user.employeeName ?? user.name ?? "You";

  return (
    <SheetLayout
      title="Bank Book"
      description="Complete bank ledger across all company accounts — transactions, reconciliation, and statement imports."
    >
      <FinanceModuleStatusBanner
        variant="live-readonly"
        message="Bank ledger reads live transaction data. Add entry, import, transfer, and reconciliation actions are disabled until write APIs are implemented."
      />
      <BankBookClient caps={caps} currentUser={userName} />
    </SheetLayout>
  );
}
