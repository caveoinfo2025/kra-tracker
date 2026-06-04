import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import { canManageFinance, isAccounts, isOperationsHead } from "@/lib/roles";
import ExpenseCategoriesClient from "./ExpenseCategoriesClient";
import { deriveCatCaps } from "./data";

export default async function ExpenseCategoriesPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  // Employees have no access to category config — redirect to their expenses.
  if (!canManageFinance(session.user)) redirect("/finance/expenses");

  const user = session.user;
  const caps = deriveCatCaps({
    isManager: !!user.isManager,
    isAccounts: isAccounts(user),
    isOpsHead: isOperationsHead(user),
  });
  const currentUser = user.employeeName ?? user.name ?? "You";

  return (
    <SheetLayout
      title="Expense Categories"
      description="Centralized category configuration used by the expense register, employee claims, conveyance, customer expenses, GST reporting, approval workflows, and Tally export."
    >
      <ExpenseCategoriesClient caps={caps} currentUser={currentUser} />
    </SheetLayout>
  );
}
