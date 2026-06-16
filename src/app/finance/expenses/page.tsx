import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import { isAccounts, isOperationsHead } from "@/lib/roles";
import ExpenseRegisterClient from "./ExpenseRegisterClient";
import { deriveExpenseCaps } from "./data";
import FinanceModuleStatusBanner from "@/app/finance/_shared/FinanceModuleStatusBanner";

export default async function ExpenseRegisterPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  // All authenticated employees can access the register (own data); finance roles see all.

  const user = session.user;
  const caps = deriveExpenseCaps({
    isManager: !!user.isManager,
    isAccounts: isAccounts(user),
    isOpsHead: isOperationsHead(user),
  });
  const userName = user.employeeName ?? user.name ?? "You";

  return (
    <SheetLayout
      title="Expense Register"
      description="Capture, track, approve, and report all company expenses — cash, bank, customer, employee, vendor, and GST."
    >
      <FinanceModuleStatusBanner
        variant="live-readonly"
        message="Expense register reads live data. Expense creation, editing, approval posting, and voucher generation are disabled until write APIs are implemented."
      />
      <ExpenseRegisterClient caps={caps} currentUser={userName} />
    </SheetLayout>
  );
}
