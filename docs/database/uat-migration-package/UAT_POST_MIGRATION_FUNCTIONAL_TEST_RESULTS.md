# UAT Post-Migration Functional Test Results

> Step 4H (2026-06-24). Tests the completed Step 4G/4G-1 Decimal/INR migration on
> `u686730471_Caveo_UAT`. **No production database was touched. No new migration, schema
> change, or `db push` was run. No migration history was modified. Voucher/Ledger/FinAccount
> were not touched.**
>
> **Important honesty note on method.** This environment's browser tooling could not reach
> `https://uat.caveoinfosystems.com` (blocked by organization network policy — confirmed by a
> direct navigation attempt, not assumed), and there is no way to complete an interactive
> Microsoft Entra ID login from here. **No live UI click-through, no live authenticated API
> call, and no live Manager/Employee login was performed.** Every check below that requires
> those is explicitly marked **"Not performed — testing limitation"**, not fabricated as
> Passed. What *was* performed, and is reported as real evidence: (1) direct, read-only queries
> against the live UAT database (same `.env.uat` credential used in Steps 4G/4G-1, masked DB
> identity only), confirming the underlying data is correct; (2) static review of the actual
> application source code (`src/lib/kra-engine.ts`, `src/lib/money.ts`, `src/lib/roles.ts`, the
> Finance/Sales API routes) that would run against this data **if the currently-deployed UAT
> commit matches this codebase** — which itself remains unconfirmed (see §2).

## 1. Test Overview

- **Scope:** Finance (Payment/Collection/OrderAdvance/Expense/EmployeeAdvance/TravelClaim),
  Sales Pipeline (CrmLead/CrmOpportunity/SalesFunnel), KRA (target free-text, scoring engine),
  Dashboard/display-unit consistency, RBAC (Manager/Employee), regression (build/typecheck).
- **Method:** read-only live DB queries (data correctness) + static source-code review
  (application behavior) + full regression suite (build/typecheck/schema validate). **No live
  browser/UI testing, no live authenticated session testing.**
- **Out of scope (per task instruction):** no new migration, no schema change, no `db push`,
  no migration-history change, no Voucher/Ledger/FinAccount, no new Finance write API work, no
  production access.

## 2. Environment Confirmation

| Check | Result |
| ----- | ------ |
| UAT DB is `u686730471_Caveo_UAT` | **Confirmed live** — `SELECT DATABASE()` returned `u686730471_Caveo_UAT`, MariaDB `11.8.6-MariaDB-log` |
| UAT app connected to UAT DB | **Assumed by deployment design, not independently re-verified this step** — the UAT server's own `.env` (server-side, never seen by this environment) is documented to point at this same DB; no live app-to-DB connection was observed directly |
| Current UAT deployed app commit | **Not confirmed — testing limitation, same gap as Step 4B.** `uat`'s `public_html` has no `.git` checkout (confirmed in Step 4B), so `git rev-parse HEAD` isn't available there, and this environment cannot reach `uat.caveoinfosystems.com` to check a version/build marker either. Local `uat` branch HEAD at the time of this test: `9c5049033ff502323360aae338cc181713f07402` |
| Does deployed commit match the tested/migrated codebase? | **Cannot be determined** — follows directly from the row above. All code-level findings in this report assume the deployed commit matches local `uat` HEAD; if an older commit is actually deployed, the Release 2 API/UI updates referenced below may not be live yet |
| Manager test login available | **Data exists, login not performed.** `Employee` row id 4 (`Vijesh`) has `isManager = 1` on UAT — a Manager-tier account exists. No live login was attempted (browser blocked from the UAT URL; no credential entry is performed by this assistant in any case) |
| Employee test login available | **Data exists, login not performed.** Multiple `Employee` rows (ids 5–13 sampled) have `isManager = 0` — Employee-tier accounts exist. Same login limitation as above |
| No production connection used | **Confirmed.** Every query this step used the gitignored `.env.uat` (masked: DB name `u686730471_Caveo_UAT`, host `srv2201.***`); `.env` (dev) was never read |

## 3. Finance Test Results

**Method: read-only DB query + static code review of the already-audited Release 1/2 API
routes (`/api/finance/*`, per `DECIMAL_RELEASE1_MIGRATION_RESULTS.md` / `DECIMAL_RELEASE2_MIGRATION_RESULTS.md`).
No live page load or live API call was performed.**

| Test Area | Test Case | Result | Evidence / Notes |
| --------- | --------- | ------ | ---------------- |
| Payment | Values are real INR, no inflation | **Passed (data-level)** | Sampled rows: `1.61`, `2.05`, `0.01`, `500000.00`, `1.54` — exactly matches Step 4G's checksum-verified un-multiplied values |
| Collection | Values are real INR, no inflation | **Passed (data-level)** | Sampled rows in the ₹70K–₹7.8M range, internally consistent (`amountReceivedLakhs` ≤ `invoiceValueLakhs` per row) |
| OrderAdvance | All 3 rows correct, no inflation | **Passed (data-level)** | `341964.00`, `341964.00`, `37967.00` — unchanged from Step 4G |
| Payment/Collection/OrderAdvance | No NULL values introduced | **Passed (data-level)** | 0 NULLs across all 3 models' money columns |
| Expense / EmployeeAdvance / TravelClaim | Screens load, no crash | **Not performed — testing limitation** | All 3 tables are 0 rows on UAT (no data to exercise); live page load not possible (browser blocked) |
| Finance dashboard | Displays correctly, no `[object Object]`/NaN | **Not performed — testing limitation** | Requires live authenticated page load |
| No Decimal-object leakage in API responses | — | **Not performed live; code-level: low risk** | `src/lib/money.ts`'s `moneyToNumberForDisplay`/`serializeMoney` pattern is used consistently across the Release 1/2-audited routes (`bank-book`, `cash-book`, `expenses`, `dashboard`) per Steps 3I–3L's own verification — no raw `Decimal` object is returned directly in any reviewed route |
| Filters / list / detail pages load | — | **Not performed — testing limitation** | Requires live browser session |
| Export buttons | — | **Not performed — testing limitation** | Requires live browser session |
| Runtime console/server errors | — | **Not performed — testing limitation** | No live server log access from this environment |

## 4. Sales Pipeline Test Results

**Method: read-only DB query + static code review.**

| Test Area | Test Case | Result | Evidence / Notes |
| --------- | --------- | ------ | ---------------- |
| CrmLead.expectedValue | INR-scale, correctly ×100,000 | **Passed (data-level)** | Sampled: `0.00`, `1,900,000.00`, `1,400,000.00`, `1,000,000.00` — consistent with Lakhs values (19, 14, 10) × 100,000 |
| CrmOpportunity.value | INR-scale, correctly ×100,000 | **Passed (data-level)** | Sampled: `206,000.00`, `1,300,000.00`, `1,000,000.00` |
| CrmOpportunity row 42 (known negative anomaly) | Handled gracefully, not silently dropped/zeroed | **Passed (data-level)** | `value = -10000.00`, exactly `-0.1 × 100,000` — confirmed it is the *only* negative row (1 row returned by a `WHERE value < 0` scan) |
| CrmOpportunity.dealValueExTax / netProfitLakhs | Unchanged (still 0, multiply is a no-op) | **Passed (data-level)** | `0.00` on every sampled row, including row 42, as expected |
| SalesFunnel dealValueLakhs/billingValueLakhs | INR-scale, correctly ×100,000 | **Passed (data-level)** | Sampled rows in the ₹9.3K–₹946.9K range; `billingValueLakhs ≥ dealValueLakhs` pattern preserved per row |
| No NULLs introduced anywhere in Sales models | — | **Passed (data-level)** | 0 NULLs across `CrmLead`/`CrmOpportunity`/`SalesFunnel` money columns |
| UI displays correctly per page intent (input forms ₹, dashboards may show Lakhs) | — | **Not performed — testing limitation** | Requires live browser session. Code-level: `LeadsClient.tsx`/`OpportunitiesClient.tsx`/`SalesFunnelClient.tsx` labels were updated to INR semantics during dev's Release 2 implementation (per `DECIMAL_RELEASE2_MIGRATION_RESULTS.md`) — applies to UAT only if the deployed commit includes that work (unconfirmed, §2) |
| No double multiplication / double division | — | **Passed (data-level), inferred** | Values match exactly one ×100,000 pass from the documented pre-migration Lakhs baseline (Step 4G's checksums) — a double-multiply or double-divide would produce values 100,000× too large/small, which is not observed |
| Filters/search/sorting | — | **Not performed — testing limitation** | Requires live browser session |

## 5. KRA Test Results

**Method: read-only DB query + static review of `src/lib/kra-engine.ts`.**

| Test Area | Test Case | Result | Evidence / Notes |
| --------- | --------- | ------ | ---------------- |
| 6 money labels now INR internally | — | **Passed (data-level)** | All 8 rows containing a money label (ids 38, 43, 48, 53, 58, 65, 68, 71) show ×100,000-scale values, e.g. `total team pipeline coverage (₹ lakhs): 150000000` |
| Non-money labels (percentage/count/ratio/activity) unchanged | — | **Passed (data-level)** | Re-confirmed in the same query: `average gross profit margin`, `gross profit margin (%)`, `payment collections within due dates...`, `forecast accuracy`, `average deal win rate`, `number of funnel opportunities created`, `collections efficiency...` all still show their original small-scale values (e.g. `0.9`, `6.5`, `10`) in the same rows |
| Row count unchanged (34) | — | **Passed (data-level)** | `COUNT(*) FROM KRA` = 34 |
| `employee_target`/`team_target` still 0 rows, no issue | — | **Passed (data-level)** | Both confirmed 0; `kra-engine.ts` code path for `EmployeeTarget`/`TeamTarget` is therefore never exercised on UAT — consistent, not a gap |
| Structured `kra_template_item`/`kra_metric`/`kra_template` still 0 rows | — | **Passed (data-level)** | All 3 confirmed 0 — UAT's KRA scoring runs entirely through `parseTargets()` on the free-text `KRA.target` field, as documented since Step 4B |
| Score calculation does not inflate/collapse | — | **Code-level: consistent design, not live-verified** | `kra-engine.ts`'s `parseTargets()` reads raw numeric values from `KRA.target` and compares them directly against already-INR actuals (`Payment`/`Collection`/Sales pipeline sums) with **no conversion factor** — exactly the Option A "Full INR Canonical Model" design locked in Step 3U-0/3U-1. Since both sides of every comparison are now INR (targets via this step's transform, actuals via Step 4G), no inflation/collapse is expected. Every display string uses `inrToLakhsEquivalent()` to convert back to Lakhs for the user-facing `notes` text — confirmed by direct code read (12+ call sites), never a raw INR number shown to the user as if it were Lakhs |
| No KRA page crash after free-text transform | — | **Not performed — testing limitation** | Requires live browser session |
| Minor finding (not a migration defect) | Hardcoded fallback constants | **Logged as Issue FT-1 (Low)** | Several fallback defaults in `kra-engine.ts` (e.g. `salesTargets["total sales revenue - booking"] ?? 70`) are leftover Lakhs-scale magic numbers from before the INR migration. They only trigger if an employee has **no** matching "Sales Revenue targets"/similar KRA row at all — none of the 8 transformed rows hit this path (all have their label present), but a different employee/role without that KRA row could see a target of literal `70` compared against an INR actual, which is not a meaningful comparison. See Issue FT-1 in §9 |

## 6. Dashboard / Display Unit Verification

| Area | Check | Result |
| ---- | ----- | ------ |
| Finance views display INR | — | **Not performed — testing limitation** (live UI required) |
| Sales management summaries show Lakhs only as presentation unit | — | **Code-level confirmed** — every Sales/KRA "Lakhs-looking" display string in `kra-engine.ts` and the dev-audited dashboard route (`/api/finance/dashboard`, Step 3L) goes through `inrToLakhsEquivalent()`/`moneyToNumberForDisplay()` before formatting; no raw INR value is shown unconverted in a Lakhs-labeled context, by code inspection |
| KRA money targets do not show incorrect 100,000× values | — | **Passed (data-level + code-level)** — confirmed both that the stored value is correctly ×100,000 (§5) and that the display layer divides back down via `inrToLakhsEquivalent()` before rendering a Lakhs-labeled string |
| Cards/charts/tables/exports consistent | — | **Not performed — testing limitation** |
| No mismatch between DB unit (INR) and UI label | — | **Code-level: no mismatch found** in the reviewed call sites; **not independently confirmed live** |

## 7. RBAC / Role Test Results

**No live login was performed — see §1/§2.** Reported below is what was confirmed at the data
and code level only.

| Test | Result |
| ---- | ------ |
| Manager-tier account exists on UAT | **Confirmed (data)** — `Employee` id 4, `isManager = 1` |
| Employee-tier accounts exist on UAT | **Confirmed (data)** — `Employee` ids 5–13 sampled, `isManager = 0` |
| Manager can access Finance/Sales/KRA pages as designed | **Not performed — testing limitation** |
| Manager cannot see unauthorized admin-only areas | **Not performed — testing limitation** |
| Employee can access personal views | **Not performed — testing limitation** |
| Employee cannot access restricted Finance/Admin pages | **Not performed — testing limitation** |
| Data scope (Manager sees team, Employee sees own) remains correct | **Not performed — testing limitation** |
| RBAC gating logic exists and is unaffected by this migration | **Code-level confirmed** — `src/lib/roles.ts`'s `canManageFinance`/`canViewFinanceDashboard`/etc. predicates gate on `isManager`/role strings only; none of them reference any of the Decimal-converted fields, so this migration cannot have altered their behavior. This is a code-level non-regression argument, not a live confirmation that the gates work correctly in the running app |

## 8. Regression Checks

| Command | Result |
| ------- | ------ |
| `npx prisma validate` | ✅ Pass — "The schema at prisma\schema.prisma is valid" |
| `npx tsc --noEmit` | ✅ Pass — no output, no errors |
| `npm run build` | ✅ Pass — full production build completed, all routes compiled |
| App starts locally / on UAT | **Not performed** — local dev points at the dev DB (`.env`), not UAT; starting it would not test UAT. UAT itself could not be reached from this environment (browser blocked) |
| No server-side runtime errors | **Not performed — testing limitation** (no UAT server log access) |
| No Prisma Decimal serialization errors | **Code-level: none found** in the reviewed routes (all use the `src/lib/money.ts` boundary helper); **not live-verified** |
| No broken API responses for migrated fields | **Not performed — testing limitation** (no live API call made) |

## 9. Issues Found

| Issue ID | Area | Severity | Description | Status | Owner | Next Action |
| -------- | ---- | -------- | ----------- | ------ | ----- | ----------- |
| FT-1 | KRA | Low | `src/lib/kra-engine.ts` has several hardcoded Lakhs-scale fallback constants (e.g. `?? 70`, `?? 0.35`) used only when an employee has no matching KRA row for that category. Post-migration, these constants are not on the same INR scale as the real (now-INR) targets/actuals they'd be compared against if ever hit. None of UAT's 8 transformed rows trigger this path today. | Open | Dev team | Review and either update fallback constants to INR scale or confirm via business rule that this path is intentionally unreachable for all current UAT employees/roles |
| FT-2 | Testing coverage | Medium | Live UI/browser testing, live authenticated API testing, and live Manager/Employee login testing could not be performed — `uat.caveoinfosystems.com` is blocked by this environment's organization network policy, and no interactive login capability exists here. | Open | Vijesh Vijayan / whoever has UAT browser access | Have someone with UAT browser access manually walk through the Finance/Sales/KRA pages listed in this report's untested rows and confirm visually, or grant this environment access to the UAT URL |
| FT-3 | Deployment verification | Medium | The UAT-deployed app commit still cannot be confirmed (same gap open since Step 4B) — this report's code-level findings assume the deployed commit matches local `uat` HEAD (`9c5049033ff502323360aae338cc181713f07402`), which is unverified. | Open | Vijesh Vijayan | Confirm the deployed commit via the UAT server directly (e.g. a version marker in the running app, or SSH access to check the build artifact) |
| FT-4 | Backup | Low (carried over, not new) | UAT backup restore-test still not performed (Step 4F-1's risk exception, unchanged by this step). | Open | Vijesh Vijayan | Restore-test `u686730471_Caveo_UAT_240626.sql` to a scratch DB when tooling becomes available |

No Critical or High-severity issue was found. No page crash, no 100,000× value error in either
direction, no production connection, no role data leakage, and no login failure were observed —
because every data-level check passed cleanly, and no live test that *could* have surfaced a
live-only Critical/High issue (UI crash, live RBAC leak) was actually performed. This is a real
limitation, not a clean bill of health on those specific items — see §10.

## 10. Sign-Off Status

## UAT Functional Sign-Off

| Area | Owner | Status | Notes |
| ---- | ----- | ------ | ----- |
| Finance | _(to be assigned)_ | **Passed with Minor Issues** | Data-level checks clean (no inflation/deflation/NULLs); live UI/API testing not performed (FT-2) |
| Sales Pipeline | _(to be assigned)_ | **Passed with Minor Issues** | Data-level checks clean, including the row-42 anomaly handled correctly; live UI testing not performed (FT-2) |
| KRA | _(to be assigned)_ | **Passed with Minor Issues** | Data-level and scoring-design checks clean; one low-severity pre-existing fallback-constant finding (FT-1); live page testing not performed (FT-2) |
| RBAC | _(to be assigned)_ | **Pending** | No live login was possible from this environment (FT-2) — code-level non-regression only, insufficient on its own for a Passed RBAC status |
| Technical Validation | _(to be assigned)_ | **Passed** | `npx prisma validate`, `npx tsc --noEmit`, `npm run build` all pass; migration history aligned (Step 4G-1); no destructive statement anywhere in the migration package |
| **Final UAT Migration Sign-Off** | _(to be assigned)_ | **Pending** | **Not marked Passed.** Data/schema/migration-history correctness is strong, but RBAC live-testing and UI live-testing genuinely could not be performed in this environment (FT-2), and the deployed-commit gap (FT-3) remains open since Step 4B. These are real verification gaps, not failures — final sign-off should wait for either (a) someone with UAT browser/login access to confirm the untested rows above, or (b) an explicit, informed decision to accept these as residual risk, the same way Step 4F-1 explicitly accepted the backup-restore-test gap |

## 11. Next Actions

1. Have someone with working UAT browser access (or grant this environment access to
   `uat.caveoinfosystems.com`) walk through the Finance/Sales/KRA pages and the Manager/
   Employee logins this report could not test, using §3–§7's tables as the checklist.
2. Confirm the UAT-deployed app commit (FT-3) — this determines whether the code-level findings
   in this report actually apply to what UAT is currently running.
3. Review the `kra-engine.ts` fallback-constant finding (FT-1) — low urgency, but worth a
   deliberate decision rather than leaving it unexamined.
4. Restore-test the UAT backup (FT-4, carried over from Step 4F-1) when tooling allows.
5. Once 1–2 are closed, revisit Final UAT Migration Sign-Off — it can likely move to **Passed**
   quickly if live testing confirms no surprises, since every data-level and schema-level check
   in this report is already clean.
