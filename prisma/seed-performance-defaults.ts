/**
 * Phase 10: Performance Management Engine — Default Seed
 * Seeds 7 KRA metrics + 4 templates for Caveo Infosystems sales roles.
 * Run: npx tsx prisma/seed-performance-defaults.ts
 */
import { createKRAMetric, createKRATemplate } from "../src/lib/performance-engine";

const METRICS = [
  { name: "Revenue Target", code: "REVENUE_TARGET", metricType: "REVENUE", calculationSource: "BILLING",
    description: "Total revenue generated from closed deals in the period (₹ Lakhs)" },
  { name: "Pipeline Value", code: "PIPELINE_VALUE", metricType: "REVENUE", calculationSource: "PIPELINE",
    description: "Total weighted pipeline opportunity value (₹ Lakhs)" },
  { name: "New Customer Acquisition", code: "NEW_CUSTOMER", metricType: "ACTIVITY", calculationSource: "PIPELINE",
    description: "Number of new customers won in the period" },
  { name: "Calls / Meetings", code: "ACTIVITY_CALLS", metricType: "ACTIVITY", calculationSource: "MANUAL",
    description: "Number of prospect calls and customer meetings completed" },
  { name: "Proposal Conversion Rate", code: "PROPOSAL_CONVERSION", metricType: "QUALITY", calculationSource: "PIPELINE",
    description: "Percentage of proposals converted to won deals" },
  { name: "Collection Efficiency", code: "COLLECTION_EFFICIENCY", metricType: "COMPLIANCE", calculationSource: "BILLING",
    description: "Percentage of dues collected within credit terms" },
  { name: "KRA Compliance", code: "KRA_COMPLIANCE", metricType: "COMPLIANCE", calculationSource: "MANUAL",
    description: "Weekly KRA submission and update compliance rate" },
];

const TEMPLATES = [
  {
    name: "Sales Executive — Standard",
    description: "Standard KRA template for Sales Executives focused on revenue and activity",
    items: [
      { code: "REVENUE_TARGET",      weightage: 40, expectedTarget: 50,  stretchTarget: 75 },
      { code: "NEW_CUSTOMER",        weightage: 20, expectedTarget: 3,   stretchTarget: 5 },
      { code: "ACTIVITY_CALLS",      weightage: 20, expectedTarget: 120, stretchTarget: 180 },
      { code: "PROPOSAL_CONVERSION", weightage: 10, expectedTarget: 30,  stretchTarget: 50 },
      { code: "KRA_COMPLIANCE",      weightage: 10, expectedTarget: 90,  stretchTarget: 100 },
    ],
  },
  {
    name: "Senior Sales Executive",
    description: "Template for Senior Sales Executives with higher revenue targets",
    items: [
      { code: "REVENUE_TARGET",       weightage: 45, expectedTarget: 100, stretchTarget: 150 },
      { code: "PIPELINE_VALUE",        weightage: 20, expectedTarget: 300, stretchTarget: 500 },
      { code: "NEW_CUSTOMER",          weightage: 15, expectedTarget: 5,   stretchTarget: 8 },
      { code: "COLLECTION_EFFICIENCY", weightage: 10, expectedTarget: 85,  stretchTarget: 95 },
      { code: "KRA_COMPLIANCE",        weightage: 10, expectedTarget: 90,  stretchTarget: 100 },
    ],
  },
  {
    name: "Branch Manager",
    description: "KRA template for Branch Managers covering team and revenue KPIs",
    items: [
      { code: "REVENUE_TARGET",       weightage: 35, expectedTarget: 200, stretchTarget: 300 },
      { code: "PIPELINE_VALUE",        weightage: 25, expectedTarget: 600, stretchTarget: 1000 },
      { code: "COLLECTION_EFFICIENCY", weightage: 20, expectedTarget: 90,  stretchTarget: 98 },
      { code: "NEW_CUSTOMER",          weightage: 10, expectedTarget: 10,  stretchTarget: 15 },
      { code: "KRA_COMPLIANCE",        weightage: 10, expectedTarget: 95,  stretchTarget: 100 },
    ],
  },
  {
    name: "Inside Sales / Pre-Sales",
    description: "Template for Inside Sales and Pre-Sales executives",
    items: [
      { code: "ACTIVITY_CALLS",        weightage: 35, expectedTarget: 200, stretchTarget: 300 },
      { code: "PROPOSAL_CONVERSION",   weightage: 30, expectedTarget: 25,  stretchTarget: 40 },
      { code: "PIPELINE_VALUE",        weightage: 20, expectedTarget: 200, stretchTarget: 350 },
      { code: "KRA_COMPLIANCE",        weightage: 15, expectedTarget: 90,  stretchTarget: 100 },
    ],
  },
];

async function main() {
  console.log("Seeding Phase 10: Performance Management defaults…\n");

  // 1. Create KRA Metrics
  console.log("Creating KRA Metrics…");
  const metricMap: Record<string, number> = {};
  for (const m of METRICS) {
    try {
      const created = await createKRAMetric(m);
      metricMap[m.code] = created.id;
      console.log(`  ✓ ${m.name} (${m.code})`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Unique constraint") || msg.includes("Duplicate entry")) {
        console.log(`  SKIP (exists): ${m.code}`);
      } else {
        throw e;
      }
    }
  }

  // 2. Create KRA Templates
  console.log("\nCreating KRA Templates…");
  for (const t of TEMPLATES) {
    try {
      const items = t.items.map((item, idx) => ({
        metricId: metricMap[item.code],
        weightage: item.weightage,
        targetType: "AMOUNT",
        minimumTarget: item.expectedTarget * 0.7,
        expectedTarget: item.expectedTarget,
        stretchTarget: item.stretchTarget,
        sortOrder: idx,
      }));

      // Validate we resolved all metric IDs
      const unresolved = items.filter((i) => !i.metricId);
      if (unresolved.length > 0) {
        console.log(`  SKIP ${t.name}: unresolved metric IDs`);
        continue;
      }

      await createKRATemplate({ name: t.name, description: t.description, items });
      console.log(`  ✓ ${t.name} (${items.length} KRAs)`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  SKIP ${t.name}: ${msg}`);
    }
  }

  console.log("\nDone. Phase 10 defaults seeded successfully.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
