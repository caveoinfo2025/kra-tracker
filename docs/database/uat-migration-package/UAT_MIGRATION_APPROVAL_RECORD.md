# UAT Migration Approval Record

> Step 4G readiness review (2026-06-24). This record tracks who needs to sign off on the UAT
> Decimal/INR migration before it can be executed, and the current status of each approval.
> Vijesh Vijayan has been named as both business owner and technical owner and has approved the
> rows below. **One row remains genuinely Pending** — UAT DB backup approval — because the
> backup itself has only been confirmed non-empty, not restore-tested (see
> `UAT_BACKUP_ROLLBACK_RECORD.md`). Final migration execution approval cannot be granted while
> that gap is open.

| Approval Area | Owner | Status | Notes |
| ------------- | ----- | ------ | ----- |
| Business owner approval | Vijesh Vijayan | **Completed** | Authorizes the migration execution itself, distinct from the earlier field-level unit sign-off given in Step 4D |
| Technical owner approval | Vijesh Vijayan | **Completed** | Signs off that the migration package (SQL + scripts) is technically sound and ready to run |
| UAT DB backup approval | Vijesh Vijayan | **Pending — conditional** | A backup exists (`u686730471_Caveo_UAT_240626.sql`, 2026-06-24 08:10 AM) but has only been confirmed non-empty, not restore-tested to a scratch DB. Cannot move to Completed until that restore test is run — see `UAT_BACKUP_ROLLBACK_RECORD.md` |
| Write-freeze approval | Vijesh Vijayan | **Completed** | No other active UAT testers during the migration window; window is 2026-06-24, starting now |
| Migration SQL approval | Vijesh Vijayan | **Completed** | SQL reviewed clean (dry-run checklist) and approved to execute |
| KRA transform approval | Vijesh Vijayan | **Completed** | Approved to run `scripts/uat-transform-kra-target.mjs` against UAT (6-label allowlist itself already approved in Step 4D) |
| Rollback plan approval | Vijesh Vijayan | **Pending — conditional** | Rollback owner is named and the method is documented, but approval is conditional on the same backup restore-test gap as the row above |
| Post-migration testing owner assigned | Vijesh Vijayan | **Completed** | Owns executing the UAT test plan (`docs/database/UAT_DECIMAL_INR_MIGRATION_PLAN.md` §5) immediately after migration |
| **Final migration execution approval** | Vijesh Vijayan | **Pending — one gap** | **All rows above are Completed except the backup restore-test.** Once that restore test is done and reported, this row can move to Completed as its own explicit step — it does not move automatically |

## How this record relates to the other documents

- [`uat-migration-dry-run-checklist.md`](uat-migration-dry-run-checklist.md) — tracks
  *technical/SQL readiness*, which is fully Completed.
- [`UAT_BACKUP_ROLLBACK_RECORD.md`](UAT_BACKUP_ROLLBACK_RECORD.md) — tracks the *backup/rollback
  facts*; every row is filled in except the restore test.
- This record tracks *who signs off* on each readiness area — all Completed except the two rows
  that depend on the restore-test gap.

**Final migration execution approval is Pending on one item: the backup has not been
restore-tested.** No UAT migration should be run until that test is done and this row is
explicitly moved to Completed as its own separate, explicitly-instructed step.
