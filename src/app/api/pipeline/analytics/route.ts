/**
 * GET /api/pipeline/analytics
 * Returns aggregated pipeline metrics for the manager dashboard.
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { inrToLakhsEquivalent } from "@/lib/money";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const empFilter = searchParams.get("employeeId");
  const days = Number(searchParams.get("days") ?? "30");

  const isManager = session.user.isManager;
  const myEmpId   = session.user.employeeId;
  const since     = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Scope to self for non-managers
  const leadWhere = {
    ...(isManager
      ? empFilter ? { assignedToId: Number(empFilter) } : {}
      : { assignedToId: myEmpId }),
    createdAt: { gte: since },
  };

  // ── Lead metrics ───────────────────────────────────────────────────────────
  const allLeads = await prisma.crmLead.findMany({
    where: { ...(isManager ? (empFilter ? { assignedToId: Number(empFilter) } : {}) : { assignedToId: myEmpId }) },
    select: { id: true, stage: true, expectedValue: true, createdAt: true, assignedToId: true },
  });

  const recentLeads = allLeads.filter((l) => l.createdAt >= since);
  const byStage     = groupBy(allLeads, (l) => l.stage);
  const bySource    = {} as Record<string, number>; // TODO: extend if needed

  // ── Opportunity metrics ────────────────────────────────────────────────────
  const allOpps = await prisma.crmOpportunity.findMany({
    where: {
      lead: { ...(isManager ? (empFilter ? { assignedToId: Number(empFilter) } : {}) : { assignedToId: myEmpId }) },
    },
    select: { id: true, stage: true, value: true, probability: true, createdAt: true, leadId: true },
  });

  const wonOpps   = allOpps.filter((o) => o.stage === "WON");
  const lostOpps  = allOpps.filter((o) => o.stage === "LOST");
  const activeOpps = allOpps.filter((o) => !["WON", "LOST"].includes(o.stage));

  // DISPLAY ONLY — fed straight into AnalyticsClient's "₹X.XL" formatters.
  const totalPipelineValue   = activeOpps.reduce((s, o) => s + inrToLakhsEquivalent(o.value), 0);
  const weightedForecast     = activeOpps.reduce((s, o) => s + inrToLakhsEquivalent(o.value) * (o.probability / 100), 0);
  const wonValue             = wonOpps.reduce((s, o) => s + inrToLakhsEquivalent(o.value), 0);
  const proposalToWinRatio   = allOpps.length > 0 ? wonOpps.length / allOpps.length : 0;

  // ── Task metrics ──────────────────────────────────────────────────────────
  const tasks = await prisma.crmTask.findMany({
    where: {
      ...(isManager ? (empFilter ? { assignedToId: Number(empFilter) } : {}) : { assignedToId: myEmpId }),
    },
    select: { status: true, dueDate: true },
  });
  const overdueTasks    = tasks.filter((t) => t.status !== "completed" && t.dueDate < new Date()).length;
  const completedTasks  = tasks.filter((t) => t.status === "completed").length;

  // ── Per-employee metrics (manager only) ───────────────────────────────────
  const employeeMetrics = isManager
    ? await buildEmployeeMetrics()
    : [];

  // ── Stage funnel ──────────────────────────────────────────────────────────
  const stageFunnel = [
    "NEW_LEAD", "CONTACTED", "QUALIFIED", "REQUIREMENT_GATHERED",
    "SOLUTION_PROPOSED", "POC_DEMO", "PROPOSAL_SENT",
  ].map((s) => ({ stage: s, count: (byStage[s] ?? []).length }));

  const oppFunnel = ["PROPOSAL_SENT", "FOLLOW_UP", "NEGOTIATION", "WON", "LOST", "ON_HOLD"].map((s) => ({
    stage: s,
    count: allOpps.filter((o) => o.stage === s).length,
    value: allOpps.filter((o) => o.stage === s).reduce((sum, o) => sum + inrToLakhsEquivalent(o.value), 0),
  }));

  return NextResponse.json({
    leads: {
      total:     allLeads.length,
      recent:    recentLeads.length,
      byStage:   stageFunnel,
      bySource,
      qualified: (byStage["QUALIFIED"] ?? []).length + (byStage["REQUIREMENT_GATHERED"] ?? []).length,
      pocDemo:   (byStage["POC_DEMO"] ?? []).length,
    },
    opportunities: {
      total:             allOpps.length,
      active:            activeOpps.length,
      won:               wonOpps.length,
      lost:              lostOpps.length,
      totalPipelineValue,
      weightedForecast,
      wonValue,
      proposalToWinRatio,
      byStage:           oppFunnel,
    },
    tasks: {
      total:     tasks.length,
      overdue:   overdueTasks,
      completed: completedTasks,
    },
    employeeMetrics,
    period: { days, since: since.toISOString() },
  });
}

function groupBy<T>(arr: T[], fn: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const key = fn(item);
    (acc[key] = acc[key] ?? []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

async function buildEmployeeMetrics() {
  const employees = await prisma.employee.findMany({
    where: { isManager: false },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return Promise.all(
    employees.map(async (emp) => {
      const leads = await prisma.crmLead.count({ where: { assignedToId: emp.id } });
      const opps  = await prisma.crmOpportunity.count({ where: { lead: { assignedToId: emp.id } } });
      const won   = await prisma.crmOpportunity.count({ where: { lead: { assignedToId: emp.id }, stage: "WON" } });
      const wonVal = await prisma.crmOpportunity.aggregate({
        where: { lead: { assignedToId: emp.id }, stage: "WON" },
        _sum: { value: true },
      });
      const tasks = await prisma.crmTask.count({ where: { assignedToId: emp.id } });
      return {
        employee:      emp,
        totalLeads:    leads,
        totalOpps:     opps,
        wonDeals:      won,
        wonValue:      inrToLakhsEquivalent(wonVal._sum.value ?? 0),
        totalTasks:    tasks,
        conversionPct: opps > 0 ? Math.round((won / opps) * 100) : 0,
      };
    })
  );
}
