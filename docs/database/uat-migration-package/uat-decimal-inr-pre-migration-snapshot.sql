-- ============================================================================
-- UAT PRE-MIGRATION SNAPSHOT — Decimal / INR Migration (Step 4E, 2026-06-24)
-- ============================================================================
--
-- THIS FILE CONTAINS READ-ONLY STATEMENTS ONLY (SELECT/SHOW/INFORMATION_SCHEMA).
-- It cannot modify any row, table, or schema object. Run this IMMEDIATELY
-- BEFORE applying uat-decimal-inr-migration-plan.sql, and keep the output —
-- it is the baseline that uat-decimal-inr-post-migration-verification.sql
-- compares against. Targets UAT only — do not run against production.
-- ============================================================================


-- ============================================================================
-- SECTION 1 — DB identity and migration state
-- ============================================================================

SELECT DATABASE() AS current_database;
SELECT VERSION()  AS mysql_version;
SELECT NOW()      AS server_time;

SELECT migration_name, started_at, finished_at, rolled_back_at
FROM `_prisma_migrations`
ORDER BY started_at;

SELECT COUNT(*) AS total_migration_rows FROM `_prisma_migrations`;

SELECT migration_name
FROM `_prisma_migrations`
WHERE migration_name IN (
  '20260621120000_add_soft_delete_fields_phase_a',
  '20260622120000_decimal_release1_lakhs_to_inr',
  '20260623060000_decimal_release2_combined_inr_canonical'
);
-- Expect 0 rows back — confirms the 3 migrations are still NOT applied to
-- UAT before this snapshot is taken. If this returns any row, STOP — do not
-- proceed with the migration plan; investigate why first.


-- ============================================================================
-- SECTION 2 — Current column types (before migration)
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
    (TABLE_NAME = 'Voucher'          AND COLUMN_NAME IN ('amountLakhs')) OR
    (TABLE_NAME = 'Ledger'           AND COLUMN_NAME IN ('amountLakhs')) OR
    (TABLE_NAME = 'FinAccount'       AND COLUMN_NAME IN ('openingBalance', 'currentBalance'))
  )
ORDER BY TABLE_NAME, COLUMN_NAME;


-- ============================================================================
-- SECTION 3 — Row counts (before migration)
-- ============================================================================

SELECT 'Expense'         AS table_name, COUNT(*) AS row_count FROM `Expense`
UNION ALL SELECT 'EmployeeAdvance',  COUNT(*) FROM `EmployeeAdvance`
UNION ALL SELECT 'TravelClaim',      COUNT(*) FROM `TravelClaim`
UNION ALL SELECT 'Payment',          COUNT(*) FROM `Payment`
UNION ALL SELECT 'Collection',       COUNT(*) FROM `Collection`
UNION ALL SELECT 'OrderAdvance',     COUNT(*) FROM `OrderAdvance`
UNION ALL SELECT 'CrmLead',          COUNT(*) FROM `CrmLead`
UNION ALL SELECT 'CrmOpportunity',   COUNT(*) FROM `CrmOpportunity`
UNION ALL SELECT 'SalesFunnel',      COUNT(*) FROM `SalesFunnel`
UNION ALL SELECT 'kra_template_item', COUNT(*) FROM `kra_template_item`
UNION ALL SELECT 'KRA',              COUNT(*) FROM `KRA`
UNION ALL SELECT 'employee_target',  COUNT(*) FROM `employee_target`
UNION ALL SELECT 'team_target',      COUNT(*) FROM `team_target`
UNION ALL SELECT 'Voucher',          COUNT(*) FROM `Voucher`
UNION ALL SELECT 'Ledger',           COUNT(*) FROM `Ledger`
UNION ALL SELECT 'FinAccount',       COUNT(*) FROM `FinAccount`;


-- ============================================================================
-- SECTION 4 — Payment / Collection / OrderAdvance values (before — must NOT
-- change after migration except for the type, since these are type-only)
-- ============================================================================

SELECT id, amountLakhs FROM `Payment` ORDER BY id;
SELECT id, invoiceValueLakhs, amountWithoutGstLakhs, amountReceivedLakhs FROM `Collection` ORDER BY id;
SELECT id, amountLakhs FROM `OrderAdvance` ORDER BY id;

-- Aggregate checksums (cheap before/after comparison without diffing every row)
SELECT 'Payment.amountLakhs' AS field, SUM(amountLakhs) AS total, COUNT(*) AS row_count FROM `Payment`;
SELECT 'Collection.invoiceValueLakhs' AS field, SUM(invoiceValueLakhs) AS total, COUNT(*) AS row_count FROM `Collection`;
SELECT 'Collection.amountWithoutGstLakhs' AS field, SUM(amountWithoutGstLakhs) AS total, COUNT(*) AS row_count FROM `Collection`;
SELECT 'Collection.amountReceivedLakhs' AS field, SUM(amountReceivedLakhs) AS total, COUNT(*) AS row_count FROM `Collection`;
SELECT 'OrderAdvance.amountLakhs' AS field, SUM(amountLakhs) AS total, COUNT(*) AS row_count FROM `OrderAdvance`;


-- ============================================================================
-- SECTION 5 — CrmLead / CrmOpportunity / SalesFunnel values (before — must
-- be exactly ×100,000 larger after migration)
-- ============================================================================

SELECT id, expectedValue FROM `CrmLead` ORDER BY id;
SELECT id, value, dealValueExTax, netProfitLakhs FROM `CrmOpportunity` ORDER BY id;
SELECT id, dealValueLakhs, billingValueLakhs FROM `SalesFunnel` ORDER BY id;

SELECT 'CrmLead.expectedValue' AS field, SUM(expectedValue) AS total, COUNT(*) AS row_count FROM `CrmLead`;
SELECT 'CrmOpportunity.value' AS field, SUM(value) AS total, COUNT(*) AS row_count FROM `CrmOpportunity`;
SELECT 'CrmOpportunity.dealValueExTax' AS field, SUM(dealValueExTax) AS total, COUNT(*) AS row_count FROM `CrmOpportunity`;
SELECT 'CrmOpportunity.netProfitLakhs' AS field, SUM(netProfitLakhs) AS total, COUNT(*) AS row_count FROM `CrmOpportunity`;
SELECT 'SalesFunnel.dealValueLakhs' AS field, SUM(dealValueLakhs) AS total, COUNT(*) AS row_count FROM `SalesFunnel`;
SELECT 'SalesFunnel.billingValueLakhs' AS field, SUM(billingValueLakhs) AS total, COUNT(*) AS row_count FROM `SalesFunnel`;


-- ============================================================================
-- SECTION 6 — KRA.target full row dump (before — for diffing against the
-- post-migration version to confirm only the 6 confirmed money labels
-- changed, and that every non-money label is byte-for-byte identical)
-- ============================================================================

SELECT id, title, target FROM `KRA` ORDER BY id;
SELECT COUNT(*) AS kra_row_count FROM `KRA`;


-- ============================================================================
-- SECTION 7 — EmployeeTarget / TeamTarget (before — should remain 0 rows
-- after migration; this is a no-op section)
-- ============================================================================

SELECT COUNT(*) AS employee_target_row_count FROM `employee_target`;
SELECT COUNT(*) AS team_target_row_count FROM `team_target`;


-- ============================================================================
-- END OF FILE — no write statement appears anywhere above this line.
-- ============================================================================
