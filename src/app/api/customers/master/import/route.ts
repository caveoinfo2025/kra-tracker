/**
 * POST /api/customers/master/import
 * Pull unique customer names from CRM sources (leads, collections, sales_funnel)
 * and create Customer rows for any that don't already exist (case-insensitive match).
 * Returns { created, skipped, total }
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

function normalise(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function POST() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isManager) return NextResponse.json({ error: "Managers only" }, { status: 403 });

  // 1. Collect all unique names from CRM with their source label
  const [leads, collections, funnel, legacyLeads] = await Promise.all([
    prisma.crmLead.findMany({ select: { companyName: true }, distinct: ["companyName"] }),
    prisma.collection.findMany({ select: { customerName: true }, distinct: ["customerName"] }),
    prisma.salesFunnel.findMany({ select: { customerName: true }, distinct: ["customerName"] }),
    prisma.leadGeneration.findMany({ select: { customerName: true }, distinct: ["customerName"] }),
  ]);

  const sourceMap = new Map<string, string>(); // normalised → original + source
  const addSource = (name: string, src: string) => {
    const key = normalise(name);
    if (key && !sourceMap.has(key)) sourceMap.set(key, `${name}|||${src}`);
  };

  leads.forEach(r       => addSource(r.companyName,  "leads"));
  collections.forEach(r => addSource(r.customerName, "collections"));
  funnel.forEach(r      => addSource(r.customerName, "sales_funnel"));
  legacyLeads.forEach(r => addSource(r.customerName, "lead_generation"));

  // 2. Existing customers in master table (normalised)
  const existing = await prisma.customer.findMany({ select: { name: true } });
  const existingSet = new Set(existing.map(c => normalise(c.name)));

  // 3. Insert missing ones
  let created = 0;
  const toCreate = [...sourceMap.entries()]
    .filter(([key]) => !existingSet.has(key))
    .map(([, val]) => {
      const [name, crmSource] = val.split("|||");
      return { name: name.trim(), crmSource, officeType: "HO" };
    });

  if (toCreate.length > 0) {
    const result = await prisma.customer.createMany({ data: toCreate });
    created = result.count;
  }

  const skipped = sourceMap.size - created;
  return NextResponse.json({ created, skipped, total: sourceMap.size });
}
