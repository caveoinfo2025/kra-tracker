# UAT Backup / Rollback Record

> Step 4G readiness review (2026-06-24). This record tracks the actual backup and rollback
> readiness for the UAT Decimal/INR migration — distinct from the *plan* documented in
> [`uat-migration-dry-run-checklist.md`](uat-migration-dry-run-checklist.md). A backup has now
> been taken and most rows below are Completed. **One real gap remains: the backup has only
> been confirmed non-empty, not restore-tested to a scratch DB** — see the Restore tested row.
> Do not fake or assume any value below — every row is either a real, confirmed fact or marked
> Pending.

| Item | Value | Status | Notes |
| ---- | ----- | ------ | ----- |
| UAT DB name | `u686730471_Caveo_UAT` | Confirmed | Per Step 4B/4D's live confirmation — not re-verified in this step |
| Backup filename/location | `C:\Users\VIJESHVIJAYAN\Code\SQL Backup\` + `u686730471_Caveo_UAT_240626.sql` | **Completed** | Reported by Vijesh Vijayan |
| Backup timestamp | 2026-06-24 08:10 AM IST | **Completed** | Reported by Vijesh Vijayan |
| Backup taken by | Vijesh Vijayan | **Completed** | |
| Backup verification method | Confirmed the dump file exists and is non-empty | **Partial — does not meet the documented standard** | The dry-run checklist's standard is "restore to a scratch DB, spot-check row counts," which has **not** been done. This row should not be treated as equivalent to a verified-restorable backup until that restore test is actually run. |
| Restore tested? | No | **Pending** | Recommended before relying on this backup as the rollback path — restore `u686730471_Caveo_UAT_240626.sql` to a scratch DB and spot-check row counts against the pre-migration snapshot |
| Rollback owner | Vijesh Vijayan | **Completed** | Authorized to run a restore if the migration needs to be reversed |
| Rollback method | Restore `u686730471_Caveo_UAT_240626.sql` | **Documented and actionable** | There is no in-place "undo" SQL for this migration — the value transforms and type changes are not trivially reversible in a single statement, so backup restoration is the only supported rollback path (same approach documented in `uat-migration-dry-run-checklist.md`). Actionability is still subject to the restore-tested gap above. |
| App rollback commit/tag | `bb556a221ed0b6e92960887343ad754509bd6aab` (current local `master` HEAD) | **Best-effort — not independently verified** | This is the latest commit on local `master`, reported per Vijesh's instruction to use it. It has **not** been independently confirmed as what's actually deployed on the UAT server — treat as a working assumption, not a verified fact |
| Migration window | 2026-06-24, starting now | **Completed** | Confirmed by Vijesh Vijayan |
| Write-freeze owner | Vijesh Vijayan | **Completed** | No other active UAT testers during this window, confirmed by Vijesh Vijayan |
| Final approval status | **Conditionally ready** | **Pending — one gap** | All rows are Completed except the restore test. Migration execution permission should remain Pending until the backup is actually restore-tested, per the dry-run checklist's own standard — see `UAT_MIGRATION_APPROVAL_RECORD.md` |

## What this record does NOT cover

- Business/technical sign-off for the migration itself — see
  [`UAT_MIGRATION_APPROVAL_RECORD.md`](UAT_MIGRATION_APPROVAL_RECORD.md).
- The SQL/package content review — see `uat-migration-dry-run-checklist.md`'s "SQL review"
  section, which is fully Completed as of Step 4F.

## Next action

The backup exists (`u686730471_Caveo_UAT_240626.sql`, taken 2026-06-24 08:10 AM by Vijesh
Vijayan) but has only been confirmed non-empty — not restore-tested. Before treating rollback
as fully actionable, restore this file to a scratch database and spot-check row counts against
`uat-decimal-inr-pre-migration-snapshot.sql`'s expected output. Until that restore test is done,
this record should be read as "conditionally ready," not fully Completed, even though every
other row above is filled in.
