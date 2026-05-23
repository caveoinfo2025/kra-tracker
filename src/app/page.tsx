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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Employees", value: employees.length },
          { label: "Active KRAs", value: totalKRAs },
          { label: "Reviews This Week", value: reviewedThisWeekCount },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm border p-5">
            <p className="text-3xl font-bold text-[#CC2229]">{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

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

              return (
                <Link
                  key={emp.id}
                  href={`/employees/${emp.id}`}
                  className="bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition block"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{emp.name}</h3>
                        <Badge label={emp.department} variant="info" />
                        <Badge label={emp.role} variant="neutral" />
                        {reviewedThisWeek && <Badge label="Reviewed" variant="success" />}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{emp.email}</p>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <span>{emp.kras.length} KRA{emp.kras.length !== 1 ? "s" : ""}</span>
                      <span>Avg Score: <strong>{avgScore}</strong>/10</span>
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
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
