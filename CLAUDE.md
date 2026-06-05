# Claude Code Permanent Memory

You are the AI development partner for **Caveo CRM** (`kra-tracker`).

## Before any coding task
1. Read this file.
2. Load every file in `/docs`.
3. Understand the existing architecture before writing code.
4. Continue from the current implementation — never rebuild completed modules.

### Required context files (always read)
- `docs/PROJECT_MEMORY.md` — purpose, features (done/pending), known issues, business rules, workflows
- `docs/ARCHITECTURE.md` — stack, folder structure, components, services, auth flow
- `docs/DATABASE.md` — Prisma schema, models, relationships, migrations, rules
- `docs/API.md` — endpoints, request/response shapes, validation
- `docs/DESIGN_SYSTEM.md` — colors, components, layouts, styling rules
- `docs/CHANGELOG.md` — history, current state, next actions

## Project at a glance
Internal **Sales CRM + KRA performance tracker** for **Caveo Infosystems** (IT
infrastructure / security reseller). Tracks leads, opportunities, billing/collections,
daily updates, weekly KRAs, payments, customer master, and a mobile app.

- **Repo:** `github.com/caveoinfo2025/kra-tracker` · branch `master`
- **Production:** `https://sales.caveoinfosystems.com` (Hostinger)
- **Local:** `http://localhost:3000` (`npm run dev`)

## Technology stack
Next.js 16.2.6 (App Router, Turbopack) · React 19.2 · TypeScript 5 · Prisma 7.8 ·
**MySQL / MariaDB 11.8** (`@prisma/adapter-mariadb` + `mariadb` driver) · NextAuth v5
(Microsoft Entra ID, JWT) · Tailwind v4 + custom `globals.css` tokens · Recharts ·
lucide-react · Playwright.

> **DB migrated SQLite → MariaDB on 2026-06-02.** Prisma 7's `prisma-client` generator has
> NO query engine, so a **driver adapter is mandatory** — `src/lib/prisma.ts` builds
> `PrismaMariaDb` from `DATABASE_URL`. `provider = "mysql"` in `schema.prisma`; the `url`
> lives in `prisma.config.ts` only (Prisma 7 forbids `url` in the schema). Local dev now
> needs a MySQL/MariaDB instance too (the old `file:./dev.db` SQLite no longer matches the
> provider).

## Development rules
**Before coding:** analyze existing files, understand current structure, explain
planned changes, modify only required files.

**Never:**
- ❌ Delete existing features
- ❌ Rewrite working code
- ❌ Reset the database
- ❌ Change UI standards / design tokens

**Always:**
- ✔ Preserve existing logic
- ✔ Reuse components
- ✔ Follow the architecture in `/docs`
- ✔ Update documentation
- ✔ **Confirm before pushing to production**

## Critical gotchas (read before touching code)
1. **Auth runs in `src/proxy.ts`** (Next.js 16's edge-middleware replacement, commit
   `d6293d1`). It runs `authConfig.auth` so the **`authorized` callback in `auth.config.ts`
   IS live** — it redirects unauthenticated page routes to `/login` and returns `401 JSON`
   for `/api/*`. (This supersedes the old "no middleware / dead callback" note.) `proxy.ts`
   and a `middleware.ts` **cannot coexist** in Next 16 — adding `middleware.ts` breaks the
   build. Belt-and-suspenders: pages/routes STILL call `getSession()` themselves too.
2. **Use `getSession()` (`src/lib/dev-session.ts`), not `auth()` directly** — it powers
   dev impersonation (the `dev_employee_id` cookie + DevBar).
3. **MySQL connection: use `127.0.0.1`, NOT `localhost`** — the `mariadb` driver maps
   `localhost` to a unix socket (times out). Also, **Hostinger/Passenger escapes `%`→`\%`**
   when injecting env vars, corrupting a URL-encoded DB password; `prisma.ts` strips stray
   backslash-escapes from `DATABASE_URL` before parsing. `contains` is case-insensitive
   under the `utf8mb4_unicode_ci` collation (no `mode:"insensitive"` needed).
4. **After schema changes:** `npx prisma migrate dev --name <x>` against a **MySQL** dev DB
   → `npx prisma generate` → **restart the dev server** (Turbopack caches the old Prisma
   client and returns 500s otherwise). Prisma client is generated to `src/generated/prisma`.
5. **Money is stored in ₹ Lakhs** (Float → MySQL `DOUBLE`). 1 Cr = 100 L. Use
   `fmt`/`fmtShort`. (Deferred debt: `@db.Decimal(12,4)` for exactness — not yet applied.)
6. **Two authorization systems coexist:** DB-driven `AppRole`/`RolePageAccess`
   (`hasPermission` in `src/lib/rbac.ts`) AND hardcoded predicates in `src/lib/roles.ts`.
   Check which governs a given gate before changing it.
7. **`xlsx@0.18.5`** has a HIGH-severity advisory with no upstream fix (import feature).
8. **Prod restart / env:** Hostinger Node app is Passenger-managed —
   `touch …/nodejs/tmp/restart.txt` to restart; env lives in
   `…/public_html/.builds/config/.env`; server Node at `/opt/alt/alt-nodejs22/root/usr/bin`.
   Repeated rebuilds/restarts can pile up `next-server` workers and hit the CloudLinux LVE
   limit (`bash: fork: Resource temporarily unavailable`) → recover via hPanel → Restart app.
9. **PWA service worker caches stale assets in dev (`caveo-crm-v1`).** The `/mobile` PWA
   registers a service worker (`src/app/mobile/ServiceWorkerRegistrar.tsx`) that caches the
   app shell for the whole origin. During dev it will serve **old JS chunks even after you
   edit files, clear `.next`, and restart the server** — symptom: "my change isn't showing."
   Fix: in DevTools console run
   `navigator.serviceWorker.getRegistrations().then(r=>r.forEach(x=>x.unregister()));`
   `caches.keys().then(k=>k.forEach(x=>caches.delete(x)));` then hard-reload. (TODO: make the
   registrar skip dev or go network-first.)
10. **Turbopack only hot-reloads EDITS, not newly-CREATED sibling files.** After adding a new
    `.tsx`/`.ts` file, the dev server may report `Module not found` for it until you **restart
    the dev server**. Editing an existing file is fine. Also: stray orphaned `next dev`
    processes can hold port 3000 and serve old code — kill all `node`/`next dev` before a clean start.
11. **`.next/dev/types/*` TS errors are stale-cache noise.** If `npx tsc --noEmit` reports
    errors only inside `.next/dev/types/`, delete `.next` and re-run — your source is fine.

## Session-ending rule
Before ending every session, update:
- `docs/PROJECT_MEMORY.md` (status, pending, issues)
- `docs/CHANGELOG.md` (what changed + next actions)

# userEmail
vijesh@caveoinfosystems.com

---

## Database — canonical facts (append-only, do not remove)

### Migration: SQLite → MySQL (completed 2026-06-02)
The project database was migrated from SQLite (file-based, dev-only) to **MySQL-compatible
MariaDB 11.8** hosted on Hostinger. This is a permanent, irreversible change. SQLite is
no longer used anywhere in the project.

### Current stack (authoritative)
| Layer | Technology |
|---|---|
| **Framework** | Next.js (App Router) |
| **ORM** | Prisma 7 (driver-adapter mode — `@prisma/adapter-mariadb`) |
| **Database** | MySQL 8-compatible · MariaDB 11.8 on Hostinger |

### MySQL-compatible Prisma design rules (mandatory for all future modules)
Every new Prisma model, migration, or query must follow these rules:

1. **`provider = "mysql"`** in `schema.prisma` — never revert to `sqlite` or `postgresql`.
2. **No `url` in `schema.prisma`** (Prisma 7 forbids it) — keep the datasource URL in
   `prisma.config.ts` only.
3. **Long text fields → `@db.Text`** — MySQL defaults `String` to `VARCHAR(191)`; any field
   that can hold free-form text, notes, JSON blobs, or long descriptions must carry `@db.Text`.
4. **Add `@@index` on every FK and hot-filter column** — MySQL does not auto-index foreign
   keys the way SQLite did; missing indexes silently cause full-table scans.
5. **Money fields** — use `Float` (→ `DOUBLE`) for now; the planned upgrade is
   `@db.Decimal(12,4)`. Do NOT use plain `Int` or `String` for currency.
6. **`contains` is case-insensitive** under `utf8mb4_unicode_ci`; omit `mode:"insensitive"`.
7. **`prisma migrate dev`** requires a live MySQL/MariaDB connection (`DATABASE_URL` must
   point at `127.0.0.1`, not `localhost` — the `mariadb` driver maps `localhost` to a unix
   socket). Never run migrations against a SQLite file URL.
8. **Concurrent writes** — wrap multi-step finance writes (`recordPayment`, `applyAdvance`)
   in `prisma.$transaction` before any high-concurrency deployment.

---

## Finance Operations Module — Phase 1 (database only, 2026-06-02)

Phase 1 (DB layer) is **implemented and tested on a dev database — NOT yet committed/pushed.**
No API or UI yet (that's Phase 2+). Spec lives in `docs/modules/finance/`.

**10 new Prisma models** (`prisma/schema.prisma`):
`FinAccount` (chart of accounts: cash+bank) · `Ledger` (general ledger entries) · `Vendor` ·
`Expense` · `Voucher` (+ `VoucherSequence` for atomic `CI/YY-YY/00001` numbering) ·
`EmployeeAdvance` · `TravelClaim` (local conveyance, GPS-aware) · `ApprovalRule` · `AuditLog`.
Plus 9 back-reference relations on `Employee`.

**Migration:** `prisma/migrations/20260602120000_finance_operations_phase1/` — generated
**offline** via `prisma migrate diff` (no local MySQL), 10 tables, 15 FKs, all indexed.

**Seeds (`prisma/`):**
- `seed.ts` — finance **config** (cash+bank account, VoucherSequence FY 26-27, default
  ApprovalRule). Wired into `prisma db seed` via `prisma.config.ts` `migrations.seed`
  (Prisma 7 location — NOT `package.json`, whose `prisma.seed` key is ignored in v7).
- `seed-dev-users.ts` — **dev-only**, 7 employees across every role for quick-login testing.
- `seed-dev-finance.ts` — **dev-only**, sample finance rows. Run via `npx tsx prisma/seed-*.ts`.

**Module → model mapping decision:** the approved 9-module list ("Account, Ledger, Expense,
Vendor, Voucher, EmployeeAdvance, TravelClaim, ApprovalRule, AuditLog") was mapped to the
standard accounting pattern — **unified `FinAccount` + `Ledger`** (not the doc's split
Cash/Bank tables), plus `AuditLog` (new) and `VoucherSequence` (supporting).

### Local dev now uses a Hostinger DEV database
- `.env` `DATABASE_URL` → `srv2201.hstgr.io` / `u686730471_caveodev` (remote MySQL, IP
  whitelisted in hPanel → Remote MySQL). For **remote** dev the host is the server hostname,
  **not** `127.0.0.1` (that rule is only for the app running *on* the server). `.env` is gitignored.
- **Prisma 7 does NOT auto-load `.env`** (a `prisma.config.ts` exists). For CLI commands set
  the var inline: `$env:DATABASE_URL="mysql://…"; npx prisma migrate deploy`. The Next.js dev
  server *does* auto-load `.env`.
- Dev quick-login: `/login` → "Select an employee to log in as" (lists the 7 seeded users).

---

## Finance Operations Module — Phase 2 UI (2026-06-03, UI-only, UNCOMMITTED)

Phase 2 **UI** is built end-to-end on **mock data** — **no API routes, no schema/migration
changes** this session. Lives under `src/app/finance/`. Each module has its own `data.ts`
(types + mock + helpers + `deriveCaps`). **Money is shown in ₹ rupees in the finance web
pages** (Cash/Bank/Expense) — distinct from the app-wide ₹ Lakhs; normalise when wiring the
backend.

- **Pages:** `/finance` (Dashboard), `/finance/bank-book`, `/finance/cash-book`,
  `/finance/expenses` (+`/new`, `/categories`), `/finance/vendors`, `/finance/claims`,
  `/finance/advances`, `/finance/conveyance`, `/finance/approvals`, `/finance/vouchers`,
  `/finance/reports`. Mobile: `ExpenseClaimScreen`, `ConveyanceScreen`.
- **RBAC:** finance pages gate on `canManageFinance` (except own-data pages); per-tier
  capabilities derive in each `data.ts` (`deriveCaps`/`deriveExpenseCaps`) → Accounts Admin
  (Ops Head), Accounts Team (Accounts), Manager, Employee/Branch User.
- **Reuse:** Cash Book and Expense Register re-use Bank Book helpers/components (e.g.
  `CashBalanceCard` re-exports `BankBalanceCard`). Keep the two books visually identical.
- **Cross-module store:** `src/app/finance/_shared/transferStore.ts` makes Bank↔Cash
  transfers post both legs; in-memory, persists only across client-side nav (resets on hard
  reload). Real persistence design: `docs/modules/finance/BANK_LEDGER_MAPPING.md`.
- **When wiring the backend:** the screens define the exact data shapes in `data.ts`; build
  CRUD/services to match, follow the MySQL Prisma rules above, and replace the mock arrays.

---

## Global Masters + Expense Categories — UI (2026-06-04, UI-only, UNCOMMITTED)

Three enterprise UI modules added — **all mock data, no API routes, no schema/migration changes.**
`npx tsc --noEmit` clean; pages verified `200`.

- **Expense Categories** (`src/app/finance/expenses/categories/`, 8 files) — a
  **configuration-driven category engine** (`data.ts` + `ExpenseCategoriesClient` +
  `CategoryTable/Filters/Form/Drawer/TemplateLoader`). `CategoryForm` = 9 config sections
  (Basic, Usage, Payment modes, Document rules, GST, Approval, Grade-policy, Customer-cost, Tally).
- **Global Vendor Master** (`src/app/masters/vendors/`, 14 files) — one `Vendor` for Finance/
  Expense/Procurement/Inventory/Projects/Support/Assets/Tally. `data.ts` holds the **canonical
  `validateGSTIN` + Indian GST state-code map** (reused by Customer Master). Components incl.
  `VendorProfile` (9-tab), multi-branch+GST, contacts, banks, docs, and the reusable
  **`GSTRegistrationPanel`/`GSTINBadge`**. `/finance/vendors` **redirects** to `/masters/vendors`.
- **Global Customer Master** (`src/app/masters/customers/`, 16 files) — one `Customer` for CRM
  Sales/Opps/Quotations/Orders/Projects/Support/AMC/Assets/Finance/Profitability/Engineer-Visits/
  Conveyance. Hierarchy, multi-site (per-site GST + geo), contacts, commercial, assets,
  profitability, 12-tab profile, duplicate detection. **EXTENDS the existing `Customer` model —
  never duplicate it.** The legacy operational `/customers` page (live CRM import + dedupe) is
  **preserved and unchanged**.

**Rules for these modules:**
- **Masters are GLOBAL** — one record referenced by every module via a common ID. Do NOT create
  per-module vendor/customer tables. Backend wiring extends the existing `Vendor`/`Customer`
  models (+ child tables), it does not add parallel models.
- **Reuse, don't duplicate** — Customer Master imports the GST validator/panel/badge from
  `masters/vendors`; both masters reuse `finance/expenses/components/ExpenseSummaryCard`.
- **RBAC is client-side only** for now (`deriveCatCaps`/`deriveVendorCaps`/`deriveCustomerCaps`
  in each `data.ts`) — enforce server-side when CRUD APIs are built.
- New sidebar **Masters** section (Customer Master + Vendor Master) in `SidebarLinks.tsx`. There
  are currently **two "Customer Master" entries** (global `/masters/customers` + legacy
  `/customers`) pending consolidation.
- **Dev-login gotcha reinforced:** an orphaned `next dev` on port 3000 serves a stale Turbopack
  route tree where `/api/dev/switch` 404s → quick-login fails. Recovery: kill the port-3000
  process, `rm -rf .next`, restart (gotcha #10).

---

## CRM Administration Engine (Phase 8) + Pipeline Lifecycle (2026-06-05, UNCOMMITTED)

**Phase 8 = `/settings/crm`** — config engine for the sales pipeline. Service layer
`src/lib/crm-engine/` (`pipeline`, `territory`, `assignment`, `automation`, `sla`, `index`),
7 API routes under `/api/admin/crm/`, 5-tab admin UI (`CRMAdminClient` + `PipelineDesigner`,
`TerritoryManager`, `AssignmentRuleBuilder`, `AutomationBuilder`, `SLAManager`), seed
`prisma/seed-crm-defaults.ts`. CRM Admin is a **card on the Settings page**, not a sidebar link.

**4 migrations applied this session** (Hostinger has no shadow DB → hand-write SQL, apply via a
one-off `node apply-*.mjs` using the `mariadb` driver, then `prisma migrate resolve --applied
<name>` → `prisma generate` → **restart dev server**):
- `20260605000000_opportunity_discount_pct`, `20260605010000_crm_admin_engine`,
  `20260605020000_opportunity_won_fields`, `20260605030000_legacy_promote_and_net_profit`.

**Rules / gotchas for this area:**
- **Prisma acronym casing:** use `prisma.cRMAutomationRule` and `prisma.sLARule`; import types as
  `CRMAutomationRuleModel` / `SLARuleModel` from `@/generated/prisma/models/<Name>`. crm-engine
  re-exports friendly aliases (`CRMAutomationRule`, `SLARule`).
- **Pre-migration safe:** every crm-engine DB call is try/catch-guarded (returns `[]`/`null`).
- **`netProfitLakhs`** (renamed from `netMargin`) is an **absolute ₹ Lakhs** value, NOT a %.
- **PROPOSAL_SENT leads are hidden from the Leads view** (`stage: { not: "PROPOSAL_SENT" }` in both
  the server page and the GET API) — they live on Opportunities. Don't "fix" this as a bug.
- **WON/LOST opportunities are locked** — UI hides the edit form; API 403s non-managers. Closing
  requires PO Number + Deal Value (Won) or reason (Lost).
- **Legacy SalesFunnel deals promote to real opportunities** via "Open →" →
  `/api/pipeline/opportunities/promote` (idempotent via `SalesFunnel.crmOpportunityId`). The old
  limited `LegacyEditModal` was removed. Promoted rows are filtered from the legacy list.
- **Approval + automation hooks are fire-and-forget** — never let them block or fail a CRM save.
- **Pipeline stages in the DB are kept in sync with `src/types/pipeline.ts`** (`OPP_STAGES` /
  `LEAD_STAGES`). Do NOT hardcode new stages elsewhere.
