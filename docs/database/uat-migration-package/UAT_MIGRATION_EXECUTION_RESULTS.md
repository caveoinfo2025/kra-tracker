# UAT Decimal / INR Migration — Execution Results

> Step 4G (2026-06-24). This record documents the actual execution of the UAT-specific
> Decimal/INR migration against the live UAT database, run under the risk exception approved
> in Step 4F-1 (`UAT_BACKUP_ROLLBACK_RECORD.md`, `UAT_MIGRATION_APPROVAL_RECORD.md`). **Schema
> and data changes are applied. Migration-history bookkeeping (`_prisma_migrations`) and the
> `KRA.target` free-text transform are NOT complete** — both are documented honestly below as
> open items, not silently skipped.

## 1. Execution timestamp

2026-06-24 (see individual statement logs for exact ISO timestamps;
`UAT_MIGRATION_SQL_EXECUTION_LOG_20260624.md` and the snapshot/verification result files record
the precise moment each ran).

## 2. Executed by

Run by this assistant, at Vijesh Vijayan's explicit instruction and with a UAT credential
(`u686730471_caveouat`) that Vijesh Vijayan provided and confirmed working via direct phpMyAdmin
login. Branch/commit at time of execution: `uat` @ `556a0e122706d8514d3083fe40acd365a51972f4`.

## 3. UAT DB confirmed

Live `SELECT DATABASE()` returned `u686730471_Caveo_UAT` (MariaDB `11.8.6-MariaDB-log`) —
re-verified independently at the start of every script (snapshot, migration SQL, KRA-script
check, migrate-resolve attempt, verification) before any statement ran. No statement was ever
issued without this guard passing first.

## 4. Backup risk exception reference

See `UAT_BACKUP_ROLLBACK_RECORD.md` and `UAT_MIGRATION_APPROVAL_RECORD.md` (Step 4F-1,
2026-06-24) — Vijesh Vijayan, named approving owner, explicitly accepted the risk of an
unperformed live restore test before this execution proceeded. Backup file:
`u686730471_Caveo_UAT_240626.sql`.

**Retroactive note:** this step's live pre-migration row counts (Payment 26, Collection 141,
OrderAdvance 3, CrmLead 280, CrmOpportunity 49, SalesFunnel 100, KRA 34, all others 0) exactly
match the in-file counts extracted from the backup dump during Step 4F-1's structural check —
this is independent evidence (not proof of restorability) that the backup's content was
consistent with UAT at that point in time.

## 5. Pre-migration snapshot summary

Full output: `UAT_PRE_MIGRATION_SNAPSHOT_RESULT_20260624.md` (29 statements, 0 errors).

- DB identity confirmed; the 3 target migrations confirmed **not yet applied** (0 rows matched).
- All 27 in-scope numeric columns confirmed still `double`; 3 text columns (`KRA.target`,
  `employee_target.targetJson`, `team_target.targetJson`) confirmed still `text` — no pre-existing
  drift.
- Row counts captured for all 16 tables — exactly matched documented Step 4B/4D history.
- Baseline checksums captured: `Payment.amountLakhs` = 4,109,837.06; `Collection.invoiceValueLakhs`
  = 58,499,554.543; `Collection.amountWithoutGstLakhs` = 49,041,707.4093; `Collection.amountReceivedLakhs`
  = 38,666,388.7294; `OrderAdvance.amountLakhs` = 721,895; `CrmLead.expectedValue` = 573.3844;
  `CrmOpportunity.value` = 501.1844 (`dealValueExTax`/`netProfitLakhs` = 0); `SalesFunnel.dealValueLakhs`
  = 356.33308940; `SalesFunnel.billingValueLakhs` = 283.48891167.
- Full 34-row `KRA.target` dump captured for later diff.
- `CrmOpportunity` row 42 confirmed `value = -0.1` (the known data-quality artifact) before
  migration.

## 6. SQL execution summary

Full log: `UAT_MIGRATION_SQL_EXECUTION_LOG_20260624.md` (36 statements, **0 errors, all
succeeded**).

- **Section 1 (soft-delete Phase A):** 7× `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` +
  7× `CREATE INDEX IF NOT EXISTS` — all succeeded.
- **Section 2 (Release 1 — Expense/EmployeeAdvance/TravelClaim):** type conversion + multiply,
  all genuine no-ops (0 rows each table on UAT) — ran cleanly.
- **Section 3 (Payment/Collection/OrderAdvance — type-only):** `ALTER TABLE ... MODIFY` ran with
  `affectedRows` = 26 / 141 / 3 respectively (row-rewrite count, not a value change) — **no
  multiply statement exists in this section, and none ran.**
- **Section 4 (CrmLead/CrmOpportunity/SalesFunnel — multiply ×100,000):** `UPDATE` statements
  ran with `affectedRows` matching each table's row count (280 / 49×3 / 100×2), followed by
  `ALTER TABLE ... MODIFY` to `Decimal`.
- No `DROP`/`TRUNCATE`/`GRANT`/`REVOKE`/`DELETE` statement exists in the file or ran. No
  production reference. No Voucher/Ledger/FinAccount touched.

## 7. KRA transform execution summary

**Not executed.** `scripts/uat-transform-kra-target.mjs` was run with
`CONFIRM_UAT_DECIMAL_INR_MIGRATION=YES` and a correct, identity-confirmed `DATABASE_URL`. It
validated the DB name, printed the 6-label allowlist, and then exited cleanly (exit code 0) at
its designed early-exit point — its actual read/transform/write logic remains commented out in
the file, exactly as documented in the dry-run checklist's "Known Limitations." **Per explicit
instruction, no manual SQL was substituted for this step.** `KRA.target` is confirmed
byte-for-byte identical before and after (diffed directly — see §9 below) — exactly the correct
outcome given the script never ran.

## 8. Migration history update summary

**Not completed.** `prisma migrate resolve --applied <name>` was attempted for all 3 migration
names (`20260621120000_add_soft_delete_fields_phase_a`, `20260622120000_decimal_release1_lakhs_to_inr`,
`20260623060000_decimal_release2_combined_inr_canonical`) but was blocked by this environment's
own safety classifier before any call ran, on the grounds that it's a high-severity,
hard-to-reverse change to a live database. No workaround (e.g. a manual `INSERT INTO
_prisma_migrations`) was attempted, per instruction not to improvise around guarded steps.

**Important clarification on scope:** dev's own original `migration.sql` for
`20260623060000_decimal_release2_combined_inr_canonical` never included the `KRA.target`
transform either — it was always handled by a separate, untracked script on dev too. This means
the SQL-tracked scope of all 3 migrations (Sections 1–4 of the UAT package) is now **fully and
correctly applied** to UAT; only the bookkeeping row in `_prisma_migrations` is outstanding, not
any further schema/data work.

`_prisma_migrations` currently still shows 19 total rows (unchanged) and 0 of the 3 target
migration names present — confirmed live in the post-migration verification (§9).

## 9. Post-migration verification summary

Full output: `UAT_POST_MIGRATION_VERIFICATION_RESULT_20260624.md` (27 statements, 0 errors).

| Check | Result |
| ----- | ------ |
| Column types | 19× `decimal(18,2)` + 1× `decimal(10,4)` (`TravelClaim.ratePerKm`) — exactly the 20 expected fields. 7× `double` unchanged (`kra_template_item` ×3, `Voucher`, `Ledger`, `FinAccount` ×2). 10× `text` unchanged (`KRA.target`, `targetJson` ×2, `deleteReason` ×7). 7× `datetime(3)` + 7× `int(11)` (new soft-delete columns). |
| Payment/Collection/OrderAdvance NOT multiplied | Confirmed. `Payment.amountLakhs` 4,109,837.06 → 4,109,837.06 (exact). `OrderAdvance.amountLakhs` 721,895 → 721,895.00 (exact). `Collection`'s 3 fields match pre-migration to the cent (sub-cent differences are `Decimal(18,2)` rounding of already-fractional doubles, not a multiply). |
| CrmLead/CrmOpportunity/SalesFunnel multiplied ×100,000 | Confirmed. `CrmLead.expectedValue` 573.3844 → 57,338,440.00 (exact ×100,000). `CrmOpportunity.value` 501.1844 → 50,118,440.00 (exact). `SalesFunnel.dealValueLakhs` exact; `SalesFunnel.billingValueLakhs` off by ₹0.01 on a ₹2.83-crore total — expected per-row Decimal-rounding noise across 100 summed rows, not a multiply error. |
| Row 42 spot-check | `CrmOpportunity` id 42: `value = -10000.00` — exactly `-0.1 × 100,000`, confirming the known data-quality row was transformed consistently, not skipped. |
| `KRA.target` | 34 rows, **byte-for-byte identical** to the pre-migration dump (diffed directly) — correct, since the transform script did not run. |
| `employee_target`/`team_target` | Both still 0 rows — unchanged no-op, as expected. |
| Soft-delete fields | All 21 columns (`deleteReason`/`deletedAt`/`deletedById` × 7 tables) present. All 7 `*_deletedAt_idx` indexes present. |
| `_prisma_migrations` | 0 of the 3 target migrations present; total rows still 19 (unchanged) — confirms the open Step 5 gap, nothing more. |

**No unexpected finding anywhere.** Every result matches what the migration plan's own comments
predicted, including the known row-42 anomaly and the documented rounding-tolerance note.

## 10. Errors/warnings

- 0 errors during the pre-migration snapshot (29/29 statements).
- 0 errors during the migration SQL execution (36/36 statements).
- 0 errors during the post-migration verification (27/27 statements).
- 1 environment-level block (not a SQL error): `prisma migrate resolve` refused by this
  environment's safety classifier — see §8.
- 1 design-level non-event (not an error): the KRA transform script's own early-exit, exactly as
  documented — see §7.

## 11. Rollback status

**Unchanged from Step 4F-1: Approved with risk exception, rollback confidence reduced.** The
only rollback path remains restoring `u686730471_Caveo_UAT_240626.sql`, which has still not been
restore-tested to a scratch database. This migration's actual execution does not change that
risk profile — it was accepted before this step ran, per Step 4F-1.

## 12. Next testing actions

1. **Close the migration-history gap.** Someone with direct UAT access (or the ability to grant
   this environment a one-time, explicitly-scoped permission) should run the 3
   `prisma migrate resolve --applied <name>` calls listed in §8 directly, then re-run §9's
   Section 7 query to confirm `_prisma_migrations` shows all 3 rows.
2. **Run the KRA.target transform** via `scripts/uat-transform-kra-target.mjs` with its
   commented-out execution path uncommented and reviewed — or have a human run the equivalent
   transform directly — to complete Release 2's free-text scope. Until then, KRA scoring on UAT
   continues to compare INR (Collection, once UAT's app code reads it) against un-multiplied
   Lakhs-scale money labels in `KRA.target` — this is a real functional gap for KRA-related UAT
   testing, not just a bookkeeping one.
3. **Step 4H — UAT post-migration functional testing** can begin for the Finance and Sales areas
   (Payment/Collection/OrderAdvance/CrmLead/CrmOpportunity/SalesFunnel) since their data is fully
   and correctly migrated. **KRA functional testing should wait** until item 2 above is resolved,
   since `KRA.target`'s money labels are not yet in INR.
4. Confirm what app commit is actually deployed on the UAT server (still an open item from Step
   4B) before doing any UI-level verification — the schema is now ahead of what may be deployed.
5. Restore-test the backup (`u686730471_Caveo_UAT_240626.sql`) when DB tooling becomes available,
   to retroactively close the Step 4F-1 risk exception with real evidence.
