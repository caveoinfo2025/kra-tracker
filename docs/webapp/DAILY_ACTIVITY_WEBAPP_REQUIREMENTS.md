# Daily Activity & Productivity — Webapp Requirements

> **Status: Planning only.** No Prisma schema changes, no migrations, no `prisma db push`,
> no database data changes, no API changes, no mobile code changes, and no production
> changes were made while producing this document. UAT/dev only. **Do not touch production.**

## 1. Purpose

Replace the manual webapp Daily Updates workflow (`/daily-updates`, `DailyUpdate` model) with
**Daily Activity & Productivity**: CRM actions are auto-captured as scored events throughout
the day; the employee submits only an end-of-day summary (Blockers, Next-day plan, Final
remarks); the day is assigned a status that determines KRA eligibility; employees see a
banded productivity status, managers see exact points. This document specifies the target
**webapp** workflow in implementation-ready detail. The companion
[`WEBAPP_GAP_CLOSURE_PLAN.md`](./WEBAPP_GAP_CLOSURE_PLAN.md) covers what's missing to get
here; this document specifies what "here" is.

## 2. User roles

- **Employee** (ISR / BDE / Sales employee / other non-manager roles) — owns their own daily
  activity and summary.
- **Manager** — owns team visibility, correction approval, day reopening.
- **Admin** (future, Phase 6) — owns activity-rule and role-target configuration.

## 3. Employee workflow

1. Throughout the day, CRM actions the employee performs (lead qualification, lead/opportunity
   updates, task/meeting completion, proposals, notes/follow-ups) are auto-captured, with no
   employee action required.
2. At any point during the day, the employee can open the Daily Activity page and see today's
   captured activity timeline and running banded status (not points).
3. Before the cutoff (8:00 PM) or within the grace window (until 10:00 PM), the employee fills
   in Blockers, Next-day plan, and Final remarks (optional) and submits the end-of-day summary.
4. Submitting the summary closes the day (if valid activity exists) and is itself worth +2
   points ("End-of-day summary submitted").
5. The employee can edit the three free-text fields until the grace window ends; after that
   they're locked unless a next-working-day late submission or manager reopen applies.
6. If the employee notices a missing or wrong captured activity, they file a correction
   request; the score only changes if a manager approves it.

## 4. Manager workflow

1. View a team daily-activity dashboard: no-activity/absent employees, incomplete days,
   summary-pending employees, correction-request queue, reopened-days list.
2. Drill into any team member's specific day to see the full activity timeline, summary, and
   exact point total.
3. Approve or reject correction requests, with a required reason on reject.
4. Reopen a day that locked as Incomplete beyond the next-working-day late-submission window,
   so the employee can resubmit.
5. **Cannot** manually adjust point values for any activity or day, under any circumstance —
   this must be enforced server-side, not just hidden in the UI.
6. View weekly/monthly productivity rollups for the team.

## 5. Admin/settings workflow (Phase 6, not built now)

1. Configure point values per activity type (`ProductivityActivityRule`).
2. Configure per-role daily minimum targets (`ProductivityRoleTarget`) — ISR=8, BDE=10, Sales
   Manager=12 as defaults; Accounts/Finance and Operations/Support left unconfigured (null,
   not zero) until business rules for those roles are defined.
3. Configure cutoff/grace timing (default 8:00 PM / 10:00 PM) — global default with a possible
   future per-role override, not decided here.

## 6. Activity capture rules

- Activity is auto-captured continuously during the day as the underlying CRM action occurs
  (not batched or computed only at summary time).
- Each captured event maps to exactly one scored activity type (§8) with a fixed point value
  unless an admin-configured override exists.
- **No-activity rule:** if an employee has zero qualifying CRM activity for the day, the day is
  marked `No activity recorded` / Absent and is excluded from KRA — regardless of whether they
  later submit a summary (a summary with zero underlying activity does not manufacture
  productivity; see §9 for the exact precedence between "no activity" and "summary submitted").
- Duplicate-prevention is enforced per event, not per day: e.g. task completion counts once per
  status→Completed transition (already the existing behavior of `task_completed` in
  `pipeline/tasks/[id]/route.ts:35`, reused unchanged); a qualified-lead event counts once per
  lead per qualification (not per subsequent edit); a proposal-sent event counts once per
  proposal version (pending the open question in
  [`WEBAPP_GAP_CLOSURE_PLAN.md`](./WEBAPP_GAP_CLOSURE_PLAN.md) G-09 about proposal identity).

## 7. Qualified lead rules

- Only a transition from a non-Qualified stage (Raw/Data, i.e. anything before `QUALIFIED` in
  the existing `LEAD_STAGES` ordering — `src/types/pipeline.ts:3-11`) **into** `QUALIFIED`
  counts as a scored qualification event.
- A lead created but left at `NEW_LEAD` (raw upload, unqualified data entry) scores nothing.
- Any subsequent update, follow-up, or stage progression on an *already-qualified* lead scores
  under its own activity type (lead updated / opportunity updated), never as a second
  qualification event.
- **Permissions:**

| Role | Permission |
|---|---|
| ISR / BDE / Sales employee | Can qualify own assigned leads only |
| Manager | Can qualify, audit, or revert qualification on any lead for their team |
| Other employees | No qualification rights unless the lead is assigned to them |

  This reuses the existing ownership check already present in
  `pipeline/leads/[id]/stage/route.ts:32-34` (`!isManager && lead.assignedToId !==
  employeeId → 403`) — no new RBAC primitive is required for the qualification gate
  specifically; the gate that already exists for stage changes in general is sufficient.

## 8. Productivity scoring rules

| Activity | Points |
|---|---|
| Qualified lead created (Raw/Data → Qualified) | 3 |
| Lead updated / follow-up | 1 |
| Task completed | 2 |
| Meeting scheduled | 2 |
| Meeting completed | 4 |
| Proposal sent | 5 |
| Opportunity updated | 3 |
| Call / email / WhatsApp note added | 1 |
| End-of-day summary submitted | 2 |

- **Employee visibility:** banded status only.

| Score range | Employee status |
|---|---|
| 0 | No activity recorded |
| 1–4 | Low activity |
| 5–9 | Active |
| 10–14 | Productive |
| 15+ | Highly productive |

- **Manager visibility:** exact point total, plus the full per-event breakdown.
- **Role-based daily minimum targets:** ISR = 8, BDE = 10, Sales Manager = 12. Accounts/
  Finance and Operations/Support are explicitly undefined for now (no target configured,
  treated as "not yet applicable," never as "target = 0" — a role with no target should not be
  flagged as under-target by default).
- Points are rule-based and **only** an admin (Phase 6) can change the rule values; a manager
  can never directly edit a point value for any individual event or day.

## 9. End-of-day summary rules

- The auto-generated portion (Activities completed, Leads qualified, Meetings completed,
  Proposals sent, Tasks completed, Follow-ups done) is **read-only** to the employee — computed
  from that day's captured activity, never typed.
- The employee-input portion is exactly three fields: Blockers, Next-day plan, Final remarks
  (remarks optional; the other two are required to submit).
- Submitting the summary is the action that closes the day, *provided* valid activity already
  exists for it — submitting a summary on a day with zero captured activity does not convert
  `No activity recorded` into `Closed`; the no-activity rule (§6) takes precedence over summary
  submission. (This sequencing is an explicit design decision, not stated verbatim in the
  source requirements, and should be confirmed with Vijesh before Phase 3 — flagged again in
  §18.)
- The employee cannot edit system-captured activities under any circumstance — the only
  editable surface is the three summary fields, and only until the grace cutoff.

## 10. Correction request rules

- An employee files a correction request against a specific day, describing a missing or
  wrong activity.
- The request does not affect score while pending.
- A manager reviews: **Approve** (the correction is applied and the day's score recomputes) or
  **Reject** (no change; a reason should be recorded).
- This is the only path by which a closed day's score can change after the fact.

## 11. Late submission/reopen rules

- Cutoff: **8:00 PM**. Grace: until **10:00 PM**.
- The employee can edit the summary until the grace window ends.
- After 10:00 PM with no summary submitted, the day locks as `Incomplete`.
- The employee can still submit within the **next working day** — this is a system-permitted
  late submission, not a manager action — but only counts toward KRA after acceptance (the
  exact accept mechanism — automatic on submission within window, vs. requiring explicit
  manager sign-off — is an open question, §18).
- Beyond the next working day, the day remains `Incomplete` permanently unless a manager
  manually reopens it; after reopening, the employee resubmits and the day becomes `Reopened`,
  counted only after that resubmission (and approval, if required).
- Manager approval is required only for: correction requests, late submissions beyond the
  allowed next-working-day window, and reopened days — never for the ordinary on-time
  submission path.

## 12. KRA impact

- Daily productivity rolls up into a daily score, then weekly/monthly reports, then KRA input.
- **Only `Closed` days count** toward any rollup (and `SubmittedLate`-after-acceptance,
  `Reopened`-after-resubmission, per their own rules above).
- `Incomplete` days are excluded entirely — not counted as zero, simply not included in the
  denominator either, which matters for any average calculation.
- Correction requests affect score only after manager approval.
- Quality indicators (e.g. qualified-lead quality, proposal value, meeting outcome,
  conversion impact) are explicitly for **manager/KRA review only** — they never modify the
  daily score directly.
- The existing `KRA`/`WeeklyReview`/`WeeklyCommit` models remain the system of record for
  formal KRA tracking; the new productivity rollup is an **input** a manager sees and
  considers when completing a `WeeklyReview`, not an automatic overwrite of `WeeklyReview.score`
  — confirmed in the gap audit that nothing today wires `DailyUpdate` into KRA, so this is a
  net-new integration point with no existing behavior to preserve compatibility with.
  **Superseded (2026-06-29, Phase W6.2):** Enterprise KRA was selected as the only future KRA
  path — see Phase W6.2 notes below. `KRA`/`WeeklyReview` is no longer the system of record for
  *future* Daily Activity KRA wiring; any future write path targets `EmployeeProfile`/
  `EmployeeTarget`/`KRAAchievement`/`PerformanceReview` instead.

**Daily Activity replaces Daily Updates.** Old Daily Updates must not be used for future
productivity/KRA workflows — Daily Activity is the sole active workflow for daily
entry/CRUD/productivity/reporting/KRA purposes (2026-06-29, Phase W6.2).

## 13. Reporting requirements

- Daily team activity dashboard (manager-facing, §4).
- Weekly/monthly productivity rollup per employee and per team.
- No-activity-day frequency report (for manager attention, not punitive automation).
- Correction-request volume/outcome report (for process health, e.g. "are corrections mostly
  approved or rejected" signals whether capture logic needs fixing).
- Whether historical `DailyUpdate` data should remain visible: **yes, read-only**, per the
  Option C hybrid recommendation (§19 implementation phases / gap-plan §11) — old data is not
  deleted or hidden, just frozen and not added to.

## 14. RBAC requirements

| Actor | Allowed | Forbidden |
|---|---|---|
| Employee | View own daily activity; submit own summary; request own correction | View another employee's activity; submit another employee's summary (including via any manager-override path — explicitly removing the current Daily Updates `body.employeeId` override capability, gap G-07) |
| Manager | View team daily activity (own team only); approve/reject corrections for their team; reopen days for their team; view exact points | View outside their team unless an existing higher-level role explicitly grants it (not assumed); manually adjust any point value (hard rule, gap G-08) |
| Admin | Configure activity rules and role targets (Phase 6) | Everything else outside config |

Object-level checks (e.g. "is this employeeId actually on this manager's team") must be
explicit in every manager-facing handler, following the existing pattern in
`pipeline/leads/[id]/stage/route.ts:32-34` and `api/daily-updates/[id]/route.ts:13` — not
assumed from `isManager` alone.

## 15. Required UI changes

**Employee webapp page** (replaces `/daily-updates` for non-manager view):
- Today's productivity status (banded label).
- Auto-captured activity timeline (qualified leads, tasks completed, meetings completed,
  proposals sent, follow-ups done).
- Blockers input, Next-day plan input, Final remarks input (optional).
- Submit end-of-day summary action.
- Correction request entry point.
- Summary status indicator (Open / Closed / Incomplete / etc.).

**Manager webapp page** (replaces manager mode of `/daily-updates`):
- Team daily activity dashboard: no-activity/absent list, incomplete list, summary-pending
  list, correction-request queue, reopened-days list.
- Exact productivity points per employee.
- Weekly/monthly rollup view.

**Admin webapp page** (Phase 6, later): activity rules, role targets, cutoff/grace settings.

## 16. Required API changes

### Employee
| Endpoint | Method | Purpose | Permission | Scope |
|---|---|---|---|---|
| `/api/daily-activity/today` | GET | Today's captured activity + status | Authenticated | self |
| `/api/daily-activity/history` | GET | Past days' summaries/status | Authenticated | self |
| `/api/daily-activity/summary` | POST | Submit end-of-day summary | Authenticated | self only, no employeeId override |
| `/api/daily-activity/summary/[id]` | PUT | Edit own free-text fields pre-grace-cutoff | Authenticated | owner only, server-enforced cutoff |
| `/api/daily-activity/corrections` | POST | File correction request | Authenticated | self |

### Manager
| Endpoint | Method | Purpose | Permission | Scope |
|---|---|---|---|---|
| `/api/daily-activity/team` | GET | Team dashboard | `isManager` | own team |
| `/api/daily-activity/team/[employeeId]/[date]` | GET | Drill-in | `isManager` | must verify employee is on this manager's team |
| `/api/daily-activity/corrections/[id]/approve` | POST | Approve correction | `isManager` | team only |
| `/api/daily-activity/corrections/[id]/reject` | POST | Reject correction | `isManager` | team only |
| `/api/daily-activity/day/[id]/reopen` | POST | Reopen locked day | `isManager` | team only |

### Admin (Phase 6)
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/productivity/rules` | GET/PUT | Activity point values |
| `/api/productivity/role-targets` | GET/PUT | Per-role daily minimums |

Every manager-mutating endpoint must write an audit record (reusing `AuditLog`,
`prisma/schema.prisma:830-846` — see §17.7) so "managers never adjust points" is independently
verifiable, not just asserted.

## 17. Required data model changes

Candidate models (proposed, not created), each evaluated for reuse against existing models —
this evaluation is shared with, and unchanged from,
`docs/Mobile/DAILY_ACTIVITY_PRODUCTIVITY_WORKFLOW_PLAN.md` §14, since the schema is one shared
layer regardless of which UI (webapp or mobile) reads/writes it:

### 17.1 `DailyActivityLog`
Per-event scored record. `CrmActivity` is the closest existing analog (generic
employee-attributed audit log) but lacks `points`/`activityDate`/dedupe support and is also
used for non-scored events — recommend a **new dedicated table** rather than overloading
`CrmActivity`. Proposed shape: `id, employeeId, activityType, points, sourceEntityType,
sourceEntityId, leadId?, opportunityId?, taskId?, meetingId?, activityDate, occurredAt,
dedupeKey (unique), createdAt`. Indexes: `[employeeId, activityDate]`, `[activityType]`,
unique `dedupeKey`.

### 17.2 `DailyActivitySummary`
One per employee per day: auto-generated counts + employee free text + day status.
`DailyUpdate` is structurally close but has the wrong fields and no status state machine —
recommend a **new model**, leaving `DailyUpdate` as frozen history (Option C, §19). Proposed
shape: `id, employeeId, activityDate (unique with employeeId), blockers, nextDayPlan,
finalRemarks?, dayStatus, submittedAt?, lockedAt?, totalPoints, createdAt, updatedAt`.

### 17.3 `DailyActivityCorrectionRequest`
No close existing analog (`ApprovalRule` is a monetary limit-ladder config, wrong shape).
Proposed: `id, employeeId, activityDate, summaryId?, requestType, description,
proposedActivityType?, status, reviewedById?, reviewedAt?, reviewNotes?, createdAt`.

### 17.4 `DailyProductivityScore`
Persisted snapshot at day-closure, so later rule changes don't retroactively rewrite history;
"today" (still open) is computed live from `DailyActivityLog`. Proposed: `id, employeeId,
activityDate (unique with employeeId), totalPoints, band, closedAt, ruleVersionTag?`.

### 17.5 `ProductivityActivityRule`
Admin-configurable point values. No existing analog fits (`CRMAutomationRule` is a different
rule shape for pipeline automation, not scoring). Proposed: `id, activityType (unique), label,
points, isActive, updatedAt, updatedById`.

### 17.6 `ProductivityRoleTarget`
Admin-configurable per-role daily minimums. `KRA.target` is free-text and per-employee, wrong
granularity. Proposed: `id, role (unique), dailyMinTarget?, updatedAt, updatedById` — nullable
target so an unconfigured role is explicitly "no target," not "target 0."

### 17.7 `DailyActivityAuditLog`
**Recommend reusing the existing `AuditLog`** (`prisma/schema.prisma:830-846`) with
`entityType: "daily_activity_summary"` rather than building a 7th new model — `AuditLog` is
already generic enough (`entityType`/`entityId`/`action`/`performedById`/`changes`/`notes`)
and this is the one case where a new table would be pure duplication.

## 18. Open questions

1. Does submitting a summary on a zero-activity day stay `No activity recorded`, or does the
   no-activity rule only apply if the employee never opens the summary form at all? (§9 — needs
   Vijesh's confirmation before Phase 3.)
2. Late-submission "acceptance" — automatic on submission within the next-working-day window,
   or does a manager have to explicitly accept it?
3. Finance/Accounts and Operations/Support — what activities count, and what are their daily
   targets?
4. Exact role names for `ProductivityRoleTarget.role` — reconcile against
   `src/lib/rbac.ts`/`src/lib/roles.ts` (two coexisting authorization systems, CLAUDE.md
   gotcha #6).
5. Proposal-sent identity/versioning — is a new explicit "Proposal" concept needed, or is the
   current 1:1 lead↔proposal-via-stage-change assumption acceptable indefinitely? (gap G-09)
6. Should `DailyUpdate` be migrated/backfilled into `DailyActivitySummary` for historical
   continuity, or simply frozen read-only? (leaning frozen, per Option C — not finally decided)
7. Should `employees/[id]/page.tsx`'s blockers widget be re-pointed at the new summary's
   `blockers` field once available, or keep reading frozen `DailyUpdate` indefinitely?
8. Note-channel differentiation (call/email/WhatsApp) — needed for scoring, or fine
   undifferentiated at 1 point each?

## 19. Implementation phases

- **Phase 0 — Planning (this document + the gap closure plan).** No schema/API/production
  changes.
- **Phase 1 — Schema design review and migration (separately approved), webapp-scoped.**
  `DailyActivityLog`, `DailyActivitySummary`, `DailyActivityCorrectionRequest`,
  `DailyProductivityScore`, `ProductivityActivityRule`, `ProductivityRoleTarget`; resolve the
  `AuditLog` reuse decision (§17.7); add `CrmMeeting.status` if meeting-completion capture is
  approved.
- **Phase 2 — Event-capture hooks** on existing pipeline routes: qualification detection,
  meeting-completion detection (once schema allows), de-duplication keys.
- **Phase 3 — Webapp employee Daily Activity page**, replacing `/daily-updates` for the
  employee view.
- **Phase 4 — Webapp manager Daily Activity dashboard**, replacing manager mode of
  `/daily-updates`.
- **Phase 5 — Scoring, weekly/monthly/KRA-input wiring, reporting.**
- **Phase 6 — Admin settings** (activity rules, role targets, cutoff/grace config).
- **Phase 7 — Legacy `DailyUpdate` disposition** (Option C: freeze read-only; re-point or
  retire the `employees/[id]/page.tsx` blockers widget as decided).

**Recommended implementation strategy (Task 6): Option C — Hybrid transition.** Keep
`DailyUpdate` as a frozen, read-only historical table (no new rows after cutover); build the
new `DailyActivityLog`/`DailyActivitySummary` system as the system of record going forward;
the webapp switches to the new system for all *new* daily activity starting at cutover. This
is recommended over Option A (enhancing `DailyUpdate` in place — would force the wrong shape
and wrong semantics onto a model whose meaning is changing entirely, and conflates "manual
log" with "auto-captured + scored," which is a correctness problem, not just a tidiness one)
and over a "big-bang" version of Option B that migrates/deletes `DailyUpdate` immediately
(unnecessary risk to the one confirmed dependent — the blockers widget — for no compensating
benefit, since the gap audit found nothing else depends on it). Option C gets the clean
long-term model of Option B without forcing an immediate, riskier cutover of historical data.

## Phase W2 implementation notes (2026-06-25)

Backend foundation (capture + read APIs) implemented on the dev DB. Full record:
`docs/webapp/WEBAPP_GAP_CLOSURE_PLAN.md` "Phase W2 progress" and
`docs/webapp/DAILY_ACTIVITY_SCHEMA_DESIGN_REVIEW.md`. Notes specific to how the §6–§9 rules
were actually implemented:

- **§6 scoring:** `ProductivityActivityRule` is checked first (role-specific, then global
  active rule); falls back to the §6 default-points table in code
  (`DEFAULT_ACTIVITY_POINTS` in `src/lib/daily-activity.ts`) when no DB rule exists — the table
  is intentionally **not seeded** in Phase W2, so every capture today resolves via the code
  fallback. This matches the requirement to implement defaults as "safe code-level
  defaults/fallbacks only" without seeding.
- **§7 qualified-lead rule:** implemented as `prevStage !== "QUALIFIED" && newStage ===
  "QUALIFIED"` in all three lead-mutation routes (the dedicated `/stage` endpoint, the full
  `PUT`, and the mobile `PATCH`) via a shared `captureLeadStageChange` helper in
  `leads/[id]/route.ts` — one qualification rule, applied consistently across all three entry
  points rather than only the canonical one.
- **§9 correction requests:** not implemented in Phase W2 (read-only phase) — the
  `DailyActivityCorrectionRequest` model exists from Phase W1 but has no API yet.
- **§11 cutoff/grace:** `getDailyActivityForEmployee` computes and returns `cutoffTime`/
  `graceUntil`/`canSubmitSummary`/`canEditSummary` as response metadata using the §11 8 PM/10 PM
  constants, but no submit/edit endpoint exists yet to act on them — they describe timing only.
- **Employee/manager visibility split (§8):** enforced by constructing two different return
  shapes in `src/lib/daily-activity.ts` — `EmployeeDailyActivityView`/`EmployeeTimelineEntry`
  never include a `points` field anywhere (not just omitted at the API layer — the type itself
  has no such field, so it can't leak by accident); `ManagerEmployeeDayView`/
  `ManagerTimelineEntry` extend the employee shape and add `points`/`totalPoints`. Verified by
  a manual test asserting the serialized employee response JSON contains no `"points"` or
  `"totalPoints"` substring anywhere (`prisma/test-daily-activity-capture.ts`).
- **Manager team scoping:** matches the existing `/api/daily-updates` precedent — any
  `isManager === true` employee can see all employees (optionally filtered by `employeeId`),
  not narrowed to `Employee.reportsToId` direct reports, since no other endpoint in this
  codebase scopes manager visibility that way. Documented explicitly in code comments in case
  this should change in a later phase.

## Confirmation

No Prisma schema changes were made in Phase W2 (Phase W1's schema, already applied to dev, is
unchanged). No migrations were created or run. No `prisma db push` was run. No database *data*
was modified by anything committed — the manual verification script creates and fully deletes
its own throwaway rows. 4 new read-only API routes were created; 7 existing API route files
got additive capture hooks only (no existing behavior changed). No mobile code was modified.
Production was not touched. No `.env` files were committed.

**Do not touch production.**

## Phase W3 implementation notes (2026-06-29)

Read-only UI implementation against the Phase W2 APIs. UI-only — no API or schema changes.

- **Route:** `/daily-activity` (`src/app/daily-activity/page.tsx`). Does not replace
  `/daily-updates`; both are live simultaneously for validation.
- **Components:** `EmployeeActivityView.tsx` (employee read-only view), `ManagerActivityPanel.tsx`
  (manager team dashboard + inline expandable employee/day detail), `labels.ts` (display-only
  band/status/activity-type label and badge-variant maps — no business logic, presentation
  only).
- **Points-hiding enforcement:** `EmployeeActivityView` consumes `EmployeeDailyActivityView`/
  `EmployeeTimelineEntry` only — these TypeScript types have no `points` field at all (Phase
  W2's hard-rule design, §8), so the component cannot render points even by mistake. The
  manager components consume the separate `ManagerEmployeeDayView`/`ManagerTimelineEntry`/
  `TeamDailyActivityRow` types, which do carry `points`/`totalPoints`.
- **Manager-only gating:** `ManagerActivityPanel` is only rendered by `page.tsx` when
  `session.user.isManager` is true (server-side check before the component is even mounted) —
  not a client-side hide. The manager API routes additionally 403 non-managers themselves
  (defense in depth, already true since Phase W2).
- **No employeeId override:** the employee view never accepts or forwards an `employeeId` —
  it always reads the session's own `employeeId` server-side, matching `GET
  /api/daily-activity/today`'s self-scoped-only design.
- **Date filter (manager only):** `ManagerActivityPanel` owns date state client-side and
  re-fetches `GET /api/daily-activity/team?date=...` on change; the employee view has no date
  picker in this phase (today + a fixed 14-day history strip only, per Task 2's spec).
- **Detail drill-in:** implemented as Task 4 **Option A** (inline expandable row) — simplest
  fit for the existing table-row UI convention in this codebase; avoids adding a new modal/
  drawer primitive or a third route for a read-only preview.
- **No write workflows:** summary submit/edit, correction-request creation, and
  approve/reject/reopen are not implemented. The manager detail view renders disabled
  Approve/Reject/Reopen buttons labeled "Coming in next phase" per the spec's explicit
  instruction to keep future actions visible-but-disabled rather than omitted.

## Phase W3.1 browser verification notes (2026-06-29)

Manual browser verification performed against the local dev server using dev quick-login
impersonation (one non-manager — Priya Nair, BDE — and one manager — Vijesh Vijayan, Head of
Sales). Verification only — no code changes other than this documentation update.

- **Employee/manager visibility split (§8) reconfirmed at runtime**, not just by type
  inspection: a full-text scan of the rendered employee page found zero occurrences of
  "points"; direct `fetch()` calls to both manager-only routes from the employee's session
  returned `403`; an `employeeId` query-param override attempt on `/api/daily-activity/today`
  was silently ignored (identical response with and without it).
- **Manager totals/table/detail (Tasks 3–4) reconfirmed visually**: 16-employee team table,
  exact `Total Points` column, date-filter refetch via network log, inline detail expansion
  with full timeline + per-entry points, and disabled "Coming in next phase" Approve/Reject/
  Reopen buttons — no write call exists for any of them.
- **No mutating HTTP calls observed**: every `/api/daily-activity/*` request logged during
  both sessions was `GET`. `/daily-updates` CRUD ("+ Add Update" modal, Cancel) was exercised
  and is unaffected by the new banner.
- **Bug found, not fixed in this phase**: `GET /api/daily-activity/team?date=...` and
  `GET /api/daily-activity/team/[employeeId]/[date]` return the **previous day's** data
  relative to the requested date on a positive-UTC-offset server (confirmed on this IST dev
  server: requesting `2026-06-28` returned `summaryDate: "2026-06-27"`). Cause: `new
  Date("YYYY-MM-DD")` parses as UTC midnight, then `startOfDay()`'s `Date#setHours(0,0,0,0)`
  re-anchors to *local* midnight, shifting the day back by one wherever local time is ahead of
  UTC. The "today" endpoints are unaffected (they pass a live `Date`, never a re-parsed date
  string). Full detail and recommended fix logged in
  `WEBAPP_GAP_CLOSURE_PLAN.md` "Phase W3.1 verification" — left unfixed here per the
  verification-only scope of this phase.

## Phase W3.2 — date-only parameter handling rule (2026-06-29)

**Rule, going forward:** any Daily Activity code that parses a `YYYY-MM-DD` date-only string
(query param, path param, or future request-body field) MUST use
`parseDateOnlyAsLocalDate()` from `src/lib/daily-activity.ts` — never
`new Date("YYYY-MM-DD")`. Any code that formats a `Date` back into a `YYYY-MM-DD` label for a
response MUST use `toDateKeyLocal()` — never `date.toISOString().slice(0, 10)`. Both helpers
work in local server time and are immune to the UTC/local day-shift that affects any
positive-UTC-offset server (confirmed on this IST/UTC+5:30 dev server).

Why this matters beyond the one bug fixed: `new Date("YYYY-MM-DD")` parses as **UTC midnight**;
`.toISOString()` reads back **UTC** components. Any `Date` that was built via
`startOfDay()`'s local `setHours(0,0,0,0)` is **local midnight**, not UTC midnight — formatting
it with `toISOString()` silently reads the *previous* day's date on any server east of UTC.
This is not specific to the team routes; it would silently break **any** future Daily Activity
date-only input or output, including `/today`'s own `date` field (which was, in fact, also
broken until this fix — see `WEBAPP_GAP_CLOSURE_PLAN.md` "Phase W3.2 fix" for the empirical
confirmation).

Test script used to verify the fix (`prisma/test-daily-activity-date-parsing.ts`, run via
`npx tsx -r dotenv/config`, then deleted — throwaway per the "reusable vs. throwaway" decision
in the Phase W3.2 task): round-trip parse/format of `2026-06-28` confirmed no day shift;
year/month/day components read back correctly; all of `2026-13-01`, `2026-02-30`,
`2026/06/28`, `abc`, `""`, `2026-6-28`, `2026-06-5` correctly threw `RangeError`; a genuine
leap-day edge case (`2028-02-29`) correctly did NOT throw. 15/15 checks passed.

## Phase W4 — backend write workflow implementation notes (2026-06-29)

Implements the write side of §9 (status state machine)/§11 (cutoff/grace) for the first time —
Phase W2/W3 were read-only.

- **Submission window decision logic** (`evaluateSubmissionWindow` in
  `src/lib/daily-activity.ts`) implements: same-day-before-10PM → on-time; same-day-after-10PM
  → locked (day surfaces as INCOMPLETE if never submitted — this function only decides
  allow/deny, a separate process would need to actually flip NO_ACTIVITY/SUMMARY_PENDING days
  to INCOMPLETE once grace passes, which is not implemented in this phase — see "known pending
  gaps"); next-calendar-day → late-allowed; 2+ days → locked until a manager reopens;
  `REOPENED` status → always allowed regardless of age. **Open business decision, explicitly
  flagged**: "next working day" is implemented as "next calendar day" — this codebase has no
  working-day/holiday calendar anywhere, so Saturdays/Sundays/holidays are not skipped. Revisit
  if a working-day calendar is ever added.
- **Zero-activity summary submission** (open decision from the Phase W4 brief, resolved
  conservatively): submission is allowed even with zero captured activity. The existing Phase
  W2 `END_OF_DAY_SUMMARY_SUBMITTED` default (2 pts, not new to this phase) is captured and
  counted, so a zero-other-activity day that submits a summary lands in `LOW_ACTIVITY`
  (2 pts), not `NO_ACTIVITY`. This is NOT special-cased back to `NO_ACTIVITY` — revisit if the
  business wants summary-only closure to stay band-neutral.
- **Approved-points resolution**: `approveDailyActivityCorrectionRequest` always resolves
  `approvedPoints` server-side via the exact same `resolvePoints` rule/default-fallback path
  Phase W2 capture already uses, keyed off `requestedActivityType` — there is no request-body
  field a manager can use to set points directly on either the correction-approve route or any
  other Phase W4 route.
- **AuditLog reuse — exact event names used** (no new audit table; reuses the existing
  Finance-era `AuditLog` model): `entityType: "daily_activity_correction"` with
  `action: "approve"` / `"reject"` (entityId = the correction request's id), and
  `entityType: "daily_activity_day"` with `action: "reopen"` (entityId = the summary row's
  id). `performedById` is always the acting manager. Audit writes are best-effort
  (try/catch, never block the action they're logging) — same "fire-and-forget" convention
  already established for crm-engine's approval/automation hooks.
- **Bug discovered this phase (broader than the Phase W3.2 date-string bug) — `@db.Date`
  storage round-trip**: writing a local-midnight JS `Date` into a `@db.Date` Prisma column on
  this MySQL/mariadb setup truncates it to the *previous* UTC calendar day on this IST
  (positive-UTC-offset) server. Confirmed empirically: writing local-midnight 2026-06-29 reads
  back as `2026-06-28T00:00:00.000Z`. Unlike the W3.2 bug (which was about parsing/formatting
  `YYYY-MM-DD` strings at the API boundary, fully fixed by `parseDateOnlyAsLocalDate`/
  `toDateKeyLocal`), this is a deeper issue in how the Prisma↔MySQL `Date`↔`DATE` marshalling
  itself behaves — neither of those two helpers can see or fix it, because the corruption
  happens entirely inside the DB write/read, before either helper ever sees the value. It only
  surfaced in Phase W4 because correction approve/reject is the first code path that reads a
  `@db.Date` value back from the DB (`summary.summaryDate`) and feeds it into `startOfDay()`
  again for a fresh query/write — every Phase W2/W3 read path either never re-derives a day
  from a DB-read value, or only formats it for display (where `toDateKeyLocal` is correct and
  sufficient). **Workaround applied, not a full fix**: `recoverLocalDayFromDbDate()` adds back
  the lost UTC day before re-applying `startOfDay()`, at the 3 call sites in this phase that
  needed it. The underlying issue — *every* `@db.Date` column written via a local-midnight
  `Date` is one UTC day off from the intended local day on this server — is broader than this
  phase and is NOT fixed at the root. **Recommended next step**: audit whether
  `DailyActivityLog.activityDate`/`DailyActivitySummary.summaryDate`/
  `DailyProductivityScore.periodStart/periodEnd` values, once read back from the DB and
  formatted for display, are silently off-by-one anywhere else this pattern exists.

  **One instance found and fixed in this same phase**: `getDailyActivityHistoryForEmployee`'s
  `date: toDateKeyLocal(s.summaryDate)` (Phase W2 code) had exactly this bug — confirmed
  empirically (writing local-midnight 2026-06-29, the endpoint returned `"2026-06-28"`) and
  fixed by wrapping with `recoverLocalDayFromDbDate`, then re-verified to return `"2026-06-29"`
  correctly. This wasn't caught in Phase W3.1/W3.2 verification because no real summary rows
  existed yet at the time that endpoint was tested. `getDailyActivityForManagerEmployee`'s
  `summaryDate` field and `getTeamDailyActivity`'s `date` field were checked and are **not**
  affected — both format the function's input `date` parameter (always freshly computed,
  never DB-read), not a DB-read row field.

## Phase W4.1 — `@db.Date` round-trip fixed at the root (2026-06-29)

Phase W4's `recoverLocalDayFromDbDate` was a narrow, 3-call-site workaround. This phase fixes
the actual root cause everywhere it occurs, before the UI write flow is built.

- **Root cause**: writing a *local*-midnight `Date` directly into a `@db.Date` column truncates
  it to the previous *UTC* day on a positive-UTC-offset server. The fix is a single consistent
  strategy — DB date-only values are always tagged using **UTC** components
  (`Date.UTC(y, m-1, d)`), never local components, on both write and read. See `src/lib/date-only.ts`
  for the full write-up and the 5 exported functions (`parseDateOnlyAsLocalDate`,
  `toDateKeyLocal`, `dateKeyToDbDate`, `dbDateToDateKey`, `dbDateToLocalDate`).
- **`recoverLocalDayFromDbDate` removed entirely** — replaced by `dbDateToLocalDate` at every
  call site that re-derives a local day from a DB-read `@db.Date` value, not just the 3 Phase W4
  touched. Every `activityDate`/`summaryDate` write and `where` filter in
  `src/lib/daily-activity.ts` now goes through `dateKeyToDbDate`/`localDateToDbDate` (aliased
  `toDbDate` in that file).
- **New rule, binding for all future date-only work**: all date-only values must use the shared
  date-only helper (`@/lib/date-only`). Do not use `new Date("YYYY-MM-DD")` or `.toISOString()`
  for date-only business dates — see `src/lib/date-only.ts`'s module doc comment for the local-
  midnight-vs-DB-date-only-value distinction and which function to use where.
- **Verified** via `scripts/test-date-only-handling.mjs` (19/19 checks, including a real DB
  round trip) and `npx prisma validate`/`generate`/`tsc --noEmit`/`npm run build`, all clean. No
  schema/migration changes; `DailyUpdate`, mobile, and production untouched.

## Phase W5 — webapp UI write-flow integration (2026-06-29)

Connects the Phase W4 write APIs to `/daily-activity`'s existing read-only UI. UI integration
only — no new API routes were added; one additive, non-breaking field was added to an existing
read response shape (see below).

- **Employee summary form** (`EmployeeActivityView.tsx`): the three employee-owned fields
  (Blockers/Next-day plan/Final remarks) are now editable textareas, gated by the API-returned
  `canSubmitSummary`/`canEditSummary` flags — the button disables and reads "Locked" or
  "Submission not available" rather than the component guessing eligibility itself. First
  submit uses `POST /api/daily-activity/summary`; once `summaryStatus` reaches `CLOSED`/
  `LATE_SUBMITTED`/`PENDING_CORRECTION` the same button switches to `PUT` and reads "Update
  Summary". A manager `REOPENED` day routes back through `POST` (matches
  `submitDailyActivitySummary`'s own resubmission-window semantics). The request payload is
  `{ date, blockers, nextDayPlan, finalRemarks }` — there is no `employeeId` field in this
  component's state, so there is nothing that could be wired to send one even by accident.
  Activity timeline stays fully read-only — no edit affordance was added to it.
- **Employee correction request panel**: "Request Correction" reveals a form (date
  read-only/prefilled to today, activity type + source type dropdowns, optional source ID,
  required reason). All three required fields are validated client-side before the
  `POST /api/daily-activity/corrections` call; once `correctionRequestStatus === "PENDING"` the
  form is replaced with a "Pending correction" badge and an explanatory line, matching the
  backend's one-active-request-at-a-time model. No points field exists in this form.
- **Manager approve/reject** (`ManagerActivityPanel.tsx`'s employee/day detail): every pending
  correction request now renders as its own row with Approve/Reject buttons and an optional
  remarks input, calling `POST /api/daily-activity/corrections/[id]/approve` or `/reject`. There
  is no points input anywhere in this component — `approveDailyActivityCorrectionRequest`
  already resolves `approvedPoints` server-side and this UI doesn't add a path around that.
  After either decision, both the team table and the expanded detail re-fetch so the manager
  sees the reconciled status/points immediately.
- **Manager reopen**: "Reopen Day" button (replacing the old disabled placeholder), behind a
  `confirm()` prompt, calls `POST /api/daily-activity/day/[employeeId]/[date]/reopen`. Lives only
  inside the manager-only detail component, so it is structurally unreachable from the employee
  view (the employee view is a different component entirely, never rendered for a non-manager
  session per `page.tsx`'s existing `isManager` gate).
- **Backend response addition (additive, no schema/migration change)**: `ManagerEmployeeDayView`
  gained `pendingCorrections: ManagerPendingCorrection[]` (id, requestedActivityType,
  requestedSourceType, requestedSourceId, reason, createdAt) in
  `getDailyActivityForManagerEmployee` (`src/lib/daily-activity.ts`). The pre-existing
  `hasCorrectionPending` boolean told the team table *that* a correction was pending but not
  enough to render an approve/reject control (no id) — this was the smallest correct fix. Never
  exposes `approvedPoints` (null by definition while `PENDING`).
- **Two incidental fixes surfaced by `npm run build`/code review**:
  1. `EmployeeActivityView.tsx` (client component) originally imported
     `DAILY_ACTIVITY_TYPES`/`DAILY_ACTIVITY_SOURCE_TYPES` from `@/lib/daily-activity`, which
     transitively imports `@/lib/prisma` (server-only `mariadb` driver) — broke the client
     bundle ("the chunking context does not support external modules"). Fixed by mirroring the
     two literal arrays in the already client-safe `labels.ts` as `ACTIVITY_TYPE_OPTIONS`/
     `SOURCE_TYPE_OPTIONS` instead.
  2. `ManagerActivityPanel.tsx`'s local `todayStr()` used the banned
     `new Date().toISOString().slice(0, 10)` pattern (flagged in Phase W4.1) — replaced with
     `toDateKeyLocal(new Date())` from `@/lib/date-only`.
- **Browser-verified end-to-end** on the dev DB via dev quick-login (employee ↔ manager
  switch): submit (POST) → edit (PUT, same row, no duplicate) → raise 2 correction requests →
  as manager: approve one (points 2→3, status `PENDING_CORRECTION`→`CLOSED`), reopen the day
  (status→`REOPENED`, points unchanged), reject the other (points unchanged at 3, no log row
  created, status reconciled back to `CLOSED`). No points text ever appeared on the
  employee-logged-in page at any step; points were visible throughout on the manager-logged-in
  page. `npx tsc --noEmit`/`npx prisma validate`/`generate`/`npm run build` all clean.
- **No schema/migration changes. `/daily-updates` unchanged and still live. `/mobile`
  untouched. No production deploy/restart.**

## Phase W6 — KRA/reporting planning notes (2026-06-29)

Planning and audit only — full design in `docs/webapp/DAILY_ACTIVITY_KRA_REPORTING_PLAN.md`.
No code/schema/migration changes this phase; the notes below summarize what's binding for
whoever implements the future phases (§16 of that doc).

- **§9's open status-lifecycle gap, formalized here**: `INCOMPLETE` is a documented valid
  `DailyActivitySummary.status` value (see the schema comment on that model) that **no write
  path in this file ever assigns**. `evaluateSubmissionWindow`/`CUTOFF_HOUR`/`GRACE_UNTIL_HOUR`
  only ever gate a *new* submit/edit attempt — they never write a status transition for a day
  nobody touches again. Confirmed via full-file grep this phase. Any future code reading
  `summary.status` for a past day to decide eligibility (KRA rollups, the Exceptions report)
  must go through a shared effective-status predicate, not the raw column — see the planning
  doc §4.
- **KRA eligibility is binding going forward**: only `CLOSED`/`LATE_SUBMITTED` count;
  `PENDING_CORRECTION` excludes the whole day (matches this file's existing whole-summary
  status-flip behavior in `createDailyActivityCorrectionRequest`, not a finer per-log
  granularity); `REOPENED` excludes until resubmitted back to `CLOSED`/`LATE_SUBMITTED`. See
  planning doc §6 for the full matrix and rationale.
- **Date handling rule reinforced**: every future weekly/monthly rollup or report endpoint must
  use `@/lib/date-only` exclusively (per Phase W4.1's binding rule) and should reuse
  `src/lib/kra-engine.ts`'s existing ISO-week helper for week boundaries rather than inventing a
  second week-numbering scheme — the two need to describe literally the same week once Daily
  Activity feeds the KRA system.
- **`DailyProductivityScore` stays unused for now** — confirmed unused again this phase (fresh
  grep, zero hits in hand-written code). Planning doc §9.1 recommends dynamic computation first;
  do not start writing to this model until that recommendation is revisited.
- **Two KRA systems exist and neither is wired to Daily Activity** — legacy `KRA`/`WeeklyReview`
  (scored via `src/lib/kra-engine.ts`'s formula-based `computeKRAProgress()`, reading
  `LeadGeneration`/`SalesFunnel`/`Collection`, never Daily Activity tables) and enterprise
  `EmployeeProfile`/`EmployeeTarget`/`KRAAchievement`. Picking which one any future
  Daily-Activity-feeds-KRA write path targets is an explicit open decision (planning doc
  §17.1) and must be resolved before any such write path is built.

## Phase W6.1 — status lifecycle implementation notes (2026-06-29)

Implements the `INCOMPLETE` automation gap fix recommended in Phase W6's planning doc §4
(Option D, dynamic-first). Status lifecycle logic only — no KRA wiring, no schema changes.

- **`resolveEffectiveDailyActivityStatus({ storedStatus, hasActivity, day, now })`** in
  `src/lib/daily-activity.ts` is now the single source of truth for "what status should this
  day display as," called from every read path that previously read `summary.status` (or its
  `?? "SUMMARY_PENDING"/"NO_ACTIVITY"` fallback) raw:
  `getDailyActivityForEmployee`, `getDailyActivityHistoryForEmployee`,
  `getDailyActivityForManagerEmployee`, `getTeamDailyActivity`. It is a **read-time overlay
  only** — no write path was added or changed; `recomputeDailySummary` and every Phase W4 write
  helper are untouched.
- **Decision rule**: `CLOSED`/`LATE_SUBMITTED`/`REOPENED`/`PENDING_CORRECTION` are authoritative
  (an explicit write path already decided them — never overridden). Otherwise: no activity →
  `NO_ACTIVITY`; activity exists and the day's grace window hasn't passed → `SUMMARY_PENDING`;
  activity exists and grace has passed (today past 10 PM, or any earlier calendar day at all) →
  `INCOMPLETE`. This exactly matches the W6 plan §3–§4 decision table.
- **Centralized cutoff/grace helpers**: `getDailyActivityCutoffWindow(day)` (returns the
  `{cutoff, grace}` `Date` pair for a day), `isPastGraceWindow(day, now)`, and
  `isWithinSummarySubmissionWindow(day, now)`. `evaluateSubmissionWindow` (Phase W4's
  submit/edit-eligibility decision function) and `getDailyActivityForEmployee` both now share
  `isPastGraceWindow` instead of each re-deriving `new Date(day); .setHours(GRACE_UNTIL_HOUR...)`
  inline — they can no longer drift apart on what "past grace" means.
- **KRA-eligibility placeholders** (not wired to either KRA system):
  `isDailyActivityKraEligible(effectiveStatus)` returns true only for `CLOSED`/`LATE_SUBMITTED`;
  `getDailyActivityKraEligibilityReason(effectiveStatus)` returns the matching human-readable
  reason from the W6 plan's §6 eligibility matrix. Both take an *effective* status (this
  function's output), not a raw stored one.
- **Employee/manager visibility unchanged**: employee reads still never include a `points`
  field anywhere in the response shape (unaffected by this change — only the `summaryStatus`
  string value changed for stuck days, no new fields). Manager reads still include exact
  `totalPoints` throughout, confirmed via both the focused test script and a live browser
  check against the running dev server.
- **Verified** via `scripts/test-daily-activity-status-lifecycle.mjs` (19/19 — 12 pure-function
  checks including a regression re-run of 2 Phase W4.1 date-only checks, 7 live-DB integration
  checks against temporary `Employee`/`DailyActivityLog`/`DailyActivitySummary` rows, fully
  cleaned up) and a manual browser check (temporary employee + stuck day, dev quick-login,
  manager dashboard showed `Incomplete` badge + correct totals + Review flag + exact points,
  then cleaned up). `npx prisma validate`/`generate`/`tsc --noEmit`/`npm run build` all clean.
  No schema/migration changes; `/daily-updates` unchanged; `/mobile` untouched; production
  untouched.

## Phase W6.2 — Daily Updates retirement rule (2026-06-29)

**Hard rule, effective this phase: Daily Activity replaces Daily Updates.** Old Daily Updates
(`DailyUpdate` model, `/daily-updates` page, `/api/daily-updates` API) must not be used for any
future productivity or KRA workflow. Concretely:

- No new code may call `prisma.dailyUpdate.create/update/delete`, or otherwise write to the
  `DailyUpdate` table, for any purpose.
- No new feature, report, or KRA-input calculation may read from `DailyUpdate` going forward —
  the one pre-existing read (`employees/[id]/page.tsx`'s "recent blockers" widget) has been
  migrated to read `DailyActivitySummary.blockers` instead (see
  `docs/webapp/WEBAPP_GAP_CLOSURE_PLAN.md` "Phase W6.2 progress" for the full audit/migration
  table).
- `/daily-updates` now `redirect()`s to `/daily-activity`; `/api/daily-updates` and
  `/api/daily-updates/[id]` now return `410 Gone` for every method. Any future work that needs
  "daily update"-shaped functionality must build on the Daily Activity & Productivity system
  (`DailyActivityLog`/`DailyActivitySummary`/`DailyProductivityScore`), not resurrect the legacy
  routes.
- The `DailyUpdate` Prisma model/table and its existing rows remain in the schema and database,
  untouched, purely as historical data — this rule is about *future use*, not data deletion.
- Mobile (`src/app/mobile/**`) is explicitly excluded from this rule for now — it still presents
  Daily-Updates-shaped UI and was intentionally not touched in this phase (mobile changes are
  out of scope here); see the gap flagged in `WEBAPP_GAP_CLOSURE_PLAN.md`.

## Phase W6.2 — Enterprise KRA decision + Daily Updates retirement (2026-06-29)

Business decisions closing the W6 plan's §17.1 open question and retiring Daily Updates from
active use:

- **Enterprise KRA selected as the only future KRA path.** All future Daily Activity KRA
  integration must target `EmployeeProfile`/`EmployeeTarget`/`KRAAchievement`/`PerformanceReview`.
  Legacy `KRA`/`WeeklyReview`/`src/lib/kra-engine.ts` is now historical/read-only — no new
  feature logic added there. No Enterprise KRA write-path wiring implemented this phase.
- **Daily Updates retired from active use.** `/daily-updates` redirects to `/daily-activity`;
  `/api/daily-updates` and `/api/daily-updates/[id]` return `410 Gone` for all methods; nav links
  removed (Daily Activity retained); employee profile "recent blockers" now reads
  `DailyActivitySummary.blockers` instead of `DailyUpdate`. `DailyUpdate` Prisma model/table and
  historical data preserved untouched — no schema/migration change. Mobile and production
  untouched.
- Full file-level audit: `docs/webapp/WEBAPP_GAP_CLOSURE_PLAN.md` §"Daily Updates Usage Audit".
- Full KRA decision record: `docs/webapp/DAILY_ACTIVITY_KRA_REPORTING_PLAN.md` §17.1.

- **Enterprise KRA integration planning (Phase W7):** Daily Activity will feed the **Enterprise
  KRA** path only (`EmployeeProfile`/`EmployeeTarget`/`KRAAchievement`/`PerformanceReview`) via a
  read-only monthly preview that a manager explicitly approves before any `KRAAchievement` is
  written (Option D). Legacy KRA/`WeeklyReview`/`kra-engine.ts` is historical/read-only and must
  not receive Daily Activity logic. Full design:
  `docs/webapp/DAILY_ACTIVITY_ENTERPRISE_KRA_INTEGRATION_PLAN.md`. No writes/schema/migration in W7.

- **Enterprise KRA mapping setup (Phase W8, config only):** Daily Activity → Enterprise KRA mapping
  is configured via `KRAMetric` records with `calculationSource="DAILY_ACTIVITY"` (target nested in
  `formulaJson` — `KRAMetric` has no `targetJson`/`weight`/`isActive` column, so no schema change).
  Managed by managers at `/settings/performance` → "Daily Activity KRA" tab and
  `GET/POST/PUT /api/admin/performance/daily-activity-mapping`. This config **does not write
  achievements** — `KRAAchievement` conversion is a later phase (manager-approved). Engine:
  `src/lib/performance-engine/daily-activity-mapping.ts`.
