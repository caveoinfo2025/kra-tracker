/**
 * Phase 15 Update: /kras page
 *
 * Changed to read EmployeeTarget (new enterprise system)
 * instead of legacy KRA model.
 *
 * Fallback: if no EmployeeTarget exists, still show legacy KRA
 * (backward compatibility during transition).
 *
 * To use: replace current src/app/kras/page.tsx with this file
 */

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
    // Manager: fetch all employees (non-managers) with EmployeeTarget + legacy KRA (fallback)
    const rawEmployees = await prisma.employee.findMany({
      where: { isManager: false },
      orderBy: { name: "asc" },
      include: {
        // NEW: Enterprise system - EmployeeTarget
        employeeProfile: {
          include: {
            employeeTargets: {
              where: { status: "active" },
              include: {
                template: {
                  include: {
                    items: {
                      include: { metric: true },
                    },
                  },
                },
                achievements: true,
                reviews: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
        // FALLBACK: Legacy system - KRA (if no EmployeeTarget)
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
    // Employee: fetch only their own EmployeeTarget + legacy KRA (fallback)
    const employeeId = session.user.employeeId;
    if (!employeeId) redirect("/login");

    const rawEmployee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        // NEW: Enterprise system - EmployeeTarget
        employeeProfile: {
          include: {
            employeeTargets: {
              where: { status: "active" },
              include: {
                template: {
                  include: {
                    items: {
                      include: { metric: true },
                    },
                  },
                },
                achievements: true,
                reviews: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
        // FALLBACK: Legacy system - KRA (if no EmployeeTarget)
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
      />
    );
  }
}
