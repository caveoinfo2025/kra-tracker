import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import { canManageFinance, isAccounts, isOperationsHead } from "@/lib/roles";
import CashBookClient from "./CashBookClient";
import { deriveCaps } from "./data";

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
      <CashBookClient caps={caps} currentUser={userName} />
    </SheetLayout>
  );
}
