# Security Model

## Authentication method
- **NextAuth v5 (beta)** with the **Microsoft Entra ID (Azure AD)** OAuth provider.
  There are **no local passwords** — users sign in with their `@caveoinfosystems.com`
  Microsoft account.
- **JWT session strategy**, `maxAge = 8h` (one work day) — see `auth.ts`.
- `trustHost: true` for Hostinger's SSL-terminating reverse proxy. Env names supported:
  `AZURE_AD_CLIENT_ID/SECRET/TENANT_ID` or `AUTH_MICROSOFT_ENTRA_ID_ID/SECRET/TENANT_ID`,
  plus `AUTH_SECRET`, `AUTH_URL`.
- **JWT callback** resolves the `Employee` row by `msEmail`/`email` on first login,
  persists `msEmail`/`msId`, and writes `employeeId/employeeName/isManager/role`. As of
  `1ab4f7d` it **unconditionally re-reads `isManager` + `role` from the DB on every token
  refresh** (previously only when `isManager` was undefined — which left stale roles).
  ⚠️ A token minted by the *old* callback keeps its stale role until that user signs out +
  in once; after that refresh, role changes apply automatically.
- **`getSession()`** (`src/lib/dev-session.ts`) is the universal accessor. In development a
  `dev_employee_id` cookie returns a synthetic session for any employee (DevBar /
  `/login` quick-login). In production it delegates to NextAuth `auth()`.

## Roles
`Head of Sales` (manager), `Business Development Manager`, `BDE`, `Inside Sales`, `ISR`,
`Sales Coordinator`, `Accounts`, `Operations Head`. The role string lives on
`Employee.role` (free-text, set on the Team page); `Employee.isManager` is the master
override flag; `Employee.reportsToId` records the reporting line (Accounts → Operations
Head → Head of Sales). Role checks in `roles.ts` are **substring/case-insensitive**, so
free-text variants ("HR & Operations Head") still resolve correctly.

## Permissions (two coexisting systems)
1. **`src/lib/roles.ts` predicates** (authoritative today): `isAccounts`,
   `isOperationsHead`, `canSeeAllCollections`, `canManagePayments`, `hasManagerReach`,
   `usesFinanceNav`. Managers + Accounts + Operations Head get full finance visibility;
   Ops Head gets manager reach without `isManager`.
2. **`src/lib/rbac.ts` DB matrix** (`AppRole` × `RolePageAccess`, 14 pages ×
   view/create/edit/delete) via `hasPermission(session, pageKey, action)`. Managers always
   return `true`. ⚠️ The matrix is editable in the admin panel but **not yet enforced at
   most routes** — consolidating these two systems is a tracked next step.

## Edge gate (`src/proxy.ts`) — primary boundary
- **Next.js 16's middleware replacement.** `src/proxy.ts` runs `NextAuth(authConfig).auth`
  over a matcher covering all routes except `_next/static`, `_next/image`, `favicon.ico`,
  `public`. The **`authorized` callback in `auth.config.ts` IS live** (corrects the earlier
  "dead code" note): it allows `/login`, `/api/auth`, and (dev-only) `/api/dev/switch`; lets
  authenticated requests through; returns **`401 JSON` for unauthenticated `/api/*`** and
  **redirects unauthenticated page routes to `/login`**.
- A `middleware.ts` **cannot coexist** with `proxy.ts` in Next 16 (build error).
- *(Stale comment:* `auth.config.ts` header still says "Used by src/middleware.ts".)*

## API security
- Defence in depth: the edge proxy 401s unauthenticated `/api/*`, AND every route (52) also
  calls `getSession()`.
- **Ownership:** non-managers are filtered to their own `employeeId`; `[id]` mutations
  fetch the record's owner and return **`403`** on mismatch. Managers/finance bypass.
- **Manager-only** routes (admin) return `403` to non-managers.
- **Public by design:** `/api/auth/[...nextauth]` (NextAuth handler) and `/api/dev/switch`
  (development only — returns `404` in production).
- Any new page/route should STILL call `getSession()` itself (don't rely on the proxy alone
  for ownership / role checks).

## Data visibility
- **Reps:** only their own leads, opportunities, collections, KRAs, daily updates.
- **Managers (Head of Sales):** all data + team dashboards + admin panel.
- **Accounts / Operations Head:** all collections, payments, advances (finance scope);
  no sales pipeline editing.
- The sidebar adapts to role (`usesFinanceNav`), but visibility is enforced server-side,
  not just hidden in the UI.

## Session handling
- JWT in an HTTP-only cookie; 8-hour expiry → re-auth via Microsoft.
- **Sign-out** clears the NextAuth session **and** the `dev_employee_id` dev cookie.
- Dev impersonation cookie is development-only and inert in production.

## Password rules
- **None** — authentication is delegated entirely to Microsoft Entra ID (Azure AD).
  Password policy, MFA, and lockout are governed by the organization's Azure tenant, not
  this app. The app stores no passwords or password hashes.

## Audit requirements
- **`CrmActivity`** records pipeline actions (`created`, `stage_changed`, `task_completed`,
  `note_added`, …) with `performedById` + `timestamp` — the closest thing to an audit log.
- **`Notification`** persists payment/advance events with recipient + amount + timestamp.
- `AppSetting.updatedById` and role/cert approval fields (`approvedBy`, `approvedAt`)
  capture who changed config / approved items.
- **Gaps:** no global, immutable audit trail across all entities; no login-history log.
  Consider centralizing if compliance requires it.

## Database credentials & connection (post-migration)
- MySQL/MariaDB creds + `DATABASE_URL` live in `…/public_html/.builds/config/.env` on the
  server (Passenger injects at runtime). Host is **`127.0.0.1`** (TCP).
- **Passenger escapes `%`→`\%`** in injected env values; `src/lib/prisma.ts` strips stray
  backslash-escapes before parsing — keep that in mind if changing the DB password (prefer a
  password without `%`, or rely on the unescape).
- **⚠️ Action required:** SSH (`u686730471`) and MySQL (`u686730471_caveoadmincrm`)
  passwords were shared in a chat session during migration — **rotate both**. Delete any
  local helper scripts that embedded them (`scripts/_tmp_ssh.mjs`, `scripts/_tmp_sftp.mjs`).

## Known security notes
- `xlsx@0.18.5` carries a HIGH-severity advisory (prototype pollution / ReDoS), no upstream
  fix — used only in the import path; treat imported files as untrusted.
- The edge proxy is the first gate, but **forgetting `getSession()` in a new route still
  drops ownership/role checks.** Always copy the guard pattern from an existing route.
