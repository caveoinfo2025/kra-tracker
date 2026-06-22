# Decimal Release 2 Combined Scope Sign-Off

**Step:** 3U-1
**Status:** Final sign-off / implementation-scope lock only. **No Prisma schema change, no
migration, no API code change, no UI code change, no database data altered, no value converted,
`src/lib/kra-engine.ts` and `src/lib/payments.ts` not touched.** Every field/area below was
confirmed by direct source inspection (`prisma/schema.prisma`, `prisma/seed-performance-defaults.ts`,
and the prior planning documents listed below), not assumed.
**Depends on:** `docs/database/SALES_KRA_INR_UNIT_SCOPE_PLAN.md` (Step 3U-0, scope inventory) and
`docs/database/DECIMAL_RELEASE2_SIGNOFF_PLAN.md` (Step 3S–3U-0, KRA boundary decision lock).

---

## 1. Purpose

**Why Release 2 must be combined.** Step 3U-0 locked Option A — Full INR Canonical Model — as
the permanent target design: every persisted business money value (Finance, Payment, Collection,
Leads, Funnel, Opportunities, KRA targets, Sales targets, report source data) must be actual INR,
with Lakhs allowed only as a display/reporting unit. Option A's defining property is that
`src/lib/kra-engine.ts` compares INR to INR with **no conversion factor anywhere in the scoring
path**. That property only holds if both sides of every comparison are already INR at the same
time.

**Why Payment/Collection cannot be migrated alone.** `kra-engine.ts`'s `totalCollectionsWithoutGst()`
and `teamBilling()` read `Collection.invoiceValueLakhs`/`amountWithoutGstLakhs` directly and
compare the result against KRA targets (the legacy `KRA.target` free-text string and, for the
newer system, `KRATemplateItem.expectedTarget`/`stretchTarget`/`minimumTarget`). If Collection
converts to INR while those targets remain Lakhs-scaled, every KRA score derived from Collection
is corrupted by a 100,000× factor with no error thrown — this is the exact failure mode the entire
Decimal-migration program exists to prevent (`SALES_KRA_INR_UNIT_SCOPE_PLAN.md` §6,
`DECIMAL_RELEASE2_SIGNOFF_PLAN.md` §16/§19).

**Why Sales/KRA targets must move to INR.** Under Option A there is no permanent place for a
Lakhs-denominated value to exist in canonical storage. KRA targets, Lead/Opportunity/Funnel
values are confirmed Lakhs-scaled today (Section 3) and feed directly or indirectly into the same
scoring/reporting surfaces as Collection. Moving Collection to INR without moving these in the
same release reproduces the same 100,000× corruption risk one step removed (e.g. KRA Pipeline
Value metric vs. `SalesFunnel.dealValueLakhs`, Sales dashboard sums combining Collection and
Funnel figures).

**Why this is not an implementation step.** This document locks scope, classification rules, and
permission status only. No schema, migration, API, UI, or data change is made here, and no value
is converted. Implementation begins only after Section 9's open decisions are closed and Section
10's permission ledger reads Approved.

---

## 2. Final Policy

- All persisted business money values use actual INR.
- Lakhs is a display/reporting unit only — never a canonical storage or input unit.
- Dashboards, KRA views, and reports may display Lakhs, computed at render time from canonical
  INR values.
- Core calculations (`kra-engine.ts` scoring, gross-profit math, achievement percentages) must
  compare INR to INR — never INR to Lakhs, never Lakhs to Lakhs as a permanent design.
- No canonical storage field and no user-facing input should remain Lakhs-denominated once
  Release 2 ships.

---

## 3. Combined Release 2 Scope

| Domain | Model/Area | Fields / Inputs | Current Unit | Target Unit | Required Action |
| ------ | ---------- | --------------- | ------------ | ----------- | --------------- |
| Payment | `Payment` | `amountLakhs` | ₹ Lakhs (`Float`) | Actual INR | Convert to `Decimal(18,2)`; transform `value * 100000`; update `src/lib/payments.ts`, `/api/payments*` |
| Collection | `Collection` | `invoiceValueLakhs` | ₹ Lakhs (`Float`) | Actual INR | Convert to `Decimal(18,2)`; transform `value * 100000`; update `/api/collections*` |
| Collection | `Collection` | `amountWithoutGstLakhs` | ₹ Lakhs (`Float`) | Actual INR | Convert to `Decimal(18,2)`; transform `value * 100000` |
| Collection | `Collection` | `amountReceivedLakhs` | ₹ Lakhs (`Float`) | Actual INR | Convert to `Decimal(18,2)`; transform `value * 100000` |
| Lead | `CrmLead` | `expectedValue` | ₹ Lakhs (`Float`, confirmed via `LeadsClient.tsx` `"Expected Value (₹L)"` label) | Actual INR | Convert/relabel; transform `value * 100000`; update `LeadsClient.tsx` form/CSV labels and Lead APIs |
| Opportunity | `CrmOpportunity` | `value` | ₹ Lakhs (`Float`, confirmed via `OpportunitiesClient.tsx` `"Value (₹L)"` column + `LARGE_DEAL_THRESHOLD_L = 50`) | Actual INR | Convert; transform `value * 100000`; rescale `LARGE_DEAL_THRESHOLD_L` to its INR equivalent (₹50,00,000) in `src/app/api/pipeline/opportunities/[id]/route.ts` |
| Opportunity | `CrmOpportunity` | `dealValueExTax` | ₹ Lakhs (`Float`; schema comment `// deal value excluding tax (₹L)`) | Actual INR | Convert; transform `value * 100000` |
| Opportunity | `CrmOpportunity` | `netProfitLakhs` | ₹ Lakhs (`Float`; schema comment `// net profit (absolute, ₹L)`) | Actual INR | Convert; transform `value * 100000`; preserve "absolute amount, not a percentage" semantics through the rename |
| Sales Funnel | `SalesFunnel` | `dealValueLakhs` | ₹ Lakhs (`Float`, confirmed via `SalesFunnelClient.tsx` `"Deal Value (₹L)"` label) | Actual INR | Convert; transform `value * 100000`; relabel form/table |
| Sales Funnel | `SalesFunnel` | `billingValueLakhs` | ₹ Lakhs (`Float`, confirmed via `SalesFunnelClient.tsx` `"Billing Value (₹L)"` label) | Actual INR | Convert; transform `value * 100000`; relabel form/table; `grossProfitPct` math is unit-agnostic and needs no change |
| KRA Template | `KRATemplateItem` | `expectedTarget` | ₹ Lakhs **only where `metricType = "REVENUE"`** (confirmed against `prisma/seed-performance-defaults.ts` seed values 50/100/200) | Actual INR (REVENUE rows only) | Convert/transform only rows whose `KRAMetric.metricType = "REVENUE"`; leave ACTIVITY/QUALITY/COMPLIANCE rows untouched (Section 4) |
| KRA Template | `KRATemplateItem` | `stretchTarget` | ₹ Lakhs (REVENUE rows only; seed values 75/150/300) | Actual INR (REVENUE rows only) | Same conditional transform as `expectedTarget` |
| KRA Template | `KRATemplateItem` | `minimumTarget` | ₹ Lakhs (REVENUE rows only) | Actual INR (REVENUE rows only) | Same conditional transform as `expectedTarget` |
| Legacy KRA | `KRA` | `target` (`String @db.Text`, free text parsed by `parseTargets()` in `kra-engine.ts`) | Free text, Lakhs-scaled by convention (e.g. `"total sales revenue - billing:63"`) | Free text, INR-scaled by convention | Rewrite embedded numeric values **only** for entries confirmed to represent revenue/money KPIs; this is a string-content rewrite, not an `ALTER COLUMN` — higher risk, requires per-row review |
| EmployeeTarget | `EmployeeTarget` | `targetJson` (`String @db.Text`) | Generic JSON free text; no confirmed money-shaped write path found in `TargetManager.tsx`'s reviewed create flow | Generic JSON free text, INR where money-shaped | Review row-by-row for embedded money values before any transform; **no blanket conversion** |
| TeamTarget | `TeamTarget` | `targetJson` (`String @db.Text`) | Generic JSON free text; no UI/API write path found in this step's review | Generic JSON free text, INR where money-shaped | Review row-by-row for embedded money values before any transform; **no blanket conversion** |

**Out of scope for this Release 2 lock (excluded, reviewed, not Sales/KRA money):**
`ApprovalRule.autoApproveLimit/level1Limit/level2Limit/level3Limit`, `ExpenseLimitRule.dailyLimit/
monthlyLimit/yearlyLimit`, `CustomerCreditPolicy.defaultCreditLimitLakhs/maxCreditLimitLakhs`,
`AdvancePolicy.maxAdvanceLakhs` — Finance/credit policy thresholds, already governed by the
general Finance INR policy, not duplicated here. `KRAMetric.metricType/calculationSource/
formulaJson`, `KRATemplateItem.weightage`, `KRAAchievement.achievementPct/weightedScore` —
configuration/percentage/score fields, not money values.

**Related finding not in the original instruction list (flagged, not added to scope without
sign-off):** `OrderAdvance.amountLakhs` (`prisma/schema.prisma`) is structurally identical to
`Payment.amountLakhs` — it is converted into a `Payment` row via `applyAdvance()` in
`src/lib/payments.ts`. If `Payment.amountLakhs` converts to INR in Release 2, `OrderAdvance.
amountLakhs` must convert in the same release or `applyAdvance()`'s unit assumption breaks. This
is added to Section 9's open decisions rather than Section 3's locked scope, since it was not in
the instruction's explicit field list and needs separate confirmation.

---

## 4. Metric Classification Rule

Only money-denominated metrics are transformed from Lakhs to INR. The following are **never**
transformed, regardless of which model they live in:

- Percentage metrics (e.g. `grossProfitPct`, `probabilityPct`, `discountPct`, `achievementPct`)
- Count metrics (e.g. `NEW_CUSTOMER` — new customer acquisition count)
- Activity count metrics (e.g. `ACTIVITY_CALLS` — calls/meetings count)
- Ratio metrics (e.g. `PROPOSAL_CONVERSION`, `COLLECTION_EFFICIENCY` — both percentages per
  `KRAMetric.metricType`)
- Non-money KRA values, ratings, and scores (e.g. `weightedScore`, `KRA_COMPLIANCE`)

**For `KRATemplateItem`:** convert `expectedTarget`/`stretchTarget`/`minimumTarget` only for rows
whose linked `KRAMetric.metricType = "REVENUE"`. Confirmed `REVENUE`-type metric codes in
`prisma/seed-performance-defaults.ts`: `REVENUE_TARGET`, `PIPELINE_VALUE`. Confirmed non-money
codes in the same seed file: `NEW_CUSTOMER` (`ACTIVITY`), `ACTIVITY_CALLS` (`ACTIVITY`),
`PROPOSAL_CONVERSION` (`QUALITY`), `COLLECTION_EFFICIENCY` (`COMPLIANCE`), `KRA_COMPLIANCE`
(`COMPLIANCE`) — none of these are transformed.

**For legacy `KRA.target`:** convert only the numeric value(s) inside the free-text string for
KPI labels confirmed to represent revenue/billing money (e.g. `"total sales revenue - billing"`).
Any KPI label that is ambiguous, or that resembles a percentage/count/compliance KPI, is **not**
transformed and is marked blocked for manual review rather than guessed.

**For `targetJson` (`EmployeeTarget`/`TeamTarget`):** convert only keys/values confirmed to
represent revenue/money. No blanket key-name pattern match — each row must be inspected, since no
confirmed money-shaped write path exists yet in the reviewed UI/API code (Section 3).

**Ambiguity rule:** if a metric's type or a `KRA.target`/`targetJson` value's meaning cannot be
confirmed from source (schema comment, seed data, or live UI label) at implementation time, it is
marked **blocked for manual review** — it is never assumed to be money and converted by default,
and it is never assumed to be non-money and skipped by default.

---

## 5. Lead / Opportunity / Funnel Policy

Lead, Opportunity, and Funnel input/storage must move to actual INR. Dashboards and reports may
still display Lakhs.

Required future UI behavior:

- Form labels show ₹ or INR, not ₹L (e.g. `LeadsClient.tsx`'s `"Expected Value (₹L)"` →
  `"Expected Value (₹)"`; `OpportunitiesClient.tsx`'s `"Value (₹L)"` → `"Value (₹)"`;
  `SalesFunnelClient.tsx`'s `"Deal Value (₹L)"`/`"Billing Value (₹L)"` → `"Deal Value (₹)"`/
  `"Billing Value (₹)"`).
- Stored values are actual INR — no dual-storage, no "store both units" compromise.
- API values are actual INR at every Lead/Opportunity/Funnel route (create, update, list, CSV
  import/export).
- Chart/report formatters may divide by 100,000 for display, computed at render time only — never
  stored back as Lakhs.

---

## 6. KRA Engine Target Design

- Collection totals (`invoiceValueLakhs`/`amountWithoutGstLakhs`/`amountReceivedLakhs`, renamed
  post-migration) are stored as actual INR.
- KRA targets — both `KRATemplateItem.expectedTarget/stretchTarget/minimumTarget` (REVENUE rows)
  and the legacy `KRA.target` string's confirmed money entries — are stored as actual INR.
- `src/lib/kra-engine.ts` compares INR to INR directly inside `totalCollectionsWithoutGst()`,
  `teamBilling()`, and every other scoring function — no conversion factor anywhere in the
  scoring path.
- KRA dashboard/report display (`KrasClient.tsx`, Sales dashboard, any report surface) may
  convert INR to Lakhs at render time for readability.
- No KRA scoring calculation should compare INR to Lakhs, in either direction, under normal
  implementation.
- No temporary bridge (the rejected Option B / Step 3T interim design) is used in normal
  implementation. It remains available only as an emergency compatibility bridge requiring
  separate, explicit written approval at the time it would actually be invoked — never a default
  fallback for this release.

---

## 7. Required Implementation Sequence For Step 3U

This sequence is designed for the future Step 3U implementation prompt. **It is not implemented
in this step.**

1. Confirm dev DB only (`u686730471_caveodev`) — no production schema/data change.
2. Snapshot Payment, Collection, Lead, Opportunity, Funnel, KRA target (`KRATemplateItem`,
   legacy `KRA.target`), `EmployeeTarget`, and `TeamTarget` values before any change.
3. Insert or identify representative KRA test cases spanning at least one REVENUE-type and one
   non-money-type metric per employee/template, so the before/after comparison (Section 8) has
   coverage on both sides of the classification rule.
4. Convert schema fields to `Decimal(18,2)` where applicable (Section 3's "Required Action"
   column) — Payment, Collection, Lead, Opportunity, Funnel, and the money-confirmed
   `KRATemplateItem` fields.
5. Transform stored Lakhs values to INR using `value * 100000`, scoped exactly per Section 4's
   classification rule — never a blanket table-wide multiply.
6. For legacy `KRA.target` strings and `targetJson` values, transform only the numeric
   sub-values confirmed to represent revenue/money, leaving non-money entries in the same string/
   JSON untouched.
7. Update Payment/Collection APIs (`/api/payments*`, `/api/collections*`) to the new INR contract.
8. Update Lead/Opportunity/Funnel APIs (`/api/pipeline/leads*`, `/api/pipeline/opportunities*`,
   `/api/sales-funnel*`) to the new INR contract, including the `LARGE_DEAL_THRESHOLD_L` rescale.
9. Update KRA target APIs (`/api/admin/performance/*`) to the new INR contract for
   money-confirmed fields only.
10. Update `kra-engine.ts` to compare INR to INR with no conversion factor.
11. Update dashboards/reports (`src/app/page.tsx`, `KrasClient.tsx`, any other report surface) to
    display Lakhs only at the presentation boundary, computed from canonical INR.
12. Update UI labels from `₹L`/Lakhs to `₹`/INR for every input field identified in Section 3/5.
13. Preserve Lakhs formatting only in dashboard/report views — never in input forms or stored
    values.
14. Run before/after KRA score comparison (Section 8) — zero score drift beyond Decimal-precision
    rounding noise is the pass criterion.
15. Run validation (`npx prisma validate`, `npx tsc --noEmit`, `npm run build`).
16. Document results in a `DECIMAL_RELEASE2_MIGRATION_RESULTS.md`-style results file, mirroring
    the Release 1 pattern (`DECIMAL_RELEASE1_MIGRATION_RESULTS.md`).

---

## 8. Before/After Verification Requirements

To be filled during Step 3U implementation — not run in this step.

| Area | Before Unit | Expected After Unit | Verification Required |
| ---- | ----------- | -------------------- | ---------------------- |
| Payment values (`Payment.amountLakhs`) | ₹ Lakhs | Actual INR | Every row: `new value === old value * 100000`, exact |
| Collection values (`invoiceValueLakhs`/`amountWithoutGstLakhs`/`amountReceivedLakhs`) | ₹ Lakhs | Actual INR | Every row, every field: `new value === old value * 100000`, exact |
| Lead values (`CrmLead.expectedValue`) | ₹ Lakhs | Actual INR | Every row: `new value === old value * 100000`, exact |
| Opportunity values (`value`/`dealValueExTax`/`netProfitLakhs`) | ₹ Lakhs | Actual INR | Every row, every field: `new value === old value * 100000`, exact; `LARGE_DEAL_THRESHOLD_L`-equivalent approval trigger re-verified at the new INR threshold |
| Funnel values (`dealValueLakhs`/`billingValueLakhs`) | ₹ Lakhs | Actual INR | Every row, every field: `new value === old value * 100000`, exact; `grossProfitPct` derived figures unchanged |
| `KRATemplateItem` revenue targets (REVENUE rows only) | ₹ Lakhs | Actual INR | Every REVENUE-metric row, every target field: `new value === old value * 100000`, exact; non-REVENUE rows confirmed **unchanged** |
| Legacy KRA revenue targets (`KRA.target` confirmed money entries) | ₹ Lakhs (string-embedded) | Actual INR (string-embedded) | Every confirmed-money KPI entry: parsed numeric value `* 100000`; non-money KPI entries in the same string confirmed **unchanged**; `parseTargets()` output re-verified post-migration |
| `EmployeeTarget`/`TeamTarget` revenue targets (`targetJson`) | Generic JSON (money-shaped subset, if any) | INR (money-shaped subset only) | Row-by-row diff of any confirmed money key; non-money keys confirmed **unchanged** |
| KRA achievement calculation (`KRAAchievement.actualValue`/`achievementPct`/`weightedScore`, `kra-engine.ts` scoring output) | Mixed (Collection Lakhs vs. target Lakhs, or interim INR vs. Lakhs) | INR-to-INR, identical resulting percentage/score | Every employee's computed KRA progress/score exported pre-migration and recomputed post-migration; **zero drift** beyond Decimal-precision rounding noise |
| Sales dashboard values (`src/app/page.tsx` sums) | ₹ Lakhs (direct sum, no converter) | Actual INR internally, Lakhs at display only | Pre/post displayed totals identical to the rendered precision; underlying internal sum now INR |
| Reports display values (KRA/Sales report surfaces) | ₹ Lakhs (direct) | Actual INR internally, Lakhs at display only | Same display-identical requirement as the Sales dashboard row |

---

## 9. Open Decisions To Close Before Implementation

| Decision | Required Answer | Status |
| -------- | ---------------- | ------ |
| Confirm `KRATemplateItem.metricType = "REVENUE"` is the only money metric type | Confirmed in this step against `prisma/seed-performance-defaults.ts`: `REVENUE_TARGET` and `PIPELINE_VALUE` are the only `REVENUE`-typed codes seeded; `NEW_CUSTOMER`/`ACTIVITY_CALLS` are `ACTIVITY`, `PROPOSAL_CONVERSION` is `QUALITY`, `COLLECTION_EFFICIENCY`/`KRA_COMPLIANCE` are `COMPLIANCE` — none of the non-REVENUE codes are money. **However**, this is the seed-data set only; any custom `KRAMetric` rows added in production/dev outside the seed file must be re-checked at implementation time, not assumed covered by this confirmation. | Pending final confirmation against live DB `KRAMetric` rows (seed-only confirmed) |
| Confirm legacy `KRA.target` revenue entries can be parsed safely | `parseTargets()` in `kra-engine.ts` parses a `{ kpiLabel: numericTarget }` free-text format; this step did not enumerate every live `KRA.target` string value in the dev DB to confirm 100% of rows match the expected parse pattern with no malformed entries | Pending — requires a live data scan, not source-code review alone |
| Confirm `EmployeeTarget`/`TeamTarget.targetJson` money keys | No money-shaped write path was found in `TargetManager.tsx`'s reviewed create flow for either model; this does not rule out money-shaped data existing in the live DB from another code path not reviewed this step | Pending — requires a live data scan of `targetJson` contents |
| Confirm Lead `expectedValue` currently stored in Lakhs | Confirmed via `LeadsClient.tsx`'s `"Expected Value (₹L)"` label and direct `Number(form.expectedValue)` submit path with no conversion factor anywhere in the read/write path | **Confirmed** |
| Confirm Opportunity value fields currently stored in Lakhs | Confirmed via `OpportunitiesClient.tsx`'s `"Value (₹L)"` header/display and `LARGE_DEAL_THRESHOLD_L = 50` comparison in `src/app/api/pipeline/opportunities/[id]/route.ts`; `dealValueExTax`/`netProfitLakhs` confirmed via schema comments (`// ... (₹L)`) | **Confirmed** |
| Confirm Funnel value fields currently stored in Lakhs | Confirmed via `SalesFunnelClient.tsx`'s `"Deal Value (₹L)"`/`"Billing Value (₹L)"` labels and direct `Number(form.dealValueLakhs)`/`Number(form.billingValueLakhs)` submit path | **Confirmed** |
| Confirm dashboard/report Lakhs display remains desired | Recommended yes per `SALES_KRA_INR_UNIT_SCOPE_PLAN.md` §7 — not yet confirmed by a named business/product approver | Pending |
| Confirm implementation must be one atomic release | Confirmed as a design conclusion in `SALES_KRA_INR_UNIT_SCOPE_PLAN.md` §6/§8 (combining is required, not optional, under Option A) — not yet confirmed as a signed-off business decision with a named approver | Pending — technical conclusion locked, business sign-off not yet recorded |
| Confirm production migration-history gap can remain separate from dev implementation | The two untracked migrations (`add_advance_category`, `employeetarget_relations`, per `DECIMAL_RELEASE2_SIGNOFF_PLAN.md` §10) predate Release 1, are not introduced by this scope, and do not block dev implementation — but must be reviewed before any production migration planning | Pending — not blocking dev implementation, blocking for production |
| Confirm `OrderAdvance.amountLakhs` must convert in the same release as `Payment.amountLakhs` | Flagged in Section 3 as a related finding: `applyAdvance()` in `src/lib/payments.ts` converts `OrderAdvance` into `Payment`, so a unit mismatch between the two breaks that conversion path if only one converts | Pending — not in the original instruction's field list, needs explicit confirmation before being added to locked scope |

All statuses above are **Pending** unless marked **Confirmed**, and "Confirmed" here means
confirmed by direct source inspection in this step or a prior planning step — not confirmed by a
named business/product sign-off, which is a separate requirement (see Section 10).

---

## 10. Release 2 Permission Ledger

| Decision | Final Value | Status |
| -------- | ----------- | ------ |
| Option selected | Option A — Full INR Canonical Model | **Approved** (locked, Step 3U-0) |
| Temporary bridge (Option B) | Rejected for normal implementation; emergency-only with separate written approval if ever invoked | **Rejected** |
| Payment/Collection included in combined Release 2 | `Payment.amountLakhs`; `Collection.invoiceValueLakhs/amountWithoutGstLakhs/amountReceivedLakhs` | **Approved** |
| Sales/KRA targets included in combined Release 2 | `KRATemplateItem.expectedTarget/stretchTarget/minimumTarget` (REVENUE rows only); legacy `KRA.target` (confirmed money entries only) | **Pending final metric classification** — seed-data classification confirmed (Section 9), live-DB `KRAMetric`/`KRA.target` scan not yet run |
| Lead/Funnel/Opportunity included in combined Release 2 | `CrmLead.expectedValue`; `CrmOpportunity.value/dealValueExTax/netProfitLakhs`; `SalesFunnel.dealValueLakhs/billingValueLakhs` | **Pending final field verification** — unit confirmed by source code (Section 9), live-DB value-range scan not yet run |
| `EmployeeTarget`/`TeamTarget` `targetJson` included | Only money-shaped keys/values, if any are confirmed to exist | **Pending** — review-only, no money-shaped write path confirmed yet |
| `OrderAdvance.amountLakhs` included | Related to `Payment.amountLakhs` via `applyAdvance()` | **Pending** — flagged in Section 9, not yet confirmed in/out of scope |
| Release 2 implementation permission | Combined atomic release per Section 7's sequence | **Pending until all open decisions (Section 9) are closed** |

---

## 11. Final Recommendation

- **Release 2 implementation should not start until the open decisions in Section 9 are closed**
  — in particular, the live-DB scans for `KRAMetric`/`KRA.target` classification and
  `EmployeeTarget`/`TeamTarget.targetJson` money-key confirmation, and a named business/product
  sign-off on the "one atomic release" and "dashboards keep showing Lakhs" decisions.
- **Once closed, Step 3U should implement the combined atomic INR migration** following the
  sequence in Section 7, against the before/after verification requirements in Section 8.
- **Do not implement Payment/Collection alone.** Under Option A's locked design, shipping
  Payment/Collection independently of the Sales/KRA target migration reproduces the 100,000×
  KRA-scoring corruption risk this entire program exists to prevent (Section 1).
- **Do not use the temporary bridge (Option B) unless separately approved as an emergency path.**
  It is not a default fallback for schedule or convenience reasons — it requires its own explicit
  written approval at the time it would actually be invoked.

---

*Source documents reviewed for this sign-off:* `SALES_KRA_INR_UNIT_SCOPE_PLAN.md`,
`DECIMAL_RELEASE2_SIGNOFF_PLAN.md`, `DECIMAL_MONEY_MIGRATION_PLAN.md`,
`DECIMAL_CONVERSION_READINESS_CHECK.md`, `RBAC_MIGRATION_TRACKER.md`, `PROJECT_MEMORY.md`,
`DATABASE.md`, `prisma/schema.prisma`, `prisma/seed-performance-defaults.ts`. No application code
(`kra-engine.ts`, `payments.ts`, API routes, UI components) was modified to produce this document.
