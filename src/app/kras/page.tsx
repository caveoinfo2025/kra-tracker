import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { redirect } from "next/navigation";
import KrasClient from "./KrasClient";

function getWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default async function KrasPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const isManager = session.user.isManager;
  const now = new Date();
  const currentWeek = getWeekNumber(now);
  const currentYear = now.getFullYear();

  if (isManager) {
    // Fetch all employees with their active KRAs + latest review
    const rawEmployees = await prisma.employee.findMany({
      where: { isManager: false },
      orderBy: { name: "asc" },
      include: {
        kras: {
          where: { status: "active" },
          orderBy: { createdAt: "asc" },
          include: {
            reviews: {
              orderBy: [{ year: "desc" }, { week: "desc" }],
              take: 1,
            },
            weeklyCommits: {
              where: { week: currentWeek, year: currentYear },
            },
            certifications: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    const employees = JSON.parse(JSON.stringify(rawEmployees));

    return (
      <KrasClient
        isManager={true}
        employees={employees}
        currentWeek={currentWeek}
        currentYear={currentYear}
      />
    );
  } else {
    // Employee: fetch only their own active KRAs
    const employeeId = session.user.employeeId;
    if (!employeeId) redirect("/login");

    const rawEmployee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        kras: {
          where: { status: "active" },
          orderBy: { createdAt: "asc" },
          include: {
            reviews: {
              orderBy: [{ year: "desc" }, { week: "desc" }],
              take: 1,
            },
            weeklyCommits: {
              where: { week: currentWeek, year: currentYear },
            },
            certifications: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!rawEmployee) redirect("/login");

    const employee = JSON.parse(JSON.stringify(rawEmployee));

    return (
      <KrasClient
        isManager={false}
        employees={[employee]}
        currentWeek={currentWeek}
        currentYear={currentYear}
        myEmployeeId={employeeId}
      />
    );
  }
}
