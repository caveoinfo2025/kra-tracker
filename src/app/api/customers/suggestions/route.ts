/**
 * GET /api/customers/suggestions?q=<search>
 *
 * Returns up to 15 suggestions ranked: Customer master first (with id),
 * then historical names from CRM modules (id=null).
 *
 * Shape: { suggestions: { name: string; id: number | null }[] }
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json({ suggestions: [] });

  const contains = { contains: q };

  // 1. Customer master (canonical, with ID)
  const masterCustomers = await prisma.customer.findMany({
    where: { name: contains, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 10,
  });

  // 2. Historical names from CRM modules (deduplicated)
  const [crmLeadCompany, salesFunnel, collections, leadGen] = await Promise.all([
    prisma.crmLead.findMany({
      where: { companyName: contains },
      select: { companyName: true },
      distinct: ["companyName"],
      take: 10,
    }),
    prisma.salesFunnel.findMany({
      where: { customerName: contains },
      select: { customerName: true, customerId: true },
      distinct: ["customerName"],
      take: 10,
    }),
    prisma.collection.findMany({
      where: { customerName: contains, deletedAt: null },
      select: { customerName: true, customerId: true },
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

  // Build master name set for dedup
  const masterNames = new Set(masterCustomers.map(c => c.name.toLowerCase().trim()));

  // Merge historical (exclude names already in master)
  const historicalNames = [
    ...crmLeadCompany.map(r => r.companyName),
    ...salesFunnel.map(r => r.customerName),
    ...collections.map(r => r.customerName),
    ...leadGen.map(r => r.customerName),
  ]
    .map(s => s.trim())
    .filter(s => s && !masterNames.has(s.toLowerCase()));

  const uniqueHistorical = [...new Set(historicalNames)].slice(0, 8);

  // Combine: master records first (with id), historical after (id=null)
  const suggestions: { name: string; id: number | null }[] = [
    ...masterCustomers.map(c => ({ name: c.name, id: c.id })),
    ...uniqueHistorical.map(name => ({ name, id: null })),
  ];

  // Sort by prefix match
  const ql = q.toLowerCase();
  suggestions.sort((a, b) => {
    const aPrefix = a.name.toLowerCase().startsWith(ql);
    const bPrefix = b.name.toLowerCase().startsWith(ql);
    if (aPrefix && !bPrefix) return -1;
    if (!aPrefix && bPrefix) return 1;
    // Master records rank above historical
    if (a.id !== null && b.id === null) return -1;
    if (a.id === null && b.id !== null) return 1;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({ suggestions: suggestions.slice(0, 15) });
}
