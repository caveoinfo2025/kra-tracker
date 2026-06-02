# Project Memory — Caveo CRM (kra-tracker)

> Single source of truth for what this project IS and where it stands.
> Read this first, then ARCHITECTURE → DATABASE → API → DESIGN_SYSTEM → CHANGELOG.

## 1. Project Purpose
Internal **Sales CRM + KRA performance tracker** for **Caveo Infosystems** (an IT
infrastructure / security solutions reseller). It gives the sales team and management:
- A **pipeline** of leads → opportunities (kanban + table).
- **Activity sheets** (lead generation, sales funnel, collections, daily updates) that
  **auto-compute weekly KRA progress** — no manual scoring.
- A **finance module**: invoices/collections, a payment ledger, order advances, and
  in-app notifications.
- **Manager & employee dashboards**, a **customer master**, an **admin config panel**,
  and a **mobile web app** (incl. business-card OCR lead capture).

- **Repo:** `github.com/caveoinfo2025/kra-tracker` (branch `master`)
- **Production:** `https://sales.caveoinfosystems.com` (Hostinger, Passenger-managed Node + reverse proxy)
- **Local dev:** `http://localhost:3000`
- **Database:** **MySQL / MariaDB 11.8** (migrated from SQLite 2026-06-02).

## 0. Current status (2026-06-02, end of session)
- **Database is MySQL/MariaDB 11.8** (migration from SQLite complete + verified earlier).
- **🆕 Finance Operations Module — Phase 1 (database layer) is implemented and tested on a
  dev database, but UNCOMMITTED.** 10 new Prisma models, migration
  `20260602120000_finance_operations_phase1`, finance config seed + 2 dev-only seeds. No API
  or UI yet (Phase 2+). Verified against the Hostinger **dev** DB `u686730471_caveodev`
  (migrate + seed + FK round-trip + dev quick-login + Prisma Studio all passed).
- **Mobile finance screens shipped this session** (`5ba865a`): mobile `CollectionsScreen`,
  Pipeline Leads|Opportunities segment, collections KPIs on the Today dashboard.
- **Decision to make next session:** commit + push Phase 1 (applies the migration to
  PRODUCTION on the next Hostinger build — confirm with Vijesh) vs. start Phase 2.
- **Prod note:** the LVE outage flagged during the migration session was NOT re-verified this
  session (all work used a separate dev DB). Confirm `200` on `/login` around the next push.

## 2. Roles (Employee.role + isManager)
| Role | Access summary |
|---|---|
| **Head of Sales** | `isManager=true`. Full access, team dashboards, admin panel. (Vijesh, id 4) |
| **Business Development Manager** | Senior sales — full pipeline + analytics, team view. |
| **BDE / Inside Sales / ISR** | Standard rep — own leads, pipeline, collections, daily updates. |
| **Sales Coordinator** | Tasks, collections, daily updates; read-only leads. |
| **Accounts** | Finance — all collections + payment tracker; no pipeline. |
| **Operations Head** | Above Accounts; **manager-like finance reach WITHOUT `isManager`** (`src/lib/roles.ts`). |

## 3. Completed Features
- **Database on MySQL/MariaDB** — migrated from SQLite (2026-06-02). Prisma uses the
  `@prisma/adapter-mariadb` driver adapter; `provider="mysql"`; long-text columns use
  `@db.Text`; 18 indexes added on FK/filter columns; single baseline migration
  `20260601000000_init_mysql`. See DATABASE.md and the CHANGELOG entry for the full process.
- **Auth** — Microsoft Entra ID (Azure AD) via NextAuth v5; 8h JWT sessions; dev
  impersonation via `dev_employee_id` cookie + DevBar; dev quick-login on `/login`.
  Edge auth runs in **`src/proxy.ts`** (Next.js 16 middleware replacement).
- **Pipeline module** — `CrmLead → CrmOpportunity` funnel, tasks, meetings, notes,
  activity feed, kanban + table; legacy Sales Funnel/Activity folded in.
- **KRA engine** — title-based auto-computation of progress/score from activity sheets
  (`src/lib/kra-engine.ts`); weekly reviews; weekly commits; forecast accuracy;
  certification tracking.
- **Collections & Finance** — invoices, partial payments that add to existing amount,
  payment ledger (`Payment`), order advances (`OrderAdvance`) with apply-to-invoice,
  daily collections widgets, in-app notifications fanned out to rep + managers.
- **Customer Master** — `Customer` table with HO/Branch hierarchy, CRM import + dedupe,
  auto-seed when empty; customer-name autocomplete across all CRM sources.
- **Dashboards** — manager + employee variants; period filter (Today/Week/Month/Quarter);
  clickable KPI tiles linking to detail pages; charts.
- **Admin panel** (`/admin`, manager-only) — Settings (106 config keys, `AppSetting`) +
  Roles & Access matrix (`AppRole`/`RolePageAccess`). Data-free; config/rules only.
- **Mobile app** (`/mobile`) — 13 screens incl. business-card OCR (`/api/ocr/business-card`),
  team views, quick activity/call/meeting logging, and a read-only **Collections** screen +
  Pipeline **Leads|Opportunities** segment + collections KPIs on the Today dashboard (`5ba865a`).
- **Finance Operations Module — Phase 1 (database only)** *(implemented, tested on dev,
  UNCOMMITTED)* — 10 models (`FinAccount`, `Ledger`, `Vendor`, `Expense`, `Voucher`,
  `VoucherSequence`, `EmployeeAdvance`, `TravelClaim`, `ApprovalRule`, `AuditLog`), migration
  `20260602120000_finance_operations_phase1`, finance config seed. Full spec in
  `docs/modules/finance/`. No API/UI yet.
- **Bulk import** — CSV/XLSX lead import; printable employee user guide at `/user-guide.html`.
- **Org hierarchy** — `Employee.reportsTo` self-relation; Operations Head role with
  manager-like finance reach; editable `Reports To` + `Manager access` on the Team page.
- **Live role hydration** — `auth.ts` re-reads `isManager`+`role` from the DB on every
  token refresh, and `roles.ts` matches the Operations Head role flexibly, so Team-page
  role changes apply without code edits (and, after one re-login, without sign-out).
- **Security hardening** — ownership checks on `[id]` routes, API returns 401 JSON,
  signOut clears the dev cookie, mandatory PO date for Closed Won.

## 4. Pending / Backlog
> Confirm with the user before assuming priority — this is inferred from gaps, not a committed roadmap.
- **Consolidate the two RBAC systems** (`rbac.ts` DB matrix vs `roles.ts` predicates) so
  there is one authoritative gate.
- **Enforce `RolePageAccess` at the route/page layer** — the matrix is editable in admin
  but most routes still gate on `isManager`/role predicates, not `hasPermission()`.
- **Topbar global search** — wire the search box to actual results (currently cosmetic on
  most pages).
- **`xlsx` advisory** — migrate off the vulnerable `xlsx@0.18.5` or sandbox imports.
- **Notifications UI** — surface the `Notification` feed more prominently on desktop.
- **Money precision** — apply `@db.Decimal(12,4)` to `*Lakhs`/value fields (now feasible on
  MySQL) so finance totals are exact rather than `DOUBLE`.
- **Centralize auth in `proxy.ts`** — the edge proxy already gates routes; consider trusting
  it as the single boundary and trimming duplicate per-page `getSession()` redirects (keep
  ownership checks). Also fix the stale "src/middleware.ts" comment in `auth.config.ts`.

## 4b. In-progress / Decisions this session
- **IN PROGRESS — Finance Operations Module, Phase 1 (database only).** Implemented + tested
  on the dev DB; **uncommitted**. Working tree: `M schema.prisma, prisma.config.ts, package.json`
  and new `prisma/migrations/20260602120000_finance_operations_phase1/`, `prisma/seed.ts`,
  `prisma/seed-dev-users.ts`, `prisma/seed-dev-finance.ts`.
- **10 new models:** `FinAccount` (cash+bank), `Ledger`, `Vendor`, `Expense`, `Voucher`,
  `VoucherSequence`, `EmployeeAdvance`, `TravelClaim`, `ApprovalRule`, `AuditLog`.
- **Key decisions (2026-06-02 — Finance Phase 1):**
  - Mapped the approved 9-module list to the **standard accounting pattern**: unified
    `FinAccount` + `Ledger` (NOT the doc's split Cash/Bank tables); added `AuditLog` (new) and
    `VoucherSequence` (atomic voucher numbering, `CI/YY-YY/00001`).
  - Money kept as `Float`/`DOUBLE` (consistent with existing tables; `Decimal` deferred).
  - Migration **generated offline** (`prisma migrate diff`) because no local MySQL exists.
  - Local dev now uses the **remote Hostinger dev DB** (`srv2201.hstgr.io`/`u686730471_caveodev`);
    seed command moved to `prisma.config.ts` `migrations.seed` (Prisma 7 location).
  - `seed.ts` is **prod-safe** (config only, no PII); the two `seed-dev-*.ts` are dev-only.
- **Key decisions (2026-06-02 — DB migration):**
  - **Migrated to MySQL/MariaDB** (Hostinger-provided) rather than PostgreSQL — it's what the
    Hostinger plan offers and required no new infra.
  - Used the **`@prisma/adapter-mariadb` driver adapter** (mandatory: Prisma 7's
    `prisma-client` generator ships no query engine). Connection config is built in
    `src/lib/prisma.ts` from `DATABASE_URL`.
  - **Kept `Float` (→ MySQL `DOUBLE`) for money** instead of converting to `Decimal`, to
    avoid a ~35-file `Prisma.Decimal` refactor. `@db.Decimal(12,4)` is the recommended future
    fix (deferred debt).
  - Added **`@db.Text`** to all long-text fields (avoids MySQL's silent `VARCHAR(191)`
    truncation) and **18 indexes** on FK/filter columns.
  - **Data migrated in place on the server** (better-sqlite3 read → `mysql` CLI load),
    AUTO_INCREMENT counters reset to `MAX(id)+1`, `_prisma_migrations` baselined so
    `migrate deploy` is a no-op. Old SQLite migrations removed; one MySQL baseline kept.
  - Worked around three deploy gotchas: **`127.0.0.1` not `localhost`** (TCP vs socket);
    **Passenger `%`→`\%` env escaping** (stripped in `prisma.ts`); **`middleware.ts` ⨯
    `proxy.ts`** conflict in Next 16 (removed my maintenance `middleware.ts`).
- **Earlier decisions (2026-06-01) — still in force:**
  - Operations Head gets **manager-like finance reach via `roles.ts` predicates**, NOT the
    `isManager` flag (keeps "manager" meaning sales-management).
  - Role matching is **flexible/substring** (`isOperationsHead`, `isAccounts`) so free-text
    role names entered on the Team page ("HR & Operations Head", etc.) still gate correctly.
  - `auth.ts` re-hydrates role/isManager on **every** refresh (was: only when undefined).
  - Reporting hierarchy stored as `Employee.reportsToId` (data), not just role-based access.
  - Partial payments preserved via an **"Opening Balance"** synthetic ledger entry rather
    than schema change, so already-imported invoices reconcile on first new payment.

## 5. Known Issues / Watch-list
1. **🔴 Production outage (LVE resource limit) — ACTIVE.** Site returns 503/500;
   `bash: fork: Resource temporarily unavailable` on the account. Caused by piled-up
   `next-server` workers + a concurrent rebuild exceeding the CloudLinux per-account
   process/memory cap. **Fix: hPanel → Node.js app → Restart** (clears workers). Avoid
   rapid-fire rebuilds/`restart.txt` touches in future. Not data loss; DB + code intact.
2. **Auth is via `src/proxy.ts`** (Next 16 edge middleware), and the `authorized` callback
   IS live (redirects pages, 401s APIs). *Correction:* older docs called this dead code.
   A `middleware.ts` cannot coexist with `proxy.ts`. Pages/routes also call `getSession()`.
   Note: `auth.config.ts`'s header comment still says "Used by src/middleware.ts" (stale).
3. **Money still `Float` (MySQL `DOUBLE`)** — `round2()` tolerance masks float drift.
   Recommended fix: `@db.Decimal(12,4)` on all `*Lakhs`/value fields (deferred — needs no
   code change with native-type override, but verify aggregations).
4. **Orphaned `public/maintenance.html`** — the maintenance-mode `middleware.ts` that used
   it was removed (Next 16 conflict). Either wire a maintenance gate into `proxy.ts` or
   delete the file. (Tracked in git.)
5. **Leftover SQLite deps** — `better-sqlite3` + `@types/better-sqlite3` remain in
   `package.json` (only used by the now-deleted migration script). Safe to remove.
6. **Stale-JWT re-login (technical debt).** Role/manager changes apply live going forward,
   but any session whose token predates `1ab4f7d` still carries the old role until that user
   signs out + in once. Affected: verify Priyadharshini + Deepak after a fresh login.
7. **Dual RBAC** — `hasPermission()` (DB) and `roles.ts` predicates can disagree.
8. **`xlsx@0.18.5`** — HIGH-severity advisory, no upstream fix.
9. **Dev vs prod type-checking gap** — Turbopack dev mode does NOT type-check the whole
   project; `next build` (and Hostinger) does. Always `next build` before pushing. A type
   error inside `.next/dev/types/*` usually means a stale cache → `rm -rf .next` and rebuild.
10. **Local credential files (security):** untracked `scripts/_tmp_ssh.mjs` and
    `scripts/_tmp_sftp.mjs` contain plaintext SSH creds — **delete them**. SSH + MySQL
    passwords were shared in chat → **rotate them**. Keep the server `db/prod.db` SQLite
    backup ~2 weeks as rollback.
11. Loose root scripts (`seed.js`, `setup_manager.*`, `fix_roles.js`, `read_xls.js`) are
    one-off utilities, not part of the build.
12. Turbopack caches the Prisma client — always restart dev after `prisma generate`.

## 6. Business Rules
- **Money** is in ₹ Lakhs everywhere (1 Cr = 100 L).
- **KRA progress is never entered manually** — it is computed from the activity sheets by
  the KRA engine, dispatched on KRA **title** keywords (e.g. "sales revenue",
  "customer & business", "sales management", "focus area", "sales operations").
- **Closed Won** (`SalesFunnel.stage="Closed Won"`) **requires a `poDate`**; `closedDate`
  mirrors `poDate`.
- **Collections:** `amountReceivedLakhs`/`collectionStatus`/`paymentReceivedDate` are
  cached and re-derived from the `Payment` ledger by `syncCollectionTotals()`. Partial
  payments ADD (opening-balance reconciliation prevents overwrite). Fully-paid invoices
  are hidden from the open list. Status: `Pending → Partially Received → Fully Received`.
- **Order advances** start `unapplied`; applying one creates a Payment and flips it to
  `applied`.
- **Ownership:** non-managers see/edit only their own `employeeId` rows; managers and
  finance roles (Accounts, Operations Head) see all collections/payments.
- **A payment notification** fans out to the invoice's sales rep + every manager.
- **Customer master** dedupes names case-insensitively across leads/collections/funnel/leadgen.

## 7. Workflows
- **Dev cycle:** edit → verify on dev server (`localhost:3000`) → **confirm with user** →
  commit → push to `master` (Hostinger deploys on push/rebuild).
- **Schema change:** edit `schema.prisma` → `npx prisma migrate dev --name <x>` against a
  **MySQL/MariaDB** dev DB (set `DATABASE_URL` in `prisma.config.ts`/env) → `npx prisma
  generate` → **restart dev server**. (SQLite `file:` URLs no longer match `provider=mysql`.)
- **Dev impersonation:** use the DevBar (or `/login` quick-login) to switch employee;
  sets the `dev_employee_id` cookie consumed by `getSession()`.
- **Session end:** update this file + `CHANGELOG.md`.
- **Golden rules (CLAUDE.md):** never delete features / rewrite working code / reset DB /
  change UI standards. Reuse components, preserve logic, update docs.

## 8. Technical Debt
- **Finance Phase 1 is uncommitted** — commit/push deferred to a deliberate confirmed step
  (the build auto-applies the migration to prod). Decide whether to track `seed-dev-*.ts`.
- **`recordPayment`/`applyAdvance` lack `prisma.$transaction`** — wrap before high concurrency
  (MySQL has real concurrent writes now). The new finance services in Phase 2 must use
  `$transaction` from day one (balance updates, voucher numbering).
- **Money is `Float`/`DOUBLE`** across both finance modules — `@db.Decimal(12,4)` deferred.
- **Cached balances** (`FinAccount.currentBalance`, `EmployeeAdvance.balanceLakhs`) have no
  service guard yet (no API in Phase 1) — Phase 2 must only mutate them via a service fn.
- **Dev DB password shared in chat** (`Caveo@2026`) — rotate after testing; remove the
  Remote-MySQL IP/`%` whitelist entry in hPanel.
- Carryover: dual RBAC (`rbac.ts` vs `roles.ts`); `xlsx@0.18.5` advisory; remove
  `better-sqlite3` deps; orphaned `public/maintenance.html`; pre-`1ab4f7d` JWT re-login.

## 9. Recommended Next Steps (ordered)
1. **Confirm + commit + push Finance Phase 1** (after Vijesh's OK); verify the prod migration
   applied (`prisma migrate status` on the server) and `/login` returns 200.
2. **Phase 2 — Vendor Master + Expense Register** (API + UI): choose cloud storage (Cloudflare
   R2 / S3) for attachments; add `canManageFinance` predicate to `roles.ts`; build CRUD +
   submit-for-approval. See `docs/modules/finance/IMPLEMENTATION_PLAN.md` Phase 2.
3. **Phase 3 — Approval Engine** wired to `ApprovalRule` + `AuditLog`, with notifications.
4. Wrap existing `recordPayment`/`applyAdvance` in `$transaction`; then tackle the
   `@db.Decimal(12,4)` money migration across both finance modules.
5. Rotate the dev DB credentials and prune the Remote-MySQL whitelist.

---

## 8. Database Migration Record (append-only)

### SQLite → MySQL — completed 2026-06-02
| Item | Detail |
|---|---|
| **From** | SQLite (`file:./dev.db`) via `@prisma/adapter-better-sqlite3` |
| **To** | MySQL-compatible MariaDB 11.8 on Hostinger via `@prisma/adapter-mariadb` |
| **Status** | ✅ Complete — all 22 tables migrated, row counts verified identical |
| **Baseline migration** | `prisma/migrations/20260601000000_init_mysql` |
| **Provider** | `mysql` in `schema.prisma` |

SQLite is no longer referenced or used anywhere in the codebase. All local development
and production deployments now require a MySQL/MariaDB instance.

### Current canonical stack
```
Next.js (App Router)   — framework
Prisma 7               — ORM, driver-adapter mode (no binary query engine)
MySQL 8 / MariaDB 11.8 — database (MySQL-compatible)
@prisma/adapter-mariadb — driver adapter (mandatory with Prisma 7 prisma-client generator)
mariadb (npm)          — underlying Node.js driver
```

### Mandatory rules for all future Prisma modules
- `provider = "mysql"` — no exceptions.
- All `String` fields that hold free-form content → `@db.Text`.
- Every FK column and hot-filter column → `@@index(...)`.
- Datasource `url` lives in `prisma.config.ts` only (Prisma 7 rule).
- Multi-write operations → `prisma.$transaction`.
- Use `127.0.0.1` (not `localhost`) in `DATABASE_URL` for TCP connection.
