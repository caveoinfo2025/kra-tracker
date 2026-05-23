import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import SalesFunnelClient from "./SalesFunnelClient";

export default async function SalesFunnelPage() {
  const session = await getSession();
  const empId = session?.user?.employeeId;
  const isManager = session?.user?.isManager ?? false;

  const employees = await prisma.employee.findMany({
    where: isManager ? {} : empId ? { id: empId } : { id: -1 },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const rows = await prisma.salesFunnel.findMany({
    where: isManager ? {} : empId ? { employeeId: empId } : { employeeId: -1 },
    include: { employee: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <SheetLayout
      title=”Sales Funnel”
      description="Track opportunities from Lead to Closed Won. Auto-feeds Revenue, Pipeline, New Customer & PoC KPIs."
    >
      <SalesFunnelClient
        initialRows={JSON.parse(JSON.stringify(rows))}
        employees={employees}
        isManager={isManager}
        currentEmployeeId={empId}
      />
    </SheetLayout>
  );
}

