# Caveo Employee Mobile App — Real-Data Integration Plan

> UAT/dev-only planning + Phase 1 execution. Production is untouched. No schema, migration,
> `db push`, or new write API was created in this step.

> **Mobile phase is paused (2026-06-25).** Webapp gaps and the Daily Activity webapp workflow
> will be completed first. Mobile work resumes only on Vijesh's explicit instruction. No
> mobile code is being modified while paused — see `docs/webapp/WEBAPP_GAP_CLOSURE_PLAN.md`
> and `docs/webapp/DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md` for the current priority.

## 1. Current mobile UI state

The mobile shell at `/mobile` (session-gated) and `/mobile/login-preview` (public, static
preview) is fully built and renders entirely from `src/app/mobile/mock-data.ts`. Screens:
Home, Attendance, Daily Updates, Tasks (+ detail), Sales (+ lead detail), Finance, Approvals
(+ detail), KRA, Notifications, Profile. All previously passed
`prisma validate` / `tsc --noEmit` / `npm run build`. The legacy real-data mobile screens
(pipeline editing, expense claims, OCR scan, collections, team overview) were intentionally
deleted in an earlier session and are **not** being restored here.

## 2. Existing APIs found

| Area | Route | Methods | Scoping |
|---|---|---|---|
| Daily Updates | `src/app/api/daily-updates/route.ts` | `GET`, `POST` | `GET`: non-managers always filtered to `session.user.employeeId`; **managers get ALL employees' rows if no `employeeId` query param is passed** (`where: {}`). `POST`: non-managers are forced onto their own `employeeId` server-side regardless of request body — safe against spoofing. |
| Daily Updates (single) | `src/app/api/daily-updates/[id]/route.ts` | `PUT`, `DELETE` | Ownership-checked: 403 if the requester is not a manager and not the row's `employeeId`. |
| Attendance | — | — | **No route exists anywhere in the codebase.** |

The Daily Updates API is the same one the desktop `/daily-updates` page already calls
(`DailyUpdatesClient.tsx`), so reusing it from mobile introduces no new server-side surface
or trust boundary.

**Important gotcha for mobile reuse:** the mobile Daily Updates screen is the logged-in
user's *own* log, never a team view — so the mobile client must always pass
`?employeeId=<self>` explicitly, even when the logged-in user is a manager. Omitting it (as
some manager-only desktop call sites might) would silently return the entire team's updates
into what's supposed to be a personal screen.

## 3. Existing database/models found

```prisma
model DailyUpdate {
  id                     Int      @id @default(autoincrement())
  date                   DateTime @default(now())
  employee               Employee @relation(...)
  employeeId             Int
  topUpdates             String   @db.Text   // free-text: what was accomplished
  keyMovement            String   @default("") @db.Text
  blockers               String   @default("") @db.Text
  topDealThisWeek        String   @default("") @db.Text
  managerSupportRequired Boolean  @default(false)
  updateStatus           String   @default("On Track")  // "On Track" | "At Risk" | "Blocked" | "Ahead"
  createdAt              DateTime @default(now())
}
```

No `Attendance`, `Leave`, `CheckIn`, or any geolocation/GPS-tracking model exists on
`Employee` or elsewhere in `schema.prisma`. The mobile mock screen's "Attendance" concept
(check-in/out, days present, infractions, leave balance, geo-verified location) has **no
backing data model at all** — it was speculative UI built directly from the Stitch design,
not from an existing feature.

**Schema/shape mismatch to note:** the mock Daily Updates UI invented two fields that don't
exist on `DailyUpdate` — a forward-looking "Commitment" field and a "manager comment" reply.
The real model is retrospective only (`topUpdates`/`keyMovement`/`blockers`/`topDealThisWeek`/
`updateStatus`) and has no comment/reply field. The real-data screen now reflects only fields
that actually exist; "Commitment" and manager comments are removed rather than faked.

## 4. Safe screens for first integration

- **Daily Updates — read.** Existing `GET /api/daily-updates` is already scoped correctly
  for non-managers and can be made safe for managers-viewing-own-data with an explicit
  `employeeId` query param. No new route needed.

## 5. Screens that must remain mock for now

- **Attendance** — no model, no route, nothing to integrate. Stays on
  `src/app/mobile/mock-data.ts#mockAttendance` until a real attendance/check-in feature is
  designed and built (see §10, Phase 2 caveat below).
- Tasks, Sales, Finance, Approvals, KRA, Notifications — out of scope for this step
  (Phase 3+ per the sequence below); not touched in this pass.

## 6. Permission / RBAC assumptions

- A logged-in mobile user only ever sees **their own** Daily Updates, regardless of
  `isManager`. The mobile app does not currently expose a team/manager view of Daily
  Updates (that remains a desktop-only capability at `/daily-updates`).
- `GET /api/daily-updates` performs no RBAC failure on missing `employeeId` for a non-manager
  (it always self-scopes), so it's safe even if the mobile client forgets the query param —
  but it is **not** safe for a manager unless the mobile client always passes its own
  `employeeId` explicitly. The mobile fetch in this integration always includes it.
- `PUT`/`DELETE`/`POST` ownership checks already exist server-side and were not modified.
  They are documented here for Phase 2 planning, not used in this read-only phase.

## 7. Read-only vs write-capable actions in this phase

| Screen | Action | Status this phase |
|---|---|---|
| Daily Updates | List own updates | **Live** — real `GET` fetch |
| Daily Updates | Submit new update | Mock — button shows a "not available in this preview" toast, unchanged from the prior session |
| Daily Updates | Edit/delete update | Not present in mobile UI; desktop-only for now |
| Attendance | Any | Fully mock — no backing data exists |

No write action was added or enabled in this step.

## 8. Risks

- **Manager over-fetch risk (mitigated):** as noted in §2/§6, calling the Daily Updates API
  without `employeeId` as a manager returns the whole team's rows. Mitigated by always
  passing `employeeId` explicitly from the mobile client.
- **Field-shape mismatch (mitigated):** the original mock UI had a "Commitment" textarea and
  manager-comment bubble with no backing column. Rendering real data with the old layout
  would have produced blank/undefined sections. Mitigated by reshaping the read view to the
  real field set (§3).
- **No loading affordance previously existed for any mobile screen** (everything was
  synchronous mock data). Daily Updates now performs a real client-side `fetch`, so a
  genuine loading skeleton, error state, and empty state are required and were added (see
  Task 3/4 results below) to avoid a blank flash or an unhandled rejection reaching the user.
- **Attendance has no real path forward without new schema work.** Any future integration
  requires a new `Attendance`-shaped model, migration, and at least one new API route — all
  explicitly out of scope for this and the current step. Flagging now so it isn't
  accidentally attempted piecemeal later.

## 9. No-schema-change confirmation

No `schema.prisma` edit, no `prisma migrate`, no `prisma db push`, no new Prisma model, and
no new API route file were created or modified in this step. The only server-side code path
touched is a new client-side `fetch` call from `DailyUpdatesScreen` to the **pre-existing**
`GET /api/daily-updates` route — that route file itself was not edited.

## 10. Recommended integration sequence

**Phase 1 (this step):**
- Attendance — read state → **stays mock** (no safe data source exists)
- Daily Updates — read state → **integrated** with real, self-scoped data

**Phase 2:**
- Attendance check-in/out — **blocked** until a real Attendance model + migration + API
  exists; out of scope until that groundwork is explicitly approved
- Daily Update create/edit — safe to wire next; `POST`/`PUT` already exist with correct
  ownership checks, just needs a mobile form bound to the real field set established in
  this phase
  > **Update (2026-06-25): paused.** Daily Updates Phase 2 create/edit is paused because
  > the business workflow changed to Daily Activity & Productivity. See
  > [`DAILY_ACTIVITY_PRODUCTIVITY_WORKFLOW_PLAN.md`](./DAILY_ACTIVITY_PRODUCTIVITY_WORKFLOW_PLAN.md)
  > for the replacement plan. Planning only — no schema/API/migration/production changes made.

**Phase 3:** Tasks, KRA, Notifications — inspect `src/app/api/pipeline/tasks`,
KRA/`weekly-commits` routes, and `Notification` model/API for safe read integration.

**Phase 4:** Finance self-service, read-only — inspect the Finance Operations Module
(Expense, TravelClaim, EmployeeAdvance models + `/finance/*` routes) for an employee-scoped
read.

**Phase 5:** Sales pipeline, read-only — inspect `/api/pipeline/leads`,
`/api/pipeline/opportunities` for an owner-scoped read.

**Phase 6:** Approvals — strict RBAC review first; this is the highest-risk screen since it
exposes other employees' records and decision actions to a manager. Do not integrate without
a dedicated RBAC audit pass.
