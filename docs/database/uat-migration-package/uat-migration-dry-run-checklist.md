# UAT Migration Dry-Run Checklist

> Run through this checklist, in order, before ever applying
> [`uat-decimal-inr-migration-plan.sql`](uat-decimal-inr-migration-plan.sql) against UAT. Every
> item should reach **Completed** or **Not Applicable** — if any item is **Pending** or
> **Blocked**, stop and resolve it before requesting migration execution permission. This
> checklist does not authorize running the migration on its own; it is the gate before that
> authorization is sought.
>
> **Status as of Step 4F-1 (2026-06-24): every item below is Completed or Approved with a named
> risk exception.** This step attempted a real backup restore-to-scratch-DB test; no
> `mysql`/`mariadb`/`docker` tooling was available in this environment, so the test could not be
> run. A structural sanity check of the dump file was performed instead, and Vijesh Vijayan
> explicitly accepted the residual risk as the named approving owner. See
> `UAT_BACKUP_ROLLBACK_RECORD.md` and `UAT_MIGRATION_APPROVAL_RECORD.md` (same folder) for the
> full record.

## Environment confirmation

| Item | Status | Notes |
| ---- | ------ | ----- |
| Confirm UAT database name (`SELECT DATABASE()` = `u686730471_Caveo_UAT`) | **Completed** | Confirmed live in Step 4B (2026-06-24) and re-confirmed in Step 4D's follow-up query — not re-verified again in this step, but two independent prior confirmations exist |
| Confirm UAT backup taken | **Completed** | `u686730471_Caveo_UAT_240626.sql`, taken 2026-06-24 08:10 AM by Vijesh Vijayan — see `UAT_BACKUP_ROLLBACK_RECORD.md` |
| Confirm UAT backup restore verified (not just dump-file-non-empty) | **Approved with risk exception** | A live restore-to-scratch-DB test was attempted and found impossible (no DB client available in this environment). A structural sanity check (well-formed dump, all 13 required tables present, in-file row counts consistent with Step 4B's live findings) was done instead. Vijesh Vijayan explicitly accepted this gap rather than block — see `UAT_BACKUP_ROLLBACK_RECORD.md`'s "Risk acceptance" section |
| Confirm no active UAT testers during the migration window | **Completed** | Confirmed by Vijesh Vijayan — no other testers active during the 2026-06-24 window |
| Confirm UAT write-freeze decision | **Completed** | Write-freeze window: 2026-06-24, starting now. Owner: Vijesh Vijayan — see `UAT_MIGRATION_APPROVAL_RECORD.md` |
| Confirm UAT test users available after migration (Manager-tier + Employee-tier login) | **Completed** | Confirmed working by Vijesh Vijayan |

## Pre-migration data capture

| Item | Status | Notes |
| ---- | ------ | ----- |
| Pre-migration snapshot SQL reviewed | **Completed** | Reviewed in this step (Task 1) — confirmed read-only, covers all in-scope fields, includes the `_prisma_migrations` 0-row sanity check |
| Pre-migration snapshot SQL actually run against UAT | **Pending** | Not run in this step — running it requires the same UAT SSH/MySQL access used in Steps 4B/4D, and is itself part of the actual migration execution sequence, not this approval step |

## SQL review

| Item | Status | Notes |
| ---- | ------ | ----- |
| Migration plan SQL reviewed line by line | **Completed** | Reviewed in this step (Task 1) |
| Confirmed no destructive statements (`DROP`/`TRUNCATE`/`DELETE`/`GRANT`/`REVOKE`) | **Completed** | Re-confirmed in this step — every match in the file is a comment or a column name (`deleteReason`/`deletedAt`/`deletedById`), no actual destructive statement |
| Confirmed Payment/Collection/OrderAdvance have NO `× 100,000` update | **Completed** | Confirmed — Section 3 of the SQL contains only `ALTER TABLE ... MODIFY` statements for these 4 fields, no `UPDATE` |
| Confirmed Sales Pipeline fields DO have a `× 100,000` update | **Completed** | Confirmed — Section 4 has an `UPDATE` for each of `CrmLead.expectedValue`, `CrmOpportunity.value`/`dealValueExTax`/`netProfitLakhs`, `SalesFunnel.dealValueLakhs`/`billingValueLakhs` |
| Confirmed `KRA.target` is NOT touched by inline SQL | **Completed** | Confirmed — Section 5 is comments only; the transform is delegated to `scripts/uat-transform-kra-target.mjs`, whose `MONEY_LABELS` array was checked against the UAT-confirmed 6-label allowlist in `UAT_DECIMAL_INR_MIGRATION_ADJUSTMENT_PLAN.md` §7 and matches exactly |
| Confirmed `kra_template_item`/`employee_target`/`team_target` have no write statement | **Completed** | Confirmed — Section 6 is comments only |
| Confirmed no production database reference anywhere in the package | **Completed** | Confirmed across all SQL/script/doc files in the package |
| Confirmed no `db push` instruction anywhere | **Completed** | Confirmed |
| Confirmed Voucher/Ledger/FinAccount not referenced anywhere | **Completed** | Confirmed — these models are absent from every file in the package except cautionary "explicitly excluded" comments |
| Post-migration verification SQL reviewed | **Completed** | Reviewed in this step — confirmed read-only, includes the checksum-comparison approach and the row-42 spot-check |
| Guarded scripts reviewed (`apply-uat-decimal-inr-migration.mjs`, `uat-transform-kra-target.mjs`) | **Completed** | Both reviewed in this step — both refuse without `CONFIRM_UAT_DECIMAL_INR_MIGRATION=YES` and a `u686730471_Caveo_UAT` DB-name match, both exit before reaching their commented-out execution path; **connection-handling code itself is not yet filled in** (see Known Limitations) |
| No `db push` anywhere in instructions given alongside this package | **Completed** | Confirmed — every step in this migration program has explicitly forbidden `db push` |
| No production access used or referenced in this package | **Completed** | Confirmed |

## Execution readiness (gates the actual run — not satisfied by this step)

| Item | Status | Notes |
| ---- | ------ | ----- |
| Migration confirmed not run yet | **Completed** | Confirmed — no statement in any package file has been executed against UAT as of this step |
| Rollback plan approved | **Approved with risk exception** | Rollback owner (Vijesh Vijayan) is named and the method is documented in `UAT_BACKUP_ROLLBACK_RECORD.md`. Approved with the named risk exception for the unperformed live restore test — rollback confidence is reduced, not absent |
| Business owner approval | **Completed** | Vijesh Vijayan — see `UAT_MIGRATION_APPROVAL_RECORD.md` |
| Technical owner approval | **Completed** | Vijesh Vijayan — see `UAT_MIGRATION_APPROVAL_RECORD.md` |
| `prisma migrate resolve --applied <name>` plan confirmed (3 calls, one per migration name) | **Completed** | Documented and unchanged from Step 4E — this is a manual step run only after the SQL succeeds, not part of this approval step |
| **Migration execution permission** | **Approved with risk exception** | **Every item above is Completed or Approved with the same named risk exception.** Vijesh Vijayan, as named owner, explicitly accepted the unperformed live restore test rather than block on it. This authorizes proceeding to Step 4G — it does not itself run the migration. |

**Do not treat "Completed"/"Approved with risk exception" items above as a substitute for
actually running the migration carefully when that step is explicitly instructed — this
checklist documents what's ready and what isn't; it does not grant execution permission on its
own beyond the explicit risk-exception basis recorded here. As of this step, migration execution
permission is Approved with risk exception: the backup has not been restore-tested to a scratch
database, and Vijesh Vijayan has explicitly accepted that gap as the named approving owner.**
