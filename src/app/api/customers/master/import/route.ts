/**
 * POST /api/customers/master/import
 * Pull unique customer names from CRM sources (leads, collections, sales_funnel,
 * lead_generation) and create Customer rows for any not already present.
 * Returns { created, skipped, total }
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dev-session";
import { requirePermission } from "@/lib/access-control";
import { importCustomersFromCrm } from "@/lib/customer-import";

export async function POST() {
  const session = await getSession();
  const deny = await requirePermission(session, "Masters", "CustomerMaster", "IMPORT");
  if (deny) return deny;

  const result = await importCustomersFromCrm();
  return NextResponse.json(result);
}
