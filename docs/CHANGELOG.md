# Changelog

Reverse-chronological log of notable changes. **Update at the end of every session.**
Dates from git history (branch `master`).

## Current State
- All core modules present on `master` / `sales.caveoinfosystems.com`: auth, pipeline,
  KRA engine + reviews/commits/certifications, collections + payments + advances +
  notifications, customer master, dashboards, admin panel, mobile app, bulk import, org hierarchy.
- **Database is MySQL/MariaDB 11.8** (driver adapter `@prisma/adapter-mariadb`) — migrated
  from SQLite 2026-06-02.
- **Finance Operations — Phase 1 (database) is committed/pushed** (`1747f9e`): 10 models,
  migration `20260602120000_finance_operations_phase1`, finance config + dev seeds.
- **Finance Operations — Phase 2 UI (2026-06-03), UI-ONLY mock data, UNCOMMITTED** (~45 files).
- **🆕 2026-06-04 — Three enterprise UI modules added, UI-ONLY on mock data, UNCOMMITTED:**
  (1) **Expense Categories** (`/finance/expenses/categories`, 8 files); (2) **Global Vendor Master**
  (`/masters/vendors`, 14 files); (3) **Global Customer Master** (`/masters/customers`, 16 files).
  New sidebar **Masters** section. `/finance/vendors` now redirects to `/masters/vendors`. **No APIs,
  no schema changes.** `tsc` clean.
- **🆕 2026-06-04 — Admin Console Phase 1 implemented, UNCOMMITTED:**
  `/settings` now renders Enterprise Admin Console (`AdminConsole.tsx`) — 12-module grid, 4 stat cards,
  live search/filter, Recent Changes, Quick Actions. `SettingsHub.tsx` kept as rollback. Zero DB changes.
- **🆕 2026-06-04 — Admin Console Phase 2 DB Foundation implemented, UNCOMMITTED:**
  12 new Prisma models (Tenant, Company, Branch, Department, Team, Designation, EmployeeProfile, Role,
  Permission, RolePermission, UserRole, DataAccessPolicy). Offline migration SQL
  `20260604000000_admin_console_foundation`. Access control service (`src/lib/access-control/`):
  `permissions.ts` (50-permission catalogue), `policy.ts` (scope resolution), `index.ts`
  (`hasPermission`/`getAllPermissions`). Seed: `prisma/seed-admin-foundation.ts` (6 roles, full
  permission grants, data access policies). `roles.ts` bridge comment added. `tsc` clean,
  `next build` clean. **Migration NOT yet applied to dev/prod DB.**
- **🆕 2026-06-04 — Admin Console Phase 3 — Organization Management implemented, UNCOMMITTED:**
  Full enterprise org console at `/settings/organization` — 8 tabs (Overview, Companies, Branches,
  Departments, Teams, Designations, Hierarchy, Audit). 10 API routes (`/api/settings/organization/*`)
  with dual-mode: live DB when migration applied, mock data until then. `Organization` permission pair
  added to PERMISSION_CATALOGUE. Organization module status set to `"active"` in `adminModules.ts`.
  `tsc` clean, `next build` clean.
- **🆕 2026-06-04 — Admin Console Phase 4 — Identity & Access Management implemented, UNCOMMITTED:**
  Full enterprise IAM console at `/settings/identity` — 6 tabs: Users, Roles, Permissions, Data Access,
  Delegation, Audit. Components: `UsersTab` (KPI cards, search/filter, quick suspend), `UserProfileDrawer`
  (profile/org/access tabs, status change), `RoleManagement` (table, clone, disable, `RoleEditor` slide-over),
  `PermissionMatrix` (module/resource grid with dirty-cell tracking), `DataAccessPolicyPanel` (scope pills per
  module), `DelegationPanel` (rule table, slide-over form), `IdentityAudit` (audit log with action filter).
  8 API routes: `GET/PATCH /api/admin/identity/users/[id]`, `GET/POST /api/admin/identity/roles`, `PATCH
  /api/admin/identity/roles/[id]`, `GET /api/admin/identity/permissions?roleId=X`, `POST
  /api/admin/identity/permissions/[roleId]`, `GET /api/admin/identity/policies?roleId=X`, `POST
  /api/admin/identity/policies/[roleId]`. All dual-mode (live DB / mock). `/settings/users-roles` now
  redirects to `/settings/identity`. `Settings/Identity/VIEW` and `EDIT` added to `PERMISSION_CATALOGUE`.
  `tsc` clean, `next build` clean.
- **🆕 2026-06-04 — Admin Console Phase 5 — Policy Engine Foundation implemented, UNCOMMITTED:**
  Centralized reusable Policy Engine at `/settings/policies` — policies, rules, lifecycle, version history
  and audit log. Policy Engine service (`src/lib/policy-engine/`): `conditions.ts` (9 operators, dot-notation
  field resolution), `actions.ts` (6 action types), `rules.ts` (priority-ordered evaluation, BLOCK
  short-circuit), `versioning.ts` (snapshot builder), `policy.ts` (`listPolicies`/`transitionPolicyStatus`),
  `index.ts` (`evaluatePolicy` — fail-open pre-migration). 6 new DB models (PolicyCategory, Policy,
  PolicyRule, PolicyVersion, PolicyAudit, ConfigurationVersion). Offline migration SQL
  `20260604120000_policy_engine_foundation`. Admin UI: 7 components (PolicyList, PolicyEditor with
  3-section tabs, RuleBuilder with inline enable/disable, ConditionBuilder IF/THEN, ActionBuilder,
  PolicyVersionHistory, PolicyAudit). 6 API routes (`GET/POST /api/admin/policies`, `PATCH [id]`,
  `GET [id]/versions`, `GET audit`, `GET categories`, `POST evaluate`). `Settings/Policy/VIEW+EDIT`
  added to PERMISSION_CATALOGUE. Policy Engine entry added to `adminModules.ts`. Seed:
  `prisma/seed-policy-defaults.ts` (6 categories, 3 default policies). `settings.ts` extended with
  `getPublishedSetting`/`draftSetting`/`publishSettingVersion`. `tsc` clean, `next build` clean.
  **Migration NOT yet applied to dev/prod DB — all API routes fail-open to mock data until then.**
- **Latest commit:** `ce29704` (session memory snapshot). **All work from 2026-06-04 is uncommitted.**
- **Prod note:** unchanged; confirm `200` on `/login` before/after any push. Pre-`1ab4f7d`
  JWTs still need one sign-out + in to pick up live role.

## Next Actions
1. **Apply migration to dev DB:** `$env:DATABASE_URL="mysql://…"; npx prisma migrate deploy` then verify
   `npx prisma db seed` with `seed-admin-foundation.ts` runs clean.
2. **Decide commit strategy** for the large uncommitted body and commit in logical chunks (confirm with Vijesh).
3. **Wire real data behind the finance/master screens** — Expense Register CRUD first; then Customer Master →
   extend existing `Customer` model; Vendor Master → wire to Phase-1 `Vendor` model.
4. **Wire real data behind the finance/master screens** — Expense Register CRUD first; then Customer Master →
   extend existing `Customer` model; Vendor Master → wire to Phase-1 `Vendor` model.
5. **Consolidate Customer Master** — two nav entries pending convergence (`/masters/customers` + legacy `/customers`).
6. **Service-worker dev fix**; wrap `recordPayment`/`applyAdvance` in `$transaction`; apply `@db.Decimal(12,4)`;
   rotate dev DB password; remove `better-sqlite3`; mitigate `xlsx@0.18.5`.

---

## [2026-06-04 — Session 2] — Role-Adaptive Dashboard + Settings Hub + Enterprise Architecture Plan

> No application logic removed. No schema/API/migration changes. `npx tsc --noEmit` clean.
> All changes are **uncommitted** (same working tree as Session 1 today).

### Added
- **Role-Adaptive Dashboard** (`src/app/dashboard/`) — dashboard now renders differently per
  role variant. Added `roleVariant: "manager" | "opsHead" | "techHead" | "employee"` discriminator
  to `DashboardProps`. `showSales` flag gates pipeline funnel, sales KPI tiles, team chart.
  `showTeam` flag gates approvals panel. Live DB role refresh reads `Employee.isManager` + `role`
  on every request (same pattern as Navbar).
- **`isOperationsHead` import** in `dashboard/page.tsx`; `isTechHead` regex inline. Operations Head
  and Technical Head see team-oriented dashboard without the sales funnel.
- **Settings Hub expanded** (`src/app/settings/SettingsHub.tsx`) — 10 → 26 cards across 7 sections:
  General (3), Workflow (2), People (3), Masters (2), Finance (11), CRM & Sales (3), System (2).
  Added icons: `Landmark, Banknote, Layers, Wallet, MapPin, ClipboardCheck, ClipboardList,
  BarChart3, Target, BookUser, Store, CheckSquare, Activity`.
- **AdminClient expanded** (`src/app/admin/AdminClient.tsx`) — 11 → 14 tabs. Added Finance Ops,
  Approvals, and Masters tabs with new icons `Receipt, ClipboardCheck, BookUser`.
- **Settings in `src/lib/settings.ts`** — 16 new defaults + metadata across 3 new categories:
  Finance (7 keys: conveyance_rate_per_km, advance_max_months_salary, expense_max_days_backdated,
  voucher_prefix, fiscal_year_label, auto_approve_expense_below, expense_receipt_required_above),
  Approvals (5 keys), Masters (4 keys: gstin_validation_enabled, duplicate_name_threshold_pct,
  require_pan_for_vendor, customer_credit_limit_default).
- **Enterprise Architecture Plan** (`docs/ADMIN_ARCHITECTURE_PLAN.md`) — 10-section comprehensive
  migration plan from the current flat admin panel to a 12-module Enterprise Admin Console.
  Covers: 9 current problems, 12 target modules with full detail, 9 Architecture Decisions (Org
  Model, Company Model, User Model, Security Model, Permission Depth, Approval, Masters, Record
  Visibility, Config Lifecycle), target folder structure, 4-layer DB architecture plan (Org/IAM/
  Workflow/Config), 6-phase migration strategy (12 sprints), 8 files to refactor, 5 files to
  deprecate, 10 development rules.

### Files Modified
- `src/app/dashboard/page.tsx` — live role detection, `roleVariant` computation, conditional data queries
- `src/app/dashboard/DashboardClient.tsx` — `roleVariant` prop + `showSales`/`showTeam` flags + conditional sections
- `src/app/settings/SettingsHub.tsx` — expanded from 10 to 26 cards, 7 sections
- `src/app/admin/AdminClient.tsx` — added Finance Ops, Approvals, Masters tabs (11 → 14)
- `src/lib/settings.ts` — 16 new setting defaults + metadata (Finance, Approvals, Masters categories)

### Created
- `docs/ADMIN_ARCHITECTURE_PLAN.md` — full enterprise admin console architecture plan

---

## [2026-06-04 — Session 4] — Admin Console Phase 1 (UI Shell) + Phase 2 (DB Foundation)

> No existing features removed. `npx tsc --noEmit` clean. `npx next build` clean. All changes UNCOMMITTED.

### Admin Console Phase 1 — UI Shell
- **`src/app/settings/AdminConsole.tsx`** — enterprise 12-module grid with live search/filter
- **`src/app/settings/data/adminModules.ts`** — module metadata, stats, recent changes
- **`src/app/settings/components/`** — AdminHeader, AdminSearch, AdminStatsCard, AdminModuleCard, RecentChanges, QuickActions
- **`src/app/settings/page.tsx`** updated to render `<AdminConsole />` (`SettingsHub.tsx` kept as rollback)

### Admin Console Phase 2 — Database Foundation
- **`prisma/schema.prisma`** — 12 new models added: Tenant, Company, Branch, Department, Team, Designation, EmployeeProfile, Role, Permission, RolePermission, UserRole, DataAccessPolicy. 4 back-reference relations added to Employee model.
- **`prisma/migrations/20260604000000_admin_console_foundation/migration.sql`** — offline migration, 12 CREATE TABLE statements + FK constraints. NOT yet deployed.
- **`src/lib/access-control/permissions.ts`** — 50-permission catalogue, MODULE/ACTION/SCOPE constants
- **`src/lib/access-control/policy.ts`** — `resolveScope()` + `canAccessScope()` with OWN/TEAM/DEPARTMENT/BRANCH/COMPANY/ALL handling
- **`src/lib/access-control/index.ts`** — `hasPermission()` + `getAllPermissions()` public API
- **`prisma/seed-admin-foundation.ts`** — idempotent seed: Caveo Infosystems tenant/company/branch, 3 departments, 6 enterprise roles, full permission grants, data access policies
- **`src/lib/roles.ts`** — Phase 3 migration bridge comment added (legacy predicates still live)
- **`npx prisma generate`** — regenerated Prisma client with all 12 new models

### Migration status
- Schema + migration SQL written. `npx prisma migrate deploy` **NOT yet run** against dev/prod DB.
- All new `hasPermission`/`canAccessScope` calls return safe defaults (false / true respectively) until UserRole/DataAccessPolicy rows exist → zero backward-compat breakage.

---

## [2026-06-04] — Expense Categories + Global Vendor Master + Global Customer Master (UI-only, mock)

> Three enterprise UI modules built this session. **All UI-only — no Prisma schema, no
> migrations, no API routes.** All data is illustrative mock in each module's `data.ts`.
> Everything below is **uncommitted**. `npx tsc --noEmit` clean. Pages verified `200` live.

### Added — Expense Category Management (`/finance/expenses/categories`)
- Replaced the "coming soon" placeholder with a full **configuration-driven category engine**.
- `data.ts` (30 mock categories, 7 parents + 23 sub-categories, `deriveCatCaps`, 7 default
  templates) + `ExpenseCategoriesClient` + 5 components: `CategoryTable` (search/sort/paginate/
  column-visibility/bulk-disable), `CategoryFilters`, `CategoryForm` (9 sections A–I: Basic,
  Usage, Payment, Document rules, GST, Approval, Grade-policy, Customer, Tally), `CategoryDrawer`
  (full read view + clone), `CategoryTemplateLoader` (load default Office/Travel/Employee/Business/
  Maintenance/IT/Customer template groups).

### Added — Global Vendor Master (`/masters/vendors`)
- New global CRM master (one `Vendor` referenced by Finance/Expense/Procurement/Inventory/
  Projects/Support/Assets/Tally). `data.ts` (8 mock vendors, complete Indian GST state-code map,
  `validateGSTIN` validator, `deriveVendorCaps`) + `VendorMasterClient` + 10 components:
  `VendorTable`, `VendorFilters`, `VendorForm`, `VendorProfile` (9-tab drawer: Overview/Branches/
  GST/Contacts/Bank/Documents/Transactions/Purchase History/Audit), `VendorBranchManager`
  (multi-branch + per-branch GST), `VendorContactManager`, `VendorBankManager`,
  `VendorDocumentPanel` (expiry alerts), `VendorUsageViewer`, **`GSTRegistrationPanel`** (+
  `GSTINBadge`) — the reusable GSTIN validator field.
- `/finance/vendors` placeholder now **redirects** to `/masters/vendors`.

### Added — Global Customer Master (`/masters/customers`)
- New global CRM master (one `Customer` referenced by CRM Sales/Opps/Quotations/Orders/Projects/
  Support/AMC/Assets/Finance/Profitability/Engineer-Visits/Conveyance). **Extends** the existing
  `Customer` model — does NOT duplicate it; the legacy operational `/customers` page (live DB
  import + dedupe) is untouched. `data.ts` (8 mock customers incl. ABC Group hierarchy parent +
  2 subsidiaries, `deriveCustomerCaps`, duplicate detection, profitability math; reuses the
  Vendor GST validator) + `CustomerMasterClient` + 13 components: `CustomerTable`,
  `CustomerFilters`, `CustomerForm` (Basic/Hierarchy/Commercial/Sites + duplicate warning),
  `CustomerProfile` (12-tab drawer), `CustomerSiteManager` (multi-site + per-site GST + geo
  lat/long), `CustomerContactManager`, `CustomerGSTPanel`, `CustomerHierarchyViewer` (parent↔child
  tree), `CustomerAssetPanel` (warranty/AMC/SLA), `CustomerProfitabilityPanel` (revenue−cost=margin),
  `CustomerDocumentPanel`, `CustomerTimeline` (audit), `CustomerRelationshipViewer` (linked
  Opps/Quotations/Orders/Projects/Support/AMC/Finance/Expenses, finance-gated).

### Fixed
- **Login broken (dev quick-login 404).** An orphaned `next dev` process held port 3000 and
  served a stale Turbopack route tree where `/api/dev/switch` wasn't registered → quick-login
  couldn't set the `dev_employee_id` cookie. Fix: killed the orphan, cleared `.next`, restarted
  clean. (CLAUDE.md gotcha #10.) No code change.
- Removed a dead `GST_RATES` import in `vendors/components/GSTRegistrationPanel.tsx` (latent
  unused-import that broke `tsc` once Customer Master pulled the module into the graph).

### Changed
- `src/components/SidebarLinks.tsx` — added a **Masters** section (Customer Master + Vendor
  Master) to Manager, Accounts, and Employee role groups; Finance-nav "Vendors" link now points
  to `/masters/vendors`.

### Files Modified
- `src/components/SidebarLinks.tsx` (Masters section + Vendor link), `src/app/finance/vendors/page.tsx`
  (now a redirect), `src/app/finance/expenses/categories/page.tsx` (placeholder → real),
  `src/app/masters/vendors/components/GSTRegistrationPanel.tsx` (dead-import cleanup).
- New: everything under `src/app/masters/` (29 files) and `src/app/finance/expenses/categories/` (8 files).

### Database Changes
- **None.** No schema, migrations, or Prisma model changes.

### Config Changes
- **None.**

---

## [2026-06-03] — Finance Operations Module · Phase 2 UI (mock data, no backend)

> Entire finance UI built this session. **UI-only — no Prisma schema, no migrations, no API
> routes.** All data is illustrative mock held in each module's `data.ts` (money in ₹ rupees).
> Everything below is **uncommitted** in the working tree.

### Added — Finance navigation & shell
- `canManageFinance(user)` predicate in `src/lib/roles.ts` (manager / Accounts / Operations Head).
- Collapsible **Finance** section in `src/components/SidebarLinks.tsx` (Accounts ▸ Cash/Bank
  Book, Expenses ▸ Register/Add/Categories, Vendors, Employees ▸ Claims/Advance/Conveyance,
  Approvals, Vouchers, Reports) — full nav for finance roles, own-data nav for employees.
- 13 finance route placeholders, later filled: `/finance`, `/finance/cash-book`,
  `/finance/bank-book`, `/finance/expenses(+/new,/categories)`, `/finance/vendors`,
  `/finance/claims`, `/finance/advances`, `/finance/conveyance`, `/finance/approvals`,
  `/finance/vouchers`, `/finance/reports`.

### Added — Finance Dashboard (`/finance`)
- `FinanceDashboardClient.tsx` — 8 KPI tiles, 4 inline-SVG charts (monthly trend, category
  donut, cash flow, top categories), quick actions, period/branch/account filters. Mirrors
  the CRM dashboard language.

### Added — Bank Book (`/finance/bank-book`)
- `BankBookClient.tsx` + `data.ts` + 9 components: `BankBalanceCard`, `BankFilters`,
  `BankTransactionTable` (search/sort/paginate/column-visibility/bulk reconcile),
  `BankTransactionDrawer`, `BankSummaryPanel`, `BankStatementUpload`, `BankImportPreviewTable`,
  `BankImportHistoryTable`, `BankImportWizard` (4-step CSV/XLS import with match suggestions).
- Bank↔source mapping: link a bank line to a Collection / Customer Advance / Expense; shown
  in table + drawer "Mapped To"; import preview suggests settlements by amount.

### Added — Cash Book (`/finance/cash-book`) — upgraded to Bank Book maturity
- `CashBookClient.tsx` + `data.ts` + 8 components: `CashBalanceCard` (re-exports Bank card),
  `CashFilters`, `CashTransactionTable`, `CashTransactionDrawer`, `CashSummaryPanel`,
  `CashReconciliationPanel` (physical-count vs system, variance, remarks), `CashTransferPanel`
  (Transfer From / Deposit To Bank), `CashVoucherPanel`. Customer-cost + employee-finance
  panels; accounting-ledger running balance.

### Added — Expense Register (`/finance/expenses`)
- `ExpenseRegisterClient.tsx` + `data.ts` + 11 components: `ExpenseSummaryCard`,
  `ExpenseFilters` (18 fields), `ExpenseTable` (bulk approve / generate vouchers / mark paid),
  `ExpenseForm` (sections A–G, dynamic by type), `ExpenseDetailsDrawer`,
  `ExpenseApprovalTimeline`, `ExpenseAttachmentViewer`, `GSTInputSection` (auto CGST/SGST/IGST),
  `VoucherPreviewPanel`, `CustomerExpensePanel` (profitability), `EmployeeClaimPanel` (advance).
- Standalone `/finance/expenses/new/ExpenseEntryForm.tsx` (full-page entry; superseded by the
  register's drawer form but kept).

### Added — Mobile finance screens
- `ExpenseClaimScreen.tsx` (bill photo placeholder, category chips, amount, submit) and
  `ConveyanceScreen.tsx` (customer/vehicle, start/end location placeholder capture, KM, claim
  calc — no Google API). Wired into `MobileApp.tsx`, `MeScreen.tsx` (Finance section), and the
  `QuickLogSheet` FAB. New `MIcon` glyphs: `camera`, `car`, `pin`, `route`, `rupee`.

### Added — cross-module + docs
- `src/app/finance/_shared/transferStore.ts` — module-level singleton so a Cash Book
  Bank↔Cash transfer posts the paired Bank Book entry (both books seed `mock + store`).
- `docs/modules/finance/BANK_LEDGER_MAPPING.md` — schema + service design for ledger
  persistence (source links, paired posting, reconciliation) — deferred to a DB phase.
- Rewrote `docs/modules/finance/UI_REQUIREMENTS.md` to the full 12-screen spec.

### Fixed
- **Bank↔Cash transfer not reflecting in Bank Book** — Cash Book transfer now creates both
  legs (cash + paired bank, cross-referenced) via the shared store.

### Changed
- **Filters moved to the top of all 3 finance pages, made collapsible** (collapsed by default,
  click the "Filters" bar to expand) with an active-filter count badge.

### Files Modified
- `src/lib/roles.ts`, `src/components/SidebarLinks.tsx`, `src/app/mobile/MobileApp.tsx`,
  `src/app/mobile/components/MIcon.tsx`, `src/app/mobile/screens/MeScreen.tsx`,
  `src/app/mobile/screens/QuickLogSheet.tsx`, `docs/modules/finance/UI_REQUIREMENTS.md`.
- New: everything under `src/app/finance/`, two mobile screens, `BANK_LEDGER_MAPPING.md`.

### Database Changes
- **None.** No schema, no migrations, no Prisma model changes this session.

### Config Changes
- **None.**

---

## [2026-06-02] — Finance Operations Module · Phase 1 (database) + mobile finance + docs

### Added
- **Finance Phase 1 — 10 Prisma models** (`prisma/schema.prisma`): `FinAccount`, `Ledger`,
  `Vendor`, `Expense`, `Voucher`, `VoucherSequence`, `EmployeeAdvance`, `TravelClaim`,
  `ApprovalRule`, `AuditLog`; + 9 back-reference relations on `Employee`.
- **Migration** `20260602120000_finance_operations_phase1` — generated **offline** via
  `prisma migrate diff` (no local MySQL): 10 tables, 15 FKs, all FK/filter columns indexed,
  `utf8mb4_unicode_ci`, `Float`→`DOUBLE`, `@db.Text` on long fields.
- **`prisma/seed.ts`** — finance config seed (1 cash + 1 bank `FinAccount`, `VoucherSequence`
  FY 26-27, default `ApprovalRule`); idempotent.
- **`prisma/seed-dev-users.ts`** (dev-only) — 7 employees across every role + reporting
  hierarchy, for `/login` quick-login testing.
- **`prisma/seed-dev-finance.ts`** (dev-only) — coherent sample finance data (2 vendors,
  expense → voucher `CI/26-27/00001` → ledger cash-out, advance, travel claim, audit log).
- **Mobile finance screens** (`5ba865a`): `src/app/mobile/screens/CollectionsScreen.tsx`,
  Leads|Opportunities segment in `PipelineScreen`, collections KPIs + overdue alert in
  `TodayScreen`, new `MIcon` glyphs (wallet/funnel/receipt/opp/bar-chart), Me-tab shortcuts.
- **Finance module docs** (`fbfa681`, `9ae9de2`) — `docs/modules/finance/` (10 files,
  approved 14-feature scope).

### Changed
- **`prisma.config.ts`** — added `migrations.seed = "npx tsx prisma/seed.ts"` (Prisma 7's
  seed location; `package.json`'s `prisma.seed` is ignored in v7).
- **`package.json`** — added `db:seed` script; removed the dead `prisma.seed` block.
- **`.env`** (local, gitignored) — `DATABASE_URL` repointed from stale SQLite to the Hostinger
  **dev** DB (`srv2201.hstgr.io` / `u686730471_caveodev`).
- Appended MySQL migration record + MySQL-compatible Prisma rules to `CLAUDE.md` +
  `docs/{PROJECT_MEMORY,ARCHITECTURE,DATABASE}.md` (`a047c2f`).

### Decisions
- Mapped the approved 9-module list to the **standard accounting pattern**: unified
  `FinAccount` + `Ledger` (instead of split Cash/Bank tables), plus new `AuditLog` and
  supporting `VoucherSequence`.
- Money kept as `Float`/`DOUBLE` (consistent with existing tables); `@db.Decimal(12,4)` deferred.
- Voucher numbering via a dedicated `VoucherSequence` row (atomic increment), format `CI/YY-YY/00001`.

### Verified on dev DB (`u686730471_caveodev`)
- `prisma migrate deploy` applied both migrations; `prisma db seed` ran (idempotent).
- All 10 finance tables + FKs present; relational create→read→delete round-trip passed.
- Dev server booted clean (Ready 10.4s, `/login` 200); quick-login user-switch + role gating
  worked (manager → `/`, Accounts → `/collections`); Prisma Studio browsed the data.

### Database Changes
- New migration `20260602120000_finance_operations_phase1` (10 tables). **Not yet applied to
  production** — will run via `prisma migrate deploy` on the next Hostinger build after push.

### Config Changes
- `prisma.config.ts` seed command; `package.json` scripts; local `.env` DB URL (gitignored).

### Files Modified
- `prisma/schema.prisma`, `prisma.config.ts`, `package.json` (modified)
- `prisma/migrations/20260602120000_finance_operations_phase1/migration.sql`,
  `prisma/seed.ts`, `prisma/seed-dev-users.ts`, `prisma/seed-dev-finance.ts` (new, uncommitted)

---

## 2026-06-02 — SQLite → MySQL/MariaDB migration
- **Migrated the live production database from SQLite to Hostinger MariaDB 11.8** with zero
  data loss (all 22 tables, row counts verified identical). Process:
  - Switched Prisma datasource `provider` to `mysql`; URL now lives in `prisma.config.ts`
    only (Prisma 7 forbids `url` in `schema.prisma`).
  - Added `@db.Text` to all long-text fields (KRA, WeeklyReview, DailyUpdate, CrmActivity,
    CrmNote, AppSetting.value, etc.) to avoid MySQL's `VARCHAR(191)` truncation.
  - Added 18 indexes on FK / filter columns (Payment.collectionId, Collection.employeeId,
    SalesFunnel.stage+status, CrmLead.assignedToId, etc.).
  - Replaced the SQLite adapter with `@prisma/adapter-mariadb` (+ `mariadb` driver). Prisma 7's
    `prisma-client` generator has no binary engine — a driver adapter is **mandatory**.
    `src/lib/prisma.ts` builds the adapter from `DATABASE_URL`.
  - Data copied on the server (better-sqlite3 read → `mysql` CLI load), AUTO_INCREMENT
    counters reset to `MAX(id)+1`, `_prisma_migrations` baselined so `migrate deploy` is a no-op.
  - Single baseline migration `prisma/migrations/20260601000000_init_mysql`; old SQLite
    migrations removed; `migration_lock.toml` provider → `mysql`.
- **Build-fix iterations (each a prod build failure → fix → rebuild):**
  - `7b26b2b` use `127.0.0.1` not `localhost` (TCP vs unix socket; grant covers `@127.0.0.1`).
  - `c39e45c` removed the 16 old SQLite migrations + set `migration_lock.toml` → `mysql`
    (Prisma refused the provider mismatch).
  - `50f4230` removed `src/middleware.ts` (maintenance gate I'd added) — Next 16 already has
    `src/proxy.ts` and the two cannot coexist.
  - `ec55aeb` switched `prisma.ts` to the `PrismaMariaDb` driver adapter (build was still on
    the old SQLite adapter import).
  - `7d6500a` **the hard one:** runtime `Access denied @127.0.0.1` — Hostinger/Passenger
    escapes `%`→`\%` in injected env, corrupting the URL-encoded password (`Crm%40…` →
    `Crm\%40…`). Diagnosed by reading `/proc/<pid>/environ`. `prisma.ts` now strips stray
    backslash-escapes before parsing `DATABASE_URL` (and accepts `DB_*` vars as override).
- **Verification:** build green; `/login`, `/api/auth/session` → 200; 0 `Access denied` / 0
  ERROR lines in runtime logs after the fix deployed.
- **⚠️ After the docs commit (`749f335`), production hit a CloudLinux LVE resource limit**
  (`fork: Resource temporarily unavailable`) — repeated rebuilds + `restart.txt` touches piled
  up `next-server` workers alongside a running build; SSH/SFTP could no longer start subsystems.
  Not data loss / not a code bug. Recovery = **hPanel → Node.js app → Restart** (next session).
- Files: `prisma/schema.prisma`, `prisma.config.ts`, `src/lib/prisma.ts`, `package.json`,
  `prisma/migrations/20260601000000_init_mysql/`, removed `src/middleware.ts`. Commits
  `59c34d5`→`749f335`.

## 2026-06-02 — earlier
- **Fix — Operations Head / Accounts access (root cause: stale JWT role).** Two production
  symptoms — Priyadharshini's Billing & Collections page empty (incl. no "Record Payment"
  button) and Deepak unable to see collections/payment tracker — traced to one cause: the
  old `auth.ts` only re-read `role` from the DB when `isManager` was undefined, so a
  Team-page role change never took effect on an existing session. Fixes (`1ab4f7d`):
  - `auth.ts`: **always** re-hydrate `isManager` + `role` from the DB on every token refresh.
  - `src/lib/roles.ts`: match Operations Head **flexibly** (case-insensitive contains) so
    `Operations Head`, `HR & Operations Head`, `Head of Operations` all qualify; Accounts
    matches any role containing `accounts`.
  - `Navbar.tsx`: re-fetch `role` fresh from the DB (was only fetching `isManager`); use the
    central `roles.ts` helpers instead of hardcoded string equality.
  - Verified: blank/stale role reproduces the empty page (0 rows, 0 buttons); correct role →
    all rows + buttons. Files: `auth.ts`, `src/lib/roles.ts`, `src/components/Navbar.tsx`.
- **docs:** Generated the permanent memory set — `CLAUDE.md` + `docs/{PROJECT_MEMORY,
  ARCHITECTURE,DATABASE,API,DESIGN_SYSTEM,BUSINESS_RULES,SECURITY_MODEL,UI_COMPONENT_LIBRARY,
  NEXT_SESSION,CHANGELOG}.md` — then refreshed at session end. (`ab49d81`)

## 2026-06-01
- Accounts collections visibility fix + **Operations Head** role & reporting hierarchy
  (`Employee.reportsTo`, `roles.ts`; manager-like finance reach without `isManager`). (`7d156b2`)
- Payment tracker: partial payments add to existing amount; fully-paid invoices hidden. (`c3ee10e`)
- Manager dashboard: "Pipeline by Stage" → "Collections Today". (`bee868c`)
- Employee dashboard card reorder. (`db07e85`)
- Daily collections widget on manager + sales-rep dashboards. (`b304d66`)
- Lead edit, meeting scheduling, POC/Demo presales assignment. (`c849411`)
- **Payments module:** ledger, advances, daily notifications (`Payment`/`OrderAdvance`/
  `Notification` + `src/lib/payments.ts`). (`0458034`)
- Business-card OCR lead capture in mobile (`/api/ocr/business-card`, `card-parser.ts`). (`3c79716`)
- Fixed dead mobile buttons; team views + call/meeting logging. (`ee56dfd`)

## 2026-05-31
- Mandatory **PO Date** for Closed Won + editable legacy deals (`SalesFunnel.poDate`). (`6194b5d`)
- **Customer Master** (`Customer` model) with CRM import + dedupe; auto-seed when empty. (`e1053de`, `26f4153`, `f37b5ff`)
- Legacy SalesFunnel deals rendered as opportunities in kanban + table; Closed Won totals fixed. (`459e5e0`, `60102f7`)
- **Dashboard period filter + clickable KPI tiles**, opportunity↔KRA merge, sidebar hydration fix. (`92a0979`)

## 2026-05-29
- **Admin panel** for configuration & rules: `AppSetting` (106 keys) + RBAC
  (`AppRole`/`RolePageAccess`); AdminClient (10 tabs) + RolesClient matrix. (`c47fc5d`)
- Customer-name autocomplete (`/api/customers/suggestions`, `CustomerNameCombobox`) +
  dev quick-login fix. (`6f97d11`)
- Mobile app + security hardening: signOut clears `dev_employee_id`, 8h JWT `maxAge`,
  ownership checks on `[id]` routes, API 401 JSON. (`03bc924`)

## 2026-05-27
- Printable user guide at `/user-guide.html`. (`84828ae`)
- Import `paymentReceivedDate` mapping + collections bulk delete. (`6385be7`)
- Sidebar layout + dashboard redesign with charts + team view. (`1c71016`)
- Bulk CSV/XLSX lead import. (`d651821`)
- **Pipeline module**: Lead Qualification & Opportunity funnel (`CrmLead`/`CrmOpportunity`/
  `CrmTask`/`CrmMeeting`/`CrmActivity`/`CrmNote`); legacy sheets folded into kanban/table.
  (`cf9eae9`, `666ab9b`, `d04e7fe`, `fbcc376`)

## 2026-05-26
- Payment received date, accounts dashboard, on-time collection KRA calc. (`aeebc38`)
- Forecast accuracy via weekly commits + certification tracking. (`e672c89`)
- Microsoft Entra ID auth + activity-sheets foundation (early migrations).

---
### Conventions
- One bullet per logical change; reference the short commit hash.
- Newest on top, grouped by date. Note new Prisma models/migrations and new `src/lib` modules.
- Keep "Current State" + "Next Actions" at the top current.
