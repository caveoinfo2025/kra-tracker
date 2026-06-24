# UAT Backup / Rollback Record

> Step 4F-1 (2026-06-24). This record tracks the actual backup and rollback readiness for the
> UAT Decimal/INR migration — distinct from the *plan* documented in
> [`uat-migration-dry-run-checklist.md`](uat-migration-dry-run-checklist.md). A real restore
> test (restore to a scratch DB + live row-count comparison) was **attempted and found not
> possible** in this environment (no `mysql`/`mariadb`/`docker` client available, no live UAT
> connection). A structural sanity check of the dump file was performed instead — see "Backup
> verification method" below — and **Vijesh Vijayan has explicitly accepted the residual risk**
> as the named approving owner. This is recorded as a risk exception, not a silent Completed.

| Item | Value | Status | Notes |
| ---- | ----- | ------ | ----- |
| UAT DB name | `u686730471_Caveo_UAT` | Confirmed | Per Step 4B/4D's live confirmation — not re-verified in this step |
| Backup filename/location | `C:\Users\VIJESHVIJAYAN\Code\SQL Backup\` + `u686730471_Caveo_UAT_240626.sql` | **Completed** | Reported by Vijesh Vijayan |
| Backup timestamp | 2026-06-24 08:10 AM IST | **Completed** | Reported by Vijesh Vijayan |
| Backup taken by | Vijesh Vijayan | **Completed** | |
| Backup verification method | Structural sanity check of the dump file (no live restore) | **Approved with risk exception** | Restore-to-scratch-DB testing was attempted and found impossible in this environment (no `mysql`/`mariadb`/`docker` client, no live UAT credential). Instead, the file itself was inspected: confirmed non-empty (459,589 bytes, 6,165 lines), well-formed phpMyAdmin dump (proper header, ends cleanly with `COMMIT` + charset-restore statements — no truncation), all 13 required tables' `CREATE TABLE` statements present (`Payment`, `Collection`, `OrderAdvance`, `CrmLead`, `CrmOpportunity`, `SalesFunnel`, `KRA`, `Expense`, `EmployeeAdvance`, `TravelClaim`, `Voucher`, `Ledger`, `FinAccount`), and in-file row counts extracted directly from the dump's `INSERT` blocks (see the row-count table below). This is **not equivalent** to a real restore-and-compare test — there is no live UAT row count to compare against in this environment, so corruption that only manifests on actual restore (e.g. a charset/encoding issue, a MySQL-version incompatibility) would not be caught by this check. |
| Restore tested? | No | **No — risk accepted** | Real restore-to-scratch-DB testing was not performed. Vijesh Vijayan, as named approving owner, has explicitly accepted this gap rather than block on it — see "Risk acceptance" below. |
| Rollback owner | Vijesh Vijayan | **Completed** | Authorized to run a restore if the migration needs to be reversed |
| Rollback method | Restore `u686730471_Caveo_UAT_240626.sql` | **Approved with risk exception** | There is no in-place "undo" SQL for this migration — the value transforms and type changes are not trivially reversible in a single statement, so backup restoration is the only supported rollback path. Rollback confidence is **reduced** relative to a restore-tested backup, since the file has not actually been proven to restore cleanly — only structurally inspected. |
| App rollback commit/tag | `bb556a221ed0b6e92960887343ad754509bd6aab` (current local `master` HEAD) | **Best-effort — not independently verified** | This is the latest commit on local `master`, reported per Vijesh's instruction to use it. It has **not** been independently confirmed as what's actually deployed on the UAT server — treat as a working assumption, not a verified fact |
| Migration window | 2026-06-24, starting now | **Completed** | Confirmed by Vijesh Vijayan |
| Write-freeze owner | Vijesh Vijayan | **Completed** | No other active UAT testers during this window, confirmed by Vijesh Vijayan |
| Final approval status | **Approved with risk exception** | **Approved with risk exception** | Every row is filled in. The one technical gap (no live restore test) is covered by Vijesh Vijayan's explicit, named risk acceptance — see `UAT_MIGRATION_APPROVAL_RECORD.md` |

## Row-count comparison (dump file vs. live UAT)

| Table | Live UAT Count | Restored Backup Count | Match? | Notes |
| ----- | -------------: | ---------------------: | ------ | ----- |
| Payment | Not available — no live UAT connection in this environment | 26 (from dump `INSERT` block) | N/A — cannot compare | Live count last confirmed in Step 4B (2026-06-24): 26. Consistent with the dump's in-file count, but this is a document cross-reference, not a live re-query |
| Collection | Not available | 141 | N/A — cannot compare | Step 4B live count: 141 — consistent with the dump |
| OrderAdvance | Not available | 3 | N/A — cannot compare | Not separately confirmed live in Step 4B's summary; dump shows 3 |
| CrmLead | Not available | 280 | N/A — cannot compare | Step 4B live count: 280 — consistent with the dump |
| CrmOpportunity | Not available | 49 | N/A — cannot compare | Step 4B live count: 49 — consistent with the dump |
| SalesFunnel | Not available | 100 | N/A — cannot compare | Step 4B live count: 100 — consistent with the dump |
| KRA | Not available | 34 | N/A — cannot compare | Step 4B live count: 34 — consistent with the dump |
| Expense | Not available | 0 (no `INSERT` block found) | N/A — cannot compare | Step 4B live count: 0 — consistent |
| EmployeeAdvance | Not available | 0 (no `INSERT` block found) | N/A — cannot compare | Step 4B live count: 0 — consistent |
| TravelClaim | Not available | 0 (no `INSERT` block found) | N/A — cannot compare | Step 4B live count: 0 — consistent |
| Voucher | Not available | 0 (no `INSERT` block found) | N/A — cannot compare | Step 4B live count: 0 — consistent |
| Ledger | Not available | 0 (no `INSERT` block found) | N/A — cannot compare | Step 4B live count: 0 — consistent |
| FinAccount | Not available | 0 (no `INSERT` block found) | N/A — cannot compare | Step 4B live count: 0 — consistent |

**Important caveat:** the "Live UAT Count" column above could not be re-queried in this
environment (no live UAT DB connection). The values shown as "consistent with the dump" are a
cross-reference against Step 4B's *previously documented* live findings — a different point in
time, not a fresh live query run alongside this restore attempt. This table is informational,
not a substitute for an actual restore-and-compare test.

## Risk acceptance

Because a real restore-to-scratch-DB test could not be performed in this environment:

- **Backup file status:** confirmed non-empty and structurally well-formed (see above) — this is
  stronger evidence than "file exists" alone, but weaker than an actual successful restore.
- **Restore test:** not performed.
- **Decision:** migration readiness proceeds only on the basis of this explicit risk acceptance,
  not as if the restore test had passed.
- **Rollback confidence:** reduced. If the migration needs to be rolled back, the restore itself
  — not just the file's structural validity — is unproven until it is actually attempted.
- **Approving owner:** Vijesh Vijayan, explicitly named, accepted 2026-06-24.

## What this record does NOT cover

- Business/technical sign-off for the migration itself — see
  [`UAT_MIGRATION_APPROVAL_RECORD.md`](UAT_MIGRATION_APPROVAL_RECORD.md).
- The SQL/package content review — see `uat-migration-dry-run-checklist.md`'s "SQL review"
  section, which is fully Completed as of Step 4F.

## Next action

None required to proceed with the explicit risk acceptance recorded above. **Recommended, but
not blocking:** if a MySQL/MariaDB instance or Hostinger phpMyAdmin scratch database becomes
available, restore `u686730471_Caveo_UAT_240626.sql` there and re-run the row-count comparison
against a fresh live UAT query, to retroactively close this gap with real evidence.
