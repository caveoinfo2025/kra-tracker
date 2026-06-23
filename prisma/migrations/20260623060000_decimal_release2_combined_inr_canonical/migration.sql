-- Step 3U Release 2 (2026-06-23): Decimal + Lakhs-to-INR migration for Payment, Collection,
-- OrderAdvance, CrmLead, CrmOpportunity, and SalesFunnel — plus a row-filtered (no column-type
-- change) value transform for the AMOUNT-typed KRATemplateItem rows. Voucher, Ledger, FinAccount,
-- Expense, EmployeeAdvance, TravelClaim (Release 1 fields), Notification, KRA.target,
-- EmployeeTarget.targetJson, and every non-AMOUNT KRATemplateItem row are explicitly NOT touched
-- by this migration (KRA.target/targetJson are free-text and are transformed by a separate guarded
-- Node script, not SQL — see prisma/transform-kra-target-money.mjs, deleted after use).
--
-- Value transformation runs BEFORE the column type change, while the columns are still
-- DOUBLE/Float — this multiplies each genuine ₹-Lakhs value by 100,000 to store the actual ₹ INR
-- amount, mirroring the exact two-phase pattern used by
-- prisma/migrations/20260622120000_decimal_release1_lakhs_to_inr/migration.sql.

-- Payment
UPDATE `Payment` SET `amountLakhs` = `amountLakhs` * 100000;

-- Collection
UPDATE `Collection` SET `invoiceValueLakhs` = `invoiceValueLakhs` * 100000;
UPDATE `Collection` SET `amountWithoutGstLakhs` = `amountWithoutGstLakhs` * 100000;
UPDATE `Collection` SET `amountReceivedLakhs` = `amountReceivedLakhs` * 100000;

-- OrderAdvance (0 rows in dev as of this migration — UPDATE is a no-op, included for consistency
-- and to remove the future applyAdvance()/Payment lockstep-unit-mismatch risk)
UPDATE `OrderAdvance` SET `amountLakhs` = `amountLakhs` * 100000;

-- CrmLead
UPDATE `CrmLead` SET `expectedValue` = `expectedValue` * 100000;

-- CrmOpportunity
UPDATE `CrmOpportunity` SET `value` = `value` * 100000;
UPDATE `CrmOpportunity` SET `dealValueExTax` = `dealValueExTax` * 100000;
UPDATE `CrmOpportunity` SET `netProfitLakhs` = `netProfitLakhs` * 100000;

-- SalesFunnel
UPDATE `SalesFunnel` SET `dealValueLakhs` = `dealValueLakhs` * 100000;
UPDATE `SalesFunnel` SET `billingValueLakhs` = `billingValueLakhs` * 100000;

-- KRATemplateItem: row-filtered transform ONLY for rows whose linked KRAMetric.metricType =
-- 'AMOUNT' (confirmed 3 rows: #1 BOOKING, #2 BILLING, #16 TEAM_PIPELINE_COVERAGE). Column type is
-- NOT changed — kra_template_item.expectedTarget/stretchTarget/minimumTarget remain Float because
-- they are shared with PERCENTAGE/COUNT metric rows, which must not be multiplied.
UPDATE `kra_template_item` kti
  JOIN `kra_metric` km ON kti.`metricId` = km.`id`
  SET kti.`expectedTarget` = kti.`expectedTarget` * 100000,
      kti.`stretchTarget` = kti.`stretchTarget` * 100000,
      kti.`minimumTarget` = kti.`minimumTarget` * 100000
  WHERE km.`metricType` = 'AMOUNT';

-- AlterTable: column type changes, applied AFTER the value transformation above.
ALTER TABLE `Payment` MODIFY `amountLakhs` DECIMAL(18, 2) NOT NULL;

-- AlterTable
ALTER TABLE `Collection` MODIFY `invoiceValueLakhs` DECIMAL(18, 2) NOT NULL,
    MODIFY `amountWithoutGstLakhs` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    MODIFY `amountReceivedLakhs` DECIMAL(18, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `OrderAdvance` MODIFY `amountLakhs` DECIMAL(18, 2) NOT NULL;

-- AlterTable
ALTER TABLE `CrmLead` MODIFY `expectedValue` DECIMAL(18, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `CrmOpportunity` MODIFY `value` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    MODIFY `dealValueExTax` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    MODIFY `netProfitLakhs` DECIMAL(18, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `SalesFunnel` MODIFY `dealValueLakhs` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    MODIFY `billingValueLakhs` DECIMAL(18, 2) NOT NULL DEFAULT 0;
