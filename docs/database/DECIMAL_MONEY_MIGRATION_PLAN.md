# Decimal Money Migration Plan

> Planning/documentation step only — **Step 3G**. No Prisma schema change, no migration, no API
> code change, no UI code change, no calculation logic change, no Float/Double field converted.
> This document inventories every money-like field in `prisma/schema.prisma` and proposes a safe,
> phased path to `Decimal`, to be implemented in later steps — not here.

---

## 1. Purpose

**Why money fields should not use Float/Double.** `Float`/`Double` (IEEE 754 binary
floating-point) cannot represent most decimal fractions exactly — `0.1 + 0.2` is `0.30000000000000004`
in JS, and the same binary-rounding behavior exists in MySQL's `DOUBLE` column type that Prisma's
`Float` maps to. For a counter or a percentage this is invisible. For money it is not: every
addition, subtraction, or aggregate (`SUM`) carries a small binary-rounding error that can
accumulate across thousands of rows, post a ledger that doesn't balance to the paisa, or silently
drift a cached balance (`Collection.amountReceivedLakhs`, `EmployeeAdvance.balanceLakhs`,
`FinAccount.currentBalance`) away from the sum of its source rows over time.

This is not theoretical in this codebase. `src/lib/payments.ts`'s `round2()` helper
(`Math.round(n * 100) / 100`) and the `received + 0.001 >= invoice` epsilon-comparison in
`syncCollectionTotals()` exist specifically to paper over float-precision noise on
`Payment.amountLakhs`/`Collection.invoiceValueLakhs` — a real, present symptom of the exact
problem this plan addresses, not a hypothetical one.

**Why Decimal is safer for accounting/finance workflows.** `Decimal` (MySQL's
`DECIMAL(p,s)`, exposed by Prisma as `Decimal` via `@db.Decimal(p,s)`) stores an exact
base-10 fixed-point value — no binary-rounding error, ever. `SUM()` over `DECIMAL` columns is
exact. This is the standard, expected column type for money in every accounting system (Tally,
QuickBooks, SAP, GST e-invoicing) this project will eventually integrate or export to (see
`docs/database/SOFT_DELETE_DECISION_LOG.md` §4's note that money correctness compounds with the
existing soft-delete/audit-log work this project has been doing through Step 3F).

**Why this must be planned before Finance write APIs.** Every Finance write API the project is
about to build (Expense, EmployeeAdvance, TravelClaim, Voucher, Ledger, Payment posting) will
read and write these fields from day one. Converting the column type *after* those APIs exist
means touching every API/UI call site a second time, under live data, instead of building the
APIs against the correct type from the start. Planning now — while only the DB-layer Phase 1
models and soft-delete scaffolding exist (per `docs/database/SOFT_DELETE_MIGRATION_PLAN.md`
§12's Step 3D/3E/3F progress) — is the cheapest point in the project's history to make this
decision.

**Why this step does not implement schema changes.** Converting a live column's underlying SQL
type (`DOUBLE` → `DECIMAL`) is a data-rewriting operation, not a pure additive
`ADD COLUMN` like the Step 3B soft-delete migration. It must be reviewed, sequenced, and
data-validated deliberately (§7, §8) — not bundled into a documentation step. This document is
the plan; implementation is explicitly deferred to the steps proposed in §9.

---

## 2. Current Money Field Inventory

Every `Float`/`Float?` field in `prisma/schema.prisma` that represents a monetary amount,
balance, or money-denominated limit/threshold. Model and field names are exact, copied from the
schema.

| Model | Field | Current Type | Usage Area | Recommended Type | Priority | Notes |
|---|---|---|---|---|---|---|
| `Collection` | `invoiceValueLakhs` | `Float` | Billing/collections — invoice value | `Decimal(18,2)` | **Critical** | Drives `collectionStatus` comparison in `syncCollectionTotals()`; currently needs an epsilon hack (`+0.001`) to compare reliably |
| `Collection` | `amountWithoutGstLakhs` | `Float` `@default(0)` | Billing/collections — pre-GST value | `Decimal(18,2)` | **Critical** | Used in profitability/reporting alongside `invoiceValueLakhs` |
| `Collection` | `amountReceivedLakhs` | `Float` `@default(0)` | Billing/collections — cached received total | `Decimal(18,2)` | **Critical** | CACHED field, re-derived by `syncCollectionTotals()` via `Payment` aggregate — exact `SUM()` matters most here |
| `Payment` | `amountLakhs` | `Float` | Payment ledger — single payment amount | `Decimal(18,2)` | **Critical** | Aggregated (`_sum`) repeatedly in `src/lib/payments.ts`; `round2()` workaround is the concrete symptom this plan fixes |
| `OrderAdvance` | `amountLakhs` | `Float` | Order advance amount | `Decimal(18,2)` | **Critical** | "Order/Invoice totals" per task scope — flows into `Payment.amountLakhs` via `applyAdvance()` |
| `Notification` | `amountLakhs` | `Float?` | Denormalized copy shown in a payment notification | `Decimal(18,2)` | Later | Display-only copy of an already-posted amount; no calculation depends on its precision |
| `FinAccount` | `openingBalance` | `Float` `@default(0)` | Chart of accounts — cash/bank opening balance | `Decimal(18,2)` | **Critical** | Anchors every later balance calculation for the account |
| `FinAccount` | `currentBalance` | `Float` `@default(0)` | Chart of accounts — CACHED running balance | `Decimal(18,2)` | **Critical** | Comment in schema: "written by the cash/bank service only" — a cached running total is exactly where float drift compounds over time |
| `Ledger` | `amountLakhs` | `Float` | General ledger entry amount | `Decimal(18,2)` | **Critical** | Debit/credit posting amount — core accounting record |
| `Expense` | `amountLakhs` | `Float` | Expense register — claimed amount | `Decimal(18,2)` | **Critical** | |
| `Expense` | `gstAmountLakhs` | `Float` `@default(0)` | Expense register — GST amount on the expense | `Decimal(18,2)` | **Critical** | Tax *amount* (currency), not the tax *rate* — see `gstRate` below for the rate field |
| `Voucher` | `amountLakhs` | `Float` | Voucher — posted amount | `Decimal(18,2)` | **Critical** | Voucher is the accounting source-of-truth document; see §10 on sequencing this with Ledger |
| `EmployeeAdvance` | `amountLakhs` | `Float` | Employee advance — requested amount | `Decimal(18,2)` | **Critical** | |
| `EmployeeAdvance` | `disbursedAmountLakhs` | `Float?` | Employee advance — actually disbursed amount | `Decimal(18,2)` | **Critical** | |
| `EmployeeAdvance` | `settledAmountLakhs` | `Float?` | Employee advance — settled amount | `Decimal(18,2)` | **Critical** | |
| `EmployeeAdvance` | `balanceLakhs` | `Float` `@default(0)` | Employee advance — CACHED (disbursed − settled) | `Decimal(18,2)` | **Critical** | Schema comment: "CACHED" — same compounding-drift risk as `FinAccount.currentBalance` |
| `TravelClaim` | `ratePerKm` | `Float` `@default(0)` | Conveyance — ₹ rate per km (HR-policy snapshot) | `Decimal(10,4)` | **Critical** | A money *rate*, not a percentage — multiplies directly into `amountRupees`/`amountLakhs` below; needs more than 2 decimal places of precision since it's a per-unit multiplier |
| `TravelClaim` | `amountRupees` | `Float` `@default(0)` | Conveyance — claim amount in ₹ | `Decimal(18,2)` | **Critical** | |
| `TravelClaim` | `amountLakhs` | `Float` `@default(0)` | Conveyance — claim amount in ₹ Lakhs | `Decimal(18,2)` | **Critical** | Same claim, second denomination — both must convert together or a mismatch is introduced |
| `ApprovalRule` | `autoApproveLimit` | `Float` `@default(0)` | Approval policy — ₹ auto-approve threshold | `Decimal(18,2)` | Important | A money threshold compared against real transaction amounts above; not itself a posted transaction |
| `ApprovalRule` | `level1Limit` | `Float` `@default(0)` | Approval policy — ₹ level-1 threshold | `Decimal(18,2)` | Important | |
| `ApprovalRule` | `level2Limit` | `Float?` | Approval policy — ₹ level-2 threshold | `Decimal(18,2)` | Important | |
| `ApprovalRule` | `level3Limit` | `Float?` | Approval policy — ₹ level-3 threshold | `Decimal(18,2)` | Important | |
| `ExpenseLimitRule` | `dailyLimit` | `Float` `@default(0)` | Expense policy — ₹ daily cap | `Decimal(18,2)` | Important | Configuration/policy limit, not a transaction; lower risk than `Expense.amountLakhs` itself |
| `ExpenseLimitRule` | `monthlyLimit` | `Float` `@default(0)` | Expense policy — ₹ monthly cap | `Decimal(18,2)` | Important | |
| `ExpenseLimitRule` | `yearlyLimit` | `Float` `@default(0)` | Expense policy — ₹ yearly cap | `Decimal(18,2)` | Important | |
| `ConveyancePolicy` | `ratePerKm` | `Float` `@default(0)` | Conveyance policy — configured ₹/km rate | `Decimal(10,4)` | Important | Source of the per-claim `TravelClaim.ratePerKm` snapshot above |
| `ConveyancePolicy` | `monthlyLimitRupees` | `Float` `@default(0)` | Conveyance policy — ₹ monthly cap | `Decimal(18,2)` | Important | |
| `AdvancePolicy` | `maxAdvanceLakhs` | `Float` `@default(0)` | Advance policy — ₹ Lakhs cap | `Decimal(18,2)` | Important | |
| `CustomerCreditPolicy` | `defaultCreditLimitLakhs` | `Float` `@default(0)` | Customer credit policy — ₹ Lakhs default limit | `Decimal(18,2)` | Important | |
| `CustomerCreditPolicy` | `maxCreditLimitLakhs` | `Float` `@default(0)` | Customer credit policy — ₹ Lakhs max limit | `Decimal(18,2)` | Important | |
| `SalesFunnel` | `dealValueLakhs` | `Float` `@default(0)` | Legacy pipeline — deal value estimate | `Decimal(18,2)` | Important | Pipeline/forecast value, not a posted accounting transaction — feeds dashboards/reports, lower correctness stakes than ledger-posted money |
| `SalesFunnel` | `billingValueLakhs` | `Float` `@default(0)` | Legacy pipeline — billing value estimate | `Decimal(18,2)` | Important | |
| `CrmLead` | `expectedValue` | `Float` `@default(0)` | CRM lead — expected deal value | `Decimal(18,2)` | Important | Forecast/estimate, same reasoning as `SalesFunnel` above |
| `CrmOpportunity` | `value` | `Float` `@default(0)` | CRM opportunity — deal value | `Decimal(18,2)` | Important | |
| `CrmOpportunity` | `dealValueExTax` | `Float` `@default(0)` | CRM opportunity — deal value excluding tax (₹L) | `Decimal(18,2)` | Important | Required field when stage → WON; feeds profitability reporting |
| `CrmOpportunity` | `netProfitLakhs` | `Float` `@default(0)` | CRM opportunity — net profit, absolute ₹L (not %) | `Decimal(18,2)` | Important | Schema comment explicitly warns this was renamed from `netMargin` to clarify it's absolute, not a percentage — keep that distinction in mind during conversion |

---

## 3. Non-Money Numeric Fields To Exclude

Fields that are `Float` but are **not** money — included here explicitly so a future
implementation step does not assume "every `Float` is money" and convert them by mistake.

| Model | Field | Current Type | Reason To Keep |
|---|---|---|---|
| `TravelClaim` | `distanceKm` | `Float` `@default(0)` | A physical distance, not a currency amount. Per task guidance, keep `Float` unless the business specifically needs exact-decimal billing on distance itself (it doesn't — `ratePerKm × distanceKm` is computed once into `amountRupees`, which *is* converted above) |
| `TravelClaim` | `fromLat`, `fromLng`, `toLat`, `toLng` | `Float?` | GPS coordinates — geographic precision, unrelated to currency precision |
| `SalesFunnel` | `grossProfitPct` | `Float` `@default(0)` | A percentage (0–100), not a currency amount — see §4 for the separate percentage/rate standard if this is ever revisited |
| `SalesFunnel` | `probabilityPct` | `Float` `@default(0)` | Percentage, not money |
| `CrmOpportunity` | `discountPct` | `Float` `@default(0)` | Percentage (0–100) that *triggers* an approval workflow — not itself a stored money amount |
| `Expense` | `gstRate` | `Float` `@default(0)` | A tax *rate* (e.g. `18` meaning 18%), not a tax amount. Distinct from `Expense.gstAmountLakhs` (the computed currency amount), which **is** in the money table above. If precision ever becomes a concern, this is the candidate for the `Decimal(8,4)` percentage standard in §4 — not the `Decimal(18,2)` money standard |
| `KRATemplateItem` | `weightage` | `Float` `@default(0)` | A weighting percentage for KRA scoring, not money |
| `KRATemplateItem` | `minimumTarget`, `expectedTarget`, `stretchTarget` | `Float` `@default(0)` | Generic KRA target values — `targetType` on the same model can be `"AMOUNT"` or other types, so the *meaning* of this number is metric-dependent, not fixed as money. Do not convert without first auditing which `KRAMetric.metricType` rows actually represent currency |
| `KRAAchievement` | `actualValue` | `Float` `@default(0)` | Same reasoning as above — generic achievement value, metric-dependent meaning |
| `KRAAchievement` | `achievementPct`, `weightedScore` | `Float` `@default(0)` | Percentage/score, not money |
| `PerformanceReview` | `selfRating`, `managerRating`, `finalRating` | `Float` `@default(0)` | Performance ratings (e.g. out of 5), not money |
| `CrmOpportunity` | `probability` | `Int` `@default(50)` | Already an `Int` percentage, not `Float` — not in scope for this Float→Decimal plan at all |

---

## 4. Recommended Decimal Type Standard

| Category | Recommended Type | Applies to |
|---|---|---|
| Money amounts (₹, any denomination — Lakhs or Rupees) | `Decimal @db.Decimal(18,2)` | Every "Critical"/"Important"/"Later" row in §2 |
| Money *rates* that multiply into an amount (e.g. ₹/km) | `Decimal @db.Decimal(10,4)` | `TravelClaim.ratePerKm`, `ConveyancePolicy.ratePerKm` — extra precision because these are per-unit multipliers, not final amounts |
| Exchange rates (if ever introduced — none exist in the schema today) | `Decimal @db.Decimal(18,6)` | Not currently applicable; documented for forward compatibility only |
| Tax / percentage / rate fields | `Decimal @db.Decimal(8,4)` **or leave as `Float`/`Int`** | `Expense.gstRate`, `*Pct` fields, `discountPct`, `probability` — decide per-field in the implementation step; none of these are urgent since they are not currency amounts |
| Distance / GPS / non-money numeric | **Unchanged** (`Float`) | `distanceKm`, `fromLat/fromLng/toLat/toLng` — convert only if a future business requirement ties billing precision directly to distance, which it does not today |

`Decimal(18,2)` gives 16 integer digits + 2 decimal places — far beyond any realistic ₹ Lakhs or
₹ Rupees value this system will ever store, with exact paisa-level precision.

---

## 5. API Serialization Impact

Prisma's `Decimal` type (backed by `decimal.js`) is **not** a plain JS `number` — it does not
serialize through `JSON.stringify`/`NextResponse.json()` the way a `Float` does today, and naive
`Number(decimalValue)` conversions silently reintroduce the exact binary-precision loss this
migration exists to eliminate, just one layer higher in the stack.

**Recommendation:**
- Introduce a single, central money-serialization helper (e.g. `src/lib/money.ts`,
  `serializeMoney(decimal): string` / `toMoneyNumber(decimal): number` for display-only contexts)
  **before** any Decimal column conversion happens — not as an afterthought once routes already
  return raw Decimal objects.
- **Do not** scatter ad-hoc `Number(field)` calls across every API route and component — that
  reproduces today's `round2()`-style patchwork (§1) in a new location instead of fixing it.
- For finance-accuracy-sensitive responses (ledger, voucher, payment posting), prefer returning
  money as a **string** (e.g. `"12345.67"`) so the frontend never round-trips through a lossy
  `number` representation. For dashboard/display-only aggregates where exact precision in the
  wire format doesn't matter (a chart, a summary card), a converted `number` via the same central
  helper is acceptable — but it must go through one helper, not be reinvented per-component.
- Existing UI code (e.g. `fmt`/`fmtShort` helpers, independently re-implemented per-page today —
  confirmed via search, no shared formatter currently exists across
  `src/app/dashboard/DashboardClient.tsx`, `src/app/finance/bank-book/data.ts`,
  `src/app/finance/FinanceDashboardClient.tsx`, `src/app/masters/customers/data.ts`, etc.)
  currently expects a plain `number`. The serialization helper is what bridges Decimal → the
  `number`/`string` shape each consumer expects, so existing display components are not forced to
  change their input contract on day one of the conversion.

---

## 6. Calculation Rules

To be enforced once Decimal fields exist (not enforced today, since no fields have converted):

- **Never use JS floating-point arithmetic on a persisted accounting total.** `Math.round(n*100)/100`
  (the existing `round2()` pattern in `src/lib/payments.ts`) is the anti-pattern this plan
  retires — once `Payment.amountLakhs`/`Collection.invoiceValueLakhs` are `Decimal`, the rounding
  and the `+0.001` comparison epsilon become unnecessary and should be removed in that
  implementation step.
- **Use Decimal-native operations** (Prisma's `Decimal` arithmetic via `decimal.js`, or
  database-side `SUM()`/`ROUND()` in MySQL) wherever a persisted total is computed — not
  JS-`number` math on values pulled out of Decimal fields.
- **Round only at the final posting/export stage** — e.g. when a Voucher is finalized or an
  amount is exported to an accounting system — not at every intermediate calculation step.
- **Keep GST/tax calculations consistent**: a tax *amount* (`Expense.gstAmountLakhs`) is always
  derived from `amountLakhs × gstRate`, computed once at write time and stored — not
  recalculated ad hoc at read time from a rate that might have since changed.
- **Store final posted amounts explicitly.** Cached/derived fields
  (`Collection.amountReceivedLakhs`, `EmployeeAdvance.balanceLakhs`, `FinAccount.currentBalance`)
  must remain re-derivable from their source ledger (as `syncCollectionTotals()` already does),
  but the stored cache itself is the value APIs read — don't recompute it inline at every read.
- **Avoid recalculating historical posted vouchers after a rate change.** If
  `ConveyancePolicy.ratePerKm` changes, every already-posted `TravelClaim.ratePerKm` (a snapshot,
  per the schema's own comment: "snapshot from HR policy") must remain unchanged — this is
  already the schema's intent today and must be preserved through the Decimal conversion, not
  weakened.

---

## 7. Migration Safety Plan

Defined phases — **none of these are implemented in this step.**

- **Phase A** — Add Decimal migration plan only. *(This document. Complete as of this step.)*
- **Phase B** — Add helper utilities for Decimal serialization/calculation (the `src/lib/money.ts`
  helper from §5), built and unit-checked against mock Decimal values, with **no schema change
  yet** — so the helper exists and is reviewable before any column type changes.
- **Phase C** — Convert low-risk, read-mostly fields first if needed (e.g. policy/limit fields in
  §2's "Important" rows — `ApprovalRule`/`ExpenseLimitRule`/`ConveyancePolicy`/`AdvancePolicy`/
  `CustomerCreditPolicy`) as a lower-stakes dry run of the column-type-change mechanics, before
  touching live transactional ledgers.
  - Convert critical Finance money fields in Prisma schema — `Expense`, `EmployeeAdvance`,
  `TravelClaim`, `Payment`, `Collection` first (per §11), then `Voucher`/`Ledger`/`FinAccount`
  once the accounting-flow review in §10's last bullet is resolved.
- **Phase E** — Update APIs and UI to handle Decimal serialization, using the §5 helper at every
  call site touched by the Phase D schema change — not before, and not by reverting to scattered
  `Number()` conversions.
- **Phase F** — Validate existing data values before and after migration (§8) — row counts, sum
  totals per model, spot-checked individual records.
- **Phase G** — Add regression checks for totals (e.g. a one-off comparison script run before and
  after each Phase D conversion, comparing `SUM()` aggregates and a sample of cached-balance
  fields against their source-ledger recomputation) to catch any silent value drift introduced by
  the `ALTER COLUMN` itself.

---

## 8. Database Migration Risk

- **MySQL `ALTER COLUMN` from `FLOAT`/`DOUBLE` to `DECIMAL` rewrites every row's stored value** —
  this is not a metadata-only change like the additive `ADD COLUMN` work in Step 3B; it can
  change how out-of-range or imprecise existing values are stored, and on a large table it locks/
  rewrites the table during the `ALTER`.
- **Must back up dev and production DB before migration.** No Decimal conversion should run
  against `u686730471_caveodev` (or, far later, production) without a fresh backup immediately
  before the `ALTER TABLE`.
- **Must inspect data ranges** in each column before converting — confirm no existing value
  would silently truncate or round unexpectedly under `DECIMAL(18,2)` (e.g. a stray value with
  more than 2 decimal places of "precision" that was actually float noise, not a real paisa
  value).
- **Must compare before/after totals** — per-model `SUM()` of the converted column, and a sample
  of cached fields (`Collection.amountReceivedLakhs`, `FinAccount.currentBalance`,
  `EmployeeAdvance.balanceLakhs`) recomputed from their source ledgers, both immediately before
  and immediately after each conversion.
- **Must avoid destructive schema drift.** Follow the same discipline as Step 3B's migration
  (`docs/RBAC_MIGRATION_TRACKER.md` §4, Step 3B row): generate the migration SQL, manually review
  every statement, and apply only the intended `ALTER COLUMN` statements — Step 3B's own
  migration diff surfaced unrelated pre-existing schema drift that had to be manually excluded;
  the same discipline applies here.
- **Must use the dev DB first**, exactly as every prior schema-touching step in this project has
  (Step 3B, and the standing CLAUDE.md rule that production changes always require explicit
  confirmation).
- **Must review migration SQL manually** — this project's Hostinger dev DB has no shadow-database
  privilege (`P3014`, documented in `docs/RBAC_MIGRATION_TRACKER.md`'s Step 3B row), so the
  established workaround (`prisma migrate diff --from-config-datasource --to-schema
  prisma/schema.prisma --script`, then a one-off `mariadb`-driver apply script, then `prisma
  migrate resolve --applied`) will apply here too, and that workaround's manual-review step is
  exactly where a Float→Decimal `ALTER COLUMN`'s risk must be caught before it runs.

---

## 9. Suggested Implementation Sequence

Proposed next steps — **not implemented in this step**:

- **Step 3H** — Create Decimal/money utility helpers and serialization standards (the §5
  `src/lib/money.ts` helper), with no schema change yet.
- **Step 3I** — Convert `Expense`/`EmployeeAdvance`/`TravelClaim` money fields to `Decimal` on the
  dev DB only, following the §7/§8 safety plan.
- **Step 3J** — Convert `Payment`/`Collection` money fields to `Decimal` (including the cached
  `Collection.amountReceivedLakhs`), and retire the `round2()`/epsilon-comparison workaround in
  `src/lib/payments.ts` now that the underlying type is exact.
- **Step 3K** — Convert `Voucher`/`Ledger`/`FinAccount` money fields **after** the
  cancellation/reversal accounting-flow design is confirmed (§10's last decision point) — these
  are the most accounting-sensitive models in the schema (per
  `docs/database/SOFT_DELETE_DECISION_LOG.md` §7/§8's existing void/reversal-only decisions for
  Voucher and Ledger) and should not be converted under time pressure alongside the others.
- **Step 3L** — Update dashboard/report calculations (`DashboardClient.tsx`,
  `FinanceDashboardClient.tsx`, profitability views, etc.) to consume the §5 serialization helper
  wherever they read a now-Decimal field.
- **Step 3M** — Run finance data comparison checks (§7 Phase F/G) across all converted models as a
  final regression pass before considering the Decimal migration complete.

---

## 10. Decisions Needed Before Implementation

- Should APIs return Decimal as a **string** (exact, safer) or a **number** (matches today's UI
  expectations, but reintroduces float risk at the serialization boundary)? §5 recommends string
  for posting-sensitive responses, number-via-helper for display-only aggregates — but this needs
  explicit sign-off, not just this document's default.
- Standard precision: confirm **`Decimal(18,2)` for all INR money fields** project-wide (§4), with
  no per-model exceptions, before Step 3H builds the helper around that assumption.
- Should tax rates (`Expense.gstRate` and any future `*Pct`/`discountPct` fields) use
  `Decimal(8,4)`, or is `Float`/`Int` acceptable to leave unchanged since they are not currency
  amounts? §3/§4 lean toward "leave unchanged unless a concrete precision bug is found," but this
  is a decision, not yet a ruling.
- Should distance/conveyance km (`TravelClaim.distanceKm`) remain `Float`? §3 recommends yes —
  needs explicit confirmation that no future billing-by-distance feature will require
  Decimal-level exactness on the distance itself (as opposed to the ₹ amount it produces).
- Should historical Float values be **rounded** during migration (e.g. snap every existing value
  to 2 decimal places as part of the `ALTER COLUMN`), or migrated as-is and only newly-written
  values get the benefit of exact storage going forward? This materially affects whether §8's
  before/after total comparison is expected to match exactly or to show small, explainable
  rounding deltas.
- **Who signs off on before/after totals** for each Phase D conversion (§7)? A named approver (or
  role — e.g. whoever owns Finance Operations sign-off) should be agreed before Step 3I starts,
  not improvised at migration time.
- Should `Voucher`/`Ledger` migration explicitly **wait** until the voucher write/cancellation
  design is finalized, even if that delays Step 3K relative to Step 3I/3J? §9 already sequences
  it last; this decision is whether that's a hard gate or just an ordering preference.

---

## 11. Final Recommendation

- **Do not build Finance write APIs until the critical persisted money fields in §2 have a
  confirmed Decimal migration path** — building new write endpoints against `Float` columns today
  means rebuilding them against `Decimal` columns tomorrow, under live data, instead of once.
- **Start with `Expense`, `EmployeeAdvance`, `TravelClaim`, `Payment`, `Collection`** (§9 Steps
  3I–3J) — these are the models with the most existing application code touching them
  (`src/lib/payments.ts`, the Step 3D/3E/3F soft-delete + audit-log work) and the most immediate
  Finance-write-API exposure.
- **Treat `Voucher`/`Ledger` as accounting-sensitive and migrate only after the
  cancellation/reversal design is confirmed** — consistent with the existing decision in
  `docs/database/SOFT_DELETE_DECISION_LOG.md` §7/§8 that these two models already follow a
  different (void/reversal-only) lifecycle pattern from the rest of Finance.
- **Use a central money serialization/calculation helper** (§5/§9 Step 3H) — built once, reused
  everywhere a Decimal field crosses an API boundary or feeds a calculation, instead of
  reintroducing today's per-component `round2()`/`fmt()` patchwork in a new form.

---

## 12. Document Scope Confirmation

This document is **planning only**. As of this step:
- `prisma/schema.prisma` is unchanged — every field listed in §2 is still `Float`/`Float?` in the
  live schema.
- No migration was generated or applied.
- No API route or UI component was modified.
- No calculation logic (`round2()`, `syncCollectionTotals()`, or any other) was changed.
- `npx prisma validate` passes only because the schema was not touched — this is a no-op
  confirmation, not a meaningful check of anything new (consistent with how
  `docs/database/SOFT_DELETE_DECISION_LOG.md`'s own Step 3B-0 documentation step described its
  identical no-op validation).

---

> **Implementation note (Step 3H, 2026-06-21):**
> - `src/lib/money.ts` created — the central money helper proposed in §5/§9 (Step 3H) of this
>   plan.
> - Decimal-safe parsing (`toMoneyDecimal`, `parseMoneyInput`, `safeMoneyDecimal`), serialization
>   (`moneyToString`, `serializeMoney`, `moneyToNumberForDisplay`), rounding/formatting
>   (`roundMoney`, `formatMoney`), arithmetic (`addMoney`, `subtractMoney`, `multiplyMoney`,
>   `divideMoney`), and comparison (`isZeroMoney`, `isPositiveMoney`, `isNegativeMoney`) helpers
>   were added, all built on Prisma's own `Decimal` (imported from
>   `@prisma/client/runtime/client`, not the generated client — keeps the module side-effect-free
>   and avoids pulling in `PrismaClient`'s Node bootstrap code just for the `Decimal` class). No
>   new npm dependency was added.
> - The §4 serialization policy (string for persisted/posting APIs, `moneyToNumberForDisplay`
>   only for display, no bare `Number(decimal)`/`parseFloat` for money, round only at the final
>   step) is documented directly in the file's header comment and in each export's JSDoc.
> - Confirmed via a temporary self-check script (run and then deleted, per this step's own
>   instruction not to introduce a new test framework) that all 23 checks pass: `addMoney("0.1",
>   "0.2")` → `"0.30"`, `roundMoney("10.555")` → `"10.56"`, `moneyToString(100)` → `"100.00"`,
>   `divideMoney` rejects division by zero, `toMoneyDecimal`/`parseMoneyInput` reject
>   `null`/`"abc"`/`NaN`/`Infinity`/objects/booleans, and `isPositiveMoney(0)` correctly returns
>   `false` (deliberately stricter than decimal.js's own `isPositive()`, which treats `0` as
>   positive).
> - **Existing schema/API behavior is unchanged.** No Prisma field converted, no migration
>   generated, no `src/app/api/finance/*` route (or any other route) wired to this helper yet —
>   confirmed via `git status`/diff showing only the new `src/lib/money.ts` file plus
>   documentation. `npx prisma validate`, `npx tsc --noEmit`, `npm run build` (159 pages), and
>   `npm run lint` (589 problems, identical to the Step 3F/3G baseline — confirmed no new issues)
>   all pass.

> **Implementation note (Step 3I, 2026-06-22):**
> - **Dry-run adoption only — no schema conversion.** `src/lib/money.ts` (Step 3H) was wired into
>   exactly one low-risk, read-only calculation path: the running-balance accumulation loop in
>   `GET /api/finance/bank-book` (`src/app/api/finance/bank-book/route.ts`).
> - The loop that previously accumulated the running balance with
>   `running = r2(running ± entry.amountLakhs)` (rounding to 2dp after every single addition) now
>   accumulates with `addMoney`/`subtractMoney` on a `Decimal` (`toMoneyDecimal(periodOpeningBalance)`
>   as the seed), converting back to a plain `number` only at the loop boundary via
>   `moneyToNumberForDisplay` — matching §6's "round only at the final posting/export/display step"
>   rule instead of rounding at every intermediate step.
> - **No other line in the route changed.** `fmtMoney`/`r2` (the route's existing formatters) are
>   still used everywhere else and still produce the final response strings — the route's JSON
>   shape, field names, and string types are byte-for-byte unchanged.
> - **Verified equivalent**, not just "builds": a standalone Node check (run via `node -e`, not
>   committed) fed the same opening balance + 5 mixed credit/debit entries (including
>   `0.1 + 0.2`-style float-noise values) through both the old `r2`-per-step loop and the new
>   `addMoney`/`subtractMoney` loop. Raw per-step values can differ in the last digit (deferred
>   vs. per-step rounding), but every value is identical once passed through the route's existing
>   `fmtMoney()` boundary call — confirming the API response is unaffected.
> - **Live HTTP verification was not practical this step** (the bank-book route requires an
>   authenticated session against the remote Hostinger dev MySQL database) — static verification
>   (equivalence check above) plus `npx tsc --noEmit` / `npm run build` / `npm run lint` was used
>   instead. This is the documented limitation per this step's own instructions.
> - **Validation:** `npx prisma validate` ✅ (no-op, schema untouched), `npx tsc --noEmit` ✅ (no
>   errors), `npm run build` ✅ (all routes including `/finance/bank-book` and
>   `/api/finance/*` compiled), `npm run lint` → 589 problems (414 errors / 175 warnings) —
>   **identical to the Step 3H baseline**, confirming no new lint issues introduced.
> - **No schema/migration/API-contract change.** `prisma/schema.prisma` untouched, no migration
>   generated, no Finance write API created, no response field renamed/retyped, no UI component
>   touched.

> **Implementation note (Step 3J, 2026-06-22):**
> - **Second dry-run adoption — no schema conversion.** `src/lib/money.ts` adopted in
>   `GET /api/finance/cash-book`'s running-balance accumulation loop
>   (`src/app/api/finance/cash-book/route.ts`), the exact same pattern applied to Bank Book in
>   Step 3I.
> - The loop previously accumulated with `running = r2(running ± entry.amountLakhs)` (Cash In
>   credit → adds, Cash Out debit → subtracts, per the route's existing cash-register
>   convention). It now accumulates with `addMoney`/`subtractMoney` on a `Decimal` seeded via
>   `toMoneyDecimal(periodOpeningBalance)`, converting to a plain `number` only at the loop
>   boundary via `moneyToNumberForDisplay` — rounding deferred to the route's existing final
>   `fmtMoney()` call rather than rounded at every intermediate step.
> - **No other line in the route changed.** All filters (date range, account, employee, type,
>   expense category, status, search), pagination, the `mapTxnType` mapping, and authorization
>   (`canViewFinanceCashBook`) are untouched. Response field names, types, and JSON shape are
>   byte-for-byte unchanged.
> - **Verified equivalent**: a standalone Node check (run via `node -e`, not committed) fed the
>   same opening balance + 6 mixed credit/debit entries (including `0.1 + 0.2`-style float-noise
>   values) through both the old `r2`-per-step loop and the new `addMoney`/`subtractMoney` loop.
>   Raw per-step Decimal values can differ from the old float values in trailing digits (deferred
>   vs. per-step rounding), but every value is identical once passed through the route's existing
>   `fmtMoney()` boundary — confirming the API response is unaffected.
> - **Live HTTP verification was not practical this step** (the cash-book route requires an
>   authenticated session against the remote Hostinger dev MySQL database) — static verification
>   (the equivalence check above) plus `npx tsc --noEmit` / `npm run build` / `npm run lint` was
>   used instead, same limitation as Step 3I.
> - **Validation:** `npx prisma validate` ✅ (no-op, schema untouched), `npx tsc --noEmit` ✅ (no
>   errors), `npm run build` ✅ (all routes including `/finance/cash-book` and `/api/finance/*`
>   compiled), `npm run lint` → 589 problems (414 errors / 175 warnings) — **identical to the
>   Step 3I baseline**, confirming no new lint issues introduced.
> - **No schema/migration/API-contract change.** `prisma/schema.prisma` untouched, no migration
>   generated, no Finance write API created, no response field renamed/retyped, no UI component
>   touched. Bank Book (Step 3I) and Cash Book (this step) are now the only two routes using the
>   Decimal-safe internal running-balance pattern; every other Finance route is unchanged.

> **Implementation note (Step 3K, 2026-06-22):**
> - **Third dry-run adoption — no schema conversion.** `src/lib/money.ts` adopted in the
>   isolated read-only "base + GST = total" addition calculations in `GET /api/finance/expenses`
>   and `GET /api/finance/expenses/[id]` (`src/app/api/finance/expenses/route.ts` and
>   `src/app/api/finance/expenses/[id]/route.ts`).
> - **Expense list route**: the 6 summary aggregates that combine `amountLakhs +
>   gstAmountLakhs` in JS (`totalExpenses`, `todayExpenses`, `pendingApprovalAmount`,
>   `approvedExpenses`, `customerExpenses`, `employeeClaimsPending`) and the per-row
>   `totalAmount` field now use `addMoney(...)` on a `Decimal`, converted back to `number` via
>   `moneyToNumberForDisplay` immediately before the route's existing `fmtMoney()` formatting —
>   the same boundary pattern as Steps 3I/3J. The now-unused local `r2()` helper (its only
>   call sites were these replaced lines) was removed to avoid a dead-code/unused-var lint
>   issue; `fmtMoney()` is untouched and still produces every response string.
> - **Expense detail route**: the single `totalAmount` field (`amountLakhs + gstAmountLakhs`)
>   converted the same way; `r2()` removed there too for the same reason.
> - **`EmployeeAdvance` (`GET /api/finance/advances`) and `TravelClaim`
>   (`GET /api/finance/conveyance`) routes were inspected and left untouched.** Neither contains
>   a JS-level addition/sum combining multiple values — every summary figure in `advances` is a
>   single Prisma `_sum` aggregate formatted directly via `fmt()`, and `conveyance` has no
>   calculation at all (a pure pass-through list). Per this step's own instruction ("if one
>   route has no calculation... leave it untouched and document"), no change was made to either
>   file.
> - **No other line in either changed route was touched.** Authorization
>   (`canViewAllFinanceExpenses`), the `deletedAt: null` filter, date/status/category/vendor/
>   search filters, pagination, and response status codes are all unchanged. Field names, types,
>   and JSON shape are byte-for-byte the same.
> - **Verified equivalent**: a standalone Node check (run via `node -e`, not committed) compared
>   the old `r2(base + gst)` logic against the new `moneyToNumberForDisplay(addMoney(base, gst))`
>   logic across 5 representative sample pairs (including `0.1 + 0.2`, `10.555 + 1.895`, and a
>   3-way `employeeClaimsPending`-style addition) — every value matched once passed through the
>   route's existing `fmtMoney()` boundary.
> - **Live HTTP verification was not practical this step** (both routes require an authenticated
>   session against the remote Hostinger dev MySQL database) — same documented limitation as
>   Steps 3I/3J; the static equivalence check plus the full validation suite was used instead.
> - **Validation:** `npx prisma validate` ✅, `npx tsc --noEmit` ✅ (no errors), `npm run build`
>   ✅ (all routes including `/api/finance/expenses` and `/finance/expenses` compiled),
>   `npm run lint` → 589 problems (414 errors / 175 warnings) — **identical to the Step 3J
>   baseline**, confirming no new lint issues (including no new unused-var warnings from the
>   `r2()` removal).
> - **No schema/migration/API-contract change.** `prisma/schema.prisma` untouched, no migration
>   generated, no Finance write API created, no response field renamed/retyped, no UI component
>   touched, no broad refactor of Advance/Conveyance/other Finance calculations performed.

> **Implementation note (Step 3L, 2026-06-22):**
> - **Fourth dry-run adoption — no schema conversion.** `src/lib/money.ts` adopted in
>   `GET /api/finance/dashboard` (`src/app/api/finance/dashboard/route.ts`) across every
>   JS-level total calculation that combines multiple values — base+GST additions, a running
>   monthly accumulation, and the two net cash/bank-flow subtractions.
> - **Base + GST additions** converted to `moneyToNumberForDisplay(addMoney(base, gst))`:
>   `todayExp`, `monthlyExp`, `customerExp` summary scalars; the per-category `expenseBreakdown`
>   `amount` field; and the per-category `topExpenseCategories` `amt` (feeding both its
>   `amount` and `percentage` fields).
> - **Net flow subtractions** converted to `moneyToNumberForDisplay(subtractMoney(a, b))`:
>   `netCashFlow` (`totalCashIn − totalCashOut`) and `netBankFlow` (`totalCredits − totalDebits`).
> - **Monthly expense trend accumulation** (`monthMap[mo] = r2((monthMap[mo] ?? 0) +
>   e.amountLakhs + e.gstAmountLakhs)`, a 3-way running sum across all trend rows) converted to
>   `monthMap[mo] = moneyToNumberForDisplay(addMoney(monthMap[mo] ?? 0, e.amountLakhs,
>   e.gstAmountLakhs))` — the same "round only at the final boundary" pattern as the Bank
>   Book/Cash Book running-balance loops (Steps 3I/3J), now applied to a per-month bucket instead
>   of a single chronological running total.
> - **Deliberately left unchanged**: `cashBalance`, `bankBalance`, `advOutstanding`,
>   `claimsPending`, `totalCashIn`, `totalCashOut`, `totalCredits`, `totalDebits` — each is a
>   single Prisma `_sum` aggregate with only a `?? 0` fallback, never combined with another value
>   in JS, so there is no addition/subtraction to wire the helper into (per this step's own "if
>   directly returned from a `_sum` and not combined in JS, leave it unchanged" instruction). The
>   `percentage` field's `(amt / totalForPct) * 100` calculation was also left on the existing
>   `r2()` helper — it is a ratio, not a money addition, so it is out of scope for this dry run;
>   `r2()` itself was therefore **not** removed from this file (still has a live call site),
>   unlike the Step 3K `r2()` removal in the Expense routes where every call site was replaced.
> - **No other line in the route changed.** Authorization (`canViewFinanceDashboard`), period
>   resolution (`dateFrom`/`dateTo`/`financialYear`), `branchId`/`accountId` filters, and every
>   `deletedAt: null`-scoped query are untouched — response field names, types, and JSON shape
>   are byte-for-byte the same.
> - **Verified equivalent**: a standalone Node check (run via `node -e`, not committed) compared
>   old-vs-new logic across three calculation shapes used in this route — base+GST addition (4
>   pairs incl. `0.1+0.2`, `10.555+1.895`, and an all-zero/null-coalesced pair), net-flow
>   subtraction (4 pairs incl. `0.3−0.1`), and the 3-way monthly running accumulation (3 chained
>   entries) — every value matched once passed through the route's existing `fmtMoney()`
>   boundary.
> - **Live HTTP verification was not practical this step** (the dashboard route requires an
>   authenticated session against the remote Hostinger dev MySQL database) — same documented
>   limitation as Steps 3I–3K; the static equivalence check plus the full validation suite was
>   used instead.
> - **Validation:** `npx prisma validate` ✅, `npx tsc --noEmit` ✅ (no errors), `npm run build`
>   ✅ (all routes including `/api/finance/dashboard` compiled), `npm run lint` → 589 problems
>   (414 errors / 175 warnings) — **identical to the Step 3K baseline**, confirming no new lint
>   issues.
> - **No schema/migration/API-contract change.** `prisma/schema.prisma` untouched, no migration
>   generated, no Finance write API created, no response field renamed/retyped, no UI component
>   touched. Bank Book, Cash Book, Expense, and Dashboard are now the four routes using
>   Decimal-safe internal arithmetic where a calculation was actually present; Advance and
>   Conveyance remain untouched per Step 3K's findings.

> **Implementation note (Step 3M, 2026-06-22):**
> - **Final dry-run sweep — no code changed, no schema conversion.** Reviewed the remaining six
>   Finance read routes not yet inspected in Steps 3I–3L for any isolated JS-level money
>   calculation suitable for `src/lib/money.ts` adoption. Result: **none qualified** — every
>   route is either a pure pass-through, formats a single direct DB field/`_sum` aggregate with
>   no JS-level addition/subtraction, or performs a non-additive numeric transform that the
>   helper isn't designed for. No file was modified this step.
> - **Classification**:
>   - `GET /api/finance/accounts` — **Pure pass-through.** `openingBalance`/`currentBalance`
>     are formatted directly via the route's existing `fmtMoney()` with no JS-level combination
>     of values. Not a candidate.
>   - `GET /api/finance/vouchers` — **Only direct DB `_sum` value.** `totalVoucherAmount =
>     fmtMoney(r2(totalAmountAgg._sum.amountLakhs ?? 0))` rounds a single aggregate; there is no
>     second value being added or subtracted in JS. Not a candidate — left as-is, consistent with
>     how Step 3L left `cashBalance`/`bankBalance`/`totalCashIn`/etc. untouched for the same
>     reason. (Noted for transparency: Step 3K did convert one single-value case,
>     `gstInputAmount` in the Expense route, to `addMoney(singleValue)` for consistency with its
>     sibling fields in that block — this step takes the more conservative reading for a
>     standalone single-value field with no sibling addition nearby, per this step's own explicit
>     "Only direct DB `_sum` value" classification bucket.)
>   - `GET /api/finance/vouchers/[id]` — **Not suitable for this dry run.** The only money-shaped
>     transform is `amountInWords()` — a unit conversion (₹ Lakhs → ₹ Rupees via `r2(lakhs *
>     100_000)`) followed by whole/paise decomposition for text-to-words formatting
>     (`numberToWords`). This is a display-text generator, not an addition/subtraction of two
>     monetary values, and `src/lib/money.ts` has no decompose-into-words helper — forcing one in
>     would be a new helper, not adoption of an existing one. `amount: fmtMoney(voucher.amountLakhs)`
>     itself is a direct single-field format. Not a candidate.
>   - `GET /api/finance/voucher-sequences` — **Pure pass-through.** No money fields at all —
>     `lastNumber`/`nextNumber` are voucher-numbering counters (integers), not currency. Not a
>     candidate.
>   - `GET /api/finance/advances` — **Only direct DB `_sum` value** (reconfirmed from Step 3K).
>     Every summary figure is a single Prisma `_sum` formatted via `fmt()`; no JS-level addition.
>     Not a candidate.
>   - `GET /api/finance/conveyance` — **Pure pass-through** (reconfirmed from Step 3K). Raw
>     `TravelClaim` field list with zero calculation logic. Not a candidate.
> - **No live verification or equivalence check was needed** — no calculation logic changed, so
>   there is nothing to compare old-vs-new. This was a no-op review by design.
> - **Validation run anyway, per this step's own instruction:** `npx prisma validate` ✅, `npx
>   tsc --noEmit` ✅ (no errors), `npm run build` ✅ (all routes including the 6 reviewed ones
>   compiled, unchanged), `npm run lint` → 589 problems (414 errors / 175 warnings) — **identical
>   to the Step 3L baseline**, as expected with zero file changes.
> - **Dry-run sweep complete.** Across Steps 3I–3M, every Finance read route has now been
>   inspected. Bank Book (3I), Cash Book (3J), Expense list+detail (3K), and Dashboard (3L) had
>   genuine isolated JS-level money calculations and were wired to `src/lib/money.ts`. Accounts,
>   Vouchers, Voucher Detail, Voucher Sequences, Advances, and Conveyance (3M) do not, and remain
>   on their original `fmtMoney()`/`r2()` formatting. **No Prisma schema field was converted, no
>   migration was generated, and no Finance write API was created at any point in this sweep.**

> **Implementation note (Step 3N, 2026-06-22):**
> - Critical Finance Decimal readiness check completed for the 5 critical models named in this
>   step's scope: `Expense`, `EmployeeAdvance`, `TravelClaim`, `Payment`, `Collection`. Full
>   report: `docs/database/DECIMAL_CONVERSION_READINESS_CHECK.md`.
> - Candidate fields (13 money/rate fields across the 5 models, exact `prisma/schema.prisma`
>   field names) and the live dev data profile were documented — the data profile itself could
>   not be executed in this environment (dev-DB access denied from this sandbox's egress IP; see
>   the readiness check's §4 for the attempted methodology and the access-denial detail) and is
>   recorded as a blocking gap, not silently skipped.
> - API response impact (11 routes) and UI impact (8 areas) reviewed and documented; `GET
>   /api/finance/conveyance` and the Collections routes/UI were flagged as the highest-risk
>   surfaces for this future conversion (raw unformatted numbers today, no Decimal-safe boundary).
> - First-conversion-batch recommendation recorded: the conservative option (`Expense`/
>   `EmployeeAdvance`/`TravelClaim` only), deferring `Payment`/`Collection` to a second batch
>   because their conversion is inherently bundled with retiring the `round2()`/epsilon-comparison
>   workaround in `src/lib/payments.ts`.
> - **No schema/runtime behavior changed.** `prisma/schema.prisma` untouched, no migration
>   generated or applied, no API route or UI component modified, and no database row was read,
>   written, or altered (the only DB interaction attempted was rejected at the connection-auth
>   stage before any query executed). `npx prisma validate`, `npx tsc --noEmit`, and `npm run
>   build` all pass (no code changed, so these are reconfirmations, not new test surface).

> **Money Unit Policy (locked, 2026-06-22, before Step 3O) — SUPERSEDED, see the Step 3T-1 note
> near the end of this document.** ~~Only CRM Leads and Opportunities (and Sales pipeline/
> forecast fields) should use Lakhs-based values. Finance and Accounting values must use actual
> INR amounts without Lakhs conversion.~~ This applied to every model previously discussed in
> this plan as "money-like" — `Collection`, `Payment`, `Expense`, `Voucher`, `Ledger`,
> `EmployeeAdvance`, `TravelClaim`, `FinAccount` — none of which were exempt.
> Verification in `docs/database/DECIMAL_CONVERSION_READINESS_CHECK.md` §0 confirms every
> Finance `*Lakhs` field genuinely stores ₹ Lakhs today (not a misleading name — an accurate one,
> for a unit the business has now decided Finance must stop using), so adopting this policy
> requires a value transformation (×100,000 per existing row) coordinated with the Decimal
> column-type change and with every Finance UI converter — not a naming-only fix. This materially
> changes the scope of every future Decimal-conversion implementation step described in §7/§9 of
> this plan; see the readiness check's §0/§8/§10/§11 for the full revised analysis. No schema or
> code change has been made as a result of this policy yet — it is a locked decision pending
> Step 3O's design work.
>
> **Corrected policy (Step 3T-1, 2026-06-22):** the CRM Leads/Opportunities exception above is
> superseded. All business money inputs and storage, including Leads, Funnel, Opportunities, KRA
> targets, Finance, Payment, and Collection, must be actual INR. Lakhs is allowed only as a
> dashboard/reporting display unit. See the Step 3T-1 implementation note near the end of this
> document for the full correction.

> **Step 3O completed (2026-06-22):**
> - Live profile completed — run from a DB-accessible environment after confirming
>   `DATABASE_URL` pointed at the dev DB `u686730471_caveodev`. Result: clean for every
>   populated field (`EmployeeAdvance`, `Payment`, `Collection`); `Expense`/`TravelClaim` have 0
>   rows in dev today, so there's nothing to profile yet but also nothing to block on.
> - Lakhs-to-INR transformation design documented in
>   `docs/database/DECIMAL_CONVERSION_READINESS_CHECK.md` — a field-by-field table specifying the
>   exact `value * 100000` transformation (or, for `TravelClaim.ratePerKm`/`amountRupees`, no
>   transformation at all since they're already real INR), the target `Decimal` type, and
>   Release 1/Release 2 placement.
> - Collection/KRA impact documented — `kra-engine.ts`'s `totalCollectionsWithoutGst()` is the
>   risk surface (an absolute total compared directly against Lakhs-scaled human-entered KRA
>   targets with zero conversion today); recommended fix is an explicit `/ 100000` at that
>   boundary once `Collection` converts, keeping KRA targets Lakhs-based by convention.
> - First conversion release scope recommended: **Release 1** = `Expense`/`EmployeeAdvance`/
>   `TravelClaim` (9 fields); **Release 2** = `Payment`/`Collection` (4 fields), additionally
>   gated on the KRA-engine sign-off.
> - **No schema/runtime behavior changed.** No Prisma field converted, no migration generated, no
>   API/UI code touched, no database row written or altered — the only DB interaction was
>   read-only aggregation via a temporary script, deleted immediately after use. `npx prisma
>   validate`, `npx tsc --noEmit`, and `npm run build` all pass (reconfirmations, no code
>   changed). Full sign-off ledger: readiness check §12 — **Decimal schema conversion remains
>   BLOCKED**; Release 1 is "Approved with notes" (pending a tested transformation script),
>   Release 2 is explicitly "Blocked" (KRA-engine decision recommended but not yet signed off).

> **Step 3P completed (2026-06-22):**
> - Release 1 implementation plan created — `docs/database/DECIMAL_RELEASE1_SIGNOFF_PLAN.md`,
>   covering the 9-field scope (`Expense.amountLakhs/gstAmountLakhs`,
>   `EmployeeAdvance.amountLakhs/disbursedAmountLakhs/settledAmountLakhs/balanceLakhs`,
>   `TravelClaim.amountLakhs/amountRupees/ratePerKm`), the No-Half-Converted-State rule, the
>   atomic Step 3Q implementation sequence (12 steps), a smoke-test data plan for `Expense`/
>   `TravelClaim` (both still 0 rows in dev), API-boundary and UI-converter update tables for
>   `/api/finance/expenses`, `/api/finance/expenses/[id]`, `/api/finance/advances`,
>   `/api/finance/conveyance`, a before/after verification template, and a rollback/safety plan.
> - Payment/Collection remain deferred to Release 2, explicitly excluded from this plan's scope
>   per the unresolved KRA-engine sign-off.
> - **No schema/runtime behavior changed.** No Prisma field converted, no migration generated, no
>   API/UI code touched, no database row written or altered. `npx prisma validate`,
>   `npx tsc --noEmit`, and `npm run build` all pass. Decimal schema conversion permission for
>   Release 1 remains "Pending explicit final approval for Step 3Q" per the new plan's §11 ledger.

> **Step 3Q completed (2026-06-22):**
> - Release 1 converted to actual INR Decimal on dev DB. All 9 fields across `Expense`,
>   `EmployeeAdvance`, `TravelClaim` migrated atomically: Lakhs-denominated values multiplied by
>   100,000, then every column altered from `Float` to `Decimal` (`Decimal(18,2)`/`Decimal(10,4)`
>   for `ratePerKm`). Applied only to `u686730471_caveodev` via a guarded one-off script (refused
>   to run against any other database), `prisma migrate resolve --applied`, then
>   `prisma generate`. 11/11 before/after checks pass — see
>   `docs/database/DECIMAL_RELEASE1_MIGRATION_RESULTS.md`.
> - API boundaries (`/api/finance/expenses`, `/api/finance/expenses/[id]`,
>   `/api/finance/advances`, `/api/finance/conveyance`, `/api/finance/dashboard`) and UI
>   converters (`ExpenseRegisterClient.tsx`, `ClaimsClient.tsx`, `AdvancesClient.tsx`,
>   `FinanceApprovalsClient.tsx`, `FinanceDashboardClient.tsx`) updated in the same release —
>   no half-converted state. One collateral write-path fix: the legacy mobile `/api/expenses`
>   route's auto-approve threshold, previously Lakhs-denominated, corrected to its INR
>   equivalent.
> - **Release 2 remains blocked.** `Payment`/`Collection`/`Voucher`/`Ledger`/CRM Lead-Opportunity/
>   KRA targets were not touched — confirmed via `git diff --stat` and a migration-SQL safety
>   review. `npx prisma validate`, `npx tsc --noEmit`, and `npm run build` all pass.

> **Step 3R completed (2026-06-22):**
> - Release 1 Decimal/INR API and UI audit completed — independently re-verified (DB column
>   types via `INFORMATION_SCHEMA`, live authenticated API calls, and live browser UI checks)
>   rather than re-reading Step 3Q's own claims. All 9 Release 1 fields confirmed `Decimal`
>   with correct INR values in the dev DB; all 5 audited API routes return correct, stable,
>   non-leaking responses; the Finance Dashboard, Employee Claims, and Employee Advances UI
>   screens all display correct INR amounts with no 100,000× inflation; the Cr/L/K chart
>   compact-display logic still works via the new `inrToLakhsEquivalent()` conversion.
> - **Release 2 remains blocked.** `Payment`/`Collection`/`Voucher`/`Ledger` confirmed still
>   `double` in the dev DB; `kra-engine.ts`, Collections UI, and Leads/Opportunities UI
>   confirmed zero diff across the entire Step 3O→3Q range.
> - One pre-existing, unrelated migration-history gap was found and documented (not fixed). No
>   blockers or functional bugs found in the Release 1 implementation.

> **Step 3S completed (2026-06-22):**
> - Created `docs/database/DECIMAL_RELEASE2_SIGNOFF_PLAN.md` — the Release 2 Payment/
>   Collection/KRA boundary sign-off plan. Planning/decision-lock step only; no schema,
>   migration, API, UI, or data changes made.
> - Documented 3 KRA boundary options: keep KRA targets Lakhs and convert Collection→Lakhs only
>   at the `kra-engine.ts` scoring boundary (Option A, recommended default), convert KRA targets
>   to INR too (Option B, stricter policy reading, higher migration risk), or leave Collection in
>   Lakhs (Option C, rejected — violates the Money Unit Policy).
> - Flagged the single open decision blocking Step 3T: whether KRA targets are sales/performance
>   config (may stay Lakhs) or Finance-adjacent figures (must convert to INR) — requires explicit
>   business sign-off before implementation.
> - Documented the `src/lib/payments.ts` retirement plan (round2/epsilon-comparison removal,
>   `amountLakhs`/`totalLakhs` field renames), the API/UI boundary plan for both Collection
>   routes/UI and the Payment routes, and the KRA before/after verification plan (zero score
>   corruption tolerance).
> - **Release 2 remains unconverted and blocked** pending the KRA target unit policy decision.
>   `npx prisma validate` passes; no schema/code/data touched.

> **Step 3T completed (2026-06-22):**
> - Release 2 KRA boundary decision locked to Option A.
> - Collection will move to INR storage.
> - KRA targets remain Lakhs-based for now.
> - `kra-engine.ts` will convert Collection INR to Lakhs only at the KRA scoring boundary.
> - Updated `docs/database/DECIMAL_RELEASE2_SIGNOFF_PLAN.md`: Section 4 (KRA Boundary Options)
>   now marks Option A Approved, Option B Deferred, Option C Rejected; Section 12 (Decision
>   Ledger) updated to Approved for every row except the production migration-history gap
>   review; new Section 13 ("Release 2 Implementation Preconditions") added with 9 explicit
>   preconditions for the future Step 3U implementation.
> - **This decision is a lock, not an implementation.** No Prisma schema field was converted, no
>   migration was generated, no API route or UI component was modified, `src/lib/kra-engine.ts`
>   and `src/lib/payments.ts` were not touched, and no database row was written or altered.
>   `npx prisma validate`, `npx tsc --noEmit`, and `npm run build` all pass (reconfirmations, no
>   app code changed). Release 2 implementation remains not started — the next step is a Step 3U
>   implementation prompt.

> **Step 3T-1 completed (2026-06-22) — corrects the §"Money Unit Policy" note above and
> supersedes Step 3T's Option A lock as a permanent design:**
> - **Corrected policy: all business money inputs and storage — including Leads, Funnel,
>   Opportunities, KRA targets, Finance, Payment, and Collection — must be actual INR. Lakhs is
>   allowed only as a dashboard/reporting display unit** (sales dashboards, KRA views, sales
>   reports, management summary cards/charts).
> - The earlier "only CRM Leads and Opportunities may remain Lakhs-based" exception (locked
>   before Step 3O) is **superseded** — Leads, Funnel, and Opportunities must now use actual INR
>   for input and storage, the same as every Finance/Accounting model; only their dashboards/
>   KRA views/reports may display Lakhs.
> - **Release 2 impact:** Collection and Payment still must move to INR (unchanged). KRA target
>   inputs/storage should also move to INR, but only via a separate Sales/KRA target migration.
>   Until that migration ships, Release 2 must not blindly compare INR Collection values against
>   Lakhs KRA targets — it must either (1) include the KRA target unit migration to INR, or (2)
>   explicitly defer Collection/KRA scoring conversion until that migration is ready.
> - Updated `docs/database/DECIMAL_RELEASE2_SIGNOFF_PLAN.md`: added §15 ("Corrected Sales/KRA
>   Unit Policy Impact"), §16 ("Updated Decision Options" — Option A Full INR Canonical Model
>   recommended long-term, Option B Temporary Compatibility Bridge requiring a committed
>   follow-up migration, Option C keep Lakhs storage rejected), §17 ("Sales/KRA Actual-INR
>   Migration Needed" — a forward-looking inventory, not implemented), and §18 (current Final
>   Recommendation). Section 12's Decision Ledger updated: "KRA target unit policy" and "Release
>   2 permission to implement" rows marked Superseded/Blocked; all other rows (Collection/Payment
>   storage unit, `payments.ts` retirement, API/UI label policy) remain Approved, unaffected.
> - Updated `docs/database/DECIMAL_CONVERSION_READINESS_CHECK.md`'s §0 with a correction notice
>   and a new Step 3T-1 implementation note marking the Lead/Opportunity Lakhs exception
>   superseded.
> - **Release 2 implementation permission is now Blocked** (was briefly Approved under Step 3T),
>   pending an explicit choice between Option A and Option B in the updated sign-off plan.
> - **No Prisma schema field was converted, no migration was generated, no API route or UI
>   component was modified, `src/lib/kra-engine.ts` and `src/lib/payments.ts` were not touched,
>   and no database row was written or altered.** `npx prisma validate`, `npx tsc --noEmit`, and
>   `npm run build` all pass (reconfirmations, no app code changed).

> **Step 3U-0 completed (2026-06-22):**
> - **Option A — Full INR Canonical Model — selected and locked.** All persisted business money
>   values (Finance, Payment, Collection, Lead, Funnel, Opportunity, KRA targets, Sales targets,
>   report source data) must use actual INR as canonical input/storage; Lakhs is allowed only as
>   a display/reporting unit, converted at the presentation boundary.
> - **Temporary KRA Lakhs bridge (the Step 3T interim design) rejected as normal
>   implementation.** It is demoted to Option B and may be used only as an emergency
>   compatibility bridge, with separate, explicit written approval obtained at the time it would
>   actually be invoked — never a default fallback.
> - **Sales/KRA INR scope plan created** — `docs/database/SALES_KRA_INR_UNIT_SCOPE_PLAN.md`.
>   Confirmed by direct source inspection (not assumption): `CrmLead.expectedValue`,
>   `CrmOpportunity.value`/`dealValueExTax`/`netProfitLakhs`, `SalesFunnel.dealValueLakhs`/
>   `billingValueLakhs` are all genuinely Lakhs-scaled in their live UI/API code (e.g.
>   `OpportunitiesClient.tsx`'s `"Value (₹L)"` header, `LeadsClient.tsx`'s `"Expected Value
>   (₹L)"` form label, `SalesFunnelClient.tsx`'s `"Deal Value (₹L)"`/`"Billing Value (₹L)"`
>   labels). `KRATemplateItem.expectedTarget`/`stretchTarget`/`minimumTarget` are Lakhs-scaled
>   only for `metricType: "REVENUE"` rows (confirmed against `seed-performance-defaults.ts` seed
>   values 50/100/200/300/600) — not for percentage/count metric types, requiring a
>   metric-by-metric migration filter, not a blanket column conversion. The legacy `KRA.target`
>   free-text string (parsed by `parseTargets()` in `kra-engine.ts`) is Lakhs-scaled by
>   convention but is not a typed money column at all — its migration means rewriting embedded
>   numeric values inside existing strings, a materially different and riskier operation than a
>   typed-field `ALTER COLUMN`.
> - **Sequencing finding:** combining Release 2A (Payment/Collection) and Release 2B (Sales/KRA
>   target migration) into one atomic release is **required**, not optional, under Option A — if
>   Collection converts to INR before KRA targets do, `kra-engine.ts`'s scoring boundary would
>   compare INR against still-Lakhs targets with zero conversion factor (Option A's design has no
>   conversion factor by definition), reproducing the exact 100,000× corruption risk this entire
>   program exists to prevent. Shipping Release 2A alone requires the separately-approved Option
>   B emergency bridge, not a default path.
> - **Release 2 implementation permission remains Blocked** — the Option A vs. B design choice
>   is now resolved (Option A), but full scope inventory and sign-off on the new scope plan's
>   open decisions (§7) are still required before any implementation.
> - **No Prisma schema field was converted, no migration was generated, no API route or UI
>   component was modified, `src/lib/kra-engine.ts` and `src/lib/payments.ts` were not touched,
>   and no database row was written or altered.** `npx prisma validate`, `npx tsc --noEmit`, and
>   `npm run build` all pass (reconfirmations, no app code changed).

> **Step 3U-1 completed (2026-06-22):**
> - Combined Release 2 scope sign-off finalized —
>   `docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md`. Locks the exact field list
>   (Payment, Collection, `CrmLead.expectedValue`, `CrmOpportunity.value/dealValueExTax/
>   netProfitLakhs`, `SalesFunnel.dealValueLakhs/billingValueLakhs`, REVENUE-only
>   `KRATemplateItem` targets, confirmed-money `KRA.target` entries), the metric classification
>   rule (transform money-denominated fields only; never percentages/counts/ratios/scores), the
>   16-step implementation sequence for Step 3U, before/after verification requirements, and the
>   Release 2 permission ledger.
> - **Release 2 implementation permission remains Blocked** pending the new file's §9 open
>   decisions (live-DB scan of `KRAMetric`/`KRA.target`/`targetJson` content, named business
>   sign-off on the one-atomic-release requirement) — not yet a green light to implement.
> - **No Prisma schema field was converted, no migration was generated, no API route or UI
>   component was modified, `src/lib/kra-engine.ts` and `src/lib/payments.ts` were not touched,
>   and no database row was written or altered.**

> **Step 3U-2 completed (2026-06-22):** Section 9 open decisions reviewed and closed via a
> read-only live-DB scan against `u686730471_caveodev` (`docs/database/DECIMAL_RELEASE2_
> COMBINED_SCOPE_SIGNOFF.md` §12). Key correction: the live `KRAMetric.metricType` enum is
> `AMOUNT`/`PERCENTAGE`/`COUNT`, not the `REVENUE`/`ACTIVITY`/`QUALITY`/`COMPLIANCE` values
> `prisma/seed-performance-defaults.ts` defines — that seed file's rows are not present in the
> live dev DB at all. Money metrics are confirmed as the `AMOUNT`-typed ones (`BOOKING`,
> `BILLING`, unused `FUNNEL_VALUE`); one `KRATemplateItem` row (#16) has a `targetType`/metric
> `metricType` mismatch with money-scale values and is flagged Blocked/Manual Review rather than
> guessed. All 34 legacy `KRA.target` rows and all 34 `EmployeeTarget.targetJson` rows parsed
> cleanly with 6 confirmed money KPI labels (and `EmployeeTarget.targetJson` confirmed to store
> the same free-text format as `KRA.target`, not structured JSON, despite the field name).
> `TeamTarget` has 0 rows — deferred. Lead/Opportunity/Funnel fields confirmed Lakhs-scaled with
> zero negatives across 38/21/100 live rows respectively. `OrderAdvance` has 0 rows and 0
> advance-sourced `Payment` rows — included in locked scope anyway (zero migration risk, removes
> a future lockstep-unit-mismatch risk). Named business sign-off recorded (product owner
> instruction in project chat: actual INR for Lead/Funnel/Opportunity, Lakhs for Sales
> dashboard/KRA/Report display). **Release 2 implementation permission status: Blocked,
> narrowly, on the single `KRATemplateItem` #16 ambiguity only** — every other open decision is
> now closed. **No Prisma schema field was converted, no migration was generated, no API route
> or UI component was modified, `src/lib/kra-engine.ts` and `src/lib/payments.ts` were not
> touched, and no database row was inserted, updated, or deleted** (read-only scan only; the
> one-off scan script and its raw output were deleted after use).

> **Step 3U-3 completed (2026-06-22):**
> - `KRATemplateItem` #16 classification resolved — the product owner directly confirmed
>   **Option B (configuration error; fix before migration)** for this step's single remaining
>   Release 2 blocker (full decision record: `docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_
>   SIGNOFF.md` §13). Item #16's `targetType = AMOUNT` on a `PERCENTAGE`-typed metric
>   (`PIPELINE_RATIO`) is documented as a config/data error, not a confirmed money override — it
>   must be re-linked to a genuine `AMOUNT`-typed metric (e.g. the existing zero-row
>   `FUNNEL_VALUE` metric) before it converts. It does not convert in this Release 2 pass.
> - Release 2 permission status updated: `KRATemplateItem` #16 → **Blocked pending config
>   correction**; overall Release 2 implementation permission → **Blocked**, on the concrete
>   config-correction prerequisite above (not a classification ambiguity any longer). Every
>   other Release 2 scope item remains Approved.
> - A live re-verification query for item #16 was attempted and blocked by a transient Remote
>   MySQL access denial (connecting IP not currently allowlisted) — the decision relies on
>   Step 3U-2's already-captured evidence; the failed-connection script was deleted, no scratch
>   files remain, no database row was touched.
> - **No code/schema/data changed.** `prisma/schema.prisma`, every migration file,
>   `src/lib/kra-engine.ts`, `src/lib/payments.ts`, every API route, and every UI component
>   remain untouched; no database row was inserted, updated, or deleted.

> **Step 3U-4 completed (2026-06-22):**
> - `KRATemplateItem` #16 admin configuration correction was **attempted but not performed.**
>   Live re-inspection (DB access succeeded this step) confirmed no existing `AMOUNT`-typed
>   `KRAMetric` matches item #16's actual concept ("team-level absolute pipeline coverage
>   target") — `FUNNEL_VALUE` was specifically checked and ruled out as an individual-level
>   metric, a different concept from item #16's team-level Manager template, confirmed directly
>   by the business owner explaining "Pipeline Ratio %"'s true percentage-coverage-multiplier
>   mechanic.
> - **#16 does not link to an `AMOUNT` metric** — no metric of that type matches, and no new one
>   was created. Two creation paths were presented; the admin UI path was found infeasible (its
>   `metricType` dropdown doesn't offer `AMOUNT` — a separate, out-of-scope UI gap), and the
>   guarded dev-DB script alternative was explicitly declined by the product owner.
> - **Release 2 permission status: still Blocked**, on the same prerequisite as Step 3U-3
>   identified, now precisely scoped — create a new `AMOUNT`-typed `KRAMetric` and re-link item
>   #16 to it, via a future UI fix or an explicitly-authorized script, neither yet authorized.
> - **No code/schema/migration changed.** `prisma/schema.prisma`, every migration file,
>   `src/lib/kra-engine.ts`, `src/lib/payments.ts`, every API route, and every UI component
>   remain untouched; no database row was inserted, updated, or deleted. Two temporary
>   read-only inspection scripts were created and deleted — no scratch files remain.
> - Full record: `docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md` §14.

> **Step 3U-5 completed (2026-06-23):**
> - KRA AMOUNT metric admin setup fixed — `KRALibrary.tsx`'s `metricType` dropdown (previously
>   `REVENUE`/`ACTIVITY`/`QUALITY`/`COMPLIANCE`/`CUSTOM`, none of which exist live) now offers
>   `AMOUNT`/`PERCENTAGE`/`COUNT` (the taxonomy every live `KRAMetric` row actually uses), with
>   helper text and a default of `AMOUNT`. A new single-item update path
>   (`updateKRATemplateItem()` + `PATCH /api/admin/performance/templates/items`) was added so a
>   template item's `metricId` can be re-linked without deleting/recreating its sibling items
>   (the existing template-level `PATCH` route replaces the entire item set).
> - A new `KRAMetric` was created via the app's own `createKRAMetric()` service function: `id`
>   16, name "Team Pipeline Coverage", code `TEAM_PIPELINE_COVERAGE`, `metricType = AMOUNT`.
> - `KRATemplateItem` #16 re-linked to it via `updateKRATemplateItem(16, { metricId: 16 })` —
>   `targetType`/`minimumTarget`/`expectedTarget`/`stretchTarget`/`weightage`/`sortOrder`/
>   `status`/`templateId` all unchanged; no other `KRATemplateItem`/`EmployeeTarget`/
>   `TeamTarget` row touched (counts verified unchanged: 17/34/0).
> - **Release 2 permission status: Approved for dev implementation only.** Item #16's
>   configuration blocker (Step 3U-3/3U-4) is now resolved. **No Release 2 migration was
>   implemented** — `kra-engine.ts`, `payments.ts`, the schema, and every money-value row remain
>   unconverted; this step only removed the prerequisite blocker.
> - `npx prisma validate`, `npx tsc --noEmit`, and `npm run build` all pass.
> - Full record: `docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md` §15.

> **Step 3U implementation completed (2026-06-23):** Release 2 (Sales/CRM/KRA Lakhs→INR) is now
> implemented on the dev DB — `Payment.amountLakhs`, `Collection.invoiceValueLakhs`/
> `amountWithoutGstLakhs`/`amountReceivedLakhs`, `OrderAdvance.amountLakhs`,
> `CrmLead.expectedValue`, `CrmOpportunity.value`/`dealValueExTax`/`netProfitLakhs`,
> `SalesFunnel.dealValueLakhs`/`billingValueLakhs` all converted Float → Decimal(18,2) storing
> actual ₹ INR, plus the 3 AMOUNT-typed `KRATemplateItem` rows' data and the 8 confirmed-money
> `KRA.target`/`EmployeeTarget.targetJson` entries multiplied by 100000 in place. `money.ts`'s
> helpers are now wired into `payments.ts`, `kra-engine.ts`, and ~15 API routes. Full results:
> `docs/database/DECIMAL_RELEASE2_MIGRATION_RESULTS.md`.

> **Step 3V-1 audit closure completed (2026-06-23):** Step 3V's post-migration audit found no
> defects but its `TeamTarget` raw-SQL query hit `ER_NO_SUCH_TABLE` — root cause confirmed as a
> table-name mapping issue in the verification script (`TeamTarget` model maps to physical table
> `team_target` via `@@map`), not a migration defect. Re-ran the same closure checks through the
> Prisma client (auto-resolves `@@map`): `TeamTarget` still 0 rows, all 34 `KRA.target` and
> `EmployeeTarget.targetJson` rows re-scanned with 0 money-label anomalies, all 14 non-`AMOUNT`
> `KRATemplateItem` rows confirmed unmultiplied. No hidden regression found. Verification-only —
> no code/schema/data changed. Full record:
> `docs/database/DECIMAL_RELEASE2_MIGRATION_RESULTS.md` §4,
> `docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md` §17.

> **Production sign-off planning created after Step 3V-1 audit closure (Step 3W, 2026-06-23):**
> created `docs/database/PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md` — a planning/risk-
> review document only, no production query, migration, schema, code, or data change. Flags that
> production's `_prisma_migrations` was seeded with a single baseline row at the 2026-06-02
> SQLite→MySQL cutover with no subsequent production migrate-deploy event documented anywhere,
> and that the `master` branch (production) is 78 commits behind `uat` — meaning the real
> production gap is likely the entire post-baseline migration history, not just the two Decimal
> releases. Every production-state claim in the new document is marked "Needs verification."
> Go/No-Go checklist and sign-off ledger both Pending — production execution is not authorized by
> this step.

> **Step 3X completed (2026-06-23):** production pre-check dry run completed (read-only attempt).
> No production data changed — no production database was queried, no migration was run or
> resolved, no app code was deployed. **Blocked on production database access**: no confirmed,
> safely-usable production DB credential was available in this environment, so Tasks 2–7 of the
> dry run (DB identity, `_prisma_migrations`, schema snapshot, row counts, unit sampling, KRA/
> Sales target classification) remain "Needs verification." What *was* confirmed via git history
> alone: `master` (production's branch) is 79 commits behind `uat`, `master`'s checked-in
> migration folder stops at `20260610090000_security_center` (7 migrations short of `uat`,
> including both Decimal releases), `src/lib/money.ts` does not exist on `master`, and every
> Release 1/2 target field is still `Float` (not `Decimal`) in `master`'s schema source. Full
> results: `docs/database/PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md` ("Production
> Pre-Check Dry Run Results"). Production migration readiness remains undetermined pending
> resolution of the credential blocker.

> **Step 3Y completed (2026-06-23):** production read-only pre-check pack prepared — no
> production connection used. Created `docs/database/production-precheck/` (README, the
> read-only SQL file covering DB identity/`_prisma_migrations`/`INFORMATION_SCHEMA` column
> checks/row counts/unit sampling/KRA target classification, a result template, and a safety
> checklist) plus an optional guarded companion script
> (`scripts/production-readonly-precheck.mjs`, refuses without
> `CONFIRM_PRODUCTION_READONLY_PRECHECK=YES`, refuses against the known dev DB name, never prints
> credentials, keyword-guards every query against write statements). Production migration
> remains blocked pending human-run results from this pack — no "Needs verification" row in
> `docs/database/PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md` was converted to a fact by
> this step itself; that conversion still requires a human with confirmed production access to
> actually run the pack.

> **Step 3Z (2026-06-23) — deployment strategy changed to UAT-first.** Production migration is
> **paused** until UAT testing is completed. New flow: dev (done, audited) → UAT migration +
> testing → UAT sign-off → production planning resumes → production migration only after
> approval. Created `docs/database/UAT_DECIMAL_INR_MIGRATION_PLAN.md` (UAT scope, pre-checks,
> execution sequence — designed, not executed — test plan, sign-off checklist, and the
> production gate this unblocks) and `docs/database/uat-precheck/` (a UAT-scoped read-only
> pre-check pack, adapted from the production pack but using documented UAT identifiers, not
> production credentials). `docs/database/PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md` is
> retained as valid background and gains a top-of-document deferral notice — nothing in it is
> withdrawn, it is simply not the next active step. No production connection, migration, or
> deployment occurred in this step; no UAT migration was executed either — planning only.

> **Step 4A (2026-06-23) — UAT pre-check dry run completed.** No UAT data was changed; no UAT
> connection was made from this dev environment. Found and documented a blocker: this
> environment has no confirmed, externally-reachable UAT database credential —
> `.env.uat.example`'s `DATABASE_URL` uses an unconfirmed/likely-stale connecting user
> (`u686730471_uatuser`) that doesn't match the documented working UAT user
> (`u686730471_caveouat`, per `docs/CHANGELOG.md` Session 9), and its host (`127.0.0.1`) only
> resolves correctly when the file is deployed onto the UAT server itself, not from this
> workstation. UAT migration readiness findings (DB identity, `_prisma_migrations` state, schema
> snapshot, row counts, unit sampling, KRA/Sales target classification, branch/app gap) are
> documented in `docs/database/UAT_DECIMAL_INR_MIGRATION_PLAN.md`'s new "UAT Pre-Check Dry Run
> Results" section — every DB-dependent item is recorded as "Needs verification — blocked," not
> guessed at. The actual unblock is the same as it was for production in Step 3X: a human with
> confirmed UAT access needs to run `docs/database/uat-precheck/` directly.

> **Step 4B (2026-06-24) — UAT pre-check actually run against the real UAT database.** An
> operator with confirmed SSH/MySQL access to UAT ran `docs/database/uat-precheck/
> uat-readonly-precheck.sql` and relayed sanitized output (no credentials shared). Confirmed:
> UAT's `_prisma_migrations` has exactly 19 rows, missing exactly the 3 predicted migrations
> (`add_soft_delete_fields_phase_a`, `decimal_release1_lakhs_to_inr`,
> `decimal_release2_combined_inr_canonical`); every in-scope Release 1/2 column is still
> Float/Text (clean pre-migration state, no drift); row counts match Session 9's estimates
> exactly. **New, important findings:** (1) `kra_template_item`/`kra_metric`/`kra_template` all
> have 0 rows on UAT — the structured KRA engine is unpopulated there, real KRA scoring runs
> through legacy free-text `KRA.target` only; (2) **`Payment`/`Collection`/`OrderAdvance` data on
> UAT looks like it's already stored in actual ₹ INR, not ₹ Lakhs** (e.g. a `Collection`
> invoice value as high as 7,979,986 — implausible as Lakhs) — this **blocks** running the
> planned ×100,000 Release 2 transform uniformly against those 3 models until resolved with a
> business/source-data review; (3) UAT's `KRA.target` free-text only contains 2 of dev's 6
> documented money labels — the rest need independent re-classification before any data-transform
> runs. Full findings filled into `docs/database/uat-precheck/uat-precheck-result-template.md`
> and summarized in `docs/database/UAT_DECIMAL_INR_MIGRATION_PLAN.md`'s new "UAT Pre-Check
> Results — Confirmed Live Findings" section. **UAT migration still not run; still blocked
> pending the two findings above being resolved.**

> **Step 4C (2026-06-24) completed:** UAT unit-mismatch analysis started; a field-level UAT
> transform plan was created at `docs/database/UAT_DECIMAL_INR_MIGRATION_ADJUSTMENT_PLAN.md`,
> deciding per-field whether to multiply by 100,000, convert type only, no-op (empty table), or
> block pending review — for all Release 1/2 fields plus the KRA free-text labels. Key
> decisions: `Payment`/`Collection`/`OrderAdvance` → type conversion only (no multiply, pending
> business sign-off); `CrmLead`/`SalesFunnel` → multiply by 100,000; `CrmOpportunity`'s 3 fields
> → blocked (1 negative row, 2 all-zero fields); only 2 of dev's 6 `KRA.target` money labels
> confirmed on UAT, the rest blocked pending a full 34-row review. **UAT migration remains
> blocked pending final classification of the flagged fields and labels.** No UAT/production
> data was touched; no schema/API/UI code changed; no migration SQL was written or run.

> **Step 4D (2026-06-24) completed:** UAT field/KRA classification blockers reviewed and closed.
> Payment/Collection/OrderAdvance unit decision recorded — business sign-off confirms these 4
> fields are already actual ₹ INR on UAT, type conversion only (no multiply), approved.
> `CrmOpportunity` classification completed via a full 49-row review (not a sample) — `value` is
> Lakhs-scale (1 negative row flagged as a data-quality artifact, not a unit blocker);
> `dealValueExTax`/`netProfitLakhs` confirmed exactly 0 across every row — all 3 fields approved
> for ×100,000. `KRA.target` full 34-row review confirms all 6 of dev's documented money labels
> are present and money-confirmed on UAT — no UAT-specific label changes needed, dev's allowlist
> reused as-is. **UAT migration SQL generation permission updated to Approved** — every item in
> the adjustment plan's permission ledger has closed. This authorizes *drafting* UAT-specific
> migration SQL as a future step; it does not authorize running any migration — UAT execution
> still requires its own explicit instruction plus the operational pre-checks Step 4B left open.
> No UAT/production data was touched; no schema/API/UI code changed; no migration SQL was written
> or run in this step.

> **Step 4E (2026-06-24) completed:** UAT-specific migration SQL package generated at
> `docs/database/uat-migration-package/` — migration plan SQL (soft-delete + Release 1 + Release
> 2 with UAT-specific transform decisions), pre/post-migration read-only verification SQL, a
> dry-run checklist, a README, and 2 optional guarded Node scripts (apply + KRA-target transform,
> both exit early by design). SQL safety review confirmed no destructive statements, no
> production reference, no Voucher/Ledger/FinAccount touched. **Migration not run** —
> operational approval (backup, write-freeze, test logins) still required before any UAT
> migration execution, which remains its own future, explicitly-instructed step.

> **Step 4F (2026-06-24) completed:** UAT operational approval checklist prepared/reviewed —
> every SQL/package-content item in `uat-migration-dry-run-checklist.md` is now Completed
> (re-confirmed Payment/Collection/OrderAdvance type-only, Sales Pipeline multiply, KRA.target
> deferred to the guarded script, no destructive statements, no production reference, no
> Voucher/Ledger/FinAccount). Created `UAT_BACKUP_ROLLBACK_RECORD.md` and
> `UAT_MIGRATION_APPROVAL_RECORD.md` — both fully Pending (no backup taken yet, no business/
> technical sign-off obtained yet). **Migration still not run** — execution permission remains
> Pending pending backup, write-freeze, and approval-record completion.

> **Step 4F-1 (2026-06-24) completed:** UAT backup verification reviewed. A real
> restore-to-scratch-DB test was attempted and found not possible in this environment (no
> `mysql`/`mariadb`/`docker` tooling, no live UAT connection). A structural sanity check of
> `u686730471_Caveo_UAT_240626.sql` was performed instead — well-formed dump, all 13 required
> tables present, in-file row counts consistent with Step 4B's documented live findings.
> **Rollback readiness updated to "Approved with risk exception"** — Vijesh Vijayan, named as
> the approving owner, explicitly accepted the residual risk of an unperformed live restore test
> rather than block indefinitely on missing tooling. **Final UAT migration execution approval
> status updated to "Approved with risk exception"** (`UAT_MIGRATION_APPROVAL_RECORD.md`) — this
> authorizes proceeding to Step 4G; it does not itself run the migration, which remains a
> separate, explicitly-instructed step. No UAT/production database was connected to, queried, or
> modified — only the already-present local backup file was inspected read-only via shell text
> tools. `npx prisma validate`, `npx tsc --noEmit`, `npm run build` all pass (no app code
> changed, reconfirmations only).

> **Step 4G (2026-06-24) completed:** UAT Decimal/INR migration **executed** against the live
> `u686730471_Caveo_UAT` database. DB identity guard confirmed live before every script
> (`SELECT DATABASE()` = `u686730471_Caveo_UAT`, MariaDB `11.8.6-MariaDB-log`). Pre-migration
> snapshot (29/29 statements), migration SQL (36/36 statements), and post-migration verification
> (27/27 statements) all ran with **0 errors**. Soft-delete fields added; Payment/Collection/
> OrderAdvance converted to `Decimal` with no multiply (confirmed exact, to the cent);
> CrmLead/CrmOpportunity/SalesFunnel converted and multiplied by exactly 100,000 (confirmed
> exact, including the known `CrmOpportunity` row 42 anomaly `-0.1` → `-10000.00`). Voucher/
> Ledger/FinAccount confirmed untouched. **Two items remain open, documented not hidden:**
> (1) `scripts/uat-transform-kra-target.mjs` exited at its designed early-exit point without
> transforming `KRA.target` — confirmed byte-identical before/after; no manual SQL was
> substituted, per instruction. (2) `prisma migrate resolve --applied` for the 3 migration names
> was blocked by this environment's own safety classifier as a high-severity, hard-to-reverse
> action — `_prisma_migrations` still shows 0/3 recorded. Rollback status unchanged from Step
> 4F-1 (Approved with risk exception, reduced confidence). **Production was not touched. Dev was
> not touched** — every UAT connection used a separate, gitignored `.env.uat` credential file,
> never `.env`. Full record: `docs/database/uat-migration-package/UAT_MIGRATION_EXECUTION_RESULTS.md`.
> `npx prisma validate`, `npx tsc --noEmit`, `npm run build` all pass (no local app code
> changed — this step modified live UAT data/schema only, not the repository's source).

> **Step 4G-1 (2026-06-24) completed:** the two items Step 4G left open are now closed. First, a
> secret-hygiene check found a real-looking password (unrelated, older leak — commit `749ea28`,
> 2026-06-16) committed in `.env.uat.example` on the **public** repo; confirmed stale/inactive
> with Vijesh Vijayan, fixed the tracked file to a safe placeholder. Then: `scripts/
> uat-transform-kra-target.mjs`'s execution path was finalized (default dry-run, transactional
> live write behind `CONFIRM_UAT_KRA_TARGET_TRANSFORM=YES`, aborts on any unrecognized label) and
> run against live UAT — 8 of 34 `KRA.target` rows updated, only the 6 approved money labels
> multiplied by 100,000, every non-money label byte-identical (the dry run also caught and safely
> resolved a real data quirk: a stray embedded quote character in 5 rows' "proof of concept"
> label, not a new classification). `npx prisma migrate resolve --applied <name>` then succeeded
> for all 3 target migrations (the environment block from Step 4G did not recur) —
> `_prisma_migrations` went from 19 to 22 rows, all 3 present. Full post-migration re-verification
> (27/27 statements) confirmed everything from Step 4G unchanged plus the KRA transform correctly
> applied. **Step 4H — full UAT functional testing (Finance, Sales, and KRA) can now begin.**
> Production and dev untouched throughout. `npx prisma validate`, `npx tsc --noEmit`,
> `npm run build` all pass. Full record:
> `docs/database/uat-migration-package/UAT_MIGRATION_EXECUTION_RESULTS.md` §13–§17.

> **Step 4H (2026-06-24) completed:** UAT post-migration functional testing performed, with an
> honestly-documented limitation — `uat.caveoinfosystems.com` is blocked by this environment's
> network policy and no interactive login is possible here, so **no live UI/API/login testing
> was performed**; every such check is marked "Not performed — testing limitation," not
> fabricated as Passed. What was verified: direct read-only UAT DB queries confirm Finance
> (`Payment`/`Collection`/`OrderAdvance`), Sales (`CrmLead`/`CrmOpportunity`/`SalesFunnel`,
> including the row-42 anomaly), and KRA (`KRA.target`'s 8 transformed rows) data is all
> correct — no inflation, deflation, NULLs, or double-multiplication. Static code review of
> `kra-engine.ts`/`money.ts`/`roles.ts` found one low-severity finding (pre-existing Lakhs-scale
> fallback constants, not currently triggered) and no other inconsistency. **Sign-off:**
> Finance/Sales/KRA = Passed with Minor Issues; RBAC = Pending (no live login possible);
> Technical Validation = Passed; **Final UAT Migration Sign-Off = Pending** — correctly not
> marked Passed, since live testing is a genuine gap rather than a confirmed result. No
> Critical/High issue found in anything actually tested. Full record:
> `docs/database/uat-migration-package/UAT_POST_MIGRATION_FUNCTIONAL_TEST_RESULTS.md`.

> **Step 4H-1 (2026-06-24, same day) completed:** the live UI/login/RBAC gap Step 4H left open
> is now closed. `uat.caveoinfosystems.com` proved reachable this time, but a real interactive
> Microsoft Entra ID login still cannot be completed from here, and `.env.uat` sets
> `NODE_ENV="production"` (disabling the dev-impersonation bypass on the *deployed* app by
> design) — so, with the user's explicit authorization, live testing was instead performed by
> running this exact codebase (a detached-HEAD git worktree at `uat` HEAD `0ccce92`) locally
> against the **live UAT database**, with `NODE_ENV` forced to `development` only on that local
> instance to re-enable the codebase's own `dev_employee_id` impersonation feature. Manager
> (Vijesh) and Employee (Sangeetha M) logins both passed live; RBAC passed live in both
> directions (Manager full access, Employee correctly blocked from every admin/Finance/team
> page and scoped to own data); Finance/Sales/KRA pages all rendered correctly against live
> data with no inflation/deflation/crash/NaN; `CrmOpportunity` row 42's negative value rendered
> correctly as `₹-0.10L`. Zero new defects found. Test harness fully torn down afterward — no
> residue, `.env.uat` never written/committed, `git status` clean. `npx prisma validate`,
> `npx tsc --noEmit`, `npm run build` all pass. **Sign-off: Final UAT Migration Sign-Off =
> Passed** — all gating conditions met, remaining risks (deployed-commit confirmation still
> open, Medium; four Low items) explicitly accepted rather than hidden. Full record:
> `docs/database/uat-migration-package/UAT_POST_MIGRATION_FUNCTIONAL_TEST_RESULTS.md` §0, §§3–7,
> §12.
