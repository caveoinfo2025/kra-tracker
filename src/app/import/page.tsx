import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import prisma from "@/lib/prisma";
import ImportClient from "./ImportClient";

export default async function ImportPage() {
  const session = await getSession();
  if (!session?.user?.isManager) redirect("/");

  const employees = await prisma.employee.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import from CRM</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload a CSV or Excel export from your CRM to import bookings, closures, or payment collections.
        </p>
      </div>
      <ImportClient employees={employees} />
    </div>
  );
}
