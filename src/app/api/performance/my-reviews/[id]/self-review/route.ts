import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { submitSelfReview } from "@/lib/performance-engine";

/**
 * Phase W11 — employee self-review submission (explicit action, self-scoped).
 *
 * POST /api/performance/my-reviews/[id]/self-review
 *   Body: { selfRating?, selfRemarks? }
 *
 * The caller may only submit against their OWN review (enforced in `submitSelfReview` via the
 * review's EmployeeTarget → EmployeeProfile → userId chain) — an employee can never edit another's
 * review or any manager-only field. Blocked once the review is finalized (status APPROVED) unless
 * a manager reopens it. Writes ONLY PerformanceReview + PerformanceAudit.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const employeeId = (session?.user as { employeeId?: number } | undefined)?.employeeId;
  if (!employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await submitSelfReview(Number(id), employeeId, {
    ...(typeof body.selfRating === "number" ? { selfRating: body.selfRating } : {}),
    ...(typeof body.selfRemarks === "string" ? { selfRemarks: body.selfRemarks.slice(0, 2000) } : {}),
  });

  if (!result.ok) {
    const status = result.error === "Review not found" ? 404 : result.error.startsWith("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(result.review);
}
