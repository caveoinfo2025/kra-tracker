# Security Model

> **2026-06-05 (Session 4) — CRM Admin + opportunity-close access control:**
> - All `/api/admin/crm/*` routes are **manager-gated** (`session.user.isManager`, else 403).
> - `/settings/crm` page redirects non-managers to `/dashboard`.
> - **Opportunity close lock:** `PATCH /api/pipeline/opportunities/[id]` returns **403** when a
>   non-manager edits a deal already in WON/LOST. WON/LOST also require their mandatory fields.
> - **Legacy promotion** (`/api/pipeline/opportunities/promote`) is allowed for managers or the
>   owning employee only.
> - Approval/automation hooks are server-side and fire-and-forget; they never weaken the save path.

> **2026-06-05 — DB-driven RBAC now active (migrations applied):**
> `src/lib/access-control/` is now backed by live DB tables. 65 permissions across 6 roles seeded.
> All Admin Console pages use `hasPermission(userId, module, resource, action)` with graceful
> predicate fallback (`isManager || isOpsHead`) while DB roles are being assigned to employees.
> The two RBAC systems (DB-driven `access-control/` + legacy `roles.ts` predicates) coexist.
> **canEdit fallback**: All settings pages grant edit rights to managers even if DB permissions
> not explicitly assigned (`canEdit || isOpsHead || isManager`) — safe for dev, tighten for prod.

> **Phase 6 Workflow Engine access gates:**
> - `GET /api/workflows` — any authenticated user
> - `POST /api/workflows` — authenticated; service checks no duplicate code
> - `POST /api/workflows/start` — any authenticated user can trigger
> - `POST /api/approvals/[id]/action` — action validated against approver identity by `getPendingForApprover`

> **2026-06-04 Session 2 — Dashboard role gating (added, server-side):**
> `roleVariant` is computed server-side in `dashboard/page.tsx` from a live Prisma `findUnique` —
> it is NOT derived from the JWT. An employee cannot manipulate the dashboard variant by
> impersonating a role. The `isOpsHead` and `isTechHead` checks run on the server; only their
> presentational outputs (section visibility) are passed to the client. No new attack surface.

> **2026-06-04 Session 1 — Global Masters + Expense Categories access control (added, code; no auth
> mechanism change):** Per-module **capability tiers** derive from `roles.ts` predicates in each
> module's `data.ts`:
> - **Expense Categories** (`deriveCatCaps`) — gate page on `canManageFinance` (Employees
>   redirected to `/finance/expenses`). Accounts Admin = full CRUD + rule config; Accounts Team
>   & Manager = view + export; Employee = no access.
> - **Vendor Master** (`deriveVendorCaps`) — all authenticated users can view; Accounts Admin =
>   full incl. bank/GST; Accounts Team = edit + bank/GST + finance; Manager = create/edit/disable
>   (no bank/GST); Staff = view only. Finance/usage data gated on `canViewFinance`.
> - **Customer Master** (`deriveCustomerCaps`) — all authenticated users can view; Sales Admin
>   (Manager/Ops Head) = full incl. GST/commercial/finance/disable; Finance (Accounts) = edit +
>   GST + commercial + finance (no create/disable); Sales Team = create/edit (no finance/commercial
>   visibility). Finance/profitability tabs + commercial block gated on `canViewFinance`.
> ⚠️ **Client-side gating only** for these new UI modules — enforce server-side when their CRUD
> APIs are built (same dual-RBAC caveat as the rest of the app). The new global masters live at
> `/masters/*` (Vendor, Customer); the legacy operational `/customers` DB page keeps its existing
> manager-gated import/dedupe.

> **2026-06-03 — Finance Phase 2 UI access control (added, code; no auth mechanism change):**
> `canManageFinance(user)` added to `src/lib/roles.ts` (manager / Accounts / Operations Head).
> Finance pages gate on it (own-data pages allow any authenticated user). Per-page **capability
> tiers** derive in each module's `data.ts` (`deriveCaps`/`deriveExpenseCaps`):
> **Accounts Admin** (Ops Head) — full incl. delete/adjust/approve; **Accounts Team** (Accounts)
> — create/edit/submit/export; **Manager** — approve/view; **Employee/Branch User** — own data,
> create own claim. Buttons/actions (Approve, Mark Reconciled, Cash Adjustment, Export, bulk
> ops) are gated on these caps. ⚠️ This is **client-side gating only** for now — enforce on the
> server when the finance APIs are built (same dual-RBAC caveat as the rest of the app).

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
- **🆕 `AuditLog` model added (Finance Phase 1, 2026-06-02)** — a generic
  `entityType`/`entityId`/`action`/`performedById`/`changes` trail. DB-ready; it will be
  **written by the Phase 2+ finance services** (expense/voucher/advance/approval actions). It
  begins to address the gap below but is currently finance-scoped and unpopulated.
- **Gaps:** no global audit trail across ALL entities yet (AuditLog is finance-only for now);
  no login-history log. Consider widening `AuditLog` usage if compliance requires it.

## Finance authorization (Phase 1 — planned predicates)
The 10 finance tables exist but have **no API/role gates yet**. Phase 2 must add predicates to
`src/lib/roles.ts` before exposing any route: `canManageFinance` (managers + Accounts + Ops
Head — cash/bank/expense/voucher writes), `canApprove` (managers + Ops Head + employees in an
approver role), `canManagePolicy` (managers only — `ApprovalRule`). Every new `/api/finance/*`
route MUST call `getSession()` + the relevant predicate (same defence-in-depth pattern as
existing routes). Until then, the finance data is reachable only via Prisma Studio / DB tools.

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
