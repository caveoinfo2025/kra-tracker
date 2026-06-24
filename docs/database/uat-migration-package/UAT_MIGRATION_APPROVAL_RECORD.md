# UAT Migration Approval Record

> Step 4F-1 (2026-06-24). This record tracks who needs to sign off on the UAT Decimal/INR
> migration before it can be executed, and the current status of each approval. Vijesh Vijayan
> is named as business owner, technical owner, and the named risk-acceptance owner. A real
> backup restore test was attempted and found not possible in this environment (no DB tooling
> available) — Vijesh Vijayan has explicitly accepted that risk, so the two rows depending on it
> are recorded as **"Approved with risk exception,"** not silently Completed and not left
> Pending. See `UAT_BACKUP_ROLLBACK_RECORD.md` for the full restore-test attempt and risk
> acceptance record.

| Approval Area | Owner | Status | Notes |
| ------------- | ----- | ------ | ----- |
| Business owner approval | Vijesh Vijayan | **Completed** | Authorizes the migration execution itself, distinct from the earlier field-level unit sign-off given in Step 4D |
| Technical owner approval | Vijesh Vijayan | **Completed** | Signs off that the migration package (SQL + scripts) is technically sound and ready to run |
| UAT DB backup approval | Vijesh Vijayan | **Approved with risk exception** | A backup exists (`u686730471_Caveo_UAT_240626.sql`, 2026-06-24 08:10 AM). A live restore-to-scratch-DB test was attempted and found impossible in this environment (no `mysql`/`mariadb`/`docker` client). A structural sanity check of the dump file was done instead (well-formed, all 13 required tables present, in-file row counts consistent with Step 4B's documented live counts). Vijesh Vijayan explicitly accepted the residual risk of not having a live-tested restore — see `UAT_BACKUP_ROLLBACK_RECORD.md` |
| Write-freeze approval | Vijesh Vijayan | **Completed** | No other active UAT testers during the migration window; window is 2026-06-24, starting now |
| Migration SQL approval | Vijesh Vijayan | **Completed** | SQL reviewed clean (dry-run checklist) and approved to execute |
| KRA transform approval | Vijesh Vijayan | **Completed** | Approved to run `scripts/uat-transform-kra-target.mjs` against UAT (6-label allowlist itself already approved in Step 4D) |
| Rollback plan approval | Vijesh Vijayan | **Approved with risk exception** | Rollback owner is named and the method (restore the backup file) is documented. Approval is granted with the same named risk exception as the backup-approval row above — rollback confidence is reduced because the restore itself is unproven, only the file's structure has been checked |
| Post-migration testing owner assigned | Vijesh Vijayan | **Completed** | Owns executing the UAT test plan (`docs/database/UAT_DECIMAL_INR_MIGRATION_PLAN.md` §5) immediately after migration |
| **Final migration execution approval** | Vijesh Vijayan | **Approved with risk exception** | Every row above is Completed or Approved-with-risk-exception. This is **not** an unconditional Completed — it reflects Vijesh Vijayan's explicit, named acceptance of reduced rollback confidence due to the unperformed live restore test. Step 4G may proceed on this basis. |

## How this record relates to the other documents

- [`uat-migration-dry-run-checklist.md`](uat-migration-dry-run-checklist.md) — tracks
  *technical/SQL readiness*, which is fully Completed.
- [`UAT_BACKUP_ROLLBACK_RECORD.md`](UAT_BACKUP_ROLLBACK_RECORD.md) — tracks the *backup/rollback
  facts*, including the restore-test attempt, the structural sanity check performed instead, and
  the full risk-acceptance record.
- This record tracks *who signs off* on each readiness area — all Completed or Approved with a
  named, explicit risk exception.

**Final migration execution approval status: Approved with risk exception (Vijesh Vijayan,
2026-06-24).** This authorizes proceeding to Step 4G with the explicitly accepted, reduced
rollback confidence described above. It does **not** itself run the migration — running
`uat-decimal-inr-migration-plan.sql` and the guarded scripts against UAT remains its own,
separate, explicitly-instructed step.
