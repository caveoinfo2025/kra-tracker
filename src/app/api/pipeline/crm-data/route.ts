/**
 * GET /api/pipeline/crm-data?type=categories|oems|products|customers&q=query&oemId=x
 * Proxies to the external CRM or returns mock data.
 */
import { NextResponse } from "next/server";
import { getCrmCategories, getCrmOems, getCrmProducts, getCrmCustomers } from "@/lib/crm-service";
import { getSession } from "@/lib/dev-session";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type  = searchParams.get("type") ?? "";
  const q     = searchParams.get("q")    ?? "";
  const oemId = searchParams.get("oemId") ?? undefined;

  switch (type) {
    case "categories": return NextResponse.json(await getCrmCategories(q));
    case "oems":       return NextResponse.json(await getCrmOems(q));
    case "products":   return NextResponse.json(await getCrmProducts(q, oemId));
    case "customers":  return NextResponse.json(await getCrmCustomers(q));
    default:           return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
}
