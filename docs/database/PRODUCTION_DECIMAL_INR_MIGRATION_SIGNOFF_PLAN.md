# Production Decimal / INR Migration Sign-Off Plan

> **Production Deferral Decision (2026-06-24) — reaffirmed, stricter gate.** Production is
> paused until UAT gaps are closed and final UAT testing/sign-off is completed. Production
> planning will resume only on explicit instruction from Vijesh. This document remains a
> planning artifact only — nothing in it is executed, and nothing in it is to be acted on until
> the deferral lifts. **Remaining UAT closure items, all of which must close first:**
> - **FT-3** — UAT deployed commit/version confirmation
> - **FT-1** — `kra-engine.ts` hardcoded Lakhs-scale fallback constants
> - **FT-2b** — Microsoft Entra ID OAuth login end-to-end confirmation
> - **FT-4** — UAT backup restore-test
> - **FT-5** — Sales Funnel (legacy) + OrderAdvance click-through testing
>
> No production pre-check, no production migration execution preparation, and no
> production-related command has been run as part of recording this decision.
>
> **FT-3 re-attempted (2026-06-24), result: still Open — production remains paused.** Neither
> Hostinger/deploy access nor a public version marker was available to confirm the deployed UAT
> commit (see `UAT_DECIMAL_INR_MIGRATION_PLAN.md` → "FT-3 UAT deployed commit verification" for
> the full attempt). This does not change anything in this document — production planning stays
> paused until all five items above are closed.
>
> **Step 4H-4 (2026-06-24): FT-3 verification capability added, still Open, production still
> paused.** A public `/api/version` endpoint + `npm run uat:check-version` script were added
> (see `UAT_DECIMAL_INR_MIGRATION_PLAN.md` → "Step 4H-4") so the deployed-commit question can be
> answered definitively once UAT is redeployed. No deployment was performed and no production
> action was taken — this document remains paused, unchanged.
>
> **Step 4H-5 (2026-06-24): FT-3 Closed — production still paused.** Live UAT now confirms the
> deployed commit matches the signed-off `uat` HEAD (`b7062f3`) — see
> `UAT_DECIMAL_INR_MIGRATION_PLAN.md` → "Step 4H-5". FT-3 closing does **not** lift this
> document's deferral: the other four UAT closure items (FT-1, FT-2b, FT-4, FT-5) are still
> open, so **production remains paused**, unchanged, until all close and Vijesh gives explicit
> instruction to resume. No production action was taken.
>
> **Step 4H-6 (2026-06-25): FT-1 closed, FT-5/FT-2b/FT-4 still Open — production still paused.**
> FT-1 (`kra-engine.ts` fallback constants) was fixed with a real code change (a genuine
> ~100,000× unit-mismatch bug, not just a documentation gap) — see
> `UAT_DECIMAL_INR_MIGRATION_PLAN.md` → "Step 4H-6". FT-5 and FT-2b are blocked by an org
> browser policy (plus a UAT DB IP-whitelist gap for FT-5, and the standing human-OAuth-
> credential requirement for FT-2b); FT-4 is blocked by missing restore tooling. **Production
> remains paused** — three of five items are still open, and nothing here changes until all
> five close and Vijesh gives explicit instruction to resume.
>
> **Step 3Z (2026-06-23) — DEPLOYMENT STRATEGY CHANGED. PRODUCTION MIGRATION IS DEFERRED.**
> The business decision is now: dev → **UAT** → UAT sign-off → production planning → production
> migration only after approval. **Production migration is paused** — it does not proceed
> directly from this document anymore. The next active deployment target is **UAT**, planned in
> `docs/database/UAT_DECIMAL_INR_MIGRATION_PLAN.md`. Production planning in this document remains
> useful background and will resume only after UAT validation and business sign-off — nothing in
> it is withdrawn, it is simply not the next step. Every section below (§3–§13, and the Pre-Check
> Dry Run Results / Human-Run Pre-Check Pack sections) is otherwise unchanged from Steps 3W–3Y.
>
> **Step 3W (2026-06-23).** This is a **planning, risk-review, and sign-off documentation
> artifact only**. No production database was queried, no production migration was run, no
> Prisma schema was modified, no migration was created, no API/UI code was changed, no business
> data was updated, and `db push` was not used anywhere in this step. Every production-state
> claim below is explicitly marked **Needs verification** unless a cited source document already
> confirms it — nothing about production is assumed.
>
> **Step 3X (2026-06-23) — read-only pre-check dry run attempted.** Converted what could safely
> be confirmed (branch/commit/migration-folder gap, via git history only) into facts; the
> production-database-dependent checks (DB identity, `_prisma_migrations`, schema, row counts,
> unit sampling, KRA/Sales target classification) were **blocked** — no confirmed, safely-usable
> production database credential was available in that session. See "Production Pre-Check Dry
> Run Results" near the end of this document for the full attempt and the specific blocker. No
> production database was queried, no migration was run or resolved, no app code was deployed.

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
> production work — see the finding immediately after the table. **Step 3X update (2026-06-23):**
> the dry run attempted to confirm production's actual state and was **blocked** — no safely
> usable production database credential was available in that session. Every "Needs
> verification" row in this table remains exactly that; see "Production Pre-Check Dry Run
> Results" below for the full attempt, the specific blocker, and what *could* be confirmed
> read-only from git history alone (the `master`/`uat` branch and migration-folder gap).

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

> **Superseded by Step 3Z's deployment-strategy change (see the banner at the top of this
> document).** Production migration is now paused pending UAT validation — the bullets below are
> retained as the original recommendation and remain valid for whenever production planning
> resumes, but they are not the *next* step right now. The next step is UAT execution, per
> `docs/database/UAT_DECIMAL_INR_MIGRATION_PLAN.md`.

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

---

## Production Pre-Check Dry Run Results (Step 3X, 2026-06-23)

> **Read-only fact-finding only.** No production database was modified, no migration was run or
> resolved, no `db push` was used, no app code was deployed, no Prisma schema was changed. This
> section converts §4's "Needs verification" checklist items into facts **where they could safely
> be confirmed**, and explicitly documents a hard blocker where they could not.

### Blocker — Production database is not reachable from this environment

**Tasks 2–7 (production DB identity, `_prisma_migrations`, schema snapshot, row counts, unit
sampling, KRA/Sales target classification) could not be performed.** This local dev environment
has no confirmed, safely-usable production database credential:

- The active `.env` (`DATABASE_URL`, loaded by every local script and `npm run dev`/`build`) is
  confirmed pointed at the **dev** database, `u686730471_caveodev` — not production.
- A local `.env.hostinger` file exists and contains a populated `DATABASE_URL` value, but **no
  document in this repository identifies it as the live production configuration** — it is not
  referenced by `package.json`, any deploy script, or any doc reviewed in this step. Per
  `CLAUDE.md`'s own documented deployment model, the *actual* production environment file lives
  only on the remote Hostinger server filesystem (`…/public_html/.builds/config/.env`), not in
  this local repository — so `.env.hostinger`'s scope and currency cannot be confirmed locally,
  and connecting to whatever host/database it resolves to without that confirmation would risk
  querying the wrong system, or a stale/decommissioned one, under the banner of "production."
- No SSH credential (`HOSTINGER_SSH_PASSWORD`, used by `scripts/deploy-uat.mjs`'s connection
  pattern) is set in this session's environment, so even an indirect, script-mediated read against
  the server's real `.env` is not available either.
- Per this step's own explicit instruction ("If production DB cannot be safely reached, stop and
  document the blocker" / "Do not print full DATABASE_URL or password"), this dry run **stops
  here for every DB-dependent task** rather than guessing at, or attempting a connection through,
  an unconfirmed credential.

**Tasks 2–7 below are recorded as still "Needs verification," with this specific reason, not
silently skipped.**

### Task 1 — Environment confirmation (completed)

| Check | Result |
| ----- | ------ |
| Current local branch | `uat` |
| Current commit hash | `76159d7bd87d85183948fb622aaf0c9235609117` |
| Production branch name | `master` (per `CLAUDE.md`: *"Production: https://sales.caveoinfosystems.com"*, branch `master`) |
| UAT branch name | `uat` (deploys to `https://uat.caveoinfosystems.com` via `scripts/deploy-uat.mjs`) |
| `master..uat` commit gap | **79 commits** (re-confirmed this step via `git rev-list --count master..uat`; was 78 at Step 3W, now 79 after the Step 3W commit itself landed on `uat`) |
| `uat..master` commit gap | **0** — `master` has no commit that isn't already an ancestor on `uat`; the relationship is a clean, one-directional fast-forward gap, not a diverged history |
| Local working tree | Clean (`git status --short` empty) before this step began |

No branch was checked out or merged — all comparisons used read-only `git rev-parse`/
`git rev-list`/`git ls-tree`/`git diff --stat` against the existing local refs.

### Task 2 — Production DB identity: **Needs verification — blocked**

| Check | Result |
| ----- | ------ |
| Production DB host | Needs verification — blocked, no confirmed credential (see Blocker above) |
| Production DB name | Needs verification — blocked |
| Connection user | Needs verification — blocked |
| Current database selected (`SELECT DATABASE()`) | Needs verification — blocked, no query attempted |
| MySQL version | Needs verification — blocked |
| Read-only test successful | **No** — connection was not attempted, by design, given the unconfirmed-credential blocker |

### Task 3 — Production `_prisma_migrations`: **Needs verification — blocked**

No query was run. Cannot be populated without a confirmed production DB connection.

| Migration | Started At | Finished At | Rolled Back? | Status |
| --------- | ---------- | ------------ | -------------- | ------ |
| *(all 23 local migration folders)* | Needs verification | Needs verification | Needs verification | Needs verification — blocked |

| Local Migration Folder | Present In Production? | Production Status | Notes |
| ----------------------- | -------------------------- | -------------------- | ----- |
| *(all 23 local migration folders, `20260601000000_init_mysql` through `20260623060000_decimal_release2_combined_inr_canonical`)* | Needs verification | Needs verification | Cannot compare against a live production `_prisma_migrations` table without a confirmed connection — `docs/DATABASE.md`'s "single baseline row" claim (Step 3W) remains **unconfirmed by direct query**, not newly verified this step |

### Task 4 — Production schema snapshot: **Needs verification — blocked**

No `INFORMATION_SCHEMA.COLUMNS` query was run against production. Every Release 1/2 field's
production column type — `Expense.amountLakhs`/`gstAmountLakhs`;
`EmployeeAdvance.amountLakhs`/`disbursedAmountLakhs`/`settledAmountLakhs`/`balanceLakhs`;
`TravelClaim.amountLakhs`/`amountRupees`/`ratePerKm`; `Payment.amountLakhs`;
`Collection.invoiceValueLakhs`/`amountWithoutGstLakhs`/`amountReceivedLakhs`;
`OrderAdvance.amountLakhs`; `CrmLead.expectedValue`; `CrmOpportunity.value`/`dealValueExTax`/
`netProfitLakhs`; `SalesFunnel.dealValueLakhs`/`billingValueLakhs`;
`KRATemplateItem.expectedTarget`/`stretchTarget`/`minimumTarget`; `KRA.target`;
`EmployeeTarget.targetJson`; `TeamTarget`/`team_target` — remains **Needs verification**.

The one fact available **without** a production DB connection: on the `master` branch's checked-
in `prisma/schema.prisma` (the schema that should correspond to whatever code is actually
deployed to production, if production runs `master` unmodified), every one of these fields is
still typed `Float`/`Float?` — confirmed via `git show master:prisma/schema.prisma | grep
amountLakhs` in this step. **This is evidence about the application's source code on `master`,
not a verified fact about the live production database schema** — production's actual live
column types could differ from `master`'s schema file if any out-of-band `ALTER TABLE` was ever
run directly against production outside the Prisma migration workflow (a scenario this plan
cannot rule out without the blocked query).

### Task 5 — Production row counts: **Needs verification — blocked**

No count query was run. Production almost certainly has more rows than dev's current counts
(`Payment` 1, `Collection` 94, `OrderAdvance` 0, `CrmLead` 38, `CrmOpportunity` 21, `SalesFunnel`
100, `KRATemplateItem` 17, `KRA` 34, `EmployeeTarget` 34, `TeamTarget` 0, `Expense` 2,
`EmployeeAdvance` 1, `TravelClaim` 1, `Voucher` 0, `Ledger` 0, `FinAccount` 2 — dev's actual
counts, not a production estimate) given production is the live, multi-month-operating system the
dev DB only approximates with smoke/sample data. No number in this row should be assumed to
transfer from dev to production.

### Task 6 — Production unit sampling: **Needs verification — blocked**

No sample query was run. Whether production's money fields currently store ₹ Lakhs or already
something else (production may have accumulated entries under a different convention than dev's
seed/smoke data) is genuinely unknown — this step does not assume production mirrors dev's
pre-migration Lakhs-scale profile, consistent with this task's own explicit instruction.

### Task 7 — KRA / Sales target classification in production: **Needs verification — blocked**

No scan was run. Specifically still unknown:
- Whether production's `KRAMetric` rows use the `AMOUNT`/`PERCENTAGE`/`COUNT` taxonomy dev
  discovered live (Step 3U-2), or the `REVENUE`/`ACTIVITY`/`QUALITY`/`COMPLIANCE` taxonomy from
  `prisma/seed-performance-defaults.ts` that dev found was never actually live.
- Whether a `KRATemplateItem` row equivalent to dev's #16 ("Team Pipeline Coverage") exists in
  production at all, and if so, whether it has the same `targetType`/`metricType` mismatch dev
  found and fixed in Step 3U-5 — or a different mismatch, or none.
- Whether production's `KRA.target`/`EmployeeTarget.targetJson` free-text rows use the same
  6-confirmed-money-label set dev classified in Step 3U-2 §12.2, or different KPI labels entirely
  (production may have evolved its KRA template content independently of dev's seed data over
  time).
- Whether `TeamTarget`/`team_target` has any rows in production (dev's is 0; production's `git
  ls-tree` evidence below confirms the model didn't even exist on `master` until later — see Task
  8 — so this also depends on whether production's database was ever altered to add this table
  out-of-band, since its app code doesn't reference it on `master`).

### Task 8 — Branch / app gap assessment (completed — git-only, no DB access required)

| Area | Finding | Risk | Recommended Action |
| ---- | ------- | ---- | -------------------- |
| `master` commit | `bb556a221ed0b6e92960887343ad754509bd6aab` ("Step 2H: wire Finance Dashboard UI to live read-only API") | — | Confirm this is in fact the commit currently deployed to `https://sales.caveoinfosystems.com` (not yet verified — would require server-side access this step does not have) |
| `uat` commit | `76159d7bd87d85183948fb622aaf0c9235609117` (this session's latest) | — | — |
| Commit gap | 79 commits ahead on `uat`, 0 commits ahead on `master` — a clean one-directional gap, not a diverged history | Low (no merge-conflict risk from divergence) but **High impact** (huge feature/schema gap) | A staged promotion (e.g. `uat` → a release branch → `master`), not a single `git merge`, is recommended given the size of the gap |
| `master`'s checked-in migration folder | 16 entries, ending at `20260610090000_security_center` (confirmed via `git ls-tree master:prisma/migrations`) — does **not** include the `add_advance_category`/`employeetarget_relations` gap pair, `master_data_linkage`, `crm_lead_customer_ref`, `add_soft_delete_fields_phase_a`, or either Decimal release migration | High | Even a "best case" where production has cleanly applied everything in `master`'s own migration folder, it would still be missing 7 migrations relative to `uat` — confirm production's actual applied state (Tasks 2–3, currently blocked) before assuming `master`'s migration folder is itself a safe target |
| `uat`'s checked-in migration folder | 23 entries (7 more than `master`) | — | — |
| `src/lib/money.ts` (the Decimal-safe helper both Decimal releases depend on) | **Does not exist on `master`** (confirmed via `git cat-file -e master:src/lib/money.ts` failing) | High | Deploying the Decimal-migrated schema to production without first deploying this file (and the API/UI code built on it) would immediately break every Payment/Collection/Finance read path — this is the No-Half-Converted-State risk already documented in §4 of the Release 1/2 sign-off plans, now confirmed concretely absent from `master` |
| `prisma/schema.prisma` on `master` vs. `uat` | 105 insertions / 26 deletions of diff (confirmed via `git diff --stat master uat -- prisma/schema.prisma`); every Release 1/2 target field on `master` is still `Float`/`Float?`, not `Decimal` (confirmed via direct `grep` against `master`'s schema file) | High | This is consistent with, but does not by itself prove, "production is still on the pre-Decimal schema" — it proves the **application's source code** matches that expectation; the live database itself remains unconfirmed (Task 4 blocker) |
| Dependency versions (`prisma`, `@prisma/adapter-mariadb`, `next`) on `master` | Identical major/minor versions to the current branch (`^7.8.0`, `^7.8.0`, `16.2.6`) | Low | No framework-version mismatch risk was found — the gap is application code and migrations, not a tooling upgrade also needed |
| Whether direct migration from production's `master` state to current `uat` state is safe in one pass | **Not safe as a single step**, on the evidence gathered | High | A staged plan is recommended: (1) first confirm production's actual `_prisma_migrations`/schema state (Tasks 2–7, still blocked); (2) promote and verify the pre-Decimal `uat` history (everything through `20260618100000_crm_lead_customer_ref`) to `master` first, independently; (3) only then plan the soft-delete + Decimal Release 1 + Decimal Release 2 migrations as their own later, separately-approved production change — bundling all ~7+ pending migrations and 79 commits into one maintenance window is a materially different (and larger) risk than the two-migration scope this plan started from |

### Summary

| Item | Status |
| ---- | ------ |
| DB identity (Task 2) | Needs verification — blocked (no confirmed production credential reachable from this environment) |
| `_prisma_migrations` table (Task 3) | Needs verification — blocked |
| Schema snapshot (Task 4) | Needs verification — blocked for the live DB; `master`'s source-code schema confirmed still pre-Decimal (`Float`, not `Decimal`) |
| Row counts (Task 5) | Needs verification — blocked |
| Unit sampling (Task 6) | Needs verification — blocked |
| KRA/Sales target classification (Task 7) | Needs verification — blocked |
| Branch/app gap (Task 8) | **Confirmed** — 79-commit gap, 7-migration gap, `money.ts` absent from `master`, schema confirmed still `Float` on `master` |

### Blockers

1. **No confirmed, safely-usable production database credential is available in this local
   environment.** Resolving this requires either (a) the actual production `DATABASE_URL` being
   explicitly provided/confirmed by someone with the authority and access to the live Hostinger
   production environment, with the same dev-DB-name-refusal guard pattern this project already
   uses, or (b) running the equivalent read-only queries directly on the production server (e.g.
   via an authenticated SSH session this local environment doesn't have credentials for) and
   reporting the results back into this document.
2. **`.env.hostinger`'s relationship to the live production environment is undocumented.** Before
   it is ever used for anything beyond local reference, someone with direct knowledge of this
   project's Hostinger account should confirm in writing what environment it actually targets.

### Recommended next step

Do not attempt Tasks 2–7 again from this environment without first resolving Blocker 1. The
correct next step is for a human with confirmed production access to either (a) provide a
verified, scoped production read-only credential through a channel that doesn't require pasting
it into this transcript, or (b) run the Task 2–7 queries directly against production themselves
(the exact queries are already specified in §4/§5/§6/§9 of this plan and Tasks 2–7 of the Step
3X instructions) and report the results back for this document to be completed. Task 8's findings
stand on their own and do not need to be re-run.

---

## Human-Run Production Pre-Check Pack (Step 3Y, 2026-06-23)

Step 3Y created a self-contained, read-only pre-check pack for a human/admin with confirmed
production access to run directly — closing the gap Step 3X's automated dry run hit (no
production database credential reachable from this dev environment). **No production database
was queried, no migration was run, no schema/code/data was changed, no `db push` was used to
produce this pack** — every file in it is a static artifact written from this local environment.

**Location:** `docs/database/production-precheck/`

- [`README.md`](production-precheck/README.md) — who should run the pack, where, how to capture
  and sanitize results, and explicit "what not to do" guidance (no pasting credentials into chat,
  no running migrations alongside this check).
- [`production-readonly-precheck.sql`](production-precheck/production-readonly-precheck.sql) — the
  actual SQL: DB identity, `_prisma_migrations` history, `INFORMATION_SCHEMA` column-type checks
  for every Release 1/2 field (using the real `@@map`-resolved physical table names —
  `kra_metric`/`kra_template`/`kra_template_item`/`employee_target`/`team_target` — confirmed
  directly from `prisma/schema.prisma`, not guessed), row counts, min/max/null/negative unit
  sampling, and KRA/Sales target classification (including the `targetType` ≠ `metricType`
  mismatch check that found dev's item #16). Every statement is `SELECT`/`SHOW`/
  `INFORMATION_SCHEMA` — no write statement of any kind appears in the file.
- [`production-precheck-result-template.md`](production-precheck/production-precheck-result-template.md) —
  a clean template mirroring this plan's §3–§9 structure for the human/admin to transcribe
  sanitized findings into (not raw terminal output) before sharing back.
- [`production-precheck-safety-checklist.md`](production-precheck/production-precheck-safety-checklist.md) —
  a before/during/after checklist confirming the SQL file is genuinely write-free, the connecting
  user's permissions, and that no password ever lands in shell history or shared output.
- [`scripts/production-readonly-precheck.mjs`](../../../scripts/production-readonly-precheck.mjs) —
  optional companion script. Refuses to run without
  `CONFIRM_PRODUCTION_READONLY_PRECHECK=YES`; refuses to run against the known dev database name
  (`u686730471_caveodev`) since this script's entire purpose is a production check; never prints
  `DATABASE_URL`, username, or password (only a masked host and the database name); scans every
  query string against a forbidden-keyword regex (`INSERT`/`UPDATE`/`DELETE`/`ALTER`/`DROP`/
  `TRUNCATE`/`CREATE`/`REPLACE`/`RENAME`/`GRANT`/`REVOKE`/`SET FOREIGN_KEY_CHECKS`) both at
  startup and immediately before each execution; writes sanitized-by-construction output to a
  local timestamped Markdown file, never auto-shared anywhere.

**Production DB access is still required from a human/admin to actually run this pack — this
step did not, and could not, run any of it.** No production query was run by this environment at
any point during Step 3Y. The pack must be run, and its results folded into this document's §3–
§9 "Needs verification" rows, **before any production migration SQL is drafted** — this remains
unchanged from §13's Final Recommendation.
