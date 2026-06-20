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
| 2M | Migrate Finance **read** APIs from `roles.ts`-only (`canManageFinance`, `isAccounts`, `isOperationsHead`) to `access-control` + own-scope rules | Not started | High — these are user-facing, high-traffic routes (`/api/finance/*`, `/api/expenses`, `/api/advances`); a careless migration could lock out legitimate Accounts/Operations-Head users who aren't `isManager` | Requires defining `Finance/{Expense,Advance,Payment,Invoice}/VIEW` scope rules (`OWN` vs `ALL`) via `DataAccessPolicy`, not a simple swap |
| 2N | Migrate Customer/Vendor Master **page-level** guards to `access-control` | **Done this step (2026-06-20)** | Low — additive bypass (`canView \|\| isManager`, matching the sidebar's existing manager-only bypass), no manager lost access; non-manager employees with no real grant now correctly lose access to `/masters/customers`/`/masters/vendors` — this is the intended fix, not a regression | `/masters/customers/page.tsx` and `/masters/vendors/page.tsx` now call `hasPermission(userId, "Masters", "CustomerMaster"\|"VendorMaster", "VIEW")`; legacy `/customers` remains session-only (unchanged, TODO added) — its retirement is Step 2O |
| 2O | Retire or redirect `/customers` legacy route | Not started | Low-Medium — functional overlap with `/masters/customers`; needs a product decision on which is canonical before any redirect | Blocked on a product decision, not a technical blocker |
| 2P | Retire `/admin` legacy route after safe replacement | Not started | Medium — `/admin` already `redirect()`s to `/settings/administration`'s `AdminClient`, but the embedded Roles & Access tab (now freeze-bannered) and several other tabs have no `/settings/*` equivalent yet | Cannot retire until every tab's functionality has a confirmed `/settings/*` home |
| 2Q | Retire `AppRole` / `RolePageAccess` after data migration decision | Not started | Low (no runtime consumers) but **data-loss risk if rushed** | Decide: migrate any real-world role customizations into `Role`/`Permission`/`UserRole`, or confirm they're fully superseded and safe to drop; do not delete the Prisma models until that decision is made and a DB backup exists |
| 2R | Remove dead `rbac.ts` enforcement helpers (`hasPermission`, `loadRolePermissions`) after no consumers remain | Not started | Low | Straightforward once Step 2Q is complete and the `/admin` Roles tab (Step 2P) is gone — `seedDefaultRoles()`/`PAGES`/`DEFAULT_ROLES` would need their own follow-up decision since they're still referenced by `/api/admin/roles*` |

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
- **`Finance / Voucher` does not exist in the catalogue at all.** Voucher administration is
  currently covered only by `Settings/Finance` (the admin-config route, Step 2F), not a
  dedicated `Finance/Voucher` resource. Flagged as a gap, not invented.

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
  `/masters/vendors` now require `Masters/CustomerMaster`-or-`VendorMaster`/`VIEW`. Legacy
  `/customers` remains overexposed (no permission gate beyond session) until Step 2O retires or
  redirects it.
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
   see `docs/modules/finance/FINANCE_WRITE_ACCESS_CONTROL_PLAN.md`.)** Remaining, not started:
   add the missing `Settings/CRM` catalogue entry (unblocks finishing Step 2F's CRM-admin half),
   add the 8 Finance catalogue gaps the plan identified (`Finance/Voucher`,
   `Finance/Payment/EDIT`, `Finance/Advance/EDIT`, dedicated BankBook/CashBook/Conveyance/
   Reconciliation resources, `Finance/Expense/IMPORT`, `Finance/Voucher/EXPORT`), and build the
   33 mapped write endpoints themselves.
5. **Step 2N** — Customer/Vendor Master page-guard migration (the most overexposed surface today
   per §9). **(Completed, 2026-06-20.)**
6. **Step 2M** — Migrate Finance **read** APIs (`/api/finance/*`, `/api/expenses`,
   `/api/advances`) from `roles.ts`-only to `access-control` + own-scope `DataAccessPolicy` rules.
7. **Step 2O/2P** — Legacy route retirement plan for `/customers` and `/admin`.
