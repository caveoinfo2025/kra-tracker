import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import prisma from "@/lib/prisma";
import Badge from "@/components/Badge";
import ProgressBar from "@/components/ProgressBar";
import TeamSummaryClient from "./TeamSummaryClient";
import { hasManagerReach } from "@/lib/roles";
import { inrToLakhsEquivalent } from "@/lib/money";

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default async function DashboardPage() {
  const session = await getSession();
  // Managers and Operations Head get the team overview; everyone else → dashboard
  if (!hasManagerReach(session?.user) && session?.user?.employeeId) {
    redirect("/dashboard");
  }

  const now         = new Date();
  const currentWeek = getWeekNumber(now);
  const currentYear = now.getFullYear();

  const employees = await prisma.employee.findMany({
    include: {
      kras: {
        where: { status: "active" },
        include: { reviews: { orderBy: [{ year: "desc" }, { week: "desc" }], take: 1 } },
      },
    },
    orderBy: { name: "asc" },
  });

  const reviewedThisWeekCount = await prisma.weeklyReview.count({
    where: { week: currentWeek, year: currentYear },
  });

  const totalKRAs = employees.reduce((s, e) => s + e.kras.length, 0);

  // ── Collections ───────────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30 = new Date(today);
  in30.setDate(today.getDate() + 30);

  const allCollections = await prisma.collection.findMany({ where: { deletedAt: null }, orderBy: { invoiceDate: "desc" } });
  const pendingCollections = allCollections.filter((c) => c.collectionStatus !== "Fully Received");

  const overdueMap: Record<number, number>  = {};
  const upcomingMap: Record<number, number> = {};
  for (const c of pendingCollections) {
    const due = new Date(c.dueDate);
    due.setHours(0, 0, 0, 0);
    if (due < today)       overdueMap[c.employeeId]  = (overdueMap[c.employeeId]  ?? 0) + 1;
    else if (due <= in30)  upcomingMap[c.employeeId] = (upcomingMap[c.employeeId] ?? 0) + 1;
  }

  const billingMap: Record<number, { billed: number; withoutGst: number }> = {};
  for (const c of allCollections) {
    if (!billingMap[c.employeeId]) billingMap[c.employeeId] = { billed: 0, withoutGst: 0 };
    // Dashboard display only — convert actual ₹ INR back to ₹-Lakhs-equivalent immediately at
    // the read boundary, since every downstream consumer of these maps (this page's cards,
    // TeamSummaryClient) is calibrated for Lakhs-scale numbers.
    billingMap[c.employeeId].billed     += inrToLakhsEquivalent(c.invoiceValueLakhs ?? 0);
    billingMap[c.employeeId].withoutGst += inrToLakhsEquivalent(c.amountWithoutGstLakhs ?? 0);
  }

  const totalOverdue    = Object.values(overdueMap).reduce((s, v) => s + v, 0);
  const totalUpcoming   = Object.values(upcomingMap).reduce((s, v) => s + v, 0);
  const totalBilled     = Object.values(billingMap).reduce((s, v) => s + v.billed, 0);
  const totalWithoutGst = Object.values(billingMap).reduce((s, v) => s + v.withoutGst, 0);

  // ── Sales Funnel: Closed Won + pipeline ───────────────────────────────────
  const allFunnel = await prisma.salesFunnel.findMany({
    select: { employeeId: true, dealValueLakhs: true, solutionCategory: true, stage: true, status: true },
  });

  const closedWonDeals = allFunnel.filter((d) => d.stage === "Closed Won");
  const bookingMap: Record<number, number>    = {};
  const categoryTotals: Record<string, number> = {};
  for (const d of closedWonDeals) {
    const valueLakhs = inrToLakhsEquivalent(d.dealValueLakhs);
    bookingMap[d.employeeId] = (bookingMap[d.employeeId] ?? 0) + valueLakhs;
    const cat = d.solutionCategory?.trim() || "Other";
    categoryTotals[cat] = (categoryTotals[cat] ?? 0) + valueLakhs;
  }
  const totalBooking     = closedWonDeals.reduce((s, d) => s + inrToLakhsEquivalent(d.dealValueLakhs), 0);
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  // Active pipeline per employee
  const activeFunnel = allFunnel.filter((d) => d.stage !== "Closed Won" && d.stage !== "Closed Lost");
  const pipelineMap: Record<number, number> = {};
  const stageMap: Record<string, number>    = {};
  for (const d of activeFunnel) {
    const valueLakhs = inrToLakhsEquivalent(d.dealValueLakhs);
    pipelineMap[d.employeeId] = (pipelineMap[d.employeeId] ?? 0) + valueLakhs;
    stageMap[d.stage]         = (stageMap[d.stage]         ?? 0) + valueLakhs;
  }
  const totalPipeline = Object.values(pipelineMap).reduce((s, v) => s + v, 0);

  // ── Lead Gen counts per employee ──────────────────────────────────────────
  const leadRows = await prisma.leadGeneration.findMany({
    select: { employeeId: true, qualifiedFlag: true, activityType: true, leadStatus: true },
  });
  const qualifiedMap: Record<number, number>  = {};
  const proposalMap: Record<number, number>   = {};
  for (const l of leadRows) {
    if (l.qualifiedFlag) qualifiedMap[l.employeeId] = (qualifiedMap[l.employeeId] ?? 0) + 1;
  }
  // Proposals Sent = funnel deals at "Proposal Sent" stage
  const proposalDeals = allFunnel.filter((d) => d.stage === "Proposal Sent");
  for (const d of proposalDeals) {
    proposalMap[d.employeeId] = (proposalMap[d.employeeId] ?? 0) + 1;
  }
  const totalQualified = Object.values(qualifiedMap).reduce((s, v) => s + v, 0);
  const totalProposals = Object.values(proposalMap).reduce((s, v) => s + v, 0);

  // ── Pending certifications ────────────────────────────────────────────────
  const pendingCertifications = await prisma.certification.findMany({
    where: { status: "pending" },
    include: {
      employee: { select: { name: true } },
      kra: { select: { title: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // ── Team Summary data ─────────────────────────────────────────────────────
  const nonManagerEmps = employees.filter((e) => !e.isManager);
  const avgKraScore = nonManagerEmps.length > 0
    ? nonManagerEmps.reduce((sum, emp) => {
        const avg = emp.kras.length > 0
          ? emp.kras.reduce((s, k) => s + (k.reviews[0]?.progress ?? 0), 0) / emp.kras.length
          : 0;
        return sum + avg;
      }, 0) / nonManagerEmps.length
    : 0;

  const teamSummaryEmps = employees.map((emp) => ({
    id:             emp.id,
    name:           emp.name,
    role:           emp.role,
    avgProgress:    emp.kras.length > 0
      ? emp.kras.reduce((s, k) => s + (k.reviews[0]?.progress ?? 0), 0) / emp.kras.length
      : 0,
    pipelineLakhs:  pipelineMap[emp.id]  ?? 0,
    qualifiedLeads: qualifiedMap[emp.id] ?? 0,
    proposalCount:  proposalMap[emp.id]  ?? 0,
  }));

  const stageData = Object.entries(stageMap)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([stage, value]) => ({ stage, value }));

  // Period label
  const periodLabel = "Q1 2026-27";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Week {currentWeek}, {currentYear}</p>
        </div>
        <Link
          href="/employees/new"
          className="inline-flex items-center gap-2 bg-[#CC2229] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#A81B21] transition"
        >
          + Add Employee
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-3xl font-bold text-[#CC2229]">{employees.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total Employees</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-3xl font-bold text-[#CC2229]">{totalKRAs}</p>
          <p className="text-sm text-gray-500 mt-1">Active KRAs</p>
        </div>
        <Link href="/collections?view=overdue" className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition">
          <p className="text-3xl font-bold text-red-600">{totalOverdue}</p>
          <p className="text-sm text-gray-500 mt-1">Overdue Invoices</p>
        </Link>
        <Link href="/collections?view=upcoming" className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition">
          <p className="text-3xl font-bold text-amber-600">{totalUpcoming}</p>
          <p className="text-sm text-gray-500 mt-1">Due in 30 Days</p>
        </Link>
      </div>

      {/* Sales Revenue Summary */}
      {(totalBooking > 0 || totalBilled > 0) && (
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div>
              <h2 className="font-semibold text-gray-800">Sales Revenue Summary</h2>
              <p className="text-xs text-gray-500 mt-0.5">Booking from Closed Won · Billing from Collections</p>
            </div>
            <Link href="/collections?view=revenue" className="text-xs text-[#CC2229] hover:underline font-medium">
              Billing breakdown →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 border-b">
            {[
              { label: "Total Booking (Closed Won)", value: `₹${totalBooking.toFixed(2)}L`, color: "text-[#CC2229]" },
              { label: "Total Billed (Invoiced)",    value: `₹${totalBilled.toFixed(2)}L`,  color: "text-gray-800" },
              { label: "Total (Without GST)",        value: totalWithoutGst > 0 ? `₹${totalWithoutGst.toFixed(2)}L` : "—", color: "text-indigo-700" },
              { label: "Reviews This Week",          value: String(reviewedThisWeekCount),   color: "text-[#CC2229]" },
            ].map((s) => (
              <div key={s.label} className="p-4 text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          {sortedCategories.length > 0 && (
            <div className="px-5 py-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Booking by Category (Closed Won)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {sortedCategories.map(([cat, val]) => {
                  const pct = totalBooking > 0 ? (val / totalBooking) * 100 : 0;
                  return (
                    <div key={cat} className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-500 truncate">{cat}</p>
                      <p className="text-sm font-bold text-[#CC2229]">₹{val.toFixed(2)}L</p>
                      <div className="mt-1 bg-gray-200 rounded-full h-1">
                        <div className="bg-[#CC2229] h-1 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{pct.toFixed(1)}% of total</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pending Certifications */}
      {pendingCertifications.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div>
              <h2 className="font-semibold text-gray-800">Pending Certifications</h2>
              <p className="text-xs text-gray-500 mt-0.5">Awaiting your approval — approving auto-updates the KRA score</p>
            </div>
            <Link href="/kras" className="text-xs text-[#CC2229] hover:underline font-medium">
              Review in KRA Dashboard →
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingCertifications.map((cert) => (
              <div key={cert.id} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{cert.certName}</p>
                  <p className="text-xs text-gray-500">
                    {cert.employee.name} · {cert.issuingBody || "—"} · obtained {new Date(cert.dateObtained).toLocaleDateString()}
                  </p>
                  {cert.attachmentUrl && (
                    <a href={cert.attachmentUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline">View certificate →</a>
                  )}
                </div>
                <span className="text-xs text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                  Pending
                </span>
                <Link href="/kras"
                  className="text-xs text-[#CC2229] hover:underline font-medium whitespace-nowrap">
                  Approve →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Summary (charts + table) */}
      <TeamSummaryClient
        period={periodLabel}
        activePipeline={totalPipeline}
        qualifiedLeads={totalQualified}
        proposalsSent={totalProposals}
        avgKraScore={avgKraScore}
        employees={teamSummaryEmps}
        stageData={stageData}
      />

      {/* Employee KRA Overview — overall achievement % only */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Employee KRA Overview</h2>
        {employees.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border text-gray-400">
            <p className="font-medium">No employees yet.</p>
            <Link href="/employees/new" className="mt-2 inline-block text-[#CC2229] text-sm hover:underline">Add your first employee</Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {employees.map((emp) => {
              const avgProgress = emp.kras.length > 0
                ? Math.round(emp.kras.reduce((s, k) => s + (k.reviews[0]?.progress ?? 0), 0) / emp.kras.length)
                : 0;
              const empOverdue  = overdueMap[emp.id]  ?? 0;
              const empUpcoming = upcomingMap[emp.id] ?? 0;
              const statusColor = avgProgress >= 75 ? "text-green-600" : avgProgress >= 40 ? "text-amber-600" : "text-[#CC2229]";

              return (
                <Link
                  key={emp.id}
                  href={`/employees/${emp.id}`}
                  className="bg-white rounded-xl border shadow-sm p-4 hover:shadow-md transition flex items-center gap-4"
                >
                  {/* Name + role */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{emp.name}</span>
                      <Badge label={emp.role} variant="neutral" />
                      {empOverdue > 0 && (
                        <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          {empOverdue} overdue
                        </span>
                      )}
                      {empUpcoming > 0 && (
                        <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          {empUpcoming} due soon
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{emp.kras.length} active KRA{emp.kras.length !== 1 ? "s" : ""}</p>
                  </div>

                  {/* Progress bar + % */}
                  <div className="flex items-center gap-3 w-52 flex-shrink-0">
                    <div className="flex-1">
                      <ProgressBar value={avgProgress} />
                    </div>
                    <span className={`text-sm font-bold w-12 text-right ${statusColor}`}>
                      {avgProgress}%
                    </span>
                  </div>

                  {/* Dashboard arrow */}
                  <span className="text-gray-300 text-lg flex-shrink-0">›</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
