import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import Badge from "@/components/Badge";
import ProgressBar from "@/components/ProgressBar";
import KRASection from "./KRASection";
import ReviewSection from "./ReviewSection";
import type { EmployeeSerialized } from "@/lib/types";

function getWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  // Non-managers can only view their own profile
  if (!session?.user?.isManager && session?.user?.employeeId !== Number(id)) {
    redirect(`/employees/${session?.user?.employeeId}`);
  }

  const raw = await prisma.employee.findUnique({
    where: { id: Number(id) },
    include: {
      kras: {
        orderBy: { createdAt: "desc" },
        include: {
          reviews: {
            orderBy: [{ year: "desc" }, { week: "desc" }],
          },
        },
      },
    },
  });

  if (!raw) notFound();

  // Serialize Date → string for client components
  const employee = JSON.parse(JSON.stringify(raw)) as EmployeeSerialized;

  // ── Enhanced dashboard queries ────────────────────────────────────────────
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const in7 = new Date(today);
  in7.setDate(today.getDate() + 7);
  const ninetyDaysAgo = new Date(today);
  ninetyDaysAgo.setDate(today.getDate() - 90);

  const currentWeek = getWeekNumber(now);
  const currentYear = now.getFullYear();

  const [
    upcomingAppointments,
    staleLeads,
    myCollections,
    recentBlockers,
    weeklyCommitsRaw,
    recentWinsRaw,
  ] = await Promise.all([
    prisma.leadGeneration.findMany({
      where: {
        employeeId: Number(id),
        activityType: "Meeting",
        nextActionDate: { gte: today, lte: in7 },
      },
      orderBy: { nextActionDate: "asc" },
      take: 10,
    }),
    prisma.leadGeneration.findMany({
      where: {
        employeeId: Number(id),
        nextActionDate: { lt: today },
        leadStatus: { notIn: ["Closed", "Won", "Lost"] },
      },
      orderBy: { nextActionDate: "asc" },
      take: 10,
    }),
    prisma.collection.findMany({
      where: { employeeId: Number(id), collectionStatus: { not: "Fully Received" }, deletedAt: null },
      orderBy: { dueDate: "asc" },
    }),
    prisma.dailyUpdate.findMany({
      where: { employeeId: Number(id), blockers: { not: "" } },
      orderBy: { date: "desc" },
      take: 5,
    }),
    prisma.weeklyCommit.findMany({
      where: { employeeId: Number(id), week: currentWeek, year: currentYear },
      include: { kra: { select: { id: true, title: true } } },
    }),
    prisma.salesFunnel.findMany({
      where: { employeeId: Number(id), stage: "Closed Won" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        customerName: true,
        opportunityName: true,
        dealValueLakhs: true,
        solutionCategory: true,
        createdAt: true,
      },
    }),
  ]);

  const overdueCollections = myCollections.filter(
    (c) => new Date(c.dueDate) < today
  );
  const upcomingCollections = myCollections.filter((c) => {
    const d = new Date(c.dueDate);
    return d >= today && d <= in7;
  });

  // Serialize for client rendering
  const upcomingAppointmentsSer = JSON.parse(JSON.stringify(upcomingAppointments));
  const staleLeadsSer = JSON.parse(JSON.stringify(staleLeads));
  const overdueCollectionsSer = JSON.parse(JSON.stringify(overdueCollections));
  const upcomingCollectionsSer = JSON.parse(JSON.stringify(upcomingCollections));
  const recentBlockersSer = JSON.parse(JSON.stringify(recentBlockers));
  const weeklyCommitsSer = JSON.parse(JSON.stringify(weeklyCommitsRaw));
  const recentWinsSer = JSON.parse(JSON.stringify(recentWinsRaw));

  const avgProgress =
    employee.kras.length > 0
      ? Math.round(
          employee.kras.reduce((sum, k) => {
            const last = k.reviews[0];
            return sum + (last?.progress ?? 0);
          }, 0) / employee.kras.length
        )
      : 0;

  const avgScore =
    employee.kras.length > 0
      ? (
          employee.kras.reduce((sum, k) => {
            const last = k.reviews[0];
            return sum + (last?.score ?? 0);
          }, 0) / employee.kras.length
        ).toFixed(1)
      : "—";

  const isOwnProfile =
    session?.user?.employeeId === Number(id) || session?.user?.isManager;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 flex gap-2">
        <Link href="/" className="hover:text-[#CC2229]">Dashboard</Link>
        <span>/</span>
        <Link href="/employees" className="hover:text-[#CC2229]">Employees</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{employee.name}</span>
      </nav>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
              <Badge label={employee.department} variant="info" />
              <Badge label={employee.role} variant="neutral" />
            </div>
            <p className="text-sm text-gray-500 mt-1">{employee.email}</p>
          </div>
          {session?.user?.isManager && (
            <div className="flex gap-3">
              <Link
                href={`/employees/${employee.id}/edit`}
                className="text-sm border border-gray-300 text-gray-700 px-4 py-1.5 rounded-lg hover:bg-gray-50 transition"
              >
                Edit
              </Link>
            </div>
          )}
        </div>

        {/* Score summary */}
        <div className="mt-5 grid grid-cols-3 gap-4 text-center border-t pt-4">
          <div>
            <p className="text-2xl font-bold text-[#CC2229]">{employee.kras.length}</p>
            <p className="text-xs text-gray-500">Active KRAs</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#CC2229]">{avgProgress}%</p>
            <p className="text-xs text-gray-500">Avg Progress</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#CC2229]">{avgScore}</p>
            <p className="text-xs text-gray-500">Avg Score /10</p>
          </div>
        </div>

        {employee.kras.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-1">Overall Progress</p>
            <ProgressBar value={avgProgress} />
          </div>
        )}
      </div>

      {/* ── Enhanced Dashboard panels (own profile or manager viewing) ── */}
      {isOwnProfile && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* This Week's Commitments Panel */}
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-800">
                Week {currentWeek} Commitments
              </h2>
              <Link
                href="/kras"
                className="text-xs text-[#CC2229] hover:underline"
              >
                Update on KRAs page
              </Link>
            </div>
            {weeklyCommitsSer.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400">No weekly commits yet.</p>
                <Link
                  href="/kras"
                  className="text-sm text-[#CC2229] hover:underline mt-1 inline-block"
                >
                  Add your commits on the KRAs page
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {weeklyCommitsSer.map((wc: { id: number; kra: { title: string }; commitText: string }) => (
                  <li key={wc.id} className="text-sm border-l-2 border-[#CC2229] pl-3">
                    <p className="font-medium text-gray-700 text-xs">{wc.kra.title}</p>
                    <p className="text-gray-600 mt-0.5">{wc.commitText}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Reminders Panel */}
          <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Reminders</h2>

            {/* Overdue collections */}
            {overdueCollectionsSer.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 mb-1">
                  Overdue Collections ({overdueCollectionsSer.length})
                </p>
                <ul className="space-y-1">
                  {overdueCollectionsSer.map((c: { id: number; customerName: string; dueDate: string; invoiceValueLakhs: number; amountReceivedLakhs: number }) => {
                    const daysOverdue = Math.floor(
                      (Date.now() - new Date(c.dueDate).getTime()) / 86400000
                    );
                    const balance = c.invoiceValueLakhs - (c.amountReceivedLakhs ?? 0);
                    return (
                      <li key={c.id} className="text-sm flex items-center justify-between text-red-700 bg-red-50 rounded px-2 py-1">
                        <span>{c.customerName}</span>
                        <span className="text-xs">{daysOverdue}d overdue · ₹{balance.toFixed(2)}L due</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Upcoming collections */}
            {upcomingCollectionsSer.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-600 mb-1">
                  Collections Due in 7 Days ({upcomingCollectionsSer.length})
                </p>
                <ul className="space-y-1">
                  {upcomingCollectionsSer.map((c: { id: number; customerName: string; dueDate: string; invoiceValueLakhs: number; amountReceivedLakhs: number }) => {
                    const balance = c.invoiceValueLakhs - (c.amountReceivedLakhs ?? 0);
                    return (
                      <li key={c.id} className="text-sm flex items-center justify-between text-amber-700 bg-amber-50 rounded px-2 py-1">
                        <span>{c.customerName}</span>
                        <span className="text-xs">
                          {new Date(c.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · ₹{balance.toFixed(2)}L due
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Stale leads */}
            {staleLeadsSer.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-orange-600 mb-1">
                  Stale Leads ({staleLeadsSer.length})
                </p>
                <ul className="space-y-1">
                  {staleLeadsSer.map((l: { id: number; customerName: string; leadStatus: string; nextActionDate: string }) => {
                    const daysAgo = l.nextActionDate
                      ? Math.floor((Date.now() - new Date(l.nextActionDate).getTime()) / 86400000)
                      : null;
                    return (
                      <li key={l.id} className="text-sm flex items-center justify-between text-orange-700 bg-orange-50 rounded px-2 py-1">
                        <span>{l.customerName}</span>
                        <span className="text-xs">
                          {l.leadStatus}
                          {daysAgo !== null ? ` · ${daysAgo}d overdue` : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Recent blocker */}
            {recentBlockersSer.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-yellow-600 mb-1">Latest Blocker</p>
                <div className="text-sm text-yellow-800 bg-yellow-50 rounded px-3 py-2">
                  {recentBlockersSer[0].blockers}
                </div>
              </div>
            )}

            {overdueCollectionsSer.length === 0 &&
              upcomingCollectionsSer.length === 0 &&
              staleLeadsSer.length === 0 &&
              recentBlockersSer.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No reminders right now.</p>
              )}
          </div>

          {/* Upcoming Appointments Panel */}
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Upcoming Meetings (Next 7 Days)
            </h2>
            {upcomingAppointmentsSer.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No meetings scheduled.</p>
            ) : (
              <ul className="space-y-2">
                {upcomingAppointmentsSer.map((appt: { id: number; customerName: string; nextActionDate: string; activityType: string; remarks: string }) => (
                  <li key={appt.id} className="flex items-start gap-3 text-sm border-l-2 border-blue-400 pl-3">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{appt.customerName}</p>
                      <p className="text-xs text-gray-500">
                        {appt.nextActionDate
                          ? new Date(appt.nextActionDate).toLocaleDateString("en-IN", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })
                          : "—"}{" "}
                        · {appt.activityType}
                      </p>
                      {appt.remarks && (
                        <p className="text-xs text-gray-400 mt-0.5">{appt.remarks}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent Achievements Panel */}
          <div className="bg-white rounded-xl border border-green-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-green-800 mb-3">
              Recent Wins (Closed Won)
            </h2>
            {recentWinsSer.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No closed deals yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentWinsSer.map((win: { customerName: string; opportunityName: string; dealValueLakhs: number; solutionCategory: string }, idx: number) => (
                  <li key={idx} className="flex items-start gap-3 text-sm border-l-2 border-green-400 pl-3">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{win.customerName}</p>
                      <p className="text-xs text-gray-500">{win.opportunityName}</p>
                      <p className="text-xs text-green-700 font-semibold">
                        ₹{win.dealValueLakhs}L · {win.solutionCategory}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* KRA Section */}
      <KRASection employee={employee} isManager={session?.user?.isManager ?? false} />

      {/* Review Section */}
      <ReviewSection employee={employee} />
    </div>
  );
}
