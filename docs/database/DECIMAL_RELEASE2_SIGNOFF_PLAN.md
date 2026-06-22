# Decimal Release 2 Sign-Off Plan — Payment / Collection / KRA Boundary

**Step:** 3S
**Status:** Planning / decision-lock only. No schema, migration, API, UI, or data changes made in this step.
**Depends on:** Release 1 (Step 3Q, implemented) + Release 1 audit (Step 3R, zero bugs found).

---

## 1. Purpose

Release 1 converted Expense, EmployeeAdvance, and TravelClaim from ₹ Lakhs Float storage to
actual-INR `Decimal(18,2)` storage, with matching API and UI boundary updates. Payment and
Collection were **explicitly excluded** from Release 1 because:

- Collection feeds the KRA scoring engine (`src/lib/kra-engine.ts`), which compares Collection
  totals directly against KRA targets that are themselves Lakhs-scaled by convention.
- Converting Collection's storage unit from Lakhs to actual INR without also fixing the KRA
  scoring boundary would silently inflate every Collection-derived KRA score by 100,000×.
- Payment has no independent unit risk of its own (it is always 1:1 with Collection via
  `Payment.collectionId`), but it must convert in lockstep with Collection or the running
  ledger total (`syncCollectionTotals` in `src/lib/payments.ts`) will compare mismatched units.

This document exists to **lock the KRA boundary decision before any code changes**, because
that decision determines the shape of the Release 2 implementation (Step 3T). Per the task
constraints for this step, no Prisma schema, migration, API code, UI code, or database values
are touched here — this is a decision and planning artifact only.

---

## 2. Release 2 Candidate Fields

| Model | Field | Current Unit | Target Unit | Transformation | Target Type | Status |
|---|---|---|---|---|---|---|
| Payment | `amountLakhs` | ₹ Lakhs (Float) | Actual INR | `value * 100000` | `Decimal @db.Decimal(18,2)` | Candidate / Pending |
| Collection | `invoiceValueLakhs` | ₹ Lakhs (Float) | Actual INR | `value * 100000` | `Decimal @db.Decimal(18,2)` | Blocked until KRA boundary sign-off |
| Collection | `amountWithoutGstLakhs` | ₹ Lakhs (Float) | Actual INR | `value * 100000` | `Decimal @db.Decimal(18,2)` | Blocked until KRA boundary sign-off |
| Collection | `amountReceivedLakhs` | ₹ Lakhs (Float) | Actual INR | `value * 100000` | `Decimal @db.Decimal(18,2)` | Blocked until KRA boundary sign-off |

Payment is marked "Candidate / Pending" rather than "Blocked" because it has no scoring
dependency of its own, but in practice it **must ship in the same atomic release as Collection**
(see Section 11) — `syncCollectionTotals()` aggregates `Payment.amountLakhs` and compares it to
`Collection.invoiceValueLakhs` in the same unit, so converting one without the other breaks that
comparison immediately.

---

## 3. Live Data Summary (from Step 3O profiling, re-confirmed, not re-queried)

Per `DECIMAL_RELEASE1_MIGRATION_RESULTS.md` / `DECIMAL_CONVERSION_READINESS_CHECK.md`:

- **Payment:** 1 row, ~₹1.61L. No negative or null values.
- **Collection:** 94 rows, range ₹0.003L–₹77.88L. No negative values, no values flagged as
  suspicious. A small number of rows exceed 2 decimal places in `amountWithoutGstLakhs`,
  explained by GST back-calculation (`invoiceValue / (1 + GST_RATE)`, e.g. `÷1.18`), confirmed
  in `CollectionsClient.tsx` (`(inv / (1 + GST_RATE)).toFixed(4)`) — this is expected
  floating-point precision noise from the GST formula, not a data integrity issue.

No write operations were performed in this step. These figures are read from existing
documentation per the task's read-only constraint; live re-profiling was not necessary since
the dataset has not changed since Step 3O (no Collection/Payment writes occurred during
Release 1, which explicitly excluded these models).

---

## 4. KRA Boundary Options

| Option | Description | Pros | Cons | Recommendation |
|---|---|---|---|---|
| **A** | Keep KRA targets in Lakhs (status quo). Convert Collection storage to actual INR. Inside `src/lib/kra-engine.ts`, divide Collection INR values by 100000 *only* at the KRA scoring boundary (`totalCollectionsWithoutGst()`, `teamBilling()`), before comparing against Lakhs-based targets. | Smallest blast radius — KRA target seed data (`seed-performance-defaults.ts`), the per-employee `KRA.target` string field, and all KRA display "L" labels stay unchanged. Matches the existing convention that KRA targets are sales/performance goals, not raw Finance-ledger amounts. Only 2 functions need a one-line conversion. | Introduces a second, explicit unit boundary inside the codebase (Collection: INR: KRA-engine: Lakhs) that future maintainers must understand. Arguably in tension with the strict reading of "only CRM Leads/Opportunities use Lakhs." | **Recommended default** unless business explicitly wants KRA targets moved to INR. |
| **B** | Convert KRA targets to actual INR as well — i.e. multiply `KRATemplateItem.expectedTarget/stretchTarget` and every per-employee `KRA.target` value by 100000, and update `kra-engine.ts` to compare INR-to-INR directly with no conversion factor. | Fully consistent with "all Finance/Accounting values must use actual INR" — no Collection-vs-target unit boundary needed anywhere. | Touches every existing KRA template row and every employee's already-set `KRA.target` string (`parseTargets()` in `kra-engine.ts:16-26`), which is free-text and may contain inconsistent formatting. Higher risk of silently corrupting in-flight KRA cycles tied to historical scores already computed in Lakhs. Requires a coordinated data migration of `KRA.target` strings, not just a schema/type change. | Only if business decides KRA targets are Finance figures, not CRM-adjacent performance targets, and accepts the higher migration risk. |
| **C** | Leave Collection in Lakhs (do not convert). | Zero KRA risk, zero code change. | Violates the stated Money Unit Policy ("only CRM Leads/Opportunities may stay Lakhs; all Finance/Accounting values must be actual INR") — Collection is a Finance/Accounting model, not Leads/Opportunities. | **Not recommended** — rejects the policy this entire migration program exists to satisfy. |

---

## 5. Recommended KRA Boundary Decision

**Recommendation: Option A.**

- Collection storage (`invoiceValueLakhs`, `amountWithoutGstLakhs`, `amountReceivedLakhs`) moves
  to actual INR `Decimal(18,2)`, consistent with the Money Unit Policy for Finance/Accounting
  models.
- KRA targets (`KRATemplateItem.expectedTarget/stretchTarget` and the per-employee `KRA.target`
  string field) **remain Lakhs-scaled**, on the basis that KRA targets are sales/performance
  goals set in the same unit convention as CRM pipeline figures (`SalesFunnel.dealValueLakhs`),
  not raw ledger amounts — i.e. they are treated as adjacent to the Leads/Opportunities carve-out
  rather than as Finance data themselves.
- `src/lib/kra-engine.ts` must perform an **explicit, clearly documented** unit conversion
  (Collection INR → Lakhs, i.e. `÷ 100000`) at the exact point Collection figures are compared
  against KRA targets — specifically inside `totalCollectionsWithoutGst()` (lines 74-80) and
  `teamBilling()` (lines 289-295). The conversion must not be implicit or buried; a named
  constant or helper (not a bare `/ 100000` literal) and an inline comment stating *why* the
  conversion exists should be required in the Step 3T implementation.

**Flag for business sign-off:** This recommendation treats KRA targets as exempt from the
"actual INR" rule, which is **not a strict reading** of the stated policy ("only CRM Leads and
CRM Opportunities should use Lakhs-based values"). KRA targets are not literally Lead or
Opportunity records. The alternative strict reading is **Option B** — KRA targets should also
move to actual INR, since they fall outside the literal Leads/Opportunities carve-out.

**This decision requires explicit business/product sign-off before Step 3T can begin.** The two
positions to choose between:
1. **(Recommended, Option A)** KRA targets are sales/performance configuration, analogous to
   CRM pipeline data, and may stay Lakhs — kra-engine.ts owns the one explicit conversion point.
2. **(Strict policy reading, Option B)** KRA targets are Finance-adjacent figures and must also
   convert to actual INR, accepting the higher data-migration risk to per-employee `KRA.target`
   strings and KRA template seed rows.

---

## 6. `src/lib/payments.ts` Retirement Plan

`src/lib/payments.ts` is the active Finance write-path for Payment/Collection and contains
several Lakhs-unit assumptions baked into both logic and presentation text.

| File/Function | Current Behavior | Required Release 2 Change |
|---|---|---|
| `round2(n)` (lines 12-14) | `Math.round(n * 100) / 100` — a float-rounding workaround needed because Lakhs values are Floats with fractional precision (e.g. ₹0.61L). | Replace with `src/lib/money.ts`'s `Decimal`-based helpers (`roundMoney`, `addMoney`, etc.) once values are actual-INR `Decimal`. `round2` becomes unnecessary — `Decimal(18,2)` arithmetic does not accumulate float error the way Lakhs-scale floats do. |
| `syncCollectionTotals(collectionId)` (lines 17-52) — epsilon comparison `received + 0.001 >= invoice` | The `0.001` epsilon exists to absorb Lakhs-Float rounding error when comparing aggregated `Payment.amountLakhs` against `Collection.invoiceValueLakhs`. | With `Decimal(18,2)` INR values, exact equality (`.equals()` / `.gte()` from `money.ts`) replaces the epsilon hack. The epsilon must be removed, not widened, since `Decimal` doesn't need it. |
| `reconcileOpeningBalance(collectionId, recordedById)` (lines 74-101) — `gap = round2(cached - ledgerSum)` | Computes a Lakhs-Float gap between a cached `amountReceivedLakhs` and the actual ledger sum, inserting a synthetic "Opening Balance" Payment row. | Must be rewritten in INR `Decimal` arithmetic using `subtractMoney`/`addMoney` from `money.ts`; the synthetic row's amount and any audit-log values must be actual INR. |
| `recordPayment(input)` (lines 107-157) — `amountLakhs: round2(input.amountLakhs)`, notification title `\`Payment received: ₹${amount.toFixed(2)}L\`` | Creates the Payment row in Lakhs and bakes the "L" suffix directly into notification text and the `Notification.amountLakhs` field. | Field renamed (or repurposed) to actual-INR `Decimal`; notification text and field naming (`amountLakhs` → e.g. `amount`) must drop the Lakhs assumption; `formatMoney`/`moneyToNumberForDisplay` from `money.ts` should generate the display string instead of a hardcoded `${x}L` template. |
| `applyAdvance(advanceId, collectionId, recordedById)` (lines 163-189) | Converts an `OrderAdvance` into a `Payment` via `recordPayment`, inheriting all of the above. | No independent change beyond what `recordPayment` requires — but must be re-verified once `recordPayment` is rewritten, since `OrderAdvance` may already be INR (carry-over check from Release 1 scope, since `EmployeeAdvance` was converted but `OrderAdvance` is a separate model — must confirm `OrderAdvance`'s current unit before Step 3T). |
| `paymentsToday(employeeId?)` (lines 196-238) — returns `{ totalLakhs: round2(...), count, payments }` | The response field is literally named `totalLakhs`, consumed by `/api/payments/today` and surfaced to web + mobile dashboards per that route's own doc comment. | Field should be renamed to a unit-neutral name (e.g. `total`) and serialized via `money.ts`'s `serializeMoney`/`moneyToNumberForDisplay`; every consumer of `totalLakhs` (web dashboard, mobile dashboard, Accounts daily summary per the route's doc comment) must be located and updated in the same atomic change. |

No code in `payments.ts` is changed in this step — this table is a forward plan only.

---

## 7. API Boundary Plan

| API Route | Current Unit/Type | Required Release 2 Change | Response Shape Policy |
|---|---|---|---|
| `GET/POST /api/collections` (`src/app/api/collections/route.ts`) | Reads/writes `invoiceValueLakhs`, `amountWithoutGstLakhs`, `amountReceivedLakhs` as raw `Number()` in Lakhs (confirmed live write path, lines 96-100; read path line 45). | Convert read path to serialize `Decimal` via `money.ts` (`moneyToNumberForDisplay`/`serializeMoney`); convert write path to parse incoming body values as actual INR via `parseMoneyInput`/`safeMoneyDecimal`, not raw `Number()`. | No Decimal leakage in JSON responses — must serialize to plain numbers/strings via `money.ts`. UI response shape may remain numeric during transition; any field/label still implying Lakhs must be corrected. |
| `PUT/DELETE /api/collections/[id]` (`src/app/api/collections/[id]/route.ts`) | `PUT` accepts `invoiceValueLakhs`, `amountWithoutGstLakhs`, `amountReceivedLakhs` via raw `Number()` (lines 26-32); `DELETE`'s audit log snapshot captures `invoiceValueLakhs` raw (line 74). | Same `money.ts` parse/serialize change as the collection list route; audit-log snapshot values must also be actual-INR-correct so historical soft-delete records remain interpretable. | Same as above — no raw Decimal in JSON; audit log values must match the new unit. |
| `GET/POST /api/payments` (`src/app/api/payments/route.ts`) | `GET` returns raw `Payment` rows including `amountLakhs`; `POST` accepts `body.amountLakhs` via raw `Number()` and calls `recordPayment()`. | Mirror the `recordPayment()` rewrite from Section 6 — field naming and parsing both move to actual INR via `money.ts`. | Same no-leakage policy; field name change (`amountLakhs` → unit-neutral) must be coordinated with any UI consumer in the same release. |
| `GET /api/payments/today` (`src/app/api/payments/today/route.ts`) | Thin wrapper around `paymentsToday()`; returns `{ ...summary, scope }` where `summary.totalLakhs` is Lakhs. | Update once `paymentsToday()`'s return shape changes (Section 6); rename/relabel field, no logic change needed in this route itself. | Web + mobile dashboard and Accounts daily summary consumers (per route's doc comment) must be located and updated in lockstep. |
| `/api/kra-sync` (`src/app/api/kra-sync/route.ts`) | Calls `computeKRAProgress()` from `kra-engine.ts`, which internally calls `totalCollectionsWithoutGst()`/`teamBilling()`. This is the **sole boundary** through which `kra-engine.ts` reads Collection data — confirmed no other API or page imports `kra-engine.ts` directly. | Must apply the Section 5 conversion (Collection INR → Lakhs) inside `kra-engine.ts` before this route's existing call chain; the route itself needs no change, since it stores `kra-engine.ts`'s already-Lakhs-scaled output. | KRA-computed scores stored downstream (the `KRA` model's computed fields) must remain numerically identical before/after Release 2 — verified per Section 9. |
| `/api/certifications/[id]/approve` | Also imports `kra-engine.ts` (confirmed via repo-wide grep) — used for a certification-driven KRA recompute path, not directly Collection-related but shares the same `kra-engine.ts` boundary. | No direct change required beyond what `kra-engine.ts` itself needs; re-verify this route's KRA output is unaffected once `kra-engine.ts` changes. | Same KRA-score-stability requirement as `/api/kra-sync`. |

No API code is changed in this step.

---

## 8. UI Boundary Plan

| UI File/Area | Current Lakhs Behavior | Required Release 2 Change |
|---|---|---|
| `src/app/collections/CollectionsClient.tsx` | Pervasive Lakhs assumptions: form fields parse/submit raw Lakhs numbers (lines 166-210); summary cards render `₹${totalInvoiced.toFixed(2)}L` etc. (lines 347-349); table column headers are hardcoded `"Total Billed (₹L)"`, `"Total (Without GST) (₹L)"`, `"GST Amount (₹L)"`, `"Collected (₹L)"`, `"Outstanding (₹L)"` (line 395); per-row cells render raw Lakhs totals (lines 407-411, 435-441); GST back-calc (`inv / (1 + GST_RATE)`) operates on Lakhs values. | Form inputs must collect/submit actual INR (via `money.ts` parse helpers); every `"(₹L)"` header and `toFixed(2)}L` template must be replaced with INR formatting (`formatMoney`/no "L" suffix, or "(₹)" headers); GST back-calc math is unit-agnostic (a ratio) so it continues to work once both sides are INR, but precision handling should move to `money.ts` instead of raw float `.toFixed(4)`. |
| `src/app/mobile/screens/CollectionsScreen.tsx` | Confirmed (via repo grep) to reference Collection/KRA-adjacent figures; not read in full this step — must be reviewed line-by-line in Step 3T for the same "L" suffix and raw-number patterns found in the web client. | Apply the same INR conversion and label fix as the web `CollectionsClient.tsx`, consistent with the mobile-collateral fix already done for Release 1 (Step 3R). |
| Payment recording UI (wherever `POST /api/payments` is called from — not yet located/read; must be found in Step 3T) | Presumed to submit `amountLakhs` in Lakhs based on the API contract in Section 7. | Must be located and updated to submit actual INR once the API/route contract changes. |
| KRA dashboard / report surfaces reading `KRA` model output (e.g. `src/app/page.tsx`, settings/performance pages — not exhaustively read this step) | Per Section 5's recommended decision, KRA-computed scores/notes (e.g. the `Billing (ex-GST): ₹X L / ₹Y L` note text inside `kra-engine.ts` itself, lines ~417-444 and ~664-691) remain Lakhs-scaled and keep their "L" labels — this is intentional under Option A, not a bug to fix. | **No UI change required** if Option A is adopted, since KRA target/score display stays Lakhs by design. If Option B is adopted instead, every KRA "L" label tied to billing/revenue targets would need to change to INR — this is a material difference in Release 2 scope depending on which KRA boundary option business selects. |
| Any other "₹...L" or `×100000` converter not yet enumerated | Step 3T must re-run the same UI grep sweep used in Release 1 (Step 3Q) scoped to Payment/Collection-specific files, since this step's review was not exhaustive of every UI file (e.g. dashboard widgets outside `collections/` and `mobile/screens/` were not individually opened). | To be completed at Step 3T implementation time, not in this planning step. |

No UI code is changed in this step.

---

## 9. KRA Verification Plan (for Step 3T, not run now)

Before/after verification is mandatory regardless of which KRA boundary option is chosen:

- **If Option A is adopted:** for every Collection row, confirm
  `(new Collection.amountWithoutGstLakhs in INR) / 100000 === (old Collection.amountWithoutGstLakhs in Lakhs)`
  to full precision, and confirm `totalCollectionsWithoutGst(employeeId)` / `teamBilling()`
  produce **numerically identical** Lakhs-scale output before and after the migration for every
  employee with Collection rows. KRA scores stored on the `KRA` model must be bit-for-bit
  unchanged across the migration.
- **If Option B is adopted:** confirm
  `(new KRA target in INR) === (old KRA target in Lakhs) * 100000`
  for every `KRATemplateItem.expectedTarget/stretchTarget` and every per-employee `KRA.target`
  parsed value, and confirm the resulting KRA percentage scores (`clamp((billing / billingTarget) * 100)`)
  are unchanged, since both sides of the ratio scale identically.
- **Hard requirement either way:** zero KRA score may change by a factor of 100,000× (or any
  factor) as a side effect of this migration. Any score delta beyond floating-point/Decimal
  rounding noise blocks the Release 2 implementation from shipping.
- Verification must run against the same dev database snapshot used for the conversion, with a
  pre-migration export of every employee's computed KRA progress compared row-for-row against
  the post-migration recompute.

---

## 10. Migration History Gap Note

Step 3R's post-migration audit found two pre-existing migrations —
`add_advance_category` and `employeetarget_relations` — missing from the `_prisma_migrations`
tracking table. This gap **predates Release 1**, was not introduced by Release 1, and was
**not fixed** during the Step 3R audit (out of scope for that step). It does not block this
Release 2 planning step. It **should be reviewed and resolved before any production migration
planning** for Release 2 (or any future release), since an inconsistent `_prisma_migrations`
history can cause `prisma migrate deploy` to behave unpredictably against production. No action
is taken on this gap in this step.

---

## 11. Release 2 Atomic Implementation Rule

If and when Release 2 (Step 3T) proceeds, the following must ship together as a single atomic
change — no half-converted state is permitted, consistent with the rule applied to Release 1:

1. Prisma schema type changes (`Payment.amountLakhs`, `Collection.invoiceValueLakhs`,
   `Collection.amountWithoutGstLakhs`, `Collection.amountReceivedLakhs` → `Decimal(18,2)`).
2. Data migration multiplying existing values by 100,000.
3. API boundary updates (Section 7) — all five listed routes.
4. UI label/converter updates (Section 8) — `CollectionsClient.tsx`, `CollectionsScreen.tsx`,
   the (not-yet-located) Payment recording UI, and any other surface found in Step 3T's sweep.
5. The KRA engine boundary conversion (Section 5/9) inside `kra-engine.ts`, matching whichever
   option (A or B) is signed off.
6. `src/lib/payments.ts` retirement/refactor (Section 6) — `round2`, the epsilon comparison,
   `recordPayment`'s notification text and field naming, `paymentsToday`'s `totalLakhs` field.
7. Before/after KRA verification (Section 9) confirming zero score corruption.

None of these may ship independently of the others. A partial release (e.g. schema converted
but `kra-engine.ts` boundary not fixed) is the exact failure mode this entire planning document
exists to prevent.

---

## 12. Decision Ledger

| Decision | Recommended Value | Status |
|---|---|---|
| Payment conversion scope | `Payment.amountLakhs` → actual INR `Decimal(18,2)` | Pending explicit approval |
| Collection conversion scope | `invoiceValueLakhs`, `amountWithoutGstLakhs`, `amountReceivedLakhs` → actual INR `Decimal(18,2)` | Pending explicit approval |
| KRA target unit policy | Remain Lakhs (Option A) — KRA targets treated as sales/performance config, not Finance data | Pending explicit approval (flagged as a policy-interpretation choice, not a technical default) |
| KRA engine boundary conversion | Explicit, documented Collection INR→Lakhs conversion inside `totalCollectionsWithoutGst()` / `teamBilling()` only | Pending explicit approval |
| `payments.ts` retirement | Replace `round2()`/epsilon comparison with `money.ts` Decimal helpers; rename `amountLakhs`/`totalLakhs` fields | Pending explicit approval |
| API response policy | No Decimal leakage; serialize via `money.ts`; drop "Lakhs" naming/labels where actual INR is returned | Pending explicit approval |
| UI label policy | Replace "(₹L)" headers and `toFixed(2)}L` templates with INR formatting in Collection UI; KRA "L" labels stay as-is under Option A | Pending explicit approval |
| Production migration-history gap review | Review/resolve the two untracked migrations (Section 10) before production migration planning | Pending — not blocking this step |
| Release 2 permission to implement | Do not implement until all above decisions are explicitly approved | **Pending explicit approval** |

---

## 13. Final Recommendation

**Do not implement Release 2 yet.** The single decision that must be made explicitly by the
business/product owner before Step 3T can start is the **KRA target unit policy** (Section 5):
should KRA targets stay Lakhs-scaled (Option A, recommended technical path, smaller blast
radius) or move to actual INR alongside Collection (Option B, stricter reading of the stated
Money Unit Policy, higher migration risk to per-employee target data)?

Once that decision is signed off, the remaining Decision Ledger items in Section 12 follow
directly from it and can be approved as a package. After sign-off, a Step 3T implementation
prompt should be created, following the same atomic-implementation discipline used for
Release 1 (Step 3Q) and audited the same way afterward (as in Step 3R).
