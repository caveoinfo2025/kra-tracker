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

**`OrderAdvance.amountLakhs` — resolved Step 3U-2, now locked into scope:**

| Domain | Model/Area | Fields / Inputs | Current Unit | Target Unit | Required Action |
| ------ | ---------- | --------------- | ------------ | ----------- | --------------- |
| Order Advance | `OrderAdvance` | `amountLakhs` | ₹ Lakhs (`Float`) | Actual INR | Convert to `Decimal(18,2)` in the same release as `Payment.amountLakhs` — see §12 "OrderAdvance Scope Decision" for the live-data evidence (0 rows in dev, included anyway to eliminate the `applyAdvance()` unit-mismatch risk for any future advance) |

This was flagged in Step 3U-1 as a related finding outside the original instruction's field list
(`OrderAdvance.amountLakhs` is structurally identical to `Payment.amountLakhs` and is converted
into a `Payment` row via `applyAdvance()` in `src/lib/payments.ts`). Step 3U-2's live-DB scan
(§12) confirms `OrderAdvance` has zero rows and `applyAdvance()` has never produced a live
`Payment` row in the dev DB — but it is included in locked scope anyway (zero data-migration
risk, eliminates a future lockstep-unit-mismatch risk entirely) rather than deferred.

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

**Closed in Step 3U-2 (2026-06-22) — see Section 12 for the full live-DB scan evidence behind
every status below.**

| Decision | Required Answer | Status |
| -------- | ---------------- | ------ |
| Confirm `KRATemplateItem.metricType = "REVENUE"` is the only money metric type | **Live-DB scan (§12.1) confirms the seed-file assumption was wrong about the *code names*, but right about the *principle*.** The live dev DB does not contain any `REVENUE`/`ACTIVITY`/`QUALITY`/`COMPLIANCE`-typed `KRAMetric` rows at all (`seed-performance-defaults.ts` was apparently never run against this DB, or its rows were superseded). The live `KRAMetric.metricType` enum values are `AMOUNT`/`PERCENTAGE`/`COUNT`. Money metrics are exactly the 2 populated `AMOUNT`-type metrics (`BOOKING`, `BILLING`) plus one zero-row `AMOUNT`-type metric (`FUNNEL_VALUE`). **`KRATemplateItem` row #16 resolved Step 3U-3 (§13):** business/admin selected **Option B** — its `targetType = "AMOUNT"`/metric-`PERCENTAGE` mismatch must be corrected (re-link to a real `AMOUNT` metric) before this row converts; it does not convert in this Release 2 pass. | **Approved with notes — except item #16, which is Blocked pending config correction** (see §13) |
| Confirm legacy `KRA.target` revenue entries can be parsed safely | Live-DB scan (§12.2): all 34 live `KRA.target` rows parse successfully via `parseTargets()`'s `key:value;key:value` format — zero malformed rows, zero unparseable rows. Exactly 6 KPI labels are confirmed money (Lakhs): `"total sales revenue - booking"`, `"total sales revenue - billing"`, `"total funnel / pipeline value created (₹ lakhs)"`, `"total team booking target achievement (₹ lakhs)"`, `"total team billing achievement"`, `"total team pipeline coverage (₹ lakhs)"`. Every other KPI label across all 34 rows is a percentage/ratio/count (see §12.2 for the full classification, including the "Focus area revenue achievement" labels, which contain "revenue" in the KRA title but are confirmed **mix-ratio percentages, not absolute money** — must not be converted by title-matching). | **Approved** |
| Confirm `EmployeeTarget`/`TeamTarget.targetJson` money keys | Live-DB scan (§12.3): `EmployeeTarget.targetJson` (34 rows) is confirmed to store the **same `key:value;key:value` free-text format as legacy `KRA.target`**, not structured JSON despite the field name — the same 6-label money set applies, confirmed row-by-row. `TeamTarget.targetJson` has **0 rows** in the dev DB — nothing to classify; deferred until populated, re-run this same classification when it is. | **Approved with notes for `EmployeeTarget`; Deferred (no data) for `TeamTarget`** |
| Confirm Lead `expectedValue` currently stored in Lakhs | Confirmed via source (`LeadsClient.tsx`'s `"Expected Value (₹L)"` label) **and** live-DB scan (§12.4): 38 rows, range ₹0–₹59.12L, zero negatives — consistent with Lakhs-scale deal sizes, not raw INR. | **Confirmed / Approved** |
| Confirm Opportunity value fields currently stored in Lakhs | Confirmed via source **and** live-DB scan (§12.4): 21 rows; `value` range ₹0–₹59.12L (matches the linked Lead's `expectedValue`, as expected for a 1:1 promotion); `dealValueExTax`/`netProfitLakhs` are sparsely populated (mostly 0, max ₹5.25L / ₹18.5L where set) but consistent with Lakhs scale wherever nonzero; zero negatives. | **Confirmed / Approved** |
| Confirm Funnel value fields currently stored in Lakhs | Confirmed via source **and** live-DB scan (§12.4): 100 rows; `dealValueLakhs` range ₹0.0027L–₹43.03L, `billingValueLakhs` range ₹0–₹50.78L, zero negatives — consistent with Lakhs-scale deal/billing sizes. | **Confirmed / Approved** |
| Confirm dashboard/report Lakhs display remains desired | **Named business sign-off recorded (§12.6, Step 3U-2):** product owner instruction in project chat — *"All leads, funnel and opportunity input value should be actual INR. Dashboards, KRA and Reports should display in Lakhs for the Sales module."* | **Approved** |
| Confirm implementation must be one atomic release | **Named business sign-off recorded (§12.6, Step 3U-2)**, on top of the pre-existing technical conclusion (`SALES_KRA_INR_UNIT_SCOPE_PLAN.md` §6/§8) that combining is required, not optional, under Option A. | **Approved** |
| Confirm production migration-history gap can remain separate from dev implementation | Unchanged from Step 3U-1 — the two untracked migrations (`add_advance_category`, `employeetarget_relations`, per `DECIMAL_RELEASE2_SIGNOFF_PLAN.md` §10) predate Release 1, are not introduced by this scope, and do not block dev implementation, but must be reviewed before production migration planning. No new information surfaced this step. | **Approved for dev; Pending for production (unchanged, not blocking)** |
| Confirm `OrderAdvance.amountLakhs` must convert in the same release as `Payment.amountLakhs` | Live-DB scan (§12.5): `OrderAdvance` has **0 rows** in the dev DB, and **0 `Payment` rows have `fromAdvanceId` set** — `applyAdvance()` has never fired against live data. Despite zero data-migration risk, `OrderAdvance.amountLakhs` is **included in locked scope** (Section 3) at the schema/type level, to eliminate the lockstep-unit-mismatch risk for any future advance rather than deferring it. | **Approved for inclusion** |

All statuses above reflect Step 3U-2's live-DB scan, the recorded business sign-off (Section 12),
and Step 3U-3's `KRATemplateItem` #16 decision (Section 13). The one remaining blocker is narrow
and explicit: `KRATemplateItem` row #16 is held for a config correction (re-link its metric),
**not** for further classification ambiguity — every classification question in this table is
now closed.

---

## 10. Release 2 Permission Ledger

**Updated Step 3U-3 (2026-06-22) — see Section 13 for the `KRATemplateItem` #16 decision behind
the change to this ledger's last two rows; Section 12 carries the live-DB scan evidence behind
every other status below.**

| Decision | Final Value | Status |
| -------- | ----------- | ------ |
| Option selected | Option A — Full INR Canonical Model | **Approved** (locked, Step 3U-0) |
| Temporary bridge (Option B) | Rejected for normal implementation; emergency-only with separate written approval if ever invoked | **Rejected** |
| Payment/Collection included in combined Release 2 | `Payment.amountLakhs`; `Collection.invoiceValueLakhs/amountWithoutGstLakhs/amountReceivedLakhs` | **Approved** |
| Sales/KRA targets included in combined Release 2 | `KRATemplateItem.expectedTarget/stretchTarget/minimumTarget` (live `metricType = "AMOUNT"` rows only — not `"REVENUE"`, the seed-file code that turned out not to exist live); legacy `KRA.target` (6 confirmed money KPI labels only, per §12.2) | **Approved with notes — except `KRATemplateItem` #16, which is Blocked pending config correction** (§13) |
| Lead/Funnel/Opportunity included in combined Release 2 | `CrmLead.expectedValue`; `CrmOpportunity.value/dealValueExTax/netProfitLakhs`; `SalesFunnel.dealValueLakhs/billingValueLakhs` | **Approved** — unit, range, and zero-negatives confirmed live (§12.4) |
| `EmployeeTarget`/`TeamTarget` `targetJson` included | `EmployeeTarget`: same 6-label money set as `KRA.target`, confirmed it is free text, not structured JSON, despite the field name. `TeamTarget`: 0 rows, nothing to include yet. | **Approved with notes for `EmployeeTarget`; Deferred (no data) for `TeamTarget`** (§12.3) |
| `OrderAdvance.amountLakhs` included | Related to `Payment.amountLakhs` via `applyAdvance()`; 0 live rows, 0 `Payment` rows created via an advance | **Approved for inclusion** — added to Section 3's locked scope (§12.5) |
| `KRATemplateItem` #16 classification | Business/admin selected **Option B** (Section 13): its `targetType = "AMOUNT"`/metric-`PERCENTAGE` mismatch is a configuration error, not a confirmed money override — it must be re-linked to a genuine `AMOUNT` metric before it converts | **Blocked pending config correction** |
| Release 2 implementation permission | Combined atomic release per Section 7's sequence | **Blocked.** The business decision on `KRATemplateItem` #16 is now made (Option B, Section 13) — this is no longer a classification ambiguity. It is now a concrete, scoped prerequisite: re-link item #16's `metricId` to a real `AMOUNT`-typed metric (a config change in the admin-managed KRA Template setup, not code/schema) before Step 3U starts. Every other scope item (Payment/Collection, Lead/Funnel/Opportunity, the other 14 `KRATemplateItem` rows, `EmployeeTarget`, `OrderAdvance`, the business sign-off) is Approved. |

---

## 11. Final Recommendation

- **Release 2 implementation remains Blocked, narrowly, on one diagnosed-but-not-yet-fixed
  item:** Step 3U-4 (Section 14) confirmed there is **no existing `AMOUNT`-typed `KRAMetric`**
  that matches item #16's actual concept ("team-level absolute pipeline coverage target") —
  `FUNNEL_VALUE` was checked and ruled out as a semantic mismatch (it represents an individual
  rep's funnel-creation activity, not a manager's team pipeline coverage target). **A new
  `KRAMetric` row (proposed: "Team Pipeline Coverage (₹L)", `metricType = AMOUNT`) must be
  created, and item #16 re-linked to it, before Step 3U's INR migration touches this row.**
  Two creation paths were evaluated and both were explicitly declined by the product owner this
  step: the admin UI path is currently infeasible (its `metricType` dropdown doesn't offer
  `AMOUNT` at all — a separate, out-of-scope UI fix), and the alternative guarded dev-DB script
  was offered but not authorized. **This remains an admin-config data change
  (`KRAMetric` creation + `KRATemplateItem.metricId` update), not a code or schema change — it
  does not require touching `kra-engine.ts`, `payments.ts`, the schema, or any API/UI file to
  resolve in principle**, but no path to performing it has been authorized yet.
- **Every other open decision from Section 9 is now closed** (Section 9/10, evidence in Section
  12): Payment/Collection scope, Lead/Funnel/Opportunity unit and range, the legacy `KRA.target`
  and `EmployeeTarget.targetJson` money-label classification, `TeamTarget` (deferred, no data),
  `OrderAdvance` inclusion, the one-atomic-release requirement, and the Lakhs-for-Sales-display
  requirement (named business sign-off, §12.6).
- **Once `KRATemplateItem` #16's metric link is corrected, Step 3U should implement the combined
  atomic INR migration** following the sequence in Section 7, against the before/after
  verification requirements in Section 8 — item #16 then re-enters the normal `AMOUNT`-row
  conversion path alongside `BOOKING`/`BILLING`.
- **Do not implement Payment/Collection alone.** Under Option A's locked design, shipping
  Payment/Collection independently of the Sales/KRA target migration reproduces the 100,000×
  KRA-scoring corruption risk this entire program exists to prevent (Section 1).
- **Do not use the temporary bridge (Option B) unless separately approved as an emergency path.**
  It is not a default fallback for schedule or convenience reasons — it requires its own explicit
  written approval at the time it would actually be invoked.

---

## 12. Live DB Scan Findings (Step 3U-2, 2026-06-22)

**Database confirmed:** `DATABASE_URL` resolved to `u686730471_caveodev` @ `srv2201.hstgr.io`
before any query ran. A guarded one-off script (`prisma/scan-release2-scope.mjs`, modeled on the
existing `prisma/apply-*.mjs` pattern) refused to run against any database name other than
`u686730471_caveodev`. **Every query in this section is read-only (`SELECT`/aggregate only) — no
`INSERT`/`UPDATE`/`DELETE` was issued, no row was modified.** The script and its raw output file
were deleted immediately after the findings below were captured — no scratch files remain in the
repository.

### 12.1 KRAMetric / KRATemplateItem classification

**Finding: the live dev DB does not contain the `seed-performance-defaults.ts` rows at all.**
That seed file defines `metricType` values of `REVENUE`/`ACTIVITY`/`QUALITY`/`COMPLIANCE` with
codes `REVENUE_TARGET`/`PIPELINE_VALUE`/`NEW_CUSTOMER`/`ACTIVITY_CALLS`/`PROPOSAL_CONVERSION`/
`COLLECTION_EFFICIENCY`/`KRA_COMPLIANCE`. None of these codes exist in the live `kra_metric`
table. The live DB instead has 15 `KRAMetric` rows with `metricType` values of `AMOUNT`/
`PERCENTAGE`/`COUNT` and entirely different codes, matching the Caveo Excel-derived KPI structure
`kra-engine.ts`'s comments reference ("Weights from Excel"). **Step 3U-0/3U-1's classification
rule ("convert only `metricType = REVENUE` rows") was based on the seed file and does not match
live data — the live rule is "convert only `metricType = AMOUNT` rows."** The underlying
principle (convert money metrics only, never percentages/counts) is unchanged; only the literal
enum string differs.

| Metric ID | Metric Name/Key | metricType | Money Metric? | Template Item Count | Target Fields Unit Today | Convert in Release 2? | Notes |
| --------- | --------------- | ---------- | ------------- | -------------------: | ------------------------- | ---------------------- | ----- |
| 1 | Closed Won Booking (₹L) / `BOOKING` | AMOUNT | Yes | 1 | ₹ Lakhs (item#1: min 50, expected 70, stretch 85) | **Yes** | `targetType = AMOUNT`, consistent with metric |
| 2 | Billing ex-GST (₹L) / `BILLING` | AMOUNT | Yes | 1 | ₹ Lakhs (item#2: min 45, expected 63, stretch 77) | **Yes** | `targetType = AMOUNT`, consistent with metric |
| 3 | Gross Profit % / `GP_PCT` | PERCENTAGE | No | 1 | % (item#3: min 5, expected 10, stretch 15) | No | — |
| 4 | On-time Collection % / `COLLECTION_ONTIME` | PERCENTAGE | No | 1 | % (item#4: min 75, expected 90, stretch 95) | No | — |
| 5 | Customer Retention Rate % / `RETENTION_RATE` | PERCENTAGE | No | 1 | % (item#5: min 75, expected 85, stretch 95) | No | — |
| 6 | Qualified Leads Count / `QL_COUNT` | COUNT | No | 2 | count (item#6, item#12) | No | — |
| 7 | New Customers Closed / `NEW_CUSTOMERS` | COUNT | No | 1 | count (item#7) | No | — |
| 8 | PoC Count / `POC_COUNT` | COUNT | No | 1 | count (item#8) | No | — |
| 9 | Pipeline Ratio % / `PIPELINE_RATIO` | PERCENTAGE | No (item#9) / **ambiguous (item#16)** | 2 | item#9: % (min 80, expected 100, stretch 120). **item#16: `targetType = AMOUNT`, min 1500 / expected 1800 / stretch 2200 — money-scale values on a `PERCENTAGE`-type metric** | item#9: No. **item#16: Blocked / Manual Review** | item#16's values (1500/1800/2200) exactly match legacy `KRA` #71 / `EmployeeTarget` #34's `"total team pipeline coverage (₹ lakhs): 1500"` target — looks like a money target mistakenly linked to `PIPELINE_RATIO` instead of a dedicated `AMOUNT` metric (e.g. the existing zero-row `FUNNEL_VALUE`, or a new "Team Pipeline Coverage" metric). **Not converted; flagged for business/admin resolution before Step 3U.** |
| 10 | Outbound Calls / `OUTBOUND_CALLS` | COUNT | No | 1 | count (item#10) | No | — |
| 11 | Meaningful Connects / `MEANINGFUL_CONNECTS` | COUNT | No | 1 | count (item#11) | No | — |
| 12 | Appointments Fixed / `APPOINTMENTS_FIXED` | COUNT | No | 1 | count (item#13) | No | — |
| 13 | Funnel/Pipeline Value (₹L) / `FUNNEL_VALUE` | AMOUNT | Yes | **0** | n/a — no linked `KRATemplateItem` rows exist yet | N/A — nothing to convert | Money-typed metric exists but is unused; no value at risk |
| 14 | Forecast Accuracy % / `FORECAST_ACCURACY` | PERCENTAGE | No | 2 | % (item#14, item#17) | No | — |
| 15 | CRM Data Accuracy % / `CRM_DATA_ACCURACY` | PERCENTAGE | No | 1 | % (item#15) | No | — |

**Classification rule confirmed correct, with the literal enum value corrected:** every
`AMOUNT`-type metric's linked items are genuinely Lakhs-denominated money (`BOOKING`, `BILLING`)
or unused (`FUNNEL_VALUE`); every `PERCENTAGE`/`COUNT`-type metric's linked items are genuinely
non-money — except the single isolated `targetType`/`metricType` mismatch on item #16, which is
explicitly excluded from conversion pending manual review, not guessed either direction.

### 12.2 Legacy `KRA.target` classification

All 34 live `KRA` rows were read. Every row's `target` string parses cleanly via the same
`key:value;key:value` format `parseTargets()` expects — **zero malformed rows, zero
unparseable rows, zero empty/null rows.**

**Confirmed money KPI labels (convert in Release 2) — found in 4 of the 12 distinct KRA titles:**
`"total sales revenue - booking"`, `"total sales revenue - billing"` (in "Sales Revenue targets",
5 rows: KRA #38/43/48/53/58), `"total funnel / pipeline value created (₹ lakhs)"` (in "Funnel
Creation", 1 row: KRA #65), `"total team booking target achievement (₹ lakhs)"` and `"total team
billing achievement"` (in "Revenue & Profitability", 1 row: KRA #68), `"total team pipeline
coverage (₹ lakhs)"` (in "Pipeline Health & Strategic Execution", 1 row: KRA #71).

**Every other KPI label across all 34 rows is confirmed non-money** (cross-checked against how
`kra-engine.ts` actually consumes each label):

| KRA Title (row count) | Confirmed Money Sub-Labels | Confirmed Non-Money Sub-Labels | Convert in Release 2? |
| ---------------------- | --------------------------- | -------------------------------- | ----------------------- |
| Sales Revenue targets (#38, 43, 48, 53, 58 — employees 5,6,7,8,9) | `total sales revenue - booking`, `total sales revenue - billing` | `average gross profit margin` (%), `payment collections within due dates & credit days reduction` (ratio 0–1) | **Partial — money sub-labels only** |
| Customer & Business Development (#39, 44, 49, 54, 59) | none | `customer retention rate` / `new customers` (count, varies by row), `qualified leads generation` (count) | No |
| Sales management (#40, 45, 50, 55, 60) | none | `non-obligatory" proof of concept (poc)` (count), `new customers or upsell closure` (count, where present), `pipeline` (ratio multiplier — confirmed via `kra-engine.ts`'s `pipTarget * bookingTargetForPip`, not an absolute amount) | No |
| Focus area revenue achievement (#41, 46, 51, 56, 61) | none | `network & security` / `server & storage` / `mssp services` / `cloud security & services` — **mix-ratio percentages (0.10–0.35), not absolute money, despite "revenue" in the KRA title** | No — must not be converted by title-matching |
| Sales Operations Excellence (#42, 47, 52, 57) | none | `forecast accuracy` (ratio), `certification and product training` (count) | No |
| Lead Generation Activity (#63) | none | `total outbound calls made` (count), `meaningful connects achieved` (count) | No |
| Pipeline Building (#64) | none | `qualified leads generated` (count), `appointments fixed for bdm / sales closure team` (count) | No |
| Funnel Creation (#65) | `total funnel / pipeline value created (₹ lakhs)` | `number of funnel opportunities created` (count) | **Partial — money sub-label only** |
| Marketing Activities (#66) | none | `customer webinars organised` (count), `blitz days conducted` (count) | No |
| Sales Operations Excellence — CRM variant (#67) | none | `crm data accuracy & timely lead updates` (ratio), `certification and product training` (count) | No |
| Revenue & Profitability (#68) | `total team booking target achievement (₹ lakhs)`, `total team billing achievement` | `gross profit margin (%)` (explicit %), `collections efficiency (% within due dates)` (explicit %) | **Partial — money sub-labels only** |
| Market Growth & Business Development (#69) | none | `new logos / strategic accounts acquired by team` (count), `new projects & strategic deals initiated` (count), `focus area revenue mix achievement (n&s, s&s, mssp, cloud)` (ratio) | No |
| Team Leadership & Talent Development (#70) | none | `team aggregate kra achievement rate` / `sales talent retention` / `team training & certification completion rate` (all ratios) | No |
| Pipeline Health & Strategic Execution (#71) | `total team pipeline coverage (₹ lakhs)` | `forecast accuracy` (ratio), `average deal win rate` (ratio) | **Partial — money sub-label only** |

**Parsing risk assessment:** none. `parseTargets()` splits on `;` then the *last* `:` in each
chunk, which correctly handles every label above (none contain a second `:` after the value).
The one label with an embedded `"` character (`non-obligatory" proof of concept (poc)`, present
verbatim in the source data — likely a data-entry artifact, not a parsing bug) still parses
correctly since `lastIndexOf(":")` finds the value-separator regardless of the stray quote. No
row requires Manual Review for parsing safety; only the explicit money/non-money split above
governs what converts.

### 12.3 `EmployeeTarget` / `TeamTarget` `targetJson` classification

**Finding: despite the field name, `targetJson` does not store JSON.** All 34 live
`EmployeeTarget` rows were read; every `targetJson` value is the **same `key:value;key:value`
free-text format as legacy `KRA.target`**, byte-for-byte matching the corresponding `KRA.target`
string content for the same employee/template combination (e.g. `EmployeeTarget` #1's
`targetJson` is identical to `KRA` #38's `target`). The same 6-label money set from §12.2 applies
identically — no separate classification was needed once this was confirmed.

| Model | Record ID | JSON Keys Found | Money Keys Confirmed? | Convert in Release 2? | Notes |
| ----- | --------- | ----------------- | ------------------------ | ------------------------ | ----- |
| `EmployeeTarget` | #1, #6, #11, #16, #21 (booking/billing template rows, 5 rows) | `total sales revenue - booking`, `total sales revenue - billing`, `average gross profit margin`, `payment collections within due dates & credit days reduction` | Yes — first 2 keys only | **Partial — money keys only** | Mirrors `KRA.target` rows #38/43/48/53/58 exactly |
| `EmployeeTarget` | #28 (funnel value row) | `total funnel / pipeline value created (₹ lakhs)`, `number of funnel opportunities created` | Yes — first key only | **Partial — money key only** | Mirrors `KRA` #65 |
| `EmployeeTarget` | #31 (team booking/billing row) | `total team booking target achievement (₹ lakhs)`, `total team billing achievement`, `gross profit margin (%)`, `collections efficiency (% within due dates)` | Yes — first 2 keys only | **Partial — money keys only** | Mirrors `KRA` #68 |
| `EmployeeTarget` | #34 (team pipeline coverage row) | `total team pipeline coverage (₹ lakhs)`, `forecast accuracy`, `average deal win rate` | Yes — first key only | **Partial — money key only** | Mirrors `KRA` #71 |
| `EmployeeTarget` | all other rows (#2–5, 7–10, 12–15, 17–20, 22–27, 29–30, 32–33 — 25 rows) | retention/count/ratio/mix/compliance labels (see §12.2's non-money set) | No | No | No money keys in any of these rows |
| `TeamTarget` | — | **0 rows exist** | N/A — no data | **Deferred — no data to classify** | Confirmed empty via live `COUNT(*)`; re-run this classification when/if rows are ever created |

### 12.4 Lead / Opportunity / Funnel field verification

| Model | Field | Current Type | Current Unit | Sample Range (live) | UI Label Today | Target Unit | Convert in Release 2? |
| ----- | ----- | -------------- | --------------- | ---------------------- | ----------------- | -------------- | ------------------------ |
| `CrmLead` | `expectedValue` | `Float` | ₹ Lakhs | 38 rows, ₹0–₹59.1244L, avg ₹5.12L, 0 negatives | `"Expected Value (₹L)"` | Actual INR | **Yes** — `value * 100000` |
| `CrmOpportunity` | `value` | `Float` | ₹ Lakhs | 21 rows, ₹0–₹59.1244L, 0 negatives | `"Value (₹L)"` | Actual INR | **Yes** — `value * 100000` |
| `CrmOpportunity` | `dealValueExTax` | `Float` | ₹ Lakhs | 21 rows, ₹0–₹5.25L (sparsely populated — mostly 0) | No dedicated label (schema comment only) | Actual INR | **Yes** — `value * 100000` |
| `CrmOpportunity` | `netProfitLakhs` | `Float` | ₹ Lakhs | 21 rows, ₹0–₹18.5L (sparsely populated — mostly 0) | No dedicated label (schema comment only) | Actual INR | **Yes** — `value * 100000` |
| `SalesFunnel` | `dealValueLakhs` | `Float` | ₹ Lakhs | 100 rows, ₹0.0027L–₹43.032L, 0 negatives | `"Deal Value (₹L)"` | Actual INR | **Yes** — `value * 100000` |
| `SalesFunnel` | `billingValueLakhs` | `Float` | ₹ Lakhs | 100 rows, ₹0L–₹50.778L, 0 negatives | `"Billing Value (₹L)"` | Actual INR | **Yes** — `value * 100000` |

No field is already actual INR — every field above is confirmed Lakhs-scaled live data with zero
negative values (no data-quality blocker for the `× 100000` transform).

### 12.5 OrderAdvance Scope Decision

| Field | Feeds Payment? | Current Unit | Target Unit | Include in Release 2? | Reason |
| ----- | ---------------- | --------------- | -------------- | ------------------------ | -------- |
| `OrderAdvance.amountLakhs` | Yes — via `applyAdvance(advanceId, collectionId, recordedById)` in `src/lib/payments.ts`, which reads `OrderAdvance.amountLakhs` and passes it into `recordPayment()` to create a `Payment` row | ₹ Lakhs (`Float`) | Actual INR | **Yes — include in Release 2** | Live-DB scan: **0 `OrderAdvance` rows exist**, and **0 `Payment` rows have `fromAdvanceId` set** — `applyAdvance()` has never produced a live row in this dataset, so there is zero data-migration risk. It is still included (schema/type conversion only, no data to transform) because leaving it out would recreate exactly the lockstep-unit-mismatch risk Step 3U-1 flagged: the first time `applyAdvance()` is used after `Payment.amountLakhs` converts to INR but `OrderAdvance.amountLakhs` is still Lakhs, the resulting `Payment` row would be under-valued by 100,000×. Including it now costs nothing (no rows to transform) and removes the risk permanently. |

### 12.6 Named Business Sign-Off

| Decision | Sign-Off Source | Status |
| -------- | ------------------ | -------- |
| Canonical money input/storage is actual INR across Sales/KRA/Finance | Product owner instruction in project chat: *"All leads, funnel and opportunity input value should be actual INR. Dashboards, KRA and Reports should display in Lakhs for the Sales module."* | **Approved** |
| Lakhs display only for Sales dashboards/KRA/Reports | Same product owner instruction (above) | **Approved** |
| Combined Release 2 required, no Payment/Collection-only release | Derived from Option A's no-conversion-factor design (Step 3U-0) and the Collection→KRA-engine dependency (Step 3S/3U-0/3U-1) | **Approved** |

---

## 13. KRATemplateItem #16 Decision (Step 3U-3, 2026-06-22)

**Business/admin decision recorded.** The product owner was presented with the three options
defined for this single remaining Release 2 blocker (§12.1) and selected **Option B —
Configuration error, fix before migration.**

| Item | Finding | Decision | Release 2 Action | Status |
| ---- | ------- | -------- | -------------------- | ------ |
| `KRATemplateItem` #16 | Linked to the `PERCENTAGE`-typed `PIPELINE_RATIO` metric ("Pipeline Ratio %"), but its own `targetType = "AMOUNT"` with values `minimumTarget=1500`/`expectedTarget=1800`/`stretchTarget=2200`, exactly matching the legacy `KRA` #71 / `EmployeeTarget` #34 `"total team pipeline coverage (₹ lakhs): 1500"` target | **Option B — Configuration error; must be corrected before any conversion** | Release 2 does **not** convert item #16's values in this pass. A separate config-correction step — re-linking item #16 to a metric whose `metricType = "AMOUNT"` (the existing zero-row `FUNNEL_VALUE` metric, or a new dedicated "Team Pipeline Coverage" metric) — must happen first, as its own change, before Step 3U's INR migration touches this row. Once re-linked and the `metricType`/`targetType` agree, this row re-enters the normal `AMOUNT`-row conversion path (`× 100000`) alongside `BOOKING`/`BILLING`. | **Blocked pending config correction** |

**Re-verification note:** a live re-query of `KRATemplateItem` #16 was attempted this step but
the Remote MySQL connection was rejected (`ER_ACCESS_DENIED_ERROR` — the connecting IP is not
currently on Hostinger's allowlist, the same intermittent limitation documented in
`DECIMAL_CONVERSION_READINESS_CHECK.md` §4 from an earlier step). The decision above relies on
the already-captured, read-only evidence from Step 3U-2's live scan (§12.1), not a fresh query —
no new database access was needed or attempted beyond the failed connection attempt itself,
which performed no write and left no row touched.

**Scope of the fix this decision requires:** correcting item #16's metric link is a
`KRATemplateItem.metricId` data/config change in the admin-managed KRA Template configuration —
it is **not** a code, schema, or `kra-engine.ts`/`payments.ts` change, and it is explicitly **out
of scope for this step** (decision-locking and documentation only, per this step's own
constraints). It is the named next step before Step 3U can proceed.

---

## 14. KRATemplateItem #16 Correction Attempt (Step 3U-4, 2026-06-22)

**Outcome: investigation completed and root cause fully diagnosed; no correction made; Release 2
remains Blocked.**

**Task 1 — Dev DB confirmed.** `DATABASE_URL` resolved to `u686730471_caveodev` @
`srv2201.hstgr.io` before any query ran (live access succeeded this step, unlike the transient
denial noted in §13 — the earlier IP-allowlist issue had cleared).

**Task 2 — Live re-inspection of `KRATemplateItem` #16 and all `AMOUNT`-typed metrics**
(`prisma/inspect-amount-metrics.mjs`, read-only, deleted after use):

| Metric ID | Metric Name/Key | metricType | Existing Template Item Count | Suitable for #16? | Notes |
| --------- | --------------- | ---------- | -------------------------: | ----------------- | ----- |
| 1 | Closed Won Booking (₹L) / `BOOKING` | AMOUNT | 1 (templateId=1, individual) | No | Different template, different KPI — individual booking |
| 2 | Billing ex-GST (₹L) / `BILLING` | AMOUNT | 1 (templateId=1, individual) | No | Different template, different KPI — individual billing |
| 13 | Funnel/Pipeline Value (₹L) / `FUNNEL_VALUE` | AMOUNT | 0 | **No — semantic mismatch confirmed** | `calculationSource = FUNNEL_VALUE` ties to `totalPipelineValue()`, an **individual** rep's funnel-creation activity, matching legacy `KRA` #65 ("Funnel Creation", employee-level). Item #16 lives in `KRATemplate` #7, *"Pipeline Health & Strategic Execution (Manager)"* — *"Team pipeline coverage and forecast accuracy for managers"* — a **team-level** concept matching `teamPipeline()`/legacy `KRA` #71, not `totalPipelineValue()`. Confirmed by the business owner directly in this conversation: "Pipeline Ratio %" (item #16's current, wrong, metric) is a genuine **percentage coverage multiplier** (e.g. a 200% target on a ₹1 Cr revenue target requires ₹2 Cr of pipeline) — a fundamentally different mechanic from item #16's own `targetType = AMOUNT` absolute figures (1500/1800/2200, i.e. ₹15Cr/₹18Cr/₹22Cr). None of the 3 existing `AMOUNT` metrics represents "team-level absolute pipeline coverage target." |

**Conclusion confirmed: no existing `AMOUNT` metric matches.** A new dedicated metric (proposed:
name "Team Pipeline Coverage (₹L)", code `TEAM_PIPELINE_COVERAGE`, `metricType = AMOUNT`) would
be required before item #16 could be re-linked.

**Task 3 — Correction attempt.** Two creation paths were presented to the product owner; neither
proceeded:

1. **Admin UI path (initially selected, then found infeasible).** Inspecting the actual
   "Add Metric" form (`src/app/settings/performance/components/KRALibrary.tsx` lines 108–112)
   found its `<select>` only offers `REVENUE`/`ACTIVITY`/`QUALITY`/`COMPLIANCE`/`CUSTOM` —
   **`AMOUNT`/`PERCENTAGE`/`COUNT` (the taxonomy every live `KRAMetric` row actually uses) are
   not selectable options in this dropdown at all.** The underlying API
   (`POST /api/admin/performance/kra` → `createKRAMetric()`) has no server-side enum
   restriction and would accept `metricType: "AMOUNT"` if sent directly, but a normal browser
   form cannot submit a `<select>` value that isn't one of its rendered `<option>` elements —
   so the UI path is not actually usable as the screen exists today. Fixing the dropdown is a
   UI code change, explicitly forbidden by this step's constraints, so it was not done here.
2. **Guarded dev-DB script (the remaining viable path).** Offered as the alternative — a
   temporary script that refuses any database but `u686730471_caveodev`, inserts exactly one
   new `KRAMetric` row, re-links item #16's `metricId`, verifies, then deletes itself. **The
   product owner chose not to proceed with this path either, opting to stop and stay blocked.**

**Task 4 — Verification: not run.** No correction was made, so there is nothing to verify
against. Per this step's own rule ("only update [the ledger] if verification passes; if
verification does not pass, keep Release 2 blocked"), no verification table is produced and
Release 2 implementation permission is **not** upgraded.

**Result:** `KRATemplateItem` #16's classification is now fully understood (no longer an
ambiguity — see Task 2's table) — but **the corrective action itself has not been performed and
was deliberately not authorized this step.** Release 2 implementation permission remains
**Blocked**, on the same concrete prerequisite as Step 3U-3 identified, now refined: a new
`AMOUNT`-typed `KRAMetric` must be created (via either a future UI fix or an explicitly-approved
DB script) and item #16 re-linked to it, before Step 3U can proceed.

**Follow-up flagged, not actioned:** the admin KRA Metrics screen's outdated `metricType`
dropdown (offering `REVENUE`/`ACTIVITY`/`QUALITY`/`COMPLIANCE`/`CUSTOM` instead of the live
`AMOUNT`/`PERCENTAGE`/`COUNT` taxonomy) is a pre-existing UI/data-model drift, independent of
Release 2. It is not fixed here (UI code change, out of scope) — flagged as a candidate for a
separate, explicitly-scoped follow-up task.

**No code, schema, migration, or data change was made this step.** `prisma/schema.prisma`, every
migration file, every API route, every UI component, `src/lib/kra-engine.ts`, and
`src/lib/payments.ts` remain untouched. No database row was inserted, updated, or deleted — the
two temporary inspection scripts (`prisma/inspect-amount-metrics.mjs`,
`prisma/inspect-item16.mjs`-style precursor) were read-only and were deleted after use.

---

*Source documents reviewed for this sign-off (Step 3U-1):* `SALES_KRA_INR_UNIT_SCOPE_PLAN.md`,
`DECIMAL_RELEASE2_SIGNOFF_PLAN.md`, `DECIMAL_MONEY_MIGRATION_PLAN.md`,
`DECIMAL_CONVERSION_READINESS_CHECK.md`, `RBAC_MIGRATION_TRACKER.md`, `PROJECT_MEMORY.md`,
`DATABASE.md`, `prisma/schema.prisma`, `prisma/seed-performance-defaults.ts`.

*Additional verification for Step 3U-2 (2026-06-22):* a read-only live-DB scan against
`u686730471_caveodev` (Section 12) — `KRAMetric`, `KRATemplateItem`, legacy `KRA.target`,
`EmployeeTarget`, `TeamTarget`, `CrmLead`, `CrmOpportunity`, `SalesFunnel`, `OrderAdvance`, and
`Payment.fromAdvanceId`. The scan script (`prisma/scan-release2-scope.mjs`) and its raw output
were deleted after the findings above were captured — no scratch files remain.

*Decision recorded for Step 3U-3 (2026-06-22):* the product owner selected Option B for
`KRATemplateItem` #16 (Section 13) via direct confirmation in this conversation. A read-only
re-verification attempt (`prisma/inspect-item16.mjs`) was blocked by a transient Remote MySQL
access denial from the connecting IP; the script and its non-output were deleted — no scratch
files remain, no database row was touched.

*Correction attempt for Step 3U-4 (2026-06-22):* a successful read-only re-inspection
(`prisma/inspect-amount-metrics.mjs`, the earlier IP-allowlist issue having cleared) confirmed no
existing `AMOUNT`-typed `KRAMetric` matches item #16. Two creation paths (admin UI, guarded
dev-DB script) were presented to the product owner; the admin UI path was found infeasible
(dropdown doesn't support `AMOUNT`) and the script path was explicitly declined. **No correction
was made; Release 2 remains Blocked** (Section 14). The inspection script was deleted after use
— no scratch files remain, no database row was touched.

**No application code was modified to produce this document at any step.** `kra-engine.ts`,
`payments.ts`, every API route, every UI component, `prisma/schema.prisma`, and every migration
file remain untouched; no database row was inserted, updated, or deleted.
