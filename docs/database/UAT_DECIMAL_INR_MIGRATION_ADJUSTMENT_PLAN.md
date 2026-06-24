# UAT Decimal / INR Migration Adjustment Plan

> **Step 4C (2026-06-24), closed out by Step 4D (2026-06-24).** This is a planning/decision
> document only — no UAT database was modified, no migration was run, no schema/migration files
> were created, and no API/UI code changed in either step. Step 4C's facts came from Step 4B's
> 20-row sample; Step 4D closes the remaining blockers using a full-population follow-up query
> (all 49 `CrmOpportunity` rows, all 34 `KRA.target` rows) run by an operator with confirmed UAT
> SSH/MySQL access and relayed back sanitized (no credentials shared), plus an explicit business
> sign-off captured for the Payment/Collection/OrderAdvance unit decision.

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
  documented 6-label set 1:1 in a 20-row sample — a hardcoded label-matching transform (dev used
  a guarded Node script, `prisma/transform-kra-target-money.mjs`, since deleted after use) needed
  re-verification against the full 34-row set before reuse.
- **UAT therefore needed its own, field-specific transform decision** — not a blind re-run of
  dev's SQL. This document is that decision matrix. **It remains a plan, not an execution** — no
  SQL is written or run here; that's a later, explicitly-instructed step.

**Step 4D outcome (resolved in this update):** every blocker below has closed. Business
sign-off was obtained for the Payment/Collection/OrderAdvance unit decision; a full-population
review of all 49 `CrmOpportunity` rows and all 34 `KRA.target` rows resolved the remaining
ambiguity. See §9's permission ledger — **UAT migration SQL generation permission: Approved.**

---

## 2. UAT Pre-Check Findings Summary

(Facts below are carried forward from Step 4B's real read-only run, with Step 4D's full-population
follow-up noted where it changes the picture.)

| Fact | Value |
| ---- | ----- |
| UAT DB name | `u686730471_Caveo_UAT` |
| MariaDB version | `11.8.6-MariaDB-log` |
| `_prisma_migrations` row count | 19 |
| Migration gap | Missing exactly 3: `add_soft_delete_fields_phase_a`, `decimal_release1_lakhs_to_inr`, `decimal_release2_combined_inr_canonical` |
| Schema status | Every in-scope Release 1/2 column still `double`/`text` — no drift, clean pre-migration state |
| Row counts | Match Session 9's documented estimates exactly (`Payment` 26, `Collection` 141, `OrderAdvance` 3, `CrmLead` 280, `CrmOpportunity` 49, `SalesFunnel` 100, `KRA` 34; `Expense`/`EmployeeAdvance`/`TravelClaim`/`employee_target`/`team_target`/`Voucher`/`Ledger`/`FinAccount` all 0) |
| Unit mismatch finding | `Payment`/`Collection`/`OrderAdvance` sample at INR-scale (max values 342K–7.98M), not Lakhs-scale; `CrmLead`/`SalesFunnel` sample at plausible Lakhs-scale (max ≤120). **Resolved in Step 4D:** business sign-off confirms Payment/Collection/OrderAdvance are already INR; full 49-row `CrmOpportunity` review confirms `value` is Lakhs-scale (1 negative row is a data-quality artifact, not a unit signal) and `dealValueExTax`/`netProfitLakhs` are uniformly 0 across every row (not just the sample) |
| KRA label mismatch finding | Only 2 of dev's 6 documented confirmed-money `KRA.target` labels appeared in the 20-row sample reviewed in Step 4B. **Resolved in Step 4D:** a full 34-row review confirms all 6 dev-documented labels are present somewhere in the set — the missing 4 simply appeared in rows 58–71, outside the original 20-row sample |
| Structured KRA table finding | `kra_template_item`, `kra_metric`, `kra_template` all have **0 rows on UAT** — the structured engine dev's Release 2/Step 3U-5 fix depends on doesn't exist on UAT at all; real UAT KRA scoring runs entirely through legacy free-text `KRA.target` (`employee_target`/`team_target` both confirmed 0 rows again in Step 4D) |

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
| Release 1 | TravelClaim | amountRupees | Unknown — 0 rows on UAT | INR (already INR by design) | No-op (type conversion only) | Empty table; even if populated, dev's own migration SQL never multiplies this field | Ready |
| Release 1 | TravelClaim | ratePerKm | Unknown — 0 rows on UAT | INR-per-km (already actual rate) | No-op (type conversion only) | Empty table; dev's migration never multiplies this field either | Ready |
| Release 2 | Payment | amountLakhs | **Confirmed INR-scale** (sample max 1,000,000) | INR | **Type conversion only — do NOT multiply** | Business-confirmed already INR (see §5) | **Approved — see §5** |
| Release 2 | Collection | invoiceValueLakhs | **Confirmed INR-scale** (sample max 7,979,986) | INR | **Type conversion only — do NOT multiply** | Business-confirmed already INR | **Approved — see §5** |
| Release 2 | Collection | amountWithoutGstLakhs | **Confirmed INR-scale** (sample max 6,762,700) | INR | **Type conversion only — do NOT multiply** | Business-confirmed already INR | **Approved — see §5** |
| Release 2 | Collection | amountReceivedLakhs | **Confirmed INR-scale** (sample max 7,788,000) | INR | **Type conversion only — do NOT multiply** | Business-confirmed already INR | **Approved — see §5** |
| Release 2 | OrderAdvance | amountLakhs | **Confirmed INR-scale** (sample max 341,964, 3 rows) | INR | **Type conversion only — do NOT multiply** | Business-confirmed already INR; consistent with Payment/Collection and the `applyAdvance()` lockstep relationship | **Approved — see §5** |
| Release 2 | CrmLead | expectedValue | **Confirmed Lakhs-scale** (sample max 120) | INR | **Multiply by 100,000** | Plausible Lakhs deal-size range (≤₹1.2 Cr) | **Approved — see §6** |
| Release 2 | CrmOpportunity | value | **Confirmed Lakhs-scale** (full 49-row review: max 120, 47 positive rows in plausible Lakhs range, 1 zero for a LOST deal, 1 zero for an unset FOLLOW_UP deal, 1 negative -0.1 flagged as a likely data-entry artifact) | INR | **Multiply by 100,000** | Full-population review confirms Lakhs-scale; the negative row is a separate data-quality issue, not a unit ambiguity (see §6) | **Approved — see §6** |
| Release 2 | CrmOpportunity | dealValueExTax | **Confirmed: every one of the 49 rows is exactly 0** | INR | Multiply by 100,000 (mathematically moot — 0 × 100,000 = 0 — but applied for schema/logic consistency with `value`) | Full-population review (not just a sample) confirms this column holds no real data on UAT at all — no unit-classification risk because there is nothing to misclassify | **Approved — see §6** |
| Release 2 | CrmOpportunity | netProfitLakhs | **Confirmed: every one of the 49 rows is exactly 0** | INR | Multiply by 100,000 (mathematically moot, same reasoning) | Same — fully confirmed empty-of-real-data | **Approved — see §6** |
| Release 2 | SalesFunnel | dealValueLakhs | **Confirmed Lakhs-scale** (sample max ~43) | INR | **Multiply by 100,000** | Plausible Lakhs deal-size range | **Approved — see §6** |
| Release 2 | SalesFunnel | billingValueLakhs | **Confirmed Lakhs-scale** (sample max ~51) | INR | **Multiply by 100,000** | Plausible Lakhs deal-size range | **Approved — see §6** |
| KRA / Sales targets | KRATemplateItem | AMOUNT rows (expectedTarget/stretchTarget/minimumTarget) | N/A — table has 0 rows on UAT | N/A | **No-op — table is empty** | `kra_template_item` has 0 rows on UAT; nothing to transform | **Approved — see §7** |
| KRA / Sales targets | KRA | target (confirmed-money labels) | **All 6 of dev's documented money labels confirmed present on UAT** (full 34-row review) | INR (sub-values only, free-text format unchanged) | **Transform all 6 confirmed labels** | Full 34-row review found the 4 previously-missing labels in rows 58–71 (outside the original 20-row sample) | **Approved — see §7** |
| KRA / Sales targets | EmployeeTarget | targetJson (confirmed-money labels) | N/A — table has 0 rows on UAT (re-confirmed in Step 4D) | N/A | **No-op — table is empty** | `employee_target` has 0 rows on UAT | **Approved — see §7** |
| KRA / Sales targets | TeamTarget | targetJson (if rows exist) | N/A — table has 0 rows on UAT (re-confirmed in Step 4D) | N/A | **No-op — table is empty** | `team_target` has 0 rows on UAT, same as dev | **Approved — see §7** |

---

## 4. UAT Unit Classification Rule

- If UAT values are already actual INR, **do not multiply** — convert type only.
- If UAT values are clearly Lakhs-scale, **multiply by 100,000**.
- If values are ambiguous (e.g. an all-zero or mixed-sign sample), **block and require either a
  full-population review or a business/source-data confirmation** before deciding — do not infer
  the unit from the field name alone, and do not assume a field matches its sibling fields'
  convention just because they're in the same model.
- Dev's transform logic (which fields get multiplied, which KRA labels are money) is a starting
  hypothesis for UAT, never an assumption to be reused blindly — every field and label in this
  document was independently re-checked against UAT's own data before being marked Approved.

---

## 5. Payment / Collection / OrderAdvance UAT Unit Decision

| Model | Field | Evidence | Business Decision | Migration Action | Status |
| ----- | ----- | -------- | ----------------- | ----------------- | ------ |
| Payment | amountLakhs | Sample range 0.01–1,000,000 across 26 rows, 0 nulls, 0 negatives. A value of 1,000,000 read as "Lakhs" would represent ₹1,000 Crore for a single payment — implausible for this business. | **Confirmed by business sign-off (2026-06-24): already actual ₹ INR** | Type conversion only — no multiply | **Approved** |
| Collection | invoiceValueLakhs | Sample range 21.3344–7,979,986 across 141 rows. The high end (≈₹798 Cr for one invoice as "Lakhs") is implausible. | **Confirmed by business sign-off: already actual ₹ INR** | Type conversion only — no multiply | **Approved** |
| Collection | amountWithoutGstLakhs | Sample range 2.5424–6,762,700, GST-derived sub-amount of the same invoice value. | **Confirmed by business sign-off: already actual ₹ INR** | Type conversion only — no multiply | **Approved** |
| Collection | amountReceivedLakhs | Sample range 0–7,788,000, same reasoning. | **Confirmed by business sign-off: already actual ₹ INR** | Type conversion only — no multiply | **Approved** |
| OrderAdvance | amountLakhs | Sample range 37,967–341,964 across only 3 rows; feeds directly into `Payment` via `applyAdvance()`, so it must share `Payment`'s unit. | **Confirmed by business sign-off: already actual ₹ INR** | Type conversion only — no multiply | **Approved** |

**Sign-off record:** confirmed by the project owner (Vijesh Vijayan) on 2026-06-24, in direct
response to this finding — "Confirm — already INR." This was a deliberate business decision, not
a default, given the project-wide "money is stored in ₹ Lakhs" convention these 4 fields were
originally assumed to follow (`CLAUDE.md` rule 5). Recommended follow-up (outside this migration's
scope): if production carries the same characteristic for these fields, the same sign-off
question should be asked again once production access exists — do not assume the answer
transfers automatically.

---

## 6. Sales Pipeline UAT Unit Decision

| Model | Field | Evidence | Decision | Status |
| ----- | ----- | -------- | -------- | ------ |
| CrmLead | expectedValue | Sample range 0–120 across 280 rows, 0 nulls, 0 negatives — plausible Lakhs-scale deal-value range (≤₹1.2 Cr). | **Multiply by 100,000** | **Approved** |
| SalesFunnel | dealValueLakhs | Sample range 0.002733–43.032004 across 100 rows — plausible Lakhs-scale. | **Multiply by 100,000** | **Approved** |
| SalesFunnel | billingValueLakhs | Sample range 0–50.77776472 across 100 rows — plausible Lakhs-scale, consistent with `dealValueLakhs`. | **Multiply by 100,000** | **Approved** |
| CrmOpportunity | value | **Full 49-row population reviewed** (not just a sample): 47 rows are positive and Lakhs-plausible (real deal names/companies — e.g. id 31 "Dell Server & Storage" at Thangamayil Jewellery Limited = 120, id 9 "Firewall" at CPF india = 59.1244); 2 rows are exactly 0 (id 25, stage LOST — plausible, a lost deal can legitimately have no value; id 41, stage FOLLOW_UP, "PAM Solution" — plausibly just not yet quoted); 1 row is negative (id 42, -0.1, stage FOLLOW_UP, lead title generically "IT" at "CPF foods India private limited"). | **Multiply by 100,000.** The negative row is judged a **likely data-entry artifact**, not a credit/adjustment or a unit signal: -0.1 Lakh (-₹10,000) on a generically-titled lead doesn't match the pattern of every other row (specific product/deal names, larger magnitudes); a real credit/loss adjustment would more plausibly show a negative `dealValueExTax`/`netProfitLakhs` instead, which it doesn't (both are 0 on this row). **Recommend a separate, non-blocking data-quality follow-up to correct or confirm row id 42 with the sales team — this does not block the migration's unit decision.** | **Approved (with a flagged data-quality note, not a unit blocker)** |
| CrmOpportunity | dealValueExTax | **Full 49-row population reviewed:** every single row is exactly 0 — confirmed, not a sampling artifact. | **Multiply by 100,000** (mathematically moot today since 0 × 100,000 = 0; applied for consistency and to handle any future populated rows correctly without a second migration) | **Approved** |
| CrmOpportunity | netProfitLakhs | **Full 49-row population reviewed:** every single row is exactly 0 — confirmed, not a sampling artifact. | **Multiply by 100,000** (same reasoning) | **Approved** |

The full-population review is what unblocks `CrmOpportunity` — Step 4C's 20-row-equivalent
sample-based caution ("could be ambiguous") is resolved once every row is known, not just a
subset: there is no remaining unit ambiguity, only a single flagged data-quality item (row 42)
that is explicitly *not* a migration blocker.

---

## 7. UAT KRA Transform Decision

The structured KRA template tables (`kra_template_item`, `kra_metric`, `kra_template`) all have
**0 rows on UAT** (confirmed again in Step 4D — `employee_target`/`team_target` also re-confirmed
at 0 rows). **`KRATemplateItem`'s transformation is a no-op for UAT as long as the row count
remains 0.** If rows are ever added to these tables on UAT before migration, this decision must
be revisited with a fresh read-only check.

UAT's real KRA money data lives entirely in the legacy free-text `KRA.target` field. **A full
read of all 34 rows (not just the 20 sampled in Step 4B) confirms all 6 of dev's documented money
labels are genuinely present on UAT** — the 4 that didn't appear in the original 20-row sample
turned out to live in rows 58–71, a part of the table the Step 4B sample didn't reach (rows 58–62
are a 5th repetition of the same "Sales Revenue targets"-style category cycle seen in rows
38–57; rows 63–71 introduce 9 new categories not seen in the sample at all, including the 4
missing labels).

### UAT KRA Free-Text Money Label Allowlist

| Label | Appears In `KRA.target`? | Appears In `EmployeeTarget.targetJson`? | Money-Denominated? | Transform by ×100,000? | Notes |
| ----- | ------------------------- | ----------------------------------------- | ------------------- | ------------------------- | ----- |
| `total sales revenue - booking` | **Yes** — rows 38, 43, 48, 53, 58 (values 70, 120, 120, 75, 150) | No — table is empty | **Yes** | **Yes** | Lakhs-scale revenue targets, plausible |
| `total sales revenue - billing` | **Yes** — rows 38, 43, 48, 53, 58 (values 63, 108, 108, 67.5, 135) | No — table is empty | **Yes** | **Yes** | Lakhs-scale, consistent with booking |
| `total funnel / pipeline value created (₹ lakhs)` | **Yes** — row 65 (value 75) | No — table is empty | **Yes** | **Yes** | Found outside the original 20-row sample |
| `total team booking target achievement (₹ lakhs)` | **Yes** — row 68 (value 500) | No — table is empty | **Yes** | **Yes** | Team-level target, ₹500L = ₹5 Cr, plausible |
| `total team billing achievement` | **Yes** — row 68 (value 450) | No — table is empty | **Yes** | **Yes** | Same row as booking achievement above |
| `total team pipeline coverage (₹ lakhs)` | **Yes** — row 71 (value 1500) | No — table is empty | **Yes** | **Yes** | ₹1500L = ₹15 Cr team pipeline figure, plausible |
| `average gross profit margin` / `gross profit margin (%)` | Yes — multiple rows, values 6.5–15, and 12 | **No — percentage** | No | Confirmed non-money — excluded |
| `payment collections within due dates & credit days reduction` | Yes — value 0.9 throughout | **No — ratio/percentage** | No | Confirmed non-money — excluded |
| `customer retention rate` | Yes — value 0.9 | **No — percentage** | No | Confirmed non-money — excluded |
| `qualified leads generation` / `qualified leads generated` | Yes — values 20, 25, 30 | **No — count** | No | Confirmed non-money — excluded |
| `new customers` / `new customers or upsell closure` | Yes — values 5, 8, 10 | **No — count** | No | Confirmed non-money — excluded |
| `non-obligatory proof of concept (poc)` | Yes — values 4, 10 | **No — count** | No | Confirmed non-money — excluded |
| `pipeline` (standalone count sub-key, distinct from the funnel-value label) | Yes — value 2 | **No — count/stage indicator** | No | Confirmed non-money by scale — excluded |
| `network & security` / `server & storage` / `mssp services` / `cloud security & services` | Yes — values 0.10–0.35 | **No — focus-area weights/percentages** | No | Confirmed non-money — excluded |
| `forecast accuracy` | Yes — value 0.9 | **No — percentage** | No | Confirmed non-money — excluded |
| `certification and product training` | Yes — value 2 | **No — count** | No | Confirmed non-money — excluded |
| `crm data accuracy & timely lead updates` | Yes — row 67, value 0.9 | **No — percentage** | No | Confirmed non-money — excluded |
| `total outbound calls made` | Yes — row 63, value 180 | **No — count** | No | Confirmed non-money — excluded |
| `meaningful connects achieved` | Yes — row 63, value 50 | **No — count** | No | Confirmed non-money — excluded |
| `appointments fixed for bdm / sales closure team` | Yes — row 64, value 25 | **No — count** | No | Confirmed non-money — excluded |
| `number of funnel opportunities created` | Yes — row 65, value 10 | **No — count** | No | Confirmed non-money — excluded |
| `customer webinars organised` | Yes — row 66, value 2 | **No — count** | No | Confirmed non-money — excluded |
| `blitz days conducted` | Yes — row 66, value 3 | **No — count** | No | Confirmed non-money — excluded |
| `collections efficiency (% within due dates)` | Yes — row 68, value 0.9 | **No — percentage** | No | Confirmed non-money — excluded |
| `new logos / strategic accounts acquired by team` | Yes — row 69, value 10 | **No — count** | No | Confirmed non-money — excluded |
| `new projects & strategic deals initiated` | Yes — row 69, value 15 | **No — count** | No | Confirmed non-money — excluded |
| `focus area revenue mix achievement (n&s, s&s, mssp, cloud)` | Yes — row 69, value 0.85 | **No — percentage** | No | Confirmed non-money — excluded |
| `team aggregate kra achievement rate` | Yes — row 70, value 0.9 | **No — percentage** | No | Confirmed non-money — excluded |
| `sales talent retention (attrition below threshold)` | Yes — row 70, value 0.9 | **No — percentage** | No | Confirmed non-money — excluded |
| `team training & certification completion rate` | Yes — row 70, value 0.9 | **No — percentage** | No | Confirmed non-money — excluded |
| `average deal win rate` | Yes — row 71, value 0.3 | **No — percentage** | No | Confirmed non-money — excluded |

**Result: the full original 6-label allowlist from dev is confirmed valid for UAT as-is — no
labels need to be added or removed.** Every label found in the full 34-row scan that wasn't in
dev's original 6 was independently confirmed non-money (a count, percentage, ratio, or weight),
so no new money labels were discovered either. This is the final, ready-to-use allowlist for the
UAT `KRA.target` transform.

---

## 8. Revised UAT Migration Strategy

UAT migration cannot reuse dev's Release 1/Release 2 SQL verbatim, but every field-level decision
needed to write UAT-specific SQL is now closed:

- **Apply the same schema type changes** as Release 1 and Release 2 (`Float`/`Double` →
  `Decimal(18,2)`/`Decimal(10,4)`) to every in-scope column — identical to dev's migrations,
  unaffected by the unit-mismatch finding.
- **Apply `× 100,000`** to: `CrmLead.expectedValue`, `SalesFunnel.dealValueLakhs`/
  `billingValueLakhs`, `CrmOpportunity.value`/`dealValueExTax`/`netProfitLakhs`, plus Release 1's
  fields (all currently empty on UAT, multiply for consistency with dev's logic in case rows
  appear before migration).
- **Apply type-conversion-only (no multiply)** to: `Payment.amountLakhs`,
  `Collection.invoiceValueLakhs`/`amountWithoutGstLakhs`/`amountReceivedLakhs`,
  `OrderAdvance.amountLakhs` — per the business sign-off in §5.
- **Apply the KRA free-text transform using the full 6-label allowlist** (§7) — confirmed
  identical to dev's original list, no UAT-specific label changes needed.
- **Do not transform the empty structured KRA template rows** (`kra_template_item`,
  `kra_metric`, `kra_template`, `employee_target`, `team_target`) — no-op, nothing to transform.
- **Flag `CrmOpportunity` row id 42 for a separate, non-blocking data-quality follow-up** with
  the sales team (a -0.1 Lakh value on a generically-titled "IT" lead) — not part of the
  migration itself.

---

## 9. UAT Migration Permission Ledger

| Decision | Status | Notes |
| -------- | ------ | ----- |
| Release 1 empty-table type conversions (`Expense`/`EmployeeAdvance`/`TravelClaim`) | **Approved** | 0 rows on UAT; type change only, no data risk |
| Payment/Collection/OrderAdvance transform adjustment (type-only, no multiply) | **Approved** | Business sign-off received 2026-06-24 |
| CrmLead transform (×100,000) | **Approved** | Plausible Lakhs-scale, no ambiguity |
| CrmOpportunity transform (×100,000, all 3 fields) | **Approved** | Full 49-row review resolved the prior ambiguity; row id 42 flagged as a separate data-quality note, not a unit blocker |
| SalesFunnel transform (×100,000) | **Approved** | Plausible Lakhs-scale, no ambiguity |
| KRA.target transform allowlist (6 labels) | **Approved** | Full 34-row review confirms all 6 dev labels present and money-confirmed on UAT; no UAT-specific label changes needed |
| EmployeeTarget transform allowlist | **Approved (no-op)** | 0 rows on UAT, re-confirmed |
| TeamTarget no-op | **Approved (no-op)** | 0 rows on UAT, re-confirmed |
| **UAT migration SQL generation permission** | **Approved** | Every decision above has closed — UAT-specific migration SQL may now be drafted in a future, explicitly-instructed step |

---

## 10. Final Recommendation

**UAT migration SQL generation is now approved — but UAT migration execution is a separate,
still-future step that requires its own explicit instruction.** This document only unblocks
*drafting* the UAT-specific migration SQL (per §8's strategy); it does not authorize running it.

Before actual UAT migration execution, the operational pre-checks Step 4B left open are still
required: confirming the commit/code currently deployed on the UAT server, taking and verifying a
restorable UAT backup, confirming at least one Manager-tier and one Employee-tier test login
work, and deciding whether a write-freeze is needed during the migration window.

**Next step:** generate the UAT-specific migration SQL (mirroring dev's two-phase `UPDATE` →
`ALTER TABLE ... MODIFY` pattern, substituting the field-specific actions from §3/§8 for dev's
blanket "multiply everything" approach) — as its own explicitly-instructed step, not part of this
one — followed by the remaining operational pre-checks, before any UAT migration actually runs.
