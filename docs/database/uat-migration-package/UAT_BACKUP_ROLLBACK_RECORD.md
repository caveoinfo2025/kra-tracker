# UAT Backup / Rollback Record

> Step 4F (2026-06-24). This record tracks the actual backup and rollback readiness for the UAT
> Decimal/INR migration — distinct from the *plan* documented in
> [`uat-migration-dry-run-checklist.md`](uat-migration-dry-run-checklist.md). **No backup has
> been taken as of this step.** Do not fake or assume any value below — every row is either a
> real, confirmed fact or marked Pending.

| Item | Value | Status | Notes |
| ---- | ----- | ------ | ----- |
| UAT DB name | `u686730471_Caveo_UAT` | Confirmed | Per Step 4B/4D's live confirmation — not re-verified in this step |
| Backup filename/location | _(not yet taken)_ | **Pending** | No backup exists yet |
| Backup timestamp | _(not yet taken)_ | **Pending** | |
| Backup taken by | _(not yet assigned)_ | **Pending** | Needs an owner — likely whoever has UAT SSH/MySQL/hPanel access (the same operator who ran the Step 4B/4D pre-checks) |
| Backup verification method | _(not yet defined)_ | **Pending** | Per the dry-run checklist's standard: restore to a scratch DB, spot-check row counts — not just confirm the dump file is non-empty |
| Restore tested? | No | **Pending** | Cannot be tested until a backup exists |
| Rollback owner | _(not yet assigned)_ | **Pending** | Needs a named person authorized to run a restore if the migration needs to be reversed |
| Rollback method | Restore the pre-migration UAT backup | **Documented, not yet actionable** | There is no in-place "undo" SQL for this migration — the value transforms and type changes are not trivially reversible in a single statement, so backup restoration is the only supported rollback path (same approach documented in `uat-migration-dry-run-checklist.md`) |
| App rollback commit/tag | _(not yet determined)_ | **Pending** | Depends on confirming what commit is currently deployed to the UAT server — this was flagged as still open back in Step 4B ("Branch/app gap confirmation... not collected") and remains open |
| Migration window | _(not yet scheduled)_ | **Pending** | No date/time has been proposed or approved |
| Write-freeze owner | _(not yet assigned)_ | **Pending** | Needs a named person responsible for communicating and enforcing the write-freeze decision, once that decision is made (see `UAT_MIGRATION_APPROVAL_RECORD.md`) |
| Final approval status | **Not approved** | **Pending** | No backup/rollback approval has been granted — migration execution permission remains Pending per the dry-run checklist |

## What this record does NOT cover

- Business/technical sign-off for the migration itself — see
  [`UAT_MIGRATION_APPROVAL_RECORD.md`](UAT_MIGRATION_APPROVAL_RECORD.md).
- The SQL/package content review — see `uat-migration-dry-run-checklist.md`'s "SQL review"
  section, which is fully Completed as of Step 4F.

## Next action

Someone with UAT database access (the same access used to run the Step 4B/4D pre-checks) needs
to take a full UAT backup, verify it restores correctly to a scratch database, and report back
the filename/location, timestamp, and verification result so this record can be updated from
Pending to Completed. Until then, migration execution permission remains Pending regardless of
how complete the SQL review is.
