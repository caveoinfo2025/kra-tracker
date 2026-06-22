# Decimal Conversion Readiness Check

> **Step 3N — data-audit and decision-lock step only.** No Prisma schema change, no migration,
> no API code change, no UI code change, no Float field converted, no `prisma migrate` run, no
> database data altered. This document assesses whether the 5 critical Finance models
> (`Expense`, `EmployeeAdvance`, `TravelClaim`, `Payment`, `Collection`) are ready for a future
> Decimal schema conversion — it does not perform that conversion.
>
> **Update (2026-06-22, before Step 3O):** A business-rule decision was made — Lakhs-based values
> are now restricted to CRM Leads/Opportunities/pipeline-estimation fields only; all Finance and
> Accounting values must use actual INR amounts. See **§0 Money Unit Policy Decision** below,
> added before this readiness check's conversion-batch recommendation is finalized. §2/§8/§10/§11
> are superseded where they conflict with §0 — §0 governs.

---

## 0. Money Unit Policy Decision

**Final decision** (locked, business-rule update, 2026-06-22):

- CRM `Lead` and CRM `Opportunity` values (and Sales pipeline/forecast fields) **may remain
  Lakhs-based.** This applies to: `CrmLead.expectedValue`, `CrmOpportunity.value`/
  `dealValueExTax`/`netProfitLakhs`, `SalesFunnel.dealValueLakhs`/`billingValueLakhs`. These are
  intentionally designed pipeline-estimation values, not posted accounting transactions.
- **All Finance and Accounting values must be actual INR values.** This applies, without
  exception, to: `Expense`, `EmployeeAdvance`, `TravelClaim`/Conveyance, `Payment`, `Collection`,
  `Voucher`, `Ledger`, Bank Book, Cash Book, `FinAccount` balances, Reports, Tally export,
  GST/tax calculations, reimbursements, settlements, vendor payments, and customer receipts.
- **Future Finance write APIs must not convert values to Lakhs.** Any Finance write endpoint
  built after this decision must accept and persist actual INR amounts directly — no `/100000`
  or `*100000` step at the write boundary.
- **Decimal conversion for Finance must use actual-INR-amount semantics** — i.e. when a Finance
  `Float` column is eventually converted, the column's *meaning* must become "this many rupees,"
  not "this many Lakhs of rupees," whatever the column's literal stored numeric value ends up
  being after the transformation described below.
- **Any existing Finance field name ending in `Lakhs` is to be treated as a legacy naming
  artifact going forward** — but see the verification findings immediately below: in this
  codebase, that legacy naming is **not** a *misleading* name. Every such field genuinely and
  intentionally stores a value denominated in Lakhs today, by design, end-to-end (DB seed data,
  every Finance API route's own doc comments, and 9+ independent UI unit-converters). The
  `Lakhs` suffix is accurate, not a bug — it just describes a unit that the business has now
  decided Finance must stop using.

### Field-by-field verification (required before any Decimal conversion)

For every Finance field currently named `*Lakhs` (or otherwise unit-ambiguous), the table below
answers the 6 required questions from direct evidence in the codebase — dev seed data
(`prisma/seed-dev-finance.ts`), API route doc comments, and UI converter functions — not
assumption.

| Field | 1. Stored in INR today? | 2. Stored in Lakhs today? | 3. Name misleading? | 4. UI ×/÷ 100,000 anywhere? | 5. API converts to/from Lakhs? | 6. Recommended future name |
|---|---|---|---|---|---|---|
| `Expense.amountLakhs` | No | **Yes** — seed: `amountLakhs: 0.3` representing ₹0.30L (₹30,000) incl. GST | No — accurately named | Yes — `src/app/finance/expenses/data.ts`'s `lakhsToRupees()` | No — API returns the raw stored Lakhs value as a 2dp string per its own doc comment ("returned... in ₹ Lakhs (same unit as DB)") | `amountInr` (not renamed this step) |
| `Expense.gstAmountLakhs` | No | **Yes** — same expense row, same scale (`gst = round4(total - base)` where `total` is the ₹0.30L figure) | No | Yes — same converter as above | No | `gstAmountInr` |
| `EmployeeAdvance.amountLakhs` | No | **Yes** — seed: `amountLakhs: 0.5` representing ₹0.5L (₹50,000) | No | Yes — `AdvancesClient.tsx`'s `lakhsToRupees()` | No | `amountInr` |
| `EmployeeAdvance.disbursedAmountLakhs` | No | **Yes** — same model/scale as `amountLakhs` (no seed value populated, but the same `AdvancesClient.tsx` formatter is applied to it) | No | Yes — same component | No | `disbursedAmountInr` |
| `EmployeeAdvance.settledAmountLakhs` | No | **Yes** — same reasoning | No | Yes — same component | No | `settledAmountInr` |
| `EmployeeAdvance.balanceLakhs` | No | **Yes** — CACHED (disbursed − settled), same scale; seed sets it to `0` alongside `amountLakhs: 0.5` | No | Yes — same component | No | `balanceInr` |
| `TravelClaim.ratePerKm` | **N/A — this is a rate, not an amount** | N/A | No | N/A | No | Unchanged — already a real ₹/km rate (seed: `rate = 2.0`, i.e. ₹2/km) |
| `TravelClaim.amountRupees` | **Yes — already actual INR** | No | No — correctly named and already in the target unit | Not needed — `src/app/finance/conveyance/data.ts` consumes it directly as a plain number, no conversion | No | Already correct — could become the canonical field with no unit change, only a Decimal type change |
| `TravelClaim.amountLakhs` | No | **Yes** — seed: `amountLakhs: round4(rupees / 100000)`, an explicit derived duplicate of `amountRupees` in a different unit | No — but **redundant**: this field exists purely as a Lakhs-denominated mirror of `amountRupees` | N/A (display mirror only) | No | Candidate for **deprecation**, not renaming — `amountRupees` already satisfies the new policy; keeping both invites drift |
| `Payment.amountLakhs` | No | **Yes** — same scale as the `Collection`/`Expense` it posts against (flows through `applyAdvance()`/`recordPayment()` in `src/lib/payments.ts`) | No | Yes — `ApprovalInboxPage.tsx` and `FinanceApprovalsClient.tsx` both do `Math.round(ctx.amountLakhs * 100_000)` for display | No | `amountInr` |
| `Collection.invoiceValueLakhs` | No | **Yes** — confirmed directly in the UI: `CollectionsClient.tsx`/`kra-engine.ts`'s edit form renders the raw form value with a literal `"...}L"` suffix, i.e. the user types the amount in Lakhs | No | Yes — pervasive (Dashboard, KRA engine, Collections UI) | No | `invoiceValueInr` — **see cross-cutting risk below** |
| `Collection.amountWithoutGstLakhs` | No | **Yes** — same row/scale as `invoiceValueLakhs` | No | Yes | No | `amountWithoutGstInr` |
| `Collection.amountReceivedLakhs` | No | **Yes** — CACHED, re-derived from `Payment.amountLakhs` sum via `syncCollectionTotals()` | No | Yes | No | `amountReceivedInr` — **see cross-cutting risk below** |
| `Voucher.amountLakhs` | No | **Yes** — seed: `amountLakhs: total` (the same ₹0.30L figure as the linked `Expense`) | No | Yes — `VouchersClient.tsx`'s `lakhsToRupees()`, and the `amountInWords()` helper in `vouchers/[id]/route.ts` explicitly does `lakhs * 100_000` to convert before generating the words string | No | `amountInr` (excluded from this batch per §1 — Voucher/Ledger remain separate) |
| `Ledger.amountLakhs` | No | **Yes** — seed: `amountLakhs: total`, same scale as the linked Voucher/Expense | No | Yes — Bank Book/Cash Book route `fmtMoney()` + UI's `lakhsToRupees()`/`fmtINRfromLakhs()` in `bank-book/data.ts` | No | `amountInr` (excluded from this batch per §1) |
| `FinAccount.openingBalance` / `currentBalance` | No | **Yes (by the same UI convention)** — seeded at `0` in `prisma/seed.ts` so no nonzero magnitude is directly confirmable from seed data alone, but every consuming UI component (`bank-book/data.ts`'s `fmtINRfromLakhs`) treats these exactly like every other `*Lakhs` field, and the field naming convention is consistent with the rest of the schema | No | Yes — same Bank Book/Cash Book converters | No | `openingBalanceInr` / `currentBalanceInr` (excluded from this batch per §1/§3 — tied to the Ledger/Voucher accounting flow) |

**No field in this list has an unclear or ambiguous stored unit.** Every one is confirmed, by
direct evidence, to genuinely store ₹ Lakhs today (except `TravelClaim.ratePerKm`/`amountRupees`,
which are already correct). None are blocked under the "unit cannot be confirmed" condition —
they are all blocked under a different, larger condition: **the new policy requires an actual
value transformation (multiply every stored amount by 100,000), not just a column-type change,**
and that transformation has not been designed, reviewed, or scheduled. See the revised
recommendation in §8/§11 below.

### Cross-cutting risk: `Collection.invoiceValueLakhs`/`amountReceivedLakhs` also feed KRA scoring

`Collection.invoiceValueLakhs` is consumed directly by `src/lib/kra-engine.ts` (confirmed: 6 call
sites computing `totalValue`/`onTimeVal`/`lateVal`/collection-achievement aggregates for
**employee KRA performance scoring**, e.g. `rows.reduce((s, r) => s + r.invoiceValueLakhs, 0)`).
KRA scoring is **not** one of the areas the new Money Unit Policy names (it names CRM Lead/
Opportunity/pipeline fields as the Lakhs-exempt set, and Finance/Accounting fields as the
real-INR set — KRA achievement tracking is neither). If `Collection.invoiceValueLakhs` is
converted from Lakhs to actual-INR semantics under this policy, every KRA-engine aggregation that
reads this field must be updated in lockstep, or KRA achievement-vs-target comparisons will be
silently wrong by a factor of 100,000. **This decision needs explicit scope confirmation before
`Collection` is converted** — it is not addressed by the policy text as given and is flagged here
as a new, additional blocking item (see §10).

---

## 1. Purpose

**Why this readiness check is required.** `docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md`
(Step 3G) inventoried every money-like `Float` field and proposed a phased path to `Decimal`.
`src/lib/money.ts` (Step 3H) built the serialization/arithmetic helper, and Steps 3I–3M wired it
into the read-only calculation paths that had a genuine JS-level money calculation (Bank Book,
Cash Book, Expense, Dashboard). None of that touched the Prisma schema or any stored value. Before
actually changing a column's underlying SQL type (`DOUBLE` → `DECIMAL`), the project's own
migration safety plan (§7/§8 of the Step 3G document) requires a deliberate readiness check —
data quality, API contract impact, UI impact, and migration-SQL risk all have to be understood and
signed off *before* the first `ALTER COLUMN` is even drafted, not discovered mid-migration.

**Why Decimal schema conversion is not being done in this step.** Converting a live column's type
is a data-rewriting operation (per Step 3G §7), not an additive `ADD COLUMN`. It can change how
existing values round or truncate, it locks/rewrites the table, and it has follow-on API/UI
serialization consequences (Decimal is not a plain JS `number`). This step's job is to gather the
facts a sign-off decision needs — not to make that change.

**Why critical Finance models are reviewed first.** `Expense`, `EmployeeAdvance`, `TravelClaim`,
`Payment`, and `Collection` are the models with the most existing application code touching them
(`src/lib/payments.ts`'s `round2()`/epsilon-comparison workaround is the concrete, present symptom
of the float-precision risk this plan exists to fix) and the most immediate Finance-write-API
exposure per the Step 3G §11 Final Recommendation. They are reviewed as one batch because they
share the same money-amount shape (`Decimal(18,2)`) and the same general usage pattern (claims,
payments, balances) — as opposed to `Voucher`/`Ledger`, which follow a different accounting
lifecycle.

**Why Voucher/Ledger remain separate.** Per Step 3G §7 Phase D and `docs/database/
SOFT_DELETE_DECISION_LOG.md` §7/§8 (cross-referenced in the migration plan), `Voucher` and
`Ledger` are void/reversal-only models with a different lifecycle from the rest of Finance (no
hard delete, no `deletedAt`, instead `voidedAt`/`voidReason` and `pairedLedgerId` reversal). The
migration plan explicitly sequences their conversion *after* the cancellation/reversal accounting
design is confirmed (Step 3K in the original plan's §9, not to be confused with this project's
Step 3K dry-run-sweep step of the same number in the tracker — the original plan's lettered/numbered
step names predate the dry-run sweep's own numbering and refer to different work). This readiness
check does not approve Voucher/Ledger for the first conversion batch.

---

## 2. Candidate Field Inventory

Exact field names copied from `prisma/schema.prisma`.

| Model | Field | Current Type | Usage | Recommended Decimal Type | Convert In First Batch? | Reason |
|---|---|---|---|---|---|---|
| `Expense` | `amountLakhs` | `Float` | Claimed expense base amount | `Decimal @db.Decimal(18,2)` | Yes | Core transaction amount; aggregated (`_sum`) repeatedly in `GET /api/finance/expenses`, `/dashboard` |
| `Expense` | `gstAmountLakhs` | `Float` `@default(0)` | GST amount on the expense | `Decimal @db.Decimal(18,2)` | Yes | Combined with `amountLakhs` for `totalAmount` in both Expense routes and the Dashboard (Steps 3K/3L wiring) |
| `EmployeeAdvance` | `amountLakhs` | `Float` | Requested advance amount | `Decimal @db.Decimal(18,2)` | Yes | Posted into `Payment.amountLakhs` via `applyAdvance()` in `src/lib/payments.ts` |
| `EmployeeAdvance` | `disbursedAmountLakhs` | `Float?` | Actually disbursed amount | `Decimal @db.Decimal(18,2)` | Yes | Nullable — `null` means "not yet disbursed," not zero; must preserve that distinction in Decimal form |
| `EmployeeAdvance` | `settledAmountLakhs` | `Float?` | Settled amount | `Decimal @db.Decimal(18,2)` | Yes | Nullable, same null-vs-zero distinction as above |
| `EmployeeAdvance` | `balanceLakhs` | `Float` `@default(0)` | CACHED (disbursed − settled) | `Decimal @db.Decimal(18,2)` | Yes | Cached running balance — the exact case the migration plan's §1 calls out for compounding float drift |
| `TravelClaim` | `ratePerKm` | `Float` `@default(0)` | ₹/km rate, snapshot from HR policy | `Decimal @db.Decimal(10,4)` | Yes | A per-unit multiplier, not a final amount — needs the extra 2 decimal places per the §4 rate-field standard |
| `TravelClaim` | `amountRupees` | `Float` `@default(0)` | Claim amount in ₹ | `Decimal @db.Decimal(18,2)` | Yes | `ratePerKm × distanceKm`, computed once at write time |
| `TravelClaim` | `amountLakhs` | `Float` `@default(0)` | Same claim, ₹ Lakhs denomination | `Decimal @db.Decimal(18,2)` | Yes | Must convert together with `amountRupees` — a mismatch between the two denominations would be a new bug, not a migration improvement |
| `Payment` | `amountLakhs` | `Float` | Single payment-ledger amount | `Decimal @db.Decimal(18,2)` | Yes | Aggregated (`_sum`) repeatedly in `syncCollectionTotals()`/`paymentsToday()`; `round2()` exists specifically to paper over this field's float noise |
| `Collection` | `invoiceValueLakhs` | `Float` | Invoice value | `Decimal @db.Decimal(18,2)` | Yes | Drives the `collectionStatus` comparison in `syncCollectionTotals()`, currently needing the `+0.001` epsilon hack |
| `Collection` | `amountWithoutGstLakhs` | `Float` `@default(0)` | Pre-GST invoice value | `Decimal @db.Decimal(18,2)` | Yes | Used alongside `invoiceValueLakhs` in profitability/reporting |
| `Collection` | `amountReceivedLakhs` | `Float` `@default(0)` | CACHED received total | `Decimal @db.Decimal(18,2)` | Yes | Re-derived by `syncCollectionTotals()` via `Payment` aggregate — exact `SUM()` matters most here, per Step 3G §1 |

All 13 fields above are money amounts or a money-rate multiplier on the 5 critical models. No
field on these 5 models was found that is money-shaped but excluded from this list.

---

## 3. Fields Excluded From First Batch

| Model | Field | Current Type | Reason Excluded |
|---|---|---|---|
| `Expense` | `gstRate` | `Float` `@default(0)` | A tax *rate* (e.g. `18` meaning 18%), not a currency amount. Candidate for `Decimal(8,4)` later if a precision bug is found — not part of this money-amount batch |
| `TravelClaim` | `distanceKm` | `Float` `@default(0)` | A physical distance, not currency. Per the Step 3G §3 standard, convert only if a future feature ties exact billing precision directly to distance (it doesn't today) |
| `TravelClaim` | `fromLat`, `fromLng`, `toLat`, `toLng` | `Float?` | GPS coordinates — geographic precision, unrelated to currency |
| `EmployeeAdvance` | `status`, `category`, `disbursedFromType`, etc. | `String` | Status/category fields, not numeric — out of scope by type, listed only to confirm nothing money-shaped was missed |
| `Voucher` | `amountLakhs` | `Float` | Belongs to the separate Voucher/Ledger batch per §1 above — not part of this readiness check |
| `Ledger` | `amountLakhs` | `Float` | Same — Voucher/Ledger batch, deferred until the cancellation/reversal design is confirmed |
| `FinAccount` | `openingBalance`, `currentBalance` | `Float` | Chart-of-accounts cached balances; tightly coupled to the Ledger/Voucher accounting flow, not one of the 5 critical models named in this step's scope |
| `OrderAdvance` | `amountLakhs` | `Float` | Not in this step's named critical-model list (`Expense`/`EmployeeAdvance`/`TravelClaim`/`Payment`/`Collection`); flows into `Payment.amountLakhs` via `applyAdvance()` but the source field itself is a separate model not requested for this batch |
| `Notification` | `amountLakhs` | `Float?` | Denormalized display-only copy of an already-posted amount — Step 3G classified this "Later," not part of the critical-model batch |
| `CrmOpportunity` | `value`, `dealValueExTax`, `netProfitLakhs` | `Float` | CRM pipeline/forecast estimate fields — Step 3G §2 classifies these "Important" (lower correctness stakes than ledger-posted money), explicitly excluded from the critical-model batch |
| `CrmLead` | `expectedValue` | `Float` `@default(0)` | Same — pipeline forecast estimate, excluded |
| `ApprovalRule` | `autoApproveLimit`, `level1Limit`, `level2Limit`, `level3Limit` | `Float`/`Float?` | Policy threshold fields — not explicitly approved for this batch (Step 3G §4 leaves this a per-field decision for a later step) |
| `ExpenseLimitRule` | `dailyLimit`, `monthlyLimit`, `yearlyLimit` | `Float` `@default(0)` | Policy threshold fields, same reasoning |
| `ConveyancePolicy` | `ratePerKm`, `monthlyLimitRupees` | `Float` `@default(0)` | Policy configuration, not a posted transaction — the live `TravelClaim.ratePerKm` snapshot (§2 above) is the transaction-facing field that IS in this batch |
| `AdvancePolicy` | `maxAdvanceLakhs` | `Float` `@default(0)` | Policy threshold, not explicitly approved for this batch |
| `CustomerCreditPolicy` | `defaultCreditLimitLakhs`, `maxCreditLimitLakhs` | `Float` `@default(0)` | Policy threshold, same reasoning |

---

## 4. Live Dev Data Profile

**Completed (Step 3O, 2026-06-22).** `DATABASE_URL` was confirmed to point at the dev database
`u686730471_caveodev` (not production) before running anything. A read-only profiling script
(Prisma `findMany` over each candidate field, with in-JS row-count/null-count/min/max/
negative-count/suspicious-large-count/scale-exceed-count computation — same methodology
documented in Step 3N, retained below) was run successfully this time from a DB-accessible
environment. **No writes were performed** — every query was a `findMany` select; the script was
deleted immediately after capturing output (confirmed via `git status` — no scratch files
remain).

**Methodology** (unchanged from Step 3N): scale-exceed uses `ROUND(value * 10^scale) /
10^scale ≠ value` (2dp for money fields, 4dp for `ratePerKm`) as an approximation, since `Float`/
`DOUBLE` carries inherent binary-rounding noise — a value written as exactly `"123.45"` can
already differ from `123.45` by a tiny epsilon, which this check will (correctly) flag even
though the row has no genuine third-decimal-place digit. "Suspicious large" used a generous
per-model threshold (₹1000L on Expense/Advance/Payment, ₹100L on TravelClaim, ₹10,000L on
Collection) tuned to avoid false positives on legitimately large invoices.

| Model | Field | Row Count | Null Count | Min | Max | >2 Decimal Count | Negative Count | Notes |
|---|---|---:|---:|--:|--:|---:|---:|---|
| `Expense` | `amountLakhs` | 0 | 0 | — | — | 0 | 0 | No rows exist in dev yet — nothing to profile, nothing to block on |
| `Expense` | `gstAmountLakhs` | 0 | 0 | — | — | 0 | 0 | Same |
| `EmployeeAdvance` | `amountLakhs` | 1 | 0 | 0.5 | 0.5 | 0 | 0 | Matches `prisma/seed-dev-finance.ts`'s seeded row exactly (₹0.5L = ₹50,000) |
| `EmployeeAdvance` | `disbursedAmountLakhs` | 1 | 1 | — | — | 0 | 0 | The 1 row is `null` — expected, since the seeded advance is `status: "approved"`, not yet disbursed |
| `EmployeeAdvance` | `settledAmountLakhs` | 1 | 1 | — | — | 0 | 0 | Same reasoning — not yet settled |
| `EmployeeAdvance` | `balanceLakhs` | 1 | 0 | 0 | 0 | 0 | 0 | CACHED field correctly `0` (disbursed − settled, both currently `0`/`null`) |
| `TravelClaim` | `ratePerKm` | 0 | 0 | — | — | 0 (>4dp) | 0 | No rows in dev — the seeded TravelClaim row from `seed-dev-finance.ts` is not present in this DB snapshot |
| `TravelClaim` | `amountRupees` | 0 | 0 | — | — | 0 | 0 | Same |
| `TravelClaim` | `amountLakhs` | 0 | 0 | — | — | 0 | 0 | Same |
| `Payment` | `amountLakhs` | 1 | 0 | 1.61 | 1.61 | 0 | 0 | One real payment row, ₹1.61L = ₹1,61,000 — clean, no scale/negative issues |
| `Collection` | `invoiceValueLakhs` | **94** | 0 | 0.00322494 | 77.88 | 2 | 0 | Real pre-existing legacy data (Collections predates Finance Phase 1). Max ₹77.88L (~₹77.9L) is a plausible large invoice, not suspicious. 2/94 rows exceed 2dp — see note below |
| `Collection` | `amountWithoutGstLakhs` | 94 | 0 | 0.002733 | 66 | **60** | 0 | 60/94 rows exceed 2dp — **expected, not a data-quality problem**: this field is computed in the UI as `invoiceValueLakhs / 1.18` (`kra-engine.ts`'s `CollectionsClient` form), which is a non-terminating decimal for almost any input — the >2dp count here reflects the GST-back-calculation formula, not corrupted data |
| `Collection` | `amountReceivedLakhs` | 94 | 0 | 0 | 77.88 | 0 | 0 | Clean — CACHED field, re-derived from `Payment` sums, no scale or negative issues |

**Data quality verdict: clean, no blockers found.** Zero negative values across every field.
Zero suspiciously large values. The only ">2dp" counts are on `Collection.invoiceValueLakhs`
(2 rows) and `amountWithoutGstLakhs` (60 rows) — both fully explained by the GST-back-calculation
formula (`base = invoice / 1.18`) rather than by bad input, consistent with the methodology note
above that a non-systematic, formula-explained >2dp count is not itself evidence of a problem.
**`Expense` and `TravelClaim` currently have zero rows in this dev DB** — this means there is no
existing data to validate a transformation against for those two models specifically; any
transformation script for them would need its own smoke-test data before being trusted, since an
empty table trivially "passes" any data-quality check without proving anything.

**The §11 "data quality unconfirmed" blocking ground from Step 3N is now resolved — data quality
is acceptable for every populated field.** The second blocking ground from Step 3N/the §0 policy
update (the unit-transformation design) is addressed in the new sections below, and is what now
governs whether conversion can proceed.

---

## Finance Lakhs-to-INR Transformation Design

For every Finance field confirmed in §0 to genuinely store ₹ Lakhs today, the transformation to
actual-INR semantics is: multiply the existing stored value by 100,000, then convert the column
to `Decimal`. `TravelClaim.ratePerKm` and `TravelClaim.amountRupees` are the exceptions — already
real INR / real ₹-per-km, so only the Decimal type change applies, with no value multiplication.

| Model | Field | Current Unit | Target Unit | Transformation | Decimal Type | Convert In First Release? | Notes |
|---|---|---|---|---|---|---|---|
| `Expense` | `amountLakhs` | ₹ Lakhs | Actual INR | `value * 100000` | `Decimal @db.Decimal(18,2)` | Yes (Release 1) | 0 rows in dev today (§4) — no existing data to transform, but the transformation script must still exist and be tested before any real data is written |
| `Expense` | `gstAmountLakhs` | ₹ Lakhs | Actual INR | `value * 100000` | `Decimal @db.Decimal(18,2)` | Yes (Release 1) | Same — convert together with `amountLakhs` in the same row/transaction, never independently |
| `EmployeeAdvance` | `amountLakhs` | ₹ Lakhs | Actual INR | `value * 100000` | `Decimal @db.Decimal(18,2)` | Yes (Release 1) | 1 row in dev (₹0.5L → ₹50,000 after transform) |
| `EmployeeAdvance` | `disbursedAmountLakhs` | ₹ Lakhs (nullable) | Actual INR (nullable) | `value * 100000` where not null; `NULL` stays `NULL` | `Decimal @db.Decimal(18,2)` | Yes (Release 1) | Must preserve the null-vs-zero distinction ("not yet disbursed" ≠ "disbursed ₹0") through the transform |
| `EmployeeAdvance` | `settledAmountLakhs` | ₹ Lakhs (nullable) | Actual INR (nullable) | Same, null-preserving | `Decimal @db.Decimal(18,2)` | Yes (Release 1) | Same reasoning |
| `EmployeeAdvance` | `balanceLakhs` | ₹ Lakhs (CACHED) | Actual INR (CACHED) | `value * 100000` | `Decimal @db.Decimal(18,2)` | Yes (Release 1) | CACHED — must be re-derived consistently with `disbursedAmountLakhs`/`settledAmountLakhs`'s own transform, not transformed independently and left to drift |
| `TravelClaim` | `ratePerKm` | **Actual INR per km already** | Actual INR per km | **No unit multiplication** | `Decimal @db.Decimal(10,4)` | Yes (Release 1) | Only the Decimal type change applies — this field needs no value transformation |
| `TravelClaim` | `amountRupees` | **Actual INR already** | Actual INR | **No unit multiplication** | `Decimal @db.Decimal(18,2)` | Yes (Release 1) | Same — already correct unit, type-only change |
| `TravelClaim` | `amountLakhs` | ₹ Lakhs (redundant mirror of `amountRupees`) | Actual INR | `value * 100000` (or simply recompute as `amountRupees` once both are Decimal, since they'd then be identical) | `Decimal @db.Decimal(18,2)` | Yes (Release 1), pending the deprecation decision in §0 | If deprecated per §0's recommendation, this row is moot — flagged either way so the decision isn't silently skipped |
| `Payment` | `amountLakhs` | ₹ Lakhs | Actual INR | `value * 100000` | `Decimal @db.Decimal(18,2)` | **No — Release 2** | Deferred per §8; live, actively-written model bundled with `src/lib/payments.ts` retirement |
| `Collection` | `invoiceValueLakhs` | ₹ Lakhs | Actual INR | `value * 100000` | `Decimal @db.Decimal(18,2)` | **No — Release 2, and additionally blocked on the KRA-engine decision below** | 94 live rows in dev (§4) — real data, not a clean slate like Expense/TravelClaim |
| `Collection` | `amountWithoutGstLakhs` | ₹ Lakhs | Actual INR | `value * 100000` | `Decimal @db.Decimal(18,2)` | **No — Release 2** | Same blocking reasons as `invoiceValueLakhs` |
| `Collection` | `amountReceivedLakhs` | ₹ Lakhs (CACHED) | Actual INR (CACHED) | `value * 100000` | `Decimal @db.Decimal(18,2)` | **No — Release 2** | CACHED, re-derived from `Payment.amountLakhs` — must transform in the same release as `Payment`, never independently |

---

## Code Converter / UI Label / API-Comment Inventory

Every place in the codebase that currently assumes a Finance field is Lakhs-denominated and
either converts it (×/÷ 100,000) or labels it as Lakhs. **Nothing in this table was modified —
inventory only**, per this step's explicit instruction.

| File | Function/Usage | Current Behavior | Required Future Change | Must Change Same Release? |
|---|---|---|---|---|
| `src/app/finance/FinanceDashboardClient.tsx:19` | `lakhsToRupees(s)` | `Number(s) * 100000` to convert the Dashboard API's Lakhs string to rupees for display | Remove the `* 100000` once the Dashboard's source fields return actual INR — become an identity/parse-only function | Yes — same release as `Expense`/whichever source field it reads converts |
| `src/app/finance/vouchers/VouchersClient.tsx:207` | `lakhsToRupees(s)` | Same `* 100000` pattern, for Voucher amounts | Same | Yes — same release as `Voucher.amountLakhs` (excluded from this batch per §1, so this one is **not** in Release 1/2 scope yet) |
| `src/app/finance/expenses/data.ts:262` | `lakhsToRupees(s)` | Same pattern, for Expense amounts | Same | Yes — same release as `Expense.amountLakhs`/`gstAmountLakhs` (**Release 1**) |
| `src/app/finance/claims/ClaimsClient.tsx:100` | `lakhsToRupees(s)` | Same pattern, for TravelClaim amounts | Same | Yes — same release as `TravelClaim.amountLakhs` (**Release 1**); note `amountRupees` needs no change since it's already real INR |
| `src/app/finance/advances/AdvancesClient.tsx:83` | `lakhsToRupees(s)` | Same pattern, for EmployeeAdvance amounts | Same | Yes — same release as `EmployeeAdvance.*` fields (**Release 1**) |
| `src/app/finance/bank-book/data.ts:243` | `fmtINRfromLakhs(s)` | `Math.round(parseFloat(s) * 100000 * 100) / 100` then formats as a currency string | Same removal once source converts | Yes — same release as `Ledger`/`FinAccount` (excluded from this batch per §1, **not** in Release 1/2) |
| `src/app/finance/bank-book/data.ts:249` | `lakhsToRupees(s)` | Same `* 100000` pattern (numeric, not string-formatted) | Same | Same as above — not in Release 1/2 |
| `src/app/approvals/ApprovalInboxPage.tsx:79` | inline ternary | `Math.round((ctx.amountLakhs as number) * 100_000)` to derive a display `amount` from an approval-request context payload | Remove once the underlying entity's field (Expense/Advance/TravelClaim/Voucher — context-dependent) converts | Yes, but scoped per-entity-type since this one inline expression covers multiple source models via the generic `ApprovalRequest.contextJson` |
| `src/app/finance/approvals/FinanceApprovalsClient.tsx:87` | inline ternary | Same pattern as above | Same | Same as above |
| `src/app/api/finance/vouchers/[id]/route.ts:68-69` | `amountInWords(lakhs)` | `const rupees = r2(lakhs * 100_000)` before generating the words string | Remove the multiplication once `Voucher.amountLakhs` converts | Yes — same release as `Voucher.amountLakhs` (excluded from this batch, **not** Release 1/2) |
| `src/app/collections/CollectionsClient.tsx:347-349` | Summary card labels | Renders `` `₹${totalInvoiced.toFixed(2)}L` ``, `` `₹${totalWithoutGst.toFixed(2)}L` ``, `` `₹${totalReceived.toFixed(2)}L` `` — literal `"L"` (Lakhs) suffix on raw stored values | Remove the `"L"` suffix and adjust formatting (likely add thousands separators) once `Collection`'s fields convert | Yes — same release as `Collection.*` (**Release 2**) |
| `src/app/collections/CollectionsClient.tsx:586` | GST-component preview | Renders the raw form-input difference with a literal `"L"` suffix while the user is still typing | Same | Yes — same release as `Collection.*` (**Release 2**) — this is also a **write-path** UI (the create/edit form), not just a read display |
| `src/lib/kra-engine.ts` (multiple: lines ~101, 109, 111, 115, 312, 314, 422, 432, 439–442) | Direct reads of `Collection.invoiceValueLakhs`/`amountWithoutGstLakhs`, summed and compared against human-entered Lakhs-scaled KRA targets, with `.toFixed(1)}L` labels in the generated progress notes | **No conversion at all today** — both sides of every comparison are Lakhs, so it's currently correct by coincidence of matching units, not by design | See the dedicated **Collection / KRA Engine Impact** section below — this is the highest-risk converter in the inventory, not a simple display helper | Yes, but **only if/when `Collection` converts** — must not be changed independently, and must not be left unchanged if `Collection` does convert (see Half-Converted-State Rule) |
| `src/lib/payments.ts` (`round2()`, `syncCollectionTotals()`'s `received + 0.001 >= invoice` epsilon comparison) | Float-precision workaround operating on `Payment.amountLakhs`/`Collection.invoiceValueLakhs` at their current scale | The epsilon/rounding workaround this whole Decimal effort exists to retire (per the original Step 3G §6) | Retire `round2()` and the epsilon comparison once `Payment`/`Collection` are `Decimal` — Decimal-native comparison no longer needs an epsilon | Yes — same release as `Payment`/`Collection` (**Release 2**), explicitly called out in the original migration plan §6 as work for that conversion step itself |
| `src/app/api/finance/dashboard/route.ts`, `expenses/route.ts`, `bank-book/route.ts`, `cash-book/route.ts` (doc comments) | JSDoc comments stating *"returned as 2-decimal strings in ₹ Lakhs (same unit as DB). UI layer converts to ₹ rupees (× 100,000) for display."* | Documentation describing the current (soon-to-change) contract | Update the comment text to describe the new actual-INR contract once the route's underlying fields convert | Yes — same release as whichever fields the route serves (mixed: Expense/Dashboard fields are Release 1, Bank/Cash Book fields are excluded from this batch) |

---

## Collection / KRA Engine Impact

**Which `Collection` fields feed KRA scoring:** `Collection.invoiceValueLakhs` and
`Collection.amountWithoutGstLakhs` are read directly by `src/lib/kra-engine.ts` in at least two
functions — `onTimeCollectionRate()` (lines ~95–125, computing an on-time-collection **ratio**:
`onTimeVal / totalValue`) and `totalCollectionsWithoutGst()` (lines ~305–315, computing a raw
**absolute** ₹L total). The ratio function is unit-agnostic (numerator and denominator are both
in the same unit, so the ratio is correct regardless of what unit `Collection` stores, as long as
it's consistent). **The absolute-total function is not unit-agnostic** — its result feeds
directly into `computeKRAProgress()` (line ~422: `const billing = await
totalCollectionsWithoutGst(employeeId);`), which at line ~432 divides it directly against a
human-entered KRA target (`billingTarget`) with **zero conversion factor today**:
`billPct = clamp((billing / billingTarget) * 100)`.

**Whether KRA targets are stored in Lakhs or INR:** Lakhs. Confirmed via
`prisma/seed-performance-defaults.ts`'s seeded `KRATemplateItem` rows — e.g. `REVENUE_TARGET`
`expectedTarget: 50, stretchTarget: 75` and `PIPELINE_VALUE` `expectedTarget: 300, stretchTarget:
500` for various role bands. These are small numbers consistent with a sales rep's revenue target
being entered as "50" meaning ₹50 Lakhs — entering a real-INR target like "5,000,000" is not how
these are configured, and the `kra-engine.ts` notes text (`` `Billing... ₹${billing.toFixed(1)}L /
${billingTarget.toFixed(1)}L` ``) explicitly labels both sides with an `"L"` (Lakhs) suffix,
confirming the intended unit on both sides of the comparison today.

**Whether KRA scoring should remain Lakhs-based for Sales metrics:** Recommended yes, for the
reason above — Lakhs is the natural, human-readable unit for entering a sales target
(`KRATemplateItem.expectedTarget`/`minimumTarget`/`stretchTarget`), and changing every manager's
target-entry convention to raw rupees is a separate UX decision from the Finance Decimal
migration this readiness check is scoped to. This recommendation needs explicit sign-off, not
just this document's default — see §10/§12.

**Whether Collection data should be converted to INR but KRA engine converts back to Lakhs at
the boundary, vs. migrating targets to INR in the same release:** This readiness check
recommends the former — convert `Collection`'s storage to actual INR (per the locked policy),
and have `kra-engine.ts` explicitly divide by 100,000 at the exact point it reads
`invoiceValueLakhs`/`amountWithoutGstLakhs` for any computation that compares against a
Lakhs-scaled target (i.e. `totalCollectionsWithoutGst()` and any future absolute-total function
— **not** the ratio function, which needs no change since both its numerator and denominator
come from the same field and the unit cancels out). Migrating every `KRATemplateItem` target to
raw INR in the same release is the higher-risk alternative — it touches a different, currently
correctly-functioning subsystem (KRA template configuration) purely as a side effect of the
Finance migration, which is broader blast radius than necessary.

**Whether KRA target configuration needs its own unit policy:** Yes, as a forward-looking
decision (not blocking this Finance migration): the moment any other Finance-sourced metric is
added to KRA scoring in the future, whoever builds it needs to know whether to enter Lakhs or
INR targets for it. This readiness check recommends documenting "KRA targets are Lakhs-based by
convention" as an explicit, permanent rule in `docs/PROJECT_MEMORY.md` or `docs/DATABASE.md`,
separate from the Finance Decimal migration tracked here — not actioned in this step.

**Default recommendation (as instructed) — adopted:**
- Finance `Collection` storage should move to actual INR (consistent with the locked §0 policy).
- KRA scoring may continue comparing in Lakhs, since sales targets are Lakhs-based by convention.
- `kra-engine.ts` must explicitly convert Collection-sourced INR values back to Lakhs
  (`/ 100000`) at the exact scoring boundary (`totalCollectionsWithoutGst()` and any other
  absolute-total reader), in the **same release** as `Collection`'s conversion — not before, not
  after.
- **`Collection` fields must not be converted until this kra-engine.ts boundary change is
  designed in detail and signed off** — this readiness check documents the *shape* of the
  required change (where, and what direction the division goes) but does not implement it, per
  this step's scope.

---

## No Half-Converted State Rule

**Finance unit migration must be atomic per model, per release.** For any model included in a
given release:

1. The data value transformation (×100,000 where applicable, per the table above)
2. The Prisma field type conversion (`Float` → `Decimal`)
3. API boundary behavior (response serialization, doc comments describing the unit)
4. UI labels/converters (every `lakhsToRupees()`/`fmtINRfromLakhs()`/`"L"`-suffix call site that
   reads from that model, per the inventory above)
5. Documentation/comments referencing that model's unit
6. Tests/manual before-after checks (per §9's pre-migration checklist)

**must all change together, in the same release.** Two specific failure modes are explicitly
prohibited:

- **A model must not store actual INR while its UI still multiplies by 100,000.** This would
  silently display every amount for that model 100,000× too large the moment the schema/data
  change ships, with no error or warning — the worst possible failure mode for a finance system.
- **A model must not store ₹ Lakhs while its API documentation or response labels it as INR.**
  This would be a silent contract lie to any API consumer, internal or external, and would
  reintroduce exactly the kind of unit ambiguity this whole policy exists to eliminate.

This rule is the reason `Expense`/`EmployeeAdvance`/`TravelClaim` (Release 1) and
`Payment`/`Collection` (Release 2) must each ship as one coordinated change per model — not as a
"convert the schema now, fix the UI later" two-step within the same model.

---

## 5. API Response Impact Review

| API Route | Fields Returned | Current Response Type | Decimal Impact | Required Change Later |
|---|---|---|---|---|
| `GET /api/finance/expenses` | `baseAmount`, `gstAmount`, `totalAmount` (per row); `totalExpenses`, `todayExpenses`, `pendingApprovalAmount`, `approvedExpenses`, `employeeClaimsPending`, `customerExpenses`, `gstInputAmount` (summary) | 2-decimal **string** via `fmtMoney()` (already wired to `src/lib/money.ts` internally per Step 3K) | Low — route already formats to string at the boundary; converting the underlying column to `Decimal` only changes what flows *into* `fmtMoney()`, not the response shape | None expected — `fmtMoney(moneyToNumberForDisplay(decimalValue))` already matches a Decimal input |
| `GET /api/finance/expenses/[id]` | `baseAmount`, `gstAmount`, `totalAmount`, `gst.taxableAmount`, `gst.totalGst` | 2-decimal **string** via `fmtMoney()` (Step 3K) | Low — same reasoning as above | None expected |
| `GET /api/finance/advances` | `amountLakhs`, `disbursedAmountLakhs`, `settledAmountLakhs`, `balanceLakhs` (per row); `totalThisMonth`, `pendingApproval`, `approved`, `outstanding`, `settled`, `rejected` (summary) | 2-decimal **string** via local `fmt()` (not yet wired to `money.ts` — Step 3K found no JS-level addition to wire) | Medium — every field here is a direct candidate field from §2; once the column is `Decimal`, `fmt()`'s `Math.round(v*100)/100` on a Decimal-typed value will need to change to a Decimal-aware path (`moneyToNumberForDisplay`/`moneyToString`) | `fmt()` must be updated to accept/convert a `Decimal` instead of a raw `number` at the point Prisma starts returning `Decimal` for these columns |
| `GET /api/finance/conveyance` | `ratePerKm`, `amountRupees` (raw, unformatted — passed through directly from the Prisma row) | **Raw number**, no formatting at all today | High — this route does not even call `fmtMoney()`; once the column is `Decimal`, the raw value will serialize as a Decimal object (not JSON-safe) unless explicitly converted | Must add `moneyToNumberForDisplay()` (or a string serializer) before conversion — currently the only one of the reviewed routes with zero money formatting in place |
| `GET /api/finance/bank-book` | `debit`, `credit`, `runningBalance`, summary `openingBalance`/`totalCredits`/`totalDebits`/`closingBalance` | 2-decimal **string** via `fmtMoney()` (wired to `money.ts` per Step 3I, but the underlying field is `Ledger.amountLakhs`, not one of this batch's 5 models) | None for this batch — Bank Book reads `Ledger`/`FinAccount`, which are explicitly excluded from this conversion (§1/§3) | N/A to this batch |
| `GET /api/finance/cash-book` | Same shape as Bank Book | Same | Same — reads `Ledger`/`FinAccount`, not this batch | N/A to this batch |
| `GET /api/finance/dashboard` | `summaryCards.*`, `cashFlow.*`, `bankFlow.*`, `expenseBreakdown[].amount`, `topExpenseCategories[].amount`, `monthlyExpenseTrend[].amount` | 2-decimal **string** via `fmtMoney()` (wired to `money.ts` per Step 3L) | Low for the `Expense`-sourced figures (already Decimal-safe internally); Medium for `EmployeeAdvance.balanceLakhs`/`TravelClaim.amountLakhs`-sourced figures (`advOutstanding`, `claimsPending`), which are direct `_sum` pass-throughs not yet wired to `money.ts` | Those two pass-through summary fields would need the same boundary treatment once their source columns become `Decimal` |
| `GET /api/collections` | `invoiceValueLakhs`, `amountWithoutGstLakhs`, `amountReceivedLakhs` (raw Prisma row fields, returned via `Number(body.field)` on write, untouched passthrough on read) | **Raw number**, no formatting at all | High — same issue as Conveyance: zero formatting layer today, so a Decimal column would serialize unsafely without an explicit conversion | Must add a serialization step before conversion; this route also **writes** these fields (`POST`), so the write-side `Number(body.invoiceValueLakhs)` parsing would also need to move to `parseMoneyInput`/`toMoneyDecimal` |
| `GET /api/collections/[id]` (PUT/DELETE) | Same fields, read-back on the PUT response | Same raw-number pattern | High — same as above | Same as above |
| `GET /api/payments`, `GET /api/payments/today` | `amountLakhs` (per payment row, via `paymentsToday()` in `src/lib/payments.ts`) | **Raw number** — `round2()` applied, not `fmtMoney()`-formatted to a string | High — `src/lib/payments.ts`'s `round2()`/epsilon-comparison pattern is the exact anti-pattern the whole Decimal Migration Plan (§1/§6) calls out for retirement; this is the most directly affected write+read path in the entire batch | `round2()` and the `received + 0.001 >= invoice` epsilon comparison in `syncCollectionTotals()` should be retired in favor of Decimal-native comparison once `Payment.amountLakhs`/`Collection.invoiceValueLakhs` are `Decimal` — this is **explicitly called out** in the original migration plan (§6) as work for the conversion step itself, not before |
| Customer/vendor payment-related lookups | No dedicated payment-lookup route found under `/api/customers/*` or `/api/masters/vendors/*` returning a money field from this batch | N/A | N/A | None identified — confirmed via search that no such route exists today |

---

## 6. UI Impact Review

| UI Area | Consumes Fields From | Current Expectation | Risk | Required Change Later |
|---|---|---|---|---|
| Finance Dashboard (`FinanceDashboardClient.tsx`) | `GET /api/finance/dashboard` | Consumes 2-decimal **strings**, re-parses via `Number(t.amount)`/`Number(c.amount)` for chart values and max-scaling | Low — already tolerant of a string input; `Number("123.45")` works identically whether the string came from a `Float` or `Decimal` source | None expected, since the route already serializes to string before this component sees it |
| Bank Book (`bank-book` components) | `GET /api/finance/bank-book` | Consumes strings for display, no business-logic math observed in the client beyond display | Low | None expected (and out of this batch's scope — Bank Book reads `Ledger`, not these 5 models) |
| Cash Book (`cash-book` components, incl. `CashTransferPanel`/`CashReconciliationPanel`) | `GET /api/finance/cash-book` | Same string-display pattern | Low | None expected; out of this batch's scope |
| Expense list/detail (`ExpenseForm.tsx`, `GSTInputSection.tsx`, `CustomerExpensePanel.tsx`, `ExpenseEntryForm.tsx`) | `GET /api/finance/expenses` (+`[id]`); also POSTs new expenses (form inputs as plain numbers) | Reads expect strings (display); write forms collect plain `number`/string-typed form fields and send as JSON numbers | Medium — the **write** side (`ExpenseEntryForm.tsx`/`ExpenseForm.tsx`) is out of this readiness check's read-only scope, but is the side that will need attention when a future Finance write API is built against `Decimal` columns | Documented for the future write-API step, not actioned here |
| Advance views (`AdvancesClient.tsx`) | `GET /api/finance/advances` | Reads `amountLakhs`/`balanceLakhs` as **typed `string`** fields (`amountLakhs: string`, `balanceLakhs: string` in the component's own type), immediately `Number(...)`-converts for comparisons (`Number(a.balanceLakhs) > 0`) and display (`fmtLakhs(...)`) | Medium — consistent string-then-Number pattern, low UI risk; but this is the route flagged Medium in §5 since its API layer (`fmt()`) isn't yet Decimal-safe internally | UI itself needs no change; the upstream API route does (see §5) |
| Conveyance views (`TravelEntryForm.tsx`, `TravelEntryDrawer.tsx`) | `GET /api/finance/conveyance` | Reads `ratePerKm`/`amountRupees` as **raw numbers** directly (no string parsing needed, since the API never formatted them) | High — mirrors the High risk flagged for the API route in §5; the UI's current "just use the number" assumption will break the moment the API starts returning a Decimal-shaped value without an explicit conversion | API-side serialization must be added (§5) before this UI continues to work unmodified |
| Collections UI (`CollectionsClient.tsx`) | `GET /api/collections`, `PUT/DELETE /api/collections/[id]` | Reads/writes raw numbers directly, including the write-form inputs that feed `POST`/`PUT` body fields | High — same reasoning as Conveyance; this is the most write-exposed UI in the batch (active create/update/delete flows on `Collection`/soft-delete already verified live in Step 3D/3E) | API-side serialization and write-path parsing must both be addressed; this UI has the largest blast radius of any reviewed surface in this batch |
| Payment UI | No dedicated stand-alone "Payment" UI page was found; payments are recorded through the Collections detail flow and surfaced via `paymentsToday()` for dashboard feeds | Raw numbers, same as Collections | High | Same as Collections — tracked together since they share `src/lib/payments.ts` |
| Reports | `src/app/finance/reports/` exists as a route but was not found wired to a real data API in this review (confirmed mock-data-only per `docs/PROJECT_MEMORY.md`'s Phase 2 UI notes) | N/A — mock data, no live API call | None today | Re-review once Reports moves off mock data |

---

## 7. Migration SQL Risk Assessment

- **MySQL `ALTER COLUMN` from `FLOAT`/`DOUBLE` to `DECIMAL` rewrites every row's stored value** —
  this is a data-rewriting operation, not a metadata-only change like the additive soft-delete
  `ADD COLUMN` work in Step 3B. It can change how an out-of-range or imprecise existing value is
  stored, and on a large table it locks/rewrites the table during the `ALTER`.
- **Existing values must be compared before/after** — a per-model `SUM()` of the converted column,
  plus a spot-check of the cached fields (`EmployeeAdvance.balanceLakhs`,
  `Collection.amountReceivedLakhs`) recomputed from their source ledger, both immediately before
  and immediately after each `ALTER COLUMN`.
- **Hostinger has no shadow-database privilege** (`P3014`, the same limitation every prior
  schema-touching step in this project has hit — see `docs/RBAC_MIGRATION_TRACKER.md`'s Step 3B
  row) — so `npx prisma migrate dev` cannot be used directly. The established workaround is:
  `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` to
  diff the live dev DB against the new schema (no shadow DB required), then a one-off
  `mariadb`-driver apply script (hard-coded dev-DB-name guard, per the Step 3B precedent), then
  `npx prisma migrate resolve --applied <name>` → `npx prisma generate` → restart the dev server.
- **Migration SQL must be reviewed manually before applying.** Step 3B's own diff surfaced
  unrelated pre-existing schema drift that had to be manually excluded before applying; the same
  discipline must apply to any Decimal `ALTER COLUMN` diff — review every statement, apply only
  the intended `ALTER COLUMN` statements for the approved field list in §2.
- **No `DROP` or other destructive statement should appear in the diff.** A `Float` → `Decimal`
  type change should only ever emit `ALTER TABLE ... MODIFY COLUMN ...` (or equivalent) statements
  for the columns in §2 — anything resembling `DROP COLUMN`/`DROP TABLE` in the generated diff is a
  sign the diff also picked up unrelated drift and must not be applied as-is.
- **A fresh dev DB backup must be taken before applying any `ALTER COLUMN`.** Per Step 3G §8, no
  Decimal conversion should run against `u686730471_caveodev` (or, far later, production) without
  a backup taken immediately before.
- **Production migration must use `prisma migrate deploy` with manually reviewed SQL only** — the
  same dev-first discipline this project has followed for every prior schema change (Step 3B and
  the standing `CLAUDE.md` rule requiring explicit confirmation before any production change)
  applies here, with no exception for Decimal conversion.

---

## 8. Recommended First Decimal Conversion Batch

> **Superseded in part by §0.** The batch composition below (Option A) is still the recommended
> *grouping*, but it no longer describes a schema-only change. Per §0, every field in this batch
> genuinely stores ₹ Lakhs today (verified, not assumed) and the new policy requires Finance
> fields to store actual INR — so "converting" these fields now means **(a)** a value
> transformation (multiply every existing stored row by 100,000), **(b)** the Decimal column-type
> change, and **(c)** updating every UI converter (`lakhsToRupees()`/`fmtINRfromLakhs()`, 9+
> call sites) and API doc comment that currently assumes a Lakhs-denominated input — all as one
> coordinated change, not three separate steps that could be done independently. This is a larger
> piece of work than the original Step 3G/3N framing assumed, and is reflected in the revised
> Final Recommendation (§11).

**Recommendation: Option A — Conservative first batch (Expense, EmployeeAdvance, TravelClaim
money/rate fields only). Defer Payment and Collection to a second batch.**

Reasoning:
- `Payment` and `Collection` are **already live and actively written** today — `Collection` has
  working create/update/soft-delete flows (verified live in Steps 3D/3E), and `Payment` is
  written on every collection recorded through `src/lib/payments.ts`'s `recordPayment()`/
  `applyAdvance()`, which also runs the `round2()`/epsilon-comparison workaround this whole effort
  exists to retire. Converting these two columns means immediately addressing that workaround in
  the same step (per §6 of the original migration plan: "once `Payment.amountLakhs`/
  `Collection.invoiceValueLakhs` are `Decimal`, the rounding and epsilon comparison become
  unnecessary and should be removed in that implementation step") — i.e. Payment/Collection
  conversion is **inherently bundled with a write-path code change**, not a schema-only change like
  the other three models can mostly be.
- `Expense`, `EmployeeAdvance`, and `TravelClaim` have **no write APIs at all yet** for their core
  money fields (confirmed: no `POST`/`PUT` route was found for `Expense`/`EmployeeAdvance`/
  `TravelClaim` money fields beyond the `EmployeeAdvance` create endpoint, which only writes
  `amountLakhs` — read-only flows otherwise) — converting their columns is closer to a pure
  schema+read-path change, with far less write-side blast radius than Payment/Collection.
- This also matches the original migration plan's own §9 sequencing: "Step 3I — Convert
  `Expense`/`EmployeeAdvance`/`TravelClaim`... Step 3J — Convert `Payment`/`Collection`... and
  retire the `round2()`/epsilon-comparison workaround" — i.e. the plan already recommended this
  exact split, independent of this readiness check's own findings. (Note: those original-plan step
  numbers 3I/3J predate, and are unrelated to, this project's actual Step 3I/3J dry-run-sweep work,
  which used the same numbers for the money-helper wiring sequence — the original plan's lettered
  sequencing in §9 was never executed in that numbering.)
- Conservative-first also lets the team validate the full migration mechanics (diff → manual review
  → apply script → resolve → generate → before/after totals) on lower-stakes models before
  applying the same mechanics to `Payment`/`Collection`, where a mistake would touch live
  collections/payments data.

**Update (Step 3O, 2026-06-22): the live dev data profile is now complete (§4) and found no
data-quality blockers** — `Expense`/`TravelClaim` have 0 rows in dev (nothing to validate a
transform against yet, but also nothing to block on), and `EmployeeAdvance`'s 1 row is clean.
This batch is relabelled **Release 1** going forward (see the Transformation Design table above),
and `Payment`/`Collection` are relabelled **Release 2**, with `Collection` additionally gated on
the KRA-engine boundary-change decision (see Collection / KRA Engine Impact above and §12).

---

## 9. Pre-Migration Checklist

For the next implementation step (whichever batch is approved):

- [x] Dev DB confirmed (`DATABASE_URL` → `u686730471_caveodev`, not production)
- [x] Data profile (§4) actually completed — done in Step 3O; clean, no blockers found
- [ ] **(New, Step 3O)** Lakhs-to-INR value-transformation script designed, reviewed, and
      tested against the populated fields (`EmployeeAdvance`, `Payment`, `Collection`) — and a
      smoke-test plan agreed for `Expense`/`TravelClaim`, which have no existing dev rows to
      validate against
- [ ] **(New, Step 3O)** Every UI converter/API-comment in the inventory above updated in the
      same release as its source model — verified via the No-Half-Converted-State checklist,
      not just "the schema migrated"
- [ ] **(New, Step 3O, Collection only)** `kra-engine.ts`'s `totalCollectionsWithoutGst()`
      boundary conversion (`/ 100000`) designed, reviewed, and tested before `Collection` ships
- [ ] Candidate fields explicitly approved (§2 list, or a subset, signed off by name)
- [ ] Serialization decision confirmed (§10 — string vs. number at each API boundary)
- [ ] UI impact accepted (§6 — particularly the High-risk Conveyance/Collections/Payment surfaces)
- [ ] Migration SQL reviewed and confirmed additive/`ALTER`-only — no `DROP` statements present
- [ ] Fresh dev DB backup taken immediately before applying
- [ ] Prisma client regenerated (`npx prisma generate`) after applying
- [ ] `npx tsc --noEmit` / `npm run build` pass after regeneration
- [ ] Before/after totals compared per model (`SUM()` of the converted column + cached-field
      spot-check) and signed off by a named approver

---

## 10. Decisions Needed Before Schema Conversion

> **Step 3O update:** the live data profile (§4) is now complete — that specific blocker is
> resolved. The decisions below are still open and still gate implementation; none have been
> signed off by this document alone. See §12 for the consolidated sign-off table.

- **(New, per §0 policy update)** Who owns and reviews the value-transformation script that
  multiplies every existing Finance `*Lakhs` row by 100,000 before/alongside the Decimal column
  change? This is a data-rewriting operation distinct from, and riskier than, the `ALTER COLUMN`
  type change itself — it needs its own before/after `SUM()` comparison (the post-transform sum
  should equal the pre-transform sum × 100,000, exactly, for every row). **Still open** — no
  owner named in this step.
- **(New, per §0 policy update)** How should `src/lib/kra-engine.ts`'s consumption of
  `Collection.invoiceValueLakhs` be handled? Options: (a) update every KRA-engine call site to
  divide by 100,000 after Collection converts, (b) keep a separate Lakhs-denominated cached
  column on `Collection` specifically for KRA-engine consumption, or (c) treat KRA scoring math
  as out of scope and explicitly leave `Collection`'s conversion blocked until this is resolved.
  **This readiness check now recommends option (a)** — see Collection / KRA Engine Impact above —
  but this is a recommendation, not a sign-off; explicit approval is still required before
  `Collection` converts.
- **(New, per §0 policy update)** Should `TravelClaim.amountLakhs` be deprecated/dropped once
  `TravelClaim.amountRupees` (already real INR) becomes the canonical field, or kept as a
  read-only derived/cached mirror? §0's field table recommends deprecation but this needs
  explicit sign-off since it's a schema change, not just a unit-semantics change.
- **(New, per §0 policy update)** Should the 9+ UI converter functions
  (`lakhsToRupees`/`fmtINRfromLakhs` in `FinanceDashboardClient.tsx`, `VouchersClient.tsx`,
  `expenses/data.ts`, `ClaimsClient.tsx`, `bank-book/data.ts`, `AdvancesClient.tsx`, plus the
  `* 100_000` inline conversions in `ApprovalInboxPage.tsx`/`FinanceApprovalsClient.tsx`) be
  removed in the same implementation step as the schema/value change, or kept temporarily as
  identity/no-op functions during a transition window? A "convert the data and the schema but
  leave the UI still multiplying by 100,000" half-state would silently display every Finance
  amount 100,000× too large — this must not happen, so the UI change cannot be deferred past the
  same release as the data/schema change.
- Should the first batch include `Payment` and `Collection`, or only `Expense`/`EmployeeAdvance`/
  `TravelClaim`? This readiness check recommends the latter (§8) — needs explicit sign-off.
- Should APIs continue returning `number` (current behavior, via `fmtMoney()`/`fmt()`/raw
  passthrough) during the transition, or move to `string` immediately upon conversion? This
  readiness check found 3 of the 7 reviewed read routes already return Decimal-safe-internally
  2-decimal **strings**; 2 routes (Conveyance, Collections) return **raw unformatted numbers**
  today and would need an explicit serialization decision either way.
- Should persisted posting APIs (a future `POST /api/finance/expenses`, advance disbursement,
  travel-claim approval, payment recording) return `string` once built, per the original plan's
  §5 recommendation ("prefer returning money as a string... for finance-accuracy-sensitive
  responses")? This is a decision for whoever designs those write APIs, not something this
  read-only readiness check can settle on its own.
- How should existing values with more than 2 decimal places (or more than 4dp for `ratePerKm`)
  be rounded during the `ALTER COLUMN`, if any are found once §4 is actually run? Snap to the
  target scale at migration time, or migrate as-is and let only newly-written values benefit?
- Who signs off on the before/after `SUM()` totals for each model once the migration is actually
  applied? A named approver (or role) should be agreed before implementation starts.
- Should `TravelClaim.ratePerKm` (and the source `ConveyancePolicy.ratePerKm`, if it's ever
  brought into a later batch) use `Decimal(10,4)` as recommended in §2, or a different scale?
- Should `Expense.gstRate` (and other tax/percentage fields) be converted in this batch or left for
  later, per §3's exclusion? This readiness check recommends leaving them for later — needs
  explicit confirmation.

---

## 11. Final Recommendation

> **Revised following Step 3O's completed data profile and transformation design
> (2026-06-22).** Step 3N identified two blocking grounds; Step 3O resolves the first and
> produces a concrete design for the second, but does not yet obtain the explicit sign-offs that
> design still requires. See §12 for the consolidated, field-by-field sign-off table.

- **Schema conversion is still BLOCKED — not ready to implement — but the nature of the block has
  changed:**
  1. **Data quality is now confirmed acceptable (§4, resolved in Step 3O).** All populated fields
     (`EmployeeAdvance`, `Payment`, `Collection`) are clean — zero negative values, zero
     suspiciously large values, and every >2dp count is fully explained by a known formula
     (GST back-calculation), not by bad data. `Expense`/`TravelClaim` have zero rows in dev today,
     so there is nothing to validate a transform against for those two models specifically — flag
     this as a smoke-test gap, not a data-quality failure.
  2. **The unit-transformation is now designed, but not yet signed off.** The Finance
     Lakhs-to-INR Transformation Design table, the Converter/UI inventory, the Collection/KRA
     Engine Impact analysis, and the No-Half-Converted-State rule (all added in Step 3O, above)
     together describe exactly what must change, where, and in what order. **What remains is
     explicit approval** — of the Release 1/Release 2 split, of the KRA-engine boundary-division
     recommendation, of the `TravelClaim.amountLakhs` deprecation question, and of who signs off
     on before/after totals. None of that approval has been granted by this document alone; it is
     a readiness check, not an authorization.
- **Release 1 (recommended, conservative): `Expense.amountLakhs`/`gstAmountLakhs`,
  `EmployeeAdvance.amountLakhs`/`disbursedAmountLakhs`/`settledAmountLakhs`/`balanceLakhs`, and
  `TravelClaim.ratePerKm`/`amountRupees`/`amountLakhs`** — 9 fields across 3 models. Per the
  Transformation Design table, `ratePerKm`/`amountRupees` need no value transformation (already
  real INR); the other 7 need the ×100,000 transform. **Release 2 (deferred):
  `Payment.amountLakhs`, `Collection.invoiceValueLakhs`/`amountWithoutGstLakhs`/
  `amountReceivedLakhs`** — 4 fields across 2 models, additionally gated on the KRA-engine
  boundary-change decision for `Collection` specifically.
- **Route/UI risk that needs mitigation before conversion**: `GET /api/finance/conveyance` and
  `GET /api/collections`(`+[id]`) currently return raw, unformatted numbers with zero
  Decimal-safe serialization layer — both were flagged High risk in §5/§6 and would need an
  explicit `moneyToNumberForDisplay()` (or string) boundary added *before* their underlying
  columns become `Decimal`, or their JSON responses would start serializing Decimal objects
  unsafely. `GET /api/finance/advances` was flagged Medium for the same underlying reason (its
  `fmt()` formatter isn't yet wired through `src/lib/money.ts`, unlike Expense/Dashboard). These
  findings are unchanged by §0/Step 3O — they apply on top of the unit-transformation work, not
  instead of it.
- **Exact next step name: "Step 3P — Sign-off on the §12 decision table, then implement Release 1
  (`Expense`/`EmployeeAdvance`/`TravelClaim`) as one atomic change."** Step 3P should (a) obtain
  explicit approval on every row of §12's sign-off table that is not already marked Approved;
  (b) write and test the value-transformation script for Release 1's populated field
  (`EmployeeAdvance`) plus a smoke-test data set for the two currently-empty models
  (`Expense`/`TravelClaim`); (c) implement the schema/data/API/UI change as one coordinated
  release per the No-Half-Converted-State rule; and (d) only then consider scheduling Release 2
  (`Payment`/`Collection`) as a separate, later step once its own KRA-engine sign-off is in hand.

---

## 12. Step 3O Scope Sign-Off

This table is a decision ledger, not an approval — every "Recommended" status reflects this
readiness check's own analysis and still requires an explicit human sign-off before it can be
marked Approved. Nothing in this table authorizes any schema, data, API, or UI change.

| Decision | Final Value | Status |
|---|---|---|
| Money unit policy | Lakhs restricted to CRM Lead/Opportunity/pipeline-estimate fields; all Finance/Accounting fields must use actual INR (§0) | **Approved** — locked by explicit business-rule instruction prior to this step |
| Live data profile | Completed in Step 3O (§4) — `Expense`/`TravelClaim`: 0 rows; `EmployeeAdvance`: 1 clean row; `Payment`: 1 clean row; `Collection`: 94 rows, clean (no negatives, no suspicious-large, >2dp counts fully explained by GST formula) | **Approved** — data quality confirmed acceptable for every populated field |
| Release 1 scope | `Expense.amountLakhs`/`gstAmountLakhs`, `EmployeeAdvance.amountLakhs`/`disbursedAmountLakhs`/`settledAmountLakhs`/`balanceLakhs`, `TravelClaim.ratePerKm`/`amountRupees`/`amountLakhs` (9 fields, 3 models) | **Approved with notes** — grouping recommended and data-clean, but the value-transformation script itself is not yet written/tested (no existing `Expense`/`TravelClaim` rows to test against), so implementation cannot start until that gap closes |
| Payment/Collection (Release 2) status | Deferred — bundled with `src/lib/payments.ts` `round2()`/epsilon-comparison retirement; `Collection` additionally gated on the KRA-engine boundary decision below | **Blocked** — KRA/Collection decision is recommended but not signed off (per this step's own rule: "if KRA/Collection decision is unresolved, mark Payment/Collection blocked") |
| KRA scoring decision | `Collection` storage moves to actual INR; `kra-engine.ts`'s `totalCollectionsWithoutGst()` (and any future absolute-total reader) explicitly divides by 100,000 at the scoring boundary; KRA targets (`KRATemplateItem.*Target`) stay Lakhs-based by convention; the ratio function (`onTimeCollectionRate()`) needs no change | **Approved with notes** — this readiness check's recommendation, not yet signed off by a named approver; blocks `Collection`'s Release 2 conversion until approved |
| API response policy | Continue returning `number`/2-decimal-string via the existing `fmtMoney()`/`fmt()`/`money.ts` boundary pattern during the transition; no immediate move to an all-`string` contract | **Recommended** — consistent with the pattern already established in Steps 3I–3L; not yet explicitly ratified for the unit-transformation context specifically |
| UI converter update policy | Every `lakhsToRupees()`/`fmtINRfromLakhs()`/`"L"`-suffix/inline-`*100_000` call site updates in the **same release** as its source model converts — no transition window, no temporary identity functions (per the No-Half-Converted-State rule) | **Approved** — directly follows from the locked §0 policy and the explicit rule added in this step; not optional |
| Rounding policy | Existing values transform via exact `value * 100000` (no rounding ambiguity introduced by multiplication); `Decimal(18,2)` rounding (half-up) applies only at the final posting/display boundary, consistent with the original Step 3G §6 calculation rules — no snap-to-scale "cleanup" of historical values beyond what the `* 100000` transform itself produces | **Recommended** — not yet explicitly signed off |
| `TravelClaim.amountLakhs` deprecation | Recommended deprecation once `amountRupees` is canonical, since both would otherwise store the same fact in two units after conversion | **Recommended** — explicit schema-change sign-off still required (§10) |
| Decimal schema conversion — overall | Not implemented this step (by design) | **Blocked** — Release 1 blocked on writing/testing the transformation script (no existing data to test against); Release 2 blocked on the KRA-engine sign-off above, per this step's "if KRA/Collection decision is unresolved, mark Payment/Collection blocked" instruction. **No schema conversion is approved to begin as a result of this document.** |

---

## Implementation Note (Step 3N, 2026-06-22)

- Critical Finance Decimal readiness check completed for `Expense`, `EmployeeAdvance`,
  `TravelClaim`, `Payment`, `Collection` — 13 candidate money/rate fields inventoried (§2), with
  policy/CRM/Voucher/Ledger fields explicitly excluded and documented (§3).
- Live dev data profiling was attempted (read-only Prisma `findMany` aggregation, confirmed
  `DATABASE_URL` pointed at `u686730471_caveodev` before any query) but could not complete — DB
  access was denied from this environment on every attempt. The profiling methodology and an
  empty results table are documented in §4 so the check can be re-run and slotted in directly.
  The temporary profiling script was deleted; no scratch files remain in the repository.
- API response impact reviewed across 11 routes (§5); UI impact reviewed across 8 areas (§6) —
  `GET /api/finance/conveyance` and the Collections routes/UI were flagged as the highest-risk
  surfaces (raw unformatted numbers, no Decimal-safe boundary yet).
- First-batch recommendation recorded: conservative Option A (`Expense`/`EmployeeAdvance`/
  `TravelClaim` only), deferring `Payment`/`Collection` to a second batch — §8.
- **No Prisma schema field was converted, no migration was generated or applied, no API route or
  UI component was modified, and no database row was read, written, or altered** (the only DB
  interaction attempted was rejected at the connection-auth stage before any query executed).

## Implementation Note (Money Unit Policy update, 2026-06-22, before Step 3O)

- Added §0 Money Unit Policy Decision: CRM Lead/Opportunity/pipeline-estimate fields may remain
  Lakhs-based; all Finance/Accounting fields must use actual INR. Verified, field-by-field, that
  every Finance `*Lakhs` candidate field genuinely stores ₹ Lakhs today (via dev seed data, API
  doc comments, and 9+ independent UI converters) — none are ambiguous, and none are misleadingly
  named; the naming is accurate for a unit the business has now decided Finance must stop using.
  `TravelClaim.ratePerKm`/`amountRupees` are the exception — already real INR/real ₹-per-km.
- Flagged a new cross-cutting risk not addressed by the policy text as given:
  `Collection.invoiceValueLakhs`/`amountReceivedLakhs` are consumed directly by
  `src/lib/kra-engine.ts` for employee KRA performance scoring — a non-Finance domain the policy
  doesn't mention. Converting `Collection`'s unit without updating the KRA engine in lockstep
  would silently corrupt KRA achievement-vs-target math by a factor of 100,000.
- Revised §8/§10/§11: schema conversion remains BLOCKED, now on two independent grounds — the
  unresolved §4 data-quality gap, and the newly-identified need to design (not yet implement) a
  Lakhs→INR value transformation, synchronized UI/API updates, and the Collection/KRA-engine
  decision. Step 3O's scope was expanded accordingly (still no implementation).
- **No schema/runtime behavior changed by this update.** Documentation only.

## Implementation Note (Step 3O, 2026-06-22)

- **Live dev data profile completed** (§4) — run from a DB-accessible environment after
  confirming `DATABASE_URL` pointed at `u686730471_caveodev`. All 13 candidate fields profiled
  via a read-only Prisma `findMany` + in-JS aggregation script (deleted immediately after,
  confirmed via `git status`). Result: **clean, no data-quality blockers.** `Expense`/
  `TravelClaim` have 0 rows in dev; `EmployeeAdvance` (1 row, ₹0.5L), `Payment` (1 row, ₹1.61L),
  and `Collection` (94 rows, ₹0.003L–₹77.88L) are all clean — zero negatives, zero suspiciously
  large values, and every >2dp scale-exceed count fully explained by the GST back-calculation
  formula rather than bad data.
- **Finance Lakhs-to-INR Transformation Design documented** — a field-by-field table specifying
  the exact transformation (`value * 100000` for genuine Lakhs fields, no multiplication for
  `TravelClaim.ratePerKm`/`amountRupees`, which are already real INR), target Decimal type, and
  Release 1/Release 2 placement for all 13 candidate fields.
- **Code converter/UI-label/API-comment inventory completed** — every `lakhsToRupees()`/
  `fmtINRfromLakhs()` call site, the Collections UI's literal `"L"`-suffix labels, the inline
  `* 100_000` conversions in the Approvals pages, `vouchers/[id]/route.ts`'s `amountInWords()`,
  `src/lib/kra-engine.ts`'s direct Lakhs-scale reads, `src/lib/payments.ts`'s `round2()`/epsilon
  workaround, and every affected API route's doc comment — with the exact required future change
  and same-release requirement for each. Nothing in this inventory was modified.
- **Collection / KRA Engine Impact documented** — confirmed `kra-engine.ts`'s
  `totalCollectionsWithoutGst()` (absolute total) is the risk surface, not `onTimeCollectionRate()`
  (a ratio, unit-agnostic); confirmed KRA targets (`KRATemplateItem.*Target`) are genuinely
  Lakhs-based via `prisma/seed-performance-defaults.ts`. Recommended: convert `Collection` to
  actual INR, keep KRA targets Lakhs-based, and have `kra-engine.ts` explicitly divide by 100,000
  at the scoring boundary — flagged as a recommendation requiring sign-off, not yet approved.
- **No-Half-Converted-State rule added** — codifies that data transformation, schema type change,
  API behavior, UI converters, and documentation must all change together per model/release; a
  model must never store INR while its UI still multiplies by 100,000, or vice-versa with a
  mismatched API label.
- **§12 Step 3O Scope Sign-Off table added** — consolidates every decision into one ledger.
  Result: **Decimal schema conversion remains BLOCKED.** Release 1 (`Expense`/`EmployeeAdvance`/
  `TravelClaim`) is "Approved with notes" pending a tested transformation script; Release 2
  (`Payment`/`Collection`) is explicitly marked **Blocked**, since the KRA-engine decision is
  recommended but not yet signed off, per this step's own instruction to block Payment/Collection
  when that decision is unresolved.
- **No Prisma schema field was converted, no migration was generated or applied, no API route or
  UI component was modified, no Lakhs value was multiplied into INR, and no database row was
  written or altered.** The only database interaction was read-only `SELECT`-equivalent
  aggregation via Prisma, immediately followed by deletion of the temporary script.

---

## Implementation Note (Step 3P, 2026-06-22)

- **Release 1 sign-off plan created** —
  `docs/database/DECIMAL_RELEASE1_SIGNOFF_PLAN.md`. Restates and locks the 9-field Release 1
  scope (`Expense.amountLakhs/gstAmountLakhs`,
  `EmployeeAdvance.amountLakhs/disbursedAmountLakhs/settledAmountLakhs/balanceLakhs`,
  `TravelClaim.amountLakhs/amountRupees/ratePerKm`) with per-field status (Approved /
  Approved with notes), and the Release 1 exclusions table (Payment, Collection, Voucher/
  Ledger, CRM Lead/Opportunity, KRA targets, policy thresholds) with reasons and future
  release placement.
- **Atomic Lakhs-to-INR migration sequence documented** — a 12-step Step 3Q implementation
  order (smoke data → snapshot → schema type change → reviewed migration SQL → value
  transformation SQL → dev-only apply → client regen → API boundary update → UI converter
  update → before/after comparison → validation → documentation), explicitly required to land
  as one atomic release per the No-Half-Converted-State Rule.
- **Smoke-test data requirement documented** — `Expense` and `TravelClaim` have 0 rows in dev
  (confirmed again in Step 3O's live profile); the sign-off plan specifies exact planned sample
  values (two `Expense` rows, one `TravelClaim` row) and their expected post-transformation INR
  values, to be inserted (dev-only) in Step 3Q, not this step.
- **API boundary and UI update plans documented** for `/api/finance/expenses`,
  `/api/finance/expenses/[id]`, `/api/finance/advances` (not yet wired to `src/lib/money.ts` —
  flagged as required in Step 3Q), `/api/finance/conveyance`, and the corresponding UI files
  (`ExpenseRegisterClient.tsx`, `ClaimsClient.tsx`, `AdvancesClient.tsx`,
  `FinanceApprovalsClient.tsx`'s shared approval-context renderer, and confirmation that the
  mock-data `conveyance` UI doesn't touch the real `TravelClaim` field yet).
- **Payment/Collection remains deferred** — explicitly excluded from Release 1 scope per §3 of
  the new plan; Release 2 stays gated on the KRA-engine sign-off recorded in this document's
  §"Collection / KRA Engine Impact" and §12.
- **No Prisma schema field was converted, no migration was generated or applied, no API route or
  UI component was modified, no Lakhs value was multiplied into INR, and no database row was
  written or altered.** This was a documentation/planning step only.

---

## Implementation Note (Step 3Q, 2026-06-22)

**Step 3Q completed for Release 1.** All 9 Release 1 fields (`Expense.amountLakhs/
gstAmountLakhs`, `EmployeeAdvance.amountLakhs/disbursedAmountLakhs/settledAmountLakhs/
balanceLakhs`, `TravelClaim.amountLakhs/amountRupees/ratePerKm`) are now `Decimal` and store
actual ₹ INR on the dev database (`u686730471_caveodev`) — confirmed via an 11/11-pass
before/after verification in `docs/database/DECIMAL_RELEASE1_MIGRATION_RESULTS.md`. API
boundaries and UI converters for `Expense`/`EmployeeAdvance`/`TravelClaim` were updated in the
same release per the No-Half-Converted-State Rule. `Payment`/`Collection`/`Voucher`/`Ledger`/
CRM Lead-Opportunity/KRA targets remain untouched — Release 2 stays Blocked. Full detail:
`docs/database/DECIMAL_RELEASE1_SIGNOFF_PLAN.md` (Implementation Note, Step 3Q) and
`docs/database/DECIMAL_RELEASE1_MIGRATION_RESULTS.md`.
