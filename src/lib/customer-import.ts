/**
 * Shared customer-import logic.
 *
 * Pulls every unique customer name from the CRM sources (leads, collections,
 * sales funnel, lead generation) and inserts a Customer row for any that does
 * not already exist (case-insensitive match).
 *
 * Used by:
 *   - POST /api/customers/master/import  (manual "Import from CRM" button)
 *   - /customers page load               (auto-seed when the table is empty)
 */
import prisma from "@/lib/prisma";

function normalise(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function importCustomersFromCrm(): Promise<{
  created: number;
  skipped: number;
  total: number;
}> {
  // 1. Collect all unique names from CRM with their source label
  const [leads, collections, funnel, legacyLeads] = await Promise.all([
    prisma.crmLead.findMany({ select: { companyName: true }, distinct: ["companyName"] }),
    prisma.collection.findMany({ select: { customerName: true }, distinct: ["customerName"] }),
    prisma.salesFunnel.findMany({ select: { customerName: true }, distinct: ["customerName"] }),
    prisma.leadGeneration.findMany({ select: { customerName: true }, distinct: ["customerName"] }),
  ]);

  const sourceMap = new Map<string, string>(); // normalised → "original|||source"
  const addSource = (name: string, src: string) => {
    const key = normalise(name);
    if (key && !sourceMap.has(key)) sourceMap.set(key, `${name}|||${src}`);
  };

  leads.forEach((r) => addSource(r.companyName, "leads"));
  collections.forEach((r) => addSource(r.customerName, "collections"));
  funnel.forEach((r) => addSource(r.customerName, "sales_funnel"));
  legacyLeads.forEach((r) => addSource(r.customerName, "lead_generation"));

  // 2. Existing customers in master table (normalised)
  const existing = await prisma.customer.findMany({ select: { name: true } });
  const existingSet = new Set(existing.map((c) => normalise(c.name)));

  // 3. Insert missing ones
  const toCreate = [...sourceMap.entries()]
    .filter(([key]) => !existingSet.has(key))
    .map(([, val]) => {
      const [name, crmSource] = val.split("|||");
      return { name: name.trim(), crmSource, officeType: "HO" };
    });

  let created = 0;
  if (toCreate.length > 0) {
    const result = await prisma.customer.createMany({ data: toCreate });
    created = result.count;
  }

  return { created, skipped: sourceMap.size - created, total: sourceMap.size };
}
