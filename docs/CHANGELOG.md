# Changelog

Reverse-chronological log of notable changes. **Update at the end of every session.**
Dates from git history (branch `master`).

## Current State
- All core modules present on `master` / `sales.caveoinfosystems.com`: auth, pipeline,
  KRA engine + reviews/commits/certifications, collections + payments + advances +
  notifications, customer master, dashboards, admin panel, mobile app, bulk import, org hierarchy.
- **Database is MySQL/MariaDB 11.8** (driver adapter `@prisma/adapter-mariadb`) — migrated
  from SQLite 2026-06-02.
- **Mobile finance screens shipped** (`5ba865a`): mobile `CollectionsScreen`, Pipeline
  Leads|Opportunities segment, enriched Today dashboard with collections KPIs.
- **Finance module documentation** complete (`fbfa681`, `9ae9de2`) under `docs/modules/finance/`
  — approved 14-feature scope.
- **🆕 Finance Operations Module — Phase 1 (database) implemented + tested on a dev DB,
  UNCOMMITTED.** 10 new models, migration `20260602120000_finance_operations_phase1`, finance
  config seed + 2 dev-only seeds. No API/UI yet. See NEXT_SESSION.md.
- **Latest commit:** `9ae9de2` (finance docs). Working tree has the uncommitted Phase 1 DB work.
- **Prod note:** the LVE outage flagged during the migration session was not re-verified this
  session (all work was against a separate dev DB). Confirm `200` on `/login` before/after the
  next push. Pre-`1ab4f7d` JWTs still need one sign-out + in to pick up live role.

## Next Actions
1. **Decide: commit + push Finance Phase 1** (applies the migration to PROD on the next
   Hostinger build — confirm with Vijesh) **or** start Phase 2. Decide whether to track the
   `seed-dev-*.ts` helpers.
2. **Phase 2 — Vendor Master + Expense Register** (API + UI); pick cloud storage (R2/S3) for
   attachments; add `canManageFinance` to `roles.ts`. See `docs/modules/finance/IMPLEMENTATION_PLAN.md`.
3. Wrap `recordPayment`/`applyAdvance` in `prisma.$transaction`; apply `@db.Decimal(12,4)` to
   money fields; remove `better-sqlite3` deps.
4. **Rotate** the dev DB password shared in chat; remove the Remote-MySQL IP/`%` entry after
   testing. Confirm prod `/login` 200.
5. Decide authoritative RBAC path + enforce `RolePageAccess`; wire Topbar search; mitigate
   `xlsx@0.18.5`; remove orphaned `public/maintenance.html`.

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
