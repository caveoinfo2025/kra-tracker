import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import CollectionsClient from "./CollectionsClient";
import { canSeeAllCollections } from "@/lib/roles";

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; emp?: string; q?: string }>;
}) {
  const session = await getSession();
  const empId = session?.user?.employeeId;
  // Managers, Accounts, and Operations Head see every collection (they don't own
  // any rows themselves). Sales reps see only their own.
  const seeAll = canSeeAllCollections(session?.user);
  const { view, emp, q } = await searchParams;

  const employees = await prisma.employee.findMany({
    where: seeAll ? {} : empId ? { id: empId } : { id: -1 },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const rows = await prisma.collection.findMany({
    where: {
      deletedAt: null,
      ...(seeAll ? {} : empId ? { employeeId: empId } : { employeeId: -1 }),
    },
    include: { employee: { select: { name: true } } },
    orderBy: { dueDate: "asc" },
    take: 500,
  });

  return (
    <SheetLayout
      title="Billing & Collections"
      description="Track invoices, billing revenue, and payment collections. Switch to Revenue Summary to see per-salesperson billing breakdown."
    >
      <CollectionsClient
        initialRows={JSON.parse(JSON.stringify(rows))}
        employees={employees}
        /* Finance roles (Accounts / Operations Head) get the full all-employee
           view & filters, same as managers. */
        isManager={seeAll}
        currentEmployeeId={empId}
        initialView={view ?? "all"}
        initialEmpId={emp ?? ""}
        initialSearch={q ?? ""}
      />
    </SheetLayout>
  );
}
