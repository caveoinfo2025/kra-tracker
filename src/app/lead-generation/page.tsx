import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import SheetLayout from "@/components/SheetLayout";
import LeadGenClient from "./LeadGenClient";

export default async function LeadGenerationPage() {
  const session = await getSession();
  const empId = session?.user?.employeeId;
  const isManager = session?.user?.isManager ?? false;

  const where = isManager ? {} : empId ? { id: empId } : { id: -1 };
  const employees = await prisma.employee.findMany({
    where,
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const leadsWhere = isManager ? {} : empId ? { employeeId: empId } : { employeeId: -1 };
  const leads = await prisma.leadGeneration.findMany({
    where: leadsWhere,
    include: { employee: { select: { name: true } } },
    orderBy: { date: "desc" },
    take: 200,
  });

  return (
    <SheetLayout
      icon="ðŸŽ¯"
      title="Lead Generation"
      description="Track outbound activity, leads, and qualification status. Auto-feeds Qualified Leads KPI."
    >
      <LeadGenClient
        initialLeads={JSON.parse(JSON.stringify(leads))}
        employees={employees}
        isManager={isManager}
        currentEmployeeId={empId}
      />
    </SheetLayout>
  );
}

