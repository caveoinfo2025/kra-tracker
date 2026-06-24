-- ============================================================================
-- UAT CLASSIFICATION FOLLOW-UP — CrmOpportunity unit detail + full KRA.target
-- scan (Step 4D, 2026-06-24)
-- ============================================================================
--
-- THIS FILE CONTAINS READ-ONLY STATEMENTS ONLY (SELECT only). It cannot
-- modify any row, table, or schema object. Targets UAT only — do not run
-- against production.
--
-- Purpose: close the two remaining Step 4C classification blockers —
-- (1) CrmOpportunity.value/dealValueExTax/netProfitLakhs unit ambiguity,
-- (2) the unreviewed 14 of 34 KRA.target rows — by collecting full detail
-- instead of the 20-row sample collected in Step 4B.
-- ============================================================================


-- ============================================================================
-- SECTION A — CrmOpportunity full classification
-- ============================================================================

-- A1. Per-field summary stats (row count, nulls, zeroes, negatives, min, max)
SELECT
  COUNT(*)                                            AS row_count,
  SUM(CASE WHEN `value` IS NULL THEN 1 ELSE 0 END)     AS null_count,
  SUM(CASE WHEN `value` = 0 THEN 1 ELSE 0 END)         AS zero_count,
  SUM(CASE WHEN `value` < 0 THEN 1 ELSE 0 END)         AS negative_count,
  MIN(`value`)                                          AS min_value,
  MAX(`value`)                                          AS max_value
FROM `CrmOpportunity`;

SELECT
  COUNT(*)                                                       AS row_count,
  SUM(CASE WHEN `dealValueExTax` IS NULL THEN 1 ELSE 0 END)       AS null_count,
  SUM(CASE WHEN `dealValueExTax` = 0 THEN 1 ELSE 0 END)           AS zero_count,
  SUM(CASE WHEN `dealValueExTax` < 0 THEN 1 ELSE 0 END)           AS negative_count,
  MIN(`dealValueExTax`)                                            AS min_value,
  MAX(`dealValueExTax`)                                            AS max_value
FROM `CrmOpportunity`;

SELECT
  COUNT(*)                                                     AS row_count,
  SUM(CASE WHEN `netProfitLakhs` IS NULL THEN 1 ELSE 0 END)     AS null_count,
  SUM(CASE WHEN `netProfitLakhs` = 0 THEN 1 ELSE 0 END)         AS zero_count,
  SUM(CASE WHEN `netProfitLakhs` < 0 THEN 1 ELSE 0 END)         AS negative_count,
  MIN(`netProfitLakhs`)                                          AS min_value,
  MAX(`netProfitLakhs`)                                          AS max_value
FROM `CrmOpportunity`;

-- A2. Top 10 by absolute value of `value` (largest-magnitude rows, with lead
--     context via the join — title/companyName come from CrmLead, not
--     CrmOpportunity itself)
SELECT
  o.id, o.stage, o.status, o.value, o.dealValueExTax, o.netProfitLakhs,
  l.title AS lead_title, l.companyName, l.customerName
FROM `CrmOpportunity` o
JOIN `CrmLead` l ON o.leadId = l.id
ORDER BY ABS(o.value) DESC
LIMIT 10;

-- A3. Top 10 by absolute value of dealValueExTax
SELECT
  o.id, o.stage, o.status, o.value, o.dealValueExTax, o.netProfitLakhs,
  l.title AS lead_title, l.companyName, l.customerName
FROM `CrmOpportunity` o
JOIN `CrmLead` l ON o.leadId = l.id
ORDER BY ABS(o.dealValueExTax) DESC
LIMIT 10;

-- A4. Top 10 by absolute value of netProfitLakhs
SELECT
  o.id, o.stage, o.status, o.value, o.dealValueExTax, o.netProfitLakhs,
  l.title AS lead_title, l.companyName, l.customerName
FROM `CrmOpportunity` o
JOIN `CrmLead` l ON o.leadId = l.id
ORDER BY ABS(o.netProfitLakhs) DESC
LIMIT 10;

-- A5. Every row with a negative value in ANY of the 3 fields — this is the
--     full detail on the 1 negative row Step 4B's sample found (and confirms
--     whether there are any others outside that 49-row full set — there
--     shouldn't be, since the table only has 49 rows, but listing explicitly)
SELECT
  o.id, o.stage, o.status, o.value, o.dealValueExTax, o.netProfitLakhs,
  l.title AS lead_title, l.companyName, l.customerName, o.lostReason
FROM `CrmOpportunity` o
JOIN `CrmLead` l ON o.leadId = l.id
WHERE o.value < 0 OR o.dealValueExTax < 0 OR o.netProfitLakhs < 0;

-- A6. Full row dump (49 rows total — small enough to review in full, not
--     just a sample) ordered by id
SELECT
  o.id, o.stage, o.status, o.value, o.dealValueExTax, o.netProfitLakhs,
  l.title AS lead_title, l.companyName, l.customerName
FROM `CrmOpportunity` o
JOIN `CrmLead` l ON o.leadId = l.id
ORDER BY o.id;


-- ============================================================================
-- SECTION B — Full KRA.target scan (all 34 rows, not just the 20 sampled in
-- Step 4B)
-- ============================================================================

SELECT id, title, target
FROM `KRA`
ORDER BY id;

-- B2. Row count sanity check (should be 34, matching Step 4B)
SELECT COUNT(*) AS kra_row_count FROM `KRA`;


-- ============================================================================
-- SECTION C — EmployeeTarget / TeamTarget re-confirmation (cheap, re-checks
-- Step 4B's "0 rows" finding hasn't changed)
-- ============================================================================

SELECT COUNT(*) AS employee_target_row_count FROM `employee_target`;
SELECT COUNT(*) AS team_target_row_count FROM `team_target`;


-- ============================================================================
-- END OF FILE — no write statement appears anywhere above this line.
-- ============================================================================
