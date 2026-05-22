import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/../auth";
import Badge from "@/components/Badge";
import ProgressBar from "@/components/ProgressBar";
import KRASection from "./KRASection";
import ReviewSection from "./ReviewSection";
import type { EmployeeSerialized } from "@/lib/types";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

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

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 flex gap-2">
        <Link href="/" className="hover:text-indigo-600">Dashboard</Link>
        <span>/</span>
        <Link href="/employees" className="hover:text-indigo-600">Employees</Link>
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
          <div className="flex gap-3">
            <Link
              href={`/employees/${employee.id}/edit`}
              className="text-sm border border-gray-300 text-gray-700 px-4 py-1.5 rounded-lg hover:bg-gray-50 transition"
            >
              Edit
            </Link>
          </div>
        </div>

        {/* Score summary */}
        <div className="mt-5 grid grid-cols-3 gap-4 text-center border-t pt-4">
          <div>
            <p className="text-2xl font-bold text-indigo-600">{employee.kras.length}</p>
            <p className="text-xs text-gray-500">Active KRAs</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-indigo-600">{avgProgress}%</p>
            <p className="text-xs text-gray-500">Avg Progress</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-indigo-600">{avgScore}</p>
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

      {/* KRA Section */}
      <KRASection employee={employee} />

      {/* Review Section */}
      <ReviewSection employee={employee} />
    </div>
  );
}
