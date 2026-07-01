# Webapp Gap Closure Plan

> **Status: Planning only.** No Prisma schema changes, no migrations, no `prisma db push`,
> no database data changes, no API changes, no mobile code changes, and no production
> changes were made while producing this document. UAT/dev only. **Do not touch production.**

## 1. Executive summary

Mobile app work is paused (per Vijesh, 2026-06-25). Focus shifts back to the webapp: closing
existing gaps and replacing the manual Daily Updates workflow with auto-captured Daily
Activity & Productivity. This document audits the current webapp Daily Updates
implementation and its dependencies, audits which CRM activity sources already exist vs. are
missing, and produces a severity-ranked gap table to drive implementation phasing. The
companion document,
[`DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md`](./DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md), specifies
the target workflow in detail; this document focuses on **what's missing to get there**.

## 2. Daily Updates current-state audit

**Desktop page:** `src/app/daily-updates/page.tsx` (server component) → `DailyUpdatesClient.tsx`
(client). The server page fetches:
- `employees` — all employees if manager, else just self (`isManager ? {} : { id: empId }`).
- `rows` — all `DailyUpdate` rows if manager (no `employeeId` filter applied server-side at the
  page level), else self only, latest 100, via `prisma.dailyUpdate.findMany`.

`DailyUpdatesClient.tsx` renders: a filter bar (status quick-filters, employee dropdown for
managers, date range), an "+ Add Update" modal form (Employee select for managers, Date,
Status, Top Updates *required*, Key Movement, Blockers, Top Deal This Week, Manager Support
Required checkbox), and a card list with inline **Edit**/**Del** actions per row. This is a
**fully functional, real CRUD desktop UI** — materially more complete than the mobile shell
that preceded it (mobile is currently read-only for this data).

**API:** `GET/POST /api/daily-updates`, `PUT/DELETE /api/daily-updates/[id]`
(`src/app/api/daily-updates/route.ts`, `[id]/route.ts`). RBAC: GET/POST scope to self unless
`isManager` (POST lets a manager submit on behalf of another employee via `body.employeeId`
— this is an existing, working manager-override path, not a gap, but is worth flagging
explicitly for the new workflow since "employee cannot submit another employee's summary" is
now an explicit hard rule, §8). PUT/DELETE check `existing.employeeId === session.user.employeeId
|| isManager` (403 otherwise) — correctly ownership-scoped.

**`DailyUpdate` Prisma model fields:** `id, date, employeeId, topUpdates, keyMovement,
blockers, topDealThisWeek, managerSupportRequired, updateStatus, createdAt`. No `points`, no
status-machine field beyond the free-text `updateStatus` label, no link to any CRM entity.

**Dependents found (full-repo grep, excluding generated Prisma client code and the mobile
screen already covered by the paused mobile plan):**
- `src/app/employees/[id]/page.tsx:93-97` — the employee profile page reads the **5 most
  recent `DailyUpdate` rows that have a non-empty `blockers` field** for that employee, as a
  "recent blockers" widget. This is the **one cross-feature dependency** on `DailyUpdate`
  found in the codebase.
- `src/app/daily-updates/page.tsx`, `DailyUpdatesClient.tsx`, `api/daily-updates/route.ts`,
  `[id]/route.ts` — the feature itself.
- `src/app/mobile/...` — covered separately by the paused mobile plan; not touched here.

**Not found anywhere:** no reference to `DailyUpdate` in any KRA (`KRA`, `WeeklyReview`,
`WeeklyCommit`), dashboard, or reports code. **`DailyUpdate` is fully decoupled from KRA
scoring today** — it has never fed weekly/monthly rollups or KRA calculations. This is an
important, confirmed finding: replacing it does not require unwinding any existing KRA
computation, only the one blockers-widget read and the page/API/component themselves.

### What exists today
A complete, working manual CRUD feature: desktop page, client component, full REST API with
correct ownership RBAC, one downstream read (employee profile blockers widget).

### What can be reused temporarily
- The ownership/scoping pattern in the API routes (self-scope unless manager) is the exact
  pattern the new Daily Activity APIs should follow — no new RBAC primitive needed for basic
  self/manager scoping.
- `DailyUpdatesClient.tsx`'s filter-bar and card-list structure (status quick-filters, date
  range, manager employee-dropdown) is a reasonable UI skeleton to adapt for the team
  dashboard view, not because the component is kept as-is, but because the *pattern* (filter
  bar + status badges + per-row detail) is proven and brand-consistent with the rest of the
  webapp.

### What should be deprecated
- The free-text `updateStatus` self-selected label (On Track/At Risk/Blocked/Ahead) — replaced
  by the computed day-status state machine (§9 of the requirements doc).
- The "Add Update" manual-entry form for `topUpdates`/`keyMovement`/`topDealThisWeek` — these
  become auto-captured activity, not employee-typed fields.
- Manager's ability to submit a Daily Update **on behalf of** another employee
  (`POST` with `body.employeeId`) — directly conflicts with the new hard rule that nobody but
  the employee submits their own end-of-day summary (§8). This must NOT be carried into the
  new API.

### What must not be expanded further
- No new fields, no new filters, no new write paths should be added to the existing
  `DailyUpdate` model/API/UI from this point forward — any further investment goes into the
  new Daily Activity system instead, per the "Option C hybrid" recommendation (§6 of the
  requirements doc / Task 6 below).

### What breaks if DailyUpdate is removed too early
- `employees/[id]/page.tsx`'s blockers widget would break (empty/error) if the table or API
  is dropped before that one read is migrated or removed.
- Any **historical** record of what employees logged before the cutover would be lost if the
  table is dropped rather than archived/frozen — there is no other source of this history.
- No KRA/report breakage risk exists (confirmed above — nothing else reads it).

## 3. Daily Activity target workflow

Full specification lives in
[`DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md`](./DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md). Summary:
CRM actions (lead qualification, lead/opportunity updates, task/meeting completion, proposals,
notes/follow-ups) are auto-captured as scored events; the employee submits only an end-of-day
summary (Blockers / Next-day plan / Final remarks); the day is assigned a status that gates
KRA eligibility; managers see exact points and audit/correct/reopen; employees see only a
banded status.

## 4. Existing activity sources

`CrmActivity` (`prisma/schema.prisma:444-463`) is a generic, employee-attributed, timestamped
audit log already written to by 8 of the 9 required event types:

| Source | File | `action` value | Already matches target activity |
|---|---|---|---|
| Lead stage change | `pipeline/leads/[id]/stage/route.ts:78` | `stage_changed` | Lead updated (generic — not qualification-specific) |
| Lead stage change (alt route) | `pipeline/leads/[id]/route.ts:100,136` | `stage_changed` | Lead updated |
| Lead created | `pipeline/leads/route.ts:135` | `created` | Not scored (creation ≠ qualification) |
| Lead converted | `pipeline/leads/[id]/convert/route.ts:118` | `converted` | Needs review vs. qualification overlap |
| Task completed | `pipeline/tasks/[id]/route.ts:35-46` | `task_completed`, **gated on `status → "completed"` transition only** | Task completed — already matches the required duplicate-prevention rule |
| Meeting scheduled | `pipeline/meetings/route.ts:76` | `meeting_scheduled` | Meeting scheduled |
| Note added | `pipeline/notes/route.ts:28` | `note_added` | Call/email/WhatsApp note (undifferentiated by channel) |
| Opportunity stage change | `pipeline/opportunities/[id]/route.ts:115` | `stage_changed` | Opportunity updated |
| Opportunity auto-created | `pipeline/opportunities/promote/route.ts:93` | `created` | Opportunity updated (creation path) |
| Free-form activity log | `pipeline/leads/[id]/activity/route.ts` | body `action: call\|note\|meeting` | Call/email/WhatsApp note |

`LEAD_STAGES` (`src/types/pipeline.ts:3-11`) already includes a `"QUALIFIED"` stage in
sequence after `NEW_LEAD`/`CONTACTED` — the data needed to detect a Raw→Qualified transition
exists; the detection *logic* does not yet exist anywhere.

## 5. Missing activity sources

- **Qualified-lead detection.** No code path checks "previous stage was not Qualified, new
  stage is Qualified" — `stage_changed` fires identically for every transition.
- **Meeting completion.** `CrmMeeting` (`prisma/schema.prisma:424-442`) has **no status field
  at all** (`meetingDate`, `notes`, `attendees`, `location` only) — there is no way to know if
  a scheduled meeting actually happened. This is a schema gap, not just an instrumentation gap.
- **Proposal-sent identity.** A proposal is "sent" only as a side effect of a lead's stage
  becoming `PROPOSAL_SENT` (which also auto-creates the `CrmOpportunity`). There is no
  proposal versioning, so "count once per proposal version" cannot be implemented — there is
  currently only one possible proposal-sent event per lead, which incidentally satisfies
  "count once" only because resending isn't a modeled concept yet.
- **Note-channel differentiation.** `CrmNote`/`note_added` doesn't distinguish call vs. email
  vs. WhatsApp — if differentiated scoring is ever needed, a `noteType` field is required.
- **End-of-day summary submission.** No event source exists today — this is an entirely new
  action.

## 6. Data model gaps

No new model exists yet for: per-event scored activity log, end-of-day summary with a status
state machine, correction requests, persisted closed-day score snapshots, configurable
activity-point rules, configurable role targets. Full candidate-model evaluation (including
explicit reuse-vs-new-model analysis for each) lives in §17 of the requirements document and
mirrors the evaluation already done in
`docs/Mobile/DAILY_ACTIVITY_PRODUCTIVITY_WORKFLOW_PLAN.md` §14 — that evaluation is reused
here unchanged, since the underlying schema doesn't differ between the mobile and webapp
surfaces (one schema, two UIs).

## 7. API gaps

No endpoints exist yet for: today's auto-captured activity feed, activity history, summary
submission/edit, correction requests (employee side); team dashboard, correction
approve/reject, day reopen (manager side); activity-rule/role-target config (admin side). Full
endpoint table in §16 of the requirements document.

## 8. UI/page gaps

- No webapp page shows an auto-captured activity timeline for "today."
- No webapp page lets an employee submit only Blockers/Next-day plan/Final remarks against a
  pre-computed activity set — `DailyUpdatesClient.tsx`'s form is built entirely around manual
  free-text entry of what is meant to become auto-captured data.
- No manager team-dashboard view exists for daily activity (no-activity list, incomplete list,
  summary-pending list, correction queue, reopened-days list) — `DailyUpdatesClient.tsx`'s
  manager mode is just "all rows, filterable," not a status-driven dashboard.
- No admin UI exists for activity-point rules, role targets, or cutoff/grace configuration.

## 9. RBAC/security gaps

- The existing Daily Updates API allows a manager to **create** an update on behalf of another
  employee (`POST` with `body.employeeId`). The new workflow's hard rule — nobody submits
  another employee's summary, ever, including managers — means this exact capability must
  **not** be carried forward into the new endpoints. This is a real, identified gap between
  current and target behavior, not just a missing feature.
- No existing enforcement anywhere prevents a manager from manually setting a "score" — because
  no score exists yet. This needs to be a server-side constraint from day one of the new API
  (no point-adjustment field on any manager-facing endpoint), not retrofitted later.
- Object-level "is this employee actually on this manager's team" scoping needs explicit
  verification against whichever of the two coexisting RBAC systems
  (`src/lib/rbac.ts` DB-driven `AppRole`/`RolePageAccess` vs. `src/lib/roles.ts` hardcoded
  predicates — CLAUDE.md gotcha #6) governs employee-manager relationships, before the team
  dashboard ships. Not resolved in this document.

## 10. KRA/reporting gaps

- No computed productivity number exists anywhere today; `KRA`/`WeeklyReview`/`WeeklyCommit`
  are entirely manual (`progress`, `score`, `notes` typed by a manager). The new system needs
  to feed these as an **input** to that manual process, not silently overwrite it — the exact
  wiring point (e.g., a read-only "this week's auto productivity" field shown during
  `WeeklyReview` entry) is a design decision for Phase 5, not made here.
- No reporting surface exists for daily/weekly/monthly productivity, no-activity-day counts,
  or correction-request volume.

## 11. Migration/backfill risks

- **Low risk overall** — confirmed in §2 that nothing outside the Daily Updates feature itself
  and one profile-page widget depends on `DailyUpdate`.
- The one dependency (`employees/[id]/page.tsx` blockers widget) must be explicitly handled —
  either kept reading frozen historical `DailyUpdate` rows indefinitely (Option C, recommended,
  §6 below) or re-pointed at the new summary's `blockers` field once that exists.
- No automatic migration of historical `DailyUpdate` rows into the new model is proposed —
  see Task 6 recommendation below for why a hybrid (keep-old, build-new) approach avoids this
  problem entirely for now.

## 12. Recommended implementation sequence

1. **Phase 1** — Schema design review and (separately approved) migration for the new Daily
   Activity models; no code changes to the existing Daily Updates feature yet.
2. **Phase 2** — Event-capture hooks added to existing pipeline routes (qualification
   detection, meeting-completion field + detection once schema allows, de-duplication keys).
3. **Phase 3** — Webapp employee Daily Activity page (replaces `/daily-updates` employee view).
4. **Phase 4** — Webapp manager Daily Activity dashboard (replaces manager mode of
   `/daily-updates`).
5. **Phase 5** — Scoring, weekly/monthly/KRA-input wiring, reporting.
6. **Phase 6** — Admin settings (activity rules, role targets, cutoff/grace config).
7. **Phase 7** — Decide and execute the `DailyUpdate` legacy disposition (freeze read-only vs.
   archive) and re-point `employees/[id]/page.tsx`'s blockers widget if needed.

## 13. No-production confirmation

No Prisma schema changes, no migrations, no `prisma db push`, no database data changes, no
new or modified API routes, no existing API behavior changes, no mobile code changes, and no
production changes were made while producing this document. UAT/dev only.

## Gap table

| Gap ID | Area | Description | Severity | Recommended Fix | Phase |
|---|---|---|---|---|---|
| G-01 | Activity capture | No qualified-lead (Raw/Data→Qualified) detection exists | High | Add stage-transition check in lead stage-update routes | 2 |
| G-02 | Data model | `CrmMeeting` has no status field — meeting completion can't be captured | High | Add `status` field to `CrmMeeting` (separate, approved migration) | 1 |
| G-03 | Data model | No `DailyActivityLog`/`DailyActivitySummary`/correction/score models exist | High | New models per §17 of requirements doc | 1 |
| G-04 | API | No employee/manager/admin Daily Activity endpoints exist | High | New endpoint set per §16 of requirements doc | 1–6 |
| G-05 | UI | No auto-activity-timeline or end-of-day-summary-only employee page exists | High | New webapp employee page, replaces `/daily-updates` | 3 |
| G-06 | UI | No manager team-activity dashboard exists | High | New webapp manager dashboard | 4 |
| G-07 | RBAC | Manager-submits-on-behalf-of-employee path exists today and must not carry forward | Medium | Explicitly omit `employeeId` override from new submission endpoint | 1 |
| G-08 | RBAC | Manager-cannot-adjust-points rule has no enforcement point yet (nothing to enforce against today) | Medium | Server-side: no point-edit field on any manager endpoint, from day one | 1 |
| G-09 | Proposal tracking | No proposal versioning/identity — "sent" is a side effect of lead stage only | Medium | Decide in Phase 1 review whether to model proposals explicitly or accept current 1:1 lead↔proposal assumption | 1 |
| G-10 | Note capture | Call/email/WhatsApp notes are undifferentiated (`note_added` only) | Low | Add `noteType` to `CrmNote` if differentiated scoring is later required | 2 (optional) |
| G-11 | KRA integration | No wiring point exists between any computed score and `WeeklyReview`/`KRA` | Medium | Define read-only rollup input field, design in Phase 5 | 5 |
| G-12 | Legacy dependency | `employees/[id]/page.tsx` blockers widget depends directly on `DailyUpdate` | Low | Leave reading frozen `DailyUpdate` (Option C) or re-point at new summary later | 7 |
| G-13 | Reporting | No daily/weekly/monthly productivity report surface exists | Medium | New report page, Phase 5 | 5 |
| G-14 | Admin config | No UI/API exists for activity-point rules or role targets | Low | New admin settings page, Phase 6 | 6 |

## Phase W2 progress (2026-06-25)

Backend foundation implemented on the dev DB — closes G-01, G-04 (read side), and the capture
half of G-03's consumption. No production changes; no `/daily-updates` UI/API changes; no
mobile changes.

- **Event-capture helper implemented:** `src/lib/daily-activity.ts` — `captureDailyActivityEvent`,
  `recomputeDailySummary`, `buildAutoSummary`, `getDailyActivityForEmployee`,
  `getDailyActivityForManagerEmployee`, `getTeamDailyActivity`,
  `getDailyActivityHistoryForEmployee`, `getProductivityBand`, `getDefaultActivityPoints`,
  `captureFromCrmActivity`.
- **Hooks added** to 7 existing route files (closes G-01 for qualified-lead detection):
  `pipeline/leads/[id]/stage/route.ts`, `pipeline/leads/[id]/route.ts` (PUT + PATCH),
  `pipeline/tasks/[id]/route.ts`, `pipeline/meetings/route.ts`,
  `pipeline/opportunities/[id]/route.ts`, `pipeline/notes/route.ts`,
  `pipeline/leads/[id]/activity/route.ts`. No existing route behavior changed — capture calls
  are additive and fire-and-forget.
- **Read APIs added** (closes G-04's read side): `GET /api/daily-activity/today`, `/history`,
  `/team`, `/team/[employeeId]/[date]` — all read-only, no write/submission/correction/reopen
  endpoints exist yet (those remain G-04's write side, Phase 3+).
- **Still pending:** MEETING_COMPLETED has no live hook — no meeting-update route exists yet
  (G-02 partially closed: the `status` column exists from Phase W1, but no API writes to it).
  G-09 (proposal versioning) and G-10 (note-channel differentiation) remain open — both
  captured conservatively per their documented fallbacks. UI (G-05/G-06), KRA wiring (G-11),
  reporting (G-13), and admin config (G-14) are unstarted — later phases.

## Phase W3 progress (2026-06-29)

Read-only Daily Activity webapp UI added on top of the Phase W2 APIs — partially closes
G-05/G-06 (read side only; write side — summary submission, correction requests,
approve/reject/reopen — is explicitly deferred to a later phase). No production changes; no
schema/migration changes; `/daily-updates` UI/API unchanged; mobile unchanged.

- **Read-only Daily Activity page added:** `src/app/daily-activity/page.tsx` at `/daily-activity`
  (does not replace `/daily-updates` yet, per plan). Server component loads the session and
  calls the Phase W2 lib functions directly for the initial SSR render (same convention as
  `/daily-updates/page.tsx`), then hands off to two client components.
- **Employee read-only view added:** `EmployeeActivityView.tsx` — today's summary/correction
  status badges, productivity band (label only, no points), activity counts, full timeline,
  auto summary, blockers/next-day plan/final remarks (read-only), cutoff/grace metadata, and
  14-day history strip. Zero-activity and no-summary states handled explicitly.
- **Manager read-only dashboard added:** `ManagerActivityPanel.tsx` — date filter (defaults to
  today, calls `GET /api/daily-activity/team` client-side on change), team totals tiles, and a
  team table (employee, summary status, band, exact total points, activity count, last
  activity, correction-pending, needs-review, view-details).
- **Manager employee/day detail added:** inline expandable row per Task 4 Option A — lazy
  client-side fetch of `GET /api/daily-activity/team/[employeeId]/[date]` on first expand,
  cached per employee+date in component state. Shows full timeline with points. Approve/
  Reject/Reopen render as disabled buttons labeled "Coming in next phase" — no write action
  exists.
- **Non-destructive `/daily-updates` banner added:** a dismissable-by-navigation info banner
  linking to `/daily-activity`. `DailyUpdate` CRUD behavior, API, and page are otherwise
  byte-for-byte unchanged.
- **Nav item added:** "Daily Activity" inserted next to "Daily Updates" in all three role-based
  `SidebarLinks.tsx` groups (manager/employee/accounts). "Daily Updates" was not removed.
- **DailyUpdate unchanged. Mobile untouched. Production untouched.** No new API routes, no
  write endpoints, no Prisma schema/migration changes.
- **Still pending:** summary submission, correction requests, approve/reject/reopen (G-05/G-06
  write side), KRA wiring (G-11), reporting (G-13), admin config (G-14) — all later phases.

## Phase W3.1 verification (2026-06-29)

Manual browser verification of the Phase W3 read-only Daily Activity UI, performed against
the local dev server (dev quick-login impersonation, dev DB) before any write-workflow phase
is started. No schema/migration changes, no `db push`, no new APIs, no mobile changes, no
production changes. All Daily Activity HTTP calls observed during this session were GET only.

**Employee verification (logged in as Priya Nair, BDE, non-manager):**
- `/daily-activity` loaded (200) with the manager panel absent (server-side gated — the
  component is never mounted, not just hidden by CSS).
- Zero-activity day rendered "No activity recorded" band + status, all 6 activity-count
  tiles at 0, "No activity recorded" in the timeline panel, "No history yet." in the
  history strip — all per the zero-activity-state spec.
- Cutoff "8:00 PM" / Grace until "10:00 PM" rendered correctly; "Can submit summary: Yes" /
  "Can edit summary: Yes" rendered as timing-only metadata (no submit/edit control exists).
- Full-page text scan confirmed no occurrence of "points" anywhere on the rendered employee
  page. No submit/approve/reject/correction button exists in the DOM (`writeButtons: []`).
- Direct `fetch('/api/daily-activity/team')` and `fetch('/api/daily-activity/team/1/<date>')`
  from the employee's authenticated session both returned **403 Forbidden** — manager
  endpoints reject non-managers even when called directly, not just hidden in the UI.
- `fetch('/api/daily-activity/today?employeeId=999')` returned an **identical** payload to
  the unparameterized call — the `employeeId` override attempt is silently ignored; the
  route only ever reads the session's own employeeId.

**Manager verification (logged in as Vijesh Vijayan, Head of Sales, manager):**
- `/daily-activity` loaded (200) with both the employee panel and the team dashboard present.
- Team totals tiles rendered: Employees 16, No Activity 16, Summary Pending 0, Incomplete 0,
  Closed 0 (all-zero is expected — dev DB has no activity rows for the tested dates).
- Team table rendered all 16 rows with columns matching spec, including **Total Points**
  (visible, e.g. `0` per row — manager-only field, confirmed not hidden).
- Date filter: changing the date input fired `GET /api/daily-activity/team?date=<new date>`
  client-side and the table updated — confirmed via network log.
- "View details" expanded an inline row showing employee name/date, status/band badges,
  "Total: 0 pts", an activity timeline panel, and three **disabled** buttons labeled
  "Approve (coming in next phase)" / "Reject (coming in next phase)" /
  "Reopen (coming in next phase)" — no write action is wired to any of them.
- All requests observed for `/api/daily-activity/*` during the manager session were `GET`
  (`/api/daily-activity/team`, `/api/daily-activity/team/[employeeId]/[date]`) — no
  `POST`/`PUT`/`DELETE` calls were made or are possible from this UI.

**Daily Updates compatibility:**
- `/daily-updates` still loads, the existing filter bar / status badges / employee dropdown
  render unchanged, and the non-destructive banner ("New Daily Activity preview is
  available." → "View it here") appears above the list without altering layout flow.
- Opening "+ Add Update" still opens the existing modal (`<h3>Add Daily Update</h3>`),
  confirming the CRUD form is untouched; closed via the existing "Cancel" button without
  side effects.

**Mobile / production:**
- `git status`/`git diff --stat` against `src/app/mobile` show no changes from this or the
  prior phase's work.
- No production server was started, deployed to, or restarted during this verification.

**Issue found (not fixed in this phase — verification only):** the date-filtered manager
endpoints (`GET /api/daily-activity/team?date=YYYY-MM-DD` and
`GET /api/daily-activity/team/[employeeId]/[date]`) return data for the day **before** the
requested date when the server's local timezone is ahead of UTC (observed: requesting
`2026-06-28` returned `summaryDate: "2026-06-27"` on this IST dev server). Root cause is in
`src/lib/daily-activity.ts`'s `startOfDay()` (`Date#setHours` operates in local time) applied
to a date parsed from a bare `YYYY-MM-DD` string (`new Date("2026-06-28")`, which `Date`
parses as UTC midnight) — the combination shifts the effective day back by one in any
positive-UTC-offset timezone. The "today" endpoints (`/today`, the SSR-rendered employee/team
initial load) are unaffected, since they pass a live `Date` object rather than a re-parsed
date string. **Recommended fix (next phase, not applied here):** parse the incoming
`YYYY-MM-DD` string as a local calendar date (e.g. `new Date(y, m-1, d)`) instead of via the
UTC-parsing `Date` string constructor, in both call sites in
`src/app/api/daily-activity/team/route.ts` and `team/[employeeId]/[date]/route.ts` (or fix it
once, centrally, inside `startOfDay`/the two route handlers' date-parsing line). This is a
pre-existing Phase W2 backend bug surfaced by Phase W3's date-filter UI, not a UI defect — no
code change was made to fix it in this verification-only phase, per the explicit "testing
only" scope.

## Phase W3.2 fix (2026-06-29)

The date-only parsing bug identified in Phase W3.1 verification is **fixed**. Scope turned out
to be slightly broader than the original report: the bug wasn't limited to the team routes'
*input* parsing — the same root cause (formatting a local-midnight `Date` via
`toISOString().slice(0, 10)`, which reads UTC components) also affected every Daily Activity
*output* date field, including `/api/daily-activity/today`'s own `date` field, on any
positive-UTC-offset server. Confirmed empirically on this IST (UTC+5:30) dev server before the
fix: wall-clock date 2026-06-29, but `/api/daily-activity/today` returned `"date":
"2026-06-28"` — one day behind, the same shift, just not checked against true wall-clock time
during W3.1 (only the team-route input/output mismatch was checked there).

- **Fix:** two new helpers in `src/lib/daily-activity.ts` —
  `parseDateOnlyAsLocalDate(dateString)` (strict `YYYY-MM-DD` regex parse → manual
  year/month/day → `new Date(year, monthIndex, day)`, with a round-trip check that rejects any
  JS `Date` roll-over so `2026-13-01`/`2026-02-30`-style invalid calendar dates throw
  `RangeError` instead of silently rolling into the next period) and `toDateKeyLocal(date)`
  (the inverse — formats using local `getFullYear`/`getMonth`/`getDate`, never
  `toISOString()`).
- **Every** `date`/`summaryDate` output field in `src/lib/daily-activity.ts` now uses
  `toDateKeyLocal` instead of `.toISOString().slice(0, 10)` —
  `getDailyActivityForEmployee`, `getDailyActivityHistoryForEmployee`,
  `getDailyActivityForManagerEmployee`, `getTeamDailyActivity`. (`cutoffTime`/`graceUntil`
  still use full `toISOString()` — correct as-is, since those are absolute timestamps, not
  date-only labels.)
- **Both team routes** (`src/app/api/daily-activity/team/route.ts`,
  `team/[employeeId]/[date]/route.ts`) now parse their `date` query/path param via
  `parseDateOnlyAsLocalDate` inside a try/catch, returning `400 Bad Request` on a malformed or
  invalid-calendar date string instead of the previous silent shift (or, for the path-param
  route, a previously-impossible-to-trigger `isNaN` check that a malformed `YYYY-MM-DD`
  string never actually fails).
- **`/api/daily-activity/today` and `/history` needed no change** — confirmed by code review:
  `today` always passes a live `new Date()`, never a re-parsed string; `history` takes an
  integer `days` count, no date-only string parsing exists there.
- **Verified via a throwaway script** (`prisma/test-daily-activity-date-parsing.ts`, deleted
  after the run — 15/15 checks passed, see `DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md` for the
  full list) and via live browser/API re-verification on the dev server: requesting
  `team?date=2026-06-28` now returns `"date": "2026-06-28"` (was `"2026-06-27"`); requesting
  `team/10/2026-06-28` now returns `"summaryDate": "2026-06-28"` (was `"2026-06-27"`);
  `/api/daily-activity/today` now returns the true wall-clock date `"2026-06-29"` (was
  incorrectly `"2026-06-28"`); all four invalid-date examples from the bug report
  (`2026-13-01`, `2026-02-30`, `2026/06/28`, `abc`) now return `400` on both team routes.
- **No schema/migration/db-push changes. No `/daily-updates` changes. No mobile changes. No
  production changes.** Employee points-hidden and manager points-visible behavior reconfirmed
  unchanged by this fix (it only touches date formatting/parsing, not the points-visibility
  type split).

## Phase W4 progress (2026-06-29)

Backend write workflows implemented on the dev DB — closes G-04's write side (summary submit/
edit, correction request/approve/reject, manager reopen). No UI write flow yet (read-only
`/daily-activity` from Phase W3 is unchanged); no schema/migration changes; no
`/daily-updates` changes; mobile remains paused; production untouched.

- **`src/lib/daily-activity.ts` extended** with: `DailyActivityError`, `evaluateSubmissionWindow`
  (shared cutoff/grace/late-window/reopen decision logic), `canSubmitDailySummary`,
  `canEditDailySummary`, `submitDailyActivitySummary`, `updateDailyActivitySummary`,
  `createDailyActivityCorrectionRequest`, `approveDailyActivityCorrectionRequest`,
  `rejectDailyActivityCorrectionRequest`, `reopenDailyActivityDay`,
  `writeDailyActivityAuditLog`, `resolveManagerAuthorizedEmployeeIds`,
  `reconcileSummaryStatusAfterCorrectionDecision` (internal). All new date-only handling uses
  `parseDateOnlyAsLocalDate`/`toDateKeyLocal` per the Phase W3.2 rule.
- **5 new write routes:** `POST/PUT /api/daily-activity/summary`,
  `POST /api/daily-activity/corrections`, `POST /api/daily-activity/corrections/[id]/approve`,
  `POST /api/daily-activity/corrections/[id]/reject`,
  `POST /api/daily-activity/day/[employeeId]/[date]/reopen`.
- **Manager authorization for the 3 write endpoints** deliberately mirrors this codebase's
  existing read-side precedent (`getTeamDailyActivity`, `/api/daily-updates`): any
  `isManager === true` employee is authorized for ALL employees, not narrowed to
  `Employee.reportsToId` — see `resolveManagerAuthorizedEmployeeIds`'s doc comment for why
  introducing reporting-line scoping only for writes would make read/write authorization
  inconsistent for the same data.
- **Bug discovered and fixed during this phase (broader than Phase W3.2):** writing a
  local-midnight `Date` into a `@db.Date` Prisma column on this MySQL/mariadb setup truncates
  it to the *previous* UTC calendar day on this IST (positive-UTC-offset) server — confirmed
  empirically. Phase W2/W3 never hit this (no existing read path re-derives a `day` from a
  DB-read `@db.Date` value and feeds it back into `startOfDay()`); Phase W4's correction
  approve/reject flow is the first code path that does. Fixed narrowly within Phase W4's new
  code via `recoverLocalDayFromDbDate` (adds back the lost UTC day before re-applying
  `startOfDay()`) — applied at the 3 call sites that re-derive a day from a DB-read value
  (`createDailyActivityCorrectionRequest`'s activityLogId ownership check, and both
  approve/reject's summary-date re-derivation). **This is a workaround, not a full fix** — the
  underlying issue (every `@db.Date` write of a local-midnight Date is one UTC day behind the
  intended local day on this server) predates Phase W4 and is broader than "backend write APIs
  only" to fix properly. Flagged as a recommended next step below and in
  `DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md`. **One live instance of this same bug was also found
  and fixed in existing Phase W2 code**: `getDailyActivityHistoryForEmployee`'s date field was
  confirmed (empirically) to return the previous day, and is now fixed the same way — see
  `DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md` for the before/after confirmation.
- **Verified via a throwaway script** (`prisma/test-daily-activity-write-workflows.ts`, deleted
  after the run) — 20/20 checks passed, all throwaway DB rows cleaned up (confirmed 0 leftover
  test employees afterward).
- **Still pending:** UI write flow (submit/edit/correction-request/approve/reject/reopen
  buttons) — explicitly out of scope for this phase. KRA rollup wiring (G-11), reporting
  (G-13), admin config (G-14) remain unstarted.

## Phase W4.1 — `@db.Date` round-trip standardization (2026-06-29)

Date-handling hardening phase, ahead of the UI write flow. No UI write buttons. No new Daily
Activity features. No `DailyUpdate` changes. No mobile changes. No schema/migration/db-push
changes. No production changes.

- **Root cause confirmed:** the Phase W4 `recoverLocalDayFromDbDate` workaround papered over a
  deeper issue — writing a **local**-midnight `Date` directly into a `@db.Date` MySQL/MariaDB
  column truncates it to the previous **UTC** calendar day on this IST (positive-UTC-offset)
  server. The workaround only patched the 3 call sites Phase W4 happened to touch; every other
  existing write (`captureDailyActivityEvent`, `recomputeDailySummary`, etc.) carried the same
  latent bug, masked because nothing had re-derived a day from those particular DB-read values
  yet.
- **Shared helper added — `src/lib/date-only.ts`:** `parseDateOnlyAsLocalDate`/`toDateKeyLocal`
  (moved here from `daily-activity.ts`, still re-exported from there for existing call sites) +
  3 new functions: `dateKeyToDbDate` (writes/queries a `@db.Date` column using **UTC**
  components — `Date.UTC(y, m-1, d)` — so the calendar day survives the round trip regardless of
  server timezone offset), `dbDateToDateKey` (reads a `@db.Date` value back via UTC components),
  `dbDateToLocalDate` (converts a DB-read value into a local-midnight `Date` for business logic).
  Single consistent strategy, documented in the module's doc comment — no more mixing
  UTC-midnight/local-midnight/ISO-formatting strategies without explicit conversion.
- **Daily Activity refactored** (`src/lib/daily-activity.ts`): every `activityDate`/
  `summaryDate` Prisma write and `where` filter now goes through `toDbDate` (a local alias for
  `localDateToDbDate`); every DB-read date re-derived back into local-logic now uses
  `dbDateToLocalDate` instead of the removed `recoverLocalDayFromDbDate`. The narrow Phase W4
  workaround is gone — replaced by the general fix at every read/write site, not just the 3 Phase
  W4 touched.
- **Non-Daily-Activity check:** audited every other `DateTime` field in `prisma/schema.prisma` —
  confirmed `activityDate`/`summaryDate`/`periodStart`/`periodEnd` (the last two on the unused
  `DailyProductivityScore` model) are the **only** `@db.Date` columns in the schema. No
  KRA/WeeklyReview/DailyUpdate/attendance/leave field uses `@db.Date` — they're plain `DateTime`,
  out of this round-trip bug's blast radius. Several `.toISOString().slice(0, 10)` call sites
  exist in Finance/Masters UI code (`src/app/finance/**`, `src/app/masters/**`) operating on
  plain `DateTime` fields or client-side "today" strings — left untouched (out of scope, no
  `@db.Date` round-trip risk) and documented as an open risk below.
- **Test script** `scripts/test-date-only-handling.mjs` — 19/19 checks passed (pure helper
  validation/leap-year/rejection tests + a real DB round trip against temporary
  `DailyActivityLog`/`DailyActivitySummary`/`Employee` rows, fully cleaned up afterward, plus
  the 3 live Daily Activity query helpers re-verified against the temp data).
- **Validation:** `npx prisma validate` ✅, `npx prisma generate` ✅, `npx tsc --noEmit` ✅ (clean),
  `npm run build` ✅ (exit 0).
- **Remaining open risk:** the Finance module's `.toISOString().slice(0, 10)` usages
  (`expenseDate`, `voucherDate`, `travelDate`, etc.) are on plain `DateTime` columns, not
  `@db.Date` — no write-side truncation risk, but they can still mis-render the *display* date
  near local midnight on a positive-UTC-offset server if the stored instant isn't local
  midnight. Not touched this phase (explicitly out of scope); flag for a future Finance-module
  date-display pass if it ever surfaces as a real symptom.

## Phase W5 progress (2026-06-29)

Connected the Phase W4 backend write workflows to the `/daily-activity` webapp UI. UI
integration only — no new API routes, no schema/migration changes, `/daily-updates` unchanged
(still live, untouched), mobile paused, production untouched.

- **Employee summary UI connected** (`EmployeeActivityView.tsx`): editable Blockers/Next-day
  plan/Final remarks fields wired to `POST`/`PUT /api/daily-activity/summary`. Uses `PUT` once
  `summaryStatus` is `CLOSED`/`LATE_SUBMITTED`/`PENDING_CORRECTION` (already submitted at least
  once), `POST` otherwise (first submit, or a manager `REOPENED` day — `submitDailyActivitySummary`
  treats reopen as a fresh resubmission window). Button disables and labels switch to "Locked"/
  "Submission not available" based on the API-returned `canSubmitSummary`/`canEditSummary` flags
  — never inferred client-side. Request body is `{ date, blockers, nextDayPlan, finalRemarks }`
  only; there is no `employeeId` field anywhere in this component's state or payload. On success,
  refetches `GET /api/daily-activity/today` + `/history` and shows a success message; points are
  never rendered (the response types have no points field to render even by mistake).
- **Employee correction request UI connected**: new "Request Correction" panel with activity
  type / source type dropdowns (sourced from a client-safe literal mirror of the backend enums —
  see below), optional source ID, and a required reason textarea. Client-side validates all
  three required fields before calling `POST /api/daily-activity/corrections`; the panel hides
  the form and shows a "Pending correction" badge once `correctionRequestStatus === "PENDING"`
  (one correction request at a time, matching the backend's one-active-request model).
- **Manager approve/reject UI connected** (`ManagerActivityPanel.tsx`): the employee/day detail
  drill-in now lists every pending correction request (see backend addition below) with its own
  Approve/Reject buttons and an optional remarks input, calling `POST /api/daily-activity/
  corrections/[id]/approve|reject`. No points input exists anywhere in this component — approved
  points are resolved entirely server-side, exactly as the API already enforced. After a
  decision, both the team table and the expanded detail panel are refetched.
- **Manager reopen UI connected**: "Reopen Day" button in the detail panel, gated behind a
  `confirm()` dialog, calls `POST /api/daily-activity/day/[employeeId]/[date]/reopen`. Only
  rendered inside the manager-only detail component — never reachable from the employee view.
- **Backend addition (additive, no schema change)**: `ManagerEmployeeDayView` gained a new
  `pendingCorrections: ManagerPendingCorrection[]` field (id/requestedActivityType/
  requestedSourceType/requestedSourceId/reason/createdAt) in `getDailyActivityForManagerEmployee`
  — the existing `hasCorrectionPending` boolean wasn't enough for the manager UI to render an
  approve/reject action without the request id. Reads existing `DailyActivityCorrectionRequest`
  columns only; never exposes `approvedPoints` (always null while PENDING).
- **Client/server bundle bug fixed during this phase**: `EmployeeActivityView.tsx` (a "use
  client" component) initially imported `DAILY_ACTIVITY_TYPES`/`DAILY_ACTIVITY_SOURCE_TYPES`
  from `@/lib/daily-activity`, which pulls in `@/lib/prisma` (server-only `mariadb` driver) —
  `npm run build` failed with "the chunking context does not support external modules
  (request: node:module)". Fixed by mirroring those two literal arrays in the already
  client-safe `src/app/daily-activity/labels.ts` as `ACTIVITY_TYPE_OPTIONS`/
  `SOURCE_TYPE_OPTIONS`, instead of importing the server module's exports.
- **Manager-panel date-string bug fixed in passing**: `ManagerActivityPanel.tsx`'s local
  `todayStr()` used `new Date().toISOString().slice(0, 10)` — exactly the banned pattern flagged
  in Phase W4.1 — replaced with `toDateKeyLocal(new Date())` from the now-shared
  `@/lib/date-only`.
- **DailyUpdate unchanged. Mobile untouched. No production deploy/restart.**
- **Browser-verified end-to-end on the dev DB** (dev quick-login, employee ↔ manager switch):
  employee submitted a summary (POST), edited it (PUT, same row updated — confirmed via the
  unique `employeeId_summaryDate` constraint, no duplicate), raised two correction requests; as
  manager, approved the first (points went 2 → 3, status reconciled `PENDING_CORRECTION` →
  `CLOSED`), reopened the day (status → `REOPENED`, points unchanged), and rejected the second
  (points stayed at 3, no log row created, status reconciled back to `CLOSED`). Points never
  appeared anywhere on the employee-logged-in view at any point; points were visible throughout
  on the manager-logged-in view.

## Phase W6 planning progress (2026-06-29)

**Planning and audit only — no code, schema, migration, `db push`, `DailyUpdate`, mobile, or
production changes.** Full document: `docs/webapp/DAILY_ACTIVITY_KRA_REPORTING_PLAN.md`.

- **Audited the existing KRA/reporting system** (via a dedicated research pass over
  `prisma/schema.prisma`, `src/lib/kra-engine.ts`, `src/app/api/kras/`, `/api/reviews/`,
  `/api/employees/[id]/reviews/`, `/api/kra-sync/`, `src/app/kras/page.tsx`,
  `src/app/employees/[id]/page.tsx`, `src/app/dashboard/page.tsx`) plus direct schema reads.
  **Key finding: two parallel KRA systems exist** — legacy `KRA`/`WeeklyReview` and enterprise
  `EmployeeProfile`/`EmployeeTarget`/`KRAAchievement`/`PerformanceReview`, mid-migration, neither
  resolved. `kra-engine.ts`'s `computeKRAProgress()` reads `LeadGeneration`/`SalesFunnel`/
  `Collection`/`Certification`/`WeeklyCommit` — **never `DailyUpdate`, `DailyActivityLog`/
  `DailyActivitySummary`, or `DailyProductivityScore`**. `DailyUpdate`'s only KRA-adjacent
  touchpoint is a display-only "recent blockers" read in the employee profile page — zero
  scoring dependency, confirmed safe to deprecate later without KRA-correctness risk.
- **Confirmed `DailyProductivityScore` re-verified unused** — fresh grep across `src/`
  (excluding generated Prisma client), zero hits in hand-written code. Schema already has
  `kraEligiblePoints`/`qualityIndicatorJson` fields clearly designed for this exact use case.
- **Identified and planned around one concrete automation gap**: `INCOMPLETE` is a documented
  valid `DailyActivitySummary.status` value (schema comment) and is referenced in
  `getTeamDailyActivity`'s counting logic and the `needsReview` flag, but **no write path in
  `src/lib/daily-activity.ts` ever assigns it** — confirmed via full-file grep. Recommended
  approach: Option D (hybrid) — a shared `resolveEffectiveStatus()` predicate computed
  dynamically at read time now, deferring a scheduled close-day job until a genuine SQL-level
  aggregation need arises (this project has no existing job-runner pattern to build one
  prematurely against).
- **KRA eligibility matrix defined** for all 7 statuses — only `CLOSED`/`LATE_SUBMITTED` count,
  `PENDING_CORRECTION` excludes the *whole* day (not just disputed points, matching the
  backend's existing whole-summary status flip), `REOPENED` excludes until resubmitted, late
  submission counts automatically (no manager-acceptance step exists today, flagged as an open
  decision if the business wants one now that this feeds a real performance number).
- **Daily/weekly/monthly rollup designs documented**, reusing `kra-engine.ts`'s existing
  ISO-week helper rather than inventing a second week-numbering scheme, and mandating
  `@/lib/date-only` for all date handling (no repeat of the Phase W4.1 `@db.Date` bug).
- **`DailyProductivityScore` recommendation: dynamic-first (Option D)** — defer snapshot writes
  until eligibility rules (§6) and the `INCOMPLETE` automation (§4) are validated against real
  usage; daily snapshots first when introduced, weekly/monthly as a `groupBy` over those.
- **Manager report plan** (daily/weekly/monthly team productivity, employee detail, KRA input,
  exceptions) and **employee report plan** (my weekly/monthly/KRA-contribution, band-only,
  no raw points — unchanged hard rule) fully specified, plus 9 future read-API designs and a
  2-job system/admin design — **none implemented this phase**.
- **`DailyUpdate` deprecation recommendation confirmed: Option B (freeze as read-only archive)
  then Option C (redirect)** — matches the source brief's own default, validated by the
  zero-KRA-dependency audit finding above.
- **9 open business decisions documented** (notably: which KRA system to feed, §17.1) — none
  resolved this phase, all gating future implementation phases explicitly.

## Phase W6.1 progress (2026-06-29)

Implements the W6 plan's §4 recommendation (Option D, dynamic-first). Status lifecycle logic
only — no KRA rollup, no KRA system wiring, no schema/migration changes, `/daily-updates`
unchanged, mobile untouched.

- **Effective status helper implemented** — `resolveEffectiveDailyActivityStatus()` in
  `src/lib/daily-activity.ts`. Read-time overlay only, never writes to the DB. Authoritative
  stored statuses (`CLOSED`/`LATE_SUBMITTED`/`REOPENED`/`PENDING_CORRECTION`) pass through
  unchanged; everything else resolves to `NO_ACTIVITY`/`SUMMARY_PENDING`/`INCOMPLETE` based on
  whether activity exists and whether the day's grace window has passed.
- **`INCOMPLETE` dynamic status gap fixed** — every read path that previously left a
  past-grace day stuck at its raw stored status (`getDailyActivityForEmployee`,
  `getDailyActivityHistoryForEmployee`, `getDailyActivityForManagerEmployee`,
  `getTeamDailyActivity`) now resolves through the effective-status predicate. Manager team
  totals (`incompleteCount`) and the `needsReview` flag now count correctly — confirmed via
  both a focused script and a live browser check (manager dashboard showed "Incomplete" + Review
  flag + correct totals for a stuck day created via temporary rows, fully cleaned up after).
- **Cutoff/grace logic centralized** — new `getDailyActivityCutoffWindow(day)`,
  `isPastGraceWindow(day, now)`, `isWithinSummarySubmissionWindow(day, now)`. Removed the
  duplicated inline `new Date(day); .setHours(...)` cutoff/grace computation previously repeated
  in `getDailyActivityForEmployee` and `evaluateSubmissionWindow` — both now share one
  `isPastGraceWindow` predicate, so they can never silently drift relative to each other.
- **No scheduled job added** — per the plan's explicit recommendation, the Option-B close-day
  job remains deferred; this phase is display-only, matching "no job-runner pattern exists in
  this project yet, so do not add one now."
- **KRA wiring still pending** — `isDailyActivityKraEligible()`/
  `getDailyActivityKraEligibilityReason()` added as pure, unwired placeholder helpers (per the
  W6 plan §6 eligibility matrix: `CLOSED`/`LATE_SUBMITTED` eligible, everything else not).
  Neither calls any KRA engine; the legacy-vs-enterprise KRA system decision (W6 plan §17.1)
  remains unresolved and unaddressed by this phase.
- **UI**: `EmployeeActivityView.tsx`'s summary-form lock message now explicitly explains the
  `INCOMPLETE` case ("ask your manager to reopen it") rather than the generic "submission
  window closed" text. No new features, no KRA reports, no badge/label changes needed — `labels.ts`
  already had an `INCOMPLETE` → "Incomplete" / danger-variant mapping from Phase W3.
- **Test script** `scripts/test-daily-activity-status-lifecycle.mjs` — 19/19 checks passed
  (12 pure-predicate/KRA-eligibility/date-only-regression checks + 7 live-DB integration checks
  against temporary rows, fully cleaned up afterward).
- **Validation:** `npx prisma validate` ✅, `npx prisma generate` ✅, `npx tsc --noEmit` ✅,
  `npm run build` ✅ (exit 0).

## Phase W6.2 progress (2026-06-29) — KRA direction decided; Daily Updates retirement started

**KRA direction decided: Enterprise KRA only.** §17.1 ("which KRA system should Daily Activity
feed — legacy `KRA`/`WeeklyReview` or enterprise `EmployeeProfile`/`EmployeeTarget`") is closed:
all future KRA development uses `EmployeeProfile`/`EmployeeTarget`/`KRAAchievement`/
`PerformanceReview` only. Legacy `KRA`/`WeeklyReview` and `src/lib/kra-engine.ts` are now
historical/read-only — they keep serving existing data/UI but must not receive new feature
logic (guardrail comment added to the top of `src/lib/kra-engine.ts`). No Enterprise KRA write
wiring was implemented this phase — direction-setting + Daily Updates retirement only. See
`docs/PROJECT_MEMORY.md` "2026-06-29" and `docs/webapp/DAILY_ACTIVITY_KRA_REPORTING_PLAN.md`
§17.1 for the decision record.

**Daily Updates retirement started.** Per the §2 audit above (one cross-feature dependency:
the employee-profile blockers widget; no KRA/reporting coupling), the feature has been retired
from active use this phase. The `DailyUpdate` Prisma model/table and its data are **preserved
untouched** — no migration, no `db push`, no drop.

### Daily Updates Usage Audit

| Usage | File | Current behavior (before this phase) | Retirement action |
|---|---|---|---|
| Desktop page (CRUD UI) | `src/app/daily-updates/page.tsx` | Server component fetching `employees` + up to 100 `DailyUpdate` rows, rendering `DailyUpdatesClient` for full add/edit/delete | Replaced with `redirect("/daily-activity")` — old CRUD UI no longer reachable |
| Desktop client component | `src/app/daily-updates/DailyUpdatesClient.tsx` | Filter bar, "+ Add Update" modal, card list with inline Edit/Del per row | Deleted — no longer imported by anything once the page redirects |
| List/create API | `src/app/api/daily-updates/route.ts` | `GET` (self/manager-scoped list), `POST` (create, manager-can-submit-for-another-employee) | All methods now return `410 Gone` with `{"error":"Daily Updates has been retired. Use Daily Activity instead.","redirectTo":"/daily-activity"}`; no rows created |
| Update/delete API | `src/app/api/daily-updates/[id]/route.ts` | `PUT`/`DELETE`, ownership-checked (`employeeId === session.user.employeeId \|\| isManager`) | All methods now return `410 Gone` (same body as above); no rows modified/deleted |
| Sidebar nav (Manager/Employee/Accounts groups) | `src/components/SidebarLinks.tsx` | "Daily Updates" link to `/daily-updates` shown in 3 nav-group definitions, alongside "Daily Activity" | Removed all 3 "Daily Updates" entries; "Daily Activity" entries kept; now-unused `Activity` icon import removed |
| Employee profile "recent blockers" widget | `src/app/employees/[id]/page.tsx` (~line 93) | `prisma.dailyUpdate.findMany({ where: { employeeId, blockers: { not: "" } }, orderBy: { date: "desc" }, take: 5 })` | Repointed to `prisma.dailyActivitySummary.findMany({ where: { employeeId, blockers: { not: "" } }, orderBy: { summaryDate: "desc" }, take: 5 })` — same RBAC (page already gates manager-or-self), same `[0].blockers` JSX read shape |
| Settings hub tile | `src/app/settings/SettingsHub.tsx` | "Daily Updates" tile in the People section, `href: "/daily-updates"` | Repointed to `/daily-activity`, relabeled "Daily Activity" — no separate Daily Activity tile existed yet, so the tile now points at the active feature instead of leaving a dead link |
| Dashboard "Add your update" link | `src/app/dashboard/DashboardClient.tsx` (Weekly Commits empty state) | `<Link href="/daily-updates">Add your update →</Link>` | Repointed to `/daily-activity` |
| Topbar breadcrumb label map | `src/components/Topbar.tsx` | `{ prefix: "/daily-updates", label: "Daily Updates" }` | Label changed to "Daily Updates (retired)" (route still exists as a redirect target momentarily); added a `/daily-activity` → "Daily Activity" entry |
| Mobile `DailyUpdatesScreen.tsx`, `MobileApp.tsx`, `mock-data.ts`, `HomeScreen.tsx` | `src/app/mobile/**` | Reads/displays Daily Updates-shaped data in the mobile web app | **Not touched** — explicitly out of scope per this phase's strict rules (no mobile changes); flagged here only as a known remaining surface for a future mobile-scoped phase |
| `DailyUpdate` Prisma model | `prisma/schema.prisma` | Model definition, `Employee.dailyUpdates` relation | **Not touched** — preserved exactly as-is; no migration, no `db push`, historical data intact |

**Files now fully dead and removed:** `src/app/daily-updates/DailyUpdatesClient.tsx` (was only
imported by `src/app/daily-updates/page.tsx`, which no longer imports it after the redirect
swap). No other Daily-Updates-specific component files were found to be orphaned — the page,
API routes, and Prisma model itself are intentionally kept (redirect/410/historical-data
respectively, not deletable).

**Remaining gap (deliberately out of scope, flagged not fixed):** the mobile app
(`src/app/mobile/screens/DailyUpdatesScreen.tsx` and related mock data/home-screen references)
still presents Daily Updates as a live feature. Per this phase's strict rule ("do NOT modify
anything under `src/app/mobile`"), this was left untouched. A future mobile-scoped phase should
either point the mobile screen at Daily Activity data or retire it the same way, once mobile
changes are in scope.

---

## Phase W6.2 progress (2026-06-29) — Enterprise KRA decision + Daily Updates retirement

- **KRA direction decided: Enterprise KRA only.** Closes Phase W6 plan §17.1 (legacy vs.
  enterprise KRA target). All future KRA development uses `EmployeeProfile`/`EmployeeTarget`/
  `KRAAchievement`/`PerformanceReview`. Legacy `KRA`/`WeeklyReview`/`src/lib/kra-engine.ts` is
  now historical/read-only. No Enterprise KRA write-path wiring was implemented this phase. See
  `docs/PROJECT_MEMORY.md` "Phase W6.2" and `docs/webapp/DAILY_ACTIVITY_KRA_REPORTING_PLAN.md`
  §17.1.
- **Daily Updates active feature retirement started (and completed for this phase's scope).**
  Daily Activity is now the sole active workflow; Daily Updates is retired from active
  entry/CRUD/productivity/reporting/KRA use. `DailyUpdate` Prisma model/table and existing rows
  are preserved untouched — no schema change, no migration, no `db push`. Mobile and production
  untouched.

### Daily Updates Usage Audit

| Usage | File | Current behavior | Retirement action |
| ----- | ---- | ----------------- | ------------------ |
| Page (employee/manager CRUD) | `src/app/daily-updates/page.tsx` | Was a server component rendering full CRUD UI via `DailyUpdatesClient` | Reduced to a single `redirect("/daily-activity")` — old CRUD UI no longer reachable |
| Page client component | `src/app/daily-updates/DailyUpdatesClient.tsx` | 266-line client CRUD UI (filters, add/edit form, table) | Deleted — unused after the page-level redirect, no remaining imports |
| API — list/create | `src/app/api/daily-updates/route.ts` (`GET`, `POST`) | Read/wrote `DailyUpdate` rows | Both methods now return `410 Gone` with `{ error: "Daily Updates has been retired. Use Daily Activity instead.", redirectTo: "/daily-activity" }`; no rows read or created |
| API — update/delete | `src/app/api/daily-updates/[id]/route.ts` (`PUT`, `DELETE`) | Updated/deleted `DailyUpdate` rows | Both methods now return the same `410 Gone` payload; no rows updated or deleted |
| Sidebar nav | `src/components/SidebarLinks.tsx` (`MANAGER_GROUPS`, `EMPLOYEE_GROUPS`, `ACCOUNTS_GROUPS`) | "Daily Updates" link alongside "Daily Activity" in all three role-based nav sets | "Daily Updates" entries removed from all three groups; "Daily Activity" retained |
| Topbar breadcrumb label | `src/components/Topbar.tsx` (`PATH_LABELS`) | `/daily-updates` prefix mapped to "Daily Updates" | Kept as "Daily Updates (retired)" only so the breadcrumb is sane for the brief moment mid-redirect; `/daily-activity` added as its own entry |
| Settings hub tile | `src/app/settings/SettingsHub.tsx` | Tile linked to `/daily-updates` | Tile now links to `/daily-activity` (label/description already said "Daily Activity") |
| Dashboard "no commits" CTA | `src/app/dashboard/DashboardClient.tsx` | "Add your update →" linked to `/daily-updates` | Link now points to `/daily-activity` |
| Employee profile — recent blockers | `src/app/employees/[id]/page.tsx` | Queried `prisma.dailyUpdate.findMany(...)` for the profile's "recent blockers" panel | Replaced with `prisma.dailyActivitySummary.findMany({ where: { employeeId, blockers: { not: "" } }, orderBy: { summaryDate: "desc" }, take: 5 } })`; same existing manager-or-self page gating reused, no RBAC change |
| Doc-only historical-precedent comments | `src/lib/daily-activity.ts` (~line 700, ~line 1259) | Cite `/api/daily-updates` as precedent for the "isManager sees ALL employees" authorization pattern | Left unchanged — these are explanatory comments about a past API's behavior, not a functional dependency on `DailyUpdate`; no action needed |
| Prisma model/table | `prisma/schema.prisma` `DailyUpdate` model, underlying DB table | Stores all historical Daily Updates rows | Untouched — no schema edit, no migration, no `db push`, no row mutation. Data fully preserved for historical reference |
| Mobile | `src/app/mobile/screens/DailyUpdatesScreen.tsx`, `src/app/mobile/MobileApp.tsx`, `src/app/mobile/mock-data.ts`, `src/app/mobile/screens/HomeScreen.tsx` | Mobile web app has its own Daily Updates screen (separate from the desktop page) | **Not touched** — out of scope per explicit instruction ("do not modify mobile" / "do not modify `/mobile`") |

No test files or other documentation files referenced `DailyUpdate`/`/daily-updates` beyond what's listed above.

---

## Phase W7 — Enterprise KRA integration planning (progress)

- **Enterprise KRA integration plan created:**
  `docs/webapp/DAILY_ACTIVITY_ENTERPRISE_KRA_INTEGRATION_PLAN.md` (audit + mapping + design only).
- **Direction confirmed:** Enterprise KRA only; legacy KRA/`WeeklyReview`/`kra-engine.ts`
  historical/read-only. Daily Updates remains retired (no revival, no new `DailyUpdate` dependency).
- **Key audit finding:** Daily Activity can feed Enterprise KRA with **no schema change** — uses
  existing `KRAMetric.calculationSource`, `KRAAchievement.sourceReference`, JSON config blobs, and
  the existing `performance-engine/achievement.ts` write path (precedent: `/api/kra/sync-achievements`).
- **Recommended approach:** Option D — read-only monthly preview → manager-approved conversion to
  `KRAAchievement`. No KRA writes, schema, migration, mobile, or production changes this phase.
- **Next:** W8 admin mapping setup (config only) — see integration plan §16.

---

## Phase W8 — Enterprise KRA Daily Activity mapping setup (progress)

- **Implemented (config only):** `KRAMetric` mapping records with
  `calculationSource="DAILY_ACTIVITY"` (3 defaults: COVERAGE, PRODUCTIVITY, COMPLIANCE), an
  idempotent default-setup action, manager-gated admin API
  (`/api/admin/performance/daily-activity-mapping`), and a "Daily Activity KRA" admin tab under
  `/settings/performance` with the explicit "does not write achievements" warning.
- **No** `KRAAchievement`/`PerformanceReview`/`EmployeeTarget` writes; **no** schema change;
  **no** migration; **no** convert-to-achievement button.
- Legacy KRA/`WeeklyReview` untouched; Daily Updates remains retired; mobile/production untouched.
- **Next:** W9 read-only preview APIs (employee/manager), then W10 manager-approved conversion.

---

## Phase W8.1 — KRA mapping UI usability correction (progress)

- **Raw JSON removed** from the Daily Activity KRA mapping UI; replaced with form controls
  (dropdowns, checkboxes, toggles, number fields). `formulaJson` is internal-only; GET returns a parsed
  `config`, PUT accepts a business `config` payload.
- **Engine mappers added**: `parseDailyActivityMetricConfig`, `buildDailyActivityMetricFormulaJson`,
  `validateDailyActivityMetricFormPayload`.
- **Employee Targets** now assign **by employee name** (no raw profile IDs), show role/department/manager,
  and present role templates as a **starting point** only. Engine: `listEmployeeProfilesForTargeting()` +
  enriched `listEmployeeTargets` include.
- Still config-only: **no** `KRAAchievement`/`PerformanceReview`/`EmployeeTarget` automation; no schema/
  migration; legacy KRA untouched; Daily Updates retired; mobile/production untouched.

## Phase W8.2 — Employee-wise KPI target assignment (progress)

- **Implemented per-KPI employee targets.** Each `EmployeeTarget` now stores per-KPI rows in
  `targetJson` (no schema change): `targetValue`, `weight`, `frequency`, `source`, `unit`, `category`,
  `isActive`, `notes`. Two employees on the same template can carry different targets.
- **Engine** (`performance-engine/targets.ts`): `buildTargetRowsFromTemplate`,
  `applyTemplateToEmployeeTarget`, `saveEmployeeTargetRows`, `getEmployeeTargetDetail`,
  `parseEmployeeTargetJson`, `validateTargetRows`.
- **API:** `/api/admin/performance/employee-targets` (GET list), `[id]` (GET detail + PUT save),
  `apply-template` (POST, single target). Business rows in/out — never raw JSON.
- **UI** (`TargetManager.tsx`): **Edit KPIs** panel with template dropdown + Apply Template, editable
  KPI table, total-weight warning, Save. No JSON textarea, no raw employee ID.
- **Audit:** `employee_target_template_applied` / `employee_target_updated` via `PerformanceAudit`.
- **Still isolated:** no `KRAAchievement`/`PerformanceReview` writes; no legacy KRA/WeeklyReview; no
  schema/migration; Daily Updates retired; mobile/production untouched.

## Phase W8.3 — Performance Audit visibility (progress)

- **Closed the W8.2 audit-visibility gap.** Added read-only `GET /api/admin/performance/audit`
  (admin/manager only) returning business-friendly rows; wired the Performance **Audit tab** to it.
- **Engine:** `listPerformanceAuditDetailed()` resolves actor/subject names and friendly labels/
  summaries via batched lookups; `logPerformanceAudit` writer untouched (append-only).
- **UI** (`PerformanceAudit.tsx`): Time · Action · Entity · Employee · Performed By · Summary, with
  Action/Entity/Employee/Date filters. Friendly labels; no raw JSON.
- **Verified:** 401 unauthenticated, 403 non-manager, 200 manager; `employee_target_*` and Daily
  Activity mapping events visible with names. Read-only (GET only).
- **Still isolated:** no `KRAAchievement`/`PerformanceReview` writes; no schema/migration; legacy KRA
  untouched; Daily Updates retired; mobile/production untouched.

## Phase W8.4 — Read-only KRA target visibility (progress)

- **Employees can now view their assigned KPI targets** at `/performance/my-targets` (self-scoped),
  and **managers can view team targets** (read-only section on the same page + admin endpoint).
- **Engine** (read-only): `getMyAssignedKraTargets`, `getEmployeeAssignedKraTargets`,
  `getManagerTeamAssignedKraTargets`, `listAssignedKraTargetsGrouped` — parse `targetJson` into
  business KPI rows, no raw JSON.
- **APIs:** `GET /api/performance/my-targets` (employee self, no id override) and
  `GET /api/admin/performance/team-targets` (manager/admin, grouped by employee, filters).
- **UI:** `/performance/my-targets` page (read-only table KPI/Category/Source/Unit/Target/Weight/
  Frequency/Status) + manager team section; "My KRA Targets" sidebar link.
- **Verified:** employee sees only own targets; `?employeeProfileId=` override ignored; employee gets
  403 on admin endpoints; manager sees grouped team data; no edit controls; no raw JSON/IDs.
- **Still isolated:** no `KRAAchievement`/`PerformanceReview` writes; no schema/migration; legacy KRA
  untouched; Daily Updates retired; mobile/production untouched.

## Phase W9 — Read-only Enterprise KRA achievement preview (progress)

- **Implemented read-only achievement preview** from assigned `EmployeeTarget` KPI rows.
  `achievement-preview.ts` engine + 3 read-only APIs (employee self / manager / exceptions).
- **Daily Activity** metrics computed dynamically (coverage %, productivity, compliance days) via the
  shared effective-status helpers; unsupported sources → `NOT_IMPLEMENTED`.
- **UI:** preview section on `/performance/my-targets` (employee + manager team), month filter, status
  bands, no edit/convert buttons, no raw JSON/IDs. Employee view redacts raw Daily Activity points.
- **Verified:** endpoints 200; employee self-scoped (override ignored) + 403 on admin; DA calc correct
  on real data (reopened day excluded); no achievement/review writes.
- **Still isolated:** no `KRAAchievement`/`PerformanceReview`/`EmployeeTarget`/`KRAMetric`/`DailyActivity`
  writes; no schema/migration; legacy KRA untouched; Daily Updates retired; mobile/production untouched.

## Phase W9.1 — CRM Leads qualified-lead preview (progress)

- **Wired CRM_LEADS into the achievement preview** — qualified-lead count computed from
  `DailyActivityLog` `QUALIFIED_LEAD_CREATED` events (event date + employee attribution preserved).
- Engine: `buildCrmLeadsContext`, `calculateCrmLeadsKpiPreview`, `isQualifiedLeadsMetric`,
  `PreviewSourceContexts`. Achievement = actual ÷ target × 100 (cap 200).
- Behaviour: qualified-lead → IMPLEMENTED; missing/zero target → CONFIG_REQUIRED/NEEDS_REVIEW; other
  CRM_LEADS metric → NOT_IMPLEMENTED. Exceptions add CRM_LEADS_UNSUPPORTED_METRIC /
  CRM_LEADS_TARGET_MISSING / CRM_LEADS_MISSING_EMPLOYEE_MAPPING.
- **Verified:** qualified count 1/5 = 20% BELOW_TARGET IMPLEMENTED; unsupported metric NOT_IMPLEMENTED;
  self-scoped; employee 403 on admin; DA preview unchanged; no achievement/review writes.
- **Still isolated:** no `KRAAchievement`/`PerformanceReview`/`EmployeeTarget`/`KRAMetric`/`DailyActivity`
  writes; no schema/migration; legacy KRA untouched; Daily Updates retired; mobile/production untouched.

## Phase W9.2 — CRM Meetings / Opportunity / Pipeline preview (progress)

- **Wired CRM_MEETINGS, CRM_OPPORTUNITY, CRM_PIPELINE** into the achievement preview, each limited to
  the metrics with a reliable capture path (see the Task 1 audit table in
  `DAILY_ACTIVITY_ENTERPRISE_KRA_INTEGRATION_PLAN.md` Phase W9.2).
- **CRM_MEETINGS:** "Meetings Scheduled" from `DailyActivityLog` `MEETING_SCHEDULED` events (reliable —
  `POST /api/pipeline/meetings` captures every meeting). "Meetings Completed" → NOT_IMPLEMENTED (no
  route ever sets `CrmMeeting.status = COMPLETED`; confirmed by grepping every `crmMeeting.update*`
  call site — none exist).
- **CRM_OPPORTUNITY:** "Opportunities Created" (count) + "Opportunity Value" (₹ sum via
  `moneyToNumberForDisplay`) from `createdAt`; "Opportunities Won" (count) from `stage="WON"` +
  `poDate`. Attribution via `lead.assignedToId` (Opportunity has no employee field). "Stage Progress"
  → NOT_IMPLEMENTED (no transition-history table).
- **CRM_PIPELINE:** "Proposals Sent" from `DailyActivityLog` `PROPOSAL_SENT` events (reliable despite
  proposal versioning still being a known gap — the sent EVENT is captured, not the version). "Pipeline
  Value" = current open (non-Won/non-Lost) opportunity value snapshot — explicitly documented as
  distinct from CRM_OPPORTUNITY's period-created value, not duplicated silently. "Won Deals"/"Stage
  Movement" → NOT_IMPLEMENTED (won-deals maps to CRM_OPPORTUNITY instead; no stage-transition history).
- Engine: `buildCrmMeetingsContext`/`calculateCrmMeetingsKpiPreview`, `buildCrmOpportunityContext`/
  `calculateCrmOpportunityKpiPreview`, `buildCrmPipelineContext`/`calculateCrmPipelineKpiPreview`.
  `PreviewSourceContexts` extended with the 3 new context fields, built once per target only when a
  KPI row uses that source.
- Exceptions: adds `CRM_MEETINGS_UNSUPPORTED_METRIC`/`CRM_MEETINGS_COMPLETION_SOURCE_MISSING`/
  `CRM_MEETINGS_TARGET_MISSING`/`CRM_MEETINGS_MISSING_EMPLOYEE_MAPPING`,
  `CRM_OPPORTUNITY_UNSUPPORTED_METRIC`/`CRM_OPPORTUNITY_MISSING_MAPPING`/
  `CRM_OPPORTUNITY_TARGET_MISSING`, `CRM_PIPELINE_UNSUPPORTED_METRIC`/
  `CRM_PIPELINE_PROPOSAL_SOURCE_MISSING`/`CRM_PIPELINE_MISSING_EMPLOYEE_MAPPING`/
  `CRM_PIPELINE_TARGET_MISSING`. All three sources excluded from the blanket `SOURCE_NOT_IMPLEMENTED`
  (handled per-KPI, same pattern as CRM_LEADS).
- **Verified against real dev data** (throwaway read-only script, no writes, deleted after use):
  `buildCrmOpportunityContext` returned real counts/values for 3 employees with dev Opportunity data
  (e.g. 10 created / ₹84.1L created value / 1 won for one employee); `buildCrmMeetingsContext` /
  `buildCrmPipelineContext` correctly returned 0 scheduled-meeting / proposal-sent counts (no
  `MEETING_SCHEDULED`/`PROPOSAL_SENT` DailyActivityLog events exist yet in dev data — expected, not a
  bug) while `openPipelineValue` correctly summed non-Won/non-Lost opportunity value. Row-level
  calculator smoke tests confirmed: scheduled-meeting KPI → IMPLEMENTED/ON_TRACK; completed-meeting KPI
  → NOT_IMPLEMENTED with the exact required note; opportunity value → IMPLEMENTED/BELOW_TARGET;
  opportunity stage-progress → NOT_IMPLEMENTED; proposals-sent → IMPLEMENTED/ON_TRACK; won-deals (under
  CRM_PIPELINE) → NOT_IMPLEMENTED pointing to CRM_OPPORTUNITY. `npx tsc --noEmit` and `npm run build`
  both clean.
- **Still isolated:** no `KRAAchievement`/`PerformanceReview`/`EmployeeTarget`/`KRAMetric`/`DailyActivity`/
  `CrmMeeting`/`CrmOpportunity` writes; no schema/migration; legacy KRA untouched; Daily Updates
  retired; mobile/production untouched.
- **Remaining source gaps:** FINANCE_COLLECTION and MANUAL are still fully NOT_IMPLEMENTED;
  opportunity/pipeline stage-progress and pipeline won-deals remain NOT_IMPLEMENTED pending a reliable
  capture source. (Meetings-completed was closed in Phase W9.3 below.)

## Phase W9.3 — CRM Meeting completion workflow + Meetings Completed preview (progress)

- **Added a controlled meeting-completion workflow**, closing the one preview gap left open by W9.2:
  `PATCH /api/pipeline/meetings/[id]` (new route) accepts ONLY `{ status }` (SCHEDULED/COMPLETED/
  CANCELLED/RESCHEDULED, validated against an enum — 400 on anything else). Mirrors the existing
  `PATCH /api/pipeline/tasks/[id]` guarded-transition + Daily Activity capture pattern. RBAC: meeting
  owner (`employeeId`) or manager, else 403 — same pattern as tasks/leads.
- **Daily Activity capture:** `MEETING_COMPLETED` (4 points) fires only on
  `prevStatus !== COMPLETED && newStatus === COMPLETED` — never on an already-COMPLETED re-save, never
  for `SCHEDULED → CANCELLED`/`CANCELLED → RESCHEDULED`. Extra guard: skips capture if a
  `MEETING_COMPLETED` log already exists for that meeting id (`sourceType`/`sourceId`), so a meeting
  reopened and completed again does NOT double-count (recommended default; the DailyActivityLog
  unique constraint alone only blocks same-day duplicates, not across days).
- **UI:** `LeadDetailClient.tsx` Meetings tab — status badge + Mark Completed (confirm-dialog) /
  Reschedule / Cancel actions, gated to owner/manager, hidden once COMPLETED/CANCELLED.
  `OppDetailClient.tsx`'s read-only meeting summary also shows the status badge. No mobile changes; no
  Enterprise KRA write action.
- **Preview:** `achievement-preview.ts` — `CrmMeetingsContext` gained `completedCount`;
  `buildCrmMeetingsContext` now counts both `MEETING_SCHEDULED` and `MEETING_COMPLETED` events;
  `calculateCrmMeetingsKpiPreview` returns `sourceStatus: IMPLEMENTED` for completed-meetings KPIs
  (actual = 0 when none exist yet, not an error).
- **Exceptions:** removed `CRM_MEETINGS_COMPLETION_SOURCE_MISSING` (no longer reachable); Meetings
  Completed no longer reported as unsupported; zero completed meetings is not an exception by itself.
- **Verified** via a throwaway script (test `CrmMeeting` created, driven through the same
  transition-guard logic as the route, then deleted): 1st completion captured `MEETING_COMPLETED` with
  4 points; 2nd completion (re-save) correctly skipped; a separate `SCHEDULED → CANCELLED` test meeting
  produced zero `MEETING_COMPLETED` logs; `buildCrmMeetingsContext`/`calculateCrmMeetingsKpiPreview`
  correctly returned `completedCount: 1` / `sourceStatus: IMPLEMENTED`. `npx tsc --noEmit` and
  `npm run build` both clean.
- **Still isolated:** no `KRAAchievement`/`PerformanceReview`/`EmployeeTarget`/`KRAMetric` writes; no
  schema/migration/db push; legacy KRA/WeeklyReview untouched; Daily Updates retired; mobile/production
  untouched.
- **Remaining gaps:** opportunity/pipeline stage-progress and pipeline won-deals still NOT_IMPLEMENTED
  (no transition-history source); FINANCE_COLLECTION/MANUAL still fully NOT_IMPLEMENTED.

## Phase W10 — Manager-approved KRAAchievement conversion (progress)

- **Implemented explicit, manager-only conversion** of the read-only Phase W9 preview into real
  `KRAAchievement` rows. No automatic conversion anywhere — every write is triggered by a manager
  clicking "Convert / Approve" in the UI (or an equivalent explicit API call).
- **New engine** (`achievement-conversion.ts`): `buildSourceReference`, `validatePreviewForConversion`
  (buckets a KPI row OK/UNSUPPORTED/NEEDS_REVIEW), `findExistingConvertedAchievements`,
  `convertPreviewToKraAchievements` (core), `convertEmployeePreviewToAchievements` (fetch-then-convert
  wrapper via the Phase W9 preview engine), `writePerformanceAuditForConversion`. Reuses
  `achievement.ts`'s existing `calculateWeightedScore` for consistency with the preview's own %-cap
  convention. `TargetPreview` (achievement-preview.ts) gained `rangeStart`/`rangeEnd` so conversion
  can build a stable sourceReference from the EXACT range each target's KPIs were computed over.
- **New API:** `POST /api/admin/performance/achievement-preview/convert` — manager/admin only, same
  gate as the read-only preview APIs. `employeeProfileId` required; `mode` (CREATE_ONLY default |
  REPLACE_EXISTING); optional period override + remarks. Returns created/replaced/skipped/unsupported/
  needsReview counts + a per-row outcome/reason array.
- **Idempotency:** `sourceReference` format `enterprise-preview:{SOURCE}:{employeeProfileId}:
  {rangeStart}:{rangeEnd}:{metricCode}`, enforced entirely in application code (no schema change, no
  DB unique constraint). CREATE_ONLY skips already-converted rows; REPLACE_EXISTING updates only the
  exact-matching row.
- **UI:** manager-only "Convert to KRA Achievement" button per direct report on the Team KRA Preview →
  confirmation modal (mode + remarks) → result summary panel (counts + per-row reasons) → auto-
  refreshes the preview. Employee's own preview view unchanged — no conversion affordance.
- **Audit:** one `PerformanceAudit` row per conversion call (`enterprise_kra_conversion` /
  `enterprise_kra_preview_converted`), with friendly labels added to `audit.ts` so it renders in the
  existing Performance Audit tab.
- **Verified** end-to-end with real dev data + full cleanup (no lasting writes): dev data currently has
  only one `EmployeeTarget` row with properly-structured target JSON, and it uses `MANUAL` source only
  — so the write path was exercised with a fabricated in-memory preview against a REAL `EmployeeTarget`
  FK and a TEMPORARY `KRAMetric` row (both fully cleaned up after). Confirmed: 1st CREATE_ONLY →
  created=1/skipped=2 (1 unsupported, 1 needsReview); 2nd CREATE_ONLY → created=0/skipped=3 (idempotent);
  3rd REPLACE_EXISTING → replaced=1/created=0 (same achievement id reused); 3 PerformanceAudit rows
  written; the underlying EmployeeTarget row's `updatedAt`/`targetJson` were byte-for-byte unchanged
  throughout. `npx tsc --noEmit` and `npm run build` both clean (new convert route present in the
  build's route list).
- **Still isolated:** no `PerformanceReview`/`EmployeeTarget`/`KRAMetric`/`DailyActivity` writes; no
  schema/migration/db push; legacy KRA/WeeklyReview untouched; Daily Updates retired; mobile/production
  untouched.
- **Remaining gaps:** dev data has almost no properly-structured (Phase W8.2 JSON) `EmployeeTarget`
  rows yet — real end-to-end conversion in the UI needs actual target assignment with IMPLEMENTED-
  source KPIs and matching `KRAMetric` rows to be meaningfully exercised beyond this phase's synthetic
  test. `PerformanceReview` creation, opportunity/pipeline stage-progress, pipeline won-deals, and
  FINANCE_COLLECTION/MANUAL previews remain out of scope / NOT_IMPLEMENTED.
