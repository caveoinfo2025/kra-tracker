# RBAC Migration Tracker

> Companion to `docs/RBAC_AUDIT_REPORT.md` (the audit/findings record). This file is the
> practical, execution-focused tracker: what's decided, what's done, what's left, and the
> rules that keep new code from being built on the wrong permission system in the meantime.

---

## 1. Current RBAC State

- **`src/lib/access-control/`** (`requirePermission`, `hasPermission`, `canAccessScope`) is the
  **target production permission system**. It has the only real catalogue
  (`PERMISSION_CATALOGUE` in `permissions.ts`), a scope-aware data filter
  (`canAccessScope`/`DataAccessPolicy`), and the broadest current enforcement footprint.
  All new permission checks must use it.
- **`src/lib/roles.ts`** (legacy string-matching predicates — `isManager`, `canManageFinance`,
  `isAccounts`, `canAccessSettings`, etc.) **remains temporarily load-bearing**. It is still the
  primary gate for ~65 files, including nearly every page-level `redirect()` guard and the
  sidebar. It must not be removed until `access-control` has replaced every page/API guard
  currently depending on it.
- **`src/lib/rbac.ts` / `AppRole` / `RolePageAccess` is frozen** as of this step (2026-06-20,
  Step 2H). It backs the legacy `/admin` Roles & Access tab only. Its `hasPermission()` and
  `loadRolePermissions()` functions have **zero callers** anywhere in `src/app` — editing a role
  there has no effect on real access. No new features, fields, or enforcement logic should be
  added to it.
- **The legacy `/admin` Roles tab is not authoritative.** It can still create/edit `AppRole` and
  `RolePageAccess` rows through a working UI, but those changes do not influence any access
  decision anywhere in the app. A non-blocking warning banner was added in this step (see §10
  of `RBAC_AUDIT_REPORT.md` Step 2H notes) to make this visible to anyone using the tab.

---

## 2. Permission Systems Decision

| System | Current Status | Future Status | Action |
|---|---|---|---|
| `access-control` (`src/lib/access-control/`) | Actively enforced, growing coverage (Steps 2A–2G migrated 33+ route files onto it) | **Final source of truth** | Keep extending; every new route/page guard should target this system |
| `roles.ts` | Actively enforced, ~65 files | Temporary bridge | Do not remove until every page/API guard depending on it has an `access-control` equivalent |
| `rbac.ts` | Decorative — zero real callers, only backs legacy `/admin` Roles tab | **Frozen now, retire later** | No new enforcement logic; plan removal once `/admin` Roles tab is retired (Step 2Q/2R) |
| `AppRole` / `RolePageAccess` (Prisma models) | Decorative — seeded and editable, but not read by any access decision | **Frozen now, later migrate/delete** | No new fields/features; decide migrate-vs-delete before dropping (Step 2Q) |
| Legacy `/admin` Roles tab (`RolesClient.tsx`, `/api/admin/roles*`) | Functional UI, but edits have no runtime effect; gated by bare `isManager`, not even its own `rbac.ts hasPermission()` | **Freeze now, retire later** | Non-blocking warning banner added (Step 2H); full retirement is Step 2P |
| `/settings/identity` (`RoleManagement`, `PermissionMatrix`, `DataAccessPolicyPanel`) | Active permission management UI, backed by `/api/admin/identity/*` (migrated to `access-control` in Step 2G) | **Active permission management UI** | This is where admins should be directed for real role/permission management going forward |

---

## 3. Already Completed RBAC Fixes

All of the following are confirmed completed in `docs/RBAC_AUDIT_REPORT.md` §10, with matching
code in the repo at the time of writing this tracker:

- ✅ **Step 2A** — Approval action object-level authorization (`assertCanActOnApprovalRequest()` in
  `src/lib/workflow-engine/authorization.ts`), wired into `approveRequest`/`rejectRequest`/
  `returnRequest`/`delegateRequest`/`cancelRequest`.
- ✅ **Step 2B** — `PATCH /api/customers/master/[id]`, `GET`/`POST /api/admin/masters`,
  `/admin/masters/overrides`, `/admin/masters/values` — added `requirePermission()`.
- ✅ **Step 2C** — `DELETE /api/customers/master/[id]` action mismatch fixed (`EDIT` → `DELETE`).
- ✅ **Step 2D** — `/api/admin/customer-policy`, `/api/admin/vendor-policy` — added
  `requirePermission(session,"Settings","Masters",...)`.
- ✅ **Step 2E** — `/api/master-values` — usage-audited, `getSession()`/401 check added (no
  permission check; dropdown-lookup data only).
- ✅ **Step 2F** — **Finance-admin** APIs (`admin/finance/{advance,collection,conveyance,credit,
  expenses,policies,voucher}`) migrated to `requirePermission(session,"Settings","Finance",...)`.
  **CRM-admin** APIs (`admin/crm/{assignment,automation,pipelines,pipelines/[id],sla,territories,
  territories/[id]}`) were **left unmigrated** — no `Settings/CRM` permission exists in the
  catalogue; documented as an open gap rather than guessed at (see §4 Step 2L below for the
  closest planned follow-up, and §8 for the catalogue gap itself).
- ✅ **Step 2G** — Identity APIs (`admin/identity/{permissions,permissions/[roleId],policies,
  policies/[roleId],roles,roles/[id],users/[id]}`) and Policy APIs (`admin/policies/{route,[id],
  [id]/versions,audit,categories,evaluate}`) migrated from `canAccessSettings()` to
  `requirePermission(session,"Settings","Identity"|"Policy",...)`. `admin/identity/users/route.ts`
  (the collection endpoint, distinct from `/[id]`) was **not** in scope and still uses
  `canAccessSettings()` — flagged as a gap, not fixed.
- ✅ **Step 2I** — `rbac.ts` marked as legacy/frozen with a top-of-file warning comment; the
  legacy Roles & Access UI (`src/app/admin/AdminClient.tsx`) now shows a non-authoritative
  warning banner on the Roles tab plus a smaller note on the general admin-panel header (visible
  on every tab); runtime permissions remain managed exclusively by `access-control`; no runtime
  permission behavior changed.
- ✅ **Step 2J** — Sidebar/navigation visibility now uses `access-control` permissions for
  Masters (Customer/Vendor Master links) and Finance Operations sub-items (Cash/Bank Book,
  Expense Register, Advances, Finance Approvals), where catalogue mappings exist. Self-service
  navigation (My Expenses/Claims/Advance/Conveyance, Approvals inbox, Pipeline/Daily Updates/
  KRA/Tasks/Employees) remains on the existing session/roles bridge, unchanged. Settings entry
  visibility now also checks `access-control` Settings/* permissions, OR'd with the existing
  roles.ts check (no role currently holds a seeded Settings/* grant, so replacing instead of
  OR-ing would have hidden Settings from Operations Head/Head of Sales). No manager or Accounts
  user lost any navigation item — all gating is additive (`bridge || capability`). Navigation
  visibility is closer to, but not identical to, API/page permission behavior — remaining
  page-guard/card-alignment work is tracked as Step 2K.
- ✅ **Step 2K** — Settings landing/cards visibility now uses `access-control` permissions. New
  `src/lib/access-control/settings-capabilities.ts` helper (`getSettingsCapabilities()`) loads all
  of a user's permissions once per request and returns an `{ organization, identity, masters,
  finance, crm, workflow, policy, communication, integration, security, performance }` card map.
  `/settings/page.tsx` computes capabilities server-side and passes them to `AdminConsole`, which
  now renders only the cards the session has a matching `Settings/<Resource>/VIEW`-or-`EDIT` grant
  for, and shows a "You do not have access to any Settings modules" empty state if none match.
  `/settings/page.tsx`'s own access check is now `capabilities.canViewSettings ||
  canAccessSettings(session.user)` (additive, same bridge pattern as Step 2J) — no manager,
  Operations Head, or Head of Sales lost access to the landing page. **CRM gap:** no `Settings/CRM`
  permission exists in the catalogue (same gap as Step 2J/2F/2L), so the CRM Administration card
  falls back to `isManager` via the existing `bridgeAccess` flag passed from `canAccessSettings()`,
  matching `/settings/crm`'s own guard rather than inventing a permission name. **Documented
  page-guard mismatches found, not fixed this step** (out of scope per Step 2K's brief — broad
  page-guard refactors are deferred): `/settings/finance`, `/settings/communication`,
  `/settings/integrations`, `/settings/security`, and `/settings/performance` all gate purely on
  `isManager` and do not yet consult the `Settings/{Finance,CommunicationAdmin,IntegrationAdmin,
  SecurityAdmin,Performance}` permissions that already exist in the catalogue and that their cards
  are now keyed on — a non-manager granted one of these permissions would see the card but get
  redirected by the subpage. `/settings/organization`, `/settings/identity`, `/settings/masters`,
  `/settings/policies`, and `/settings/workflow/approval-engine` already call `hasPermission()`
  directly and are unaffected.

- ✅ **Step 2L (planning only)** — Created `docs/modules/finance/FINANCE_WRITE_ACCESS_CONTROL_PLAN.md`,
  a detailed permission-mapping plan for every planned Finance write API (Expense, Bank Book, Cash
  Book, Advance, Claims, Conveyance, Voucher, Reconciliation — 33 endpoints total), cross-checked
  line-by-line against `permissions.ts`. No Finance write API, schema change, migration, UI
  change, or permission-enforcement change was made — this is documentation only, per the step's
  explicit scope. Findings: `Finance/Invoice`, `Finance/Expense`, `Finance/Payment`,
  `Finance/Advance` permissions are usable today; `Finance/Voucher` has **no resource at all**,
  `Finance/Payment/EDIT` and `Finance/Advance/EDIT` **do not exist**, and no dedicated
  `BankBook`/`CashBook`/`Conveyance`/`Reconciliation` resource exists — all documented as
  Catalogue Gaps with interim closest-fit mappings (mostly `Finance/Payment/CREATE` for
  Ledger-posting actions), not invented permissions. Also documented as a **Schema Gap**: no
  Finance transaction model (`Expense`, `EmployeeAdvance`, `TravelClaim`, `Voucher`, `Ledger`,
  `FinAccount`) has a real `branchId`/`departmentId` FK — only `FinAccount.branchName`
  (free-text, no `@relation`) — meaning `canAccessScope()`'s BRANCH/DEPARTMENT cases will always
  fall through to "allow" for Finance data today, regardless of any `DataAccessPolicy` row
  configured. The CRM-admin catalogue gap from Step 2F (no `Settings/CRM` permission) is **not**
  closed by this step — it remains open, tracked separately below.
- ✅ **Step 2N** — Customer/Vendor Master page-level guards migrated to `access-control`.
  `/masters/customers/page.tsx` and `/masters/vendors/page.tsx` now require
  `Masters/CustomerMaster/VIEW` and `Masters/VendorMaster/VIEW` respectively (both confirmed to
  exist verbatim in `PERMISSION_CATALOGUE` — no catalogue gap, no permission invented), OR'd with
  `isManager` only — deliberately the same manager-only bypass shape Step 2J's
  `getNavigationCapabilities()` already gives the sidebar links for these two pages (no separate
  `isOpsHead` bridge), so the page guard and the sidebar link now agree on who can reach each
  page. This closes the "accessible to all authenticated users" gap `RBAC_AUDIT_REPORT.md` §2.4/§4
  flagged as the most overexposed surface in the app — a non-manager employee with no real
  `Masters/CustomerMaster`-or-`VendorMaster`/`VIEW` grant via `/settings/identity` is now
  redirected to `/dashboard` (the same forbidden-UX pattern every Settings/Finance page guard
  already uses — no new "unauthorized" page was created). `deriveCustomerCaps()`/
  `deriveVendorCaps()` (`roles.ts`-only) are unchanged and retained for button-level
  Create/Edit/Disable/GST/Bank/Export UX, each with a `// TODO: Migrate button-level capability
  checks to access-control actions after page guard migration.` comment. Legacy `/customers`
  (still session-only, no permission gate) was left unchanged per scope, with a TODO comment
  added pointing at its own retirement step (Step 2O, "Retire or redirect `/customers` legacy
  route" — the brief that requested this step labelled it "Step 2N" for the page-guard work and
  "Step 2N" again for the next legacy-retirement step; this tracker's existing numbering, already
  cross-referenced from `RBAC_AUDIT_REPORT.md` §3.7 and `docs/modules/finance/
  FINANCE_WRITE_ACCESS_CONTROL_PLAN.md`, reserves 2M for Finance-read-API migration and 2N for
  this page-guard work, so that numbering is kept rather than renumbered). No database schema,
  migration, Customer/Vendor API logic, UI/form change, soft-delete, or sidebar/navigation change
  was made. `npx tsc --noEmit`, `npx prisma validate`, `npx eslint` (2 pre-existing unrelated
  unused-var warnings in `masters/customers/data.ts`, confirmed unrelated to this change), and
  `next build` all pass.

- ✅ **Step 2N (API guards)** — `GET`/`POST /api/customers/master` migrated to `access-control`,
  closing the gap Step 2N's page-guard work (above) exposed: page access was guarded but the
  underlying list/create API was still session-only. `GET /api/customers/master` now requires
  `Masters/CustomerMaster/VIEW`; `POST /api/customers/master` now requires
  `Masters/CustomerMaster/CREATE` (both confirmed to exist verbatim in `PERMISSION_CATALOGUE` —
  no catalogue gap, no permission invented). `PATCH`/`DELETE /api/customers/master/[id]`
  (`EDIT`/`DELETE`) were reviewed and confirmed already correct from Step 2B/2C — left unchanged.
  Customer Master page and API access are now aligned for list/create operations. No query
  params, pagination, sorting, response shape, payload structure, or create/validation logic was
  changed. Legacy `/customers` remains session-only and unchanged — its retirement/redirect is
  still Step 2O.

- ✅ **Step 2O** — Legacy `/customers` route-consolidation decision: **guarded in place, not
  redirected.** Code review (per this step's own escape-hatch clause — "if `/customers` has
  unique functionality `/masters/customers` does not have, do not delete it; guard it instead")
  found `/customers` is the **only real, database-backed Customer Master**: live Prisma data,
  real create/edit via `CustomerMasterClient.tsx`'s wiring to `/api/customers/master*`, working
  **Import from CRM** (`/api/customers/master/import`), working **duplicate detection**
  (`/api/customers/master/deduplicate`), and working **delete**
  (`DELETE /api/customers/master/[id]`). `/masters/customers`, by contrast, is still the
  **UI-only mock-data phase** flagged in `docs/PROJECT_MEMORY.md`'s Global Masters section —
  its client component (`masters/customers/CustomerMasterClient.tsx`) renders a hardcoded
  `MOCK_CUSTOMERS` array from `masters/customers/data.ts` and contains **zero `fetch()` calls**;
  it does not read or write the `Customer` table at all. Redirecting `/customers` to
  `/masters/customers` per this step's stated preference would have **replaced the only
  functional Customer Master with a non-functional preview** — a production regression, not a
  safe consolidation — so it was not done. Instead, `/customers/page.tsx` now carries the exact
  same page guard `/masters/customers` already has: `hasPermission(userId, "Masters",
  "CustomerMaster", "VIEW")` (access-control) `||` `isManager` (roles.ts bypass), redirecting to
  `/dashboard` on failure — the same manager-only bypass shape as Step 2N, so both Customer
  Master entry points now agree on who can reach them. No navigation change was needed: a
  repo-wide search (`href="/customers"`, `router.push("/customers"`, `redirect("/customers"`)
  found **zero links** anywhere pointing at `/customers` — the sidebar (`SidebarLinks.tsx`) only
  ever linked to `/masters/customers`; the one `/customers` reference in `Topbar.tsx` is a
  breadcrumb-label prefix match for direct URL visits, not a navigational link, and was left
  unchanged. No internal links required updating for the same reason. `GET`/`POST
  /api/customers/master` and `PATCH`/`DELETE /api/customers/master/[id]` remain guarded exactly
  as Step 2N (API guards) left them — unchanged. No database schema, migration, customer data
  deletion, Customer Master API logic, `/masters/customers` UI/behavior, Vendor Master, or
  Finance module change was made. **Recommended follow-up (not done this step):** wire
  `/masters/customers` to the real `Customer` table (replacing `MOCK_CUSTOMERS` with live Prisma
  data and real CRUD/import/dedupe against the now-guarded `/api/customers/master*` APIs) — only
  after that parity is reached should `/customers` be converted to a redirect.

- ✅ **Step 2P (Customer Master)** — `/masters/customers` wired to **real** Customer Master data
  and functionality, closing the gap Step 2O's follow-up flagged. (Disambiguation note: "Step
  2P" was already reserved elsewhere in this tracker — §4/§9/§10 and `RBAC_AUDIT_REPORT.md` §10
  — for the unrelated "retire legacy `/admin` Roles tab" plan, not yet started. Same situation as
  Step 2N's API-guards sub-step: rather than renumber already-cross-referenced steps, this one is
  suffixed "(Customer Master)" to keep both distinct. The `/admin` retirement plan remains
  Step 2P with no suffix.) `/masters/customers/page.tsx` now
  uses real Customer Master data and the guarded Customer APIs: it runs the same
  `prisma.customer.findMany`/auto-seed-from-CRM/stats logic `/customers/page.tsx` runs, against
  the same `Customer` table, through the **same already-guarded** `GET`/`POST
  /api/customers/master` and `PATCH`/`DELETE /api/customers/master/[id]` (Steps 2B/2C/2N). No
  new API was created and no API guard was loosened. **Component reuse, not duplication:**
  rather than rewriting Customer Master logic a second time, `/masters/customers/page.tsx` now
  imports `@/app/customers/CustomerMasterClient` directly — the same proven, real component
  `/customers` already uses (live list, search/filter by name/district/state/GST, create, edit,
  delete, Import from CRM, duplicate-detection/merge) — matching this codebase's existing
  cross-route reuse convention (e.g. `finance/cash-book` re-using `finance/bank-book`
  components/data). **Active mock-data rendering removed:** `/masters/customers/page.tsx` no
  longer imports its own folder's `CustomerMasterClient.tsx` (the `MOCK_CUSTOMERS`-backed
  preview) or `deriveCustomerCaps`/`isAccounts`/`isOperationsHead` (which existed solely to feed
  that preview's capability prop). Both the mock client and `data.ts` remain on disk, unchanged
  in substance, each with a new header comment: "Preview-only mock data retained for reference.
  Do not use for production Customer Master rendering." — confirmed safe to leave in place since
  a repo-wide search found no other file imports either one. **Button-level capabilities
  preserved, not stripped:** the reused component's existing `isManager`-gated buttons (Import
  from CRM, Find Duplicates, Delete restricted to managers; Add/Edit open to all viewers with
  VIEW access) carry over unchanged — this is the same real capability gating `/customers` has
  used in production, not a new or weaker scheme, and not a full migration of button caps to
  `access-control` (out of scope this step; the 14 enterprise mock components under
  `masters/customers/components/` — `CustomerProfile`, `CustomerSiteManager`,
  `CustomerContactManager`, etc. — are untouched and still on disk for the eventual richer
  backend-wiring phase). **Page guard unchanged:** `hasPermission(userId,"Masters",
  "CustomerMaster","VIEW")` `||` `isManager`, redirecting to `/dashboard` — identical to Step 2N,
  not touched this step. `/customers` was **not redirected and not deleted** — it still renders
  the same `CustomerMasterClient` directly and remains fully functional; both routes are now
  functionally equivalent (same component, same data, same APIs), which is the prerequisite the
  next step needs before converting `/customers` to a redirect. No database schema, migration,
  Customer Master API contract change, Vendor Master change, or Finance module change was made.

- ✅ **Step 2Q (Customer Master)** — Legacy `/customers` route converted to a server-side
  redirect to `/masters/customers`, the final Customer Master consolidation step. (Disambiguation
  note, same pattern as Step 2N's "(API guards)" and Step 2P's "(Customer Master)" sub-steps:
  "Step 2Q" was already reserved elsewhere in this tracker — §2/§4 and `RBAC_AUDIT_REPORT.md`
  §39-41/§263 — for the unrelated "decide migrate-vs-delete for `AppRole`/`RolePageAccess`" plan,
  not yet started. Suffixed "(Customer Master)" to keep both distinct; the `AppRole`/
  `RolePageAccess` decision remains plain Step 2Q.) Pre-check confirmed before redirecting:
  `/masters/customers/page.tsx` imports the live `@/app/customers/CustomerMasterClient` (not
  mock data — Step 2P), and a line-by-line comparison of `/customers/page.tsx`'s prior rendering
  logic against `/masters/customers/page.tsx` found **zero remaining unique functionality** —
  both ran the identical `prisma.customer.findMany`/auto-seed/stats query and rendered the
  identical component. `src/app/customers/page.tsx` now matches this codebase's existing
  redirect-page convention (same shape as `src/app/finance/vendors/page.tsx` → `/masters/vendors`):
  a bare `export default function CustomersRedirectPage() { redirect("/masters/customers"); }`,
  with no `getSession()`/permission check of its own — permission enforcement is left entirely to
  `/masters/customers`'s own guard, which a logged-out or unpermitted user now reaches via this
  redirect and is turned back by exactly as before. **`CustomerMasterClient.tsx` (in
  `src/app/customers/`) was explicitly NOT deleted, renamed, or moved** — `/masters/customers`
  imports it directly and depends on it staying at that path; a one-line comment was added above
  the component noting it's shared and actively rendered from `/masters/customers`. **Internal
  link search:** `href="/customers"`, `router.push("/customers"`, `redirect("/customers"`, and a
  plain `"/customers"` string search across `src/` found **no active links** — the only match is
  `Topbar.tsx`'s breadcrumb-label `PATH_LABELS` entry (`{ prefix: "/customers", label: "Customer
  Master" }`), which is not a navigational link and is now effectively dead code (the URL bar
  will never show `/customers` again once the redirect fires), left unchanged per scope ("do not
  change comments/non-link references"). **Manual verification performed live** (dev server +
  browser preview, not just static analysis): unauthenticated `/customers` → `/masters/customers`
  → `/login` (session check); a non-permitted Employee (`Akshayah M`, no `CustomerMaster/VIEW`
  grant) hitting `/customers` → `/masters/customers` → `/dashboard` (permission check, confirms
  both routes' guards fire correctly in the same request chain); the Manager account (`Vijesh
  Vijayan`) hitting `/customers` → `/masters/customers` and landing on a fully real page — 98
  live customers from the database, working Search/State/Type filters, and the Import from
  CRM/Find Duplicates/Add Customer buttons all present. No database schema, migration, customer
  data, Customer Master API, Customer Master client logic, Vendor Master, or Finance change was
  made.

No step in this list is marked "Pending confirmation" — all are independently verifiable in
the current codebase as of this tracker's update.

---

## 4. Remaining RBAC Migration Tasks

| Step | Task | Status | Risk | Notes |
|---|---|---|---|---|
| 2I | Add freeze warnings to legacy `/admin` Roles UI and `rbac.ts` comments | **Done this step (2026-06-20)** | Low | `rbac.ts` top-of-file comment added; non-blocking banner added to `AdminClient.tsx`'s "Roles & Access" tab, directly above `<RolesClient />` |
| 2J | Align sidebar/navigation visibility with `access-control` | **Done this step (2026-06-20)** | Low — additive (OR'd with existing roles.ts checks), no link that was previously visible to a manager/Accounts user was removed | New `src/lib/access-control/navigation.ts` helper (`getNavigationCapabilities()`) loads all of a user's permissions once per request; `SidebarLinks.tsx`/`Navbar.tsx` now gate Masters and Finance Operations sub-items on it. Settings, Pipeline/People groups, and self-service Finance remain on the roles.ts bridge — see §10 for full detail |
| 2K | Align Settings landing/cards visibility with `access-control` | **Done this step (2026-06-20)** | Medium — additive (`bridgeAccess \|\| capability`), no manager/Ops Head/Head of Sales lost the landing page or any card; the five subpages still on `isManager`-only guards (Finance, Communication, Integration, Security, Performance) are a documented gap, not a regression introduced by this step | New `src/lib/access-control/settings-capabilities.ts` helper (`getSettingsCapabilities()`); `AdminConsole.tsx` now filters cards on it and shows an empty-state message when no card matches; CRM card falls back to the `isManager` bridge pending the Step 2L `Settings/CRM` catalogue gap |
| 2L | **Planning done (2026-06-20):** Finance Write Access-Control Plan created. **Implementation not started:** actually build the mapped Finance write APIs on `access-control`, add the catalogue gaps identified by the plan (`Finance/Voucher`, `Finance/Payment/EDIT`, `Finance/Advance/EDIT`, dedicated BankBook/CashBook/Conveyance/Reconciliation resources), and close the CRM-admin gap from Step 2F | **Plan: Done. Build: Not started** | Medium — without the catalogue gaps closed, any new Finance write API still risks an imprecise interim mapping (e.g. several distinct Voucher actions all falling back to `Finance/Payment/CREATE`); the existing CRM-admin gap (no `Settings/CRM` permission) still blocks completing Step 2F | See `docs/modules/finance/FINANCE_WRITE_ACCESS_CONTROL_PLAN.md` for the full 33-endpoint mapping, the 8 catalogue gaps, and the Finance-transaction-model branch/department Schema Gap. Adding `Settings/CRM` (VIEW/EDIT) to `PERMISSION_CATALOGUE` and migrating the 7 CRM-admin routes remains a separate, not-yet-started sub-task of this step. |
| 2M | Migrate Finance **read** APIs from `roles.ts`-only (`canManageFinance`, `isAccounts`, `isOperationsHead`) to `access-control` + own-scope rules | **Done this step (2026-06-21)** | Medium — additive (`access-control` permission OR'd with the existing `canManageFinance()` bridge), no Accounts/Operations-Head/Manager user lost access; employee self-service own-data access unchanged | New `src/lib/finance/access.ts` helper module (`canViewFinancePayments`, `canViewFinanceVouchers`, `canViewFinanceDashboard`, `canViewAllFinanceExpenses`, `canViewAllFinanceAdvances`, `canViewAllConveyance`, `isSelfFinanceRequest`). All 11 `/api/finance/*` GET routes now check the matching `access-control` permission first, falling back to `canManageFinance()` (or the equivalent inline `isManager\|\|isAccounts\|\|isOperationsHead` for conveyance) until Finance-Operations roles hold the real grant. See §11 below for the full route-by-route mapping and catalogue-gap detail. |
| 2N | Migrate Customer/Vendor Master **page-level** guards to `access-control` | **Done this step (2026-06-20)** | Low — additive bypass (`canView \|\| isManager`, matching the sidebar's existing manager-only bypass), no manager lost access; non-manager employees with no real grant now correctly lose access to `/masters/customers`/`/masters/vendors` — this is the intended fix, not a regression | `/masters/customers/page.tsx` and `/masters/vendors/page.tsx` now call `hasPermission(userId, "Masters", "CustomerMaster"\|"VendorMaster", "VIEW")`; legacy `/customers` remains session-only (unchanged, TODO added) — its retirement is Step 2O |
| 2O | Retire or redirect `/customers` legacy route | Not started | Low-Medium — functional overlap with `/masters/customers`; needs a product decision on which is canonical before any redirect | Blocked on a product decision, not a technical blocker |
| 2P | Retire `/admin` legacy route after safe replacement | Not started | Medium — `/admin` already `redirect()`s to `/settings/administration`'s `AdminClient`, but the embedded Roles & Access tab (now freeze-bannered) and several other tabs have no `/settings/*` equivalent yet | Cannot retire until every tab's functionality has a confirmed `/settings/*` home |
| 2Q | Retire `AppRole` / `RolePageAccess` after data migration decision | Not started | Low (no runtime consumers) but **data-loss risk if rushed** | Decide: migrate any real-world role customizations into `Role`/`Permission`/`UserRole`, or confirm they're fully superseded and safe to drop; do not delete the Prisma models until that decision is made and a DB backup exists |
| 2R | Remove dead `rbac.ts` enforcement helpers (`hasPermission`, `loadRolePermissions`) after no consumers remain | Not started | Low | Straightforward once Step 2Q is complete and the `/admin` Roles tab (Step 2P) is gone — `seedDefaultRoles()`/`PAGES`/`DEFAULT_ROLES` would need their own follow-up decision since they're still referenced by `/api/admin/roles*` |
| 2S | Close Finance permission catalogue gaps (`Finance/Voucher`, `Finance/BankBook`, `Finance/CashBook`, `Finance/Conveyance`) before building Finance write APIs | **Done this step (2026-06-21)** | Low — purely additive catalogue entries; no role assignment, schema, API behavior, or UI change; every `src/lib/finance/access.ts` helper still falls back through the prior bridge to `canManageFinance()`, so no current Manager/Accounts/Operations-Head user lost access | 4 new `Finance/*` resources added to `PERMISSION_CATALOGUE` (**22 new permission rows total** — Voucher 6 + BankBook 6 + CashBook 5 + Conveyance 5; corrected 2026-06-21, Step 2V, from an earlier "27" count that did not reconcile with these action lists). `Finance/Reconciliation` deliberately deferred — folds into the new `BankBook`/`CashBook` `APPROVE` actions instead, per the existing "avoid a parallel reconciliation surface" recommendation. See §12 below for full detail. |
| 2U | Seed/sync the Step 2S Finance catalogue entries into the dev database and verify | **Done this step (2026-06-21)** | Low — pure data sync against the dev DB (`u686730471_caveodev`); idempotent upsert, no deletes, no role-grant changes beyond the pre-existing Super-Admin-gets-all loop | Ran `npx tsx prisma/seed-admin-foundation.ts` against dev. Confirmed via read-only script: all 22 `Finance/{Voucher,BankBook,CashBook,Conveyance}` rows present (6+6+5+5 = 22), zero duplicate `(module,resource,action)` triples across all 101 permission rows, and the 4 pre-existing Finance resources (`Invoice`/`Expense`/`Payment`/`Advance`, 17 rows) untouched. **Settings → Identity → Permission Matrix UI gap found:** the API (`/api/admin/identity/permissions`) correctly returns all 101 live rows, but `PermissionMatrix.tsx`'s hardcoded `MODULE_GROUPS` constant only lists `Finance: ["Invoice","Expense","Payment","Advance"]` — the new resources will not render in the matrix grid until that array is updated. Not fixed this step (UI change out of scope) — **closed by Step 2V below.** No role grants changed beyond Super Admin (automatic, pre-existing loop). |
| 2V | Update Settings → Identity → Permission Matrix UI to display the new Finance resources | **Done this step (2026-06-21)** | Low — pure UI rendering change; no schema, API, permission-enforcement, or role-grant change | `PermissionMatrix.tsx`'s `MODULE_GROUPS` Finance entry extended to include `Voucher`, `BankBook`, `CashBook`, `Conveyance` (appended after the existing 4, per their documented action lists); `NOT_APPLICABLE` extended with the action gaps each new resource doesn't have in the catalogue (`Voucher` has no `IMPORT`/`ASSIGN`; `BankBook` has no `DELETE`/`ASSIGN`; `CashBook`/`Conveyance` have no `DELETE`/`IMPORT`/`ASSIGN`). Also corrected the "27 new rows" documentation error to the correct **22** wherever it appeared. See §14 below for full detail. |
| 2W | Decide and apply curated role grants for the new Finance permission resources | **Done this step (2026-06-21)** | Medium — additive only; extends `ROLE_GRANTS` for 2 existing roles, no schema/API/UI change, no role deleted or reset, `roles.ts`/`canManageFinance()` fallback untouched | `Finance Manager` granted full `Voucher`/`BankBook`/`CashBook`/`Conveyance` (22 permissions, matching its existing "Full Finance module + reports" description). `Business Head` granted only `Conveyance/VIEW`+`Conveyance/APPROVE` (2 permissions), extending its existing `Expense` approval pattern to the now-dedicated Conveyance resource — no `BankBook`/`CashBook`/`Voucher` access given to Business Head (no existing policy basis for ledger/voucher operations at that role). No "Accounts Team"/"Accounts Admin" role exists in the `Role` model (only the legacy `Employee.role` string "Accounts" exists, governed by `roles.ts`, a separate system) — documented as not applicable rather than invented. Sales Head, Sales Manager, Account Manager received no new grants. See §15 below for full detail. |
| 3A | Soft-delete migration plan (database safety prerequisite before Finance write APIs) | **Done this step (2026-06-21)** | None — documentation only, no schema/migration/API/UI/permission change | Not an RBAC-system step itself, but directly motivated by this tracker's own subject matter: `RBAC_AUDIT_REPORT.md`/`IMPLEMENTATION_STATUS_REPORT.md` both note that permission gaps plus hard deletes compound into high-impact, unrecoverable data-loss risk. Created `docs/database/SOFT_DELETE_MIGRATION_PLAN.md` — inventoried all 18 hard-delete routes under `src/app/api`, identified `Customer`/`Collection`/`Payment` as the current real risk (confirmed `Employee`→`Collection`→`Payment` is an `ON DELETE CASCADE` chain at the SQL level) and `Expense`/`Voucher`/`EmployeeAdvance`/`TravelClaim`/`Ledger` as zero-delete-routes-yet future risk, ahead of those write APIs being built. No role grants, permissions, or RBAC enforcement logic were touched — cross-referenced here per this step's own brief, full detail lives in the new plan doc. |
| 3B-0 | Soft-delete decision log / scope lock (sign-off step before Step 3B schema migration) | **Done this step (2026-06-21)** | None — documentation only, no schema/migration/API/UI/permission change | Created `docs/database/SOFT_DELETE_DECISION_LOG.md`, locking the §13 open decisions from Step 3A's plan into final answers. Soft-delete decision log created. Step 3B schema migration scope locked to exactly 7 models: `Customer`, `Vendor`, `Expense`, `EmployeeAdvance`, `TravelClaim`, `Payment`, `Collection`. Voucher and Ledger confirmed as void/reversal-only, not `deletedAt` models — Voucher keeps its existing `voidedAt`/`voidReason` pattern, Ledger stays reversal-only via `pairedLedgerId`. Employee delete lifecycle deferred to a separate scope (deactivation, not soft-delete, is the likely future direction). Restore API and "view deleted records" both deferred. `Permission`/`UserRole`/`DataAccessPolicy` confirmed excluded (revoke semantics, not soft-delete). `AuditLog` reuse confirmed — no new audit model. No schema, migration, API, or UI change was made. `npx prisma validate` passes (no-op confirmation — schema untouched). |
| 3B | Soft-delete schema fields added to the 7 approved Phase A models; migration generated and applied to dev DB only | **Done this step (2026-06-21)** | Low — purely additive (`ADD COLUMN`/`CREATE INDEX`, all nullable), no destructive SQL, no API/UI behavior change, no read filter or DELETE route touched | Added `deletedAt DateTime?` / `deletedById Int?` / `deleteReason String? @db.Text` to `Customer`, `Vendor`, `Expense`, `EmployeeAdvance`, `TravelClaim`, `Payment`, `Collection` in `prisma/schema.prisma`, each placed next to existing `createdAt`/`updatedAt` audit fields, each with a new `@@index([deletedAt])`. Voucher/Ledger/Employee/RBAC models intentionally untouched, per the Step 3B-0 decision log. **`npx prisma migrate dev` could not be used** — first attempt failed with `P1000` (transient credential rejection, resolved on retry), second attempt failed with `P3014` (Hostinger's MySQL user has no `CREATE DATABASE` privilege for Prisma's shadow database — the same documented limitation prior migrations in this project hit, see `PROJECT_MEMORY.md` §0 Phase 8/Integration/Security Center notes). Worked around using this project's existing pattern: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` to diff the live dev DB against the new schema (no shadow DB required), then a new one-off `prisma/apply-soft-delete-fields-phase-a.mjs` (mariadb driver, hard-coded dev-DB-name guard) to apply the 28 additive statements, then `npx prisma migrate resolve --applied 20260621120000_add_soft_delete_fields_phase_a` → `npx prisma generate`. **The raw diff also surfaced pre-existing, unrelated schema drift** (missing FKs on `workflow_definition`/`approval_request`/`master_definition`/`integration_*`/`employee_target`/`notification_queue`, an index rename on `api_key_reference`) — none of that was applied; the migration file was trimmed to only the 7 models' `ADD COLUMN`/`CREATE INDEX` statements before running. DB-level verification (read-only `information_schema.COLUMNS` query) confirmed exactly the 7 approved models have the 3 new columns and `Voucher`/`Ledger`/`Employee` have none. `npx prisma validate`, `npx tsc --noEmit`, and `npm run build` (159 pages) all pass. |
| 3C | Read filters added so normal reads on the 7 Phase A models exclude soft-deleted records | **Done this step (2026-06-21)** | Low — read-only filter additions (`deletedAt: null`), no schema/migration change, no DELETE route converted, no response shape changed | Audited every `prisma.{customer,vendor,expense,employeeAdvance,travelClaim,payment,collection}.{findMany,findFirst,findUnique,count,aggregate,groupBy}` call under `src/` (excluding generated Prisma client code) and added `deletedAt: null` to each genuine "active record" read: Customer Master list/detail-merge/dedup/suggestions/import-dedup (`api/customers/master/route.ts`, `.../deduplicate/route.ts`, `api/customers/suggestions/route.ts`, `lib/customer-import.ts`, `app/masters/customers/page.tsx`), the lead-conversion existing-customer lookup (`api/pipeline/leads/[id]/convert/route.ts`, `findUnique` → `findFirst`), Finance Expense list/detail/dashboard (`api/finance/expenses/route.ts`, `.../[id]/route.ts`, `api/finance/dashboard/route.ts`, `api/expenses/route.ts`), EmployeeAdvance list (`api/finance/advances/route.ts`), TravelClaim list (`api/finance/conveyance/route.ts`), Payment ledger/today-summary (`api/payments/route.ts`, `lib/payments.ts` — `findUnique` → `findFirst` for the Collection lookups inside `syncCollectionTotals`/`reconcileOpeningBalance`), and Collection across every list/dashboard/KRA-engine read site (`api/collections/route.ts` GET, `api/advances/[id]/apply/route.ts`, `api/import/route.ts` upsert-dedup check, `api/kra/sync-achievements/route.ts`, `lib/kra-engine.ts` — 5 call sites, `app/page.tsx`, `app/dashboard/page.tsx` — 2 call sites, `app/accounts/page.tsx`, `app/collections/page.tsx`, `app/employees/[id]/page.tsx`). **`Vendor` has no application-level read queries at all** (`/masters/vendors` remains UI-only mock data per `docs/PROJECT_MEMORY.md` — only generated Prisma client files reference `prisma.vendor`), so there was nothing to filter; documented rather than skipped silently. **No DELETE route was converted** — the two `findUnique` ownership-check reads inside `api/collections/[id]/route.ts`'s PUT/DELETE handlers were deliberately left untouched (write-path internals, not normal reads; DELETE conversion is Step 3D). No API response shape, UI, or authorization logic changed — Step 2M/2R/2S self-service `employeeId` scoping was preserved exactly, with `deletedAt: null` merged alongside it. No small helper was created — each call site's `where` shape differs enough (merged with owner/date/status filters) that inline `deletedAt: null` was clearer per-site than a shared constant. `npx prisma validate`, `npx tsc --noEmit`, `npm run build` (159 pages), and `npm run lint` all pass (lint's pre-existing failures are all in files this step did not touch). |
| 3D | Customer and Collection hard-delete paths converted to soft delete, with AuditLog entries | **Done this step (2026-06-21)** | Medium — changes delete *behavior* for the two confirmed live-risk models, but additive/non-destructive: rows are never physically removed, response shapes unchanged, existing UI delete buttons keep working unmodified | Inventoried every `prisma.{customer,collection}.{delete,deleteMany}` call under `src/` (excluding generated code) — found and converted all 4: `DELETE /api/customers/master/[id]` (single `delete()`), `POST /api/customers/master/deduplicate` (merge `deleteMany()`), `DELETE /api/collections/[id]` (single `delete()`), `DELETE /api/collections` (bulk `deleteMany()`). Each now: re-checks `deletedAt: null` before acting (404 if already gone), sets `deletedAt`/`deletedById`/`deleteReason` via `update()`/`updateMany()` instead of `delete()`/`deleteMany()`, and writes one `AuditLog` row per affected record (`action: "SOFT_DELETE"`, `entityType: "customer"\|"collection"`, `entityId`, `performedById`, `notes` = the reason, `changes` = JSON snapshot of the pre-delete row) — reusing the exact `prisma.auditLog.create()` shape already proven by `DELETE /api/pipeline/leads/[id]`, no new audit helper/framework built. **Reason handling:** neither the Customer Master nor Collections delete buttons send a request body today (confirmed by reading `CustomerMasterClient.tsx`/`CollectionsClient.tsx`) — `deleteReason` is accepted as an optional JSON body field on all 4 routes and falls back to `"Deleted by user"` (single deletes) or `"Merged into customer <keepId>"` (merge) when absent, so the existing UI keeps working with zero changes; documented as a temporary limitation, not a UI change. **Merge-delete confirmed safe to soft-delete**: `Customer` has no `@unique` constraint on `name`/`gstNo` in `prisma/schema.prisma`, so soft-deleting merged-away duplicates alongside the still-active kept customer cannot collide — no physical-delete exception was needed. **Bulk Collection delete**: converted to one `updateMany()` (soft-delete) + one `auditLog.create()` per affected record, all inside a single `prisma.$transaction([...])` for atomicity — audited per-record as required, not a silent bulk soft-delete. **Live-verified in the dev DB** (disposable test rows, created and cleaned up within this step, never touched real data): single Customer delete, single Collection delete, bulk Collection delete, and Customer merge-delete all set the correct `deletedAt`/`deletedById`/`deleteReason`, wrote the correct `AuditLog` row, left the row physically present, and were immediately excluded from `GET /api/customers/master` / `GET /api/collections` afterward. **No Vendor/Expense/EmployeeAdvance/TravelClaim/Payment/Voucher/Ledger/Employee delete behavior touched** — confirmed via repo-wide search that no `prisma.vendor.delete*` call exists anywhere (Vendor Master still has no real DELETE API). `npx prisma validate`, `npx tsc --noEmit`, `npm run build` (159 pages), and `npm run lint` (589 problems, identical to the Step 3C baseline — confirmed no new issues) all pass. |
| 3E | Customer and Collection delete UI flows now require delete reason | **Done this step (2026-06-21)** | Low — UI/API-caller change only; no schema, migration, read filter, API response shape, authorization logic, or restore route touched | Replaced the old `window.confirm()`-based delete flows in `CustomerMasterClient.tsx` (new `DeleteCustomerModal`) and `CollectionsClient.tsx` (new shared `DeleteReasonModal`, used for both single and bulk delete) with a required-reason confirmation dialog, following the existing `DeleteLeadModal` pattern (`pipeline/leads/LeadsClient.tsx`) — same overlay/card styling, same disabled-until-non-empty submit button, same non-closing inline error state. All three flows now send a real user-entered `deleteReason` in the request body (`DELETE /api/customers/master/[id]`, `DELETE /api/collections/[id]`, `DELETE /api/collections` bulk with `ids`+`deleteReason`) instead of relying on the Step 3D API fallback string (`"Deleted by user"`). The API fallback reason remains in place only for non-UI or legacy callers — no API route code was changed, since no body-parsing bug was found. Customer duplicate-merge delete (`POST /api/customers/master/deduplicate`) intentionally left without a reason prompt — its system-generated reason (`"Merged into customer <keepId>"`, from Step 3D) already satisfies the accountability requirement for a system-initiated delete. **Live-verified in the dev DB** (disposable test rows, created and cleaned up within this step): Customer single delete, Collection single delete, and Collection bulk delete (2 rows) all sent the entered reason through to `deletedAt`/`deletedById`/`deleteReason` and a matching `AuditLog` row, and the Delete button was programmatically confirmed `disabled` before a reason was entered and enabled after. `npx prisma validate`, `npx tsc --noEmit`, `npm run build` (159 pages), and `npm run lint` (589 problems, identical to the Step 3D baseline — confirmed no new issues) all pass. |
| 3F | AuditLog writing standardized for soft-delete paths | **Done this step (2026-06-21)** | Low — pure refactor, no API/UI behavior changed | New `src/lib/audit-log.ts` (`logAuditEvent`, `logSoftDelete`, `AUDIT_ACTIONS` constants) supports both the default `prisma` client and a `Prisma.TransactionClient` via an optional `tx` param. Refactored all 4 existing Customer/Collection soft-delete `AuditLog` writes to use it: `DELETE /api/customers/master/[id]` (single `logSoftDelete` call), `POST /api/customers/master/deduplicate` (merge — `logSoftDelete` mapped inside the existing `prisma.$transaction([...])` array, one call per merged-away record), `DELETE /api/collections/[id]` (single), `DELETE /api/collections` (bulk — `logSoftDelete` mapped inside the existing `updateMany()` + per-record-audit `$transaction([...])` array). Preserved exactly: same `action`/`entityType`/`notes`/`changes` payload shape, same transaction grouping, same API response shapes (`{ok:true}` / `{success:true}` / `{ok:true,deleted:N}` / `{success:true,deleted:N}`), same permission guards. The pipeline lead hard-delete (`DELETE /api/pipeline/leads/[id]`) was deliberately left unrefactored — different `action` ("delete" vs "SOFT_DELETE") and `entityType` casing ("lead"), a genuinely different delete semantic, not an oversight; documented as a future candidate, not silently skipped. **Live-verified** against disposable dev-only test rows for all 4 refactored routes (Customer single delete, Customer merge-delete, Collection single delete, Collection bulk delete) — confirmed via direct DB read that the resulting `AuditLog` rows are byte-for-byte identical in shape to the pre-refactor rows, and that the bulk-delete transaction still wrote one `AuditLog` row per affected `Collection`. `npx prisma validate`, `npx tsc --noEmit`, `npm run build` (159 pages), and `npm run lint` (589 problems, identical to the Step 3E baseline — confirmed no new issues) all pass. |
| 3G | Decimal money migration plan created | **Done this step (2026-06-21)** | None — documentation only, no schema/migration/API/UI/calculation-logic change | Created `docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md`. Inventoried every money-like `Float`/`Float?` field across `prisma/schema.prisma` (35 fields across `Collection`, `Payment`, `OrderAdvance`, `Notification`, `FinAccount`, `Ledger`, `Expense`, `Voucher`, `EmployeeAdvance`, `TravelClaim`, `ApprovalRule`, `ExpenseLimitRule`, `ConveyancePolicy`, `AdvancePolicy`, `CustomerCreditPolicy`, `SalesFunnel`, `CrmLead`, `CrmOpportunity` — classified Critical/Important/Later) and explicitly excluded 12 non-money numeric fields (distance, GPS coordinates, percentages, ratings, metric-dependent KRA target values) so a future implementation step does not assume every `Float` is money. Documented the recommended `Decimal(18,2)` money standard, `Decimal(10,4)` for per-unit rate fields (`ratePerKm`), and `Decimal(8,4)` for tax/percentage fields; the API Decimal-serialization risk (Prisma `Decimal` is not a plain JS `number`) with a recommendation to build one central `src/lib/money.ts` helper before any conversion, instead of scattering `Number(decimal)` calls; calculation rules retiring the existing `round2()`/epsilon-comparison workaround in `src/lib/payments.ts` (cited as the concrete, present symptom of the Float-precision risk this plan addresses); a 7-phase (A–G) migration safety plan and MySQL `ALTER COLUMN` risk notes; and a proposed Step 3H–3M implementation sequence. **No schema field was converted, no migration was generated, no API or UI code was changed, no calculation logic was changed.** `npx prisma validate` passes (no-op confirmation — schema untouched, same as the Step 3B-0 decision-log step's own validation). |
| 3H | Money helper foundation added before Decimal schema migration | **Done this step (2026-06-21)** | None — pure addition, no schema/migration/API response shape/UI/Finance-write-API change | Created `src/lib/money.ts`, the central helper proposed in `docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md` §5/§9. Built on Prisma's own `Decimal` (imported from `@prisma/client/runtime/client` directly — not the generated client, keeping the module side-effect-free and dependency-free; no new npm package added). Exports: parsing (`toMoneyDecimal`, `parseMoneyInput`, `safeMoneyDecimal`), serialization (`moneyToString`, `serializeMoney`, `moneyToNumberForDisplay`), rounding/formatting (`roundMoney`, `formatMoney`), arithmetic (`addMoney`, `subtractMoney`, `multiplyMoney`, `divideMoney`), and comparisons (`isZeroMoney`, `isPositiveMoney`, `isNegativeMoney`) — all strict (throw `InvalidMoneyInputError` on null/undefined/non-finite/invalid input) except the explicitly-named lenient helpers (`safeMoneyDecimal`, and the display/serialization functions built on it), per the "null becomes zero only when explicitly requested" design principle. Verified via a temporary self-check script (23 checks, all passing — `addMoney("0.1","0.2")` → `"0.30"`, `roundMoney("10.555")` → `"10.56"`, division-by-zero rejected, invalid-type rejection for strings/NaN/Infinity/objects/booleans) then deleted, per this step's instruction not to introduce a new test framework. **No money field conversion done yet** — confirmed via diff that only `src/lib/money.ts` plus documentation changed; no `src/app/api/finance/*` route, `src/lib/payments.ts`, or any UI component was wired to the new helper, and `prisma/schema.prisma` remains entirely `Float`/`Float?` for every money field. `npx prisma validate`, `npx tsc --noEmit`, `npm run build` (159 pages), and `npm run lint` (589 problems, identical to the Step 3G baseline — confirmed no new issues) all pass. |
| 3I | Money helper dry-run integration into one read-only calculation path | **Done this step (2026-06-22)** | None — internal arithmetic only; no schema/migration/API-contract/UI change | Wired `src/lib/money.ts` (Step 3H) into exactly one low-risk read-only path: the running-balance accumulation loop in `GET /api/finance/bank-book` (`src/app/api/finance/bank-book/route.ts`). Replaced the per-step `running = r2(running ± entry.amountLakhs)` float loop with `addMoney`/`subtractMoney` on a `Decimal` seeded via `toMoneyDecimal(periodOpeningBalance)`, converting back to `number` only at the loop boundary via `moneyToNumberForDisplay` — deferring rounding to the route's existing final `fmtMoney()` call instead of rounding every intermediate step (per the Decimal Migration Plan §6 calculation rules). No other line in the route changed; response field names/types/JSON shape are unchanged. Verified equivalent via a standalone Node check (old `r2`-per-step loop vs. new `addMoney`/`subtractMoney` loop, same opening balance + 5 mixed credit/debit entries including float-noise values) — final `fmtMoney()`-formatted strings are identical; raw per-step Decimal values can differ in the last digit before formatting, which is expected and correct. Live HTTP verification was not practical (route requires an authenticated session against the remote Hostinger dev MySQL DB) — documented as a limitation; static equivalence check plus full validation suite used instead. **No Decimal field migration performed.** `npx prisma validate`, `npx tsc --noEmit`, `npm run build` (all routes incl. `/api/finance/bank-book` compiled), and `npm run lint` (589 problems, identical to the Step 3H baseline — confirmed no new issues) all pass. |
| 3J | Money helper dry-run integration extended to Cash Book running-balance | **Done this step (2026-06-22)** | None — internal arithmetic only; no schema/migration/API-contract/UI change | Applied the exact Step 3I pattern to the second isolated read-only path: the running-balance accumulation loop in `GET /api/finance/cash-book` (`src/app/api/finance/cash-book/route.ts`). Replaced `running = r2(running ± entry.amountLakhs)` (Cash In credit → adds, Cash Out debit → subtracts) with `addMoney`/`subtractMoney` on a `Decimal` seeded via `toMoneyDecimal(periodOpeningBalance)`, converting to `number` only at the loop boundary via `moneyToNumberForDisplay`. All filters (date range, account, employee, type, expense category, status, search), pagination, `mapTxnType`, and `canViewFinanceCashBook` authorization untouched — response field names/types/JSON shape unchanged. Verified equivalent via a standalone Node check (old `r2`-per-step loop vs. new `addMoney`/`subtractMoney` loop, opening balance + 6 mixed credit/debit entries incl. `0.1+0.2`-style float-noise values) — identical `fmtMoney()`-formatted output. Live HTTP verification not practical (remote Hostinger dev MySQL DB, authenticated session required) — same documented limitation as Step 3I; static equivalence check used instead. **Bank Book (3I) and Cash Book (this step) are now the only two routes using the Decimal-safe internal running-balance pattern — no other Finance route touched, no Decimal field migration performed.** `npx prisma validate`, `npx tsc --noEmit`, `npm run build` (all routes incl. `/api/finance/cash-book` compiled), and `npm run lint` (589 problems, identical to the Step 3I baseline — confirmed no new issues) all pass. |
| 3K | Money helper dry-run integration extended to Expense / Advance / Conveyance totals | **Done this step (2026-06-22)** | None — internal arithmetic only; no schema/migration/API-contract/UI change | Money helper dry-run integration extended to Expense totals; Advance and Conveyance inspected and left untouched (no isolated calculation found). Wired `addMoney`/`moneyToNumberForDisplay` into the isolated read-only "base + GST = total" additions in `GET /api/finance/expenses` (6 summary aggregates — `totalExpenses`, `todayExpenses`, `pendingApprovalAmount`, `approvedExpenses`, `customerExpenses`, `employeeClaimsPending` — plus the per-row `totalAmount`) and `GET /api/finance/expenses/[id]` (the single `totalAmount` field), replacing `r2(base + gst)` with `moneyToNumberForDisplay(addMoney(base, gst))` ahead of the route's existing `fmtMoney()` boundary. The now-dead local `r2()` helper was removed from both files (no remaining call sites) to avoid an unused-var lint issue; `fmtMoney()` is unchanged and still produces every response string. **`GET /api/finance/advances` and `GET /api/finance/conveyance` were reviewed and intentionally left unchanged** — `advances` has no JS-level addition combining multiple values (every summary figure is a single Prisma `_sum` formatted directly), and `conveyance` is a pure read-only pass-through with no calculation at all; per this step's own "leave untouched and document" instruction, nothing was wired there. Authorization (`canViewAllFinanceExpenses`), `deletedAt: null` filters, date/status/category/vendor/search filters, pagination, and response status codes are all unchanged in both edited routes. Verified equivalent via a standalone Node check (`r2(base+gst)` vs. `moneyToNumberForDisplay(addMoney(base,gst))` across 5 representative pairs incl. `0.1+0.2`/`10.555+1.895` and a 3-way addition mirroring `employeeClaimsPending`) — identical `fmtMoney()`-formatted output in every case. Live HTTP verification not practical (remote Hostinger dev MySQL DB, authenticated session required) — same limitation as Steps 3I/3J; static equivalence check used instead. **No Decimal field migration yet.** `npx prisma validate`, `npx tsc --noEmit`, `npm run build` (all routes incl. `/api/finance/expenses` compiled), and `npm run lint` (589 problems, identical to the Step 3J baseline — confirmed no new issues, including no new unused-var warnings from the `r2()` removal) all pass. |
| 3L | Money helper dry-run integration extended to Finance Dashboard totals | **Done this step (2026-06-22)** | None — internal arithmetic only; no schema/migration/API-contract/UI change | Money helper dry-run integration extended to Finance Dashboard totals; Bank Book, Cash Book, Expense, and Dashboard now use Decimal-safe internal arithmetic where selected; no Decimal field migration yet. Wired `addMoney`/`subtractMoney`/`moneyToNumberForDisplay` into every JS-level total calculation in `GET /api/finance/dashboard` (`src/app/api/finance/dashboard/route.ts`) that combines multiple values: base+GST additions (`todayExp`, `monthlyExp`, `customerExp`, the per-category `expenseBreakdown.amount`, and `topExpenseCategories`'s `amt`), the two net-flow subtractions (`netCashFlow` = cashIn−cashOut, `netBankFlow` = credits−debits), and the 3-way running `monthMap` accumulation feeding `monthlyExpenseTrend`. All replaced `r2(...)` call sites now use `moneyToNumberForDisplay(addMoney(...)/subtractMoney(...))` immediately before the route's existing `fmtMoney()` formatting. **Deliberately left unchanged**: `cashBalance`, `bankBalance`, `advOutstanding`, `claimsPending`, `totalCashIn`, `totalCashOut`, `totalCredits`, `totalDebits` (each a single `_sum` aggregate, never combined in JS) and the `percentage` ratio calculation (`(amt/totalForPct)*100` — a ratio, not a money addition, so `r2()` was kept and **not** removed from this file, unlike the Step 3K Expense-route removal). Authorization (`canViewFinanceDashboard`), period resolution, `branchId`/`accountId` filters, and every `deletedAt: null` query untouched — response shape unchanged. Verified equivalent via a standalone Node check covering base+GST addition (4 pairs incl. `0.1+0.2`/`10.555+1.895`/an all-zero pair), net-flow subtraction (4 pairs incl. `0.3−0.1`), and the 3-way monthly accumulation (3 chained entries) — identical `fmtMoney()`-formatted output in every case. Live HTTP verification not practical (remote Hostinger dev MySQL DB, authenticated session required) — same limitation as Steps 3I–3K; static equivalence check used instead. `npx prisma validate`, `npx tsc --noEmit`, `npm run build` (all routes incl. `/api/finance/dashboard` compiled), and `npm run lint` (589 problems, identical to the Step 3K baseline — confirmed no new issues) all pass. |
| 3M | Final money-helper dry-run sweep across remaining Finance read routes | **Done this step (2026-06-22)** | None — no code changed; review-only step | Final money-helper dry-run sweep completed across remaining Finance read routes; no Decimal field migration yet. Inspected the 6 Finance read routes not covered in Steps 3I–3L: `GET /api/finance/accounts` (pure pass-through — `openingBalance`/`currentBalance` formatted directly, no JS combination), `GET /api/finance/vouchers` (only direct DB `_sum` value — `totalVoucherAmount = fmtMoney(r2(totalAmountAgg._sum.amountLakhs ?? 0))` rounds a single aggregate, no second value added/subtracted in JS), `GET /api/finance/vouchers/[id]` (not suitable — its only money-shaped logic is `amountInWords()`, a unit-conversion + whole/paise text-decomposition helper, not a money addition/subtraction that `src/lib/money.ts` is designed for), `GET /api/finance/voucher-sequences` (pure pass-through — no money fields at all, only integer voucher-numbering counters), and `GET /api/finance/advances` / `GET /api/finance/conveyance` (reconfirmed from Step 3K: single-`_sum`-only and pure-pass-through respectively). **Result: zero files changed.** None of the 6 routes contains a JS-level addition/subtraction combining multiple monetary values — the qualifying criterion used consistently across Steps 3I–3L. No live verification or equivalence check was needed (no calculation logic changed). Validation run anyway per this step's instruction: `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅ (all routes compiled, unchanged), `npm run lint` → 589 problems, identical to the Step 3L baseline (expected, zero file changes). **Dry-run sweep now complete across every Finance read route** — Bank Book, Cash Book, Expense (list+detail), and Dashboard (3I–3L) were wired; Accounts, Vouchers, Voucher Detail, Voucher Sequences, Advances, and Conveyance were reviewed and correctly have nothing to wire. |
| 3N | Decimal conversion readiness check for critical Finance money fields | **Done this step (2026-06-22)** | None — documentation/audit only, no schema/migration/API/UI/data change | Decimal conversion readiness check completed; no Decimal schema migration yet. Created `docs/database/DECIMAL_CONVERSION_READINESS_CHECK.md` covering the 5 critical models named for this batch — `Expense`, `EmployeeAdvance`, `TravelClaim`, `Payment`, `Collection` (`Voucher`/`Ledger` explicitly excluded per their separate void/reversal lifecycle). Inventoried 13 candidate money/rate fields with exact `prisma/schema.prisma` names and recommended Decimal types, plus an exclusion table for policy/CRM/Voucher/Ledger fields. **Live dev data profiling could not be completed** — a read-only profiling script (Prisma `findMany` + in-JS min/max/null/negative/scale-exceed counting, confirmed `DATABASE_URL` pointed at the dev DB `u686730471_caveodev` before any query) was attempted via both a direct `mariadb` connection and the app's own `src/lib/prisma.ts` client; every attempt was rejected with `Access denied` (the connecting IP is evidently not on Hostinger's Remote MySQL allowlist for this sandbox). The profiling methodology and an empty results table are documented for re-run from a whitelisted machine; the temporary script was deleted, leaving no scratch files. Reviewed API response impact across 11 routes and UI impact across 8 areas — flagged `GET /api/finance/conveyance` and the Collections routes/UI as highest-risk (raw unformatted numbers, no Decimal-safe boundary yet); `GET /api/finance/advances` flagged Medium (not yet wired to `money.ts`, per Step 3K's findings). Documented the MySQL `ALTER COLUMN` migration-SQL risk plan (no shadow DB, manual diff/apply/resolve pattern, backup-before-apply, no destructive statements). **Recommended first batch: conservative Option A** (`Expense`/`EmployeeAdvance`/`TravelClaim` only, 9 fields) — deferring `Payment`/`Collection` (4 fields) to a second batch since their conversion is bundled with retiring `src/lib/payments.ts`'s `round2()`/epsilon-comparison workaround. **Final determination: schema conversion is blocked, not ready** — pending the live data profile, which is the named next step (Step 3O). `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅ — all reconfirmations since no code was changed. |
| — | **Database/Finance implementation decision: Money Unit Policy locked before Step 3O** | **Done this step (2026-06-22)** | None — documentation/policy decision only, no schema/migration/API/UI/data change | Business-rule decision: Lakhs-based values are restricted to CRM `Lead`/`Opportunity`/Sales-pipeline-estimation fields only; every Finance/Accounting model (`Expense`, `EmployeeAdvance`, `TravelClaim`, `Payment`, `Collection`, `Voucher`, `Ledger`, Bank Book, Cash Book, `FinAccount`, Reports, Tally export, GST/tax calc, reimbursements, settlements, vendor/customer payments) must use actual INR going forward. Added `docs/database/DECIMAL_CONVERSION_READINESS_CHECK.md` §0 with a field-by-field verification (not assumption) confirming every Finance `*Lakhs` field genuinely and intentionally stores ₹ Lakhs today — via `prisma/seed-dev-finance.ts` sample data, the Collections UI's literal `"L"` suffix on raw input, and 9+ independent UI unit-converters (`lakhsToRupees()`/`fmtINRfromLakhs()`) — none of which are misleadingly named; `TravelClaim.amountRupees`/`ratePerKm` are the sole exception, already real INR/real ₹-per-km. Flagged a new cross-cutting risk: `Collection.invoiceValueLakhs`/`amountReceivedLakhs` feed `src/lib/kra-engine.ts`'s employee KRA scoring (6 call sites), a non-Finance domain the policy doesn't address — converting Collection's unit without updating the KRA engine in lockstep would corrupt KRA achievement math by 100,000×; flagged as an explicit open decision. Revised the readiness check's §8/§10/§11: schema conversion remains blocked, now on two grounds — the unresolved §4 data-profile gap (carried over from Step 3N) and the newly-identified need to design (not implement) a Lakhs→INR value transformation coordinated with the Decimal type change and every UI/API consumer. Step 3O's scope expanded accordingly (still no implementation). Cross-referenced in `docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md` and `docs/PROJECT_MEMORY.md`. **No schema, migration, API route, UI component, or database row was changed.** |
| 3O | Live dev data profile completed + Lakhs-to-INR transformation design + KRA-engine impact + Release 1/2 sign-off ledger | **Done this step (2026-06-22)** | None — read-only profiling, design, and documentation only; no schema/migration/API/UI/data change | Live dev data profile completed (the Step 3N blocker resolved); Lakhs-to-INR transformation design documented; Collection/KRA impact documented; first conversion release scope recommended; no schema/runtime behavior changed. Confirmed `DATABASE_URL` → `u686730471_caveodev` before running a read-only Prisma `findMany`+in-JS-aggregation script across all 13 candidate fields (deleted immediately after, no scratch files left). Result: `Expense`/`TravelClaim` have 0 rows in dev; `EmployeeAdvance` (1 row, ₹0.5L), `Payment` (1 row, ₹1.61L), `Collection` (94 rows, ₹0.003L–₹77.88L) are all clean — zero negatives, zero suspiciously-large values, every >2dp scale-exceed count explained by the GST back-calc formula, not bad data. Added to `docs/database/DECIMAL_CONVERSION_READINESS_CHECK.md`: a **Finance Lakhs-to-INR Transformation Design** table (exact `value*100000` transform per field, target `Decimal` type, Release 1/2 placement — `TravelClaim.ratePerKm`/`amountRupees` need no value transform, already real INR); a **Code Converter/UI Label/API-Comment Inventory** (every `lakhsToRupees()`/`fmtINRfromLakhs()` site, the Collections UI's `"L"`-suffix labels, `vouchers/[id]/route.ts`'s `amountInWords()`, `kra-engine.ts`'s direct Lakhs reads, `payments.ts`'s `round2()`/epsilon workaround, affected API doc comments — nothing modified, inventory only); a **Collection / KRA Engine Impact** analysis (confirmed `totalCollectionsWithoutGst()` is the risk surface — an absolute total compared against Lakhs-scaled human-entered `KRATemplateItem` targets with zero conversion today, per `prisma/seed-performance-defaults.ts`; `onTimeCollectionRate()` is a unit-agnostic ratio, not at risk; recommended `Collection`→INR + an explicit `/100000` at the `kra-engine.ts` scoring boundary, KRA targets staying Lakhs-based by convention); a **No-Half-Converted-State Rule** (data/schema/API/UI/docs must change together per model/release — never INR-storage-with-Lakhs-UI or vice-versa); and a **§12 Step 3O Scope Sign-Off** ledger consolidating every decision. **Final status: Decimal schema conversion remains BLOCKED.** Release 1 (`Expense`/`EmployeeAdvance`/`TravelClaim`, 9 fields) is "Approved with notes" — data clean, but the transformation script itself is not yet written/tested (no existing `Expense`/`TravelClaim` rows to test against). Release 2 (`Payment`/`Collection`, 4 fields) is explicitly **Blocked**, per this step's own instruction to block Payment/Collection when the KRA/Collection decision is unresolved (recommended, not yet signed off). Cross-referenced in `docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md`/`docs/PROJECT_MEMORY.md`. `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅ — all reconfirmations since no app code changed. |
| 3P | Release 1 Decimal sign-off and implementation plan for Expense/EmployeeAdvance/TravelClaim | **Done this step (2026-06-22)** | None — sign-off and implementation-planning only; no schema/migration/API/UI/data change | Created `docs/database/DECIMAL_RELEASE1_SIGNOFF_PLAN.md` — the dedicated Release 1 sign-off artifact. Locks the 9-field scope (`Expense.amountLakhs/gstAmountLakhs`, `EmployeeAdvance.amountLakhs/disbursedAmountLakhs/settledAmountLakhs/balanceLakhs`, `TravelClaim.amountLakhs/amountRupees/ratePerKm`) with per-field status (Approved for `EmployeeAdvance`'s 1 clean live row; Approved with notes for `Expense`/`TravelClaim`'s 0-row dev caveat) and a Release 1 exclusions table (`Payment`, `Collection`, `Voucher`/`Ledger`, CRM Lead/Opportunity, KRA targets, policy thresholds — each with its reason and future-release placement). Documents the **No-Half-Converted-State Rule** (DB values, schema types, API boundary, UI converters, docs, and smoke tests must all change together per release) and a 12-step atomic **Step 3Q implementation sequence** (smoke data → snapshot → schema type change → reviewed migration SQL → value-transformation SQL → dev-only apply → client regen → API update → UI update → before/after comparison → validation → documentation). Specifies exact **smoke-test data** for `Expense`/`TravelClaim` (still 0 rows in dev) with expected post-transformation INR values, to be inserted only in Step 3Q. Reviewed and tabulated the **API boundary plan** (`/api/finance/expenses`, `/api/finance/expenses/[id]`, `/api/finance/advances` — flagged as not yet wired to `src/lib/money.ts`, required in Step 3Q — and `/api/finance/conveyance`) and the **UI update plan** (`ExpenseRegisterClient.tsx`, `ClaimsClient.tsx`, `AdvancesClient.tsx`'s "Amount (₹ Lakhs)" form label, `FinanceApprovalsClient.tsx`'s shared per-record-type approval renderer, and confirmation that the `conveyance` UI is still 100% mock data not yet wired to the real `TravelClaim` field). A before/after verification template and a dev-only rollback/safety plan (no `db push`, no production run, manual migration-SQL review) round out the document. Final §11 sign-off ledger: every Release 1 decision is Approved/Approved-with-notes except "Decimal schema conversion permission," explicitly left **Pending explicit final approval for Step 3Q**. Cross-referenced (Step 3P progress notes appended) in `docs/database/DECIMAL_CONVERSION_READINESS_CHECK.md` and `docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md`. **No Prisma schema field was converted, no migration was generated or applied, no API route or UI component was modified, no Lakhs value was multiplied into INR, and no database row was written or altered.** `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅ — all reconfirmations since no app code changed. |
| 3Q | Release 1 Decimal + INR migration implemented atomically on dev DB (Expense/EmployeeAdvance/TravelClaim) | **Done this step (2026-06-22)** | Schema (9 fields, Float→Decimal), 1 migration, dev DB data transform, 6 API routes, 5 UI files — dev only, no production | Confirmed Step 3P sign-off (§11 updated to "Approved for dev Release 1 implementation only") and `DATABASE_URL` → `u686730471_caveodev` before any change. Created 3 dev-only smoke rows (2 `Expense`, 1 `TravelClaim`, each marked `[SMOKE TEST — Step 3Q Release 1]`) since both tables had 0 rows; snapshotted pre-migration values for all Release 1 rows. Updated `prisma/schema.prisma` for exactly the 9 Release 1 fields (`Expense.amountLakhs/gstAmountLakhs`, `EmployeeAdvance.amountLakhs/disbursedAmountLakhs/settledAmountLakhs/balanceLakhs`, `TravelClaim.amountLakhs/amountRupees/ratePerKm`) to `Decimal(18,2)`/`Decimal(10,4)`. Hand-wrote `prisma/migrations/20260622120000_decimal_release1_lakhs_to_inr/migration.sql` (no shadow DB on Hostinger) — `UPDATE` statements multiplying genuine Lakhs fields by 100,000 while still `Float` (for precision), followed by `ALTER TABLE MODIFY COLUMN` to `Decimal`; `TravelClaim.amountRupees`/`ratePerKm` received no multiplication. Safety-reviewed (no `DROP`, no destructive deletes, no Payment/Collection/Voucher/Ledger/CRM statements) before applying via a guarded one-off script that refused to run against any database other than the dev DB; `prisma migrate resolve --applied` + `prisma generate` followed. **Before/after verification: 11/11 fields pass exactly** (e.g. `EmployeeAdvance.amountLakhs` 0.5→50000.00, `TravelClaim.ratePerKm` 12.5→12.5000 unchanged) — full table in `docs/database/DECIMAL_RELEASE1_MIGRATION_RESULTS.md`. Updated 5 API routes (`/api/finance/expenses`, `/api/finance/expenses/[id]`, `/api/finance/advances` — now wired to `src/lib/money.ts`, closing the Step 3P gap — `/api/finance/conveyance`, `/api/finance/dashboard`) to serialize `Decimal` via `src/lib/money.ts` instead of leaking raw objects or breaking on the new type. Discovered and fixed one **collateral write-path**: the legacy mobile `/api/expenses` route also writes `Expense.amountLakhs`/`gstAmountLakhs` and had a Lakhs-denominated `AUTO_APPROVE_LIMIT_L = 0.10` auto-approval threshold — corrected to `AUTO_APPROVE_LIMIT_INR = 10000` to avoid a half-converted state. Updated 5 UI files: `expenses/data.ts`/`ExpenseRegisterClient.tsx` and `ClaimsClient.tsx` (removed `×100,000` from their `lakhsToRupees()`), `AdvancesClient.tsx` (removed the multiplication, changed the "Amount (₹ Lakhs)" form label to "Amount (₹)"), `FinanceApprovalsClient.tsx` (now branches by `entityType` — `ADVANCE` amounts no longer re-multiplied, any future Lakhs-denominated entity type still would be), `FinanceDashboardClient.tsx` (split into `fmtRupees`/`lakhsToRupees` for still-Lakhs `FinAccount`/`Ledger` fields and a new `fmtINRDirect` for the now-INR Expense/EmployeeAdvance/TravelClaim KPI cards, plus an `inrToLakhsEquivalent()` conversion feeding the existing Lakhs-calibrated chart Cr/L/K formatters so chart display logic keeps working unchanged). Conveyance UI confirmed still 100% mock data — untouched. **Payment, Collection, Voucher, Ledger, FinAccount, OrderAdvance, Notification, CRM Lead/Opportunity/SalesFunnel, and KRA target values were not touched** — confirmed via `git diff --stat` (13 files, all in-scope) and the migration-SQL safety review. Release 2 remains explicitly Blocked. `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅. |
| 3R | Post-migration audit of Release 1 Decimal/INR behavior across DB, APIs, and UI | **Done this step (2026-06-22)** | None — read-only audit only; no schema/migration/API/UI/data change | Confirmed `DATABASE_URL` → `u686730471_caveodev` and `20260622120000_decimal_release1_lakhs_to_inr` recorded as applied (`finished_at` set, `rolled_back_at` NULL) in `_prisma_migrations`. Verified via `INFORMATION_SCHEMA.COLUMNS` that all 9 Release 1 columns are genuinely `decimal(18,2)`/`decimal(10,4)` in the dev DB, while `Payment.amountLakhs`, `Collection.invoiceValueLakhs`/`amountWithoutGstLakhs`/`amountReceivedLakhs`, `Voucher.amountLakhs`, and `Ledger.amountLakhs` remain `double` (untouched). Re-verified DB values for the 2 smoke `Expense` rows, the `EmployeeAdvance` row, and the smoke `TravelClaim` row via a fresh read-only Prisma script — all 11 field checks pass exactly (no null introduced, no double-multiplication, no value left in Lakhs). Hit the live API boundary with authenticated `fetch()` calls (dev quick-login as Vijesh Vijayan/Manager) against `/api/finance/expenses`, `/api/finance/advances`, `/api/finance/conveyance`, `/api/finance/dashboard` — every response serializes correctly (2dp INR strings or plain numbers), no `[object Object]`, no raw Decimal leakage, no 100,000× inflation, response shapes unchanged. Ran the actual dev server and visually verified `/finance` (KPI cards show correct INR; donut chart correctly shows "₹12.6L" via the new `inrToLakhsEquivalent()` conversion feeding the unchanged Cr/L/K formatter), `/finance/claims` (both smoke rows show correct per-row totals, full `[SMOKE TEST]` description visible, no Lakhs label), `/finance/advances` (table shows ₹50,000 not ₹0.5L; "Request Advance" form shows the corrected "Amount (₹)" label), `/finance/approvals` (loads cleanly; no pending requests exist in dev to exercise the `FinanceApprovalsClient` entity-type branch live — verified by source review instead, documented as a known limitation), and `/collections` (still shows "₹441.84L" etc., confirming Release 1 did not leak into Collection's display). No console/hydration errors observed. Confirmed via `git diff 54bb67e..1c1447e --stat` that `kra-engine.ts`, Collections UI, Leads/Opportunities UI, and `payments.ts` have zero diff across the entire Step 3O→3Q range. Confirmed `src/app/api/expenses/route.ts`'s collateral fix (`AUTO_APPROVE_LIMIT_INR = 10000`, no leftover `_LIMIT_L`) by static review — did not POST new live test data through this endpoint to avoid creating non-canonical rows alongside the official smoke data. **One pre-existing, unrelated issue found and documented (not fixed, out of scope): two earlier migrations (`20260615000000_add_advance_category`, `20260617100000_employeetarget_relations`) have no row in `_prisma_migrations`, so `prisma migrate status` reports them unapplied even though their schema changes are live** — classified Minor/Documentation-only. **No blockers, major issues, or functional bugs found in the Release 1 implementation.** Full results: `docs/database/DECIMAL_RELEASE1_MIGRATION_RESULTS.md` §"Step 3R Post-Migration Audit". `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅. |
| 3S | Release 2 Payment/Collection/KRA boundary sign-off plan | **Done this step (2026-06-22)** | None — planning/decision-lock only; no schema/migration/API/UI/data change | Created `docs/database/DECIMAL_RELEASE2_SIGNOFF_PLAN.md`. Locks the Release 2 candidate scope (`Payment.amountLakhs`, `Collection.invoiceValueLakhs`/`amountWithoutGstLakhs`/`amountReceivedLakhs`, all `value*100000` → `Decimal(18,2)`). Re-confirmed (read-only, from Step 3O's existing figures, no DB re-query) the live data profile: `Payment` 1 row ~₹1.61L, `Collection` 94 rows ₹0.003L–₹77.88L, no negatives/no suspicious values. Reviewed `kra-engine.ts` in full and confirmed `totalCollectionsWithoutGst()`/`teamBilling()` are the only Collection consumers at risk (absolute totals compared directly against Lakhs-scaled KRA targets with zero conversion); `onTimeCollectionRate()`/`teamCollectionsEfficiency()` are ratio-based and unit-agnostic, confirmed safe. Confirmed `/api/kra-sync` (`computeKRAProgress()`) is the sole boundary through which `kra-engine.ts` reads Collection data — no other route/page imports it directly. Documented 3 KRA boundary options (A: convert Collection to INR, keep KRA targets Lakhs, convert only at the `kra-engine.ts` scoring boundary — recommended default; B: convert KRA targets to INR too — stricter policy reading, higher migration risk to per-employee `KRA.target` strings; C: leave Collection in Lakhs — rejected, violates the Money Unit Policy). Reviewed `src/lib/payments.ts` in full and tabulated its retirement plan (`round2()`/epsilon-comparison removal, `recordPayment()`'s notification text and `amountLakhs` field, `paymentsToday()`'s `totalLakhs` field — all baked-in Lakhs assumptions in the active Payment/Collection write path). Reviewed `src/app/api/collections/route.ts`, `[id]/route.ts`, `src/app/api/payments/route.ts`, `today/route.ts`, and grepped `CollectionsClient.tsx` — confirmed Collection already has a **live write API** (unlike Release 1's mostly-read-only routes), making its conversion materially riskier; confirmed the UI's hardcoded `"(₹L)"` table headers and `toFixed(2)}L` templates. Flagged the single open decision blocking Step 3T: whether KRA targets are sales/performance config (may stay Lakhs, Option A) or Finance-adjacent figures (must convert to INR, Option B, the stricter reading of "only Leads/Opportunities use Lakhs") — explicit business sign-off required before implementation. **No Prisma schema field was converted, no migration was generated, no API route or UI component was modified, no database row was written or altered.** `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅. |
| 3T | Release 2 KRA boundary decision locked (Option A approved) | **Done this step (2026-06-22)** | None — business-decision documentation only; no schema/migration/API/UI/data change | Locked the open decision Step 3S flagged. **Final business decision: Option A approved.** Finance Collection storage moves to actual INR in Release 2; KRA targets remain Lakhs-based for now; `kra-engine.ts` must explicitly convert Collection INR to Lakhs only at the KRA scoring boundary (`totalCollectionsWithoutGst()`/`teamBilling()`). Option B (convert KRA targets to INR too) is **Deferred** to a future KRA-specific project, not adopted now. Option C (leave Collection in Lakhs) is **Rejected** — explicitly not permission to keep Collection in Lakhs; Collection storage must move to INR in Release 2 regardless, only the KRA target comparison boundary may use Lakhs. Updated `docs/database/DECIMAL_RELEASE2_SIGNOFF_PLAN.md`: §4 KRA Boundary Options table now carries a Decision Status column (A Approved/B Deferred/C Rejected); §5 reworded from "Recommendation" to a locked "Decision"; §12 Decision Ledger updated to Approved across every row (Payment conversion scope, Collection conversion scope, KRA target unit policy, KRA engine boundary conversion, `payments.ts` retirement, API response policy, UI label policy, Release 2 permission to implement — all Approved for dev implementation only) except the production migration-history gap review (still Pending, not blocking); new §13 "Release 2 Implementation Preconditions" added (9 explicit preconditions: dev DB only, Payment/Collection fields only, KRA engine boundary conversion same release, `payments.ts` update same release, UI label/converter update same release, no CRM Lead/Opportunity/KRA target migration, no Voucher/Ledger migration, before/after KRA score comparison required, no half-converted state); §14 Final Recommendation updated to reflect the lock and point at a future Step 3U implementation prompt. **This is a decision lock, not an implementation** — `src/lib/kra-engine.ts`, `src/lib/payments.ts`, every API route, every UI component, `prisma/schema.prisma`, and every migration file remain completely untouched; no database row was written or altered. `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅. |
| 3T-1 | Money unit policy corrected (Leads/Funnel/Opportunities/KRA targets now actual INR canonical) | **Done this step (2026-06-22)** | None — documentation and decision-correction only; no schema/migration/API/UI/data change | **Money unit policy corrected.** The prior policy ("only CRM Leads/Opportunities may remain Lakhs-based") is superseded — **Leads/Funnel/Opportunities/KRA target inputs/storage are now defined as actual INR**, the same as every Finance/Accounting model. **Lakhs is retained only for Sales dashboard/KRA/report display** — never as a storage or input unit for any business model going forward. This directly demotes Step 3T's Option A from a permanent design to, at best, a temporary compatibility bridge: KRA targets (`KRATemplateItem.expectedTarget`/`stretchTarget`, the per-employee `KRA.target` string field) were locked Lakhs "for now" under Step 3T — that decision no longer satisfies the corrected policy. **Release 2 implementation is paused** pending an explicit Sales/KRA target unit decision. Updated `docs/database/DECIMAL_RELEASE2_SIGNOFF_PLAN.md`: added §15 "Corrected Sales/KRA Unit Policy Impact" (Collection/Payment still must move to INR; KRA targets should also move to INR via a separate Sales/KRA target migration; dashboards/KRA/reports may convert INR→Lakhs for display only; `kra-engine.ts` should eventually compare INR to INR; a temporary INR-to-Lakhs comparison boundary is acceptable only as an explicitly-marked interim bridge); §16 "Updated Decision Options" (Option A — Full INR Canonical Model, Payment+Collection+KRA targets all move to INR, `kra-engine.ts` compares INR-to-INR, dashboards/KRA/Reports display Lakhs — **recommended long-term**; Option B — Temporary Compatibility Bridge, Payment+Collection move to INR now, KRA targets stay Lakhs temporarily with a committed future migration, must be marked temporary; Option C — keep Collection/KRA canonical storage in Lakhs — **Rejected**, violates the corrected policy); §17 "Sales/KRA Actual-INR Migration Needed" (forward-looking inventory only, not implemented: Lead/Opportunity/SalesFunnel value inputs, KRA target inputs/seed data, `EmployeeTarget`/`TeamTarget`, Sales/KRA dashboards and reports); §18 current Final Recommendation (Release 2 Blocked pending the Option A vs. B choice). §12 Decision Ledger updated: "KRA target unit policy" and "Release 2 permission to implement" rows marked Superseded/Blocked; all other rows (Collection storage, Payment storage, `payments.ts` retirement, API response policy, UI label policy) remain Approved, unaffected by this correction. Also corrected `docs/database/DECIMAL_CONVERSION_READINESS_CHECK.md`'s §0 (Lead/Opportunity Lakhs exception marked superseded with a strikethrough and a new Step 3T-1 implementation note) and `docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md`'s original Money Unit Policy note (struck through, corrected policy appended). **No Prisma schema field was converted, no migration was generated, no API route or UI component was modified, `src/lib/kra-engine.ts` and `src/lib/payments.ts` were not touched, and no database row was written or altered.** `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅. |
| 3U-0 | Option A — Full INR Canonical Model — locked; Sales/KRA INR migration scope defined | **Done this step (2026-06-22)** | None — decision-lock and scope-definition only; no schema/migration/API/UI/data change | **Final business decision: Option A approved.** All persisted business money values (Finance, Payment, Collection, Lead, Funnel, Opportunity, KRA targets, Sales targets, report source data) must use actual INR as canonical input/storage; Lakhs is allowed only as a display/reporting unit at the presentation boundary. **Option B (Temporary Compatibility Bridge) is rejected for normal implementation** — demoted from Step 3T's "recommended" status to emergency-bridge-only, requiring separate, explicit written approval if ever invoked; **Option C remains rejected**. Updated `docs/database/DECIMAL_RELEASE2_SIGNOFF_PLAN.md`: §16's option headers now carry explicit Approved/Rejected-for-normal-implementation/Rejected markers; §12 Decision Ledger's "KRA target unit policy" and "KRA engine boundary conversion" rows changed from Superseded to Approved (Option A locked); "Release 2 permission to implement" changed from "Blocked pending Option A vs. B decision" to **"Blocked until the full Option A scope inventory is completed"** — the design choice is resolved, but the scope is not yet inventoried; new §19 Final Recommendation added (§18 marked superseded in place). Created `docs/database/SALES_KRA_INR_UNIT_SCOPE_PLAN.md` (Step 3U-0) — a static source-inspection scope plan covering: confirmed-Lakhs candidate fields (`CrmLead.expectedValue`, `CrmOpportunity.value`/`dealValueExTax`/`netProfitLakhs`, `SalesFunnel.dealValueLakhs`/`billingValueLakhs`, each confirmed via exact UI/API code — e.g. `LeadsClient.tsx`'s `"Expected Value (₹L)"` label, `OpportunitiesClient.tsx`'s `LARGE_DEAL_THRESHOLD_L = 50` threshold, `SalesFunnelClient.tsx`'s `"Deal Value (₹L)"`/`"Billing Value (₹L)"` labels); `KRATemplateItem.expectedTarget`/`stretchTarget`/`minimumTarget` confirmed Lakhs-scaled **only for `metricType: "REVENUE"` rows** (seed values 50/100/200/300/600 in `prisma/seed-performance-defaults.ts`), not for percentage/count metric types — requiring a metric-by-metric migration filter; the legacy `KRA.target` free-text string (parsed by `parseTargets()` in `kra-engine.ts`) confirmed Lakhs-scaled by convention but not a typed column, meaning its migration rewrites embedded numeric values inside existing strings rather than an `ALTER COLUMN`; `ApprovalRule`/`ExpenseLimitRule`/`CustomerCreditPolicy`/`AdvancePolicy` money fields explicitly excluded as Finance-policy, not Sales/KRA. Confirmed an architectural split: the legacy `KRA`/`KRA.target` system `kra-engine.ts` scores against and the newer `EmployeeTarget`/`KRATemplateItem`/`KRAAchievement` system `KrasClient.tsx`'s primary UI renders are two separate target-storage mechanisms that do not automatically stay in sync. **Sequencing finding: combining Release 2A (Payment/Collection) and Release 2B (Sales/KRA target migration) into one atomic release is required, not optional** — shipping Collection-to-INR before KRA targets convert would reproduce the 100,000× corruption risk under Option A's no-conversion-factor design; Release 2A alone requires the separately-approved Option B emergency bridge, not a default path. **Release 2 implementation permission remains Blocked** pending sign-off on the new scope plan's §7 open decisions. **No Prisma schema field was converted, no migration was generated, no API route or UI component was modified, `src/lib/kra-engine.ts` and `src/lib/payments.ts` were not touched, and no database row was written or altered.** `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅. |
| 3U-1 | Combined Release 2 scope sign-off — Payment/Collection/Sales-KRA-target/Lead-Funnel-Opportunity INR migration locked | **Done this step (2026-06-22)** | None — final sign-off/implementation-scope lock only; no schema/migration/API/UI/data change | Created `docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md` — the authoritative combined-scope sign-off document superseding the field-list portions of `SALES_KRA_INR_UNIT_SCOPE_PLAN.md`/`DECIMAL_RELEASE2_SIGNOFF_PLAN.md` (those remain the historical decision record). Locks the exact field set: `Payment.amountLakhs`; `Collection.invoiceValueLakhs`/`amountWithoutGstLakhs`/`amountReceivedLakhs`; `CrmLead.expectedValue`; `CrmOpportunity.value`/`dealValueExTax`/`netProfitLakhs`; `SalesFunnel.dealValueLakhs`/`billingValueLakhs`; `KRATemplateItem.expectedTarget`/`stretchTarget`/`minimumTarget` (REVENUE-metric rows only, confirmed against `prisma/seed-performance-defaults.ts`); legacy `KRA.target` string entries (confirmed-money KPIs only); `EmployeeTarget`/`TeamTarget.targetJson` (review-only, no confirmed money write path found). Documents the Metric Classification Rule (transform money-denominated fields only — never percentages/counts/ratios/scores; ambiguous cases blocked for manual review, never guessed either direction), a 16-step atomic Step 3U implementation sequence, a before/after KRA-score verification table template, an open-decisions table (9 items, mostly Pending — live-DB `KRAMetric`/`KRA.target`/`targetJson` scans and named business sign-off on the one-atomic-release requirement still outstanding), and a Release 2 Permission Ledger (Option A Approved, Option B Rejected, Payment/Collection Approved, Sales/KRA targets and Lead/Funnel/Opportunity Pending final field/metric verification, overall implementation permission Pending). Flagged one related-but-out-of-instruction-scope finding: `OrderAdvance.amountLakhs` feeds `Payment` via `applyAdvance()` in `src/lib/payments.ts` and would need to convert in lockstep with `Payment.amountLakhs` — added to the open-decisions table, not silently folded into locked scope. Cross-referenced (Step 3U-1 progress notes appended) in `SALES_KRA_INR_UNIT_SCOPE_PLAN.md`, `DECIMAL_RELEASE2_SIGNOFF_PLAN.md`, `DECIMAL_MONEY_MIGRATION_PLAN.md`, `PROJECT_MEMORY.md`. **Release 2 implementation permission remains Pending/Blocked — this step is a sign-off lock, not a green light.** **No Prisma schema field was converted, no migration was generated, no API route or UI component was modified, `src/lib/kra-engine.ts` and `src/lib/payments.ts` were not touched, and no database row was written or altered.** `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅. |
| 3U-2 | Section 9 open decisions closed via read-only live-DB scan; one ambiguous KRATemplateItem found and blocked | **Done this step (2026-06-22)** | None — verification/live-read profiling/sign-off documentation only; no schema/migration/API/UI/data change | Confirmed `DATABASE_URL` → `u686730471_caveodev` before running a read-only scan (`prisma/scan-release2-scope.mjs`, guarded against any other DB name, modeled on the existing `prisma/apply-*.mjs` pattern; deleted along with its raw output after the findings were captured — no scratch files left). **Major correction found:** the live `kra_metric` table does not contain `prisma/seed-performance-defaults.ts`'s rows at all — its `REVENUE`/`ACTIVITY`/`QUALITY`/`COMPLIANCE` codes don't exist live; the live `metricType` enum is `AMOUNT`/`PERCENTAGE`/`COUNT` instead. Money metrics are the 2 populated `AMOUNT`-typed metrics (`BOOKING`, `BILLING`) plus 1 unused zero-row `AMOUNT` metric (`FUNNEL_VALUE`); 12 `PERCENTAGE`/`COUNT`-typed metrics confirmed non-money. **One ambiguity found and blocked, not guessed:** `KRATemplateItem` row #16 (linked to the `PERCENTAGE`-typed `PIPELINE_RATIO` metric) has `targetType = "AMOUNT"` with money-scale values (1500/1800/2200) matching a legacy KRA's `"total team pipeline coverage (₹ lakhs)"` target exactly — flagged Blocked/Manual Review, not converted. Scanned all 34 live `KRA.target` rows: 100% parse cleanly via `parseTargets()`'s `key:value;key:value` format; exactly 6 KPI labels across 4 distinct KRA titles confirmed money (`total sales revenue - booking/billing`, `total funnel/pipeline value created (₹ lakhs)`, `total team booking target achievement (₹ lakhs)`, `total team billing achievement`, `total team pipeline coverage (₹ lakhs)`); every other label across all 34 rows — including the "Focus area revenue achievement" mix-ratio percentages, which mention "revenue" in the title but are confirmed not absolute money — is non-money. Scanned all 34 `EmployeeTarget.targetJson` rows: confirmed the field stores the **same free-text format as `KRA.target`, not structured JSON**, despite the field name; the same 6-label money set applies row-by-row. `TeamTarget` confirmed **0 rows** — deferred, not converted. Scanned `CrmLead.expectedValue` (38 rows, ₹0–59.12L), `CrmOpportunity.value/dealValueExTax/netProfitLakhs` (21 rows), `SalesFunnel.dealValueLakhs/billingValueLakhs` (100 rows) — all confirmed Lakhs-scaled, zero negatives across every field. Scanned `OrderAdvance` (0 rows) and `Payment.fromAdvanceId` (0 rows set) — confirmed `applyAdvance()` has never produced a live `Payment` row in this dataset; `OrderAdvance.amountLakhs` is still included in Section 3's locked scope (zero migration risk, eliminates a future lockstep-unit-mismatch risk permanently) rather than deferred. **Named business sign-off recorded**: product owner instruction in project chat — actual INR for Lead/Funnel/Opportunity input/storage, Lakhs for Sales dashboard/KRA/Report display; this also closes the "one atomic release" and "Lakhs display desired" open decisions. Updated `docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md`: added §12 "Live DB Scan Findings" with full per-task tables; closed every Section 9 row; updated the Section 10 Permission Ledger; added `OrderAdvance.amountLakhs` to Section 3's locked scope table. Cross-referenced (Step 3U-2 progress notes appended) in `SALES_KRA_INR_UNIT_SCOPE_PLAN.md`, `DECIMAL_MONEY_MIGRATION_PLAN.md`, `PROJECT_MEMORY.md`. **Release 2 implementation permission: Blocked, narrowly, on the single `KRATemplateItem` #16 ambiguity only — every other open decision is now closed.** **No Prisma schema field was converted, no migration was generated, no API route or UI component was modified, `src/lib/kra-engine.ts` and `src/lib/payments.ts` were not touched, and no database row was inserted, updated, or deleted (read-only scan only).** `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅. |
| 3U-3 | KRATemplateItem #16 business decision recorded — Option B (config error, fix before migration); Release 2 permission updated | **Done this step (2026-06-22)** | None — business/config classification and documentation only; no schema/migration/API/UI/data change | Presented the product owner with the 3 documented options for this step's single remaining Release 2 blocker (`KRATemplateItem` #16: `targetType = AMOUNT` on a `PERCENTAGE`-typed `PIPELINE_RATIO` metric, values 1500/1800/2200 matching a legacy money KPI exactly). **Decision: Option B — configuration error, fix before migration** (direct confirmation in conversation, not assumed). Attempted a live re-verification query (`prisma/inspect-item16.mjs`, DB-name-guarded) but it was rejected with `ER_ACCESS_DENIED_ERROR` (connecting IP not currently on Hostinger's Remote MySQL allowlist — a transient, intermittent limitation also seen in Step 3N from a different IP); the decision relies on Step 3U-2's already-captured read-only evidence instead, and the failed script was deleted (no scratch files left, no row touched). Updated `docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md`: added §13 "KRATemplateItem #16 Decision" with the full finding/decision/action table; updated §9's `KRATemplateItem` row from "Blocked/Manual Review" to "Approved with notes — except item #16, Blocked pending config correction"; updated §10's Permission Ledger (`KRATemplateItem` #16 → Blocked pending config correction; overall Release 2 implementation permission → Blocked, on the concrete re-link prerequisite, not a classification ambiguity); updated §11's Final Recommendation to specify the exact fix needed (`KRATemplateItem.metricId` re-link to a genuine `AMOUNT`-typed metric — an admin-config data change, not code/schema). Cross-referenced (Step 3U-3 notes appended) in `SALES_KRA_INR_UNIT_SCOPE_PLAN.md`, `DECIMAL_MONEY_MIGRATION_PLAN.md`, `PROJECT_MEMORY.md`. **Release 2 implementation permission remains Blocked** — the classification question is resolved, but the config-correction itself has not been performed (explicitly out of scope for this step). **No Prisma schema field was converted, no migration was generated, no API route or UI component was modified, `src/lib/kra-engine.ts` and `src/lib/payments.ts` were not touched, and no database row was inserted, updated, or deleted.** `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅. |
| 3U-4 | KRATemplateItem #16 admin configuration correction attempted — root cause confirmed live, no correction made, Release 2 remains Blocked | **Done this step (2026-06-22)** | None — dev-only admin configuration/data correction and verification step; ultimately no data change was made | Confirmed `DATABASE_URL` → `u686730471_caveodev` (live access succeeded this step — the earlier `ER_ACCESS_DENIED_ERROR` IP-allowlist issue had cleared). Ran a read-only re-inspection (`prisma/inspect-amount-metrics.mjs`, DB-name-guarded, deleted after use) of item #16, its linked metric, every `AMOUNT`-typed `KRAMetric` (`BOOKING`/`BILLING`/`FUNNEL_VALUE`), and every metric matching pipeline/funnel/booking/billing/revenue/collection. **Confirmed: no existing `AMOUNT` metric matches.** `FUNNEL_VALUE` was specifically ruled out — its `calculationSource` ties to `totalPipelineValue()`, an individual rep's funnel-creation activity (legacy `KRA` #65), while item #16 lives in `KRATemplate` #7 ("Pipeline Health & Strategic Execution (Manager)" — team pipeline coverage, matching `teamPipeline()`/legacy `KRA` #71). The business owner directly confirmed in conversation that "Pipeline Ratio %" (item #16's current, wrong metric) is a genuine percentage coverage multiplier (e.g. 200% of a ₹1 Cr target → ₹2 Cr required pipeline) — a different mechanic from item #16's own absolute `AMOUNT` values (1500/1800/2200), reinforcing that a dedicated new metric (proposed "Team Pipeline Coverage (₹L)", `TEAM_PIPELINE_COVERAGE`, `metricType = AMOUNT`) is needed, not a relink to an existing one. **Two creation paths offered, neither authorized:** (1) admin UI — inspected `src/app/settings/performance/components/KRALibrary.tsx`'s "Add Metric" form and found its `metricType` `<select>` only offers `REVENUE`/`ACTIVITY`/`QUALITY`/`COMPLIANCE`/`CUSTOM`, not `AMOUNT` (the taxonomy every live `KRAMetric` actually uses) — a browser cannot submit a `<select>` value outside its rendered `<option>`s, so this path is infeasible without a UI code change, which this step forbids; (2) a guarded dev-DB script (insert one `KRAMetric` row + update only item #16's `metricId`) was offered as the alternative and **explicitly declined by the product owner**, who chose to stop and stay Blocked. **No correction was made; Task 4 verification did not run** (nothing to verify). Updated `docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md`: added §14 "KRATemplateItem #16 Correction Attempt" with the full re-inspection table and both declined-path narrative; refined §11's Final Recommendation to the precisely-scoped remaining prerequisite (new `AMOUNT` metric + re-link, path not yet authorized). Flagged, not actioned, a separate follow-up: the admin KRA Metrics screen's `metricType` dropdown is out of sync with the live `AMOUNT`/`PERCENTAGE`/`COUNT` taxonomy. Cross-referenced (Step 3U-4 notes appended) in `SALES_KRA_INR_UNIT_SCOPE_PLAN.md`, `DECIMAL_MONEY_MIGRATION_PLAN.md`, `PROJECT_MEMORY.md`. **Release 2 implementation permission remains Blocked.** **No Prisma schema field was converted, no migration was generated, no API route or UI component was modified, `src/lib/kra-engine.ts` and `src/lib/payments.ts` were not touched, and no database row was inserted, updated, or deleted.** Two temporary read-only inspection scripts were created and deleted — no scratch files remain. `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅. |
| 3U-5 | KRA AMOUNT metric admin setup fixed; new metric created; KRATemplateItem #16 re-linked; Release 2 configuration blocker resolved for dev | **Done this step (2026-06-23)** | None — additive admin UI/API fix + dev-DB config correction via app service layer; no schema change, no Release 2 migration | Confirmed `DATABASE_URL` → `u686730471_caveodev` before any change. **Root cause confirmed from source:** `KRALibrary.tsx`'s `metricType` `<select>` only offered `REVENUE`/`ACTIVITY`/`QUALITY`/`COMPLIANCE`/`CUSTOM` — none of which any live `KRAMetric` row uses (every real row uses `AMOUNT`/`PERCENTAGE`/`COUNT`) — so a browser form could never submit `AMOUNT`; the underlying `POST /api/admin/performance/kra` API had no such restriction. Separately found the existing template-level `PATCH /api/admin/performance/templates` route deletes and recreates every item in a template, which would have changed sibling item IDs if used to re-link only item #16. **Fix applied:** rewrote `KRALibrary.tsx`'s dropdown to `AMOUNT`/`PERCENTAGE`/`COUNT` (default `AMOUNT`, with helper text); added `updateKRATemplateItem()` to `src/lib/performance-engine/templates.ts` (single-row update, no sibling deletion) and a new route `PATCH /api/admin/performance/templates/items`, gated by the same `requirePermission(session, "Settings", "Performance", "EDIT")` check as every other admin performance route; added `(metricType)` to `KRATemplateManager.tsx`'s metric-selector option labels for clarity. No schema change; `kra-engine.ts`/`payments.ts` untouched. **Metric created** via the app's own `createKRAMetric()` function: `KRAMetric` #16, "Team Pipeline Coverage" (`TEAM_PIPELINE_COVERAGE`), `metricType = AMOUNT`. **#16 re-linked** via `updateKRATemplateItem(16, { metricId: 16 })`: `metricId` 9→16; `targetType` (`AMOUNT`) and all target values (min 1500/expected 1800/stretch 2200) unchanged; sibling item #17 and all `EmployeeTarget`/`TeamTarget` rows confirmed unchanged (counts: 17 `KRATemplateItem` rows, 34 `EmployeeTarget` rows, 0 `TeamTarget` rows — all unchanged). **Correction to this step's own instruction framing:** the task description for this step claimed item #16 was linked to `BOOKING`/`BILLING`/`FUNNEL_VALUE`; a fresh live read confirmed that was never true — it was linked to `KRAMetric` #9 ("Pipeline Ratio %", `PERCENTAGE`), exactly as this tracker's own Step 3U-2/3U-3/3U-4 entries already documented. **Release 2 implementation permission: Approved for dev implementation only** — this step resolved the configuration prerequisite only; **no Release 2 migration was implemented** (`kra-engine.ts`, `payments.ts`, the schema, and every money-value row remain unconverted). Cross-referenced (Step 3U-5 notes appended) in `SALES_KRA_INR_UNIT_SCOPE_PLAN.md`, `DECIMAL_MONEY_MIGRATION_PLAN.md`, `DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md` §15, `PROJECT_MEMORY.md`. `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅, `npm run lint` run (pre-existing repo-wide lint debt unrelated to this step's files; none of the 4 files touched this step appear in the lint output). |

---

## 5. Freeze Rules

- **Do not** add new calls to `src/lib/rbac.ts`'s `hasPermission()`.
- **Do not** add new features to `AppRole` / `RolePageAccess` (new fields, new seed data, new UI).
- **Do not** build new screens using legacy `/admin` Roles data as a source of truth.
- **Do not** remove `roles.ts` until `access-control` replaces all page/API guards currently
  depending on it (see §4 Steps 2J/2K/2M/2N — these are the remaining dependents).
- **Do not** delete `AppRole` / `RolePageAccess` until the migration/backup decision in Step 2Q
  is complete.
- **All new APIs** must use `access-control`'s `requirePermission()` unless the route is
  intentionally self-scoped (e.g. "my own profile," own-data endpoints with no admin function) —
  in which case document why no permission check applies.
- **All new Finance write APIs** must use `access-control` from day one — do not repeat the
  `isManager`-only pattern that Step 2F just had to migrate away from.

---

## 6. Route Migration Checklist

For each route being migrated or newly built:

- [ ] Has a session check (`getSession()`, 401 on no session)
- [ ] Has an `access-control` permission check (`requirePermission()`)
- [ ] Uses the correct action for the operation — `VIEW`, `CREATE`, `EDIT`, `DELETE`, or `APPROVE`
      (the catalogue's `ACTION` enum has no `DELEGATE` or `CANCEL` action — see §8 note)
- [ ] Handles object-level authorization where needed (not just module/resource/action — e.g. "is
      this specific approval request actually assigned to this actor," per Step 2A's pattern)
- [ ] Has an ownership/scope rule where needed (`canAccessScope()` / `DataAccessPolicy`, not just a
      flat allow/deny)
- [ ] Returns `401` for no session
- [ ] Returns `403` for forbidden (authenticated but lacking permission)
- [ ] Does not rely only on client-side permission checks for security
- [ ] Has a manual verification checklist before merging (manager still works, non-manager with
      the right grant now works, no-grant user gets 403)

---

## 7. Page and Navigation Migration Checklist

- [ ] Page guard matches the API permission it fronts (same module/resource/action where
      applicable)
- [ ] Sidebar visibility matches the page guard (no link shown for a page the user can't open, no
      missing link for a page they can)
- [ ] Settings card visibility matches the page guard
- [ ] Direct URL access is blocked server-side if the user lacks permission (not just hidden in
      nav)
- [ ] UI buttons (edit/delete/approve, etc.) are hidden or disabled based on the **same**
      permission the backing API enforces — not a separate, looser client-side check
- [ ] No page relies on client-side permission checks alone for security
- [ ] Own/team/all data-visibility scope is handled consistently between the page and its API

---

## 8. Access-Control Permission Mapping

Exact names below are taken directly from `src/lib/access-control/permissions.ts`
(`PERMISSION_CATALOGUE`) as of this tracker's creation. Where the task brief's suggested name
differs from what actually exists in the catalogue, the **actual catalogue name** is used and the
gap is called out explicitly — no permission was invented to fill a gap.

**Settings:**
- `Settings / Identity / VIEW`, `EDIT`
- `Settings / Masters / VIEW`, `EDIT`
- `Settings / Finance / VIEW`, `EDIT`
- `Settings / Policy / VIEW`, `EDIT`
- **`Settings / CRM` does not exist in the catalogue.** This is the confirmed gap from Step 2F —
  the 7 CRM-admin routes remain on the legacy `isManager` check until this is added (planned in
  §4 Step 2L).
- Also present (not asked for above, but real): `Settings/Configuration` (VIEW/EDIT),
  `Settings/UserManagement` (VIEW/CREATE/EDIT), `Settings/RoleManagement` (VIEW/EDIT),
  `Settings/Organization` (VIEW/EDIT), `Settings/Workflow` (VIEW/EDIT — config-engine permission,
  distinct from the `Workflow` module below), `Settings/Performance` (VIEW/EDIT),
  `Settings/CommunicationAdmin` (VIEW/EDIT) + `CommunicationTemplate` (EDIT) +
  `CommunicationLog` (VIEW), `Settings/IntegrationAdmin` (VIEW/EDIT) + `IntegrationLog` (VIEW),
  `Settings/SecurityAdmin` (VIEW/EDIT) + `SecurityLog` (VIEW).

**Masters:**
- `Masters / CustomerMaster / VIEW`, `CREATE`, `EDIT`, `DELETE`, `IMPORT`
- `Masters / VendorMaster / VIEW`, `CREATE`, `EDIT`, `DELETE` — **no `IMPORT` action exists for
  VendorMaster** in the current catalogue (only CustomerMaster has it).

**Finance:**
- `Finance / Invoice / VIEW`, `CREATE`, `EDIT`, `DELETE`, `APPROVE`, `EXPORT`
- `Finance / Expense / VIEW`, `CREATE`, `EDIT`, `DELETE`, `APPROVE`
- `Finance / Payment / VIEW`, `CREATE`, `APPROVE` — **no `EDIT` action exists for Payment**
- `Finance / Advance / VIEW`, `CREATE`, `APPROVE` — **no `EDIT` action exists for Advance**
- `Finance / Voucher / VIEW`, `CREATE`, `EDIT`, `DELETE`, `APPROVE`, `EXPORT` — **added Step 2S**
  (2026-06-21). Previously did not exist in the catalogue at all; Voucher administration was
  covered only by `Settings/Finance` (the admin-config route, Step 2F). See §12 below.
- `Finance / BankBook / VIEW`, `CREATE`, `EDIT`, `APPROVE`, `IMPORT`, `EXPORT` — **added Step 2S.**
- `Finance / CashBook / VIEW`, `CREATE`, `EDIT`, `APPROVE`, `EXPORT` — **added Step 2S** (no
  `IMPORT` action — no cash-statement-import use case exists).
- `Finance / Conveyance / VIEW`, `CREATE`, `EDIT`, `APPROVE`, `EXPORT` — **added Step 2S.**
- **`Finance / Reconciliation` still does not exist in the catalogue.** Deliberately deferred at
  Step 2S — reconciliation approval now maps to `Finance/BankBook/APPROVE` /
  `Finance/CashBook/APPROVE` instead of a dedicated resource, per the existing recommendation to
  avoid a parallel reconciliation surface (see `FINANCE_WRITE_ACCESS_CONTROL_PLAN.md` §4/§12/§15).
  Remains a documented future gap if a standalone Reconciliation workflow is ever built.

**Workflow:**
- `Workflow / ApprovalRequest / VIEW`, `APPROVE` — note the catalogue calls this resource
  `ApprovalRequest`, not `Approval`. **`DELEGATE` and `CANCEL` are not members of the `ACTION`
  enum at all** (`ACTION` = `VIEW`/`CREATE`/`EDIT`/`DELETE`/`APPROVE`/`EXPORT`/`IMPORT`/`ASSIGN`).
  Step 2A's delegate/cancel authorization (`assertCanActOnApprovalRequest()`) is correctly
  implemented as bespoke object-level business logic for exactly this reason — it could not have
  been expressed as a catalogue permission, and should not be forced into one.
- `Workflow / WorkflowDefinition / VIEW`, `EDIT` — note the catalogue calls this resource
  `WorkflowDefinition`, not `Engine`.

---

## 9. Risks If Migration Is Not Completed

- An admin may edit legacy `AppRole`/`RolePageAccess` data via the `/admin` Roles tab believing
  it changes real access, when it has zero effect — this is exactly the scenario this tracker and
  its freeze banner exist to prevent.
- Masters and Finance Operations sidebar visibility now reflects `access-control` (Step 2J), but
  Settings/Pipeline/People navigation and the underlying page/API guards for several of these
  surfaces (Customer/Vendor Master pages, several Finance read APIs) are not yet migrated — a
  hidden-vs-visible nav item is not the same as an enforced page/API guard until Steps 2K/2M/2N
  close those gaps too.
- API and UI permissions may diverge — a button or nav link visible client-side does not
  guarantee the backing API agrees, until Step 2J/2K/2N close that gap.
- Future Finance write APIs may be built on the old `isManager`-only `roles.ts` pattern by habit,
  re-creating exactly the gap Step 2F just fixed, if Step 2L's catalogue-gap closure and "use
  access-control by default" rule aren't followed.
- `AppRole`/`RolePageAccess` may continue to mislead future developers who don't know to check
  this tracker first — mitigated by Step 2H's freeze comment and banner, but only fully resolved
  once Steps 2Q/2R retire the system entirely.
- ~~Customer/Vendor Master pages remain overexposed (no page-level gate beyond "is logged in")
  until Step 2N closes that gap~~ **RESOLVED 2026-06-20 (Step 2N)** — `/masters/customers` and
  `/masters/vendors` now require `Masters/CustomerMaster`-or-`VendorMaster`/`VIEW`. ~~Legacy
  `/customers` remains overexposed (no permission gate beyond session) until Step 2O retires or
  redirects it.~~ **RESOLVED 2026-06-20 (Step 2O)** — `/customers` now requires the same
  `Masters/CustomerMaster/VIEW`-or-`isManager` grant. Not redirected to `/masters/customers`
  because that route is still UI-only mock data with no real persistence — see Step 2O's full
  note in §3 above. Wiring `/masters/customers` to real data and then redirecting `/customers` is
  the recommended follow-up, not yet scheduled.
- Object-level authorization gaps (the Step 2A class of bug — "any authenticated user can act on
  any object by ID") can reappear if a future approval-like or workflow-like route is built
  without replicating that pattern; the checklist in §6 exists specifically to catch this in
  review.

---

## 10. Recommended Next Execution Steps

1. **Step 2I** — Add visible freeze warning to legacy `/admin` Roles UI and code comments in
   `rbac.ts`. **(Completed, 2026-06-20.)**
2. **Step 2J** — Align sidebar/navigation permission visibility with `access-control`.
   **(Completed, 2026-06-20.)**
3. **Step 2K** — Align Settings cards with `access-control`. **(Completed, 2026-06-20.)**
4. **Step 2L** — Finance Write Access-Control Mapping Plan. **(Planning completed, 2026-06-20 —
   see `docs/modules/finance/FINANCE_WRITE_ACCESS_CONTROL_PLAN.md`.)** **Step 2S (2026-06-21)
   closed 4 of the 8 identified catalogue gaps** — `Finance/Voucher`, dedicated `BankBook`,
   `CashBook`, and `Conveyance` resources now exist (see §12). Still remaining, not started: the
   missing `Settings/CRM` catalogue entry (unblocks finishing Step 2F's CRM-admin half),
   `Finance/Payment/EDIT`, `Finance/Advance/EDIT`, `Finance/Expense/IMPORT` (3 of the original 8
   gaps — `Finance/Voucher/EXPORT` and a dedicated `Reconciliation` resource are no longer gaps;
   the former now exists, the latter was deliberately deferred per §12), and building the 33
   mapped write endpoints themselves.
5. **Step 2N** — Customer/Vendor Master page-guard migration (the most overexposed surface today
   per §9). **(Completed, 2026-06-20.)**
6. **Step 2N (API guards)** — `GET`/`POST /api/customers/master` permission hardening, aligning
   the API with the Step 2N page guard. **(Completed, 2026-06-20.)**
7. **Step 2O** — Legacy `/customers` route consolidation decision. **(Completed, 2026-06-20 —
   guarded in place, not redirected; see §3 for the full functional-gap finding.)** Follow-up,
   not started: wire `/masters/customers` to real `Customer`-table data (replacing
   `MOCK_CUSTOMERS`) with real CRUD/import/dedupe against `/api/customers/master*`, then convert
   `/customers` to a redirect once parity is reached. **(Completed, 2026-06-20 — see Step 2P
   (Customer Master) below.)**
8. **Step 2P (Customer Master)** — Wire `/masters/customers` to real Customer Master data,
   reusing `/customers`'s proven `CustomerMasterClient`. **(Completed, 2026-06-20.)** Follow-up,
   not started: verify functional parity in a live session (manual checklist, §3), then convert
   `/customers` to a redirect to `/masters/customers`. **(Completed, 2026-06-20 — see Step 2Q
   (Customer Master) below.)**
9. **Step 2Q (Customer Master)** — Convert legacy `/customers` to a redirect to
   `/masters/customers`, completing Customer Master route consolidation. **(Completed,
   2026-06-20 — live-verified: redirect chain, real data, manager and non-manager permission
   behavior all confirmed in a browser session; see §3.)** Customer Master now has one canonical
   page route. No further follow-up planned for Customer Master route consolidation.
10. **Step 2M** — Migrate Finance **read** APIs (`/api/finance/*`) from `roles.ts`-only to
    `access-control`, preserving self-service own-data access. **(Completed, 2026-06-21 — see §11
    below.)** `/api/expenses` and `/api/advances` (the existing mobile/CRM routes, distinct from
    `/api/finance/*`) were explicitly out of scope for this step and remain unchanged.
11. **Step 2S** — Close Finance permission catalogue gaps (Voucher, BankBook, CashBook,
    Conveyance) before building Finance write APIs. **(Completed, 2026-06-21 — see §12 below.)**
12. **Step 2P** — Legacy `/admin` Roles tab retirement plan (unrelated to "Step 2P (Customer
    Master)" above — see disambiguation note in §3).
13. **Step 2Q** — Decide migrate-vs-delete for `AppRole`/`RolePageAccess` (unrelated to "Step 2Q
    (Customer Master)" above — see disambiguation note in §3).
14. **Step 2U** — Seed/sync the Step 2S catalogue entries into the dev database. **(Completed,
    2026-06-21 — see §13 below.)**
15. **Step 2V** — Update the Permission Matrix UI's `MODULE_GROUPS` so the new Finance resources
    render. **(Completed, 2026-06-21 — see §14 below.)**
16. **Step 2W** — Decide and apply curated `ROLE_GRANTS` for the new Finance permission resources.
    **(Completed, 2026-06-21 — see §15 below.)** No further follow-up planned for this batch of
    catalogue gaps; Finance write APIs (out of scope for every step so far) remain the next major
    body of work whenever that is explicitly requested.

---

## 11. Step 2M Detail — Finance Read API Migration (2026-06-21)

**Scope:** the 11 `GET` handlers under `/api/finance/*` (accounts, dashboard, bank-book,
cash-book, expenses, expenses/[id], advances, conveyance, vouchers, vouchers/[id],
voucher-sequences). No Finance write API, schema change, migration, UI change, or business-logic
change was made. `roles.ts` and `canManageFinance()` were **not removed** — they remain a
documented temporary fallback.

**New helper:** `src/lib/finance/access.ts` — **table below reflects the Step 2S update; see §12
for what changed.**

| Helper | Used by | access-control check | Fallback |
|---|---|---|---|
| `canViewFinancePayments` | `accounts` only (as of Step 2S — see §12) | `Finance/Payment/VIEW` | `canManageFinance()` |
| `canViewFinanceBankBook` (Step 2S) | `bank-book` | `Finance/BankBook/VIEW` OR `Finance/Payment/VIEW` | `canManageFinance()` |
| `canViewFinanceCashBook` (Step 2S) | `cash-book` | `Finance/CashBook/VIEW` OR `Finance/Payment/VIEW` | `canManageFinance()` |
| `canViewFinanceVouchers` | `vouchers`, `vouchers/[id]`, `voucher-sequences` | `Finance/Voucher/VIEW` OR `Finance/Payment/VIEW` OR `Settings/Finance/VIEW` | `canManageFinance()` |
| `canViewFinanceDashboard` | `dashboard` | `Finance/Expense/VIEW` OR `Finance/Payment/VIEW` OR `Finance/Advance/VIEW` OR `Finance/Voucher/VIEW` | `canManageFinance()` |
| `canViewAllFinanceExpenses` | `expenses`, `expenses/[id]` | `Finance/Expense/VIEW` | `canManageFinance()` |
| `canViewAllFinanceAdvances` | `advances` (GET only) | `Finance/Advance/VIEW` | `canManageFinance()` |
| `canViewAllConveyance` | `conveyance` | `Finance/Conveyance/VIEW` OR `Finance/Expense/VIEW` | `canManageFinance()` (equivalent to the prior inline `isManager\|\|isAccounts\|\|isOperationsHead`) |

**Catalogue gaps used at the time of Step 2M/2R (since closed for Voucher/BankBook/CashBook/
Conveyance by Step 2S — see §12):**
- `Finance/Voucher` did not exist as a resource at all — `Finance/Payment/VIEW` and
  `Settings/Finance/VIEW` were the closest-fit grants for vouchers/voucher-sequences.
- No dedicated `BankBook`/`CashBook`/`Account` resource existed — `Finance/Payment/VIEW` was the
  closest fit for `accounts`, `bank-book`, `cash-book`.
- No dedicated `Conveyance` resource existed — `Finance/Expense/VIEW` was the closest fit
  (conveyance is travel-expense reimbursement on the `TravelClaim` model).
- `Finance/Payment/VIEW` remains the closest fit for `accounts` (chart-of-accounts/FinAccount
  listing) — no dedicated `Account` resource was in scope for Step 2S.

**Self-service preserved, not changed:**
- `expenses`, `expenses/[id]`, `advances` (GET), `conveyance` — own-data filtering logic
  (`employeeId === session.user.employeeId`) is untouched; only the *full-visibility* boolean
  (previously `canManageFinance(session.user)`, a synchronous call) now also accepts the matching
  `access-control` grant via an `await`-ed helper. No employee gained or lost visibility into
  another employee's records.
- `POST /api/finance/advances` (the one existing Finance write endpoint) was **not touched** —
  out of scope per the task brief ("Do not create Finance write APIs").

**Scope/DataAccessPolicy:** not applied this step. None of the Finance transaction models
(`Expense`, `EmployeeAdvance`, `TravelClaim`, `Voucher`, `Ledger`, `FinAccount`) carry a real
`branchId`/`departmentId` FK (confirmed in `FINANCE_WRITE_ACCESS_CONTROL_PLAN.md` §9 — only
`FinAccount.branchName`, free-text, no `@relation`), so `canAccessScope()`'s BRANCH/DEPARTMENT
cases would always fall through to "allow" for Finance data regardless of any `DataAccessPolicy`
row configured. Permission-level checks were applied; scope-level checks were not, per that
pre-existing, documented schema limitation — not introduced by this step.

**Validation:** `npx tsc --noEmit`, `npx prisma validate`, and
`npx cross-env RAYON_NUM_THREADS=1 next build` all pass.

---

## 12. Step 2S Detail — Finance Permission Catalogue Gap Closure (2026-06-21)

**Scope:** add dedicated `Finance/Voucher`, `Finance/BankBook`, `Finance/CashBook`, and
`Finance/Conveyance` resources to `PERMISSION_CATALOGUE` (`src/lib/access-control/permissions.ts`),
ahead of building any Finance write API. No Prisma schema change, no migration, no Finance write
API, no Finance API behavior change, no Finance UI change, and no role assignment change (see
below) were made.

**Permissions added (22 new rows — corrected 2026-06-21, Step 2V, from an earlier "27" that did
not reconcile with the action lists below; exact catalogue style — module/resource/action/description):**

| Resource | Actions |
|---|---|
| `Finance/Voucher` | `VIEW`, `CREATE`, `EDIT`, `DELETE`, `APPROVE`, `EXPORT` |
| `Finance/BankBook` | `VIEW`, `CREATE`, `EDIT`, `APPROVE`, `IMPORT`, `EXPORT` |
| `Finance/CashBook` | `VIEW`, `CREATE`, `EDIT`, `APPROVE`, `EXPORT` |
| `Finance/Conveyance` | `VIEW`, `CREATE`, `EDIT`, `APPROVE`, `EXPORT` |

`Finance/Reconciliation` was **deliberately not added** — see the dedicated note in §8 above and
`FINANCE_WRITE_ACCESS_CONTROL_PLAN.md` §15 for the full reasoning (folds into the new
`BankBook`/`CashBook` `APPROVE` actions instead of a parallel resource).

**`src/lib/finance/access.ts` updated:**
- `canViewFinanceBankBook()` and `canViewFinanceCashBook()` are **new** — each checks its
  dedicated resource's `VIEW` action first, falls through to `Finance/Payment/VIEW` (the prior
  bridge), then `canManageFinance()`.
- `canViewFinanceVouchers()` now checks `Finance/Voucher/VIEW` first, before the existing
  `Finance/Payment/VIEW`/`Settings/Finance/VIEW`/`canManageFinance()` fallback chain.
- `canViewAllConveyance()` now checks `Finance/Conveyance/VIEW` first, before the existing
  `Finance/Expense/VIEW`/`canManageFinance()` fallback chain (no longer simply delegates to
  `canViewAllFinanceExpenses()`).
- `canViewFinanceDashboard()` now also accepts `Finance/Voucher/VIEW` as a qualifying grant,
  matching the original Step 2M task brief's dashboard permission list.
- `canViewFinancePayments()` is unchanged in behavior but is now used **only** by the `accounts`
  route (chart-of-accounts/`FinAccount` listing) — `bank-book` and `cash-book` moved to their own
  dedicated helpers above.
- Every helper still ends in the `canManageFinance()` bridge — **no Finance-Operations user's
  access changes today**, since no role yet holds any of the 22 new permissions (see below).

**Routes updated to use the new/renamed helpers:** `src/app/api/finance/bank-book/route.ts`
(`canViewFinancePayments` → `canViewFinanceBankBook`), `src/app/api/finance/cash-book/route.ts`
(`canViewFinancePayments` → `canViewFinanceCashBook`). `vouchers`, `vouchers/[id]`,
`voucher-sequences`, `conveyance`, `dashboard`, and `accounts` route files were **not** edited —
they already called the correctly-named helper functions, whose internal implementation changed.

**Permission sync / seed:** `prisma/seed-admin-foundation.ts` iterates `PERMISSION_CATALOGUE`
directly and `upsert`s every entry into the `Permission` table — the 22 new rows will be created
automatically the next time that script runs (`npx tsx prisma/seed-admin-foundation.ts`); **no
change to the seed script's permission-upsert loop was required.** That script's existing "Super
Admin gets every permission" loop (queries all `Permission` rows after the upsert, then grants
each to the `Super Admin` role) will also automatically grant Super Admin all 22 new permissions —
this preserves the existing, already-documented default-role pattern without any code change.

**No other role was granted the new permissions.** `ROLE_GRANTS` in `seed-admin-foundation.ts`
(the curated per-role grant list for Business Head, Sales Head, Sales Manager, Account Manager,
Finance Manager) was **deliberately left unchanged** — extending a specific role's grants is a
product decision distinct from catalogue-gap closure, and per this step's own scope ("Do not
auto-grant new permissions to all roles unless the project already has a documented default-role
mapping"), only the existing Super-Admin-gets-all pattern qualifies as that documented mapping.
**Recommended follow-up (not done this step):** grant `Finance Manager` (and possibly `Account
Manager`) the new Voucher/BankBook/CashBook/Conveyance permissions — `Finance Manager` already
holds full `Invoice`/`Expense`/`Payment`/`Advance` access in `ROLE_GRANTS`, so extending it to the
4 new resources would match its documented "Full Finance module + reports" description — either by
adding entries to `ROLE_GRANTS` or via the Settings → Identity → Permission Matrix UI (no code
change needed for the latter, since the UI reads live `Permission` rows once the seed script has
run).

**No `roles.ts`/`canManageFinance()` fallback was removed.** It remains the universal bridge in
every `src/lib/finance/access.ts` helper, exactly as Step 2M/2R left it.

**Validation:** `npx tsc --noEmit`, `npx prisma validate`, and
`npx cross-env RAYON_NUM_THREADS=1 next build` all pass.

**Manual verification performed:**
1. `permissions.ts` contains `Finance/Voucher/{VIEW,CREATE,EDIT,DELETE,APPROVE,EXPORT}` — confirmed
   by direct read.
2. `permissions.ts` contains `Finance/BankBook/{VIEW,CREATE,EDIT,APPROVE,IMPORT,EXPORT}` —
   confirmed.
3. `permissions.ts` contains `Finance/CashBook/{VIEW,CREATE,EDIT,APPROVE,EXPORT}` — confirmed.
4. `permissions.ts` contains `Finance/Conveyance/{VIEW,CREATE,EDIT,APPROVE,EXPORT}` — confirmed.
5. No duplicate catalogue entries — each new `(module, resource, action)` triple is unique; the
   upsert's compound key (`module_resource_action`) would also reject a true duplicate at the DB
   level, but none was introduced.
6. Permission sync/seed script (`seed-admin-foundation.ts`) still compiles — covered by
   `npx tsc --noEmit` above (it imports `PERMISSION_CATALOGUE` directly, so a catalogue-shape
   error would have surfaced there).
7. Settings → Identity → Permission Matrix UI — not independently re-verified in a browser this
   step (no Settings/Identity page code was changed); since that UI renders whatever the
   `Permission` table contains, the 22 new rows will appear automatically once the seed script is
   re-run. **Resolved 2026-06-21 (Step 2V)** — the seed script was run (Step 2U) and the
   Permission Matrix UI's `MODULE_GROUPS` was updated to render the new resources (Step 2V).
8. Manager (`isManager`) access to all `/api/finance/*` GET routes — unaffected, since
   `canManageFinance()` still short-circuits every helper's fallback.
9. Accounts/Operations-Head access via the `canManageFinance()` bridge — unaffected, same
   reasoning as #8.
10. Normal employee self-service access (own expenses/advances/conveyance) — unaffected; no
    self-service code path was touched this step.
11. Finance APIs compile and build — confirmed via the validation commands above.

---

## 13. Step 2U Detail — Dev Database Seed/Sync (2026-06-21)

**Scope:** run the existing `prisma/seed-admin-foundation.ts` against the dev database to
materialize the Step 2S catalogue entries as real `Permission` rows, and verify the result. No
Prisma schema change, no migration, no Finance write API, no Finance API logic change, no Finance
UI change, and no role-grant change beyond the seed script's pre-existing, unmodified
"Super Admin gets every permission" loop.

**Pre-run safety check:** `prisma/seed-admin-foundation.ts` was inspected line-by-line —
`Permission` rows are `upsert`ed on the same `@@unique([module, resource, action])` key the schema
defines (confirmed in `prisma/schema.prisma`), `update: { description: def.description }` never
deletes a row, `RolePermission`/`DataAccessPolicy` rows are also `upsert`-only, and the curated
`ROLE_GRANTS` array (Business Head/Sales Head/Sales Manager/Account Manager/Finance Manager) was
not edited as part of Step 2S or this step — confirmed safe to run.

**Environment confirmed:** `.env`'s `DATABASE_URL` resolves to `srv2201.hstgr.io` /
`u686730471_caveodev` — the documented dev database (`CLAUDE.md` "Local dev now uses a Hostinger
DEV database"), not production.

**Command run:** `DATABASE_URL=<dev URL> npx tsx prisma/seed-admin-foundation.ts` (Prisma 7 does
not auto-load `.env` for standalone CLI scripts — set inline, per the existing documented gotcha).

**Output:** `Permissions upserted: 101`, `Roles ready: 6`, `Super Admin granted 101 permissions`,
`Role grants upserted: 98`, `DataAccessPolicies upserted: 24`, `Admin Console Phase 2 seed
complete.`

**DB verification (read-only script, deleted after use):**
- All 22 `Finance/{Voucher,BankBook,CashBook,Conveyance}` rows present and exactly matching §12's
  per-resource action lists (Voucher 6, BankBook 6, CashBook 5, Conveyance 5 = 22). §3/§12
  previously described this as "27 new permission rows," which did not reconcile against the
  action lists documented in the same sections — **corrected to 22 throughout this tracker,
  `RBAC_AUDIT_REPORT.md`, `FINANCE_WRITE_ACCESS_CONTROL_PLAN.md`, and `PROJECT_MEMORY.md` in
  Step 2V (see §14).**
- Zero duplicate `(module, resource, action)` triples across all 101 rows in the `Permission`
  table.
- The 4 pre-existing Finance resources (`Invoice`, `Expense`, `Payment`, `Advance` — 17 rows)
  confirmed still present and unmodified.

**Settings → Identity → Permission Matrix UI verification:** partially blocked. The backing API
(`GET /api/admin/identity/permissions`) queries `prisma.permission.findMany()` directly with no
hardcoded filter, so it already returns all 101 live rows including the 22 new ones. However,
`src/app/settings/identity/components/PermissionMatrix.tsx`'s client-side `MODULE_GROUPS` constant
hardcodes which resources render per module, and its `Finance` entry is
`["Invoice", "Expense", "Payment", "Advance"]` — it does not include `Voucher`, `BankBook`,
`CashBook`, or `Conveyance`. Until that array is updated, the new resources exist in the database
and are returned by the API, but will not appear as rows in the matrix grid. This is a pre-existing
UI gap, not introduced by this step — flagged per this step's own scope (UI changes were out of
bounds) rather than fixed. **Closed 2026-06-21 (Step 2V) — see §14.**

**Role grants:** unchanged beyond the seed script's existing, untouched Super-Admin-gets-all loop.
No business role (`Finance Manager`, `Account Manager`, etc.) was granted any of the 22 new
permissions — consistent with Step 2S's own recommendation that role-grant extension is a separate
product decision.

**Validation:** `npx prisma validate`, `npx tsc --noEmit`, and
`npx cross-env RAYON_NUM_THREADS=1 next build` all pass (build completed successfully, including
`/settings/identity`).

---

## 14. Step 2V Detail — Permission Matrix UI Update (2026-06-21)

**Scope:** make the Step 2S/2U Finance permission rows visible in the Settings → Identity →
Permission Matrix UI. No Prisma schema change, no migration, no Finance API change, no Finance UI
page change, no Finance write API, no permission-enforcement logic change, and no role-grant
change (`ROLE_GRANTS`, `RolePermission` assignments, default role grants, or
`seed-admin-foundation.ts` grant logic) were made — role-grant mapping remains a separate,
not-yet-started step (Step 2W).

**File changed:** `src/app/settings/identity/components/PermissionMatrix.tsx` only.

1. **`MODULE_GROUPS`** — the `Finance` entry's `resources` array extended from
   `["Invoice", "Expense", "Payment", "Advance"]` to
   `["Invoice", "Expense", "Payment", "Advance", "Voucher", "BankBook", "CashBook", "Conveyance"]`.
   The 4 pre-existing resources were left untouched (same order, same names) and the 4 new ones
   appended in the order the task brief preferred (Voucher, BankBook, CashBook, Conveyance) — no
   resource was renamed, removed, or duplicated.
2. **`NOT_APPLICABLE`** — extended with the action gaps each new resource doesn't have in
   `PERMISSION_CATALOGUE`, matching the existing pattern already used for `Payment`/`Advance`:
   `Finance/Voucher/{IMPORT,ASSIGN}`, `Finance/BankBook/{DELETE,ASSIGN}`,
   `Finance/CashBook/{DELETE,IMPORT,ASSIGN}`, `Finance/Conveyance/{DELETE,IMPORT,ASSIGN}`. This
   ensures the matrix only renders toggles for actions that actually exist in the catalogue for
   each resource — no action was invented.
3. **`buildMockGrants()`** (the API-unavailable fallback) required **no change** — it already
   iterates `MODULE_GROUPS`/`NOT_APPLICABLE` dynamically, so the new resources are picked up
   automatically.

**API verification (no change made):** `GET /api/admin/identity/permissions`
(`src/app/api/admin/identity/permissions/route.ts`) already calls
`prisma.permission.findMany()` with no hardcoded resource filter — it was already returning all
101 live rows (including the 22 new ones) before this step. The UI gap was purely in the client
component's hardcoded render list, not the API.

**27 → 22 documentation correction:** the incorrect "27 new permission rows" figure (which did not
reconcile against the per-resource action counts — Voucher 6 + BankBook 6 + CashBook 5 +
Conveyance 5 = 22 — documented in the same sections) has been corrected to **22** everywhere it
appeared: this file (§3, §4 Step 2S/2U rows, §12), `RBAC_AUDIT_REPORT.md` (Step 2S completion
note), `FINANCE_WRITE_ACCESS_CONTROL_PLAN.md` (§15), and `PROJECT_MEMORY.md` (Step 2S entry).

**Manual verification performed:**
1. `PermissionMatrix.tsx`'s `MODULE_GROUPS` Finance array includes `Voucher`, `BankBook`,
   `CashBook`, `Conveyance` — confirmed by direct read.
2. No duplicate resource names in the Finance array — confirmed (8 distinct strings).
3. The 4 pre-existing Finance resources (`Invoice`, `Expense`, `Payment`, `Advance`) still present,
   unchanged, same position — confirmed.
4. `GET /api/admin/identity/permissions` already returns the 22 new rows — confirmed by reading
   its Prisma query (no hardcoded filter) and by the Step 2U DB verification.
5. No `ROLE_GRANTS`, `RolePermission`, or seed grant-logic edits were made — confirmed via diff
   review (only `PermissionMatrix.tsx` touched).
6. Settings → Identity → Permission Matrix rendering — see browser verification note below.

**Validation:** `npm run build`, `npx tsc --noEmit`, and `npx prisma validate` all pass.

---

## 15. Step 2W Detail — Curated Role Grants for New Finance Permissions (2026-06-21)

**Scope:** decide and apply curated `ROLE_GRANTS` for the 22 Step 2S/2U/2V Finance permissions
(`Finance/Voucher`, `Finance/BankBook`, `Finance/CashBook`, `Finance/Conveyance`). No Prisma
schema change, no migration, no Finance write API, no Finance API/UI logic change, and no
`roles.ts`/`canManageFinance()` fallback removal were made.

**Task 1 — role-grant pattern confirmed before any edit:**
- `ROLE_GRANTS` (`prisma/seed-admin-foundation.ts`) is the curated mapping: an array of
  `[roleName, module, resource, actions[]]` tuples, matched against the `Role` model by **name**
  (`roleMap.get(roleName)`), not by ID or slug — IDs are assigned at seed time via
  `findFirst`-or-`create` and looked up by name afterward.
- Grant application is `prisma.rolePermission.upsert()` on the `@@unique([roleId, permissionId])`
  key — idempotent, never deletes an existing `RolePermission` row. Super Admin is granted every
  permission in a separate, earlier loop (`allPerms.forEach(...)`), independent of `ROLE_GRANTS`.
- Confirmed via the dev DB itself before editing: `Role` model has exactly 6 rows (`Super Admin`,
  `Business Head`, `Sales Head`, `Sales Manager`, `Account Manager`, `Finance Manager`). No
  `Accounts Team`/`Accounts Admin`/generic `Manager` role exists in this system. The legacy
  `Employee.role` column has a literal `"Accounts"` value (one employee, `isManager: false`), but
  that string is consumed only by `src/lib/roles.ts`'s `isAccounts()` predicate — a parallel,
  separate authorization bridge with no relationship to `Role`/`RolePermission`. Conflating the
  two would have meant inventing a `Role` row the project doesn't have; this was deliberately not
  done.

**Task 2 — roles discovered (from the dev DB, not assumed):** `Super Admin`, `Business Head`,
`Sales Head`, `Sales Manager`, `Account Manager`, `Finance Manager`. No `Accounts`, `Accounts
Team`, `Accounts Admin`, or generic `Manager` role exists as a `Role` row.

**Task 3 — grant mapping decided:**
| Role | New grants | Reasoning |
|---|---|---|
| `Finance Manager` | Full `Voucher` (VIEW/CREATE/EDIT/DELETE/APPROVE/EXPORT), `BankBook` (VIEW/CREATE/EDIT/APPROVE/IMPORT/EXPORT), `CashBook` (VIEW/CREATE/EDIT/APPROVE/EXPORT), `Conveyance` (VIEW/CREATE/EDIT/APPROVE/EXPORT) — 22 permissions | Matches the role's own documented description ("Full Finance module + reports") and the exact mapping the task brief specified for "Finance Manager / Accounts Admin" (no distinct Accounts Admin role exists, so only Finance Manager applies) |
| `Business Head` | `Conveyance/VIEW`, `Conveyance/APPROVE` — 2 permissions | Business Head already holds `Finance/Expense/{VIEW,APPROVE}` in `ROLE_GRANTS` — Conveyance (travel-expense reimbursement on the `TravelClaim` model, per Step 2M's own characterization) is the same class of organization-wide expense approval, now expressed through its dedicated resource instead of the prior `Finance/Expense` fallback. No `BankBook`/`CashBook`/`Voucher` granted — Business Head has never had ledger-level or voucher-issuance access, and the task brief explicitly cautioned against granting those "unless the current project policy says managers need finance operations access," which it does not |
| `Sales Head`, `Sales Manager`, `Account Manager` | None | No existing Finance-approval grants to extend (Account Manager's existing `Finance/{Invoice,Payment}/VIEW` and `Finance/Expense/{VIEW,CREATE}` are sales-side, self-scoped CRM-adjacent grants, not finance-operations authority); per the task brief's "Normal Employee/BDE/Sales" guidance, operational Finance permissions were not extended to these roles |
| `Super Admin` | None needed | Already covered by the existing, untouched grant-all loop |
| `Accounts Team` / `Accounts Admin` | N/A — role does not exist | Documented rather than invented; if a dedicated Accounts-operations `Role` is created in the future, the task brief's suggested mapping (Voucher VIEW/CREATE/EDIT/EXPORT; BankBook VIEW/CREATE/EDIT/IMPORT/EXPORT; CashBook VIEW/CREATE/EDIT/EXPORT; Conveyance VIEW/EXPORT — no DELETE/APPROVE) is recorded here as the recommended starting grant for that future role |

**File changed:** `prisma/seed-admin-foundation.ts` only — 6 new `ROLE_GRANTS` tuples added (4 for
`Finance Manager`, 1 for `Business Head` covering 2 actions), inserted adjacent to each role's
existing Finance grants. No existing tuple was edited, reordered, or removed.

**Task 5 — seed run:** `DATABASE_URL` confirmed pointing at the dev DB
(`u686730471_caveodev` on `srv2201.hstgr.io`) before running. `npx tsx
prisma/seed-admin-foundation.ts` executed against dev only. Output: `Permissions upserted: 101`,
`Super Admin granted 101 permissions`, `Role grants upserted: 122` (up from Step 2U's 98 — exactly
+22 for Finance Manager +2 for Business Head = +24, reconciling precisely), `DataAccessPolicies
upserted: 24` (unchanged, confirming no policy rows were touched).

**Task 6 — DB verification (read-only script, deleted after use):**
- `Finance Manager`: 22/22 new permissions present in `RolePermission`, exactly matching the
  planned mapping (`BankBook`×6, `CashBook`×5, `Conveyance`×5, `Voucher`×6).
- `Business Head`: 2/2 — only `Conveyance/VIEW` and `Conveyance/APPROVE`.
- `Sales Head`, `Sales Manager`, `Account Manager`: zero grants on any of the 4 new resources —
  confirmed by querying for `RolePermission` rows against the 22 new `Permission` IDs and finding
  no matches for these three roles.
- `Super Admin`: still holds all 101/101 permissions (`rolePermission.count` for Super Admin's
  `roleId` equals `permission.count()` for the whole table).
- Zero duplicate `RolePermission` rows (checked by `roleId:permissionId` composite key across all
  46 grant rows touching the 4 new resources).

**Task 7 — Permission Matrix UI verification (live API, not mock fallback):** Same `.next`-cache
gotcha from Step 2V's verification recurred (a prior `next build` run had written a stale
production manifest that 404'd every `/api/admin/identity/*` route mid-session, silently
triggering the component's mock-data fallback). Caught it the same way — a raw `fetch()` to
`/api/admin/identity/permissions?roleId=6` returned an HTML 404 body instead of JSON — cleared
`.next`, restarted the dev server, and re-verified. With live data confirmed (`fetch` returning
real JSON, `granted: false`/`granted: true` values matching the DB query above), the UI was
checked for: `Finance Manager` — all 4 new resources fully Granted matching the catalogue's action
list per resource; `Business Head` — only `Conveyance/VIEW`+`Conveyance/APPROVE` Granted, all
other new-resource actions Denied; `Account Manager` — all new-resource actions Denied; `Super
Admin` — all new-resource actions Granted. Screenshot captured of the Finance Manager view as
visual proof.

**Self-service / Finance read routes unaffected:** no file in `src/lib/finance/access.ts` or any
`/api/finance/*` route was touched this step — those routes still resolve through
`canManageFinance()`/the existing `access-control` helper chain exactly as Step 2M/2S/2U left them.
Employee self-service (own expenses/advances/conveyance) filtering is untouched.

**Validation:** `npx tsc --noEmit`, `npx prisma validate`, and `npm run build` all pass.

---

## Step 3U — Decimal Release 2 (Sales/CRM/KRA Lakhs → INR migration, 2026-06-23)

Not an RBAC change. Implemented the combined Release 2 INR migration on the dev DB
(`u686730471_caveodev` only): 10 Sales/CRM money fields converted Float → Decimal(18,2) storing
actual ₹ INR (`Payment`, `Collection`×3, `OrderAdvance`, `CrmLead`, `CrmOpportunity`×3,
`SalesFunnel`×2), plus the 3 AMOUNT-typed `KRATemplateItem` rows and 8 confirmed-money
`KRA.target`/`EmployeeTarget.targetJson` entries multiplied by 100000 in place. `kra-engine.ts`,
`payments.ts`, ~15 API routes, Sales/CRM UI forms, mobile screens, and dashboards updated so Lakhs
survives only as display formatting. No RBAC/permission tables touched. Full record:
`docs/database/DECIMAL_RELEASE2_MIGRATION_RESULTS.md`,
`docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md` §16.

## Step 3V-1 — Release 2 Audit Closure (TeamTarget table-name fix, 2026-06-23)

Not an RBAC change. Closed out the one open item from Step 3V's post-migration audit: a
`TeamTarget` query had aborted with `ER_NO_SUCH_TABLE` because the audit script used the Prisma
model name (`TeamTarget`) as a raw-SQL table name instead of its `@@map("team_target")`-mapped
physical table. Re-ran the same closure checks via the Prisma client (mapping resolved
automatically): `TeamTarget` confirmed still 0 rows; all 34 `KRA.target` and
`EmployeeTarget.targetJson` rows re-scanned for confirmed-money labels with 0 anomalies; all 14
non-`AMOUNT` `KRATemplateItem` rows confirmed unmultiplied. No hidden Release 2 regression found.
Verification-only — no schema, code, or data change; no RBAC/permission tables touched. Full
record: `docs/database/DECIMAL_RELEASE2_MIGRATION_RESULTS.md` §4,
`docs/database/DECIMAL_RELEASE2_COMBINED_SCOPE_SIGNOFF.md` §17.

## Step 3W — Production Decimal / INR migration planning (2026-06-23)

Not an RBAC change. Created `docs/database/PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md` —
a planning, risk-review, and sign-off document only; no production database was queried, no
migration was run, no schema/code/data was changed, no `db push` was used. Summarizes both
completed and audited dev releases (Release 1: `Expense`/`EmployeeAdvance`/`TravelClaim`;
Release 2: `Payment`/`Collection`/`OrderAdvance`/`CrmLead`/`CrmOpportunity`/`SalesFunnel`/Sales-
KRA targets) and documents that production has explicitly NOT been migrated for either
(`docs/DATABASE.md`). Key finding: production's `_prisma_migrations` was seeded with a single
baseline row at the 2026-06-02 SQLite→MySQL cutover with no subsequent production migrate-deploy
event documented anywhere — read literally, every one of the ~20 migrations since that baseline
(not just the two Decimal releases) may still be unapplied to production. Separately, `master`
(the documented production branch) is 78 commits behind `uat` (confirmed via `git rev-list
--count master..uat`) — every feature in both Decimal releases exists only on `uat`. Every
production-state claim in the new document is marked "Needs verification," not assumed. Covers
production pre-checks, the migration-history gap review extended to the full migration list (not
just the previously-known `add_advance_category`/`employeetarget_relations` gap), backup/rollback
plan, maintenance-window plan, a designed-not-executed execution sequence, a production
verification plan, and Go/No-Go + sign-off ledgers — both fully Pending. No production execution
is authorized by this step. `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅ —
reconfirmations only, since no app code changed.

## Step 3X — Production pre-check dry run (2026-06-23)

Not an RBAC change. Read-only fact-finding step only — no production database was modified or
even queried; no migration was run, resolved, or deployed; no schema/API/UI code changed; no
`db push` used. Attempted to convert Step 3W's "Needs verification" findings into facts and was
**blocked on production database access**: this environment has no confirmed, safely-usable
production `DATABASE_URL` — the local `.env` points at the dev DB (`u686730471_caveodev`), and a
local `.env.hostinger` file is not documented anywhere as the live production config (per
`CLAUDE.md`, the real production env file lives only on the remote Hostinger server). No password
or full connection string was printed at any point. As a result, Tasks 2–7 (DB identity,
`_prisma_migrations`, schema snapshot, row counts, unit sampling, KRA/Sales target classification)
remain "Needs verification," explicitly documented with the blocker reason, not guessed.
**What was confirmed, read-only via git history alone (Task 1/8, no DB needed):** current branch
`uat` at commit `76159d7…`; `master` (production's branch) is **79 commits behind `uat`**, with
**0** commits unique to `master`; `master`'s checked-in `prisma/migrations/` folder has 16
entries ending at `20260610090000_security_center` — 7 short of `uat`'s 23, missing both the
`add_advance_category`/`employeetarget_relations` gap pair and both Decimal releases;
`src/lib/money.ts` does not exist on `master` at all; every Release 1/2 target field
(`Payment.amountLakhs`, etc.) is confirmed still `Float`/`Float?` in `master`'s own
`prisma/schema.prisma`, not `Decimal`; dependency versions (`prisma`, `@prisma/adapter-mariadb`,
`next`) are identical between branches, so the gap is application code and migrations, not a
tooling-version mismatch. Recommended next step: a human with confirmed production access must
either provide a verified production read-only credential through a channel that doesn't require
pasting it into a transcript, or run the still-blocked queries directly. Full record:
`docs/database/PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md` ("Production Pre-Check Dry Run
Results"). `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅.

## Step 3Y — Human-run production read-only pre-check pack (2026-06-23)

Not an RBAC change. Created a self-contained, read-only pre-check pack for a human/admin with
confirmed production access to run directly — `docs/database/production-precheck/` (`README.md`,
`production-readonly-precheck.sql`, `production-precheck-result-template.md`,
`production-precheck-safety-checklist.md`) plus an optional guarded companion script
(`scripts/production-readonly-precheck.mjs`). **No production database was queried, no migration
was run/resolved/deployed, no schema/API/UI code changed, no `db push` used, no credential
printed** — every file is a static artifact produced from this local dev environment. The SQL
file uses the real `@@map`-resolved physical table names (`kra_metric`/`kra_template`/
`kra_template_item`/`employee_target`/`team_target`), confirmed directly from
`prisma/schema.prisma`, not guessed, and contains only `SELECT`/`SHOW`/`INFORMATION_SCHEMA`
statements — independently re-confirmed via a `grep` for every forbidden write keyword
(`INSERT`/`UPDATE`/`DELETE`/`ALTER`/`DROP`/`TRUNCATE`/`CREATE`/`REPLACE`/`RENAME`/`GRANT`/
`REVOKE`/`SET FOREIGN_KEY_CHECKS`), zero matches outside comments. The optional script refuses to
run without `CONFIRM_PRODUCTION_READONLY_PRECHECK=YES`, refuses to run against the known dev DB
name (`u686730471_caveodev`) since its whole purpose is a production check, never prints
`DATABASE_URL`/username/password (only a masked host + DB name), and re-validates every query
against the same forbidden-keyword guard immediately before executing it, not just at startup.
Production migration readiness remains unchanged from Step 3X (blocked, pending a human running
this pack against the real production database) — this step did not advance any "Needs
verification" finding to a fact itself. `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run
build` ✅.

## Step 3Z — UAT-first deployment decision recorded (2026-06-23)

Not an RBAC change. Business decision: production migration is **paused**; the Decimal/INR
migration must be implemented and tested on **UAT** first. New flow: dev (complete, audited) →
UAT migration + testing → UAT sign-off → production planning resumes → production migration only
after approval. Created `docs/database/UAT_DECIMAL_INR_MIGRATION_PLAN.md` (UAT scope mirroring
Release 1 + Release 2; pre-checks; a 13-step designed-not-executed execution sequence; a Finance/
Sales/KRA/Technical test plan; a sign-off checklist; the production gate this unblocks) and
`docs/database/uat-precheck/` (README, `uat-readonly-precheck.sql`,
`uat-precheck-result-template.md`, `uat-precheck-safety-checklist.md` — adapted from the
production pre-check pack, but explicitly UAT-scoped and using only documented UAT identifiers
from this repo's own session history, e.g. `u686730471_Caveo_UAT`/`u686730471_caveouat` per
`docs/CHANGELOG.md`/`docs/NEXT_SESSION.md` Session 9 — never production credentials).
**Grounding fact carried into the new plan:** per Session 9 (2026-06-19), UAT was bootstrapped
from a full schema dump covering the first 19 of this project's 22 migrations (through
`20260618100000_crm_lead_customer_ref`) — meaning UAT's likely outstanding migration gap, unlike
production's much larger and still-unconfirmed gap, is probably just the 3 migrations created
after that bootstrap: `add_soft_delete_fields_phase_a`, `decimal_release1_lakhs_to_inr`,
`decimal_release2_combined_inr_canonical`. This is documented from existing project history, not
independently re-verified this step — the new UAT pre-check pack exists specifically to confirm
it before any UAT migration runs. `docs/database/PRODUCTION_DECIMAL_INR_MIGRATION_SIGNOFF_PLAN.md`
gains a top-of-document deferral notice; nothing in it is withdrawn. **No production or UAT
database was connected to, no migration was run, no schema/API/UI code changed, no `db push`
used.** `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅.

## Step 4A — UAT pre-check dry run (2026-06-23)

Not an RBAC change. Attempted to convert `UAT_DECIMAL_INR_MIGRATION_PLAN.md`'s "Needs
verification" rows into facts by running the UAT pre-check pack's checks from this dev
environment. **Blocked before any DB query:** no confirmed, externally-reachable UAT credential
exists here. `.env.uat.example`'s `DATABASE_URL` uses connecting user `u686730471_uatuser`, which
does not match the documented working UAT user `u686730471_caveouat` (per `docs/CHANGELOG.md`
Session 9), and its host `127.0.0.1` only resolves correctly when the file is deployed onto the
UAT server itself, not from this workstation. No documented external UAT hostname exists (unlike
dev's `srv2201.hstgr.io`), and there is no record confirming this workstation's IP is whitelisted
in hPanel → Remote MySQL for the UAT database. Per the step's own instruction ("if UAT DB cannot
be safely reached, stop and document blocker"), every DB-dependent finding (DB identity,
`_prisma_migrations` state, schema snapshot, row counts, unit sampling, KRA/Sales target
classification, live branch/app gap) was recorded as "Needs verification — blocked" in
`docs/database/UAT_DECIMAL_INR_MIGRATION_PLAN.md`'s new "UAT Pre-Check Dry Run Results" section,
rather than guessed at. Static, non-DB facts (local branch `uat`, clean working tree, current
commit, local migration folder listing — 21 dirs + lock file) were confirmed directly. **No UAT
or production database was connected to, no migration was run, no schema/API/UI code changed, no
`db push` used.** `npx prisma validate` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅.

## Step 4B — UAT pre-check actually run against real UAT database (2026-06-24)

Not an RBAC change. The Step 4A blocker was resolved by an operator with confirmed SSH/MySQL
access to UAT, who ran `docs/database/uat-precheck/uat-readonly-precheck.sql` directly on the
UAT server and relayed sanitized output back (`SELECT DATABASE()` = `u686730471_Caveo_UAT`,
confirming genuine UAT — no host/user/password was shared). **Confirmed clean:**
`_prisma_migrations` has 19 rows, missing exactly the 3 predicted migrations
(`add_soft_delete_fields_phase_a`, `decimal_release1_lakhs_to_inr`,
`decimal_release2_combined_inr_canonical`); every in-scope Release 1/2 column is still
Float/Text; row counts match Session 9's documented estimates exactly. **Two new findings that
block running the planned migration as-is:** (1) `Payment`/`Collection`/`OrderAdvance` data on
UAT samples at scales implausible as ₹ Lakhs (e.g. a `Collection` invoice value of 7,979,986) —
these 3 models appear to already store actual ₹ INR, contradicting the project-wide Lakhs
convention, and would be corrupted by the planned ×100,000 transform; (2) UAT's `KRA.target`
free-text only contains 2 of dev's 6 documented confirmed-money labels in the sample reviewed —
the rest need independent re-classification. A third, minor finding: one `CrmOpportunity.value`
row is negative (-0.1), flagged for business review. Also newly confirmed: `kra_template_item`/
`kra_metric`/`kra_template` all have 0 rows on UAT — the structured KRA engine is unpopulated
there, unlike dev. Full findings: `docs/database/uat-precheck/uat-precheck-result-template.md`
and `docs/database/UAT_DECIMAL_INR_MIGRATION_PLAN.md`'s new "UAT Pre-Check Results — Confirmed
Live Findings" section. **No UAT or production data was changed — read-only throughout. UAT
migration still not run, still blocked** pending business-side resolution of the unit-scale
finding and the `KRA.target` re-classification.
