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
  persists `msEmail`/`msId`, and writes `employeeId/employeeName/isManager/role`. It
  **re-reads `isManager` + `role` from the DB on every refresh** so role changes apply
  without re-login.
- **`getSession()`** (`src/lib/dev-session.ts`) is the universal accessor. In development a
  `dev_employee_id` cookie returns a synthetic session for any employee (DevBar /
  `/login` quick-login). In production it delegates to NextAuth `auth()`.

## Roles
`Head of Sales` (manager), `Business Development Manager`, `BDE`, `Inside Sales`, `ISR`,
`Sales Coordinator`, `Accounts`, `Operations Head`. The role string lives on
`Employee.role`; `Employee.isManager` is the master override flag.

## Permissions (two coexisting systems)
1. **`src/lib/roles.ts` predicates** (authoritative today): `isAccounts`,
   `isOperationsHead`, `canSeeAllCollections`, `canManagePayments`, `hasManagerReach`,
   `usesFinanceNav`. Managers + Accounts + Operations Head get full finance visibility;
   Ops Head gets manager reach without `isManager`.
2. **`src/lib/rbac.ts` DB matrix** (`AppRole` × `RolePageAccess`, 14 pages ×
   view/create/edit/delete) via `hasPermission(session, pageKey, action)`. Managers always
   return `true`. ⚠️ The matrix is editable in the admin panel but **not yet enforced at
   most routes** — consolidating these two systems is a tracked next step.

## API security
- Every route (52) calls `getSession()`. Unauthenticated → **`401 {error}`** (API routes
  are never redirected to `/login`).
- **Ownership:** non-managers are filtered to their own `employeeId`; `[id]` mutations
  fetch the record's owner and return **`403`** on mismatch. Managers/finance bypass.
- **Manager-only** routes (admin) return `403` to non-managers.
- **Unguarded by design:** `/api/auth/[...nextauth]` (NextAuth handler) and
  `/api/dev/switch` (development only — returns `404` in production).
- **No `middleware.ts`** — the `authorized` callback in `auth.config.ts` never runs;
  enforcement is entirely per-page (`redirect`) and per-route (`401`/`403`). Treat this as
  the security boundary; any new page/route MUST call `getSession()` itself.

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

## Known security notes
- `xlsx@0.18.5` carries a HIGH-severity advisory (prototype pollution / ReDoS), no upstream
  fix — used only in the import path; treat imported files as untrusted.
- Because protection is per-route, **forgetting `getSession()` in a new route silently
  exposes it.** Always copy the guard pattern from an existing route.
