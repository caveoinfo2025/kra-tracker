# UAT Decimal / INR Migration Package

> **Step 4E (2026-06-24).** This entire package was generated from this local dev environment.
> **No UAT database was connected to, queried, or modified to produce it.** Nothing in this
> folder has been executed. It is the output of the classification work completed in Steps
> 4B–4D (`docs/database/UAT_DECIMAL_INR_MIGRATION_ADJUSTMENT_PLAN.md`), packaged into
> ready-to-review SQL and scripts for whoever runs the actual UAT migration later.

## Purpose

Dev's Decimal/INR migration (Release 1 + Release 2) cannot be applied to UAT by simply
re-running dev's migration SQL — UAT's data doesn't uniformly match dev's "everything is ₹
Lakhs" pre-migration assumption (see `docs/database/UAT_DECIMAL_INR_MIGRATION_ADJUSTMENT_PLAN.md`
for the full classification). This package is the UAT-specific equivalent: the same schema
changes, but with per-field transform decisions substituted for dev's blanket "multiply
everything by 100,000."

## Files in this package

| File | Purpose |
| ---- | ------- |
| [`uat-decimal-inr-migration-plan.sql`](uat-decimal-inr-migration-plan.sql) | The actual migration SQL — soft-delete fields, Release 1 type conversion, Release 2 type conversion with UAT-specific value-transform decisions. **Not yet run against UAT.** |
| [`uat-decimal-inr-pre-migration-snapshot.sql`](uat-decimal-inr-pre-migration-snapshot.sql) | Read-only SQL to capture UAT's state immediately before applying the migration plan — row counts, column types, full data dumps for every in-scope field, checksums. |
| [`uat-decimal-inr-post-migration-verification.sql`](uat-decimal-inr-post-migration-verification.sql) | Read-only SQL to verify the migration applied correctly — confirms Payment/Collection/OrderAdvance were NOT multiplied, confirms CrmLead/CrmOpportunity/SalesFunnel WERE multiplied by exactly 100,000, confirms KRA.target's money labels changed and non-money labels didn't, confirms soft-delete fields exist, confirms migrations are recorded. |
| [`uat-migration-dry-run-checklist.md`](uat-migration-dry-run-checklist.md) | The gate to run through before ever applying the migration plan SQL — environment confirmation, SQL review, execution readiness. |
| [`scripts/apply-uat-decimal-inr-migration.mjs`](scripts/apply-uat-decimal-inr-migration.mjs) | Optional guarded script that would apply the migration plan SQL via the `mariadb` driver. **Refuses to run without `CONFIRM_UAT_DECIMAL_INR_MIGRATION=YES`, refuses any DB except `u686730471_Caveo_UAT`, never prints credentials. Not run in this step — it exits early by design, before reaching its execution path.** |
| [`scripts/uat-transform-kra-target.mjs`](scripts/uat-transform-kra-target.mjs) | Optional guarded script that would apply the `KRA.target` free-text money-label transform (NOT included as inline SQL — see that file's header comment for why). Same safety guards as the apply script above. **Not run in this step.** |

## UAT-specific unit decisions (summary — full detail in the adjustment plan)

| Domain | Fields | Action |
| ------ | ------ | ------ |
| Release 1 | `Expense`/`EmployeeAdvance`/`TravelClaim` money fields | Type conversion + multiply by 100,000 (currently 0 rows on UAT, so multiply is a no-op today, included for consistency in case rows appear before migration) |
| Release 2 — already INR | `Payment.amountLakhs`, `Collection.invoiceValueLakhs`/`amountWithoutGstLakhs`/`amountReceivedLakhs`, `OrderAdvance.amountLakhs` | **Type conversion only — no multiply** (business-confirmed already actual ₹ INR on UAT) |
| Release 2 — Lakhs-scale | `CrmLead.expectedValue`, `CrmOpportunity.value`/`dealValueExTax`/`netProfitLakhs`, `SalesFunnel.dealValueLakhs`/`billingValueLakhs` | Type conversion + multiply by 100,000 |
| KRA structured tables | `kra_template_item`/`kra_metric`/`kra_template`/`employee_target`/`team_target` | No-op — all confirmed 0 rows on UAT |
| KRA free text | `KRA.target` | Multiply only the 6 UAT-confirmed money labels by 100,000 (handled by the separate guarded Node script, not inline SQL) |

## How to use this package

1. Read this README and the dry-run checklist in full.
2. Have someone with confirmed UAT SSH/MySQL access run
   [`uat-decimal-inr-pre-migration-snapshot.sql`](uat-decimal-inr-pre-migration-snapshot.sql) and
   save its output.
3. Review [`uat-decimal-inr-migration-plan.sql`](uat-decimal-inr-migration-plan.sql) yourself —
   confirm it matches every item in the dry-run checklist's "SQL review" section.
4. Only when explicitly instructed to actually migrate UAT: apply the migration plan SQL (either
   by hand through a MySQL client, or via the optional guarded apply script after removing its
   early-exit and filling in real connection handling), then run the guarded KRA-target transform
   script the same way, then run 3 manual `prisma migrate resolve --applied <name>` calls (one per
   migration name — see the dry-run checklist), then `prisma generate`, then restart the app.
5. Run [`uat-decimal-inr-post-migration-verification.sql`](uat-decimal-inr-post-migration-verification.sql)
   and compare its output against step 2's pre-migration snapshot, per the inline expectations
   documented in that file.
6. Execute the UAT test plan (`docs/database/UAT_DECIMAL_INR_MIGRATION_PLAN.md` §5) before
   declaring UAT sign-off.

## What NOT to do

- Do **not** run any file in this package against production. Every file targets
  `u686730471_Caveo_UAT` only.
- Do **not** run `prisma migrate deploy`, `prisma db push`, or `prisma migrate resolve` as a
  substitute for the hand-applied SQL — this project's established Hostinger no-shadow-DB
  workflow never uses `migrate deploy`/`db push`, and `migrate resolve` is only for *recording*
  an already-applied migration, run manually and separately after the SQL succeeds.
- Do **not** assume the optional `.mjs` scripts in `scripts/` are safe to run as-is — both exit
  early by design in their current form; their commented-out execution paths would need to be
  reviewed and uncommented deliberately, with real connection handling, before they do anything.
- Do **not** skip the pre-migration snapshot — it's the only thing the post-migration
  verification can be compared against.
- Do **not** touch Voucher, Ledger, or FinAccount — none of those models are part of this
  migration's scope.

## Migration execution status

**Not executed.** This entire package was generated and reviewed only, as of Step 4E
(2026-06-24). No UAT row, table, or schema object has been modified. Running this migration is a
separate, future, explicitly-instructed step.

## Production status

**Untouched.** Nothing in this package references, connects to, or affects production in any
way. Production remains paused per the deployment-strategy decision recorded in Step 3Z
(`docs/database/PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md`).
