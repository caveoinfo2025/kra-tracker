-- ============================================================================
-- PRODUCTION READ-ONLY PRE-CHECK — Decimal / INR Migration Readiness (Step 3Y)
-- ============================================================================
--
-- THIS FILE CONTAINS READ-ONLY STATEMENTS ONLY.
-- Every statement below is a SELECT, SHOW, or INFORMATION_SCHEMA query.
-- There is no INSERT, UPDATE, DELETE, ALTER, DROP, TRUNCATE, CREATE, REPLACE,
-- RENAME, GRANT, REVOKE, or SET FOREIGN_KEY_CHECKS statement anywhere in this
-- file. Running this file cannot modify any row, table, or schema object.
--
-- WHO RUNS THIS: a human/admin with confirmed production database access,
-- directly on the Hostinger production server or via a confirmed production
-- connection — never from this local dev environment, and never by pasting
-- a production DATABASE_URL into a chat session.
--
-- HOW TO RUN: see README.md in this same folder for exact command examples
-- (no real credentials are included in this repo).
--
-- WHAT TO DO WITH OUTPUT: redirect to a text file, review it yourself first,
-- then transcribe the relevant numbers into
-- production-precheck-result-template.md (in this same folder) before
-- sharing back — do not paste raw terminal output containing a hostname,
-- username, or any value you're not sure is safe to share.
--
-- Physical table names below were taken directly from prisma/schema.prisma's
-- @@map directives (confirmed, not guessed) as of Step 3Y (2026-06-23):
--   KRAMetric        -> kra_metric
--   KRATemplate      -> kra_template
--   KRATemplateItem  -> kra_template_item
--   EmployeeTarget   -> employee_target
--   TeamTarget       -> team_target
-- Every other model referenced below (Expense, EmployeeAdvance, TravelClaim,
-- Payment, Collection, OrderAdvance, CrmLead, CrmOpportunity, SalesFunnel,
-- KRA, Voucher, Ledger, FinAccount) has NO @@map directive, so its physical
-- table name is the exact PascalCase Prisma model name.
-- ============================================================================


-- ============================================================================
-- SECTION 0 — Table-name discovery (run this first if any table below 404s)
-- ============================================================================
-- If a query in a later section fails with "table doesn't exist", run this
-- section to find the actual table name on THIS database before assuming the
-- migration plan's expected name is correct. This is read-only and safe.

SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME, UPDATE_TIME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME;


-- ============================================================================
-- SECTION 1 — DB identity
-- ============================================================================

SELECT DATABASE() AS current_database;
SELECT VERSION()  AS mysql_version;
SELECT NOW()      AS server_time;


-- ============================================================================
-- SECTION 2 — Prisma migration history
-- ============================================================================

SELECT
  migration_name,
  started_at,
  finished_at,
  rolled_back_at,
  applied_steps_count
FROM `_prisma_migrations`
ORDER BY started_at;

-- Quick summary counts (still read-only — these are aggregate SELECTs)
SELECT COUNT(*) AS total_migration_rows FROM `_prisma_migrations`;
SELECT COUNT(*) AS applied_not_rolled_back
FROM `_prisma_migrations`
WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;
SELECT migration_name, finished_at
FROM `_prisma_migrations`
WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
ORDER BY finished_at DESC
LIMIT 1;


-- ============================================================================
-- SECTION 3 — Column type checks (Release 1 + Release 2 fields)
-- ============================================================================
-- Expect DATA_TYPE/COLUMN_TYPE = 'float'/'double' if NOT yet migrated, or
-- 'decimal'/'decimal(18,2)' (or '(10,4)' for ratePerKm) if already migrated.
-- This single query covers every in-scope field in one pass.

SELECT
  TABLE_NAME,
  COLUMN_NAME,
  DATA_TYPE,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND (
    (TABLE_NAME = 'Expense'          AND COLUMN_NAME IN ('amountLakhs', 'gstAmountLakhs')) OR
    (TABLE_NAME = 'EmployeeAdvance'  AND COLUMN_NAME IN ('amountLakhs', 'disbursedAmountLakhs', 'settledAmountLakhs', 'balanceLakhs')) OR
    (TABLE_NAME = 'TravelClaim'      AND COLUMN_NAME IN ('amountLakhs', 'amountRupees', 'ratePerKm')) OR
    (TABLE_NAME = 'Payment'          AND COLUMN_NAME IN ('amountLakhs')) OR
    (TABLE_NAME = 'Collection'       AND COLUMN_NAME IN ('invoiceValueLakhs', 'amountWithoutGstLakhs', 'amountReceivedLakhs')) OR
    (TABLE_NAME = 'OrderAdvance'     AND COLUMN_NAME IN ('amountLakhs')) OR
    (TABLE_NAME = 'CrmLead'          AND COLUMN_NAME IN ('expectedValue')) OR
    (TABLE_NAME = 'CrmOpportunity'   AND COLUMN_NAME IN ('value', 'dealValueExTax', 'netProfitLakhs')) OR
    (TABLE_NAME = 'SalesFunnel'      AND COLUMN_NAME IN ('dealValueLakhs', 'billingValueLakhs')) OR
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


-- ============================================================================
-- SECTION 4 — Row counts
-- ============================================================================
-- Each is a single-table aggregate SELECT — read-only.

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
-- SECTION 5 — Unit sampling (min/max/null/negative — does NOT modify data)
-- ============================================================================
-- Goal: infer whether each field currently stores ₹ Lakhs (small decimal,
-- e.g. 0.5–500) or already actual ₹ INR (large integer-ish, e.g. 50000+).
-- Do not assume Lakhs just because dev was Lakhs before its own migration —
-- read the actual numbers below.

-- Release 1 fields
SELECT 'Expense.amountLakhs' AS field,
  MIN(amountLakhs) AS min_value, MAX(amountLakhs) AS max_value,
  SUM(CASE WHEN amountLakhs IS NULL THEN 1 ELSE 0 END) AS null_count,
  SUM(CASE WHEN amountLakhs < 0 THEN 1 ELSE 0 END) AS negative_count,
  COUNT(*) AS total_rows
FROM `Expense`;

SELECT 'Expense.gstAmountLakhs' AS field,
  MIN(gstAmountLakhs) AS min_value, MAX(gstAmountLakhs) AS max_value,
  SUM(CASE WHEN gstAmountLakhs IS NULL THEN 1 ELSE 0 END) AS null_count,
  SUM(CASE WHEN gstAmountLakhs < 0 THEN 1 ELSE 0 END) AS negative_count,
  COUNT(*) AS total_rows
FROM `Expense`;

SELECT 'EmployeeAdvance.amountLakhs' AS field,
  MIN(amountLakhs) AS min_value, MAX(amountLakhs) AS max_value,
  SUM(CASE WHEN amountLakhs IS NULL THEN 1 ELSE 0 END) AS null_count,
  SUM(CASE WHEN amountLakhs < 0 THEN 1 ELSE 0 END) AS negative_count,
  COUNT(*) AS total_rows
FROM `EmployeeAdvance`;

SELECT 'EmployeeAdvance.disbursedAmountLakhs' AS field,
  MIN(disbursedAmountLakhs) AS min_value, MAX(disbursedAmountLakhs) AS max_value,
  SUM(CASE WHEN disbursedAmountLakhs IS NULL THEN 1 ELSE 0 END) AS null_count,
  SUM(CASE WHEN disbursedAmountLakhs < 0 THEN 1 ELSE 0 END) AS negative_count,
  COUNT(*) AS total_rows
FROM `EmployeeAdvance`;

SELECT 'EmployeeAdvance.settledAmountLakhs' AS field,
  MIN(settledAmountLakhs) AS min_value, MAX(settledAmountLakhs) AS max_value,
  SUM(CASE WHEN settledAmountLakhs IS NULL THEN 1 ELSE 0 END) AS null_count,
  SUM(CASE WHEN settledAmountLakhs < 0 THEN 1 ELSE 0 END) AS negative_count,
  COUNT(*) AS total_rows
FROM `EmployeeAdvance`;

SELECT 'EmployeeAdvance.balanceLakhs' AS field,
  MIN(balanceLakhs) AS min_value, MAX(balanceLakhs) AS max_value,
  SUM(CASE WHEN balanceLakhs IS NULL THEN 1 ELSE 0 END) AS null_count,
  SUM(CASE WHEN balanceLakhs < 0 THEN 1 ELSE 0 END) AS negative_count,
  COUNT(*) AS total_rows
FROM `EmployeeAdvance`;

SELECT 'TravelClaim.amountLakhs' AS field,
  MIN(amountLakhs) AS min_value, MAX(amountLakhs) AS max_value,
  SUM(CASE WHEN amountLakhs IS NULL THEN 1 ELSE 0 END) AS null_count,
  SUM(CASE WHEN amountLakhs < 0 THEN 1 ELSE 0 END) AS negative_count,
  COUNT(*) AS total_rows
FROM `TravelClaim`;

SELECT 'TravelClaim.amountRupees' AS field,
  MIN(amountRupees) AS min_value, MAX(amountRupees) AS max_value,
  SUM(CASE WHEN amountRupees IS NULL THEN 1 ELSE 0 END) AS null_count,
  SUM(CASE WHEN amountRupees < 0 THEN 1 ELSE 0 END) AS negative_count,
  COUNT(*) AS total_rows
FROM `TravelClaim`;

SELECT 'TravelClaim.ratePerKm' AS field,
  MIN(ratePerKm) AS min_value, MAX(ratePerKm) AS max_value,
  SUM(CASE WHEN ratePerKm IS NULL THEN 1 ELSE 0 END) AS null_count,
  SUM(CASE WHEN ratePerKm < 0 THEN 1 ELSE 0 END) AS negative_count,
  COUNT(*) AS total_rows
FROM `TravelClaim`;

-- Release 2 fields
SELECT 'Payment.amountLakhs' AS field,
  MIN(amountLakhs) AS min_value, MAX(amountLakhs) AS max_value,
  SUM(CASE WHEN amountLakhs IS NULL THEN 1 ELSE 0 END) AS null_count,
  SUM(CASE WHEN amountLakhs < 0 THEN 1 ELSE 0 END) AS negative_count,
  COUNT(*) AS total_rows
FROM `Payment`;

SELECT 'Collection.invoiceValueLakhs' AS field,
  MIN(invoiceValueLakhs) AS min_value, MAX(invoiceValueLakhs) AS max_value,
  SUM(CASE WHEN invoiceValueLakhs IS NULL THEN 1 ELSE 0 END) AS null_count,
  SUM(CASE WHEN invoiceValueLakhs < 0 THEN 1 ELSE 0 END) AS negative_count,
  COUNT(*) AS total_rows
FROM `Collection`;

SELECT 'Collection.amountWithoutGstLakhs' AS field,
  MIN(amountWithoutGstLakhs) AS min_value, MAX(amountWithoutGstLakhs) AS max_value,
  SUM(CASE WHEN amountWithoutGstLakhs IS NULL THEN 1 ELSE 0 END) AS null_count,
  SUM(CASE WHEN amountWithoutGstLakhs < 0 THEN 1 ELSE 0 END) AS negative_count,
  COUNT(*) AS total_rows
FROM `Collection`;

SELECT 'Collection.amountReceivedLakhs' AS field,
  MIN(amountReceivedLakhs) AS min_value, MAX(amountReceivedLakhs) AS max_value,
  SUM(CASE WHEN amountReceivedLakhs IS NULL THEN 1 ELSE 0 END) AS null_count,
  SUM(CASE WHEN amountReceivedLakhs < 0 THEN 1 ELSE 0 END) AS negative_count,
  COUNT(*) AS total_rows
FROM `Collection`;

SELECT 'OrderAdvance.amountLakhs' AS field,
  MIN(amountLakhs) AS min_value, MAX(amountLakhs) AS max_value,
  SUM(CASE WHEN amountLakhs IS NULL THEN 1 ELSE 0 END) AS null_count,
  SUM(CASE WHEN amountLakhs < 0 THEN 1 ELSE 0 END) AS negative_count,
  COUNT(*) AS total_rows
FROM `OrderAdvance`;

SELECT 'CrmLead.expectedValue' AS field,
  MIN(expectedValue) AS min_value, MAX(expectedValue) AS max_value,
  SUM(CASE WHEN expectedValue IS NULL THEN 1 ELSE 0 END) AS null_count,
  SUM(CASE WHEN expectedValue < 0 THEN 1 ELSE 0 END) AS negative_count,
  COUNT(*) AS total_rows
FROM `CrmLead`;

SELECT 'CrmOpportunity.value' AS field,
  MIN(value) AS min_value, MAX(value) AS max_value,
  SUM(CASE WHEN value IS NULL THEN 1 ELSE 0 END) AS null_count,
  SUM(CASE WHEN value < 0 THEN 1 ELSE 0 END) AS negative_count,
  COUNT(*) AS total_rows
FROM `CrmOpportunity`;

SELECT 'CrmOpportunity.dealValueExTax' AS field,
  MIN(dealValueExTax) AS min_value, MAX(dealValueExTax) AS max_value,
  SUM(CASE WHEN dealValueExTax IS NULL THEN 1 ELSE 0 END) AS null_count,
  SUM(CASE WHEN dealValueExTax < 0 THEN 1 ELSE 0 END) AS negative_count,
  COUNT(*) AS total_rows
FROM `CrmOpportunity`;

SELECT 'CrmOpportunity.netProfitLakhs' AS field,
  MIN(netProfitLakhs) AS min_value, MAX(netProfitLakhs) AS max_value,
  SUM(CASE WHEN netProfitLakhs IS NULL THEN 1 ELSE 0 END) AS null_count,
  SUM(CASE WHEN netProfitLakhs < 0 THEN 1 ELSE 0 END) AS negative_count,
  COUNT(*) AS total_rows
FROM `CrmOpportunity`;

SELECT 'SalesFunnel.dealValueLakhs' AS field,
  MIN(dealValueLakhs) AS min_value, MAX(dealValueLakhs) AS max_value,
  SUM(CASE WHEN dealValueLakhs IS NULL THEN 1 ELSE 0 END) AS null_count,
  SUM(CASE WHEN dealValueLakhs < 0 THEN 1 ELSE 0 END) AS negative_count,
  COUNT(*) AS total_rows
FROM `SalesFunnel`;

SELECT 'SalesFunnel.billingValueLakhs' AS field,
  MIN(billingValueLakhs) AS min_value, MAX(billingValueLakhs) AS max_value,
  SUM(CASE WHEN billingValueLakhs IS NULL THEN 1 ELSE 0 END) AS null_count,
  SUM(CASE WHEN billingValueLakhs < 0 THEN 1 ELSE 0 END) AS negative_count,
  COUNT(*) AS total_rows
FROM `SalesFunnel`;

-- KRATemplateItem targets — sampled per-row (not aggregated) since only the
-- AMOUNT-typed rows are in scope; see Section 6 for the metricType join.
SELECT id, templateId, metricId, targetType, minimumTarget, expectedTarget, stretchTarget
FROM `kra_template_item`
ORDER BY id;


-- ============================================================================
-- SECTION 6 — KRA / Sales target classification
-- ============================================================================

-- 6a. KRAMetric rows and their metricType (confirm taxonomy: AMOUNT/PERCENTAGE/
--     COUNT, as found live in dev — or something else entirely in production)
SELECT id, name, code, metricType, calculationSource, status
FROM `kra_metric`
ORDER BY id;

-- 6b. KRATemplateItem joined to KRAMetric — confirms which target rows are
--     money-denominated (AMOUNT) vs. not (PERCENTAGE/COUNT/other)
SELECT
  kti.id            AS template_item_id,
  kti.templateId,
  kti.targetType,
  kti.minimumTarget,
  kti.expectedTarget,
  kti.stretchTarget,
  km.id             AS metric_id,
  km.name           AS metric_name,
  km.code           AS metric_code,
  km.metricType
FROM `kra_template_item` kti
JOIN `kra_metric` km ON kti.metricId = km.id
ORDER BY kti.id;

-- 6c. Any AMOUNT/PERCENTAGE/COUNT mismatch between targetType and metricType
--     (this is exactly the dev-found item #16 pattern — confirm whether
--     production has the same, a different, or no such mismatch)
SELECT
  kti.id            AS template_item_id,
  kti.targetType,
  km.metricType,
  kti.minimumTarget,
  kti.expectedTarget,
  kti.stretchTarget
FROM `kra_template_item` kti
JOIN `kra_metric` km ON kti.metricId = km.id
WHERE kti.targetType <> km.metricType;

-- 6d. KRA.target free-text sample (first 20 rows — read-only, no LIMIT abuse,
--     just a manageable sample size for manual review)
SELECT id, title, target
FROM `KRA`
ORDER BY id
LIMIT 20;

-- 6e. EmployeeTarget.targetJson free-text sample (first 20 rows)
SELECT id, employeeProfileId, templateId, targetJson
FROM `employee_target`
ORDER BY id
LIMIT 20;

-- 6f. team_target row count and sample (if any rows exist)
SELECT COUNT(*) AS team_target_row_count FROM `team_target`;
SELECT id, teamId, periodId, targetJson, status
FROM `team_target`
ORDER BY id
LIMIT 20;


-- ============================================================================
-- END OF FILE — no write statement appears anywhere above this line.
-- ============================================================================
