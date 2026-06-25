# Daily Activity & Productivity — Schema Design Review (Phase W1)

> **Status: Applied to UAT/dev only (Phase W1B, 2026-06-25).** See §13 below for the
> application record. Production was not touched, no API routes were created or modified, no
> UI was built, no mobile code was touched. **Do not touch production.**

## 1. Final model list

Six new models, plus one change to an existing model:

1. `DailyActivityLog` — canonical per-event scored activity record.
2. `DailyActivitySummary` — one closure record per employee per day.
3. `DailyActivityCorrectionRequest` — employee-raised, manager-reviewed correction workflow.
4. `DailyProductivityScore` — persisted daily/weekly/monthly rollup snapshot.
5. `ProductivityActivityRule` — admin-configurable point values per activity type.
6. `ProductivityRoleTarget` — admin-configurable daily/weekly/monthly targets per role.
7. **`CrmMeeting`** — existing model, gains a new `status` column (§6).

**No `DailyActivityAuditLog` model was created**, per the explicit instruction — manager/admin
actions reuse the existing `AuditLog` model (§7).

## 2. Enum list — and a flagged deviation from the requested approach

The requested design listed seven Prisma `enum` types (`DailyActivityType`,
`DailyActivitySourceType`, `DailyActivitySummaryStatus`, `DailyActivityLogStatus`,
`DailyActivityCorrectionStatus`, `ProductivityBand`, `ProductivityPeriodType`).

**Reviewing `prisma/schema.prisma` end to end (all ~90 existing models) found zero Prisma
`enum` declarations anywhere in this codebase.** Every status/type/stage field in every
existing model — `CrmLead.stage`, `CrmOpportunity.stage`, `CrmTask.status`,
`CrmTask.priority`, `DailyUpdate.updateStatus`, `KRA.status`, `Certification.status`,
`ApprovalRule.entityType`, `AuditLog.action`, `Voucher`/`Expense` status fields, and more —
is a plain `String` column with a `@default("...")` and, almost universally, an inline
comment listing the allowed values (e.g. `entityType String @default("all") // all|expense|
advance|travel|voucher`). The lead/opportunity stage vocabulary additionally has a
TypeScript-side source of truth (`LEAD_STAGES`/`OPP_STAGES` in `src/types/pipeline.ts`) that
the UI and API both import, rather than a database-level enum.

**Decision: follow the existing convention — `String` columns, not Prisma `enum` types** —
for all seven vocabularies. This is the more consistent choice per Task 1's own instruction
to confirm consistency with current patterns, and it has real practical benefits specific to
this project:
- Adding a new allowed value later (e.g. a new `DailyActivityType`) is a zero-migration,
  pure-application change with a `String` column; with a real MySQL-backed Prisma `enum`, it
  requires a schema migration (`ALTER TABLE ... MODIFY COLUMN`) every time the vocabulary
  grows — a meaningfully bigger operational cost given this project's documented shadow-DB
  migration friction on Hostinger (§8).
- It matches every other "rule engine" style model already in this schema
  (`CRMAutomationRule`, `SLARule`, `ApprovalRule`) which all use `String` action/type fields.

The seven vocabularies below are therefore implemented as documented `String` values (with
defaults), not database enums — functionally equivalent for application logic, since Prisma
generates the same TypeScript string-literal-friendly client code either way once a
corresponding TS const array is added (recommended for Phase 2, mirroring
`src/types/pipeline.ts`'s `LEAD_STAGES` pattern — not created in this schema-only step).

### `DailyActivityType` (→ `DailyActivityLog.activityType` / `ProductivityActivityRule.activityType`)
`QUALIFIED_LEAD_CREATED`, `LEAD_UPDATED`, `FOLLOW_UP_ADDED`, `TASK_UPDATED`, `TASK_COMPLETED`,
`MEETING_SCHEDULED`, `MEETING_COMPLETED`, `PROPOSAL_SENT`, `OPPORTUNITY_UPDATED`,
`CALL_NOTE_ADDED`, `EMAIL_NOTE_ADDED`, `WHATSAPP_NOTE_ADDED`, `END_OF_DAY_SUMMARY_SUBMITTED`.

### `DailyActivitySourceType` (→ `DailyActivityLog.sourceType`)
`CRM_ACTIVITY`, `LEAD`, `TASK`, `MEETING`, `OPPORTUNITY`, `PROPOSAL`, `FOLLOW_UP`, `NOTE`,
`SUMMARY`, `CORRECTION`.

### `DailyActivitySummaryStatus` (→ `DailyActivitySummary.status`)
`NO_ACTIVITY`, `SUMMARY_PENDING`, `INCOMPLETE`, `CLOSED`, `REOPENED`, `LATE_SUBMITTED`,
`PENDING_CORRECTION`.

### `DailyActivityLogStatus` (→ `DailyActivityLog.status`)
`CAPTURED`, `COUNTED`, `EXCLUDED`, `CORRECTION_PENDING`, `CORRECTION_APPROVED`,
`CORRECTION_REJECTED`.

### `DailyActivityCorrectionStatus` (→ `DailyActivityCorrectionRequest.status`)
`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`.

### `ProductivityBand` (→ `DailyActivitySummary.productivityBand` / `DailyProductivityScore.productivityBand`)
`NO_ACTIVITY`, `LOW_ACTIVITY`, `ACTIVE`, `PRODUCTIVE`, `HIGHLY_PRODUCTIVE`.

### `ProductivityPeriodType` (→ `DailyProductivityScore.periodType`)
`DAILY`, `WEEKLY`, `MONTHLY`.

## 3. Model field details

### `DailyActivityLog`
`id, employeeId, activityDate (Date), activityType, sourceType, sourceId?, sourceTable
(default ""), sourceAction (default ""), points (default 0), status (default "CAPTURED"),
capturedAt (default now), countedAt?, isCorrection (default false), correctionRequestId?,
metadataJson (Text, default ""), createdAt, updatedAt`.

### `DailyActivitySummary`
`id, employeeId, summaryDate (Date), status (default "NO_ACTIVITY"), productivityBand
(default "NO_ACTIVITY"), totalPoints (default 0), autoSummaryJson (Text, default ""),
blockers (Text, default ""), nextDayPlan (Text, default ""), finalRemarks (Text, default ""),
submittedAt?, closedAt?, lockedAt?, reopenedAt?, reopenedById?, lateSubmittedAt?, createdAt,
updatedAt`.

**Deviation from the requested field list:** the requested fields included both
`productivityBand` and `employeeVisibleBand` as separate columns. These would always hold the
identical value — the employee-visible band *is* the productivity band; there is no second,
different band an employee sees. Storing both would mean every write path has to keep two
columns in lockstep for no semantic gain. **Decision: one column, `productivityBand`.** The
visibility rule (employee sees only the band; manager additionally sees `totalPoints`) is
enforced by what the API response includes for each caller, not by a second database column.
This is flagged explicitly here as the one place this design knowingly diverges from the
literal requested field list, with the reasoning for why.

### `DailyActivityCorrectionRequest`
`id, employeeId, summaryId, activityLogId? (the disputed/original entry, if any), requestedActivityType
(default ""), requestedSourceType (default ""), requestedSourceId?, reason (Text, required),
status (default "PENDING"), managerId?, managerDecisionAt?, managerRemarks (Text, default ""),
approvedPoints?, createdAt, updatedAt`.

### `DailyProductivityScore`
`id, employeeId, periodType, periodStart (Date), periodEnd (Date), totalPoints (default 0),
closedDays (default 0), incompleteDays (default 0), absentDays (default 0), productivityBand
(default "NO_ACTIVITY"), kraEligiblePoints (default 0), qualityIndicatorJson (Text, default
""), generatedAt (default now), createdAt, updatedAt`.

### `ProductivityActivityRule`
`id, activityType, displayName (default ""), points (default 0), isActive (default true),
appliesToRole? (null = global default; non-null = role-specific override), effectiveFrom?,
effectiveTo?, createdAt, updatedAt`.

### `ProductivityRoleTarget`
`id, roleName, dailyTargetPoints?, weeklyTargetPoints?, monthlyTargetPoints?, isActive
(default true), effectiveFrom?, effectiveTo?, createdAt, updatedAt`.

## 4. Relation design

- `DailyActivityLog.employee → Employee` (`"DailyActivityLogEmployee"`, `onDelete: Cascade` —
  matches the existing convention for employee-owned operational rows, e.g.
  `KRA.employee`/`DailyUpdate.employee`).
- `DailyActivityLog.correctionRequest → DailyActivityCorrectionRequest?`
  (`"CorrectionGeneratedLog"`, `onDelete: SetNull`) — the correction that *generated* this log
  entry (e.g. backfilling a missing activity on approval). Distinct from the relation below.
- `DailyActivityCorrectionRequest.activityLog → DailyActivityLog?`
  (`"CorrectionDisputedLog"`, `onDelete: SetNull`) — the *original/disputed* entry this request
  is about, nullable because a "missing activity" correction has nothing to point at. Two
  separate named relations were required between the same two models since they mean
  different things; Prisma requires distinct relation names in that case.
- `DailyActivitySummary.employee → Employee` (`"DailyActivitySummaryEmployee"`, `Cascade`).
- `DailyActivitySummary.reopenedBy → Employee?` (`"DailyActivitySummaryReopenedBy"`,
  `SetNull` — if the reopening manager's record is ever deleted, the day stays reopened rather
  than the summary row being destroyed).
- `DailyActivityCorrectionRequest.employee → Employee` (`"CorrectionRequestEmployee"`,
  `Cascade`), `.summary → DailyActivitySummary` (`"CorrectionSummary"`, `Cascade`), `.manager →
  Employee?` (`"CorrectionRequestManager"`, `SetNull`).
- `DailyProductivityScore.employee → Employee` (`"ProductivityScoreEmployee"`, `Cascade`).
- `ProductivityActivityRule` and `ProductivityRoleTarget` have **no relations** — pure
  config tables, matching the existing `ApprovalRule` pattern (also relation-free).
- Six new back-reference arrays added to `Employee`: `dailyActivityLogs`,
  `dailyActivitySummaries`, `dailyActivitySummariesReopened`, `dailyActivityCorrectionsRaised`,
  `dailyActivityCorrectionsManaged`, `dailyProductivityScores` — following the exact pattern
  every other module in this schema uses (e.g. the Finance Operations Module's
  `ledgerEntries`/`expenses`/`expensesApproved` back-references).

`onDelete: Cascade` is used only where the child row is meaningless without its owning
employee (mirrors `KRA`, `DailyUpdate`, `CrmLead.assignedTo` is `RESTRICT`-by-default —
intentionally different: an activity log/summary is *about* an employee and should disappear
with them in dev/test data cleanup, whereas a lead assignment should block employee deletion
in production). `onDelete: SetNull` is used for "who reviewed/reopened this" attribution
fields, where losing the attribution is acceptable but destroying the underlying record is not.

## 5. Index/constraint design

| Model | Index/constraint | Purpose |
|---|---|---|
| `DailyActivityLog` | `@@index([employeeId, activityDate])` | hot path: "today's activity for this employee" |
| | `@@index([activityType])` | filtering/reporting by type |
| | `@@index([sourceType, sourceId])` | tracing a log entry back to its CRM source |
| | `@@index([correctionRequestId])` | required FK index (MySQL), not covered by the above |
| | `@@unique([employeeId, sourceType, sourceId, sourceAction, activityDate], name: "uq_activity_log_event_per_day")` | duplicate-prevention (§9) |
| `DailyActivitySummary` | `@@unique([employeeId, summaryDate])` | one summary per employee per day — required |
| | `@@index([status])` | manager dashboard filters (no-activity/incomplete/pending lists) |
| | `@@index([summaryDate])` | team-wide day rollups |
| | `@@index([reopenedById])` | required FK index, not covered above |
| `DailyActivityCorrectionRequest` | `@@index([summaryId, status])` | per-day correction lookup |
| | `@@index([employeeId, status])` | employee's own correction history |
| | `@@index([activityLogId])`, `@@index([managerId])` | required FK indexes, not covered above |
| `DailyProductivityScore` | `@@unique([employeeId, periodType, periodStart, periodEnd])` | one snapshot per employee per period |
| | `@@index([periodType, periodStart])` | rollup report queries |
| `ProductivityActivityRule` | `@@index([activityType, isActive])` | rule lookup at capture time |
| `ProductivityRoleTarget` | `@@index([roleName, isActive])` | target lookup |
| `CrmMeeting` | `@@index([status])` (new) | future meeting-completed queries |

**MySQL/MariaDB FK-index requirement:** every foreign-key column in MySQL must be covered by
an index (the FK column itself, or as a leading column of a composite index). Reviewing each
new model's FK columns against its other indexes found four FK columns that weren't covered by
any composite index's leading position — `DailyActivityLog.correctionRequestId`,
`DailyActivitySummary.reopenedById`, `DailyActivityCorrectionRequest.activityLogId`, and
`DailyActivityCorrectionRequest.managerId` — and added an explicit single-column `@@index` for
each, rather than relying on Prisma to silently add an implicit one. This keeps the schema
self-documenting and matches CLAUDE.md's MySQL rule #4 ("Add `@@index` on every FK and
hot-filter column").

## 6. `CrmMeeting.status` change

Added: `status String @default("SCHEDULED")` with inline comment documenting the vocabulary
(`SCHEDULED|COMPLETED|CANCELLED|RESCHEDULED`) plus a new `@@index([status])`. This is purely
additive (a new nullable-by-default column with a default value, no backfill needed since the
default applies to existing rows automatically on `ALTER TABLE`). No capture/detection logic
was added anywhere — this step only makes "was this meeting actually completed?" answerable in
the schema, which `docs/webapp/WEBAPP_GAP_CLOSURE_PLAN.md` (gap G-02) flagged as a hard
blocker for the `MEETING_COMPLETED` activity type. Detection logic (a status-transition check
in the meetings route, mirroring `CrmTask`'s existing `status → "completed"` gate) is Phase 2
work, not done here.

## 7. `AuditLog` reuse decision

Confirmed: **no new audit table was created.** The existing `AuditLog` model
(`prisma/schema.prisma`, `entityType`/`entityId`/`action`/`performedById`/`changes`/`notes`/
`createdAt`) is reused, unmodified, for every manager/admin action on this system. Expected
future usage (Phase 4+, not implemented yet):

| Action | `entityType` | `entityId` | `action` |
|---|---|---|---|
| Correction approved | `daily_activity_correction` | `DailyActivityCorrectionRequest.id` | `approve` |
| Correction rejected | `daily_activity_correction` | `DailyActivityCorrectionRequest.id` | `reject` |
| Day reopened | `daily_activity_summary` | `DailyActivitySummary.id` | `reopen` |
| Late summary accepted | `daily_activity_summary` | `DailyActivitySummary.id` | `accept_late` |
| Productivity rule changed | `productivity_rule` | `ProductivityActivityRule.id` | `update` |
| Productivity target changed | `productivity_role_target` | `ProductivityRoleTarget.id` | `update` |

This table is the single place "did a manager ever directly touch a productivity number"
becomes independently auditable — important given the hard rule that managers cannot adjust
points (only approve/reject structured corrections).

## 8. Migration compatibility notes

- **Generated by hand, not by `prisma migrate dev` or `prisma migrate diff`.** Two tool-assisted
  paths were considered and both were correctly avoided in this draft-only step:
  - `npx prisma migrate dev --create-only --name daily_activity_foundation` (the originally
    requested command) requires a **shadow database** to compute the diff. This project's
    Hostinger MySQL user has no `CREATE DATABASE` privilege, which is exactly the `P3014`
    failure already documented in `docs/RBAC_MIGRATION_TRACKER.md` (row 3B) for a prior
    migration in this same repo — re-attempting it here would hit the identical wall.
  - `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma
    --script` (this project's own documented workaround for the above, used for the
    Finance Operations Phase 1 and soft-delete migrations) avoids the shadow-DB problem but
    requires **connecting to and introspecting the live configured database**. An attempt at
    this was correctly intercepted by this session's permission safeguards as touching shared
    infrastructure beyond what a schema-design-only step should do, and was not pursued
    further — no retry, no workaround attempted.
  - **Resolution:** the migration SQL in
    `prisma/migrations/20260625120000_daily_activity_foundation/migration.sql` was authored
    directly from the new schema models, by hand, using the exact column-type, FK-naming, and
    index-naming conventions visible in every prior migration file in this folder (verified
    against `20260602120000_finance_operations_phase1` and
    `20260621120000_add_soft_delete_fields_phase_a`). Zero database connections were made to
    produce it.
- **Not applied.** No `prisma migrate dev`, no `prisma db push`, no `prisma migrate deploy`,
  no `prisma migrate resolve --applied` was run. The migration directory exists on disk only;
  it has not been recorded in any database's `_prisma_migrations` table.
- **Purely additive SQL, reviewed line by line:** 6 `CREATE TABLE`, 1 `ALTER TABLE ... ADD
  COLUMN` (CrmMeeting), 2 new `CREATE INDEX` (one for the new column, FK indexes are inline in
  each `CREATE TABLE`), and the corresponding `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`
  statements. **No `DROP`, no destructive `ALTER`, no data manipulation statement (`INSERT`/
  `UPDATE`/`DELETE`) anywhere in the file.**
- Charset/collation (`utf8mb4` / `utf8mb4_unicode_ci`) matches every existing table in this
  schema.

## 9. Deduplication rules

The requested unique-constraint strategy (`sourceType + sourceId + sourceAction +
employeeId`) cannot, by itself, distinguish "the same event reported twice" from "two
genuinely different events on the same entity." Worked through explicitly:

- A flat unique constraint on `(employeeId, sourceType, sourceId, sourceAction)` with **no
  date component** would permanently block a second legitimate event of the same type on the
  same entity — e.g. an Opportunity that gets updated on Monday and again on Friday would
  collide on the second `OPPORTUNITY_UPDATED` event, since `sourceId` (the opportunity) and
  `sourceAction` would be identical both times. This is wrong — the scoring rules don't say
  "opportunity updates only count once ever per opportunity."
- **Decision: include `activityDate` in the unique key** —
  `@@unique([employeeId, sourceType, sourceId, sourceAction, activityDate],
  name: "uq_activity_log_event_per_day")`. This allows the same entity to score again on a
  different day, while blocking a literal duplicate insert of the same event on the same day
  (e.g. a retried API call, or a webhook firing twice).
- **Documented residual gap (cannot be fully closed by a DB constraint alone):** if an entity
  legitimately fires the *same* `sourceAction` string twice on the *same* day (e.g. an
  Opportunity's stage is changed twice in one day, both logged generically as
  `"stage_changed"`), this constraint will block the second one as a false-positive duplicate.
  This is an accepted, documented trade-off, not an oversight — the alternative (no
  same-day uniqueness at all) would let true accidental retries double-count. The
  recommended mitigation for Phase 2 (not built now) is for the **capture hook**, not the
  database, to make `sourceAction` specific enough to disambiguate real transitions — e.g.
  logging `"stage_changed:NEGOTIATION->WON"` rather than bare `"stage_changed"` — so two
  different real transitions on the same day naturally produce two different `sourceAction`
  values and don't collide, while a true retry of the *same* transition produces an identical
  string and is correctly blocked. This requires no schema change, only capture-hook logic
  (Phase 2).
- MySQL/MariaDB unique-index behavior confirmed: unlike some other engines, MySQL treats
  multiple `NULL`s in a unique index as **distinct** (not colliding) — same as standard SQL
  NULL semantics here — so `sourceId IS NULL` rows (e.g. an `END_OF_DAY_SUMMARY_SUBMITTED`
  event with no underlying CRM source row) do not block each other purely because `sourceId`
  is null; the other four columns still differentiate them. No partial/filtered unique index
  was needed (MySQL doesn't support those) and none was attempted.

## 10. Default rules and targets planned (not seeded)

**Activity point rules** (`ProductivityActivityRule`, to be seeded in a future, separate step
— not in this migration):

| Activity | Points |
|---|---:|
| `QUALIFIED_LEAD_CREATED` | 3 |
| `LEAD_UPDATED` | 1 |
| `FOLLOW_UP_ADDED` | 1 |
| `TASK_UPDATED` | 1 |
| `TASK_COMPLETED` | 2 |
| `MEETING_SCHEDULED` | 2 |
| `MEETING_COMPLETED` | 4 |
| `PROPOSAL_SENT` | 5 |
| `OPPORTUNITY_UPDATED` | 3 |
| `CALL_NOTE_ADDED` | 1 |
| `EMAIL_NOTE_ADDED` | 1 |
| `WHATSAPP_NOTE_ADDED` | 1 |
| `END_OF_DAY_SUMMARY_SUBMITTED` | 2 |

**Role targets** (`ProductivityRoleTarget`, also not yet seeded):

| Role | Daily target |
|---|---:|
| ISR / Inside Sales | 8 |
| BDE / Sales Executive | 10 |
| Sales Manager | 12 |

No `INSERT` statements were written or run for either table. Seeding is explicitly a future,
separate step (likely a `prisma/seed-daily-activity-defaults.ts`, mirroring the existing
`seed.ts`/`seed-dev-users.ts`/`seed-crm-defaults.ts` pattern), once the migration itself has
been reviewed and approved.

## 11. Open decisions

1. **Role-name mapping is unresolved.** `Employee.role` (`prisma/schema.prisma`) is a free-text
   string; the actual seeded values in `prisma/seed-dev-users.ts` are `"Head of Sales"`,
   `"Operations Head"`, `"Accounts"`, `"Business Development Manager"`, `"BDE"`,
   `"Inside Sales"`, `"Sales Coordinator"` — **none of these read exactly `"Sales Manager"`**,
   the role name used in the requested target table. Before seeding `ProductivityRoleTarget`,
   this needs a decision: does `"Sales Manager"` map to `isManager: true` generally, to
   `"Head of Sales"` specifically, or is a new role string needed? Not decided here.
2. **`appliesToRole` override semantics are unspecified beyond "support it later."** When both
   a global rule (`appliesToRole: null`) and a role-specific override exist for the same
   `activityType`, which wins, and what happens during an overlapping `effectiveFrom`/
   `effectiveTo` window with two active rules for the same role+type? No uniqueness constraint
   enforces "at most one active rule per (activityType, role) at a time" — MySQL can't express
   that as a clean partial/filtered unique index, and the migration doesn't attempt one. This
   would need to be an **application-level check** at write time (e.g. the future `PUT
   /api/productivity/rules` handler), documented here as a gap, not solved by the schema.
3. **`DailyActivityLog.sourceTable`/`sourceAction` free-text vs. constrained vocabulary** — left
   as plain `String` (not validated at the DB layer) since the exact set of CRM route/action
   strings that will populate them depends on Phase 2 capture-hook implementation, not decided
   yet.
4. The broader open questions already listed in
   [`DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md`](./DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md) §18
   (zero-activity-day + late-submission semantics, proposal versioning, note-channel
   differentiation) are schema-adjacent but don't block this draft — none of them require a
   different column shape than what's drafted here, only different application logic on top
   of it.

## 12. Confirmation (as of Phase W1, draft)

The Prisma schema in `prisma/schema.prisma` was edited to add the 6 models above and the
`CrmMeeting.status` field. A draft migration file was hand-written at
`prisma/migrations/20260625120000_daily_activity_foundation/migration.sql`. As of Phase W1,
this was draft-only. **Phase W1B (below) has since applied it to the dev database** — this
section is left as the historical Phase W1 record; §13 is the current status.

## 13. Phase W1B UAT Application Status (2026-06-25)

> **SQL manually applied to the UAT/dev database (`u686730471_caveodev` on
> `srv2201.hstgr.io`). Migration marked applied via `prisma migrate resolve`. Production was
> not touched at any point.**

### What was applied
- The 6 `CREATE TABLE` statements (`DailyActivityLog`, `DailyActivitySummary`,
  `DailyActivityCorrectionRequest`, `DailyProductivityScore`, `ProductivityActivityRule`,
  `ProductivityRoleTarget`), the `CrmMeeting.status` column + index, and all 9 foreign-key
  constraints — applied via a one-off Node script
  (`prisma/apply-daily-activity-foundation.mjs`, mariadb driver, hard-coded dev-DB-name guard
  identical in style to this project's existing `apply-soft-delete-fields-phase-a.mjs` and
  similar scripts) that reads and executes `migration.sql` directly, statement by statement.
- **Not applied via** `prisma migrate dev`, `prisma migrate deploy`, or `prisma db push` — all
  three were correctly avoided per the strict instructions for this phase.

### Blocking issue found, documented, and fixed
On first application attempt, statement 6 of 17 (`CREATE TABLE DailyProductivityScore`)
failed with MySQL/MariaDB error 1059 (`Identifier name
'DailyProductivityScore_employeeId_periodType_periodStart_periodEnd_key' is too long`) —
Prisma's default-generated constraint name (71 characters) exceeds MySQL/MariaDB's
64-character identifier limit. This was not caught by `prisma validate` (which doesn't
check generated SQL identifier length) or by the earlier hand-review, since the limit only
bites the *generated* constraint name, not anything visible in the schema's field list.

The first 5 statements (the `CrmMeeting` column/index and 3 of the 6 new tables) had already
applied successfully before the failure; application correctly **stopped** at that point per
instruction, rather than silently working around it.

**Fix applied** (the one explicitly-permitted exception to "don't modify the already-created
migration SQL," since this is a genuine blocking issue, documented here): the unique
constraint was given an explicit short name —
`@@unique([employeeId, periodType, periodStart, periodEnd], name:
"uq_daily_productivity_score_period")` in `prisma/schema.prisma`, and the corresponding
`UNIQUE INDEX` line in `migration.sql` updated to match (`uq_daily_productivity_score_period`,
35 characters). A full scan of every other identifier in the migration file
(`grep` for backtick-quoted names, checked against the 64-char limit) confirmed this was the
**only** identifier over the limit — no other statement needed changing.

The apply script was re-run; it correctly skipped the 5 already-applied statements (detected
via MySQL "already exists" error codes 1050/1060/1061/1091, the same idempotent-skip pattern
this project's other apply scripts use) and applied the remaining 12, including the now-fixed
`DailyProductivityScore` table. **All 17 statements applied successfully on the second run.**

### Backup / pre-migration baseline
A full `mysqldump` was not taken — not available in this environment, and not proportionate
to the risk, since the migration is 100% additive and the one existing table being altered
(`CrmMeeting`) had **zero rows** at the time. Instead, a read-only pre-migration snapshot
(`prisma/snapshot-daily-activity-foundation-pre-migration.mjs`, SELECT/SHOW/
information_schema only) was captured and saved to
`docs/webapp/DAILY_ACTIVITY_FOUNDATION_PRE_MIGRATION_SNAPSHOT_20260625.md`:
`CrmMeeting` = 0 rows, `DailyUpdate` = 0 rows, `CrmActivity` = 95 rows, none of the 6 new
tables pre-existed, migration not already recorded. This snapshot is the rollback/verification
baseline — rollback, if ever needed, is a trivial `DROP TABLE` × 6 plus one `DROP COLUMN`,
since no existing data was touched.

### Database object verification (post-migration, read-only)
Via `prisma/verify-daily-activity-foundation.mjs` (information_schema queries only):
- All 6 new tables exist, all with **0 rows** (no seed/default rule data was inserted).
- `CrmMeeting.status`: `VARCHAR`, `NOT NULL`, default `'SCHEDULED'` — confirmed.
- `CrmMeeting_status_idx` — confirmed present.
- Index counts per table matched the expected design exactly (`DailyActivityLog`: 6,
  `DailyActivitySummary`: 5, `DailyActivityCorrectionRequest`: 5, `DailyProductivityScore`: 3,
  `ProductivityActivityRule`: 2, `ProductivityRoleTarget`: 2 — PRIMARY + each `@@index`/
  `@@unique` from the schema).
- Foreign-key counts per table matched exactly (`DailyActivityLog`: 2, `DailyActivitySummary`:
  2, `DailyActivityCorrectionRequest`: 4, `DailyProductivityScore`: 1, the two config tables: 0
  each, correctly relation-free).
- **`DailyUpdate` row count: 0 (unchanged from baseline). `CrmActivity` row count: 95
  (unchanged from baseline). `CrmMeeting` row count: 0 (unchanged from baseline).** No existing
  data of any kind was modified by this migration.

### Migration marked applied
`npx prisma migrate resolve --applied 20260625120000_daily_activity_foundation` — succeeded.
A subsequent read-only `npx prisma migrate status` confirms this migration is **not** in the
unapplied list (two other, pre-existing, unrelated migrations —
`20260615000000_add_advance_category` and `20260617100000_employeetarget_relations` — show as
unapplied; both predate this work and are out of scope for this phase, not touched here).

### Validation commands run
`npx prisma validate` ✅ · `npx prisma generate` ✅ (codegen only, no DB write) ·
`npx tsc --noEmit` ✅ · `npm run build` ✅ (162 routes) · `npx prisma migrate status` (read-only,
exit code reflects the two unrelated pre-existing pending migrations noted above, not this
one).

### Confirmation
Applied to **UAT/dev only** (`u686730471_caveodev`). Production was never connected to, read
from, or written to at any point in this phase. No API route was created or modified. No UI
was built. No mobile code was touched. No `prisma migrate dev`, `prisma migrate deploy`, or
`prisma db push` was run at any point. No `.env` file was committed or printed. No seed/default
rule rows were inserted into `ProductivityActivityRule` or `ProductivityRoleTarget` — both
exist with 0 rows, exactly as planned for this phase.

**Daily Activity foundation migration applied to UAT/dev only. Production not touched.**

**Do not touch production.**
