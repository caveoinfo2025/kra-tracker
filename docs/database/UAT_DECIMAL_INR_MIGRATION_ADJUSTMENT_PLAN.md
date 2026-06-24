# UAT Decimal / INR Migration Adjustment Plan

> **Step 4C (2026-06-24).** This is a planning/decision document only. No UAT database was
> queried or modified, no migration was run, no schema/migration files were created, and no
> API/UI code changed in this step. All facts below come from the real read-only pre-check
> already completed in Step 4B (`docs/database/uat-precheck/uat-precheck-result-template.md`)
> and from re-reading the existing dev migration SQL — no new database access happened here.

---

## 1. Purpose

Step 4B's real UAT pre-check found that UAT's money data does **not** uniformly match dev's
"everything is stored in ₹ Lakhs" pre-migration assumption. Specifically:

- `prisma/migrations/20260622120000_decimal_release1_lakhs_to_inr/migration.sql` and
  `prisma/migrations/20260623060000_decimal_release2_combined_inr_canonical/migration.sql` both
  apply an unconditional `UPDATE ... SET <field> = <field> * 100000` to every in-scope field,
  then `ALTER TABLE ... MODIFY` to `DECIMAL(18,2)`. This SQL was written and validated against
  **dev's** data, where every in-scope field was confirmed Lakhs-scale before migrating.
- On UAT, `Payment.amountLakhs`, `Collection.invoiceValueLakhs`/`amountWithoutGstLakhs`/
  `amountReceivedLakhs`, and `OrderAdvance.amountLakhs` sample at scales that look like they are
  **already actual ₹ INR**, not Lakhs (e.g. a `Collection.invoiceValueLakhs` row at 7,979,986 —
  implausible as Lakhs, since that would represent a ≈₹798 billion invoice).
- **Applying dev's migration SQL to UAT unchanged would corrupt this data** — multiplying
  already-correct INR values by 100,000 a second time.
- UAT's `KRA.target`/`EmployeeTarget.targetJson` free-text money labels also don't match dev's
  documented 6-label set 1:1 — a hardcoded label-matching transform (dev used a guarded Node
  script, `prisma/transform-kra-target-money.mjs`, since deleted after use) cannot be reused
  against UAT without re-deriving which labels are actually money on UAT.
- **UAT therefore needs its own, field-specific transform decision** — not a blind re-run of
  dev's SQL. This document is that decision matrix. **It is a plan, not an execution** — no SQL
  is written or run here; that's a later, explicitly-instructed step.

---

## 2. UAT Pre-Check Findings Summary

(All facts below are carried forward from Step 4B's real, completed read-only run — not
re-verified in this step.)

| Fact | Value |
| ---- | ----- |
| UAT DB name | `u686730471_Caveo_UAT` |
| MariaDB version | `11.8.6-MariaDB-log` |
| `_prisma_migrations` row count | 19 |
| Migration gap | Missing exactly 3: `add_soft_delete_fields_phase_a`, `decimal_release1_lakhs_to_inr`, `decimal_release2_combined_inr_canonical` |
| Schema status | Every in-scope Release 1/2 column still `double`/`text` — no drift, clean pre-migration state |
| Row counts | Match Session 9's documented estimates exactly (`Payment` 26, `Collection` 141, `OrderAdvance` 3, `CrmLead` 280, `CrmOpportunity` 49, `SalesFunnel` 100, `KRA` 34; `Expense`/`EmployeeAdvance`/`TravelClaim`/`employee_target`/`team_target`/`Voucher`/`Ledger`/`FinAccount` all 0) |
| Unit mismatch finding | `Payment`/`Collection`/`OrderAdvance` sample at INR-scale (max values 342K–7.98M), not Lakhs-scale; `CrmLead`/`SalesFunnel` sample at plausible Lakhs-scale (max ≤120); `CrmOpportunity.value` has 1 negative row (-0.1); `CrmOpportunity.dealValueExTax`/`netProfitLakhs` are all-zero in the sample (unit can't be inferred from zero) |
| KRA label mismatch finding | Only 2 of dev's 6 documented confirmed-money `KRA.target` labels (`total sales revenue - booking`, `total sales revenue - billing`) appear in the 20-row sample reviewed; the other 4 don't appear, and UAT instead has different KPI categories with mixed money/count/ratio sub-keys |
| Structured KRA table finding | `kra_template_item`, `kra_metric`, `kra_template` all have **0 rows on UAT** — the structured engine dev's Release 2/Step 3U-5 fix depends on doesn't exist on UAT at all; real UAT KRA scoring runs entirely through legacy free-text `KRA.target`/`EmployeeTarget.targetJson` (0 rows on `employee_target`, so only `KRA.target` actually has data — 34 rows) |

---

## 3. Field-Level UAT Transform Decision Matrix

| Domain | Model | Field | UAT Current Unit | Target Unit | UAT Action | Reason | Status |
| ------ | ----- | ----- | ---------------- | ----------- | ---------- | ------ | ------ |
| Release 1 | Expense | amountLakhs | Unknown — 0 rows on UAT | INR | No-op (type conversion only, no data to transform) | Table is empty on UAT; type change is safe regardless of unit since there's no data to corrupt | Ready |
| Release 1 | Expense | gstAmountLakhs | Unknown — 0 rows on UAT | INR | No-op (type conversion only) | Same — empty table | Ready |
| Release 1 | EmployeeAdvance | amountLakhs | Unknown — 0 rows on UAT | INR | No-op (type conversion only) | Empty table | Ready |
| Release 1 | EmployeeAdvance | disbursedAmountLakhs | Unknown — 0 rows on UAT | INR | No-op (type conversion only) | Empty table | Ready |
| Release 1 | EmployeeAdvance | settledAmountLakhs | Unknown — 0 rows on UAT | INR | No-op (type conversion only) | Empty table | Ready |
| Release 1 | EmployeeAdvance | balanceLakhs | Unknown — 0 rows on UAT | INR | No-op (type conversion only) | Empty table | Ready |
| Release 1 | TravelClaim | amountLakhs | Unknown — 0 rows on UAT | INR | No-op (type conversion only) | Empty table | Ready |
| Release 1 | TravelClaim | amountRupees | Unknown — 0 rows on UAT | INR (already INR by design, dev's migration never multiplies this field) | No-op (type conversion only) | Empty table; even if populated, dev's own migration SQL never multiplies this field — already-INR by design | Ready |
| Release 1 | TravelClaim | ratePerKm | Unknown — 0 rows on UAT | INR-per-km (already actual rate, dev's migration never multiplies this field) | No-op (type conversion only) | Empty table; dev's migration never multiplies this field either | Ready |
| Release 2 | Payment | amountLakhs | **Confirmed INR-scale** (sample max 1,000,000) | INR | **Type conversion only — do NOT multiply** | Dev's SQL would multiply by 100,000; UAT evidence shows the value is already actual INR | **Decision made — see §5** |
| Release 2 | Collection | invoiceValueLakhs | **Confirmed INR-scale** (sample max 7,979,986) | INR | **Type conversion only — do NOT multiply** | Same reasoning | **Decision made — see §5** |
| Release 2 | Collection | amountWithoutGstLakhs | **Confirmed INR-scale** (sample max 6,762,700) | INR | **Type conversion only — do NOT multiply** | Same reasoning | **Decision made — see §5** |
| Release 2 | Collection | amountReceivedLakhs | **Confirmed INR-scale** (sample max 7,788,000) | INR | **Type conversion only — do NOT multiply** | Same reasoning | **Decision made — see §5** |
| Release 2 | OrderAdvance | amountLakhs | **Confirmed INR-scale** (sample max 341,964, 3 rows) | INR | **Type conversion only — do NOT multiply** | Only 3 rows but unambiguous evidence at this scale; consistent with Payment/Collection | **Decision made — see §5** |
| Release 2 | CrmLead | expectedValue | **Confirmed Lakhs-scale** (sample max 120) | INR | **Multiply by 100,000** | Plausible Lakhs deal-size range (≤₹1.2 Cr) | **Decision made — see §6** |
| Release 2 | CrmOpportunity | value | Mostly Lakhs-scale (max 120) but **1 negative row (-0.1)** | INR | **Multiply by 100,000 — flag the 1 negative row for manual business review first** | Same plausible range as `CrmLead`, but the negative value needs a business decision on meaning before being carried through unchanged | **Blocked pending negative-value review — see §6** |
| Release 2 | CrmOpportunity | dealValueExTax | **All-zero in sample (49 rows)** | INR | Multiply by 100,000 (moot for current data — 0 × 100,000 = 0 — but apply the same rule as `value` for consistency and any future rows) | Can't infer unit from an all-zero sample; treating it consistently with `value` is the safer default since both fields are part of the same record and conceptually the same deal-size scale | **Blocked pending confirmation — see §6** |
| Release 2 | CrmOpportunity | netProfitLakhs | **All-zero in sample (49 rows)** | INR | Multiply by 100,000 (moot for current data, same reasoning as `dealValueExTax`) | Same reasoning | **Blocked pending confirmation — see §6** |
| Release 2 | SalesFunnel | dealValueLakhs | **Confirmed Lakhs-scale** (sample max ~43) | INR | **Multiply by 100,000** | Plausible Lakhs deal-size range | **Decision made — see §6** |
| Release 2 | SalesFunnel | billingValueLakhs | **Confirmed Lakhs-scale** (sample max ~51) | INR | **Multiply by 100,000** | Plausible Lakhs deal-size range | **Decision made — see §6** |
| KRA / Sales targets | KRATemplateItem | AMOUNT rows (expectedTarget/stretchTarget/minimumTarget) | N/A — table has 0 rows on UAT | N/A | **No-op — table is empty** | `kra_template_item` has 0 rows on UAT; there is nothing to transform regardless of unit | **Ready — see §7** |
| KRA / Sales targets | KRA | target (confirmed-money labels) | Mixed — only 2 of dev's 6 documented labels found in sample | INR (sub-values only, free-text format unchanged) | **Transform only the 2 confirmed labels; block the other 4 until re-confirmed against the full 34-row set** | Dev's hardcoded 6-label list does not match UAT 1:1 — blind reuse risks either missing real money values or touching non-money values by accident | **Partially blocked — see §7** |
| KRA / Sales targets | EmployeeTarget | targetJson (confirmed-money labels) | N/A — table has 0 rows on UAT | N/A | **No-op — table is empty** | `employee_target` has 0 rows on UAT | **Ready — see §7** |
| KRA / Sales targets | TeamTarget | targetJson (if rows exist) | N/A — table has 0 rows on UAT (confirmed in Step 4B, matches dev) | N/A | **No-op — table is empty** | `team_target` has 0 rows on UAT, same as dev | **Ready — see §7** |

---

## Payment / Collection / OrderAdvance UAT Unit Decision

| Model | Field | Evidence | Decision | Status |
| ----- | ----- | -------- | -------- | ------ |
| Payment | amountLakhs | Sample range 0.01–1,000,000 across 26 rows, 0 nulls, 0 negatives. A value of 1,000,000 "Lakhs" would represent ₹1,000 Crore for a single payment — implausible for this business's transaction sizes. | **Type conversion only (Decimal(18,2)) — do not multiply** | Decision made, pending business sign-off before execution (see §9) |
| Collection | invoiceValueLakhs | Sample range 21.3344–7,979,986 across 141 rows. The high end (≈₹798 Cr for one invoice as "Lakhs") is implausible; the low end (21.3344) is ambiguous in isolation but the field must use one consistent unit across all 141 rows. | **Type conversion only — do not multiply** | Decision made, pending business sign-off |
| Collection | amountWithoutGstLakhs | Sample range 2.5424–6,762,700, same reasoning as `invoiceValueLakhs` (it's a GST-derived sub-amount of the same invoice value). | **Type conversion only — do not multiply** | Decision made, pending business sign-off |
| Collection | amountReceivedLakhs | Sample range 0–7,788,000, same reasoning. | **Type conversion only — do not multiply** | Decision made, pending business sign-off |
| OrderAdvance | amountLakhs | Sample range 37,967–341,964 across only 3 rows. Smaller sample than the others, but the scale is consistent with the same "already INR" pattern as `Payment`/`Collection`, and `OrderAdvance.amountLakhs` feeds directly into `Payment` via `applyAdvance()` — these two fields must use the same unit or every advance-applied payment would be unit-inconsistent. | **Type conversion only — do not multiply** | Decision made, pending business sign-off |

**Why "type conversion only" instead of "blocked": ** the evidence here is not ambiguous — every
sampled value across 4 fields and 311 combined rows is consistent with "already INR," and the
implausibility of the Lakhs reading (hundreds of billions of rupees for ordinary collections) is
extreme enough to treat this as a confirmed finding, not a guess. The matrix still marks the
*permission to execute* as pending business sign-off (§9) — not because the technical evidence is
weak, but because changing how 4 financially load-bearing fields are migrated is a business-impact
decision, not just a technical one, and should be confirmed by whoever owns Finance/Sales data
before any SQL is written against UAT.

---

## Sales Pipeline UAT Unit Decision

| Model | Field | Evidence | Decision | Status |
| ----- | ----- | -------- | -------- | ------ |
| CrmLead | expectedValue | Sample range 0–120 across 280 rows, 0 nulls, 0 negatives — a plausible Lakhs-scale deal-value range (≤₹1.2 Cr), matching dev's pre-migration assumption. | **Multiply by 100,000** | Decision made |
| SalesFunnel | dealValueLakhs | Sample range 0.002733–43.032004 across 100 rows — plausible Lakhs-scale. | **Multiply by 100,000** | Decision made |
| SalesFunnel | billingValueLakhs | Sample range 0–50.77776472 across 100 rows — plausible Lakhs-scale, consistent with `dealValueLakhs`. | **Multiply by 100,000** | Decision made |
| CrmOpportunity | value | Sample range -0.1–120 across 49 rows — mostly plausible Lakhs-scale, **but exactly 1 row is negative (-0.1)**. | **Multiply by 100,000 — blocked until the negative row is reviewed** | **Blocked** |
| CrmOpportunity | dealValueExTax | All 49 sampled rows are exactly 0 — no variance to confirm a unit from. | Multiply by 100,000 for consistency with `value` (moot numerically while all rows are 0) — **blocked until confirmed this isn't itself a sign of a different storage convention for this specific field** | **Blocked** |
| CrmOpportunity | netProfitLakhs | All 49 sampled rows are exactly 0 — same situation as `dealValueExTax`. | Multiply by 100,000 for consistency (moot numerically) — **blocked until confirmed** | **Blocked** |

The 3 `CrmOpportunity` fields are blocked not because the evidence points the *other* way (toward
INR-scale) — it doesn't; an all-zero or near-zero-with-one-negative sample is genuinely
inconclusive, and blocking is the correct response to inconclusive evidence per §4's rule, rather
than assuming "probably Lakhs like the rest of the model."

---

## UAT KRA Transform Decision

The structured KRA template tables (`kra_template_item`, `kra_metric`, `kra_template`) all have
**0 rows on UAT** — confirmed in Step 4B, unchanged from this step. **`KRATemplateItem`'s
transformation is a no-op for UAT as long as the row count remains 0** — there's nothing to
multiply or convert. If rows are ever added to these tables on UAT before migration, this
decision must be revisited (a fresh read-only check would be needed to classify them the same way
dev's Step 3U-5 classified its own rows).

UAT's real KRA money data lives entirely in the legacy free-text `KRA.target` field (34 rows;
`EmployeeTarget.targetJson` has 0 rows). Dev's 6-label confirmed-money list cannot be reused
blindly — only 2 of those 6 labels were found in the 20-row sample reviewed in Step 4B.

| Label / Pattern | Found In UAT? | Money-Denominated? | Transform Action | Status |
| --------------- | ------------- | ------------------- | ----------------- | ------ |
| `total sales revenue - booking` | **Yes** — sample values 70, 75, 120 (Lakhs-scale) | Yes | Multiply by 100,000 | Confirmed — ready to transform |
| `total sales revenue - billing` | **Yes** — sample values 63, 67.5, 108 (Lakhs-scale) | Yes | Multiply by 100,000 | Confirmed — ready to transform |
| `total funnel / pipeline value created (₹ lakhs)` | Not found in the 20-row sample reviewed | Unknown — not confirmed present | **Do not transform unless confirmed present in the remaining 14 rows** | Blocked — needs full 34-row review |
| `total team booking target achievement (₹ lakhs)` | Not found in the 20-row sample reviewed | Unknown | **Do not transform unless confirmed present** | Blocked — needs full 34-row review |
| `total team billing achievement` | Not found in the 20-row sample reviewed | Unknown | **Do not transform unless confirmed present** | Blocked — needs full 34-row review |
| `total team pipeline coverage (₹ lakhs)` | Not found in the 20-row sample reviewed | Unknown | **Do not transform unless confirmed present** | Blocked — needs full 34-row review |
| `average gross profit margin` | Yes — sample values 6.5, 8, 10, 12 | **No — this is a percentage/ratio, not money** | Do not transform | Confirmed non-money — excluded |
| `payment collections within due dates & credit days reduction` | Yes — sample value 0.9 | **No — this is a ratio/percentage** | Do not transform | Confirmed non-money — excluded |
| `customer retention rate` | Yes — sample value 0.9 | **No — percentage** | Do not transform | Confirmed non-money — excluded |
| `qualified leads generation` | Yes — sample values 20, 30 | **No — this is a count of leads, not a money amount** | Do not transform | Confirmed non-money — excluded |
| `new customers` / `new customers or upsell closure` | Yes — sample values 5, 8 | **No — count** | Do not transform | Confirmed non-money — excluded |
| `non-obligatory proof of concept (poc)` | Yes — sample values 4, 10 | **No — count** | Do not transform | Confirmed non-money — excluded |
| `pipeline` (as a standalone sub-key, distinct from the funnel-value label above) | Yes — sample value 2 | **No — this looks like a count/stage indicator, not a money value, given the small integer scale; needs business confirmation if ambiguous** | Do not transform unless confirmed money | Confirmed non-money by scale — excluded, flagged for double-check |
| `network & security` / `server & storage` / `mssp services` / `cloud security & services` | Yes — sample values 0.10–0.35 | **No — these are weights/percentages (focus-area allocation), not money** | Do not transform | Confirmed non-money — excluded |
| `forecast accuracy` | Yes — sample value 0.9 | **No — percentage** | Do not transform | Confirmed non-money — excluded |
| `certification and product training` | Yes — sample value 2 | **No — count** | Do not transform | Confirmed non-money — excluded |

**Only transform labels confirmed present and confirmed money on UAT.** The 14 unreviewed
`KRA.target` rows (34 total minus the 20 sampled) must be reviewed before this table is treated as
final — it's possible the 4 missing labels appear later in the set, or that other money labels not
in dev's original 6-label list exist on UAT and were never anticipated.

---

## 8. Revised UAT Migration Strategy

UAT migration cannot reuse dev's Release 1/Release 2 SQL verbatim. It must use UAT-specific
transformation logic, structured as:

- **Apply the same schema type changes** as Release 1 and Release 2 (`Float`/`Double` →
  `Decimal(18,2)`/`Decimal(10,4)`) to every in-scope column — the type change itself is safe and
  identical regardless of the unit-mismatch finding, since it doesn't alter values on its own.
- **Apply `× 100,000` only to fields confirmed Lakhs-scale on UAT**: `CrmLead.expectedValue`,
  `SalesFunnel.dealValueLakhs`, `SalesFunnel.billingValueLakhs`, plus Release 1's fields (all
  currently empty on UAT, so technically moot, but should still multiply if rows ever appear
  before migration, consistent with dev's own logic for those fields).
- **Apply type-conversion-only (no multiply) to fields confirmed already-INR on UAT**:
  `Payment.amountLakhs`, `Collection.invoiceValueLakhs`/`amountWithoutGstLakhs`/
  `amountReceivedLakhs`, `OrderAdvance.amountLakhs`.
- **Apply KRA free-text transforms only to the 2 UAT-confirmed money labels** (`total sales
  revenue - booking`/`billing`) — not dev's full 6-label list — until the remaining 14
  `KRA.target` rows are reviewed.
- **Do not transform the empty structured KRA template rows** (`kra_template_item`) — no-op,
  nothing to transform.
- **Leave `CrmOpportunity.value`/`dealValueExTax`/`netProfitLakhs` blocked** until the 1 negative
  row and the all-zero sample ambiguity are resolved by a business-side decision.

---

## 9. UAT Migration Approval Status

| Decision | Status | Notes |
| -------- | ------ | ----- |
| UAT schema type conversion (Float/Text → Decimal, all in-scope columns) | **Approved in principle** | Type-only change, safe regardless of unit finding; still gated by overall migration approval below |
| Payment/Collection/OrderAdvance transform adjustment (type-only, no multiply) | **Decision made, pending business sign-off** | Technical evidence is strong (4 fields, 311 rows, consistent scale); needs a Finance/business owner to confirm before SQL is written |
| Sales pipeline transform — `CrmLead`/`SalesFunnel` (×100,000) | **Decision made, ready** | Consistent with dev's original assumption, no ambiguity found |
| Sales pipeline transform — `CrmOpportunity` (×100,000) | **Blocked** | 1 negative row + 2 all-zero fields need business review before any transform runs |
| KRA free-text transform (2 confirmed labels only) | **Partially blocked** | 2 labels ready; full 34-row review needed before the other 4 dev-documented labels can be confirmed present/absent on UAT |
| UAT migration permission (overall) | **Blocked** | Remains blocked until every row above reaches a non-blocked status |

---

## 10. Final Recommendation

**Do not run UAT migration yet.** The schema-level work is well understood and low-risk; the
risk is entirely in the per-field unit/label classification, and three areas are still open:
the `Payment`/`Collection`/`OrderAdvance` unit finding needs business sign-off (not because the
evidence is weak, but because it's a business-impact decision), `CrmOpportunity`'s 3 fields need
manual review of the 1 negative value and the all-zero ambiguity, and the full 34-row
`KRA.target` set needs review before the KRA free-text label list is finalized.

**Next step:** confirm the ambiguous fields and labels above (business/source-data review for
Payment/Collection/OrderAdvance and CrmOpportunity; a full read-only re-scan of all 34
`KRA.target` rows for the label question) — then, only after that confirmation, generate a
UAT-specific migration SQL/script that mirrors dev's two-phase pattern (`UPDATE` while still
Float, then `ALTER TABLE ... MODIFY` to Decimal) but with the field-specific actions in §3 above
substituted for dev's blanket "multiply everything" approach. That SQL generation is a future
step, not part of this one.
