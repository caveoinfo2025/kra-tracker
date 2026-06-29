﻿import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import Link from "next/link";
import SheetLayout from "@/components/SheetLayout";
import DailyUpdatesClient from "./DailyUpdatesClient";

export default async function DailyUpdatesPage() {
  const session = await getSession();
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
      title="Daily Updates"
      description="Log daily progress, key movements, and blockers. Visible to your manager in real time."
    >
      <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
        <span>New Daily Activity preview is available.</span>
        <Link href="/daily-activity" className="font-medium underline hover:text-blue-900">View it here</Link>
      </div>
      <DailyUpdatesClient
        initialRows={JSON.parse(JSON.stringify(rows))}
        employees={employees}
        isManager={isManager}
        currentEmployeeId={empId}
      />
    </SheetLayout>
  );
}

