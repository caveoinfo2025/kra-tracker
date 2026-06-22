# Decimal Conversion Readiness Check

> **Step 3N — data-audit and decision-lock step only.** No Prisma schema change, no migration,
> no API code change, no UI code change, no Float field converted, no `prisma migrate` run, no
> database data altered. This document assesses whether the 5 critical Finance models
> (`Expense`, `EmployeeAdvance`, `TravelClaim`, `Payment`, `Collection`) are ready for a future
> Decimal schema conversion — it does not perform that conversion.

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

**This section could not be completed in this environment.** A read-only profiling script
(Prisma `findMany` over each candidate field plus in-JS min/max/null/negative/scale-exceed
counting — see methodology below) was written and run against `DATABASE_URL`, which was first
confirmed to point at the dev database `u686730471_caveodev` (not production) before any query
was attempted. Every connection attempt — both via a direct `mariadb` driver connection and via
the app's own `src/lib/prisma.ts` client (identical connection logic the running app uses) — was
rejected with `Access denied for user 'u686730471_devuser'@'<this-environment's-IP>'`, repeated
twice to rule out a transient blip. This is consistent with `CLAUDE.md`'s own note that the dev
DB requires the connecting IP to be allow-listed in hPanel → Remote MySQL — this sandboxed
environment's egress IP is evidently not on that allowlist. No query reached the database; no
data was read, altered, or even successfully selected. The temporary profiling script was deleted
immediately after the access-denied result (no scratch files left in the repo — confirmed via
`git status`).

**Profiling methodology (documented for re-run from a whitelisted machine, e.g. the next session
with dev-DB access, or directly via `npx tsx` from a machine already permitted in hPanel):**
- For each money field in §2, count total rows, `NULL` rows, `MIN`/`MAX`, and rows where the value
  is negative.
- **Scale-exceed approximation**: since the column is `Float`/`DOUBLE`, there is no native
  "decimal places" metadata to query. The standard approximation is `ROUND(value * 100) / 100 <>
  value` for 2dp money fields (`* 10000` / `/10000` for the 4dp `ratePerKm` field) — any row where
  rounding to the target scale changes the value is flagged as "exceeds expected precision," and
  up to 5 sample `(id, value)` pairs are captured for manual inspection. This is an approximation,
  not exact, because `DOUBLE` itself cannot represent most decimal fractions exactly — a value
  that was written as exactly `"123.45"` may already differ from `123.45` by a tiny binary epsilon,
  which this check would (correctly) flag, even though the row's *intended* value has no
  third-decimal-place digit. A small number of "false positive" flags of this kind should be
  expected and is not itself evidence of bad data — only large/systematic counts, or counts on the
  cached-balance fields specifically (`EmployeeAdvance.balanceLakhs`, `Collection.
  amountReceivedLakhs`), would indicate a real problem worth investigating before conversion.
- The blank table below is the exact shape to fill in once DB access is available:

| Model | Field | Row Count | Null Count | Min | Max | >2 Decimal Count | Negative Count | Notes |
|---|---|---:|---:|--:|--:|---:|---:|---|
| `Expense` | `amountLakhs` | *pending* | *pending* | *pending* | *pending* | *pending* | *pending* | Not profiled — DB access denied from this environment |
| `Expense` | `gstAmountLakhs` | *pending* | *pending* | *pending* | *pending* | *pending* | *pending* | Same |
| `EmployeeAdvance` | `amountLakhs` | *pending* | *pending* | *pending* | *pending* | *pending* | *pending* | Same |
| `EmployeeAdvance` | `disbursedAmountLakhs` | *pending* | *pending* | *pending* | *pending* | *pending* | *pending* | Nullable — null count is meaningful here, not just an artifact |
| `EmployeeAdvance` | `settledAmountLakhs` | *pending* | *pending* | *pending* | *pending* | *pending* | *pending* | Same |
| `EmployeeAdvance` | `balanceLakhs` | *pending* | *pending* | *pending* | *pending* | *pending* | *pending* | Cached field — highest-priority to actually profile before conversion |
| `TravelClaim` | `ratePerKm` | *pending* | *pending* | *pending* | *pending* | *pending* (>4dp) | *pending* | Use 4dp scale check, not 2dp |
| `TravelClaim` | `amountRupees` | *pending* | *pending* | *pending* | *pending* | *pending* | *pending* | — |
| `TravelClaim` | `amountLakhs` | *pending* | *pending* | *pending* | *pending* | *pending* | *pending* | Cross-check against `amountRupees / 100000` for the same row |
| `Payment` | `amountLakhs` | *pending* | *pending* | *pending* | *pending* | *pending* | *pending* | — |
| `Collection` | `invoiceValueLakhs` | *pending* | *pending* | *pending* | *pending* | *pending* | *pending* | — |
| `Collection` | `amountWithoutGstLakhs` | *pending* | *pending* | *pending* | *pending* | *pending* | *pending* | — |
| `Collection` | `amountReceivedLakhs` | *pending* | *pending* | *pending* | *pending* | *pending* | *pending* | Cached field — highest-priority to actually profile before conversion |

**This gap blocks the "Data quality acceptable" determination in §11 — see Final Recommendation.**

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

If the live dev data profile (§4, currently blocked) later reveals `Expense`/`EmployeeAdvance`/
`TravelClaim` have unexpectedly bad data quality, that would be a reason to pause even this
conservative batch — see §11.

---

## 9. Pre-Migration Checklist

For the next implementation step (whichever batch is approved):

- [ ] Dev DB confirmed (`DATABASE_URL` → `u686730471_caveodev`, not production)
- [ ] Data profile (§4) actually completed — **currently blocked**, must be re-run from a machine
      with dev-DB access before this checklist item can be marked done
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

- **Schema conversion is BLOCKED on data quality confirmation — not ready to proceed.** §4's live
  dev data profile could not be completed in this environment (DB access denied — see §4 for full
  detail and the documented methodology to re-run it). Without row counts, null counts, min/max,
  negative-value counts, and scale-exceed counts for the 13 candidate fields in §2, "is the data
  clean enough to convert" cannot be answered from this step alone.
- **Once data quality is confirmed acceptable**, the recommended first conversion batch is the
  conservative one (§8, Option A): `Expense.amountLakhs`/`gstAmountLakhs`,
  `EmployeeAdvance.amountLakhs`/`disbursedAmountLakhs`/`settledAmountLakhs`/`balanceLakhs`, and
  `TravelClaim.ratePerKm`/`amountRupees`/`amountLakhs` — 9 fields across 3 models, deferring
  `Payment`/`Collection` (4 fields across 2 models) to a second batch because they are
  already-live, actively-written models whose conversion is inherently bundled with the
  `round2()`/epsilon-comparison retirement in `src/lib/payments.ts`.
- **Route/UI risk that needs mitigation before conversion**: `GET /api/finance/conveyance` and
  `GET /api/collections`(`+[id]`) currently return raw, unformatted numbers with zero
  Decimal-safe serialization layer — both were flagged High risk in §5/§6 and would need an
  explicit `moneyToNumberForDisplay()` (or string) boundary added *before* their underlying
  columns become `Decimal`, or their JSON responses would start serializing Decimal objects
  unsafely. `GET /api/finance/advances` was flagged Medium for the same underlying reason (its
  `fmt()` formatter isn't yet wired through `src/lib/money.ts`, unlike Expense/Dashboard).
- **Exact next step name: "Step 3O — Live dev data profile (re-run from a DB-accessible
  environment) and conversion batch sign-off."** This step should (a) actually execute the §4
  profiling query from a machine on Hostinger's Remote MySQL allowlist, (b) bring the resulting
  numbers back into this document's §4 table, and (c) obtain explicit sign-off on the §10 open
  decisions before any `prisma/schema.prisma` edit is made. Only after Step 3O closes those gaps
  should an implementation step that actually edits the schema be scheduled.

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
