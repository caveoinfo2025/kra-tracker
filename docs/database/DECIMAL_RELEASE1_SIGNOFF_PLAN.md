# Decimal Release 1 Sign-Off Plan

> **Step 3P (2026-06-22).** This document is the sign-off and implementation-planning
> artifact for Release 1 of the Finance Lakhs-to-INR + Decimal migration. It builds on
> `docs/database/DECIMAL_CONVERSION_READINESS_CHECK.md` (Steps 3N–3O: money unit policy,
> live data profile, transformation design, KRA impact). **No schema, migration, API, UI,
> or data change has been made in this step.** This is documentation only.

---

## 1. Purpose

**Why Release 1 needs explicit sign-off.** Converting `Expense`, `EmployeeAdvance`, and
`TravelClaim` money fields is not a single mechanical type change. It is two coupled
changes happening at once: (a) a **value transformation** (₹ Lakhs → actual ₹ INR, i.e.
`× 100,000` for the Lakhs-native fields) and (b) a **schema type change**
(`Float` → `Decimal`). Either change alone is safe; doing only one and not the other
corrupts every consumer of these fields (API responses, UI cards, vouchers, audit logs).
Sign-off is required because this is the first time in this project either change touches
live (if sparse) Finance data.

**Why this is not a schema migration step.** Step 3P documents *what* will change and in
*what order*, and records explicit approval/blocked status for each piece. No
`prisma migrate`, schema edit, or `npx tsx` write script is run here. The implementation
itself is deferred to **Step 3Q**.

**Why Finance Lakhs fields need value transformation to actual INR.** The locked Money
Unit Policy (see readiness check §0) states only Leads and Opportunities may use
Lakhs-based values; Finance and Accounting must store actual INR. Step 3O's field-by-field
verification confirmed `Expense.amountLakhs`, `Expense.gstAmountLakhs`,
`EmployeeAdvance.amountLakhs/disbursedAmountLakhs/settledAmountLakhs/balanceLakhs`, and
`TravelClaim.amountLakhs` are genuinely stored as ₹ Lakhs today (not actual INR despite
some misleading proximity to INR-named siblings). A Decimal type change with no value
transformation would leave these fields Decimal-typed but still policy-violating.

**Why Payment/Collection are excluded from Release 1.** `Payment.amountLakhs` and the
three `Collection.*Lakhs` fields feed `src/lib/kra-engine.ts`'s
`totalCollectionsWithoutGst()`, which is compared directly against Lakhs-scaled KRA
targets (`KRATemplateItem.expectedTarget/stretchTarget`) with **zero conversion factor**
today. Converting `Collection` to INR without a matching divide-by-100,000 at that one
KRA boundary would silently corrupt every employee's billing-KRA score. That decision is
not yet signed off (readiness check §12, "KRA scoring decision" = Approved with notes,
not Approved) — it is Release 2's blocker, not Release 1's.

---

## 2. Release 1 Approved Field List

| Model | Field | Current Unit | Target Unit | Transformation | Target Type | Status |
| ----- | ----- | ------------- | ----------- | --------------- | ------------ | ------ |
| Expense | amountLakhs | ₹ Lakhs | ₹ INR | `× 100,000` | `Decimal @db.Decimal(18,2)` | Approved with notes — dev has 0 `Expense` rows, no live value to transform/verify against |
| Expense | gstAmountLakhs | ₹ Lakhs | ₹ INR | `× 100,000` | `Decimal @db.Decimal(18,2)` | Approved with notes — same 0-row caveat |
| EmployeeAdvance | amountLakhs | ₹ Lakhs | ₹ INR | `× 100,000` | `Decimal @db.Decimal(18,2)` | Approved — 1 live dev row (₹0.5L → ₹50,000), clean profile |
| EmployeeAdvance | disbursedAmountLakhs | ₹ Lakhs (nullable) | ₹ INR (nullable) | `× 100,000` (skip if null) | `Decimal? @db.Decimal(18,2)` | Approved — 1 row, currently null, clean |
| EmployeeAdvance | settledAmountLakhs | ₹ Lakhs (nullable) | ₹ INR (nullable) | `× 100,000` (skip if null) | `Decimal? @db.Decimal(18,2)` | Approved — 1 row, currently null, clean |
| EmployeeAdvance | balanceLakhs | ₹ Lakhs | ₹ INR | `× 100,000` | `Decimal @db.Decimal(18,2)` | Approved — 1 row (0 → 0), clean |
| TravelClaim | amountLakhs | ₹ Lakhs | ₹ INR | `× 100,000` | `Decimal @db.Decimal(18,2)` | Approved with notes — dev has 0 `TravelClaim` rows; the Step 3O profile and `seed-dev-finance.ts` reference values exist but no row is currently persisted |
| TravelClaim | amountRupees | ₹ INR (already) | ₹ INR | None | `Decimal @db.Decimal(18,2)` | Approved with notes — same 0-row caveat; only the type changes |
| TravelClaim | ratePerKm | ₹/km (already) | ₹/km | None | `Decimal @db.Decimal(10,4)` | Approved with notes — same 0-row caveat; rate scale, not money scale |

Note: dev's `EmployeeAdvance`/`TravelClaim` row counts come from the Step 3O live data
profile (readiness check §4). `Expense`/`TravelClaim` currently have **0 persisted rows**
in `u686730471_caveodev` — this does not block Decimal type conversion (an empty table
converts trivially) but it does mean the value-transformation step has nothing real to
verify against until smoke-test data exists (§6).

---

## 3. Release 1 Exclusions

| Model | Field | Reason Excluded | Future Release |
| ----- | ----- | ---------------- | ---------------- |
| Payment | amountLakhs | Feeds `kra-engine.ts` indirectly via `Collection`; live-data boundary risk; `payments.ts` round2/epsilon workaround must retire in the same release | Release 2 |
| Collection | invoiceValueLakhs | Drives KRA billing score (`totalCollectionsWithoutGst()`); 94 live dev rows; KRA unit policy not yet signed off | Release 2 |
| Collection | amountWithoutGstLakhs | Same KRA boundary risk; derived via GST back-calc formula, needs its own verification pass | Release 2 |
| Collection | amountReceivedLakhs | Same KRA boundary risk | Release 2 |
| Voucher.amountLakhs / Ledger.amountLakhs | Cross-cutting Finance ledger fields that mirror whichever source document (Expense, Advance, Payment, etc.) posted them; converting before the source models convert would create a unit mismatch between a `Voucher`/`Ledger` row and the `Expense`/`EmployeeAdvance` row it references | Future release (after Release 1 AND Release 2 source models settle) |
| CRM Lead / Opportunity values (e.g. `dealValueLakhs`, `netProfitLakhs`, pipeline `PIPELINE_VALUE`-style figures) | Out of scope by the locked Money Unit Policy — Leads and Opportunities are explicitly permitted to remain Lakhs-based; no conversion is wanted here, ever | Not planned — policy-excluded |
| KRA target values (`KRATemplateItem.expectedTarget/stretchTarget`, `EmployeeTarget`) | Lakhs-based by design (confirmed via `seed-performance-defaults.ts`); KRA scoring is intended to stay Lakhs-native per the Step 3O recommendation — only the `Collection` boundary feeding it needs a conversion factor, not the targets themselves | Not planned — stays Lakhs by design |
| Policy threshold fields (e.g. `ExpenseLimitRule.dailyLimit/monthlyLimit/yearlyLimit`, `ConveyancePolicy.monthlyLimitRupees`, `ratePerKm` on policy tables) | Not part of the 13-field candidate inventory from Step 3N; these are configuration ceilings, not transactional money records, and were never profiled for unit correctness | Out of scope — would need its own readiness review if ever proposed |

---

## 4. No-Half-Converted-State Rule

For any model included in Release 1, the following must change together, in the same
implementation release (Step 3Q), with no intermediate deployed state where only some of
these are true:

1. **DB stored values** — every existing row's Lakhs-native field is multiplied by
   100,000 (or left as-is for `amountRupees`/`ratePerKm`).
2. **Prisma schema types** — the field's type changes from `Float`/`Float?` to
   `Decimal @db.Decimal(18,2)` (or `Decimal(10,4)` for `ratePerKm`).
3. **API boundary serialization** — every route reading/writing the field uses
   `src/lib/money.ts` and treats the value as INR, not Lakhs.
4. **UI labels and converters** — every `lakhsToRupees()`/`fmtINRfromLakhs()`/`× 100_000`
   call site touching this field is removed or updated so the UI no longer re-multiplies
   an already-INR value.
5. **Documentation/comments** — schema comments, API doc comments, and
   `docs/DATABASE.md`/`docs/API.md` references to "₹ Lakhs" for these fields are updated
   to "₹ INR" (or the field is renamed in a later pass — renaming itself is out of scope
   for Step 3Q).
6. **Smoke tests/manual checks** — the before/after verification in §9 passes for every
   row of every Release 1 field before the release is considered complete.

**Explicit prohibitions:**

- A model must **not** store INR in the database while the UI still treats it as Lakhs
  (multiplies by 100,000 a second time) — this silently inflates every displayed amount
  100,000×.
- A model must **not** keep storing Lakhs while an API response or doc comment labels the
  field as INR — this silently deflates every consumer reading the field as actual rupees.

---

## 5. Required Implementation Sequence For Step 3Q

This sequence is **designed, not implemented**, in this step.

1. Create smoke-test seed data for `Expense` and `TravelClaim` in dev only, if still
   empty (see §6).
2. Snapshot pre-migration values for all Release 1 fields (every row, every field, as
   they exist immediately before Step 3Q begins).
3. Update Prisma schema field types:
   - Lakhs money fields (`Expense.amountLakhs/gstAmountLakhs`,
     `EmployeeAdvance.amountLakhs/disbursedAmountLakhs/settledAmountLakhs/balanceLakhs`,
     `TravelClaim.amountLakhs`) → `Decimal @db.Decimal(18,2)`.
   - `TravelClaim.amountRupees` → `Decimal @db.Decimal(18,2)`.
   - `TravelClaim.ratePerKm` → `Decimal @db.Decimal(10,4)`.
4. Generate reviewed migration SQL (no `db push`; hand-review the generated `ALTER TABLE`
   statements before any apply, per this project's established Hostinger-no-shadow-DB
   migration pattern).
5. Add value-transformation SQL, run in the same maintenance window as the schema change:
   - Lakhs fields: `UPDATE ... SET col = col * 100000` (skip/preserve `NULL` for the
     nullable `EmployeeAdvance` fields).
   - `amountRupees`: no multiplication — type change only.
   - `ratePerKm`: no multiplication — type change only.
6. Apply schema + transformation only to the **dev** database
   (`u686730471_caveodev`) — never production in this step.
7. Regenerate the Prisma client (`npx prisma generate`) and restart the dev server
   (Turbopack caches the old client per CLAUDE.md gotcha #4).
8. Update affected API boundaries (`/api/finance/expenses`, `/api/finance/expenses/[id]`,
   `/api/finance/advances`, `/api/finance/dashboard`) to read/write these fields through
   `src/lib/money.ts` as INR.
9. Update affected UI labels/converters (`ExpenseRegisterClient.tsx`, `ClaimsClient.tsx`,
   `AdvancesClient.tsx`, `expenses/data.ts`'s `lakhsToRupees()`,
   `FinanceDashboardClient.tsx`'s `lakhsToRupees()`,
   `FinanceApprovalsClient.tsx`'s inline `× 100_000`) to stop re-converting Release 1
   fields, while leaving Release-2 fields (Payment/Collection) and Lead/Opportunity
   converters untouched.
10. Run the before/after comparison (§9) against the dev DB.
11. Run validation: `npx prisma validate`, `npx tsc --noEmit`, `npm run build`.
12. Document results in `docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md` and the
    readiness check.

**Important: Step 3Q must be atomic for Release 1** — items 3–9 above are deployed as one
change, not phased across multiple commits/releases, to avoid the half-converted state
prohibited in §4.

---

## 6. Smoke-Test Data Requirement

`Expense` and `TravelClaim` have **0 dev rows** today (Step 3O live profile). Without at
least one real row in each, the value-transformation step in §5 item 5 has nothing to
multiply, and §9's before/after verification has nothing to verify. **No data is inserted
in this step** — the values below are a plan for Step 3Q to execute.

| Model | Field(s) | Planned Sample Value | Expected INR After Transform |
| ----- | -------- | --------------------- | ------------------------------ |
| Expense (row A) | amountLakhs | 0.1 | 10000.00 |
| Expense (row A) | gstAmountLakhs | 0.018 | 1800.00 |
| Expense (row B) | amountLakhs | 10.555 | 1055500.00 |
| Expense (row B) | gstAmountLakhs | 1.895 | 189500.00 |
| EmployeeAdvance (existing row) | amountLakhs | 0.5 (already persisted) | 50000.00 |
| TravelClaim (new row) | amountLakhs | 0.025 | 2500.00 |
| TravelClaim (new row) | amountRupees | 2500 | 2500.00 (no multiplication) |
| TravelClaim (new row) | ratePerKm | 12.5 | 12.5000 (no multiplication, scale 4) |

Row A and Row B for `Expense` are chosen to cover both a small typical claim and a larger
value crossing into 6-figure INR, exercising rounding and scale at both ends.

**Smoke data must be inserted only in the dev database** (`u686730471_caveodev`), and must
be either cleaned up after Step 3Q verification or clearly marked (e.g. a narration prefix
like `"[SMOKE TEST]"`) so it is never mistaken for real transactional history.

---

## 7. API Boundary Update Plan

| API Route | Current Unit/Type | Required Release 1 Change | Response Shape Policy |
| --------- | ------------------- | ---------------------------- | ------------------------- |
| `/api/finance/expenses` (GET, POST) | Reads/writes `Float` ₹ Lakhs; already wired to `src/lib/money.ts` for arithmetic (Step 3K); response fields (`baseAmount`, `gstAmount`, `totalAmount`, `totalExpenses`, etc.) are `fmtMoney`-formatted strings labeled implicitly as Lakhs | After Step 3Q's schema change, these same `moneyToNumberForDisplay`/`addMoney` call sites read `Decimal` INR values instead of `Float` Lakhs values — no new wiring needed, only the underlying column's unit changes | Existing string-shaped response fields stay string-shaped; only the magnitude changes (Lakhs string → INR string). No field renamed in Step 3Q. |
| `/api/finance/expenses/[id]` (GET) | Same pattern, single-record version | Same — read path already uses `money.ts` | Same — response shape stable |
| `/api/finance/advances` (GET, POST) | Reads `Float` ₹ Lakhs directly via Prisma `_sum`/raw field reads (`amountLakhs`, `disbursedAmountLakhs`, `settledAmountLakhs`, `balanceLakhs`); **not yet wired to `money.ts`** — uses a separate `fmt`/`fmtMoney`-style helper directly on the raw Float | Must be wired to `src/lib/money.ts` (`serializeMoney`/`moneyToNumberForDisplay`) as part of Step 3Q so it reads `Decimal` correctly and stays consistent with the Expense route's pattern; the POST body's `amountLakhs: number` field should be parsed via `parseMoneyInput`/`toMoneyDecimal` instead of a raw `typeof body.amountLakhs !== "number"` check | Response field names (`amountLakhs`, `disbursedAmountLakhs`, etc.) stay as-is in Step 3Q — see field-name compatibility note below |
| `/api/finance/conveyance` (GET) | Reads `TravelClaim.ratePerKm`/`amountRupees` directly, no Lakhs conversion (already real INR/rate) | Minimal — only the underlying type changes from `Float` to `Decimal`; the route should pass these through `moneyToNumberForDisplay`/`serializeMoney` rather than the raw Prisma value to avoid returning a Decimal object directly | Response shape stable; values numerically unchanged (no `× 100,000`) |
| `/api/finance/dashboard` (GET) | Already wired to `money.ts` (Step 3L) for `Expense` aggregates (`todayExp`, `monthlyExp`, `customerExp`, `monthMap`); also touches `EmployeeAdvance`/`TravelClaim` only indirectly if at all — confirm no direct read of Release 1 advance/travel fields beyond what Step 3L already covered | Same as `/api/finance/expenses` — existing `money.ts` wiring continues to work once the underlying columns are `Decimal` INR | Response shape stable |

**Policy:**

- Existing read response shapes should remain stable where possible — Step 3Q changes
  *values*, not JSON field names.
- Existing UI should not break — UI converters are updated in the same release (§8), not
  left to silently re-multiply.
- **Field-name compatibility note:** the JSON field names (`amountLakhs`,
  `disbursedAmountLakhs`, `settledAmountLakhs`, `balanceLakhs`) still say "Lakhs" even
  after the value becomes INR. This is a known, deliberate temporary inconsistency —
  renaming the field name is a larger, separate API-contract change (affects every UI
  consumer's prop name) and is explicitly **deferred past Step 3Q**. It is tracked here so
  it is not mistaken for an oversight.
- Use `src/lib/money.ts` at every API boundary touching a Release 1 field.
- Do not return a raw Prisma `Decimal` object directly in any JSON response — always pass
  through `serializeMoney`/`moneyToNumberForDisplay`/`fmtMoney`.

---

## 8. UI Update Plan

| UI File/Area | Current Lakhs Behavior | Required Release 1 Change |
| -------------- | ------------------------ | ----------------------------- |
| `src/app/finance/expenses/data.ts` (`lakhsToRupees`) | `Math.round(Number(s) * 100000 * 100) / 100` applied to `baseAmount`/`gstAmount`/`totalAmount` strings from the Expense API | Remove the `× 100000` multiplication for these fields once the API returns INR-magnitude strings — keep the function only if other still-Lakhs fields need it, otherwise delete |
| `src/app/finance/expenses/ExpenseRegisterClient.tsx` | Calls `lakhsToRupees()` on `baseAmount`/`gstAmount`/`totalAmount` | Update call sites to consume the (now-INR) values directly, no re-multiplication |
| `src/app/finance/claims/ClaimsClient.tsx` (local `lakhsToRupees`/`fmtLakhs`) | Same `× 100_000` pattern applied to Expense summary cards (`totalExpenses`, `todayExpenses`, etc.) and per-row `totalAmount` | Same — remove the multiplication for Release 1 fields; this file is the "Claims" (Expense claims) UI, distinct from `TravelClaim`/conveyance despite the similar name |
| `src/app/finance/advances/AdvancesClient.tsx` (local `lakhsToRupees`/`fmtLakhs`) | `× 100000` applied to every `EmployeeAdvance` summary card and table column (`amountLakhs`, `balanceLakhs`, `disbursedAmountLakhs`, `settledAmountLakhs`) plus the live form preview (`form.amountLakhs` × conversion while typing) | Remove the multiplication everywhere in this file for Release 1 fields; the "Amount (₹ Lakhs)" form label (line ~804) must also change to "Amount (₹)" since the input will now be actual INR |
| `src/app/finance/conveyance/*` (`ConveyanceClient.tsx`, `data.ts`, `components/*`) | Currently **100% mock data**, not wired to the `/api/finance/conveyance` route at all; `ratePerKm`/`claimAmount`/`amountRupees` are already treated as real INR in the mock layer, no Lakhs conversion present | No change required for Release 1 — this UI doesn't touch the real `TravelClaim` Lakhs field yet. Flag for a future "wire conveyance UI to the real API" task, out of scope here. |
| `src/app/finance/FinanceDashboardClient.tsx` (local `lakhsToRupees`) | `× 100000` applied to dashboard cards; need to confirm whether any of its cards source from `EmployeeAdvance`/`TravelClaim` directly vs. only `Expense`/`Ledger`/`Voucher` aggregates | If a card sources a Release 1 field, remove that card's multiplication; cards sourcing Release-2 (`Collection`/`Payment`) or Voucher/Ledger fields must keep their multiplication untouched |
| `src/app/finance/approvals/FinanceApprovalsClient.tsx` (inline `Math.round(ctx.amountLakhs * 100_000)`) | Converts an approval-context `amountLakhs` value (sourced from whichever record — Expense, Advance, or other — is pending approval) | Must branch by source model: if the pending item is `Expense`/`EmployeeAdvance`/`TravelClaim`, stop multiplying (already INR); if `Payment`/`Collection`, keep multiplying (still Lakhs) — this file needs the most careful per-record-type review in Step 3Q since it's a shared approval-context renderer |

Display labels showing "Lakhs"/"L" for Release 1 models specifically:

- `AdvancesClient.tsx` line ~804: `"Amount (₹ Lakhs)"` label on the advance request form —
  must change to `"Amount (₹)"`.

No other Release 1-specific "L"-suffix labels were found; the Collections "L"-suffix
labels (`CollectionsClient.tsx`) belong to Release 2 and are untouched here.

**No UI code is modified in this step** — this table is the Step 3Q work order.

---

## 9. Before/After Verification Plan

For each converted field, Step 3Q must record:

| Model | Field | Record ID | Before | Expected After | Actual After | Pass |
| ----- | ----- | ---------: | ------: | ---------------: | -------------: | ---- |
| EmployeeAdvance | amountLakhs | (existing row, e.g. id 1) | 0.5 | 50000.00 | _to fill in Step 3Q_ | _pending_ |
| EmployeeAdvance | balanceLakhs | (existing row) | 0 | 0.00 | _pending_ | _pending_ |
| EmployeeAdvance | disbursedAmountLakhs | (existing row) | NULL | NULL | _pending_ | _pending_ |
| EmployeeAdvance | settledAmountLakhs | (existing row) | NULL | NULL | _pending_ | _pending_ |
| Expense | amountLakhs | (smoke row A) | 0.1 | 10000.00 | _pending_ | _pending_ |
| Expense | gstAmountLakhs | (smoke row A) | 0.018 | 1800.00 | _pending_ | _pending_ |
| Expense | amountLakhs | (smoke row B) | 10.555 | 1055500.00 | _pending_ | _pending_ |
| Expense | gstAmountLakhs | (smoke row B) | 1.895 | 189500.00 | _pending_ | _pending_ |
| TravelClaim | amountLakhs | (smoke row) | 0.025 | 2500.00 | _pending_ | _pending_ |
| TravelClaim | amountRupees | (smoke row) | 2500 | 2500.00 | _pending_ | _pending_ |
| TravelClaim | ratePerKm | (smoke row) | 12.5 | 12.5000 | _pending_ | _pending_ |

This table is a **template** to be filled in during Step 3Q execution, not actual
verification results — no transformation has run yet.

Also verify, for every Release 1 row, after Step 3Q's transformation runs:

- No values became `NULL` unexpectedly (nullable fields that were already `NULL` stay
  `NULL`; non-nullable fields never become `NULL`).
- No negative values were introduced (multiplying a positive Lakhs value by 100,000 cannot
  produce a negative result — a negative post-value indicates a bug, not legitimate data).
- No over-large/overflow values were introduced (`Decimal(18,2)` supports up to 16 integer
  digits — far beyond any realistic INR amount, so overflow would indicate a
  transformation-script bug, e.g. double-multiplication).
- The API still returns the expected response shape (same field names, string-typed money
  values, no raw Decimal leakage).
- The UI displays the expected INR values (no residual `× 100,000` re-multiplication from
  a converter that wasn't updated).

---

## 10. Rollback / Safety Plan

- **Dev DB backup before applying** — take a full dump/snapshot of `u686730471_caveodev`
  (or at minimum the `expense`, `employee_advance`/`EmployeeAdvance`, and `TravelClaim`
  tables) immediately before Step 3Q's schema + transformation step.
- **Migration SQL manual review** — the generated `ALTER TABLE`/`UPDATE` statements must be
  read end-to-end before applying, consistent with this project's established
  no-shadow-DB pattern (hand-reviewed SQL applied via a one-off script, then
  `prisma migrate resolve --applied`).
- **No production run** — Step 3Q applies to dev only. Production is explicitly out of
  scope until dev is verified end-to-end and a separate production-migration plan is
  written and approved.
- **If values transform incorrectly:** restore the affected table(s) from the
  pre-migration backup, or — since this is dev-only — drop and re-seed the affected rows;
  never attempt to "reverse" a transformation by guessing an inverse multiplier on
  already-corrupted data.
- **Production migration must be separately reviewed** — this plan does not authorize any
  production schema change; a follow-up production-specific plan (with its own backup,
  maintenance-window, and rollback procedure) is required before Release 1 ever touches
  production.
- **Do not use `db push`** — all schema changes go through reviewed migration SQL per the
  existing Hostinger/no-shadow-DB workflow; `db push` skips the review step this plan
  depends on.

---

## 11. Sign-Off Ledger

| Decision | Final Value | Status |
| -------- | ------------ | ------ |
| Money unit policy | Finance/Accounting = actual INR; Leads/Opportunities = Lakhs (locked, Step 3N policy update) | Approved |
| Release 1 field scope | 9 fields across `Expense`, `EmployeeAdvance`, `TravelClaim` (§2) | Approved with notes (Expense/TravelClaim 0-row caveat) |
| Release 1 transformation rule | `× 100,000` for Lakhs-native fields; no multiplication for `amountRupees`/`ratePerKm` | Approved |
| Release 1 API response policy | Existing JSON field names and string-shaped values stay stable in Step 3Q; field renames deferred | Approved with notes (the Lakhs-named-but-INR-valued field name remains until a later rename pass) |
| Release 1 UI converter update policy | Remove `× 100,000`/`lakhsToRupees()` re-conversion for Release 1 fields only, in the same release as the schema change | Approved |
| Release 1 smoke data requirement | Insert dev-only smoke rows for `Expense`/`TravelClaim` per §6 before transformation verification | Approved |
| Release 2 Payment/Collection status | Excluded from Release 1; deferred pending KRA/Collection unit decision | Blocked |
| KRA/Collection status | Recommendation documented (Collection → INR, KRA targets stay Lakhs, `kra-engine.ts` boundary conversion at `totalCollectionsWithoutGst()`) but not yet explicitly approved | Approved with notes |
| Decimal schema conversion permission | Permission to execute Step 3Q's schema + transformation against the **dev** database for the 9 Release 1 fields | **Approved for dev Release 1 implementation only** (2026-06-22) — production remains out of scope pending a separate production-migration plan |

---

## 12. Final Recommendation

- **Release 1 can proceed only after sign-off of this plan** — specifically the §11
  ledger's "Decimal schema conversion permission" row moving from "Pending" to
  "Approved."
- **Step 3Q should implement Release 1 atomically** — schema, data transformation, API
  boundary, and UI converter updates land together, per the No-Half-Converted-State Rule
  (§4). Smoke-test data (§6) should be created and verified (§9) as part of the same
  step, not a separate one.
- **Payment/Collection must not be included in Release 1** under any circumstance — they
  remain excluded per §3 until Release 2 is separately scoped and approved.
- **KRA/Collection must be resolved before Release 2** — the `kra-engine.ts` boundary
  conversion decision (readiness check §"Collection / KRA Engine Impact") needs explicit
  sign-off (not just a recommendation) before any `Payment`/`Collection` field converts.

---

## Implementation Note (Step 3P, 2026-06-22)

Step 3P completed: created this Release 1 sign-off plan, confirming the 9-field scope, the
No-Half-Converted-State requirements, the atomic Step 3Q implementation sequence, the
smoke-test data plan for `Expense`/`TravelClaim` (both 0 rows in dev), the API boundary and
UI update tables for `/api/finance/expenses`, `/api/finance/expenses/[id]`,
`/api/finance/advances`, `/api/finance/conveyance`, and the before/after verification
template. No schema, migration, API, UI, or database change was made. Decimal schema
conversion remains gated on explicit sign-off of the §11 ledger before Step 3Q begins.

---

## Implementation Note (Step 3Q, 2026-06-22)

**Step 3Q completed: Release 1 schema/data/API/UI migration implemented on the dev
database (`u686730471_caveodev`).**

- §11's "Decimal schema conversion permission" was updated to **Approved for dev Release
  1 implementation only** before any change was made.
- Smoke-test data created for `Expense` (2 rows) and `TravelClaim` (1 row), each clearly
  marked `[SMOKE TEST — Step 3Q Release 1]` in a text field; `EmployeeAdvance`'s 1 existing
  row was used as-is.
- Pre-migration values snapshotted, then all 9 fields transformed in one migration
  (`prisma/migrations/20260622120000_decimal_release1_lakhs_to_inr/`): Lakhs-denominated
  fields multiplied by 100,000 (while still `Float`/`DOUBLE`, for precision), then all 9
  columns altered to `Decimal` (`Decimal(18,2)` for money fields, `Decimal(10,4)` for
  `TravelClaim.ratePerKm`). `TravelClaim.amountRupees`/`ratePerKm` received no value
  transformation — only the type changed.
- Applied via a guarded one-off script that refused to run against any database other
  than `u686730471_caveodev`; resolved with `prisma migrate resolve --applied` and
  regenerated the Prisma client. Full before/after verification (11/11 fields pass) is in
  `docs/database/DECIMAL_RELEASE1_MIGRATION_RESULTS.md`.
- API boundaries updated for `/api/finance/expenses`, `/api/finance/expenses/[id]`,
  `/api/finance/advances` (now wired to `src/lib/money.ts`, closing the gap flagged in §7),
  `/api/finance/conveyance`, and `/api/finance/dashboard` — all now serialize `Decimal`
  values through `src/lib/money.ts` rather than leaking raw Decimal objects or breaking on
  the new column type. The legacy mobile `/api/expenses` write route (an existing,
  pre-Step-3Q endpoint that also writes `Expense.amountLakhs`/`gstAmountLakhs`, not
  discovered until this step) had its `AUTO_APPROVE_LIMIT_L = 0.10` (₹ Lakhs) threshold
  corrected to `AUTO_APPROVE_LIMIT_INR = 10000` (₹ INR) to avoid silently breaking its
  auto-approval logic — the only collateral write-path fix required to avoid a
  half-converted state for the `Expense` model.
- UI updated for `ExpenseRegisterClient.tsx`/`expenses/data.ts`, `ClaimsClient.tsx`,
  `AdvancesClient.tsx` (incl. the "Amount (₹ Lakhs)" label → "Amount (₹)"),
  `FinanceApprovalsClient.tsx` (now branches by `entityType` so `ADVANCE` amounts are no
  longer re-multiplied while any future Lakhs-denominated entity type still would be), and
  `FinanceDashboardClient.tsx` (split into two formatters — `fmtRupees`/`lakhsToRupees` kept
  for still-Lakhs `FinAccount`/`Ledger` fields; a new `fmtINRDirect` added for the
  now-actual-INR Expense/EmployeeAdvance/TravelClaim KPI cards; chart values converted via
  `inrToLakhsEquivalent` before feeding the existing Lakhs-calibrated `fmt`/`fmtShort`
  Cr/L/K chart formatters, so the dashboard's visual scale logic keeps working unchanged).
  Conveyance UI confirmed still 100% mock data — no change needed.
- **Payment, Collection, Voucher, Ledger, FinAccount, OrderAdvance, Notification, CRM
  Lead/Opportunity/SalesFunnel, and KRA target values were not touched** — confirmed via
  `git diff --stat` (13 files changed, all within the planned Release 1 scope) and the
  migration SQL safety review (only `UPDATE`/`ALTER TABLE MODIFY COLUMN` for `Expense`/
  `EmployeeAdvance`/`TravelClaim`, no `DROP`, no destructive statements, no out-of-scope
  models).
- `npx prisma validate`, `npx tsc --noEmit`, and `npm run build` all pass.
- Release 2 (`Payment`/`Collection`) remains explicitly Blocked, unaffected by this step.
