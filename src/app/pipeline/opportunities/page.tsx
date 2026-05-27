import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { redirect } from "next/navigation";
import SheetLayout from "@/components/SheetLayout";
import OpportunitiesClient from "./OpportunitiesClient";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; stage?: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const { view, stage } = await searchParams;
  const isManager = !!session.user.isManager;
  const empId     = session.user.employeeId;

  const where = {
    status: "active",
    lead: {
      ...(isManager ? {} : { assignedToId: empId }),
    },
    ...(stage ? { stage } : {}),
  };

  const rawOpps = await prisma.crmOpportunity.findMany({
    where,
    include: {
      lead: {
        include: {
          assignedTo: { select: { id: true, name: true } },
          createdBy:  { select: { id: true, name: true } },
        },
      },
      _count: { select: { tasks: true, meetings: true } },
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

  return (
    <SheetLayout
      title="Opportunity Funnel"
      description="Track proposals through negotiation to close."
    >
      <OpportunitiesClient
        initialOpps={JSON.parse(JSON.stringify(rawOpps))}
        employees={employees}
        isManager={isManager}
        initialView={(view as "table" | "kanban") ?? "kanban"}
      />
    </SheetLayout>
  );
}
