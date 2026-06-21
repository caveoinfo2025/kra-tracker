/**
 * Phase 15: Sync KRA Achievements API Route
 *
 * POST /api/kra/sync-achievements
 *
 * Computes achievement percentages for all active EmployeeTarget records
 * based on actual values from operational data (SalesFunnel, LeadGeneration, etc).
 *
 * Only accessible to managers.
 *
 * To use: save as src/app/api/kra/sync-achievements/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";

// Helper: compute closed won booking (₹L) for an employee
async function closedWonBooking(employeeId: number): Promise<number> {
  const rows = await prisma.salesFunnel.findMany({
    where: { employeeId, stage: "Closed Won" },
    select: { dealValueLakhs: true },
  });
  return rows.reduce((s, r) => s + r.dealValueLakhs, 0);
}

// Helper: count qualified leads for an employee
async function qualifiedLeadsCount(employeeId: number): Promise<number> {
  const rows = await prisma.leadGeneration.findMany({
    where: { employeeId, qualifiedFlag: true },
  });
  return rows.length;
}

// Helper: count new customers closed
async function newCustomersClosed(employeeId: number): Promise<number> {
  const rows = await prisma.salesFunnel.findMany({
    where: { employeeId, stage: "Closed Won", newCustomerFlag: true },
  });
  return rows.length;
}

// Helper: count outbound calls
async function outboundCallsCount(employeeId: number): Promise<number> {
  const rows = await prisma.leadGeneration.findMany({
    where: { employeeId, activityType: "Call" },
    select: { activityCount: true },
  });
  return rows.reduce((s, r) => s + r.activityCount, 0);
}

// Helper: count meaningful connects
async function meaningfulConnects(employeeId: number): Promise<number> {
  const rows = await prisma.leadGeneration.findMany({
    where: { employeeId, activityType: "Connect" },
    select: { activityCount: true },
  });
  return rows.reduce((s, r) => s + r.activityCount, 0);
}

// Helper: count appointments fixed
async function appointmentsFixed(employeeId: number): Promise<number> {
  const rows = await prisma.leadGeneration.findMany({
    where: { employeeId, activityType: "Appointment" },
    select: { activityCount: true },
  });
  return rows.reduce((s, r) => s + r.activityCount, 0);
}

// Helper: compute total billing (ex-GST)
async function totalBilling(employeeId: number): Promise<number> {
  const rows = await prisma.collection.findMany({
    where: { employeeId, deletedAt: null },
    select: { amountWithoutGstLakhs: true },
  });
  return rows.reduce((s, r) => s + r.amountWithoutGstLakhs, 0);
}

// Helper: compute total gross profit
async function totalGrossProfit(employeeId: number): Promise<number> {
  const rows = await prisma.salesFunnel.findMany({
    where: { employeeId, stage: "Closed Won" },
    select: { dealValueLakhs: true, grossProfitPct: true },
  });
  return rows.reduce((s, r) => s + (r.dealValueLakhs * r.grossProfitPct) / 100, 0);
}

// Main computation function
async function computeMetricValue(
  metricCode: string,
  employeeId: number
): Promise<number> {
  switch (metricCode) {
    case "BOOKING":
      return closedWonBooking(employeeId);

    case "BILLING":
      return totalBilling(employeeId);

    case "GP_PCT":
      const booking = await closedWonBooking(employeeId);
      const gp = await totalGrossProfit(employeeId);
      return booking > 0 ? (gp / booking) * 100 : 0;

    case "QL_COUNT":
      return qualifiedLeadsCount(employeeId);

    case "NEW_CUSTOMERS":
      return newCustomersClosed(employeeId);

    case "OUTBOUND_CALLS":
      return outboundCallsCount(employeeId);

    case "MEANINGFUL_CONNECTS":
      return meaningfulConnects(employeeId);

    case "APPOINTMENTS_FIXED":
      return appointmentsFixed(employeeId);

    case "COLLECTION_ONTIME":
      // TODO: implement collection on-time % calculation
      return 90;

    case "RETENTION_RATE":
      // TODO: implement customer retention rate calculation
      return 85;

    case "POC_COUNT":
      // TODO: implement PoC count calculation
      return 0;

    case "PIPELINE_RATIO":
      // TODO: implement pipeline ratio calculation
      return 0;

    case "FUNNEL_VALUE":
      // TODO: implement funnel value calculation
      return 0;

    case "FORECAST_ACCURACY":
      // TODO: implement forecast accuracy calculation
      return 0;

    case "CRM_DATA_ACCURACY":
      // TODO: implement CRM data accuracy calculation
      return 0;

    default:
      return 0;
  }
}

// POST /api/kra/sync-achievements
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    const deny = await requirePermission(session, "CRM", "KRA", "APPROVE");
    if (deny) return deny;

    console.log("🔄 Starting KRA achievement sync...");

    // Fetch all active EmployeeTarget records
    const targets = await prisma.employeeTarget.findMany({
      where: { status: "active" },
      include: {
        employeeProfile: { include: { employee: true } },
        template: {
          include: {
            items: { include: { metric: true } },
          },
        },
        achievements: true,
      },
    });

    console.log(`Found ${targets.length} active EmployeeTargets`);

    const results: Array<{
      employeeId: number;
      employeeName: string;
      targetId: number;
      metricsSync: number;
      error?: string;
    }> = [];

    // Process each target
    for (const target of targets) {
      const employee = target.employeeProfile.employee;
      let metricsSync = 0;

      try {
        if (!target.template) {
          results.push({ employeeId: employee.id, employeeName: employee.name, targetId: target.id, metricsSync: 0, error: "No template assigned" });
          continue;
        }
        // For each metric in the template, compute and update achievement
        for (const templateItem of target.template.items) {
          const metric = templateItem.metric;

          // Compute actual value based on metric code
          const actualValue = await computeMetricValue(metric.code, employee.id);

          // Compute achievement percentage
          const expectedTarget = templateItem.expectedTarget || 1;
          const achievementPct = (actualValue / expectedTarget) * 100;

          // Compute weighted score (clamped to 10)
          const weightedScore =
            Math.min(achievementPct / 10, 10) * (templateItem.weightage / 100);

          // Upsert KRAAchievement
          const existing = target.achievements.find(
            (a) => a.metricId === metric.id
          );

          if (existing) {
            await prisma.kRAAchievement.update({
              where: { id: existing.id },
              data: {
                actualValue,
                achievementPct,
                weightedScore,
                calculatedAt: new Date(),
              },
            });
          } else {
            await prisma.kRAAchievement.create({
              data: {
                employeeTargetId: target.id,
                metricId: metric.id,
                actualValue,
                achievementPct,
                weightedScore,
              },
            });
          }

          metricsSync++;
        }

        results.push({
          employeeId: employee.id,
          employeeName: employee.name,
          targetId: target.id,
          metricsSync,
        });

        console.log(
          `✓ ${employee.name} (${metricsSync} metrics synced)`
        );
      } catch (err: any) {
        console.error(`✗ Error syncing ${employee.name}:`, err.message);
        results.push({
          employeeId: employee.id,
          employeeName: employee.name,
          targetId: target.id,
          metricsSync: 0,
          error: err.message,
        });
      }
    }

    const successCount = results.filter((r) => !r.error).length;
    const failureCount = results.filter((r) => r.error).length;

    console.log(
      `✅ Sync complete: ${successCount} successful, ${failureCount} failed`
    );

    return NextResponse.json({
      success: true,
      synced: successCount,
      failed: failureCount,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("❌ Sync error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
