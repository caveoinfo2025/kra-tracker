import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { listReviews, startPerformanceReview, updateReview } from "@/lib/performance-engine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const employeeTargetId = req.nextUrl.searchParams.get("employeeTargetId");
  const reviewerId = req.nextUrl.searchParams.get("reviewerId");
  const status = req.nextUrl.searchParams.get("status") ?? undefined;

  const reviews = await listReviews({
    ...(employeeTargetId ? { employeeTargetId: Number(employeeTargetId) } : {}),
    ...(reviewerId ? { reviewerId: Number(reviewerId) } : {}),
    ...(status ? { status } : {}),
  });
  return NextResponse.json(reviews);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.employeeTargetId || !body.reviewerId) {
    return NextResponse.json({ error: "employeeTargetId and reviewerId required" }, { status: 400 });
  }

  const performedBy = session.user.employeeId ?? 0;
  const review = await startPerformanceReview(
    body as unknown as Parameters<typeof startPerformanceReview>[0],
    performedBy,
  );
  return NextResponse.json(review, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, ...input } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const performedBy = session.user.employeeId ?? 0;
  const review = await updateReview(Number(id), input, performedBy);
  return NextResponse.json(review);
}
