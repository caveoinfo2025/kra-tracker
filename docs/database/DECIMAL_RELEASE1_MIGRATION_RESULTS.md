# Decimal Release 1 Migration Results

> **Step 3Q (2026-06-22).** Implementation results for the Release 1 Decimal + INR unit
> migration on the dev database (`u686730471_caveodev`). Scope: `Expense.amountLakhs/
> gstAmountLakhs`, `EmployeeAdvance.amountLakhs/disbursedAmountLakhs/settledAmountLakhs/
> balanceLakhs`, `TravelClaim.amountLakhs/amountRupees/ratePerKm`. Payment, Collection,
> Voucher, Ledger, CRM Lead/Opportunity, and KRA targets are explicitly untouched.

---

## 1. Dev Database Confirmation

`DATABASE_URL` confirmed to point at host `srv2201.hstgr.io`, database
`u686730471_caveodev` (user `u686730471_devuser`) before any write or schema change.
This is the dev database referenced throughout Steps 3N–3P — not production.

---

## 2. Smoke-Test Data Created

Dev has 0 pre-existing `Expense`/`TravelClaim` rows (per the Step 3O live profile), so 3
smoke rows were created, each clearly marked `[SMOKE TEST — Step 3Q Release 1]` in a text
field (`narration` for `Expense`, `purpose` for `TravelClaim`):

| Model | id | Marker field | Marked text |
| ----- | -: | ------------- | ----------- |
| Expense | 1 | narration | `[SMOKE TEST — Step 3Q Release 1] row 1 — amountLakhs 0.1, gstAmountLakhs 0.018` |
| Expense | 2 | narration | `[SMOKE TEST — Step 3Q Release 1] row 2 — amountLakhs 10.555, gstAmountLakhs 1.895` |
| TravelClaim | 1 | purpose | `[SMOKE TEST — Step 3Q Release 1] — amountLakhs 0.025, amountRupees 2500, ratePerKm 12.5` |

Both created via the app's own Prisma client (`src/lib/prisma.ts`) through a temporary
`prisma/release1-smoke-and-snapshot.ts` script, deleted immediately after use (confirmed
via `git status` — no scratch files remain).

---

## 3. Pre-Migration Snapshot

Captured immediately before any schema/value change, via a read-only Prisma query against
every Release 1 row (2 smoke `Expense` rows, the 1 existing `EmployeeAdvance` row, 1 smoke
`TravelClaim` row):

```json
{
  "expenses": [
    { "id": 1, "amountLakhs": 0.1,    "gstAmountLakhs": 0.018 },
    { "id": 2, "amountLakhs": 10.555, "gstAmountLakhs": 1.895 }
  ],
  "advances": [
    { "id": 1, "amountLakhs": 0.5, "disbursedAmountLakhs": null, "settledAmountLakhs": null, "balanceLakhs": 0 }
  ],
  "travelClaims": [
    { "id": 1, "amountLakhs": 0.025, "amountRupees": 2500, "ratePerKm": 12.5 }
  ]
}
```

---

## 4. Before/After Verification

Migration applied via a guarded one-off apply script (`prisma/apply-release1-migration.mjs`,
deleted immediately after use) which refused to run against any database other than
`u686730471_caveodev`, then `npx prisma migrate resolve --applied
20260622120000_decimal_release1_lakhs_to_inr` and `npx prisma generate`. Verified via a
temporary read-only Prisma script (`prisma/release1-verify.ts`, also deleted after use).

| Model | Field | Record ID | Before | Expected After | Actual After | Pass |
| ----- | ----- | --------: | -----: | -------------: | ------------: | :--: |
| Expense | amountLakhs | 1 | 0.1 | 10000.00 | 10000.00 | ✅ |
| Expense | gstAmountLakhs | 1 | 0.018 | 1800.00 | 1800.00 | ✅ |
| Expense | amountLakhs | 2 | 10.555 | 1055500.00 | 1055500.00 | ✅ |
| Expense | gstAmountLakhs | 2 | 1.895 | 189500.00 | 189500.00 | ✅ |
| EmployeeAdvance | amountLakhs | 1 | 0.5 | 50000.00 | 50000.00 | ✅ |
| EmployeeAdvance | disbursedAmountLakhs | 1 | NULL | NULL | NULL | ✅ |
| EmployeeAdvance | settledAmountLakhs | 1 | NULL | NULL | NULL | ✅ |
| EmployeeAdvance | balanceLakhs | 1 | 0 | 0.00 | 0.00 | ✅ |
| TravelClaim | amountLakhs | 1 | 0.025 | 2500.00 | 2500.00 | ✅ |
| TravelClaim | amountRupees | 1 | 2500 | 2500.00 | 2500.00 | ✅ |
| TravelClaim | ratePerKm | 1 | 12.5 | 12.5000 | 12.5000 | ✅ |

**All 11 fields pass — every value matches exactly.**

Additional checks:

- **No values became null unexpectedly.** The two already-`NULL` `EmployeeAdvance` fields
  (`disbursedAmountLakhs`, `settledAmountLakhs`) remain `NULL`; every non-nullable field has
  a non-null value.
- **No negative values were introduced.** All 11 post-migration values are ≥ 0.
- **No over-large/overflow values were introduced.** The largest value (`1055500.00`) is far
  within `Decimal(18,2)`'s range; no truncation or overflow occurred.
- **Schema column types confirmed** via `npx prisma generate` (no errors) and the verification
  script reading `Decimal` instances (`.toString()` calls succeeded, confirming the columns
  are genuinely `Decimal` now, not `Float`).
- **Migration SQL safety re-confirmed**: only `UPDATE`/`ALTER TABLE MODIFY COLUMN` statements
  for `Expense`, `EmployeeAdvance`, `TravelClaim` — no `DROP`, no destructive deletion, no
  Payment/Collection/Voucher/Ledger/CRM statements (§6 of the signoff plan's safety review,
  re-verified via `grep` against the final `migration.sql` before applying).
- **Dev database only** — `u686730471_caveodev`; the apply script refused to run against any
  other database name.

See §5 below for the corresponding API boundary and UI updates required to avoid a
half-converted state.
