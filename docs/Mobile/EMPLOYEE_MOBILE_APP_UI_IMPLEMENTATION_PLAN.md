# Caveo Employee Mobile App — UI Implementation Plan

## Overview

A mock/static UI shell for the Caveo Employee Mobile App, based on the Stitch design
exports (`docs/Mobile/stitch_caveo_enterprise_operations_cockpit/`) and the
`Caveo_Design_Reference.md` brand system. This is a **UI-only** implementation — no
database schema, migrations, or write APIs are involved.

- **Route:** `/mobile` (session-gated, real auth) and `/mobile/login-preview` (public,
  static design preview only — added to the `auth.config.ts` allowlist).
- **Components:** `src/components/mobile/` — 15 reusable building blocks (MobileAppShell,
  MobileHeader, MobileBottomNav, MobileKpiCard, MobileListCard, MobileStatusPill, etc.).
- **Screens:** `src/app/mobile/screens/` — Login preview, Home, Attendance, Daily updates,
  Tasks (+ detail), Sales (+ lead detail), Finance, Approvals (+ detail), KRA,
  Notifications, Profile.
- **Data:** `src/app/mobile/mock-data.ts` — all screens render static mock data only.

## UI review and refinement notes

A follow-up refinement pass was run against the initial shell to tighten brand alignment,
spacing, and navigation/role clarity, without expanding scope into real data or new APIs.

### What was refined

**Brand & visual consistency**
- Insight/alert cards (`MobileInsightCard`, `.m-insight`) now use a pale tint background per
  tone (red/blue/orange/green `-50` tokens) instead of a flat neutral card background, so
  alerts read with more visual weight against surrounding white cards — consistent with the
  Caveo Design Reference §3 ("pale red callout backgrounds" are an approved use of red as a
  tint, not a flood).
- Bottom nav active tab now gets a subtle `--caveo-red-50` tint behind the icon/label, not
  just a color change — clearer affordance without a "large red background."
- Unified all ad-hoc uppercase sub-section labels (Task detail, Lead detail, Approval detail
  screens previously mixed 11px and 12.5px inline styles) into one shared `.m-subhead` CSS
  class.
- Added a shared `.m-btn-outline-danger` class for destructive secondary actions (e.g.
  "Reject" on the Approval detail screen) instead of one-off inline border/color styles.
- Fixed `.m-nav-icon` — it was scoped under `.m-navbar .m-nav-icon` in CSS but used standalone
  on the Lead detail contact card, so the call/email/schedule icon buttons were rendering
  completely unstyled. Generalized the class so it works wherever used.

**Card consistency**
- Replaced duplicate, hand-rolled KPI markup (Task detail's 4 meta fields, Lead detail's
  local `MobileKpiAccent` helper, Finance's "Pending reimbursement" block) with the shared
  `MobileKpiCard` component everywhere. Added a `valueSize` prop so textual KPI values
  (names, dates) don't render at the same 24px scale as numeric KPIs.

**Currency / value display clarity**
- KPI unit suffixes (e.g. "Cr", "%") previously relied on a 3px CSS margin for spacing,
  which doesn't show in plain text and read as cramped (`₹4.8Cr`). Added an explicit
  non-breaking space so it always renders as `₹4.8 Cr` / `38 %`.

**Employee vs Manager clarity** (the most substantive functional fix)
- The Home screen's "Quick actions" grid was showing the **Approvals** tile to every user,
  including employees — but the Approvals screen is manager-only ("Manager workflow"
  eyebrow). Tapping it as an employee led to a screen that didn't apply to them. Quick
  actions are now built from a role-aware list (Attendance, Daily update, KRA for everyone;
  Approvals appended only when `isManager` is true), and the grid's column count adjusts
  to the resulting item count via a CSS variable instead of a hardcoded 4-column grid.
- Fixed a related layout bug: the Home screen previously fought CSS padding with an inline
  `style={{ padding: 0 }}` override on the quick-action grid to avoid doubling horizontal
  padding inside `.m-section`. Cleaned up by moving the horizontal padding entirely into
  `.m-section` and making `.m-quick-grid` padding-free.

**Approval workflow / "no unfinished placeholders"**
- The Approval detail screen's receipts grid rendered three identical icon tiles with no
  filename — visually indistinguishable and looked broken. Added a `.m-receipt-tile` /
  `.m-receipt-name` treatment that shows the actual filename from mock data
  (`flight_ticket.pdf`, `hotel_invoice.pdf`, `dinner_receipt.jpg`).
- Several primary-looking buttons had no `onClick` at all (Approvals list "Reject", Sales
  "Add deal", Finance "New entry", Attendance "Check in/out", Task detail "Edit
  details"/"Update status", Lead detail's call/email/schedule icons, Daily Updates "Submit
  update"). Each now fires a short toast explicitly stating the action isn't available in
  this preview, so the UI never looks silently broken — it's honest about being a design
  preview. `MobileApp.tsx` threads a shared `showToast` handler down to each screen for this.
- Login preview's "Sign in with Microsoft Entra ID" button now shows an inline note
  clarifying it's a static preview and that real sign-in happens at `/login`.

**Typography / sentence case (brand rule)**
- Several screen titles were in Title Case, which violates the Caveo Design Reference voice
  rule ("Sentence case headings; caps only for proper nouns & service names"). Changed:
  "Tasks & Commitments" → "Tasks & commitments", "Sales Pipeline" → "Sales pipeline",
  "Finance Self-Service" → "Finance self-service", "Daily Updates" → "Daily updates",
  "Approval Queue" → "Approval queue", "KRA Dashboard" → "KRA dashboard" (KRA stays capitalized
  as a proper acronym).

### Known limitations

- **Mock data only.** Every screen renders static data from `src/app/mobile/mock-data.ts`.
  No API routes were added or modified; no database reads/writes occur anywhere in this UI.
- **Replaced legacy mobile real-data screens.** This implementation intentionally replaced
  the previous `/mobile` screens that were wired to real data and real actions: pipeline
  deal editing (`PipelineScreen`, `DealDetailScreen`), expense claim submission
  (`ExpenseClaimScreen`), conveyance claims (`ConveyanceScreen`), business-card OCR scan
  (`ScanCardScreen`), collections (`CollectionsScreen`), team overview (`TeamScreen`), and
  the quick-log/activity-logging sheets (`QuickLogSheet`, `LogActivitySheet`,
  `ComposeScreen`). These were deleted from `src/app/mobile/screens/` and `types.ts`
  (`MobileLead`) was removed as it's no longer referenced. The change was made deliberately,
  with the user's explicit confirmation, and is fully reversible via git history on the
  `uat` branch.
- **No write APIs.** Every "primary action" button on a mock screen (submit update, check
  in/out, new expense entry, approve/reject, add deal, etc.) is either non-functional with an
  explicit "not available in this preview" toast, or — for in-preview-only state like the
  Task detail sub-task checkboxes — purely local React state that resets on navigation.
- **`src/components/icons/MIcon.tsx` does not exist.** The shared icon component actually
  lives at `src/app/mobile/components/MIcon.tsx` and is imported by both the screens and the
  `src/components/mobile/` component library. No file move was made since it would touch
  every import across both directories for no functional benefit; noting the discrepancy
  here for anyone looking for it at the originally-assumed path.
- **No automated visual regression coverage.** Verification for this refinement pass was
  manual: dev-server preview at 375×812 (mobile viewport), walking every screen and detail
  drill-in as both an Employee and a Manager dev-impersonation user.

### Next recommended integration steps

1. Decide which mock screens get real data first — Attendance (geolocation check-in/out) and
   Daily Updates (commitment/completed/blockers log) are the most self-contained and don't
   depend on the CRM pipeline/finance modules being mobile-ready.
2. When wiring Sales/Finance/Approvals to real data, reuse the existing desktop data shapes
   already defined in `src/app/finance/*/data.ts` and the CRM pipeline API routes
   (`/api/pipeline/*`) rather than inventing new mobile-specific schemas — per the existing
   project rule that masters/data models are global, not per-surface.
3. Any new write action (check-in, submit update, approve/reject, expense submission) needs
   a real API route plus server-side RBAC matching `src/lib/rbac.ts` /
   `src/lib/roles.ts` before the "not available in this preview" toasts are removed.
4. Confirm the `/mobile/login-preview` public allowlist entry in `auth.config.ts` is still
   wanted before this branch is promoted past `uat` — it's a narrow, static-only exception
   but is still a production auth-config change a reviewer should explicitly sign off on.

### Confirmation

This refinement pass used mock data only. No Prisma schema changes, no migrations, no
`prisma db push`, no database tables created, no existing data modified, no write API routes
added, and no production deployment was performed. All changes are local commits on the
`uat` branch.

## Real-data integration phase 1

Full findings and the phased sequence live in
[`EMPLOYEE_MOBILE_APP_REAL_DATA_INTEGRATION_PLAN.md`](./EMPLOYEE_MOBILE_APP_REAL_DATA_INTEGRATION_PLAN.md).
This section summarizes the result of executing Phase 1 (read-only Attendance + Daily
Updates).

### Attendance integration result

**Stayed mock — no integration performed.** There is no `Attendance`, `CheckIn`, or `Leave`
model anywhere in `schema.prisma`, and no API route for it exists. `AttendanceScreen.tsx`
is unchanged functionally; a code comment was added pointing future readers at the
integration plan doc instead of re-discovering this from scratch. No new API was created to
fill the gap, per scope.

### Daily Updates integration result

**Integrated — read-only, real, self-scoped data.** `DailyUpdatesScreen.tsx` now fetches
`GET /api/daily-updates?employeeId=<self>` on mount and renders the logged-in user's actual
`DailyUpdate` rows (most recent 10), replacing the static mock history list. The "Today's
log" submission form is still non-functional (button shows the existing "preview only" toast)
— Phase 1 is read-only by design; the existing `POST`/`PUT` endpoints already have correct
per-employee ownership checks and are the documented Phase 2 target.

The screen's content was reshaped to match the real `DailyUpdate` columns
(`topUpdates`, `keyMovement`, `blockers`, `topDealThisWeek`, `updateStatus`,
`managerSupportRequired`) instead of the mock's invented "Commitment" field and fabricated
manager-comment reply, neither of which exist in the schema.

### APIs reused

- `GET /api/daily-updates` (`src/app/api/daily-updates/route.ts`) — pre-existing, unmodified.
  Called with an explicit `employeeId` query param so a manager's own mobile screen shows
  only their own updates, not the whole team's (see integration plan §2/§6 for why this
  matters).

### Mock fallbacks retained

- `mockAttendance` in `src/app/mobile/mock-data.ts` — Attendance screen has no real data
  source to switch to.
- The Daily Updates "Today's log" submit action remains a no-op toast (write actions are
  Phase 2, not this step).
- `mockDailyUpdates` was removed from `mock-data.ts` since nothing references it anymore.

### Limitations

- No loading skeleton previously existed on any mobile screen since everything was
  synchronous mock data; Daily Updates is the first screen with a genuine network fetch, so
  it now has its own loading/error/empty states (`MobileSkeleton`, `MobileEmptyState` with
  a Retry action, and an explicit "no updates yet" message) that don't yet have a shared
  pattern other screens follow — worth extracting into a reusable data-fetch hook once a
  second screen needs the same shape (Phase 2/3).
- Attendance remains entirely aspirational UI with no path to real data until a new model,
  migration, and API are explicitly scoped and approved — not attempted here.

### Next recommended screen

Daily Update create/edit (Phase 2) — the `POST`/`PUT /api/daily-updates` endpoints already
enforce correct per-employee ownership and need no changes; only a mobile-side form needs to
be wired to them, using the same field set (`topUpdates`/`keyMovement`/`blockers`/
`topDealThisWeek`/`updateStatus`) the read view now uses.
