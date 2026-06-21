# RBAC Audit Report

> Generated 2026-06-20. Read-only audit — no application code, migrations, or schema were modified. No routes were fixed. The only file produced is this report.

---

## 1. Executive Summary

The CRM has **three permission systems in concurrent use**, plus a **fourth gap class that is more serious than system fragmentation**: several write endpoints (some newly confirmed, beyond the two originally flagged) have **no permission check of any kind**, and the entire Approval Engine action endpoint has **no object-level authorization** — any authenticated employee can approve, reject, or cancel any approval request in the system by guessing/incrementing an ID, regardless of whether they are a designated approver.

**The three systems:**
1. **`src/lib/roles.ts`** — legacy string-matching predicates (`isManager`, `canManageFinance`, `isAccounts`, `canAccessSettings`, etc.). **Actively enforced** — used by 65 files, including nearly every page-level guard and the sidebar.
2. **`src/lib/rbac.ts`** — DB-driven `AppRole`/`RolePageAccess` matrix with its own `hasPermission()`. **Decorative, not enforced** — its `hasPermission()`/`loadRolePermissions()` functions have **zero callers anywhere in the app**. The only thing actually used from this file is `seedDefaultRoles()` and the `PAGES` constant, purely to populate the legacy `/admin` "Roles & Access" tab UI.
3. **`src/lib/access-control/`** (`requirePermission`, `hasPermission`, `canAccessScope`) — newer `Role`/`Permission`/`UserRole`/`DataAccessPolicy` model. **Actively enforced** on most Admin/Identity/Masters/CRM-admin/Performance/Communication/Integration/Security routes — used by 71 files. Has two documented backward-compatible fail-open behaviors: `isManager` always passes regardless of `UserRole` rows, and `canAccessScope()` returns `true` (allow) when no `DataAccessPolicy` row exists for the role+module.

**The two previously-confirmed unguarded routes are still unguarded** (verified at current line numbers below), **and this audit found three more write-capable route files with the identical gap** (`admin/customer-policy`, `admin/vendor-policy`, `admin/masters/overrides`, `admin/masters/values` — session-only, no permission/manager check), plus one **public, no-auth-at-all** route (`/api/master-values`, likely intentional as a dropdown lookup but undocumented as such — **RESOLVED 2026-06-20, see §10 item 7**).

**The single most serious finding** is not a missing-permission-system issue: `POST /api/approvals/[id]/action` lets any authenticated employee invoke `APPROVE`/`REJECT`/`RETURN`/`DELEGATE`/`CANCEL` against **any `requestId`**, because `approveRequest()`/`rejectRequest()`/etc. in `src/lib/workflow-engine/approval.ts` never check that the calling `actorId` is actually an authorized approver (or delegate) for that request's current step. This affects every workflow that routes through the global Approval Engine, including large-deal approvals (>₹50L opportunities), discount approvals, expense approvals, and advance approvals.

**Recommended single source of truth:** `access-control` (Module × Resource × Action × Scope), as the task brief anticipated. It is the only system with a real catalogue, a scope-aware data filter, and the broadest current enforcement footprint. See §8 for the full justification and migration path.

---

## 2. Permission Systems Found

### 2.1 `src/lib/roles.ts` — Legacy role predicates

| | |
|---|---|
| **Purpose** | Flexible string-matching over `Employee.role` + the `isManager` boolean. No DB table of its own — reads directly off the `Employee` row already in the session. |
| **Roles/permissions supported** | Coarse booleans: `isOperationsHead`, `isAccounts`, `isHeadOfSales`, `canSeeAllCollections`, `canManagePayments`, `hasManagerReach`, `usesFinanceNav`, `canManageFinance`, `canAccessSettings`. No granular resource/action model — each function answers one yes/no question for one feature area. |
| **Where used** | 65 files — nearly every page-level `redirect()` guard (Finance pages, Approvals, Settings landing pages, legacy Admin panel), the sidebar (`SidebarLinks.tsx` via `Navbar.tsx`), and several API routes (`finance/*`, `advances`, `payments`, `collections`). |
| **Actively enforced?** | **Yes** — this is the most heavily relied-upon system for page-level gating today. |
| **Admin-editable?** | **No.** These are hardcoded string-matching functions; there is no UI to redefine what "Operations Head" or "Accounts" means. Changing behavior requires a code change. |
| **Conflicts with another system?** | Yes — see §7. Its `canAccessSettings()` is the *sole* guard on the legacy `/admin` panel and `/settings/administration`, which is two clicks away from editing the *same* role/permission data that `access-control` also governs via `/settings/identity`. |

### 2.2 `src/lib/rbac.ts` — `AppRole` / `RolePageAccess` matrix

| | |
|---|---|
| **Purpose** | A DB-backed page-level permission matrix (`canView`/`canCreate`/`canEdit`/`canDelete` per `pageKey`), seeded from `DEFAULT_ROLES`. Designed to back the legacy `/admin` "Roles & Access" tab (`RolesClient.tsx`). |
| **Roles/permissions supported** | 14 canonical `PAGES` (dashboard, pipeline.*, collections, daily_updates, lead_generation, sales_funnel, kras, employees, import, accounts, admin) × 4 actions, across 6 `DEFAULT_ROLES` (Head of Sales, Business Development Manager, BDE, Inside Sales, ISR, Sales Coordinator, Accounts). |
| **Where used** | **One file**: `src/app/api/admin/roles/route.ts` — and only to call `seedDefaultRoles()` and read the `PAGES` constant when creating a new role row. |
| **Actively enforced?** | **No.** `hasPermission()` and `loadRolePermissions()` — the two functions that would actually *check* a permission — have **zero callers** anywhere in `src/app` (confirmed via project-wide grep). The `AppRole`/`RolePageAccess` tables exist, are seeded, and are editable through the legacy `/admin` UI, but nothing reads them to make an access decision. It is pure configuration-at-rest with no consumer. |
| **Admin-editable?** | Yes — via the legacy `/admin` → "Roles & Access" tab (`RolesClient.tsx` → `/api/admin/roles`), itself gated only by `session.user.isManager` (a `roles.ts`-style check, not even `rbac.ts`'s own `hasPermission`). |
| **Conflicts with another system?** | Yes, by omission: an admin editing a role's page permissions here will see the change saved successfully, with **zero effect on actual access**, because nothing enforces it. This is the most dangerous kind of conflict — it is silently misleading rather than actively wrong. |

### 2.3 `src/lib/access-control/` — Module × Resource × Action × Scope

| | |
|---|---|
| **Purpose** | The newer, granular enterprise permission system. `index.ts` exports `requirePermission()` (route-level drop-in, returns a 401/403 `NextResponse` or `null`), `hasPermission()` (boolean check), `requireManager()` (isManager shorthand), and re-exports `canAccessScope()` from `policy.ts`. `permissions.ts` holds `PERMISSION_CATALOGUE` — ~70 canonical `(module, resource, action)` triples across CRM, Finance, Workflow, Settings, Reports, Masters. |
| **Roles/permissions supported** | DB models `Role` (additive, tenant-aware, `isSystemRole` flag), `Permission` (catalogue rows), `RolePermission` (grant), `UserRole` (employee↔role, many-to-many), `DataAccessPolicy` (per-role data-visibility scope: OWN/TEAM/DEPARTMENT/BRANCH/COMPANY/ALL). |
| **Where used** | 71 files — `requirePermission`/`hasPermission` gate nearly all of Settings (Communication, Integrations, Security, Performance, Organization, Identity, Masters governance), CRM Administration, Master Data (Customer DELETE/IMPORT/dedupe, Employee CREATE, KRA APPROVE), and Import. |
| **Actively enforced?** | **Yes, but inconsistently** — see §3. Many `admin/crm/*`, `admin/finance/*` routes import `requirePermission` but never call it, falling back to a bare `isManager` check instead (see §3, "Wrong Permission System" rows). |
| **Admin-editable?** | Yes — via `/settings/identity` (`RoleManagement`, `PermissionMatrix`, `DataAccessPolicyPanel`), backed by `/api/admin/identity/*`. |
| **Fail-open behaviors (by design, documented in code comments)** | (a) `hasPermission()`/`requirePermission()`: `isManager` employees always pass, regardless of any `UserRole` row (`index.ts:42`). (b) `canAccessScope()`: returns `true` (allow) when no `DataAccessPolicy` row exists for the role+module (`policy.ts:83-84`) — explicitly commented as a backward-compatibility bridge "while Phase 3 wires all existing gates." |
| **Conflicts with another system?** | Yes — see §7. Its own catalogue defines `Masters/CustomerMaster/DELETE` as a distinct action from `EDIT`, yet the actual `DELETE /api/customers/master/[id]` handler checks for the `EDIT` action, not `DELETE` (§6). |

### 2.4 Page-level / API-level guard summary

- **Page-level guards** are dominated by `roles.ts` predicates (`canAccessSettings`, `canManageFinance`, `isOperationsHead`, plain `isManager`) called inside a server component before `redirect()`. These are **real, server-side, non-cosmetic** blocks — direct-URL navigation is genuinely blocked when the guard is present (confirmed by reading the page source, not just inferring from the sidebar). The exceptions are `/customers` (legacy operational customer list) and `/masters/customers`, `/masters/vendors` (global masters), which have **no permission gate beyond "is logged in"** — every authenticated employee, including a brand-new BDE with no finance role, can open and (per the API audit) partially write to these pages.
- **API-level guards** are a mix of all three systems plus a meaningful set of routes using **none** — see §3.

---

## 3. API Route Permission Matrix

147 route files were inspected (every file under `src/app/api/**/route.ts`). The table groups by directory; methods are combined into one row where they share the same check.

### 3.1 Admin — Communication / Integrations / Security / Performance (all `access-control`-gated, consistent)

| API Route | Methods | Auth Check | Permission Check | System Used | Risk |
|---|---|---|---|---|---|
| `/api/admin/communication/{audit,channels,events,logs,queue,rules,templates}` | GET/POST/PATCH | `getSession()` | `requirePermission(session,"Settings","CommunicationAdmin","EDIT")` | access-control | Safe |
| `/api/admin/integrations/{connections,credentials,logs,providers,test}` | GET/POST/PATCH | `getSession()` | `requirePermission(session,"Settings","IntegrationAdmin","EDIT")` | access-control | Safe |
| `/api/admin/security/{access,data-protection,logs,mfa,password,policies,session}` | GET/POST/PATCH | `getSession()` | `requirePermission(session,"Settings","SecurityAdmin","EDIT")` | access-control | Safe |
| `/api/admin/performance/{achievements,kra,periods,reviews,targets,templates}` | GET/POST/PATCH | `getSession()` | `requirePermission(session,"Settings","Performance","EDIT")` | access-control | Safe |

*Note:* every route in this block uses the **EDIT** action for **GET** requests too — there is no separate VIEW-vs-EDIT split for these six admin surfaces, meaning anyone who can view the configuration can also edit it (and vice versa, there is no view-only role for these screens). Not a security hole today (gate is enforced either way), but worth flagging as a future granularity gap — **Important**, not Critical.

### 3.2 Admin — CRM / Finance (import `requirePermission` but never call it — Wrong Permission System)

| API Route | Methods | Auth Check | Permission Check | System Used | Risk | Recommendation |
|---|---|---|---|---|---|---|
| `/api/admin/crm/{assignment,automation,pipelines,pipelines/[id],sla,territories,territories/[id]}` | GET/POST/PATCH | `getSession()` | Inline `if (!session?.user?.isManager) 403` | **roles.ts-style, despite importing `requirePermission`** | **Open — catalogue gap, see §10 item 6** | No `Settings/CRM` (or any other CRM-administration-level) permission exists in `PERMISSION_CATALOGUE` — only end-user `CRM/Lead`, `CRM/Opportunity`, `CRM/Activity`, `CRM/Report` resources, none of which represent pipeline/territory/SLA/automation/assignment-rule *configuration*. Per Step 2F scope, left unmigrated rather than inventing a permission; the import remains unused. |
| `/api/admin/finance/{advance,collection,conveyance,credit,expenses,policies,voucher}` | GET/POST/PATCH | `getSession()` | ~~Inline `if (!session?.user?.isManager) 403`~~ **RESOLVED 2026-06-20 (Step 2F)** | access-control | **Safe** | Wired to `requirePermission(session,"Settings","Finance","VIEW"\|"EDIT")`, which already existed in the catalogue (Phase 9). |

**Step 2F (2026-06-20):** the 7 Finance-admin route files were migrated from the inline `isManager` check to `requirePermission(session,"Settings","Finance",...)` — `Settings/Finance` already existed in the catalogue (added in Phase 9), so no new permission was created. The 7 CRM-admin route files were **left unmigrated**: no `Settings/CRM` or other CRM-administration permission exists in the catalogue, and per the migration's explicit rule ("if no suitable permission exists, stop and document the gap instead of guessing"), inventing one was out of scope for this step. This was, and for CRM-admin remains, the clearest concrete evidence that `access-control` is not yet the actual source of truth even where it has been partially wired in — a future `Role` granting some CRM-admin capability to a non-manager would still have no effect on these 7 routes until the catalogue gap is closed (see §10 item 6 for the recommended next step).

### 3.3 Admin — Identity / Roles / Policies (RESOLVED 2026-06-20, Step 2G — was `canAccessSettings` from roles.ts, not access-control, despite governing access-control's own data)

| API Route | Methods | Auth Check | Permission Check | System Used | Risk | Recommendation |
|---|---|---|---|---|---|---|
| `/api/admin/identity/{permissions,permissions/[roleId],policies,policies/[roleId],roles,roles/[id]}` | GET/POST/PATCH | `getSession()` | ~~`if (!canAccessSettings(session.user)) 403`~~ **RESOLVED — `requirePermission(session,"Settings","Identity","VIEW"\|"EDIT")`** | access-control | **Safe** | Fixed. The API that lets an admin edit `Role`/`Permission`/`UserRole`/`DataAccessPolicy` rows (the access-control system's own tables) was the most ironic instance of being gated by the *legacy* `roles.ts` predicate — now gated by `access-control` itself. |
| `/api/admin/identity/users/[id]` | PATCH | `getSession()` | ~~`if (!canAccessSettings(session.user)) 403`~~ **RESOLVED — `requirePermission(session,"Settings","Identity","EDIT")`** | access-control | **Safe** | Fixed. |
| `/api/admin/identity/users` (collection, not `/[id]`) | — | `getSession()` | `if (!canAccessSettings(session.user)) 403` | roles.ts | **Open — out of scope for Step 2G** | Not in the Step 2G route list (only `/[id]` was named); still uses `canAccessSettings`. Same fix pattern applies — flagged for a follow-up step. |
| `/api/admin/policies/*` (route, [id], [id]/versions, audit, categories) | GET/PATCH | `getSession()` | ~~`if (!canAccessSettings(session.user)) 403`~~ **RESOLVED — `requirePermission(session,"Settings","Policy","VIEW"\|"EDIT")`** | access-control | **Safe** | Fixed. |
| `/api/admin/policies/evaluate` | POST | `getSession()` | ~~**None found**~~ **RESOLVED — `requirePermission(session,"Settings","Policy","VIEW")`** | access-control | **Safe** | Confirmed read-only: `evaluatePolicy()` (`src/lib/policy-engine/index.ts`) only does a `findMany` read, no writes, no callers exist anywhere in the codebase yet (grepped — only this route file references the path), so gating with VIEW (not EDIT) has zero functional impact today. |

### 3.4 Admin — Roles (legacy `AppRole`) and Settings (`AppSetting`)

| API Route | Methods | Auth Check | Permission Check | System Used | Risk |
|---|---|---|---|---|---|
| `/api/admin/roles`, `/api/admin/roles/[id]` | GET/POST/PATCH/DELETE | `getSession()` | local `requireManager()` → `isManager` only | roles.ts-style | Safe (manager-only is appropriately strict) but **Wrong Permission System** relative to the stated direction — also calls `seedDefaultRoles()` (rbac.ts) for a UI that is itself orphaned per the prior implementation-status audit. |
| `/api/admin/settings` | GET/POST | `getSession()` | local `requireManager()` → `isManager` only | roles.ts-style | Safe |

### 3.5 Admin — Masters / Customer-Policy / Vendor-Policy (CONFIRMED UNGUARDED — new findings beyond the two originally flagged)

| API Route | Methods | Auth Check | Permission Check | System Used | Risk |
|---|---|---|---|---|---|
| `/api/admin/masters` | GET, POST | `getSession()` (session-only, null check) | **None** | none | **Missing Permission** |
| `/api/admin/masters/overrides` | GET, POST | `getSession()` | **None** | none | **Missing Permission** |
| `/api/admin/masters/values` | GET, POST | `getSession()` | **None** | none | **Missing Permission** |
| `/api/admin/customer-policy` | GET, POST | `getSession()` | ~~**None**~~ **RESOLVED 2026-06-20 (Step 2D)** | access-control | **Safe** |
| `/api/admin/vendor-policy` | GET, POST | `getSession()` | ~~**None**~~ **RESOLVED 2026-06-20 (Step 2D)** | access-control | **Safe** |

All five of the above let **any authenticated employee** create master-data categories/definitions/validation rules, master values, value-overrides, and customer/vendor governance policy (GST-required flags, duplicate thresholds, credit-approval-required toggles, bank-verification-required toggles) with no manager/permission check whatsoever — only "are you logged in." This is a materially larger unguarded surface than the two routes the prior report flagged; `/api/admin/masters` was already known, but `overrides`, `values`, `customer-policy`, and `vendor-policy` were not previously enumerated. *(Status: all five — `admin/masters`, `/overrides`, `/values`, `customer-policy`, `vendor-policy` — are now fixed as of Step 2D; see §10 item 4.)*

### 3.6 Customers / Masters

| API Route | Methods | Auth Check | Permission Check | System Used | Risk | Recommendation |
|---|---|---|---|---|---|---|
| `PATCH /api/customers/master/[id]` | PATCH | `getSession()` (null check only) | **None** | none | **Missing Permission** | Confirmed still unguarded — see §6 for full detail and sibling-file comparison. |
| `DELETE /api/customers/master/[id]` | DELETE | `getSession()` | `requirePermission(session,"Masters","CustomerMaster","EDIT")` | access-control | **Wrong Permission System (action mismatch)** | Checks the `EDIT` action for a delete operation, even though the catalogue defines a distinct `Masters/CustomerMaster/DELETE` action (`permissions.ts:126`) that is never referenced anywhere in the codebase. Should check `"DELETE"`. |
| `GET/POST /api/customers/master` | GET, POST | `getSession()` (null check) | ~~**None**~~ **RESOLVED 2026-06-20 (Step 2N, API guards)** — `GET` now requires `Masters/CustomerMaster/VIEW`, `POST` now requires `Masters/CustomerMaster/CREATE` | access-control | **Safe** | Bulk customer-master read/create now aligned with the page-level guard added to `/masters/customers`. |
| `/api/customers/master/deduplicate` | GET, POST | `getSession()` | `requirePermission(session,"Masters","CustomerMaster","DELETE")` on POST only; GET unguarded beyond session | access-control (POST) / none (GET) | Needs Review | GET likely returns duplicate-candidate previews — confirm it doesn't leak more than intended to unprivileged users. |
| `/api/customers/master/import` | POST | `getSession()` | `requirePermission(session,"Masters","CustomerMaster","IMPORT")` | access-control | Safe | |
| `/api/customers/suggestions` | GET | `getSession()` (null check only) | **None** | none | Needs Review | Likely a low-risk autocomplete/typeahead; confirm it doesn't expose more customer detail than the master list already does. |
| `/api/master-values` | GET | `getSession()` | **None — by design, dropdown lookup only** | access-control | ~~**Missing Auth**~~ **RESOLVED 2026-06-20 (Step 2E)** | Usage-audited: all 3 callers (`LeadGenClient.tsx`, `LeadsClient.tsx`, `finance/expenses/components/ExpenseForm.tsx`, via `useMasterValues.ts`) are internal CRM pages already gated by `getSession()` at the page level — no public caller exists. Added the standard `getSession()`/401 check; no permission check added since this only returns a flat array of master-value strings for dropdowns, no admin-only or sensitive data. |

### 3.7 Finance

| API Route | Methods | Auth Check | Permission Check | System Used | Risk |
|---|---|---|---|---|---|
| `/api/finance/{accounts,bank-book,cash-book,dashboard,voucher-sequences,vouchers,vouchers/[id]}` | GET | `getSession()` | `canManageFinance(session.user)` | roles.ts | Safe |
| `/api/finance/advances` | GET, POST | `getSession()` | `canManageFinance()` for full visibility; own-data scoping otherwise (no explicit deny — filtered query) | roles.ts | Safe |
| `/api/finance/conveyance` | GET | `getSession()` | `isManager \|\| isAccounts \|\| isOperationsHead` inline (own-data scoping otherwise) | roles.ts | Safe |
| `/api/finance/expenses`, `/api/finance/expenses/[id]` | GET | `getSession()` | `canManageFinance()` for full visibility; own-data scoping otherwise | roles.ts | Safe |
| `/api/expenses` | GET, POST | `getSession()` | own-data scoping via `isManager` (no finance-specific predicate) | roles.ts | Needs Review — this route backs the Expense Register's underlying data but uses a plain `isManager` check rather than `canManageFinance`, meaning an Accounts/Operations-Head non-manager gets full Finance visibility on `/api/finance/expenses` but only own-data on `/api/expenses` itself — a latent inconsistency once these are unified under a write API. |
| `/api/advances`, `/api/advances/[id]/apply` | GET, POST | `getSession()` | `canManagePayments()` | roles.ts | Safe |
| `/api/payments`, `/api/payments/today` | GET, POST | `getSession()` | `canManagePayments()` (today route: session-only on GET) | roles.ts | Safe |

All Finance routes consistently use `roles.ts` predicates, not `access-control` — even though `access-control`'s catalogue already defines `Finance/Invoice/Expense/Payment/Advance` resources with VIEW/CREATE/EDIT/DELETE/APPROVE actions (`permissions.ts:75-91`) that are **currently unused by any Finance route**. This is the single largest "Wrong Permission System" surface by route count, and it is also the highest-value one to fix correctly given §5's finding that Finance write APIs don't exist yet — wiring them onto `access-control` from day one avoids ever having to migrate them later.

**Step 2L completed (2026-06-20, planning only).** Before any Finance write API in this gap is
built, `docs/modules/finance/FINANCE_WRITE_ACCESS_CONTROL_PLAN.md` was created to map every
planned endpoint to a real `access-control` permission ahead of time:
- **Finance write APIs must use `access-control` from day one** — the plan maps all 33 planned
  endpoints (Expense, Bank Book, Cash Book, Advance, Claims, Conveyance, Voucher, Reconciliation)
  to a permission in `PERMISSION_CATALOGUE`, or documents a Catalogue Gap with an interim
  closest-fit mapping where no exact resource exists (`Finance/Voucher` has no resource at all;
  `Finance/Payment/EDIT` and `Finance/Advance/EDIT` don't exist; no dedicated
  BankBook/CashBook/Conveyance/Reconciliation resource exists). No permission was invented or
  added to the catalogue as part of this step — gaps are documented, not guessed at.
- **`roles.ts` remains a temporary bridge for existing Finance read/self-service routes only** —
  the plan explicitly does not touch the GET routes in the table above, nor the one existing real
  write endpoint (`POST /api/finance/advances`, self-service create, unchanged); migrating those
  is the separate, larger Step 2M (own-scope `DataAccessPolicy` work), out of scope here.
- **Future Finance write endpoints have a documented permission mapping** — including
  self-service vs. Finance-Operations authorization rules (an employee acting on their own record
  needs no grant; a Finance user acting on someone else's needs the mapped permission), an
  object-level authorization rule set per entity (draft-only edit, no hard-delete on posted
  records, approval routed exclusively through the existing Step 2A-protected Global Approval
  Engine — never a bespoke per-entity approval check), and a Scope Rules table.
- **New Schema Gap surfaced, not fixed this step:** none of the Finance transaction models
  (`Expense`, `EmployeeAdvance`, `TravelClaim`, `Voucher`, `Ledger`, `FinAccount`) have a real
  `branchId`/`departmentId` foreign key — only `FinAccount.branchName`, a free-text field with no
  `@relation`. `canAccessScope()`'s BRANCH/DEPARTMENT cases will therefore always fall through to
  "allow" for Finance data, regardless of any `DataAccessPolicy` row configured — a real
  limitation for whoever eventually builds branch-scoped Finance write APIs, not something this
  planning step could resolve under its "do not modify database schema" constraint.
- No Finance write API, schema change, migration, UI change, or permission-enforcement change was
  made — this step produced one new documentation file only. `npx tsc --noEmit`, `npx prisma
  validate`, and `next build` all pass (unaffected, since no application code changed).

**Step 2R completed (2026-06-21).** Finance read APIs no longer rely only on `roles.ts` where
`access-control` permissions exist: a new `src/lib/finance/access.ts` helper module checks the
closest-fit `Finance/*` (or `Settings/Finance`) permission first for all 11
`GET /api/finance/*` route files in the table above, falling back to `canManageFinance()` (or the
prior inline `isManager||isAccounts||isOperationsHead` for `conveyance`) until Finance-Operations
roles hold the real grant. Normal employees retain own-record access only — the existing own-data
filtering in `expenses`, `expenses/[id]`, `advances` (GET), and `conveyance` is unchanged. Bank
Book, Cash Book, and Voucher operational reads (`accounts`, `bank-book`, `cash-book`, `vouchers`,
`vouchers/[id]`, `voucher-sequences`) are now protected by `Finance/Payment/VIEW` (the closest
catalogue fit — no dedicated `BankBook`/`CashBook`/`Voucher` resource exists, see §10 item 4 of
`RBAC_MIGRATION_TRACKER.md`), OR `Settings/Finance/VIEW` for vouchers. `POST
/api/finance/advances` and the separate `/api/expenses`/`/api/advances` mobile/CRM routes were not
touched — out of scope. See `RBAC_MIGRATION_TRACKER.md` §11 for the full route-by-route mapping.

### 3.8 Settings / Organization (mixed — both systems checked, OR'd together)

| API Route | Methods | Auth Check | Permission Check | System Used | Risk |
|---|---|---|---|---|---|
| `/api/settings/organization/{branches,companies,departments,designations,teams}` (+ `[id]` variants) | GET, POST, PUT, PATCH | `getSession()` | `hasPermission(userId,"Settings","Organization",action) \|\| canAccessSettings(session.user)` | **both** access-control and roles.ts, OR'd | Safe, but **Needs Review for consolidation** — functionally fine today (either system passing is sufficient), but it means a future admin who revokes "Settings/Organization/EDIT" via `access-control` for a role that still satisfies `canAccessSettings` (Operations Head/Head of Sales) gets **no effect** — the OR means the weaker/legacy check alone is enough to keep access. This is a real-world version of the "two systems give different answers" risk materializing as "the more permissive one always wins." |

### 3.9 Approvals / Delegations / Escalation / Workflows (CRITICAL — missing object-level authorization)

| API Route | Methods | Auth Check | Permission Check | System Used | Risk |
|---|---|---|---|---|---|
| `POST /api/approvals/[id]/action` | POST | `getSession()` (null check only) | **None — no check that `actor` is an authorized approver/delegate for this specific request** | none (object-level) | **Critical — Missing Permission (data-scope)** |
| `GET /api/approvals` | GET | `getSession()` (null check only) | None beyond session; `inbox=true` scopes to `getPendingForApprover(employeeId)` (safe, self-scoped); the non-inbox branch accepts arbitrary `requestedBy`/`approverId` query params with no check that the caller is allowed to view another employee's requests | none | Needs Review — Missing Permission (data-scope) for the non-inbox query path |
| `/api/delegations`, `/api/delegations/[id]` | GET, POST, DELETE | `getSession()` | None beyond session; `createDelegation` trusts the caller's own `employeeId` as `fromUser`, but nothing stops `DELETE` from being called against a delegation rule the caller didn't create (not verified — `[id]/route.ts` not deeply inspected for ownership check) | none | Needs Review |
| `/api/escalation-rules` | GET, POST | `getSession()` | **None** | none | Missing Permission — any authenticated employee can create escalation rules (auto-approve/auto-reject/escalate actions) for any workflow. Lower real-world risk today only because the escalation engine itself is never invoked by any cron (per the prior implementation audit), but the configuration surface itself is unguarded. |
| `/api/workflows`, `/api/workflows/[id]`, `/api/workflows/start`, `/api/workflows/audit` | GET, POST, PATCH | `getSession()` | **None found in routes inspected** | none | Needs Review — `workflows/start` in particular triggers a real approval chain; confirm whether it's meant to be called by any authenticated user (e.g. self-service expense submission) or should be restricted. |

**This is the most important table in the report.** `approveRequest`, `rejectRequest`, `returnRequest`, `delegateRequest`, and `cancelRequest` (`src/lib/workflow-engine/approval.ts:173-318`) take an `actorId` parameter and write an `ApprovalAction` row with it, but **none of them call `resolveApprovers()` or otherwise check that `actorId` is eligible to act on the request's current step.** The API route (`approvals/[id]/action/route.ts`) passes `session.user.employeeId` straight through with no additional check. Concretely: Employee A (no manager flag, no finance role) can `POST /api/approvals/17/action {"action":"APPROVE"}` and approve Employee B's ₹60L large-deal opportunity, an advance request, or an expense claim that A was never assigned to approve — the only thing stopping A is not knowing/guessing the numeric ID, which is not a security boundary.

### 3.10 Pipeline / CRM (consistently uses `isManager` + ownership checks — roles.ts pattern, internally consistent)

| API Route | Methods | Auth Check | Permission Check | System Used | Risk |
|---|---|---|---|---|---|
| `/api/pipeline/leads`, `/leads/[id]`, `/leads/[id]/activity`, `/leads/[id]/convert`, `/leads/[id]/stage`, `/leads/deletion-log` | GET/POST/PUT/PATCH/DELETE | `getSession()` | `isManager \|\| assignedToId === employeeId` (ownership), `requirePermission` imported in `[id]/route.ts` but not consistently the primary gate | roles.ts (mixed with access-control import in one file) | Safe (ownership model is sound) — `leads/[id]/route.ts` importing `requirePermission` without clearly using it for all branches is worth a follow-up read, flagged Needs Review. |
| `/api/pipeline/opportunities`, `/opportunities/[id]`, `/opportunities/promote` | GET/PATCH/POST | `getSession()` | `isManager \|\| assignedToId === employeeId`; WON/LOST terminal-state changes additionally require `isManager` | roles.ts | Safe |
| `/api/pipeline/tasks`, `/tasks/[id]`, `/pipeline/notes`, `/notes/[id]`, `/pipeline/meetings` | GET/POST/PATCH/DELETE | `getSession()` | `isManager \|\| assignedToId/authorId === employeeId` | roles.ts | Safe |
| `/api/pipeline/analytics`, `/pipeline/crm-data` | GET | `getSession()` | `isManager` scoping for cross-employee data | roles.ts | Safe |
| `/api/kra/sync-achievements`, `/api/certifications/[id]/approve` | POST, PUT | `getSession()` | `requirePermission(session,"CRM","KRA","APPROVE")` | access-control | Safe |
| `/api/certifications`, `/api/certifications/[id]` | GET/POST/PUT/DELETE | `getSession()` | `isManager \|\| employeeId === self` | roles.ts | Safe |
| `/api/employees` | GET, POST | `getSession()` | GET: `isManager` scoping; POST: `requirePermission(session,"CRM","Employee","CREATE")` | mixed (roles.ts read / access-control write) | Needs Review — split system for the same resource; not unsafe today, but a future role grant on "CRM/Employee/CREATE" without `isManager` would let a non-manager create employees while still being blocked from listing them, an inconsistent UX/security pairing. |
| `/api/employees/[id]`, `/[id]/kras`, `/[id]/reviews` | GET/PUT/DELETE | `getSession()` | `isManager \|\| employeeId === self` | roles.ts | Safe |
| `/api/import` | POST | `getSession()` | `requirePermission(session,"CRM","Lead","IMPORT")` | access-control | Safe |
| `/api/daily-updates`, `/[id]`, `/api/weekly-commits`, `/[id]`, `/api/reviews/[id]`, `/api/sales-funnel`, `/[id]`, `/api/lead-generation`, `/[id]`, `/api/collections`, `/[id]` | GET/POST/PUT/DELETE | `getSession()` | `isManager \|\| employeeId === self/own-record` | roles.ts | Safe |
| `/api/kras/[id]`, `/api/kras/me`, `/api/kra-sync` | GET/PUT/DELETE | `getSession()` | `isManager \|\| employeeId === self` | roles.ts | Safe |
| `/api/mobile/team` | GET | `getSession()` | `isManager` only (hard `403 "Managers only"`) | roles.ts | Safe |
| `/api/notifications`, `/api/ocr/business-card`, `/api/communication/trigger` | GET/PATCH/POST | `getSession()` (null check only) | None beyond session — appears appropriate for self-scoped notification reads and a stateless OCR utility; `communication/trigger` accepting arbitrary trigger calls from any session is worth a closer look if it can fan out real notifications/SMS/email on someone else's behalf. | none | Needs Review (communication/trigger only) |
| `/api/dev/switch` | POST | **None — dev-only impersonation switch** | N/A | N/A | Safe by design — gated entirely by `getSession()`'s own `NODE_ENV !== "development"` early-return (`dev-session.ts`), not by this route. Out of scope for production risk as long as that guard holds (see §11). |

---

## 4. Page Route Permission Matrix

| Page Route | Access Guard | Permission System Used | Sidebar Visibility | Risk | Recommendation |
|---|---|---|---|---|---|
| `/admin` | Redirect-only shim → `/settings/administration` | N/A | Not in sidebar (orphaned, direct-URL only) | Needs Review | Low risk since it just forwards to the real guard below, but its continued existence as a bookmarkable legacy entry point is a hygiene issue (see prior implementation report §6). |
| `/settings` | Real server redirect: `canAccessSettings(session.user)` | roles.ts | Shown only when `showSettings` (computed from `isOperationsHead \|\| isHeadOfSales \|\| isManager`, i.e. roles.ts) | Safe (guard matches visibility — same predicate family on both sides) | — |
| `/settings/administration` (legacy `AdminClient`) | Real server redirect: `canAccessSettings(session.user)` | roles.ts | Not a card in `AdminConsole`; reachable only by direct URL | Needs Review | Legacy panel duplicates Roles/Approvals concepts now owned by `access-control`-backed screens, gated by the legacy predicate only. |
| `/settings/identity` | Real server redirect: `checkIdentityPermission(VIEW)` (access-control) `\|\| canAccessSettings(session.user)` (roles.ts) | **both, OR'd** | Card in `AdminConsole` (gating of the card itself not independently re-verified this pass) | Safe today, **Needs Review for consolidation** — same OR-pattern risk as §3.8: a future `access-control`-only restriction can be bypassed by `canAccessSettings`. |
| `/settings/masters` | Real server redirect: `hasPermission(Settings,Masters,VIEW)` (access-control) `\|\| isOpsHead \|\| isManager` (roles.ts) | both, OR'd | Card in `AdminConsole` | Safe today, Needs Review for consolidation (same pattern) | |
| `/settings/workflow` → `/settings/workflow/approval-engine` | Redirect-only shim | N/A | — | Safe | |
| `/settings/finance` | Not independently re-verified this pass (prior implementation audit reported `requirePermission`/server permission check present) | access-control (per prior audit) | Card in `AdminConsole` | Safe (per prior finding) | |
| `/customers` (legacy operational list) | **Session-only — no permission check at all** | none | Not in nav as a distinct top-level item separate from Masters (legacy route, superseded in nav by `/masters/customers`) | **Needs Review — effectively Missing Permission for a live-data CRM page** | Any authenticated employee, including the lowest-privilege BDE, can view the full live customer book and (per `CustomerMasterClient`'s wiring to `/api/customers/master/[id]` PATCH) edit customer master records, since neither the page nor the PATCH API checks anything beyond login. |
| `/masters/customers` | ~~Session-only; write capability gated **client-side only** via `deriveCustomerCaps({isManager, isAccounts, isOpsHead})`~~ **RESOLVED 2026-06-20 (Step 2N)** — real server redirect: `hasPermission(Masters,CustomerMaster,VIEW)` (access-control) `\|\| isManager` (roles.ts bypass). ~~Rendered mock-data preview, no real persistence~~ **RESOLVED 2026-06-20 (Step 2P, Customer Master)** — now renders real Prisma data via the shared `@/app/customers/CustomerMasterClient`, identical to `/customers`. | both, OR'd | Sidebar link gated on the same `Masters/CustomerMaster/VIEW` capability since Step 2J — guard and link now agree | Safe — page guard and sidebar visibility use the identical manager-bypass shape; button-level capability gating is the same `isManager`-based logic the reused component already used in production (no longer `deriveCustomerCaps`, which was tied to the now-inactive mock preview) | |
| `/masters/vendors` | ~~Same pattern as above (`deriveVendorCaps`), session-only + client cosmetic caps~~ **RESOLVED 2026-06-20 (Step 2N)** — real server redirect: `hasPermission(Masters,VendorMaster,VIEW)` (access-control) `\|\| isManager` (roles.ts bypass) | both, OR'd | Sidebar link gated on the same `Masters/VendorMaster/VIEW` capability since Step 2J — guard and link now agree | Safe — same fix as Customer Master; `deriveVendorCaps` retained for write-button-level UX only | |
| `/finance` (Dashboard) | Real server redirect: `canManageFinance(session.user)` (non-finance users redirected to `/finance/expenses` instead of blocked outright — intentional UX, not a leak) | roles.ts | Full Finance nav only for `isManager \|\| isAccounts`; limited "My ..." nav otherwise | Safe | |
| `/finance/expenses` | Session-only; "all authenticated employees can access (own data); finance roles see all" — by design | roles.ts (client caps for elevated view) | Shown to all (as "My Expenses" or full register depending on role) | Safe (own-data-by-default design is intentional and matches the API's own-data scoping) | |
| `/finance/{advances,claims,conveyance,bank-book,cash-book,vouchers,reports}` | Not independently re-verified this pass — prior implementation audit found consistent `canManageFinance`/own-data patterns across these | roles.ts | Full Finance nav (manager/accounts) or limited employee Finance nav | Safe (per prior finding) | |
| `/finance/approvals` | Real server redirect: `canManageFinance(session.user)` | roles.ts | Shown in full Finance nav only | Safe | |
| `/approvals` (Global Inbox) | Session-only — by design, every authenticated employee has a personal inbox | roles.ts (caps derivation only, no block) | Shown to all roles under "My Workspace" | Safe (matches intended self-service design) — but see §3.9: the *page* is fine, the *action API* behind it is not. | |
| `/pipeline/leads`, `/pipeline/opportunities`, `/pipeline/tasks`, `/pipeline/analytics` | Session-only + server-side ownership scoping (`isManager` vs `assignedToId === self`) baked into the Prisma query itself | roles.ts | Shown per role group (Sell section) | Safe | |
| `/employees` | Real server redirect: non-managers redirected to their own `/employees/[id]` | roles.ts (`isManager` only) | Shown in Manager group; not shown to Employee group, though direct URL would just redirect (not unblocked) — verified consistent | Safe | |

**Step 2N completed (2026-06-20).** Customer and Vendor Master record pages now use
`access-control` page guards instead of "is logged in" alone:
- `/masters/customers` and `/masters/vendors` (table rows above) each now compute
  `hasPermission(userId, "Masters", "CustomerMaster"|"VendorMaster", "VIEW")` server-side and
  redirect to `/dashboard` (the same forbidden-UX pattern already used by every Settings/Finance
  page guard — no new "unauthorized" page or component was introduced) when neither that grant
  nor `isManager` is present. **Direct URL access to these two master pages is no longer
  session-only** — this closes the "most overexposed surface" finding from §2.4/§5 finding 1.
- The bypass is deliberately `isManager`-only, not the broader `isOpsHead`/`isManager` bridge used
  by some Settings pages (e.g. `/settings/masters` above) — because Step 2J's
  `getNavigationCapabilities()` already gives the Masters sidebar links only that same
  manager-only bypass (manager → `ALL_TRUE`, everyone else needs the real grant). Using a wider
  bridge on the page than the sidebar already uses would have reintroduced exactly the
  "menu hidden but page reachable" mismatch pattern §5 finding 2 (below) describes for a
  different pair of surfaces — so the two are now kept in lockstep instead.
- `deriveCustomerCaps()`/`deriveVendorCaps()` (`roles.ts`-only, in each page's `data.ts`) are
  **unchanged and retained** — they continue to drive button-level Create/Edit/Disable/GST/
  Bank/Export visibility, which was always their actual job; the page-level "can this user be
  here at all" decision they were never designed for is now handled by the guard above instead.
  Each function gained a one-line `// TODO: Migrate button-level capability checks to
  access-control actions after page guard migration.` comment — no behavior change.
- **Legacy `/customers` route still requires a separate retirement decision.** It remains
  session-only (no permission check beyond login) — confirmed unchanged, table row above — and was
  explicitly left alone per this step's scope (no redirect, no gate added). A TODO comment was
  added pointing at its retirement, tracked in `RBAC_MIGRATION_TRACKER.md` as Step 2O ("Retire or
  redirect `/customers` legacy route").
- No database schema, migration, Customer/Vendor API logic (`/api/customers/master*` routes were
  read, not modified), UI/form change, soft-delete implementation, or sidebar/navigation change was
  made. `npx tsc --noEmit`, `npx prisma validate`, `npx eslint` (2 pre-existing, unrelated
  unused-variable warnings in `masters/customers/data.ts`), and `next build` all pass.

**Step 2N completed (API guards, 2026-06-20).** The base Customer Master API
(`src/app/api/customers/master/route.ts`, §3.6 table row above) is no longer session-only:
- `GET /api/customers/master` now requires `Masters/CustomerMaster/VIEW`.
- `POST /api/customers/master` now requires `Masters/CustomerMaster/CREATE`.
- Both permissions already existed verbatim in `PERMISSION_CATALOGUE` (`permissions.ts:123-124`)
  — no catalogue gap, no permission invented.
- `PATCH`/`DELETE /api/customers/master/[id]` were reviewed, not rewritten — already correct
  (`EDIT`/`DELETE` respectively, per the Step 2B/2C fixes recorded above).
- This closes the mismatch the Step 2N page-guard work exposed: page access to
  `/masters/customers` was guarded, but the underlying list/create API any client could call
  directly was not. Customer Master page and API access are now aligned for list/create
  operations.
- **`/customers` legacy route still requires a separate retirement decision** — unchanged, still
  session-only, tracked as Step 2O in `RBAC_MIGRATION_TRACKER.md`.
- No query params, pagination, sorting, response shape, payload structure, validation, or
  create-logic change was made.

**Step 2O completed (route consolidation, 2026-06-20).** Legacy `/customers` (§3.6 table,
finding 4 above) is no longer a separate session-only customer page:
- `/customers` is **not** a separate session-only customer page anymore — it now requires the
  same `Masters/CustomerMaster/VIEW`-or-`isManager` grant `/masters/customers` carries, applied
  before any data load (including the auto-seed-from-CRM side effect on first load).
- **Not converted to a redirect**, contrary to this step's stated preference, because code
  review found `/customers` has unique, real functionality `/masters/customers` entirely lacks:
  `/customers` is the only page with live Prisma-backed CRUD, working **Import from CRM**, working
  **duplicate detection**, and working **delete**, all wired to the now-guarded
  `/api/customers/master*` APIs. `/masters/customers`'s client component
  (`masters/customers/CustomerMasterClient.tsx`) renders a hardcoded `MOCK_CUSTOMERS` array and
  contains zero `fetch()` calls — it does not touch the `Customer` table at all. A redirect would
  have replaced the only functional Customer Master with a non-functional preview.
  Customer Master page access is centralized on the same permission (`Masters/CustomerMaster/
  VIEW`) at both entry points, but **not** on a single route — that remains the recommended
  follow-up once `/masters/customers` is wired to real data (tracked in
  `RBAC_MIGRATION_TRACKER.md` §10 item 7).
- Old `/customers` bookmarks therefore continue to resolve to the live customer list (now
  permission-gated) rather than redirecting elsewhere.
- **No navigation change required** — a repo-wide search for `href="/customers"`,
  `router.push("/customers"`, and `redirect("/customers"` found zero matches; `SidebarLinks.tsx`
  already only links to `/masters/customers`. The one `/customers` string in `Topbar.tsx` is a
  breadcrumb-label prefix match for direct URL visits, not a link, and was left unchanged.
- No database schema, migration, customer data deletion, Customer Master API logic,
  `/masters/customers` UI/behavior, Vendor Master, or Finance module change was made.

**Step 2P (Customer Master) completed (2026-06-20).** Note: "Step 2P" is also used elsewhere in
`RBAC_MIGRATION_TRACKER.md`/§10 below for the unrelated, not-yet-started "retire legacy `/admin`
Roles tab" plan — this entry is the Customer Master consolidation step Step 2O recommended as
follow-up, disambiguated with the "(Customer Master)" suffix, same pattern as Step 2N's
"(API guards)" sub-step.
- `/masters/customers` is **no longer mock-data-only.** Its `page.tsx` now runs the same
  `prisma.customer.findMany`/auto-seed-from-CRM/stats query `/customers/page.tsx` runs, against
  the same `Customer` table, and renders it through `@/app/customers/CustomerMasterClient` — the
  exact same component `/customers` already used in production (live list, search/filter,
  create, edit, delete, Import from CRM, duplicate detection), reused rather than duplicated.
- **Functional Customer Master capability has been moved — more precisely, shared — under
  `/masters/customers`.** No logic was rewritten or forked: both routes' `page.tsx` files now
  import the identical client component and hit the identical, already-guarded
  `GET`/`POST /api/customers/master` and `PATCH`/`DELETE /api/customers/master/[id]` endpoints
  (Steps 2B/2C/2N). API contracts, guards, and behavior are unchanged.
- The folder's own UI-only preview (`masters/customers/CustomerMasterClient.tsx`,
  `masters/customers/data.ts`'s `MOCK_CUSTOMERS`/`deriveCustomerCaps`, and the 14 enterprise
  components under `masters/customers/components/`) is **no longer imported by `page.tsx`** but
  was **not deleted** — each of the two main files now carries a header comment marking it
  preview-only/inactive, confirmed safe to leave in place via a repo-wide search showing no other
  file imports either one.
- Button-level capability gating was **preserved, not weakened**: the reused component's existing
  `isManager`-only gating on Import/Find Duplicates/Delete (Add/Edit open to all `VIEW`-holders)
  is the same real, already-proven logic `/customers` used — not a new scheme, and not a full
  migration of button caps to `access-control` (left for a later step).
- **`/customers` can now be retired or redirected in a later step after verification** — both
  routes are functionally equivalent (same component, same data, same APIs) for the first time,
  which is the prerequisite the redirect step needs. `/customers` itself was not changed, not
  redirected, and not deleted this step — it remains fully functional, confirmed by inspection
  (no edits to its own `page.tsx` rendering path or `CustomerMasterClient.tsx`, only a comment
  update).
- No database schema, migration, Customer Master API contract change, Vendor Master change, or
  Finance module change was made.

**Step 2Q (Customer Master) completed (2026-06-20).** Note: "Step 2Q" is also reserved elsewhere
(§2.2-style decisions on `AppRole`/`RolePageAccess` migrate-vs-delete, tracked in
`RBAC_MIGRATION_TRACKER.md` §2/§4/§10) for an unrelated, not-yet-started item — this entry is the
final Customer Master route-consolidation step Step 2P recommended as follow-up, disambiguated
the same way.
- `/customers` is **no longer a separate functional Customer Master page.** Pre-check confirmed
  zero remaining unique functionality before changing it: `/masters/customers/page.tsx` already
  imported the live `@/app/customers/CustomerMasterClient` and ran the identical
  Prisma query/auto-seed/stats logic (Step 2P) — both routes were byte-for-byte equivalent in
  behavior. `src/app/customers/page.tsx` is now a bare server-side redirect
  (`redirect("/masters/customers")`), matching this codebase's existing redirect-page convention
  (same shape as `finance/vendors/page.tsx` → `/masters/vendors`). It carries no permission check
  of its own — enforcement is left entirely to `/masters/customers`'s own guard.
- **`/customers` now redirects to `/masters/customers`.** Confirmed live in a browser session
  against the dev database (not just static analysis): unauthenticated → `/login`; a non-manager
  Employee with no `Masters/CustomerMaster/VIEW` grant → `/dashboard` (both routes' guards fire
  correctly in the same chain); a Manager → a fully real `/masters/customers` page showing 98 live
  database customers and working Search/Import-from-CRM/Find-Duplicates/Add-Customer controls.
- **Customer Master access is now centralized under the access-control-guarded
  `/masters/customers` route.** `CustomerMasterClient.tsx` (in `src/app/customers/`) was **not**
  deleted, renamed, or moved — `/masters/customers` imports it directly and depends on it
  remaining at that path; it now carries a comment noting it is shared and actively rendered from
  `/masters/customers`. A repo-wide link search (`href="/customers"`, `router.push("/customers"`,
  `redirect("/customers"`, plain `"/customers"`) found no active navigational links — the sole
  remaining match, `Topbar.tsx`'s breadcrumb `PATH_LABELS` entry, is not a link and is now
  effectively dead code since the URL bar will never show `/customers` post-redirect; left
  unchanged per scope.
- No database schema, migration, customer data deletion, Customer Master API, Customer Master
  client logic, Vendor Master, or Finance module change was made.

---

## 5. Navigation Permission Findings

`src/components/SidebarLinks.tsx` (rendered by `src/components/Navbar.tsx`) determines link visibility purely from two booleans — `isManager` and `isAccounts` — both computed in `Navbar.tsx` from **`roles.ts`** predicates (`isOperationsHead`, `isAccounts`, `isHeadOfSales`) re-read fresh from the DB on every render (explicitly to avoid stale-JWT role changes — a good practice, noted at `Navbar.tsx:15-16`). `showSettings` is computed the same way (`opsHead || salesHead || isManager`). **No part of sidebar visibility consults `access-control`** — not `hasPermission`, not `getAllPermissions`, not any `Role`/`UserRole` data. This means the sidebar and the (partially `access-control`-gated) pages it links to are **two independent gating mechanisms that happen to agree today only because no role has yet been configured through `access-control` in a way that diverges from the `roles.ts` predicates.**

**Concrete mismatches found:**

1. **Masters section always shown, page/API enforcement is weakest of all major modules.** `MANAGER_GROUPS`, `EMPLOYEE_GROUPS`, and `ACCOUNTS_GROUPS` *all* unconditionally include a "Masters" group with Customer Master and Vendor Master links (`SidebarLinks.tsx:64-69, 96-102, 126-132`). Every employee, regardless of role, sees and can open both masters pages — consistent with the pages having no permission gate (§4), so navigation visibility is at least *honest* here, but it means there is no role for which Masters is hidden, even though `access-control`'s catalogue defines granular `Masters/CustomerMaster/*` and `Masters/VendorMaster/*` actions that go entirely unused for view-gating.
2. **Settings link visibility (`showSettings`) uses only `roles.ts`, but the pages behind it increasingly check `access-control` too (OR'd).** A role that is granted `Settings/Identity/VIEW` or `Settings/Masters/VIEW` via the new `access-control` UI, but does **not** match `isOperationsHead`/`isHeadOfSales`/`isManager`, would have **API-level access to view that one settings sub-page directly by URL, but no sidebar entry pointing to it** (case: "user cannot see menu but *could* access direct URL" — though in practice they'd also need to navigate past `/settings` itself, which is gated by `canAccessSettings` alone with no `access-control` OR-fallback, so today this is latent, not exploitable, until/unless `/settings`'s own guard is loosened).
3. **Finance nav tier (`showFullFinance = isManager || isAccounts`) vs. API tier (`canManageFinance = isManager || isAccounts(user) || isOperationsHead(user)`).** An Operations Head who is not also flagged `isManager` and not name-matched by `isAccounts()` sees the **limited** "My ..." Finance nav (since `showFullFinance` omits the Operations Head check that `canManageFinance` includes), yet their actual API permission level (`canManageFinance`) entitles them to full cross-employee Finance data. This is a "menu hidden but page/API is more permissive than the menu suggests" mismatch — not a security leak, but a real usability/consistency bug worth fixing alongside any RBAC consolidation, since it's evidence the sidebar's boolean set and `roles.ts`'s own predicate set have already drifted apart from each other.
4. **No link, but accessible page, for `/customers` and `/admin`.** ~~`/customers` (legacy operational list) has no sidebar entry at all (superseded by `/masters/customers` in nav) but remains live and unguarded (§4)~~ **RESOLVED 2026-06-20 (Step 2O, then Step 2Q (Customer Master)).** Step 2O first guarded `/customers` in place (`Masters/CustomerMaster/VIEW`-or-`isManager`); once Step 2P brought `/masters/customers` to functional parity, Step 2Q (Customer Master) converted `/customers` into a bare server-side redirect to `/masters/customers` — it is no longer directly reachable as a separate page at all, by bookmark or otherwise; the URL always resolves forward to the guarded canonical route. `/admin` similarly has no sidebar entry (superseded by `/settings`) but still resolves (via redirect) to the fully functional legacy administration panel for anyone who passes `canAccessSettings` — unchanged, tracked separately as Step 2P (the unrelated, `/admin`-retirement one).

**Step 2J completed (2026-06-20).** Sidebar visibility migrated toward `access-control` where catalogue mappings exist:
- New `src/lib/access-control/navigation.ts` (`getNavigationCapabilities()`) loads a session's full permission set once per request (reusing the existing `getAllPermissions()` helper) and derives a small capability object; `isManager` employees get the same automatic full-access fallback `hasPermission()` already gives them elsewhere.
- **Masters** (finding 1 above): the "Masters" group's Customer Master / Vendor Master links are now individually filtered on `Masters/CustomerMaster/VIEW` and `Masters/VendorMaster/VIEW` — no longer shown to every employee unconditionally. Real `RolePermission` grants for these already exist in `prisma/seed-admin-foundation.ts` (Business Head, Sales Head, Sales Manager, Finance Manager), so this is not a theoretical mapping.
- **Finance Operations** (finding 3 above): `FINANCE_FULL_NAV` entries each carry a capability predicate (`Finance/Expense/VIEW` → Expense Register; `Finance/Payment/VIEW` → Cash/Bank Book; `Finance/Advance/VIEW` → Advances; `Finance/Expense/APPROVE` or `Finance/Advance/APPROVE` or `Workflow/ApprovalRequest/APPROVE` → Finance Approvals). The existing `isManager || isAccounts` bridge is preserved as a separate `bridge` flag — every entry remains visible to current managers/Accounts users regardless of `access-control` grants, while a non-manager/non-Accounts user with a real grant (e.g. an "Account Manager" role per the seed data) now *also* sees the matching items, partially closing this finding. **Voucher and Report items have no catalogue permission at all (documented gap, not invented) and remain bridge-only, unchanged.**
- **Settings link** (finding 2 above): `showSettings` (`roles.ts`) is now OR'd with a new `Settings/*` aggregate check (`Identity`/`Masters`/`Finance`/`Policy`/`Organization`/`CommunicationAdmin`/`IntegrationAdmin`/`SecurityAdmin` VIEW-or-EDIT; `Settings/CRM` has no catalogue entry yet). OR rather than replace, because no role currently holds a seeded `Settings/*` grant — replacing would have hidden Settings from Operations Head/Head of Sales today.
- Pipeline/Daily Updates/KRA/Tasks/Employees navigation (the `MANAGER_GROUPS`/`EMPLOYEE_GROUPS`/`ACCOUNTS_GROUPS` role-based sections) and all self-service Finance items (My Expenses/Claims/Advance/Conveyance) were **intentionally left on the existing roles.ts/session bridge**, per scope — not migrated this step.
- Legacy `roles.ts` booleans (`isManager`, `isAccounts`) are retained only where this self-service/ownership behavior is still load-bearing; no `roles.ts` predicate was deleted or altered.
- No API guard, page guard, permission catalogue, database model, or runtime authorization helper was changed — this step is navigation-visibility only, per scope. Finding 2's residual mismatch (a user with direct `Settings/Identity/VIEW` access but no sidebar entry, if also failing `canAccessSettings` on `/settings` itself) is **not fully closed** — the sidebar link now appears for them, but `/settings`'s own page guard is unchanged and is explicitly deferred to Step 2K. `npx tsc --noEmit`, `npx prisma validate`, and `next build` all pass; `npx eslint` shows 2 pre-existing, unrelated `react-hooks/set-state-in-effect` errors confirmed via diff to predate this change.

**Step 2K completed (2026-06-20).** Settings card visibility now follows `access-control`
permissions, closing the residual mismatch noted above for the `/settings` *landing page* (not
the `Settings` sidebar link itself, which remains as Step 2J left it):
- New `src/lib/access-control/settings-capabilities.ts` (`getSettingsCapabilities()`) loads a
  session's full permission set once per request and derives an
  `{ organization, identity, masters, finance, crm, workflow, policy, communication, integration,
  security, performance }` card-visibility map; `isManager` gets the same automatic full-access
  fallback used elsewhere in `access-control`.
- `/settings/page.tsx` now computes capabilities server-side and gates the page on
  `capabilities.canViewSettings || canAccessSettings(session.user)` (additive — same OR-bridge
  pattern as Step 2J's `showSettings`, so no Operations Head/Head of Sales/manager loses access).
  `AdminConsole.tsx` (the live landing-page component — `SettingsHub.tsx` is dead code retained
  only for rollback, see §4 row for `/settings/administration`) filters its card list to only the
  modules the session has a matching `Settings/<Resource>/VIEW`-or-`EDIT` grant for, and renders
  a "You do not have access to any Settings modules" empty state if none match.
- Users with access to individual Settings modules can now see exactly the matching card(s) —
  e.g. a role granted only `Settings/Finance/VIEW` sees the Finance Administration card and no
  others, rather than the previous all-or-nothing `canAccessSettings()` gate that showed every
  card to any Operations Head/Head of Sales regardless of which specific module(s) they actually
  hold a permission for.
- Inaccessible Settings modules are no longer shown only because of legacy `roles.ts` predicates
  (`canAccessSettings`/`isManager`/`isOperationsHead`/`isHeadOfSales`) — those predicates now only
  act as the backward-compatible bridge, not the primary visibility source.
- **CRM gap (consistent with finding 1/§8 of the tracker):** no `Settings/CRM` permission exists
  in the catalogue, so the CRM Administration card cannot be keyed on a real grant yet; it falls
  back to the same `isManager`-only bridge that `/settings/crm`'s own page guard already uses, so
  card visibility and destination-page access agree for now. Closing this properly is Step 2L
  (add `Settings/CRM` to `PERMISSION_CATALOGUE`).
- **New mismatch surfaced, not fixed this step:** `/settings/finance`, `/settings/communication`,
  `/settings/integrations`, `/settings/security`, and `/settings/performance` gate purely on
  `isManager` and do not consult the `Settings/{Finance,CommunicationAdmin,IntegrationAdmin,
  SecurityAdmin,Performance}` permissions their cards are now keyed on. A non-manager granted one
  of those permissions would now see the card (correct per this step's brief) but get redirected
  by the subpage itself (existing behavior, unchanged) — i.e. the card is *more* permissive than
  the destination page for that one role shape. This is the same class of issue §7's "Settings
  card visibility matches the page guard" checklist item is meant to catch; rewriting those five
  guards was explicitly out of scope for Step 2K (no broad page-guard refactor) and is left as a
  tracked follow-up.
- Legacy `/settings/administration` and `/admin` were left unchanged — neither is a card in
  `AdminConsole` already, so nothing needed hiding; their retirement remains tracked separately
  (Step 2P).
- No database schema, migration, API permission check, business logic, route deletion, or
  deletion of `roles.ts`/`rbac.ts` occurred. `npx tsc --noEmit`, `npx prisma validate`, and
  `next build` all pass.

---

## 6. Confirmed Unguarded Routes

### `PATCH /api/customers/master/[id]` — ~~still unguarded~~ **RESOLVED 2026-06-20 (Step 2B)**

- **File:** `src/app/api/customers/master/[id]/route.ts:10-37`
- **Current auth behavior:** Calls `getSession()`; returns `401` if `!session?.user`. That is the *only* check before the Prisma `update()` call executes.
- **Current permission behavior:** None. No `requirePermission`, no `isManager`, no ownership check.
- **Direct comparison:** The `DELETE` handler 29 lines below, in the *same file*, calls `requirePermission(session, "Masters", "CustomerMaster", "EDIT")` (line 45) before deleting. The PATCH handler — which can rewrite name, address, district, state, pincode, GST number, office type, and parent relationship for any customer master record — has no equivalent line.
- **Required permission:** `Masters/CustomerMaster/EDIT` (the same one `DELETE` already checks — and arguably the more semantically correct action than the `DELETE` handler's own choice, see next finding).
- **Recommended fix (do not implement yet):** Add `const deny = await requirePermission(session, "Masters", "CustomerMaster", "EDIT"); if (deny) return deny;` immediately after the session check, mirroring the sibling `DELETE` handler exactly.

### `GET /api/admin/masters` and `POST /api/admin/masters` — ~~still unguarded~~ **RESOLVED 2026-06-20 (Step 2B)**

- **File:** `src/app/api/admin/masters/route.ts:10-54` (GET), `:56-111` (POST)
- **Current auth behavior:** Both call `getSession()`; return `401` if falsy. No further check.
- **Current permission behavior:** None. GET exposes master-data categories, definitions, validation rules, and a full audit log (`type=audit`) to any authenticated employee. POST allows creating new categories, definitions, and validation rules with no permission check.
- **Required permission:** `Settings/Masters/VIEW` for GET, `Settings/Masters/EDIT` for POST — both already exist in `PERMISSION_CATALOGUE` (`permissions.ts:134-135`) and are already used correctly by the **page** guard (`/settings/masters/page.tsx:18-21`) — the page checks them, the API behind it does not.
- **Recommended fix (do not implement yet):** Add `requirePermission(session, "Settings", "Masters", "VIEW")` to GET and `requirePermission(session, "Settings", "Masters", "EDIT")` to POST, matching the page-level pattern already proven correct elsewhere in the same feature.

### Newly confirmed during this audit (not in the original two-item list, same gap pattern)

| Route | Methods | Gap | Required permission (already in catalogue) | Status |
|---|---|---|---|---|
| `/api/admin/masters/overrides` | GET, POST | Session-only | `Settings/Masters/VIEW` (GET), `Settings/Masters/EDIT` (POST) | **RESOLVED 2026-06-20 (Step 2B)** |
| `/api/admin/masters/values` | GET, POST | Session-only | `Settings/Masters/VIEW` (GET), `Settings/Masters/EDIT` (POST) | **RESOLVED 2026-06-20 (Step 2B)** |
| `/api/admin/customer-policy` | GET, POST | Session-only | `Settings/Masters/VIEW` (GET), `Settings/Masters/EDIT` (POST) — product decision made, treated as master-governance config | **RESOLVED 2026-06-20 (Step 2D)** |
| `/api/admin/vendor-policy` | GET, POST | Session-only | `Settings/Masters/VIEW` (GET), `Settings/Masters/EDIT` (POST) — same decision | **RESOLVED 2026-06-20 (Step 2D)** |
| `/api/master-values` | GET | **No session check at all** | Undetermined — confirm intended public/dropdown use first | Open — deferred to a later step per scope |

---

## 7. RBAC Conflict Analysis

Concrete cases where two systems could (or already do) give different answers for the same access decision:

1. **`rbac.ts` is fully decorative.** An admin editing a role's page permissions via the legacy `/admin` "Roles & Access" tab believes they are changing access. Nothing in the codebase reads `AppRole`/`RolePageAccess` to make an authorization decision. This is not a *disagreement* between systems — it's a system that *appears* to be one of the three but functions as none. Highest-priority cleanup or explicit-freeze item.

2. **Settings/Identity/Organization/Masters pages OR two systems together** (`hasPermission(...) || canAccessSettings(...)`). Today this means "either system granting access is sufficient," which is safe by construction (no route currently under-grants), but it permanently undermines any future attempt to use `access-control` as a strict allowlist — revoking a permission in `access-control` for an Operations Head or Head of Sales has **no effect** on these pages/routes as long as `canAccessSettings()` still returns true for that person. The two systems are not in conflict *yet* only because nobody has tried to diverge them.

3. **CRM-admin and Finance-admin routes import `access-control` but enforce via `roles.ts`-style `isManager` instead** (§3.2). This is the inverse problem: code that *looks* migrated (the import is present) is not actually migrated. A search for "does this route use access-control" by import alone would incorrectly mark these 14 files as migrated.

4. **Identity-management API is governed by the system it is supposed to be making obsolete.** `/api/admin/identity/*` (the screens and APIs that let an admin assign `Role`/`Permission`/`UserRole`/`DataAccessPolicy`) is gated by `canAccessSettings()` (roles.ts), not by `requirePermission(session,"Settings","Identity","EDIT")` (access-control) — even though that exact permission exists in the catalogue and the *page* (`/settings/identity/page.tsx`) already checks it correctly. The API path lags the page path here.

5. **`DELETE /api/customers/master/[id]` checks the wrong action.** ~~It calls `requirePermission(session,"Masters","CustomerMaster","EDIT")` for a delete operation, while `PERMISSION_CATALOGUE` defines a distinct `Masters/CustomerMaster/DELETE` action (`permissions.ts:126`) that exists only on paper — referenced nowhere in code. A role configured with EDIT-but-not-DELETE on Customer Master (a very plausible real-world configuration: "can fix typos, can't remove customers") would currently still be able to delete customer records through this endpoint, because the code checks the wrong action entirely.~~ **RESOLVED 2026-06-20 (Step 2C)** — the handler now checks `Masters/CustomerMaster/DELETE`, so EDIT-only roles can no longer delete customer records through this endpoint.

6. **`/api/employees` splits read and write across two different systems for the same resource** (§3.10) — `isManager` for GET, `requirePermission("CRM","Employee","CREATE")` for POST. A role granted employee-CREATE without `isManager` could create employees it can never subsequently list through this endpoint (it could still see them via other employee-listing surfaces, e.g. `/employees` page's own Prisma query, so this is an API-surface inconsistency rather than a true data leak — still worth fixing for the same reason as finding 3).

7. **Approval action authorization has no system at all checking it** (§3.9) — this isn't two systems disagreeing, it's the complete absence of an object-level/data-scope check that *either* system could have provided (`access-control`'s `canAccessScope` was built for exactly this kind of "is this user allowed to act on this specific record" question, per its own docstring, but `workflow-engine/approval.ts` does not call it).

---

## 8. Recommended Single Source of Truth

**Recommendation: `access-control` (Module × Resource × Action × Scope), confirming the brief's preferred direction.**

**Why this system is best:**
- It is the only one of the three with a real, growing catalogue (~70 permission triples already covering CRM, Finance, Workflow, Settings, Reports, Masters) and the only one with a **scope** dimension (`canAccessScope` — OWN/TEAM/DEPARTMENT/BRANCH/COMPANY/ALL), which the other two systems have no equivalent for and which is exactly what's missing from the Approval Engine gap in §3.9/§7.6.
- It already has the broadest *intended* enforcement footprint (71 importing files) — more of the codebase is already pointed at it than at `rbac.ts`, even though §3 shows much of that footprint is currently `import`-only (unused) or fallback-OR'd with `roles.ts`.
- It supports multiple roles per employee (`UserRole`) and per-tenant roles (`Role.tenantId`), which `rbac.ts`'s one-role-per-employee-name model cannot represent, and which `roles.ts`'s hardcoded string predicates cannot represent at all.
- It has a real admin UI already shipped (`/settings/identity`) that is more capable than the legacy `/admin` Roles tab (matrix is Module×Resource×Action×Scope, not a flat 4-boolean page list).
- Its fail-open behaviors (`isManager` bypass, `canAccessScope` allow-when-unconfigured) are explicit, documented, and reversible by simply adding `UserRole`/`DataAccessPolicy` rows — they are migration aids, not design flaws.

**What should be retired:**
- `src/lib/rbac.ts`'s `hasPermission()`/`loadRolePermissions()` — already dead code at the enforcement layer; can be deleted with zero behavioral change once `seedDefaultRoles()`'s one caller (`/api/admin/roles`) is also retired (i.e., once the legacy `/admin` Roles tab itself is retired per the prior implementation-status report's recommendation).
- The `AppRole`/`RolePageAccess` Prisma models, once the legacy `/admin` Roles tab is removed (do not drop them while that tab still renders, per "do not change Prisma schema" instruction in this task and "do not delete legacy permission files" — this is a future step, not part of this audit's output).

**What should remain temporarily:**
- `src/lib/roles.ts` predicates — they are the most heavily used system today (65 files) and several of them (`canManageFinance`, ownership checks like `assignedToId === employeeId`) encode real, currently-correct business rules that have no `access-control` equivalent yet (no Finance routes have been migrated, no `DataAccessPolicy` rows exist for OWN-scope pipeline/KRA/daily-update ownership). Retiring these before Finance write APIs and pipeline ownership scoping are re-expressed as `access-control` permissions + `DataAccessPolicy` scopes would be a regression, not a cleanup.
- The OR-patterns in §3.8/§4 (`hasPermission(...) || canAccessSettings(...)`) should remain until every role that currently satisfies `canAccessSettings()` (Operations Head, Head of Sales, Manager) has an equivalent `UserRole` grant in `access-control` — removing the OR before that mapping exists would lock out real users.

**Migration risk:** Low-to-moderate, staged correctly. The highest-risk single change is anything touching Finance routes (real money operations, no write APIs yet so the blast radius is currently read-only) and the Approval Engine action endpoint (touches every module that routes through workflows). The lowest-risk changes are the five confirmed-unguarded admin/master routes (§6) — adding a permission check that mirrors an already-correct sibling pattern in the same file/feature is close to zero-risk.

**Implementation order:** see §9.

---

## 9. Step-by-Step Migration Plan

**Step A — Fix confirmed unguarded routes.**
Add `requirePermission()` calls mirroring the already-correct sibling pattern in each case: `customers/master/[id]` PATCH (mirror its own DELETE), `admin/masters` GET/POST, `admin/masters/overrides` GET/POST, `admin/masters/values` GET/POST (mirror `/settings/masters/page.tsx`'s existing `Settings/Masters/VIEW`+`EDIT` check). Decide and document the intended access level for `admin/customer-policy`, `admin/vendor-policy` (likely `Settings/Masters/EDIT` or a new dedicated permission — needs a one-line product decision, not just code). Decide whether `/api/master-values` should require a session at minimum.

**Step B — Create a shared permission helper to close the "imported but unused" gap.**
Several files already `import { requirePermission }` and then bypass it with an inline `isManager` check (§3.2, 7 CRM-admin + 7 Finance-admin files; §3.3, 6 Identity/Policies files using `canAccessSettings` instead). No new helper code is strictly required — `requirePermission` already exists and does the right thing — the work here is wiring the existing call correctly in 20 already-identified files, which is mechanical and low-risk because the import statement is already present in every case.

**Step C — Apply permission checks to Finance write APIs *before* they are built** (per §3.7's finding that the catalogue already defines `Finance/Invoice/Expense/Payment/Advance` actions unused by any current route). When the Expense CRUD, Voucher create/cancel, Bank/Cash entry, and Advance disburse/settle endpoints from the prior implementation-status report's build sequence are implemented, gate them with `requirePermission(session,"Finance",<resource>,<action>)` from day one rather than the `canManageFinance()` predicate the read-only routes use today — this avoids creating 8-12 more "Wrong Permission System" rows the moment those endpoints ship.

**Step D — Update sidebar/settings cards to match permission checks.**
Once Step A/B land, re-derive `showFullFinance`, `showSettings`, and the Masters group visibility from `access-control`'s `getAllPermissions()`/`hasPermission()` rather than `roles.ts` booleans, so a role's actual API-level access and what it sees in navigation cannot drift (§5, findings 2 and 3). This is page-render logic only — no API behavior changes — but is explicitly **navigation** work, which the task brief asked not to change in *this* audit; defer execution to a follow-up task.

**Step E — Retire old `roles.ts` predicates only after replacement coverage.**
Specifically: do not remove `canManageFinance`, `canManagePayments`, ownership-equality checks, or `canAccessSettings` until (1) Finance routes are re-expressed under `access-control` with equivalent `DataAccessPolicy` OWN-scope rules for self-service expense/conveyance/advance access, and (2) every role currently passing `canAccessSettings()` has a confirmed equivalent `UserRole` grant. Until then, `roles.ts` is load-bearing, not legacy cruft — its predicates encode real, currently-correct business rules.

**Step F — Remove or freeze `rbac.ts`/`AppRole` matrix if not authoritative.**
It is already not authoritative (§2.2 — zero enforcement callers). The action item is to **freeze, not delete**, until the legacy `/admin` "Roles & Access" tab that is its only remaining consumer is itself retired (per the prior implementation-status report's recommendation to deprecate the orphaned legacy `/admin` panel). "Freeze" means: stop adding any new feature that reads or writes `AppRole`/`RolePageAccess`, and flag in code (a comment, not a behavior change) that the matrix is decorative, so no future contributor mistakes "I added a permission row here" for "I changed what this role can do."

---

## 10. Immediate Fixes Needed

In priority order (none implemented as part of this audit, per instructions):

1. **Approval action authorization (§3.9, Critical).** Add an authorization check inside `approveRequest`/`rejectRequest`/`returnRequest`/`delegateRequest`/`cancelRequest` (or in the route before calling them) that verifies `actorId` is a currently-eligible approver for the request's current step — e.g. by calling `resolveApprovers()` for that step and confirming `actorId` is in the result, or checking `getActiveDelegate()`. This is the single highest-impact fix in this report.

   > **Step 2A completed (2026-06-20).** A new `src/lib/workflow-engine/authorization.ts` module exports `assertCanActOnApprovalRequest(requestId, actorId, action)`, called from inside `approveRequest`/`rejectRequest`/`returnRequest`/`delegateRequest`/`cancelRequest` in `src/lib/workflow-engine/approval.ts` — before any `ApprovalAction` row is written, any status change, or any success audit-log entry.
   >
   > - **APPROVE / REJECT / RETURN / DELEGATE** are allowed only when the request is still `PENDING` and the actor is either (a) one of `resolveApprovers()`'s results for the request's *current* step, (b) the active delegate (`getActiveDelegate()`) for one of those approvers, or (c) explicitly granted the existing `Workflow/ApprovalRequest/APPROVE` permission via `access-control` (a deliberate per-employee grant — `hasPermission()` is called directly, with no `isManager` blanket bypass). Past-step and future-step approvers are excluded by construction, since only the current step is ever resolved.
   > - **CANCEL** is intentionally narrower per the brief's fallback instruction: only the original requester, and only while the request is still `PENDING`. No admin/manager override was added for cancellation, because none existed in the prior implementation — see the limitation note below.
   > - The approval action API route (`src/app/api/approvals/[id]/action/route.ts`) now maps engine denial reasons to HTTP status: `401` (no/invalid session), `404` (request not found), `403` (`"You are not authorized to perform this approval action."`, no internal workflow/resolver details exposed), `409` (request no longer pending), `400` (invalid action / missing `toUserId`), `500` (unexpected engine error).
   > - `approveRequest`/`rejectRequest`/`returnRequest`/`delegateRequest`/`cancelRequest` now return a structured `{ ok, reason? }` result instead of a bare `boolean`; the only consumer (the action route) was updated accordingly. No UI changes were required — both `/approvals` (`ApprovalInboxPage.tsx`) and `/finance/approvals` (`FinanceApprovalsClient.tsx`) already render `error` from any non-OK JSON response.
   > - **Known limitation:** `cancelRequest` previously had no status check at all (it would "cancel" a request regardless of current state); it is now correctly restricted to `PENDING` requests only, with no manager/admin cancel override, per the brief's explicit fallback ("if the existing code does not clearly support admin cancel permission, restrict cancellation to requester only for now"). A workflow-admin cancel override is a candidate follow-up once a dedicated `Workflow/ApprovalRequest/CANCEL` permission is added to the catalogue.
   > - **Pre-existing, unrelated quirk noted but not touched (out of scope for this fix):** `getPendingForApprover()` in `approval.ts` computes delegation eligibility for the *inbox listing* in the opposite direction from the new authorization check (it resolves who the viewing employee has delegated *to*, rather than who has delegated *to* the viewing employee). This does not affect the security fix — the action endpoint is now correctly gated regardless of what the inbox shows — but it means a delegate may not see a delegated request in their own inbox even though they are now correctly authorized to act on it if they have the request ID. Flagged as a follow-up, not fixed here (scope: "do not refactor unrelated modules").

2. **`PATCH /api/customers/master/[id]`** — add the permission check its own sibling `DELETE` handler already has.
3. **`GET`/`POST /api/admin/masters`, `/overrides`, `/values`** — add the permission check the page guard in front of them already has.

   > **Step 2B completed (2026-06-20).** Permission checks added to all 7 confirmed-unguarded routes from this list, using the existing `requirePermission()` helper from `src/lib/access-control`, placed immediately after the existing session check and before any mutation/read of master data:
   > - `PATCH /api/customers/master/[id]` now requires `Masters` / `CustomerMaster` / `EDIT` — mirrors its own sibling `DELETE` handler exactly.
   > - `GET /api/admin/masters` now requires `Settings` / `Masters` / `VIEW`.
   > - `POST /api/admin/masters` now requires `Settings` / `Masters` / `EDIT`.
   > - `GET /api/admin/masters/overrides` now requires `Settings` / `Masters` / `VIEW`.
   > - `POST /api/admin/masters/overrides` now requires `Settings` / `Masters` / `EDIT`.
   > - `GET /api/admin/masters/values` now requires `Settings` / `Masters` / `VIEW`.
   > - `POST /api/admin/masters/values` now requires `Settings` / `Masters` / `EDIT`.
   >
   > No response shapes, payloads, validation, or business logic were changed — only an added `requirePermission()` call + early return per route, identical in form to the pattern already used by the sibling `DELETE` handler and by `/settings/masters/page.tsx`'s own server-side guard. `npx tsc --noEmit`, `npx eslint`, `npx prisma validate`, and `next build` all pass. `/api/admin/customer-policy`, `/api/admin/vendor-policy`, `/api/master-values`, and `DELETE /api/customers/master/[id]`'s action-mismatch fix (item 5 below) were intentionally left untouched, per scope.

4. **`/api/admin/customer-policy`, `/api/admin/vendor-policy`** — add a permission check (after a short product decision on which exact permission applies).

   > **Step 2D completed (2026-06-20).** Product decision: these routes manage master-governance config (customer/vendor GST-required flags, duplicate thresholds, credit-approval-required, bank-verification-required), the same category of data as `/api/admin/masters` and its `/overrides`/`/values` siblings — so they are gated with the same `Settings/Masters` permission rather than a new dedicated permission. `GET /api/admin/customer-policy` and `GET /api/admin/vendor-policy` now require `Settings` / `Masters` / `VIEW`; `POST /api/admin/customer-policy` and `POST /api/admin/vendor-policy` now require `Settings` / `Masters` / `EDIT` — identical in form to the pattern already applied to `/api/admin/masters`, `/overrides`, and `/values` in Step 2B. Customer/vendor governance policy is no longer readable or writable by every authenticated employee. No payload validation, save logic, or response shape changed. `/api/master-values`, CRM-admin routes, Finance-admin routes, Identity APIs, Policy APIs, sidebar visibility, `rbac.ts`, and `roles.ts` were intentionally left untouched, per scope. `npx tsc --noEmit`, `npx eslint`, `npx prisma validate`, and `next build` all pass.

5. **`DELETE /api/customers/master/[id]`** — switch the checked action from `EDIT` to `DELETE` to match the catalogue and the operation actually being performed.

   > **Step 2C completed (2026-06-20).** `DELETE /api/customers/master/[id]` now requires `Masters` / `CustomerMaster` / `DELETE` (was checking `EDIT`). A role granted `EDIT` but not `DELETE` on Customer Master can no longer delete customer records through this endpoint — closing the action-mismatch gap described in §7 finding 5. `PATCH /api/customers/master/[id]` remains guarded by `Masters` / `CustomerMaster` / `EDIT`, unchanged. The fix is a single-line change (the permission action string in the existing `requirePermission()` call); delete payload, query, response shape, and validation are all unchanged. `npx tsc --noEmit`, `npx eslint`, `npx prisma validate`, and `next build` all pass.

6. **Wire the 14 CRM-admin/Finance-admin route files that import but don't call `requirePermission`** (§3.2) to actually call it instead of the bare `isManager` check, so future `access-control` role grants take effect there.

   > **Step 2F partially completed (2026-06-20).** The 7 **Finance-admin** route files (`admin/finance/{advance,collection,conveyance,credit,expenses,policies,voucher}`) now call `requirePermission(session,"Settings","Finance","VIEW")` on GET and `requirePermission(session,"Settings","Finance","EDIT")` on POST/PATCH, replacing the inline `isManager` check — `Settings/Finance` already existed in the catalogue (Phase 9), so no new permission was added. `requirePermission()`'s existing manager fallback (`index.ts:42`, "managers always pass regardless of `UserRole` rows") is unchanged, so existing managers keep working exactly as before; a non-manager now needs an actual `Settings/Finance/VIEW` or `/EDIT` grant via `/settings/identity` to reach these routes, where previously no grant could ever let them in.
   >
   > The 7 **CRM-admin** route files (`admin/crm/{assignment,automation,pipelines,pipelines/[id],sla,territories,territories/[id]}`) were **intentionally left unmigrated** — a catalogue gap was found, not guessed around. `PERMISSION_CATALOGUE` (`permissions.ts`) has no `Settings/CRM` entry and no other module/resource pair that represents CRM-administration configuration (pipeline design, territory rules, SLA rules, assignment rules, automation rules) — the only CRM-module entries are end-user `CRM/Lead`, `CRM/Opportunity`, `CRM/Activity`, `CRM/Report` permissions, none of which fit. Per the migration's explicit instruction to stop and document rather than invent a permission, these 7 files still use the inline `isManager` check and still import `requirePermission` unused. **Recommended next step:** add a `Settings/CRM` (VIEW/EDIT) pair to `PERMISSION_CATALOGUE` — mirroring the existing `Settings/Finance` and `Settings/Masters` precedent — seed it, then repeat this same migration pattern for these 7 files in a follow-up step. No payloads, validation, response shapes, or business logic were changed for either group. `npx tsc --noEmit`, `npx eslint`, `npx prisma validate`, and `next build` all pass.
7. ~~**`/api/master-values`** — decide and apply whether a session check is required.~~ **RESOLVED 2026-06-20 (Step 2E).**

   > **Step 2E completed (2026-06-20).** Usage audit (full-text search for `master-values`, `MasterValue`, `master values`) found exactly one consumer path: `src/hooks/useMasterValues.ts` → `fetch("/api/master-values?code=...")`, called from `LeadGenClient.tsx` (`/lead-generation`), `LeadsClient.tsx` (`/pipeline/leads`), and `finance/expenses/components/ExpenseForm.tsx` (`/finance/expenses/new`). All three are internal CRM pages whose server `page.tsx` already calls `getSession()` before rendering — there is no public/unauthenticated caller, login/registration-page usage, or API-to-API usage. Per the decision rule, added the standard `getSession()` / 401 check to `GET /api/master-values`, matching the convention used across the rest of the API (e.g. `/api/customers/master/[id]`). No permission check was added — the route returns only a flat array of master-value strings (`values.map(v => v.value)`) for dropdown population, no admin-only or sensitive data, so session-only matches the "dropdown lookup" intent the original audit flagged as undocumented. Query params, filtering (`masterCode` lookup via `getMasterValues()`), response shape, and status codes for authenticated requests are all unchanged — only unauthenticated access now returns 401 instead of 200. `npx tsc --noEmit`, `npx eslint`, `npx prisma validate`, and `next build` all pass.

8. **Migrate Identity and Policy Admin APIs off the legacy `canAccessSettings()` check to `access-control`** (§3.3) — closing the irony of the API that manages `Role`/`Permission`/`UserRole`/`DataAccessPolicy` rows being itself gated by the system it's meant to supersede.

   > **Step 2G completed (2026-06-20).** Migrated 13 route files from `canAccessSettings(session.user)` to `requirePermission()`:
   > - **Identity (7 files):** `admin/identity/permissions`, `permissions/[roleId]`, `policies`, `policies/[roleId]`, `roles`, `roles/[id]`, `users/[id]` — GET now requires `Settings`/`Identity`/`VIEW`; POST/PATCH now requires `Settings`/`Identity`/`EDIT`. (`users/[id]` has no GET handler, so only the PATCH/EDIT check applies there.)
   > - **Policy (6 files):** `admin/policies`, `policies/[id]`, `policies/[id]/versions`, `policies/audit`, `policies/categories`, `policies/evaluate` — GET now requires `Settings`/`Policy`/`VIEW`; POST/PATCH now requires `Settings`/`Policy`/`EDIT`.
   > - **`POST /api/admin/policies/evaluate` decision:** gated with `Settings`/`Policy`/**VIEW**, not EDIT — confirmed `evaluatePolicy()` (`src/lib/policy-engine/index.ts`) performs only a `findMany` read with no writes, and a project-wide grep found **no caller anywhere in the codebase** references this route path yet (the file's own header comment describes it as future-intended for expense/deal/export flows, but it isn't wired into any of them today) — so adding even a VIEW-level gate has zero functional impact on any existing user flow.
   > - Both `requireSettingsAccess()`/`requireSettingsEdit()`/`requirePolicyAccess()`/`requirePolicyEdit()` local helper functions (one per file, identical shape) were removed in favor of inlining the now-two-line check directly, matching the pattern used everywhere else in the codebase (e.g. `/api/customers/master/[id]`) — this was a mechanical removal of dead wrapper code made unused by the migration itself, not a separate refactor.
   > - The `canAccessSettings` import was removed from all 13 files; it is **not removed from `src/lib/roles.ts`** itself and remains in active use elsewhere (page-level guards, `/settings/administration`, the legacy `/admin` panel) — out of scope per the migration's explicit instruction.
   > - `requirePermission()`'s manager fallback (`index.ts:42`) is unchanged — existing managers continue to pass through every migrated route exactly as before. A non-manager now needs an actual `Settings/Identity` or `Settings/Policy` grant via `/settings/identity` to reach these routes, where previously only `isOperationsHead`/`isHeadOfSales` (per `canAccessSettings`'s definition in `roles.ts`) could ever pass.
   > - **Found but explicitly out of scope:** `src/app/api/admin/identity/users/route.ts` (the collection endpoint, distinct from `/[id]`) still uses `canAccessSettings` — it was not in the Step 2G route list (only `users/[id]` was named) — see §3.3 table. Flagged for a follow-up step.
   > - No payloads, validation, response shapes, pagination, sorting, or business logic changed in any of the 13 files — only the permission gate. `npx tsc --noEmit`, `npx prisma validate`, and `next build` all pass. `npx eslint` reports 3 pre-existing `@typescript-eslint/no-explicit-any` errors in `policies/[id]/route.ts`, `policies/[id]/versions/route.ts`, and `policies/audit/route.ts` — confirmed via diff to be unrelated to this change (existing `as any`/`as Record<string, any>` casts several lines below the permission check, untouched by this migration).

9. **Create a migration tracker and freeze the legacy `rbac.ts`/`AppRole`/`RolePageAccess` system** so future developers don't mistakenly build on it.

   > **Step 2H completed (2026-06-20).** Created `docs/RBAC_MIGRATION_TRACKER.md` — a practical, execution-focused companion to this audit report covering: current RBAC state, a systems-decision table (`access-control` = final source of truth; `roles.ts` = temporary bridge; `rbac.ts`/`AppRole`/`RolePageAccess` = frozen; legacy `/admin` Roles tab = non-authoritative; `/settings/identity` = active management UI), a list of completed steps (2A–2G, all independently verified against current code, none marked "pending confirmation"), a table of 9 remaining migration steps (2I–2R) with status/risk/notes, freeze rules, route- and page-migration checklists for future work, and a permission-mapping summary cross-checked line-by-line against the actual `PERMISSION_CATALOGUE` in `permissions.ts` (documenting, not inventing, the gaps found: no `Settings/CRM`, no `Finance/Voucher`, no `EDIT` action on `Finance/Payment` or `Finance/Advance`, no `DELEGATE`/`CANCEL` action type at all in the `ACTION` enum, no `IMPORT` action on `Masters/VendorMaster`).
   > - Added a top-of-file freeze comment to `src/lib/rbac.ts` using the brief's exact wording, pointing future readers to `access-control` and the new tracker. No behavior changed — comment only.
   > - Added a non-blocking warning banner to the legacy `/admin` Roles & Access tab (`src/app/admin/AdminClient.tsx`, directly above where it mounts `<RolesClient />`) reading: *"Legacy Roles & Access is retained for reference only. Changes made here do not affect real permission decisions. Runtime permissions are managed from Settings > Identity."* Reused the exact existing inline-style warning pattern already present inside `RolesClient.tsx` (amber background, `AlertTriangle`-style icon, same color tokens) rather than introducing a new component — scoped to only the "roles" tab via the existing conditional render, so no other tab or page is affected.
   > - No database schema, migrations, `rbac.ts`/`AppRole`/`RolePageAccess` deletions, route permission logic, or other UI were touched, per the step's explicit constraints. `npx tsc --noEmit`, `npx prisma validate`, and `next build` all pass.

10. **Step 2I — formalize and complete the freeze warnings** started in Step 2H, per `docs/RBAC_MIGRATION_TRACKER.md` §4's own step numbering.

    > **Step 2I completed (2026-06-20).** Legacy RBAC freeze warning strengthened and extended:
    > - `src/lib/rbac.ts`'s top-of-file comment was expanded to explicitly cover all points from the canonical warning text — backs the old `/admin` Roles UI only, not used for runtime authorization, points to `src/lib/access-control/`, "do not add new enforcement logic here," **and** the two points the Step 2H comment had only implied: "do not build new features on `AppRole`/`RolePageAccess`" and "this file is frozen until the legacy `/admin` Roles UI is retired." No functions, exports, `seedDefaultRoles()`, `DEFAULT_ROLES`, or `PAGES` were touched — comment only.
    > - The existing Roles & Access tab warning banner (added in Step 2H, `src/app/admin/AdminClient.tsx`) already conveys the same warning as this step's canonical message ("Legacy Roles & Access is retained for reference only... Runtime permissions are managed from Settings > Identity...") — left as-is rather than re-edited for wording parity, since the safety property (a visible, accurate, non-blocking warning) was already satisfied.
    > - **New this step:** a second, smaller warning was added to the general Admin Panel header (`src/app/admin/AdminClient.tsx`, just below the existing "Configuration & Rules" subtitle) reading *"This legacy administration area is being retained temporarily. New permission management should be done from Settings > Identity."* This is visible on **every** tab of the legacy admin panel (Roles & Access, Pipeline, Sales Funnel, Collections, etc.), not just the Roles tab — closing the gap where a user on any other legacy admin tab would see no indication the area is being phased out.
    > - Old `/admin Roles tab still loads, Save/Discard still work, Settings > Identity unaffected — confirmed by code inspection (no handler, state, or API-call logic touched in either edit) and by `npx tsc --noEmit`/`next build` passing with the route present in the build output.
    > - No database schema, migrations, file deletions, `rbac.ts`/`AppRole`/`RolePageAccess` removal, `/admin` route removal, `access-control` logic, `roles.ts` logic, sidebar/navigation, or `/settings/identity` behavior were touched, per the step's explicit constraints. `npx tsc --noEmit`, `npx prisma validate`, and `next build` all pass.

---

## 11. Do Not Touch Yet

Per the audit's scope and the broader project rules in `CLAUDE.md` ("never delete existing features," "always confirm before pushing to production"), the following are flagged as **understood but explicitly out of scope for immediate action**:

- **`src/lib/rbac.ts` and the `AppRole`/`RolePageAccess` models** — decorative but still the live data source for the legacy `/admin` Roles tab; do not delete the file or the models until that tab is retired (a separate, larger decision already flagged in the prior implementation-status report).
- **The `hasPermission(...) || canAccessSettings(...)` OR-patterns** in Organization/Identity/Masters settings routes — removing the legacy half of the OR before every relevant role has a confirmed `access-control` equivalent would lock out real users (Operations Head, Head of Sales) immediately.
- **`roles.ts` ownership-equality checks** (`assignedToId === employeeId`, `employeeId === self`) across Pipeline/KRA/Daily-Updates/Weekly-Commits/Reviews/Sales-Funnel/Lead-Generation/Collections — these are correct, working, and have no `access-control`/`DataAccessPolicy` replacement configured yet. Touching these now would be a functional regression, not a security fix.
- **The `dev_employee_id` impersonation bypass in `src/lib/dev-session.ts`** — confirmed (not re-verified line-by-line this pass, per the prior implementation-status report) to be guarded by a `NODE_ENV !== "development"` early return. Worth a deploy-checklist line item, not a code change.
- **Finance API permission migration (Step C)** — sequence this *with* the as-yet-unbuilt Finance write APIs, not as a standalone retrofit of the current read-only routes, to avoid two migrations of the same code.
- **Navigation/sidebar changes (Step D)** — explicitly deferred; this task's instructions say "do not change navigation."

---

## 12. Final Recommendation

Adopt **`access-control`** as the single production permission system, per §8. The path there is not a rewrite — it is closing two distinct classes of gap that already exist side by side in the same codebase:

1. **Missing checks** (§3.5, §3.6, §3.9, §6) — five confirmed routes with no permission check at all, and one full class of object-level authorization (`approveRequest` family) missing entirely regardless of which system is used. Fix these first; they are the actual production risk today, independent of any RBAC consolidation decision.
2. **Wrong-system checks** (§3.2, §3.3, §3.7, §3.8, §7) — code that already imports or partially uses `access-control` but defers to `roles.ts` either by mistake (unused import) or by design (OR-fallback during migration). Resolve these by wiring the existing, already-correct catalogue entries into the routes that currently bypass them, in the order given in §9.

Do not delete or disable `roles.ts` or `rbac.ts` as part of fixing #1 — `rbac.ts` should be frozen (not removed) until its one remaining consumer is retired, and `roles.ts` remains the correct system for ownership-style checks until those are re-expressed as `DataAccessPolicy` scopes. The fastest, lowest-risk path to a materially safer system is §10's seven immediate fixes, none of which require retiring any existing system first.
