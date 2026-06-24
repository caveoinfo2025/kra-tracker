# UAT Decimal / INR Migration — Execution Results

> Step 4G (2026-06-24). This record documents the actual execution of the UAT-specific
> Decimal/INR migration against the live UAT database, run under the risk exception approved
> in Step 4F-1 (`UAT_BACKUP_ROLLBACK_RECORD.md`, `UAT_MIGRATION_APPROVAL_RECORD.md`). **Schema
> and data changes are applied. Migration-history bookkeeping (`_prisma_migrations`) and the
> `KRA.target` free-text transform are NOT complete** — both are documented honestly below as
> open items, not silently skipped.
>
> **Step 4G-1 (2026-06-24) update: both open items are now closed.** The `KRA.target`
> transform was executed (8/34 rows changed, only the 6 approved money labels) and all 3
> migrations were marked applied via `prisma migrate resolve`. See §13–§15 below.

## Secret Hygiene Follow-Up

Step 4G-1 Task 1 found a real secret-hygiene issue, separate from the one this file originally
flagged: `.env.uat.example` (tracked, committed) contained a real-looking password
(`C%40veo%402026`, decoding to `C@veo@2026`, against username `u686730471_uatuser`) instead of
the `YOUR_UAT_DB_PASSWORD` placeholder. It was introduced in commit `749ea28` (2026-06-16) and
was already pushed to `origin/uat` on the **public** `caveoinfo2025/kra-tracker` GitHub repo.

Per Vijesh Vijayan (confirmed live, 2026-06-24): this credential is **stale/inactive**, not the
real working UAT credential (the working credential is `u686730471_caveouat` against
`u686730471_Caveo_UAT`, stored only in the gitignored `.env.uat`, never committed). No rotation
was required, but the tracked file was still fixed for hygiene: `.env.uat.example`'s
`DATABASE_URL` was reverted to the safe `YOUR_UAT_DB_PASSWORD` placeholder in a new commit.

This fix only changes the file going forward — the real-looking value remains visible in git
history (`749ea28` and its descendants) on the public repo. No history rewrite/force-push was
performed (out of scope for this step, requires separate explicit approval).

Re-verified before any live UAT action this step: `git status --short` clean (no untracked/
modified `.env.uat`), `.env.uat` correctly gitignored and not staged, `.env.uat.example`
diffed clean against HEAD before the fix, no generated log file or result file under
`docs/database/uat-migration-package/results/` contains any password (every script in this
step masks `DATABASE_URL` to `dbname` + `host-label.***` only).

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

## 13. Step 4G-1 KRA Transform Dry Run

Ran `scripts/uat-transform-kra-target.mjs` against UAT with no `CONFIRM_UAT_KRA_TARGET_TRANSFORM`
set (default dry-run mode, read-only). The script first parsed every label in all 34 rows and
flagged 5 rows (#40/45/50/55/60) for an apparent "unexpected label" — investigation showed this
was a genuine UAT data-entry artifact (`non-obligatory" proof of concept (poc)` — a stray
embedded quote character, not a new/unclassified label; values 4/8/10/2 exactly match the
already-documented non-money count for this label). The script was updated to normalize stray
`"` characters before label-matching (classification unchanged — still excluded as non-money) and
re-run cleanly.

Result: 8 of 34 rows proposed for change, only the 6 approved money labels touched in those rows,
every non-money label in every row left untouched. No unexpected labels remained after the fix.
No data was written. Full output saved to
`docs/database/uat-migration-package/results/uat-kra-target-dry-run-20260624060625.md` (plus the
pre-transform snapshot in `uat-kra-target-pre-transform-20260624060625.md`).

## 14. Step 4G-1 KRA Transform Execution

Ran the same script with `CONFIRM_UAT_KRA_TARGET_TRANSFORM=YES` against the live UAT database.

- **Rows reviewed:** 34
- **Rows changed:** 8 (`KRA` ids 38, 43, 48, 53, 58, 65, 68, 71)
- **Labels transformed (×100,000):** `total sales revenue - booking`, `total sales revenue -
  billing` (rows 38/43/48/53/58), `total funnel / pipeline value created (₹ lakhs)` (row 65),
  `total team booking target achievement (₹ lakhs)`, `total team billing achievement` (row 68),
  `total team pipeline coverage (₹ lakhs)` (row 71)
- **Labels skipped (left unchanged):** all 31 known non-money labels across all 34 rows — e.g.
  `average gross profit margin`, `payment collections within due dates & credit days reduction`,
  `qualified leads generation`, `forecast accuracy`, `average deal win rate`, the
  `non-obligatory" proof of concept (poc)` quirk-labeled rows, etc.
- **Before/after example:** row 38 — `total sales revenue - booking: 70` → `: 7000000`;
  `total sales revenue - billing: 63` → `: 6300000`; `average gross profit margin: 6.5`
  unchanged.
- Write ran inside a single transaction; committed once all 8 rows were staged.
- `employee_target`/`team_target` confirmed still 0 rows after the transform (re-queried in the
  same run).
- No non-money label changed anywhere in the 34-row set (confirmed in §15 below).

Full output: `docs/database/uat-migration-package/results/uat-kra-target-execution-20260624060625.md`.

## 15. Step 4G-1 KRA Post-Transform Verification

Read-only re-query of all 34 `KRA.target` rows plus `employee_target`/`team_target` counts.

- Row count: still 34.
- The 6 approved money labels are now INR-scale in exactly the 8 rows expected (e.g. row 71's
  `total team pipeline coverage (₹ lakhs)`: `1500` → `150000000`).
- Every non-money label across all 34 rows is byte-for-byte unchanged from the pre-transform
  snapshot.
- `employee_target`/`team_target`: still 0 rows each.
- Checksum (`SHA-256` of all `id|target` concatenated) changed from
  `7a4529e5265c39fdb1bec0dfb115081e2bf7ca97d848c301b66331fc49e317e7` (pre) to
  `9dec2b264efb96755e84812042cd9c0618b1b6e79230d5d1dba641d8b34f41af` (post) — expected, since 8
  of 34 rows changed.

Full output: `docs/database/uat-migration-package/results/uat-kra-target-post-verification-20260624060625.md`.

## 16. Step 4G-1 Migration History Alignment

`npx prisma migrate resolve --applied <name>` was run (with `DATABASE_URL` pointed at UAT,
DB identity re-confirmed `u686730471_Caveo_UAT` before each call) for all 3 target migrations.
Unlike Step 4G, this environment did not block the calls this time — all 3 succeeded:

- `20260621120000_add_soft_delete_fields_phase_a` — marked as applied.
- `20260622120000_decimal_release1_lakhs_to_inr` — marked as applied.
- `20260623060000_decimal_release2_combined_inr_canonical` — marked as applied.

Verification: `_prisma_migrations` row count increased from 19 to **22**; all 3 target migration
names now present with `finished_at` populated and `rolled_back_at` NULL; no duplicate rows; no
failed migration entries. `applied_steps_count = 0` for all 3 — expected for `migrate resolve`
(it records history, it does not replay steps).

Full output: `docs/database/uat-migration-package/results/uat-migration-history-alignment-20260624060625.md`.

## 17. Step 4G-1 Full Post-Migration Re-Verification

Re-ran `uat-decimal-inr-post-migration-verification.sql` in full (27/27 statements, 0 errors)
after both items above closed:

- Column types unchanged from §9 (still correct).
- Payment/Collection/OrderAdvance totals unchanged (still not multiplied) — exact match to §9.
- CrmLead/CrmOpportunity/SalesFunnel totals unchanged (still correctly ×100,000) — exact match
  to §9, including the row-42 spot-check (`value = -10000.00`).
- `KRA.target`: now reflects the transform — 8/34 rows changed, exactly as documented in §15.
- `employee_target`/`team_target`: still 0/0.
- Soft-delete columns/indexes: unchanged, all present.
- `_prisma_migrations`: now 22 rows, all 3 target migrations present — migration history is
  **aligned**, no longer pending.

Full output: `docs/database/uat-migration-package/results/uat-full-post-migration-verification-20260624060625.md`.

## 12. Next testing actions (superseded by Step 4G-1 — see §13–§17 above)

1. ~~Close the migration-history gap.~~ **Closed in Step 4G-1 (§16)** — all 3 migrations now
   recorded in `_prisma_migrations` (22 total rows).
2. ~~Run the KRA.target transform.~~ **Closed in Step 4G-1 (§13–§15)** — 8/34 rows transformed,
   verified clean.
3. **Step 4H — UAT post-migration functional testing can now begin for both Finance/Sales and
   KRA areas.** The KRA-testing blocker from this section's original item 2 no longer applies —
   `KRA.target`'s money labels are now in INR and verified unchanged elsewhere.
4. Confirm what app commit is actually deployed on the UAT server (still an open item from Step
   4B) before doing any UI-level verification — the schema is now ahead of what may be deployed.
5. Restore-test the backup (`u686730471_Caveo_UAT_240626.sql`) when DB tooling becomes available,
   to retroactively close the Step 4F-1 risk exception with real evidence. **Still pending** —
   Step 4G-1 did not touch backup/restore-test status.
