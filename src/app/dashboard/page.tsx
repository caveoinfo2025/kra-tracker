import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/dev-session";
import prisma from "@/lib/prisma";
import { isOperationsHead } from "@/lib/roles";
import DashboardClient from "./DashboardClient";
import type { DashboardProps } from "./DashboardClient";

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const { period = "Week" } = await searchParams;

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // ── Period date range ─────────────────────────────────────────────────────
  // periodStart: beginning of the selected window
  // periodEnd:   end of the selected window (exclusive)
  const periodStart = new Date(today);
  const periodEnd   = new Date(today);

  if (period === "Today") {
    periodEnd.setDate(today.getDate() + 1);
  } else if (period === "Month") {
    periodStart.setDate(1);                 // 1st of this month
    periodEnd.setMonth(today.getMonth() + 1, 1); // 1st of next month
  } else if (period === "Quarter") {
    const qStart = Math.floor(today.getMonth() / 3) * 3;
    periodStart.setMonth(qStart, 1);
    periodEnd.setMonth(qStart + 3, 1);
  } else {
    // Week (default) — Mon … Sun of current week
    const day = today.getDay() === 0 ? 7 : today.getDay(); // 1=Mon…7=Sun
    periodStart.setDate(today.getDate() - day + 1);
    periodEnd.setDate(periodStart.getDate() + 7);
  }

  // For "upcoming" cards, always show 30 days forward
  const in30 = new Date(today);
  in30.setDate(today.getDate() + 30);

  const in7 = new Date(today);
  in7.setDate(today.getDate() + 7);

  const currentWeek = getWeekNumber(now);
  const currentYear = now.getFullYear();
  const hour = now.getHours();
  const empId = session.user.employeeId!;

  // Live-read role + isManager from DB (JWT may be stale after role change)
  let isManager = !!session.user.isManager;
  let liveRole = session.user.role ?? "";
  if (session.user.employeeId) {
    const emp = await prisma.employee.findUnique({
      where: { id: session.user.employeeId },
      select: { isManager: true, role: true },
    });
    if (emp) { isManager = emp.isManager; liveRole = emp.role; }
  }
  const liveUser = { isManager, role: liveRole };
  const isOpsHead = isOperationsHead(liveUser);
  const isTechHead = /technical[\s-]*head|tech[\s-]*head/i.test(liveRole);
  const roleVariant: DashboardProps["roleVariant"] =
    isOpsHead ? "opsHead" : isTechHead ? "techHead" : isManager ? "manager" : "employee";

  // ─── Leadership Dashboard Data (manager / opsHead / techHead) ─────────────
  if (roleVariant !== "employee") {
    const [employees, allTasks, allLeads, allOpps, allCollections, pendingCerts, legacyWonAgg] =
      await Promise.all([
        prisma.employee.findMany({
          where: { isManager: false },
          include: {
            kras: {
              where: { status: "active" },
              include: {
                reviews: { orderBy: [{ year: "desc" }, { week: "desc" }], take: 1 },
              },
            },
          },
          orderBy: { name: "asc" },
        }),
        prisma.crmTask.findMany({
          where: { status: { notIn: ["completed", "cancelled"] } },
          include: {
            assignedTo: { select: { id: true, name: true } },
            lead: { select: { id: true, title: true, companyName: true } },
          },
          orderBy: { dueDate: "asc" },
          take: 500,
        }),
        prisma.crmLead.findMany({
          select: {
            id: true,
            stage: true,
            assignedToId: true,
            opportunity: { select: { stage: true, value: true } },
          },
        }),
        prisma.crmOpportunity.findMany({
          select: { id: true, stage: true, value: true, updatedAt: true },
        }),
        prisma.collection.findMany({
          where: { collectionStatus: { not: "Fully Received" }, deletedAt: null },
          select: {
            id: true,
            employeeId: true,
            customerName: true,
            dueDate: true,
            invoiceValueLakhs: true,
            amountReceivedLakhs: true,
          },
          orderBy: { dueDate: "asc" },
        }),
        prisma.certification.findMany({
          where: { status: "pending" },
          include: {
            employee: { select: { name: true } },
            kra: { select: { title: true } },
          },
          orderBy: { createdAt: "asc" },
          take: 10,
        }),
        // Legacy Closed Won: closedDate is unpopulated across all records so we
        // cannot period-filter it — show the all-time total instead.
        prisma.salesFunnel.aggregate({
          _sum: { dealValueLakhs: true },
          where: { stage: "Closed Won" },
        }),
      ]);

    // ── Partition tasks by due date ────────────────────────────────────────
    const todayTasks = allTasks.filter((t) => {
      const d = new Date(t.dueDate);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
    const overdueTasks = allTasks.filter((t) => {
      const d = new Date(t.dueDate);
      d.setHours(0, 0, 0, 0);
      return d.getTime() < today.getTime();
    });

    // ── Team task health ───────────────────────────────────────────────────
    const healthMap: Record<
      number,
      { id: number; name: string; today: number; overdue: number; inProgress: number }
    > = {};
    for (const emp of employees) {
      healthMap[emp.id] = { id: emp.id, name: emp.name, today: 0, overdue: 0, inProgress: 0 };
    }
    for (const t of allTasks) {
      const entry = healthMap[t.assignedToId];
      if (!entry) continue;
      const d = new Date(t.dueDate);
      d.setHours(0, 0, 0, 0);
      if (t.status === "in_progress") entry.inProgress++;
      if (d.getTime() < today.getTime()) entry.overdue++;
      else if (d.getTime() === today.getTime()) entry.today++;
    }

    // ── Per-employee pipeline ─────────────────────────────────────────────
    const teamPipelineMap: Record<number, { pipeline: number; won: number }> = {};
    for (const emp of employees) teamPipelineMap[emp.id] = { pipeline: 0, won: 0 };
    for (const lead of allLeads) {
      const entry = teamPipelineMap[lead.assignedToId];
      if (!entry || !lead.opportunity) continue;
      if (!["WON", "LOST"].includes(lead.opportunity.stage)) {
        entry.pipeline += lead.opportunity.value ?? 0;
      } else if (lead.opportunity.stage === "WON") {
        entry.won += lead.opportunity.value ?? 0;
      }
    }
    const teamPipeline = employees.map((emp) => ({
      id: emp.id,
      name: emp.name,
      pipeline: teamPipelineMap[emp.id]?.pipeline ?? 0,
      won: teamPipelineMap[emp.id]?.won ?? 0,
    }));

    // ── Team KRA ──────────────────────────────────────────────────────────
    const teamKra = employees.map((emp) => ({
      id: emp.id,
      name: emp.name,
      avgProgress:
        emp.kras.length > 0
          ? Math.round(
              emp.kras.reduce((s, k) => s + (k.reviews[0]?.progress ?? 0), 0) /
                emp.kras.length
            )
          : 0,
      kraCount: emp.kras.length,
    }));

    // ── Pipeline stats ────────────────────────────────────────────────────
    const activeOpps = allOpps.filter((o) => !["WON", "LOST"].includes(o.stage));
    // Won deals closed within the selected period (by updatedAt = won timestamp)
    const wonOpps = allOpps.filter((o) => {
      if (o.stage !== "WON") return false;
      const d = new Date(o.updatedAt);
      return d >= periodStart && d < periodEnd;
    });
    const pipelineValue = activeOpps.reduce((s, o) => s + (o.value ?? 0), 0);
    const wonValue =
      wonOpps.reduce((s, o) => s + (o.value ?? 0), 0) +
      (legacyWonAgg._sum.dealValueLakhs ?? 0);

    // ── Lead stage counts ─────────────────────────────────────────────────
    const leadStageCounts: Record<string, number> = {};
    for (const l of allLeads) {
      leadStageCounts[l.stage] = (leadStageCounts[l.stage] ?? 0) + 1;
    }

    // ── Collections ───────────────────────────────────────────────────────
    const overdueColls = allCollections.filter((c) => new Date(c.dueDate) < today);
    const upcomingColls = allCollections.filter((c) => {
      const d = new Date(c.dueDate);
      return d >= today && d <= in30;
    });

    const props: DashboardProps = {
      isManager: true,
      roleVariant,
      employeeName: session.user.employeeName ?? session.user.name ?? "Manager",
      period,
      currentWeek,
      currentYear,
      hour,
      todayTasks: JSON.parse(JSON.stringify(todayTasks)),
      overdueTasks: JSON.parse(JSON.stringify(overdueTasks)),
      upcomingTasks: [],
      myKras: [],
      weeklyCommits: [],
      overdueCollections: JSON.parse(JSON.stringify(overdueColls)),
      upcomingCollections: JSON.parse(JSON.stringify(upcomingColls)),
      leadStageCounts,
      pipelineValue,
      wonValue,
      recentWins: [],
      legacyWins: [],
      teamTaskHealth: JSON.parse(JSON.stringify(Object.values(healthMap))),
      teamKra,
      teamPipeline,
      pendingCerts: JSON.parse(JSON.stringify(pendingCerts)),
      totalLeads: allLeads.length,
      totalOpps: allOpps.length,
    };

    return <Suspense><DashboardClient {...props} /></Suspense>;
  }

  // ─── Employee Dashboard Data ──────────────────────────────────────────────
  const [empData, myTasks, weeklyCommits, myCollections, allMyLeads, legacyWins] =
    await Promise.all([
      prisma.employee.findUnique({
        where: { id: empId },
        include: {
          kras: {
            where: { status: "active" },
            include: {
              reviews: { orderBy: [{ year: "desc" }, { week: "desc" }], take: 1 },
            },
          },
        },
      }),
      prisma.crmTask.findMany({
        where: { assignedToId: empId, status: { notIn: ["completed", "cancelled"] } },
        include: {
          lead: { select: { id: true, title: true, companyName: true } },
          opportunity: { select: { id: true, stage: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 100,
      }),
      prisma.weeklyCommit.findMany({
        where: { employeeId: empId, week: currentWeek, year: currentYear },
        include: { kra: { select: { id: true, title: true } } },
      }),
      prisma.collection.findMany({
        where: { employeeId: empId, collectionStatus: { not: "Fully Received" }, deletedAt: null },
        select: {
          id: true,
          customerName: true,
          dueDate: true,
          invoiceValueLakhs: true,
          amountReceivedLakhs: true,
        },
        orderBy: { dueDate: "asc" },
      }),
      prisma.crmLead.findMany({
        where: { assignedToId: empId },
        select: {
          id: true,
          stage: true,
          companyName: true,
          title: true,
          opportunity: { select: { id: true, stage: true, value: true } },
        },
      }),
      // No take limit — all wins needed for accurate wonValue total;
      // display is sliced to 3 later in legacyWinsData
      prisma.salesFunnel.findMany({
        where: { employeeId: empId, stage: "Closed Won" },
        select: {
          customerName: true,
          opportunityName: true,
          dealValueLakhs: true,
          solutionCategory: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  // ── Categorise tasks ────────────────────────────────────────────────────
  const todayTasks = myTasks.filter((t) => {
    const d = new Date(t.dueDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });
  const overdueTasks = myTasks.filter((t) => {
    const d = new Date(t.dueDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < today.getTime();
  });
  const upcomingTasks = myTasks.filter((t) => {
    const d = new Date(t.dueDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() > today.getTime() && d.getTime() <= in7.getTime();
  });

  // ── Collections ─────────────────────────────────────────────────────────
  const overdueColls = myCollections.filter((c) => new Date(c.dueDate) < today);
  const upcomingColls = myCollections.filter((c) => {
    const d = new Date(c.dueDate);
    return d >= today && d <= in7;
  });

  // ── Lead & opp stats ────────────────────────────────────────────────────
  const leadStageCounts: Record<string, number> = {};
  const wonOppsForDisplay: { companyName: string; value: number }[] = [];
  let pipelineValue = 0;
  let wonValueCrm = 0;

  for (const lead of allMyLeads) {
    leadStageCounts[lead.stage] = (leadStageCounts[lead.stage] ?? 0) + 1;
    if (lead.opportunity) {
      if (!["WON", "LOST"].includes(lead.opportunity.stage)) {
        pipelineValue += lead.opportunity.value ?? 0;
      }
      if (lead.opportunity.stage === "WON") {
        wonValueCrm += lead.opportunity.value ?? 0;
        wonOppsForDisplay.push({ companyName: lead.companyName, value: lead.opportunity.value ?? 0 });
      }
    }
  }

  const wonValue =
    wonValueCrm + legacyWins.reduce((s, w) => s + w.dealValueLakhs, 0);

  const myKras = (empData?.kras ?? []).map((k) => ({
    id: k.id,
    title: k.title,
    weight: k.weight,
    reviews: k.reviews.map((r) => ({ progress: r.progress, score: r.score })),
  }));

  const recentWins = wonOppsForDisplay.slice(0, 3).map((w) => ({
    companyName: w.companyName,
    value: w.value,
    isLegacy: false,
  }));
  const legacyWinsData = legacyWins.slice(0, 3).map((w) => ({
    companyName: w.customerName,
    value: w.dealValueLakhs,
    opportunityName: w.opportunityName,
    isLegacy: true,
  }));

  const props: DashboardProps = {
    isManager: false,
    roleVariant: "employee",
    employeeName: session.user.employeeName ?? session.user.name ?? "there",
    period,
    currentWeek,
    currentYear,
    hour,
    todayTasks: JSON.parse(JSON.stringify(todayTasks)),
    overdueTasks: JSON.parse(JSON.stringify(overdueTasks)),
    upcomingTasks: JSON.parse(JSON.stringify(upcomingTasks)),
    myKras,
    weeklyCommits: JSON.parse(JSON.stringify(weeklyCommits)),
    overdueCollections: JSON.parse(JSON.stringify(overdueColls)),
    upcomingCollections: JSON.parse(JSON.stringify(upcomingColls)),
    leadStageCounts,
    pipelineValue,
    wonValue,
    recentWins,
    legacyWins: legacyWinsData,
    teamTaskHealth: [],
    teamKra: [],
    teamPipeline: [],
    pendingCerts: [],
    totalLeads: allMyLeads.length,
    totalOpps: allMyLeads.filter((l) => l.opportunity).length,
  };

  return <Suspense><DashboardClient {...props} /></Suspense>;
}
