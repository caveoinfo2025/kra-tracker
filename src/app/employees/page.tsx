import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import prisma from "@/lib/prisma";
import Badge from "@/components/Badge";

export default async function EmployeesPage() {
  const session = await getSession();
  if (!session?.user?.isManager) {
    redirect(session?.user?.employeeId ? `/employees/${session.user.employeeId}` : "/");
  }

  const employees = await prisma.employee.findMany({
    include: { kras: { where: { status: "active" } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
        <Link
          href="/employees/new"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          + Add Employee
        </Link>
      </div>

      {employees.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border text-gray-400">
          <p className="text-4xl mb-3">ðŸ‘¤</p>
          <p className="font-medium">No employees yet.</p>
          <Link href="/employees/new" className="mt-2 inline-block text-indigo-600 text-sm hover:underline">
            Add your first employee â†’
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Name", "Email", "Department", "Role", "KRAs", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">{emp.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{emp.email}</td>
                  <td className="px-6 py-4">
                    <Badge label={emp.department} variant="info" />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{emp.role}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{emp.kras.length}</td>
                  <td className="px-6 py-4 flex gap-3 text-sm">
                    <Link href={`/employees/${emp.id}`} className="text-indigo-600 hover:underline">
                      View
                    </Link>
                    <Link href={`/employees/${emp.id}/edit`} className="text-gray-500 hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

