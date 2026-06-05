# Architecture

## 1. Technology Stack
| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js **16.2.6** App Router (Turbopack) | React 19.2 |
| Language | TypeScript 5 | |
| ORM | Prisma **7.8** | client → `src/generated/prisma` (NOT node_modules); driver-adapter mode (no query engine) |
| DB | **MySQL / MariaDB 11.8** | `@prisma/adapter-mariadb` + `mariadb` driver (migrated from SQLite 2026-06-02) |
| Auth | NextAuth **v5 beta** | Microsoft Entra ID (Azure AD), JWT, 8h sessions; edge gate in `src/proxy.ts` |
| Styling | Tailwind v4 + custom `globals.css` tokens | |
| Charts | Recharts + inline SVG | |
| Icons | lucide-react | |
| Excel/OCR | `xlsx` (import), business-card OCR route | |
| Tests | Playwright | `tests/`, `scripts/check-*.mjs` for screenshots |

## 2. Folder Structure
```
auth.ts                  NextAuth (Node): JWT/session callbacks + DB lookups
auth.config.ts           Edge-safe: provider + LIVE authorized callback (run by proxy.ts)
src/proxy.ts             Next.js 16 edge middleware: runs authConfig.auth, gates all routes
prisma.config.ts         Prisma datasource (reads DATABASE_URL for the CLI)
prisma/
  schema.prisma          55+ models · provider=mysql · @db.Text + @@map + indexes
                         (core CRM + Finance Phase 1 + Admin Phase 2 + Policy + Workflow + Master Data)
  migrations/            5 migrations:
                           20260601000000_init_mysql (baseline)
                           20260602120000_finance_operations_phase1
                           20260604000000_admin_console_foundation (PascalCase tables)
                           20260604120000_policy_engine_foundation (PascalCase tables)
                           20260604180000_workflow_engine (snake_case tables — @@map required)
                           20260604220000_master_data_management (snake_case tables — @@map required)
  seed.ts                Finance config seed (prisma db seed via prisma.config.ts)
  seed-admin-foundation.ts  6 roles, 65 permissions, data access policies (DEV)
  seed-policy-defaults.ts   6 policy categories, 3 default policies (DEV)
  seed-workflow-defaults.ts 5 default workflows (DEV)
  seed-master-defaults.ts   8 master categories, ~40 values, global policies (DEV)
  seed-dev-{users,finance}.ts DEV-ONLY sample data
src/
  app/
    <route>/page.tsx     Server component: getSession() → Prisma → <XClient/>
    <route>/XClient.tsx  "use client" UI
    api/**/route.ts      52 REST handlers
    admin/               AdminClient (settings, 14 tabs incl. Finance Ops/Approvals/Masters) + RolesClient
    settings/            AdminConsole (clean 6-item list: Org, IAM, Workflow, Masters, Policy, Performance)
                           page.tsx → AdminConsole (simple single-page list)
                           organization/ → OrgManagementClient (8-tab)
                           identity/ → IdentityClient (6-tab)
                           policies/ → PolicyEngineClient (7-tab)
                           workflow/ → redirect to workflow/approval-engine/
                           workflow/approval-engine/ → WorkflowCenter (5-tab: Workflows|Designer|Delegation|Escalation|Audit)
                             WorkflowCenter uses WorkflowRulePanel/WorkflowDesigner/DelegationManager/
                             EscalationManager/WorkflowAudit — all live DB data
                           masters/ → MasterDataClient (8-tab: Overview|Categories|Values|Overrides|
                             Customer Policy|Vendor Policy|Validation Rules|Audit)
                           data/adminModules.ts — 6 active settings destinations
    finance/             Finance Phase 2 UI (2026-06-03, UI-only, MOCK data):
                           page.tsx + FinanceDashboardClient (Dashboard)
                           bank-book/  (data.ts + 9 components + client)
                           cash-book/  (data.ts + 8 components + client)
                           expenses/   (data.ts + 11 components + client + new/ entry form)
                             expenses/categories/  🆕 (2026-06-04) Expense Category engine:
                                 data.ts + ExpenseCategoriesClient + 5 components
                                 (CategoryTable/Filters/Form/Drawer/TemplateLoader)
                           vendors/    → REDIRECTS to /masters/vendors (global master)
                           claims|advances|conveyance|approvals|vouchers|reports/
                           _shared/transferStore.ts (cross-module Bank↔Cash entries)
    masters/             🆕 Global CRM masters (2026-06-04, UI-only, MOCK data):
                           vendors/    data.ts + VendorMasterClient + 10 components
                                       (Table/Filters/Form/Profile[9-tab]/Branch/Contact/
                                        Bank/Document/Usage managers + GSTRegistrationPanel)
                           customers/  data.ts + CustomerMasterClient + 13 components
                                       (Table/Filters/Form/Profile[12-tab]/Site/Contact/GST/
                                        Hierarchy/Asset/Profitability/Document/Timeline/
                                        Relationship). Extends the existing Customer model;
                                        legacy operational list stays at /customers.
    mobile/              Mobile web app: components/ + screens/ (15) + mobile.css
    login/               Sign-in + dev quick-login
    globals.css          Design-system tokens + component classes
  components/            Navbar, Topbar, SidebarLinks, DevBar, Badge, ProgressBar,
                         SheetLayout, CustomerNameCombobox, PaymentsTodayWidget
    pipeline/            KanbanBoard, LeadCard, OpportunityCard, ActivityFeed,
                         CrmSelect, StageBadge
  lib/                   Business logic (see §4)
  generated/prisma/      Prisma client output — DO NOT edit; regenerate
  types/                 Shared serialized DTO types
docs/                    This documentation set
```

> **Role-Adaptive Dashboard pattern (2026-06-04):** `dashboard/page.tsx` reads `Employee.isManager`
> + `Employee.role` fresh from the DB on every request (same pattern as Navbar — avoids stale JWT).
> Computes `roleVariant: "manager" | "opsHead" | "techHead" | "employee"` and passes it to
> `DashboardClient`. `showSales = roleVariant === "manager"` gates the sales funnel, pipeline KPI
> tiles, and team chart. `showTeam = isManager || roleVariant === "opsHead" || "techHead"` gates the
> team KRA panel and approvals quick-access. This discriminator pattern is the recommended way to
> gate new role-specific sections — add a branch to `roleVariant`, not a new boolean prop.

> **Settings Hub pattern (2026-06-04):** `src/app/settings/SettingsHub.tsx` is a 26-card navigation
> grid organized into 7 sections. Each card has `href`, `icon`, `label`, `description`, optional
> `badge`. The grid renders via `CARDS` array filtered by `section`. Add new config pages by
> appending to `CARDS`; the section header appears automatically.

> **Global Masters pattern (2026-06-04):** `/masters/vendors` and `/masters/customers` follow
> the same server-page → `"use client"` orchestrator pattern with **mock data** in a co-located
> `data.ts` (types + mock + `deriveCaps` RBAC + helpers). They are **global CRM masters** — one
> record referenced by every module — and deliberately do **NOT** add Prisma models: Vendor
> Master's shape targets the existing Phase-1 `Vendor`; Customer Master's shape **extends the
> existing `Customer` model** (it does not duplicate it — the legacy DB-backed `/customers`
> import/dedupe page is untouched). **Cross-module reuse:** Customer Master imports the GST
> validator + `GSTRegistrationPanel`/`GSTINBadge` from `masters/vendors`, and both masters reuse
> `finance/expenses/components/ExpenseSummaryCard` for KPI tiles. Tabbed profile drawers
> (`VendorProfile`/`CustomerProfile`) host the linked-module tabs (Opportunities, Projects,
> Support, Finance, etc.) on mock relationship data.

> **Finance Phase 2 UI pattern (2026-06-03):** the finance pages follow the same
> server-page → `"use client"` orchestrator pattern, but the orchestrators hold **mock data**
> from a co-located `data.ts` instead of Prisma results — there are **no finance API routes or
> schema changes** yet. Each `data.ts` defines the types + mock + helpers + `deriveCaps` RBAC,
> which become the contract for the real backend. Cash Book / Expense Register reuse Bank Book
> components (e.g. `CashBalanceCard` re-exports `BankBalanceCard`) to keep the modules
> identical. Cross-module Bank↔Cash transfers use `finance/_shared/transferStore.ts`
> (in-memory; persists across client-side nav only).

## 3. Application Design (data-flow pattern)
1. **Server component** (`page.tsx`) calls `getSession()`. No user → `redirect("/login")`;
   not authorized for the page → `redirect("/dashboard")`.
2. Fetches data directly with Prisma, **serializes** (`JSON.parse(JSON.stringify())`) to
   convert `Date`→string, and passes props to a `"use client"` component.
3. Client components mutate via `fetch("/api/...")`. API routes re-check session +
   ownership, then return JSON. UI re-fetches or `router.refresh()`.

This keeps secrets server-side, avoids a client data layer, and makes each page
independently auth-checked.

## 4. Services (`src/lib/`)
| File | Responsibility |
|---|---|
| `prisma.ts` | Singleton client over the **MariaDB driver adapter** (`PrismaMariaDb`). Builds the pool config from `DATABASE_URL` — **strips Passenger's `\%` backslash-escaping** before `new URL()` parsing — or from explicit `DB_HOST/PORT/USER/PASSWORD/NAME` env vars if present. |
| `dev-session.ts` | **`getSession()`** — universal accessor; dev impersonation via `dev_employee_id`. |
| `kra-engine.ts` (759 ln) | Title-dispatched KRA progress from activity sheets; per-employee + team-wide helpers; `parseTargets`, `toScore`. |
| `payments.ts` | `recordPayment` (+opening-balance reconcile), `syncCollectionTotals`, `applyAdvance`, `paymentsToday`, notification fan-out. |
| `rbac.ts` | `PAGES` registry (14 pages × view/create/edit/delete), `DEFAULT_ROLES`, `seedDefaultRoles`, `hasPermission`. |
| `roles.ts` | Hardcoded predicates: `isAccounts`, `isOperationsHead`, `canSeeAllCollections`, `canManagePayments`, `hasManagerReach`, `usesFinanceNav`. |
| `settings.ts` | 122-key config store: defaults + metadata; `getSetting`/`setSetting`/`getAllSettings`. 16 new keys added 2026-06-04 across Finance, Approvals, Masters categories. |
| `crm-service.ts` | External CRM master data (categories/OEMs/products/customers) with mock fallback. |
| `card-parser.ts` | Heuristic business-card OCR text → structured lead. |
| `customer-import.ts` | Dedupe CRM names into the Customer master. |
| `types.ts` | Serialized DTO types (Dates as strings). |

## 5. Authentication Flow
1. User hits a protected page → server component calls `getSession()`.
2. **Production:** delegates to NextAuth `auth()`. The Microsoft Entra ID provider
   (`auth.config.ts`) handles OAuth; `trustHost: true` supports Hostinger's SSL-terminating
   reverse proxy. Supports both `AZURE_AD_*` and `AUTH_MICROSOFT_ENTRA_ID_*` env names.
3. **JWT callback** (`auth.ts`): on first login, resolves the `Employee` by `msEmail`/`email`,
   persists `msEmail`/`msId`, and writes `employeeId/employeeName/isManager/role` into the
   token. On **every** refresh it **unconditionally** re-reads `isManager` + `role` from the
   DB (`1ab4f7d`) so Team-page role changes apply without code edits. (A token minted by the
   pre-`1ab4f7d` callback still needs one sign-out + in to flush a stale role.)
4. **Session callback** exposes those fields on `session.user`.
5. **Development:** if `dev_employee_id` cookie is set, `getSession()` returns a synthetic
   session for that employee (DevBar / `/login` quick-login). `/api/dev/switch` sets the
   cookie (dev only; 404 in prod).
6. **Edge gate (`src/proxy.ts`):** Next.js 16's middleware replacement runs
   `NextAuth(authConfig).auth` over a matcher covering all routes except
   `_next/static`, `_next/image`, `favicon.ico`, `public`. The **`authorized` callback IS
   live** — it allows `/login`, `/api/auth`, and (dev-only) `/api/dev/switch`; lets
   authenticated requests through; returns **`401 JSON` for unauthenticated `/api/*`** and
   **redirects unauthenticated page routes to `/login`**. Pages/routes ALSO call
   `getSession()` (defence in depth + ownership). A `middleware.ts` cannot coexist with
   `proxy.ts` in Next 16. *(Note: the header comment in `auth.config.ts` still says
   "Used by src/middleware.ts" — stale; it's `proxy.ts` now.)*

## 6. Authorization Layers
- **API ownership:** non-managers filtered to own `employeeId`; mismatch → `403`. Managers bypass.
- **`roles.ts` predicates:** finance/manager reach (Accounts + Operations Head see all
  collections/payments; Ops Head gets manager reach without `isManager`).
- **`rbac.ts` DB matrix:** `hasPermission(session, pageKey, action)` over `AppRole`/
  `RolePageAccess`; managers always allowed. ⚠️ Overlaps with `roles.ts` — see
  PROJECT_MEMORY known-issues.

## 7. Build & Deploy
- `npm run dev` — local. `npm run build` = `prisma migrate deploy && prisma generate &&
  next build`.
- **Hostinger / Passenger:** deploys from `master` (push → build under
  `…/public_html/.builds/`). Env is read from `…/public_html/.builds/config/.env`
  (Passenger injects at app start, **escaping `%`→`\%`** — see `prisma.ts`). Restart the
  app with `touch …/nodejs/tmp/restart.txt`. Server Node: `/opt/alt/alt-nodejs22/...` (v22,
  matches `better-sqlite3` ABI; v24 also installed). DB host must be **`127.0.0.1`** (TCP),
  not `localhost`.
  - ⚠️ Rapid back-to-back rebuilds/restarts pile up `next-server` workers and can trip the
    **CloudLinux LVE** limit (`fork: Resource temporarily unavailable`) → recover via hPanel
    → Restart Node app.
- **Schema change loop:** `npx prisma migrate dev --name <x>` against a **MySQL** dev DB
  → `npx prisma generate` → **restart dev server** (Turbopack caches old client → 500s).
- **MySQL:** `contains` is case-insensitive under `utf8mb4_unicode_ci` (no
  `mode:"insensitive"` needed). `url` is NOT allowed in `schema.prisma` (Prisma 7) — it
  lives in `prisma.config.ts`.

---

## 8. Database Platform — Authoritative Record (append-only)

### Migration completed: SQLite → MySQL (2026-06-02)
The project was originally built on SQLite for local development. On 2026-06-02 the
production database was migrated to **MySQL-compatible MariaDB 11.8** hosted on Hostinger.
SQLite is no longer used in development or production.

### Canonical stack (do not change without updating this section)
| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| ORM | Prisma 7 — `prisma-client` generator (driver-adapter mode, no binary engine) |
| Database | **MySQL 8-compatible** · MariaDB 11.8 |
| Driver adapter | `@prisma/adapter-mariadb` + `mariadb` npm driver |

### MySQL-compatible Prisma design — rules for all future modules
These rules apply to every new model, migration, API route, or service added to the project:

| Rule | Requirement |
|---|---|
| Provider | `provider = "mysql"` in `schema.prisma` — permanent |
| Datasource URL | In `prisma.config.ts` only — Prisma 7 forbids `url` in `schema.prisma` |
| Long text | `@db.Text` on any `String` field holding free-form content, JSON, or notes |
| Indexes | `@@index` on every FK column and every column used in `where` filters |
| Money | `Float` (→ MySQL `DOUBLE`) now; planned upgrade is `@db.Decimal(12,4)` |
| Case search | No `mode:"insensitive"` — `utf8mb4_unicode_ci` collation handles it |
| Connection | `127.0.0.1` in `DATABASE_URL` — `localhost` maps to a unix socket (breaks) |
| Transactions | `prisma.$transaction` for any multi-step write sequence |
| Migration | `npx prisma migrate dev` requires a live MySQL instance, never a SQLite URL |
