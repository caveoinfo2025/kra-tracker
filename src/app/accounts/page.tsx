import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { redirect } from "next/navigation";
import SheetLayout from "@/components/SheetLayout";
import AccountsClient from "./AccountsClient";
import { canManagePayments, canSeeAllCollections } from "@/lib/roles";

export default async function AccountsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const isManager  = session.user.isManager;

  // Managers, Accounts, and Operations Head can access the payment tracker.
  if (!canSeeAllCollections(session.user)) redirect("/");

  const employees = await prisma.employee.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const [rawRows, rawAdvances] = await Promise.all([
    prisma.collection.findMany({
      where: { deletedAt: null },
      include: { employee: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 1000,
    }),
    prisma.orderAdvance.findMany({
      orderBy: { createdAt: "desc" },
      include: { recordedBy: { select: { name: true } } },
      take: 500,
    }),
  ]);

  const rows = JSON.parse(JSON.stringify(rawRows));
  const advances = JSON.parse(JSON.stringify(rawAdvances));

  return (
    <SheetLayout
      title="Accounts — Payment Tracker"
      description="Record payments and advances, track collection status across all invoices."
    >
      <AccountsClient
        initialRows={rows}
        initialAdvances={advances}
        employees={employees}
        isManager={!!isManager}
        canManage={canManagePayments(session.user)}
      />
    </SheetLayout>
  );
}
