/**
 * GET /api/payments/today
 * Daily payment summary — total received today + recent receipts.
 *
 * Scope:
 *   - Managers / Accounts: company-wide by default.
 *   - Sales reps: automatically scoped to their own invoices.
 *   - Add ?scope=mine to force a manager into their own-only view.
 *
 * Used by web + mobile dashboards and the Accounts daily summary.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { paymentsToday } from "@/lib/payments";
import { canSeeAllCollections } from "@/lib/roles";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope"); // "mine" | "all" | null
  const isPrivileged = canSeeAllCollections(session.user);

  // Reps are always scoped to their own; privileged users are company-wide
  // unless they explicitly ask for ?scope=mine.
  const ownOnly = !isPrivileged || scope === "mine";
  const employeeId = ownOnly ? session.user.employeeId ?? undefined : undefined;

  const summary = await paymentsToday(employeeId);
  return NextResponse.json({ ...summary, scope: ownOnly ? "mine" : "all" });
}
