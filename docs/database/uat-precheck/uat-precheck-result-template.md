# UAT Pre-Check Result Template

> Filled in from a real run against the confirmed UAT database (Step 4B, 2026-06-24). Findings
> only — no hostname, username, password, or full connection string is recorded below, per the
> safety rules in [`README.md`](README.md). **This is UAT data, not production.**

**Filled in by:** Vijesh Vijayan (relayed from the operator's SSH terminal output)
**Date/time (IST):** 2026-06-24, server time reported as `2026-06-24 01:16:11` (server clock,
likely UTC — see Section 1)
**Environment confirmed as UAT by:** `SELECT DATABASE()` returned `u686730471_Caveo_UAT` —
matches the documented UAT database name exactly (per `docs/CHANGELOG.md`/`docs/NEXT_SESSION.md`
Session 9). Query was run from an SSH session already inside
`/home/u686730471/domains/uat.caveoinfosystems.com/public_html` using connection user
`u686730471_caveouat` (the documented working UAT user) — the operator confirmed this
themselves; no host/password was shared with or seen by this assistant.

---

## 1. UAT DB identity

| Check | Result |
| ----- | ------ |
| `SELECT DATABASE()` result | `u686730471_Caveo_UAT` — **confirmed real UAT, not dev/production** |
| `SELECT VERSION()` result | `11.8.6-MariaDB-log` |
| `SELECT NOW()` result | `2026-06-24 01:16:11` |
| Connection method used | SSH session on the UAT app server, `mysql` CLI with `-p` (interactive password prompt, never typed in chat) |
| Read-only test successful? | Yes — full pre-check pack ran end-to-end with no errors |

---

## 2. Migration table summary

Total `_prisma_migrations` rows: **19**

Latest applied (not rolled back) migration (by the SQL's `ORDER BY finished_at DESC LIMIT 1`):
`20260601000000_init_mysql` — **not meaningful as "latest"**, see note below.

> **Note on timestamps:** all 19 rows share the identical `started_at`/`finished_at` timestamp
> `2026-06-18 17:51:19.608`, with `applied_steps_count = 1` each. This is consistent with the
> documented bootstrap method (Session 9's `prisma/uat-prisma-tracking.sql` bulk-inserting all
> 19 rows in one tracking-seed pass, not 19 real incremental `migrate deploy` runs) — so "latest
> by timestamp" doesn't reflect real apply order. **Migration completeness here is determined by
> which migration names are present/absent, not by recency.**

| Migration | Started At | Finished At | Rolled Back? | Status |
| --------- | ---------- | ------------ | -------------- | ------ |
| `20260601000000_init_mysql` | 2026-06-18 17:51:19.608 | 2026-06-18 17:51:19.608 | No | Applied |
| `20260602120000_finance_operations_phase1` | 2026-06-18 17:51:19.608 | 2026-06-18 17:51:19.608 | No | Applied |
| `20260604000000_admin_console_foundation` | 2026-06-18 17:51:19.608 | 2026-06-18 17:51:19.608 | No | Applied |
| `20260604120000_policy_engine_foundation` | 2026-06-18 17:51:19.608 | 2026-06-18 17:51:19.608 | No | Applied |
| `20260604180000_workflow_engine` | 2026-06-18 17:51:19.608 | 2026-06-18 17:51:19.608 | No | Applied |
| `20260604220000_master_data_management` | 2026-06-18 17:51:19.608 | 2026-06-18 17:51:19.608 | No | Applied |
| `20260605000000_opportunity_discount_pct` | 2026-06-18 17:51:19.608 | 2026-06-18 17:51:19.608 | No | Applied |
| `20260605010000_crm_admin_engine` | 2026-06-18 17:51:19.608 | 2026-06-18 17:51:19.608 | No | Applied |
| `20260605020000_opportunity_won_fields` | 2026-06-18 17:51:19.608 | 2026-06-18 17:51:19.608 | No | Applied |
| `20260605030000_legacy_promote_and_net_profit` | 2026-06-18 17:51:19.608 | 2026-06-18 17:51:19.608 | No | Applied |
| `20260605050000_finance_admin_engine` | 2026-06-18 17:51:19.608 | 2026-06-18 17:51:19.608 | No | Applied |
| `20260609060000_performance_management_engine` | 2026-06-18 17:51:19.608 | 2026-06-18 17:51:19.608 | No | Applied |
| `20260609070000_communication_engine` | 2026-06-18 17:51:19.608 | 2026-06-18 17:51:19.608 | No | Applied |
| `20260610080000_integration_center` | 2026-06-18 17:51:19.608 | 2026-06-18 17:51:19.608 | No | Applied |
| `20260610090000_security_center` | 2026-06-18 17:51:19.608 | 2026-06-18 17:51:19.608 | No | Applied |
| `20260615000000_add_advance_category` | 2026-06-18 17:51:19.608 | 2026-06-18 17:51:19.608 | No | Applied |
| `20260617100000_employeetarget_relations` | 2026-06-18 17:51:19.608 | 2026-06-18 17:51:19.608 | No | Applied |
| `20260618000000_master_data_linkage` | 2026-06-18 17:51:19.608 | 2026-06-18 17:51:19.608 | No | Applied |
| `20260618100000_crm_lead_customer_ref` | 2026-06-18 17:51:19.608 | 2026-06-18 17:51:19.608 | No | Applied |

**The 3 migrations expected to be UAT's outstanding gap** (per Session 9's bootstrap covering
through migration #19) — confirmed:

| Migration | Present? | Notes |
| --------- | -------- | ----- |
| `20260621120000_add_soft_delete_fields_phase_a` | **No** | Not in the 19-row list above |
| `20260622120000_decimal_release1_lakhs_to_inr` | **No** | Not in the 19-row list above |
| `20260623060000_decimal_release2_combined_inr_canonical` | **No** | Not in the 19-row list above |

**Confirmed exactly as predicted: UAT's `_prisma_migrations` gap is precisely these 3
migrations** — total row count (19) matches, and the full name list matches the documented
bootstrap set with no surprises.

---

## 3. Local vs. UAT migration comparison

| Local Migration Folder | Present In UAT? | UAT Status | Notes |
| ----------------------- | --------------------------- | -------------------- | ----- |
| `20260601000000_init_mysql` | Yes | Applied | |
| `20260602120000_finance_operations_phase1` | Yes | Applied | |
| `20260604000000_admin_console_foundation` | Yes | Applied | |
| `20260604120000_policy_engine_foundation` | Yes | Applied | |
| `20260604180000_workflow_engine` | Yes | Applied | |
| `20260604220000_master_data_management` | Yes | Applied | |
| `20260605000000_opportunity_discount_pct` | Yes | Applied | |
| `20260605010000_crm_admin_engine` | Yes | Applied | |
| `20260605020000_opportunity_won_fields` | Yes | Applied | |
| `20260605030000_legacy_promote_and_net_profit` | Yes | Applied | |
| `20260605050000_finance_admin_engine` | Yes | Applied | |
| `20260609060000_performance_management_engine` | Yes | Applied | |
| `20260609070000_communication_engine` | Yes | Applied | |
| `20260610080000_integration_center` | Yes | Applied | |
| `20260610090000_security_center` | Yes | Applied | |
| `20260615000000_add_advance_category` | Yes | Applied | |
| `20260617100000_employeetarget_relations` | Yes | Applied | |
| `20260618000000_master_data_linkage` | Yes | Applied | |
| `20260618100000_crm_lead_customer_ref` | Yes | Applied | |
| `20260621120000_add_soft_delete_fields_phase_a` | **No** | Missing | Must apply before Release 1/2 |
| `20260622120000_decimal_release1_lakhs_to_inr` | **No** | Missing | Must apply before Release 2 |
| `20260623060000_decimal_release2_combined_inr_canonical` | **No** | Missing | Must apply last |

---

## 4. Schema snapshot summary

**Every Release 1/2 column on UAT is still `double` (Float) or `text` (String) — none have been
converted to `Decimal` yet.** This matches dev's pre-migration state exactly; no surprises.

| Table | Column | Exists? | UAT Type | Dev Expected Type (post-migration) | Match? | Notes |
| ----- | ------ | ------- | -------- | ---------------------- | ------ | ----- |
| Expense | amountLakhs | Yes | `double`, NOT NULL, no default | Decimal(18,2) | Not yet migrated | |
| Expense | gstAmountLakhs | Yes | `double`, NOT NULL, default 0 | Decimal(18,2) | Not yet migrated | |
| EmployeeAdvance | amountLakhs | Yes | `double`, NOT NULL, no default | Decimal(18,2) | Not yet migrated | |
| EmployeeAdvance | disbursedAmountLakhs | Yes | `double`, NULLABLE | Decimal(18,2), nullable | Not yet migrated | |
| EmployeeAdvance | settledAmountLakhs | Yes | `double`, NULLABLE | Decimal(18,2), nullable | Not yet migrated | |
| EmployeeAdvance | balanceLakhs | Yes | `double`, NOT NULL, default 0 | Decimal(18,2) | Not yet migrated | |
| TravelClaim | amountLakhs | Yes | `double`, NOT NULL, default 0 | Decimal(18,2) | Not yet migrated | |
| TravelClaim | amountRupees | Yes | `double`, NOT NULL, default 0 | Decimal(18,2) | Not yet migrated | |
| TravelClaim | ratePerKm | Yes | `double`, NOT NULL, default 0 | Decimal(10,4) | Not yet migrated | |
| Payment | amountLakhs | Yes | `double`, NOT NULL, no default | Decimal(18,2) | Not yet migrated | |
| Collection | invoiceValueLakhs | Yes | `double`, NOT NULL, no default | Decimal(18,2) | Not yet migrated | |
| Collection | amountWithoutGstLakhs | Yes | `double`, NOT NULL, no default | Decimal(18,2) | Not yet migrated | |
| Collection | amountReceivedLakhs | Yes | `double`, NOT NULL, default 0 | Decimal(18,2) | Not yet migrated | |
| OrderAdvance | amountLakhs | Yes | `double`, NOT NULL, no default | Decimal(18,2) | Not yet migrated | |
| CrmLead | expectedValue | Yes | `double`, NOT NULL, default 0 | Decimal(18,2) | Not yet migrated | |
| CrmOpportunity | value | Yes | `double`, NOT NULL, default 0 | Decimal(18,2) | Not yet migrated | |
| CrmOpportunity | dealValueExTax | Yes | `double`, NOT NULL, default 0 | Decimal(18,2) | Not yet migrated | |
| CrmOpportunity | netProfitLakhs | Yes | `double`, NOT NULL, default 0 | Decimal(18,2) | Not yet migrated | |
| SalesFunnel | dealValueLakhs | Yes | `double`, NOT NULL, default 0 | Decimal(18,2) | Not yet migrated | |
| SalesFunnel | billingValueLakhs | Yes | `double`, NOT NULL, default 0 | Decimal(18,2) | Not yet migrated | |
| kra_template_item | expectedTarget/minimumTarget/stretchTarget | Yes | `double`, NOT NULL, default 0 (each) | Float — unchanged by design | Matches (column type never changes) | **Table has 0 rows on UAT — see Section 7** |
| KRA | target | Yes | `text`, NOT NULL, no default | String/Text (free-text; values converted, not column type) | Matches (column type never changes) | 34 rows present |
| employee_target | targetJson | Yes | `text`, NOT NULL, default `''` | String/Text | Matches (column type never changes) | **0 rows on UAT** |
| team_target | targetJson | Yes | `text`, NOT NULL, default `''` | String/Text | Matches (column type never changes) | **0 rows on UAT**, table exists |
| Voucher | amountLakhs | Yes | `double`, NOT NULL, no default | Should remain Float — excluded | Correct — unchanged | 0 rows |
| Ledger | amountLakhs | Yes | `double`, NOT NULL, no default | Should remain Float — excluded | Correct — unchanged | 0 rows |
| FinAccount | openingBalance/currentBalance | Yes | `double`, NOT NULL, default 0 (each) | Should remain Float — excluded | Correct — unchanged | 0 rows |

**Conclusion: UAT's schema is in exactly the expected pre-migration state.** No partial/drifted
migration was found — every in-scope column is still Float/Text, consistent with the
`_prisma_migrations` finding in Section 2.

---

## 5. Row count summary

| Table/Model | UAT Row Count | Notes |
| ----------- | --------------------: | ----- |
| Expense | 0 | |
| EmployeeAdvance | 0 | |
| TravelClaim | 0 | |
| Payment | 26 | Matches Session 9's documented ~26 |
| Collection | 141 | Matches Session 9's documented ~141 |
| OrderAdvance | 3 | |
| CrmLead | 280 | Matches Session 9's documented ~280 |
| CrmOpportunity | 49 | Matches Session 9's documented ~49 |
| SalesFunnel | 100 | Matches Session 9's documented ~100 |
| kra_template_item | **0** | **Surprise — see Section 7** |
| KRA | 34 | Matches Session 9's documented ~34 |
| employee_target | 0 | |
| team_target | 0 | Matches dev (0 rows) |
| Voucher | 0 | |
| Ledger | 0 | |
| FinAccount | 0 | |

All counts that Session 9 estimated were confirmed exactly. The one new fact: `kra_template_item`
(and, per the table-discovery scan, `kra_metric` and `kra_template` too) have **zero rows** on
UAT — the structured KRA template/metric engine is completely unpopulated there.

---

## 6. Unit sampling summary

| Model | Field | Min | Max | Nulls | Negatives | Likely Current Unit | Notes |
| ----- | ----- | --: | --: | ----: | --------: | -------------------- | ----- |
| Expense | amountLakhs | — | — | — | — | N/A | 0 rows, nothing to sample |
| EmployeeAdvance | amountLakhs/disbursed/settled/balance | — | — | — | — | N/A | 0 rows |
| TravelClaim | amountLakhs/amountRupees/ratePerKm | — | — | — | — | N/A | 0 rows |
| Payment | amountLakhs | 0.01 | 1,000,000 | 0 | 0 | **INR, not Lakhs — see CRITICAL FINDING below** | 26 rows |
| Collection | invoiceValueLakhs | 21.3344 | 7,979,986 | 0 | 0 | **INR, not Lakhs — see CRITICAL FINDING below** | 141 rows |
| Collection | amountWithoutGstLakhs | 2.5424 | 6,762,700 | 0 | 0 | **INR, not Lakhs — see CRITICAL FINDING below** | 141 rows |
| Collection | amountReceivedLakhs | 0 | 7,788,000 | 0 | 0 | **INR, not Lakhs — see CRITICAL FINDING below** | 141 rows |
| OrderAdvance | amountLakhs | 37,967 | 341,964 | 0 | 0 | **INR, not Lakhs — see CRITICAL FINDING below** | 3 rows |
| CrmLead | expectedValue | 0 | 120 | 0 | 0 | **Lakhs — consistent with dev's assumption** | 280 rows |
| CrmOpportunity | value | -0.1 | 120 | 0 | **1** | Lakhs, but **1 negative row found** | 49 rows — flag the negative for business review |
| CrmOpportunity | dealValueExTax | 0 | 0 | 0 | 0 | Unclear — all-zero column, can't infer | 49 rows, no variance to sample |
| CrmOpportunity | netProfitLakhs | 0 | 0 | 0 | 0 | Unclear — all-zero column, can't infer | 49 rows, no variance to sample |
| SalesFunnel | dealValueLakhs | 0.002733 | 43.032004 | 0 | 0 | Lakhs — consistent with dev's assumption | 100 rows |
| SalesFunnel | billingValueLakhs | 0 | 50.77776472 | 0 | 0 | Lakhs — consistent with dev's assumption | 100 rows |

### CRITICAL FINDING — unit split across Release 2 fields, not a uniform "all Lakhs" assumption

`Payment.amountLakhs`, `Collection.invoiceValueLakhs`/`amountWithoutGstLakhs`/
`amountReceivedLakhs`, and `OrderAdvance.amountLakhs` all show maximum values in the
**hundreds-of-thousands to millions** range (e.g. a single `Collection.invoiceValueLakhs` row at
7,979,986). If these were genuinely ₹ Lakhs, that single invoice would represent ≈₹798 billion —
not plausible for this business. **These columns on UAT appear to already store actual ₹ INR
values, not ₹ Lakhs**, despite the column names and the project-wide "money is stored in ₹
Lakhs" convention (`CLAUDE.md` rule 5).

By contrast, `CrmLead.expectedValue` (max 120) and `SalesFunnel.dealValueLakhs`/
`billingValueLakhs` (max ~43/~51) sit in a plausible Lakhs range (≤₹1.2 Cr-ish deal sizes) —
consistent with dev's pre-migration assumption.

**This means the planned Release 2 migration formula (multiply by 100,000 to convert Lakhs→INR)
cannot be safely applied uniformly to UAT's data.** Applying it to `Payment`/`Collection`/
`OrderAdvance` as currently planned would inflate already-correct INR values by 100,000× —
e.g. a real ₹79,79,986 invoice would become an absurd ₹7,97,99,86,00,00,000. This must be
resolved with a business-side/source-data review before any UAT (or production) migration touches
these three models — **do not assume UAT mirrors dev's "everything is Lakhs" pre-migration
state.**

(Separately, `CrmOpportunity.value` has exactly one row with a negative value, `-0.1` — flag for
manual review; not large enough to block but should not be silently carried through a migration
without a business decision on what it means.)

---

## 7. KRA / Sales target findings

| Area | UAT Finding | Migration Risk | Notes |
| ---- | ------------------------ | ---------------- | ----- |
| `kra_metric` taxonomy | **Table has 0 rows on UAT.** No taxonomy exists to classify — neither dev's AMOUNT/PERCENTAGE/COUNT nor the seed-file's REVENUE/ACTIVITY/QUALITY/COMPLIANCE. | Low for the structured engine (nothing to corrupt) | The structured KRA metric/template system is simply unpopulated on UAT |
| `kra_template_item` rows with `targetType` ≠ linked `metric.metricType` | **N/A — 0 rows in `kra_template_item`,** so the join in the SQL pack's Section 6b/6c returns nothing. Dev's "item #16, Team Pipeline Coverage" mismatch has no UAT equivalent because no template items exist at all. | None (no rows to mismatch) | This UAT data shape is materially different from dev — UAT's live KRA scoring runs entirely on the legacy free-text `KRA.target` field, not the structured template/metric tables |
| `KRA.target` confirmed-money labels | **Only 2 of dev's 6 documented money labels appear: `total sales revenue - booking` and `total sales revenue - billing`** (values like 70, 63, 120, 108, 75, 67.5 — Lakhs-scale, consistent with the Lakhs assumption). The other 4 dev-documented labels (`total funnel / pipeline value created`, `total team booking target achievement`, `total team billing achievement`, `total team pipeline coverage`) **do not appear in this UAT sample.** Instead, UAT's `KRA.target` rows use different category structures — `Sales Revenue targets`, `Customer & Business Development`, `Sales management`, `Focus area revenue achievement`, `Sales Operations Excellence` — with non-money sub-keys like `qualified leads generation: 20` (count), `forecast accuracy: 0.9` (ratio/%), `network & security: 0.35` (weight/%). | **Medium** — a migration script that string-matches dev's 6 documented labels would only convert 2 of them correctly on UAT; the other money-looking values (if any exist further down in UAT's 34 rows) wouldn't be touched, and non-money keys must not be touched at all | **UAT's `KRA.target` label set must be independently re-classified before any data-transform runs against it — do not reuse dev's label list as-is.** Only a 20-row sample (ids 38–57) was reviewed; the full 34-row set should be reviewed before migration |
| `employee_target.targetJson` | **0 rows on UAT** — nothing to sample or classify | None (no rows) | |
| `team_target` row count | **0 rows**, matches dev exactly | None | |

---

## 8. Branch/app gap confirmation

Not collected in this run — the operator's SSH session was used for the database checks only.
Separately confirmed during this step: `public_html` on the UAT server has **no `.git`
directory** (deploys via build artifacts, not a live git checkout), so `git rev-parse HEAD`
cannot be used there. Confirming the deployed app commit/code would need a different method
(e.g. checking a deployed build manifest or asking whoever runs `deploy-uat.mjs` for the last
deploy's commit hash).

| Check | Result |
| ----- | ------ |
| Commit/tag currently deployed to UAT | Needs verification — not collected this run |
| Does it match `uat`'s current HEAD? | Needs verification |
| Does `src/lib/money.ts` exist in the deployed code? | Needs verification |
| Does the deployed `prisma/schema.prisma` show Release 1/2 fields as `Decimal` or `Float`? | Needs verification via deployed code — but the **live database** schema (Section 4) is confirmed Float/Text, which is the fact that actually matters for migration risk |

---

## 9. Backup / test-user / write-freeze confirmation

Not collected in this run — out of scope for the read-only SQL pack itself; these are
operational pre-checks for whoever schedules the actual migration.

| Check | Result |
| ----- | ------ |
| Full UAT backup taken and verified restorable? | Needs verification — not yet done |
| At least one Manager-tier test login confirmed working? | Needs verification |
| At least one Employee-tier test login confirmed working? | Needs verification |
| Write-freeze decision made? | Needs verification |

---

## 10. Blockers found

1. **Unit inconsistency in `Payment`/`Collection`/`OrderAdvance` data (Section 6)** — these
   fields appear to already hold actual INR values on UAT, not Lakhs, contradicting the
   migration's planned ×100,000 transform for those models. **This blocks running the Release 2
   migration as currently designed against UAT until resolved.**
2. **UAT's `KRA.target` free-text label set differs from dev's documented 6 money labels
   (Section 7)** — only 2 of 6 appear in the sample reviewed. The data-transform step for
   `KRA.target`/`EmployeeTarget.targetJson` needs UAT-specific re-classification, not reuse of
   dev's label list.
3. **One negative value found in `CrmOpportunity.value`** (-0.1) — needs a business decision on
   how to handle before migration, not a blocker by itself but should not be silently converted.
4. Branch/app gap (Section 8) and backup/test-user/write-freeze (Section 9) were not collected in
   this run — still open before scheduling actual execution.

---

## 11. Recommended next action

**Do not run the UAT migration yet.** The schema/migration-history findings are clean and exactly
as predicted (19/22 migrations applied, all in-scope columns still Float/Text) — that part is
ready. But two data-shape findings are new and must be resolved first:

1. Get a business-side or source-system answer on why `Payment`/`Collection`/`OrderAdvance` data
   on UAT looks like it's already in INR rather than Lakhs — this determines whether those 3
   models' migration formula needs to be conditional/different on UAT (and, by extension,
   whether production might have the same characteristic — worth checking once production access
   exists).
2. Re-derive the actual confirmed-money label set from all 34 `KRA.target` rows (only 20 were
   sampled here) before reusing the Release 2 data-transform script's hardcoded 6 dev labels
   against UAT.

Once those two are resolved, the previously-blocked Section 8/9 checks (deployed commit, backup,
test logins, write-freeze) should be completed, and only then should the UAT migration execution
sequence (`UAT_DECIMAL_INR_MIGRATION_PLAN.md` §4) be considered for actual execution — and only
when explicitly instructed.
