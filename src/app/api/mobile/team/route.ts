/**
 * GET /api/mobile/team
 * Manager-only. Returns a per-employee roll-up used by the mobile
 * Team Overview and Team KRAs screens:
 *   - pipeline value (active, non-WON/LOST CRM opportunities)
 *   - won value (CRM WON + legacy SalesFunnel Closed Won)
 *   - open lead count
 *   - average KRA progress (latest weekly review per active KRA)
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { inrToLakhsEquivalent } from "@/lib/money";

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isManager) return NextResponse.json({ error: "Managers only" }, { status: 403 });

  const [employees, leads, legacyWon] = await Promise.all([
    prisma.employee.findMany({
      where: { isManager: false },
      select: {
        id: true,
        name: true,
        kras: {
          where: { status: "active" },
          select: {
            weight: true,
            reviews: { orderBy: [{ year: "desc" }, { week: "desc" }], take: 1, select: { progress: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.crmLead.findMany({
      select: {
        assignedToId: true,
        stage: true,
        opportunity: { select: { stage: true, value: true } },
      },
    }),
    prisma.salesFunnel.groupBy({
      by: ["employeeId"],
      where: { stage: "Closed Won" },
      _sum: { dealValueLakhs: true },
    }),
  ]);

  // DISPLAY ONLY — pipeline/won are fed straight into mobile fmtLakhs() formatters.
  const legacyWonMap = new Map<number, number>();
  legacyWon.forEach((r) => legacyWonMap.set(r.employeeId, inrToLakhsEquivalent(r._sum.dealValueLakhs ?? 0)));

  const team = employees.map((emp) => {
    const myLeads = leads.filter((l) => l.assignedToId === emp.id);
    let pipeline = 0;
    let wonCrm = 0;
    let openLeads = 0;
    for (const l of myLeads) {
      const oppStage = l.opportunity?.stage;
      const oppVal = inrToLakhsEquivalent(l.opportunity?.value ?? 0);
      if (oppStage === "WON") wonCrm += oppVal;
      else if (oppStage && oppStage !== "LOST") pipeline += oppVal;
      if (l.stage !== "CLOSED_WON" && l.stage !== "CLOSED_LOST") openLeads++;
    }
    const won = wonCrm + (legacyWonMap.get(emp.id) ?? 0);

    // Weighted avg KRA progress
    const totalWeight = emp.kras.reduce((s, k) => s + k.weight, 0);
    const avgKra = totalWeight > 0
      ? Math.round(emp.kras.reduce((s, k) => s + (k.reviews[0]?.progress ?? 0) * k.weight, 0) / totalWeight)
      : 0;

    return {
      id: emp.id,
      name: emp.name,
      pipeline,
      won,
      openLeads,
      kraCount: emp.kras.length,
      avgKra,
    };
  });

  const totals = {
    pipeline: team.reduce((s, t) => s + t.pipeline, 0),
    won: team.reduce((s, t) => s + t.won, 0),
    openLeads: team.reduce((s, t) => s + t.openLeads, 0),
    avgKra: team.length ? Math.round(team.reduce((s, t) => s + t.avgKra, 0) / team.length) : 0,
  };

  return NextResponse.json({ team, totals });
}
