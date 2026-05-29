/**
 * GET /api/customers/suggestions?q=<search>
 *
 * Returns up to 10 distinct customer/company names matching the query,
 * aggregated from every module that stores a customerName:
 *   - CrmLead (companyName + customerName)
 *   - SalesFunnel
 *   - Collection
 *   - LeadGeneration
 *
 * Used by the CustomerNameCombobox component for autocomplete.
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json({ suggestions: [] });

  // SQLite LIKE is case-insensitive for ASCII by default — no mode needed
  const contains = { contains: q };

  // Run all queries in parallel
  const [crmLeadCompany, crmLeadCustomer, salesFunnel, collections, leadGen] =
    await Promise.all([
      prisma.crmLead.findMany({
        where: { companyName: contains },
        select: { companyName: true },
        distinct: ["companyName"],
        take: 10,
      }),
      prisma.crmLead.findMany({
        where: { customerName: { ...contains, not: "" } },
        select: { customerName: true },
        distinct: ["customerName"],
        take: 10,
      }),
      prisma.salesFunnel.findMany({
        where: { customerName: contains },
        select: { customerName: true },
        distinct: ["customerName"],
        take: 10,
      }),
      prisma.collection.findMany({
        where: { customerName: contains },
        select: { customerName: true },
        distinct: ["customerName"],
        take: 10,
      }),
      prisma.leadGeneration.findMany({
        where: { customerName: contains },
        select: { customerName: true },
        distinct: ["customerName"],
        take: 10,
      }),
    ]);

  // Merge, deduplicate, sort, limit to 10
  const raw = [
    ...crmLeadCompany.map((r) => r.companyName),
    ...crmLeadCustomer.map((r) => r.customerName),
    ...salesFunnel.map((r) => r.customerName),
    ...collections.map((r) => r.customerName),
    ...leadGen.map((r) => r.customerName),
  ];

  const suggestions = [...new Set(raw.map((s) => s.trim()).filter(Boolean))]
    .sort((a, b) => {
      // Exact prefix match ranks first
      const aStarts = a.toLowerCase().startsWith(q.toLowerCase());
      const bStarts = b.toLowerCase().startsWith(q.toLowerCase());
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.localeCompare(b);
    })
    .slice(0, 10);

  return NextResponse.json({ suggestions });
}
