import prisma from "@/lib/prisma";
import { auth } from "@/../auth";
import SheetLayout from "@/components/SheetLayout";
import CollectionsClient from "./CollectionsClient";

export default async function CollectionsPage() {
  const session = await auth();
  const empId = session?.user?.employeeId;
  const isManager = session?.user?.isManager ?? false;

  const employees = await prisma.employee.findMany({
    where: isManager ? {} : empId ? { id: empId } : { id: -1 },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const rows = await prisma.collection.findMany({
    where: isManager ? {} : empId ? { employeeId: empId } : { employeeId: -1 },
    include: { employee: { select: { name: true } } },
    orderBy: { invoiceDate: "desc" },
    take: 200,
  });

  return (
    <SheetLayout
      icon="💰"
      title="Collections"
      description="Track invoice payments and collections. Auto-feeds the Payment Collections KPI."
    >
      <CollectionsClient
        initialRows={JSON.parse(JSON.stringify(rows))}
        employees={employees}
        isManager={isManager}
        currentEmployeeId={empId}
      />
    </SheetLayout>
  );
}
