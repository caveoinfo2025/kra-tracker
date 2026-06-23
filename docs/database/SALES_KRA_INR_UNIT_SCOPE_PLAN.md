# Sales/KRA INR Unit Scope Plan

**Step:** 3U-0
**Status:** Planning and scope-definition only. No Prisma schema change, no migration, no API
code change, no UI code change, no database data altered, no value converted. Static source
inspection only — every field/route/file below was confirmed by reading
`prisma/schema.prisma`/the actual route or component source, not assumed.

---

## 1. Purpose

Step 3T-1 corrected the project's money unit policy: the earlier carve-out ("only CRM Leads and
Opportunities may remain Lakhs-based") is superseded. **All persisted business money values must
be stored and input as actual INR; Lakhs is a presentation/reporting unit only.** Step 3U-0 then
locked the specific target design: **Option A — Full INR Canonical Model** — Collection, Payment,
Lead, Funnel, Opportunity, and KRA target storage all move to actual INR; `src/lib/kra-engine.ts`
compares INR to INR directly; dashboards/KRA views/reports may convert INR to Lakhs at the
presentation boundary only, never the reverse.

This document exists because Option A's scope is materially larger than the original Release 2
scope (`Payment`/`Collection` only, per `docs/database/DECIMAL_RELEASE2_SIGNOFF_PLAN.md`). Before
any Release 2 implementation can proceed — even Payment/Collection alone — the full Sales/KRA
INR migration scope must be inventoried, so the business can decide whether Payment/Collection
can ship independently or must wait for (or ship together with) the Sales/KRA target migration.
**No conversion of any kind happens in this document** — this is a scope inventory and
sequencing recommendation only.

---

## 2. Candidate Models And Fields

Every field below was confirmed directly in `prisma/schema.prisma` (exact names, current types)
and cross-checked against its current value scale in `prisma/seed-performance-defaults.ts` and
live API/UI code (Section 3).

| Model | Field | Current Type | Current Unit | Target Unit | Migration Needed? | Notes |
|---|---|---|---|---|---|---|
| `CrmLead` | `expectedValue` | `Float @default(0)` | ₹ Lakhs | Actual INR | **Yes** | UI label confirmed: `LeadsClient.tsx` renders `"Expected Value (₹L)"` on the input and `₹${v.toFixed(1)}L` on display — the value is entered and shown directly in Lakhs with zero conversion factor anywhere in the read/write path. |
| `CrmOpportunity` | `value` | `Float @default(0)` | ₹ Lakhs | Actual INR | **Yes** | No `Lakhs` suffix in the field name itself, but confirmed Lakhs-scaled by `src/app/api/pipeline/opportunities/[id]/route.ts`'s `LARGE_DEAL_THRESHOLD_L = 50; // > ₹50 L triggers large-deal approval` compared directly against `value`, and `OpportunitiesClient.tsx`'s `₹{opp.value.toFixed(1)}L` / `"Value (₹L)"` column header. |
| `CrmOpportunity` | `dealValueExTax` | `Float @default(0)` | ₹ Lakhs | Actual INR | **Yes** | Schema comment: `// deal value excluding tax (₹L)`. |
| `CrmOpportunity` | `netProfitLakhs` | `Float @default(0)` | ₹ Lakhs | Actual INR | **Yes** | Field name and schema comment (`// net profit (absolute, ₹L)`) confirm Lakhs; this is the field previously renamed from `netMargin` to clarify it's an absolute amount, not a percentage — that distinction must be preserved through any future conversion. |
| `SalesFunnel` | `dealValueLakhs` | `Float @default(0)` | ₹ Lakhs | Actual INR | **Yes** | Confirmed live write path in `SalesFunnelClient.tsx`: raw form input labeled `"Deal Value (₹L)"`, submitted via `Number(form.dealValueLakhs)` with no conversion; table column header `"Deal (₹L)"`. |
| `SalesFunnel` | `billingValueLakhs` | `Float @default(0)` | ₹ Lakhs | Actual INR | **Yes** | Same pattern as `dealValueLakhs` — form label `"Billing Value (₹L)"`, no conversion in the write path. |
| `KRATemplateItem` | `minimumTarget` | `Float @default(0)` | ₹ Lakhs **for money-type metrics only** | Actual INR **for money-type metrics only** | **Yes, conditional** | Generic `Float`, meaning is determined by the sibling `targetType`/`metricId`→`KRAMetric.metricType` field. Confirmed Lakhs-scale for `metricType: "REVENUE"` rows (`REVENUE_TARGET` seed values 50/100/200; `PIPELINE_VALUE` seed values 300/600/200, per `prisma/seed-performance-defaults.ts`). **Not** money for `NEW_CUSTOMER` (a count), `ACTIVITY_CALLS` (a count), `PROPOSAL_CONVERSION`/`COLLECTION_EFFICIENCY`/`KRA_COMPLIANCE` (percentages). Any migration must filter by `metricType`/`targetType`, not convert the whole table. |
| `KRATemplateItem` | `expectedTarget` | `Float @default(0)` | ₹ Lakhs (conditional, same as above) | Actual INR (conditional) | **Yes, conditional** | Same metric-type-dependent scope as `minimumTarget`. This is the field `KrasClient.tsx`'s new `EmployeeTarget` UI renders directly (`item.expectedTarget.toFixed(1)`) with **no unit label or suffix at all** — confirmed: the new dashboard does not currently disambiguate Lakhs vs. INR visually for any metric. |
| `KRATemplateItem` | `stretchTarget` | `Float @default(0)` | ₹ Lakhs (conditional, same as above) | Actual INR (conditional) | **Yes, conditional** | Same as above. |
| `KRA` (legacy) | `target` | `String @db.Text` | Free-text, Lakhs-scaled by convention (e.g. `"total sales revenue - billing:63"`) | Free-text, actual-INR-scaled by convention | **Yes** | This is **not a typed money column** — it is a free-text field parsed at runtime by `parseTargets()` in `src/lib/kra-engine.ts` (lines 16-26) into a `{ kpiLabel: numericTarget }` map. A migration here means rewriting every existing string value's embedded numbers, not an `ALTER COLUMN` type change — materially different and riskier than a typed-field conversion. |
| `KRAAchievement` | `actualValue` | `Float @default(0)` | Metric-dependent (same caveat as `KRATemplateItem`) | Metric-dependent | **Yes, conditional** | Manually entered via `POST/PUT /api/admin/performance/achievements` (confirmed: `actualValue: Number(actualValue)`, no Lakhs/INR conversion or label anywhere in that route) — **not** currently auto-derived from `kra-engine.ts`'s Collection-based computation. This is the newer `EmployeeTarget`/`KRATemplateItem` system, architecturally separate from the legacy `KRA.target` string system `kra-engine.ts` actually scores against (see Section 4 for the resulting design implication). |
| `EmployeeTarget` | `targetJson` | `String @default("") @db.Text` | Generic JSON free-text | Generic JSON free-text | **Review only** | Not a typed money column — must be inspected case-by-case for embedded money values before any type-level migration is attempted; no money-shaped read/write of this field was found in `TargetManager.tsx`'s create flow (it only sets `employeeProfileId`/`periodId`/`templateId`), but the field exists and could carry ad hoc overrides not exercised in the code paths reviewed this step. |
| `TeamTarget` | `targetJson` | `String @default("") @db.Text` | Generic JSON free-text | Generic JSON free-text | **Review only** | Same caveat as `EmployeeTarget.targetJson` — no UI/API write path for this field was found in this step's review; flagged for completeness, not confirmed populated. |

### Explicitly excluded from this scope (reviewed, not Sales/KRA money)

| Model | Field(s) | Why excluded |
|---|---|---|
| `ApprovalRule` | `autoApproveLimit`, `level1Limit`, `level2Limit`, `level3Limit` | `entityType` is `all\|expense\|advance\|travel\|voucher` — a Finance approval-policy threshold, not a Sales/KRA value. Already in scope of the general Finance/Accounting INR policy, not a new Sales/KRA finding. |
| `ExpenseLimitRule` | `dailyLimit`, `monthlyLimit`, `yearlyLimit` | Expense-category policy limit — Finance, not Sales/KRA. |
| `CustomerCreditPolicy` | `defaultCreditLimitLakhs`, `maxCreditLimitLakhs` | A customer credit-control limit (Finance/credit-risk), not a Sales target or KRA value — excluded per this task's own instruction ("only if it represents finance credit limits," and it does, so it stays out of the *Sales/KRA* scope specifically; it remains in-scope for the general Finance INR policy already covered elsewhere). |
| `AdvancePolicy` | `maxAdvanceLakhs` | Finance policy threshold (employee advances), not Sales/KRA. |
| `KRAMetric` | `metricType`, `calculationSource`, `formulaJson` | Configuration/classification fields, not money values themselves — they determine how `KRATemplateItem`'s `*Target` fields and `KRAAchievement.actualValue` should be interpreted, but hold no money value of their own. |
| `KRATemplateItem` | `weightage` | A weighting percentage (0-100-ish, schema comment confirms), not money. |
| `KRAAchievement` | `achievementPct`, `weightedScore` | Percentage/score values, not money. |
| `Collection` / `Payment` | (all fields) | Already in scope under the existing Release 2 plan (`docs/database/DECIMAL_RELEASE2_SIGNOFF_PLAN.md`) — not duplicated here; referenced in Section 6's sequencing discussion. |

---

## 3. Input/UI Areas To Review

Every row below reflects code actually read this step, not assumption.

| UI/API Area | Current Unit Assumption | Required Target Behavior |
|---|---|---|
| Lead creation/edit form (`src/app/pipeline/leads/LeadsClient.tsx`) | Input and display both Lakhs — label `"Expected Value (₹L)"`, raw `Number(form.expectedValue)` submit, display `₹${v.toFixed(1)}L`, CSV import/export column also labeled `"Expected Value (₹L)"` with alias matching for "value"/"deal value"/"amount" | Input actual INR (relabel to `"Expected Value (₹)"`); store actual INR; CSV import/export columns and alias list updated to match; display Lakhs only if a dashboard/report context calls for it — the create/edit form itself should show INR, not Lakhs |
| Opportunity creation/edit + list (`src/app/pipeline/opportunities/OpportunitiesClient.tsx`, `src/app/api/pipeline/opportunities/[id]/route.ts`) | Display Lakhs — `"Value (₹L)"` column header, `₹{opp.value.toFixed(1)}L`; write path takes raw `Number(body.value)`; `LARGE_DEAL_THRESHOLD_L = 50` compared directly against the stored value | Input/store actual INR; rename or rescale `LARGE_DEAL_THRESHOLD_L` to its INR-equivalent threshold (₹5,000,000) so the large-deal-approval trigger logic is not silently broken by the unit change; column header and display formatting updated to INR (Lakhs only in dashboard/report views) |
| Sales funnel value inputs (`src/app/sales-funnel/SalesFunnelClient.tsx`, `src/app/api/sales-funnel/route.ts`) | Input and display both Lakhs — `"Deal Value (₹L)"`/`"Billing Value (₹L)"` form labels, raw `Number(form.dealValueLakhs)`/`Number(form.billingValueLakhs)` submit, `"Deal (₹L)"`/`"Gross Profit (₹L)"` table headers | Input/store actual INR; relabel form fields and table headers; the `dealValueLakhs * grossProfitPct / 100` gross-profit calculation is unit-agnostic (percentage applied to a money value) so it continues to work once the underlying value is INR — only the display formatting needs to change |
| KRA target setup forms (`src/app/settings/performance/components/KRATemplateManager.tsx`) | Plain numeric inputs for `minimumTarget`/`expectedTarget`/`stretchTarget` with **no unit label at all** — relies entirely on the seed-data convention (Lakhs for `REVENUE`-type metrics) | Input/store actual INR for money-type metrics (`metricType: "REVENUE"` or equivalent); the form should add an explicit unit label or helper text once the underlying value is INR, since it currently has none and the ambiguity is itself a usability gap independent of this migration |
| Sales target setup (`src/app/settings/performance/components/TargetManager.tsx`) | Assigns `employeeProfileId`/`periodId`/`templateId` to create an `EmployeeTarget` row — does not itself surface a raw money value input in the create flow reviewed this step | No direct UI change identified yet for this file; the actual target *values* come from the linked `KRATemplate`'s `KRATemplateItem` rows (reviewed above), not entered here — re-verify in Step 3U/3U-1 implementation planning in case a money-value override field exists elsewhere in this component not exercised by this step's review |
| Sales dashboard (`src/app/page.tsx`) | Direct Lakhs sums and display — `Collection.invoiceValueLakhs`/`amountWithoutGstLakhs` and `SalesFunnel.dealValueLakhs` summed in JS and rendered as `₹${total.toFixed(2)}L` with **no presentation-boundary converter at all** (unlike `FinanceDashboardClient.tsx`'s `inrToLakhsEquivalent()`, which doesn't exist for this page) | Once source fields are INR, this page must add its own INR→Lakhs presentation-boundary conversion (mirroring the pattern already proven in `FinanceDashboardClient.tsx`) before formatting with the existing `toFixed(2)+L` display — the display format itself can stay the same, only the conversion step is new |
| KRA dashboard / KRA views (`src/app/kras/KrasClient.tsx`) | The newer `EmployeeTarget`/`KRATemplateItem` UI renders `actualValue.toFixed(1)` / `expectedTarget.toFixed(1)` with **no Lakhs/INR unit indication whatsoever** | Once `expectedTarget`/`actualValue` are confirmed INR for money-type metrics, this UI should add an explicit unit indicator (it currently has none, so the ambiguity must be resolved either way as part of any migration here) |
| KRA scoring notes (`src/lib/kra-engine.ts`, e.g. `Billing (ex-GST): ₹X L / ₹Y L`) | Legacy-system notes hardcode the `"L"` suffix directly into the generated text (confirmed lines ~417-444, ~664-691 in the prior Release 2 review) | Once both sides of the comparison are INR internally, this note-generation code converts to Lakhs only at the string-formatting step, the same presentation-boundary principle applied everywhere else |
| Reports (not exhaustively enumerated this step) | Not individually opened this step — no dedicated `/api/reports/*` or `/app/reports/*` directory was found in this codebase; reportable figures are currently rendered inline on the Dashboard/Pipeline/Sales-Funnel/KRA pages reviewed above, not via a separate reports module | No separate reports surface to migrate beyond what's already listed; re-confirm in Step 3U/3U-1 implementation planning that no reports module was added since this review |

---

## 4. KRA Engine Target Design

Per the Step 3U-0 lock (Option A), the target design for `src/lib/kra-engine.ts` is:

- `kra-engine.ts` compares INR to INR directly — no conversion factor anywhere inside the scoring
  path (`totalCollectionsWithoutGst()`, `teamBilling()`, and every other function that currently
  reads `Collection.invoiceValueLakhs`/`amountWithoutGstLakhs` directly).
- KRA target values (the legacy `KRA.target` free-text string, parsed via `parseTargets()`) are
  stored as INR-denominated numbers once that string's embedded values are migrated.
- Collection totals are stored as INR (per the existing Release 2 scope).
- Sales target values — to the extent `KRATemplateItem.expectedTarget`/`stretchTarget` are
  treated as Sales targets for money-type metrics — are stored as INR.
- The display layer (Section 3's dashboard/KRA-view/report surfaces) may show Lakhs, computed at
  render time from canonical INR values.
- **No scoring calculation should compare INR to Lakhs.** This explicitly rules out the
  Step 3T interim design (Collection INR, KRA targets Lakhs, one conversion factor inside
  `kra-engine.ts`) as a permanent architecture — that design is now Option B, rejected for normal
  implementation per the updated `DECIMAL_RELEASE2_SIGNOFF_PLAN.md` §16.

**Architectural note confirmed this step:** the legacy `KRA`/`KRA.target` system that
`kra-engine.ts` actually scores against, and the newer `EmployeeTarget`/`KRATemplateItem`/
`KRAAchievement` system that `KrasClient.tsx`'s primary UI now renders, are **two separate
target-storage mechanisms** (consistent with this project's known legacy-vs-enterprise
architecture fragmentation). Any INR migration must account for both: the legacy `KRA.target`
string (parsed at runtime) and the newer typed `KRATemplateItem.expectedTarget`/`stretchTarget`
fields are not the same storage location and do not automatically stay in sync with each other.

---

## 5. Presentation Boundary Rule

- Use `inrToLakhsEquivalent()` (the helper already proven in `FinanceDashboardClient.tsx` for
  Release 1) or an equivalent helper, applied **only** at the dashboard/report display boundary —
  never inside a calculation, a comparison, or a stored value.
- **Do not store Lakhs.** Every model in Section 2 marked "Migration Needed: Yes" must persist
  actual INR once converted — no dual-storage, no "store both units" compromise.
- **Do not accept Lakhs as input.** Every form in Section 3 must collect actual INR once
  converted — no "enter in Lakhs, we'll convert on save" pattern, which is exactly the
  half-converted-state failure mode this project's prior Decimal-migration steps have
  consistently rejected.
- **Do not use Lakhs inside core calculations.** `kra-engine.ts`'s scoring math, the gross-profit
  calculation in `SalesFunnelClient.tsx`, and any other money arithmetic must operate on INR
  values end-to-end; Lakhs only ever appears as a final, render-time string formatting step.

---

## 6. Migration Sequencing Recommendation

**Release 2A — Payment / Collection INR Decimal migration:**
- `Payment.amountLakhs` → INR; `Collection.invoiceValueLakhs`/`amountWithoutGstLakhs`/
  `amountReceivedLakhs` → INR (unchanged from the existing `DECIMAL_RELEASE2_SIGNOFF_PLAN.md`
  scope).
- `src/lib/payments.ts` retirement (`round2()`/epsilon-comparison removal).
- Collection UI/API INR update (`CollectionsClient.tsx`, `CollectionsScreen.tsx`, the Payment
  recording UI, `/api/collections*`, `/api/payments*`).
- **No KRA scoring change** — only valid **if** KRA target units are already INR by the time
  this release ships; otherwise `kra-engine.ts`'s comparison breaks immediately (Collection in
  INR vs. KRA targets still in Lakhs is exactly the 100,000× corruption risk every prior Release
  2 planning step has flagged).

**Release 2B — Sales/KRA target INR migration:**
- KRA target INR migration: the legacy `KRA.target` free-text string (requires rewriting
  embedded numeric values, not just a type change) and `KRATemplateItem.expectedTarget`/
  `stretchTarget`/`minimumTarget` for money-type metrics (`metricType: "REVENUE"` rows).
- Lead/Funnel/Opportunity value input/storage review and conversion: `CrmLead.expectedValue`,
  `CrmOpportunity.value`/`dealValueExTax`/`netProfitLakhs`, `SalesFunnel.dealValueLakhs`/
  `billingValueLakhs`, including the `LARGE_DEAL_THRESHOLD_L` rescale noted in Section 3.
- `kra-engine.ts` INR-to-INR comparison — replaces every Collection-Lakhs-vs-target-Lakhs (or,
  under the rejected Step 3T design, Collection-INR-vs-target-Lakhs) comparison.

**Combining requirement — based on this step's source review: combining is REQUIRED, not
optional, if Collection conversion (Release 2A) ships before KRA targets convert (Release 2B).**
`kra-engine.ts`'s `totalCollectionsWithoutGst()`/`teamBilling()` read `Collection` directly and
compare it against the legacy `KRA.target` string's parsed values with **zero conversion factor
in the Option A target design** (Option A's whole premise is no conversion factor — both sides
must already be the same unit). Therefore:

- If Release 2A ships **before** Release 2B, `kra-engine.ts` would compare INR Collection totals
  against still-Lakhs KRA targets — a 100,000× corruption, exactly the failure mode Option A is
  meant to eliminate. **This is not acceptable under Option A.**
- The only way to ship Release 2A independently of 2B is to **temporarily reintroduce** the
  rejected Option B conversion factor inside `kra-engine.ts` as an emergency bridge — which
  requires the separate, explicit written approval Option B's rejection already specifies (see
  `DECIMAL_RELEASE2_SIGNOFF_PLAN.md` §16). It is not a default path.
- **Recommendation: combine Release 2A and 2B into one atomic release** (or, if a phased rollout
  is preferred for risk-management reasons, ship 2B first — KRA targets convert to INR while
  still being compared only against other already-INR figures or placeholder logic — followed
  immediately by 2A, never the reverse order).

---

## 7. Decisions Needed

- **Are KRA target fields currently stored in Lakhs?** Confirmed partially in this step:
  `KRATemplateItem.expectedTarget`/`stretchTarget`/`minimumTarget` are Lakhs-scaled for
  `REVENUE`-type metrics (seed values 50/100/200/300/600, confirmed against
  `seed-performance-defaults.ts`), but are percentage/count values for other metric types — needs
  a full metric-by-metric sign-off, not a blanket answer. The legacy `KRA.target` free-text string
  is Lakhs-scaled by convention but not type-enforced at all.
- **Are Lead/Funnel/Opportunity fields currently stored in Lakhs?** Confirmed yes for all of
  `CrmLead.expectedValue`, `CrmOpportunity.value`/`dealValueExTax`/`netProfitLakhs`,
  `SalesFunnel.dealValueLakhs`/`billingValueLakhs`, per Section 2/3's direct code evidence.
- **Should Payment/Collection wait until KRA target migration?** Per Section 6's source-review
  finding: yes, under Option A, unless an explicitly-approved Option B emergency bridge is
  invoked — this is a decision for the business/product owner, not a default assumption.
- **Should dashboards continue showing Lakhs?** Recommended yes (per Section 5) — Lakhs remains
  the appropriate display unit for sales-scale figures; this needs confirmation that no
  dashboard/report consumer actually requires raw INR figures instead.
- **Which role signs off before/after KRA score comparison?** Not yet assigned — per the existing
  Release 2 plan's Section 9 verification requirement (zero score corruption tolerance), a named
  approver (or role — e.g. whoever owns Sales Operations or KRA/Performance configuration) should
  be agreed before any Sales/KRA INR migration implementation step starts, not improvised at
  migration time.

---

## 8. Final Recommendation

**Release 2 cannot proceed as Payment/Collection only**, under the locked Option A design,
**unless an explicitly-approved Option B emergency bridge is separately authorized in writing at
that time.** The source review in this step confirms `kra-engine.ts`'s scoring boundary compares
Collection totals directly against KRA targets with no conversion factor under Option A's design
— converting Collection to INR while KRA targets remain Lakhs reproduces exactly the 100,000×
corruption risk this entire planning program exists to prevent.

**Recommended path:** combine Release 2A (Payment/Collection) and Release 2B (Sales/KRA target
migration, including Lead/Funnel/Opportunity) into one atomic release, following the same
no-half-converted-state discipline used for Release 1 (Step 3Q) — schema, data, API, UI, KRA
engine, and verification all shipping together. This is a **larger scope than originally
planned** for Release 2, and that scope expansion is the primary finding of this step.

**Do not implement Release 2 in any form yet.** The next step is to obtain explicit sign-off on
this scope plan's Section 7 open decisions — in particular, the metric-by-metric confirmation of
which `KRATemplateItem` rows are genuinely money-denominated, and the combined-vs-phased
sequencing choice — before a Step 3U implementation prompt is created.

---

> **Step 3U-1 completed (2026-06-22):**
> - Combined Release 2 scope sign-off file created —
>   `docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md`.
> - Release 2 must combine Payment/Collection and Sales/KRA target INR migration into one atomic
>   release — confirmed as a technical conclusion; named business sign-off on that requirement
>   and the remaining open decisions (live-DB `KRAMetric`/`KRA.target`/`targetJson` scans) are
>   still pending — see the new file's §9/§10.
> - No Prisma schema field was converted, no migration was generated, no API route or UI
>   component was modified, `src/lib/kra-engine.ts` and `src/lib/payments.ts` were not touched,
>   and no database row was written or altered.

---

> **Step 3U-2 completed (2026-06-22) — live-DB scan closes all Section 7 open decisions.**
> Confirmed `DATABASE_URL` → `u686730471_caveodev` before running a read-only scan (deleted
> after use, no scratch files left). Key findings, all detailed in
> `docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md` §12:
> - **`KRAMetric`/`KRATemplateItem`:** the live dev DB does not contain `seed-performance-
>   defaults.ts`'s rows at all — its `REVENUE`/`ACTIVITY`/`QUALITY`/`COMPLIANCE` codes don't
>   exist live. The live `metricType` enum is `AMOUNT`/`PERCENTAGE`/`COUNT`; money metrics are
>   the `AMOUNT`-typed ones (`BOOKING`, `BILLING`, and the unused zero-row `FUNNEL_VALUE`). One
>   `KRATemplateItem` row (#16) has `targetType = AMOUNT` on a `PERCENTAGE`-typed metric
>   (`PIPELINE_RATIO`) with money-scale values matching a legacy money KPI exactly — flagged
>   Blocked/Manual Review, not converted, not guessed either direction.
> - **Legacy `KRA.target`:** all 34 live rows parse cleanly; exactly 6 KPI labels across 4 KRA
>   titles are confirmed money (`total sales revenue - booking/billing`, `total funnel/pipeline
>   value created (₹ lakhs)`, `total team booking target achievement (₹ lakhs)`, `total team
>   billing achievement`, `total team pipeline coverage (₹ lakhs)`); every other label —
>   including the "Focus area revenue achievement" mix-ratio percentages, which mention
>   "revenue" in the title but are not absolute money — is confirmed non-money.
> - **`EmployeeTarget`/`TeamTarget.targetJson`:** despite the field name, `targetJson` stores
>   the same free-text format as `KRA.target`, not structured JSON; the same 6-label money set
>   applies to `EmployeeTarget`'s 34 rows. `TeamTarget` has 0 rows — deferred, not converted.
> - **Lead/Opportunity/Funnel:** confirmed Lakhs-scaled live (`CrmLead.expectedValue` 38 rows
>   ₹0–59.12L; `CrmOpportunity.value/dealValueExTax/netProfitLakhs` 21 rows; `SalesFunnel.
>   dealValueLakhs/billingValueLakhs` 100 rows), zero negatives across all fields.
> - **`OrderAdvance`:** 0 live rows, 0 `Payment` rows created via `applyAdvance()` — zero
>   data-migration risk, but included in locked scope anyway to eliminate the lockstep-risk
>   permanently.
> - **Named business sign-off recorded:** product owner instruction in project chat — actual
>   INR for Lead/Funnel/Opportunity input/storage, Lakhs for Sales dashboard/KRA/Report display.
> - **Release 2 implementation permission: Blocked, narrowly, on the single `KRATemplateItem`
>   #16 ambiguity only** — every other open decision is now closed.
> - No Prisma schema field was converted, no migration was generated, no API route or UI
>   component was modified, `src/lib/kra-engine.ts` and `src/lib/payments.ts` were not touched,
>   and no database row was inserted, updated, or deleted (read-only scan only).

---

> **Step 3U-3 completed (2026-06-22) — `KRATemplateItem` #16 resolved.**
>
> | Field | Value |
> |---|---|
> | Item ID | `KRATemplateItem` #16 |
> | Linked metric | `KRAMetric` #9, "Pipeline Ratio %" (`PIPELINE_RATIO`), `metricType = PERCENTAGE` |
> | Item's own `targetType` | `AMOUNT` |
> | Current values | `minimumTarget = 1500`, `expectedTarget = 1800`, `stretchTarget = 2200` |
> | Decision | **Option B — Configuration error; fix before migration** (product owner, direct confirmation) |
> | Release 2 action | Do **not** convert item #16 in this Release 2 pass. Before Step 3U starts, re-link `KRATemplateItem` #16's `metricId` to a genuine `AMOUNT`-typed metric (the existing zero-row `FUNNEL_VALUE` metric, or a new dedicated "Team Pipeline Coverage" metric) — a config/data change in the admin KRA Template setup, not a code or schema change. Once re-linked and `metricType`/`targetType` agree, the row re-enters the normal `AMOUNT`-row conversion path (`× 100000`) alongside `BOOKING`/`BILLING`. |
> | Config debt note | The mismatch (item `targetType = AMOUNT` vs. metric `metricType = PERCENTAGE`) is documented as configuration debt, not data corruption — item #16's values (1500/1800/2200) exactly match the legacy `KRA` #71 / `EmployeeTarget` #34 `"total team pipeline coverage (₹ lakhs): 1500"` target, strongly suggesting it was meant to be a money target linked to the wrong metric at template-authoring time, not a malicious or random value. |
>
> Full decision record: `docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md` §13.
> **Release 2 implementation permission remains Blocked** — not on a classification ambiguity
> any longer, but on the concrete config-correction prerequisite above, which has not yet been
> performed (out of scope for this documentation-only step). No Prisma schema field was
> converted, no migration was generated, no API route or UI component was modified,
> `src/lib/kra-engine.ts` and `src/lib/payments.ts` were not touched, and no database row was
> inserted, updated, or deleted. A live re-verification query was attempted and blocked by a
> transient Remote MySQL access denial (IP not currently allowlisted) — the decision relies on
> Step 3U-2's already-captured evidence, not a fresh query.

---

> **Step 3U-4 completed (2026-06-22) — `KRATemplateItem` #16 correction attempt: root cause
> confirmed, no correction performed, Release 2 remains Blocked.**
>
> ## KRATemplateItem #16 Correction
>
> | Field | Value |
> |---|---|
> | Old metric | `KRAMetric` #9, "Pipeline Ratio %" (`PIPELINE_RATIO`), `metricType = PERCENTAGE` |
> | New metric | **None created.** No existing `AMOUNT`-typed metric (`BOOKING`, `BILLING`, `FUNNEL_VALUE`) matches; a new metric (proposed: "Team Pipeline Coverage (₹L)", code `TEAM_PIPELINE_COVERAGE`, `metricType = AMOUNT`) would be required and has not been created |
> | Reason for correction | `FUNNEL_VALUE` was checked and ruled out by live re-inspection: its `calculationSource` ties to `totalPipelineValue()`, an **individual** rep's funnel-creation activity (legacy `KRA` #65), confirmed by the business owner that "Pipeline Ratio %" itself is a genuine percentage coverage multiplier (e.g. 200% of a ₹1 Cr target → ₹2 Cr required pipeline) — a different mechanic entirely from item #16's own absolute `AMOUNT` values. Item #16 belongs to `KRATemplate` #7, the **team-level** Manager template, matching `teamPipeline()`/legacy `KRA` #71, not any existing individual-level `AMOUNT` metric. |
> | Verification result | **Not run — no correction was made.** Two creation paths (admin UI, guarded dev-DB script) were presented to the product owner. The admin UI path was found infeasible this step (`KRALibrary.tsx`'s `metricType` dropdown only offers `REVENUE`/`ACTIVITY`/`QUALITY`/`COMPLIANCE`/`CUSTOM` — not `AMOUNT`, which every live `KRAMetric` row actually uses; fixing this is a UI code change, out of scope here). The dev-DB script path was offered and explicitly declined. |
> | Release 2 action | Item #16 still does **not** convert. Release 2 implementation permission remains **Blocked** on this same prerequisite, now precisely scoped: create a new `AMOUNT`-typed `KRAMetric` and re-link item #16 to it, via either a future UI fix or an explicitly-authorized DB script — neither has been authorized yet. |
>
> Full record: `docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md` §14. **Follow-up
> flagged, not actioned:** the admin KRA Metrics screen's `metricType` dropdown is out of sync
> with the live `AMOUNT`/`PERCENTAGE`/`COUNT` taxonomy — a pre-existing UI/data-model drift,
> independent of Release 2, candidate for a separate follow-up task.
>
> No Prisma schema field was converted, no migration was generated, no API route or UI component
> was modified, `src/lib/kra-engine.ts` and `src/lib/payments.ts` were not touched, and no
> database row was inserted, updated, or deleted. Two temporary read-only inspection scripts
> were created and deleted this step — no scratch files remain.

---

> **Step 3U-5 completed (2026-06-23) — KRA AMOUNT metric admin setup fixed; `KRATemplateItem`
> #16 re-linked; Release 2 configuration blocker resolved.**
>
> - **AMOUNT metric admin setup fix:** `KRALibrary.tsx`'s `metricType` dropdown was out of sync
>   with the live `AMOUNT`/`PERCENTAGE`/`COUNT` taxonomy (it only offered `REVENUE`/`ACTIVITY`/
>   `QUALITY`/`COMPLIANCE`/`CUSTOM`, none of which any live `KRAMetric` row uses) — fixed to
>   offer `AMOUNT`/`PERCENTAGE`/`COUNT` with helper text, defaulting to `AMOUNT`. Also added a
>   new single-item re-link path (`updateKRATemplateItem()` + `PATCH
>   /api/admin/performance/templates/items`), since the existing template-level `PATCH` route
>   deletes and recreates every item in a template — unsafe for touching only one item.
> - **Metric created:** `KRAMetric` #16, "Team Pipeline Coverage" (`TEAM_PIPELINE_COVERAGE`),
>   `metricType = AMOUNT`, via the app's own `createKRAMetric()` function.
> - **#16 re-link result:** `KRATemplateItem` #16's `metricId` changed from 9 (`PIPELINE_RATIO`,
>   `PERCENTAGE`) to 16 (`TEAM_PIPELINE_COVERAGE`, `AMOUNT`). `targetType` (`AMOUNT`) and all
>   target values (1500/1800/2200) unchanged. No sibling item, `EmployeeTarget`, or `TeamTarget`
>   row touched.
> - **Verification result:** all checks pass — see
>   `docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md` §15 for the full table.
>   `npx prisma validate`/`npx tsc --noEmit`/`npm run build` all pass.
> - **Release 2 implementation permission: Approved for dev implementation only.** This step
>   resolved the configuration prerequisite only — it did **not** implement any Release 2
>   migration. `kra-engine.ts`, `payments.ts`, the schema, and every money-value row remain
>   unconverted.
> - Full record: `docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md` §15.
