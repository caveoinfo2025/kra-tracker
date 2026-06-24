-- ============================================================================
-- UAT POST-MIGRATION VERIFICATION — Decimal / INR Migration (Step 4E, 2026-06-24)
-- ============================================================================
--
-- THIS FILE CONTAINS READ-ONLY STATEMENTS ONLY (SELECT/SHOW/INFORMATION_SCHEMA).
-- It cannot modify any row, table, or schema object. Run this AFTER applying
-- uat-decimal-inr-migration-plan.sql, and compare its output against
-- uat-decimal-inr-pre-migration-snapshot.sql's output. Targets UAT only.
-- ============================================================================


-- ============================================================================
-- SECTION 1 — Column types after migration (expect Decimal everywhere
-- in-scope, Float/Text unchanged for everything explicitly excluded)
-- ============================================================================

SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND (
    (TABLE_NAME = 'Expense'          AND COLUMN_NAME IN ('amountLakhs', 'gstAmountLakhs', 'deletedAt', 'deletedById', 'deleteReason')) OR
    (TABLE_NAME = 'EmployeeAdvance'  AND COLUMN_NAME IN ('amountLakhs', 'disbursedAmountLakhs', 'settledAmountLakhs', 'balanceLakhs', 'deletedAt', 'deletedById', 'deleteReason')) OR
    (TABLE_NAME = 'TravelClaim'      AND COLUMN_NAME IN ('amountLakhs', 'amountRupees', 'ratePerKm', 'deletedAt', 'deletedById', 'deleteReason')) OR
    (TABLE_NAME = 'Payment'          AND COLUMN_NAME IN ('amountLakhs', 'deletedAt', 'deletedById', 'deleteReason')) OR
    (TABLE_NAME = 'Collection'       AND COLUMN_NAME IN ('invoiceValueLakhs', 'amountWithoutGstLakhs', 'amountReceivedLakhs', 'deletedAt', 'deletedById', 'deleteReason')) OR
    (TABLE_NAME = 'OrderAdvance'     AND COLUMN_NAME IN ('amountLakhs')) OR
    (TABLE_NAME = 'CrmLead'          AND COLUMN_NAME IN ('expectedValue')) OR
    (TABLE_NAME = 'CrmOpportunity'   AND COLUMN_NAME IN ('value', 'dealValueExTax', 'netProfitLakhs')) OR
    (TABLE_NAME = 'SalesFunnel'      AND COLUMN_NAME IN ('dealValueLakhs', 'billingValueLakhs')) OR
    (TABLE_NAME = 'Customer'         AND COLUMN_NAME IN ('deletedAt', 'deletedById', 'deleteReason')) OR
    (TABLE_NAME = 'Vendor'           AND COLUMN_NAME IN ('deletedAt', 'deletedById', 'deleteReason')) OR
    (TABLE_NAME = 'kra_template_item' AND COLUMN_NAME IN ('expectedTarget', 'stretchTarget', 'minimumTarget')) OR
    (TABLE_NAME = 'KRA'              AND COLUMN_NAME IN ('target')) OR
    (TABLE_NAME = 'employee_target'  AND COLUMN_NAME IN ('targetJson')) OR
    (TABLE_NAME = 'team_target'      AND COLUMN_NAME IN ('targetJson')) OR
    -- Explicit exclusions — confirm these remain UNCHANGED (still Float), not in scope
    (TABLE_NAME = 'Voucher'          AND COLUMN_NAME IN ('amountLakhs')) OR
    (TABLE_NAME = 'Ledger'           AND COLUMN_NAME IN ('amountLakhs')) OR
    (TABLE_NAME = 'FinAccount'       AND COLUMN_NAME IN ('openingBalance', 'currentBalance'))
  )
ORDER BY TABLE_NAME, COLUMN_NAME;
-- Expect: Expense/EmployeeAdvance/TravelClaim/Payment/Collection/OrderAdvance/
-- CrmLead/CrmOpportunity/SalesFunnel money fields = decimal(18,2) (ratePerKm =
-- decimal(10,4)); deletedAt/deletedById/deleteReason now exist on Collection/
-- Customer/EmployeeAdvance/Expense/Payment/TravelClaim/Vendor; kra_template_item/
-- KRA.target/employee_target/team_target UNCHANGED (still double/text — column
-- type never changes for these); Voucher/Ledger/FinAccount UNCHANGED (still
-- double — explicitly excluded from this migration).


-- ============================================================================
-- SECTION 2 — Payment / Collection / OrderAdvance: confirm NOT multiplied
-- ============================================================================
-- Compare these totals against Section 4 of the pre-migration snapshot —
-- they MUST be numerically identical (only the column type should have
-- changed, not the value). Any difference here means the type-only decision
-- was violated and a ×100,000 multiply ran by mistake.

SELECT 'Payment.amountLakhs' AS field, SUM(amountLakhs) AS total, COUNT(*) AS row_count FROM `Payment`;
SELECT 'Collection.invoiceValueLakhs' AS field, SUM(invoiceValueLakhs) AS total, COUNT(*) AS row_count FROM `Collection`;
SELECT 'Collection.amountWithoutGstLakhs' AS field, SUM(amountWithoutGstLakhs) AS total, COUNT(*) AS row_count FROM `Collection`;
SELECT 'Collection.amountReceivedLakhs' AS field, SUM(amountReceivedLakhs) AS total, COUNT(*) AS row_count FROM `Collection`;
SELECT 'OrderAdvance.amountLakhs' AS field, SUM(amountLakhs) AS total, COUNT(*) AS row_count FROM `OrderAdvance`;


-- ============================================================================
-- SECTION 3 — CrmLead / CrmOpportunity / SalesFunnel: confirm multiplied by
-- exactly 100,000
-- ============================================================================
-- Compare these totals against Section 5 of the pre-migration snapshot —
-- each total here MUST equal the pre-migration total × 100,000 (within
-- floating-point/Decimal rounding tolerance).

SELECT 'CrmLead.expectedValue' AS field, SUM(expectedValue) AS total, COUNT(*) AS row_count FROM `CrmLead`;
SELECT 'CrmOpportunity.value' AS field, SUM(value) AS total, COUNT(*) AS row_count FROM `CrmOpportunity`;
SELECT 'CrmOpportunity.dealValueExTax' AS field, SUM(dealValueExTax) AS total, COUNT(*) AS row_count FROM `CrmOpportunity`;
SELECT 'CrmOpportunity.netProfitLakhs' AS field, SUM(netProfitLakhs) AS total, COUNT(*) AS row_count FROM `CrmOpportunity`;
SELECT 'SalesFunnel.dealValueLakhs' AS field, SUM(dealValueLakhs) AS total, COUNT(*) AS row_count FROM `SalesFunnel`;
SELECT 'SalesFunnel.billingValueLakhs' AS field, SUM(billingValueLakhs) AS total, COUNT(*) AS row_count FROM `SalesFunnel`;

-- Spot-check the previously-flagged negative CrmOpportunity row (id 42) —
-- expect value = -10000.00 (i.e. -0.1 × 100,000), confirming it was
-- transformed consistently with every other row, not silently skipped.
SELECT id, value, dealValueExTax, netProfitLakhs FROM `CrmOpportunity` WHERE id = 42;


-- ============================================================================
-- SECTION 4 — KRA.target: confirm only the 6 confirmed money labels changed
-- ============================================================================
-- This requires a manual or scripted diff against the pre-migration
-- snapshot's Section 6 full row dump — there is no single SQL aggregate that
-- can verify "only these 6 labels changed, every other label byte-identical"
-- across free text. Pull the full set here and diff row-by-row against the
-- pre-migration dump.

SELECT id, title, target FROM `KRA` ORDER BY id;
SELECT COUNT(*) AS kra_row_count FROM `KRA`;
-- Expect: row count unchanged (34). For each row, only numeric values
-- immediately following the 6 allowlisted labels (total sales revenue -
-- booking/billing, total funnel/pipeline value created (₹ lakhs), total
-- team booking target achievement (₹ lakhs), total team billing
-- achievement, total team pipeline coverage (₹ lakhs)) should be ×100,000
-- larger than the pre-migration dump; every other label/value pair must be
-- byte-for-byte identical to the pre-migration dump.


-- ============================================================================
-- SECTION 5 — EmployeeTarget / TeamTarget: confirm still no-op
-- ============================================================================

SELECT COUNT(*) AS employee_target_row_count FROM `employee_target`;
SELECT COUNT(*) AS team_target_row_count FROM `team_target`;
-- Expect: both still 0, unchanged from the pre-migration snapshot.


-- ============================================================================
-- SECTION 6 — Soft-delete fields exist (Phase A)
-- ============================================================================

SELECT TABLE_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND COLUMN_NAME IN ('deletedAt', 'deletedById', 'deleteReason')
  AND TABLE_NAME IN ('Collection', 'Customer', 'EmployeeAdvance', 'Expense', 'Payment', 'TravelClaim', 'Vendor')
ORDER BY TABLE_NAME, COLUMN_NAME;
-- Expect: 21 rows (3 columns × 7 tables).

SHOW INDEX FROM `Collection` WHERE Key_name = 'Collection_deletedAt_idx';
SHOW INDEX FROM `Customer` WHERE Key_name = 'Customer_deletedAt_idx';
SHOW INDEX FROM `EmployeeAdvance` WHERE Key_name = 'EmployeeAdvance_deletedAt_idx';
SHOW INDEX FROM `Expense` WHERE Key_name = 'Expense_deletedAt_idx';
SHOW INDEX FROM `Payment` WHERE Key_name = 'Payment_deletedAt_idx';
SHOW INDEX FROM `TravelClaim` WHERE Key_name = 'TravelClaim_deletedAt_idx';
SHOW INDEX FROM `Vendor` WHERE Key_name = 'Vendor_deletedAt_idx';


-- ============================================================================
-- SECTION 7 — Migrations recorded
-- ============================================================================
-- This confirms the schema/data changes happened — it does NOT itself record
-- the migrations. Recording is done separately via 3 manual
-- `prisma migrate resolve --applied <name>` calls (one per migration name),
-- per the project's established Hostinger no-shadow-DB workflow — see
-- UAT_MIGRATION_README.md. Run this section only AFTER those 3 resolve calls.

SELECT migration_name, started_at, finished_at, rolled_back_at
FROM `_prisma_migrations`
WHERE migration_name IN (
  '20260621120000_add_soft_delete_fields_phase_a',
  '20260622120000_decimal_release1_lakhs_to_inr',
  '20260623060000_decimal_release2_combined_inr_canonical'
);
-- Expect: 3 rows, all with finished_at set and rolled_back_at NULL.

SELECT COUNT(*) AS total_migration_rows FROM `_prisma_migrations`;
-- Expect: 22 (19 from before + these 3).


-- ============================================================================
-- END OF FILE — no write statement appears anywhere above this line.
-- ============================================================================
