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

  const legacyWhere = isManager ? {} : empId ? { employeeId: empId } : { employeeId: -1 };

  const [employees, legacyRows] = await Promise.all([
    isManager
      ? prisma.employee.findMany({
          where: { isManager: false },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    // Pull the actual legacy SalesFunnel rows so they render as opportunities
    prisma.salesFunnel.findMany({
      where: legacyWhere,
      select: {
        id: true,
        customerName: true,
        opportunityName: true,
        solutionCategory: true,
        stage: true,
        dealValueLakhs: true,
        probabilityPct: true,
        expectedCloseDate: true,
        employeeId: true,
        employee: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  // Map legacy SalesFunnel stage labels → CRM opportunity stage keys
  const LEGACY_STAGE_MAP: Record<string, string> = {
    "Lead":          "PROPOSAL_SENT",
    "Qualified":     "PROPOSAL_SENT",
    "Solutioning":   "PROPOSAL_SENT",
    "Proposal Sent": "PROPOSAL_SENT",
    "Negotiation":   "NEGOTIATION",
    "Closed Won":    "WON",
    "Closed Lost":   "LOST",
  };

  // Shape legacy rows to match the CRM opportunity object the client renders.
  // Negative ids avoid collision with real CrmOpportunity ids and let the
  // client flag them as read-only (no detail page / no drag-to-move).
  const legacyOpps = legacyRows
    .filter((r) => !stage || LEGACY_STAGE_MAP[r.stage] === stage)
    .map((r) => ({
      id: -r.id,
      isLegacy: true,
      stage: LEGACY_STAGE_MAP[r.stage] ?? "PROPOSAL_SENT",
      value: r.dealValueLakhs,
      probability: Math.round(r.probabilityPct),
      expectedClosureDate: r.expectedCloseDate ? r.expectedCloseDate.toISOString() : null,
      lostReason: "",
      status: "active",
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      leadId: -r.id,
      lead: {
        id: -r.id,
        title: r.opportunityName || r.solutionCategory || "Legacy opportunity",
        companyName: r.customerName,
        assignedTo: { id: r.employee?.id ?? r.employeeId, name: r.employee?.name ?? "—" },
        createdBy:  { id: r.employee?.id ?? r.employeeId, name: r.employee?.name ?? "—" },
      },
    }));

  const allOpps = [...JSON.parse(JSON.stringify(rawOpps)), ...legacyOpps];

  return (
    <SheetLayout
      title="Opportunity Funnel"
      description="Track proposals through negotiation to close."
    >
      <OpportunitiesClient
        initialOpps={allOpps}
        employees={employees}
        isManager={isManager}
        initialView={(view as "table" | "kanban") ?? "kanban"}
        initialSearch={q ?? ""}
      />
    </SheetLayout>
  );
}
