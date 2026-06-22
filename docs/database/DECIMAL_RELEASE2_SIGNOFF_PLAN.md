# Decimal Release 2 Sign-Off Plan — Payment / Collection / KRA Boundary

**Step:** 3S (created) / 3T (KRA boundary decision locked) / **3T-1 (money unit policy corrected)**
**Status:** Planning / decision-lock only. **Step 3T's Option A lock is now superseded by Step 3T-1's corrected money unit policy.** Release 2 implementation is **Blocked pending the Sales/KRA target unit migration decision**. No schema, migration, API, UI, or data changes made in this step or any prior Release 2 planning step.
**Depends on:** Release 1 (Step 3Q, implemented) + Release 1 audit (Step 3R, zero bugs found).

> **Step 3T update (2026-06-22):** The KRA boundary decision is now **locked** by explicit
> business decision. **Option A is Approved.** Collection storage will move to actual INR in
> Release 2; KRA targets remain Lakhs-based for now; `kra-engine.ts` will perform the INR→Lakhs
> conversion only at the KRA scoring boundary. This is a business decision, not a technical
> default — see the updated Section 4/5/12 below. No code, schema, or data has been changed as a
> result of this decision; it is recorded here so Step 3U (the actual implementation) has an
> unambiguous, signed-off starting point.

> **Step 3T-1 correction (2026-06-22) — SUPERSEDES the Step 3T lock above.** The underlying money
> unit policy has been corrected: **all persisted business money values — Leads, Funnel,
> Opportunities, Collections, Payments, Finance, KRA target inputs, Sales targets, and Reports
> source data — must be actual INR.** Lakhs is now a display/reporting unit only. Under this
> corrected policy, **Step 3T's Option A is no longer final-approved as a permanent design** —
> it remains usable only as an explicitly-temporary compatibility bridge (see the new "Updated
> Decision Options" section below). Release 2 implementation permission is now **Blocked pending
> a Sales/KRA target unit migration decision** — see "Corrected Sales/KRA Unit Policy Impact"
> and the updated Section 12 Decision Ledger. No code, schema, or data has changed as a result of
> this correction.

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

## 4. KRA Boundary Options (Step 3T — superseded in part by §16, Step 3T-1)

> **Step 3T-1 correction:** the table below decided only the Collection-vs-KRA-target comparison
> boundary, and treated Option A as a final design. Under the corrected money unit policy, this
> table's Option A is **no longer final-approved as a permanent design** — see Section 16 for
> the updated options, which also address KRA target storage itself, not just the comparison
> boundary. The table below is preserved for historical record.

| Option | Description | Pros | Cons | Recommendation | **Decision Status (Step 3T)** |
|---|---|---|---|---|---|
| **A** | Keep KRA targets in Lakhs (status quo). Convert Collection storage to actual INR. Inside `src/lib/kra-engine.ts`, divide Collection INR values by 100000 *only* at the KRA scoring boundary (`totalCollectionsWithoutGst()`, `teamBilling()`), before comparing against Lakhs-based targets. | Smallest blast radius — KRA target seed data (`seed-performance-defaults.ts`), the per-employee `KRA.target` string field, and all KRA display "L" labels stay unchanged. Matches the existing convention that KRA targets are sales/performance goals, not raw Finance-ledger amounts. Only 2 functions need a one-line conversion. | Introduces a second, explicit unit boundary inside the codebase (Collection: INR: KRA-engine: Lakhs) that future maintainers must understand. Arguably in tension with the strict reading of "only CRM Leads/Opportunities use Lakhs." | **Recommended default** unless business explicitly wants KRA targets moved to INR. | **✅ Approved** — locked by explicit business decision, Step 3T. |
| **B** | Convert KRA targets to actual INR as well — i.e. multiply `KRATemplateItem.expectedTarget/stretchTarget` and every per-employee `KRA.target` value by 100000, and update `kra-engine.ts` to compare INR-to-INR directly with no conversion factor. | Fully consistent with "all Finance/Accounting values must use actual INR" — no Collection-vs-target unit boundary needed anywhere. | Touches every existing KRA template row and every employee's already-set `KRA.target` string (`parseTargets()` in `kra-engine.ts:16-26`), which is free-text and may contain inconsistent formatting. Higher risk of silently corrupting in-flight KRA cycles tied to historical scores already computed in Lakhs. Requires a coordinated data migration of `KRA.target` strings, not just a schema/type change. | Only if business decides KRA targets are Finance figures, not CRM-adjacent performance targets, and accepts the higher migration risk. | **Deferred** — not adopted now; KRA target migration to INR is deferred to a future KRA-specific project if needed. |
| **C** | Leave Collection in Lakhs (do not convert). | Zero KRA risk, zero code change. | Violates the stated Money Unit Policy ("only CRM Leads/Opportunities may stay Lakhs; all Finance/Accounting values must be actual INR") — Collection is a Finance/Accounting model, not Leads/Opportunities. | **Not recommended** — rejects the policy this entire migration program exists to satisfy. | **❌ Rejected.** Collection storage **must** move to actual INR in Release 2 — this option is explicitly ruled out, not merely deprioritized. |

**Explanation (Step 3T):** Option A is approved because KRA targets are sales/performance
targets and can remain Lakhs-based for now, while Finance Collection storage must move to INR.
This is not permission to keep Collection in Lakhs — Collection storage conversion to INR is
mandatory in Release 2; only the KRA target *comparison boundary* (inside `kra-engine.ts`) is
permitted to operate in Lakhs terms, and only because it is converting from the new INR storage
at that one explicit point.

---

## 5. Recommended KRA Boundary Decision (Step 3T — superseded by §15/§16/§18, Step 3T-1)

**Decision: Option A. Status: Approved (locked, Step 3T) — now superseded as a permanent design
by the Step 3T-1 money unit policy correction; see Section 15/16/18.**

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

**This decision required explicit business/product sign-off before implementation could begin —
that sign-off has now been given (Step 3T).** The two positions that were weighed:
1. **(Approved, Option A)** KRA targets are sales/performance configuration, analogous to
   CRM pipeline data, and may stay Lakhs — kra-engine.ts owns the one explicit conversion point.
2. **(Deferred, Option B)** KRA targets are Finance-adjacent figures and must also
   convert to actual INR, accepting the higher data-migration risk to per-employee `KRA.target`
   strings and KRA template seed rows. KRA target migration to INR is deferred to a future
   KRA-specific project if needed — it is not part of Release 2.

**Final business decision (Step 3T):** Finance Collection storage will move to actual INR. KRA
targets will remain Lakhs-based for now. `kra-engine.ts` must explicitly convert Collection INR
to Lakhs only at the KRA scoring boundary. This means: Finance and Accounting storage follows
the new policy (actual INR); KRA target configuration remains unchanged for now; KRA
calculations remain business-compatible; the unit conversion is isolated, explicit, and
documented inside the KRA boundary; KRA target migration to INR is deferred to a future
KRA-specific project if needed.

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
5. The KRA engine boundary conversion (Section 5/9) inside `kra-engine.ts`, implementing the
   locked Option A decision (Collection INR → Lakhs conversion at the scoring boundary only).
6. `src/lib/payments.ts` retirement/refactor (Section 6) — `round2`, the epsilon comparison,
   `recordPayment`'s notification text and field naming, `paymentsToday`'s `totalLakhs` field.
7. Before/after KRA verification (Section 9) confirming zero score corruption.

None of these may ship independently of the others. A partial release (e.g. schema converted
but `kra-engine.ts` boundary not fixed) is the exact failure mode this entire planning document
exists to prevent.

---

## 12. Decision Ledger

> **Step 3T-1 correction:** the "KRA target unit policy" and "Release 2 permission to implement"
> rows below are now superseded — see the strikethrough and the new status in each row. All
> other rows remain Approved and unaffected by the money-unit-policy correction.

| Decision | Recommended Value | Status |
|---|---|---|
| KRA target unit policy | ~~Keep KRA targets in Lakhs for now~~ **Corrected:** KRA target inputs/storage should move to actual INR via a separate Sales/KRA target migration; Lakhs remains a KRA-view/report display unit only | **Superseded (Step 3T-1)** — was Approved under Step 3T's Option A; now requires a fresh decision between Option A (full INR canonical, long-term) and Option B (temporary Lakhs bridge) below |
| KRA engine boundary conversion | Convert Collection INR to Lakhs inside `kra-engine.ts` only for KRA scoring | **Conditionally Approved** — only valid as a temporary bridge (new Option B) pending the Sales/KRA target migration; not valid as a permanent design |
| Collection storage unit | Convert Collection fields to actual INR in Release 2 | **Approved** — unaffected by this correction |
| Payment storage unit | Convert `Payment.amountLakhs` to actual INR in Release 2 | **Approved** — unaffected by this correction |
| `src/lib/payments.ts` retirement | Replace `round2`/epsilon logic with `src/lib/money.ts` in Release 2 | **Approved** — unaffected by this correction |
| API response policy | Preserve current response shape where practical; do not leak Decimal objects | **Approved** — unaffected by this correction |
| UI label policy | Remove Lakhs labels from Payment/Collection finance UI after conversion | **Approved** — unaffected by this correction |
| Production migration-history gap review | Review/resolve the two untracked migrations (Section 10) before production migration planning | Pending — not blocking this step |
| Release 2 permission to implement | ~~Approved for dev implementation only~~ | **Blocked (Step 3T-1)** — pending the Sales/KRA target unit migration decision (full INR migration now, vs. a temporary Lakhs bridge) |

---

## 13. Release 2 Implementation Preconditions

The KRA boundary decision (Section 4/5, Option A) is now locked. Before Step 3U (the actual
Release 2 implementation) may begin, the following preconditions apply:

1. **Dev DB only.** No Release 2 change targets production; all schema/data work happens on
   `u686730471_caveodev` exclusively, consistent with every prior Decimal-migration step.
2. **Payment and Collection fields only.** Scope is limited to `Payment.amountLakhs` and
   `Collection.invoiceValueLakhs`/`amountWithoutGstLakhs`/`amountReceivedLakhs` — no other model.
3. **KRA engine boundary conversion must be included in the same release.** The Option A
   conversion inside `totalCollectionsWithoutGst()`/`teamBilling()` (Section 5) ships in the same
   atomic change as the Collection schema/data conversion — never separately.
4. **`src/lib/payments.ts` must be updated in the same release.** The retirement plan in
   Section 6 (`round2()`/epsilon removal, `recordPayment()`/`paymentsToday()` field/text
   changes) is not optional follow-up work — it ships with the schema change.
5. **Payment/Collection UI labels and converters must be updated in the same release.** The
   Section 8 UI boundary plan (`CollectionsClient.tsx`, `CollectionsScreen.tsx`, the Payment
   recording UI, and any other surface found in Step 3U's sweep) ships together with the schema
   change — never a release where storage is INR but the UI still shows Lakhs (or vice versa).
6. **No CRM Lead/Opportunity/SalesFunnel migration in Release 2** — those remain out of scope
   regardless of which option (Section 16) is chosen for KRA targets. **(Superseded in part,
   Step 3T-1):** whether KRA targets migrate to INR *within* Release 2 now depends on the
   Section 16 Option A vs. Option B decision — Option A folds the KRA target migration into
   Release 2; Option B keeps it as a separate future project, same as originally stated here.
7. **No Voucher/Ledger migration in Release 2.** Both remain on their existing
   void/reversal-only lifecycle per the Step 3B-0 decision log; neither is touched by Release 2.
8. **Before/after Collection KRA score comparison required.** Per Section 9's verification plan,
   every employee's computed KRA progress must be exported before the migration and recomputed
   after, with zero score drift beyond Decimal-precision rounding noise.
9. **No half-converted state allowed.** Consistent with Section 11's Atomic Implementation Rule
   — schema, data, API, UI, KRA boundary, and `payments.ts` retirement all ship together, or none
   of them ship.

---

## 14. Final Recommendation (Step 3T, superseded — see §18)

**The KRA boundary decision is now locked (Step 3T): Option A is Approved.** Collection storage
moves to actual INR in Release 2; KRA targets remain Lakhs-based for now; `kra-engine.ts`
performs the INR→Lakhs conversion only at the KRA scoring boundary. Every row in the Section 12
Decision Ledger is now Approved except the production migration-history gap review (not blocking
this step).

**Do not implement Release 2 yet, even though the decision is locked.** This document remains
planning-only — no schema, migration, API, UI, or data change has been made as part of locking
this decision. The next step is to create a **Step 3U implementation prompt**, following the
same atomic-implementation discipline used for Release 1 (Step 3Q) and against the same 9
preconditions in Section 13, then audited the same way afterward (as in Step 3R).

> **This section is superseded by the Step 3T-1 correction below (§15–§18).** The Option A lock
> described here is no longer final-approved as a permanent design under the corrected money
> unit policy — it survives only as an explicitly-temporary bridge option. Read §18 for the
> current Final Recommendation.

---

## 15. Corrected Sales/KRA Unit Policy Impact (Step 3T-1)

The global money unit policy has been corrected (see `docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md`'s
Step 3T-1 note and `docs/database/DECIMAL_CONVERSION_READINESS_CHECK.md`'s §0 correction). The
earlier policy — "only CRM Leads and Opportunities may remain Lakhs-based" — is **superseded**.
The corrected policy is: **all persisted business money values must be stored as actual INR**;
Lakhs is a presentation/reporting unit only. This has direct consequences for Release 2:

- **Collection and Payment still must move to INR.** Nothing about this correction changes the
  core Release 2 scope (Section 2) — Collection and Payment storage conversion to actual INR
  remains required and unaffected.
- **KRA targets should also move to INR, in a separate Sales/KRA target migration.** The Step 3T
  decision to keep `KRATemplateItem.expectedTarget`/`stretchTarget` and the per-employee
  `KRA.target` string field Lakhs-based "for now" is no longer consistent with the corrected
  policy — KRA target inputs/storage are explicitly named in the corrected policy's scope.
- **Sales dashboard/KRA/report display may convert INR to Lakhs for readability.** This is the
  one place Lakhs remains legitimate: display-only, computed at render time from canonical INR
  storage, never the other way around.
- **`kra-engine.ts` should eventually compare INR to INR**, once both Collection and KRA targets
  are canonical INR — at that point reports may present the resulting figures in Lakhs for
  readability, but the comparison itself happens in the same unit on both sides.
- **A temporary INR-to-Lakhs comparison boundary (the Step 3T Option A design) is acceptable
  only as an interim compatibility bridge, and must be explicitly marked temporary** — both in
  code comments and in this document — never presented as the final architecture. See Option B
  below.

---

## 16. Updated Decision Options (Step 3T-1)

These options supersede the Step 3T Option A/B/C labels in Section 4, which addressed only the
Collection-vs-KRA-target comparison boundary in isolation. The options below address the full
corrected-policy scope (Collection, Payment, and KRA targets together).

### Option A — Full INR Canonical Model

- Payment and Collection storage move to INR (unchanged from the existing Release 2 scope).
- KRA target storage/input also moves to INR (`KRATemplateItem.expectedTarget`/`stretchTarget`,
  the per-employee `KRA.target` string field) — a new, separate Sales/KRA target migration.
- `kra-engine.ts` compares INR to INR directly — no conversion factor anywhere in the scoring
  path.
- Dashboards/KRA views/Reports display Lakhs by dividing by 100,000 at render time only.
- **Recommended long-term option.**

### Option B — Temporary Compatibility Bridge

- Payment and Collection storage move to INR (unchanged from the existing Release 2 scope).
- KRA targets remain Lakhs **temporarily** — this is the Step 3T Option A design, demoted from
  "permanent decision" to "interim bridge."
- `kra-engine.ts` converts Collection INR to Lakhs only for comparison, at the same one explicit
  boundary point already documented in Section 5 — unchanged mechanically, but **must be marked
  temporary** in code comments and in this document, not presented as final.
- **Requires a committed future KRA target migration** — Option B is not a standalone resting
  state; it exists only to unblock Release 2 if the Sales/KRA target migration cannot ship in
  the same release.

### Option C — Keep Collection or KRA canonical storage in Lakhs

- **Rejected.** This violates the corrected policy outright — Collection, Payment, and (in the
  long term) KRA targets must all use actual INR as canonical storage. Lakhs is never a
  permitted storage unit for any business model under the corrected policy.

**Recommendation: Option A, long-term.** Option B exists only as a fallback if the KRA target
migration genuinely cannot be scoped into the same release as Collection/Payment conversion.

**Step 3U should not proceed until this is decided: will Release 2 include Option A in full
(Collection + Payment + KRA targets all converting to INR together), or will it use Option B
temporarily (Collection + Payment convert now, KRA targets stay Lakhs with an explicitly-marked
temporary bridge, and a committed follow-up migration)?**

---

## 17. Sales/KRA Actual-INR Migration Needed

This is a forward-looking inventory only — **none of the areas below are migrated in this
step.** Candidate areas to review when the Sales/KRA target migration is scoped:

- Lead value inputs — `CrmLead.expectedValue`.
- Opportunity value inputs — `CrmOpportunity.value`/`dealValueExTax`/`netProfitLakhs`.
- Sales funnel value inputs — `SalesFunnel.dealValueLakhs`/`billingValueLakhs`.
- KRA target inputs — the per-employee `KRA.target` free-text string field parsed by
  `parseTargets()` in `kra-engine.ts`.
- KRA target seed data — `KRATemplateItem.minimumTarget`/`expectedTarget`/`stretchTarget` in
  `prisma/seed-performance-defaults.ts`.
- Employee target tables — `EmployeeTarget`/`TeamTarget` (currently store a generic
  `targetJson` free-text field, not a typed money column — must be reviewed for embedded money
  values before any type-level migration).
- Sales dashboards — any page rendering Lead/Opportunity/Funnel figures.
- KRA dashboards — any page rendering KRA progress/target figures.
- Sales reports — any report aggregating Lead/Opportunity/Funnel/KRA figures.

**Rule for this future migration:** inputs and storage should be actual INR; dashboards/KRA
views/reports may display Lakhs, computed at render time from canonical INR values. **This
migration is not implemented now** — it is a documented candidate scope for a future step.

---

## 18. Final Recommendation (Step 3T-1, current)

**The money unit policy has been corrected, superseding Step 3T's Option A lock as a permanent
design.** Collection and Payment must still move to INR in Release 2 — that part of the scope is
unchanged. But the KRA boundary question is no longer a simple "Option A vs. Option B" choice
about where one conversion factor lives — it is now a choice between migrating KRA targets to
INR **in the same effort** (Option A, full INR canonical model, recommended long-term) or
shipping Release 2 with an explicitly-temporary Lakhs bridge for KRA targets only (Option B),
with a committed follow-up migration.

**Release 2 implementation permission is now Blocked.** It was briefly Approved under Step 3T's
now-superseded lock; it is Blocked again under Step 3T-1 pending an explicit decision on Section
16's Option A vs. Option B. **Do not implement Release 2 until this is resolved.** The next step
is for the business/product owner to choose between Option A and Option B in Section 16; only
after that choice is made should a Step 3U implementation prompt be created, scoped accordingly
(full INR migration including KRA targets, or Collection/Payment conversion plus an
explicitly-temporary KRA bridge with a committed follow-up migration plan).
