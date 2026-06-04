import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import ExpenseEntryForm from "./ExpenseEntryForm";

export default async function AddExpensePage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  // All authenticated employees can create expenses (own entry).

  return (
    <SheetLayout
      title="Add Expense"
      description="Record a new expense entry. Fields adapt to the expense type, invoice, and GST applicability."
    >
      <ExpenseEntryForm />
    </SheetLayout>
  );
}
