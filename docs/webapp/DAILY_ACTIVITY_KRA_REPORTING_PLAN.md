# Daily Activity → KRA/Reporting Integration Plan (Phase W6)

> **Status: PLANNING ONLY.** No code, schema, migration, `db push`, `DailyUpdate`, mobile, or
> production changes were made in this phase. Every API/UI section below is a design for a
> *future* phase — none of it has been implemented yet. See §19 for the explicit
> no-production confirmation.

---

## 1. Executive Summary

Daily Activity (Phases W1–W5) now has a complete, working write surface: employees submit
end-of-day summaries and correction requests; managers approve/reject corrections and reopen
days; the webapp UI is connected end-to-end. What does **not** exist yet is any link from this
system into the company's actual performance-management surface — KRA/`WeeklyReview` scoring,
manager reporting, or the employee's own historical productivity view beyond a 14-day strip.

This phase is a planning audit, not a build. It establishes:
- exactly what the existing KRA/reporting system does today, and that it has **no dependency on
  Daily Activity or `DailyUpdate`** to disturb (§2);
- the one concrete automation gap in the Daily Activity status lifecycle — `INCOMPLETE` is a
  documented status that no code path ever assigns (§3, §4);
- a KRA eligibility matrix that operationalizes the existing project rule ("only `CLOSED` days
  count") into a per-status table (§6);
- daily/weekly/monthly rollup designs, decided in terms of the schema that already exists
  (`DailyProductivityScore`) but is unused (§7–§9);
- manager- and employee-facing report designs (§11–§12);
- a full set of *future* read-API and UI specs, explicitly not implemented this phase (§13–§14);
- a `DailyUpdate` deprecation path that does not touch it yet (§15);
- a phased implementation order (§16), the open business decisions that block it (§17), and the
  risks/safeguards to carry forward (§18).

The single most important finding from the audit (§2) is that **there are two parallel,
partially-overlapping KRA systems in this codebase** (legacy `KRA`/`WeeklyReview` and the newer
enterprise `EmployeeProfile`/`EmployeeTarget`/`KRAAchievement` stack — see the existing
`docs/Architecture Alignment Plan` memory). Any Daily Activity → KRA wiring must pick one,
explicitly, before writing code — this is the first open decision in §17.

---

## 2. Current KRA/Reporting Audit

Audited via direct schema/code reads plus a dedicated research pass (Explore agent) over
`prisma/schema.prisma`, `src/lib/kra-engine.ts`, `src/app/api/kras/`, `src/app/api/reviews/`,
`src/app/api/employees/[id]/reviews/`, `src/app/api/kra-sync/`, `src/app/kras/page.tsx`,
`src/app/employees/[id]/page.tsx`, and `src/app/dashboard/page.tsx`.

### 2.1 Two KRA systems exist side by side

| | Legacy | Enterprise |
|---|---|---|
| Core model | `KRA` (title/description/target/deadline/weight/status) | `EmployeeProfile` → `EmployeeTarget` (per `PerformancePeriod`, JSON `targetJson`, optional `KRATemplate`) |
| Progress/score record | `WeeklyReview` (week, year, progress 0–100, score 1–10, notes, blockers) | `KRAAchievement` (per `KRAMetric`, `actualValue`, `achievementPct`, `weightedScore`, `sourceReference`) |
| Review/approval | none (no status field on `WeeklyReview`) | `PerformanceReview` (selfRating/managerRating/finalRating, `status` DRAFT/…) |
| Read by | `src/app/kras/page.tsx` (fallback path), `src/app/dashboard/page.tsx` (team KRA average), `src/app/employees/[id]/page.tsx` | `src/app/kras/page.tsx` (primary path, when an active `EmployeeTarget` exists) |
| Write today | `POST/PUT /api/employees/[id]/reviews`, `/api/reviews/[id]`, `/api/kra-sync` (auto-compute) | not audited in depth this phase (out of scope — flagged as open decision, §17.1) |

`src/app/kras/page.tsx`'s own header comment confirms this directly: *"Changed to read
EmployeeTarget (new enterprise system) instead of legacy KRA model... Fallback: if no
EmployeeTarget exists, still show legacy KRA (backward compatibility during transition)."*
The migration from legacy → enterprise is itself mid-flight and unresolved.

### 2.2 How a KRA score is produced today

Two paths, **neither involving an approval workflow**:

1. **Manual entry** — `POST /api/employees/[id]/reviews` or `PUT /api/reviews/[id]` accepts an
   explicit `progress`/`score` from the caller and writes it directly. No `status` field exists
   on `WeeklyReview` to gate this (no DRAFT/PENDING/APPROVED states).
2. **Auto-compute** — `POST /api/kra-sync` calls `computeKRAProgress()` in `src/lib/kra-engine.ts`,
   which pattern-matches each KRA's `title` against a hardcoded set of formulas (e.g. "Sales
   Revenue" = 37.5% booking + 37.5% billing + 12.5% GP + 12.5% collections, sourced from
   `SalesFunnel`/`Collection`) and upserts a `WeeklyReview` for the current ISO week/year.
   `toScore(progress)` converts the 0–100% figure to a 1–10 score via a fixed bracket table.

`computeKRAProgress()` reads `LeadGeneration`, `SalesFunnel`, `Collection`, `Certification`, and
`WeeklyCommit` — **never `DailyUpdate`, never `DailyActivityLog`/`DailyActivitySummary`, never
`DailyProductivityScore`**.

### 2.3 DailyUpdate's only touchpoint with anything KRA-adjacent

`src/app/employees/[id]/page.tsx:93` reads `DailyUpdate` rows with a non-empty `blockers` field
(latest 5) purely for display in the employee profile's "recent blockers" panel — **not** as
scoring input, not read by `kra-engine.ts`, not read by `/api/kra-sync`. This is the only
KRA-adjacent reference to `DailyUpdate` anywhere outside `/daily-updates` itself and the mobile
app's own Daily Updates screen.

**Conclusion: DailyUpdate has zero dependency from the KRA/scoring system.** Deprecating it
later (§15) carries no KRA-correctness risk — only a UI-visibility one (the blockers panel).

### 2.4 Existing weekly aggregation precedent (reusable pattern)

`src/lib/kra-engine.ts` already has an ISO-week helper (`getWeekDates(week, year)` → `{start,
end}` UTC range, Mon–Sun) and `src/app/api/kra-sync/route.ts` has its own `getWeekNumber(date)`.
**No monthly rollup logic exists anywhere in the codebase today.** The weekly-bucketing pattern
in `kra-sync` is the right precedent to mirror for a Daily Activity weekly rollup (§8), rather
than inventing a new week-numbering scheme.

### 2.5 Dashboard's current KRA-related display

`src/app/dashboard/page.tsx` computes a manager-facing "Team KRA" average
(`emp.kras.reduce((s,k) => s + (k.reviews[0]?.progress ?? 0), 0) / emp.kras.length`) — i.e. the
mean of each employee's *latest* `WeeklyReview.progress` across their active KRAs. It does
**not** read `DailyProductivityScore` or any Daily Activity table today.

### 2.6 DailyProductivityScore — confirmed unused (re-verified this phase)

A fresh case-insensitive grep for `dailyProductivityScore` across `src/` (excluding generated
Prisma client code) returns zero hits in hand-written application code. The model exists in
`prisma/schema.prisma` (added Phase W1) with `periodType` (DAILY|WEEKLY|MONTHLY),
`periodStart`/`periodEnd` (`@db.Date`), `totalPoints`, `closedDays`, `incompleteDays`,
`absentDays`, `productivityBand`, **`kraEligiblePoints`**, **`qualityIndicatorJson`** — i.e. it
was already designed with exactly this rollup/KRA-feed use case in mind, just never wired up.
See §9 for the recommendation on when to start using it.

### 2.7 Where Daily Activity can be safely introduced, and where the risk is

**Safe to introduce:**
- A new, read-only rollup surface (weekly/monthly reports, §7–§9) that computes from
  `DailyActivityLog`/`DailyActivitySummary` independently — no existing code path touches these
  tables outside `src/lib/daily-activity.ts`, so there is no collision risk.
- `KRAAchievement.sourceReference` (a free-text `String` field, enterprise system) is already
  shaped to record "where did this achievement's number come from" — a natural, additive,
  non-schema-changing place to eventually record "daily-activity:2026-06" once the enterprise-
  vs-legacy decision (§17.1) is made.

**Risk / must avoid:**
- Writing into `WeeklyReview`/`KRAAchievement` directly from Daily Activity rollups before the
  legacy-vs-enterprise question (§17.1) is resolved — would entrench a wrong choice that's
  expensive to unwind across two systems.
- Computing KRA eligibility from `summaryStatus` read live without a stable status (the
  `INCOMPLETE` gap, §3) — any rollup built before that's resolved will under/over-count days
  inconsistently as soon as the gap is fixed.
- Mixing Daily Activity's `@db.Date` UTC-tagged storage convention (Phase W4.1,
  `src/lib/date-only.ts`) with `kra-engine.ts`'s own ad-hoc UTC week-boundary math — any new
  rollup code must use the shared `date-only.ts` helpers, not reinvent date arithmetic.

---

## 3. Current Daily Activity Status Lifecycle

Exact behavior per state, as implemented in `src/lib/daily-activity.ts` today:

| Scenario | What happens today |
|---|---|
| **No activity day** | No `DailyActivityLog` rows, no `DailyActivitySummary` row exists. Any read path (`getDailyActivityForEmployee`, etc.) synthesizes `status: "NO_ACTIVITY"` on the fly when no summary row is found. |
| **Activity exists but no summary** | `captureDailyActivityEvent` → `recomputeDailySummary` creates/updates a `DailyActivitySummary` row with `status: "SUMMARY_PENDING"` as soon as `totalPoints > 0` (still auto-managed — see `AUTO_MANAGED_STATUSES`). |
| **Summary submitted (on time)** | `submitDailyActivitySummary`: if `evaluateSubmissionWindow` says same-day-before-grace, status → `CLOSED`. |
| **Summary submitted (late, next day)** | Same call, but `evaluateSubmissionWindow` flags `isLate`; status → `LATE_SUBMITTED` (unless the prior status was `REOPENED`, see below). |
| **Correction requested** | `createDailyActivityCorrectionRequest` sets the summary's status to `PENDING_CORRECTION` directly (overwriting whatever it was, including `CLOSED`). |
| **Correction approved** | `approveDailyActivityCorrectionRequest` creates a `COUNTED` `DailyActivityLog` row with server-resolved points, recomputes the summary, then `reconcileSummaryStatusAfterCorrectionDecision` clears `PENDING_CORRECTION` back to `CLOSED` (if `submittedAt` is set) or `SUMMARY_PENDING`/`NO_ACTIVITY` otherwise — **only if no other correction on that summary is still pending**. |
| **Correction rejected** | No log row created, no points change; same `reconcileSummaryStatusAfterCorrectionDecision` call clears `PENDING_CORRECTION` the same way. |
| **Reopened day** | `reopenDailyActivityDay` sets status → `REOPENED` unconditionally (manager action). `evaluateSubmissionWindow` treats `REOPENED` as "always allowed to resubmit, any age." |
| **Grace period expiry (8 PM cutoff → 10 PM grace)** | **Nothing happens automatically.** `CUTOFF_HOUR`/`GRACE_UNTIL_HOUR` are read at submission-decision time only (`evaluateSubmissionWindow`), to decide whether a *new* submit/edit attempt is allowed right now. They never write a status change to the row. A day that never gets a submit attempt after grace expires simply sits at whatever it already was (`NO_ACTIVITY` or `SUMMARY_PENDING`) forever — see §4. |

`needsReview` (team-table flag) is currently `correctionPending > 0 || status === "INCOMPLETE"`
— the second half of that condition is **dead code today**, since nothing ever sets
`INCOMPLETE`. This is the same gap as §4, observed from a different angle.

---

## 4. Status Automation Gap

> **Status: IMPLEMENTED (Phase W6.1, 2026-06-29).** Option D below was built exactly as
> recommended — `resolveEffectiveDailyActivityStatus()` in `src/lib/daily-activity.ts` is the
> shared dynamic predicate, wired into every read path. See
> `docs/webapp/DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md` "Phase W6.1" for the implementation
> writeup, `scripts/test-daily-activity-status-lifecycle.mjs` for verification (19/19), and
> `docs/webapp/WEBAPP_GAP_CLOSURE_PLAN.md` "Phase W6.1 progress" for the change summary. The
> Option-B scheduled job remains deferred, exactly as recommended — not built. **§17.1 (which
> KRA system to feed) remains unresolved** — W6.1 implemented status lifecycle logic only and
> deliberately did not touch KRA wiring.

**Confirmed gap:** `INCOMPLETE` is documented in the schema comment
(`// NO_ACTIVITY|SUMMARY_PENDING|INCOMPLETE|CLOSED|REOPENED|LATE_SUBMITTED|PENDING_CORRECTION`)
and referenced in `getTeamDailyActivity`'s counting logic and `needsReview`'s flag — but **no
write path in `src/lib/daily-activity.ts` ever sets `status = "INCOMPLETE"`.** A day that ends
with `SUMMARY_PENDING` (activity happened, no summary submitted) or `NO_ACTIVITY` and is never
touched again after the grace window stays in that state indefinitely. It is never automatically
locked, never flagged for manager review via the `INCOMPLETE` branch, and — critically for this
phase's purpose — there is no stable signal a KRA rollup could read to know "this day's window
has definitively closed without a submission."

### 4.1 Options evaluated

| Option | Description | Pros | Cons |
|---|---|---|---|
| **A. Dynamic at read time** | Every read path (`getDailyActivityForEmployee`, team views, future rollups) computes "is this day past grace with no CLOSED/LATE_SUBMITTED status?" on the fly and *displays* it as Incomplete, without writing anything. | Zero migration/job risk; always reflects current rules even if cutoff/grace constants change; trivially reversible. | Recomputed on every read (cheap here — single date comparison, not a real cost); the *stored* `status` column still lies until something else writes it, so any code that filters `WHERE status = 'INCOMPLETE'` directly in SQL (e.g. a future rollup `groupBy`) won't see it. |
| **B. Scheduled/manual close-day job** | A cron-like job (or manually triggered admin endpoint) sweeps yesterday's still-open `SUMMARY_PENDING`/`NO_ACTIVITY` rows after grace and writes `INCOMPLETE`. | Status column becomes a reliable source of truth for SQL aggregation (rollups, exports); matches the "close the books" mental model managers already have from month-end finance close. | Needs a job runner / scheduled-task infrastructure decision (this project has no existing cron mechanism); a missed run leaves rows stale until the next run; must be idempotent and timezone-correct (must reuse `@/lib/date-only`, not reinvent). |
| **C. Update on page-open** | The next time *any* user (employee or manager) loads a page that would display that day, lazily write the `INCOMPLETE` status if the conditions hold. | No scheduler needed; self-healing as soon as someone looks. | Days nobody ever looks at again stay stale forever (silently wrong for rollups); turns a read endpoint into a write endpoint, which is a meaningful behavior/audit-surface change for what's currently pure read API; harder to test deterministically. |
| **D. Hybrid — dynamic now, scheduled job later** | Ship Option A immediately (display-only, zero risk) for all current UI/report reads; design but don't yet build a Option-B job, to be added once a job-runner mechanism exists or once rollup correctness genuinely requires a queryable `status` column. | Unblocks reporting/KRA work immediately without new infrastructure; defers the job-runner decision until it's actually load-bearing; the eventual job has a precise, already-tested spec to implement against (the same predicate Option A uses). | Two code paths must agree on the predicate forever until B ships (must keep them in lock-step, ideally by sharing one function). |

### 4.2 Recommendation

**Option D (hybrid), starting with Option A.** Concretely:

1. Add one pure, shared predicate — e.g. `resolveEffectiveStatus(summary, now)` in
   `src/lib/daily-activity.ts` — that takes the stored `status` plus `summaryDate`/`now` and
   returns `INCOMPLETE` when: stored status is `NO_ACTIVITY` or `SUMMARY_PENDING`, the day is in
   the past (not today), and it isn't `REOPENED`. Every employee/manager/rollup read path calls
   this instead of reading `summary.status` raw.
2. Do **not** write `INCOMPLETE` to the DB yet. This keeps the change fully reversible and
   avoids inventing a job-runner mid-phase.
3. Revisit Option B only when a rollup genuinely needs `WHERE status = 'INCOMPLETE'` at the SQL
   level (e.g. a very large employee count makes per-row dynamic recomputation in application
   code too slow) — which, given this project's current employee count (audit found ~20 seeded
   employees), is not yet a real performance concern.

This directly unblocks §6's eligibility matrix and §7–§9's rollups without taking on new
infrastructure risk this phase.

---

## 5. (Reserved — folded into §4 above per the source brief's Task 2/3 split; eligibility matrix follows in §6.)

---

## 6. KRA Eligibility Matrix

Per the project's existing hard rule: **only `CLOSED` days count into KRA; points are
activity-points only; quality indicators are manager/KRA-review-only, never part of the daily
score.**

| Daily Activity status | Count into KRA? | Count points? | Manager review needed? | Notes |
|---|---|---|---|---|
| `NO_ACTIVITY` | No | No (0 by definition) | No | Absence day — tracked as `absentDays` in rollups (§7–§9), not penalized beyond that unless business later decides otherwise. |
| `SUMMARY_PENDING` | No | No | No (until grace expires, then yes — see `INCOMPLETE` row) | Transient state; not yet resolved one way or the other. |
| `INCOMPLETE` *(effective, via §4's dynamic predicate)* | No | No | **Yes** | Surfaced to manager via `needsReview`; this is exactly the bucket managers should be triaging — a day that had activity/expectation but never closed. |
| `CLOSED` | **Yes** | **Yes**, the summary's `totalPoints` at the time it was closed | No (already the terminal "good" state) | The only status that counts unconditionally. |
| `REOPENED` | **No, excluded until resubmitted** | No (frozen at last value, but not counted) | No (it's already flagged — that's *why* it was reopened) | See §6.1 — explicitly excluded while open, re-evaluated once it returns to `CLOSED`/`LATE_SUBMITTED` via resubmission. |
| `LATE_SUBMITTED` | **Yes, automatically** | **Yes**, same `totalPoints` rule as `CLOSED` | No, unless a future business rule requires manager acceptance (see §6.4 — currently: no) | Treated as a terminal "closed" state for KRA purposes; the "late" distinction is informational only at this point, not a different eligibility outcome. |
| `PENDING_CORRECTION` | **No, the whole day excluded while pending** | No | **Yes**, that's the entire point of the status | See §6.2 — full-day exclusion, not partial. |

### 6.1 Is a reopened day excluded until resubmitted?

**Yes.** A `REOPENED` day is, by construction, a day the manager judged needed redoing — counting
its stale `totalPoints` toward KRA while it's open would double-count or count-wrong data that's
actively being corrected. It re-enters KRA eligibility only once `submitDailyActivitySummary`
moves it back to `CLOSED`/`LATE_SUBMITTED` with the resubmitted figures.

### 6.2 Does PENDING_CORRECTION exclude the full day or only the disputed points?

**Full day**, not just the disputed points. Rationale: a pending correction means the summary's
current `totalPoints` figure is, by the employee's own claim, potentially wrong (missing or
incorrect activity). Counting the *rest* of the day's points while one item is disputed risks
counting a number that's about to change. This mirrors the existing backend behavior exactly —
`createDailyActivityCorrectionRequest` already flips the *entire* summary's `status` to
`PENDING_CORRECTION`, not a per-log-row flag — so the eligibility rule simply inherits that
granularity rather than inventing a finer one.

### 6.3 Does a zero-activity but submitted summary count, or stay NO_ACTIVITY?

Per existing Phase W4 documented behavior (`docs/webapp/DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md`
"Zero-activity summary submission"): submitting an end-of-day summary with zero other captured
activity still earns the `END_OF_DAY_SUMMARY_SUBMITTED` default points (2 pts) and reaches
`CLOSED`, landing in `LOW_ACTIVITY`, not `NO_ACTIVITY`. **This plan inherits that decision for
KRA purposes too** — a `CLOSED` day with only the 2-point summary-submission event still counts
into KRA (rule is status-based, not points-threshold-based). If the business later wants a
"summary-only" day to be KRA-neutral, that requires a new explicit rule and is flagged as an
open decision in §17.3 rather than assumed here.

### 6.4 Does late submission count automatically, or need manager acceptance?

**Automatically**, per the existing backend: `submitDailyActivitySummary` already resolves
`LATE_SUBMITTED` purely from the submission-window calculation (`evaluateSubmissionWindow`'s
`isLate` flag) with no manager-acceptance step in the code today. This plan does not propose
adding one — flagged as an open decision (§17.4) only because the business may want to revisit
it now that points are about to feed a real performance number, not just an internal dashboard.

---

## 7. Daily Rollup Design

**Source:** computed live from `DailyActivitySummary` + `DailyActivityLog` for a single
`employeeId` + date (already exactly what `getDailyActivityForEmployee`/
`getDailyActivityForManagerEmployee` compute today — no new aggregation logic needed at the
daily level, just a stable shape for report consumption).

| Field | Source | Employee-visible | Manager-visible |
|---|---|---|---|
| `productivityBand` | `DailyActivitySummary.productivityBand` (or computed via `getProductivityBand`) | Yes | Yes |
| `totalActivityCount` | `AutoSummary.activitiesCompleted` | Yes | Yes |
| `totalPoints` | `DailyActivitySummary.totalPoints` | **No** (band only) | Yes |
| `summaryStatus` | `DailyActivitySummary.status`, resolved through §4's effective-status predicate | Yes | Yes |
| `correctionStatus` | latest `DailyActivityCorrectionRequest.status` for that employee/day, if any | Yes (own only) | Yes |
| `kraEligible` | derived from §6's matrix against `summaryStatus` (effective) | No (internal only — not a UI field for Phase W6) | Optionally, for the Exceptions/KRA-input reports (§11.5) |

No new model needed at this level — this is a *response shape*, not new storage. It's the
contract both the weekly and monthly rollups (§8–§9) reduce over.

---

## 8. Weekly Rollup Design

**Boundary:** reuse the existing ISO-week convention from `kra-engine.ts`'s `getWeekDates`/
`getWeekNumber` (Mon–Sun, ISO week numbering) rather than inventing a second week definition —
critical so a future "Daily Activity weekly score" and the existing `WeeklyReview.week`/`.year`
columns describe literally the same week.

| Field | Computation |
|---|---|
| `closedDays` | count of days in the week where effective status ∈ {`CLOSED`, `LATE_SUBMITTED`} |
| `incompleteDays` | count where effective status is `INCOMPLETE` (§4's dynamic predicate) |
| `noActivityDays` | count where effective status is `NO_ACTIVITY` |
| `totalEligiblePoints` | sum of `totalPoints` across `kraEligible` days only (§6 matrix) |
| `averageProductivityBand` | mode (most frequent band) or banded-average of eligible days' `productivityBand` — **exact formula is an open decision, §17.5** |
| `pendingCorrectionCount` | count of `DailyActivityCorrectionRequest` rows with `status = "PENDING"` raised during the week |
| `managerReviewFlags` | count of days where `needsReview` was true at any point during the week (i.e. correction pending or incomplete) |

**Computation strategy:** dynamic (computed on request from `DailyActivityLog`/
`DailyActivitySummary`), not a stored snapshot — see §9 for why `DailyProductivityScore` isn't
written yet.

---

## 9. Monthly Rollup Design

| Field | Computation |
|---|---|
| `closedDays` | same definition as weekly, summed over the calendar month |
| `incompleteDays` | ditto |
| `absentDays` | days with effective status `NO_ACTIVITY` for the *entire* month range — matches `DailyProductivityScore.absentDays`'s existing field name exactly, confirming the schema's intent |
| `totalEligiblePoints` | sum of `totalPoints` across `kraEligible` days in the month |
| `averageEligiblePoints` | `totalEligiblePoints / closedDays` (closed days only, not calendar days — an open day shouldn't dilute the average) |
| `productivityTrend` | week-over-week or day-over-day delta within the month — **exact method (linear trend, simple first-half-vs-second-half comparison, etc.) is an open decision, §17.6** |
| `kraInputScore` | the number this rollup is *for* — feeds into whichever KRA system (§17.1) as a new metric/achievement input, scaled however that system's `weightedScore`/`achievementPct` convention expects |
| `qualityIndicatorSummary` | aggregated from existing per-activity metadata (e.g. correction approve/reject ratio, late-submission count) — explicitly **not** part of `kraInputScore`'s number, per the project's hard rule that quality indicators are review-only |

**Computation strategy:** also dynamic at first — see §9.1.

### 9.1 DailyProductivityScore Recommendation

Per the source brief's four options (A: daily snapshots only, B: weekly/monthly only, C: all
three, D: not yet/dynamic-first):

**Recommendation: D — dynamic computation first, then introduce `DailyProductivityScore`
snapshots after validation**, specifically:

- **Why not now:** the project's current scale (~20 seeded employees, audit-confirmed) makes
  dynamic daily/weekly/monthly aggregation from `DailyActivityLog`/`DailyActivitySummary` cheap
  — a `groupBy`/`findMany` over a month's rows per employee is not a performance concern at this
  size. Writing snapshot rows before the eligibility rules (§6) and the `INCOMPLETE` automation
  (§4) are validated in production-like usage risks baking a wrong number into a stored,
  KRA-feeding table that then needs a backfill/correction story of its own — exactly the kind of
  problem the Daily Activity *correction-request* feature exists to solve for raw activity, but
  there is no equivalent correction flow designed yet for a wrong *snapshot*.
- **Why introduce it eventually, not "never":** once weekly/monthly reports are live and
  validated against real usage for a full review cycle, `DailyProductivityScore` is the right
  permanent home — it already has `kraEligiblePoints` and `qualityIndicatorJson` fields that
  were clearly designed for this exact purpose, and a stored snapshot is needed once: (a) report
  read volume grows enough that dynamic computation becomes a real cost, or (b) the KRA system
  needs a stable, citable historical number that must not silently change if later activity
  capture or correction logic changes (audit trail / "what was the score *as of* the review
  date" requirement — finance/KRA review cycles typically need this).
- **Phasing within "eventually":** when the time comes, populate **daily snapshots first**
  (`periodType: "DAILY"`, one row per employee per day, written by the same job that would
  eventually resolve `INCOMPLETE` per §4 Option B) — then weekly and monthly become a `groupBy`
  over already-materialized daily rows rather than re-deriving from raw logs every time. This
  avoids ever building three separate aggregation code paths.

---

## 10. (Reserved — folded into §6/§7–9 per the source brief's structure; manager/employee report specs follow.)

---

## 11. Manager Reporting Requirements

| Report | Purpose | Columns | Filters | Source (future) | Points visibility | Status visibility |
|---|---|---|---|---|---|---|
| **11.1 Daily team productivity** | Today's at-a-glance team state — already exists as the `/daily-activity` manager panel; this section documents it as the baseline the others extend. | Employee, summary status, band, total points, activity count, last activity, correction flag, needs-review flag | date | `GET /api/daily-activity/team` *(existing)* | Exact points | Full status |
| **11.2 Weekly team productivity** | Manager's week-in-review across the team. | Employee, closed/incomplete/no-activity day counts, total eligible points, avg band, pending corrections, review flags | week/year (or date range) | `GET /api/daily-activity/reports/team-weekly` *(future, §13.4)* | Exact points | Aggregated status counts |
| **11.3 Monthly team productivity** | Manager's month-end review input. | Employee, closed/incomplete/absent day counts, total/avg eligible points, trend, KRA input score, quality indicator summary | month/year | `GET /api/daily-activity/reports/team-monthly` *(future, §13.5)* | Exact points | Aggregated status counts |
| **11.4 Employee detail view** | Drill-in for one employee/day — already exists. | (unchanged from current `ManagerEmployeeDayView`, now plus `pendingCorrections` from Phase W5) | employeeId + date | `GET /api/daily-activity/team/[employeeId]/[date]` *(existing)* | Exact points | Full status + pending corrections |
| **11.5 KRA input view** | What this period's Daily Activity contributes to KRA, before it's pushed into whichever KRA system §17.1 resolves to. | Employee, period, eligible days, eligible points, computed KRA input score, eligibility breakdown (which days excluded and why) | period | `GET /api/daily-activity/reports/kra-input` *(future, §13.6)* | Exact points | Eligibility reasoning per day |
| **11.6 Exceptions view** | Triage queue — the `INCOMPLETE`/pending-correction backlog managers need to act on. | Employee, date, exception type (`INCOMPLETE`/`PENDING_CORRECTION`/`REOPENED`-not-yet-resubmitted), age, action needed | date range, exception type | `GET /api/daily-activity/reports/exceptions` *(future, §13.7)* | Exact points | Full status |

**Export requirement:** not requested by the business yet for any of the above; flagged as an
open decision (§17.7) rather than assumed in/out of scope.

---

## 12. Employee Reporting Requirements

| Report | Purpose | Rules |
|---|---|---|
| **12.1 My daily activity history** | Already exists (14-day strip on `/daily-activity`); this section documents extending its date range, not changing its shape. | Band/status only, no exact points — unchanged. |
| **12.2 My weekly productivity** | Self-view mirroring §8's weekly rollup, employee-scoped. | Same band/status-only rule — no `totalEligiblePoints` number shown raw, only banded. |
| **12.3 My monthly productivity** | Self-view mirroring §9's monthly rollup. | Same rule. |
| **12.4 My KRA contribution summary** | "How is my Daily Activity feeding into my KRA" — eligible-day count, band trend, no raw points. | Same rule; this is explicitly *not* the same as §11.5's manager-facing KRA input view (which does show exact points). |

**Confirmed unchanged rule, per explicit instruction:** employee sees band/status only, never
exact points, anywhere — including in future weekly/monthly/KRA-contribution views. Employee
never sees team data in any of these reports (self-scoped only, same as every existing Daily
Activity employee endpoint).

**Whether this should change later (exact historical points to the employee):** flagged as an
open decision (§17.8) — not assumed either way. The existing hard rule is carried forward
unchanged for this phase's designs.

---

## 13. Future API Design (NOT implemented this phase)

All of the below are **designs only**. No route files were created.

### Employee

**13.1 `GET /api/daily-activity/reports/my-weekly`**
- Inputs: optional `week`, `year` query params (default: current ISO week).
- Output: `{ week, year, closedDays, incompleteDays, noActivityDays, totalEligiblePoints (band-bucketed for employee, not raw), averageProductivityBand, pendingCorrectionCount }` — self-scoped, `employeeId` resolved from session exactly like every existing employee endpoint.
- Role: employee (self only).
- Points visibility: band-derived only, never the raw `totalEligiblePoints` number to the employee.
- Date handling: week boundary computed via the shared ISO-week helper (mirrored from `kra-engine.ts`, not reinvented), all date-only values through `@/lib/date-only`.
- KRA eligibility: per §6 matrix.

**13.2 `GET /api/daily-activity/reports/my-monthly`**
- Inputs: optional `month`, `year`.
- Output: monthly rollup shape from §9, band-bucketed for the employee.
- Role/points/date/KRA rules: same pattern as 13.1.

**13.3 `GET /api/daily-activity/reports/my-kra-input`**
- Inputs: optional period.
- Output: §12.4's shape — eligible-day count and band trend only, no raw points.
- Role/points/date/KRA rules: same pattern, strictest points visibility of the three.

### Manager

**13.4 `GET /api/daily-activity/reports/team-weekly`**
- Inputs: `week`/`year` (or date range), optional `employeeIds` filter.
- Output: §8's per-employee weekly rollup array + team totals.
- Role: manager-only (mirrors `resolveManagerAuthorizedEmployeeIds` — "any manager sees all
  employees" precedent, not narrowed to `reportsToId`, consistent with every other Daily
  Activity manager endpoint).
- Points visibility: exact.
- Date handling: shared ISO-week helper + `@/lib/date-only`.
- KRA eligibility: per §6, exposed as a breakdown, not just a final number (so a manager can see
  *why* a day didn't count).

**13.5 `GET /api/daily-activity/reports/team-monthly`**
- Same pattern as 13.4, §9's monthly shape.

**13.6 `GET /api/daily-activity/reports/kra-input`**
- Inputs: period, optional `employeeIds`.
- Output: §11.5's shape.
- Role: manager-only.
- Points: exact, plus per-day eligibility reasoning.
- **This is the one future endpoint that would actually write/feed the KRA system** once §17.1
  is resolved — until then, it is read-only (computes the number, doesn't push it anywhere).

**13.7 `GET /api/daily-activity/reports/exceptions`**
- Inputs: date range, optional exception-type filter.
- Output: §11.6's shape.
- Role: manager-only.
- Points: exact.
- KRA eligibility: implicitly "not eligible" for every row this report returns (that's what
  makes it an exception).

### System/admin (later)

**13.8 `POST /api/daily-activity/jobs/close-day`**
- Purpose: the Option-B job from §4 — sweep a given date's still-open `SUMMARY_PENDING`/
  `NO_ACTIVITY` rows past grace and write `INCOMPLETE`.
- Inputs: target date (defaults to yesterday), idempotent (safe to re-run).
- Role: system/admin only (not manager, not employee) — exact auth mechanism is an open decision
  (§17.9), since this project has no existing scheduled-job auth pattern to copy.
- **Not built this phase** — explicitly deferred per §4's recommendation.

**13.9 `POST /api/daily-activity/jobs/recompute-rollups`**
- Purpose: once `DailyProductivityScore` snapshots are introduced (§9.1), recompute and
  upsert daily/weekly/monthly rows for a given period — the write counterpart to 13.1–13.7's
  reads.
- Role: system/admin only.
- **Not built this phase.**

---

## 14. Future UI Design (NOT implemented this phase)

1. **Reports section on `/daily-activity`** — new tab/section alongside the existing employee
   view and manager panel, surfacing 12.1–12.4 (employee) or 11.1–11.6 (manager) depending on
   role — same single-page-with-role-branching pattern `page.tsx` already uses today.
2. **Manager exception panel** — a dedicated view of §11.6/§13.7, likely the first of these to
   build since it has the clearest immediate manager value (a triage list) and the least design
   risk (it's a filter on data that already exists, no new score math).
3. **Weekly/monthly tabs** — within the reports section, tab-switching between the daily (already
   live), weekly (§13.1/§13.4), and monthly (§13.2/§13.5) views.
4. **KRA input tab** — manager-only, surfaces §11.5/§13.6; gated behind whichever KRA system
   §17.1 resolves to actually being fed.
5. **Export/download** — only if/when §17.7's open decision lands on "yes" — not designed in
   detail this phase.
6. **`/daily-updates` stays unchanged** until the deprecation phase (§15) — no banner, no
   redirect, no UI change to it in this phase or the next implementation phase.

---

## 15. DailyUpdate Deprecation Plan

### 15.1 Current DailyUpdate dependencies (audited this phase)

- `src/app/daily-updates/page.tsx` + `src/app/api/daily-updates/route.ts` +
  `src/app/api/daily-updates/[id]/route.ts` — the legacy CRUD surface itself.
- `src/app/employees/[id]/page.tsx:93` — reads `blockers`-non-empty rows for the profile's
  "recent blockers" panel (display only, §2.3).
- `src/app/mobile/MobileApp.tsx` + `src/app/mobile/screens/DailyUpdatesScreen.tsx` +
  `src/app/mobile/screens/HomeScreen.tsx` — the mobile app's own Daily Updates screen, explicitly
  out of scope to touch per every phase's strict instructions.
- **Confirmed zero dependency from KRA scoring** (§2.3) — this is the dependency that matters
  most for deprecation risk, and it's clean.

### 15.2 Options (per source brief)

- **A. Keep forever** as legacy manual notes.
- **B. Freeze as read-only archive** after Daily Activity is fully live.
- **C. Redirect to `/daily-activity`** after cutover, with historical records visible elsewhere.

### 15.3 Recommendation

**Option B initially, then Option C after historical review** — exactly as the source brief's
own default, confirmed appropriate by this audit:

- DailyUpdate has no scoring dependency to untangle (§2.3), so freezing it is low-risk whenever
  the business decides Daily Activity has fully replaced its purpose.
- Mobile's Daily Updates screen depends on the same `/api/daily-updates` routes — freezing the
  *web* CRUD to read-only does not require touching mobile, since "freeze" means the API stops
  accepting writes (or the write UI is removed/disabled on web), not that the API disappears.
  Mobile-side deprecation is a separate, later decision, explicitly out of every phase's scope
  until mobile work is unpaused.
- Redirecting (Option C) before historical data has a confirmed archive view risks making old
  blocker/note history hard to find — sequencing B before C avoids that.

### 15.4 Cutover criteria (proposed, not yet approved)

- Daily Activity's `INCOMPLETE` automation (§4) is live and validated for at least one full
  review cycle (so managers trust the exception queue as a substitute for manually reading
  DailyUpdate blockers).
- The employee profile's "recent blockers" panel (§2.3) has a Daily-Activity-sourced
  replacement (e.g. reading `blockers` from `DailyActivitySummary` instead of `DailyUpdate`).
- At least one full reporting cycle (weekly + monthly, §8–§9) has run against real usage without
  needing a DailyUpdate fallback.

### 15.5 Archive view requirement

A read-only `/daily-updates` (or a renamed `/daily-updates/archive`) view that lists historical
rows without create/edit affordances — exact shape not designed this phase, flagged for the
deprecation phase itself.

### 15.6 Communication/banner requirement

A banner on `/daily-updates` (date-stamped, dismissible or not — TBD) explaining "this has moved
to Daily Activity" pointing at `/daily-activity`, shown for some transition window before
Option C's redirect, if the business chooses to proceed to C at all.

### 15.7 Rollback path

Since Option B is "freeze," not "delete," rollback is simply re-enabling the write UI/API — no
data loss risk either way, since nothing is deleted at any stage of B or C.

---

## 16. Implementation Phases (proposed ordering for future work)

1. **W6.1 — ✅ DONE (2026-06-29)** — Implemented §4's effective-status predicate
   (`resolveEffectiveDailyActivityStatus`), wired into every existing read path that previously
   read `summary.status` raw (`getDailyActivityForEmployee`, `getDailyActivityHistoryForEmployee`,
   `getDailyActivityForManagerEmployee`, `getTeamDailyActivity`). Also added the §6
   KRA-eligibility placeholder helpers (`isDailyActivityKraEligible`/
   `getDailyActivityKraEligibilityReason`) — pure, unwired, no KRA system call. §17.1 was
   unresolved at the time of this step (resolved later, 2026-06-29 — see below).
2. **W6.2** — Implement the daily rollup shape (§7) as a small addition to existing read
   functions (mostly already present; formalize as a stable contract).
3. **W6.3** — Implement dynamic weekly rollup (§8) + `GET /api/daily-activity/reports/my-weekly`
   and `team-weekly` (§13.1/§13.4).
4. **W6.4** — Implement dynamic monthly rollup (§9) + `my-monthly`/`team-monthly` (§13.2/§13.5).
5. **W6.5** — Implement the Exceptions report (§11.6/§13.7) and its manager UI panel (§14.2) —
   highest immediate manager value, lowest score-correctness risk.
6. **W6.6** — §17.1 is now resolved (Enterprise KRA, 2026-06-29); implement the `kra-input`
   report (§11.5/§13.6) and `my-kra-input` (§13.3) against the Enterprise KRA path
   (`EmployeeProfile`/`EmployeeTarget`/`KRAAchievement`/`PerformanceReview`), still read-only
   (computes the number, doesn't push it into the KRA system yet). Not implemented this phase.
7. **W6.7** — Once the read-only KRA-input number has been validated for at
   least one cycle, design (separate future phase) the actual write path into `KRAAchievement`/
   `PerformanceReview` (Enterprise KRA only — not `WeeklyReview`, per the §17.1 decision).
8. **W6.8** — Introduce `DailyProductivityScore` daily snapshots (§9.1) once report read volume
   or audit-trail needs justify it; weekly/monthly snapshots follow as a `groupBy` over those.
9. **W6.9** — Revisit §4 Option B (scheduled close-day job) only if/when a real performance or
   SQL-aggregation need for a stored `INCOMPLETE` status arises.
10. **DailyUpdate deprecation** (§15) proceeds independently, gated on its own cutover criteria
    (§15.4), not blocking or blocked by the above.

---

## 17. Open Business Decisions

1. **CLOSED (2026-06-29) — Enterprise KRA selected.** Legacy `KRA`/`WeeklyReview` vs. enterprise
   `EmployeeProfile`/`EmployeeTarget` — which system does Daily Activity feed? **Resolved: all
   future KRA development uses the Enterprise KRA path only** (`EmployeeProfile`/
   `EmployeeTarget`/`KRAAchievement`/`PerformanceReview`). Legacy `KRA`/`WeeklyReview`
   (`src/lib/kra-engine.ts`) is now historical/read-only — no new feature logic may be added to
   it. This decision does **not** itself implement the write path (W6.6/W6.7 below still apply
   unimplemented); it only removes the "which system" ambiguity that blocked them. See
   `docs/PROJECT_MEMORY.md` "Phase W6.2" and `docs/webapp/WEBAPP_GAP_CLOSURE_PLAN.md`.
2. *(folded into §4)* Whether to ever build the Option-B scheduled close-day job, and what
   job-runner mechanism to use (this project has no existing cron/scheduler pattern — see
   `CronCreate`/scheduled-tasks tooling available at the platform level, not yet adopted in-app).
3. **Does a zero-activity-but-submitted day stay band-neutral for KRA**, or does §6.3's
   inherited "it still counts at LOW_ACTIVITY" rule hold for KRA purposes specifically (not just
   the existing employee-facing band)?
4. **Does late submission need manager acceptance** before counting into KRA, given it's now a
   real performance number, not just an internal dashboard (§6.4)?
5. **Exact `averageProductivityBand` formula** for weekly rollups (§8) — mode vs. weighted
   average vs. something else.
6. **Exact `productivityTrend` method** for monthly rollups (§9) — linear trend, half-vs-half
   comparison, or simple month-over-month delta.
7. **Export/download requirement** for any manager report (§11) — not requested yet.
8. **Whether employees should eventually see exact historical points**, not just bands, once
   enough history exists to make a banded view feel uninformative (§12) — current rule says no;
   revisit only if asked.
9. **Auth mechanism for system/admin job endpoints** (§13.8/§13.9) — no existing pattern in this
   codebase to copy (every existing protected route checks `session.user.isManager`; a
   system/cron job has no session).

---

## 18. Risks and Safeguards

| Risk | Safeguard |
|---|---|
| Picking the wrong KRA system (§17.1) before building the write path | W6.6 explicitly gates the write-path phase on this decision being made first; read-only reporting (W6.1–W6.5) doesn't need it resolved at all. |
| `INCOMPLETE` gap causing inconsistent eligibility across read paths | One shared predicate (`resolveEffectiveStatus`), not duplicated logic per endpoint — §4.2. |
| New rollup code reinventing date-handling and reintroducing the Phase W4.1 `@db.Date` bug | Every future rollup must use `@/lib/date-only`'s existing helpers exclusively — explicitly called out in §2.7 and every API spec in §13. |
| New rollup code reinventing week-numbering inconsistent with `kra-engine.ts` | Reuse/extract `kra-engine.ts`'s existing ISO-week helper rather than writing a second one — §8. |
| Snapshot table (`DailyProductivityScore`) populated before eligibility rules are validated, baking in a wrong number with no correction flow | §9.1 explicitly recommends dynamic-first; snapshots deferred until validated. |
| DailyUpdate deprecation breaking the employee profile's blockers panel or mobile | §15.1 confirms the *only* KRA-unrelated dependency (the profile panel) and §15.4 makes its replacement a cutover *criterion*, not an afterthought; mobile is explicitly untouched in every phase including this one. |
| Manager-only authorization drifting from the established "any manager sees all employees" pattern | Every future manager endpoint spec (§13.4–§13.7) explicitly says to reuse `resolveManagerAuthorizedEmployeeIds`'s existing precedent, not invent narrower/different scoping. |
| Points visibility leaking to employees in a new report | Every employee report spec (§13.1–§13.3) explicitly states band-only, no raw points, matching the existing hard rule. |

---

## 19. No-Production Confirmation

This phase made **zero** code, schema, migration, `db push`, `DailyUpdate`, mobile, or
production changes. Only the following files were touched, all documentation:

- `docs/webapp/DAILY_ACTIVITY_KRA_REPORTING_PLAN.md` (this file, new)
- `docs/webapp/WEBAPP_GAP_CLOSURE_PLAN.md` (Phase W6 planning entry added)
- `docs/webapp/DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md` (Phase W6 planning notes added)
- `docs/PROJECT_MEMORY.md` (Phase W6 entry added)

`npx prisma validate`, `npx prisma generate`, `npx tsc --noEmit`, and `npm run build` were run
to confirm the repository is still in a clean, buildable state after these documentation-only
changes (no source files were edited, so this is a sanity check, not a real risk surface).

---

## Phase W7 — Enterprise KRA integration planning moved out

**Enterprise KRA integration planning has moved to
[`DAILY_ACTIVITY_ENTERPRISE_KRA_INTEGRATION_PLAN.md`](./DAILY_ACTIVITY_ENTERPRISE_KRA_INTEGRATION_PLAN.md).**
§17.1 is resolved → **Enterprise KRA only** (`EmployeeProfile`/`EmployeeTarget`/`KRAAchievement`/
`PerformanceReview`); legacy KRA/`WeeklyReview`/`kra-engine.ts` is historical/read-only. The
`kra-input` rollup, eligibility matrix, preview APIs, and the manager-approved write path are now
designed in that document (Phase W7, audit + mapping only — no writes/schema/migration this phase).

## Phase W8 — mapping setup implemented

The Daily Activity → Enterprise KRA **mapping config/admin setup** is implemented (config only):
`KRAMetric` records with `calculationSource="DAILY_ACTIVITY"`, managed via
`GET/POST/PUT /api/admin/performance/daily-activity-mapping` and the "Daily Activity KRA" tab in
`/settings/performance`. No `KRAAchievement`/`PerformanceReview`/`EmployeeTarget` writes, no schema
change. Engine: `src/lib/performance-engine/daily-activity-mapping.ts`. Full record in
`DAILY_ACTIVITY_ENTERPRISE_KRA_INTEGRATION_PLAN.md` (Phase W8).
