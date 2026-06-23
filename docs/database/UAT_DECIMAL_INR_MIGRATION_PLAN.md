# UAT Decimal / INR Migration Plan

> **Step 3Z (2026-06-23).** This is a **planning and execution-readiness document only**. No
> UAT database was queried, no migration was run, no Prisma schema was modified, no API/UI code
> was changed, no `db push` was used, and no UAT app code was deployed in this step. Every
> section 4/5 sequence below is **designed, not executed** — UAT migration runs only when
> explicitly instructed in a future step.

---

## 1. Purpose

- **Production deployment is paused.** The business decision (recorded 2026-06-23) is: dev
  (complete, audited) → **UAT migration + testing** → UAT sign-off → production planning resumes
  → production migration only after approval. This document covers the UAT step.
- UAT will receive the completed dev Decimal / INR migration — both Release 1 (`Expense`/
  `EmployeeAdvance`/`TravelClaim`) and Release 2 (`Payment`/`Collection`/`OrderAdvance`/
  `CrmLead`/`CrmOpportunity`/`SalesFunnel`/Sales-KRA targets/the `kra-engine.ts` INR-to-INR
  rewrite) — as the **next** environment after dev, ahead of production.
- **UAT testing against real(ish) data is mandatory before production is reconsidered.** UAT
  already carries a prod-mirrored data copy (per `docs/CHANGELOG.md` Session 9, 2026-06-19) — a
  materially more realistic test surface than dev's small/smoke-test row counts (`Payment`: 1,
  `Collection`: 94 in dev vs. `Collection`: 141 copied into UAT, per the same session).
- **Production remains paused** until §7's gate is satisfied. Nothing in this document
  authorizes any production action — see
  `docs/database/PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md` for that separate, still-
  pending plan.

---

## 2. UAT Scope

Identical field/domain scope to the completed, audited dev work — no new fields, no expanded
scope, no Voucher/Ledger/FinAccount, no new Finance write APIs.

**Release 1:**

- `Expense.amountLakhs` / `gstAmountLakhs`
- `EmployeeAdvance.amountLakhs` / `disbursedAmountLakhs` / `settledAmountLakhs` / `balanceLakhs`
- `TravelClaim.amountLakhs` / `amountRupees` / `ratePerKm`

**Release 2:**

- `Payment.amountLakhs`
- `Collection.invoiceValueLakhs` / `amountWithoutGstLakhs` / `amountReceivedLakhs`
- `OrderAdvance.amountLakhs`
- `CrmLead.expectedValue`
- `CrmOpportunity.value` / `dealValueExTax` / `netProfitLakhs`
- `SalesFunnel.dealValueLakhs` / `billingValueLakhs`
- Sales/KRA targets — the 3 `AMOUNT`-typed `KRATemplateItem` rows (`BOOKING`/`BILLING`/
  `TEAM_PIPELINE_COVERAGE`) and the confirmed-money `KRA.target`/`EmployeeTarget.targetJson`
  free-text entries
- `src/lib/kra-engine.ts` INR-to-INR comparison behavior (no conversion factor in the scoring
  path)
- Dashboard/report Lakhs display — confirmed still presentation-only (`inrToLakhsEquivalent()`),
  not canonical storage

**Explicitly out of scope for UAT, same as dev:** Voucher Decimal migration, Ledger Decimal
migration, FinAccount migration, new Finance write APIs, `*Lakhs` → `*Inr` field renaming,
production execution, `db push`.

---

## 3. UAT Pre-Checks

None of the following has been performed in this step — this is the checklist for whoever runs
the UAT pre-check pack (§"Task 3" / `docs/database/uat-precheck/`) before any UAT migration.

- [ ] **Confirm UAT database name.** Per this repo's own history (`docs/CHANGELOG.md`/
      `docs/NEXT_SESSION.md`, Session 9, 2026-06-19), the UAT database is documented as
      `u686730471_Caveo_UAT` with connecting user `u686730471_caveouat` — **not independently
      re-verified by this step**; confirm this is still current before relying on it.
- [ ] **Confirm UAT `DATABASE_URL` safely.** Per `.env.uat.example`'s own header comment, the real
      UAT environment file lives only on the remote server
      (`.../domains/uat.caveoinfosystems.com/public_html/.builds/config/.env`) — never assume a
      local file is the authoritative UAT config without confirming against that server path.
      Never print the full `DATABASE_URL` or password in any shared output.
- [ ] **Confirm UAT branch/commit.** Per `scripts/deploy-uat.mjs`, UAT deploys from the `uat`
      git branch via `git fetch && git checkout uat && git reset --hard origin/uat`. Confirm the
      commit currently live on the UAT server matches (or is behind) the local `uat` branch's
      current HEAD before assuming UAT's app code is current.
- [ ] **Confirm UAT `_prisma_migrations` state.** Per Session 9, UAT was bootstrapped via a full
      schema-dump import (`prisma/uat-full-schema.sql`) covering the first 19 of this project's
      22 migrations (through `20260618100000_crm_lead_customer_ref`), with
      `prisma/uat-prisma-tracking.sql` separately seeding `_prisma_migrations` to mark that
      history complete. **This means UAT's likely outstanding gap is the 3 migrations created
      after that bootstrap** — `20260621120000_add_soft_delete_fields_phase_a`,
      `20260622120000_decimal_release1_lakhs_to_inr`,
      `20260623060000_decimal_release2_combined_inr_canonical` — but this must be confirmed by
      query, not assumed, since drift could have occurred since 2026-06-19 (e.g. via the
      `prisma/apply-crm-lead-customer-ref.mjs`-style one-off scripts this project already uses).
- [ ] **Confirm UAT current column types.** Query `INFORMATION_SCHEMA.COLUMNS` for every Release
      1/2 field (the same field list as §2) — confirm whether they are still `Float`/`Double` or
      already `Decimal`, rather than assuming UAT mirrors dev's pre-migration state.
- [ ] **Confirm UAT row counts.** UAT's row counts are documented as materially larger than dev's
      for several models (e.g. `Collection`: 141 vs. dev's 94, `CrmLead`: 280 vs. dev's 38,
      `CrmOpportunity`: 49 vs. dev's 21, `SalesFunnel`: 100, `Payment`: 26 vs. dev's 1, `KRA`: 34 —
      per Session 9's prod→UAT copy log) — re-confirm current counts before estimating migration
      duration/lock risk, since more time has passed and UAT-only writes may have occurred since.
- [ ] **Confirm UAT backup available.** A full UAT DB backup, taken and verified restorable,
      immediately before any UAT migration — same discipline as the production plan's §6, scaled
      to UAT's lower stakes but not skipped.
- [ ] **Confirm UAT test users available.** UAT sign-in is via Microsoft Entra ID (per
      `docs/NEXT_SESSION.md` Session 9) with real prod-mirrored employee records, including
      Vijesh's own manager account — confirm at least one Manager-tier and one Employee-tier test
      login work before testing begins, covering both RBAC tiers the test plan (§5) needs.
- [ ] **Confirm UAT write-freeze if required.** Decide whether UAT needs an explicit write freeze
      during the migration window — likely lower-stakes than production (no real customers
      depend on UAT being live), but still worth a deliberate decision rather than an assumption,
      especially if other testers are actively using UAT for unrelated work at the same time.

---

## 4. UAT Migration Execution Plan

**Designed only — not executed in this step.** Sequence numbering matches the structure
requested for this plan; it deliberately does not assume migrations 1–19 (per §3's grounding
fact) need to be "applied" again — step 6/7 explicitly branch on what the pre-check (step 1)
actually finds, not on what this document assumes.

1. Confirm UAT DB (name, connecting user, current `_prisma_migrations` state) via the read-only
   pre-check pack (`docs/database/uat-precheck/`) — do not proceed past this step on an
   assumption.
2. Take a full UAT backup.
3. Verify the backup is restorable (same discipline as the production plan's §6 — restore to a
   scratch DB, spot-check row counts, don't just confirm the dump file is non-empty).
4. Capture a pre-migration snapshot for every Release 1/2 field on UAT, mirroring the dev
   snapshot pattern (`DECIMAL_RELEASE1_MIGRATION_RESULTS.md` §3 / `DECIMAL_RELEASE2_MIGRATION_RESULTS.md`
   §1) — including a representative KRA score/achievement baseline, since UAT has real
   `KRA`/`EmployeeTarget` data unlike dev's thin profile.
5. Apply any pending migrations **before** the Decimal releases, in order, only if step 1's
   pre-check finds them genuinely missing — per §3's grounding fact, this is expected to be a
   short or empty list (UAT is believed current through migration #19), but must not be assumed.
6. Apply the Release 1 migration (`20260622120000_decimal_release1_lakhs_to_inr`) **only if**
   step 1 confirms it is not already applied to UAT — using the same guarded one-off-script +
   `prisma migrate resolve --applied` pattern already proven on dev (never `prisma migrate
   deploy` as part of the build — this project deliberately removed that call from `package.json`
   `build` after Session 9 found Hostinger/Passenger's env-escaping breaks the CLI's DB auth
   during a build-time `migrate deploy`, even though the same credentials work fine for the
   runtime Prisma client; see `docs/CHANGELOG.md` Session 9 "Changed").
7. Apply the Release 2 migration (`20260623060000_decimal_release2_combined_inr_canonical`) the
   same way, only if not already applied — and only after Release 1 is confirmed applied (Release
   2 depends on Release 1's `kra-engine.ts`/`payments.ts` rewrite landing first, same dependency
   already documented for production in `PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md` §3).
8. Run `npx prisma generate` against the UAT schema.
9. Deploy the matching UAT app code — the `uat` branch commit that actually contains the Release
   1/2 source (`src/lib/money.ts`, the rewritten `kra-engine.ts`/`payments.ts`, the ~15 updated
   API routes, the relabelled UI forms) — via the existing `scripts/deploy-uat.mjs` flow (`git
   reset --hard origin/uat` → `npm ci` → `npm run build` → Passenger restart). Schema and code
   must land together, per the No-Half-Converted-State Rule already established for both dev
   releases.
10. Run DB verification — re-derive the same before/after checks dev's audits used (per-field
    `× 100,000` exactness, no nulls introduced, no negatives introduced, KRA score baseline
    re-derived and matched within floating-point noise) against UAT's actual (larger, more
    realistic) data.
11. Run API verification — sample every Release 1/2 route's authenticated response and confirm
    no raw Decimal object leaks, no `[object Object]`, correct INR-magnitude values.
12. Run UI verification — live browser check against UAT (`https://uat.caveoinfosystems.com`):
    input forms show `₹`/`INR` labels, dashboards/KRA views still show Lakhs, no 100,000× visual
    inflation or deflation anywhere.
13. Record UAT test results in §5/§6 below and report back — UAT sign-off (§6) is a separate,
    explicit step from migration execution itself, not assumed to follow automatically just
    because the migration ran without error.

**Do not execute this sequence unless explicitly instructed.**

---

## 5. UAT Test Plan

### Finance

- Expense — create/view an expense; confirm amount stored and displayed as actual INR, not
  Lakhs; confirm GST sub-amount likewise.
- Employee Advance — request/approve/disburse/settle an advance; confirm `amountLakhs`/
  `disbursedAmountLakhs`/`settledAmountLakhs`/`balanceLakhs` all read/write as INR; confirm the
  "Amount (₹)" form label (not "Amount (₹ Lakhs)").
- Travel Claim — confirm `ratePerKm`/`amountRupees`/`amountLakhs` display correctly (no
  unexpected change, since `ratePerKm`/`amountRupees` were already real INR pre-migration).
- Payment — record a payment against a real UAT collection; confirm the amount, the
  `Collection.amountReceivedLakhs` cache update, and the resulting notification text all use INR
  consistently, with no `round2()`/epsilon-in-Lakhs artifact surviving.
- Collection — create/view a collection invoice; confirm `invoiceValueLakhs`/
  `amountWithoutGstLakhs`/`amountReceivedLakhs` all display as actual INR.
- Order Advance — exercise `applyAdvance()` if any UAT `OrderAdvance` row exists or can be
  created; confirm the resulting `Payment` row is INR-consistent (this path had 0 live rows in
  dev — UAT may be the first real exercise of it).

### Sales

- Lead expected value input — create/edit a `CrmLead`; confirm the form shows "Expected Value
  (₹)", not "(₹L)", and the stored/displayed value is actual INR.
- Opportunity value inputs — same check for `value`/`dealValueExTax`/`netProfitLakhs` on a real
  UAT `CrmOpportunity`.
- Sales Funnel value inputs — same check for `dealValueLakhs`/`billingValueLakhs`.
- Sales dashboard Lakhs display — confirm the dashboard's `₹X.XXL`-style cards/charts still
  render in Lakhs, computed from the now-INR canonical values at the presentation boundary only.

### KRA

- KRA template AMOUNT targets — confirm `BOOKING`/`BILLING`/`TEAM_PIPELINE_COVERAGE` targets
  display and score correctly in INR-consistent terms on UAT's real `KRATemplateItem` rows.
- KRA score calculation — re-derive a real UAT employee's KRA score before and after migration
  (same method as dev's Section 1.8/2.2 baseline) and confirm it matches within floating-point
  noise — this is the single highest-value UAT test, since UAT's real `KRA`/`EmployeeTarget` data
  volume (34 rows each, per Session 9) gives this check far more statistical weight than dev's
  thin profile.
- KRA dashboard Lakhs display — confirm `KrasClient.tsx` and any KRA report surface still show
  Lakhs, computed from INR at render time.
- Percentage/count metrics unchanged — confirm every non-`AMOUNT`-typed `KRATemplateItem` row
  (e.g. `GP_PCT`, `COLLECTION_ONTIME`, `QL_COUNT`) is untouched before/after, on UAT's real rows.

### Technical

- API does not leak Decimal objects — sample every Release 1/2 route's response.
- No `[object Object]` anywhere in a UI-rendered money value.
- No 100,000× inflation anywhere (e.g. a known ₹5L deal must not suddenly read ₹500L-equivalent
  on screen).
- No 100,000× reduction anywhere (the inverse error — a known ₹50L deal must not suddenly read
  ₹50-equivalent).
- `npm run build` passes against the UAT-deployed code.
- Server logs clean — no new error class introduced by the migration (existing, unrelated log
  noise is not in scope to fix here).

---

## 6. UAT Sign-Off Checklist

| Area | Tester | Status | Notes |
| ---- | ------ | ------ | ----- |
| Finance testing (Expense/Advance/Travel/Payment/Collection/OrderAdvance) | _(to be assigned)_ | Pending | |
| Sales testing (Lead/Opportunity/Funnel inputs + dashboard) | _(to be assigned)_ | Pending | |
| KRA testing (AMOUNT targets, score calculation, dashboard, non-money metrics) | _(to be assigned)_ | Pending | |
| Dashboard testing (Sales + KRA + Finance, Lakhs-display-only confirmed) | _(to be assigned)_ | Pending | |
| API testing (no Decimal leakage, no `[object Object]`, no 100,000× error either direction) | _(to be assigned)_ | Pending | |
| Business owner approval | _(to be assigned)_ | Pending | |
| Technical owner approval | _(to be assigned)_ | Pending | |

---

## 7. Production Gate

**Production migration cannot proceed until all of the following are true:**

- UAT migration completed (§4's sequence executed, not just designed).
- UAT test checklist (§5/§6) passed — every row in §6 moved from Pending to a passing status.
- Business sign-off received (§6's "Business owner approval" row Approved).
- Technical sign-off received (§6's "Technical owner approval" row Approved).
- Production pre-check results are available — i.e.
  `docs/database/production-precheck/production-precheck-result-template.md` has been filled in
  by someone with confirmed production access (Step 3Y's pack, still not run as of this step).
- Production backup/rollback plan approved — `docs/database/PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md`
  §10/§11's Go/No-Go checklist and sign-off ledger both move from Pending to Approved.

Until every item above is true, production migration remains paused — this document does not,
on its own, unblock production; it only unblocks the *next* step, which is running UAT's
execution sequence (§4) when explicitly instructed.
