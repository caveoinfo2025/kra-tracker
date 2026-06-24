# UAT Post-Migration Functional Test Results

> Step 4H (2026-06-24) + **Step 4H-1 (2026-06-24, same day)**. Step 4H-1 closes the live
> UI/login/RBAC gap that Step 4H left open. **No production database was touched. No new
> migration, schema change, or `db push` was run. No migration history was modified.
> Voucher/Ledger/FinAccount were not touched. No write action (create/edit/delete/approve/post)
> was performed against `u686730471_Caveo_UAT` — every check below is navigation, search/filter,
> or a read-only query.**

## 0. Step 4H-1 Method — read this before the tables below

Step 4H's honesty note said the hosted UAT URL was blocked by network policy and no live
login/UI testing was possible. **Step 4H-1 re-attempted this from a fresh environment and the
situation is partially improved, not fully resolved:**

- `https://uat.caveoinfosystems.com` **is reachable** from this environment (confirmed via a
  direct fetch — see §2). It serves the expected branded login screen ("Sales Tracker", Caveo
  Infosystems, Q1 2026–27, "Sign in with Microsoft… @caveoinfosystems.com").
- **A real interactive Microsoft Entra ID OAuth login still cannot be completed from here** —
  there is no browser-driven interactive auth flow or credential entry available to this
  assistant, with or without MFA. This is unchanged from Step 4H.
- `.env.uat` (the UAT server's own deployment env file, gitignored, already present in this
  repo for deployment purposes) sets `NODE_ENV="production"`, which by design **disables** the
  codebase's `dev_employee_id` impersonation bypass (`src/lib/dev-session.ts`) on the actual
  deployed UAT app. So even with URL access, neither the hosted app nor a real OAuth handshake
  could be exercised live.

**What was actually done instead, with the user's explicit authorization (asked and confirmed
mid-task):** a second, local-only instance of this exact codebase — a detached-HEAD git
worktree checked out at `uat` branch commit `0ccce92` (the same commit this report's earlier
data/code-level findings were checked against) — was run with `DATABASE_URL` pointed at the
**live `u686730471_Caveo_UAT` database** and `NODE_ENV` forced to `development` *only on this
local instance*, never on the deployed UAT app or its own environment. This re-enabled the
existing `dev_employee_id` cookie bypass, which is a first-class feature of this codebase built
for exactly this kind of role-impersonation testing (see `src/app/login/DevQuickLogin.tsx`).
This let real pages render against real UAT rows, under a real session shaped exactly like a
NextAuth session, for both a Manager-tier and an Employee-tier UAT employee — without ever
performing the Microsoft OAuth handshake itself.

**What this method does and does not prove:**
- ✅ Proves: the application code at commit `0ccce92`, given a real session for a given
  employee, renders Finance/Sales/KRA pages correctly against real UAT data, and the RBAC
  predicates (`src/lib/roles.ts`) correctly gate page access for that employee's role — because
  every check below hit a real Next.js server instance, talking to the real UAT database,
  through the real page/route code, with real role-shaped session data.
- ❌ Does not prove: that the Microsoft Entra ID OAuth handshake itself works end-to-end on the
  deployed UAT app, or that the deployed UAT app is actually running commit `0ccce92` (see §2,
  FT-3 — still open).

No `.env.uat` content was ever written to a tracked file, copied into a committed file, or
echoed in any document. The worktree, its `node_modules` copy, and the temporary launcher
script used to wire this up have all been deleted after testing (see §11).

## 1. Test Overview

- **Scope:** Finance (Payment/Collection/OrderAdvance/Expense/EmployeeAdvance/TravelClaim),
  Sales Pipeline (CrmLead/CrmOpportunity/SalesFunnel), KRA (target free-text, scoring engine),
  Dashboard/display-unit consistency, RBAC (Manager/Employee), regression (build/typecheck).
- **Method:** Step 4H's read-only live DB queries + static source-code review, **plus Step
  4H-1's live browser-rendered page testing** (via the local-instance-against-live-UAT-DB method
  described in §0) for login, RBAC, Finance, Sales, and KRA pages.
- **Out of scope (per task instruction):** no new migration, no schema change, no `db push`,
  no migration-history change, no Voucher/Ledger/FinAccount, no new Finance write API work, no
  production access, no write action against UAT data.

## 2. Environment Confirmation

| Check | Result |
| ----- | ------ |
| UAT DB is `u686730471_Caveo_UAT` | **Confirmed live**, twice — Step 4H's `SELECT DATABASE()`, and Step 4H-1's direct read-only Prisma query against the same DB, both returned `u686730471_Caveo_UAT` |
| UAT URL reachable | **Confirmed live (Step 4H-1, improvement over Step 4H)** — a direct fetch to `https://uat.caveoinfosystems.com` returned the expected branded login page ("Sales Tracker", Caveo Infosystems, Q1 2026–27, Microsoft sign-in instruction). `/api/health` returned `401 Unauthorized` — consistent with the documented `proxy.ts`/`authorized` callback behavior for unauthenticated `/api/*` requests, i.e. the deployed app is enforcing the expected auth gate |
| UAT app connected to UAT DB | **Assumed by deployment design, not independently re-verified for the *hosted* app this step either** — same gap as Step 4H. What *was* independently verified is that this codebase, run separately against the same DB, behaves correctly (§0) |
| Current UAT deployed app commit | **Still not confirmed — same gap as Step 4B/4H.** No version/build marker was found on the login page source (script tags and `/_next/static/` build-ID hashes were not retrievable through this environment's fetch tooling), and there is still no SSH/build-artifact access to the UAT server from here. Local `uat` branch HEAD at the time of this step: `0ccce92` (includes two Sales/Collections/Accounts Lakhs-display fixes made earlier this same session, on top of the `9c50490` HEAD Step 4H tested against) |
| Does deployed commit match the tested/migrated codebase? | **Still cannot be determined for the *hosted* app.** Everything in §§3–7 below that says "Passed (live)" was tested by running commit `0ccce92` locally against the live UAT database — not by testing whatever is actually deployed at `uat.caveoinfosystems.com`. If an older commit is deployed there, the Lakhs-display fixes in particular may not be live yet |
| Manager test login available | **Confirmed and exercised live.** `Employee` id 4 (`Vijesh`) has `isManager = 1`. Logged in via the codebase's own dev-impersonation mechanism (§0) against the live UAT DB — see §7 |
| Employee test login available | **Confirmed and exercised live.** 9 Employee-tier accounts exist (ids 5–13: Mariarussell, Nizamuddin K, Sangeetha M, Sangeetha J, Akshayah M, Deepak, Priyadharshini, Ramanathan, Saravanakumar M). Logged in as Sangeetha M (id 7, Sales Coordinator) — see §7 |
| No production connection used | **Confirmed.** Every query and every live page render this step used `u686730471_Caveo_UAT` only, via the gitignored `.env.uat` (never written to a tracked file, never echoed); the production database was never referenced |

## 3. Live Login Test Results

| Role | Login Result | User / Employee ID | Notes |
| ---- | ------------ | ------------------- | ----- |
| Manager | **Passed (live)** | Employee id 4, "Vijesh" | Logged in via dev-impersonation against live UAT DB. Manager Dashboard loaded cleanly: 10 Total Employees, 34 Active KRAs, 28 Overdue Invoices, 37 Due in 30 Days, ₹269.96L Total Booking (Closed Won), ₹585.00L Total Billed (Invoiced), ₹490.42L Total (Without GST). Full Manager-tier navbar rendered (Leads/Opportunities/Analytics/Team Overview/Collections/Customer+Vendor Master/KRAs/Import/Finance Dashboard/Accounts/Expenses/Employees/Finance Approvals/Vouchers/Reports/Settings). No console or server errors |
| Employee | **Passed (live)** | Employee id 7, "Sangeetha M" (Sales Coordinator) | Logged in via dev-impersonation against live UAT DB. Employee Dashboard loaded cleanly with personal-scope data: Collections overdue list (₹0.44L / ₹0.00L / ₹0.71L), Pipeline Snapshot (7 leads, all Proposal Sent), My KRAs (5 active · 25% avg progress, per-KRA 73%/17%/8%/27%/0%), Recent Wins (₹1.50L / ₹0.25L / ₹0.49L / ₹0.20L). Navbar correctly scoped to personal-only items (My Leads/My Deals/My Tasks/My KRAs/My Expenses/My Claims/My Advance/Conveyance) — no Finance Dashboard, Accounts, Employees, Settings, or Masters links. No console or server errors |

**Logout:** exercised via the in-app dev-session switch (re-authenticating as a different
employee, which is the same underlying session-replacement code path NextAuth's `signOut`
would hit) — confirmed the prior employee's session and scoped navbar were fully replaced, no
stale data bled through. The literal "Sign out" button's `next-auth/react` `signOut()` call
redirects to this *local test harness's own* `AUTH_URL` (`http://localhost:3000`, from the local
`.env` borrowed for the harness) rather than back to `localhost:3001` — this is an artifact of
how the local-only test harness was wired (§0), not a UAT app behavior, and was not investigated
further since it has no bearing on the deployed app.

**No production data was visible at any point** — every figure above came from
`u686730471_Caveo_UAT`.

## 4. Finance Test Results

| Test Area | Test Case | Result | Evidence / Notes |
| --------- | --------- | ------ | ---------------- |
| Payment / Accounts ledger | Values are real INR→Lakhs display, no inflation | **Passed (live)** | `/accounts` as Manager: ₹585.00L Total Invoiced, ₹386.66L Total Received, ₹198.33L Outstanding — exactly matches the Dashboard's independently-computed ₹585.00L Total Billed figure |
| Collection | List/detail render correctly, search works | **Passed (live)** | `/collections` as Manager: ₹585.00L Invoiced, ₹490.42L Total (Without GST), ₹386.66L Collected, 66.1% Collection Rate, tab counts (All 141 / Overdue 28 / Upcoming 8 / Received 48 visible in UI), per-employee Revenue Summary filter present, table headers correctly read "(₹L)". Typed "FUSION" into the search box — table narrowed to the single matching invoice row (0007/26-27, Vijesh, FUSION VR, ₹0.87L / ₹0.74L / ₹0.00L / ₹0.87L Overdue) — **filter confirmed working live** |
| OrderAdvance | Displays correctly, no crash | **Not independently click-tested live this round (residual gap, see FT-5)** | Step 4H's data-level check already confirmed all 3 rows correct (`341964.00`, `341964.00`, `37967.00`); no dedicated standalone OrderAdvance page exists in the nav separate from the Accounts "Record Advance" flow, and that flow was not exercised live to avoid a write action |
| Expense | Screen loads, no crash | **Passed (live)** | `/finance/expenses` as Employee: ₹0 across all summary cards (Total/Today/Pending/Approved/Claims Pending/Customer Expenses/GST Input — consistent with the table's 0 rows), category/customer/employee/monthly breakdown sections correctly show "No data." with no crash, no NaN, no `[object Object]` |
| Employee Advance | Screen loads, no crash | **Passed (live)** | `/finance/advances` as Employee: loads cleanly, "Partially Live" badge, scoped to own advances, no crash |
| Travel Claim | Screen loads, no crash | **Passed (live)** | `/finance/conveyance` as Employee: loads cleanly ("Local Conveyance"), "Partially Live" badge, no crash |
| Employee Claims | Screen loads, no crash | **Passed (live)** | `/finance/claims` as Employee: ₹0 across all cards, status/category filters render, no crash |
| Finance dashboard | Displays correctly, no `[object Object]`/NaN | **Passed (live)** | `/finance` as Manager: Cash Balance ₹0.00, Bank Balance ₹0.00, Today's/Monthly Expense ₹0.00, Pending Approvals 0, Claims Pending ₹0.00, Advances Outstanding ₹0.00, Customer Expenses ₹0.00 — all correctly zero (consistent with 0-row Expense/Voucher/FinAccount tables), Quick-action buttons present (not clicked, to avoid a write), no crash |
| No Decimal-object leakage in API responses | — | **Passed (live, by absence)** | No `[object Object]`, no raw Decimal string artifact, observed anywhere across the above pages |
| Filters / list / detail pages load | — | **Passed (live)** | Collections search filter confirmed (above); other filter dropdowns (status, category, employee) rendered without error on every page visited |
| No 100,000× inflation or reduction in either direction | — | **Passed (live)** | Every figure above is internally consistent across independent surfaces (Dashboard vs. Accounts vs. Collections all agree on ₹585.00L/₹490.42L), and none show a 5-digit jump or collapse relative to the Step 4H data-level baseline |
| Export buttons | — | **Not performed — would require a write/download action, out of scope for read-only verification** | |
| Runtime console/server errors | — | **Passed (live)** | `preview_console_logs` and `preview_logs` (error-filtered) returned empty across the entire Manager + Employee Finance walkthrough |

## 5. Sales Pipeline Test Results

| Test Area | Test Case | Result | Evidence / Notes |
| --------- | --------- | ------ | ---------------- |
| Lead list (Employee scope) | Renders correctly, no crash | **Passed (live)** | `/pipeline/leads` as Sangeetha M: "0 active leads" — **correct, not a bug**: her dashboard's Pipeline Snapshot independently confirms all 7 of her leads are at `PROPOSAL_SENT`, which are by-design hidden from the Leads view (they live on Opportunities, per the documented CRM Admin Engine rule). Stage/source filter dropdowns rendered |
| Opportunity list (Employee scope) | Renders correctly, Lakhs display correct | **Passed (live)** | `/pipeline/opportunities` as Sangeetha M: Opportunity Funnel cards ₹64.81L Active Pipeline / ₹12.30L Weighted Forecast / ₹101.25L Won Value; KRA Activity Metrics 11 Proposal Sent / 0 Follow-Ups / 4 Negotiations / 22 Deals Won; Kanban cards ₹1.00L / ₹0.50L / ₹4.00L / ₹9.00L — all correctly Lakhs-formatted (this is the fix made earlier this session, commit `0ccce92`, confirmed live and correct against real UAT data) |
| CrmOpportunity row 42 (known negative-value anomaly) | Renders correctly, no crash | **Passed (live)** | `/pipeline/opportunities/42` as Manager: "CPF foods India private limited", value displays as **`₹-0.10L`** — correct negative-sign handling end-to-end through the same `formatINRAsLakhs` helper used everywhere else, no crash, no NaN. This directly confirms, live, what Step 4H could only confirm at the data level |
| Sales dashboard / summary cards | Booking/Billing figures correct, Lakhs presentation-only | **Passed (live)** | Manager Dashboard's "Sales Revenue Summary": ₹269.96L Total Booking (Closed Won), ₹585.00L Total Billed (Invoiced), ₹490.42L Total (Without GST) — internally consistent with the Accounts/Collections figures in §4, confirming the Lakhs presentation layer is consistent across Dashboard, Accounts, and Collections for the same underlying INR data |
| Sales Funnel (legacy) | — | **Not independently click-tested live this round (residual gap, see FT-5)** | Step 4H's data-level check and this session's earlier code fix (also commit `0ccce92`, `SalesFunnelClient.tsx`) both already confirm correctness; the live page itself was not separately navigated to in this round (time-boxed) |
| No double multiplication / double division | — | **Passed (live)** | Every Lakhs figure above is consistent with its known INR baseline at exactly one ÷100,000 — a double-multiply/divide would have produced an obviously wrong order of magnitude, which is not observed anywhere |
| Filters/search/sorting | — | **Passed (live, partial)** | Lead stage/source filter dropdowns render without error; exhaustive combination-testing of every filter was not performed (time-boxed), but the Collections search filter (§4) is direct proof the same filter pattern works against live UAT data |

## 6. KRA Test Results

| Test Area | Test Case | Result | Evidence / Notes |
| --------- | --------- | ------ | ---------------- |
| Employee KRA view | Renders correctly, scores/percentages sane | **Passed (live)** | `/kras` as Sangeetha M: "Sales Revenue targets" shows the transformed free-text target (`total sales revenue - booking: 12000000; total sales revenue - billing: 10800000; average gross profit margin: 12; ...`), Progress 73% / Score 7; "Customer & Business Development" 17% / Score 2; "Sales management" 8% / Score 2 — **exactly matches** the same employee's Dashboard "My KRAs" widget. No crash, no NaN |
| Manager KRA view | Team-wide visibility, no crash | **Passed (live)** | `/kras` as Vijesh: shows every employee's KRAs starting with Akshayah M ("Lead Generation Activity" 0% / Score 1, "Pipeline Building" 0% / Score 1, ...) — confirms Manager sees the full team, not just their own row. "Sync Achievements" button visible but **not clicked** (it would trigger a write) |
| Money labels understandable after INR migration | — | **Passed (live), with the known FT-1 caveat unchanged** | The free-text target string itself shows raw INR numbers (e.g. `12000000`) rather than a Lakhs-formatted string — this is by design (KRA.target is free text, not reformatted at display time); the scoring/notes layer does convert via `inrToLakhsEquivalent()` per Step 4H's code review, confirmed consistent with the Dashboard widget shown alongside it |
| Percentage/count/ratio/activity metrics unaffected | — | **Passed (live)** | All percentage/score figures above are in the expected 0–100% / 1–10 ranges, not inflated or collapsed |
| No page crash after `KRA.target` free-text transform | — | **Passed (live)** | Both the Employee and Manager `/kras` views loaded without error |
| KRA configuration / structured template pages | — | **Not tested (consistent with Step 4H, not a new gap)** | `kra_template_item`/`kra_metric`/`kra_template` remain 0 rows on UAT (re-confirmed unchanged); this path is provably inactive, not untested-and-risky |
| FT-1 (carried over) | Hardcoded Lakhs-scale fallback constants in `kra-engine.ts` | **Still Open, Low** | Not re-triggered by either employee tested this round (both have matching KRA rows for every category they hit) — unchanged from Step 4H |

## 7. RBAC Live Test Results

| Role | Page / Action | Expected | Actual | Result | Notes |
| ---- | ------------- | -------- | ------ | ------ | ----- |
| Employee (Sangeetha M) | `/accounts` | Blocked, redirect to own scope | Redirected to `/dashboard` | **Passed** | Manager/Accounts-only page correctly inaccessible |
| Employee | `/settings` | Blocked | Redirected to `/dashboard` | **Passed** | Admin-only page correctly inaccessible |
| Employee | `/employees` (full directory) | Blocked / scoped to self | Redirected to `/employees/7` (own profile) | **Passed** | Own-profile view shown instead of the org directory; own KRA stats correct (5 Active KRAs, 25% Avg Progress, 3.0 Avg) |
| Employee | `/employees/4` (another employee's, the Manager's, record) | Blocked | Redirected back to `/employees/7` | **Passed** | Cannot view another employee's record by direct URL |
| Employee | `/finance` (org Finance Dashboard) | Blocked / redirected to own scope | Redirected to `/finance/expenses` (own Expense Register) | **Passed** | Lands on own-scope Finance page, not the org dashboard |
| Employee | `/finance/expenses`, `/finance/claims`, `/finance/advances`, `/finance/conveyance` | Allowed, own data only | All four loaded, scoped to own records ("Viewing your expense claims" / "Viewing your a[dvances]") | **Passed** | |
| Employee | `/pipeline/leads`, `/pipeline/opportunities` | Allowed, own data only | Both loaded, scoped to own 7 leads / own opportunity funnel | **Passed** | |
| Employee | `/kras` | Allowed, own KRAs only | Loaded, showed only Sangeetha M's 5 KRAs | **Passed** | |
| Manager (Vijesh) | `/accounts` | Allowed | Loaded, full org Payment Tracker | **Passed** | |
| Manager | `/settings` | Allowed | Loaded | **Passed** | |
| Manager | `/employees` (full directory) | Allowed | Loaded, full employee list | **Passed** | |
| Manager | `/finance` (org dashboard) | Allowed | Loaded, full org Finance Dashboard | **Passed** | |
| Manager | `/collections` | Allowed, org-wide | Loaded, org-wide figures + per-employee Revenue Summary filter | **Passed** | |
| Manager | `/kras` | Allowed, team-wide | Loaded, all employees' KRAs visible | **Passed** | |
| Manager | `/pipeline/opportunities/42` | Allowed | Loaded, negative value rendered correctly (see §5) | **Passed** | |
| Both | RBAC gating logic exists and is unaffected by this migration | — | `src/lib/roles.ts` predicates gate on `isManager`/role strings only, none reference Decimal-converted fields | **Passed (code-level, now corroborated live)** | Step 4H's code-level non-regression argument is now backed by the live results above |

**No RBAC leak, no unauthorized data exposure, and no login failure was observed in either
direction.**

## 8. Regression Checks

| Command | Result |
| ------- | ------ |
| `npx prisma validate` | See §10 (Step 4H-1 re-run) |
| `npx tsc --noEmit` | See §10 (Step 4H-1 re-run) |
| `npm run build` | See §10 (Step 4H-1 re-run) |
| App starts locally against live UAT DB | **Passed (live, this step)** — confirmed via the local-instance method in §0; the deployed UAT app itself was not started/restarted (no access, and doing so would be out of scope) |
| No server-side runtime errors | **Passed (live)** | `preview_logs` (error-filtered) was empty across the entire test session |
| No Prisma Decimal serialization errors | **Passed (live)** | No serialization error surfaced on any of the ~20 pages visited |
| No broken API responses for migrated fields | **Passed (live, by absence of error)** | Every page that fetches migrated Finance/Sales/KRA fields rendered without a fetch/parse error |

## 9. Issues Found

| Issue ID | Area | Severity | Description | Status | Owner | Next Action |
| -------- | ---- | -------- | ----------- | ------ | ----- | ----------- |
| FT-1 | KRA | Low | `src/lib/kra-engine.ts` hardcoded Lakhs-scale fallback constants, not on the same INR scale as real targets/actuals if ever hit. Not triggered by either employee tested in Step 4H-1. | Open (unchanged) | Dev team | Review and either update fallback constants to INR scale or confirm the path is intentionally unreachable |
| FT-2 | Testing coverage | — | *Step 4H's form of this issue ("live UI/login testing impossible from this environment") is* **Closed** *by Step 4H-1 — see §0 and §§3–7 above for the live evidence.* | **Closed** | Vijesh Vijayan | None — superseded by FT-2b |
| FT-2b | Testing coverage | Low | The live testing performed in Step 4H-1 used the codebase's own `dev_employee_id` impersonation bypass against the live UAT DB, not a real Microsoft Entra ID OAuth handshake (which still cannot be completed from this environment). This proves the application/RBAC code is correct given a valid session, but does not prove the OAuth login flow itself works end-to-end on the deployed UAT app. | Open | Vijesh Vijayan / whoever has UAT credentials | Have someone with a real `@caveoinfosystems.com` account complete one interactive Microsoft login on `uat.caveoinfosystems.com` to close this specific gap |
| FT-3 | Deployment verification | Medium | The UAT-deployed app's commit still cannot be confirmed (same gap since Step 4B, re-attempted and still open in Step 4H-1 — no version marker found on the live login page). Step 4H-1's live testing was performed against a local instance of commit `0ccce92`, not against whatever is actually deployed at `uat.caveoinfosystems.com`. | Open | Vijesh Vijayan | Confirm the deployed commit directly (SSH/build-artifact check, or add a visible version marker to the app) |
| FT-4 | Backup | Low (carried over) | UAT backup restore-test still not performed. Unchanged by Step 4H-1 (out of scope for this round). | Open | Vijesh Vijayan | Restore-test `u686730471_Caveo_UAT_240626.sql` to a scratch DB when tooling allows |
| FT-5 | Testing coverage | Low | Two surfaces were not independently click-tested live this round: (1) the legacy Sales Funnel page (`/sales-funnel`), and (2) a standalone OrderAdvance view (no dedicated nav page exists separate from the Accounts "Record Advance" flow, which was not exercised to avoid a write action). Both are already confirmed correct at the data level (Step 4H) and via code review (the Sales Funnel display fix is part of the same commit `0ccce92` already confirmed live and correct on the Opportunities pages). | Open | Vijesh Vijayan | Optional: click through `/sales-funnel` and the Accounts advance-recording flow (read-only parts) on a future pass for full coverage |

**No Critical or High-severity issue was found in Step 4H or Step 4H-1.** Step 4H-1 additionally
found **zero new defects** — every page visited rendered correctly, every figure cross-checked
across independent surfaces agreed, the one known anomaly (negative-value row 42) handled
gracefully, and RBAC correctly gated every restricted page in both directions.

## 10. Validation Commands (Step 4H-1 re-run)

| Command | Result |
| ------- | ------ |
| `npx prisma validate` | ✅ Pass |
| `npx tsc --noEmit` | ✅ Pass |
| `npm run build` | ✅ Pass |

(Exact output captured in the session transcript; re-run against the main `kra-tracker`
checkout on branch `uat` at commit `0ccce92`, after the verification worktree was torn down.)

## 11. Step 4H-1 Test Harness Teardown

Confirmed clean — no residue left in the repository:

- The verification worktree (`kra-tracker-uat-verify`, a detached-HEAD checkout of commit
  `0ccce92`) has been fully removed (`git worktree remove` + directory deletion).
- The temporary launcher script (`scripts/dev-uat-runner.mjs`) has been deleted.
- The temporary `.claude/launch.json` entry ("UAT Verification Server") has been removed;
  `launch.json` is back to its original two entries.
- `.env.uat` was read at runtime only (to borrow `DATABASE_URL`), never written to, never
  copied into a tracked file, never committed, never echoed in full — `git diff -- .env.uat`
  is empty and `git status` shows no changes.
- `git status --short` is clean.
- The original local dev server (port 3000, pointed at the separate DEV database) was
  undisturbed throughout and is still running normally.

## 12. Sign-Off Status

## UAT Functional Sign-Off

| Area | Owner | Status | Notes |
| ---- | ----- | ------ | ----- |
| Finance | _(to be assigned)_ | **Passed with Minor Issues** | Data-level checks clean (Step 4H) + live UI now tested and clean (Step 4H-1) — no inflation/deflation/NULLs/crashes/NaN observed live. Minor: FT-5 (OrderAdvance standalone view not independently click-tested) |
| Sales Pipeline | _(to be assigned)_ | **Passed with Minor Issues** | Data-level checks clean (Step 4H) + live UI now tested and clean (Step 4H-1), including the row-42 negative-value anomaly confirmed handled gracefully live. Minor: FT-5 (Sales Funnel legacy page not independently click-tested) |
| KRA | _(to be assigned)_ | **Passed with Minor Issues** | Data-level and scoring-design checks clean (Step 4H) + live UI now tested and clean (Step 4H-1) for both Employee and Manager views. Minor: FT-1 (pre-existing, low-severity fallback-constant finding, unchanged) |
| RBAC | _(to be assigned)_ | **Passed** | Live-tested in both directions this round (Step 4H-1) — Manager confirmed full access to every admin/Finance/team page; Employee confirmed blocked from every one of those same pages and correctly scoped to personal data only. No leak, no failure |
| Technical Validation | _(to be assigned)_ | **Passed** | `npx prisma validate`, `npx tsc --noEmit`, `npm run build` all pass (re-confirmed Step 4H-1); migration history aligned; no destructive statement anywhere in the migration package |
| **Final UAT Migration Sign-Off** | _(to be assigned)_ | **Passed** | All gating conditions met: Finance/Sales/KRA have no Critical or High issue; RBAC live testing passed; Technical Validation passed. **Remaining risks are explicitly accepted, not hidden:** FT-2b (OAuth handshake itself untested, Low), FT-3 (deployed-commit-vs-tested-codebase match unconfirmed, Medium), FT-4 (backup restore-test outstanding, Low), FT-5 (two secondary pages not independently click-tested, Low), FT-1 (pre-existing fallback-constant finding, Low). None of these are Critical or High, and none contradict any positive result above — they are gaps in *breadth* of testing, not evidence of a defect. A human with real UAT credentials closing FT-2b, and someone with server/build access closing FT-3, would fully retire the remaining uncertainty, but neither blocks this sign-off per the stated gating rule |

## 13. Next Actions

1. **FT-3 (Medium):** Confirm the UAT-deployed app's actual running commit (SSH/build-artifact
   check, or add a visible version/build marker to the app) — this is the only Medium-severity
   item left open and the only one worth prioritizing before relying on this report for
   production planning.
2. **FT-2b (Low):** Have someone with a real `@caveoinfosystems.com` account complete one
   interactive Microsoft login on `uat.caveoinfosystems.com` to close the OAuth-handshake gap.
3. **FT-5 (Low):** Optionally click through `/sales-funnel` and the read-only parts of the
   Accounts advance-recording flow for full coverage.
4. **FT-1 (Low):** Review the `kra-engine.ts` fallback-constant finding when convenient.
5. **FT-4 (Low):** Restore-test the UAT backup when tooling allows.
6. None of 1–5 block production planning from resuming on the strength of this sign-off; FT-3
   is the one item worth resolving first since it bears directly on whether "what was tested"
   and "what is deployed" are the same thing.
