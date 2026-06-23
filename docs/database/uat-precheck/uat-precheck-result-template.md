# UAT Pre-Check Result Template

> Fill this in after running [`uat-readonly-precheck.sql`](uat-readonly-precheck.sql) against the
> **confirmed UAT database**. Paste sanitized findings only — see [`README.md`](README.md)'s "How
> to capture sanitized results" section before filling this in. **Do not paste a hostname,
> username, password, or full connection string anywhere in this file.** If you're unsure whether
> a value is sensitive, describe the finding in words instead. **This template is for UAT only —
> do not fill it in with production data.**

**Filled in by:** _(name/role)_
**Date/time (IST):** _(when the checks were run)_
**Environment confirmed as UAT by:** _(how you confirmed this — e.g. "matched hPanel's UAT
database listing," "ran against the server `docs/database/UAT_DECIMAL_INR_MIGRATION_PLAN.md`
documents as the UAT host")_

---

## 1. UAT DB identity

| Check | Result |
| ----- | ------ |
| `SELECT DATABASE()` result | |
| `SELECT VERSION()` result | |
| `SELECT NOW()` result | |
| Connection method used | _(e.g. SSH to UAT server / authorized Remote MySQL — do not name the literal host/user)_ |
| Read-only test successful? | Yes / No |

---

## 2. Migration table summary

Total `_prisma_migrations` rows: ____

Latest applied (not rolled back) migration: ____________________

| Migration | Started At | Finished At | Rolled Back? | Status |
| --------- | ---------- | ------------ | -------------- | ------ |
| | | | | |
| *(add a row per migration returned by Section 2 of the SQL file)* | | | | |

**The 3 migrations expected to be UAT's outstanding gap** (per Session 9's bootstrap covering
through migration #19) — confirm present or missing:

| Migration | Present? | Notes |
| --------- | -------- | ----- |
| `20260621120000_add_soft_delete_fields_phase_a` | | |
| `20260622120000_decimal_release1_lakhs_to_inr` | | |
| `20260623060000_decimal_release2_combined_inr_canonical` | | |

---

## 3. Local vs. UAT migration comparison

Compare the table above against the local `prisma/migrations/` folder (22 migration dirs + lock
file as of 2026-06-23, per `docs/database/UAT_DECIMAL_INR_MIGRATION_PLAN.md`).

| Local Migration Folder | Present In UAT? | UAT Status | Notes |
| ----------------------- | --------------------------- | -------------------- | ----- |
| `20260601000000_init_mysql` | | | |
| `20260602120000_finance_operations_phase1` | | | |
| `20260604000000_admin_console_foundation` | | | |
| `20260604120000_policy_engine_foundation` | | | |
| `20260604180000_workflow_engine` | | | |
| `20260604220000_master_data_management` | | | |
| `20260605000000_opportunity_discount_pct` | | | |
| `20260605010000_crm_admin_engine` | | | |
| `20260605020000_opportunity_won_fields` | | | |
| `20260605030000_legacy_promote_and_net_profit` | | | |
| `20260605050000_finance_admin_engine` | | | |
| `20260609060000_performance_management_engine` | | | |
| `20260609070000_communication_engine` | | | |
| `20260610080000_integration_center` | | | |
| `20260610090000_security_center` | | | |
| `20260615000000_add_advance_category` | | | |
| `20260617100000_employeetarget_relations` | | | |
| `20260618000000_master_data_linkage` | | | |
| `20260618100000_crm_lead_customer_ref` | | | |
| `20260621120000_add_soft_delete_fields_phase_a` | | | |
| `20260622120000_decimal_release1_lakhs_to_inr` | | | |
| `20260623060000_decimal_release2_combined_inr_canonical` | | | |

---

## 4. Schema snapshot summary

| Table | Column | Exists? | UAT Type | Dev Expected Type | Match? | Notes |
| ----- | ------ | ------- | ------------------- | ---------------------- | ------ | ----- |
| Expense | amountLakhs | | | Decimal(18,2) | | |
| Expense | gstAmountLakhs | | | Decimal(18,2) | | |
| EmployeeAdvance | amountLakhs | | | Decimal(18,2) | | |
| EmployeeAdvance | disbursedAmountLakhs | | | Decimal(18,2), nullable | | |
| EmployeeAdvance | settledAmountLakhs | | | Decimal(18,2), nullable | | |
| EmployeeAdvance | balanceLakhs | | | Decimal(18,2) | | |
| TravelClaim | amountLakhs | | | Decimal(18,2) | | |
| TravelClaim | amountRupees | | | Decimal(18,2) | | |
| TravelClaim | ratePerKm | | | Decimal(10,4) | | |
| Payment | amountLakhs | | | Decimal(18,2) | | |
| Collection | invoiceValueLakhs | | | Decimal(18,2) | | |
| Collection | amountWithoutGstLakhs | | | Decimal(18,2) | | |
| Collection | amountReceivedLakhs | | | Decimal(18,2) | | |
| OrderAdvance | amountLakhs | | | Decimal(18,2) | | |
| CrmLead | expectedValue | | | Decimal(18,2) | | |
| CrmOpportunity | value | | | Decimal(18,2) | | |
| CrmOpportunity | dealValueExTax | | | Decimal(18,2) | | |
| CrmOpportunity | netProfitLakhs | | | Decimal(18,2) | | |
| SalesFunnel | dealValueLakhs | | | Decimal(18,2) | | |
| SalesFunnel | billingValueLakhs | | | Decimal(18,2) | | |
| kra_template_item | expectedTarget/stretchTarget/minimumTarget | | | Float (column type unchanged by design — only AMOUNT-row *data* converts) | | |
| KRA | target | | | String/Text (free-text; money sub-values converted, not the column type) | | |
| employee_target | targetJson | | | String/Text (same as above) | | |
| team_target | targetJson | | | String/Text | | |
| Voucher | amountLakhs | | | **Should remain Float — excluded from both releases** | | |
| Ledger | amountLakhs | | | **Should remain Float — excluded from both releases** | | |
| FinAccount | openingBalance/currentBalance | | | **Should remain Float — excluded from both releases** | | |

---

## 5. Row count summary

| Table/Model | UAT Row Count | Notes |
| ----------- | --------------------: | ----- |
| Expense | | |
| EmployeeAdvance | | |
| TravelClaim | | |
| Payment | | |
| Collection | | |
| OrderAdvance | | |
| CrmLead | | |
| CrmOpportunity | | |
| SalesFunnel | | |
| kra_template_item | | |
| KRA | | |
| employee_target | | |
| team_target | | |
| Voucher | | |
| Ledger | | |
| FinAccount | | |

---

## 6. Unit sampling summary

| Model | Field | Min | Max | Nulls | Negatives | Likely Current Unit | Notes |
| ----- | ----- | --: | --: | ----: | --------: | -------------------- | ----- |
| Expense | amountLakhs | | | | | Lakhs / INR / Unclear | |
| Expense | gstAmountLakhs | | | | | | |
| EmployeeAdvance | amountLakhs | | | | | | |
| EmployeeAdvance | disbursedAmountLakhs | | | | | | |
| EmployeeAdvance | settledAmountLakhs | | | | | | |
| EmployeeAdvance | balanceLakhs | | | | | | |
| TravelClaim | amountLakhs | | | | | | |
| TravelClaim | amountRupees | | | | | | |
| TravelClaim | ratePerKm | | | | | | |
| Payment | amountLakhs | | | | | | |
| Collection | invoiceValueLakhs | | | | | | |
| Collection | amountWithoutGstLakhs | | | | | | |
| Collection | amountReceivedLakhs | | | | | | |
| OrderAdvance | amountLakhs | | | | | | |
| CrmLead | expectedValue | | | | | | |
| CrmOpportunity | value | | | | | | |
| CrmOpportunity | dealValueExTax | | | | | | |
| CrmOpportunity | netProfitLakhs | | | | | | |
| SalesFunnel | dealValueLakhs | | | | | | |
| SalesFunnel | billingValueLakhs | | | | | | |

**Reminder:** do not assume UAT values are Lakhs just because dev was Lakhs before its own
migration. UAT is a prod-mirrored data copy, not a copy of dev — if the sample is inconclusive
(e.g. all values are 0, or the range doesn't clearly read as either scale), write "Unclear — needs
manual business-side confirmation" rather than guessing.

---

## 7. KRA / Sales target findings

| Area | UAT Finding | Migration Risk | Notes |
| ---- | ------------------------ | ---------------- | ----- |
| `kra_metric` taxonomy | AMOUNT/PERCENTAGE/COUNT (dev's live taxonomy) / REVENUE/ACTIVITY/QUALITY/COMPLIANCE (the seed-file taxonomy dev found was never actually live) / Other — describe | | |
| `kra_template_item` rows with `targetType` ≠ linked `metric.metricType` (Section 6c of the SQL) | Count: ____. List ids if any: ____ | | Dev found exactly one such row (#16, "Team Pipeline Coverage") before fixing it in Step 3U-5 — record whether UAT has the same row, a different one, several, or none |
| `KRA.target` confirmed-money labels (Section 6d sample) | Do the same 6 money KPI labels appear (`total sales revenue - booking`, `total sales revenue - billing`, `total funnel / pipeline value created (₹ lakhs)`, `total team booking target achievement (₹ lakhs)`, `total team billing achievement`, `total team pipeline coverage (₹ lakhs)`), or different labels? | | |
| `employee_target.targetJson` (Section 6e sample) | Same free-text format as `KRA.target`, or genuinely structured JSON, or something else? | | |
| `team_target` row count (Section 6f) | | | If > 0, this is different from dev (0 rows) — UAT-specific classification work would be needed before any migration touches this table |

---

## 8. Branch/app gap confirmation

This section does not require a database query — confirm it from the UAT server's deployed code
directly (e.g. `git rev-parse HEAD` run on the server, or whatever Passenger/hPanel shows as the
currently-deployed commit).

| Check | Result |
| ----- | ------ |
| Commit/tag currently deployed to UAT | |
| Does it match `uat`'s current HEAD as of the date this check was run? | Yes / No / Different commit — specify |
| Does `src/lib/money.ts` exist in the deployed code? | Yes / No |
| Does the deployed `prisma/schema.prisma` show Release 1/2 fields as `Decimal` or `Float`? | |

---

## 9. Backup / test-user / write-freeze confirmation

| Check | Result |
| ----- | ------ |
| Full UAT backup taken and verified restorable? | Yes / No |
| At least one Manager-tier test login confirmed working? | Yes / No |
| At least one Employee-tier test login confirmed working? | Yes / No |
| Write-freeze decision made (and communicated to other UAT testers, if needed)? | Yes / No / Not needed — explain |

---

## 10. Blockers found

_(List anything that prevented completing a section above — e.g. a table that doesn't exist, a
permission denied on a specific query, an ambiguous/contradictory result.)_

---

## 11. Recommended next action

_(Your recommendation, in light of the findings above — e.g. "UAT confirmed at migration #19 with
all Release 1/2 fields still Float, safe to proceed with the planned execution sequence," or
"found an unexpected discrepancy in section X, needs further investigation before continuing.")_
