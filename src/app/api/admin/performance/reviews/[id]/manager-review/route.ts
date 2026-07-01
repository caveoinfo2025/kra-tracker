import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import { submitManagerReview, REVIEW_STATUSES, type ReviewStatus } from "@/lib/performance-engine";

/**
 * Phase W11 — manager rating / finalization action on an existing PerformanceReview.
 *
 * POST /api/admin/performance/reviews/[id]/manager-review
 *   Body: { managerRating?, managerRemarks?, finalRating?, status? }
 *
 * Manager/admin only, explicit action. `finalRating` is NEVER auto-calculated — only written if
 * the manager explicitly submits one. `status: "APPROVED"` is treated as finalization for audit
 * purposes; any other status transition is a plain manager-review update. Writes ONLY
 * PerformanceReview + PerformanceAudit — never touches KRAAchievement/EmployeeTarget/KRAMetric.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const deny = await requirePermission(session, "Settings", "Performance", "EDIT");
  if (deny) return deny;

  const managerEmployeeId = (session?.user as { employeeId?: number } | undefined)?.employeeId;
  if (!managerEmployeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.status !== undefined && !(REVIEW_STATUSES as readonly string[]).includes(body.status as string)) {
    return NextResponse.json({ error: `status must be one of: ${REVIEW_STATUSES.join(", ")}` }, { status: 400 });
  }

  const result = await submitManagerReview(Number(id), managerEmployeeId, {
    ...(typeof body.managerRating === "number" ? { managerRating: body.managerRating } : {}),
    ...(typeof body.managerRemarks === "string" ? { managerRemarks: body.managerRemarks.slice(0, 2000) } : {}),
    ...(typeof body.finalRating === "number" ? { finalRating: body.finalRating } : {}),
    ...(body.status !== undefined ? { status: body.status as ReviewStatus } : {}),
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === "Review not found" ? 404 : 400 });
  return NextResponse.json(result.review);
}
