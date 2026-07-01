import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { calculateReviewSummaryFromAchievements, parseReviewComments } from "@/lib/performance-engine";

/**
 * Phase W11 — employee SELF-VIEW of their own PerformanceReview(s) (read-only).
 *
 * GET /api/performance/my-reviews
 *   SELF-SCOPED from the session only — no employeeId/employeeProfileId override, so an employee
 *   can never see another's review. Business-friendly shape (period name, parsed self/manager
 *   remarks, achievement summary) — no raw employeeTargetId/reviewerId, no raw JSON.
 */
export async function GET() {
  const session = await getSession();
  const employeeId = (session?.user as { employeeId?: number } | undefined)?.employeeId;
  if (!employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.employeeProfile.findUnique({ where: { userId: employeeId }, select: { id: true } });
  if (!profile) return NextResponse.json({ reviews: [] });

  const targets = await prisma.employeeTarget.findMany({
    where: { employeeProfileId: profile.id },
    select: { id: true, periodId: true, period: { select: { name: true } } },
  });
  if (targets.length === 0) return NextResponse.json({ reviews: [] });

  const targetById = new Map(targets.map((t) => [t.id, t]));
  const reviews = await prisma.performanceReview.findMany({
    where: { employeeTargetId: { in: targets.map((t) => t.id) } },
    orderBy: { createdAt: "desc" },
  });

  const shaped = await Promise.all(reviews.map(async (r) => {
    const target = targetById.get(r.employeeTargetId);
    const summary = await calculateReviewSummaryFromAchievements(r.employeeTargetId);
    return {
      reviewId: r.id,
      period: target?.period?.name ?? `Period #${target?.periodId ?? ""}`,
      status: r.status,
      selfRating: r.selfRating,
      managerRating: r.managerRating,
      finalRating: r.finalRating,
      comments: parseReviewComments(r.comments),
      achievementSummary: { achievementCount: summary.achievementCount, totalWeightedScore: summary.totalWeightedScore },
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }));

  return NextResponse.json({ reviews: shaped });
}
