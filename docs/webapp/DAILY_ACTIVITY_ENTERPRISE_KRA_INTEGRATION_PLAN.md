# Daily Activity → Enterprise KRA Integration Plan (Phase W7)

> **Status:** Audit + mapping + design only. **No code, schema, migration, `db push`, KRA
> writes, `DailyUpdate` revival, mobile, or production changes were made in this phase.**
> This document is the planning deliverable for wiring Daily Activity into the Enterprise KRA
> system in a later implementation phase.

---

## 1. Executive summary

Daily Activity (Phase W1–W6) now captures per-employee daily activity, resolves an *effective*
status lifecycle, computes a productivity band, and exposes a KRA-eligibility helper — but it
does **not** feed any KRA system yet. This phase audits the Enterprise KRA data model, UI, and
APIs; defines how Daily Activity should map onto Enterprise KRA; and recommends a safe,
manager-reviewed conversion path. The headline finding: **Enterprise KRA can ingest Daily
Activity rollups with no schema change** — the existing `KRAMetric.calculationSource`,
`KRAAchievement.sourceReference`, and JSON config blobs already accommodate it, and an existing
precedent (`/api/kra/sync-achievements`) already converts *other* operational data into
`KRAAchievement` rows the same way we will.

Recommended approach: **Option D** — Daily Activity produces a dynamic, read-only monthly
*preview* rollup; a manager reviews exceptions and explicitly approves conversion; only then does
the system write `KRAAchievement` rows. No scores are auto-written before business validation.

## 2. Confirmed Enterprise-KRA-only decision

- All future KRA development targets the **Enterprise KRA** path: `EmployeeProfile` →
  `EmployeeTarget` → `KRAAchievement` → `PerformanceReview` (with `PerformancePeriod`,
  `KRATemplate`/`KRATemplateItem`, `KRAMetric` as supporting config).
- **Legacy KRA / `WeeklyReview` / `src/lib/kra-engine.ts` is historical/read-only.** No new
  Daily Activity logic may be added to it. (See §14.)
- Old **Daily Updates is retired**; Daily Activity is the active workflow. No new dependency on
  `DailyUpdate` is permitted. (See §15.)
- The previously-open "legacy vs enterprise KRA" question
  (`DAILY_ACTIVITY_KRA_REPORTING_PLAN.md` §17.1) is **closed → Enterprise KRA**.

## 3. Current Enterprise KRA model audit

All models live in `prisma/schema.prisma`. Statuses are **plain `String` columns, not Prisma
enums** — this is why new source/status values (e.g. `calculationSource = "DAILY_ACTIVITY"`)
need **no migration**.

| Model | Line | Purpose | Key fields | Integration hooks |
|-------|------|---------|-----------|-------------------|
| `EmployeeProfile` | 1357 | Enterprise employee record (1:1 with `Employee` via `userId`) | `userId`, `reportingManagerId`, `teamId`, `employmentStatus`, `employeeTargets[]` | Read-only join key: Daily Activity is keyed by `Employee.id`; map to profile via `userId`. **No writes.** |
| `PerformancePeriod` | 2080 | FY/period window (YEARLY/etc.) | `financialYear`, `periodType`, `startDate`, `endDate`, `status` | Defines the month/period a Daily Activity rollup belongs to. |
| `KRAMetric` | 2102 | Metric catalogue | `code` (unique), `metricType`, **`calculationSource`** (default `"MANUAL"`), `formulaJson` (Text) | `calculationSource = "DAILY_ACTIVITY"` flags a metric as Daily-Activity-fed. `formulaJson` can hold band→value mapping. **No schema change.** |
| `KRATemplate` / `KRATemplateItem` | 2124 / 2145 | Role/dept weighted metric sets | `weightage`, `targetType`, `minimumTarget`, `expectedTarget`, `stretchTarget` | Supplies `expectedTarget` + `weightage` to the achievement math. |
| `EmployeeTarget` | 2164 | Per-employee targets for a period | `employeeProfileId`, `periodId`, `templateId`, `targetJson` (Text), `achievements[]`, `reviews[]` | The parent row a Daily-Activity `KRAAchievement` attaches to. |
| `KRAAchievement` | 2202 | Computed achievement vs a metric | `actualValue`, `achievementPct`, `weightedScore`, **`sourceReference`** (String), `status` | The write target. `sourceReference` carries provenance, e.g. `"daily-activity:2026-06"`. |
| `PerformanceReview` | 2220 | Self/manager/final rating per target | `selfRating`, `managerRating`, `finalRating`, `status` (`DRAFT`…), `workflowRequestId` | Daily Activity rollup is a *review input section* (Option C facet of D), not a writer. |
| `PerformanceAudit` | 2240 | Generic audit (`entityType`,`entityId`,`action`,`oldValue`,`newValue`,`performedBy`) | — | Satisfies the conversion **audit requirement** with no new table. |
| `TeamTarget` | 2187 | Team-level targets | — | Out of scope for individual Daily Activity rollups. |

**Missing fields:** none required. Provenance, source-tagging, and audit are all expressible in
existing String/Text/JSON fields and `PerformanceAudit`.

**Can Daily Activity integrate without schema changes?** **Yes.** Confirmed via the field audit
above plus the existing `recordAchievement` write path (§4).

**Risks:** (a) `EmployeeTarget`/`KRAAchievement` are keyed by `employeeProfileId`/`metricId`,
so a Daily-Activity metric + per-employee target must exist before conversion — an admin
setup prerequisite, not a schema gap. (b) `sourceReference` is a free String → duplicate
prevention must be enforced in code (§13). (c) `Employee.id` ↔ `EmployeeProfile.userId` mapping
must be resolved at read time (not every `Employee` necessarily has a profile).

## 4. Current Enterprise KRA API/UI audit

**Service layer** — `src/lib/performance-engine/`: `achievement.ts`, `kra.ts`, `periods.ts`,
`review.ts`, `targets.ts`, `templates.ts`. `achievement.ts` already encapsulates the write math:
`calculateAchievement(actual, expected) = min(200, actual/expected*100)`,
`calculateWeightedScore(pct, weightage) = pct/100 * weightage`, and
`recordAchievement({employeeTargetId, metricId, actualValue, sourceReference}, expectedTarget,
weightage)` → creates a `KRAAchievement`. **This is the exact function a future Daily Activity
"convert" path will call** — reuse it, do not reimplement.

**APIs** — `/api/admin/performance/{achievements,kra,periods,reviews,targets,templates,
templates/items}`. **Precedent of record:** `POST /api/kra/sync-achievements` (manager-only)
already computes `actualValue` from operational data (`SalesFunnel`, `LeadGeneration`) and writes
`KRAAchievement` rows. The Daily Activity preview/convert flow is the same shape, with Daily
Activity rollups as the input instead of sales data.

**UI** — `/settings/performance` (`PerformanceAdminClient` + `PerformanceDashboard`,
`TargetManager`, `ReviewWorkflowManager`). This is where Daily-Activity KRA preview/conversion
panels and the activity→KRA mapping admin will live.

| Area | State | Reuse for Daily Activity |
|------|-------|--------------------------|
| `performance-engine/achievement.ts` | **Works** | Reuse `recordAchievement`/`updateAchievement`/`getTotalWeightedScore` as the write/aggregate path. |
| `/api/kra/sync-achievements` | **Works** (operational-data sync) | Template for the manager-only convert endpoint. |
| `/api/admin/performance/*` | **Works** (admin CRUD) | Reuse for target/metric/template setup. |
| `/settings/performance` UI | **Works** (admin) | Host new Daily-Activity preview + convert + mapping panels here. |
| Daily-Activity preview/convert APIs | **Do not exist** | To be created later (§6). |
| Daily-Activity→KRA mapping config | **Does not exist** | To be created later (admin, §6/§8). |
| `Employee.id`↔`EmployeeProfile` resolution helper | **Not audited as present** | May need a small read-only helper at implementation time. |

**Where Daily Activity rollups should appear:** employee "My KRA contribution preview", manager
"Team KRA preview / exceptions / convert", and as an input section on the monthly
`PerformanceReview` (§8).

## 5. Daily Activity source data (inputs available today)

From `src/lib/daily-activity.ts` (all already implemented, read-only helpers):

- **Effective status** — `resolveEffectiveDailyActivityStatus(...)`: `CLOSED`, `LATE_SUBMITTED`,
  `REOPENED`, `PENDING_CORRECTION` (authoritative), else `NO_ACTIVITY` / `SUMMARY_PENDING` /
  `INCOMPLETE` (read-time overlay). Never written back.
- **KRA eligibility** — `isDailyActivityKraEligible(effectiveStatus)` → eligible iff status ∈
  {`CLOSED`,`LATE_SUBMITTED`}; `getDailyActivityKraEligibilityReason(...)` gives the human reason.
- **Productivity band** — `getProductivityBand(points)`: `NO_ACTIVITY` (≤0), `LOW_ACTIVITY`
  (≤4), `ACTIVE` (≤9), `PRODUCTIVE` (≤14), `HIGHLY_PRODUCTIVE` (>14).
- **Activity counts / points** — per-day `DailyActivityLog` rows summed to `totalPoints`;
  `buildAutoSummary` activity counts by type.
- **Correction status**, **incomplete days**, **reopened days**, **no-activity days** — all
  derivable from the effective status per day.
- **Eligible vs excluded days**, **eligible points**, **eligible band** — derived by applying
  `isDailyActivityKraEligible` across a date range.
- **Quality indicators** — placeholder only (`qualityIndicatorJson`), not yet populated.

## 6. Daily Activity → Enterprise KRA mapping

> **No data is written in this phase.** "Write now?" is **No** for every row below.

| Daily Activity source | Enterprise KRA target | Mapping rule | Write now? | Notes |
|-----------------------|-----------------------|--------------|------------|-------|
| Effective status (per day) | (eligibility gate) | `isDailyActivityKraEligible` decides whether the day contributes | No | §7 matrix |
| Eligible days (count, month) | `KRAAchievement.actualValue` for an "activity coverage" metric | actual = eligible-day count; expected = working days in period | No | Requires a Daily-Activity `KRAMetric` |
| Excluded days + reason | Exceptions report + `KRAAchievement` provenance note | Surface in manager exceptions; never silently dropped | No | §13 |
| Eligible productivity band / eligible points | `KRAAchievement.actualValue` for a "productivity" metric | actual = sum of eligible points (or band-weighted score from `formulaJson`) | No | Band→value map in `KRAMetric.formulaJson` |
| Activity counts by type | `KRAAchievement` for type-specific metrics (optional) | actual = count of that activity type on eligible days | No | Only if admin maps a metric to a type |
| Correction status (PENDING) | Eligibility exclusion | Whole day excluded until resolved | No | Matches existing helper |
| Incomplete / reopened / no-activity days | Exceptions report | Listed with reason; not eligible | No | §7 |
| Monthly rollup (aggregate) | `EmployeeTarget` (parent) + `KRAAchievement` (children) | One achievement per mapped metric per `(employeeTarget, period)` | No | `sourceReference = "daily-activity:<YYYY-MM>"` |
| Approved monthly rollup | `PerformanceReview` input section | Read-only reference on the review for the period | No | Option C facet |
| Conversion event | `PerformanceAudit` | One audit row per convert action | No | §12 |

## 7. KRA eligibility matrix

Mirrors the implemented helper (`daily-activity.ts` §`isDailyActivityKraEligible` /
`getDailyActivityKraEligibilityReason`).

| Daily Activity status | Enterprise KRA eligible? | Enterprise KRA handling | Notes |
|-----------------------|--------------------------|-------------------------|-------|
| `CLOSED` | ✅ Yes | Counts toward rollup at full eligible points | Closed on time |
| `LATE_SUBMITTED` | ✅ Yes (flag) | Counts, but **flagged for manager review** in exceptions | Subject to future policy (KRA_REPORTING §17.4) |
| `NO_ACTIVITY` | ❌ No | Excluded (absence) | Not a penalty event |
| `SUMMARY_PENDING` | ❌ No | Excluded until closed | Not yet submitted |
| `INCOMPLETE` | ❌ No | Excluded | Closed without a submitted summary |
| `REOPENED` | ❌ No | Excluded until resubmitted | Manager reopened |
| `PENDING_CORRECTION` | ❌ No | Whole day excluded until resolved | Correction in flight |

## 8. Recommended calculation approach

**Recommendation: Option D — preview rollup first, then manager-approved monthly
`KRAAchievement`.**

- **A (direct write):** rejected — auto-writes scores before business validation; no exception
  review; correction/incomplete handling becomes fragile.
- **B (preview → convert):** good, and is the core of D.
- **C (review input only):** useful but insufficient alone — doesn't produce comparable
  `KRAAchievement` records.
- **D (hybrid):** ✅ dynamic read-only preview → manager reviews exceptions → explicit approval →
  `KRAAchievement` written → optionally referenced by `PerformanceReview`. Safer,
  manager-review-friendly, audit-friendly, and respects correction/incomplete status. **The
  existing `/api/kra/sync-achievements` + `recordAchievement` precedent makes D low-risk to
  build.**

## 9. Preview API design (design only — do not implement)

All `GET` endpoints are **read-only** (no writes); the single `POST` is the only writer and is
manager-gated + audited. Date handling: all use **date-only** period boundaries via the
`@/lib/date-only` helpers and the effective-status overlay (never raw stored status). Visibility:
employees see only their own data and **no exact points unless business approves** (band/eligible
counts only); managers see their reports per existing Daily Activity team rules.

| Endpoint | Method | Role | Params | Response (shape) | Writes? | Visibility | Audit |
|----------|--------|------|--------|------------------|---------|-----------|-------|
| `/api/enterprise-kra/daily-activity/my-preview` | GET | Employee | `?from&to` | `{ eligibleDays, excludedDays[], band, points?, statusBreakdown }` | No | Self only; points hidden unless approved | — |
| `/api/enterprise-kra/daily-activity/my-monthly-preview` | GET | Employee | `?month=YYYY-MM` | `{ month, eligibleDays, band, contributionPreview, exclusions[] }` | No | Self only | — |
| `/api/enterprise-kra/daily-activity/team-preview` | GET | Manager | `?month` | `[{ employeeId, eligibleDays, band, exceptionsCount }]` | No | Manager's reports only | — |
| `/api/enterprise-kra/daily-activity/employee/[employeeId]/preview` | GET | Manager | `employeeId`, `?month` | per-employee rollup + per-day status | No | Manager-of-employee only | — |
| `/api/enterprise-kra/daily-activity/exceptions` | GET | Manager | `?month` | `[{ employeeId, date, status, reason }]` | No | Manager's reports only | — |
| `/api/enterprise-kra/daily-activity/convert-to-achievement` | POST | Manager | `{ employeeId, month, metricMappings[] }` | `{ created[], skipped[] }` | **Yes** | Manager-of-employee only | **`PerformanceAudit` row required** |
| `/api/enterprise-kra/activity-mapping` | GET | Admin | — | mapping config | No | Admin only | — |
| `/api/enterprise-kra/activity-mapping` | PUT | Admin | mapping config | updated config | **Yes (config)** | Admin only | Audit recommended |

## 10. Future write path (design only — do not implement)

1. Daily Activity captured daily (existing).
2. Rollup computed **dynamically** from eligible days (existing helpers; no storage).
3. Monthly Enterprise KRA **preview** generated (read-only API, §9).
4. Manager reviews **exceptions** (LATE_SUBMITTED flags, excluded days).
5. Manager **confirms/approves** conversion for an `(employee, month)`.
6. System writes `KRAAchievement` via `recordAchievement(...)` with
   `sourceReference = "daily-activity:<YYYY-MM>"` and the mapped metric's `expectedTarget` +
   `weightage`.
7. `PerformanceReview` for the period may reference the approved achievement as an input section.

**Required controls:**
- **Approval step:** mandatory manager approval before any write (step 5).
- **Audit:** one `PerformanceAudit` row per conversion (`entityType="KRAAchievement"`,
  `action="DAILY_ACTIVITY_CONVERT"`, `performedBy=managerId`, `newValue=`provenance JSON).
- **Rollback:** conversions are reversible by setting the created `KRAAchievement.status` to
  `"reversed"` (no hard delete) + an audit row; `sourceReference` makes the set findable.
- **Duplicate prevention:** §13.
- **Month-locking:** once a `(employee, period, source-month)` is converted, the month is locked;
  re-conversion requires an explicit reopen (manager) that reverses prior rows first.
- **Correction-after-conversion:** a Daily Activity correction approved *after* conversion does
  **not** silently mutate `KRAAchievement`; it surfaces as a new exception requiring a manager
  re-convert (reverse + recreate), preserving audit history.

## 11. UI plan (design only — do not implement)

- **Employee:** "My KRA contribution" preview, monthly productivity contribution, status/exclusion
  reasons. **No exact points shown unless business approves** — band + eligible-day counts only.
- **Manager:** team KRA preview, per-employee monthly contribution, exceptions requiring review,
  convert/approve action, audit trail. Lives under `/settings/performance` or a new manager view.
- **Admin:** activity→KRA mapping (which metric a band/activity-type feeds), target weights,
  role-specific KRA mapping.

## 12. Audit / approval rules

- Every conversion requires explicit manager approval (no auto-write).
- Every write (convert, reverse, mapping change) emits a `PerformanceAudit` row.
- `LATE_SUBMITTED` days are always flagged for review before counting.
- Admin mapping changes are versioned via audit (`oldValue`/`newValue`).

## 13. Duplicate-prevention rules

- A conversion for `(employeeTargetId, metricId, source-month)` must be **idempotent**: before
  writing, query existing `KRAAchievement` rows with the matching `sourceReference` prefix
  (`"daily-activity:<YYYY-MM>"`) and `status="active"`; if present, **skip** (report in
  `skipped[]`) unless an explicit reopen reversed them first.
- Month-locking (§10) is the primary guard; the `sourceReference` query is the secondary guard.
- Mirrors the legacy `SalesFunnel.crmOpportunityId` idempotency pattern used elsewhere in the
  codebase.

## 14. Legacy KRA isolation rules

Legacy surface that must **not** receive Daily Activity logic (confirmed in audit):
- `src/lib/kra-engine.ts` (`computeKRAProgress`, `prisma.kRA`, `prisma.weeklyReview`).
- APIs: `/api/kras`, `/api/kras/me`, `/api/kras/[id]`, `/api/kra-sync`, `/api/reviews`,
  `/api/reviews/[id]`, `/api/employees/[id]/kras`, `/api/employees/[id]/reviews`.
- Pages: `/kras` (`KrasClient`).
- Consumers: `/api/certifications/[id]/approve`, dashboard `weeklyReview.count` (`src/app/page.tsx`).

**Confirmation:** `grep` over `src/lib/performance-engine` and `src/lib/kra-engine.ts` for
`dailyActivity`/`DailyActivitySummary`/`isDailyActivityKraEligible` returns **NONE** — Daily
Activity is not wired into either KRA system today. Daily Activity integration targets
**Enterprise** (`performance-engine`) only. Legacy pages remain historical/read-only and unbroken.

## 15. Daily Updates retirement confirmation

Old Daily Updates remains retired (Phase W6.2): nav/tiles point to `/daily-activity`,
`/daily-updates` redirects, the API returns `410 Gone`, and the employee-profile blockers panel
reads `DailyActivitySummary`. The `DailyUpdate` Prisma model/table and historical rows are
**preserved untouched**. This plan introduces **no new dependency on `DailyUpdate`** and does not
revive it. (Full record: `WEBAPP_GAP_CLOSURE_PLAN.md` §"Daily Updates Usage Audit".)

## 16. Implementation phases (future)

- **W8 — Admin setup & mapping:** create Daily-Activity `KRAMetric`(s) (`calculationSource=
  "DAILY_ACTIVITY"`), mapping config + admin UI/API. (Config writes only; no achievement writes.)
- **W9 — Preview APIs + employee/manager preview UI:** all read-only (§9 GETs, §11).
- **W10 — Convert path:** manager exceptions + `convert-to-achievement` (the first achievement
  writes), audit, duplicate prevention, month-locking.
- **W11 — PerformanceReview input section + reporting.**
- **W12 — UAT then production rollout** (per existing workflow; production last, explicitly).

## 17. Open business decisions

1. **Points visibility:** may employees see exact eligible points, or band + eligible-day counts
   only? (UI assumes band-only until approved.)
2. **`LATE_SUBMITTED` policy:** count at full value, reduced value, or manager-discretion only?
   (KRA_REPORTING §17.4.)
3. **Metric definition:** one composite "Daily Activity contribution" metric, or several
   (coverage, productivity, per-type)? Drives admin mapping.
4. **Working-days denominator:** calendar working days, per-employee roster, or holidays-aware?
5. **Weighting:** what `weightage` does Daily Activity carry within each role's `KRATemplate`?
6. **Correction-after-conversion:** auto-flag only (recommended) vs. block month-close until
   resolved.

## 18. Risks and safeguards

| Risk | Safeguard |
|------|-----------|
| Auto-writing scores before validation | Option D: manager approval mandatory before any write |
| Duplicate achievements | `sourceReference` idempotency + month-locking (§13) |
| `Employee`↔`EmployeeProfile` mismatch | Resolve via `EmployeeProfile.userId` at read time; skip + report employees without a profile |
| Correction changing already-converted month | Re-exception (reverse + reconvert), never silent mutation (§10) |
| Accidental legacy-KRA coupling | §14 isolation rules + guardrail comments in code |
| Schema drift / migration risk | None — integration uses existing String/JSON fields; no schema change planned for the read/preview phases |
| Production exposure | All phases land on dev → UAT → production last, explicitly (§16) |

## 19. No-production confirmation

This phase made **documentation-only** changes. No code, Prisma schema, migration, `db push`,
`KRAAchievement`/`PerformanceReview`/`EmployeeTarget`/`EmployeeProfile` write, `DailyUpdate`
revival, mobile (`/mobile`), or production change was performed. Validation commands (§Task 11)
were run read-only to confirm the tree is clean.

---

## Phase W8 — Daily Activity KRA mapping config/admin setup (IMPLEMENTED, config only)

**Status:** Implemented. **Config only — no `KRAAchievement`, `PerformanceReview`, or
`EmployeeTarget` writes; no schema change; no migration.**

**What was built:**
- **Engine** `src/lib/performance-engine/daily-activity-mapping.ts` — defines the three default
  mapping metrics (`DAILY_ACTIVITY_COVERAGE`, `DAILY_ACTIVITY_PRODUCTIVITY`,
  `DAILY_ACTIVITY_COMPLIANCE`), an idempotent `ensureDefaultDailyActivityKraMetrics()`,
  `listDailyActivityKraMetrics()`, and `validateDailyActivityFormulaJson()`. Touches **only**
  `KRAMetric` (+ `PerformanceAudit` for audit). Exported via `performance-engine/index.ts`.
- **Admin API** `GET/POST/PUT /api/admin/performance/daily-activity-mapping` — manager-gated
  (`requirePermission("Settings","Performance","EDIT")`). GET lists DA metrics; POST idempotently
  creates/reconciles the 3 defaults; PUT edits one metric's `formulaJson` (validated) / `status`.
  Rejects any `id` whose `calculationSource !== "DAILY_ACTIVITY"`. No achievement/review/target writes.
- **Admin UI** — new "Daily Activity KRA" tab in `/settings/performance`
  (`components/DailyActivityKraMapping.tsx`): view metrics, "Create Default Daily Activity KRA
  Mapping" button, enable/disable, edit `formulaJson`. Shows the mandatory warning *"This mapping
  config does not write achievements. KRAAchievement conversion will be added in a later phase."*
  **No convert-to-achievement button; no monthly write workflow.**

**KRAMetric `calculationSource = "DAILY_ACTIVITY"` usage:** the discriminator for all mapping
metrics. Because `KRAMetric` has **no `targetJson`/`weight`/`isActive` column**, the target
definition is nested under `formulaJson.target`, enable/disable uses `status`
("active"/"inactive"), and per-template weight remains a `KRATemplateItem` concern (later). **No
schema change required** — confirmed.

**`formulaJson` shape (combined formula + nested target):**
```json
{
  "source": "DAILY_ACTIVITY", "version": 1, "metricType": "COVERAGE|PRODUCTIVITY|COMPLIANCE",
  "eligibleStatuses": ["CLOSED","LATE_SUBMITTED"],
  "excludedStatuses": ["NO_ACTIVITY","SUMMARY_PENDING","INCOMPLETE","REOPENED","PENDING_CORRECTION"],
  "pointsVisibility": "MANAGER_ONLY", "requiresManagerApprovalForConversion": true,
  "target": { "period": "MONTHLY", "workingDayBasis": "CALENDAR_DAYS_EXCLUDING_WEEKENDS_PENDING_DECISION",
              "minimumCoveragePercent": 90, "minimumProductiveDays": null, "minimumEligiblePoints": null }
}
```

**Idempotency:** `ensureDefaultDailyActivityKraMetrics()` keys on the unique `code` — missing
metric → created; existing → catalogue fields reconciled and `formulaJson` seeded **only if empty**
(admin edits never overwritten); `status` left as-is. Re-running creates no duplicates.

---

## Phase W8.1 — UI usability correction (form-based, no JSON)

Business users have zero JSON/coding knowledge, so the W8 raw-`formulaJson` textarea was unacceptable.

- **Removed raw JSON editing** from the Daily Activity KRA mapping UI. `formulaJson` is now an
  internal storage detail only — never shown or edited in the UI, and not returned to the UI by the API.
- **Added form-based Daily Activity KRA mapping controls** (`DailyActivityKraMapping.tsx`): metric
  type / period dropdowns, eligible & excluded status checkboxes, manager-approval and points-visibility
  toggles/dropdowns, and number fields for minimum coverage % / productive days / eligible points /
  working-day basis.
- **Engine mappers** (`daily-activity-mapping.ts`): `parseDailyActivityMetricConfig(metric)`,
  `buildDailyActivityMetricFormulaJson(formPayload)`, `validateDailyActivityMetricFormPayload(payload)`.
  The engine still stores config in `KRAMetric.formulaJson`; all UI/API editing uses business fields.
- **API** (`/api/admin/performance/daily-activity-mapping`): GET returns parsed `config` + metadata
  (no raw JSON); PUT accepts a business `config` payload and converts it internally. Still config-only —
  no `KRAAchievement`/`PerformanceReview`/`EmployeeTarget` writes.
- **Confirmed KRA assignment is employee-wise**: `EmployeeTarget` is one row per employee. The Employee
  Targets UI now selects an employee **by name** (no raw profile ID), shows role/department/reporting
  manager, and labels the template as a **starting point**. Each employee can have different targets even
  on the same role template. Engine adds `listEmployeeProfilesForTargeting()` and enriches
  `listEmployeeTargets` with employee/designation/manager names.

## Phase W8.2 — Employee-wise KPI target assignment (IMPLEMENTED, EmployeeTarget + UI only)

W8.1 confirmed targets are employee-wise and assignable by name. W8.2 adds the per-KPI target
values, so two employees on the **same** role template can carry **different** targets (ISR Priya =
35 qualified leads/month, Sangeetha = 45). Role templates remain **starting points only**.

- **Structure:** `KRA Template → KPI / Metric → Employee-specific Target`. Per-KPI rows are stored
  internally in **`EmployeeTarget.targetJson`** (existing `@db.Text` column — **no schema change, no
  migration, no `db push`**). The UI never shows this JSON.
- **`targetJson` shape (v1):** `{ version, templateId, templateName, period, targets: [{ metricCode,
  metricName, category, source, unit, targetValue, weight, frequency, isActive, notes }] }`. The API
  converts business-friendly form rows ↔ JSON internally.
- **Engine** (`performance-engine/targets.ts`): `buildTargetRowsFromTemplate()`,
  `applyTemplateToEmployeeTarget()`, `saveEmployeeTargetRows()`, `getEmployeeTargetDetail()`,
  `parseEmployeeTargetJson()`, `validateTargetRows()`, plus `TARGET_SOURCES` / `TARGET_FREQUENCIES`
  constants. Unit/category/source are derived from each metric's `metricType`/`calculationSource`
  (Daily Activity metrics → `source = DAILY_ACTIVITY`).
- **API** (`/api/admin/performance/employee-targets`): `GET` (business-shaped list, no raw JSON),
  `GET [id]` (parsed KPI rows + employee/period context), `PUT [id]` (validate + save rows),
  `POST apply-template` (seed rows for **one** target only). All gated by `requirePermission(Settings,
  Performance, EDIT)`; actor recorded from `session.user.employeeId`.
- **UI** (`TargetManager.tsx`): per-target **Edit KPIs** panel — role-template dropdown + **Apply
  Template** button, editable KPI table (Target Value / Weight / Frequency / Source / Active / Notes),
  live total-active-weight indicator with a non-blocking ≠100% warning, **Save Targets**. No JSON
  textarea; no raw employee/profile ID field.
- **Template application affects only the selected employee's target** — never auto-assigned to a
  hierarchy or to all employees (bulk assignment intentionally NOT built).
- **Audit:** `employee_target_template_applied` and `employee_target_updated` via the existing
  `PerformanceAudit` table (`logPerformanceAudit`), recording `employeeProfileId`, `templateId`,
  changed-row summary, and actor.
- **Isolation confirmed:** **no** `KRAAchievement` writes, **no** `PerformanceReview` writes, no legacy
  `KRA`/`WeeklyReview`/`kra-engine.ts` use, no Daily Updates revival, no mobile changes, no production
  changes, no schema/migration.

## Phase W8.3 — Performance Audit visibility (IMPLEMENTED, read-only)

W8.2 wrote `PerformanceAudit` rows but the Audit tab fetched a non-existent `/api/audit` and showed
nothing. W8.3 adds a proper read endpoint and wires the tab — **visibility only, no writers changed.**

- **Read endpoint:** `GET /api/admin/performance/audit` — admin/manager only (same `requirePermission(
  Settings, Performance, EDIT)` gate as sibling routes). Optional filters: `entityType`, `action`,
  `employeeProfileId`, `startDate`, `endDate` (YYYY-MM-DD, parsed via `@/lib/date-only`), `limit`
  (default 50, max 200). Newest-first. **READ-ONLY — only `GET`; no writes.**
- **Engine:** `listPerformanceAuditDetailed()` in `performance-engine/audit.ts` — batched lookups (no
  N+1) resolve actor (`Employee`) names, EmployeeTarget→employee names, and KRAMetric names; builds
  friendly `actionLabel`/`entityLabel` + a business `summary` (no raw JSON exposed). Existing
  `logPerformanceAudit` writer is unchanged (append-only).
- **UI** (`PerformanceAudit.tsx`): table **Time · Action · Entity · Employee · Performed By · Summary**
  with friendly labels (Template Applied, Employee Target Updated, Daily Activity Mapping Created/
  Updated/Reconciled) and simple filters (Action, Entity, Employee, Date range). No JSON shown.
- **Events surfaced:** `employee_target_template_applied`, `employee_target_updated`,
  `DAILY_ACTIVITY_MAPPING_CREATE/UPDATE/RECONCILE`, `performance_review` CREATE/UPDATE.
- **Isolation:** no `KRAAchievement`/`PerformanceReview`/`EmployeeTarget` writes (viewing audit never
  mutates data), no legacy KRA/WeeklyReview, no Daily Updates, no schema/migration, no mobile, no
  production changes.

## Phase W8.4 — Read-only KRA target visibility (IMPLEMENTED, employees + managers)

W8.2 assigns per-KPI targets; W8.3 made the audit visible. W8.4 lets **employees see their own**
assigned KPI targets and **managers see their team's** — all read-only, no achievement/scoring.

- **Engine** (`performance-engine/targets.ts`, read-only): `getMyAssignedKraTargets(employeeId)`
  (self, resolved via `EmployeeProfile.userId`), `getEmployeeAssignedKraTargets(employeeProfileId)`,
  `getManagerTeamAssignedKraTargets(managerEmployeeId)` (direct reports via `reportingManagerId`),
  and `listAssignedKraTargetsGrouped(filters)`. All parse `targetJson` into business KPI rows
  (kpiName, category, source, unit, targetValue, weight, frequency, active, notes) — **no raw JSON**.
- **Employee API:** `GET /api/performance/my-targets` — logged-in employee only, **SELF-SCOPED**
  (resolved from session; no employeeId/employeeProfileId override accepted), read-only.
- **Manager API:** `GET /api/admin/performance/team-targets` — admin/manager only (Settings →
  Performance gate); optional filters employeeProfileId/periodId/templateId/status; returns targets
  grouped by employee. Read-only. (Distinct from the legacy team-level `TeamTarget` model.)
- **Employee UI:** `/performance/my-targets` page — "My KRA Targets" table (KPI · Category · Source ·
  Unit · Target · Weight · Frequency · Status), read-only (no edit/apply/save). Managers additionally
  see a read-only "My Team's KRA Targets" section (direct reports) that points to Settings →
  Performance for assignment. Nav link "My KRA Targets" added to the employee "Me" and manager
  "People" sidebar groups (distinct from legacy `/kras` and from Settings → Performance admin config).
- **Isolation:** no `KRAAchievement`/`PerformanceReview` writes; viewing never mutates EmployeeTarget;
  no legacy KRA/WeeklyReview; no Daily Updates; no schema/migration; mobile/production untouched.

## Phase W9 — Read-only Enterprise KRA achievement preview (IMPLEMENTED)

Calculates progress against assigned `EmployeeTarget` KPI rows from operational sources.
**Preview only** — nothing is saved. Structure: KRA Template → KPI/Metric → Employee Target → **Preview**.

- **Engine** (`performance-engine/achievement-preview.ts`, read-only): `getMyKraAchievementPreview`
  (self), `getEmployeeKraAchievementPreview`, `getManagerTeamKraAchievementPreview` (direct reports),
  `listKraAchievementPreviewGrouped`, `listAchievementPreviewExceptions`, plus pure helpers
  `calculateKpiPreview`, `calculateDailyActivityKpiPreview`, `calculatePreviewPercentage`,
  `buildPreviewStatus`, `buildDailyActivityContext`, `inferDirection`.
- **Daily Activity supported.** Uses `resolveEffectiveDailyActivityStatus` + `isDailyActivityKraEligible`
  over the range (working days = weekdays; no holiday calendar yet — documented denominator). Computes
  eligible/excluded/incomplete/no-activity/reopened/pending-correction days, eligible points, activity
  count, productive days. Coverage % = eligible ÷ working days; productivity = points/productive days;
  compliance ("max allowed" incomplete/pending/reopened) is LOWER_IS_BETTER. `@db.Date` bounds built via
  `dateKeyToDbDate` (IST-safe).
- **Unsupported sources** (CRM_LEADS/MEETINGS/PIPELINE/OPPORTUNITY, FINANCE_COLLECTION, MANUAL) return
  `sourceStatus: "NOT_IMPLEMENTED"` — never fail.
- **APIs:** `GET /api/performance/my-achievement-preview` (self, redacts raw DA points),
  `GET /api/admin/performance/achievement-preview` (manager, exact), `.../achievement-preview/exceptions`.
- **UI:** read-only preview section on `/performance/my-targets` (employee + manager Team KRA Preview),
  month selector, status bands — **no edit/convert buttons**, no raw JSON/IDs.
- **Rules:** achievement % capped at 200; weighted preview = % × weight ÷ 100. **No** `KRAAchievement`/
  `PerformanceReview`/`EmployeeTarget`/`KRAMetric`/`DailyActivity` writes; no `PerformanceAudit` for
  preview reads; no legacy KRA/WeeklyReview; no Daily Updates; no schema/migration; mobile/prod untouched.
