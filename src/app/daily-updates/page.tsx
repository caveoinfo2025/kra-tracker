import prisma from "@/lib/prisma";
import { auth } from "@/../auth";
import SheetLayout from "@/components/SheetLayout";
import DailyUpdatesClient from "./DailyUpdatesClient";

export default async function DailyUpdatesPage() {
  const session = await auth();
  const empId = session?.user?.employeeId;
  const isManager = session?.user?.isManager ?? false;

  const employees = await prisma.employee.findMany({
    where: isManager ? {} : empId ? { id: empId } : { id: -1 },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const rows = await prisma.dailyUpdate.findMany({
    where: isManager ? {} : empId ? { employeeId: empId } : { employeeId: -1 },
    include: { employee: { select: { name: true } } },
    orderBy: { date: "desc" },
    take: 100,
  });

  return (
    <SheetLayout
      icon="📋"
      title="Daily Updates"
      description="Log daily progress, key movements, and blockers. Visible to your manager in real time."
    >
      <DailyUpdatesClient
        initialRows={JSON.parse(JSON.stringify(rows))}
        employees={employees}
        isManager={isManager}
        currentEmployeeId={empId}
      />
    </SheetLayout>
  );
}
