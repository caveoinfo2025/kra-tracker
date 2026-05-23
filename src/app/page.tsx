import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import prisma from "@/lib/prisma";
import ProgressBar from "@/components/ProgressBar";
import Badge from "@/components/Badge";

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user?.isManager && session?.user?.employeeId) {
    redirect(`/employees/${session.user.employeeId}`);
  }

  const employees = await prisma.employee.findMany({
    include: {
      kras: {
        where: { status: "active" },
        include: { reviews: { orderBy: [{ year: "desc" }, { week: "desc" }], take: 1 } },
      },
    },
    orderBy: { name: "asc" },
  });

  const now = new Date();
  const currentWeek = getWeekNumber(now);
  const currentYear = now.getFullYear();

  const reviewedThisWeekCount = await prisma.weeklyReview.count({
    where: { week: currentWeek, year: currentYear },
  });

  const totalKRAs = employees.reduce((s, e) => s + e.kras.length, 0);

  // ── Collection overdue / upcoming per employee ────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30 = new Date(today);
  in30.setDate(today.getDate() + 30);

  const allCollections = await prisma.collection.findMany({
    orderBy: { invoiceDate: "desc" },
  });
  const pendingCollections = allCollections.filter((c) => c.collectionStatus !== "Fully Received");

  const overdueMap: Record<number, number>  = {};
  const upcomingMap: Record<number, number> = {};
  for (const c of pendingCollections) {
    const due = new Date(c.dueDate);
    due.setHours(0, 0, 0, 0);
    if (due < today) {
      overdueMap[c.employeeId] = (overdueMap[c.employeeId] ?? 0) + 1;
    } else if (due <= in30) {
      upcomingMap[c.employeeId] = (upcomingMap[c.employeeId] ?? 0) + 1;
    }
  }

  // Billing revenue per employee (all invoices, not just pending)
  type EmpBilling = { billed: number; withoutGst: number };
  const billingMap: Record<number, EmpBilling> = {};
  for (const c of allCollections) {
    if (!billingMap[c.employeeId]) billingMap[c.employeeId] = { billed: 0, withoutGst: 0 };
    billingMap[c.employeeId].billed     += c.invoiceValueLakhs ?? 0;
    billingMap[c.employeeId].withoutGst += c.amountWithoutGstLakhs ?? 0;
  }

  const totalOverdue  = Object.values(overdueMap).reduce((s, v) => s + v, 0);
  const totalUpcoming = Object.values(upcomingMap).reduce((s, v) => s + v, 0);
  const totalBilled   = Object.values(billingMap).reduce((s, v) => s + v.billed, 0);
  const totalWithoutGst = Object.values(billingMap).reduce((s, v) => s + v.withoutGst, 0);

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
        <Link
          href="/collections?view=overdue"
          className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition"
        >
          <p className="text-3xl font-bold text-red-600">{totalOverdue}</p>
          <p className="text-sm text-gray-500 mt-1">Overdue Invoices</p>
        </Link>
        <Link
          href="/collections?view=upcoming"
          className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition"
        >
          <p className="text-3xl font-bold text-amber-600">{totalUpcoming}</p>
          <p className="text-sm text-gray-500 mt-1">Due in 30 Days</p>
        </Link>
      </div>

      {/* Billing Revenue Summary */}
      {totalBilled > 0 && (
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div>
              <h2 className="font-semibold text-gray-800">Billing Revenue</h2>
              <p className="text-xs text-gray-500 mt-0.5">Total across all salespersons from billing records</p>
            </div>
            <Link href="/collections?view=revenue"
              className="text-xs text-[#CC2229] hover:underline font-medium">
              Full breakdown
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
            {[
              { label: "Total Billed", value: `₹${totalBilled.toFixed(2)}L`, color: "text-[#CC2229]" },
              { label: "Without GST",  value: totalWithoutGst > 0 ? `₹${totalWithoutGst.toFixed(2)}L` : "—", color: "text-indigo-700" },
              { label: "GST Amount",   value: totalWithoutGst > 0 ? `₹${(totalBilled - totalWithoutGst).toFixed(2)}L` : "—", color: "text-gray-600" },
              { label: "Reviews This Week", value: reviewedThisWeekCount, color: "text-[#CC2229]" },
            ].map((s) => (
              <div key={s.label} className="p-4 text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Employee KRA Overview */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Employee KRA Overview</h2>
        {employees.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border text-gray-400">
            <p className="font-medium">No employees yet.</p>
            <Link href="/employees/new" className="mt-2 inline-block text-[#CC2229] text-sm hover:underline">
              Add your first employee
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {employees.map((emp) => {
              const avgProgress =
                emp.kras.length > 0
                  ? Math.round(
                      emp.kras.reduce((sum, k) => sum + (k.reviews[0]?.progress ?? 0), 0) /
                        emp.kras.length
                    )
                  : 0;

              const avgScore =
                emp.kras.length > 0
                  ? (
                      emp.kras.reduce((sum, k) => sum + (k.reviews[0]?.score ?? 0), 0) /
                      emp.kras.length
                    ).toFixed(1)
                  : "—";

              const reviewedThisWeek = emp.kras.some(
                (k) => k.reviews[0]?.week === currentWeek && k.reviews[0]?.year === currentYear
              );

              const empOverdue   = overdueMap[emp.id]  ?? 0;
              const empUpcoming  = upcomingMap[emp.id] ?? 0;
              const empBilling   = billingMap[emp.id];
              const empBilled    = empBilling?.billed    ?? 0;
              const empWithoutGst = empBilling?.withoutGst ?? 0;

              return (
                <div
                  key={emp.id}
                  className="relative bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition"
                >
                  {/* Invisible full-area link to employee page (sits behind content) */}
                  <Link
                    href={`/employees/${emp.id}`}
                    className="absolute inset-0 rounded-xl z-0"
                    aria-label={`View ${emp.name} KRAs`}
                  />

                  {/* Content sits above the link overlay */}
                  <div className="relative z-10 pointer-events-none">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{emp.name}</h3>
                          <Badge label={emp.department} variant="info" />
                          <Badge label={emp.role} variant="neutral" />
                          {reviewedThisWeek && <Badge label="Reviewed" variant="success" />}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{emp.email}</p>

                        {/* Per-employee collection badges — re-enable pointer events so they are clickable */}
                        {(empOverdue > 0 || empUpcoming > 0) && (
                          <div className="flex gap-2 mt-1.5 pointer-events-auto">
                            {empOverdue > 0 && (
                              <Link
                                href={`/collections?view=overdue&emp=${emp.id}`}
                                className="text-xs font-medium bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full hover:bg-red-200 transition"
                              >
                                {empOverdue} overdue
                              </Link>
                            )}
                            {empUpcoming > 0 && (
                              <Link
                                href={`/collections?view=upcoming&emp=${emp.id}`}
                                className="text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full hover:bg-amber-200 transition"
                              >
                                {empUpcoming} upcoming
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 text-sm text-gray-600">
                        <div className="flex items-center gap-4">
                          <span>{emp.kras.length} KRA{emp.kras.length !== 1 ? "s" : ""}</span>
                          <span>Avg Score: <strong>{avgScore}</strong>/10</span>
                        </div>
                        {empBilled > 0 && (
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-gray-400">Billing:</span>
                            <Link href={`/collections?emp=${emp.id}`}
                              className="font-bold text-[#CC2229] hover:underline">
                              ₹{empBilled.toFixed(2)}L
                            </Link>
                            {empWithoutGst > 0 && (
                              <span className="text-indigo-600 font-medium">
                                (ex-GST: ₹{empWithoutGst.toFixed(2)}L)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {emp.kras.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {emp.kras.map((kra) => {
                          const prog = kra.reviews[0]?.progress ?? 0;
                          return (
                            <div key={kra.id} className="flex items-center gap-3">
                              <span className="text-xs text-gray-500 w-40 truncate">{kra.title}</span>
                              <div className="flex-1"><ProgressBar value={prog} /></div>
                              <span className="text-xs text-gray-500 w-8 text-right">{prog}%</span>
                            </div>
                          );
                        })}
                        <div className="mt-2 pt-2 border-t">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-gray-600 w-40">Overall</span>
                            <div className="flex-1"><ProgressBar value={avgProgress} /></div>
                            <span className="text-xs font-medium text-gray-600 w-8 text-right">{avgProgress}%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
