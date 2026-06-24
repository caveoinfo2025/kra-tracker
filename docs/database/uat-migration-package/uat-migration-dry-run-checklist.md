# UAT Migration Dry-Run Checklist

> Run through this checklist, in order, before ever applying
> [`uat-decimal-inr-migration-plan.sql`](uat-decimal-inr-migration-plan.sql) against UAT. Every
> item should be checked off — if any item can't be confirmed, stop and resolve it first. This
> checklist does not authorize running the migration on its own; it is the gate before that
> authorization is sought.

## Environment confirmation

- [ ] **Confirm UAT database name.** `SELECT DATABASE()` returns `u686730471_Caveo_UAT` — not
      dev (`u686730471_caveodev`), not production (`u686730471_caveo_crm`).
- [ ] **Confirm backup exists.** A full UAT database backup has been taken, **and verified
      restorable** (restored to a scratch DB, row counts spot-checked — not just confirmed the
      dump file is non-empty), immediately before this migration window.
- [ ] **Confirm no active UAT testers.** Check with anyone who might currently be using UAT for
      unrelated testing — this migration touches Finance/Sales/KRA tables broadly enough that
      concurrent unrelated testing could produce confusing results during/after the migration.
- [ ] **Confirm write-freeze.** Decide explicitly whether a write freeze is needed on UAT during
      the migration window, and communicate it to anyone with UAT access if so. Record the
      decision either way — don't leave it implicit.

## Pre-migration data capture

- [ ] **Run [`uat-decimal-inr-pre-migration-snapshot.sql`](uat-decimal-inr-pre-migration-snapshot.sql)**
      and save the output somewhere durable (not just terminal scrollback).
- [ ] **Confirm the snapshot's Section 1 migration-name check returns 0 rows** — i.e. none of the
      3 migrations this package applies are already present in `_prisma_migrations`. If any row
      comes back, STOP and investigate before proceeding — something has changed since Step 4B/4D.

## SQL review

- [ ] **Review [`uat-decimal-inr-migration-plan.sql`](uat-decimal-inr-migration-plan.sql) yourself**,
      line by line — do not just trust this checklist or the README.
- [ ] **Confirm the SQL has no destructive statements.** Search it yourself:
      ```bash
      grep -iE "DROP|TRUNCATE|DELETE|GRANT|REVOKE" uat-decimal-inr-migration-plan.sql
      ```
      This should return no matches, or only matches inside a `--` comment line (harmless
      commentary). Read each match yourself to confirm.
- [ ] **Confirm Payment/Collection/OrderAdvance have NO `× 100,000` update.** Search for these 4
      fields and confirm there is no `UPDATE ... SET ... = ... * 100000` statement touching them
      anywhere in the file — only `ALTER TABLE ... MODIFY` statements should reference them.
      ```bash
      grep -A2 "SECTION 3" uat-decimal-inr-migration-plan.sql
      ```
- [ ] **Confirm the Sales Pipeline fields DO have a `× 100,000` update.** `CrmLead.expectedValue`,
      `CrmOpportunity.value`/`dealValueExTax`/`netProfitLakhs`, `SalesFunnel.dealValueLakhs`/
      `billingValueLakhs` should each have a corresponding `UPDATE` statement before their
      `ALTER TABLE` statement.
- [ ] **Confirm `KRA.target` is NOT touched by inline SQL in this file.** The migration plan SQL
      intentionally has no `UPDATE` statement against the `KRA` table — that transform is handled
      separately by [`scripts/uat-transform-kra-target.mjs`](scripts/uat-transform-kra-target.mjs).
      Confirm that script's `MONEY_LABELS` array matches the 6 UAT-confirmed labels exactly (see
      `docs/database/UAT_DECIMAL_INR_MIGRATION_ADJUSTMENT_PLAN.md` §7) before it is ever run.
- [ ] **Confirm `kra_template_item`/`employee_target`/`team_target` are not referenced with any
      write statement** — Section 6 of the plan SQL should contain comments only, no `UPDATE`/
      `ALTER` against these tables.
- [ ] **Confirm no production database reference appears anywhere** in any file in this package.
- [ ] **Confirm no `db push` instruction appears anywhere** in any file in this package or in any
      instructions you've been given alongside it.
- [ ] **Confirm Voucher/Ledger/FinAccount are not referenced anywhere** in this package — this
      migration is explicitly scoped to Release 1 + Release 2 + the soft-delete Phase A fields
      only.

## Execution readiness (informational — confirm before actually running, not part of this step)

- [ ] **Confirm migration is not run yet.** As of this checklist's creation (Step 4E,
      2026-06-24), this package has been generated and reviewed only — no statement in
      `uat-decimal-inr-migration-plan.sql` has been executed against UAT.
- [ ] **Confirm rollback approach.** The rollback plan for this migration is: restore the
      pre-migration backup confirmed above. There is no in-place "undo" SQL for this migration
      (the type changes and value transforms are not trivially reversible in a single statement) —
      backup restoration is the only supported rollback path. Confirm the restore procedure and
      who is authorized to run it before proceeding.
- [ ] **Confirm test users and test cases.** At least one Manager-tier and one Employee-tier UAT
      login should be confirmed working, and the test plan in
      `docs/database/UAT_DECIMAL_INR_MIGRATION_PLAN.md` §5 should be ready to execute immediately
      after migration (Finance/Sales/KRA/Technical test areas).
- [ ] **Confirm `prisma migrate resolve --applied <name>` is run 3 times after the SQL succeeds**
      — once for each of `20260621120000_add_soft_delete_fields_phase_a`,
      `20260622120000_decimal_release1_lakhs_to_inr`,
      `20260623060000_decimal_release2_combined_inr_canonical` — followed by `prisma generate`
      and a dev-server/app restart, per this project's established Hostinger no-shadow-DB
      workflow. This is a manual step, not part of the SQL file itself.
- [ ] **Run [`uat-decimal-inr-post-migration-verification.sql`](uat-decimal-inr-post-migration-verification.sql)**
      after applying the migration and after the 3 `migrate resolve` calls, and compare every
      section's output against the pre-migration snapshot per the inline expectations documented
      in that file.

**Do not check off "execution readiness" items as a substitute for actually running the
migration carefully when that step is explicitly instructed — this checklist documents what
"ready" looks like, it does not grant permission on its own.**
