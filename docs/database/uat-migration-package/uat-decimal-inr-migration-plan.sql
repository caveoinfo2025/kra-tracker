-- ============================================================================
-- UAT-SPECIFIC DECIMAL / INR MIGRATION PLAN (Step 4E, 2026-06-24)
-- ============================================================================
--
-- THIS FILE IS A PLAN, NOT YET EXECUTED. It has not been run against UAT or
-- any other database as of Step 4E. It is generated for review only — see
-- UAT_MIGRATION_README.md and uat-migration-dry-run-checklist.md in this
-- same folder before ever running it.
--
-- THIS FILE TARGETS UAT ONLY (u686730471_Caveo_UAT). Do not run it against
-- production or dev. Do not run it via `prisma migrate deploy`, `prisma db
-- push`, or `prisma migrate resolve` — those commands are NOT used to apply
-- this SQL; see the optional `scripts/apply-uat-decimal-inr-migration.mjs`
-- pattern (guarded, not run in this step) for how dev applied the
-- equivalent SQL on its own database, and that pattern stops short of
-- actually invoking those commands too — `migrate resolve --applied <name>`
-- is a separate, later step run manually per migration name, never part of
-- this script.
--
-- This file consolidates 3 logically separate dev migrations into one
-- UAT-specific execution package, WITH UAT-specific adjustments to the
-- value-transform step (NOT a blind re-run of dev's SQL):
--   1. 20260621120000_add_soft_delete_fields_phase_a   (Section 1 below)
--   2. 20260622120000_decimal_release1_lakhs_to_inr     (Section 2 below)
--   3. 20260623060000_decimal_release2_combined_inr_canonical (Sections 3-6)
--
-- UAT-SPECIFIC DIFFERENCES FROM DEV'S ORIGINAL SQL (per
-- docs/database/UAT_DECIMAL_INR_MIGRATION_ADJUSTMENT_PLAN.md, Step 4D,
-- business-sign-off-confirmed 2026-06-24):
--   * Payment.amountLakhs, Collection.invoiceValueLakhs/amountWithoutGstLakhs/
--     amountReceivedLakhs, OrderAdvance.amountLakhs: TYPE CONVERSION ONLY.
--     Dev's SQL multiplies these by 100,000 — THIS FILE DOES NOT, because UAT
--     evidence (business-confirmed) shows these are already actual ₹ INR.
--   * CrmLead.expectedValue, CrmOpportunity.value/dealValueExTax/
--     netProfitLakhs, SalesFunnel.dealValueLakhs/billingValueLakhs: multiply
--     by 100,000, same as dev (confirmed Lakhs-scale on UAT via full-row
--     review).
--   * KRA.target free-text money labels: this file does NOT attempt the
--     transform inline as SQL (see Section 5's note) — it is handled by a
--     separate guarded Node script, `scripts/uat-transform-kra-target.mjs`
--     in this same package, mirroring dev's own pattern (dev used
--     prisma/transform-kra-target-money.mjs, a Node script, for the exact
--     same reason: reliably parsing/rewriting "label: value; label: value"
--     free text and multiplying only specific labels is not safely
--     expressible as a single SQL statement).
--   * kra_template_item, kra_metric, kra_template, employee_target,
--     team_target: confirmed 0 rows on UAT — no SQL needed, explicitly
--     no-op (Section 6).
--
-- THIS FILE DOES NOT CONTAIN: DROP TABLE, DROP COLUMN, TRUNCATE, DELETE, any
-- production database reference, any `db push` instruction, or any
-- Voucher/Ledger/FinAccount migration. Confirmed by the Step 4E SQL safety
-- review (see docs/database/UAT_DECIMAL_INR_MIGRATION_ADJUSTMENT_PLAN.md
-- "Step 4E — UAT Migration SQL Generation").
-- ============================================================================


-- ============================================================================
-- SECTION 1 — Soft Delete Phase A
-- (mirrors prisma/migrations/20260621120000_add_soft_delete_fields_phase_a/
-- migration.sql exactly, but made idempotent for UAT using
-- `IF NOT EXISTS`/`IF EXISTS` — MariaDB 11.8 supports both for ADD COLUMN
-- and CREATE INDEX. Additive only: nullable columns, no NOT NULL, no data
-- change, no drops.)
-- ============================================================================

ALTER TABLE `Collection`
    ADD COLUMN IF NOT EXISTS `deleteReason` TEXT NULL,
    ADD COLUMN IF NOT EXISTS `deletedAt` DATETIME(3) NULL,
    ADD COLUMN IF NOT EXISTS `deletedById` INTEGER NULL;

ALTER TABLE `Customer`
    ADD COLUMN IF NOT EXISTS `deleteReason` TEXT NULL,
    ADD COLUMN IF NOT EXISTS `deletedAt` DATETIME(3) NULL,
    ADD COLUMN IF NOT EXISTS `deletedById` INTEGER NULL;

ALTER TABLE `EmployeeAdvance`
    ADD COLUMN IF NOT EXISTS `deleteReason` TEXT NULL,
    ADD COLUMN IF NOT EXISTS `deletedAt` DATETIME(3) NULL,
    ADD COLUMN IF NOT EXISTS `deletedById` INTEGER NULL;

ALTER TABLE `Expense`
    ADD COLUMN IF NOT EXISTS `deleteReason` TEXT NULL,
    ADD COLUMN IF NOT EXISTS `deletedAt` DATETIME(3) NULL,
    ADD COLUMN IF NOT EXISTS `deletedById` INTEGER NULL;

ALTER TABLE `Payment`
    ADD COLUMN IF NOT EXISTS `deleteReason` TEXT NULL,
    ADD COLUMN IF NOT EXISTS `deletedAt` DATETIME(3) NULL,
    ADD COLUMN IF NOT EXISTS `deletedById` INTEGER NULL;

ALTER TABLE `TravelClaim`
    ADD COLUMN IF NOT EXISTS `deleteReason` TEXT NULL,
    ADD COLUMN IF NOT EXISTS `deletedAt` DATETIME(3) NULL,
    ADD COLUMN IF NOT EXISTS `deletedById` INTEGER NULL;

ALTER TABLE `Vendor`
    ADD COLUMN IF NOT EXISTS `deleteReason` TEXT NULL,
    ADD COLUMN IF NOT EXISTS `deletedAt` DATETIME(3) NULL,
    ADD COLUMN IF NOT EXISTS `deletedById` INTEGER NULL;

CREATE INDEX IF NOT EXISTS `Collection_deletedAt_idx` ON `Collection`(`deletedAt`);
CREATE INDEX IF NOT EXISTS `Customer_deletedAt_idx` ON `Customer`(`deletedAt`);
CREATE INDEX IF NOT EXISTS `EmployeeAdvance_deletedAt_idx` ON `EmployeeAdvance`(`deletedAt`);
CREATE INDEX IF NOT EXISTS `Expense_deletedAt_idx` ON `Expense`(`deletedAt`);
CREATE INDEX IF NOT EXISTS `Payment_deletedAt_idx` ON `Payment`(`deletedAt`);
CREATE INDEX IF NOT EXISTS `TravelClaim_deletedAt_idx` ON `TravelClaim`(`deletedAt`);
CREATE INDEX IF NOT EXISTS `Vendor_deletedAt_idx` ON `Vendor`(`deletedAt`);


-- ============================================================================
-- SECTION 2 — Release 1: Decimal type conversion (Expense, EmployeeAdvance,
-- TravelClaim)
-- ============================================================================
-- UAT has 0 rows in all 3 tables (confirmed Step 4B/4D) — the UPDATE
-- statements below are therefore a guaranteed no-op on UAT today. They are
-- included anyway, identical to dev's original SQL, so that IF any rows are
-- inserted into these tables on UAT between now and when this script runs,
-- they are still correctly converted (consistent with the decision recorded
-- in docs/database/UAT_DECIMAL_INR_MIGRATION_ADJUSTMENT_PLAN.md §3 — these
-- 3 tables' fields follow the same Lakhs-to-INR convention as dev assumed).

UPDATE `Expense` SET `amountLakhs` = `amountLakhs` * 100000;
UPDATE `Expense` SET `gstAmountLakhs` = `gstAmountLakhs` * 100000;

UPDATE `EmployeeAdvance` SET `amountLakhs` = `amountLakhs` * 100000;
UPDATE `EmployeeAdvance` SET `disbursedAmountLakhs` = `disbursedAmountLakhs` * 100000 WHERE `disbursedAmountLakhs` IS NOT NULL;
UPDATE `EmployeeAdvance` SET `settledAmountLakhs` = `settledAmountLakhs` * 100000 WHERE `settledAmountLakhs` IS NOT NULL;
UPDATE `EmployeeAdvance` SET `balanceLakhs` = `balanceLakhs` * 100000;

UPDATE `TravelClaim` SET `amountLakhs` = `amountLakhs` * 100000;
-- TravelClaim.amountRupees and TravelClaim.ratePerKm are NOT multiplied —
-- they already store actual INR / actual ₹-per-km values today (same as dev).

ALTER TABLE `EmployeeAdvance` MODIFY `amountLakhs` DECIMAL(18, 2) NOT NULL,
    MODIFY `disbursedAmountLakhs` DECIMAL(18, 2) NULL,
    MODIFY `settledAmountLakhs` DECIMAL(18, 2) NULL,
    MODIFY `balanceLakhs` DECIMAL(18, 2) NOT NULL DEFAULT 0;

ALTER TABLE `Expense` MODIFY `amountLakhs` DECIMAL(18, 2) NOT NULL,
    MODIFY `gstAmountLakhs` DECIMAL(18, 2) NOT NULL DEFAULT 0;

ALTER TABLE `TravelClaim` MODIFY `ratePerKm` DECIMAL(10, 4) NOT NULL DEFAULT 0,
    MODIFY `amountRupees` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    MODIFY `amountLakhs` DECIMAL(18, 2) NOT NULL DEFAULT 0;


-- ============================================================================
-- SECTION 3 — Release 2: Payment / Collection / OrderAdvance
-- TYPE CONVERSION ONLY — NO MULTIPLICATION
-- ============================================================================
-- *** THIS SECTION IS THE PRIMARY UAT-SPECIFIC DEVIATION FROM DEV'S SQL. ***
-- Dev's migration.sql multiplies these 4 fields by 100,000 before the type
-- change. On UAT, business sign-off (2026-06-24, recorded in
-- docs/database/UAT_DECIMAL_INR_MIGRATION_ADJUSTMENT_PLAN.md §5) confirmed
-- these fields are ALREADY stored in actual ₹ INR — there is intentionally
-- NO `UPDATE ... SET ... = ... * 100000` statement in this section. Adding
-- one here would silently corrupt every Payment/Collection/OrderAdvance row
-- on UAT by inflating already-correct values 100,000×.

ALTER TABLE `Payment` MODIFY `amountLakhs` DECIMAL(18, 2) NOT NULL;

ALTER TABLE `Collection` MODIFY `invoiceValueLakhs` DECIMAL(18, 2) NOT NULL,
    MODIFY `amountWithoutGstLakhs` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    MODIFY `amountReceivedLakhs` DECIMAL(18, 2) NOT NULL DEFAULT 0;

ALTER TABLE `OrderAdvance` MODIFY `amountLakhs` DECIMAL(18, 2) NOT NULL;


-- ============================================================================
-- SECTION 4 — Release 2: CrmLead / CrmOpportunity / SalesFunnel
-- Multiply by 100,000 (confirmed Lakhs-scale on UAT via full-row review,
-- Step 4D) + type conversion to Decimal(18,2)
-- ============================================================================
-- CrmOpportunity note: row id 42 (value = -0.1) is multiplied by the same
-- rule as every other row (becomes -10000.00 actual ₹) for migration
-- consistency. This is a confirmed, separate data-quality finding (a likely
-- data-entry artifact on a generically-titled lead), not a unit-classification
-- issue — see docs/database/UAT_DECIMAL_INR_MIGRATION_ADJUSTMENT_PLAN.md §6.
-- It is NOT corrected by this migration; that correction (if any) is a
-- business decision for the sales team, tracked separately, outside this
-- migration's scope.

UPDATE `CrmLead` SET `expectedValue` = `expectedValue` * 100000;

UPDATE `CrmOpportunity` SET `value` = `value` * 100000;
UPDATE `CrmOpportunity` SET `dealValueExTax` = `dealValueExTax` * 100000;
UPDATE `CrmOpportunity` SET `netProfitLakhs` = `netProfitLakhs` * 100000;

UPDATE `SalesFunnel` SET `dealValueLakhs` = `dealValueLakhs` * 100000;
UPDATE `SalesFunnel` SET `billingValueLakhs` = `billingValueLakhs` * 100000;

ALTER TABLE `CrmLead` MODIFY `expectedValue` DECIMAL(18, 2) NOT NULL DEFAULT 0;

ALTER TABLE `CrmOpportunity` MODIFY `value` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    MODIFY `dealValueExTax` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    MODIFY `netProfitLakhs` DECIMAL(18, 2) NOT NULL DEFAULT 0;

ALTER TABLE `SalesFunnel` MODIFY `dealValueLakhs` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    MODIFY `billingValueLakhs` DECIMAL(18, 2) NOT NULL DEFAULT 0;


-- ============================================================================
-- SECTION 5 — KRA.target free-text money-label transform
-- NOT INCLUDED AS INLINE SQL — see scripts/uat-transform-kra-target.mjs
-- ============================================================================
-- Dev's own equivalent step explicitly used a separate guarded Node script
-- (prisma/transform-kra-target-money.mjs, deleted after use) rather than
-- inline SQL, because "label: value; label: value" free-text parsing and
-- selectively multiplying only specific labels cannot be reliably expressed
-- as a single SQL statement (MariaDB's REGEXP_REPLACE can match labels, but
-- cannot perform arithmetic on the captured numeric group within the same
-- replacement expression for multiple distinct labels in one pass).
--
-- This package follows the same pattern: `scripts/uat-transform-kra-target.mjs`
-- (in this same folder) parses each of UAT's 34 `KRA.target` rows, multiplies
-- ONLY the 6 UAT-confirmed money labels' numeric values by 100,000, and
-- leaves every other key (count/percentage/ratio/weight) completely
-- untouched, then writes the row back. It carries the same safety guards as
-- every other guarded script in this project (DB-name refusal, explicit
-- CONFIRM env var, no destructive statements) — and per this step's
-- instructions, IT IS NOT RUN HERE.
--
-- The 6-label allowlist (final, per Step 4D, identical to dev's original
-- list — no UAT-specific label changes needed):
--   total sales revenue - booking
--   total sales revenue - billing
--   total funnel / pipeline value created (₹ lakhs)
--   total team booking target achievement (₹ lakhs)
--   total team billing achievement
--   total team pipeline coverage (₹ lakhs)
--
-- `EmployeeTarget.targetJson`/`team_target.targetJson` are NOT covered by
-- this transform — both tables are confirmed 0 rows on UAT (Section 6).


-- ============================================================================
-- SECTION 6 — KRATemplateItem / EmployeeTarget / TeamTarget — explicit no-op
-- ============================================================================
-- kra_template_item, kra_metric, kra_template, employee_target, team_target
-- are all confirmed 0 rows on UAT (Step 4B, re-confirmed Step 4D). No SQL
-- statement is needed or included here — there is nothing to transform. If
-- rows are added to any of these tables on UAT before this migration runs,
-- this section must be revisited with a fresh read-only classification pass
-- before assuming the same no-op decision still applies.


-- ============================================================================
-- END OF FILE.
-- No DROP TABLE, DROP COLUMN, TRUNCATE, or DELETE statement appears anywhere
-- above this line. No production database is referenced anywhere in this
-- file. No `db push` instruction appears anywhere in this file. Voucher,
-- Ledger, and FinAccount are not referenced anywhere in this file.
-- ============================================================================
