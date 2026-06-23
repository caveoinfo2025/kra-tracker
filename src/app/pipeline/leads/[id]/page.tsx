import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import LeadDetailClient from "./LeadDetailClient";
import { moneyToNumberForDisplay } from "@/lib/money";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const lead = await prisma.crmLead.findUnique({
    where: { id: Number(id) },
    include: {
      assignedTo:  { select: { id: true, name: true } },
      createdBy:   { select: { id: true, name: true } },
      opportunity: true,
      tasks: {
        include: { assignedTo: { select: { id: true, name: true } } },
        orderBy: { dueDate: "asc" },
      },
      meetings: {
        include: { employee: { select: { id: true, name: true } } },
        orderBy: { meetingDate: "desc" },
      },
      activities: {
        include: { performedBy: { select: { id: true, name: true } } },
        orderBy: { timestamp: "desc" },
        take: 50,
      },
      notes: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!lead) notFound();

  // RBAC
  if (!session.user.isManager && lead.assignedToId !== session.user.employeeId) {
    redirect("/pipeline/leads");
  }

  // Always load the roster (with role/department) so reps can assign meetings
  // and tasks — e.g. POC/Demo to presales. Used for reassign (manager-only) too.
  const employees = await prisma.employee.findMany({
    select: { id: true, name: true, role: true, department: true, isManager: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/pipeline/leads" className="hover:text-[#CC2229]">Lead Pipeline</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{lead.companyName}</span>
      </div>

      <LeadDetailClient
        lead={JSON.parse(JSON.stringify({
          ...lead,
          expectedValue: moneyToNumberForDisplay(lead.expectedValue),
          opportunity: lead.opportunity ? { ...lead.opportunity, value: moneyToNumberForDisplay(lead.opportunity.value) } : null,
        }))}
        employees={employees}
        isManager={!!session.user.isManager}
        currentEmployeeId={session.user.employeeId}
      />
    </div>
  );
}
