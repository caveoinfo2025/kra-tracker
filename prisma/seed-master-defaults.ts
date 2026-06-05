/**
 * Seed: Enterprise Master Data Defaults
 *
 * Creates 8 MasterCategories, their definitions and ~40 values,
 * plus global CustomerPolicy and VendorPolicy.
 *
 * Idempotent — upserts on unique code keys.
 *
 * Run: npx tsx prisma/seed-master-defaults.ts
 */

import prismaDefault from "../src/lib/prisma";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaDefault as any;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function seedCategory(name: string, code: string, description: string) {
  return db.masterCategory.upsert({
    where:  { code },
    create: { name, code, description, status: "ACTIVE" },
    update: { name, description },
  });
}

async function seedDefinition(
  categoryId: number,
  name:       string,
  code:       string,
  description: string,
  opts?: { allowCompanyOverride?: boolean; allowBranchOverride?: boolean },
) {
  return db.masterDefinition.upsert({
    where:  { code },
    create: {
      categoryId, name, code, description, status: "ACTIVE",
      allowCompanyOverride: opts?.allowCompanyOverride ?? true,
      allowBranchOverride:  opts?.allowBranchOverride  ?? false,
      requiresApproval:     false,
    },
    update: { name, description },
  });
}

async function seedValues(
  definitionId: number,
  values: Array<{ value: string; code: string; sort?: number }>,
) {
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    await db.masterValue.upsert({
      where:  { masterDefinitionId_code: { masterDefinitionId: definitionId, code: v.code } },
      create: { masterDefinitionId: definitionId, value: v.value, code: v.code, description: "", sortOrder: v.sort ?? i, status: "ACTIVE" },
      update: { value: v.value, sortOrder: v.sort ?? i },
    });
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding master data defaults…");

  // 1. Payment Terms
  const catPayment = await seedCategory("Payment Terms", "PAYMENT_TERMS", "Invoice payment term configurations");
  const defPayment = await seedDefinition(catPayment.id, "Payment Terms", "PAYMENT_TERMS_LIST", "Standard payment term options", { allowBranchOverride: true });
  await seedValues(defPayment.id, [
    { value: "Immediate",     code: "IMMEDIATE", sort: 1 },
    { value: "Net 7 Days",    code: "NET_7",     sort: 2 },
    { value: "Net 15 Days",   code: "NET_15",    sort: 3 },
    { value: "Net 30 Days",   code: "NET_30",    sort: 4 },
    { value: "Net 45 Days",   code: "NET_45",    sort: 5 },
    { value: "Net 60 Days",   code: "NET_60",    sort: 6 },
    { value: "Net 90 Days",   code: "NET_90",    sort: 7 },
    { value: "Advance 100%",  code: "ADV_100",   sort: 8 },
    { value: "Advance 50%",   code: "ADV_50",    sort: 9 },
  ]);

  // 2. Lead Sources
  const catLead = await seedCategory("Lead Sources", "LEAD_SOURCES", "CRM lead origin categories");
  const defLead = await seedDefinition(catLead.id, "Lead Sources", "LEAD_SOURCE_LIST", "How a lead was acquired");
  await seedValues(defLead.id, [
    { value: "Direct",             code: "DIRECT",    sort: 1 },
    { value: "Referral",           code: "REFERRAL",  sort: 2 },
    { value: "LinkedIn",           code: "LINKEDIN",  sort: 3 },
    { value: "Website",            code: "WEBSITE",   sort: 4 },
    { value: "Cold Call",          code: "COLD_CALL", sort: 5 },
    { value: "Exhibition / Event", code: "EVENT",     sort: 6 },
    { value: "Partner",            code: "PARTNER",   sort: 7 },
    { value: "Other",              code: "OTHER",     sort: 99 },
  ]);

  // 3. Industry Sectors
  const catIndustry = await seedCategory("Industry Sectors", "INDUSTRY_SECTORS", "Customer and prospect industry classification");
  const defIndustry = await seedDefinition(catIndustry.id, "Industry Sectors", "INDUSTRY_SECTOR_LIST", "Business industry segments");
  await seedValues(defIndustry.id, [
    { value: "IT / Technology",       code: "IT_TECH",       sort: 1 },
    { value: "Banking & Finance",      code: "BFSI",          sort: 2 },
    { value: "Healthcare",             code: "HEALTHCARE",    sort: 3 },
    { value: "Manufacturing",          code: "MANUFACTURING", sort: 4 },
    { value: "Education",              code: "EDUCATION",     sort: 5 },
    { value: "Government / PSU",       code: "GOVT",          sort: 6 },
    { value: "Retail / E-Commerce",    code: "RETAIL",        sort: 7 },
    { value: "Telecom",                code: "TELECOM",       sort: 8 },
    { value: "Media & Entertainment",  code: "MEDIA",         sort: 9 },
    { value: "Other",                  code: "OTHER",         sort: 99 },
  ]);

  // 4. Expense Categories
  const catExpense = await seedCategory("Expense Categories", "EXPENSE_CATEGORIES", "Employee and operational expense types");
  const defExpense = await seedDefinition(catExpense.id, "Expense Categories", "EXPENSE_CATEGORY_LIST", "Standard expense classification", { allowBranchOverride: true });
  await seedValues(defExpense.id, [
    { value: "Travel",                   code: "TRAVEL",        sort: 1 },
    { value: "Accommodation",            code: "ACCOM",         sort: 2 },
    { value: "Meals & Entertainment",    code: "MEALS",         sort: 3 },
    { value: "Office Supplies",          code: "OFFICE",        sort: 4 },
    { value: "Communication",            code: "COMM",          sort: 5 },
    { value: "Marketing & Advertising",  code: "MARKETING",     sort: 6 },
    { value: "Software & Subscriptions", code: "SOFTWARE",      sort: 7 },
    { value: "Professional Services",    code: "PROF_SERVICES", sort: 8 },
    { value: "Miscellaneous",            code: "MISC",          sort: 99 },
  ]);

  // 5. Deal Stages
  const catDeal = await seedCategory("Deal Stages", "DEAL_STAGES", "CRM opportunity pipeline stages");
  const defDeal = await seedDefinition(catDeal.id, "Deal Stages", "DEAL_STAGE_LIST", "Sales pipeline stages", { allowCompanyOverride: false });
  await seedValues(defDeal.id, [
    { value: "Prospecting",    code: "PROSPECTING",   sort: 1 },
    { value: "Qualification",  code: "QUALIFICATION", sort: 2 },
    { value: "Needs Analysis", code: "NEEDS_ANALYSIS",sort: 3 },
    { value: "Proposal Sent",  code: "PROPOSAL",      sort: 4 },
    { value: "Negotiation",    code: "NEGOTIATION",   sort: 5 },
    { value: "Closed Won",     code: "CLOSED_WON",    sort: 6 },
    { value: "Closed Lost",    code: "CLOSED_LOST",   sort: 7 },
    { value: "On Hold",        code: "ON_HOLD",       sort: 8 },
  ]);

  // 6. Customer Types
  const catCust = await seedCategory("Customer Types", "CUSTOMER_TYPES", "Customer classification and segmentation");
  const defCust = await seedDefinition(catCust.id, "Customer Types", "CUSTOMER_TYPE_LIST", "Customer segment classifications");
  await seedValues(defCust.id, [
    { value: "End Customer",       code: "END_CUSTOMER", sort: 1 },
    { value: "Reseller / Partner", code: "RESELLER",     sort: 2 },
    { value: "System Integrator",  code: "SI",           sort: 3 },
    { value: "Government",         code: "GOVT",         sort: 4 },
    { value: "SME",                code: "SME",          sort: 5 },
    { value: "Enterprise",         code: "ENTERPRISE",   sort: 6 },
  ]);

  // 7. Priority Levels
  const catPriority = await seedCategory("Priority Levels", "PRIORITY_LEVELS", "Shared priority classification");
  const defPriority = await seedDefinition(catPriority.id, "Priority Levels", "PRIORITY_LEVEL_LIST", "Ticket, task and deal priority tiers");
  await seedValues(defPriority.id, [
    { value: "Critical", code: "CRITICAL", sort: 1 },
    { value: "High",     code: "HIGH",     sort: 2 },
    { value: "Medium",   code: "MEDIUM",   sort: 3 },
    { value: "Low",      code: "LOW",      sort: 4 },
  ]);

  // 8. Document Types
  const catDoc = await seedCategory("Document Types", "DOCUMENT_TYPES", "Supported document classifications for uploads");
  const defDoc = await seedDefinition(catDoc.id, "Document Types", "DOCUMENT_TYPE_LIST", "Standard document type codes");
  await seedValues(defDoc.id, [
    { value: "GST Certificate",      code: "GST_CERT", sort: 1 },
    { value: "PAN Card",             code: "PAN",      sort: 2 },
    { value: "Cancelled Cheque",     code: "CHEQUE",   sort: 3 },
    { value: "MSME Certificate",     code: "MSME",     sort: 4 },
    { value: "Purchase Order",       code: "PO",       sort: 5 },
    { value: "Work Order",           code: "WO",       sort: 6 },
    { value: "Agreement / Contract", code: "CONTRACT", sort: 7 },
    { value: "Invoice",              code: "INVOICE",  sort: 8 },
    { value: "Other",                code: "OTHER",    sort: 99 },
  ]);

  // ── Global policies ───────────────────────────────────────────────────────
  await db.customerPolicy.create({
    data: { companyId: null, customerType: "ALL", gstRequired: true, panRequired: false, duplicateThreshold: 80, creditApprovalRequired: false, status: "ACTIVE" },
  }).catch(() => null); // skip if already exists

  await db.vendorPolicy.create({
    data: { companyId: null, gstRequired: true, panRequired: false, bankVerificationRequired: false, approvalRequired: true, status: "ACTIVE" },
  }).catch(() => null);

  console.log("Master data defaults seeded successfully.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error("Seed failed:", e); process.exit(1); });
