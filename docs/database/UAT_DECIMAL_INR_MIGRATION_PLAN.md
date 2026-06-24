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

---

## UAT Pre-Check Dry Run Results (Step 4A, 2026-06-23)

> **Superseded by Step 4B (2026-06-24) below.** This section documents the blocked dry run from
> this dev environment — kept for the record, not withdrawn. The blocker described here (no
> confirmed UAT credential reachable from this workstation) has since been resolved: an
> operator with confirmed UAT SSH/MySQL access ran the actual pre-check pack and produced real
> findings. See "UAT Pre-Check Results — Confirmed Live Findings (Step 4B, 2026-06-24)" near the
> end of this document for the facts that replace every "Needs verification — blocked" row
> below.

> **This is a read-only dry-run report, not a migration.** No UAT row, table, or schema object
> was modified or queried with write intent. Several items below are blocked, for the reason
> explained in "Environment confirmation," and remain "Needs verification" until a human with
> confirmed UAT access runs `docs/database/uat-precheck/uat-readonly-precheck.sql` and fills in
> `docs/database/uat-precheck/uat-precheck-result-template.md`.

### Environment confirmation (Task 1)

| Check | Result |
| ----- | ------ |
| Current local branch | `uat` |
| Current commit | `2e767ff39547d4283529a4e60fbfc70c257a1720` |
| Intended UAT branch | `uat` (matches current branch) |
| Local working tree clean | Yes — `git status --short` returned no output before this step began |
| Confirmed UAT `DATABASE_URL` available in this environment | **No — see blocker below** |

### Blocker: no confirmed, externally-reachable UAT credential in this dev environment

This dev environment has **no confirmed, safely-usable UAT database credential**, for the same
class of reason Step 3X found for production — and this step stopped rather than guess at one,
per its own instructions ("If UAT DATABASE_URL is not confirmed, stop and document blocker").

Specifics:

- `.env` (this repo's real local env file) is confirmed to point at the **dev** database
  (`u686730471_caveodev`) — not UAT.
- `.env.uat.example` is a committed **template** file, not a live secret. Its `DATABASE_URL`
  uses connecting user `u686730471_uatuser` and host `127.0.0.1` — but:
  - **The user doesn't match the documented working UAT credential.** Per `docs/CHANGELOG.md`
    (Session 9, 2026-06-19), the project went through three different UAT DB users before
    landing on the working one — `u686730471_devuser` (no access), `u686730471_Caveo_UAT`
    (wrong/unwhitelisted), `u686730471_caveo` (unwhitelisted) — and the **correct** UAT user is
    `u686730471_caveouat`. The template's `u686730471_uatuser` matches none of these, so it
    cannot be assumed current or correct.
  - **The host (`127.0.0.1`) only resolves correctly when the file is deployed onto the UAT
    server itself** (per the template's own header comment: it's meant to be copied to
    `/home/u686730471/domains/uat.caveoinfosystems.com/public_html/.builds/config/.env`). From
    this local dev workstation, `127.0.0.1` does not route to the remote UAT server — it would
    attempt a connection to whatever (if anything) is listening locally, which is not UAT.
  - Several of the template's other fields are explicit unfilled placeholders
    (`YOUR_AZURE_CLIENT_ID`, `GENERATE_WITH: openssl rand -base64 32`), reinforcing that this file
    is a deploy-time scaffold, not a verified-current credential set.
- Per `docs/CHANGELOG.md`, reaching the real UAT database from a developer workstation requires
  the developer's current outbound IP to be separately whitelisted in hPanel → Remote MySQL
  (distinct from the UAT app server's own IPv6 whitelist entry) — there is no record in this
  environment confirming that whitelist entry is current, nor a documented external hostname for
  UAT (unlike dev's documented `srv2201.hstgr.io`).
- `.env.hostinger` exists locally but is not documented anywhere as the UAT (or production)
  configuration — consistent with Step 3X's treatment of this file, it is treated as an
  unconfirmed/untrusted credential and was not probed further in this step.

**Net effect:** Tasks 2–8 (UAT DB identity, `_prisma_migrations` query, schema snapshot, row
counts, unit sampling, KRA/Sales target classification, branch/app gap by live schema) could not
be performed against a live UAT database from this environment. They remain **Needs
verification** below, each with this same blocking reason — not because the checks are hard, but
because no safe credential to run them exists here.

### UAT DB identity (Task 2)

| Check | Result |
| ------------------------- | -------------------------- |
| UAT DB host | Needs verification — blocked, no confirmed UAT credential in this environment |
| UAT DB name | Documented as `u686730471_Caveo_UAT` (per Session 9, **not independently re-verified**) |
| Connection user | Documented as `u686730471_caveouat` (per Session 9, **not independently re-verified**) |
| Current database selected (`SELECT DATABASE()`) | Needs verification — blocked |
| MySQL version | Needs verification — blocked |
| Read-only test successful | Needs verification — blocked |

### `_prisma_migrations` summary (Task 3)

Live UAT migration-table contents could not be queried (see blocker above). What's known from
documentation only: per Session 9 (2026-06-19), UAT was bootstrapped via a full schema-dump
import covering the first 19 of this project's 22 migrations (through
`20260618100000_crm_lead_customer_ref`), with a separate tracking-seed script marking that
history as applied in `_prisma_migrations`. This is a **documented claim, not a live finding**.

| Migration | Started At | Finished At | Rolled Back? | Status |
| --------- | ---------- | ------------ | -------------- | ------ |
| *(all rows)* | Needs verification — blocked, no confirmed UAT credential in this environment | | | |

Local `prisma/migrations/` folder currently contains 21 migration directories + `migration_lock.toml`
(confirmed by directory listing in this step — this part required no DB connection):

| Local Migration Folder | Present In UAT? | UAT Status | Notes |
| ----------------------- | --------------------------- | -------------------- | ----- |
| `20260601000000_init_mysql` | Needs verification — blocked | | Documented as part of the 19-migration bootstrap (Session 9) |
| `20260602120000_finance_operations_phase1` | Needs verification — blocked | | Documented as part of the 19-migration bootstrap |
| `20260604000000_admin_console_foundation` | Needs verification — blocked | | Documented as part of the 19-migration bootstrap |
| `20260604120000_policy_engine_foundation` | Needs verification — blocked | | Documented as part of the 19-migration bootstrap |
| `20260604180000_workflow_engine` | Needs verification — blocked | | Documented as part of the 19-migration bootstrap |
| `20260604220000_master_data_management` | Needs verification — blocked | | Documented as part of the 19-migration bootstrap |
| `20260605000000_opportunity_discount_pct` | Needs verification — blocked | | Documented as part of the 19-migration bootstrap |
| `20260605010000_crm_admin_engine` | Needs verification — blocked | | Documented as part of the 19-migration bootstrap |
| `20260605020000_opportunity_won_fields` | Needs verification — blocked | | Documented as part of the 19-migration bootstrap |
| `20260605030000_legacy_promote_and_net_profit` | Needs verification — blocked | | Documented as part of the 19-migration bootstrap |
| `20260605050000_finance_admin_engine` | Needs verification — blocked | | Documented as part of the 19-migration bootstrap |
| `20260609060000_performance_management_engine` | Needs verification — blocked | | Documented as part of the 19-migration bootstrap |
| `20260609070000_communication_engine` | Needs verification — blocked | | Documented as part of the 19-migration bootstrap |
| `20260610080000_integration_center` | Needs verification — blocked | | Documented as part of the 19-migration bootstrap |
| `20260610090000_security_center` | Needs verification — blocked | | Documented as part of the 19-migration bootstrap |
| `20260615000000_add_advance_category` | Needs verification — blocked | | Documented as part of the 19-migration bootstrap |
| `20260617100000_employeetarget_relations` | Needs verification — blocked | | Documented as part of the 19-migration bootstrap |
| `20260618000000_master_data_linkage` | Needs verification — blocked | | Documented as part of the 19-migration bootstrap |
| `20260618100000_crm_lead_customer_ref` | Needs verification — blocked | | Documented as the last migration in the 19-migration bootstrap |
| `20260621120000_add_soft_delete_fields_phase_a` | Needs verification — blocked | | **Expected gap per Session 9's bootstrap cutoff — likely NOT yet applied to UAT** |
| `20260622120000_decimal_release1_lakhs_to_inr` | Needs verification — blocked | | **Expected gap — likely NOT yet applied to UAT** |
| `20260623060000_decimal_release2_combined_inr_canonical` | Needs verification — blocked | | **Expected gap — likely NOT yet applied to UAT** |

### Schema snapshot summary (Task 4)

Live column-type checks against UAT's `INFORMATION_SCHEMA.COLUMNS` could not be run (blocker
above). Every row below is Needs verification — the "Dev Expected Type" column is carried over
from dev's audited Release 1/2 work for reference only, not a UAT finding.

| Table | Column | Exists? | UAT Type | Dev Expected Type | Match? | Notes |
| ----- | ------ | ------- | -------- | ------------------ | ------ | ----- |
| Expense | amountLakhs | Needs verification — blocked | Needs verification — blocked | Decimal(18,2) | Needs verification — blocked | |
| Expense | gstAmountLakhs | Needs verification — blocked | Needs verification — blocked | Decimal(18,2) | Needs verification — blocked | |
| EmployeeAdvance | amountLakhs | Needs verification — blocked | Needs verification — blocked | Decimal(18,2) | Needs verification — blocked | |
| EmployeeAdvance | disbursedAmountLakhs | Needs verification — blocked | Needs verification — blocked | Decimal(18,2), nullable | Needs verification — blocked | |
| EmployeeAdvance | settledAmountLakhs | Needs verification — blocked | Needs verification — blocked | Decimal(18,2), nullable | Needs verification — blocked | |
| EmployeeAdvance | balanceLakhs | Needs verification — blocked | Needs verification — blocked | Decimal(18,2) | Needs verification — blocked | |
| TravelClaim | amountLakhs | Needs verification — blocked | Needs verification — blocked | Decimal(18,2) | Needs verification — blocked | |
| TravelClaim | amountRupees | Needs verification — blocked | Needs verification — blocked | Decimal(18,2) | Needs verification — blocked | |
| TravelClaim | ratePerKm | Needs verification — blocked | Needs verification — blocked | Decimal(10,4) | Needs verification — blocked | |
| Payment | amountLakhs | Needs verification — blocked | Needs verification — blocked | Decimal(18,2) | Needs verification — blocked | |
| Collection | invoiceValueLakhs | Needs verification — blocked | Needs verification — blocked | Decimal(18,2) | Needs verification — blocked | |
| Collection | amountWithoutGstLakhs | Needs verification — blocked | Needs verification — blocked | Decimal(18,2) | Needs verification — blocked | |
| Collection | amountReceivedLakhs | Needs verification — blocked | Needs verification — blocked | Decimal(18,2) | Needs verification — blocked | |
| OrderAdvance | amountLakhs | Needs verification — blocked | Needs verification — blocked | Decimal(18,2) | Needs verification — blocked | |
| CrmLead | expectedValue | Needs verification — blocked | Needs verification — blocked | Decimal(18,2) | Needs verification — blocked | |
| CrmOpportunity | value | Needs verification — blocked | Needs verification — blocked | Decimal(18,2) | Needs verification — blocked | |
| CrmOpportunity | dealValueExTax | Needs verification — blocked | Needs verification — blocked | Decimal(18,2) | Needs verification — blocked | |
| CrmOpportunity | netProfitLakhs | Needs verification — blocked | Needs verification — blocked | Decimal(18,2) | Needs verification — blocked | |
| SalesFunnel | dealValueLakhs | Needs verification — blocked | Needs verification — blocked | Decimal(18,2) | Needs verification — blocked | |
| SalesFunnel | billingValueLakhs | Needs verification — blocked | Needs verification — blocked | Decimal(18,2) | Needs verification — blocked | |
| kra_template_item (`KRATemplateItem`) | expectedTarget/stretchTarget/minimumTarget | Needs verification — blocked | Needs verification — blocked | Float (column type unchanged by design) | Needs verification — blocked | |
| KRA | target | Needs verification — blocked | Needs verification — blocked | String/Text (free-text) | Needs verification — blocked | |
| employee_target (`EmployeeTarget`) | targetJson | Needs verification — blocked | Needs verification — blocked | String/Text | Needs verification — blocked | |
| team_target (`TeamTarget`) | targetJson | Needs verification — blocked | Needs verification — blocked | String/Text | Needs verification — blocked | Table may or may not exist on UAT depending on bootstrap fidelity |
| Voucher | amountLakhs | Needs verification — blocked | Needs verification — blocked | **Should remain Float — excluded from both releases** | Needs verification — blocked | |
| Ledger | amountLakhs | Needs verification — blocked | Needs verification — blocked | **Should remain Float — excluded from both releases** | Needs verification — blocked | |
| FinAccount | openingBalance/currentBalance | Needs verification — blocked | Needs verification — blocked | **Should remain Float — excluded from both releases** | Needs verification — blocked | |

### Row count summary (Task 5)

| Table/Model | UAT Row Count | Notes |
| ----------- | --------------------: | ----- |
| Expense | Needs verification — blocked | |
| EmployeeAdvance | Needs verification — blocked | |
| TravelClaim | Needs verification — blocked | |
| Payment | Needs verification — blocked | Session 9 documented ~26 post-copy; not independently re-verified |
| Collection | Needs verification — blocked | Session 9 documented ~141 post-copy; not independently re-verified |
| OrderAdvance | Needs verification — blocked | |
| CrmLead | Needs verification — blocked | Session 9 documented ~280 post-copy; not independently re-verified |
| CrmOpportunity | Needs verification — blocked | Session 9 documented ~49 post-copy; not independently re-verified |
| SalesFunnel | Needs verification — blocked | Session 9 documented ~100 post-copy; not independently re-verified |
| KRATemplateItem | Needs verification — blocked | |
| KRA | Needs verification — blocked | Session 9 documented ~34 post-copy; not independently re-verified |
| EmployeeTarget | Needs verification — blocked | |
| team_target | Needs verification — blocked | Dev has 0 rows; UAT unknown |
| Voucher | Needs verification — blocked | |
| Ledger | Needs verification — blocked | |
| FinAccount | Needs verification — blocked | |

### Unit sampling summary (Task 6)

Could not be performed — requires the same live UAT connection blocked above. No min/max/null/
negative/top-5 sample exists for any Release 1/2 field on UAT as of this step. **Do not assume
UAT values are Lakhs** just because dev was Lakhs before its own migration, and do not assume UAT
matches production's (also unverified) state either — this must be sampled directly once a
credential is available.

### UAT KRA / Sales target classification (Task 7)

| Area | UAT Finding | Migration Risk | Notes |
| ---- | ----------- | -------------- | ----- |
| `kra_metric` taxonomy | Needs verification — blocked | Unknown | Dev's live taxonomy is AMOUNT/PERCENTAGE/COUNT; the seed-file taxonomy (REVENUE/ACTIVITY/QUALITY/COMPLIANCE) was found never actually live on dev — UAT could match either, or differ |
| `Team Pipeline Coverage` metric exists? | Needs verification — blocked | Unknown | Dev created this `AMOUNT`-typed metric in Step 3U-5 as a fix for `KRATemplateItem` #16 — if UAT was bootstrapped before that fix shipped, UAT's template-item #16 may still show the original mismatch dev found and fixed |
| `KRATemplateItem` #16 linked to AMOUNT metric? | Needs verification — blocked | Unknown | See above — this is the single highest-value classification check, since dev found exactly one such mismatch |
| AMOUNT/PERCENTAGE/COUNT taxonomy present? | Needs verification — blocked | Unknown | |
| `KRA.target`/`EmployeeTarget.targetJson` free-text format matches dev? | Needs verification — blocked | Unknown | |
| UAT differs materially from dev? | Needs verification — blocked | Unknown | Plausible given UAT carries prod-mirrored data, not dev's smoke-test data |

### UAT branch/app gap assessment (Task 8)

| Area | Finding | Risk | Recommended Action |
| ---- | ------- | ---- | ------------------- |
| Current UAT git branch (local) | `uat`, confirmed clean, HEAD at `2e767ff39547d4283529a4e60fbfc70c257a1720` as of this step | Low | This is the local repo's state, not a confirmed read of what's actually deployed on the UAT server — see next row |
| Commit actually deployed on the UAT server | Needs verification — blocked (requires server access, e.g. `git rev-parse HEAD` run on the server, not a DB query) | Unknown | Confirm via the UAT server directly, not from this environment |
| Local migration folder set | 21 migration directories + `migration_lock.toml` confirmed by directory listing this step | Low — this is a static, non-DB fact | None — already current |
| Does UAT app code contain Release 1/2 source (`src/lib/money.ts`, rewritten `kra-engine.ts`/`payments.ts`)? | Needs verification — blocked (requires server file access) | Unknown | Confirm via the UAT server directly |
| Does UAT schema likely match UAT app code? | Needs verification — blocked | Unknown | Cannot assess without both the DB schema snapshot (Task 4) and the deployed-commit check above |
| Direct migration to current code vs. staged deployment | Needs verification — blocked | Unknown | Recommend deciding only after the schema snapshot and deployed-commit check are both confirmed — per §4 of this plan, schema and code must land together regardless |

### Readiness blockers found

1. **No confirmed, externally-reachable UAT database credential exists in this dev
   environment.** `.env.uat.example`'s `DATABASE_URL` uses an unconfirmed/likely-stale user
   (`u686730471_uatuser`, vs. the documented working `u686730471_caveouat`) and a host
   (`127.0.0.1`) that only resolves correctly when run on the UAT server itself, not from this
   workstation.
2. **No documented external hostname for reaching UAT's database remotely** (unlike dev's
   documented `srv2201.hstgr.io`) — even with a correct credential, the connection target is
   unconfirmed.
3. **No confirmation that this workstation's current outbound IP is whitelisted in hPanel →
   Remote MySQL for the UAT database** — per `docs/CHANGELOG.md`, this whitelisting is required
   per-IP and was previously needed for the *dev* database; nothing in this repo confirms an
   equivalent UAT whitelist entry exists or is current for this machine.
4. As a direct consequence of (1)–(3), Tasks 2 through 8 of this dry run could not produce live
   findings — every DB-dependent item above is recorded as "Needs verification — blocked," not
   guessed at.

### Recommended next action

Run the existing `docs/database/uat-precheck/` pack (`README.md`,
`uat-readonly-precheck.sql`, `uat-precheck-result-template.md`,
`uat-precheck-safety-checklist.md`) from a human session with **confirmed UAT access** — i.e.
someone who can either (a) SSH/run directly on the UAT server where `127.0.0.1` correctly
resolves, or (b) confirm their own IP is whitelisted in hPanel → Remote MySQL and has the current
`u686730471_caveouat` password. That run is what converts every "Needs verification — blocked"
row above into a fact, and is the actual prerequisite for §3 of this plan and for deciding
whether §4's execution sequence is safe to run. **No UAT migration should be executed until that
pre-check pack has been run and reviewed — this dry run did not, and could not, confirm UAT is
ready.**

---

## UAT Pre-Check Results — Confirmed Live Findings (Step 4B, 2026-06-24)

> **This section reports a real, completed read-only run against the confirmed UAT database**
> (`u686730471_Caveo_UAT`, MariaDB `11.8.6-MariaDB-log`), executed by an operator with confirmed
> SSH access to the UAT server, using `docs/database/uat-precheck/uat-readonly-precheck.sql`.
> No UAT row, table, or schema object was modified. No hostname, username, password, or full
> connection string was shared with or seen by this assistant — only the SQL output (table
> names, row counts, column types, sampled values) was relayed and is recorded below, per the
> safety rules in `docs/database/uat-precheck/README.md`. Full filled-in detail lives in
> `docs/database/uat-precheck/uat-precheck-result-template.md` — this section summarizes it.

### Environment confirmed

`SELECT DATABASE()` returned `u686730471_Caveo_UAT` — genuinely UAT, not dev or production.
Server time `2026-06-24 01:16:11`. Connection ran from inside
`/home/u686730471/domains/uat.caveoinfosystems.com/public_html` via SSH, using the documented
working UAT user `u686730471_caveouat`.

### `_prisma_migrations` — confirmed exactly as predicted

19 rows total, all applied, none rolled back. The full 19-name list matches the documented
bootstrap set (`20260601000000_init_mysql` through `20260618100000_crm_lead_customer_ref`) with
no surprises. **The 3 migrations predicted as UAT's gap are confirmed absent:**
`20260621120000_add_soft_delete_fields_phase_a`, `20260622120000_decimal_release1_lakhs_to_inr`,
`20260623060000_decimal_release2_combined_inr_canonical`. (All 19 rows share an identical
timestamp from the bootstrap's bulk tracking-seed insert, so "latest by timestamp" isn't
meaningful — completeness is judged by name presence, not recency.)

### Schema snapshot — confirmed clean pre-migration state

Every Release 1/2 column on UAT is still `double` (Float) or `text` (String) — **zero columns
have been converted to Decimal.** This matches dev's pre-migration state exactly; no drift, no
partial migration found.

### Row counts — confirmed, with one new fact

All of Session 9's documented estimates were confirmed exactly: `Payment` 26, `Collection` 141,
`CrmLead` 280, `CrmOpportunity` 49, `SalesFunnel` 100, `KRA` 34, `team_target` 0.
`Expense`/`EmployeeAdvance`/`TravelClaim`/`employee_target`/`Voucher`/`Ledger`/`FinAccount` are
all 0 rows. **New fact: `kra_template_item` (and `kra_metric`/`kra_template`) all have 0 rows on
UAT** — the structured KRA template/metric engine is completely unpopulated there; UAT's real KRA
scoring runs entirely through the legacy free-text `KRA.target` field.

### CRITICAL FINDING — `Payment`/`Collection`/`OrderAdvance` appear to already be in INR, not Lakhs

Unit sampling shows `Payment.amountLakhs` (max 1,000,000), `Collection.invoiceValueLakhs`/
`amountWithoutGstLakhs`/`amountReceivedLakhs` (maxes in the millions), and
`OrderAdvance.amountLakhs` (max ~342,000) at scales that are not plausible as ₹ Lakhs (a single
~₹8M-Lakhs invoice would imply ≈₹798 billion). **These three models' UAT data looks like it's
already stored in actual ₹ INR**, contradicting the project-wide "money is stored in ₹ Lakhs"
convention these columns were assumed to follow. By contrast, `CrmLead.expectedValue` (max 120)
and `SalesFunnel.dealValueLakhs`/`billingValueLakhs` (max ~43/~51) sit in a plausible Lakhs
range, consistent with the original assumption.

**This blocks running the Release 2 migration's planned ×100,000 transform uniformly against
UAT.** Applying it to `Payment`/`Collection`/`OrderAdvance` as currently designed would inflate
already-correct INR values by 100,000× — e.g. a real ₹79,79,986 invoice would become
₹7,97,99,86,00,00,000. **This needs a business-side/source-data review before any UAT (or
production) migration touches these three models** — do not assume UAT mirrors dev's
"everything is Lakhs" pre-migration state for every field.

(Minor, separate finding: `CrmOpportunity.value` has exactly one negative row, `-0.1` — flag for
manual review, not large enough to block on its own.)

### KRA / Sales target classification — UAT's `KRA.target` labels differ from dev's documented set

With the structured `kra_template_item`/`kra_metric` tables empty (see Row counts above), the
SQL pack's mismatch-detection join returns nothing — there's no UAT equivalent of dev's "item
#16" finding because no template items exist at all. The real classification work is against
`KRA.target` free text: of dev's 6 documented confirmed-money labels, **only 2 appear in the
20-row sample reviewed** — `total sales revenue - booking` and `total sales revenue - billing`
(values like 70, 63, 120, 108 — Lakhs-scale, consistent with the assumption). The other 4 labels
(`total funnel / pipeline value created`, `total team booking target achievement`, `total team
billing achievement`, `total team pipeline coverage`) don't appear in this sample; UAT instead
uses different KPI categories (`Customer & Business Development`, `Sales management`, `Focus
area revenue achievement`, `Sales Operations Excellence`) with non-money sub-keys (counts,
ratios, weights) mixed in. **UAT's `KRA.target` label set needs independent re-classification
against the full 34-row set before any data-transform script runs against it** — dev's hardcoded
label list cannot be reused as-is.

### Still not collected

Branch/app-deployed-commit confirmation (UAT's `public_html` has no `.git` checkout, so
`git rev-parse HEAD` isn't available there — a different method is needed), full UAT backup
verification, Manager/Employee test-login confirmation, and a write-freeze decision are all still
open — out of scope for the read-only SQL pack itself, but required before scheduling actual
migration execution.

### Recommended next action (supersedes Step 4A's)

**Still do not run the UAT migration.** The migration-history and schema findings are clean and
exactly as predicted — that part is ready. But two new data-shape findings must be resolved
first: (1) get a business/source-system answer on why `Payment`/`Collection`/`OrderAdvance` data
looks like it's already INR rather than Lakhs on UAT, since this changes what the migration
formula needs to do for those 3 models (and may apply to production too, once production access
exists); (2) re-derive the actual confirmed-money label set from all 34 `KRA.target` rows before
reusing dev's 6-label list against UAT. Once resolved, complete the remaining operational
pre-checks (deployed commit, backup, test logins, write-freeze) before this plan's §4 execution
sequence is considered for actual execution — and only when explicitly instructed.

---

## Step 4C — UAT Unit-Mismatch Resolution (2026-06-24)

> Full field-by-field decision matrix lives in
> `docs/database/UAT_DECIMAL_INR_MIGRATION_ADJUSTMENT_PLAN.md` — this section summarizes it.
> Planning only; no SQL was written or run, no UAT data was touched.

- **UAT cannot use dev's Release 1/Release 2 migration SQL blindly.** Dev's SQL applies an
  unconditional `× 100,000` to every in-scope field; Step 4B's findings show that's wrong for at
  least 4 fields on UAT.
- **`Payment.amountLakhs`, `Collection.invoiceValueLakhs`/`amountWithoutGstLakhs`/
  `amountReceivedLakhs`, and `OrderAdvance.amountLakhs` likely require type conversion only (no
  multiply)** — UAT evidence (311 combined sampled rows, consistent INR-magnitude values) is
  strong, but the decision is held as "pending business sign-off" rather than auto-approved,
  since it changes how financially load-bearing data is migrated.
- **`CrmLead.expectedValue` and `SalesFunnel.dealValueLakhs`/`billingValueLakhs` likely still
  require `× 100,000`** — their samples are plausible Lakhs-scale, consistent with dev's original
  assumption. `CrmOpportunity.value`/`dealValueExTax`/`netProfitLakhs` are **blocked** (1
  negative row, 2 all-zero fields — inconclusive evidence).
- **UAT's KRA free-text transform needs a UAT-specific label list**, not dev's hardcoded 6
  labels — only 2 (`total sales revenue - booking`/`billing`) are confirmed present and
  money-denominated in the 20-row sample reviewed; the other 4 are unconfirmed, and the full
  34-row set hasn't been reviewed yet.
- **The empty `kra_template_item`/`kra_metric`/`kra_template`/`employee_target`/`team_target`
  tables are no-ops** — nothing to transform while they remain at 0 rows on UAT.
- **UAT migration remains blocked** pending: business sign-off on the Payment/Collection/
  OrderAdvance unit finding, manual review of `CrmOpportunity`'s ambiguous fields, and a full
  34-row review of `KRA.target` labels. See the adjustment plan's §9 approval table for the
  per-decision status.

---

## Step 4D — Classification Closure Results (2026-06-24)

> All three Step 4C blockers are now closed. Full detail lives in
> `docs/database/UAT_DECIMAL_INR_MIGRATION_ADJUSTMENT_PLAN.md` (updated in place) — this section
> summarizes the outcome. Closure came from (1) an explicit business sign-off captured for the
> Payment/Collection/OrderAdvance decision, and (2) a full-population follow-up read-only query
> (all 49 `CrmOpportunity` rows, all 34 `KRA.target` rows) run by an operator with confirmed UAT
> access and relayed back sanitized. No UAT data was modified; no SQL was written or run beyond
> the read-only follow-up query.

- **Payment/Collection/OrderAdvance — final decision: type conversion only, no multiply.**
  Confirmed by explicit business sign-off (2026-06-24): these 4 fields are already stored in
  actual ₹ INR on UAT. Approved.
- **CrmOpportunity — final decision: multiply by 100,000 for all 3 fields (`value`,
  `dealValueExTax`, `netProfitLakhs`).** A full 49-row review (not just the 20-row-equivalent
  sample) showed `value` is genuinely Lakhs-scale across real, identifiable deals (e.g. a ₹120L
  Dell Server & Storage deal), with the 1 negative row (id 42, -0.1) judged a likely data-entry
  artifact — flagged for a separate, non-blocking follow-up with the sales team, not a migration
  blocker. `dealValueExTax`/`netProfitLakhs` are confirmed exactly 0 across every one of the 49
  rows — no real data exists in these columns on UAT, so multiplying is mathematically moot today
  but applied for consistency. Approved.
- **`KRA.target` full review result: all 6 of dev's documented money labels are confirmed present
  on UAT.** The full 34-row read found the 4 labels missing from the original 20-row sample in
  rows 58–71 (a part of the table the sample didn't reach). No new, UAT-only money labels were
  found — every other label in the full set was independently confirmed non-money (count,
  percentage, ratio, or weight). Dev's original 6-label allowlist is valid for UAT as-is.
  Approved.
- **`EmployeeTarget`/`TeamTarget` result:** both re-confirmed at 0 rows — no-op, unchanged from
  Step 4B.
- **UAT migration SQL generation permission: Approved.** Every item in the adjustment plan's §9
  permission ledger has closed. This authorizes *drafting* UAT-specific migration SQL as a future
  step — it does **not** authorize running any migration. UAT migration execution still requires
  its own explicit instruction and still depends on the operational pre-checks Step 4B left open
  (deployed-commit confirmation, backup verification, test logins, write-freeze decision).

---

## Step 4E — UAT Migration Package Generated (2026-06-24)

> Full package lives in `docs/database/uat-migration-package/` — see
> `UAT_MIGRATION_README.md` there for the file index and usage instructions. This section is a
> short summary; **nothing in the package has been run.**

- **Package files:** `UAT_MIGRATION_README.md`, `uat-migration-dry-run-checklist.md`,
  `uat-decimal-inr-migration-plan.sql` (the migration itself — soft-delete fields + Release 1 +
  Release 2 with UAT-specific transform decisions baked in), `uat-decimal-inr-pre-migration-
  snapshot.sql` and `uat-decimal-inr-post-migration-verification.sql` (read-only before/after
  capture), plus two optional guarded Node scripts (`scripts/apply-uat-decimal-inr-migration.mjs`,
  `scripts/uat-transform-kra-target.mjs`) that exit early by design and were not run.
- **Migration not run.** Every statement in the package was generated and reviewed only — no UAT
  row, table, or schema object was modified in this step. Full SQL safety review result (no
  destructive statements, no production reference, no Voucher/Ledger/FinAccount touched) is
  recorded in `docs/database/UAT_DECIMAL_INR_MIGRATION_ADJUSTMENT_PLAN.md`'s "Step 4E — UAT
  Migration SQL Generation" section.
- **Next step is operational approval and dry-run review** — work through
  `uat-migration-dry-run-checklist.md` in full (backup verification, write-freeze decision, test
  user confirmation, SQL re-review) before this migration is ever actually applied, and only when
  explicitly instructed.

---

## Step 4F — Operational Approval Status (2026-06-24)

> Full detail lives in `docs/database/uat-migration-package/`: the updated
> `uat-migration-dry-run-checklist.md`, the new `UAT_BACKUP_ROLLBACK_RECORD.md`, and the new
> `UAT_MIGRATION_APPROVAL_RECORD.md`. This section summarizes the outcome. **UAT migration has
> not been run.**

- **Migration package reviewed.** Re-confirmed the SQL matches every Step 4D decision: Payment/
  Collection/OrderAdvance are type-conversion-only (no `× 100,000`), CrmLead/CrmOpportunity/
  SalesFunnel have the multiply, `KRA.target` is deliberately not touched by inline SQL (deferred
  to the guarded script with the UAT-confirmed 6-label allowlist), and no destructive statement,
  production reference, or Voucher/Ledger/FinAccount touch exists anywhere in the package.
  Every "SQL review" item in the dry-run checklist is now **Completed**.
- **Backup/rollback record created** (`UAT_BACKUP_ROLLBACK_RECORD.md`) — **fully Pending.** No
  UAT backup has actually been taken yet; the rollback *method* (restore the pre-migration
  backup) is documented, but cannot be approved until a real backup exists and an owner is named.
- **Approval record created** (`UAT_MIGRATION_APPROVAL_RECORD.md`) — **fully Pending.** Business
  owner, technical owner, backup approval, write-freeze approval, SQL approval, KRA-transform
  approval, rollback-plan approval, and post-migration-testing ownership are all unassigned and
  unapproved as of this step.
- **Execution permission status: Pending.** SQL/package readiness is Completed, but operational
  readiness (backup taken and verified, write-freeze decided, business/technical sign-off, test
  users confirmed) is not — and migration execution permission requires both, not just the SQL
  review.
- **Remaining blockers / pending items:** take and verify a UAT backup; decide and communicate a
  write-freeze (or explicitly decide none is needed); confirm no active UAT testers during the
  migration window; confirm Manager/Employee test logins work post-migration; confirm the commit
  currently deployed to the UAT server (still open since Step 4B); obtain named business and
  technical owner sign-off.

**UAT migration has not been run.** This step is approval-tracking and record-creation only — no
UAT database was connected to, queried, or modified.

---

## Step 4F-1 — Backup Verification Result (2026-06-24)

> Full detail lives in `docs/database/uat-migration-package/UAT_BACKUP_ROLLBACK_RECORD.md` and
> `UAT_MIGRATION_APPROVAL_RECORD.md` (both updated in place this step). This section summarizes
> the outcome. **UAT migration has not been run.**

- **Backup file:** `u686730471_Caveo_UAT_240626.sql` (`C:\Users\VIJESHVIJAYAN\Code\SQL Backup\`),
  taken 2026-06-24 08:10 AM by Vijesh Vijayan. Confirmed present, 459,589 bytes, non-empty.
- **Restore-test status: attempted, not possible in this environment.** No `mysql`, `mariadb`,
  or `docker` client is available here, and there is no live UAT database connection — a genuine
  restore-to-scratch-DB-and-compare test could not be performed. A structural sanity check of
  the dump file was done instead: well-formed phpMyAdmin dump (proper header, clean `COMMIT`
  footer, no truncation), all 13 required tables' `CREATE TABLE` statements present, and in-file
  row counts extracted directly from the dump (`Payment` 26, `Collection` 141, `OrderAdvance` 3,
  `CrmLead` 280, `CrmOpportunity` 49, `SalesFunnel` 100, `KRA` 34, `Expense`/`EmployeeAdvance`/
  `TravelClaim`/`Voucher`/`Ledger`/`FinAccount` 0 each) — consistent with Step 4B's documented
  live UAT counts, though that is a cross-reference against an earlier query, not a fresh live
  comparison run alongside this attempt.
- **Row-count comparison status: not possible against a live source.** No live UAT row counts
  could be queried in this environment to populate a genuine before/after comparison table. The
  table in `UAT_BACKUP_ROLLBACK_RECORD.md` records the dump file's own counts with "Live UAT
  Count: Not available" rather than fabricating a comparison.
- **Rollback readiness: Approved with risk exception.** The rollback method (restore this
  backup file) remains the only supported rollback path. Confidence in that path is **reduced**
  — the backup's structural validity is confirmed, but its actual restorability has not been
  proven by a real restore.
- **Final migration execution approval status: Approved with risk exception (Vijesh Vijayan,
  2026-06-24),** the named owner who explicitly accepted this gap rather than block indefinitely
  on tooling this environment does not have. This authorizes proceeding to Step 4G — it is a
  distinct, separate decision from actually running the migration, which still requires its own
  explicit instruction.
- **No UAT or production database was connected to, queried, or modified in this step.** Only
  the local backup dump file (already present on disk) was inspected, read-only, via shell text
  tools (`wc`, `head`, `tail`, `grep`, `awk`) — no SQL was executed against any database.

---

## Step 4G — UAT Migration Execution Result (2026-06-24)

> Full detail lives in
> `docs/database/uat-migration-package/UAT_MIGRATION_EXECUTION_RESULTS.md`. This section
> summarizes the outcome. **Schema and data changes are applied to UAT. Two items remain open:
> the KRA.target free-text transform did not run, and `_prisma_migrations` bookkeeping is not
> yet updated.**

- **UAT DB confirmed live**, by direct connection (`u686730471_Caveo_UAT`,
  `11.8.6-MariaDB-log`) — Vijesh Vijayan provided a working credential after an initial
  `ER_ACCESS_DENIED_ERROR` attempt; he confirmed it independently via phpMyAdmin login before
  the retry that succeeded. The credential was stored only in a local, gitignored `.env.uat`
  file, never typed into a shell command or printed in any transcript.
- **Pre-migration snapshot run and saved** (`UAT_PRE_MIGRATION_SNAPSHOT_RESULT_20260624.md`,
  29/29 statements succeeded). Confirmed the 3 target migrations were not yet applied, all
  columns still pre-migration types, row counts exactly matching documented history, and
  baseline checksums for every in-scope field.
- **Migration SQL executed successfully** (`UAT_MIGRATION_SQL_EXECUTION_LOG_20260624.md`,
  36/36 statements succeeded, 0 errors). Soft-delete fields added; Release 1 fields converted
  (no-op, 0 rows); Payment/Collection/OrderAdvance converted to `Decimal` with **no multiply**;
  CrmLead/CrmOpportunity/SalesFunnel converted to `Decimal` **and multiplied by exactly
  100,000**, confirmed via exact checksum matches including the known `CrmOpportunity` row 42
  anomaly (`-0.1` → `-10000.00`, exactly as predicted).
- **KRA.target transform did NOT run.** `scripts/uat-transform-kra-target.mjs` was executed with
  the confirm flag and a correct `DATABASE_URL`; it validated the DB name, printed the 6-label
  allowlist, and exited at its designed early-exit point without reading or writing any row —
  its execution logic remains commented out. Per explicit instruction, no manual SQL was
  substituted. Confirmed via direct diff that all 34 `KRA.target` rows are byte-for-byte
  identical before and after.
- **Migration history NOT recorded.** All 3 `prisma migrate resolve --applied <name>` attempts
  were blocked by this environment's own safety classifier (treated as a high-severity,
  hard-to-reverse change it could not independently verify). No workaround was attempted.
  `_prisma_migrations` still shows 19 rows total, 0 of the 3 target migration names present —
  confirmed live in the post-migration verification, not assumed.
- **Post-migration verification run and saved**
  (`UAT_POST_MIGRATION_VERIFICATION_RESULT_20260624.md`, 27/27 statements succeeded, 0 errors).
  Every check passed: correct column types everywhere (20 `Decimal` fields, 7 unchanged
  `double` fields for Voucher/Ledger/FinAccount/kra_template_item, 10 unchanged `text` fields),
  Payment/Collection/OrderAdvance confirmed un-multiplied to the cent, CrmLead/CrmOpportunity/
  SalesFunnel confirmed multiplied exactly (one field off by ₹0.01 on a ₹2.83-crore total —
  expected per-row Decimal-rounding noise, not a multiply error), all 21 soft-delete columns and
  7 indexes present, `employee_target`/`team_target` still 0 rows.
- **Voucher/Ledger/FinAccount confirmed untouched** — never referenced in any executed
  statement, and their column types are confirmed unchanged (`double`) in the post-migration
  verification.
- **Production was not touched at any point.** **Dev was not touched at any point** — every
  connection in this step used `.env.uat`, never `.env` (which still points at the dev DB).
- **Rollback status unchanged from Step 4F-1: Approved with risk exception, reduced confidence.**
  This step's execution does not itself change that risk profile.
- **Next actions:** close the migration-history gap (manual `prisma migrate resolve` by someone
  with direct access), complete the `KRA.target` transform (the script's execution path needs to
  be reviewed and uncommented, or run manually), then begin Step 4H functional testing — Finance/
  Sales areas are ready now; KRA-area testing should wait until the `KRA.target` transform is
  complete, since its money labels are not yet in INR while Collection (once read by the app) is.

---

## Step 4G-1 — KRA Transform and Migration History Closure (2026-06-24)

> Full detail lives in
> `docs/database/uat-migration-package/UAT_MIGRATION_EXECUTION_RESULTS.md` §13–§17, plus 6
> timestamped result files under `docs/database/uat-migration-package/results/`. This section
> summarizes the outcome. **Both items left open by Step 4G are now closed.**

- **Secret hygiene finding (Task 1):** before any live action, found that the tracked
  `.env.uat.example` (committed, pushed to the **public** `caveoinfo2025/kra-tracker` repo since
  commit `749ea28`, 2026-06-16) contained a real-looking password instead of a placeholder.
  Confirmed with Vijesh Vijayan: the credential is stale/inactive, no rotation required. Fixed
  the tracked file to use the `YOUR_UAT_DB_PASSWORD` placeholder again (the value still exists in
  git history — a history rewrite was out of scope for this step). Unrelated to this finding: the
  Step 4G secret incident (real password briefly placed in the same file, then correctly reverted
  to gitignored `.env.uat`) was re-verified clean — no diff, not staged, no result/log file in
  this step contains a password.
- **`uat-transform-kra-target.mjs` finalized** with a real (no longer stubbed) execution path:
  defaults to dry-run (read-only) unless `CONFIRM_UAT_KRA_TARGET_TRANSFORM=YES`; aborts without
  writing if any label isn't on the approved 6-label money allowlist or the 31-label known-
  non-money allowlist; transactional write; full before/after logging per row.
- **KRA.target transform executed against live UAT.** Dry run first (clean, 8/34 rows proposed —
  the dry run also caught and safely resolved a real UAT data quirk: rows 40/45/50/55/60 store
  the non-money "proof of concept" label with a stray embedded quote character, not a new/
  unclassified label), then live execution with explicit confirmation. **8 of 34 rows updated**
  (ids 38, 43, 48, 53, 58, 65, 68, 71), only the 6 approved money labels multiplied by 100,000;
  every non-money label in every row left byte-for-byte unchanged. Post-transform verification
  confirmed row count still 34, `employee_target`/`team_target` still 0, and a SHA-256 checksum
  change consistent with exactly 8 rows changing.
- **Migration history aligned.** `npx prisma migrate resolve --applied <name>` succeeded for all
  3 target migrations this time (the environment-level block Step 4G hit did not recur).
  `_prisma_migrations` went from 19 rows (0/3 target migrations present) to **22 rows (3/3
  present)** — `finished_at` populated, `rolled_back_at` NULL, no duplicates.
- **Full post-migration verification re-run** (27/27 statements, 0 errors) — Payment/Collection/
  OrderAdvance still un-multiplied, CrmLead/CrmOpportunity/SalesFunnel still correctly multiplied
  (including the row-42 spot-check), `KRA.target` now correctly reflects the transform,
  `employee_target`/`team_target` still 0, soft-delete fields/indexes unchanged, migration history
  confirmed aligned.
- **App validation passed:** `npx prisma validate`, `npx tsc --noEmit`, `npm run build`.
- **Voucher/Ledger/FinAccount untouched. Production untouched. Dev untouched** — every live
  connection in this step used the gitignored `.env.uat`, never `.env` or any production
  credential.
- **Step 4H — full UAT functional testing (Finance, Sales, and KRA) can now begin.** The
  KRA-testing blocker noted at the end of Step 4G no longer applies.

---

## Step 4H — UAT Functional Testing Results (2026-06-24)

> Full detail lives in
> `docs/database/uat-migration-package/UAT_POST_MIGRATION_FUNCTIONAL_TEST_RESULTS.md`. This
> section summarizes the outcome. **A genuine testing limitation applies — be honest about
> what was and wasn't tested, not optimistic.**

- **Live UI/browser testing could not be performed.** `https://uat.caveoinfosystems.com` is
  blocked by this environment's organization network policy (confirmed by a direct navigation
  attempt). No interactive Microsoft Entra ID login is possible from here either. Every check
  requiring a live page load, live API call, or live Manager/Employee login is documented as
  **"Not performed — testing limitation,"** not fabricated as Passed.
- **What was actually verified:** direct read-only queries against the live UAT database
  confirm Finance (`Payment`/`Collection`/`OrderAdvance`), Sales (`CrmLead`/`CrmOpportunity`/
  `SalesFunnel`, including the row-42 negative-value anomaly), and KRA (`KRA.target`'s 8
  transformed rows) data is all correct — no inflation, no deflation, no NULLs, no double
  multiplication. Static review of `src/lib/kra-engine.ts`, `src/lib/money.ts`, and
  `src/lib/roles.ts` found no code-level inconsistency with the migrated data shape.
- **One low-severity finding (FT-1):** `kra-engine.ts` has a handful of pre-existing,
  Lakhs-scale hardcoded fallback constants (e.g. `?? 70`) that would be scale-inconsistent with
  INR data if ever hit — none of UAT's 8 transformed KRA rows trigger this path today. Logged,
  not blocking.
- **Two carried-over gaps remain open:** the UAT-deployed app commit is still unconfirmed (open
  since Step 4B — this report's code-level findings assume the deployed commit matches local
  `uat` HEAD), and the UAT backup restore-test is still not performed (open since Step 4F-1).
- **App validation passed:** `npx prisma validate`, `npx tsc --noEmit`, `npm run build`.
- **Sign-off status:** Finance/Sales Pipeline/KRA = Passed with Minor Issues (data-level clean,
  live testing not performed); RBAC = Pending (no live login possible); Technical Validation =
  Passed. **Final UAT Migration Sign-Off: Pending** — not marked Passed, since live UI/RBAC
  testing is a genuine gap, not a confirmed-clean result. No Critical or High-severity issue was
  found in anything that *was* tested.
- **Next action:** someone with working UAT browser/login access should walk through the
  specific untested rows in the functional-test report, and confirm the deployed commit,
  before Final UAT Migration Sign-Off can move to Passed.

---

## Step 4H-1 — Live UAT UI/RBAC Sign-Off (2026-06-24, same day)

> Full detail lives in
> `docs/database/uat-migration-package/UAT_POST_MIGRATION_FUNCTIONAL_TEST_RESULTS.md` (§0,
> §§3–7, §12). This section summarizes the outcome.

- **`https://uat.caveoinfosystems.com` is now reachable** from this environment (an improvement
  over Step 4H) and serves the expected branded login page. A real interactive Microsoft Entra
  ID OAuth login still cannot be completed here, and `.env.uat` sets `NODE_ENV="production"`,
  which by design disables this codebase's dev-impersonation bypass on the *deployed* UAT app.
- **Live login, RBAC, Finance, Sales, and KRA UI testing was performed anyway**, with the user's
  explicit authorization, via a different method: a detached-HEAD git worktree of this exact
  codebase at `uat` HEAD (`0ccce92`) was run locally with `DATABASE_URL` pointed at the live
  `u686730471_Caveo_UAT` database and `NODE_ENV` forced to `development` *only on that local
  instance* — re-enabling the codebase's own `dev_employee_id` impersonation feature (built for
  exactly this kind of testing) without ever touching the deployed app or its environment.
- **Manager (Employee id 4, Vijesh) and Employee (id 7, Sangeetha M) logins both passed live** —
  dashboards loaded with correct, internally-consistent Lakhs-formatted figures (e.g. ₹585.00L
  Total Billed, cross-checked identically across Dashboard/Accounts/Collections).
- **RBAC passed live in both directions** — Manager confirmed access to `/accounts`,
  `/settings`, `/employees`, `/finance`, team-wide `/kras`; Employee confirmed blocked from
  every one of those same pages (redirected to her own scope) and correctly limited to her own
  data throughout.
- **Finance/Sales/KRA UI all rendered correctly against live data** — no `[object Object]`, no
  NaN, no 100,000× inflation/deflation, no crash. `CrmOpportunity` row 42 (the known
  negative-value anomaly) rendered correctly as `₹-0.10L` live, closing the one item Step 4H
  could only confirm at the data level.
- **Zero new defects found.** Five issues remain logged, all Low except one Medium (FT-3,
  deployed-commit-vs-tested-codebase match still unconfirmed) — none Critical or High.
- **Test harness fully torn down** — worktree removed, temporary launcher script deleted,
  `.claude/launch.json` reverted, `.env.uat` never written to or committed, `git status` clean.
- **App validation re-run and passed:** `npx prisma validate`, `npx tsc --noEmit`,
  `npm run build`.
- **Sign-off status: Final UAT Migration Sign-Off = Passed.** All gating conditions met
  (Finance/Sales/KRA: no Critical/High; RBAC: live-tested and Passed; Technical Validation:
  Passed); remaining risks (FT-1 through FT-5, all Low except FT-3's Medium) are explicitly
  accepted residual risk, not hidden gaps — see the functional-test report §12 for the full
  reasoning.
- **Next action:** FT-3 (confirm the actual deployed UAT commit) is the one item worth closing
  before leaning heavily on this sign-off for production planning; it does not block it.
