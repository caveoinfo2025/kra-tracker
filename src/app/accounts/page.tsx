import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { redirect } from "next/navigation";
import SheetLayout from "@/components/SheetLayout";
import AccountsClient from "./AccountsClient";

export default async function AccountsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const isAccounts = session.user.role === "Accounts";
  const isManager  = session.user.isManager;

  // Only managers and accounts team can access this page
  if (!isAccounts && !isManager) redirect("/");

  const employees = await prisma.employee.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const rawRows = await prisma.collection.findMany({
    include: { employee: { select: { name: true } } },
    orderBy: { dueDate: "asc" },
    take: 1000,
  });

  const rows = JSON.parse(JSON.stringify(rawRows));

  return (
    <SheetLayout
      title="Accounts — Payment Tracker"
      description="Update payment received dates and track collection status across all invoices."
    >
      <AccountsClient
        initialRows={rows}
        employees={employees}
        isManager={!!isManager}
      />
    </SheetLayout>
  );
}
