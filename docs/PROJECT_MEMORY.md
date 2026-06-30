# Project Memory — Caveo CRM (kra-tracker)

> Single source of truth for what this project IS and where it stands.
> Read this first, then ARCHITECTURE → DATABASE → API → DESIGN_SYSTEM → CHANGELOG.

## 1. Project Purpose
Internal **Sales CRM + KRA performance tracker** for **Caveo Infosystems** (an IT
infrastructure / security solutions reseller). It gives the sales team and management:
- A **pipeline** of leads → opportunities (kanban + table).
- **Activity sheets** (lead generation, sales funnel, collections, daily updates) that
  **auto-compute weekly KRA progress** — no manual scoring.
- A **finance module**: invoices/collections, a payment ledger, order advances, and
  in-app notifications.
- **Manager & employee dashboards**, a **customer master**, an **admin config panel**,
  and a **mobile web app** (incl. business-card OCR lead capture).

- **Repo:** `github.com/caveoinfo2025/kra-tracker` (branch `master`)
- **Production:** `https://sales.caveoinfosystems.com` (Hostinger, Passenger-managed Node + reverse proxy)
- **Local dev:** `http://localhost:3000`
- **Database:** **MySQL / MariaDB 11.8** (migrated from SQLite 2026-06-02).

## 0. Current status (2026-06-25 — Step 4H-7: FT-2b and FT-4 handed off for manual verification by Vijesh; production stays paused)

### 2026-06-30 — Phase W8.1: Enterprise KRA mapping UI corrected for business users

Phase W8.1 corrected the Enterprise KRA mapping UI for business users. **Raw JSON editing removed**
from the Daily Activity KRA mapping (`DailyActivityKraMapping.tsx`) — replaced with form controls
(dropdowns, checkboxes, toggles, number fields). `KRAMetric.formulaJson` is now an internal storage
detail; engine mappers `parseDailyActivityMetricConfig` / `buildDailyActivityMetricFormulaJson` /
`validateDailyActivityMetricFormPayload` convert between business fields and JSON; the API GET returns a
parsed `config`, PUT accepts a business `config` payload. **KRA targets confirmed as employee-wise**:
Employee Targets UI now selects by employee **name** (no raw profile IDs), shows role/department/
reporting manager, and treats role templates as **starting templates** only — each employee can have
different targets. Engine adds `listEmployeeProfilesForTargeting()` + enriched `listEmployeeTargets`.
**No `KRAAchievement`, `PerformanceReview`, or `EmployeeTarget` automation; no schema, migration,
`DailyUpdate` revival, mobile, or production changes.**

### 2026-06-30 — Phase W8: Enterprise KRA Daily Activity mapping setup (config only)

Phase W8 added Enterprise KRA Daily Activity mapping setup using `KRAMetric`
`calculationSource="DAILY_ACTIVITY"`. Three default mapping metrics
(`DAILY_ACTIVITY_COVERAGE`/`_PRODUCTIVITY`/`_COMPLIANCE`) are managed via an idempotent engine
(`src/lib/performance-engine/daily-activity-mapping.ts`), a manager-gated admin API
(`GET/POST/PUT /api/admin/performance/daily-activity-mapping`), and a "Daily Activity KRA" tab in
`/settings/performance` (with an explicit "does not write achievements" warning, no convert
button). `KRAMetric` has no `targetJson`/`weight`/`isActive` column, so the target definition is
nested in `formulaJson` and `status` is the enable/disable — **no schema change**. **No
`KRAAchievement`, `PerformanceReview`, or `EmployeeTarget` automation/writes; no migration; no
`DailyUpdate` revival; mobile and production untouched.** Legacy KRA/`WeeklyReview` remains
historical/read-only (guardrail comment added in `daily-activity.ts`). Record:
`docs/webapp/DAILY_ACTIVITY_ENTERPRISE_KRA_INTEGRATION_PLAN.md` (Phase W8).

### 2026-06-30 — Phase W7: Daily Activity → Enterprise KRA integration planned (audit + mapping only)

Phase W7 planned Daily Activity integration with Enterprise KRA. **Enterprise KRA is the only
future KRA path**; legacy KRA/`WeeklyReview`/`kra-engine.ts` remains historical/read-only. Audit
confirmed Daily Activity can feed Enterprise KRA with **no schema change** (uses existing
`KRAMetric.calculationSource`, `KRAAchievement.sourceReference`, JSON blobs, and the existing
`performance-engine/achievement.ts` write path; precedent: `/api/kra/sync-achievements`).
Recommended **Option D** — read-only monthly preview → manager-approved conversion to
`KRAAchievement`. **No KRA writes, schema, migrations, `db push`, `DailyUpdate` revival, mobile, or
production changes** were made. Deliverable:
`docs/webapp/DAILY_ACTIVITY_ENTERPRISE_KRA_INTEGRATION_PLAN.md`.

### 2026-06-29 — Phase W6.2: Enterprise KRA selected; Daily Updates retired from active use

Business decision closes the §17.1 open question from Phase W6: **Enterprise KRA
(`EmployeeProfile`/`EmployeeTarget`/`KRAAchievement`/`PerformanceReview`) is the only path for
all future KRA development.** Legacy `KRA`/`WeeklyReview` (scored via `src/lib/kra-engine.ts`) is
now historical/read-only — no new Daily Activity or other feature logic may be added there. No
Enterprise KRA wiring was implemented this phase (no writes to `KRAAchievement`/
`PerformanceReview`/`EmployeeTarget`) — this is direction-setting only.

**Daily Updates is retired from active use; Daily Activity is the active workflow.** `/daily-updates`
now redirects to `/daily-activity`; `/api/daily-updates` and `/api/daily-updates/[id]` return
`410 Gone` for all methods (no rows created/modified/deleted); the nav links were removed (Daily
Activity remains); the employee profile "recent blockers" panel now reads from
`DailyActivitySummary.blockers` instead of `DailyUpdate`. The `DailyUpdate` Prisma model/table and
its historical data are preserved untouched — no schema change, no migration, no `db push`.
Mobile and production untouched. Full audit and table: `docs/webapp/WEBAPP_GAP_CLOSURE_PLAN.md`
§"Daily Updates Usage Audit".

### 2026-06-29 — Phase W6.1: Daily Activity effective status lifecycle implemented

Phase W6.1 implemented Daily Activity effective status lifecycle. Days past grace with activity
but no summary now resolve as INCOMPLETE at read time. KRA wiring, DailyUpdate deprecation,
mobile, schema, migrations, and production remain untouched. New `resolveEffectiveDailyActivityStatus()`
in `src/lib/daily-activity.ts` is a read-time-only overlay (never writes to the DB), wired into
every employee/manager read path (`getDailyActivityForEmployee`, `getDailyActivityHistoryForEmployee`,
`getDailyActivityForManagerEmployee`, `getTeamDailyActivity`). Centralized cutoff/grace helpers
(`getDailyActivityCutoffWindow`/`isPastGraceWindow`/`isWithinSummarySubmissionWindow`) replace
duplicated inline date math. Added unwired KRA-eligibility placeholder helpers
(`isDailyActivityKraEligible`/`getDailyActivityKraEligibilityReason`) per the W6 plan's matrix —
no KRA system call, §17.1 (which KRA system to feed) remains an open decision. Verified via
`scripts/test-daily-activity-status-lifecycle.mjs` (19/19) and a live browser check (manager
dashboard correctly showed "Incomplete" + totals + points for a temporary stuck-day row, fully
cleaned up after).

### 2026-06-29 — Phase W6: Daily Activity KRA/reporting integration planned

Phase W6 planned Daily Activity KRA/reporting integration, including status lifecycle, KRA
eligibility, reporting APIs/UI, DailyProductivityScore usage, and DailyUpdate deprecation
approach. No code/schema/migration/mobile/production changes. Key audit finding: two parallel
KRA systems exist (legacy `KRA`/`WeeklyReview`, scored via `src/lib/kra-engine.ts`'s
formula-based `computeKRAProgress()` off `LeadGeneration`/`SalesFunnel`/`Collection`; enterprise
`EmployeeProfile`/`EmployeeTarget`/`KRAAchievement`) and neither reads `DailyUpdate`,
`DailyActivityLog`/`DailyActivitySummary`, or `DailyProductivityScore` today — `DailyUpdate`'s
only KRA-adjacent touchpoint is a display-only blockers panel on the employee profile page, zero
scoring dependency. Confirmed gap: `INCOMPLETE` is a documented valid status with no write path
ever assigning it; recommended fix is a dynamic effective-status predicate now, a scheduled
close-day job only if/when needed later. `DailyProductivityScore` re-confirmed unused; recommend
dynamic rollup computation first, snapshots later. Full plan:
`docs/webapp/DAILY_ACTIVITY_KRA_REPORTING_PLAN.md`.

### 2026-06-29 — Phase W5: Daily Activity write workflows connected to the webapp UI

Phase W5 connected Daily Activity write workflows to the webapp UI: employee summary
submit/edit, employee correction request, manager approve/reject, and manager reopen.
DailyUpdate remained unchanged. Mobile and production untouched. `EmployeeActivityView.tsx` and
`ManagerActivityPanel.tsx` wired to the existing Phase W4 routes (`POST`/`PUT
/api/daily-activity/summary`, `POST /api/daily-activity/corrections`, `POST
/api/daily-activity/corrections/[id]/approve|reject`, `POST /api/daily-activity/day/
[employeeId]/[date]/reopen`) — no new API routes. One additive backend field
(`pendingCorrections` on `ManagerEmployeeDayView`) so the manager detail view has correction
request ids to act on. Fixed a client/server bundle bug found during `npm run build` (a client
component was transitively importing the server-only `mariadb` driver via `@/lib/daily-activity`)
and a leftover banned `toISOString().slice(0,10)` pattern in `ManagerActivityPanel.tsx`.
Browser-verified end-to-end on the dev DB (employee submit/edit/correction-request, manager
approve/reject/reopen) — points hidden from employee throughout, visible to manager throughout,
no manual point entry anywhere. Full record: `docs/webapp/WEBAPP_GAP_CLOSURE_PLAN.md` "Phase W5
progress", `docs/webapp/DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md` "Phase W5".

### 2026-06-29 — Phase W4.1: `@db.Date` round-trip standardized for Daily Activity

Phase W4.1 standardized date-only handling for Daily Activity after discovering Prisma/MySQL
`@db.Date` IST round-trip shift. Shared helper added, Daily Activity refactored, validation
passed. DailyUpdate, mobile, schema, migrations, and production untouched. New shared module
`src/lib/date-only.ts` (`parseDateOnlyAsLocalDate`, `toDateKeyLocal`, `dateKeyToDbDate`,
`dbDateToDateKey`, `dbDateToLocalDate`) replaces Phase W4's narrow `recoverLocalDayFromDbDate`
workaround with a root fix applied at every `activityDate`/`summaryDate` read/write site in
`src/lib/daily-activity.ts`, not just the 3 sites Phase W4 happened to touch. Audited the full
schema — confirmed `activityDate`/`summaryDate`/`periodStart`/`periodEnd` are the only
`@db.Date` columns; no KRA/WeeklyReview/DailyUpdate field is affected. New test script
`scripts/test-date-only-handling.mjs` (19/19 passed, including a live DB round trip with
temporary rows, fully cleaned up). `npx prisma validate`/`generate`, `npx tsc --noEmit`,
`npm run build` all clean. Full record: `docs/webapp/WEBAPP_GAP_CLOSURE_PLAN.md` "Phase W4.1",
`docs/webapp/DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md` "Phase W4.1".

### 2026-06-29 — Phase W4: Daily Activity backend write workflows implemented

Phase W4 implemented Daily Activity backend write workflows: employee summary submission/
edit, correction request creation, manager approve/reject, and manager reopen. DailyUpdate
UI/API unchanged. Mobile and production untouched. No schema/migration/db-push changes; no UI
write flow yet (that's a later phase). `src/lib/daily-activity.ts` extended with
`submitDailyActivitySummary`, `updateDailyActivitySummary`, `createDailyActivityCorrectionRequest`,
`approveDailyActivityCorrectionRequest`, `rejectDailyActivityCorrectionRequest`,
`reopenDailyActivityDay`, `writeDailyActivityAuditLog` (reuses the existing `AuditLog` model —
no new audit table), plus the `canSubmitDailySummary`/`canEditDailySummary` cutoff/grace/
late-window decision helpers. 5 new write routes under `/api/daily-activity/*`. Manager
write-authorization mirrors the existing read-side "any manager sees/acts on all employees"
precedent, not narrowed to `reportsToId`. Discovered (and partly fixed) a deeper bug during
this phase: writing a local-midnight `Date` into a `@db.Date` Prisma column truncates to the
*previous* UTC day on this IST server — broader than the Phase W3.2 string-parsing bug, since
it's in the Prisma↔MySQL `Date`↔`DATE` marshalling itself, not API-layer parsing. Worked
around in Phase W4's new code via `recoverLocalDayFromDbDate`, and one already-live instance
of it in Phase W2's `getDailyActivityHistoryForEmployee` was found and fixed the same way. The
underlying DB round-trip issue itself is not fixed at the root — flagged as a recommended next
step. Verified via a throwaway script (20/20 checks, all rows cleaned up). Full record:
`docs/webapp/WEBAPP_GAP_CLOSURE_PLAN.md` "Phase W4 progress",
`docs/webapp/DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md` "Phase W4 — backend write workflow
implementation notes".

### 2026-06-29 — Phase W3.2: Daily Activity date-only parsing bug fixed

Phase W3.2 fixed Daily Activity date-only parsing bug for manager team/detail/history APIs.
Date strings now parse as local dates to avoid IST/positive-UTC day shifts. No schema,
migration, DB push, mobile, DailyUpdate, or production changes. Two new helpers
(`parseDateOnlyAsLocalDate`, `toDateKeyLocal`) added to `src/lib/daily-activity.ts`; both team
routes now parse their date param via the new helper and return `400` on invalid input
instead of silently shifting or (for the path-param route) never actually catching malformed
strings. Scope was confirmed broader than the original report during this fix: every
`date`/`summaryDate` output field in `daily-activity.ts` — including `/api/daily-activity/
today`'s own field — was using the same buggy `toISOString().slice(0, 10)` pattern and is now
on `toDateKeyLocal`. Verified via a throwaway script (15/15 checks, deleted after running) and
live browser/API re-verification: `team?date=2026-06-28` and `team/[id]/2026-06-28` both now
return `2026-06-28` (were `2026-06-27`); `/today` now returns the true wall-clock date; four
invalid-date examples now return `400`. Employee points-hidden / manager points-visible
behavior reconfirmed unchanged. Full record:
`docs/webapp/WEBAPP_GAP_CLOSURE_PLAN.md` "Phase W3.2 fix",
`docs/webapp/DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md` "Phase W3.2 — date-only parameter
handling rule".

### 2026-06-29 — Phase W3.1: browser verification of the read-only Daily Activity webapp page

Phase W3.1 browser verification completed for Daily Activity read-only webapp page.
Employee/manager visibility confirmed. DailyUpdate compatibility confirmed. Mobile and
production untouched. Tested via dev quick-login impersonation (Priya Nair — non-manager;
Vijesh Vijayan — manager) against the local dev server. Confirmed: no "points" text or write
buttons anywhere on the employee view; manager-only API routes 403 a non-manager's session
even when called directly; `employeeId` query-param override on `/api/daily-activity/today`
is silently ignored; manager team table/date-filter/inline detail/disabled future-action
buttons all render and behave per spec; every Daily Activity HTTP call observed was `GET`
(no mutation possible from this UI); `/daily-updates` CRUD and the new banner both work
side-by-side. One pre-existing Phase W2 backend bug was found (not fixed, per verification-
only scope): the date-filtered team endpoints return the previous day's data on a
positive-UTC-offset server due to a UTC/local-time mismatch in date-string parsing. Full
record: `docs/webapp/WEBAPP_GAP_CLOSURE_PLAN.md` "Phase W3.1 verification",
`docs/webapp/DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md` "Phase W3.1 browser verification notes".

### 2026-06-29 — Phase W3: read-only Daily Activity webapp UI added

Phase W3 added read-only Daily Activity webapp UI using existing APIs. Mobile remained
paused. DailyUpdate remained unchanged. No write workflows or production changes. New
`/daily-activity` page (`src/app/daily-activity/page.tsx` + `EmployeeActivityView.tsx` +
`ManagerActivityPanel.tsx` + `labels.ts`) renders the Phase W2 read APIs: employee status/
band/counts/timeline/summary (never exact points — enforced by the TypeScript shape, not just
the API), and a manager team dashboard with date filter, totals, and an inline expandable
employee/day detail row showing exact points. Approve/Reject/Reopen are visible-but-disabled
placeholders. Non-destructive "Daily Activity preview" banner added to `/daily-updates`;
"Daily Activity" nav item added alongside "Daily Updates" in `SidebarLinks.tsx`. `npx prisma
validate`/`generate`, `npx tsc --noEmit`, and `npm run build` all clean. Full record:
`docs/webapp/WEBAPP_GAP_CLOSURE_PLAN.md` "Phase W3 progress",
`docs/webapp/DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md` "Phase W3 implementation notes".

### 2026-06-25 — Phase W2: Daily Activity event-capture hooks and read-only APIs implemented

Phase W2 implemented webapp Daily Activity event-capture hooks and read-only APIs. Mobile
remained paused. DailyUpdate UI/API unchanged. Production untouched. New
`src/lib/daily-activity.ts` helper; capture hooks added to 7 existing pipeline API routes
(lead stage/update, task update/complete, meeting scheduled, opportunity update, notes,
lead activity log); 4 new read-only routes under `/api/daily-activity/*` (`today`, `history`,
`team`, `team/[employeeId]/[date]`). Employee responses never include exact points; manager
responses do. MEETING_COMPLETED capture exists in the helper but has no live route hook yet —
no meeting-update API exists in the webapp. Manually verified against the dev DB (15/15 checks
passed, test rows fully cleaned up); `npx tsc --noEmit` and `npm run build` clean. Full record:
`docs/webapp/WEBAPP_GAP_CLOSURE_PLAN.md` "Phase W2 progress",
`docs/webapp/DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md` "Phase W2 implementation notes".

### 2026-06-25 — Phase W1B: Daily Activity foundation migration applied to UAT/dev only

Daily Activity foundation schema was manually applied to UAT/dev only and marked applied with
Prisma migrate resolve. No API/UI/mobile/production changes. Applied to `u686730471_caveodev`
via `prisma/apply-daily-activity-foundation.mjs` (hand-applied SQL, hardcoded dev-DB-name
guard), then `npx prisma migrate resolve --applied 20260625120000_daily_activity_foundation`.
One blocking issue found and fixed during application: the default-generated unique
constraint name on `DailyProductivityScore` exceeded MySQL's 64-character identifier limit —
renamed to `uq_daily_productivity_score_period` in both `prisma/schema.prisma` and the
migration file (documented in `docs/webapp/DAILY_ACTIVITY_SCHEMA_DESIGN_REVIEW.md` §13).
Post-migration verification confirmed all 6 new tables exist with 0 rows (no seed data) and
`DailyUpdate`/`CrmActivity`/`CrmMeeting` row counts are unchanged from the pre-migration
snapshot. Full record: `docs/webapp/DAILY_ACTIVITY_SCHEMA_DESIGN_REVIEW.md` §13,
`docs/webapp/DAILY_ACTIVITY_FOUNDATION_PRE_MIGRATION_SNAPSHOT_20260625.md`.

### 2026-06-25 — Phase W1: Daily Activity schema design reviewed (draft only, not applied)

Phase W1 schema design reviewed for webapp Daily Activity. Draft migration created only. No
migration applied, no `db push`, no production changes. 6 new models drafted
(`DailyActivityLog`, `DailyActivitySummary`, `DailyActivityCorrectionRequest`,
`DailyProductivityScore`, `ProductivityActivityRule`, `ProductivityRoleTarget`) plus a draft
`CrmMeeting.status` column. Full review: `docs/webapp/DAILY_ACTIVITY_SCHEMA_DESIGN_REVIEW.md`.
Draft migration file: `prisma/migrations/20260625120000_daily_activity_foundation/migration.sql`
— hand-written (not tool-generated, since both `prisma migrate dev` and `prisma migrate diff
--from-config-datasource` would have required connecting to a database, which this draft-only
step avoided). **Not applied to UAT or production.**

### 2026-06-25 — Daily Updates workflow revised to Daily Activity & Productivity (planning only)

Daily Updates workflow revised to Daily Activity & Productivity. Planning created before
schema/API changes. No schema/migration/API/production changes made. Full requirements and
architecture plan: `docs/Mobile/DAILY_ACTIVITY_PRODUCTIVITY_WORKFLOW_PLAN.md`.

### 2026-06-25 — Mobile phase paused; focus shifted to webapp gap closure + Daily Activity webapp workflow

Mobile phase paused. Webapp gaps and Daily Activity replacement for Daily Updates are now
priority. Planning created before schema/API changes. Production remains paused. Mobile work
resumes only on Vijesh's explicit instruction. Plans:
`docs/webapp/WEBAPP_GAP_CLOSURE_PLAN.md`, `docs/webapp/DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md`.

### 2026-06-25 — Step 4H-7: Manual verification handoff — FT-2b and FT-4

Vijesh's instruction: **"Skip both tests; I will do them manually. Proceed next step."**

FT-2b (Microsoft Entra ID OAuth end-to-end login) and FT-4 (UAT backup restore-test) are no
longer being pursued via automated/session attempts. Both are reassigned to Vijesh for manual
completion or formal acceptance, marked **Manual verification pending — owner: Vijesh
Vijayan** — explicitly not Closed and not Accepted Risk, a distinct intermediate status.

This reflects the genuine state reached over several prior rounds: FT-2b requires a real
human login/MFA that no available tool can perform; FT-4's blocker was narrowed down to a
precise access boundary (the UAT DB user's grants are scoped to `u686730471_Caveo_UAT` only,
no privilege to create a scratch database) that needs either a hPanel-side grant change or
direct Hostinger access Vijesh has and this session doesn't.

**Production remains paused** until Vijesh manually verifies or explicitly accepts both items
and separately instructs production planning to resume — neither has happened yet. This step
made no code, schema, or UAT data change.

Note: live UAT (`https://uat.caveoinfosystems.com`) returned **HTTP 503 on every route**
(including `/login`) when checked during this step — the app appears to be down or restarting
(possibly the CloudLinux LVE worker-pileup issue in `CLAUDE.md` gotcha #8). Not investigated
or acted on further — out of scope for this documentation-only step, and no SSH/hPanel access
is available to this session regardless.

### 2026-06-25 — Final UAT gap closure attempt: FT-2b and FT-4 remain Open

Attempted to close the last two of the five original UAT gaps.

**FT-2b (Entra ID OAuth end-to-end) — still Open.** A real login/MFA flow on
`uat.caveoinfosystems.com` requires Vijesh or another authorized human to perform it directly
— no available tool can authenticate as a real user or approve MFA. The connected browser
also still blocks all navigation to the UAT domain under the standing org policy. No
login/logout result was fabricated; the task's own instruction for this case ("if not
possible, keep Open, record the exact blocker, do not fabricate") was followed exactly.

**FT-4 (backup restore-test) — still Open, but the blocker is now precisely identified.** The
named backup file (`u686730471_Caveo_UAT_240626.sql`) is present locally this round and
confirmed valid: a 459KB phpMyAdmin dump dated 2026-06-24 02:36, no embedded
`CREATE DATABASE`/`DROP DATABASE` statements. Checked the existing UAT DB user's privileges
directly with `SHOW GRANTS`: `GRANT ALL PRIVILEGES ON u686730471_Caveo_UAT.*` only — no
privilege to create a database anywhere else on the server. This is a genuine access
boundary, not a missing-file or missing-tool problem as in prior rounds. Closing this requires
either a new scratch database provisioned in hPanel with access granted to this (or a new)
user, someone with broader Hostinger access running the restore directly, or Vijesh explicitly
accepting this as residual risk — none of which happened this round, so FT-4 was not
escalated to Accepted Risk.

**Remaining UAT gaps: FT-2b, FT-4.** FT-3, FT-1, and FT-5 are Closed. **UAT is not yet fully
closed; production remains paused**, unchanged, until both remaining gaps close (or Vijesh
explicitly accepts residual risk) and gives explicit instruction to resume. No production
action was taken; no UAT data was read, written, or modified — the only DB action this round
was a read-only `SHOW GRANTS` query.

### 2026-06-25 — FT-5 Closed: Sales Funnel + OrderAdvance click-through verified

The DB handshake blocker resolved on its own — the connecting public IP had been drifting
across retries (`122.164.84.5` → `122.164.42.13` mentioned but already stale → currently
`122.165.42.13`), confirming this is a dynamic-IP network, not a misconfigured grant. Once
the IP stabilized at `122.165.42.13`, the direct handshake succeeded immediately against
`u686730471_Caveo_UAT`.

Sales Funnel and OrderAdvance were both tested via the dev-bypass harness (updated to current
`uat` HEAD `afecb84`), logged in as Manager (employee id 4, "Vijesh") via the dev-session
cookie, using direct HTTP requests rather than browser clicks (the org browser policy still
blocks all navigation, including localhost — unchanged from every prior round). Both pages
returned the exact server-rendered output a browser would receive: real UAT rows, correct
`formatINRAsLakhs()` conversions confirmed by exact arithmetic match (`795000` INR → `₹7.95L`
on Sales Funnel; `37967` INR → `₹0.38L` on OrderAdvance/Accounts), no `NaN`, no
`[object Object]`, no 100,000× inflation or reduction, no crashes, clean server logs with no
errors and no `[layout] DB unavailable` fallback warnings (confirming a real connection).

**FT-5: Closed.** Of the five original UAT closure items, FT-3, FT-1, and now FT-5 are
resolved; FT-2b and FT-4 remain Open. **Production stays paused** until both close and Vijesh
gives explicit instruction to resume. No production action was taken; no UAT data was
modified — only `GET` requests were made (the one `POST /api/dev/switch` call sets a local
session cookie, it does not write to the UAT database).

### 2026-06-25 — FT-5 retry, gated DB handshake check: still fails, stopped before any UI testing

This round's task explicitly gated harness/browser testing on a successful direct DB handshake
first, with instructions to stop immediately (not retry UI testing) if it still failed.
Confirmed local public IP unchanged (`122.164.84.5`), then re-ran the direct MySQL handshake —
**identical `ER_ACCESS_DENIED_ERROR (1045)`** for the same user/IP, the fourth consecutive
identical result. Per instruction, stopped here: no harness/UI testing was started at all this
round (a stricter stop than prior rounds, which at least confirmed the harness itself was
healthy before hitting the DB block).

**FT-5: still Open.** No production action taken; no UAT data touched beyond the single failed
authentication attempt. `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅.

### 2026-06-25 — FT-5 retry after MySQL user-grant fix: identical error, fix not yet effective

Retried FT-5 a third time after the task reported that the Hostinger-side MySQL user-grant fix
(allowing `u686730471_caveouat` to connect from `122.164.84.5`) had been applied. Confirmed
local public IP unchanged first (`122.164.84.5`, ruling out a stale-IP mismatch), then re-ran
the direct MySQL handshake test against the harness's `.env`.

**Result: identical error, character-for-character** —
`ER_ACCESS_DENIED_ERROR (1045): Access denied for user 'u686730471_caveouat'@'122.164.84.5'
(using password: YES)`. Same user, same IP, same code as the prior round. This indicates the
grant change has not taken effect yet from this client's perspective (could be a propagation
delay, the wrong DB user was granted, or the grant wasn't saved) — not a new or different
problem, and not something to guess at further without more information.

**FT-5: still Open.** Sales Funnel and OrderAdvance click-through were **not run** — no result
fabricated for either. The harness (`kra-tracker-uat-verify`, port 3001) remains running and
otherwise healthy (responds normally to non-DB-dependent requests) for the next retry. No
production action taken; no UAT data was read or written. `npx prisma validate` ✅,
`npx tsc --noEmit` ✅, `npm run build` ✅.

### 2026-06-25 — FT-5 retry: network path opened, blocked by a MySQL user-grant issue instead

Retried FT-5 after the IP whitelist was reportedly updated on Hostinger. Updated the
`kra-tracker-uat-verify` worktree to current `uat` HEAD (`9cda027`, includes the FT-1 fix) and
restarted the harness. Also noted along the way: `npm run uat:check-version` now reports
**MISMATCH** (live UAT still serves `3652ec0`, predating this session's push to `9cda027`) —
expected lag, not a regression of FT-3's prior closure, but reported honestly rather than
glossed over.

Diagnosis: raw TCP to `srv2201.hstgr.io:3306` now succeeds (the network/firewall path is open —
real progress from the whitelist change). A direct MySQL handshake (bypassing Prisma's pool,
password never printed) returned a precise error instead of a generic timeout:
`ER_ACCESS_DENIED_ERROR (1045): Access denied for user 'u686730471_caveouat'@'122.164.84.5'
(using password: YES)`. This is a MySQL user-grant problem, not a network block — the account
doesn't yet have a grant covering this IP even though the IP can now reach the port.

**FT-5: still Open.** Sales Funnel and OrderAdvance click-through were not run — neither could
load real data past this DB block, and no result was fabricated for either. Harness left
running for a further retry once the grant is updated. No production action taken; no UAT
data was read or written (every attempt either failed pre-auth or was a read-only diagnostic).
`npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅.

### 2026-06-25 — Step 4H-6: Remaining UAT gap closure

Attempted the four gaps left after FT-3 closed (Step 4H-5).

**FT-1 (KRA fallback constants) — Closed via a real code fix, not just review.** Reading
`src/lib/kra-engine.ts` end to end surfaced an actual bug: 7 hardcoded Lakhs-scale fallback
targets (used only when no admin-configured KRA target string supplies that KPI) were being
divided into post-Step-3U INR-scale achieved values directly — a ~100,000× unit mismatch that
silently clamps to ~100% progress whenever a KRA lacks an explicit target, masking true
performance. Fixed with a `LAKHS_TO_INR = 100_000` constant scaling all seven fallbacks;
reviewed every downstream use (`gpLakhTarget`, `billingTarget`, all `inrToLakhsEquivalent()`
display calls) for double-conversion — none found. `npx tsc --noEmit` clean.

**FT-5 (Sales Funnel + OrderAdvance) — still Open.** Attempted via the same dev-bypass harness
method as Step 4H-1. Hit two genuine blockers: the connected Chrome browser blocks all
navigation under an org policy (confirmed domain-wide, including `localhost`), and the
harness's connection to the live UAT database pool-timed-out — most likely an IP-whitelist gap
on Hostinger's Remote MySQL access (current IP `122.164.84.5`). User chose to whitelist that IP
and have this retried; the harness was left running rather than torn down.

**FT-2b (Entra ID OAuth) — still Open.** Confirmed again that a real interactive login needs
human credentials/MFA no available tool can supply, now also blocked by the same browser
policy. User chose to document this rather than attempt a workaround.

**FT-4 (backup restore-test) — still Open, tooling limitation.** No `mysql`/`mariadb` CLI, no
Docker, and the named backup file (`u686730471_Caveo_UAT_240626.sql`) isn't present locally —
it lives on Hostinger, with no SSH/hPanel access this session. Not escalated to Accepted Risk
(needs Vijesh's explicit approval).

**Production remains paused** — one of five UAT closure items (FT-3) is fully closed, FT-1 is
now closed too, but FT-5/FT-2b/FT-4 remain open. No production database was queried, no
migration/`db push` was run, no UAT data was modified (the harness DB connection never
succeeded). `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅.

### 2026-06-24 — Step 4H-5: UAT version deployment verification — FT-3 Closed

`npm run deploy:uat` was run and failed cleanly (`HOSTINGER_SSH_PASSWORD` not set — no
credential was sought or worked around). Despite that, `https://uat.caveoinfosystems.com/api/version`
already returns HTTP 200 with `gitCommit: "b7062f3"`, matching local `uat` HEAD exactly —
verified independently via direct `curl` (twice, consistent) and `npm run uat:check-version`
(MATCH). The mechanism that got this commit onto UAT is **not confirmed** by this session (this
session's own deploy attempt never reached the SSH step); most likely a Hostinger
auto-deploy-on-push outside `scripts/deploy-uat.mjs`, reported as inferred, not asserted as fact.

Two cosmetic field gaps were found and documented rather than silently accepted: `gitBranch`
reads `"unknown"` instead of `"uat"` (git state on the UAT host at build time), and
`environment` reads `"local"` instead of `"uat"` (`NEXT_PUBLIC_DEPLOY_ENV` unset on UAT). Neither
affects the commit-identity match that FT-3 is actually about.

**FT-3: Closed.** Of the five UAT closure items, FT-3 is now resolved; FT-1, FT-2b, FT-4, FT-5
remain open and **production stays paused** until all close and Vijesh gives explicit
instruction to resume. No production database was queried, no migration/`db push` was run, no
UAT data was modified — the only UAT-facing calls were unauthenticated `GET /api/version`
requests. `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅.

### 2026-06-24 — Step 4H-4: App version marker added; FT-3 verification capability closed, FT-3 itself still Open

Adds the fix for the exact gap Step 4H-3 hit (no way to confirm the deployed UAT commit): a
public, unauthenticated `GET /api/version` route (`src/app/api/version/route.ts`, backed by
`src/lib/app-version.ts`, allowlisted in `auth.config.ts`'s `isPublic` check) returning only
non-sensitive build metadata (`gitCommit`, `gitBranch`, `buildTimestamp`, `environment`,
`nodeEnv`) — never the database or a credential. `scripts/write-build-version.mjs` populates the
source data (`src/generated/app-version.json`, gitignored) from `git rev-parse`/`git branch`,
fails safe, and now runs automatically as part of `npm run build`. `npm run uat:check-version`
(`scripts/check-uat-public-version.mjs`) fetches the live UAT endpoint and prints a real
MATCH/MISMATCH/UNKNOWN/UNAVAILABLE verdict instead of relying on inconclusive signals
(buildId, chunk-name patterns) like the prior two FT-3 attempts had to.

Run today against `https://uat.caveoinfosystems.com/api/version`: **UNAVAILABLE** — expected,
since this code has not been deployed to UAT (deployment was explicitly out of scope for this
step). **FT-3 remains Open** — this closes the capability gap, not FT-3 itself; FT-3 closes only
once UAT is redeployed and the check returns MATCH. Production remains paused (unchanged). No
production database was queried, no migration/`db push` was run, no UAT data was modified, no
deployment was performed. `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅.

### 2026-06-24 — Step 4H-3: FT-3 second verification attempt — status confirmed Open

A second, more rigorous attempt to close FT-3 (UAT deployed commit confirmation), following up
on Step 4H-2. Two checks were run, both genuinely attempted rather than assumed:

1. **`node scripts/check-uat-status.mjs`** — failed with "✗ `HOSTINGER_SSH_PASSWORD` env var is
   required." No credential was sought, guessed, or worked around — reported as unavailable.
2. **Public signal check against `https://uat.caveoinfosystems.com`** (no login) — checked for
   a version endpoint, release file, page metadata, footer marker, and static asset/build
   identifiers. Found nothing usable: every candidate API/release path returns the same generic
   `401`/redirect-to-login that *any* path gets, gated or not. A Next.js `buildId` value *is*
   embedded in the page's React Flight payload, but `next.config.ts` has no custom
   `generateBuildId` — the default is randomly generated per build, not derived from the git
   commit, so it cannot be linked to a known build artifact. Per explicit instruction, this was
   **not** treated as proof of match or mismatch, and neither was the previously-noted CSS
   chunk-naming difference.

**Outcome: FT-3 remains Open** (Option A per the task's own decision rule — applies because
neither Hostinger/deploy access nor a public version marker exists). Not escalated to Accepted
Risk (no explicit acceptance given this round) and not resolved via redeploy (no
`CONFIRM_UAT_REDEPLOY=YES` approval given). **Production remains paused**, unchanged from Step
4H-2 — production planning resumes only on Vijesh's explicit instruction, after all five UAT
gaps (FT-1, FT-2b, FT-3, FT-4, FT-5) close.

**No production database was queried, no production pre-check was run, no production migration
was prepared or executed, no `db push` was used, and no production-related command was run.**
This step is documentation-only — six docs updated (`UAT_DECIMAL_INR_MIGRATION_PLAN.md`,
`DECIMAL_MONEY_MIGRATION_PLAN.md`, `PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md`,
`RBAC_MIGRATION_TRACKER.md`, `PROJECT_MEMORY.md` (this entry), `DATABASE.md`).
`npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅.

### 2026-06-24 — Step 4H-2: Production deferral decision recorded; FT-3 attempted, remains Open

FT-3 (UAT deployed commit confirmation) was attempted: no SSH/server access or version endpoint
is available from this environment to confirm it, and the one circumstantial public signal
checked (a live-response CSS chunk-naming pattern not matching this local build's naming) was
inconclusive — suggestive of a possible build difference, not proof either way. Asked Vijesh how
to resolve it; the response was to instead record an explicit, broader decision:

**Production is paused until UAT gaps are closed and final UAT testing/sign-off is completed.
Production planning will resume only on explicit instruction from Vijesh.** This is a stricter
gate than the prior Step 4H-1 framing ("FT-3 does not block production planning") — that
statement stands as a historical record only; this note is the operative decision going
forward.

**Remaining UAT closure items (all must close before production planning resumes):**
- **FT-3** — UAT deployed commit/version confirmation (Open)
- **FT-1** — `kra-engine.ts` hardcoded Lakhs-scale fallback constants (Open, Low)
- **FT-2b** — Microsoft Entra ID OAuth login end-to-end confirmation (Open, Low)
- **FT-4** — UAT backup restore-test (Open, Low)
- **FT-5** — Sales Funnel (legacy) + OrderAdvance click-through testing (Open, Low)

**No production database was queried, no production pre-check was run, no production migration
was prepared or executed, no `db push` was used, and no production-related command was run.**
This step is documentation-only — six docs updated (`UAT_DECIMAL_INR_MIGRATION_PLAN.md`,
`DECIMAL_MONEY_MIGRATION_PLAN.md`, `PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md`,
`RBAC_MIGRATION_TRACKER.md`, `PROJECT_MEMORY.md` (this entry), `DATABASE.md`).
`npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅.

### 2026-06-24 — Step 4H-1: Live UAT UI/RBAC sign-off — Final UAT Migration Sign-Off now Passed

Closes the live-testing gap Step 4H left open. `uat.caveoinfosystems.com` proved reachable this
round (serving the expected branded login page), but a real interactive Microsoft Entra ID
login still cannot be completed from this environment, and `.env.uat` sets
`NODE_ENV="production"` — disabling this codebase's `dev_employee_id` impersonation bypass on
the *deployed* app by design.

**With the user's explicit authorization** (asked mid-task, confirmed before proceeding), live
testing was instead performed by running this exact codebase — a detached-HEAD git worktree at
`uat` branch HEAD `0ccce92` — locally against the **live `u686730471_Caveo_UAT` database**,
with `NODE_ENV` forced to `development` only on that local instance to re-enable the
dev-impersonation feature already built into this codebase for QA role-switching. This proves
the application/RBAC code is correct given a real session and real data; it does not prove the
Microsoft OAuth handshake itself works on the deployed app, or that the deployed app is running
this exact commit (both logged as open, low/medium-severity issues, not hidden).

**Results:** Manager (Vijesh, id 4) and Employee (Sangeetha M, id 7) logins both passed live —
dashboards loaded with figures cross-checked consistently across independent surfaces (e.g.
₹585.00L Total Billed agreeing across Dashboard/Accounts/Collections). RBAC passed live in both
directions: Manager confirmed full access to `/accounts`, `/settings`, `/employees`,
`/finance`, team-wide `/kras`; Employee confirmed blocked from every one of those same pages
(redirected to her own scope) and correctly limited to her own data throughout. Finance/Sales/
KRA pages all rendered correctly against live data — no `[object Object]`, no NaN, no
100,000× inflation/deflation, no crash. `CrmOpportunity` row 42's negative value (the one known
data anomaly) rendered correctly as `₹-0.10L`, closing the one item Step 4H could only confirm
at the data level. **Zero new defects found.**

**Sign-off status:** RBAC moves Pending → **Passed**; Finance/Sales/KRA remain **Passed with
Minor Issues** (now backed by live evidence); Technical Validation remains **Passed**
(`npx prisma validate`/`npx tsc --noEmit`/`npm run build` re-run and pass). **Final UAT
Migration Sign-Off: Passed** — all gating conditions met (no Critical/High issue anywhere;
RBAC live-tested and Passed; Technical Validation Passed); remaining risks explicitly accepted
rather than hidden: FT-2b (Low — OAuth handshake itself untested), FT-3 (Medium — deployed
commit still unconfirmed, open since Step 4B), FT-4 (Low — backup restore-test still
outstanding), FT-5 (Low — two secondary pages not independently click-tested), FT-1 (Low —
pre-existing `kra-engine.ts` fallback constants). FT-2 (the original "live testing impossible"
issue) is **Closed**.

**Test harness fully torn down** — verification worktree removed, temporary launcher script
deleted, `.claude/launch.json` reverted to its original two entries, `.env.uat` never written
to, copied into a tracked file, or committed, `git status` clean. **Production untouched. No
migration, schema change, or `db push` run. No write action against UAT data.** Full record:
`docs/database/uat-migration-package/UAT_POST_MIGRATION_FUNCTIONAL_TEST_RESULTS.md` (§0,
§§3–7, §12).

### 2026-06-24 — Step 4H: UAT post-migration functional testing performed; Final Sign-Off Pending

**Honest limitation, documented not hidden:** `uat.caveoinfosystems.com` is blocked by this
environment's organization network policy (confirmed via a direct browser navigation attempt),
and no interactive Microsoft Entra ID login is possible from here. **No live UI test, live
authenticated API call, or live Manager/Employee login was performed.** Every check requiring
those is marked "Not performed — testing limitation" in
`docs/database/uat-migration-package/UAT_POST_MIGRATION_FUNCTIONAL_TEST_RESULTS.md` — never
fabricated as Passed, consistent with this entire program's standing rule never to fake
results.

**What was actually verified, with real evidence:** direct read-only queries against the live
UAT database confirmed Finance (`Payment`/`Collection`/`OrderAdvance`), Sales
(`CrmLead`/`CrmOpportunity`/`SalesFunnel`, including the row-42 negative-value anomaly), and
KRA (`KRA.target`'s 8 transformed rows) data is all correct post-migration — no inflation, no
deflation, no NULLs introduced, no double-multiplication anywhere checked. Static source-code
review of `src/lib/kra-engine.ts`, `src/lib/money.ts`, and `src/lib/roles.ts` found the
application logic consistent with the migrated (INR-canonical) data shape, with one low-severity
exception: `kra-engine.ts` has a handful of pre-existing Lakhs-scale hardcoded fallback
constants (e.g. `?? 70`) that would be scale-inconsistent with INR data if a KRA-row lookup ever
missed — none of UAT's 8 transformed rows currently hit this path.

**Sign-off status:** Finance / Sales Pipeline / KRA = **Passed with Minor Issues** (data-level
checks clean, live UI testing not performed); RBAC = **Pending** (no live login possible from
this environment — Manager/Employee test accounts confirmed to exist in the data, but their
actual page-level access was never exercised); Technical Validation = **Passed**
(`npx prisma validate`/`npx tsc --noEmit`/`npm run build` all pass). **Final UAT Migration
Sign-Off: Pending** — correctly not marked Passed, since live UI/RBAC testing is a genuine,
disclosed gap rather than a confirmed-clean result. No Critical or High-severity issue was
found in anything that was actually tested.

**4 issues logged:** FT-1 (Low — `kra-engine.ts` fallback constants), FT-2 (Medium — live UI/
login testing impossible from this environment), FT-3 (Medium — UAT-deployed app commit still
unconfirmed, open since Step 4B), FT-4 (Low — UAT backup restore-test still not performed, open
since Step 4F-1). **Next step:** someone with working UAT browser/login access should walk
through the specific untested rows in the functional-test report and confirm the deployed
commit — final sign-off can likely move to Passed quickly once that happens, since every
data-level and schema-level check is already clean. Full record:
`docs/database/uat-migration-package/UAT_POST_MIGRATION_FUNCTIONAL_TEST_RESULTS.md`.

### 2026-06-24 — Step 4G-1: UAT KRA.target transform executed; migration history aligned (both Step 4G open items closed)

**Secret hygiene finding (separate from Step 4G's incident):** before any live action, found a
real-looking password committed in the tracked `.env.uat.example` — an older, separate leak
(commit `749ea28`, 2026-06-16) already pushed to the **public** `caveoinfo2025/kra-tracker`
GitHub repo. Confirmed with Vijesh Vijayan the credential is stale/inactive, no rotation
required. Fixed the tracked file back to the `YOUR_UAT_DB_PASSWORD` placeholder (the value
remains in git history — a history rewrite was out of scope for this step, needs separate
explicit approval if ever wanted).

**`scripts/uat-transform-kra-target.mjs` finalized and run for real.** Default dry-run
(read-only) unless `CONFIRM_UAT_KRA_TARGET_TRANSFORM=YES`; aborts without writing if any parsed
label isn't on the approved 6-label money allowlist or the 31-label known-non-money allowlist;
transactional live write; full before/after logging. The dry run surfaced and safely resolved a
real UAT data quirk — 5 rows store the non-money "proof of concept" label with a stray embedded
quote character (`non-obligatory" proof of concept (poc)`), not a new/unclassified label (values
matched the already-documented non-money counts exactly). Live execution: **8 of 34
`KRA.target` rows updated** (ids 38, 43, 48, 53, 58, 65, 68, 71) — only the 6 approved money
labels (`total sales revenue - booking/billing`, `total funnel / pipeline value created (₹
lakhs)`, `total team booking target achievement (₹ lakhs)`, `total team billing achievement`,
`total team pipeline coverage (₹ lakhs)`) multiplied by 100,000; every non-money label in every
row byte-identical. Post-transform verification confirmed row count still 34,
`employee_target`/`team_target` still 0, checksum changed consistent with exactly 8 rows.

**Migration history aligned.** `npx prisma migrate resolve --applied <name>` succeeded for all 3
target migrations this time — the environment-level block Step 4G hit did not recur.
`_prisma_migrations` went from 19 rows (0/3 target migrations present) to **22 rows (3/3
present)**, `finished_at` populated, no duplicates.

**Full post-migration re-verification** (27/27 statements, 0 errors) confirmed everything from
Step 4G unchanged (Payment/Collection/OrderAdvance still un-multiplied to the cent,
CrmLead/CrmOpportunity/SalesFunnel still correctly multiplied including the row-42 spot-check)
plus the KRA transform and migration history now correctly reflected. Voucher/Ledger/FinAccount
confirmed untouched. Production and dev untouched throughout — every live connection used the
gitignored `.env.uat`. `npx prisma validate`, `npx tsc --noEmit`, `npm run build` all pass.

**Step 4H — full UAT functional testing (Finance, Sales, and KRA) can now begin.** The
KRA-testing blocker noted at the end of Step 4G no longer applies. Full record:
`docs/database/uat-migration-package/UAT_MIGRATION_EXECUTION_RESULTS.md` §13–§17, plus 6
timestamped result files under `docs/database/uat-migration-package/results/`. Still open,
unrelated to this step: backup restore-test, deployed-UAT-commit confirmation, and any decision
to scrub the older `.env.uat.example` leak from git history.

### 2026-06-24 — Step 4G: UAT Decimal/INR migration EXECUTED against the live database

**The UAT migration actually ran.** Connected live to `u686730471_Caveo_UAT` (MariaDB
`11.8.6-MariaDB-log`) using a credential Vijesh Vijayan provided and confirmed working via
direct phpMyAdmin login (an initial connection attempt failed with `ER_ACCESS_DENIED_ERROR`
before that confirmation; the retry succeeded). DB identity guard (`SELECT DATABASE()`)
re-verified live before every script — nothing ran without it passing.

**What changed on UAT:** soft-delete fields (`deleteReason`/`deletedAt`/`deletedById`) added to
7 tables; `Payment`/`Collection`/`OrderAdvance` converted to `Decimal(18,2)` with **no
multiply** (checksums confirmed exact to the cent against the pre-migration snapshot);
`CrmLead`/`CrmOpportunity`/`SalesFunnel` converted to `Decimal` **and multiplied by exactly
100,000** (checksums confirmed exact, including the known `CrmOpportunity` row 42 data-quality
anomaly: `-0.1` → `-10000.00`, precisely as predicted). `Voucher`/`Ledger`/`FinAccount`
confirmed untouched (still `double`) in both the migration log and the post-migration
verification.

**Pre-migration snapshot (29/29 statements), migration SQL (36/36 statements), and
post-migration verification (27/27 statements) all completed with 0 errors.** Full logs:
`docs/database/uat-migration-package/UAT_PRE_MIGRATION_SNAPSHOT_RESULT_20260624.md`,
`UAT_MIGRATION_SQL_EXECUTION_LOG_20260624.md`, `UAT_POST_MIGRATION_VERIFICATION_RESULT_20260624.md`,
and the consolidated `UAT_MIGRATION_EXECUTION_RESULTS.md`.

**Two items deliberately left open and documented, not hidden:**
1. **`KRA.target` free-text transform did not run.** `scripts/uat-transform-kra-target.mjs` was
   executed with its confirm flag set and a correct, identity-confirmed connection — it
   validated the DB, printed its 6-label allowlist, and exited cleanly at its designed
   early-exit point without touching any row (its execution logic is still commented out).
   Confirmed via direct diff that all 34 `KRA.target` rows are byte-identical before/after. No
   manual SQL was substituted, per explicit instruction not to improvise around a guarded step.
2. **Migration history not recorded.** All 3 `prisma migrate resolve --applied <name>` attempts
   were blocked by this environment's own safety classifier (treated as high-severity,
   hard-to-reverse, not independently verifiable from the visible transcript). No workaround was
   attempted. `_prisma_migrations` still shows 19 rows total, 0 of the 3 target migrations
   present — confirmed live, not assumed. Note: dev's own original migration for Release 2 also
   never included the `KRA.target` transform (always a separate untracked script there too), so
   the *SQL-tracked* scope of all 3 migrations is fully and correctly applied — only the
   bookkeeping row is missing.

**Credential handling:** the real UAT password was first accidentally saved into the tracked
`.env.uat.example` template by mistake — caught and fixed immediately: moved into a new,
gitignored `.env.uat` file, and the template reverted to its original committed placeholder
before any further work. The password was never typed into a Bash command line or printed in
any tool output throughout this session.

**Production was not touched. Dev was not touched** — every UAT connection used `.env.uat`
exclusively; the existing `.env` (pointing at the dev DB) was never read or written.

**Rollback status: unchanged from Step 4F-1 — Approved with risk exception, reduced
confidence.** This execution does not itself change that risk profile; the backup still has not
been restore-tested.

**Next actions:** close the migration-history gap (a human with direct UAT access running the 3
`prisma migrate resolve` calls), complete the `KRA.target` transform, then begin Step 4H
functional testing — Finance/Sales areas are ready now; KRA-area testing should wait until the
`KRA.target` transform completes. `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run
build` ✅ (no local app source code changed this step — only live UAT schema/data).

### 2026-06-24 — Step 4F-1: UAT backup restore verification reviewed; risk exception recorded (migration not run)

**Closed Step 4F's outstanding backup-verification gap — with an honest risk exception, not a
silently-faked Completed.** Attempted a real restore-to-scratch-DB test for the UAT backup
(`u686730471_Caveo_UAT_240626.sql`, taken 2026-06-24 08:10 AM by Vijesh Vijayan) — **not possible
in this environment**, since no `mysql`/`mariadb`/`docker` client is installed and there is no
live UAT database connection available here.

**What was done instead:** a structural sanity check of the dump file (read-only, no DB
involved) — confirmed non-empty (459,589 bytes, 6,165 lines), well-formed phpMyAdmin dump with a
clean `COMMIT` footer (no truncation), all 13 required tables' `CREATE TABLE` statements present,
and in-file row counts (`Payment` 26, `Collection` 141, `OrderAdvance` 3, `CrmLead` 280,
`CrmOpportunity` 49, `SalesFunnel` 100, `KRA` 34, `Expense`/`EmployeeAdvance`/`TravelClaim`/
`Voucher`/`Ledger`/`FinAccount` 0 each) — consistent with Step 4B's previously-documented live
UAT counts, though that's a cross-reference against an earlier query, not a fresh live
comparison run alongside this attempt.

**Risk-acceptance decision recorded, not silently approved:** Vijesh Vijayan, named explicitly as
the approving owner, accepted the residual risk of an unperformed live restore test rather than
block indefinitely on missing tooling. `UAT_BACKUP_ROLLBACK_RECORD.md`,
`UAT_MIGRATION_APPROVAL_RECORD.md`, and `uat-migration-dry-run-checklist.md` updated: UAT DB
backup approval, rollback plan approval, and final migration execution approval all moved from
Pending to **"Approved with risk exception"** — explicitly not an unconditional Completed.
Rollback confidence is reduced (the file's structural validity is confirmed; its actual
restorability is not proven).

**Migration execution status: still not run.** This step authorizes proceeding to Step 4G on the
basis of the explicit risk acceptance above — it does not itself run any migration SQL or script
against UAT. **No UAT or production database was connected to, queried, or modified** — only the
already-present local backup file was inspected read-only via shell text tools (`wc`, `head`,
`tail`, `grep`, `awk`). `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅.

### 2026-06-24 — Step 4F: UAT operational approval checklist prepared/reviewed (migration not run)

**Completed the technical/SQL-readiness half of UAT migration approval; the operational half
remains entirely open.** Re-reviewed every file in `docs/database/uat-migration-package/` against
Step 4D's decisions and updated `uat-migration-dry-run-checklist.md`'s status per item:

- **SQL/package review — all Completed:** Payment/Collection/OrderAdvance confirmed
  type-conversion-only with no `× 100,000`; `CrmLead`/`CrmOpportunity`/`SalesFunnel` confirmed to
  have the multiply; `KRA.target` confirmed not touched by inline SQL — deferred to
  `scripts/uat-transform-kra-target.mjs`, whose label allowlist was checked against the
  UAT-confirmed 6-label list and matches exactly; no destructive statement, production reference,
  or Voucher/Ledger/FinAccount touch anywhere in the package.
- **Operational readiness — all Pending.** Created two new records to track this honestly rather
  than assume it's done:
  - `UAT_BACKUP_ROLLBACK_RECORD.md` — **no UAT backup has actually been taken.** Filename,
    timestamp, owner, verification method, restore-tested status, rollback owner, migration
    window, and write-freeze owner are all unfilled/Pending. The rollback *method* (restore the
    pre-migration backup) is documented but not yet actionable without a real backup.
  - `UAT_MIGRATION_APPROVAL_RECORD.md` — business owner approval, technical owner approval,
    backup approval, write-freeze approval, SQL approval, KRA-transform approval, rollback-plan
    approval, post-migration-testing ownership, and final execution approval are all unassigned
    and unapproved.
- **Migration execution permission: still Pending.** Technical/SQL readiness being Completed
  does not, on its own, authorize running the migration — operational readiness (a real backup,
  a write-freeze decision, named business/technical sign-off, confirmed test users) is required
  too, and none of that exists yet.

**Remaining blockers:** take and verify a real UAT backup; decide and communicate a write-freeze
(or explicitly decide none is needed); confirm no active UAT testers during the migration window;
confirm Manager/Employee test logins work; confirm what commit is actually deployed to the UAT
server (still open since Step 4B); obtain named business and technical sign-off. **No UAT or
production database was connected to or modified in this step — purely document review and
record creation.** `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅.

### 2026-06-24 — Step 4E: UAT-specific migration SQL package generated (not run)

**Generated a complete, reviewable UAT migration package** at
`docs/database/uat-migration-package/`, turning Step 4D's classification decisions into actual
SQL — but **nothing in it has been executed.**

- `uat-decimal-inr-migration-plan.sql` — the migration itself: soft-delete fields (made
  idempotent with `ADD COLUMN IF NOT EXISTS`/`CREATE INDEX IF NOT EXISTS`, unlike dev's
  single-apply original), Release 1 type conversion (currently a no-op — 0 rows on UAT), and
  Release 2 with the UAT-specific split: `Payment`/`Collection`/`OrderAdvance` get type
  conversion only (no `× 100,000`, per the business sign-off); `CrmLead`/`CrmOpportunity`/
  `SalesFunnel` get `× 100,000` + type conversion; `kra_template_item`/`employee_target`/
  `team_target` are explicit no-ops (0 rows). `KRA.target`'s free-text transform is deliberately
  **not** inline SQL — multiplying only specific labels inside free text isn't reliably
  expressible as one SQL statement, so it's handled by a separate guarded script instead, the
  same way dev's own (now-deleted) `transform-kra-target-money.mjs` handled it.
- `uat-decimal-inr-pre-migration-snapshot.sql` / `uat-decimal-inr-post-migration-verification.sql`
  — read-only before/after capture, including aggregate checksums so a before/after diff doesn't
  require manually comparing every row, plus an explicit spot-check on the previously-flagged
  `CrmOpportunity` row id 42 (expect it to become exactly -10000.00 after migration).
- `uat-migration-dry-run-checklist.md` — the gate before ever applying the migration SQL
  (backup, write-freeze, SQL re-review, rollback plan = restore the pre-migration backup).
- `UAT_MIGRATION_README.md` — package overview and usage instructions.
- Two optional guarded Node scripts (`scripts/apply-uat-decimal-inr-migration.mjs`,
  `scripts/uat-transform-kra-target.mjs`) — both refuse to run without an explicit
  `CONFIRM_UAT_DECIMAL_INR_MIGRATION=YES` env var and a `u686730471_Caveo_UAT` DB-name match, and
  both exit early by design before reaching their (commented-out) execution paths.

**SQL safety review:** all 3 generated SQL files were scanned for destructive statements
(`DROP`/`TRUNCATE`/`DELETE`/`GRANT`/`REVOKE`) and for any production/`db push`/Voucher/Ledger/
FinAccount reference. Every match found was a comment, a column name (`deletedAt`/`deletedById`/
`deleteReason`), or a non-destructive `SHOW INDEX`/`CREATE INDEX IF NOT EXISTS` — confirmed
clean, recorded in `docs/database/UAT_DECIMAL_INR_MIGRATION_ADJUSTMENT_PLAN.md`'s new "Step 4E"
section.

**Migration execution status: not run.** No UAT row, table, or schema object was modified in
this step — every file was generated and reviewed only. Running this migration is a separate,
future, explicitly-instructed step that still depends on the operational pre-checks Step 4B left
open (deployed-commit confirmation, backup verification, test logins, write-freeze decision).
**No production database was touched at any point.** `npx prisma validate` ✅, `npx tsc --noEmit`
✅, `npm run build` ✅.

### 2026-06-24 — Step 4D: UAT classification blockers closed — migration SQL generation approved (read-only)

**All three of Step 4C's remaining blockers are closed.** Two inputs resolved them: (1) an
explicit business decision — Vijesh Vijayan confirmed ("Confirm — already INR") that
`Payment.amountLakhs`, `Collection`'s 3 amount fields, and `OrderAdvance.amountLakhs` on UAT are
genuinely already actual ₹ INR, approving "type conversion only, no multiply" for those 4
fields; (2) a follow-up read-only SQL query, run by an operator with confirmed UAT SSH/MySQL
access and relayed back sanitized (no credentials shared), covering the **full population** of
both previously-ambiguous data sets — all 49 `CrmOpportunity` rows (not the 20-row-equivalent
sample) and all 34 `KRA.target` rows (not the 20 sampled in Step 4B).

**`CrmOpportunity` resolved:** `value` is confirmed Lakhs-scale across real, identifiable deals
(e.g. a ₹120L "Dell Server & Storage" deal at Thangamayil Jewellery Limited). The 1 negative row
found earlier (id 42, -0.1, a generically-titled "IT" lead at CPF Foods) is judged a likely
data-entry artifact rather than a unit signal or a real credit/loss adjustment — flagged for a
separate, non-blocking follow-up with the sales team. `dealValueExTax` and `netProfitLakhs` are
confirmed **exactly 0 across every one of the 49 rows** — there is no real data in either column
on UAT to misclassify. All 3 fields approved for `× 100,000`.

**`KRA.target` resolved:** the full 34-row read found all 6 of dev's documented confirmed-money
labels genuinely present on UAT — the 4 that didn't appear in the original 20-row sample turned
out to live in rows 58–71 (a 9-category block the sample never reached, including team-level
KPIs like "total team pipeline coverage (₹ lakhs)"). Every other label in the full set was
independently confirmed non-money (counts, percentages, ratios, weights). **Dev's original
6-label allowlist is valid for UAT as-is — no UAT-specific label changes were needed.**
`employee_target`/`team_target` re-confirmed at 0 rows.

**UAT migration SQL generation permission: Approved.** Every item in
`docs/database/UAT_DECIMAL_INR_MIGRATION_ADJUSTMENT_PLAN.md`'s permission ledger has closed. This
authorizes *drafting* UAT-specific migration SQL as a future step — it does **not** authorize
running any migration. UAT migration execution still requires its own explicit instruction, plus
the operational pre-checks Step 4B left open (deployed-commit confirmation, backup verification,
test logins, write-freeze decision). **No UAT or production database was modified in this
step — entirely read-only. No migration SQL was written or run, no schema/API/UI code changed, no
`db push` used.** `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅.

### 2026-06-24 — Step 4C: UAT migration adjustment plan — field-level transform decisions (planning only)

**Created `docs/database/UAT_DECIMAL_INR_MIGRATION_ADJUSTMENT_PLAN.md`** to resolve Step 4B's two
blockers into a concrete, field-by-field UAT transform decision. Dev's Release 1/2 migration SQL
applies an unconditional `× 100,000` to every in-scope field — Step 4B showed that's wrong for at
least 4 UAT fields, so this plan decides, per field, whether UAT should multiply by 100,000,
convert type only, no-op (empty table), or block pending review.

**Key decisions:**
- `Payment.amountLakhs`, `Collection.invoiceValueLakhs`/`amountWithoutGstLakhs`/
  `amountReceivedLakhs`, `OrderAdvance.amountLakhs` → **type conversion only, do not multiply**
  (technical evidence is strong — 311 combined sampled rows at consistent INR scale — held
  pending business sign-off since changing how 4 financially load-bearing fields migrate is a
  business decision, not purely technical).
- `CrmLead.expectedValue`, `SalesFunnel.dealValueLakhs`/`billingValueLakhs` → **multiply by
  100,000** (plausible Lakhs-scale, consistent with dev's original assumption, no ambiguity).
- `CrmOpportunity.value`/`dealValueExTax`/`netProfitLakhs` → **blocked** (1 negative row in
  `value`, the other 2 fields are all-zero in the sample — inconclusive evidence, not assumed to
  follow the rest of the model).
- `KRA.target` free-text → **only 2 of dev's 6 documented confirmed-money labels** (`total sales
  revenue - booking`/`billing`) are confirmed present and money-denominated on UAT in the 20-row
  sample reviewed; the other 4 are blocked pending a full 34-row review (only 20 of 34 rows have
  been reviewed so far).
- Empty tables (`kra_template_item`/`kra_metric`/`kra_template`/`employee_target`/`team_target`)
  → **no-op** while they remain at 0 rows on UAT.

`docs/database/UAT_DECIMAL_INR_MIGRATION_PLAN.md` gained a new "Step 4C — UAT Unit-Mismatch
Resolution" summary section pointing to the full adjustment plan. **UAT migration remains
blocked** pending: business sign-off on the Payment/Collection/OrderAdvance decision, manual
review of `CrmOpportunity`'s ambiguous fields, and a full 34-row review of `KRA.target` labels.
**No UAT or production database was connected to in this step — purely a planning/analysis
exercise re-using Step 4B's already-collected facts. No migration SQL was written or run, no
schema/API/UI code changed, no `db push` used.** `npx prisma validate` ✅, `npx tsc --noEmit` ✅,
`npm run build` ✅.

### 2026-06-24 — Step 4B: UAT pre-check actually run against the real UAT database (read-only)

**Step 4A's blocker is resolved.** An operator with confirmed SSH/MySQL access to UAT ran
`docs/database/uat-precheck/uat-readonly-precheck.sql` directly on the UAT server and relayed
sanitized output back — `SELECT DATABASE()` returned `u686730471_Caveo_UAT`, confirming this
was genuinely UAT; no host/username/password was shared with or seen by this assistant.

**Clean findings (no surprises):** `_prisma_migrations` has exactly 19 rows, missing exactly the
3 predicted migrations (`add_soft_delete_fields_phase_a`, `decimal_release1_lakhs_to_inr`,
`decimal_release2_combined_inr_canonical`); every in-scope Release 1/2 column on UAT is still
Float/Text — zero columns converted, no drift; row counts (`Payment` 26, `Collection` 141,
`CrmLead` 280, `CrmOpportunity` 49, `SalesFunnel` 100, `KRA` 34) all match Session 9's documented
estimates exactly.

**Two new findings that block the planned migration as currently designed:**
1. **`Payment`/`Collection`/`OrderAdvance` data on UAT appears to already be stored in actual ₹
   INR, not ₹ Lakhs** — sampled values reach into the hundreds-of-thousands/millions range (e.g.
   a `Collection.invoiceValueLakhs` row at 7,979,986), implausible as Lakhs. Applying the
   planned ×100,000 Release 2 transform to these 3 models as-is would inflate already-correct
   data by 100,000×. By contrast, `CrmLead.expectedValue` and `SalesFunnel.*` sample at plausible
   Lakhs scale, consistent with the original assumption. **Needs a business/source-data review
   before any UAT or production migration touches these 3 models.**
2. **UAT's `KRA.target` free-text label set only contains 2 of dev's 6 documented confirmed-money
   labels** in the 20-row sample reviewed (`total sales revenue - booking`/`billing`); the other
   4 don't appear — UAT uses different KPI categories with mixed money/count/ratio sub-keys.
   **Needs independent re-classification of the full 34-row set before any data-transform script
   runs against `KRA.target` on UAT.**

**Also newly confirmed:** `kra_template_item`/`kra_metric`/`kra_template` all have **0 rows on
UAT** — the structured KRA template/metric engine dev relied on for its Step 3U-5 fix doesn't
exist there at all; UAT's real KRA scoring runs entirely through the legacy free-text
`KRA.target` field. One `CrmOpportunity.value` row is negative (-0.1) — minor, flagged for
business review.

Full findings: `docs/database/uat-precheck/uat-precheck-result-template.md` (filled in) and
`docs/database/UAT_DECIMAL_INR_MIGRATION_PLAN.md`'s new "UAT Pre-Check Results — Confirmed Live
Findings" section. **No UAT or production data was changed in this step — entirely read-only.
UAT migration still not run, and still blocked** pending resolution of the two findings above,
plus the still-outstanding operational checks (deployed commit, backup, test logins,
write-freeze).

### 2026-06-23 — Step 4A: UAT pre-check dry run — blocked on no confirmed UAT credential (read-only)

**Attempted to convert the UAT plan's "Needs verification" rows into facts; could not reach the
live UAT database from this dev environment, and stopped rather than guess at a credential.**
`.env.uat.example`'s `DATABASE_URL` uses connecting user `u686730471_uatuser` — this does not
match the documented working UAT user `u686730471_caveouat` (per `docs/CHANGELOG.md` Session 9,
which records three earlier wrong/unwhitelisted users before landing on that one) — and its host
`127.0.0.1` only resolves correctly when the file is deployed onto the UAT server itself, not
from this workstation. No documented external UAT hostname exists (unlike dev's
`srv2201.hstgr.io`), and there is no record confirming this workstation's IP is whitelisted in
hPanel → Remote MySQL for the UAT database. `.env.hostinger` remains untouched/unprobed, same as
Step 3X's treatment.

As a result, every DB-dependent check (UAT DB identity, `_prisma_migrations` state, schema
snapshot for all Release 1/2 fields, row counts, unit sampling, KRA/Sales target classification,
live branch/app gap) is recorded as **"Needs verification — blocked"** in
`docs/database/UAT_DECIMAL_INR_MIGRATION_PLAN.md`'s new "UAT Pre-Check Dry Run Results" section —
not guessed at. What *could* be confirmed without a DB connection: local branch is `uat`, working
tree clean, current commit `2e767ff39547d4283529a4e60fbfc70c257a1720`, and the local
`prisma/migrations/` folder holds 21 migration directories + `migration_lock.toml`.

**Recommended next action (unchanged in kind from Step 3X's production blocker):** a human with
confirmed UAT access — either on the UAT server itself, or with their IP whitelisted in hPanel →
Remote MySQL and the current `u686730471_caveouat` password — needs to run
`docs/database/uat-precheck/uat-readonly-precheck.sql` directly and fill in
`uat-precheck-result-template.md`. **No UAT or production database was connected to, no
migration was run, no schema/API/UI code changed, no `db push` used.** `npx prisma validate` ✅,
`npx tsc --noEmit` ✅, `npm run build` ✅.

### 2026-06-23 — Step 3Z: UAT-first deployment decision — production migration paused

**User decided to implement the Decimal / INR migration in UAT first and move to production
only after UAT testing.** New flow: dev (complete, audited) → UAT migration + testing → UAT
sign-off → production planning resumes → production migration only after approval. Production
migration is **paused**, not cancelled — `docs/database/PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md`
gains a deferral notice at the top; nothing in it is withdrawn, it simply isn't the next step.

Created `docs/database/UAT_DECIMAL_INR_MIGRATION_PLAN.md`: UAT scope mirrors dev Release 1
(`Expense`/`EmployeeAdvance`/`TravelClaim`) + Release 2 (`Payment`/`Collection`/`OrderAdvance`/
`CrmLead`/`CrmOpportunity`/`SalesFunnel`/Sales-KRA targets/KRA-engine INR-to-INR behavior/
dashboard Lakhs-display-only); a pre-checks checklist; a 13-step designed-not-executed execution
sequence; a Finance/Sales/KRA/Technical test plan; a sign-off checklist (all Pending); and the
production gate UAT sign-off unblocks.

Created `docs/database/uat-precheck/` — a UAT-scoped read-only pre-check pack adapted from the
production pack (`README.md`, `uat-readonly-precheck.sql`, `uat-precheck-result-template.md`,
`uat-precheck-safety-checklist.md`), using only documented UAT identifiers from this repo's own
history (`u686730471_Caveo_UAT` database / `u686730471_caveouat` user, per `docs/CHANGELOG.md`/
`docs/NEXT_SESSION.md` Session 9, 2026-06-19) — **never production credentials.**

**Key grounding fact carried into the new plan, from existing project history (not
independently re-verified this step):** Session 9 (2026-06-19) bootstrapped UAT from a full
schema dump covering the first 19 of this project's 22 migrations (through
`20260618100000_crm_lead_customer_ref`). UAT's likely outstanding gap is therefore probably just
3 migrations — `add_soft_delete_fields_phase_a`, `decimal_release1_lakhs_to_inr`,
`decimal_release2_combined_inr_canonical` — a much smaller, better-understood gap than
production's. The new UAT pre-check pack exists to confirm this before any UAT migration is run.

**No production or UAT database was connected to, no migration was run, no schema/API/UI code
was changed, no `db push` was used.** This step is planning and precheck-pack creation only.
`npx prisma validate`, `npx tsc --noEmit`, `npm run build` all pass. Full record:
`docs/database/UAT_DECIMAL_INR_MIGRATION_PLAN.md`, `docs/database/uat-precheck/`,
`docs/database/PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md`,
`docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md`, `docs/RBAC_MIGRATION_TRACKER.md` (Step 3Z row).

### 2026-06-23 — Step 3Y: Human-run production read-only pre-check pack created (no DB connection)

Created a self-contained, read-only pre-check pack that a human/admin with **confirmed**
production access can run directly, closing the gap Step 3X's automated dry run hit. **No
production database was queried, no migration was run/resolved/deployed, no Prisma schema/API/UI
code was changed, no `db push` was used, and no credential was printed at any point** — every
file produced is a static artifact written from this local dev environment, not a live check.
New folder `docs/database/production-precheck/`:
- `README.md` — who/where/how to run it, explicit "do not paste credentials into chat" guidance,
  sanitized-command examples with no real host/user/password.
- `production-readonly-precheck.sql` — DB identity, `_prisma_migrations` history,
  `INFORMATION_SCHEMA` column-type checks for every Release 1/2 field (using the real
  `@@map`-resolved physical table names — `kra_metric`/`kra_template`/`kra_template_item`/
  `employee_target`/`team_target` — confirmed directly from `prisma/schema.prisma`, not guessed),
  row counts, min/max/null/negative unit sampling, and KRA/Sales target classification (including
  the `targetType` ≠ `metricType` mismatch check that found dev's item #16). Every statement is
  `SELECT`/`SHOW`/`INFORMATION_SCHEMA` — confirmed via `grep` for every forbidden write keyword,
  zero matches outside comments.
- `production-precheck-result-template.md` — clean template mirroring the sign-off plan's §3–§9
  structure, for sanitized findings (not raw terminal output) to be transcribed into.
- `production-precheck-safety-checklist.md` — before/during/after checklist.
- Optional companion script `scripts/production-readonly-precheck.mjs` — refuses without
  `CONFIRM_PRODUCTION_READONLY_PRECHECK=YES`; refuses against the known dev DB name
  (`u686730471_caveodev`); never prints `DATABASE_URL`/username/password (masked host + DB name
  only); re-validates every query against a forbidden-keyword regex both at startup and
  immediately before each execution; writes output to a local timestamped Markdown file.

**Production migration readiness is unchanged from Step 3X — still blocked, pending a human
running this pack against the real production database.** This step did not convert any "Needs
verification" finding to a fact itself; it only prepared the means for someone else to do so
safely. `npx prisma validate`, `npx tsc --noEmit`, `npm run build` all pass. Full record:
`docs/database/PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md` ("Human-Run Production Pre-Check
Pack"), `docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md`, `docs/RBAC_MIGRATION_TRACKER.md` (Step
3Y row).

### 2026-06-23 — Step 3X: Production pre-check dry run attempted — blocked on DB access (read-only)

Attempted to convert Step 3W's "Needs verification" production findings into facts. **No
production data changed at any point** — no production database was queried, no migration was
run/resolved/deployed, no schema/API/UI code changed, no `db push` used, no password or full
connection string printed. **Result: blocked on production database access.** This environment
has no confirmed, safely-usable production `DATABASE_URL` — the active local `.env` points at
the dev DB (`u686730471_caveodev`); a local `.env.hostinger` file exists but is not documented
anywhere as the live production config (per `CLAUDE.md`, the real production env file lives only
on the remote Hostinger server's filesystem, not this repo); no SSH credential was available
either. Per this step's own explicit instruction, the dry run stopped and documented the blocker
rather than guessing at or attempting an unconfirmed connection. **Tasks 2–7 (DB identity,
`_prisma_migrations`, schema snapshot, row counts, unit sampling, KRA/Sales target classification)
remain "Needs verification," each with this specific reason recorded.**
**What was confirmed, read-only via git alone (no DB needed):** current branch `uat` @
`76159d7…`, clean working tree; `master` (production's branch) is now **79 commits behind `uat`**
with 0 commits unique to `master`; `master`'s checked-in `prisma/migrations/` folder has 16
entries ending at `20260610090000_security_center` — missing the `add_advance_category`/
`employeetarget_relations` gap pair, `master_data_linkage`, `crm_lead_customer_ref`, the
soft-delete Phase A migration, and both Decimal releases (7 migrations short of `uat`'s 23);
`src/lib/money.ts` (the Decimal-safe helper both releases depend on) does not exist on `master`
at all; every Release 1/2 target field is confirmed still `Float`/`Float?` in `master`'s own
`prisma/schema.prisma`, not `Decimal`; `prisma`/`@prisma/adapter-mariadb`/`next` dependency
versions are identical between branches (no tooling-version gap, only an application/migration
gap). Recommended next step: a human with confirmed production access must provide a verified
read-only production credential through a channel that doesn't require pasting it into this
transcript, or run the still-blocked Task 2–7 queries directly and report results back. `npx
prisma validate`, `npx tsc --noEmit`, `npm run build` all pass (reconfirmations only). Full
record: `docs/database/PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md` ("Production Pre-Check
Dry Run Results"), `docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md`,
`docs/RBAC_MIGRATION_TRACKER.md` (Step 3X row).

### 2026-06-23 — Step 3W: Production Decimal / INR migration sign-off plan created (planning only)

Created `docs/database/PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md` — a planning, risk-
review, and sign-off document only. No production database was queried, no migration was run, no
Prisma schema/API/UI code was changed, no business data was updated, no `db push` was used.
Summarizes the now-fully-audited dev Release 1 (`Expense`/`EmployeeAdvance`/`TravelClaim`) and
Release 2 (`Payment`/`Collection`/`OrderAdvance`/`CrmLead`/`CrmOpportunity`/`SalesFunnel`/Sales-
KRA targets) work, both explicitly documented as **not yet migrated in production**
(`docs/DATABASE.md`). **Key finding:** production's `_prisma_migrations` table was seeded with a
single baseline row at the 2026-06-02 SQLite→MySQL cutover, with no subsequent production
migrate-deploy event documented anywhere in this project's history — meaning, read literally,
every one of the ~20 migrations since that baseline (not only the two Decimal releases named in
this step's instructions) may still be unapplied to production. Separately confirmed `master`
(the documented production branch) is **78 commits behind `uat`** — every Decimal-release feature
exists only on `uat`. Every production-state claim in the new document is marked "Needs
verification," none assumed. The plan covers production pre-checks, an expanded migration-history
gap review (the full migration list, not just the two previously-known gap entries), backup/
rollback, maintenance-window planning, a designed-not-executed execution sequence, a production
verification plan, and Go/No-Go + sign-off ledgers — all rows Pending. **No production execution
is authorized by this step.** `npx prisma validate`, `npx tsc --noEmit`, `npm run build` all pass
(reconfirmations only). Full record: `docs/database/PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md`,
`docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md`, `docs/RBAC_MIGRATION_TRACKER.md` (Step 3W row).

### 2026-06-23 — Step 3V-1: Release 2 audit closure (TeamTarget table-name fix, verification only)

Closed the one open item from Step 3V's post-migration audit: its `TeamTarget` raw-SQL query had
aborted with `ER_NO_SUCH_TABLE` because the script queried the Prisma model name (`TeamTarget`)
directly instead of its `@@map("team_target")`-mapped physical table. Re-ran the same closure
checks via the Prisma client (mapping resolved automatically): `TeamTarget` confirmed still 0
rows; all 34 `KRA.target` and `EmployeeTarget.targetJson` rows re-scanned for confirmed-money
labels with 0 anomalies (none read back below the expected INR scale); all 14 non-`AMOUNT`
`KRATemplateItem` rows confirmed unmultiplied. **No hidden Release 2 regression found — the abort
was a verification-script naming bug, not a migration defect.** No code, schema, or data changed
this step. `npx prisma validate`, `npx tsc --noEmit`, `npm run build` all pass. Full record:
`docs/database/DECIMAL_RELEASE2_MIGRATION_RESULTS.md` §4,
`docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md` §17,
`docs/RBAC_MIGRATION_TRACKER.md` (Step 3V-1 row).

### 2026-06-23 — Step 3U: Combined Release 2 INR migration IMPLEMENTED on the dev DB

With the Step 3U-5 configuration blocker resolved, the full Release 2 migration (locked in Step
3U-1, scoped in Step 3U-2) was implemented end-to-end on `u686730471_caveodev` only.

**Schema (10 fields, Float → `Decimal(18,2)`):** `Payment.amountLakhs`;
`Collection.invoiceValueLakhs`/`amountWithoutGstLakhs`/`amountReceivedLakhs`;
`OrderAdvance.amountLakhs`; `CrmLead.expectedValue`; `CrmOpportunity.value`/`dealValueExTax`/
`netProfitLakhs`; `SalesFunnel.dealValueLakhs`/`billingValueLakhs`. Field names unchanged (legacy
"Lakhs" naming debt, same as Release 1). `KRATemplateItem.expectedTarget`/`stretchTarget`/
`minimumTarget` columns deliberately left `Float` (shared across `AMOUNT`/`PERCENTAGE`/`COUNT`
metric rows) — only the 3 `AMOUNT`-typed rows' *data* was multiplied by 100000, via a
JOIN-filtered `UPDATE` against `KRAMetric.metricType`.

**Migration:** `prisma/migrations/20260623060000_decimal_release2_combined_inr_canonical/
migration.sql` — same two-phase shape as Release 1 (value transform while columns are still the
old type, then `ALTER TABLE ... MODIFY ... DECIMAL(18,2)`). Applied via a guarded one-off script
(refuses any DB but `u686730471_caveodev`), then `npx prisma migrate resolve --applied` + `npx
prisma generate`.

**Free-text transform:** `KRA.target` and `EmployeeTarget.targetJson` — only the 8 confirmed-money
labelled entries per table (from Step 3U-2's live-DB scan) were multiplied by 100000 in place via
a guarded Node script that re-implemented `parseTargets()`'s exact parsing logic; every other
label (percentage/count/ratio) byte-identical.

**Code:** `src/lib/money.ts` gained `inrToLakhsEquivalent()` (display-only ₹→₹L, promoted from a
local helper in `FinanceDashboardClient.tsx`). `src/lib/payments.ts` rewritten on `money.ts`
helpers throughout. `src/lib/kra-engine.ts` updated so every aggregate reads Decimal fields via
`moneyToNumberForDisplay()` before arithmetic, and every notes string converts back to ₹L via
`inrToLakhsEquivalent()` before `.toFixed()` — KRA score comparisons stay INR-to-INR, only display
changes. ~15 API routes (Payment/Collection/Advance/Lead/Opportunity/SalesFunnel/Import) updated
to parse writes via `parseMoneyInput()` and guard GET responses via `moneyToNumberForDisplay()`/
`inrToLakhsEquivalent()` — Prisma's `Decimal.toJSON()` returns a string, so without this every
affected API response would have silently turned a `number` field into a `string`. Sales/CRM UI
forms (`CollectionsClient`, `AccountsClient`, `LeadsClient`, `LeadDetailClient`,
`OppDetailClient`, `SalesFunnelClient`, `ImportClient`) relabelled `"...(₹L)"` → `"...(₹)"` (real
INR input/display, per the recorded business sign-off); dashboards/KRA views/reports/mobile
screens keep Lakhs display by inserting `inrToLakhsEquivalent()` before existing formatting.

**Verification:** every field's ×100000 transform spot-checked; the Step 3U's pre-migration KRA
scoring baseline (team + 5 sample employees) re-derived from post-migration data and matched
within floating-point noise, confirming the engine's comparisons are genuinely unit-consistent;
every excluded model (`Voucher`/`Ledger`/`FinAccount`/`Expense`/`EmployeeAdvance`/`TravelClaim`/
non-`AMOUNT` `KRATemplateItem`/`TeamTarget`) reconfirmed unchanged. `npx prisma validate`, `npx tsc
--noEmit` clean. **Production was NOT touched. No `db push` used. No Voucher/Ledger/Finance write
API implemented or modified.**

Full results: `docs/database/DECIMAL_RELEASE2_MIGRATION_RESULTS.md`. Implementation note:
`docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md` §16.

### 2026-06-23 — Step 3U-5: KRA AMOUNT metric admin setup fixed; KRATemplateItem #16 re-linked; Release 2 configuration blocker resolved for dev
Step 3U-5 completed: an admin UI/API fix (additive, no schema change) plus a dev-DB config
correction performed through the app's own service-layer functions. `src/lib/kra-engine.ts`/
`src/lib/payments.ts` not touched, no Payment/Collection/Lead/Opportunity/Funnel/KRA money value
converted, **Release 2 migration not implemented**.

Confirmed `DATABASE_URL` → `u686730471_caveodev` before any change.

**Root cause (confirmed from source):** `KRALibrary.tsx`'s "Add Metric" `metricType` `<select>`
only offered `REVENUE`/`ACTIVITY`/`QUALITY`/`COMPLIANCE`/`CUSTOM` — a stale taxonomy that no live
`KRAMetric` row actually uses (every real row uses `AMOUNT`/`PERCENTAGE`/`COUNT`); a browser form
cannot submit a `<select>` value outside its rendered `<option>`s, so `AMOUNT` was never
selectable. The underlying `POST /api/admin/performance/kra` API had no enum restriction of its
own. Separately, the existing `PATCH /api/admin/performance/templates` route deletes and
recreates every item belonging to a template — using it to re-link only item #16 would have
changed every sibling item's `id`, violating the requirement to touch only item #16.

**Fix applied:** rewrote `KRALibrary.tsx`'s dropdown to `AMOUNT`/`PERCENTAGE`/`COUNT` (default
`AMOUNT`, with inline helper text distinguishing the three); added a new
`updateKRATemplateItem()` function to `src/lib/performance-engine/templates.ts` (single-row
`prisma.kRATemplateItem.update`, no sibling deletion) and a new route
`PATCH /api/admin/performance/templates/items`, gated by the same
`requirePermission(session, "Settings", "Performance", "EDIT")` check as every other admin
performance route; added `(metricType)` to `KRATemplateManager.tsx`'s metric-selector option
labels for clarity. No Prisma schema change.

**Metric created** via the app's own `createKRAMetric()` function (not a raw SQL script):
`KRAMetric` #16, name "Team Pipeline Coverage", code `TEAM_PIPELINE_COVERAGE`,
`metricType = AMOUNT`, description "Manager/team-level pipeline coverage target measured as
actual INR".

**`KRATemplateItem` #16 re-linked** via `updateKRATemplateItem(16, { metricId: 16 })`: `metricId`
changed 9 → 16. `targetType` (`AMOUNT`), `minimumTarget` (1500), `expectedTarget` (1800),
`stretchTarget` (2200), `weightage`, `sortOrder`, `status`, and `templateId` all unchanged.
Verified no other row changed: sibling item #17 in the same template (`KRATemplate` #7) is
byte-identical to its pre-change state; total row counts unchanged (17 `KRATemplateItem`, 34
`EmployeeTarget`, 0 `TeamTarget`).

**Correction to this step's own instruction framing:** the task description that drove this step
stated item #16 was linked to one of `BOOKING`/`BILLING`/`FUNNEL_VALUE`. A fresh live read
(`prisma.kRATemplateItem.findUnique` with `include: { metric: true }`) confirmed that was never
the case — it was linked to `KRAMetric` #9, "Pipeline Ratio %" (`PIPELINE_RATIO`,
`metricType = PERCENTAGE`), exactly as Step 3U-2/3U-3/3U-4 already documented. The actual root
cause (a percentage-typed metric linked to an amount-typed item) matches this project's own prior
findings, not the new instruction's framing.

Updated `docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md` (added §15 with the full
root-cause/fix/verification record and updated §10's Permission Ledger),
`docs/database/SALES_KRA_INR_UNIT_SCOPE_PLAN.md`, `docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md`
(progress notes appended). See `docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3U-5 row) for the
tracker entry.

**Release 2 implementation permission: Approved for dev implementation only.** This step resolved
only the configuration prerequisite identified in Step 3U-3/3U-4 — `kra-engine.ts`,
`payments.ts`, the schema, and every money-value row (Payment, Collection, Lead, Opportunity,
Funnel, the other `AMOUNT`-typed `KRATemplateItem` rows) remain unconverted. The next step is a
separate, explicitly-scoped Step 3U implementation following the sequence in
`DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md` §7. `npx prisma validate`, `npx tsc --noEmit`, and
`npm run build` all pass; `npm run lint` was also run — its 414 errors/175 warnings are pre-existing
repo-wide debt and none belong to the 4 files touched this step. No production database or schema
was touched.

### 2026-06-22 — Step 3U-4: KRATemplateItem #16 correction attempted — root cause confirmed live, no correction made, Release 2 remains Blocked
Step 3U-4 completed: a dev-only admin configuration/data correction and verification step — no
Prisma schema change, no migration, no API/UI code change, `src/lib/kra-engine.ts`/
`src/lib/payments.ts` not touched, no Payment/Collection/Lead/Opportunity/Funnel/KRA value
converted, Release 2 not implemented. **Ultimately no database write was made** — the correction
itself was not authorized this step.

Confirmed `DATABASE_URL` → `u686730471_caveodev`. Live access succeeded this step (the earlier
`ER_ACCESS_DENIED_ERROR` IP-allowlist issue from Step 3U-3 had cleared). A read-only re-inspection
(`prisma/inspect-amount-metrics.mjs`, DB-name-guarded, deleted after use) confirmed: **no existing
`AMOUNT`-typed `KRAMetric` matches `KRATemplateItem` #16's actual concept.** `FUNNEL_VALUE` was
specifically checked and ruled out — its `calculationSource` ties to `totalPipelineValue()`, an
**individual** rep's funnel-creation activity (legacy `KRA` #65, "Funnel Creation"), while item
#16 belongs to `KRATemplate` #7 ("Pipeline Health & Strategic Execution (Manager)" — *"Team
pipeline coverage and forecast accuracy for managers"*), a **team-level** concept matching
`teamPipeline()`/legacy `KRA` #71. The business owner directly confirmed in conversation that
"Pipeline Ratio %" (item #16's current, incorrect, metric) is a genuine percentage coverage
multiplier (e.g. a 200% target on a ₹1 Cr revenue target requires ₹2 Cr of pipeline) — a
fundamentally different mechanic from item #16's own absolute `AMOUNT` values (1500/1800/2200,
i.e. ₹15Cr/₹18Cr/₹22Cr). This reinforces the diagnosis: a **new** dedicated `AMOUNT` metric is
needed (proposed: "Team Pipeline Coverage (₹L)", code `TEAM_PIPELINE_COVERAGE`), not a re-link
to any existing metric.

**Two creation paths were presented; neither was authorized.** (1) The admin UI path was
initially preferred but found infeasible on inspection: `src/app/settings/performance/
components/KRALibrary.tsx`'s "Add Metric" form `metricType` dropdown only offers
`REVENUE`/`ACTIVITY`/`QUALITY`/`COMPLIANCE`/`CUSTOM` — not `AMOUNT`/`PERCENTAGE`/`COUNT`, the
taxonomy every live `KRAMetric` row actually uses. A browser cannot submit a `<select>` value
outside its rendered `<option>`s, so this path is unusable without a UI code change, which this
step's constraints forbid. (2) A guarded dev-DB script (insert one new `KRAMetric` row, update
only item #16's `metricId`, refuse any DB but the dev DB, delete itself after) was offered as the
remaining viable path — **the product owner explicitly chose to stop and stay Blocked instead.**

**No correction was made; Task 4 verification did not run** (there is nothing to verify against
without a correction). Updated `docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md`: added
§14 "KRATemplateItem #16 Correction Attempt" with the full re-inspection table, both declined
creation paths, and the refined blocker description; updated §11's Final Recommendation to the
precisely-scoped remaining prerequisite. **Flagged, not actioned, a separate follow-up:** the
admin KRA Metrics screen's `metricType` dropdown is out of sync with the live
`AMOUNT`/`PERCENTAGE`/`COUNT` taxonomy — a pre-existing UI/data-model drift independent of
Release 2. Cross-referenced (Step 3U-4 notes appended) in
`docs/database/SALES_KRA_INR_UNIT_SCOPE_PLAN.md`, `docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md`.
See `docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3U-4 row) for the tracker entry.

**Release 2 implementation permission remains Blocked.** Two temporary read-only inspection
scripts were created and deleted this step — no scratch files remain, no database row was
inserted, updated, or deleted. `npx prisma validate`, `npx tsc --noEmit`, and `npm run build` all
pass (reconfirmations, no app code changed).

### 2026-06-22 — Step 3U-3: KRATemplateItem #16 business decision recorded (Option B); Release 2 permission updated
Step 3U-3 completed: a business/config classification and documentation step only — no Prisma
schema change, no migration, no API/UI code change, no database data altered/inserted/updated/
deleted, `src/lib/kra-engine.ts`/`src/lib/payments.ts` not touched, no value converted, Release 2
not implemented.

This step resolved the single remaining Release 2 blocker from Step 3U-2: `KRATemplateItem` #16
is linked to the `PERCENTAGE`-typed `PIPELINE_RATIO` metric but has its own `targetType = AMOUNT`
with values 1500/1800/2200, matching the legacy `KRA` #71 / `EmployeeTarget` #34 "total team
pipeline coverage (₹ lakhs): 1500" target exactly. Three documented options (treat as money,
treat as config error and fix first, treat as non-money) were presented to the product owner
directly in conversation — **the decision is not assumed or guessed.**

**Decision: Option B — configuration error; fix before migration.** Item #16 does not convert
in this Release 2 pass. Before Step 3U starts, a separate config-correction step must re-link
`KRATemplateItem` #16's `metricId` to a genuine `AMOUNT`-typed metric (the existing zero-row
`FUNNEL_VALUE` metric, or a new dedicated "Team Pipeline Coverage" metric) — an admin-config data
change in the KRA Template setup, **not** a code or schema change, and explicitly out of scope
for this documentation-only step.

A live re-verification query for item #16 (`prisma/inspect-item16.mjs`, DB-name-guarded) was
attempted but rejected with `ER_ACCESS_DENIED_ERROR` — the connecting IP is not currently on
Hostinger's Remote MySQL allowlist (a transient, intermittent limitation, also seen in Step 3N
from a different IP). The decision relies on Step 3U-2's already-captured read-only evidence
instead; the failed script was deleted, no scratch files remain, no database row was touched.

Updated `docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md`: added §13 "KRATemplateItem
#16 Decision" with the full finding/decision/action table; updated §9's `KRATemplateItem` row
and §10's Permission Ledger (`KRATemplateItem` #16 → Blocked pending config correction; overall
Release 2 implementation permission → Blocked, on the concrete re-link prerequisite, not a
classification ambiguity any longer); updated §11's Final Recommendation with the exact fix
needed. Cross-referenced (Step 3U-3 notes appended) in
`docs/database/SALES_KRA_INR_UNIT_SCOPE_PLAN.md`, `docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md`.
See `docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3U-3 row) for the tracker entry.

**Release 2 implementation permission remains Blocked** — the classification question is now
resolved, but the config-correction itself has not been performed. `npx prisma validate`,
`npx tsc --noEmit`, and `npm run build` all pass (reconfirmations, no app code changed).

### 2026-06-22 — Step 3U-2: Section 9 open decisions closed via read-only live-DB scan; one ambiguous KRATemplateItem found and blocked
Step 3U-2 completed: a verification, live-read profiling, and sign-off documentation step only —
no Prisma schema change, no migration, no API/UI code change, no database data altered/inserted/
updated/deleted, `src/lib/kra-engine.ts`/`src/lib/payments.ts` not touched, no value converted,
Release 2 not implemented.

Confirmed `DATABASE_URL` → `u686730471_caveodev` before running a read-only scan
(`prisma/scan-release2-scope.mjs`, DB-name-guarded, modeled on the existing `prisma/apply-*.mjs`
pattern; deleted along with its raw output after the findings were captured).

**Major correction found:** the live `kra_metric` table does not contain `prisma/seed-
performance-defaults.ts`'s rows — its `REVENUE`/`ACTIVITY`/`QUALITY`/`COMPLIANCE` codes don't
exist in the dev DB at all. The live `metricType` enum is `AMOUNT`/`PERCENTAGE`/`COUNT`. Money
metrics are the `AMOUNT`-typed ones (`BOOKING`, `BILLING`, and an unused zero-row
`FUNNEL_VALUE`). **One ambiguity found and blocked, not guessed:** `KRATemplateItem` row #16
(linked to the `PERCENTAGE`-typed `PIPELINE_RATIO` metric) has `targetType = "AMOUNT"` with
money-scale values (1500/1800/2200) matching a legacy KRA's `"total team pipeline coverage (₹
lakhs)"` target exactly — flagged Blocked/Manual Review.

All 34 live `KRA.target` rows parse cleanly; exactly 6 KPI labels across 4 KRA titles are
confirmed money (`total sales revenue - booking/billing`, `total funnel/pipeline value created
(₹ lakhs)`, `total team booking target achievement (₹ lakhs)`, `total team billing achievement`,
`total team pipeline coverage (₹ lakhs)`); every other label — including "Focus area revenue
achievement"'s mix-ratio percentages, which mention "revenue" but aren't absolute money — is
non-money. `EmployeeTarget.targetJson` (34 rows) confirmed to store the **same free-text format
as `KRA.target`, not structured JSON** despite the field name; same money-label set applies.
`TeamTarget` has 0 rows — deferred. `CrmLead.expectedValue` (38 rows), `CrmOpportunity.value/
dealValueExTax/netProfitLakhs` (21 rows), `SalesFunnel.dealValueLakhs/billingValueLakhs` (100
rows) all confirmed Lakhs-scaled with zero negatives. `OrderAdvance` (0 rows) and
`Payment.fromAdvanceId` (0 rows set) confirmed `applyAdvance()` has never produced a live
`Payment` — included in locked scope anyway (zero risk, removes a future lockstep-mismatch
risk permanently).

**Named business sign-off recorded:** product owner instruction in project chat — *"All leads,
funnel and opportunity input value should be actual INR. Dashboards, KRA and Reports should
display in Lakhs for the Sales module."* This closes the "one atomic release" and "Lakhs
display desired" open decisions.

Updated `docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md`: added §12 "Live DB Scan
Findings" with full per-task tables; closed every Section 9 row; updated the Section 10
Permission Ledger; added `OrderAdvance.amountLakhs` to Section 3's locked scope. **Release 2
implementation permission: Blocked, narrowly, on the single `KRATemplateItem` #16 ambiguity
only — every other open decision is now closed.** Cross-referenced (Step 3U-2 progress notes
appended) in `docs/database/SALES_KRA_INR_UNIT_SCOPE_PLAN.md`,
`docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md`. See `docs/RBAC_MIGRATION_TRACKER.md` §4 (Step
3U-2 row) for the tracker entry. `npx prisma validate`, `npx tsc --noEmit`, and `npm run build`
all pass (reconfirmations, no app code changed).

### 2026-06-22 — Step 3U-1: Combined Release 2 scope sign-off locked (Payment/Collection/Sales-KRA-target/Lead-Funnel-Opportunity)
Step 3U-1 completed: a final sign-off / implementation-scope-lock step only — no Prisma schema
change, no migration, no API/UI code change, no database data altered, `src/lib/kra-engine.ts`/
`src/lib/payments.ts` not touched, no value converted, Release 2 not implemented.

Created `docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md` — now the authoritative
combined-scope document for Release 2, locking the exact field set across five domains:
**Payment** (`amountLakhs`), **Collection** (`invoiceValueLakhs`/`amountWithoutGstLakhs`/
`amountReceivedLakhs`), **Lead** (`CrmLead.expectedValue`), **Opportunity** (`CrmOpportunity.value`/
`dealValueExTax`/`netProfitLakhs`), **Sales Funnel** (`SalesFunnel.dealValueLakhs`/
`billingValueLakhs`), **KRA Template** (`KRATemplateItem.expectedTarget`/`stretchTarget`/
`minimumTarget`, REVENUE-metric rows only), **legacy KRA** (`KRA.target` string, confirmed-money
entries only), and **EmployeeTarget/TeamTarget** (`targetJson`, review-only).

**Metric classification rule locked:** only money-denominated metrics transform Lakhs→INR — never
percentages, counts, activity counts, ratios, or scores. `KRATemplateItem` fields convert only for
rows whose `KRAMetric.metricType = "REVENUE"` (confirmed against `prisma/seed-performance-defaults.ts`:
`REVENUE_TARGET`/`PIPELINE_VALUE` are the only REVENUE codes; `NEW_CUSTOMER`/`ACTIVITY_CALLS` are
ACTIVITY, `PROPOSAL_CONVERSION` is QUALITY, `COLLECTION_EFFICIENCY`/`KRA_COMPLIANCE` are
COMPLIANCE — none are money). Ambiguous cases are blocked for manual review, never guessed.

Documented a 16-step atomic Step 3U implementation sequence, a before/after KRA-score
verification table template (zero-drift pass criterion), an open-decisions table (9 items — most
Pending: live-DB scans of `KRAMetric`/`KRA.target`/`targetJson` content, named business sign-off
on the one-atomic-release requirement), and a Release 2 Permission Ledger (Option A Approved,
Option B Rejected, Payment/Collection Approved, Sales/KRA targets and Lead/Funnel/Opportunity
Pending final field/metric verification, overall implementation permission Pending).

**Flagged finding outside the original field list:** `OrderAdvance.amountLakhs` feeds `Payment`
via `applyAdvance()` in `src/lib/payments.ts` — if `Payment.amountLakhs` converts without it, that
conversion path breaks. Added to the open-decisions table, not silently added to locked scope.

**Release 2 implementation permission remains Pending/Blocked** — this step is a sign-off lock,
not a green light to implement. Cross-referenced (Step 3U-1 progress notes appended) in
`docs/database/SALES_KRA_INR_UNIT_SCOPE_PLAN.md`, `docs/database/DECIMAL_RELEASE2_SIGNOFF_PLAN.md`,
`docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md`. See `docs/RBAC_MIGRATION_TRACKER.md` §4 (Step
3U-1 row) for the tracker entry. `npx prisma validate`, `npx tsc --noEmit`, and `npm run build`
all pass (reconfirmations, no app code changed).

### 2026-06-22 — Step 3U-0: Option A locked; Sales/KRA INR migration scope defined
Step 3U-0 completed: a decision-lock and scope-definition step only — no Prisma schema change,
no migration, no API/UI code change, no database data altered, `src/lib/kra-engine.ts` not
touched, no Payment/Collection/Lead/Funnel/Opportunity/KRA target value converted, Release 2 not
implemented.

**Final business decision: Option A — Full INR Canonical Model — is selected and locked.** All
persisted business money values must use actual INR as the canonical input/storage unit:
Finance, Payment, Collection, Lead, Funnel, Opportunity, KRA targets, Sales targets, and report
source data. Lakhs is allowed only as a display/reporting unit, converted at the presentation
boundary.

**Important correction applied:** the old Step 3T design — Collection stored INR, KRA targets
stayed Lakhs, `kra-engine.ts` converted Collection INR to Lakhs for comparison — is **not** the
long-term target. It is rejected as the normal-implementation design (demoted to "Option B,"
usable only as an emergency compatibility bridge with separate written approval if ever
invoked). The corrected target: Collection stored INR; KRA targets stored INR; Lead/Funnel/
Opportunity values stored INR; `kra-engine.ts` compares INR to INR directly; dashboards/reports
display Lakhs if required.

**Static source inspection performed this step** (read-only — `prisma/schema.prisma`, live API
routes, and live UI components, not assumption):
- Confirmed `CrmLead.expectedValue`, `CrmOpportunity.value`/`dealValueExTax`/`netProfitLakhs`,
  and `SalesFunnel.dealValueLakhs`/`billingValueLakhs` are all genuinely Lakhs-scaled in their
  live code — `LeadsClient.tsx`'s `"Expected Value (₹L)"` form label and CSV columns,
  `OpportunitiesClient.tsx`'s `"Value (₹L)"` table header and a `LARGE_DEAL_THRESHOLD_L = 50`
  approval-trigger constant compared directly against the raw stored value,
  `SalesFunnelClient.tsx`'s `"Deal Value (₹L)"`/`"Billing Value (₹L)"` form labels and table
  headers — none of these fields have any conversion factor in their current read/write paths.
- Confirmed `KRATemplateItem.expectedTarget`/`stretchTarget`/`minimumTarget` are Lakhs-scaled
  **only for `metricType: "REVENUE"` rows** (seed values 50/100/200/300/600 in
  `prisma/seed-performance-defaults.ts`'s `REVENUE_TARGET`/`PIPELINE_VALUE` metrics) — not for
  percentage/count metric types (`NEW_CUSTOMER`, `ACTIVITY_CALLS`, `PROPOSAL_CONVERSION`,
  `COLLECTION_EFFICIENCY`, `KRA_COMPLIANCE`). Any future migration must filter by metric type,
  not convert the whole table.
- Confirmed the legacy `KRA.target` field is a free-text `String @db.Text` column, **not a
  typed money field at all** — parsed at runtime by `parseTargets()` in `kra-engine.ts`. Its
  values are Lakhs-scaled by convention, but migrating it means rewriting embedded numeric
  values inside existing strings, not a type-level `ALTER COLUMN` — a materially different and
  riskier operation than every other field reviewed.
- Confirmed an architectural split: the legacy `KRA`/`KRA.target` system `kra-engine.ts` actually
  scores against, and the newer `EmployeeTarget`/`KRATemplateItem`/`KRAAchievement` system
  `KrasClient.tsx`'s primary UI renders, are **two separate target-storage mechanisms** that do
  not automatically stay in sync with each other — both must be accounted for in any future
  migration.
- Confirmed `ApprovalRule`/`ExpenseLimitRule`/`CustomerCreditPolicy`/`AdvancePolicy` money fields
  are Finance-policy thresholds, not Sales/KRA values — explicitly excluded from this scope.
- Found no dedicated `/api/reports/*` or `/app/reports/*` module in the codebase — reportable
  figures currently render inline on the Dashboard/Pipeline/Sales-Funnel/KRA pages already
  covered above, not via a separate reports surface.

**Created `docs/database/SALES_KRA_INR_UNIT_SCOPE_PLAN.md`** — the new Step 3U-0 scope plan,
with: §2 a schema-verified candidate-fields table (with an explicit exclusion table for
Finance-policy fields); §3 an input/UI areas table covering Lead/Opportunity/Funnel forms, KRA
target setup, the Sales dashboard, and the KRA dashboard; §4 the `kra-engine.ts` target design
(INR-to-INR comparison, no scoring calculation may mix units); §5 the presentation-boundary rule
(convert INR→Lakhs only at display time, mirroring the `inrToLakhsEquivalent()` pattern already
proven for Release 1 Finance dashboards); §6 a migration sequencing recommendation; §7 open
decisions needing sign-off; §8 a final recommendation.

**Sequencing finding (§6/§8 of the new scope plan): combining Release 2A (Payment/Collection)
and Release 2B (Sales/KRA target migration) into one atomic release is required, not optional**,
under Option A's no-conversion-factor design. Shipping Collection-to-INR before KRA targets
convert would reproduce the exact 100,000× corruption risk this entire planning program exists
to prevent. Release 2A cannot ship alone without the separately-approved Option B emergency
bridge — not a default path.

Updated `docs/database/DECIMAL_RELEASE2_SIGNOFF_PLAN.md`: §16's option headers now explicitly
state Option A Approved, Option B Rejected for normal implementation (emergency-bridge-only),
Option C Rejected; §12 Decision Ledger's "KRA target unit policy" and "KRA engine boundary
conversion" rows moved from Superseded to **Approved** (Option A is now the resolved design);
"Release 2 permission to implement" changed from "Blocked pending Option A vs. B decision" to
**"Blocked until the full Option A scope inventory is completed"** — the design choice is
resolved, the scope is not yet fully inventoried/signed-off. New §19 Final Recommendation added
(§18 marked superseded in place, per this project's append-only documentation convention).

**No Prisma schema field was converted, no migration was generated, no API route or UI component
was modified, `src/lib/kra-engine.ts` and `src/lib/payments.ts` were not touched, and no
database row was written or altered.** `npx prisma validate`, `npx tsc --noEmit`, and
`npm run build` all pass (reconfirmations, no app code changed). See
`docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3U-0 row) for the tracker entry.

### 2026-06-22 — Step 3T-1: Money unit policy corrected (Leads/Funnel/Opportunities/KRA targets now actual INR)
Step 3T-1 completed: a documentation and decision-correction step only — no Prisma schema
change, no migration, no API/UI code change, no database data altered, no
`kra-engine.ts`/`payments.ts` change, no Payment/Collection value converted, Release 2 not
implemented.

**Corrected canonical money storage policy:** all persisted business money values must be
stored as actual INR. Lakhs is a presentation/reporting unit only — allowed in sales dashboard
cards, sales/KRA charts, sales reports, and management summaries, but never as a user-input
unit, a database storage unit, an API-contract canonical unit, or mixed with INR in a
calculation without an explicit display-boundary conversion.

**This corrects and supersedes the earlier policy.** The policy locked before Step 3O said
"only CRM Leads and Opportunities (and Sales pipeline/forecast fields) may remain Lakhs-based."
That exception is now removed: **Leads, Funnel, Opportunities, and KRA target inputs must use
actual INR as canonical input/storage**, exactly like every Finance/Accounting model. Only their
dashboards, KRA views, and reports may display figures in Lakhs, computed at render time from
canonical INR values — never the reverse.

**Release 2 impact:** Collection and Payment still must move to INR — that part of the existing
Release 2 scope is unchanged. KRA targets should also move to INR, but via a **separate
Sales/KRA target migration**, not folded silently into Release 2. Until that migration ships,
Release 2 must not blindly compare INR Collection values against Lakhs KRA targets — it must
either (1) include the KRA target unit migration to INR within Release 2, or (2) explicitly
defer Collection/KRA scoring conversion until the KRA target migration is ready. **Release 2
implementation is paused** (was briefly Approved under Step 3T) pending this decision.

Updated `docs/database/DECIMAL_RELEASE2_SIGNOFF_PLAN.md` with three new sections: **§15
"Corrected Sales/KRA Unit Policy Impact"** (states Collection/Payment still move to INR; KRA
targets move to INR via a separate migration; dashboards/KRA/reports may convert INR→Lakhs for
display; `kra-engine.ts` should eventually compare INR to INR; a temporary INR-to-Lakhs
comparison boundary is acceptable only as an explicitly-marked interim bridge); **§16 "Updated
Decision Options"** — **Option A, Full INR Canonical Model** (Payment + Collection + KRA target
storage all move to INR, `kra-engine.ts` compares INR to INR directly, dashboards/KRA/Reports
display Lakhs — **recommended long-term**), **Option B, Temporary Compatibility Bridge**
(Payment + Collection move to INR now, KRA targets remain Lakhs temporarily with a committed
future migration, the bridge must be explicitly marked temporary in code and docs), **Option C,
keep Collection or KRA canonical storage in Lakhs** (**Rejected** — violates the corrected
policy); and **§17 "Sales/KRA Actual-INR Migration Needed"** (a forward-looking inventory only,
not implemented this step — Lead/Opportunity/SalesFunnel value inputs, KRA target inputs and
seed data, `EmployeeTarget`/`TeamTarget`, Sales/KRA dashboards and reports). §18 replaces the
prior Final Recommendation: Release 2 permission to implement is now **Blocked** pending an
explicit choice between Option A and Option B. §4/§5 (the original Step 3T KRA Boundary Options
and Recommended Decision) and §14 (the original Step 3T Final Recommendation) were marked
superseded in place, not deleted, per this project's append-only documentation convention.
§12's Decision Ledger updated: "KRA target unit policy" and "Release 2 permission to implement"
rows marked Superseded/Blocked; all other rows (Collection storage unit, Payment storage unit,
`src/lib/payments.ts` retirement, API response policy, UI label policy) remain Approved,
unaffected by this correction.

Also corrected `docs/database/DECIMAL_CONVERSION_READINESS_CHECK.md`'s §0 Money Unit Policy
Decision — the CRM Lead/Opportunity Lakhs exception bullet is now struck through and marked
superseded, with a new "Implementation Note (Step 3T-1...)" appended documenting the correction
and a revised §12 sign-off-ledger row. Corrected `docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md`'s
original "Money Unit Policy" note the same way (struck through, corrected policy text appended
inline) and appended a full Step 3T-1 progress note at the end of the file.

**No Prisma schema field was converted, no migration was generated, no API route or UI component
was modified, `src/lib/kra-engine.ts` and `src/lib/payments.ts` were not touched, and no database
row was written or altered.** `npx prisma validate`, `npx tsc --noEmit`, and `npm run build` all
pass (reconfirmations, no app code changed). See `docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3T-1
row) for the tracker entry.

### 2026-06-22 — Step 3T: Release 2 KRA boundary decision locked (Option A approved)
Step 3T completed: a business-decision documentation step only — no Prisma schema change, no
migration, no API/UI code change, no database data altered, no `kra-engine.ts`/`payments.ts`
change, no Payment/Collection value converted.

**Final business decision locked: Option A approved.** Finance Collection storage will move to
actual INR in Release 2. KRA targets will remain Lakhs-based for now. `src/lib/kra-engine.ts`
must explicitly convert Collection INR to Lakhs only at the KRA scoring boundary — i.e. inside
`totalCollectionsWithoutGst()`/`teamBilling()`, not anywhere else. This is not permission to
keep Collection in Lakhs: Collection storage conversion to INR is mandatory in Release 2; only
the KRA target *comparison* boundary inside `kra-engine.ts` is allowed to operate in Lakhs
terms, and only at that one explicit point.

**Option B** (convert KRA targets to actual INR too — the stricter reading of "only
Leads/Opportunities use Lakhs") is **Deferred** — not adopted now; KRA target migration to INR
is left for a future, KRA-specific project if the business later decides it's needed.
**Option C** (leave Collection in Lakhs) is **Rejected** outright — it violates the locked Money
Unit Policy and was never a real candidate, only documented for completeness in Step 3S.

Updated `docs/database/DECIMAL_RELEASE2_SIGNOFF_PLAN.md`:
- §4 (KRA Boundary Options) — added a Decision Status column marking A Approved, B Deferred, C
  Rejected, with an explanation that Option A is approved because KRA targets are
  sales/performance targets that can remain Lakhs-based for now, while Finance Collection
  storage must move to INR regardless.
- §5 (Recommended KRA Boundary Decision) — reworded from a recommendation awaiting sign-off to a
  locked decision statement.
- §12 (Decision Ledger) — every row updated to **Approved**: Payment conversion scope,
  Collection conversion scope, KRA target unit policy (keep Lakhs for now), KRA engine boundary
  conversion (Collection INR→Lakhs inside `kra-engine.ts` only), `src/lib/payments.ts`
  retirement (replace `round2()`/epsilon logic with `money.ts`), API response policy (preserve
  shape where practical, no Decimal leakage), UI label policy (remove Lakhs labels from
  Payment/Collection finance UI post-conversion), and Release 2 permission to implement
  (**approved for dev implementation only**) — except the production migration-history gap
  review, which remains Pending and non-blocking.
- New §13 ("Release 2 Implementation Preconditions") added with 9 explicit preconditions for the
  future implementation step: dev DB only; Payment/Collection fields only; the KRA engine
  boundary conversion must ship in the same release; `src/lib/payments.ts` must be updated in
  the same release; Payment/Collection UI labels and converters must be updated in the same
  release; no CRM Lead/Opportunity/KRA target migration in Release 2; no Voucher/Ledger
  migration in Release 2; a before/after Collection KRA score comparison is required; no
  half-converted state is allowed.
- §14 (Final Recommendation, renumbered from §13) updated to state the decision is locked but
  implementation has still not started — the next step is a Step 3U implementation prompt.

**No code or schema was changed as a result of this decision.** `src/lib/kra-engine.ts`,
`src/lib/payments.ts`, every API route, every UI component, `prisma/schema.prisma`, and every
migration file remain completely untouched; no database row was written or altered.
Cross-referenced (Step 3T progress notes appended) in
`docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md`. `npx prisma validate`, `npx tsc --noEmit`, and
`npm run build` all pass (reconfirmations, no app code changed). See
`docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3T row) for the tracker entry.

### 2026-06-22 — Step 3S: Release 2 Payment/Collection/KRA boundary sign-off plan
Step 3S completed: a planning and decision-lock step only — no Prisma schema change, no
migration, no API/UI code change, no database data altered, no Payment/Collection value
converted, no KRA calculation touched.

Created `docs/database/DECIMAL_RELEASE2_SIGNOFF_PLAN.md`, the dedicated Release 2 sign-off
artifact. Locks the **4-field Release 2 candidate scope** — `Payment.amountLakhs`,
`Collection.invoiceValueLakhs`/`amountWithoutGstLakhs`/`amountReceivedLakhs` — all
`value * 100000` → `Decimal(18,2)`, with Collection's three fields explicitly marked Blocked
until the KRA boundary decision is signed off (Payment marked Candidate/Pending, since it has
no scoring dependency but must convert in the same atomic release as Collection per
`syncCollectionTotals()`'s unit-matched comparison).

Re-confirmed the Step 3O live data profile by reading the existing documentation (no DB
re-query, per this step's read-only constraint): `Payment` 1 row ~₹1.61L; `Collection` 94 rows
₹0.003L–₹77.88L, no negatives, no suspicious values, >2dp scale-exceeds explained by GST
back-calculation.

Read `src/lib/kra-engine.ts` in full (762 lines) and confirmed the exact KRA risk surface:
`totalCollectionsWithoutGst()` and `teamBilling()` are the only Collection consumers that
compute an absolute total compared directly against a Lakhs-scaled KRA target with zero
conversion factor — the single highest-risk pattern for Release 2. `onTimeCollectionRate()` and
`teamCollectionsEfficiency()` are unit-agnostic ratios (numerator and denominator share the same
unit, so it cancels out) — confirmed safe regardless of Collection's storage unit. Confirmed
`/api/kra-sync`'s `computeKRAProgress()` call is the **sole boundary** through which
`kra-engine.ts` reads Collection data — no dashboard or report page imports `kra-engine.ts`
directly, simplifying where the future unit-conversion fix needs to live.

Documented **3 KRA boundary options**: **Option A** (recommended default) — convert Collection
storage to actual INR, keep KRA targets Lakhs-based by convention (treating them as
sales/performance config analogous to CRM pipeline data), and add one explicit, documented
INR→Lakhs conversion inside `kra-engine.ts` at the scoring boundary only. **Option B** — convert
KRA targets to actual INR too, the stricter reading of "only Leads/Opportunities use Lakhs"
since KRA targets aren't literally Lead/Opportunity records, but at materially higher risk
(touches every `KRATemplateItem` seed row and every per-employee free-text `KRA.target` string).
**Option C** — leave Collection in Lakhs; rejected, as it violates the locked Money Unit Policy.
**This decision (A vs. B) is the single open item blocking Step 3T** and requires explicit
business/product sign-off before implementation.

Read `src/lib/payments.ts` in full (239 lines) and tabulated its **retirement plan**: the
`round2()` float-rounding workaround and the `received + 0.001 >= invoice` epsilon comparison in
`syncCollectionTotals()` both become unnecessary once Payment/Collection are exact `Decimal`;
`recordPayment()`'s notification text (`"Payment received: ₹${amount.toFixed(2)}L"`) and its
`Notification.amountLakhs` field bake in the Lakhs assumption; `paymentsToday()`'s response
field is literally named `totalLakhs`, consumed by the web + mobile dashboards and the Accounts
daily summary per that route's own doc comment — all flagged as required renames/rewrites for
Step 3T, none touched this step.

Reviewed `src/app/api/collections/route.ts`, `[id]/route.ts`, `src/app/api/payments/route.ts`,
and `today/route.ts` — confirmed Collection already has a **live write API**
(`prisma.collection.create()`/`update()` accepting raw `Number()` Lakhs values directly), unlike
Release 1's mostly-read-only routes, making this conversion materially riskier than Release 1's.
Grepped `CollectionsClient.tsx` and confirmed its pervasive Lakhs assumptions: hardcoded
`"Total Billed (₹L)"`/`"Collected (₹L)"`-style table headers and `toFixed(2)}L` summary-card
templates — all tabulated in the new plan's UI Boundary Plan section, none modified.

Documented the KRA before/after verification plan (zero-tolerance for any 100,000× score
corruption under either boundary option), the pre-existing migration-history gap from Step 3R
(carried forward, still not fixed, out of scope), the Release 2 atomic-implementation rule (all
7 pieces — schema, data, API, UI, KRA boundary, `payments.ts` retirement, verification — must
ship together), and a 9-row Decision Ledger, every row Pending explicit approval.

**No Prisma schema field was converted, no migration was generated, no API route or UI component
was modified, no Payment/Collection value was multiplied into INR, no KRA calculation was
touched, and no database row was written or altered.** Cross-referenced (Step 3S progress notes
appended) in `docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md`. `npx prisma validate`,
`npx tsc --noEmit`, and `npm run build` all pass (reconfirmations, no app code changed). See
`docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3S row) for the tracker entry.

### 2026-06-22 — Step 3R: post-migration audit of Release 1 Decimal/INR behavior (DB, APIs, UI)
Step 3R completed: a read-only audit step only — no schema, migration, API, UI, or data change.
Independently re-verified Step 3Q's Release 1 implementation rather than re-reading its own
claims.

**DB/migration state**: confirmed `DATABASE_URL` → `u686730471_caveodev`; confirmed
`20260622120000_decimal_release1_lakhs_to_inr` is recorded as applied (not rolled back) in
`_prisma_migrations`; confirmed via `INFORMATION_SCHEMA.COLUMNS` that all 9 Release 1 columns
are genuinely `decimal(18,2)`/`decimal(10,4)` while `Payment`/`Collection`/`Voucher`/`Ledger`
remain `double` (untouched).

**Data values**: re-verified the 2 smoke `Expense` rows, the `EmployeeAdvance` row, and the
smoke `TravelClaim` row via a fresh read-only script — 11/11 checks pass exactly, no null
introduced, no double-multiplication, nothing left in Lakhs.

**API boundaries**: hit the live API with authenticated `fetch()` calls (dev quick-login) —
`/api/finance/expenses`, `/api/finance/advances`, `/api/finance/conveyance`,
`/api/finance/dashboard` all return correct, stable, non-leaking responses (no
`[object Object]`, no Decimal objects, no 100,000× inflation).

**UI (live dev server)**: `/finance` dashboard KPI cards and the donut chart (via the new
`inrToLakhsEquivalent()` conversion, correctly showing "₹12.6L") render correctly;
`/finance/claims` and `/finance/advances` show correct INR amounts and the corrected "Amount
(₹)" form label; `/finance/approvals` loads cleanly (no pending requests exist in dev to
exercise the entity-type branch live — verified by source review, documented as a known
limitation); `/collections` confirmed still genuinely Lakhs-labeled, untouched. No
console/hydration errors.

**Exclusions confirmed untouched**: `git diff 54bb67e..1c1447e --stat` shows zero diff for
`kra-engine.ts`, Collections UI, Leads/Opportunities UI, and `payments.ts`.

**Mobile collateral fix**: confirmed `src/app/api/expenses/route.ts`'s
`AUTO_APPROVE_LIMIT_INR = 10000` is correct and the only threshold constant present, by static
review (did not POST new live test data, to avoid non-canonical rows).

**One pre-existing, unrelated issue found and documented (not fixed)**: two earlier migrations
(`20260615000000_add_advance_category`, `20260617100000_employeetarget_relations`) have no row
in `_prisma_migrations`, so `prisma migrate status` reports them unapplied even though their
schema changes are live — classified Minor/Documentation-only, predates Step 3Q, out of scope
for this audit.

**No blockers, major issues, or functional bugs found in the Release 1 implementation.** Full
results: `docs/database/DECIMAL_RELEASE1_MIGRATION_RESULTS.md` §"Step 3R Post-Migration Audit".
`npx prisma validate`, `npx tsc --noEmit`, and `npm run build` all pass.

### 2026-06-22 — Step 3Q: Release 1 Decimal + INR migration implemented on dev DB (Expense/EmployeeAdvance/TravelClaim)
Step 3Q completed: implemented the Release 1 Decimal + Lakhs-to-INR migration atomically on the
dev database (`u686730471_caveodev`) only — no production change, no Payment/Collection/
Voucher/Ledger/CRM/KRA-target change.

**Approval check**: confirmed `docs/database/DECIMAL_RELEASE1_SIGNOFF_PLAN.md` §11 and updated
its "Decimal schema conversion permission" row from Pending to **Approved for dev Release 1
implementation only** before making any change.

**Smoke data + snapshot**: `Expense`/`TravelClaim` had 0 dev rows, so created 2 `Expense` rows
and 1 `TravelClaim` row, each clearly marked `[SMOKE TEST — Step 3Q Release 1]`; snapshotted all
Release 1 rows' pre-migration values.

**Schema + migration**: updated `prisma/schema.prisma` for exactly the 9 Release 1 fields
(`Expense.amountLakhs`/`gstAmountLakhs`, `EmployeeAdvance.amountLakhs`/`disbursedAmountLakhs`/
`settledAmountLakhs`/`balanceLakhs`, `TravelClaim.amountLakhs`/`amountRupees`/`ratePerKm`) to
`Decimal(18,2)`/`Decimal(10,4)`. Hand-wrote
`prisma/migrations/20260622120000_decimal_release1_lakhs_to_inr/migration.sql` (Hostinger has no
shadow DB) — value-transformation `UPDATE`s (×100,000 for genuine Lakhs fields, while still
`Float` for precision) followed by `ALTER TABLE MODIFY COLUMN` to `Decimal`; `amountRupees`/
`ratePerKm` received no multiplication. Safety-reviewed (no `DROP`, no destructive deletes, no
out-of-scope models) before applying via a guarded script that refused any non-dev database;
`prisma migrate resolve --applied` + `prisma generate` followed.

**Verification**: 11/11 fields pass exactly (e.g. `EmployeeAdvance.amountLakhs` 0.5→50000.00,
smoke `Expense.amountLakhs` 10.555→1055500.00, `TravelClaim.ratePerKm` 12.5→12.5000 unchanged) —
full table in `docs/database/DECIMAL_RELEASE1_MIGRATION_RESULTS.md`.

**API/UI updates**: wired `/api/finance/expenses`, `/api/finance/expenses/[id]`,
`/api/finance/advances` (closing the not-yet-wired-to-`money.ts` gap flagged in Step 3P),
`/api/finance/conveyance`, and `/api/finance/dashboard` to serialize `Decimal` via
`src/lib/money.ts`. Discovered and fixed one **collateral write-path**: the legacy mobile
`/api/expenses` route also writes `Expense.amountLakhs`/`gstAmountLakhs` and had a
Lakhs-denominated `AUTO_APPROVE_LIMIT_L = 0.10` threshold — corrected to
`AUTO_APPROVE_LIMIT_INR = 10000`. Updated UI: `expenses/data.ts`/`ExpenseRegisterClient.tsx`,
`ClaimsClient.tsx`, `AdvancesClient.tsx` (incl. "Amount (₹ Lakhs)" → "Amount (₹)"),
`FinanceApprovalsClient.tsx` (branches by `entityType` now), and `FinanceDashboardClient.tsx`
(split into a Lakhs-still formatter for `FinAccount`/`Ledger` and a new INR-direct formatter for
Release 1 KPI cards, plus an `inrToLakhsEquivalent()` conversion so the existing Cr/L/K chart
formatters keep working). Conveyance UI confirmed still mock-only — untouched.

**Confirmed untouched**: `Payment`, `Collection`, `Voucher`, `Ledger`, `FinAccount`,
`OrderAdvance`, `Notification`, CRM Lead/Opportunity/SalesFunnel, and KRA target values — via
`git diff --stat` (13 files, all in Release 1 scope) and the migration-SQL safety review.
Release 2 remains explicitly Blocked. `npx prisma validate`, `npx tsc --noEmit`, and
`npm run build` all pass.

### 2026-06-22 — Step 3P: Release 1 Decimal sign-off and implementation plan (Expense/EmployeeAdvance/TravelClaim)
Step 3P completed: a sign-off and implementation-planning step only — no Prisma schema change,
no migration, no API/UI code change, no database data altered, no Lakhs value converted to INR
yet, no Decimal field conversion yet.

Created `docs/database/DECIMAL_RELEASE1_SIGNOFF_PLAN.md`, the dedicated Release 1 artifact
building on Step 3O's transformation design. Locks the **9-field Release 1 scope** —
`Expense.amountLakhs`/`gstAmountLakhs`,
`EmployeeAdvance.amountLakhs`/`disbursedAmountLakhs`/`settledAmountLakhs`/`balanceLakhs`,
`TravelClaim.amountLakhs`/`amountRupees`/`ratePerKm` — with a per-field status: `EmployeeAdvance`
is **Approved** (1 clean live dev row); `Expense`/`TravelClaim` are **Approved with notes**
because both tables have 0 rows in dev today (nothing to transform/verify against yet). A
companion exclusions table covers `Payment`, `Collection`, `Voucher`/`Ledger`, CRM Lead/
Opportunity values, KRA targets, and policy-threshold fields, each with its reason and future
release.

Documents the **No-Half-Converted-State Rule**: for any Release 1 model, DB stored values,
Prisma schema type, API boundary serialization, UI labels/converters, documentation, and smoke
tests must all change together in the same release — a model must never store INR while its UI
still multiplies by 100,000, nor store Lakhs while an API label calls it INR. Lays out the
12-step **atomic Step 3Q implementation sequence** (smoke-test data → pre-migration snapshot →
schema type change → reviewed migration SQL → value-transformation SQL → dev-only apply → Prisma
client regen → API boundary update → UI converter update → before/after comparison → validation →
documentation) and a dev-only **rollback/safety plan** (no `db push`, no production run, manual
migration-SQL review, backup before apply).

Specifies exact **smoke-test data** to be inserted in Step 3Q (not this step) for the two empty
tables — two `Expense` rows (₹0.1L/₹10,000 and ₹10.555L/₹1,055,500 incl. matching GST) and one
`TravelClaim` row (₹0.025L amountLakhs / ₹2,500 amountRupees / ₹12.50 ratePerKm) — plus the
existing `EmployeeAdvance` row's expected ₹50,000 post-transformation value. Tabulates the
**API boundary plan**: `/api/finance/expenses` and `/api/finance/expenses/[id]` already use
`src/lib/money.ts` (Steps 3K) and need no new wiring beyond the underlying type change;
`/api/finance/advances` is flagged as **not yet wired to `money.ts`** and must be in Step 3Q;
`/api/finance/conveyance` needs only a `serializeMoney`/`moneyToNumberForDisplay` pass-through
since `TravelClaim.amountRupees`/`ratePerKm` are already real INR. Tabulates the **UI update
plan**: `ExpenseRegisterClient.tsx`, `ClaimsClient.tsx` (the Expense-claims UI, distinct from
`TravelClaim`), `AdvancesClient.tsx` (including its "Amount (₹ Lakhs)" form label, which must
become "Amount (₹)"), and `FinanceApprovalsClient.tsx`'s shared per-record-type approval-context
renderer (must branch by source model — stop multiplying for Release 1 records, keep
multiplying for Release 2). Confirmed the `conveyance` UI module is still 100% mock data, not
yet wired to the real `TravelClaim` field, so it needs no Release 1 change.

Final **§11 sign-off ledger**: every decision is Approved or Approved-with-notes except
"Decimal schema conversion permission," explicitly left **Pending explicit final approval for
Step 3Q**. Payment/Collection remain excluded and Blocked, gated on the unresolved KRA-engine
sign-off (carried over from Step 3O). Cross-referenced (progress notes appended) in
`docs/database/DECIMAL_CONVERSION_READINESS_CHECK.md` and
`docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md`. **No Prisma schema field was converted, no
migration was generated or applied, no API route or UI component was modified, no Lakhs value
was multiplied into INR, and no database row was written or altered.** `npx prisma validate`,
`npx tsc --noEmit`, and `npm run build` all pass (reconfirmations, no app code changed).

### 2026-06-22 — Step 3O: live dev data profile + Lakhs-to-INR transformation design + KRA-engine impact + sign-off ledger
Step 3O completed: a read-only profiling, design, and sign-off step only — no Prisma schema
change, no migration, no API/UI code change, no database data altered, no Lakhs value converted
to INR yet, no Decimal field conversion yet.

**Live dev data profile completed** (the blocker carried over from Step 3N). Confirmed
`DATABASE_URL` pointed at `u686730471_caveodev` before running a read-only Prisma
`findMany`-plus-in-JS-aggregation script across all 13 candidate fields; deleted immediately
after capturing results (no scratch files left, confirmed via `git status`). Result:
`Expense`/`TravelClaim` have **0 rows** in this dev DB today — nothing to profile, but also
nothing to block on. `EmployeeAdvance` (1 row, ₹0.5L matching the seed exactly), `Payment`
(1 row, ₹1.61L), and `Collection` (94 real legacy rows, ₹0.003L–₹77.88L) are all **clean** — zero
negative values, zero suspiciously large values, and the only >2dp scale-exceed counts
(2/94 on `invoiceValueLakhs`, 60/94 on `amountWithoutGstLakhs`) are fully explained by the
GST-back-calculation formula (`base = invoice / 1.18`), not by data-entry errors.

**Finance Lakhs-to-INR Transformation Design documented** in
`docs/database/DECIMAL_CONVERSION_READINESS_CHECK.md` — a field-by-field table giving the exact
transformation for each of the 13 candidate fields: `value * 100000` for every genuine
Lakhs-denominated field, and explicitly **no transformation** for `TravelClaim.ratePerKm`/
`amountRupees`, which are already real INR/real ₹-per-km. Each field's target `Decimal` type and
Release 1/Release 2 placement is specified.

**Code converter/UI-label/API-comment inventory completed** — catalogued every place in the
codebase that currently assumes Finance fields are Lakhs: the `lakhsToRupees()` functions in
`FinanceDashboardClient.tsx`, `VouchersClient.tsx`, `expenses/data.ts`, `ClaimsClient.tsx`,
`AdvancesClient.tsx`, and `bank-book/data.ts` (plus that file's `fmtINRfromLakhs()`); the inline
`* 100_000` conversions in `ApprovalInboxPage.tsx`/`FinanceApprovalsClient.tsx`;
`vouchers/[id]/route.ts`'s `amountInWords()` helper; the Collections UI's literal `"L"`-suffix
labels (`CollectionsClient.tsx`, both the summary cards and the live create/edit form);
`src/lib/kra-engine.ts`'s direct unconverted reads of `Collection.invoiceValueLakhs`/
`amountWithoutGstLakhs`; `src/lib/payments.ts`'s `round2()`/epsilon-comparison workaround; and the
"returned... in ₹ Lakhs" doc comments on the Dashboard/Expense/Bank Book/Cash Book API routes.
Nothing in this inventory was modified — it documents what must change, and in which release,
once each source model converts.

**Collection / KRA Engine Impact analysed** — confirmed via direct code reading that
`kra-engine.ts`'s `onTimeCollectionRate()` is a unit-agnostic ratio (both numerator and
denominator are `Collection.invoiceValueLakhs`, so the unit cancels out — no risk), but
`totalCollectionsWithoutGst()` returns an absolute total that feeds `computeKRAProgress()`,
where it is divided directly against a human-entered KRA target (`billingTarget`) with **zero
conversion factor today**. Confirmed via `prisma/seed-performance-defaults.ts` that KRA targets
(`KRATemplateItem.expectedTarget`/`minimumTarget`/`stretchTarget`, e.g. `REVENUE_TARGET:
expectedTarget: 50`) are genuinely Lakhs-based by convention — a real-INR target would be entered
as "5,000,000," not "50." **Recommendation**: move `Collection` storage to actual INR per the
locked policy, keep KRA targets Lakhs-based (don't force a separate UX migration onto KRA
template configuration), and have `kra-engine.ts` explicitly divide by 100,000 at the
`totalCollectionsWithoutGst()` scoring boundary in the same release `Collection` converts. This is
a recommendation requiring explicit sign-off — not yet approved.

**No-Half-Converted-State Rule added**: for any model in a release, the data transformation,
schema type change, API boundary behavior, UI converters, and documentation must all change
together. A model must never store actual INR while its UI still multiplies by 100,000, and must
never store Lakhs while its API documentation claims INR.

**Sign-off ledger (§12 of the readiness check) added.** Result: **Decimal schema conversion
remains BLOCKED.** Release 1 (`Expense`/`EmployeeAdvance`/`TravelClaim`, 9 fields) is marked
"Approved with notes" — the grouping and data quality are sound, but the value-transformation
script itself has not been written or tested (no existing `Expense`/`TravelClaim` rows in dev to
validate it against). Release 2 (`Payment`/`Collection`, 4 fields) is marked explicitly
**Blocked**, per this step's own instruction to block Payment/Collection whenever the KRA/
Collection decision is unresolved — it is recommended here, but not yet signed off by a named
approver.

**No schema, migration, API route, UI component, or database row was changed.** The only
database interaction performed was read-only aggregation via Prisma, via a temporary script
deleted immediately after use. `npx prisma validate`, `npx tsc --noEmit`, and `npm run build` all
pass (reconfirmations, since no application code was changed). See
`docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3O row) for the tracker entry.

### 2026-06-22 — Money unit policy locked: Lakhs restricted to Leads/Opportunities, Finance must use actual INR (before Step 3O)
**Money unit policy locked: only Leads and Opportunities use Lakhs. Finance and Accounting
modules must use actual INR values without Lakhs conversion.** This is a business-rule decision,
documented in `docs/database/DECIMAL_CONVERSION_READINESS_CHECK.md` §0 and cross-referenced in
`docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md`, made before Step 3O begins.

Scope: `CrmLead.expectedValue`, `CrmOpportunity.value`/`dealValueExTax`/`netProfitLakhs`,
`SalesFunnel.dealValueLakhs`/`billingValueLakhs` may remain Lakhs-based (intentional
pipeline-estimation values). Every Finance/Accounting model — `Expense`, `EmployeeAdvance`,
`TravelClaim`/Conveyance, `Payment`, `Collection`, `Voucher`, `Ledger`, Bank Book, Cash Book,
`FinAccount` balances, Reports, Tally export, GST/tax calculations, reimbursements, settlements,
vendor/customer payments — must use actual INR going forward.

**Verification finding (not assumption):** every existing Finance field named `*Lakhs`
(`Expense.amountLakhs`/`gstAmountLakhs`, `EmployeeAdvance.amountLakhs`/`disbursedAmountLakhs`/
`settledAmountLakhs`/`balanceLakhs`, `Payment.amountLakhs`, `Collection.invoiceValueLakhs`/
`amountWithoutGstLakhs`/`amountReceivedLakhs`, `Voucher.amountLakhs`, `Ledger.amountLakhs`,
`FinAccount.openingBalance`/`currentBalance`) genuinely and intentionally stores ₹ Lakhs today —
confirmed via `prisma/seed-dev-finance.ts` (e.g. `EmployeeAdvance.amountLakhs: 0.5` = ₹50,000),
the Collections form literally rendering an `"L"` suffix on the raw input, and 9+ independent UI
unit-converters (`lakhsToRupees()`/`fmtINRfromLakhs()` across `FinanceDashboardClient.tsx`,
`VouchersClient.tsx`, `expenses/data.ts`, `ClaimsClient.tsx`, `bank-book/data.ts`,
`AdvancesClient.tsx`, plus inline `* 100_000` conversions in `ApprovalInboxPage.tsx`/
`FinanceApprovalsClient.tsx`). **None of these names are misleading — they are accurate for a
unit the business has now decided Finance must stop using.** The one exception:
`TravelClaim.amountRupees`/`ratePerKm` are already real INR/real ₹-per-km and need no unit change.

**New cross-cutting risk identified**: `Collection.invoiceValueLakhs`/`amountReceivedLakhs` feed
`src/lib/kra-engine.ts`'s employee KRA performance-scoring aggregations (6 confirmed call sites)
— a non-Finance domain the policy text doesn't address. Converting `Collection`'s unit without
updating the KRA engine in lockstep would silently corrupt KRA achievement-vs-target comparisons
by a factor of 100,000. This is now an explicit open decision (readiness check §10) before
`Collection` can be converted.

**Consequence for the Decimal conversion plan**: adopting actual-INR semantics for Finance is not
a naming fix — it requires a coordinated value transformation (multiply every existing stored row
by 100,000), the Decimal column-type change, and synchronized updates to every Finance UI
converter and API doc comment, all in one release (a half-converted state would silently display
amounts 100,000× too large). Schema conversion remains **blocked** on two grounds now: the §4 data
profile gap (Step 3N) and this newly-scoped unit-transformation design work. Step 3O's scope was
expanded to include designing (not implementing) this transformation alongside the original data
profile and decision sign-off. No schema, migration, API, or UI code was changed by this policy
update — documentation only. See `docs/RBAC_MIGRATION_TRACKER.md` §4 for the tracker entry.

### 2026-06-22 — Decimal conversion readiness check for critical Finance money fields (Step 3N)
Step 3N completed: a data-audit and decision-lock step only — no Prisma schema change, no
migration, no API/UI code change, no database data altered. Created
`docs/database/DECIMAL_CONVERSION_READINESS_CHECK.md`, assessing the 5 critical Finance models
named for the first conversion batch: `Expense`, `EmployeeAdvance`, `TravelClaim`, `Payment`,
`Collection`. `Voucher`/`Ledger` were explicitly excluded, per their separate void/reversal-only
accounting lifecycle already documented in `docs/database/SOFT_DELETE_DECISION_LOG.md`.

Inventoried **13 candidate money/rate fields** with exact `prisma/schema.prisma` names:
`Expense.amountLakhs`/`gstAmountLakhs`; `EmployeeAdvance.amountLakhs`/`disbursedAmountLakhs`/
`settledAmountLakhs`/`balanceLakhs`; `TravelClaim.ratePerKm`/`amountRupees`/`amountLakhs`;
`Payment.amountLakhs`; `Collection.invoiceValueLakhs`/`amountWithoutGstLakhs`/
`amountReceivedLakhs` — each mapped to its recommended `Decimal(18,2)` or, for `ratePerKm`,
`Decimal(10,4)` type. A separate exclusion table documents why `gstRate`, `distanceKm`, GPS
fields, CRM pipeline-estimate fields, Voucher/Ledger fields, and policy-threshold fields are out
of scope for this batch.

**Live dev data profiling could not be completed in this environment.** A read-only profiling
script was written (Prisma `findMany` per candidate field, with in-JS row-count/null-count/min/
max/negative-count/scale-exceed-count computation — the scale-exceed check approximates "more
than N decimal places" via `ROUND(v * 10^scale) / 10^scale !== v`, documented as an approximation
since `Float`/`DOUBLE` already carries inherent binary-rounding noise). `DATABASE_URL` was
confirmed to point at the dev database (`u686730471_caveodev`), not production, before any query
was attempted. Every connection attempt — both a direct `mariadb` driver connection and the app's
own `src/lib/prisma.ts` client — was rejected with `Access denied for user
'u686730471_devuser'@'<this-sandbox's-IP>'`, repeated to rule out a transient blip. This matches
the standing `CLAUDE.md` note that the dev DB requires the connecting IP to be allow-listed in
hPanel → Remote MySQL; this sandboxed environment's egress IP is evidently not on that allowlist.
**No query reached the database — no row was read, written, or altered.** The temporary profiling
script was deleted immediately after; `git status` confirms no scratch files remain. The
methodology and an empty results table are documented in the readiness check's §4 so the profile
can be filled in directly once run from a DB-accessible machine.

Reviewed **API response impact across 11 routes** and **UI impact across 8 areas**. Flagged
`GET /api/finance/conveyance` and the Collections routes/UI (`GET/PUT/DELETE
/api/collections[/[id]]`, `CollectionsClient.tsx`) as the highest-risk surfaces — both return raw,
unformatted numbers today with zero Decimal-safe serialization boundary, unlike Expense/Dashboard/
Bank Book/Cash Book which already format through `fmtMoney()` (and, for Expense/Dashboard, through
`src/lib/money.ts` internally per Steps 3K/3L). `GET /api/finance/advances` was flagged Medium —
its `fmt()` formatter is not yet wired to `money.ts`, consistent with Step 3K's finding that the
route has no JS-level addition to wire. Documented the MySQL `ALTER COLUMN` migration-SQL risk
plan: no shadow-DB privilege on Hostinger (same `P3014` limitation as every prior schema step),
manual diff/apply-script/resolve pattern required, backup-before-apply mandatory, no destructive
statements permitted in the generated diff.

**Recommendation: conservative first batch (Option A)** — convert only `Expense`/
`EmployeeAdvance`/`TravelClaim` money/rate fields (9 of the 13 candidates) first, deferring
`Payment`/`Collection` (4 fields) to a second batch. Reasoning: `Payment`/`Collection` are
already live and actively written (verified live create/update/soft-delete flows from Steps
3D/3E), and their conversion is inherently bundled with retiring `src/lib/payments.ts`'s
`round2()`/epsilon-comparison workaround — a write-path code change, not a schema-only change like
the other three models can mostly be. This also matches the original Step 3G migration plan's own
§9 sequencing recommendation.

**Final determination: schema conversion is BLOCKED — not ready to proceed**, pending the live
data profile (§4's gap). The named next step is **Step 3O — re-run the live dev data profile from
a DB-accessible environment and obtain sign-off on the open decisions (§10)** before any
`prisma/schema.prisma` edit is made. `npx prisma validate`, `npx tsc --noEmit`, and `npm run
build` all pass — reconfirmations only, since no code was changed this step. See
`docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3N row) for the tracker entry.

### 2026-06-22 — Final money-helper dry-run sweep across remaining Finance read routes (Step 3M)
Step 3M completed: final money-helper dry-run sweep completed across remaining Finance read
routes — no Decimal field migration yet. This was a review-only step; **zero files were
changed.** Inspected the 6 Finance read routes not yet covered by Steps 3I–3L
(`GET /api/finance/bank-book`, `GET /api/finance/cash-book`, `GET /api/finance/expenses` (+
`[id]`), and `GET /api/finance/dashboard`) and classified each:

- **`GET /api/finance/accounts`** — Pure pass-through. `openingBalance`/`currentBalance` are
  formatted directly via the route's existing `fmtMoney()` with no JS-level combination of
  values. Not a candidate.
- **`GET /api/finance/vouchers`** — Only direct DB `_sum` value. `totalVoucherAmount =
  fmtMoney(r2(totalAmountAgg._sum.amountLakhs ?? 0))` rounds a single Prisma aggregate; there is
  no second value being added or subtracted in JS. Not a candidate — consistent with how Step
  3L left `cashBalance`/`bankBalance`/`totalCashIn`/etc. untouched for the identical reason.
- **`GET /api/finance/vouchers/[id]`** — Not suitable for this dry run. Its only money-shaped
  logic is `amountInWords()` — a unit conversion (₹ Lakhs → ₹ Rupees) followed by whole/paise
  decomposition for amount-in-words text generation, not an addition/subtraction of two monetary
  values; `src/lib/money.ts` has no decompose-into-words helper, so wiring it here would mean
  inventing a new helper rather than adopting an existing one. Not a candidate.
- **`GET /api/finance/voucher-sequences`** — Pure pass-through. No money fields at all — only
  integer voucher-numbering counters (`lastNumber`/`nextNumber`). Not a candidate.
- **`GET /api/finance/advances`** — Only direct DB `_sum` value (reconfirmed from Step 3K). Every
  summary figure is a single Prisma `_sum` formatted via `fmt()`; no JS-level addition. Not a
  candidate.
- **`GET /api/finance/conveyance`** — Pure pass-through (reconfirmed from Step 3K). Raw
  `TravelClaim` field list with zero calculation logic. Not a candidate.

No live HTTP verification or equivalence check was needed this step, since no calculation logic
was changed — there is nothing to compare old-vs-new against. Validation was still run per this
step's own instruction: `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅ (all
routes including the 6 reviewed ones compiled, unchanged), `npm run lint` → 589 problems,
identical to the Step 3L baseline (expected, given zero file changes).

**The money-helper dry-run sweep is now complete across every Finance read route.** Bank Book
(3I), Cash Book (3J), Expense list+detail (3K), and Dashboard (3L) had genuine isolated
JS-level money calculations and were wired to `src/lib/money.ts`. Accounts, Vouchers, Voucher
Detail, Voucher Sequences, Advances, and Conveyance (3M) were reviewed and correctly have
nothing to wire — they remain on their original `fmtMoney()`/`r2()` formatting. No Prisma schema
field was converted, no migration was generated, and no Finance write API was created at any
point across Steps 3H–3M. See `docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3M row) for the tracker
entry.

### 2026-06-22 — Money helper dry-run integration extended to Finance Dashboard totals (Step 3L)
Step 3L completed: money helper dry-run integration extended to Finance Dashboard totals. Bank
Book, Cash Book, Expense, and Dashboard now use Decimal-safe internal arithmetic where selected
— no Decimal field migration yet. Wired `src/lib/money.ts` into every JS-level total calculation
in `GET /api/finance/dashboard` (`src/app/api/finance/dashboard/route.ts`) that combines multiple
values: the base+GST additions feeding `todayExp`, `monthlyExp`, `customerExp`, the per-category
`expenseBreakdown.amount`, and `topExpenseCategories`'s `amt`; the two net-flow subtractions
(`netCashFlow` = cashIn − cashOut, `netBankFlow` = credits − debits); and the 3-way running
`monthMap` accumulation feeding `monthlyExpenseTrend`. Each replaced `r2(...)` call site now uses
`moneyToNumberForDisplay(addMoney(...))`/`moneyToNumberForDisplay(subtractMoney(...))` immediately
before the route's existing `fmtMoney()` formatting — the same boundary pattern used for Bank Book
(Step 3I), Cash Book (Step 3J), and Expense (Step 3K).

**Deliberately left unchanged**: `cashBalance`, `bankBalance`, `advOutstanding`, `claimsPending`,
`totalCashIn`, `totalCashOut`, `totalCredits`, `totalDebits` — each is a single Prisma `_sum`
aggregate with only a `?? 0` fallback, never combined with another value in JS, so there is no
addition/subtraction to wire the helper into (per this step's own "if directly returned from a
`_sum` and not combined in JS, leave it unchanged" instruction). The `percentage` field's
`(amt / totalForPct) * 100` calculation was also left on the existing `r2()` helper — it is a
ratio, not a money addition, so it's out of scope for this dry run; `r2()` itself was therefore
**not** removed from this file (it still has a live call site), unlike the Step 3K `r2()` removal
in the Expense routes where every call site was replaced.

No other line in the route changed: authorization (`canViewFinanceDashboard`), period resolution
(`dateFrom`/`dateTo`/`financialYear`), `branchId`/`accountId` filters, and every `deletedAt: null`
query are untouched — response field names, types, and JSON shape are byte-for-byte the same.
Verified equivalent via a standalone Node check covering three calculation shapes used in this
route: base+GST addition (4 pairs including `0.1 + 0.2`, `10.555 + 1.895`, and an all-zero/
null-coalesced pair), net-flow subtraction (4 pairs including `0.3 − 0.1`), and the 3-way monthly
running accumulation (3 chained entries) — every value matched once passed through the route's
existing `fmtMoney()` boundary. Live HTTP verification was not practical this step (requires an
authenticated session against the remote Hostinger dev MySQL DB), same limitation as Steps
3I–3K — static equivalence check used instead. `npx prisma validate`, `npx tsc --noEmit`,
`npm run build`, and `npm run lint` (589 problems, identical to the Step 3K baseline — confirmed
no new issues) all pass. See `docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3L row) for the tracker
entry.

### 2026-06-22 — Money helper dry-run integration extended to Expense / Advance / Conveyance totals (Step 3K)
Step 3K completed: money helper dry-run integration extended to Expense / Advance / Conveyance
totals — no Decimal field migration yet. Wired `src/lib/money.ts` into the isolated read-only
"base + GST = total" addition calculations in `GET /api/finance/expenses`
(`src/app/api/finance/expenses/route.ts`) and `GET /api/finance/expenses/[id]`
(`src/app/api/finance/expenses/[id]/route.ts`): the 6 summary aggregates that combine
`amountLakhs + gstAmountLakhs` in JS (`totalExpenses`, `todayExpenses`,
`pendingApprovalAmount`, `approvedExpenses`, `customerExpenses`, `employeeClaimsPending`) and
the per-row `totalAmount` field (both routes) now use `addMoney(...)` on a `Decimal`, converted
back to a plain `number` via `moneyToNumberForDisplay` immediately before the routes' existing
`fmtMoney()` formatting — the same boundary pattern used for Bank Book (Step 3I) and Cash Book
(Step 3J). The now-unused local `r2()` helper was removed from both files (its only call sites
were the replaced lines) to avoid leaving dead code/an unused-var lint warning; `fmtMoney()` is
unchanged and still produces every response string.

**`GET /api/finance/advances` and `GET /api/finance/conveyance` were reviewed and intentionally
left unchanged this step.** Neither contains a JS-level addition/sum combining multiple values:
every summary figure in `advances` is a single Prisma `_sum` aggregate formatted directly via
`fmt()` (no in-JS combination to wire the helper into), and `conveyance` is a pure read-only
pass-through list with no calculation logic at all. Per the step's own "if a route has no
calculation, leave it untouched and document" instruction, nothing was changed in either file.

No other line in either edited route changed: authorization (`canViewAllFinanceExpenses`), the
`deletedAt: null` filter, date/status/category/vendor/search filters, pagination, and response
status codes are all unchanged — response field names, types, and JSON shape are byte-for-byte
the same. Verified equivalent via a standalone Node check comparing the old `r2(base + gst)`
logic against the new `moneyToNumberForDisplay(addMoney(base, gst))` logic across 5
representative sample pairs (including `0.1 + 0.2`, `10.555 + 1.895`, and a 3-way addition
mirroring `employeeClaimsPending`) — every value matched once passed through the routes'
existing `fmtMoney()` boundary. Live HTTP verification was not practical this step (both routes
require an authenticated session against the remote Hostinger dev MySQL DB), same limitation as
Steps 3I/3J — static equivalence check used instead. `npx prisma validate`, `npx tsc --noEmit`,
`npm run build`, and `npm run lint` (589 problems, identical to the Step 3J baseline — confirmed
no new issues, including no new unused-var warnings from the `r2()` removal) all pass. See
`docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3K row) for the tracker entry.

### 2026-06-22 — Money helper dry-run integration extended to Cash Book (Step 3J)
Step 3J completed: applied the exact Step 3I pattern to the second isolated read-only path — the
running-balance accumulation loop in `GET /api/finance/cash-book`
(`src/app/api/finance/cash-book/route.ts`). The loop previously accumulated with
`running = r2(running ± entry.amountLakhs)` (Cash In/credit → adds, Cash Out/debit → subtracts,
per the route's existing cash-register display convention); it now accumulates with
`addMoney`/`subtractMoney` on a `Decimal` seeded via `toMoneyDecimal(periodOpeningBalance)`,
converting back to a plain `number` only at the loop boundary via `moneyToNumberForDisplay` —
rounding deferred to the route's existing final `fmtMoney()` call rather than rounded at every
intermediate step. No other line in the route changed: date/account/employee/type/expense-category/
status/search filters, pagination, the `mapTxnType` mapping, and `canViewFinanceCashBook`
authorization are all untouched — response field names, types, and JSON shape are unchanged.
Verified equivalent via a standalone Node check (old `r2`-per-step loop vs. new
`addMoney`/`subtractMoney` loop, same opening balance + 6 mixed credit/debit entries including
`0.1 + 0.2`-style float-noise inputs) — every value is identical once passed through the route's
existing `fmtMoney()` call. Live HTTP verification was not practical this step (requires an
authenticated session against the remote Hostinger dev MySQL DB), same limitation as Step 3I —
static equivalence check used instead. **Bank Book (Step 3I) and Cash Book (this step) are now the
only two Finance routes using the Decimal-safe internal running-balance pattern; no other route or
UI component was touched, and no Prisma schema field was converted.** `npx prisma validate`, `npx
tsc --noEmit`, `npm run build`, and `npm run lint` (589 problems, identical to the Step 3I
baseline — confirmed no new issues) all pass. See `docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3J
row) for the tracker entry.

### 2026-06-22 — Money helper dry-run integration into one read-only path (Step 3I)
Step 3I completed: wired `src/lib/money.ts` (Step 3H) into exactly one low-risk, read-only
calculation path — the running-balance accumulation loop in `GET /api/finance/bank-book`
(`src/app/api/finance/bank-book/route.ts`) — as a controlled dry run ahead of any Decimal schema
conversion, per `docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md`. The loop that previously
accumulated the running balance with `running = r2(running ± entry.amountLakhs)` (rounding after
every single addition) now accumulates with `addMoney`/`subtractMoney` on a `Decimal` seeded via
`toMoneyDecimal(periodOpeningBalance)`, converting back to a plain `number` only at the loop
boundary via `moneyToNumberForDisplay` — matching the plan's §6 rule to round only at the final
display/posting step. No other line in the route changed; the route's existing `fmtMoney()`/`r2()`
formatters still produce every response value, so the JSON shape, field names, and string types at
the API boundary are unchanged. Verified equivalent (not just "it builds") via a standalone Node
check comparing the old per-step-rounded loop against the new Decimal loop on the same opening
balance + 5 mixed credit/debit entries (including `0.1 + 0.2`-style float-noise inputs) — every
value is identical once passed through the route's existing `fmtMoney()` call. Live HTTP
verification against the route was not practical this step (requires an authenticated session
against the remote Hostinger dev MySQL DB); documented as a limitation, with the static equivalence
check used instead. **No Prisma schema field was converted, no migration was generated, no Finance
write API was created, and no other Finance route or UI component was touched.** `npx prisma
validate`, `npx tsc --noEmit`, `npm run build`, and `npm run lint` (589 problems, identical to the
Step 3H baseline — confirmed no new issues) all pass. See `docs/RBAC_MIGRATION_TRACKER.md` §4
(Step 3I row) for the tracker entry.

### 2026-06-21 — Central money helper added before Decimal schema conversion (Step 3H)
Step 3H completed: created `src/lib/money.ts`, the central money helper called for in
`docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md` §5/§9 — built **before** any Prisma schema field
converts from `Float` to `Decimal`; every money field in `prisma/schema.prisma` is still
`Float`/`Float?` as of this step. Uses Prisma's own `Decimal` class, imported directly from
`@prisma/client/runtime/client` rather than the generated client (`@/generated/prisma/client`) so
the module stays side-effect-free and doesn't pull in `PrismaClient`'s Node bootstrap code
(`node:process`/`node:path`/`globalThis` assignment) just to get the `Decimal` type — no new npm
dependency was added. Exports three tiers: strict parsing (`toMoneyDecimal`, `parseMoneyInput`,
both throwing `InvalidMoneyInputError` on null/undefined/empty-string/non-numeric/non-finite
input), an explicit lenient escape hatch (`safeMoneyDecimal`, the only place "null becomes zero"
happens without being asked for), and display/serialization helpers built on that lenient path
(`moneyToString`, `serializeMoney`, `moneyToNumberForDisplay`, `formatMoney`) — plus strict
arithmetic (`addMoney`, `subtractMoney`, `multiplyMoney`, `divideMoney` — the last rejecting
division by zero) and comparisons (`isZeroMoney`, `isPositiveMoney`, `isNegativeMoney` —
deliberately stricter than decimal.js's own `isPositive()`, which treats `0` as positive). The
serialization policy (string for persisted/posting APIs, `moneyToNumberForDisplay` only for
display, never a bare `Number(decimal)`/`parseFloat`, round only at the final step via
`roundMoney`) is documented in the file's header comment and per-export JSDoc. Verified via a
temporary self-check script (23 checks — `addMoney("0.1","0.2")` → `"0.30"`,
`roundMoney("10.555")` → `"10.56"`, `moneyToString(100)` → `"100.00"`, invalid-input rejection for
`null`/`"abc"`/`NaN`/`Infinity`/objects/booleans, division-by-zero rejection — all passing), then
deleted per the step's own instruction not to introduce a new test framework. **No Prisma schema
field was converted, no migration was generated, no API response shape changed, no UI changed,
and no existing route** (`src/app/api/finance/*`, which today duplicates the exact
`Math.round(v*100)/100` pattern this helper exists to replace, confirmed via search across
`accounts`/`advances`/`bank-book`/`cash-book`/`dashboard`/`expenses`/`vouchers` routes — nor
`src/lib/payments.ts`'s `round2()`/epsilon-comparison workaround) **was wired to the new helper
yet** — that wiring is explicitly deferred to a later implementation step, not done here.
`npx prisma validate`, `npx tsc --noEmit`, `npm run build` (159 pages), and `npm run lint` (589
problems — identical to the Step 3G baseline, confirmed no new issues) all pass. See
`docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3H row) for the tracker entry.

### 2026-06-21 — Decimal money migration plan created (Step 3G)
Step 3G completed: created `docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md` — a planning/
documentation step only, ahead of Finance write APIs being built. Inventoried every money-like
`Float`/`Float?` field in `prisma/schema.prisma`: 35 fields classified Critical (`Collection`,
`Payment`, `OrderAdvance`, `FinAccount`, `Ledger`, `Expense`, `Voucher`, `EmployeeAdvance`,
`TravelClaim` — the models with live or imminent Finance write-API exposure), Important
(approval/policy money thresholds — `ApprovalRule`, `ExpenseLimitRule`, `ConveyancePolicy`,
`AdvancePolicy`, `CustomerCreditPolicy` — plus CRM pipeline deal-value estimates —
`SalesFunnel.dealValueLakhs`/`billingValueLakhs`, `CrmLead.expectedValue`,
`CrmOpportunity.value`/`dealValueExTax`/`netProfitLakhs`), and Later (`Notification.amountLakhs`,
a display-only denormalized copy). Explicitly excluded 12 non-money numeric fields so a future
implementation step doesn't assume every `Float` is money: `TravelClaim.distanceKm` and its GPS
lat/lng fields, `SalesFunnel.grossProfitPct`/`probabilityPct`, `CrmOpportunity.discountPct`/
`probability`, `Expense.gstRate` (a tax *rate*, distinct from the already-included
`gstAmountLakhs` tax *amount*), and the metric-dependent KRA target/score/rating fields
(`KRATemplateItem`, `KRAAchievement`, `PerformanceReview`). Recommended standard: money amounts
→ `Decimal(18,2)`, per-unit rate fields (`ratePerKm`) → `Decimal(10,4)`, tax/percentage fields →
`Decimal(8,4)` or left unchanged. Documented the API-serialization risk (Prisma `Decimal` is not
a plain JS `number`) with a recommendation to build one central money-serialization helper before
any column conversion — citing the concrete, already-existing symptom of this exact problem:
`src/lib/payments.ts`'s `round2()` (`Math.round(n*100)/100`) and the `received + 0.001 >= invoice`
epsilon-comparison hack in `syncCollectionTotals()`, both workarounds for float-precision noise on
`Payment.amountLakhs`/`Collection.invoiceValueLakhs` today. Defined a 7-phase (A–G) migration
safety plan, MySQL `ALTER COLUMN` data-rewrite risk notes (back up dev/prod first, compare
before/after `SUM()` totals, reuse the Step 3B shadow-DB-free migration workaround with manual
SQL review), and a proposed Step 3H (money helper) → 3I (Expense/Advance/TravelClaim) → 3J
(Payment/Collection) → 3K (Voucher/Ledger/FinAccount, gated on the cancellation/reversal design
per the existing Step 3B-0 void/reversal-only decision) → 3L (dashboard/report updates) → 3M
(data comparison checks) sequence. **No Prisma schema field was converted, no migration was
generated or applied, no API route or UI component was changed, and no calculation logic
(`round2()`, `syncCollectionTotals()`, or any other) was touched.** `npx prisma validate` passes
(no-op confirmation — schema untouched). See `docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3G row)
for the tracker entry.

### 2026-06-21 — Reusable AuditLog helper created; soft-delete routes refactored to use it (Step 3F)
Step 3F completed: created `src/lib/audit-log.ts`, exporting `logAuditEvent` (the core writer —
accepts `entityType`, `entityId`, `action`, `performedById`, `notes`, `changes`, and an optional
`tx` for either the default `prisma` client or a `Prisma.TransactionClient`), `logSoftDelete` (a
convenience wrapper fixing `action` to `AUDIT_ACTIONS.SOFT_DELETE` and `changes` to the pre-delete
row snapshot), and `AUDIT_ACTIONS` (future-safe action-name constants: `SOFT_DELETE`, `RESTORE`,
`DELETE_BLOCKED_REFERENCE_EXISTS`, `VOUCHER_VOID`, `LEDGER_REVERSAL`, `PAYMENT_POSTED`,
`EXPENSE_APPROVED`, `ADVANCE_SETTLED`). Refactored all 4 existing Customer/Collection soft-delete
`AuditLog` writes (the only ones touched in Steps 3D/3E) to call the helper instead of inline
`prisma.auditLog.create()`: `DELETE /api/customers/master/[id]`, `POST
/api/customers/master/deduplicate` (merge — helper calls inside the existing
`prisma.$transaction([...])` array), `DELETE /api/collections/[id]`, `DELETE /api/collections`
(bulk — helper calls inside the existing `updateMany()` + per-record-audit transaction array).
Every refactored call site preserves the exact same `action`/`entityType`/`notes`/`changes`
payload, the same transaction grouping, the same API response shape, and the same permission
guards — this is a pure internal refactor, not a behavior change. The pipeline lead hard-delete
(`DELETE /api/pipeline/leads/[id]`) was intentionally left alone — it uses `action: "delete"` (not
`"SOFT_DELETE"`) and `entityType: "lead"` (lowercase, no special casing), a genuinely different
delete semantic (hard delete vs soft delete), not an unrefactored oversight; documented as a
future candidate only if its own semantics are revisited. **Live-verified** in the dev DB using
disposable test rows (created and cleaned up within this step): Customer single delete, Customer
merge-delete, Collection single delete, and Collection bulk delete (2 rows) were each exercised
through the real running API (`fetch()` calls against the dev server, same code path the UI uses)
and the resulting `AuditLog` rows were confirmed byte-for-byte identical in shape to the
pre-refactor rows — including the bulk case still writing one `AuditLog` row per affected
`Collection` inside the same `$transaction`. `npx prisma validate`, `npx tsc --noEmit`, `npm run
build` (159 pages), and `npm run lint` (589 problems — identical to the Step 3E baseline,
confirmed no new issues) all pass. See `docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3F row) and
`docs/database/SOFT_DELETE_DECISION_LOG.md`/`SOFT_DELETE_MIGRATION_PLAN.md` for full detail.

### 2026-06-21 — Customer and Collection delete UI flows now require a delete reason (Step 3E)
Step 3E completed: Customer and Collection delete UI flows now require delete reason. Closed the
"reason-body limitation" Step 3D documented above — `CustomerMasterClient.tsx`'s new
`DeleteCustomerModal` and `CollectionsClient.tsx`'s new shared `DeleteReasonModal` (used for both
single and bulk delete) replaced the old `window.confirm()` flows, mirroring the existing
`DeleteLeadModal` pattern from `pipeline/leads/LeadsClient.tsx` (same overlay/card styling, a
required `textarea`, submit button `disabled` until the reason is non-empty after trim, an inline
error `div` that does not auto-close the dialog, separate Cancel button). All three flows now send
the user-entered reason as `deleteReason` in the request body: `DELETE
/api/customers/master/[id]`, `DELETE /api/collections/[id]`, and `DELETE /api/collections` (bulk,
alongside `ids`). Soft-delete APIs receive user-entered `deleteReason`; the API fallback reason
(`"Deleted by user"`) remains only for non-UI or legacy callers — no API route code was changed,
since no body-parsing bug was found that prevented the UI from sending a body. Customer
duplicate-merge delete (`POST /api/customers/master/deduplicate`) intentionally received no reason
prompt — its existing system-generated reason (`"Merged into customer <keepId>"`, from Step 3D)
already satisfies accountability for a system-initiated delete. No schema/API authorization
changes were made. **Live-verified in the dev DB** using disposable test rows (created and cleaned
up within this step, never touching real data): Customer single delete, Collection single delete,
and Collection bulk delete (2 rows) — for each, the Delete button was programmatically confirmed
`disabled` before a reason was entered and enabled after, the network request carried the entered
`deleteReason`, and the resulting `Customer`/`Collection` row's `deletedAt`/`deletedById`/
`deleteReason` plus a matching `AuditLog` row were confirmed directly against the database.
`npx prisma validate`, `npx tsc --noEmit`, `npm run build` (159 pages), and `npm run lint` (589
problems — identical to the Step 3D baseline, confirmed no new issues) all pass. See
`docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3E row) and `docs/database/SOFT_DELETE_DECISION_LOG.md`/
`SOFT_DELETE_MIGRATION_PLAN.md` for full detail.

### 2026-06-21 — Customer and Collection hard-delete converted to soft delete (Step 3D)
Step 3D completed: the two confirmed live-risk hard-delete paths — `Customer` and `Collection` —
no longer physically remove rows. Inventoried every `prisma.{customer,collection}.{delete,
deleteMany}` call under `src/` (excluding generated code) and converted all 4 found: `DELETE
/api/customers/master/[id]` (single), `POST /api/customers/master/deduplicate` (merge-delete),
`DELETE /api/collections/[id]` (single), `DELETE /api/collections` (bulk). Each route now
re-checks `deletedAt: null` before acting (404 if already gone), sets `deletedAt`/`deletedById`/
`deleteReason` via `update()`/`updateMany()`, and writes one `AuditLog` row per affected record
(`action: "SOFT_DELETE"`, `entityType: "customer"` or `"collection"`, `changes` = JSON snapshot of
the pre-delete row) — reusing the exact `prisma.auditLog.create()` shape `DELETE
/api/pipeline/leads/[id]` already used; no new audit helper or framework was built. **Reason-body
limitation:** neither the Customer Master nor Collections delete buttons send a request body
today (confirmed by reading `CustomerMasterClient.tsx`/`CollectionsClient.tsx`) — `deleteReason`
is optional with a fallback (`"Deleted by user"`, or `"Merged into customer <keepId>"` for
merges) so both existing delete buttons keep working with zero UI changes; this is a documented
temporary limitation, not a UI rewrite. **Merge-delete confirmed safe** — `Customer` has no
`@unique` on `name`/`gstNo`, so soft-deleting merged-away duplicates next to the still-active kept
customer cannot collide; no physical-delete exception was needed. **Bulk Collection delete** uses
one `updateMany()` + one `auditLog.create()` per record inside a single `$transaction([...])` —
audited per-record, not a silent bulk soft-delete. **Live-verified in the dev DB** using disposable
test rows created and deleted within this step (never touching real data): single Customer
delete, single Collection delete, bulk Collection delete, and Customer merge-delete all set the
correct fields, wrote the correct audit row, left the row physically present, and were
immediately excluded from `GET /api/customers/master`/`GET /api/collections` afterward. **No
Vendor/Expense/EmployeeAdvance/TravelClaim/Payment/Voucher/Ledger/Employee delete behavior was
touched** — confirmed no `prisma.vendor.delete*` call exists anywhere (Vendor Master still has no
real DELETE API). No schema, migration, read-filter, or UI layout change was made. `npx prisma
validate`, `npx tsc --noEmit`, `npm run build` (159 pages), and `npm run lint` (589 problems —
identical to the Step 3C baseline, confirmed no new issues) all pass. See
`docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3D row) and `docs/database/SOFT_DELETE_DECISION_LOG.md`/
`SOFT_DELETE_MIGRATION_PLAN.md` for full detail.

### 2026-06-21 — Read filters added so Phase A reads exclude soft-deleted records (Step 3C, read-filter only)
Step 3C completed: every normal read query against the 7 Step 3B models (`Customer`, `Vendor`,
`Expense`, `EmployeeAdvance`, `TravelClaim`, `Payment`, `Collection`) now filters `deletedAt:
null`, landed deliberately **before** any DELETE route is converted (Step 3D) — converting a
delete route first would have let "deleted" records keep reappearing in lists, a worse regression
than today's hard delete. Audited every `prisma.<model>.{findMany,findFirst,findUnique,count,
aggregate,groupBy}` call under `src/` (excluding generated Prisma client code): Customer Master
list/dedup/suggestions/import-dedup (`api/customers/master/route.ts`, `.../deduplicate/route.ts`,
`api/customers/suggestions/route.ts`, `lib/customer-import.ts`, `app/masters/customers/page.tsx`),
the lead-conversion existing-customer lookup (`api/pipeline/leads/[id]/convert/route.ts` —
`findUnique` converted to `findFirst` per the task's own guidance on adding filters to unique
lookups), Finance Expense list/detail/dashboard, EmployeeAdvance list, TravelClaim list, Payment
ledger/today-summary (`lib/payments.ts`'s `syncCollectionTotals`/`reconcileOpeningBalance` also
converted their internal Collection `findUnique` lookups to `findFirst` with the filter), and
Collection across every list/dashboard/KRA-engine read site (`app/page.tsx`,
`app/dashboard/page.tsx` ×2, `app/accounts/page.tsx`, `app/collections/page.tsx`,
`app/employees/[id]/page.tsx`, `lib/kra-engine.ts` ×5, `api/kra/sync-achievements/route.ts`,
`api/import/route.ts`'s upsert-dedup check, `api/advances/[id]/apply/route.ts`). **`Vendor` had no
application-level read queries at all** — `/masters/vendors` is still UI-only mock data, so there
was nothing to update; documented rather than silently skipped. **No DELETE route was touched** —
the two ownership-check `findUnique` reads inside `api/collections/[id]/route.ts`'s PUT/DELETE
handlers were deliberately left alone (write-path internals, not normal reads). Step
2M/2R/2S self-service `employeeId` scoping was preserved exactly everywhere, with `deletedAt: null`
merged alongside it — no authorization logic weakened, no API response shape changed. No helper
module was created (`src/lib/db/soft-delete.ts` was considered but skipped) — each call site's
`where` shape differs enough that inline `deletedAt: null` was clearer than a shared constant
would have been. `npx prisma validate`, `npx tsc --noEmit`, `npm run build` (159 pages), and `npm
run lint` all pass — lint's pre-existing failures (`SidebarLinks.tsx`, `OpportunityCard.tsx`,
`policy-engine/*`, `settings.ts`, `workflow-engine/audit.ts`) are all in files this step did not
touch, confirmed via `git show HEAD` diff. See `docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3C row)
and `docs/database/SOFT_DELETE_DECISION_LOG.md`/`SOFT_DELETE_MIGRATION_PLAN.md` for full detail.

### 2026-06-21 — Soft-delete schema fields added to Phase A models (Step 3B, schema + migration only)
Step 3B completed: added `deletedAt`/`deletedById`/`deleteReason` to `Customer`, `Vendor`,
`Expense`, `EmployeeAdvance`, `TravelClaim`, `Payment`, and `Collection` — the exact 7 models
locked by Step 3B-0's decision log, each field nullable (`deletedAt DateTime?`, `deletedById
Int?`, `deleteReason String? @db.Text`), each model getting a new `@@index([deletedAt])`.
**Voucher/Ledger/Employee intentionally excluded as per decision log** — Voucher keeps
`voidedAt`/`voidReason`; Ledger stays reversal-only; Employee delete remains a separate, deferred
identity-lifecycle decision. `Permission`/`UserRole`/`DataAccessPolicy`/`AppRole`/
`RolePageAccess`/`ApprovalRequest`/`ApprovalAction` also untouched. **`prisma migrate dev` hit
Hostinger's known no-shadow-database limitation (`P3014`, no `CREATE DATABASE` privilege)** — the
same constraint documented in this file's Phase 8/Integration Center/Security Center notes.
Worked around with the project's existing pattern: `prisma migrate diff
--from-config-datasource --to-schema prisma/schema.prisma --script` (diffs the live dev DB
directly, no shadow DB needed) to generate the migration SQL, a new one-off
`prisma/apply-soft-delete-fields-phase-a.mjs` (mariadb driver, refuses to run unless
`DATABASE_URL`'s database name is exactly `u686730471_caveodev`) to apply it, then `prisma
migrate resolve --applied` + `prisma generate`. **Dev migration validated**: the raw diff also
surfaced pre-existing unrelated schema drift (missing FKs on workflow/approval/master-data/
integration tables from earlier incompletely-applied migrations) — that drift was deliberately
excluded from this migration's SQL file and left for a separate cleanup, not bundled in here. A
read-only `information_schema.COLUMNS` query confirmed exactly the 7 approved models carry the 3
new columns and `Voucher`/`Ledger`/`Employee` carry none. No API route, read filter, DELETE
endpoint, restore route, or UI file was touched — this step only changes `prisma/schema.prisma`
and the dev database's column/index set. `npx prisma validate`, `npx tsc --noEmit`, and `npm run
build` (159 pages) all pass. See `docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3B row) and
`docs/database/SOFT_DELETE_DECISION_LOG.md` for full detail.

### 2026-06-21 — Soft-delete decision log / scope lock created (Step 3B-0, sign-off only)
Step 3B-0 completed with final approved Phase A models. Reviewed Step 3A's
`SOFT_DELETE_MIGRATION_PLAN.md` §13 open decisions (which models support restore, whether
`deleteReason` should be required, who can view/restore deleted records, whether Voucher/Ledger
should ever be deleted, what happens to the Employee hard-delete) and locked final answers into
new `docs/database/SOFT_DELETE_DECISION_LOG.md`. **Approved Phase A model list for Step 3B:**
`Customer`, `Vendor`, `Expense`, `EmployeeAdvance`, `TravelClaim`, `Payment`, `Collection` — 7
models, each to receive `deletedAt DateTime?` / `deletedById Int?` / `deleteReason String?
@db.Text`. **Voucher and Ledger confirmed excluded** — Voucher keeps its existing
`voidedAt`/`voidReason` pattern; Ledger stays reversal-only via the existing `pairedLedgerId`
self-pair field; neither gets a `deletedAt` column, ever. **Employee delete lifecycle deferred**
to a separate HR/Admin identity-lifecycle step — likely deactivation, not soft-delete, given its
cascade into `Collection`→`Payment` and 9+ other models. **`Permission`/`UserRole`/
`DataAccessPolicy` confirmed Do Not Soft Delete** (revoke/remove is the correct semantic;
`Permission` is a seeded catalogue). **Restore API and "view deleted records" both deferred** —
schema keeps restore technically possible later, but no restore route or admin view ships yet.
`deleteReason` decided as DB-optional, API-required-where-practical (full per-model table in the
decision log §4). Audit logging decided as mandatory for every soft delete, reusing the existing
`AuditLog` model and its one working call site (`DELETE /api/pipeline/leads/[id]`) — no new audit
model needed; new `action` values (`SOFT_DELETE`/`RESTORE`/`DELETE_BLOCKED_REFERENCE_EXISTS`/
`VOUCHER_VOID`/`LEDGER_REVERSAL`) documented for the future route-conversion step. No Prisma
schema change, migration, API code change, or UI code change was made — `prisma migrate` was not
run. See `docs/database/SOFT_DELETE_DECISION_LOG.md` for the full 13-section decision record and
`docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3B-0 row) for the cross-reference. `npx prisma validate`
passes (schema untouched, so this is a no-op confirmation, not a meaningful check this step).

### 2026-06-21 — Soft-delete migration plan created (Step 3A, planning only)
Created `docs/database/SOFT_DELETE_MIGRATION_PLAN.md` (new `docs/database/` folder), addressing
`IMPLEMENTATION_STATUS_REPORT.md`'s #2-ranked risk ("No soft delete anywhere — all 108 Prisma
models use hard deletes") ahead of any Finance write API. **Inventoried every
`prisma.*.delete()`/`deleteMany()` call under `src/app/api`** (18 routes found) and every relevant
model's actual `ON DELETE` FK behavior (read directly from `prisma/migrations/*/migration.sql`, not
assumed): `Customer` (hard delete, `SetNull` dependents — real risk), `Collection`/`Payment`
(hard delete, `ON DELETE CASCADE` chain from `Employee`→`Collection`→`Payment` — **highest current
live risk**, confirmed at the SQL level), and `Expense`/`Voucher`/`EmployeeAdvance`/`TravelClaim`/
`Ledger` (**zero delete routes exist for any of them today** — `ON DELETE RESTRICT` on their
`Employee` FKs, confirmed in the SQL migration files, already protects them from employee-delete
cascades). Recommended schema pattern: `deletedAt DateTime?` as the sole marker (no parallel
boolean), `deletedById Int?` (bare FK first, typed relation later), `deleteReason String?`.
**`Voucher` deliberately excluded from the soft-delete field list** — it already has
`voidedAt`/`voidReason`, the correct accounting-reversal pattern, which this plan recommends
extending rather than duplicating with a second "is this gone" signal. **`Ledger`/
`ApprovalRequest`/`ApprovalAction`/`Permission`/`UserRole`/`DataAccessPolicy` recommended as Do Not
Soft Delete** for documented reasons (immutable audit trail, seeded catalogue, or "delete is the
correct semantic" join-table rows). Found and reused an existing audit-log convention rather than
inventing one: `AuditLog` model already exists and is already used once (`DELETE
/api/pipeline/leads/[id]`, which already requires a `reason` and logs before deleting) — the plan's
§9 extends that exact pattern with new `action` values (`SOFT_DELETE`/`RESTORE`/`HARD_DELETE`/
`DELETE_BLOCKED_REFERENCE_EXISTS`) rather than proposing a new model. 5-phase safety sequence
(A: add columns → B: update read filters → C: convert delete routes → D: audit logging → E:
optional restore UI), explicitly ordered so read filters land before delete-route conversion.
No Prisma schema, migration, API, or UI change was made — `prisma migrate` was not run. See the new
plan doc for the full 14-section breakdown, including 8 open decisions flagged for product
sign-off (e.g. "should Ledger ever be deleted, or only reversed?"). `npx prisma validate` passes
(schema untouched, so this is a no-op confirmation, not a meaningful check this step).

### 2026-06-21 — Build script portability fix (Step 2T)
Recent validation steps found `npm run build` failed on Windows shells (PowerShell/Git Bash):
`package.json`'s `build` script set `RAYON_NUM_THREADS=1` using POSIX inline-assignment syntax
(`RAYON_NUM_THREADS=1 next build`), which Windows shells parse as an attempt to run a command
named `RAYON_NUM_THREADS=1` rather than as an environment-variable assignment. The portable
workaround used throughout recent sessions was `npx cross-env RAYON_NUM_THREADS=1 next build`.
**Step 2T completed:**
- `package.json`'s `build` script updated from `"prisma generate && RAYON_NUM_THREADS=1 next
  build"` to `"prisma generate && cross-env RAYON_NUM_THREADS=1 next build"` — only the env-var
  prefix changed; the existing `prisma generate` step was preserved exactly (this project's build
  script never ran `prisma migrate deploy`, so none was added).
- `cross-env` was not previously a dependency — added via `npm install -D cross-env`
  (`^10.1.0`), since `package-lock.json` confirms npm is the project's package manager (no
  pnpm/yarn lock file exists).
- `npm run build` now works across Windows/Linux shells — the previous portable validation
  command `npx cross-env RAYON_NUM_THREADS=1 next build` is now embedded in `npm run build`
  itself; both are equivalent going forward.
- **Other scripts referencing `RAYON_NUM_THREADS=1` were intentionally left unchanged**
  (`scripts/{deploy-uat,build-uat-detached,fix-uat-database-url,fix-uat-db-env-vars,
  setup-uat-server}.mjs`) — these set the variable via POSIX `export ... &&` inside a remote SSH
  command string that always executes in a Linux bash shell on the Hostinger server, never
  locally on Windows, so the portability issue does not apply to them; rewriting working
  remote-deploy commands to use `cross-env` would have been an unrelated, unrequested change.
- No application code, Prisma schema, migration, API, UI, or RBAC logic changed. `npm run build`,
  `npx tsc --noEmit`, and `npx prisma validate` all pass.

### 2026-06-21 — Curated role grants applied for new Finance permissions (Step 2W)
Decided and applied `ROLE_GRANTS` (`prisma/seed-admin-foundation.ts`) for the Step 2S/2U/2V Finance
permissions. Confirmed first, by direct DB query, that the `Role` model has exactly 6 rows (`Super
Admin`, `Business Head`, `Sales Head`, `Sales Manager`, `Account Manager`, `Finance Manager`) — no
`Accounts Team`/`Accounts Admin`/generic `Manager` role exists; the legacy `Employee.role` string
`"Accounts"` belongs to the separate `src/lib/roles.ts` system and was left untouched, not conflated
with a `Role` row. **Grants applied:** `Finance Manager` → full `Voucher`/`BankBook`/`CashBook`/
`Conveyance` (22 permissions, matching its "Full Finance module + reports" description).
`Business Head` → `Conveyance/VIEW` + `Conveyance/APPROVE` only (2 permissions), extending its
existing `Finance/Expense` approval pattern to the now-dedicated Conveyance resource — no
`BankBook`/`CashBook`/`Voucher` given (no policy basis for ledger/voucher ops at that role).
`Sales Head`/`Sales Manager`/`Account Manager` received no new grants. Ran `npx tsx
prisma/seed-admin-foundation.ts` against the dev DB (confirmed `DATABASE_URL` first); output
showed `Role grants upserted: 122` (up from Step 2U's 98, reconciling exactly to +22+2=+24).
Read-only DB query confirmed: Finance Manager 22/22, Business Head 2/2, Super Admin still 101/101,
zero duplicate `RolePermission` rows, zero grants for Sales Head/Sales Manager/Account Manager on
the new resources. **Permission Matrix UI re-verified against live data** (hit and resolved the
same `.next`-stale-cache mock-fallback gotcha documented in Step 2V — cleared `.next`, restarted
dev server, confirmed via raw `fetch()` returning real JSON before trusting the rendered grid).
Screenshot captured of Finance Manager's fully-granted new-resource rows. No schema, migration,
Finance write API, Finance API/UI logic, or `roles.ts` fallback change was made. `npx tsc --noEmit`,
`npx prisma validate`, and `npm run build` all pass. See `docs/RBAC_MIGRATION_TRACKER.md` §15 and
`docs/modules/finance/FINANCE_WRITE_ACCESS_CONTROL_PLAN.md` §18 for full detail.

### 2026-06-21 — Permission Matrix UI updated for new Finance resources (Step 2V)
Closed the UI gap Step 2U flagged: `src/app/settings/identity/components/PermissionMatrix.tsx`'s
hardcoded `MODULE_GROUPS` Finance entry extended from `["Invoice","Expense","Payment","Advance"]`
to `["Invoice","Expense","Payment","Advance","Voucher","BankBook","CashBook","Conveyance"]` (4
pre-existing resources untouched, 4 new ones appended, no duplicates/renames). `NOT_APPLICABLE`
extended with each new resource's catalogue-missing actions (`Voucher`: no `IMPORT`/`ASSIGN`;
`BankBook`: no `DELETE`/`ASSIGN`; `CashBook`/`Conveyance`: no `DELETE`/`IMPORT`/`ASSIGN`) so the
grid doesn't offer toggles for actions that don't exist in `PERMISSION_CATALOGUE`. The mock-data
fallback (`buildMockGrants()`) needed no change — it already iterates `MODULE_GROUPS`/
`NOT_APPLICABLE` dynamically. `GET /api/admin/identity/permissions` needed no change — it already
queries `prisma.permission.findMany()` with no hardcoded filter. **Only file changed:**
`PermissionMatrix.tsx`. **No `ROLE_GRANTS`, `RolePermission`, or seed grant-logic change** — role
mapping remains Step 2W. **27 → 22 documentation correction completed this step** across
`RBAC_MIGRATION_TRACKER.md`, `RBAC_AUDIT_REPORT.md`, `FINANCE_WRITE_ACCESS_CONTROL_PLAN.md`, and
this file's Step 2S entry below (the actual per-resource action counts — Voucher 6 + BankBook 6 +
CashBook 5 + Conveyance 5 — total 22, not the previously documented 27). `npm run build`, `npx tsc
--noEmit`, and `npx prisma validate` all pass. See `docs/RBAC_MIGRATION_TRACKER.md` §14 and
`docs/modules/finance/FINANCE_WRITE_ACCESS_CONTROL_PLAN.md` §17 for full detail.

### 2026-06-21 — Finance permission catalogue seeded to dev database (Step 2U)
Ran `npx tsx prisma/seed-admin-foundation.ts` against the dev database
(`u686730471_caveodev` on `srv2201.hstgr.io`, confirmed via `.env`'s `DATABASE_URL` before
running) to materialize the Step 2S catalogue additions as real `Permission` rows. Pre-run
review confirmed the script is upsert-only on the schema's `@@unique([module, resource, action])`
key, never deletes, and its `ROLE_GRANTS` array was untouched — safe to run. Seed output:
`Permissions upserted: 101`, `Role grants upserted: 98`, `DataAccessPolicies upserted: 24`. A
read-only verification script (written, run, then deleted) confirmed all 22
`Finance/{Voucher,BankBook,CashBook,Conveyance}` rows present (Voucher 6 + BankBook 6 + CashBook 5
+ Conveyance 5 = 22 — Step 2S's own "27 new rows" figure does not reconcile with its own
per-resource action lists; the action lists, which match `permissions.ts` verbatim, are treated as
correct), zero duplicate `(module,resource,action)` triples across all 101 rows, and the 4
pre-existing Finance resources (`Invoice`/`Expense`/`Payment`/`Advance`, 17 rows) unchanged.
**UI gap found, not fixed:** `/api/admin/identity/permissions` already returns all 101 live rows,
but `PermissionMatrix.tsx`'s hardcoded `MODULE_GROUPS` constant lists only
`["Invoice","Expense","Payment","Advance"]` under `Finance` — the 4 new resources exist in the DB
and API response but will not render as matrix rows until that array is updated (recommended
follow-up, not done this step — out of scope per the task brief's "do not modify Finance UI").
No role besides the pre-existing Super-Admin-gets-all loop was granted the new permissions. No
schema change, migration, Finance write API, Finance API/UI logic change, or curated role-grant
change was made. `npx prisma validate`, `npx tsc --noEmit`, and `npx cross-env
RAYON_NUM_THREADS=1 next build` all pass. See `docs/RBAC_MIGRATION_TRACKER.md` §13 and
`docs/modules/finance/FINANCE_WRITE_ACCESS_CONTROL_PLAN.md` §16 for full detail.

### 2026-06-21 — Finance permission catalogue gap closure (Step 2S)
`docs/RBAC_MIGRATION_TRACKER.md` §4 Step 2L flagged that Voucher, BankBook, CashBook, and
Conveyance had no dedicated `access-control` resource, forcing the Step 2M/2R Finance read-API
migration onto closest-fit `Finance/Payment/VIEW`/`Finance/Expense/VIEW` mappings — not clean
enough for future write APIs. Added 22 new permission rows (corrected 2026-06-21, Step 2V, from an
earlier "27" that did not reconcile with the action lists below) to `PERMISSION_CATALOGUE`
(`src/lib/access-control/permissions.ts`): `Finance/Voucher/{VIEW,CREATE,EDIT,DELETE,APPROVE,
EXPORT}`, `Finance/BankBook/{VIEW,CREATE,EDIT,APPROVE,IMPORT,EXPORT}`, `Finance/CashBook/{VIEW,
CREATE,EDIT,APPROVE,EXPORT}`, `Finance/Conveyance/{VIEW,CREATE,EDIT,APPROVE,EXPORT}` — exact
existing catalogue style, no duplicates. `Finance/Reconciliation` was deliberately deferred
(folds into the new `BankBook`/`CashBook` `APPROVE` actions instead, per the existing
"avoid a parallel reconciliation surface" recommendation). `src/lib/finance/access.ts`: two new
helpers (`canViewFinanceBankBook`, `canViewFinanceCashBook`) split off from
`canViewFinancePayments` (now used only by the `accounts` route); `canViewFinanceVouchers` and
`canViewAllConveyance` now check their dedicated resource first; `canViewFinanceDashboard` also
accepts `Finance/Voucher/VIEW`. Every helper still falls through to `canManageFinance()` — no
manager/Accounts/Operations-Head user lost access, and no role besides the pre-existing
Super-Admin-gets-all seed pattern was granted the new permissions (`seed-admin-foundation.ts`'s
`ROLE_GRANTS` intentionally left unchanged; the 22 rows will appear in the `Permission` table
automatically next time that script runs, since it iterates `PERMISSION_CATALOGUE` directly). No
schema change, migration, Finance write API, Finance API/UI behavior change, or role-assignment
change was made. `npx tsc --noEmit`, `npx prisma validate`, and `npx cross-env
RAYON_NUM_THREADS=1 next build` all pass. See `docs/RBAC_MIGRATION_TRACKER.md` §12 for full detail.

### 2026-06-21 — Finance read API migration to access-control (Step 2M/2R)
`docs/RBAC_MIGRATION_TRACKER.md` §4/§10 Step 2M ("migrate Finance read APIs from `roles.ts`-only to
`access-control`") was completed. New `src/lib/finance/access.ts` helper module
(`canViewFinancePayments`, `canViewFinanceVouchers`, `canViewFinanceDashboard`,
`canViewAllFinanceExpenses`, `canViewAllFinanceAdvances`, `canViewAllConveyance`,
`isSelfFinanceRequest`) checks the closest-fit `access-control` permission first, falling back to
`canManageFinance()` (or the prior inline `isManager||isAccounts||isOperationsHead` for
conveyance). All 11 `GET /api/finance/*` route files (`accounts`, `dashboard`, `bank-book`,
`cash-book`, `expenses`, `expenses/[id]`, `advances`, `conveyance`, `vouchers`, `vouchers/[id]`,
`voucher-sequences`) were updated. Mapping: `Finance/Payment/VIEW` for BankBook/CashBook/Accounts/
Vouchers (closest fit — no dedicated resource exists), `Settings/Finance/VIEW` as an additional
accepted grant for Vouchers, `Finance/Expense/VIEW` for the Expense Register and Conveyance,
`Finance/Advance/VIEW` for Advances. Employee self-service own-data filtering (own expenses/
advances/conveyance) is unchanged; only the full-visibility boolean now also accepts the matching
permission. `roles.ts`/`canManageFinance()` were **not removed** — retained as a temporary
fallback per the freeze rules. `POST /api/finance/advances`, `/api/expenses`, and `/api/advances`
were not touched (out of scope). No schema, migration, UI, or business-logic change. See
`docs/RBAC_MIGRATION_TRACKER.md` §11 for the full route-by-route detail. `npx tsc --noEmit`, `npx
prisma validate`, and `npx cross-env RAYON_NUM_THREADS=1 next build` all pass.

### 2026-06-20 — Security fix: Approval Engine object-level authorization (committed separately from session 7)
`docs/RBAC_AUDIT_REPORT.md` flagged that `POST /api/approvals/[id]/action` let any authenticated employee approve/reject/return/delegate/cancel **any** approval request by guessing/incrementing a `requestId` — `approveRequest`/`rejectRequest`/`returnRequest`/`delegateRequest`/`cancelRequest` in `src/lib/workflow-engine/approval.ts` never checked that the caller was an eligible approver. Fixed via a new `src/lib/workflow-engine/authorization.ts` (`assertCanActOnApprovalRequest()`), called from inside each action function before any mutation. APPROVE/REJECT/RETURN/DELEGATE now require the request to be `PENDING` and the actor to be a resolved current-step approver, an active delegate of one, or hold the `Workflow/ApprovalRequest/APPROVE` permission via `access-control`; CANCEL is restricted to the original requester on a still-`PENDING` request (no admin override exists yet — documented limitation). The action functions now return `{ ok, reason? }` instead of a bare `boolean`; the API route maps reasons to 401/403/404/409. No UI changes needed (`/approvals` and `/finance/approvals` already render API `error` text). See `docs/RBAC_AUDIT_REPORT.md` §10 item 1 for full detail. `npx tsc --noEmit`, `npx eslint`, `npx prisma validate`, and `next build` all pass.

### 2026-06-20 — Security fix: Customer Master + Admin Masters permission checks (Step 2B)
`docs/RBAC_AUDIT_REPORT.md` §6 confirmed 7 routes had a session check but no permission check, letting any authenticated employee write customer master records or master-data configuration. Fixed by adding the existing `requirePermission()` (`@/lib/access-control`) immediately after each route's existing session check: `PATCH /api/customers/master/[id]` now requires `Masters/CustomerMaster/EDIT` (mirrors its sibling `DELETE` handler); `GET`/`POST /api/admin/masters`, `/api/admin/masters/overrides`, and `/api/admin/masters/values` now require `Settings/Masters/VIEW` (GET) / `Settings/Masters/EDIT` (POST) — the same permission the `/settings/masters` page guard already checks. No payloads, validation, response shapes, or business logic changed. `/api/admin/customer-policy`, `/api/admin/vendor-policy`, `/api/master-values`, and the `DELETE` handler's EDIT-vs-DELETE action mismatch remain open, deferred to a later step. `npx tsc --noEmit`, `npx eslint`, `npx prisma validate`, and `next build` all pass.

### 2026-06-20 — Security fix: Customer Master DELETE permission mismatch (Step 2C)
`docs/RBAC_AUDIT_REPORT.md` §7 finding 5 noted `DELETE /api/customers/master/[id]` checked `Masters/CustomerMaster/EDIT` instead of the catalogue's distinct `Masters/CustomerMaster/DELETE` action — a role granted EDIT-but-not-DELETE on Customer Master could still delete records. Fixed with a single-line change to the existing `requirePermission()` call's action argument (`"EDIT"` → `"DELETE"`); nothing else in the handler, the sibling `PATCH` handler, or any other Customer Master route changed. `PATCH` remains on `EDIT`, unchanged. `npx tsc --noEmit`, `npx eslint`, `npx prisma validate`, and `next build` all pass.

### 2026-06-20 — Security fix: Customer/Vendor Policy permission checks (Step 2D)
`docs/RBAC_AUDIT_REPORT.md` §3.5/§6 confirmed `GET`/`POST /api/admin/customer-policy` and `GET`/`POST /api/admin/vendor-policy` had a session check but no permission check, letting any authenticated employee read or write customer/vendor governance policy (GST-required flags, duplicate thresholds, credit-approval-required, bank-verification-required). Treated as the same category of master-governance config as `/api/admin/masters` and its `/overrides`/`/values` siblings (Step 2B), so gated with the same permission: `Settings/Masters/VIEW` on both GET routes, `Settings/Masters/EDIT` on both POST routes, via the existing `requirePermission()` (`@/lib/access-control`). No payload validation, save logic, or response shape changed. `/api/master-values`, CRM-admin/Finance-admin routes, Identity APIs, Policy APIs, sidebar visibility, `rbac.ts`, and `roles.ts` intentionally untouched, per scope. `npx tsc --noEmit`, `npx eslint`, `npx prisma validate`, and `next build` all pass.

### 2026-06-20 — Security fix: `/api/master-values` authentication (Step 2E)
`docs/RBAC_AUDIT_REPORT.md` §3.6 flagged `GET /api/master-values` as fully public — no `getSession()` call at all, unlike every other API route. Usage audit (full-text search for `master-values`/`MasterValue`) found a single consumer chain — `src/hooks/useMasterValues.ts` → `LeadGenClient.tsx`, `LeadsClient.tsx`, `finance/expenses/components/ExpenseForm.tsx` — all internal CRM pages whose `page.tsx` already requires a session to render. No public/login-page or API-to-API caller exists, so per the safe-default rule the route now requires an authenticated session: added the standard `getSession()`/401 check, same convention as the rest of the API. No permission check was added (dropdown-only data, no sensitive/admin fields); query params, filtering, and response shape for authenticated callers are unchanged. `npx tsc --noEmit`, `npx eslint`, `npx prisma validate`, and `next build` all pass.

### 2026-06-20 — Security fix: CRM-admin/Finance-admin `requirePermission` migration (Step 2F)
`docs/RBAC_AUDIT_REPORT.md` §3.2 flagged 7 CRM-admin + 7 Finance-admin route files that all `import { requirePermission } from "@/lib/access-control"` but never call it, falling back to an inline `isManager` check instead — meaning a future `access-control` role grant to a non-manager would have no effect on these 14 endpoints. Migrated the 7 **Finance-admin** routes (`admin/finance/{advance,collection,conveyance,credit,expenses,policies,voucher}`) to `requirePermission(session,"Settings","Finance","VIEW")` (GET) / `"EDIT"` (POST/PATCH) — `Settings/Finance` already existed in the catalogue (Phase 9), so no new permission was added; the manager fallback inside `requirePermission()` is unchanged, so existing managers are unaffected. The 7 **CRM-admin** routes (`admin/crm/{assignment,automation,pipelines,pipelines/[id],sla,territories,territories/[id]}`) were intentionally **not** migrated: no `Settings/CRM` or other CRM-administration permission exists in `PERMISSION_CATALOGUE` (only end-user `CRM/Lead`/`Opportunity`/`Activity`/`Report`), and inventing one was out of scope per the migration's explicit "stop and document the gap" instruction — they still use the inline `isManager` check. Recommended follow-up: add `Settings/CRM` (VIEW/EDIT) to the catalogue, seed it, then repeat this migration for the 7 CRM-admin files. No payloads, validation, response shapes, or business logic changed. `npx tsc --noEmit`, `npx eslint`, `npx prisma validate`, and `next build` all pass.

### 2026-06-20 — Security fix: Identity/Policy Admin APIs migrated off legacy `canAccessSettings` (Step 2G)
`docs/RBAC_AUDIT_REPORT.md` §3.3 flagged the irony that the API managing `Role`/`Permission`/`UserRole`/`DataAccessPolicy` rows (`access-control`'s own tables) was itself gated by the *legacy* `roles.ts` `canAccessSettings()` predicate, not by `access-control`. Migrated 13 route files to `requirePermission()`: 7 Identity files (`admin/identity/{permissions,permissions/[roleId],policies,policies/[roleId],roles,roles/[id],users/[id]}`) now require `Settings/Identity/VIEW` (GET) or `/EDIT` (POST/PATCH); 6 Policy files (`admin/policies/{route,[id],[id]/versions,audit,categories,evaluate}`) now require `Settings/Policy/VIEW` (GET) or `/EDIT` (POST/PATCH). `POST /api/admin/policies/evaluate` — previously ungated entirely — was deliberately gated with VIEW, not EDIT: confirmed read-only (`evaluatePolicy()` only does a `findMany`) with zero existing callers anywhere in the codebase, so the gate has no functional impact today. `requirePermission()`'s manager fallback is unchanged, so existing managers are unaffected. `src/app/api/admin/identity/users/route.ts` (the collection endpoint, distinct from `/[id]`) was found still using `canAccessSettings` but was out of scope for this step (not in the named route list) — flagged for follow-up. `canAccessSettings` itself remains in `roles.ts` and in active use elsewhere (page guards, `/settings/administration`, legacy `/admin`) — untouched, per scope. No payloads, validation, response shapes, or business logic changed. `npx tsc --noEmit`, `npx prisma validate`, and `next build` all pass; `npx eslint` shows 3 pre-existing `no-explicit-any` errors unrelated to this change.

### 2026-06-20 — RBAC migration tracker created, legacy rbac.ts/AppRole/RolePageAccess frozen (Step 2H)
Created `docs/RBAC_MIGRATION_TRACKER.md` — a practical companion to `docs/RBAC_AUDIT_REPORT.md` documenting the current decision (`access-control` is the final permission system; `roles.ts` is a temporary bridge; `rbac.ts`/`AppRole`/`RolePageAccess` is frozen/decorative; the legacy `/admin` Roles tab is non-authoritative), the 7 completed migration steps (2A–2G), 9 remaining steps (2I–2R) with risk notes, freeze rules, and a permission-mapping summary cross-checked against `permissions.ts` (documenting real gaps: no `Settings/CRM`, no `Finance/Voucher`, no `EDIT` on `Finance/Payment`/`Advance`, no `DELEGATE`/`CANCEL` action type, no `IMPORT` on `Masters/VendorMaster`). Added a top-of-file freeze comment to `src/lib/rbac.ts` (comment only, no behavior change) and a non-blocking warning banner to the legacy `/admin` Roles & Access tab (`src/app/admin/AdminClient.tsx`, scoped to that tab only, reusing the existing inline warning style already used inside `RolesClient.tsx`). No schema, migrations, deletions, or runtime permission logic changed. `npx tsc --noEmit`, `npx prisma validate`, and `next build` all pass.

### 2026-06-20 — Legacy RBAC freeze warnings completed (Step 2I)
Followed up on Step 2H's tracker/freeze work with `docs/RBAC_MIGRATION_TRACKER.md`'s own Step 2I: strengthened `src/lib/rbac.ts`'s top-of-file comment to explicitly state "do not build new features on AppRole/RolePageAccess" and "frozen until the legacy /admin Roles UI is retired" (previously only implied); added a second, smaller warning to the general Admin Panel header in `src/app/admin/AdminClient.tsx` (visible on every legacy admin tab, not just Roles & Access) reading "This legacy administration area is being retained temporarily. New permission management should be done from Settings > Identity." The existing Roles-tab banner from Step 2H already satisfied the canonical warning message and was left unchanged. No schema, migrations, deletions, runtime permission logic, sidebar, or `/settings/identity` behavior changed. `npx tsc --noEmit`, `npx prisma validate`, and `next build` all pass.

### 2026-06-20 — Sidebar/navigation visibility aligned with access-control (Step 2J)
`docs/RBAC_AUDIT_REPORT.md` §5 found sidebar visibility (`SidebarLinks.tsx`/`Navbar.tsx`) consulted only `roles.ts` booleans (`isManager`/`isAccounts`), never `access-control` — so a real `access-control` permission grant had no effect on what a user saw in the nav. Added `src/lib/access-control/navigation.ts` (`getNavigationCapabilities()`) — loads a session's permissions once per request via the existing `getAllPermissions()`, with the same manager-fallback `hasPermission()` already has. Wired into `Navbar.tsx` (computed once, passed down) and `SidebarLinks.tsx`: Customer/Vendor Master links now require `Masters/CustomerMaster|VendorMaster/VIEW` (real grants already exist in `prisma/seed-admin-foundation.ts` for Business Head/Sales Head/Sales Manager/Finance Manager); Finance Operations sub-items (Cash/Bank Book, Expense Register, Advances, Finance Approvals) each carry a capability check, OR'd with the existing `isManager||isAccounts` bridge so no current manager/Accounts user loses anything; the Settings nav entry is OR'd with a new `Settings/*` aggregate check (additive, since no role currently holds a seeded `Settings/*` grant). Pipeline/Daily Updates/KRA/Tasks/Employees nav and self-service Finance items (My Expenses/Claims/Advance/Conveyance) were intentionally left on the roles.ts/session bridge, per scope. No API/page guards, permission catalogue, schema, or runtime authorization logic changed — navigation visibility only; remaining page-guard alignment is Step 2K. `npx tsc --noEmit`, `npx prisma validate`, and `next build` all pass; 2 pre-existing unrelated `react-hooks/set-state-in-effect` lint errors confirmed via diff/stash-test to predate this change.

### 2026-06-20 — Settings landing/cards visibility aligned with access-control (Step 2K)
Followed Step 2J's sidebar work by aligning the `/settings` *landing page* itself. Added
`src/lib/access-control/settings-capabilities.ts` (`getSettingsCapabilities()`) — loads a
session's permissions once per request and derives an `{ organization, identity, masters,
finance, crm, workflow, policy, communication, integration, security, performance }` card map,
with the same `isManager` full-access fallback used elsewhere in `access-control`.
`src/app/settings/page.tsx` now computes capabilities server-side and gates the page on
`capabilities.canViewSettings || canAccessSettings(session.user)` (additive bridge, same pattern
as Step 2J — no Operations Head/Head of Sales/manager loses access). `AdminConsole.tsx` (the live
landing component — `SettingsHub.tsx` is dead rollback code) now filters its card list to the
modules the session actually has a `Settings/<Resource>/VIEW`-or-`EDIT` grant for, and shows a
"You do not have access to any Settings modules" empty state when none match. CRM Administration
has no `Settings/CRM` catalogue permission (documented gap, same as Step 2J/2L) so its card falls
back to the `isManager` bridge, matching `/settings/crm`'s own page guard. **Gap surfaced, not
fixed:** `/settings/{finance,communication,integrations,security,performance}` still gate purely
on `isManager` and don't yet consult the `Settings/*` permissions their cards are now keyed on —
tracked as a Step 2K follow-up in `docs/RBAC_MIGRATION_TRACKER.md`/`RBAC_AUDIT_REPORT.md`, not
rewritten this step (out of scope — no broad page-guard refactor). No schema, migrations, API
permission checks, business logic, routes, or `roles.ts`/`rbac.ts` deletions. `npx tsc --noEmit`,
`npx prisma validate`, and `next build` all pass.

### 2026-06-20 — Finance Write Access-Control Plan created (Step 2L, planning only)
Before building any Finance write API, created
`docs/modules/finance/FINANCE_WRITE_ACCESS_CONTROL_PLAN.md` mapping all 33 planned write
endpoints (Expense create/edit/delete/submit/approve/reject/mark-paid/import; Bank Book entry/
edit/import/reconcile; Cash Book entry/edit/transfers/adjustment/reconcile; Advance submit/
approve/reject/disburse/settle; Claims create/edit/approve/reject/mark-paid; Conveyance trip
log/edit/submit/approve/reject/monthly-settlement/distance-calc; Voucher create/cancel/PDF/
tally-export; Reconciliation submit/approve/reject) to real `access-control` permissions from
`permissions.ts`, cross-checked line by line — no permission invented. Findings: `Finance/
Invoice`, `Finance/Expense`, `Finance/Payment`, `Finance/Advance` are usable today; confirmed
**Catalogue Gaps** — `Finance/Voucher` has no resource at all, `Finance/Payment/EDIT` and
`Finance/Advance/EDIT` don't exist, no dedicated BankBook/CashBook/Conveyance/Reconciliation
resource exists, no `Finance/Expense/IMPORT` or `Finance/Voucher/EXPORT` action exists — all
documented with an interim closest-fit mapping (mostly `Finance/Payment/CREATE` for
Ledger-posting actions), not closed in this step. New **Schema Gap** surfaced: no Finance
transaction model (`Expense`, `EmployeeAdvance`, `TravelClaim`, `Voucher`, `Ledger`,
`FinAccount`) has a real `branchId`/`departmentId` FK — only `FinAccount.branchName` (free-text,
no `@relation`) — so `canAccessScope()`'s BRANCH/DEPARTMENT cases always fall through to "allow"
for Finance data today. Also documented: self-service vs. Finance-Operations authorization rules
(own-record actions need no grant; cross-employee actions need the mapped permission), an
object-level rule set per entity (no edit-after-submit, no hard-delete on posted records,
approval routed exclusively through the Step 2A-protected Global Approval Engine — never a
bespoke per-entity check), an API guard code template, and the recommended build sequence. No
Finance write API, schema change, migration, UI change, `roles.ts`/`rbac.ts` change, or
permission-enforcement change was made — one new documentation file only. `npx tsc --noEmit`,
`npx prisma validate`, and `next build` all pass (unaffected — no application code changed).

### 2026-06-20 — Customer/Vendor Master page guards migrated to access-control (Step 2N)
Closed the most overexposed surface flagged in `RBAC_AUDIT_REPORT.md` §2.4/§4/§5: `/masters/
customers` and `/masters/vendors` were "accessible to all authenticated users" with write-only
client-side gating (`deriveCustomerCaps`/`deriveVendorCaps`, both `roles.ts`-only). Both
`page.tsx` files now compute `hasPermission(userId, "Masters", "CustomerMaster"|"VendorMaster",
"VIEW")` server-side and redirect to `/dashboard` (the existing Settings/Finance forbidden-UX
pattern — no new unauthorized page built) when neither that grant nor `isManager` is present.
Both permissions already existed verbatim in `PERMISSION_CATALOGUE` — no catalogue gap, nothing
invented. The bypass is deliberately `isManager`-only (not the broader `isOpsHead||isManager`
bridge `/settings/masters` uses) to match Step 2J's `getNavigationCapabilities()`, which already
gives these two sidebar links the same manager-only bypass — page guard and sidebar link now
agree on who can reach each page. `deriveCustomerCaps()`/`deriveVendorCaps()` are unchanged,
retained for button-level Create/Edit/Disable/GST/Bank/Export UX (their actual original job),
each with a one-line TODO comment flagging the future button-level access-control migration.
Legacy `/customers` (still session-only) was left unchanged per scope, with a TODO pointing at
its own retirement (tracked as Step 2O in `RBAC_MIGRATION_TRACKER.md` — the task brief that
requested this step labelled the work "Step 2M" and the next step "Step 2N," but the tracker's
existing numbering — already cross-referenced from three other files including the just-written
Finance Write Access-Control Plan — reserves 2M for Finance-read-API migration and 2N for this
page-guard work, so the existing numbering was kept rather than renumbering published
cross-references). No schema, migration, Customer/Vendor API logic, UI/form change, soft delete,
or sidebar/navigation change was made. `npx tsc --noEmit`, `npx prisma validate`, `npx eslint` (2
pre-existing unrelated unused-var warnings), and `next build` all pass.

### 2026-06-20 — Customer Master base API guarded with access-control (Step 2N, API guards)
Closed the mismatch the page-guard step above exposed: `/masters/customers` was guarded, but the
underlying `GET`/`POST /api/customers/master` API was still session-only and callable directly
by any authenticated employee. `GET /api/customers/master` now requires
`Masters/CustomerMaster/VIEW`; `POST /api/customers/master` now requires
`Masters/CustomerMaster/CREATE`. Both permissions already existed verbatim in
`PERMISSION_CATALOGUE` — no catalogue gap, nothing invented. `PATCH`/`DELETE
/api/customers/master/[id]` were reviewed and confirmed already correct (`EDIT`/`DELETE`, from
Steps 2B/2C) — left unchanged. No query params, pagination, sorting, response shape, payload
structure, validation, or create logic was changed. Legacy `/customers` remains session-only and
unchanged; its retirement is still Step 2O. `npx tsc --noEmit`, `npx prisma validate`, and `next
build` all pass.

### 2026-06-20 — Legacy /customers guarded in place, not redirected (Step 2O)
The brief's preferred outcome was a server-side redirect from `/customers` to
`/masters/customers`. Code review found that would be a regression: **`/customers` is the only
real Customer Master** — live Prisma data, working Create/Edit, **Import from CRM**, **duplicate
detection**, and **Delete**, all wired to `/api/customers/master*`. `/masters/customers`'s
client component renders a hardcoded `MOCK_CUSTOMERS` array (`masters/customers/data.ts`) and
makes **zero `fetch()` calls** — it has no real persistence at all (a known, previously
documented gap — see the Global Masters section below: "Customer/Vendor masters... have no APIs
and only client-side RBAC"). Redirecting would have sent every user to a non-functional preview
instead of the working tool. Per the brief's own escape-hatch clause for this exact situation,
`/customers` was **guarded instead**: it now requires `Masters/CustomerMaster/VIEW` (access-
control) `||` `isManager`, redirecting to `/dashboard` on failure — the identical guard
`/masters/customers` already carries, applied before the page's data load (including its
auto-seed-from-CRM side effect). No navigation change was needed — a repo-wide search for
`href`/`router.push`/`redirect` to `/customers` found zero real links; the sidebar already only
links to `/masters/customers`, and the one `/customers` string in `Topbar.tsx` is a breadcrumb
label for direct URL visits, not a link. No schema, migration, customer data, Customer Master
API logic, `/masters/customers` UI/behavior, Vendor Master, or Finance change was made.
Recommended follow-up: wire `/masters/customers` to the real `Customer` table (replacing
`MOCK_CUSTOMERS` with live CRUD/import/dedupe against `/api/customers/master*`) — only then
should `/customers` become a redirect. `npx tsc --noEmit`, `npx prisma validate`, `npm run lint`,
and `next build` all pass.

### 2026-06-20 — /masters/customers wired to real Customer Master data (Step 2P, Customer Master)
Closed the Step 2O follow-up: `/masters/customers/page.tsx` now runs the same
`prisma.customer.findMany`/auto-seed-from-CRM/stats query `/customers/page.tsx` runs and renders
it through `@/app/customers/CustomerMasterClient` — **the same proven component `/customers`
already uses** (live list, search/filter, create, edit, delete, Import from CRM, duplicate
detection), reused directly rather than rewritten, matching this codebase's existing cross-route
reuse convention (`finance/cash-book` re-using `finance/bank-book`). Both routes now hit the
identical, already-guarded `GET`/`POST /api/customers/master` and `PATCH`/`DELETE
/api/customers/master/[id]` — no API contract, guard, or behavior changed. The folder's own
mock-data preview (`masters/customers/CustomerMasterClient.tsx`'s `MOCK_CUSTOMERS`,
`deriveCustomerCaps`, and the 14 enterprise components under `masters/customers/components/`)
is no longer imported by `page.tsx` but was **not deleted** — both main files now carry a header
comment: "Preview-only mock data retained for reference. Do not use for production Customer
Master rendering," confirmed safe since a repo-wide search found no other importer of either.
Button-level capability gating (Import/Find Duplicates/Delete restricted to managers; Add/Edit
open to all viewers) is the same real `isManager` logic `/customers` already used — preserved,
not weakened, and not migrated to `access-control` (left for later). The page guard itself
(`Masters/CustomerMaster/VIEW` `||` `isManager`) is unchanged from Step 2N. `/customers` was
**not modified, not redirected, and remains fully functional** — both routes are now functionally
equivalent (same component, same data, same APIs) for the first time, which is the prerequisite
for a future redirect step. Note: this step is labelled "Step 2P (Customer Master)" because
"Step 2P" was already reserved in `RBAC_MIGRATION_TRACKER.md` for the unrelated "retire legacy
`/admin` Roles tab" plan — disambiguated the same way Step 2N's API-guards sub-step was. No
database schema, migration, Customer Master API contract, Vendor Master, or Finance change was
made. `npx tsc --noEmit`, `npx prisma validate`, `npm run lint`, and `npx cross-env
RAYON_NUM_THREADS=1 next build` (the project's own `npm run build` script uses non-portable
shell syntax — pre-existing, unrelated) all pass.

### 2026-06-20 — Legacy /customers converted to a redirect (Step 2Q, Customer Master)
Final Customer Master route consolidation. Pre-check confirmed `/masters/customers/page.tsx`
already imported the live `@/app/customers/CustomerMasterClient` (Step 2P) and ran the identical
Prisma query/auto-seed/stats logic — zero unique functionality remained on `/customers`, so it
was safe to redirect. `src/app/customers/page.tsx` is now a bare server-side redirect
(`redirect("/masters/customers")`), matching the existing `finance/vendors → masters/vendors`
redirect-page convention exactly — no permission check of its own; `/masters/customers`'s own
guard now handles enforcement for both entry points. `CustomerMasterClient.tsx` (in
`src/app/customers/`) was **not deleted, renamed, or moved** — `/masters/customers` imports it
directly and needs it to stay at that path; added a one-line comment noting it's shared and
actively rendered from `/masters/customers`. A repo-wide search for `href="/customers"`,
`router.push("/customers"`, `redirect("/customers"`, and plain `"/customers"` found no active
links — only `Topbar.tsx`'s breadcrumb `PATH_LABELS` entry, not a link, now effectively dead
since the URL bar will never show `/customers` post-redirect (left unchanged, out of scope).
**Live-verified in a browser session against the dev database** (not just static checks):
unauthenticated `/customers` → `/masters/customers` → `/login`; non-manager Employee (no
`Masters/CustomerMaster/VIEW` grant) → `/masters/customers` → `/dashboard` (both routes' guards
fire in the same chain); Manager → real `/masters/customers` page, 98 live customers, working
Search/Import-from-CRM/Find-Duplicates/Add-Customer controls. Hit a transient remote-MySQL pool
timeout mid-verification (Hostinger shared-hosting connection-cap flakiness, not a credential or
code issue — a direct connection retry succeeded immediately after) — resolved itself, not a
regression from this change. No database schema, migration, customer data, Customer Master API,
Customer Master client logic, Vendor Master, or Finance change was made. `npx tsc --noEmit`,
`npx prisma validate`, `npm run lint`, and `npx cross-env RAYON_NUM_THREADS=1 next build` all
pass.

### This session (UNCOMMITTED — dev DB migration applied, TypeScript clean)
- **SFDC-style Lead Standardization** (`/pipeline/leads`): `customerRefId` FK added to `CrmLead`, migration applied to dev DB. Smart `CustomerNameCombobox` replaces old separate customer dropdown. `ConvertModal` on both list + detail pages. New `POST /api/pipeline/leads/[id]/convert` endpoint. ✓
- **RBAC Role Assignment in Employees tab** (Settings → Identity & Access): Assign/Remove toggles per role in the Manage drawer; `PATCH /api/admin/identity/users/[id]` with `addRoleId`/`removeRoleId`. ✓
- **HR Automation**: deactivating/suspending employee auto-revokes all `UserRole` records. ✓
- **Employee Form Dropdown Wiring**: Department / Designation / Reports-To from master tables; sets FK ids on `EmployeeProfile`. ✓

### ⚠️ UAT DB migration still pending
`20260618100000_crm_lead_customer_ref` must be applied to UAT (`u686730471_Caveo_UAT`) before leads page works on UAT. Use `prisma/apply-crm-lead-customer-ref.mjs`.

### ⚠️ STOP: Phase 13 is the final module
Per user instruction: "STOP after Security Center. Do not implement Governance module."

### ⚠️ All work UNCOMMITTED since session 4
Sessions 5–7 changes are NOT committed. Everything from Phase 8 onwards lives only in the working tree. **Confirm with Vijesh before committing or pushing.**

### Migrations applied to dev DB
- `20260610080000_integration_center` — 5 tables, marked applied
- `20260610090000_security_center` — 7 tables, marked applied
- `20260618100000_crm_lead_customer_ref` — `CrmLead.customerRefId` FK, marked applied

### Previously committed (sessions 1–4)
- Sessions 1–3: Finance Phase 1 DB layer, Admin Console Phases 1–7 UI (all committed)
- Session 4: Phase 8 CRM Admin Engine, 4 migrations applied to dev DB, Approval wiring,
  Pipeline lifecycle upgrades, Legacy promotion. All committed.
- Session 5: Phase 9 Finance Administration Engine (committed, dev DB migration pending)

### Prod note: Nothing pushed to production since session 4. Confirm with Vijesh before `git push origin master`.

## 2. Roles (Employee.role + isManager)
| Role | Access summary |
|---|---|
| **Head of Sales** | `isManager=true`. Full access, team dashboards, admin panel. (Vijesh, id 4) |
| **Business Development Manager** | Senior sales — full pipeline + analytics, team view. |
| **BDE / Inside Sales / ISR** | Standard rep — own leads, pipeline, collections, daily updates. |
| **Sales Coordinator** | Tasks, collections, daily updates; read-only leads. |
| **Accounts** | Finance — all collections + payment tracker; no pipeline. |
| **Operations Head** | Above Accounts; **manager-like finance reach WITHOUT `isManager`** (`src/lib/roles.ts`). |

## 3. Completed Features
- **Database on MySQL/MariaDB** — migrated from SQLite (2026-06-02). Prisma uses the
  `@prisma/adapter-mariadb` driver adapter; `provider="mysql"`; long-text columns use
  `@db.Text`; 18 indexes added on FK/filter columns; single baseline migration
  `20260601000000_init_mysql`. See DATABASE.md and the CHANGELOG entry for the full process.
- **Auth** — Microsoft Entra ID (Azure AD) via NextAuth v5; 8h JWT sessions; dev
  impersonation via `dev_employee_id` cookie + DevBar; dev quick-login on `/login`.
  Edge auth runs in **`src/proxy.ts`** (Next.js 16 middleware replacement).
- **Pipeline module** — `CrmLead → CrmOpportunity` funnel, tasks, meetings, notes,
  activity feed, kanban + table; legacy Sales Funnel/Activity folded in.
- **KRA engine** — title-based auto-computation of progress/score from activity sheets
  (`src/lib/kra-engine.ts`); weekly reviews; weekly commits; forecast accuracy;
  certification tracking.
- **Collections & Finance** — invoices, partial payments that add to existing amount,
  payment ledger (`Payment`), order advances (`OrderAdvance`) with apply-to-invoice,
  daily collections widgets, in-app notifications fanned out to rep + managers.
- **Customer Master** — `Customer` table with HO/Branch hierarchy, CRM import + dedupe,
  auto-seed when empty; customer-name autocomplete across all CRM sources.
- **Dashboards** — manager + employee variants; period filter (Today/Week/Month/Quarter);
  clickable KPI tiles linking to detail pages; charts.
- **Admin panel** (`/admin`, manager-only) — Settings (122 config keys including 16 new Finance/
  Approvals/Masters keys, `AppSetting`, 14 tabs) + Roles & Access matrix (`AppRole`/`RolePageAccess`).
  Data-free; config/rules only.
- **Settings Hub** (`/settings`) — 26-card navigation grid across 7 sections: General, Workflow,
  People, Masters, Finance, CRM & Sales, System. Entry point to all configuration.
- **Role-Adaptive Dashboard** — `roleVariant` discriminator derived from live DB role. Ops Head
  sees Finance/HR/team KRA view; Tech Head sees team KRA/tasks; Manager sees full sales funnel;
  Employee sees own KRA. No stale JWT — role read fresh on every dashboard load.
- **Mobile app** (`/mobile`) — 13 screens incl. business-card OCR (`/api/ocr/business-card`),
  team views, quick activity/call/meeting logging, and a read-only **Collections** screen +
  Pipeline **Leads|Opportunities** segment + collections KPIs on the Today dashboard (`5ba865a`).
- **Finance Operations Module — Phase 1 (database)** *(committed/pushed `1747f9e`)* — 10 models
  (`FinAccount`, `Ledger`, `Vendor`, `Expense`, `Voucher`, `VoucherSequence`, `EmployeeAdvance`,
  `TravelClaim`, `ApprovalRule`, `AuditLog`), migration `20260602120000_finance_operations_phase1`,
  finance config seed. Full spec in `docs/modules/finance/`.
- **Finance Operations Module — Phase 2 UI** *(2026-06-03, UI-only mock data, UNCOMMITTED)* —
  full finance web UI under `src/app/finance/`:
  - **Navigation** — collapsible Finance section in `SidebarLinks` + `canManageFinance` in `roles.ts`.
  - **Dashboard** (`/finance`) — 8 KPIs, 4 charts, quick actions, filters.
  - **Bank Book** (`/finance/bank-book`) — ledger + reconcile + 4-step statement import wizard
    + Bank↔source mapping (Collection/Advance/Expense). `data.ts` + 9 components.
  - **Cash Book** (`/finance/cash-book`) — ledger, reconciliation panel, Bank↔Cash transfers,
    customer-cost & employee-finance panels, vouchers. `data.ts` + 8 components.
  - **Expense Register** (`/finance/expenses`) — summary cards, 18-field filters, bulk actions,
    GST auto-split, approval timeline, profitability + advance panels. `data.ts` + 11 components.
  - **Mobile** — `ExpenseClaimScreen`, `ConveyanceScreen` (no Google API; placeholders).
  - **Shared** — `_shared/transferStore.ts` (cross-module Bank↔Cash entries); collapsible
    top-of-page filters across all 3 ledger pages.
  - All on mock data (₹ rupees); shapes defined in each `data.ts` ready for backend wiring.
- **Expense Categories** *(2026-06-04, UI-only mock, UNCOMMITTED)* — `/finance/expenses/categories`,
  a configuration-driven category engine: `data.ts` (30 categories, parent/sub, `deriveCatCaps`,
  7 templates) + `ExpenseCategoriesClient` + `CategoryTable/Filters/Form/Drawer/TemplateLoader`.
  `CategoryForm` has 9 config sections (Basic, Usage, Payment, Document rules, GST, Approval,
  Grade-policy, Customer-cost, Tally). Built to replace hardcoded category logic later.
- **Global Vendor Master** *(2026-06-04, UI-only mock, UNCOMMITTED)* — `/masters/vendors`, a global
  CRM master (one `Vendor` referenced by Finance/Expense/Procurement/Inventory/Projects/Support/
  Assets/Tally): `data.ts` (8 vendors, full Indian GST state-code map, `validateGSTIN`,
  `deriveVendorCaps`) + `VendorMasterClient` + 10 components incl. `VendorProfile` (9-tab),
  multi-branch+GST, contacts, banks, documents, and the reusable `GSTRegistrationPanel`/`GSTINBadge`.
  `/finance/vendors` redirects here.
- **Global Customer Master** *(2026-06-04, UI-only mock, UNCOMMITTED)* — `/masters/customers`, a
  global CRM master (one `Customer` referenced by CRM Sales/Opps/Quotations/Orders/Projects/Support/
  AMC/Assets/Finance/Profitability/Engineer-Visits/Conveyance): `data.ts` (8 customers incl. ABC
  Group hierarchy, `deriveCustomerCaps`, duplicate detection; reuses Vendor GST validator) +
  `CustomerMasterClient` + 13 components incl. `CustomerProfile` (12-tab), `CustomerSiteManager`
  (per-site GST + geo), `CustomerHierarchyViewer`, `CustomerProfitabilityPanel`,
  `CustomerRelationshipViewer`. **Extends the existing `Customer` model — no duplicate model.**
  The legacy operational `/customers` page (live CRM import + dedupe) is preserved and unchanged.
- **Bulk import** — CSV/XLSX lead import; printable employee user guide at `/user-guide.html`.
- **Org hierarchy** — `Employee.reportsTo` self-relation; Operations Head role with
  manager-like finance reach; editable `Reports To` + `Manager access` on the Team page.
- **Live role hydration** — `auth.ts` re-reads `isManager`+`role` from the DB on every
  token refresh, and `roles.ts` matches the Operations Head role flexibly, so Team-page
  role changes apply without code edits (and, after one re-login, without sign-out).
- **Security hardening** — ownership checks on `[id]` routes, API returns 401 JSON,
  signOut clears the dev cookie, mandatory PO date for Closed Won.
- **CRM Administration Engine — Phase 8** *(2026-06-05, UNCOMMITTED)* — `/settings/crm`, a config
  engine for the sales pipeline: `src/lib/crm-engine/` (pipeline, territory, assignment, automation,
  sla services), 7 API routes (`/api/admin/crm/*`), 5-tab admin UI (`PipelineDesigner`,
  `TerritoryManager`, `AssignmentRuleBuilder`, `AutomationBuilder`, `SLAManager`), seeded with an
  Opportunity Pipeline (7 stages = OPP_STAGES), a Lead Pipeline (7 stages = LEAD_STAGES), 3
  automation rules and 5 SLA rules. **Does not modify live CRM screens; all DB calls are
  try/catch-guarded.** Automation rules fire on real events (`lead.created`,
  `opportunity.stage_changed/won/lost`). Reachable via the Settings page card.
- **Approval Engine wired into CRM** *(2026-06-05, UNCOMMITTED)* — opportunity save triggers
  `LARGE_DEAL_APPROVAL` (>₹50L) and `DISCOUNT_APPROVAL` (discount first >0%); expense submit triggers
  `EXPENSE_APPROVAL` (>₹0.10L). All via `startApproval()` fire-and-forget — a missing/unconfigured
  workflow silently skips and the save never fails.
- **Pipeline lifecycle flow** *(2026-06-05, UNCOMMITTED)* — leads auto-convert to opportunities at
  PROPOSAL_SENT (hidden from Leads, surfaced in Opportunities, auto-navigate on transition);
  opportunity detail page has a full edit form + **Close Won** (Deal Value ex-tax, Net Profit ₹L,
  PO Number, PO Date) and **Close Lost** (reason) modals; WON/LOST deals are **locked read-only**
  (non-managers blocked at the API). **Legacy SalesFunnel deals are promotable** to real
  CrmOpportunities ("Open →" → `/api/pipeline/opportunities/promote`), giving imported deals the
  full edit/close experience. SLA badges on lead/opp cards + a leads-table SLA column.
- **Integration Center — Phase 12** *(2026-06-10, UNCOMMITTED, dev DB applied)* — `/settings/integrations`,
  a 10-tab admin console for external service connectors: `src/lib/integration-engine/` (providers,
  connections, credentials, logs, test); 5 API routes under `/api/admin/integrations/`; 11 seeded
  INACTIVE providers (SMTP, M365, Google Workspace, GST, PAN, Google Maps, WhatsApp Business, SMS,
  Teams Webhook, Tally, Generic Webhook). Credentials stored as env-var references (`secretRef`) only —
  raw secrets never persisted. Dry-run `testConnection()` — no live external calls by default.
- **SFDC-style Lead Standardization** *(2026-06-18, UNCOMMITTED, dev DB migration applied)* — `CrmLead.customerRefId` FK to `Customer` table; `CustomerNameCombobox` single smart field (auto-links on match, free-text for new prospects); `ConvertModal` on both lead list (`LeadsClient.tsx`) and detail page (`LeadDetailClient.tsx`); `POST /api/pipeline/leads/[id]/convert` creates Customer master + `CrmOpportunity` + sets stage to `PROPOSAL_SENT`. Idempotent.
- **RBAC Role Assignment UI + HR Automation** *(2026-06-18, UNCOMMITTED)* — Assign/Remove toggles per role in the Employees tab Manage drawer. PATCH endpoint handles `addRoleId`/`removeRoleId`. HR automation: deactivating/suspending employee deletes all `UserRole` records automatically.
- **Employee Form Dropdown Wiring** *(2026-06-18, UNCOMMITTED)* — Department / Designation / Reports-To dropdowns wired from master tables; sets both FK ids (`EmployeeProfile`) and name strings (`Employee` table) in sync on save.
- **Enterprise Security Center — Phase 13** *(2026-06-10, UNCOMMITTED, dev DB applied, browser verified)* —
  `/settings/security`, an 8-tab configurable security policy console: `src/lib/security-engine/`
  (password-policy, mfa, session, access-policy, data-protection, security-log, index); 7 API routes
  under `/api/admin/security/`; 5 default policies seeded (password length 8/90d expiry, MFA disabled,
  8h sessions, no IP restriction, 1000-record export limit). `evaluateSecurityPolicy()` is **fail-open**
  — returns `ALLOW` on any error. **Policies are non-enforcing** until explicitly integrated into auth.
  Existing login/sessions are completely unaffected. Security event log with 14 event types.

## 4. Pending / Backlog
> Confirm with the user before assuming priority — this is inferred from gaps, not a committed roadmap.
- **Consolidate the two RBAC systems** (`rbac.ts` DB matrix vs `roles.ts` predicates) so
  there is one authoritative gate.
- **Enforce `RolePageAccess` at the route/page layer** — the matrix is editable in admin
  but most routes still gate on `isManager`/role predicates, not `hasPermission()`.
- **Topbar global search** — wire the search box to actual results (currently cosmetic on
  most pages).
- **`xlsx` advisory** — migrate off the vulnerable `xlsx@0.18.5` or sandbox imports.
- **Notifications UI** — surface the `Notification` feed more prominently on desktop.
- **Money precision** — apply `@db.Decimal(12,4)` to `*Lakhs`/value fields (now feasible on
  MySQL) so finance totals are exact rather than `DOUBLE`.
- **Centralize auth in `proxy.ts`** — the edge proxy already gates routes; consider trusting
  it as the single boundary and trimming duplicate per-page `getSession()` redirects (keep
  ownership checks). Also fix the stale "src/middleware.ts" comment in `auth.config.ts`.

## Technical Debt

| Item | Introduced | Impact |
|---|---|---|
| `xlsx@0.18.5` HIGH advisory | Pre-session 1 | Import feature only; no remote trigger |
| Finance Phase 2 UI on mock data | Session 2 | 11 pages + mobile screens need backend wiring |
| Expense Categories / Vendor Master / Customer Master on mock data | Session 2 | Need backend APIs against existing Prisma models |
| `netProfitLakhs` rows from pre-rename era | Session 4 | Seeded rows may hold stale "%" values |
| Two coexisting RBAC systems | Pre-session 1 | `rbac.ts` DB matrix + `roles.ts` predicates both active |
| Client-side-only RBAC on Global Masters | Session 2 | Vendor/Customer Master capabilities not server-enforced |
| `canEdit || isOpsHead || isManager` fallback on settings pages | Session 3 | Dev-safe; needs tightening for prod |
| Money fields as `DOUBLE` not `Decimal(12,4)` | Pre-session 1 | Finance totals accumulate float error |
| Security policies non-enforcing | Session 6 | Engine built but not wired into auth |
| Integration connections not making live calls | Session 6 | Dry-run only; needs wiring per integration type |
| UAT DB migration not applied | Session 7 | `customerRefId` column missing on UAT — leads page broken until applied |
| Legacy `lead-generation` form not standardized | Session 7 | Old form still uses free-text `customerId`; Phase 17 deferred |

## Recommended Next Steps

1. **Apply UAT DB migration** (`20260618100000_crm_lead_customer_ref`) on UAT server — leads page is broken on UAT until done.
2. **Browser-verify the convert flow** on localhost then push to UAT git:
   - `git add -A && git commit -m "feat(crm): SFDC-style lead standardization + RBAC role assignment + HR automation"`
   - `git push origin uat`
3. **Wire password validation** — call `validatePasswordAgainstPolicy()` in any future password-change flow. Low risk; already fail-open.
4. **Wire data export guard** — call `canExportData()` before any CSV/XLSX export route returns data. First real use of the security engine.
5. **Finance backend wiring** — pick one Finance Phase 2 module (e.g. Bank Book) and wire it against the existing Phase-1 Prisma models. The `data.ts` type shapes are the contract.

## 4b. In-progress / Decisions this session

### Session 7 (2026-06-18) — SFDC Lead Standardization

- **Single combobox decision:** one `CustomerNameCombobox` field replaces two separate fields (free-text `companyName` + `CrmSelect type="customers"` dropdown). Auto-detects match against Customer master on select; free-text for new prospects. `customerRefId` null = prospect; non-null = linked master.
- **Conversion is explicit, not automatic:** "Convert →" button only appears at QUALIFIED+; not at NEW_LEAD/CONTACTED. Deliberate — salesperson triggers the conversion.
- **New customer at conversion:** form prompts name (required), district, state, pincode, address, optional GST. Creates Customer master via canonical Prisma create (same model as `/api/customers/master`). `crmSource: "lead_conversion"` tag set for audit.
- **Idempotency of convert endpoint:** checks `lead.opportunity` before creating; re-running same convert is safe.
- **HR automation scope:** only triggers on INACTIVE/SUSPENDED status change (not ACTIVE → other transitions). Fire-and-forget pattern; never blocks save.

### Session 6 (2026-06-10) — Integration Center + Security Center

- **Credential storage decision:** `secretRef` stores env var NAME only (not the secret). Rationale: avoids secrets at rest in the DB entirely; ops team sets OS env vars; the UI shows `[set]` when the var is present. `resolveSecret()` is server-only and never exposed in API responses.
- **Fail-open is mandatory for security engine:** `evaluateSecurityPolicy()` returns `ALLOW` on any error. Rationale: a policy engine bug should never lock users out of the system. Enforcing policies must be an explicit, deliberate integration step.
- **Phase 13 is final:** user directive "STOP after Security Center. Do not implement Governance module." All Settings Admin phases (8–13) are now complete.
- **MFA policy disabled by default:** seeded with `enabled=false`; `isMFARequired()` always returns false unless explicitly activated in the MFA tab.
- **Security event log is append-only / fire-silent:** log writes never throw; a log failure never affects the underlying operation.

### Session 4 (2026-06-05) — CRM Admin Engine + Approval wiring + Pipeline flow
- **Legacy deals promote to real opportunities** rather than enhancing the limited legacy modal.
  Rationale: gives imported deals the *same* full edit + Close-Won/Lost experience and aligns with
  the SalesFunnel → CRM migration direction. Idempotent via `SalesFunnel.crmOpportunityId`; promoted
  rows are filtered out of the legacy list (`crmOpportunityId: null`). Old `LegacyEditModal` removed.
- **Net profit stored as absolute ₹ Lakhs**, not a percentage — column renamed `netMargin` →
  `netProfitLakhs`. (User-requested; clearer for finance reconciliation.)
- **PROPOSAL_SENT is the lead→opportunity boundary** — such leads are hidden from the Leads view at
  the DB layer (`stage: { not: "PROPOSAL_SENT" }`) so they appear *only* on Opportunities. Avoids
  double-listing the same deal.
- **WON/LOST are terminal + locked** — UI hides the edit form and the API returns 403 for
  non-managers editing a closed deal. Closing requires PO Number + Deal Value (Won) or reason (Lost).
- **Approval/automation hooks are fire-and-forget** — wrapped in try/catch so CRM saves never fail
  if the workflow/automation engine is unconfigured.
- **Migration mechanics on Hostinger (no shadow DB)** — hand-write SQL → apply via one-off
  `node apply-*.mjs` (mariadb driver) → `prisma migrate resolve --applied` → `prisma generate` →
  restart dev server. Used for all 4 migrations this session.
- **Prisma acronym casing** — client accessors are `prisma.cRMAutomationRule` / `prisma.sLARule`;
  type imports are `CRMAutomationRuleModel` / `SLARuleModel`. crm-engine re-exports friendly aliases.


- **IN PROGRESS — Finance Operations Module, Phase 1 (database only).** Implemented + tested
  on the dev DB; **uncommitted**. Working tree: `M schema.prisma, prisma.config.ts, package.json`
  and new `prisma/migrations/20260602120000_finance_operations_phase1/`, `prisma/seed.ts`,
  `prisma/seed-dev-users.ts`, `prisma/seed-dev-finance.ts`.
- **10 new models:** `FinAccount` (cash+bank), `Ledger`, `Vendor`, `Expense`, `Voucher`,
  `VoucherSequence`, `EmployeeAdvance`, `TravelClaim`, `ApprovalRule`, `AuditLog`.
- **Key decisions (2026-06-02 — Finance Phase 1):**
  - Mapped the approved 9-module list to the **standard accounting pattern**: unified
    `FinAccount` + `Ledger` (NOT the doc's split Cash/Bank tables); added `AuditLog` (new) and
    `VoucherSequence` (atomic voucher numbering, `CI/YY-YY/00001`).
  - Money kept as `Float`/`DOUBLE` (consistent with existing tables; `Decimal` deferred).
  - Migration **generated offline** (`prisma migrate diff`) because no local MySQL exists.
  - Local dev now uses the **remote Hostinger dev DB** (`srv2201.hstgr.io`/`u686730471_caveodev`);
    seed command moved to `prisma.config.ts` `migrations.seed` (Prisma 7 location).
  - `seed.ts` is **prod-safe** (config only, no PII); the two `seed-dev-*.ts` are dev-only.
- **Key decisions (2026-06-02 — DB migration):**
  - **Migrated to MySQL/MariaDB** (Hostinger-provided) rather than PostgreSQL — it's what the
    Hostinger plan offers and required no new infra.
  - Used the **`@prisma/adapter-mariadb` driver adapter** (mandatory: Prisma 7's
    `prisma-client` generator ships no query engine). Connection config is built in
    `src/lib/prisma.ts` from `DATABASE_URL`.
  - **Kept `Float` (→ MySQL `DOUBLE`) for money** instead of converting to `Decimal`, to
    avoid a ~35-file `Prisma.Decimal` refactor. `@db.Decimal(12,4)` is the recommended future
    fix (deferred debt).
  - Added **`@db.Text`** to all long-text fields (avoids MySQL's silent `VARCHAR(191)`
    truncation) and **18 indexes** on FK/filter columns.
  - **Data migrated in place on the server** (better-sqlite3 read → `mysql` CLI load),
    AUTO_INCREMENT counters reset to `MAX(id)+1`, `_prisma_migrations` baselined so
    `migrate deploy` is a no-op. Old SQLite migrations removed; one MySQL baseline kept.
  - Worked around three deploy gotchas: **`127.0.0.1` not `localhost`** (TCP vs socket);
    **Passenger `%`→`\%` env escaping** (stripped in `prisma.ts`); **`middleware.ts` ⨯
    `proxy.ts`** conflict in Next 16 (removed my maintenance `middleware.ts`).
- **Earlier decisions (2026-06-01) — still in force:**
  - Operations Head gets **manager-like finance reach via `roles.ts` predicates**, NOT the
    `isManager` flag (keeps "manager" meaning sales-management).
  - Role matching is **flexible/substring** (`isOperationsHead`, `isAccounts`) so free-text
    role names entered on the Team page ("HR & Operations Head", etc.) still gate correctly.
  - `auth.ts` re-hydrates role/isManager on **every** refresh (was: only when undefined).
  - Reporting hierarchy stored as `Employee.reportsToId` (data), not just role-based access.
  - Partial payments preserved via an **"Opening Balance"** synthetic ledger entry rather
    than schema change, so already-imported invoices reconcile on first new payment.

## 5. Known Issues / Watch-list
1. **🔴 Production outage (LVE resource limit) — ACTIVE.** Site returns 503/500;
   `bash: fork: Resource temporarily unavailable` on the account. Caused by piled-up
   `next-server` workers + a concurrent rebuild exceeding the CloudLinux per-account
   process/memory cap. **Fix: hPanel → Node.js app → Restart** (clears workers). Avoid
   rapid-fire rebuilds/`restart.txt` touches in future. Not data loss; DB + code intact.
2. **Auth is via `src/proxy.ts`** (Next 16 edge middleware), and the `authorized` callback
   IS live (redirects pages, 401s APIs). *Correction:* older docs called this dead code.
   A `middleware.ts` cannot coexist with `proxy.ts`. Pages/routes also call `getSession()`.
   Note: `auth.config.ts`'s header comment still says "Used by src/middleware.ts" (stale).
3. **Money still `Float` (MySQL `DOUBLE`)** — `round2()` tolerance masks float drift.
   Recommended fix: `@db.Decimal(12,4)` on all `*Lakhs`/value fields (deferred — needs no
   code change with native-type override, but verify aggregations).
4. **Orphaned `public/maintenance.html`** — the maintenance-mode `middleware.ts` that used
   it was removed (Next 16 conflict). Either wire a maintenance gate into `proxy.ts` or
   delete the file. (Tracked in git.)
5. **Leftover SQLite deps** — `better-sqlite3` + `@types/better-sqlite3` remain in
   `package.json` (only used by the now-deleted migration script). Safe to remove.
6. **Stale-JWT re-login (technical debt).** Role/manager changes apply live going forward,
   but any session whose token predates `1ab4f7d` still carries the old role until that user
   signs out + in once. Affected: verify Priyadharshini + Deepak after a fresh login.
7. **Dual RBAC** — `hasPermission()` (DB) and `roles.ts` predicates can disagree. *(The Approval Engine object-level gap this overlapped with — any employee could act on any approval request — was fixed 2026-06-20; see the dated note at the top of §0 and `docs/RBAC_AUDIT_REPORT.md` §10 item 1. The general dual-RBAC consolidation itself is still open.)*
8. **`xlsx@0.18.5`** — HIGH-severity advisory, no upstream fix.
9. **Dev vs prod type-checking gap** — Turbopack dev mode does NOT type-check the whole
   project; `next build` (and Hostinger) does. Always `next build` before pushing. A type
   error inside `.next/dev/types/*` usually means a stale cache → `rm -rf .next` and rebuild.
10. **Local credential files (security):** untracked `scripts/_tmp_ssh.mjs` and
    `scripts/_tmp_sftp.mjs` contain plaintext SSH creds — **delete them**. SSH + MySQL
    passwords were shared in chat → **rotate them**. Keep the server `db/prod.db` SQLite
    backup ~2 weeks as rollback.
11. Loose root scripts (`seed.js`, `setup_manager.*`, `fix_roles.js`, `read_xls.js`) are
    one-off utilities, not part of the build.
12. Turbopack caches the Prisma client — always restart dev after `prisma generate`.
13. **🟠 PWA service worker (`caveo-crm-v1`) serves stale assets in dev.** Edits/`​.next`
    clears/server restarts can all be masked by the cached app shell. Unregister SW + clear
    caches in DevTools, then hard reload. Fix pending: skip SW registration in dev. (Cost us
    significant debugging time this session.)
14. **Turbopack doesn't pick up newly-created files without a server restart** (edits are fine).
    Orphaned `next dev` processes can also hold port 3000 and serve old code.
15. **All Finance Phase 2 UI is mock data** — no persistence. The Bank↔Cash transfer store is
    in-memory and resets on hard reload. Money shown in ₹ rupees (finance pages) vs ₹ Lakhs
    (rest of app) — reconcile when wiring the backend.
16. **2026-06-04 modules were mock & client-gated** — Expense Categories and Vendor Master still
    have no APIs and only client-side RBAC. **Customer Master is the exception as of Step 2P
    (2026-06-20):** `/masters/customers` now wires to the real `Customer` table and guarded
    `/api/customers/master*` APIs (reusing `/customers`'s component) — no longer mock. Money in
    ₹ rupees. Vendor Master still targets the existing `Vendor` model (extend, don't duplicate)
    but isn't wired yet.
17. ~~Two "Customer Master" nav entries, now functionally aligned — `/masters/customers` and
    operational `/customers` both render the same real component/data/APIs as of Step 2P
    (2026-06-20). Still two separate routes pending a redirect decision once verified.~~
    **RESOLVED 2026-06-20 (Step 2Q, Customer Master).** `/customers` is now a bare redirect to
    `/masters/customers` — one canonical Customer Master route, live-verified end-to-end.
18. **Orphaned `next dev` breaks dev login** — a stray process on port 3000 serves a stale
    Turbopack route tree where `/api/dev/switch` 404s, so quick-login can't set the cookie.
    Recovery: kill the port-3000 process, `rm -rf .next`, restart. (CLAUDE.md gotcha #10.)
19. **Session-4 work is large & uncommitted** — Phase 8 CRM Admin Engine, approval wiring, and the
    pipeline lifecycle flow span 14 modified + ~10 new files/dirs. None committed. `next build` not
    yet run against this batch — run it before pushing.
20. **`netProfitLakhs` semantics changed mid-session** — rows closed-Won *before* the `netMargin`→
    `netProfitLakhs` rename may hold a leftover "%" number now interpreted as ₹L. Dev test data only.
21. **CRM-admin seed ran twice early in the session** producing duplicate stages; cleaned up via a
    one-off script. If re-seeding, the seed `upsertStage` is keyed by create (not upsert) — guard
    against duplicates or truncate `pipeline_stage` first.
22. **`scripts/db-copy-prod-to-dev.mjs`** (untracked) copies prod → dev DB; contains/uses live DB
    creds. Treat as sensitive; do not commit with secrets.

## 6. Business Rules
- **Money** is in ₹ Lakhs everywhere (1 Cr = 100 L).
- **KRA progress is never entered manually** — it is computed from the activity sheets by
  the KRA engine, dispatched on KRA **title** keywords (e.g. "sales revenue",
  "customer & business", "sales management", "focus area", "sales operations").
- **Closed Won** (`SalesFunnel.stage="Closed Won"`) **requires a `poDate`**; `closedDate`
  mirrors `poDate`.
- **Collections:** `amountReceivedLakhs`/`collectionStatus`/`paymentReceivedDate` are
  cached and re-derived from the `Payment` ledger by `syncCollectionTotals()`. Partial
  payments ADD (opening-balance reconciliation prevents overwrite). Fully-paid invoices
  are hidden from the open list. Status: `Pending → Partially Received → Fully Received`.
- **Order advances** start `unapplied`; applying one creates a Payment and flips it to
  `applied`.
- **Ownership:** non-managers see/edit only their own `employeeId` rows; managers and
  finance roles (Accounts, Operations Head) see all collections/payments.
- **A payment notification** fans out to the invoice's sales rep + every manager.
- **Customer master** dedupes names case-insensitively across leads/collections/funnel/leadgen.
- **Lead → Opportunity:** moving a `CrmLead` to **PROPOSAL_SENT** auto-creates a `CrmOpportunity`
  and hides the lead from the Leads view (it now lives on Opportunities).
- **Opportunity close (CRM):** **Closed Won** requires `poNumber` + `dealValueExTax` (>0);
  **Closed Lost** requires `lostReason`. Once WON/LOST, the deal is read-only (API 403 for
  non-managers). `netProfitLakhs` is an absolute ₹L figure (not a %).
- **CRM Approvals:** opportunity value first crossing ₹50L → `LARGE_DEAL_APPROVAL`; discount first
  set >0% → `DISCOUNT_APPROVAL`; expense submitted >₹0.10L → `EXPENSE_APPROVAL`. All fire-and-forget.
- **Legacy promotion:** an imported SalesFunnel deal becomes a real opportunity on "Open →"
  (idempotent via `SalesFunnel.crmOpportunityId`); the legacy row is then hidden from the funnel.

## 7. Workflows
- **Dev cycle:** edit → verify on dev server (`localhost:3000`) → **confirm with user** →
  commit → push to `master` (Hostinger deploys on push/rebuild).
- **Schema change:** edit `schema.prisma` → `npx prisma migrate dev --name <x>` against a
  **MySQL/MariaDB** dev DB (set `DATABASE_URL` in `prisma.config.ts`/env) → `npx prisma
  generate` → **restart dev server**. (SQLite `file:` URLs no longer match `provider=mysql`.)
- **Dev impersonation:** use the DevBar (or `/login` quick-login) to switch employee;
  sets the `dev_employee_id` cookie consumed by `getSession()`.
- **Session end:** update this file + `CHANGELOG.md`.
- **Golden rules (CLAUDE.md):** never delete features / rewrite working code / reset DB /
  change UI standards. Reuse components, preserve logic, update docs.

## 8. Technical Debt
- **Session-4 work (Phase 8 CRM Admin + pipeline flow) is uncommitted** — commit + `next build`
  before pushing. `executeAutomation`'s `send_notification` action is a stub (no Notification wiring
  yet). CRM-admin seed `upsertStage` creates (not upserts) → re-running can duplicate stages.
- **Enterprise Admin Console (Phases 1–8) is built** (`/settings/*` incl. `/settings/crm`).
  Architecture plan in `docs/ADMIN_ARCHITECTURE_PLAN.md`. Remaining: the legacy
  `/settings/administration` flat-tab panel still coexists with the newer per-module pages —
  converge or retire it.
- ~~Two "Customer Master" surfaces (2026-06-04). The new global `/masters/customers` (enterprise
  UI, mock) and the legacy operational `/customers` (real DB + CRM import/dedupe) both exist and
  both appear in the sidebar. Non-destructive by design, but must converge: fold import/dedupe into
  the global master and back it with the existing `Customer` model. Decision asked of Vijesh.~~
  **RESOLVED 2026-06-20 (Step 2P, then Step 2Q, Customer Master).** Step 2P wired
  `/masters/customers` to `/customers`'s real `CustomerMasterClient` and the same
  `Customer`-table data/APIs; Step 2Q then converted `/customers` to a redirect to
  `/masters/customers`, live-verified end-to-end (unauthenticated, non-manager, and manager
  flows all behave correctly). One canonical Customer Master route now — fully consolidated.
- **Three new 2026-06-04 modules were all mock & uncommitted** — Expense Categories (8 files),
  Vendor Master (14), Customer Master (16). **Customer Master is now wired (Step 2P, 2026-06-20)**
  — real `Customer`-table data/APIs, no longer mock. Expense Categories and Vendor Master remain
  mock; no APIs/persistence, gating is client-side only. Shapes in each `data.ts` are the backend
  contract. Vendor Master must wire to the **existing** `Vendor` model (extend, never duplicate)
  when its turn comes.
- **Finance Phase 2 UI is all mock & uncommitted** — ~45 files under `src/app/finance/` run on
  in-memory mock data (each module's `data.ts`). No APIs/persistence. The Bank↔Cash transfer
  store resets on hard reload. Needs backend wiring (shapes already defined in `data.ts`).
- **Finance money unit mismatch** — finance web pages use ₹ rupees; the rest of the app uses
  ₹ Lakhs. Normalise (likely to Lakhs + `@db.Decimal`) when persisting.
- **Duplicate expense entry UIs** — `/finance/expenses/new/ExpenseEntryForm.tsx` (full page)
  vs the richer `ExpenseForm` drawer in the register. Consolidate.
- **Service worker not dev-safe** — `ServiceWorkerRegistrar` caches the shell and serves stale
  assets in dev; make it skip dev / network-first.
- **`recordPayment`/`applyAdvance` lack `prisma.$transaction`** — wrap before high concurrency
  (MySQL has real concurrent writes now). The new finance services in Phase 2 must use
  `$transaction` from day one (balance updates, voucher numbering).
- **Money is `Float`/`DOUBLE`** across both finance modules — `@db.Decimal(12,4)` deferred.
- **Cached balances** (`FinAccount.currentBalance`, `EmployeeAdvance.balanceLakhs`) have no
  service guard yet (no API in Phase 1) — Phase 2 must only mutate them via a service fn.
- **Dev DB password shared in chat** (`Caveo@2026`) — rotate after testing; remove the
  Remote-MySQL IP/`%` whitelist entry in hPanel.
- Carryover: dual RBAC (`rbac.ts` vs `roles.ts`); `xlsx@0.18.5` advisory; remove
  `better-sqlite3` deps; orphaned `public/maintenance.html`; pre-`1ab4f7d` JWT re-login.

## 9. Recommended Next Steps (ordered)
1. **Commit this session's work** (confirm with Vijesh; stage in chunks):
   approval-wiring → crm-engine (Phase 8) → pipeline lead→opp flow + SLA → opportunity
   full-edit/close/legacy-promotion. Run `npx tsc --noEmit` + `npx next build` first.
2. **Decide whether to push** — Phase 8 + pipeline flow touch live CRM screens (additively).
   Verify `200` on prod `/login`, then `git push origin master` after Vijesh confirms.
3. **Finish automation dispatch** — `executeAutomation` `send_notification` is a stub; wire it to
   the `Notification` model so automation rules actually notify.
4. **Earlier backlog still open** — commit the Finance/Masters UI mock modules (sessions 2–3);
   begin Finance Operations backend (Expense Register CRUD) **only when asked** (was a STOP point);
   consolidate the two Customer Master nav entries.
5. **Ledger persistence** — `src/lib/finance/bank-ledger.ts` per `BANK_LEDGER_MAPPING.md`.
6. Carryover: service-worker dev fix; wrap `recordPayment`/`applyAdvance` in `$transaction`;
   `@db.Decimal(12,4)` money; rotate dev DB creds (`Caveo@2026`) + prune Remote-MySQL whitelist;
   remove `better-sqlite3`; mitigate `xlsx@0.18.5`; remove orphaned `public/maintenance.html`.

---

## 8. Database Migration Record (append-only)

### SQLite → MySQL — completed 2026-06-02
| Item | Detail |
|---|---|
| **From** | SQLite (`file:./dev.db`) via `@prisma/adapter-better-sqlite3` |
| **To** | MySQL-compatible MariaDB 11.8 on Hostinger via `@prisma/adapter-mariadb` |
| **Status** | ✅ Complete — all 22 tables migrated, row counts verified identical |
| **Baseline migration** | `prisma/migrations/20260601000000_init_mysql` |
| **Provider** | `mysql` in `schema.prisma` |

SQLite is no longer referenced or used anywhere in the codebase. All local development
and production deployments now require a MySQL/MariaDB instance.

### Current canonical stack
```
Next.js (App Router)   — framework
Prisma 7               — ORM, driver-adapter mode (no binary query engine)
MySQL 8 / MariaDB 11.8 — database (MySQL-compatible)
@prisma/adapter-mariadb — driver adapter (mandatory with Prisma 7 prisma-client generator)
mariadb (npm)          — underlying Node.js driver
```

### Mandatory rules for all future Prisma modules
- `provider = "mysql"` — no exceptions.
- All `String` fields that hold free-form content → `@db.Text`.
- Every FK column and hot-filter column → `@@index(...)`.
- Datasource `url` lives in `prisma.config.ts` only (Prisma 7 rule).
- Multi-write operations → `prisma.$transaction`.
- Use `127.0.0.1` (not `localhost`) in `DATABASE_URL` for TCP connection.
