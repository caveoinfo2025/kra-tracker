import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import { canManageFinance, isAccounts, isOperationsHead } from "@/lib/roles";
import CashBookClient from "./CashBookClient";
import { deriveCaps } from "./data";
import FinanceModuleStatusBanner from "@/app/finance/_shared/FinanceModuleStatusBanner";

export default async function CashBookPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!canManageFinance(session.user)) redirect("/dashboard");

  const user = session.user;
  const caps = deriveCaps({
    isManager: !!user.isManager,
    isAccounts: isAccounts(user),
    isOpsHead: isOperationsHead(user),
  });
  const userName = user.employeeName ?? user.name ?? "You";

  return (
    <SheetLayout
      title="Cash Book"
      description="Complete cash ledger — inflows, expenses, reconciliation, bank movement, and customer/employee visibility."
    >
      <FinanceModuleStatusBanner
        variant="live-readonly"
        message="Cash ledger reads live transaction data. Cash in, cash expense, transfer, and reconciliation actions are disabled until write APIs are implemented."
      />
      <CashBookClient caps={caps} currentUser={userName} />
    </SheetLayout>
  );
}
