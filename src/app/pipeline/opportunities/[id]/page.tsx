import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import OppDetailClient from "./OppDetailClient";
import { moneyToNumberForDisplay } from "@/lib/money";

export default async function OppDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const opp = await prisma.crmOpportunity.findUnique({
    where: { id: Number(id) },
    include: {
      lead: {
        include: {
          assignedTo: { select: { id: true, name: true } },
          createdBy:  { select: { id: true, name: true } },
        },
      },
      tasks:     { include: { assignedTo: { select: { id: true, name: true } } }, orderBy: { dueDate: "asc" } },
      meetings:  { include: { employee: { select: { id: true, name: true } } }, orderBy: { meetingDate: "desc" } },
      activities:{ include: { performedBy: { select: { id: true, name: true } } }, orderBy: { timestamp: "desc" } },
    },
  });

  if (!opp) notFound();
  if (!session.user.isManager && opp.lead.assignedToId !== session.user.employeeId) {
    redirect("/pipeline/opportunities");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/pipeline/opportunities" className="hover:text-[#CC2229]">Opportunities</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{opp.lead.companyName}</span>
      </div>
      <OppDetailClient
        opp={JSON.parse(JSON.stringify({
          ...opp,
          value: moneyToNumberForDisplay(opp.value),
          dealValueExTax: moneyToNumberForDisplay(opp.dealValueExTax),
          netProfitLakhs: moneyToNumberForDisplay(opp.netProfitLakhs),
          lead: { ...opp.lead, expectedValue: moneyToNumberForDisplay(opp.lead.expectedValue) },
        }))}
        isManager={!!session.user.isManager}
        currentEmployeeId={session.user.employeeId}
      />
    </div>
  );
}
