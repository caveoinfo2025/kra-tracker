import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import { listReviews, startPerformanceReview, updateReview, calculateReviewSummaryFromAchievements } from "@/lib/performance-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "Performance", "EDIT");
  if (deny) return deny;

  const employeeTargetId = req.nextUrl.searchParams.get("employeeTargetId");
  const reviewerId = req.nextUrl.searchParams.get("reviewerId");
  const status = req.nextUrl.searchParams.get("status") ?? undefined;

  const reviews = await listReviews({
    ...(employeeTargetId ? { employeeTargetId: Number(employeeTargetId) } : {}),
    ...(reviewerId ? { reviewerId: Number(reviewerId) } : {}),
    ...(status ? { status } : {}),
  });

  // Phase W11 — ADDITIVE business-friendly enrichment only (employeeName/periodName/achievement
  // summary). Every original field is preserved unchanged so the existing ReviewWorkflowManager UI
  // (and any other consumer of this route) keeps working exactly as before.
  const profiles = await prisma.employeeTarget.findMany({
    where: { id: { in: reviews.map((r) => r.employeeTargetId) } },
    select: { id: true, periodId: true, period: { select: { name: true } }, employeeProfile: { select: { employee: { select: { name: true } } } } },
  });
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const enriched = await Promise.all(reviews.map(async (r) => {
    const target = profileById.get(r.employeeTargetId);
    const summary = await calculateReviewSummaryFromAchievements(r.employeeTargetId);
    return {
      ...r,
      employeeName: target?.employeeProfile?.employee?.name ?? null,
      periodName: target?.period?.name ?? null,
      achievementCount: summary.achievementCount,
      totalWeightedScore: summary.totalWeightedScore,
    };
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "Performance", "EDIT");
  if (deny) return deny;

  const body = await req.json();
  if (!body.employeeTargetId || !body.reviewerId) {
    return NextResponse.json({ error: "employeeTargetId and reviewerId required" }, { status: 400 });
  }

  const performedBy = session?.user?.employeeId ?? 0;
  const review = await startPerformanceReview(
    body as unknown as Parameters<typeof startPerformanceReview>[0],
    performedBy,
  );
  return NextResponse.json(review, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "Performance", "EDIT");
  if (deny) return deny;

  const body = await req.json();
  const { id, ...input } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const performedBy = session?.user?.employeeId ?? 0;
  const review = await updateReview(Number(id), input, performedBy);
  return NextResponse.json(review);
}
