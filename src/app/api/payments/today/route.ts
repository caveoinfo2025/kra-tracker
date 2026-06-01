/**
 * GET /api/payments/today
 * Daily payment summary — total received today + recent receipts.
 * Used by web + mobile dashboards and the Accounts daily summary.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { paymentsToday } from "@/lib/payments";

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const summary = await paymentsToday();
  return NextResponse.json(summary);
}
