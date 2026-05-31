import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { redirect } from "next/navigation";
import SheetLayout from "@/components/SheetLayout";
import OpportunitiesClient from "./OpportunitiesClient";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; stage?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const { view, stage, q } = await searchParams;
  const isManager = !!session.user.isManager;
  const empId     = session.user.employeeId;

  const rawOpps = await prisma.crmOpportunity.findMany({
    where: {
      status: "active",
      lead: { ...(isManager ? {} : { assignedToId: empId }) },
      ...(stage ? { stage } : {}),
    },
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

  const [employees, legacyAgg] = await Promise.all([
    isManager
      ? prisma.employee.findMany({
          where: { isManager: false },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    prisma.salesFunnel.groupBy({
      by: ["stage"],
      where: isManager ? {} : empId ? { employeeId: empId } : { employeeId: -1 },
      _count: { id: true },
    }),
  ]);

  const legacyKraCounts = {
    proposals:    legacyAgg.find((r) => r.stage === "Proposal Sent")?._count.id ?? 0,
    negotiations: legacyAgg.find((r) => r.stage === "Negotiation")?._count.id ?? 0,
    won:          legacyAgg.find((r) => r.stage === "Closed Won")?._count.id ?? 0,
  };

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
        initialSearch={q ?? ""}
        legacyKraCounts={legacyKraCounts}
      />
    </SheetLayout>
  );
}
