import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { redirect } from "next/navigation";
import SheetLayout from "@/components/SheetLayout";
import LeadsClient from "./LeadsClient";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; stage?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const { view, stage, q } = await searchParams;
  const isManager = !!session.user.isManager;
  const empId     = session.user.employeeId;

  const where = {
    ...(isManager ? {} : { assignedToId: empId }),
    ...(stage ? { stage } : {}),
    ...(q ? {
      OR: [
        { title:         { contains: q } },
        { companyName:   { contains: q } },
        { contactPerson: { contains: q } },
      ],
    } : {}),
  };

  const rawLeads = await prisma.crmLead.findMany({
    where,
    include: {
      assignedTo: { select: { id: true, name: true } },
      createdBy:  { select: { id: true, name: true } },
      opportunity: true,
      _count: { select: { tasks: true, meetings: true, notes: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const employees = isManager
    ? await prisma.employee.findMany({
        where: { isManager: false },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  const activityWhere = isManager ? {} : empId ? { employeeId: empId } : { employeeId: -1 };
  const legacyActivities = await prisma.leadGeneration.findMany({
    where: activityWhere,
    include: { employee: { select: { name: true } } },
    orderBy: { date: "desc" },
    take: 500,
  });

  return (
    <SheetLayout
      title="Lead Pipeline"
      description="Qualify and manage leads from initial contact through proposal stage."
    >
      <LeadsClient
        initialLeads={JSON.parse(JSON.stringify(rawLeads))}
        employees={employees}
        isManager={isManager}
        currentEmployeeId={empId}
        initialView={(view as "table" | "kanban") ?? "table"}
        initialActivities={JSON.parse(JSON.stringify(legacyActivities))}
        initialSearch={q ?? ""}
      />
    </SheetLayout>
  );
}
