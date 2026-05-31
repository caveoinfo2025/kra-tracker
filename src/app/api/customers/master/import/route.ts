/**
 * POST /api/customers/master/import
 * Pull unique customer names from CRM sources (leads, collections, sales_funnel,
 * lead_generation) and create Customer rows for any not already present.
 * Returns { created, skipped, total }
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { importCustomersFromCrm } from "@/lib/customer-import";

export async function POST() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isManager) return NextResponse.json({ error: "Managers only" }, { status: 403 });

  const result = await importCustomersFromCrm();
  return NextResponse.json(result);
}
