/**
 * Seed: Finance Administration defaults (Phase 9)
 * Usage: npx tsx prisma/seed-finance-admin.ts
 *
 * Run AFTER migration 20260605050000_finance_admin_engine is applied.
 * Safe to re-run — uses findFirst + create pattern (skip if exists).
 */
import {
  createExpenseCategory,
  createConveyancePolicy,
  createAdvancePolicy,
  createCreditPolicy,
  createVoucherConfig,
  createCollectionPolicy,
  listExpenseCategories,
  listConveyancePolicies,
  listAdvancePolicies,
  listCreditPolicies,
  listVoucherConfigs,
  listCollectionPolicies,
} from "../src/lib/finance-engine";

async function main() {
  console.log("Seeding Finance Administration defaults...\n");

  // ─── 1. Expense Categories ────────────────────────────────────────────────
  const existingCats = await listExpenseCategories();
  const existingCodes = new Set(existingCats.map((c) => c.code));

  const categories = [
    { code: "TRAVEL",        name: "Travel",            requiresReceipt: true,  requiresApproval: true,  description: "Air, rail, bus, cab fares for business travel" },
    { code: "FOOD",          name: "Food & Meals",       requiresReceipt: false, requiresApproval: false, description: "Meals and refreshments during business" },
    { code: "HOTEL",         name: "Hotel / Lodging",    requiresReceipt: true,  requiresApproval: true,  description: "Overnight accommodation costs" },
    { code: "INTERNET",      name: "Internet & Mobile",  requiresReceipt: true,  requiresApproval: false, description: "Data cards, broadband, mobile recharge" },
    { code: "CERTIFICATION", name: "Certification",      requiresReceipt: true,  requiresApproval: true,  description: "Vendor certifications and training fees" },
  ];

  for (const cat of categories) {
    if (!existingCodes.has(cat.code)) {
      await createExpenseCategory(cat);
      console.log(`  Created expense category: ${cat.name} (${cat.code})`);
    } else {
      console.log(`  SKIP (exists): expense category ${cat.name}`);
    }
  }

  // ─── 2. Conveyance Policies ───────────────────────────────────────────────
  const existingConveyance = await listConveyancePolicies();
  const existingVehicles = new Set(existingConveyance.map((c) => c.vehicleType));

  const conveyance = [
    { vehicleType: "Bike",        ratePerKm: 3.5, monthlyLimitRupees: 3000, googleMapRequired: false, allowManualOverride: true, overrideApprovalRequired: false },
    { vehicleType: "Car",         ratePerKm: 8.0, monthlyLimitRupees: 8000, googleMapRequired: true,  allowManualOverride: true, overrideApprovalRequired: true  },
    { vehicleType: "Two-Wheeler", ratePerKm: 3.5, monthlyLimitRupees: 3000, googleMapRequired: false, allowManualOverride: true, overrideApprovalRequired: false },
  ];

  for (const cp of conveyance) {
    if (!existingVehicles.has(cp.vehicleType)) {
      await createConveyancePolicy(cp);
      console.log(`  Created conveyance policy: ${cp.vehicleType} @ ₹${cp.ratePerKm}/km`);
    } else {
      console.log(`  SKIP (exists): conveyance ${cp.vehicleType}`);
    }
  }

  // ─── 3. Advance Policy ────────────────────────────────────────────────────
  const existingAdvance = await listAdvancePolicies();
  if (existingAdvance.length === 0) {
    await createAdvancePolicy({ maxAdvanceLakhs: 1.0, settlementDays: 30, approvalRequired: true, policyCode: "ADV-DEFAULT" });
    console.log("  Created default advance policy: Max ₹1L, 30-day settlement");
  } else {
    console.log("  SKIP (exists): advance policy");
  }

  // ─── 4. Customer Credit Policies ─────────────────────────────────────────
  const existingCredit = await listCreditPolicies();
  const existingTypes = new Set(existingCredit.map((c) => c.customerType));

  const creditPolicies = [
    { customerType: "STANDARD",   defaultCreditLimitLakhs: 5,   maxCreditLimitLakhs: 20,  approvalAboveLimit: true, paymentTermsDays: 30 },
    { customerType: "PREMIUM",    defaultCreditLimitLakhs: 20,  maxCreditLimitLakhs: 50,  approvalAboveLimit: true, paymentTermsDays: 45 },
    { customerType: "GOVERNMENT", defaultCreditLimitLakhs: 50,  maxCreditLimitLakhs: 200, approvalAboveLimit: true, paymentTermsDays: 90 },
  ];

  for (const cp of creditPolicies) {
    if (!existingTypes.has(cp.customerType)) {
      await createCreditPolicy(cp);
      console.log(`  Created credit policy: ${cp.customerType} — Default ₹${cp.defaultCreditLimitLakhs}L / Max ₹${cp.maxCreditLimitLakhs}L`);
    } else {
      console.log(`  SKIP (exists): credit policy ${cp.customerType}`);
    }
  }

  // ─── 5. Voucher Configurations ────────────────────────────────────────────
  const existingVouchers = await listVoucherConfigs();
  const existingVoucherTypes = new Set(existingVouchers.map((v) => v.voucherType));

  const vouchers = [
    { voucherType: "EXPENSE", prefix: "EXP", numberFormat: "PREFIX-YEAR-SEQ", financialYearReset: true, financialYear: "26-27" },
    { voucherType: "PAYMENT", prefix: "PAY", numberFormat: "PREFIX-YEAR-SEQ", financialYearReset: true, financialYear: "26-27" },
    { voucherType: "RECEIPT", prefix: "REC", numberFormat: "PREFIX-YEAR-SEQ", financialYearReset: true, financialYear: "26-27" },
  ];

  for (const vc of vouchers) {
    if (!existingVoucherTypes.has(vc.voucherType)) {
      await createVoucherConfig(vc);
      console.log(`  Created voucher config: ${vc.voucherType} → ${vc.prefix}/26-27/00001`);
    } else {
      console.log(`  SKIP (exists): voucher ${vc.voucherType}`);
    }
  }

  // ─── 6. Collection Policy ────────────────────────────────────────────────
  const existingCollection = await listCollectionPolicies();
  if (existingCollection.length === 0) {
    await createCollectionPolicy({ reminderDays: 7, escalationDays: 14, creditHoldDays: 30, policyCode: "COL-DEFAULT" });
    console.log("  Created default collection policy: 7d reminder / 14d escalation / 30d hold");
  } else {
    console.log("  SKIP (exists): collection policy");
  }

  console.log("\nFinance Administration seed complete.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
