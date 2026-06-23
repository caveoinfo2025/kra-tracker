# Production Decimal / INR Migration Sign-Off Plan

> **Step 3W (2026-06-23).** This is a **planning, risk-review, and sign-off documentation
> artifact only**. No production database was queried, no production migration was run, no
> Prisma schema was modified, no migration was created, no API/UI code was changed, no business
> data was updated, and `db push` was not used anywhere in this step. Every production-state
> claim below is explicitly marked **Needs verification** unless a cited source document already
> confirms it — nothing about production is assumed.

---

## 1. Purpose

- This document plans a future production deployment; it does **not** execute one. Every action
  in §8 is designed, not performed, in this step.
- Dev Release 1 (`Expense`/`EmployeeAdvance`/`TravelClaim`) and Release 2 (`Payment`/
  `Collection`/`OrderAdvance`/`CrmLead`/`CrmOpportunity`/`SalesFunnel`/the 3 `AMOUNT`-typed
  `KRATemplateItem` rows/the 8 confirmed-money `KRA.target`/`EmployeeTarget.targetJson` entries)
  are complete and independently audited on the dev database (`u686730471_caveodev`) only —
  see §2 for the full summary and source citations.
- Production execution requires its own separate, explicit approval event — moving the §10
  Go/No-Go checklist and the §11 sign-off ledger from **Pending** to **Approved** — which this
  document does not grant. Writing this plan is not that approval.
- **No production data is changed by this step.** No production `DATABASE_URL` was connected to,
  no production table was read, and no production code was deployed.

---

## 2. Dev Migration Summary

### Release 1 — `Expense` / `EmployeeAdvance` / `TravelClaim`

- **Migration:** `prisma/migrations/20260622120000_decimal_release1_lakhs_to_inr/migration.sql`
- **Converted domains:** 9 fields — `Expense.amountLakhs`/`gstAmountLakhs`;
  `EmployeeAdvance.amountLakhs`/`disbursedAmountLakhs`/`settledAmountLakhs`/`balanceLakhs`;
  `TravelClaim.amountLakhs`/`amountRupees`/`ratePerKm`. Lakhs-native fields multiplied by
  `100,000`; `amountRupees`/`ratePerKm` type-changed only (already real INR/real ₹-per-km).
  5 API routes and 5 UI files updated in the same release (no half-converted state).
- **Audit status:** ✅ **Closed.** Step 3Q implemented; Step 3R independently re-verified DB
  column types, live API responses, and live UI rendering — 11/11 checks pass, zero blockers.
  Full record: [`DECIMAL_RELEASE1_SIGNOFF_PLAN.md`](DECIMAL_RELEASE1_SIGNOFF_PLAN.md),
  [`DECIMAL_RELEASE1_MIGRATION_RESULTS.md`](DECIMAL_RELEASE1_MIGRATION_RESULTS.md).
- **Production status:** explicitly documented as **NOT migrated** —
  [`docs/DATABASE.md`](../DATABASE.md) line 45: *"Production has NOT been migrated — this
  applies to dev only."*

### Release 2 — `Payment` / `Collection` / `OrderAdvance` / `CrmLead` / `CrmOpportunity` /
`SalesFunnel` / Sales-KRA targets

- **Migration:** `prisma/migrations/20260623060000_decimal_release2_combined_inr_canonical/migration.sql`
- **Converted domains:** 11 schema fields across 6 models (`Payment` ×1, `Collection` ×3,
  `OrderAdvance` ×1, `CrmLead` ×1, `CrmOpportunity` ×3, `SalesFunnel` ×2) converted `Float` →
  `Decimal(18,2)`, plus a row-filtered data-only transform (no column-type change) for the 3
  `AMOUNT`-typed `KRATemplateItem` rows and the 8 confirmed-money `KRA.target`/
  `EmployeeTarget.targetJson` entries. `src/lib/kra-engine.ts` and `src/lib/payments.ts`
  rewritten on `src/lib/money.ts`; ~15 API routes updated; Sales/CRM UI input labels relabelled
  `₹L` → `₹`; dashboards/KRA views/reports/mobile screens keep Lakhs **display only** via
  `inrToLakhsEquivalent()`.
- **Audit status:** ✅ **Closed, no open items.** Step 3U implemented; Step 3V's independent
  post-migration audit found no defects; Step 3V-1 closed the one remaining audit note (a
  `TeamTarget` raw-SQL table-name mismatch in the verification tooling — not a migration defect).
  Full record: [`DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md`](DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md)
  §1–§17, [`DECIMAL_RELEASE2_MIGRATION_RESULTS.md`](DECIMAL_RELEASE2_MIGRATION_RESULTS.md) §1–§4.
- **Production status:** explicitly documented as **NOT migrated** —
  [`docs/DATABASE.md`](../DATABASE.md) line 140: *"Production has NOT been migrated — this
  applies to dev only."*

### Canonical policy (now fully realized in dev)

- All persisted business money values are actual ₹ INR in the dev database — confirmed by both
  releases' independent audits.
- Lakhs survives only as a **display/reporting** unit, applied at the presentation boundary
  (`inrToLakhsEquivalent()`), never as canonical storage, never as an API input/output contract,
  never inside a `kra-engine.ts` comparison.
- **Naming debt carried forward, not resolved by either release:** every converted field still
  carries its legacy `*Lakhs` name (`amountLakhs`, `dealValueLakhs`, `netProfitLakhs`, etc.) even
  though it stores actual INR. Renaming is explicitly out of scope for both dev releases and for
  this production plan (§12).

---

## 3. Production Migration Candidate List

> **Production state is unconfirmed.** The items below are not assumed to be the only pending
> production work — see the finding immediately after the table.

| Migration / Step | Purpose | Required in Production? | Risk Level | Notes |
| ----------------- | ------- | ------------------------ | ---------- | ----- |
| `20260621120000_add_soft_delete_fields_phase_a` | Adds nullable `deletedAt`/`deletedById`/`deleteReason` to Phase A models (additive only, no value transform) | **Needs verification** | Low (additive `ADD COLUMN`, no data rewrite) | Confirm whether this migration — or any migration after the production baseline — has already been applied to production by any path outside this project's documented dev-only workflow |
| `20260622120000_decimal_release1_lakhs_to_inr` | Release 1 Lakhs→INR + Decimal conversion (`Expense`/`EmployeeAdvance`/`TravelClaim`) | **Needs verification** | High (rewrites every existing row's value; `Float`→`Decimal` `ALTER COLUMN` is data-rewriting, not metadata-only) | Confirmed not yet applied to production per `docs/DATABASE.md`; must run only after every earlier pending migration (see Finding 3.1 below) is resolved, in the documented order |
| `20260623060000_decimal_release2_combined_inr_canonical` | Release 2 combined Lakhs→INR + Decimal conversion (`Payment`/`Collection`/`OrderAdvance`/`CrmLead`/`CrmOpportunity`/`SalesFunnel`) + AMOUNT-row/free-text data transform | **Needs verification** | High — same data-rewrite risk as Release 1, plus a row-filtered `UPDATE ... JOIN` and a free-text-parsing transform for `KRA.target`/`EmployeeTarget.targetJson` (higher blast radius than a plain `ALTER COLUMN`) | Confirmed not yet applied to production per `docs/DATABASE.md`; depends on Release 1 having already landed cleanly (Release 1 retires the `payments.ts` round2/epsilon workaround that Release 2 also touches) |
| Seed / permission updates required before Release 1/2 | `prisma/seed-performance-defaults.ts` and the live `KRAMetric`/`KRATemplateItem` AMOUNT-row config fix (Step 3U-5: new `TEAM_PIPELINE_COVERAGE` metric + item #16 re-link) | **Needs verification** | Medium — Release 2's data transform assumes this config fix already exists; running Release 2 SQL against a production DB where item #16 is still mis-linked would either skip it (safe but incomplete) or, if the JOIN-filter logic differs, multiply the wrong row | Confirm production's live `KRAMetric`/`KRATemplateItem` rows match dev's *post*-Step-3U-5 state before adapting Release 2's migration SQL for production — do not assume production has the same config drift dev had, or the same fix |
| Migration-history gap review | Two dev migrations (`20260615000000_add_advance_category`, `20260617100000_employeetarget_relations`) have no row in dev's `_prisma_migrations`, though their schema changes are live | **Required before any production migration** | High (blocking) — running `prisma migrate deploy` against a history with an unreviewed gap risks misapplying or skipping a step | See §5 — must be resolved by comparison, not by blind `migrate resolve` |
| App code deployment (`uat` branch → `master`) | Production runs the `master` branch (per `CLAUDE.md`); all Decimal/INR work, the soft-delete migration, and ~78 other commits exist only on `uat` | **Required** — schema migrations alone are meaningless to production without the matching application code | High — see Finding 3.1 | Production's `master` branch must receive this code before or atomically with any production migration; deploying schema changes without the matching API/UI code (or vice versa) reproduces this project's own "no half-converted state" rule at the deployment level |

### Finding 3.1 — Production is not "two migrations behind," it may be the entire post-baseline history behind

Per `docs/DATABASE.md` §4 (Migration history): *"On production, the `_prisma_migrations` table
was seeded with a baseline row so `prisma migrate deploy` is a no-op against the already-built
DB"* at the 2026-06-02 SQLite→MySQL cutover (`20260601000000_init_mysql`). No subsequent
production migration-deploy event is documented anywhere in `docs/PROJECT_MEMORY.md`,
`docs/RBAC_MIGRATION_TRACKER.md`, or `docs/DATABASE.md`. Read literally, this means **every one
of the 20 migrations after the baseline** — Finance Operations Phase 1, Admin Console, Policy
Engine, Workflow Engine, Master Data, CRM Admin Engine, Performance Management, Communication
Engine, Integration Center, Security Center, the `add_advance_category`/`employeetarget_relations`
gap pair, soft-delete Phase A, and both Decimal releases — may still be unapplied to production,
not just the two named in this step's instructions.

Separately, the repository's `master` branch (the documented production branch) is **78 commits
behind `uat`** (confirmed via `git rev-list --count master..uat` in this step) — every feature
named above exists only on `uat`. This is a **substantially larger production gap than "run two
migrations."** This plan does not expand its own scope to close that gap (Voucher/Ledger
migration and unrelated feature work remain explicitly excluded, §12), but it must be stated
plainly: **assuming production only needs the Decimal Release 1/2 migrations, without first
confirming what production's actual `_prisma_migrations` table and deployed `master` commit
contain, is the single largest risk in this entire plan.** §4 and §9's first checks exist
specifically to close this unknown before any migration is even drafted for production.

A second, smaller discrepancy found in the same review: `scripts/deploy-uat.mjs`'s own comment
says `npm run build` "runs prisma migrate deploy + generate + next build," but the actual
`package.json` `build` script is `prisma generate && cross-env RAYON_NUM_THREADS=1 next build` —
**no `migrate deploy` call**. `db:migrate` (`prisma migrate deploy`) is a separate, manually
invoked script. Whatever deploys to `master`/production today may have the same gap — **confirm
whether the production deployment process ever calls `prisma migrate deploy` at all**, or whether
schema changes there have only ever been applied through the project's documented one-off
guarded-script pattern (consistent with how dev's Decimal releases were applied, per §6 below).

---

## 4. Production Pre-Checks

None of the following has been performed in this step. All are **required before any production
migration SQL is drafted**, not just before it is executed.

- [ ] Confirm production `DATABASE_URL` — host, database name, user — **without ever printing or
      logging the password**. Dev/UAT documentation references several Hostinger DB-name
      candidates (`u686730471_caveo`, `u686730471_caveo_crm`, `u686730471_caveoadmincrm`,
      `u686730471_Caveo_UAT`, `u686730471_caveouat`) but none is confirmed as *the* production
      database in any reviewed document — this must be resolved against the live production
      `.env`/hPanel config, not guessed from prior session notes.
- [ ] Confirm production DB name explicitly matches the value used in every guarded apply
      script's hard-coded refusal check (the same pattern used for `u686730471_caveodev` in dev)
      — a production apply script must refuse any database name that is not the confirmed
      production name.
- [ ] Confirm production app version — the exact deployed Git commit/tag on the `master` branch
      (e.g. `git rev-parse HEAD` run on the server, or read from the Hostinger Passenger app's
      checked-out commit) — and reconcile it against Finding 3.1's 78-commit gap.
- [ ] Confirm current `_prisma_migrations` rows on production — run (read-only) `prisma migrate
      status` against production, or query `_prisma_migrations` directly, to get the actual
      current list, not the single-baseline-row assumption in §4 of `docs/DATABASE.md`.
- [ ] Confirm whether the `add_advance_category`/`employeetarget_relations` migration-history gap
      exists in production the same way it does in dev, or differently (§5).
- [ ] Confirm current column types (via `INFORMATION_SCHEMA.COLUMNS`) for every Release 1/2
      target field, before assuming they are still `Float`/`DOUBLE` as in dev's pre-migration
      state — production's actual current type is unverified.
- [ ] Confirm current value units (Lakhs vs. already-INR) for every Release 1/2 target field on a
      sample of production rows — do not assume production data mirrors dev's pre-migration
      Lakhs-scale profile; production may have different historical data entry conventions.
- [ ] Confirm row counts for every impacted table on production (`Payment`, `Collection`,
      `OrderAdvance`, `CrmLead`, `CrmOpportunity`, `SalesFunnel`, `KRATemplateItem`, `KRA`,
      `EmployeeTarget`, `TeamTarget`, `Expense`, `EmployeeAdvance`, `TravelClaim`) — production
      almost certainly has far more rows than dev's current counts (1/94/0/38/21/100/17/34/34/0/
      2/1/1), which changes the time/lock-duration risk profile of every `ALTER COLUMN`.
- [ ] Confirm no active writes are expected during the migration window — coordinate with
      whoever owns the production write paths (Sales/Collections/Payments/KRA entry), not just a
      technical assumption of low traffic.
- [ ] Confirm a full production backup has completed and been verified restorable (§6) —
      immediately before, not hours/days before, the migration window.
- [ ] Confirm the rollback approach (§6) is explicitly approved by the business and technical
      owners (§11) before the maintenance window opens, not improvised during it.

---

## 5. Migration-History Gap Review

Two migrations were found, during the dev-only Step 3R post-migration audit, to have no row in
dev's `_prisma_migrations` table even though their schema changes are clearly live in
`prisma/schema.prisma` and the dev DB:

- `20260615000000_add_advance_category`
- `20260617100000_employeetarget_relations`

This predates both Decimal releases, is not introduced by Release 1 or Release 2, and **must be
reviewed in production before any production migration runs** — including, per Finding 3.1,
before any of the other 18 migrations between the baseline and Release 1 are assumed safe to
`migrate deploy` in one pass. **Do not blindly resolve these as "applied"** — `prisma migrate
resolve --applied` only edits Prisma's bookkeeping table; it does not verify the corresponding
`ALTER TABLE`/`CREATE TABLE` statements were actually run against the target database. The
correct sequence is always: compare the live production schema (via
`prisma migrate diff --from-url <production-url> --to-schema-datamodel prisma/schema.prisma
--script`, read-only) against each candidate migration's `migration.sql`, confirm the columns/
tables already exist with the expected shape, and only then resolve the bookkeeping row — never
the reverse.

| Migration | Dev Status | Production Status | Action Required |
| --------- | ---------- | ------------------ | ----------------- |
| `20260601000000_init_mysql` | Applied (baseline) | Needs verification — documented as seeded as a no-op baseline row at the SQLite→MySQL cutover (`docs/DATABASE.md` §4); never reconfirmed since | Confirm the baseline row's `finished_at`/`rolled_back_at` state and that the live production schema actually matches this migration's expected shape |
| `20260602120000_finance_operations_phase1` | Applied | Needs verification | Diff production schema against this migration's SQL before assuming applied |
| `20260604000000_admin_console_foundation` | Applied | Needs verification | Same |
| `20260604120000_policy_engine_foundation` | Applied | Needs verification | Same |
| `20260604180000_workflow_engine` | Applied | Needs verification | Same |
| `20260604220000_master_data_management` | Applied | Needs verification | Same |
| `20260605000000_opportunity_discount_pct` | Applied | Needs verification | Same |
| `20260605010000_crm_admin_engine` | Applied | Needs verification | Same |
| `20260605020000_opportunity_won_fields` | Applied | Needs verification | Same |
| `20260605030000_legacy_promote_and_net_profit` | Applied | Needs verification | Same |
| `20260605050000_finance_admin_engine` | Applied | Needs verification | Same |
| `20260609060000_performance_management_engine` | Applied | Needs verification | Same |
| `20260609070000_communication_engine` | Applied | Needs verification | Same |
| `20260610080000_integration_center` | Applied (dev notes flag this as "uncommitted to git" at the time it was applied — confirm it is committed now) | Needs verification | Confirm the migration directory is committed to the branch production will deploy from, in addition to confirming it ran against production |
| `20260610090000_security_center` | Applied (same "uncommitted to git" caveat as above) | Needs verification | Same |
| `20260615000000_add_advance_category` | **Schema live, but missing from `_prisma_migrations`** (the documented gap) | Needs verification | Compare live schema vs. `migration.sql` before resolving either bookkeeping row |
| `20260617100000_employeetarget_relations` | **Schema live, but missing from `_prisma_migrations`** (the documented gap) | Needs verification | Same |
| `20260618000000_master_data_linkage` | Applied | Needs verification | Diff before assuming applied |
| `20260618100000_crm_lead_customer_ref` | Applied | Needs verification | Same |
| `20260621120000_add_soft_delete_fields_phase_a` | Applied | Needs verification | Same |
| `20260622120000_decimal_release1_lakhs_to_inr` | Applied, audited, no open issues (§2) | **Not migrated** (`docs/DATABASE.md` confirms) | Run only after every earlier migration above is confirmed applied/resolved correctly |
| `20260623060000_decimal_release2_combined_inr_canonical` | Applied, audited, no open issues (§2) | **Not migrated** (`docs/DATABASE.md` confirms) | Run only after Release 1 lands cleanly in production |

---

## 6. Backup And Rollback Plan

- **Full production DB backup is mandatory before any production migration runs** — a full
  logical dump (e.g. `mysqldump` with `--single-transaction`) of the entire production database,
  not just the tables Release 1/2 touch. Schema-drift discoveries during §4/§5's pre-checks may
  reveal that more tables are at risk than this plan currently anticipates.
- **The backup must be verified restorable** before the migration window opens — restore it to a
  scratch/throwaway database and run a row-count + spot-value sanity check against the original,
  not just confirm the dump file is non-empty.
- **Record, for every backup taken:**
  - Backup filename/location (e.g. exact path on the Hostinger file manager or wherever the
    dump is stored — to be filled in at execution time, not invented here)
  - Backup timestamp (UTC and IST)
  - Responsible person (name + role)
  - Verification result (restored successfully / row counts matched: yes/no)
- **MySQL DDL is not fully transactional.** An `ALTER TABLE ... MODIFY COLUMN` that fails partway
  (e.g. due to a lock timeout, an out-of-range value MySQL can't coerce, or a connection drop) can
  leave the table in a state that is neither the old schema nor the new one. There is no `ROLLBACK`
  safety net for this the way there is for a multi-statement `UPDATE` inside an explicit
  transaction.
- **Rollback, if needed, is a restore from the verified backup — not a hand-written reverse
  migration.** Do not attempt to "undo" a partially-applied `× 100,000` transform by guessing a
  `÷ 100,000` correction on data that may already be a mix of converted and unconverted rows —
  this is the same caution the dev Release 1 plan already documented (§10 of
  `DECIMAL_RELEASE1_SIGNOFF_PLAN.md`) and applies with higher stakes against live business data.
- **No partial manual reverse is permitted unless separately, explicitly approved** at the time
  it would actually be needed — this mirrors the standing "no emergency bridge without separate
  written approval" rule already locked for the KRA engine boundary decision
  (`DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md` §6).
- **App rollback version must be tagged before deployment.** Before deploying any new code to
  `master`/production, tag the current production commit (e.g. `git tag pre-decimal-migration-
  prod` on the commit currently live) so a code rollback has an unambiguous target — this is
  necessary regardless of which subset of the 78-commit gap (Finding 3.1) is actually deployed.

---

## 7. Maintenance Window Plan

- **Recommended maintenance window:** outside Caveo's business hours (IST), long enough to cover
  backup verification + migration + smoke tests + a buffer for the unknowns flagged in §3/§4/§5 —
  the exact duration cannot be responsibly estimated until production row counts (§4) are known;
  a single-row dev migration completing in seconds does not predict a multi-thousand-row
  production `ALTER COLUMN`'s duration.
- **Freeze user writes during migration** — Sales/CRM data entry (leads, opportunities, funnel,
  collections, payments) and KRA target edits must pause for the duration of the migration. The
  app does not currently have a documented maintenance-mode toggle — confirm whether one exists
  (e.g. a feature flag, a Passenger-level maintenance page) or whether write-freeze must be
  communicated/enforced manually (e.g. asking all users to log out, or temporarily restricting
  the affected API routes).
- **Notify users/admins** in advance of the exact window, and again immediately before it starts
  and after it ends.
- **Stop cron/background jobs if any** touch the affected tables (e.g. any scheduled KRA-sync or
  notification job) — confirm whether any exist in production before the window; the dev
  environment does not appear to run any (`docs/PROJECT_MEMORY.md`/`docs/DATABASE.md` review found
  no scheduled-job infrastructure beyond what's documented for the `scheduled-tasks` tooling
  outside this repo).
- **Disable relevant write paths if practical** — at minimum, the Payment/Collection recording
  flow and the KRA Template admin edit flow, since these are the highest-risk write surfaces for
  the fields being converted.
- **Keep app deployment and DB migration in one controlled window** — per the No-Half-Converted-
  State Rule already established for both dev releases (`DECIMAL_RELEASE1_SIGNOFF_PLAN.md` §4),
  production must never run the new schema against old API/UI code, or vice versa, even
  momentarily.

---

## 8. Production Execution Sequence

**Designed only — not executed in this step.**

1. Confirm production DB and the exact `master` branch commit/tag currently deployed (§4).
2. Put the app in maintenance/write-freeze mode (§7) — confirm the mechanism exists before
   relying on it.
3. Take a full production DB backup.
4. Verify the backup is restorable (§6).
5. Capture a pre-migration snapshot for every impacted field, on production, mirroring the dev
   Release 1 (`DECIMAL_RELEASE1_MIGRATION_RESULTS.md` §3) and Release 2
   (`DECIMAL_RELEASE2_MIGRATION_RESULTS.md` §1) snapshot pattern — including representative KRA
   score/achievement baselines for the post-migration drift check.
6. Check `_prisma_migrations` and schema drift against every migration since the baseline (§5) —
   not just the two Decimal releases — and resolve any gap by comparison, never by blind
   `migrate resolve`.
7. Apply every required migration in order, via reviewed SQL (no `db push`), using the same
   guarded one-off-script pattern already proven in dev (hard-coded production-DB-name refusal
   check, no destructive statements, manual review of every generated `ALTER`/`UPDATE` before
   running it).
8. Run `npx prisma generate` for the production build.
9. Deploy the application code that matches the now-migrated schema — this must be the `master`
   commit that actually contains the Release 1/2 code (per Finding 3.1, confirm this commit
   exists on `master`, or merge/cherry-pick it there as its own explicitly-approved step before
   this sequence begins; this plan does not authorize that merge).
10. Run post-migration DB verification (§9) against production.
11. Run API smoke tests (§9) against production.
12. Run UI smoke tests (§9) against production.
13. Remove maintenance mode.
14. Monitor logs and user flows for an extended period (recommend at least the remainder of the
    business day) after reopening — Decimal-precision and KRA-scoring drift may only surface
    once real users resume normal data entry.
15. Record sign-off (§10/§11) — owners confirm completion and any deviations from this plan.

---

## 9. Production Verification Plan

| Area | Verification |
| ---- | ------------- |
| Release 1 fields (`Expense`/`EmployeeAdvance`/`TravelClaim`, 9 fields) | Per-row `new value === old value × 100,000` (or unchanged for `amountRupees`/`ratePerKm`), exact — mirrors `DECIMAL_RELEASE1_MIGRATION_RESULTS.md` §4's verification table, re-run against production row counts |
| Release 2 — 11 Decimal schema fields (`Payment`, `Collection`×3, `OrderAdvance`, `CrmLead`, `CrmOpportunity`×3, `SalesFunnel`×2) | Per-row `new value === old value × 100,000`, exact — mirrors `DECIMAL_RELEASE2_MIGRATION_RESULTS.md` §2.1, re-run against production data |
| `KRATemplateItem` AMOUNT rows | Every row whose linked `KRAMetric.metricType = 'AMOUNT'` multiplied by 100,000; every non-`AMOUNT` row's `minimumTarget`/`expectedTarget`/`stretchTarget` unchanged — confirm via the same `metric.metricType <> 'AMOUNT'` oversize-check query used in dev (Step 3V-1) |
| `KRA.target` confirmed-money entries | Only the confirmed money KPI labels (per `DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md` §12.2's 6-label set) multiplied; every other label in the same free-text string byte-identical — **production's `KRA.target` rows must be re-scanned from scratch, not assumed to match dev's 34-row/8-row-with-money profile** |
| `EmployeeTarget.targetJson` confirmed-money entries | Same check as `KRA.target`, against production's actual `EmployeeTarget` rows — do not assume production's `targetJson` content matches dev's free-text format without confirming first (dev's own discovery that `targetJson` is free text, not real JSON, was a surprise finding in Step 3U-2 and may or may not hold for production) |
| Non-money KRA rows unchanged | Every `PERCENTAGE`/`COUNT`-typed `KRATemplateItem` row's targets, and every non-money KPI label inside `KRA.target`/`targetJson`, byte-identical before/after |
| Dashboards display Lakhs | Sales dashboard, KRA views, and report surfaces still render `₹X.XXL`-style figures post-migration — confirm via live browser check against production, not just a code-path read |
| Input forms show INR | Lead/Opportunity/Sales-Funnel/Payment/Collection/KRA-AMOUNT-target input forms show `₹`/`INR` labels, not `₹L`, in the production UI |
| APIs do not leak Decimal objects | Every Release 1/2 API route response is sampled (authenticated) and confirmed to return string/number values, never a raw Prisma `Decimal` object or its `toJSON()` artifact |
| KRA score sanity check | Re-derive the same aggregate functions used in dev's Section 1.8/2.2 baseline (`closedWonBooking`, `totalCollectionsWithoutGst`, `totalGrossProfit`, `teamBooking`, `teamBilling`) for a representative sample of real production employees, before and after migration — must match within floating-point noise, exactly as dev's audit required |
| Payment/Collection sanity check | Spot-check several real production `Payment`/`Collection` rows' before/after values against the live invoice/payment records they represent (not just internal consistency) — production has real transactional history dev's 1-row/94-row dataset does not |
| Lead/Opportunity/Funnel sanity check | Spot-check several real production `CrmLead`/`CrmOpportunity`/`SalesFunnel` rows against known deal sizes a sales manager can independently confirm — a magnitude error here would be business-visible immediately (e.g. a ₹5L deal showing as ₹500L) |

---

## 10. Go / No-Go Checklist

| Check | Owner | Status |
| ----- | ----- | ------ |
| Business owner sign-off | Business owner (to be named) | Pending |
| Technical owner sign-off | Technical owner (to be named) | Pending |
| Backup verified restorable | Technical owner / DBA (to be named) | Pending |
| Migration-history gap reviewed against production (§5) | Technical owner (to be named) | Pending |
| Dev audit reviewed (Release 1 §2 + Release 2 §2, both closed) | Technical owner (to be named) | Pending |
| Production pre-checks complete (§4) | Technical owner (to be named) | Pending |
| Maintenance window approved | Business owner (to be named) | Pending |
| Rollback plan approved | Business owner + Technical owner (to be named) | Pending |
| Post-deployment verification owner assigned (§9) | Technical owner (to be named) | Pending |

---

## 11. Production Sign-Off Ledger

| Decision | Required Owner | Status |
| -------- | ---------------- | ------ |
| Approve production DB migration (Release 1 + Release 2, in order) | Business owner + Technical owner | Pending |
| Approve app deployment (the `master`-branch commit matching the migrated schema) | Technical owner | Pending |
| Approve downtime / write freeze for the maintenance window | Business owner | Pending |
| Approve rollback plan (full-backup restore; no improvised partial reverse) | Business owner + Technical owner | Pending |
| Approve legacy `*Lakhs` naming debt carry-forward into production (no rename in this release) | Technical owner | Pending |
| Approve no Voucher/Ledger/FinAccount migration in this release | Technical owner | Pending |
| Approve post-deployment monitoring plan and owner | Technical owner | Pending |

---

## 12. Explicit Exclusions

This production deployment plan does **not** include:

- Voucher Decimal migration
- Ledger Decimal migration
- FinAccount migration
- New Finance write APIs
- Field renaming from `*Lakhs` to `*Inr` (or any other name)
- Production execution of any kind
- `db push` at any stage, dev or production

---

## 13. Final Recommendation

- **Do not run any production migration until this sign-off plan is approved** — specifically
  until §10's Go/No-Go checklist and §11's sign-off ledger move from Pending to Approved for
  every row.
- **The next step after this document is a production pre-check dry run** — executing §4's
  checklist (read-only: confirm DB name/version, query `_prisma_migrations`, sample column types
  and row counts) without applying any change, to replace every "Needs verification" in this
  document with a confirmed fact.
- **Production execution must be its own explicit, separately-approved step** — this document is
  the plan, not the authorization, and per Finding 3.1, the real scope of "getting production
  current" is very likely larger than the two Decimal migrations named in this step's
  instructions. That larger scope should be sized and reviewed before committing to a single
  maintenance window.
