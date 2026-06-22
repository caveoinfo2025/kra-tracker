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

---

## Step 3R Post-Migration Audit (2026-06-22)

Read-only verification step — no schema, migration, API, UI, or data change made. Confirmed
`DATABASE_URL` → `u686730471_caveodev` before every query.

**Migration state**: `20260622120000_decimal_release1_lakhs_to_inr` is recorded in
`_prisma_migrations` with a `finished_at` timestamp and `rolled_back_at: NULL` — applied and
not rolled back. (Incidental finding, unrelated to Release 1: two pre-existing migrations,
`20260615000000_add_advance_category` and `20260617100000_employeetarget_relations`, have no
row in `_prisma_migrations` at all — `prisma migrate status` lists them as "not yet applied"
even though the corresponding schema changes are clearly live in `prisma.schema.prisma`/the DB.
This predates Step 3Q, is not part of Release 1, and was not touched — see §"Bugs/Issues Found"
below for classification.)

**Column types confirmed via `INFORMATION_SCHEMA.COLUMNS`** on the dev DB:

| Table | Column | DATA_TYPE | Precision/Scale |
| ----- | ------ | --------- | ---------------- |
| Expense | amountLakhs | decimal | 18,2 |
| Expense | gstAmountLakhs | decimal | 18,2 |
| EmployeeAdvance | amountLakhs | decimal | 18,2 |
| EmployeeAdvance | balanceLakhs | decimal | 18,2 |
| EmployeeAdvance | disbursedAmountLakhs | decimal | 18,2 |
| EmployeeAdvance | settledAmountLakhs | decimal | 18,2 |
| TravelClaim | amountLakhs | decimal | 18,2 |
| TravelClaim | amountRupees | decimal | 18,2 |
| TravelClaim | ratePerKm | decimal | 10,4 |
| Payment | amountLakhs | **double** | — (unchanged) |
| Collection | invoiceValueLakhs | **double** | — (unchanged) |
| Collection | amountWithoutGstLakhs | **double** | — (unchanged) |
| Collection | amountReceivedLakhs | **double** | — (unchanged) |
| Voucher | amountLakhs | **double** | — (unchanged) |
| Ledger | amountLakhs | **double** | — (unchanged) |

### DB / API / UI value verification

| Model | Field | Record ID | Expected INR | Actual DB Value | API Value | UI Value Checked | Pass |
| ----- | ----- | --------: | ------------: | ----------------: | ----------: | ------------------ | :--: |
| Expense | amountLakhs | 1 | 10000.00 | 10000 | "10000.00" | ₹11,800 (total, claims table) | ✅ |
| Expense | gstAmountLakhs | 1 | 1800.00 | 1800 | "1800.00" | included above | ✅ |
| Expense | amountLakhs | 2 | 1055500.00 | 1055500 | "1055500.00" | ₹12,45,000 (total, claims table) | ✅ |
| Expense | gstAmountLakhs | 2 | 189500.00 | 189500 | "189500.00" | included above | ✅ |
| EmployeeAdvance | amountLakhs | 1 | 50000.00 | 50000 | "50000.00" | ₹50,000 (Advances table + summary card) | ✅ |
| EmployeeAdvance | disbursedAmountLakhs | 1 | NULL | NULL | null | — (not disbursed) | ✅ |
| EmployeeAdvance | settledAmountLakhs | 1 | NULL | NULL | null | — (not settled) | ✅ |
| EmployeeAdvance | balanceLakhs | 1 | 0.00 | 0 | "0.00" | not separately displayed (0) | ✅ |
| TravelClaim | amountLakhs | 1 | 2500.00 | 2500 | (not directly returned by `/conveyance`) | n/a (conveyance UI is mock-only) | ✅ |
| TravelClaim | amountRupees | 1 | 2500.00 | 2500 | 2500 (number) | n/a (conveyance UI is mock-only) | ✅ |
| TravelClaim | ratePerKm | 1 | 12.5000 | 12.5 | 12.5 (number) | n/a (conveyance UI is mock-only) | ✅ |

**All 11 fields pass** — DB values, API serialization, and (where a real UI consumer exists)
on-screen values all agree, with no null introduced, no double-multiplication, and no field
left in Lakhs. `TravelClaim` has no dedicated finance-grade UI screen wired to the real API yet
(`/finance/conveyance` is still 100% mock data, confirmed unchanged in Step 3Q) — its DB/API
values were verified directly instead.

### API boundary verification

Checked via authenticated `fetch()` calls in a running dev session (logged in as Vijesh
Vijayan / Manager, via the dev quick-login bypass):

- `GET /api/finance/expenses` → summary `totalExpenses: "1256800.00"` (= 11800 + 1245000,
  correct); per-row `baseAmount`/`gstAmount`/`totalAmount` all correct 2dp INR strings; no
  `[object Object]`, no raw Decimal leakage.
- `GET /api/finance/advances` → `amountLakhs: "50000.00"`, `summary.totalThisMonth:
  "50000.00"`, `summary.pendingApproval: "50000.00"` — correct, not `"0.50"` or
  `"50000000.00"`.
- `GET /api/finance/conveyance` → `amountRupees: 2500`, `ratePerKm: 12.5` — plain numbers, not
  Decimal objects, values unchanged (no multiplication, as designed).
- `GET /api/finance/dashboard` → `monthlyExpense: "1256800.00"`, `expenseBreakdown`/
  `monthlyExpenseTrend`/`topExpenseCategories` amounts all correct INR magnitudes;
  `cashBalance`/`bankBalance`/`cashFlow`/`bankFlow` correctly still `"0.00"` (FinAccount/Ledger,
  untouched, no test data exists for them — expected, not a Release 1 regression).
- Response shapes are unchanged from pre-migration (same field names, same string/number
  typing per field) — no breaking change to any consumer.

### UI verification (live browser, dev server against dev DB)

- **Finance Dashboard** (`/finance`): KPI cards render correct INR (`₹12,56,800.00` for
  Today's/Monthly Expense — not 100,000× inflated); the Category-wise Expense donut chart
  correctly displays **"₹12.6L"** (1,256,800 INR ÷ 100,000 via the new
  `inrToLakhsEquivalent()` helper, fed into the unchanged Lakhs-calibrated `fmt()` chart
  formatter) — the Cr/L/K compact-display logic still works correctly post-migration. No
  console errors, no hydration warnings.
- **Employee Claims** (`/finance/claims`): "Total Expenses ₹12,56,800" card; both smoke rows
  render with correct per-row totals (₹12,45,000 and ₹11,800) and their full
  `[SMOKE TEST — Step 3Q Release 1]` description text. No "₹ Lakhs" label anywhere.
- **Employee Advances** (`/finance/advances`): "Total This Month ₹50,000" card; the existing
  advance row shows "₹50,000" in the table; the "Request Advance" form shows the corrected
  **"Amount (₹)"** label (not "Amount (₹ Lakhs)") with placeholder "e.g. 50000".
- **Finance Approvals** (`/finance/approvals`): page loads cleanly ("No finance approvals
  pending" — the dev environment has no `ADVANCE_APPROVAL`/`EXPENSE_APPROVAL` workflow
  configured, so no `ApprovalRequest` rows exist to render). The `FinanceApprovalsClient.tsx`
  entity-type branch could not be exercised live for this reason — verified by direct source
  review instead (already done in Step 3Q); documented as a known limitation, not a failure.
- **Collections** (`/collections`, Release 2/excluded — sanity check only): still displays
  "₹441.84L"/"₹375.29L"/"₹239.18L" exactly as before — confirms Release 1 did not leak into
  Collection's display.

### Exclusions confirmed untouched

- `Payment.amountLakhs`, `Collection.invoiceValueLakhs`/`amountWithoutGstLakhs`/
  `amountReceivedLakhs`, `Voucher.amountLakhs`, `Ledger.amountLakhs` — confirmed still `double`
  in the dev DB (table above).
- `src/lib/kra-engine.ts`, Collections UI, Leads/Opportunities UI, `src/lib/payments.ts` —
  confirmed zero diff across the entire Step 3O→3Q commit range
  (`git diff 54bb67e..1c1447e --stat` against these paths returns no output).
- KRA scoring untouched — no code path touching `kra-engine.ts` was modified at any point in
  this session.

### Mobile Expense collateral fix verification

`src/app/api/expenses/route.ts`: confirmed `AUTO_APPROVE_LIMIT_INR = 10000` is the only
threshold constant present (`grep` for `AUTO_APPROVE_LIMIT` returns exactly one definition and
one use site); no leftover `AUTO_APPROVE_LIMIT_L`. The comparison
(`body.amountLakhs > AUTO_APPROVE_LIMIT_INR`) and the `prisma.expense.create({ data: {
amountLakhs: body.amountLakhs, ... } })` call both type-check cleanly against the new `Decimal`
column (confirmed via the Step 3Q `tsc --noEmit` pass). No new live test data was POSTed
through this endpoint — doing so would have created additional, non-canonical `Expense` rows
alongside the official Step 3Q smoke data; the logic is simple unambiguous arithmetic already
covered by the type-check, so static verification was judged sufficient.

### Bugs/Issues Found

| Issue | Classification | Action |
| ----- | -------------- | ------ |
| Two pre-existing migrations (`20260615000000_add_advance_category`, `20260617100000_employeetarget_relations`) have no row in `_prisma_migrations`, so `prisma migrate status` reports them "not yet applied" even though their schema changes are live | **Minor / Documentation-only** — predates Step 3Q, unrelated to Release 1, does not affect Release 1 correctness or any Finance behavior | Documented here for visibility; not fixed in this step (out of scope — would require its own resolve/investigation step, and risks masking a real future drift if resolved incorrectly without investigation) |

**No blockers, no major issues, and no functional bugs were found in the Release 1
implementation itself.** Everything audited — DB values, API responses, UI rendering, and the
mobile collateral fix — matches expectations exactly.
