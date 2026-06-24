# UAT Migration Approval Record

> Step 4F (2026-06-24). This record tracks who needs to sign off on the UAT Decimal/INR migration
> before it can be executed, and the current status of each approval. **All statuses below are
> Pending unless explicitly approved by the named owner** — none have been granted as of this
> step.

| Approval Area | Owner | Status | Notes |
| ------------- | ----- | ------ | ----- |
| Business owner approval | _(not yet assigned)_ | **Pending** | Distinct from the field-level unit sign-off already given in Step 4D (Vijesh Vijayan confirmed the Payment/Collection/OrderAdvance unit finding) — this approval is for authorizing the *migration execution itself*, a separate decision |
| Technical owner approval | _(not yet assigned)_ | **Pending** | Needs someone to sign off that the migration package (SQL + scripts) is technically sound and ready to run — the SQL content review itself is Completed (see `uat-migration-dry-run-checklist.md`), but a named technical owner has not yet formally signed off on running it |
| UAT DB backup approval | _(not yet assigned)_ | **Pending** | Depends on `UAT_BACKUP_ROLLBACK_RECORD.md` reaching Completed first — cannot approve a backup that doesn't exist yet |
| Write-freeze approval | _(not yet assigned)_ | **Pending** | No decision has been made yet on whether UAT needs a write-freeze during the migration window, let alone who approves/owns it |
| Migration SQL approval | _(not yet assigned)_ | **Pending** | The SQL has been reviewed and confirmed clean (Task 1 of this step, and the Step 4E safety review) — but "reviewed clean" and "approved to execute" are different statuses; this row tracks the latter |
| KRA transform approval | _(not yet assigned)_ | **Pending** | The 6-label allowlist itself was approved in Step 4D (`UAT_DECIMAL_INR_MIGRATION_ADJUSTMENT_PLAN.md` §7) — this row tracks approval to actually *run* `scripts/uat-transform-kra-target.mjs` against UAT, which is still pending |
| Rollback plan approval | _(not yet assigned)_ | **Pending** | The rollback *method* is documented (restore the pre-migration backup) but cannot be approved until a backup exists and a rollback owner is named — see `UAT_BACKUP_ROLLBACK_RECORD.md` |
| Post-migration testing owner assigned | _(not yet assigned)_ | **Pending** | Needs someone to own executing the UAT test plan (`docs/database/UAT_DECIMAL_INR_MIGRATION_PLAN.md` §5 — Finance/Sales/KRA/Technical areas) immediately after migration |
| **Final migration execution approval** | _(not yet assigned)_ | **Pending** | **Cannot be granted until every row above is Completed** — this is the gate that actually authorizes running `uat-decimal-inr-migration-plan.sql` and the 2 guarded scripts against UAT |

## How this record relates to the other Step 4F documents

- [`uat-migration-dry-run-checklist.md`](uat-migration-dry-run-checklist.md) — tracks
  *technical/SQL readiness*, which is fully Completed.
- [`UAT_BACKUP_ROLLBACK_RECORD.md`](UAT_BACKUP_ROLLBACK_RECORD.md) — tracks the *backup/rollback
  facts* (has a backup actually been taken, verified, etc.), which is fully Pending.
- This record tracks *who signs off* on each of those readiness areas, plus business/technical
  ownership — also fully Pending.

**Final migration execution approval is Pending.** No UAT migration should be run until this row
moves to Completed, and even then only as its own separate, explicitly-instructed execution
step.
