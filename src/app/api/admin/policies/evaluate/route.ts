/**
 * POST /api/admin/policies/evaluate
 *
 * Evaluates all active policies for a module+event against a data payload.
 * Used by application code (expense submission, deal creation, export, etc.)
 * to determine what actions are required before proceeding.
 *
 * Body: { module: string; event: string; data: Record<string, unknown> }
 *
 * Returns:
 *   { allowed: boolean; actions: PolicyActionDef[]; matched: string[] }
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deny = await requirePermission(session, "Settings", "Policy", "VIEW");
  if (deny) return deny;

  const body = await req.json();
  const { module, event, data } = body as {
    module?: string; event?: string; data?: Record<string, unknown>;
  };

  if (!module || !event) {
    return NextResponse.json({ error: "module and event are required" }, { status: 400 });
  }

  try {
    const { evaluatePolicy } = await import("@/lib/policy-engine");
    const result = await evaluatePolicy({ module, event, data: data ?? {} });
    return NextResponse.json(result);
  } catch {
    // Fail open — always allow when engine errors
    return NextResponse.json({ allowed: true, actions: [], matched: [] });
  }
}
