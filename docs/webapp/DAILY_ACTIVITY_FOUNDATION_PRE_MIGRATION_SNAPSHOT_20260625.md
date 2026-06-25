# Daily Activity Foundation — Pre-Migration Snapshot (Phase W1B)

> Read-only snapshot, dev DB only (`u686730471_caveodev`). Captured via
> `prisma/snapshot-daily-activity-foundation-pre-migration.mjs` (SELECT/SHOW/
> information_schema only — no writes).

```json
{
  "database": "u686730471_caveodev",
  "serverTime": "2026-06-25T04:27:05.000Z",
  "mysqlVersion": "11.8.6-MariaDB-log",
  "crmMeetingCount": 0,
  "dailyUpdateCount": 0,
  "crmActivityCount": 95,
  "crmMeetingHasStatusColumn": false,
  "preExistingNewTables": [],
  "migrationAlreadyRecorded": false
}
```

## Why a snapshot rather than a full `mysqldump`

The Daily Activity foundation migration (`20260625120000_daily_activity_foundation`) is
100% additive: 6 brand-new tables and one nullable-with-default column added to `CrmMeeting`.
`mysqldump` is also not available in this local environment. This snapshot — matching the
project's existing read-only pre-migration-snapshot pattern used for the larger Decimal/INR
UAT migration (`docs/database/uat-migration-package/uat-decimal-inr-pre-migration-snapshot.sql`)
— is proportionate to the actual risk:

- **`CrmMeeting` has 0 rows.** There is no existing data the new `status` column could affect
  or that could be lost.
- **`DailyUpdate` has 0 rows**, **`CrmActivity` has 95 rows** — captured here specifically so
  it can be re-checked after the migration to prove neither table's data changed (the migration
  contains no statement that touches either table).
- **Rollback, if ever needed, is trivial**: `DROP TABLE` the 6 new tables and `ALTER TABLE
  CrmMeeting DROP COLUMN status` — no data migration to reverse, since none was performed.

This snapshot is the baseline; the post-migration verification step re-runs the same counts
and confirms `dailyUpdateCount` and `crmActivityCount` are unchanged.
