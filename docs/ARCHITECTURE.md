# Architecture

## 1. Technology Stack
| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js **16.2.6** App Router (Turbopack) | React 19.2 |
| Language | TypeScript 5 | |
| ORM | Prisma **7.8** | client → `src/generated/prisma` (NOT node_modules) |
| DB | SQLite | `@prisma/adapter-better-sqlite3` + `better-sqlite3` |
| Auth | NextAuth **v5 beta** | Microsoft Entra ID (Azure AD), JWT, 8h sessions |
| Styling | Tailwind v4 + custom `globals.css` tokens | |
| Charts | Recharts + inline SVG | |
| Icons | lucide-react | |
| Excel/OCR | `xlsx` (import), business-card OCR route | |
| Tests | Playwright | `tests/`, `scripts/check-*.mjs` for screenshots |

## 2. Folder Structure
```
auth.ts                  NextAuth (Node): JWT/session callbacks + DB lookups
auth.config.ts           Edge-safe: provider + (dead) authorized callback
prisma.config.ts         Prisma datasource (reads DATABASE_URL)
prisma/
  schema.prisma          22 models
  migrations/            16 migrations
src/
  app/
    <route>/page.tsx     Server component: getSession() → Prisma → <XClient/>
    <route>/XClient.tsx  "use client" UI
    api/**/route.ts      52 REST handlers
    admin/               AdminClient (settings, 10 tabs) + RolesClient (RBAC matrix)
    mobile/              Mobile web app: components/ + screens/ (12) + mobile.css
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
| `prisma.ts` | Singleton client; resolves SQLite path from `DATABASE_URL` (strips `file:`), dev fallback to `prisma/dev.db`. |
| `dev-session.ts` | **`getSession()`** — universal accessor; dev impersonation via `dev_employee_id`. |
| `kra-engine.ts` (759 ln) | Title-dispatched KRA progress from activity sheets; per-employee + team-wide helpers; `parseTargets`, `toScore`. |
| `payments.ts` | `recordPayment` (+opening-balance reconcile), `syncCollectionTotals`, `applyAdvance`, `paymentsToday`, notification fan-out. |
| `rbac.ts` | `PAGES` registry (14 pages × view/create/edit/delete), `DEFAULT_ROLES`, `seedDefaultRoles`, `hasPermission`. |
| `roles.ts` | Hardcoded predicates: `isAccounts`, `isOperationsHead`, `canSeeAllCollections`, `canManagePayments`, `hasManagerReach`, `usesFinanceNav`. |
| `settings.ts` | 106-key config store: defaults + metadata; `getSetting`/`setSetting`/`getAllSettings`. |
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
6. **No middleware:** the `authorized` callback in `auth.config.ts` is never invoked.
   Protection is per-page (`redirect`) and per-route (`401`/`403`). Unguarded by design:
   `/api/auth/[...nextauth]` and `/api/dev/switch`.

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
- Hostinger injects `DATABASE_URL` + Azure env at runtime; deploys from `master`.
- **Schema change loop:** `DATABASE_URL="file:./prisma/dev.db" npx prisma migrate dev`
  → `npx prisma generate` → **restart dev server** (Turbopack caches old client → 500s).
- **SQLite:** never `mode: "insensitive"` (throws); `contains` is already case-insensitive.
