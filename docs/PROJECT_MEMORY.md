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

## 0. Current status (2026-06-18, end of session 7 — SFDC Lead Standardization + HR Automation + RBAC Role Assignment)

### 2026-06-20 — Security fix: Approval Engine object-level authorization (committed separately from session 7)
`docs/RBAC_AUDIT_REPORT.md` flagged that `POST /api/approvals/[id]/action` let any authenticated employee approve/reject/return/delegate/cancel **any** approval request by guessing/incrementing a `requestId` — `approveRequest`/`rejectRequest`/`returnRequest`/`delegateRequest`/`cancelRequest` in `src/lib/workflow-engine/approval.ts` never checked that the caller was an eligible approver. Fixed via a new `src/lib/workflow-engine/authorization.ts` (`assertCanActOnApprovalRequest()`), called from inside each action function before any mutation. APPROVE/REJECT/RETURN/DELEGATE now require the request to be `PENDING` and the actor to be a resolved current-step approver, an active delegate of one, or hold the `Workflow/ApprovalRequest/APPROVE` permission via `access-control`; CANCEL is restricted to the original requester on a still-`PENDING` request (no admin override exists yet — documented limitation). The action functions now return `{ ok, reason? }` instead of a bare `boolean`; the API route maps reasons to 401/403/404/409. No UI changes needed (`/approvals` and `/finance/approvals` already render API `error` text). See `docs/RBAC_AUDIT_REPORT.md` §10 item 1 for full detail. `npx tsc --noEmit`, `npx eslint`, `npx prisma validate`, and `next build` all pass.

### 2026-06-20 — Security fix: Customer Master + Admin Masters permission checks (Step 2B)
`docs/RBAC_AUDIT_REPORT.md` §6 confirmed 7 routes had a session check but no permission check, letting any authenticated employee write customer master records or master-data configuration. Fixed by adding the existing `requirePermission()` (`@/lib/access-control`) immediately after each route's existing session check: `PATCH /api/customers/master/[id]` now requires `Masters/CustomerMaster/EDIT` (mirrors its sibling `DELETE` handler); `GET`/`POST /api/admin/masters`, `/api/admin/masters/overrides`, and `/api/admin/masters/values` now require `Settings/Masters/VIEW` (GET) / `Settings/Masters/EDIT` (POST) — the same permission the `/settings/masters` page guard already checks. No payloads, validation, response shapes, or business logic changed. `/api/admin/customer-policy`, `/api/admin/vendor-policy`, `/api/master-values`, and the `DELETE` handler's EDIT-vs-DELETE action mismatch remain open, deferred to a later step. `npx tsc --noEmit`, `npx eslint`, `npx prisma validate`, and `next build` all pass.

### 2026-06-20 — Security fix: Customer Master DELETE permission mismatch (Step 2C)
`docs/RBAC_AUDIT_REPORT.md` §7 finding 5 noted `DELETE /api/customers/master/[id]` checked `Masters/CustomerMaster/EDIT` instead of the catalogue's distinct `Masters/CustomerMaster/DELETE` action — a role granted EDIT-but-not-DELETE on Customer Master could still delete records. Fixed with a single-line change to the existing `requirePermission()` call's action argument (`"EDIT"` → `"DELETE"`); nothing else in the handler, the sibling `PATCH` handler, or any other Customer Master route changed. `PATCH` remains on `EDIT`, unchanged. `npx tsc --noEmit`, `npx eslint`, `npx prisma validate`, and `next build` all pass.

### 2026-06-20 — Security fix: Customer/Vendor Policy permission checks (Step 2D)
`docs/RBAC_AUDIT_REPORT.md` §3.5/§6 confirmed `GET`/`POST /api/admin/customer-policy` and `GET`/`POST /api/admin/vendor-policy` had a session check but no permission check, letting any authenticated employee read or write customer/vendor governance policy (GST-required flags, duplicate thresholds, credit-approval-required, bank-verification-required). Treated as the same category of master-governance config as `/api/admin/masters` and its `/overrides`/`/values` siblings (Step 2B), so gated with the same permission: `Settings/Masters/VIEW` on both GET routes, `Settings/Masters/EDIT` on both POST routes, via the existing `requirePermission()` (`@/lib/access-control`). No payload validation, save logic, or response shape changed. `/api/master-values`, CRM-admin/Finance-admin routes, Identity APIs, Policy APIs, sidebar visibility, `rbac.ts`, and `roles.ts` intentionally untouched, per scope. `npx tsc --noEmit`, `npx eslint`, `npx prisma validate`, and `next build` all pass.

### 2026-06-20 — Security fix: `/api/master-values` authentication (Step 2E)
`docs/RBAC_AUDIT_REPORT.md` §3.6 flagged `GET /api/master-values` as fully public — no `getSession()` call at all, unlike every other API route. Usage audit (full-text search for `master-values`/`MasterValue`) found a single consumer chain — `src/hooks/useMasterValues.ts` → `LeadGenClient.tsx`, `LeadsClient.tsx`, `finance/expenses/components/ExpenseForm.tsx` — all internal CRM pages whose `page.tsx` already requires a session to render. No public/login-page or API-to-API caller exists, so per the safe-default rule the route now requires an authenticated session: added the standard `getSession()`/401 check, same convention as the rest of the API. No permission check was added (dropdown-only data, no sensitive/admin fields); query params, filtering, and response shape for authenticated callers are unchanged. `npx tsc --noEmit`, `npx eslint`, `npx prisma validate`, and `next build` all pass.

### 2026-06-20 — Security fix: CRM-admin/Finance-admin `requirePermission` migration (Step 2F)
`docs/RBAC_AUDIT_REPORT.md` §3.2 flagged 7 CRM-admin + 7 Finance-admin route files that all `import { requirePermission } from "@/lib/access-control"` but never call it, falling back to an inline `isManager` check instead — meaning a future `access-control` role grant to a non-manager would have no effect on these 14 endpoints. Migrated the 7 **Finance-admin** routes (`admin/finance/{advance,collection,conveyance,credit,expenses,policies,voucher}`) to `requirePermission(session,"Settings","Finance","VIEW")` (GET) / `"EDIT"` (POST/PATCH) — `Settings/Finance` already existed in the catalogue (Phase 9), so no new permission was added; the manager fallback inside `requirePermission()` is unchanged, so existing managers are unaffected. The 7 **CRM-admin** routes (`admin/crm/{assignment,automation,pipelines,pipelines/[id],sla,territories,territories/[id]}`) were intentionally **not** migrated: no `Settings/CRM` or other CRM-administration permission exists in `PERMISSION_CATALOGUE` (only end-user `CRM/Lead`/`Opportunity`/`Activity`/`Report`), and inventing one was out of scope per the migration's explicit "stop and document the gap" instruction — they still use the inline `isManager` check. Recommended follow-up: add `Settings/CRM` (VIEW/EDIT) to the catalogue, seed it, then repeat this migration for the 7 CRM-admin files. No payloads, validation, response shapes, or business logic changed. `npx tsc --noEmit`, `npx eslint`, `npx prisma validate`, and `next build` all pass.

### 2026-06-20 — Security fix: Identity/Policy Admin APIs migrated off legacy `canAccessSettings` (Step 2G)
`docs/RBAC_AUDIT_REPORT.md` §3.3 flagged the irony that the API managing `Role`/`Permission`/`UserRole`/`DataAccessPolicy` rows (`access-control`'s own tables) was itself gated by the *legacy* `roles.ts` `canAccessSettings()` predicate, not by `access-control`. Migrated 13 route files to `requirePermission()`: 7 Identity files (`admin/identity/{permissions,permissions/[roleId],policies,policies/[roleId],roles,roles/[id],users/[id]}`) now require `Settings/Identity/VIEW` (GET) or `/EDIT` (POST/PATCH); 6 Policy files (`admin/policies/{route,[id],[id]/versions,audit,categories,evaluate}`) now require `Settings/Policy/VIEW` (GET) or `/EDIT` (POST/PATCH). `POST /api/admin/policies/evaluate` — previously ungated entirely — was deliberately gated with VIEW, not EDIT: confirmed read-only (`evaluatePolicy()` only does a `findMany`) with zero existing callers anywhere in the codebase, so the gate has no functional impact today. `requirePermission()`'s manager fallback is unchanged, so existing managers are unaffected. `src/app/api/admin/identity/users/route.ts` (the collection endpoint, distinct from `/[id]`) was found still using `canAccessSettings` but was out of scope for this step (not in the named route list) — flagged for follow-up. `canAccessSettings` itself remains in `roles.ts` and in active use elsewhere (page guards, `/settings/administration`, legacy `/admin`) — untouched, per scope. No payloads, validation, response shapes, or business logic changed. `npx tsc --noEmit`, `npx prisma validate`, and `next build` all pass; `npx eslint` shows 3 pre-existing `no-explicit-any` errors unrelated to this change.

### 2026-06-20 — RBAC migration tracker created, legacy rbac.ts/AppRole/RolePageAccess frozen (Step 2H)
Created `docs/RBAC_MIGRATION_TRACKER.md` — a practical companion to `docs/RBAC_AUDIT_REPORT.md` documenting the current decision (`access-control` is the final permission system; `roles.ts` is a temporary bridge; `rbac.ts`/`AppRole`/`RolePageAccess` is frozen/decorative; the legacy `/admin` Roles tab is non-authoritative), the 7 completed migration steps (2A–2G), 9 remaining steps (2I–2R) with risk notes, freeze rules, and a permission-mapping summary cross-checked against `permissions.ts` (documenting real gaps: no `Settings/CRM`, no `Finance/Voucher`, no `EDIT` on `Finance/Payment`/`Advance`, no `DELEGATE`/`CANCEL` action type, no `IMPORT` on `Masters/VendorMaster`). Added a top-of-file freeze comment to `src/lib/rbac.ts` (comment only, no behavior change) and a non-blocking warning banner to the legacy `/admin` Roles & Access tab (`src/app/admin/AdminClient.tsx`, scoped to that tab only, reusing the existing inline warning style already used inside `RolesClient.tsx`). No schema, migrations, deletions, or runtime permission logic changed. `npx tsc --noEmit`, `npx prisma validate`, and `next build` all pass.

### 2026-06-20 — Legacy RBAC freeze warnings completed (Step 2I)
Followed up on Step 2H's tracker/freeze work with `docs/RBAC_MIGRATION_TRACKER.md`'s own Step 2I: strengthened `src/lib/rbac.ts`'s top-of-file comment to explicitly state "do not build new features on AppRole/RolePageAccess" and "frozen until the legacy /admin Roles UI is retired" (previously only implied); added a second, smaller warning to the general Admin Panel header in `src/app/admin/AdminClient.tsx` (visible on every legacy admin tab, not just Roles & Access) reading "This legacy administration area is being retained temporarily. New permission management should be done from Settings > Identity." The existing Roles-tab banner from Step 2H already satisfied the canonical warning message and was left unchanged. No schema, migrations, deletions, runtime permission logic, sidebar, or `/settings/identity` behavior changed. `npx tsc --noEmit`, `npx prisma validate`, and `next build` all pass.

### This session (UNCOMMITTED — dev DB migration applied, TypeScript clean)
- **SFDC-style Lead Standardization** (`/pipeline/leads`): `customerRefId` FK added to `CrmLead`, migration applied to dev DB. Smart `CustomerNameCombobox` replaces old separate customer dropdown. `ConvertModal` on both list + detail pages. New `POST /api/pipeline/leads/[id]/convert` endpoint. ✓
- **RBAC Role Assignment in Employees tab** (Settings → Identity & Access): Assign/Remove toggles per role in the Manage drawer; `PATCH /api/admin/identity/users/[id]` with `addRoleId`/`removeRoleId`. ✓
- **HR Automation**: deactivating/suspending employee auto-revokes all `UserRole` records. ✓
- **Employee Form Dropdown Wiring**: Department / Designation / Reports-To from master tables; sets FK ids on `EmployeeProfile`. ✓

### ⚠️ UAT DB migration still pending
`20260618100000_crm_lead_customer_ref` must be applied to UAT (`u686730471_Caveo_UAT`) before leads page works on UAT. Use `prisma/apply-crm-lead-customer-ref.mjs`.

### ⚠️ STOP: Phase 13 is the final module
Per user instruction: "STOP after Security Center. Do not implement Governance module."

### ⚠️ All work UNCOMMITTED since session 4
Sessions 5–7 changes are NOT committed. Everything from Phase 8 onwards lives only in the working tree. **Confirm with Vijesh before committing or pushing.**

### Migrations applied to dev DB
- `20260610080000_integration_center` — 5 tables, marked applied
- `20260610090000_security_center` — 7 tables, marked applied
- `20260618100000_crm_lead_customer_ref` — `CrmLead.customerRefId` FK, marked applied

### Previously committed (sessions 1–4)
- Sessions 1–3: Finance Phase 1 DB layer, Admin Console Phases 1–7 UI (all committed)
- Session 4: Phase 8 CRM Admin Engine, 4 migrations applied to dev DB, Approval wiring,
  Pipeline lifecycle upgrades, Legacy promotion. All committed.
- Session 5: Phase 9 Finance Administration Engine (committed, dev DB migration pending)

### Prod note: Nothing pushed to production since session 4. Confirm with Vijesh before `git push origin master`.

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
- **Admin panel** (`/admin`, manager-only) — Settings (122 config keys including 16 new Finance/
  Approvals/Masters keys, `AppSetting`, 14 tabs) + Roles & Access matrix (`AppRole`/`RolePageAccess`).
  Data-free; config/rules only.
- **Settings Hub** (`/settings`) — 26-card navigation grid across 7 sections: General, Workflow,
  People, Masters, Finance, CRM & Sales, System. Entry point to all configuration.
- **Role-Adaptive Dashboard** — `roleVariant` discriminator derived from live DB role. Ops Head
  sees Finance/HR/team KRA view; Tech Head sees team KRA/tasks; Manager sees full sales funnel;
  Employee sees own KRA. No stale JWT — role read fresh on every dashboard load.
- **Mobile app** (`/mobile`) — 13 screens incl. business-card OCR (`/api/ocr/business-card`),
  team views, quick activity/call/meeting logging, and a read-only **Collections** screen +
  Pipeline **Leads|Opportunities** segment + collections KPIs on the Today dashboard (`5ba865a`).
- **Finance Operations Module — Phase 1 (database)** *(committed/pushed `1747f9e`)* — 10 models
  (`FinAccount`, `Ledger`, `Vendor`, `Expense`, `Voucher`, `VoucherSequence`, `EmployeeAdvance`,
  `TravelClaim`, `ApprovalRule`, `AuditLog`), migration `20260602120000_finance_operations_phase1`,
  finance config seed. Full spec in `docs/modules/finance/`.
- **Finance Operations Module — Phase 2 UI** *(2026-06-03, UI-only mock data, UNCOMMITTED)* —
  full finance web UI under `src/app/finance/`:
  - **Navigation** — collapsible Finance section in `SidebarLinks` + `canManageFinance` in `roles.ts`.
  - **Dashboard** (`/finance`) — 8 KPIs, 4 charts, quick actions, filters.
  - **Bank Book** (`/finance/bank-book`) — ledger + reconcile + 4-step statement import wizard
    + Bank↔source mapping (Collection/Advance/Expense). `data.ts` + 9 components.
  - **Cash Book** (`/finance/cash-book`) — ledger, reconciliation panel, Bank↔Cash transfers,
    customer-cost & employee-finance panels, vouchers. `data.ts` + 8 components.
  - **Expense Register** (`/finance/expenses`) — summary cards, 18-field filters, bulk actions,
    GST auto-split, approval timeline, profitability + advance panels. `data.ts` + 11 components.
  - **Mobile** — `ExpenseClaimScreen`, `ConveyanceScreen` (no Google API; placeholders).
  - **Shared** — `_shared/transferStore.ts` (cross-module Bank↔Cash entries); collapsible
    top-of-page filters across all 3 ledger pages.
  - All on mock data (₹ rupees); shapes defined in each `data.ts` ready for backend wiring.
- **Expense Categories** *(2026-06-04, UI-only mock, UNCOMMITTED)* — `/finance/expenses/categories`,
  a configuration-driven category engine: `data.ts` (30 categories, parent/sub, `deriveCatCaps`,
  7 templates) + `ExpenseCategoriesClient` + `CategoryTable/Filters/Form/Drawer/TemplateLoader`.
  `CategoryForm` has 9 config sections (Basic, Usage, Payment, Document rules, GST, Approval,
  Grade-policy, Customer-cost, Tally). Built to replace hardcoded category logic later.
- **Global Vendor Master** *(2026-06-04, UI-only mock, UNCOMMITTED)* — `/masters/vendors`, a global
  CRM master (one `Vendor` referenced by Finance/Expense/Procurement/Inventory/Projects/Support/
  Assets/Tally): `data.ts` (8 vendors, full Indian GST state-code map, `validateGSTIN`,
  `deriveVendorCaps`) + `VendorMasterClient` + 10 components incl. `VendorProfile` (9-tab),
  multi-branch+GST, contacts, banks, documents, and the reusable `GSTRegistrationPanel`/`GSTINBadge`.
  `/finance/vendors` redirects here.
- **Global Customer Master** *(2026-06-04, UI-only mock, UNCOMMITTED)* — `/masters/customers`, a
  global CRM master (one `Customer` referenced by CRM Sales/Opps/Quotations/Orders/Projects/Support/
  AMC/Assets/Finance/Profitability/Engineer-Visits/Conveyance): `data.ts` (8 customers incl. ABC
  Group hierarchy, `deriveCustomerCaps`, duplicate detection; reuses Vendor GST validator) +
  `CustomerMasterClient` + 13 components incl. `CustomerProfile` (12-tab), `CustomerSiteManager`
  (per-site GST + geo), `CustomerHierarchyViewer`, `CustomerProfitabilityPanel`,
  `CustomerRelationshipViewer`. **Extends the existing `Customer` model — no duplicate model.**
  The legacy operational `/customers` page (live CRM import + dedupe) is preserved and unchanged.
- **Bulk import** — CSV/XLSX lead import; printable employee user guide at `/user-guide.html`.
- **Org hierarchy** — `Employee.reportsTo` self-relation; Operations Head role with
  manager-like finance reach; editable `Reports To` + `Manager access` on the Team page.
- **Live role hydration** — `auth.ts` re-reads `isManager`+`role` from the DB on every
  token refresh, and `roles.ts` matches the Operations Head role flexibly, so Team-page
  role changes apply without code edits (and, after one re-login, without sign-out).
- **Security hardening** — ownership checks on `[id]` routes, API returns 401 JSON,
  signOut clears the dev cookie, mandatory PO date for Closed Won.
- **CRM Administration Engine — Phase 8** *(2026-06-05, UNCOMMITTED)* — `/settings/crm`, a config
  engine for the sales pipeline: `src/lib/crm-engine/` (pipeline, territory, assignment, automation,
  sla services), 7 API routes (`/api/admin/crm/*`), 5-tab admin UI (`PipelineDesigner`,
  `TerritoryManager`, `AssignmentRuleBuilder`, `AutomationBuilder`, `SLAManager`), seeded with an
  Opportunity Pipeline (7 stages = OPP_STAGES), a Lead Pipeline (7 stages = LEAD_STAGES), 3
  automation rules and 5 SLA rules. **Does not modify live CRM screens; all DB calls are
  try/catch-guarded.** Automation rules fire on real events (`lead.created`,
  `opportunity.stage_changed/won/lost`). Reachable via the Settings page card.
- **Approval Engine wired into CRM** *(2026-06-05, UNCOMMITTED)* — opportunity save triggers
  `LARGE_DEAL_APPROVAL` (>₹50L) and `DISCOUNT_APPROVAL` (discount first >0%); expense submit triggers
  `EXPENSE_APPROVAL` (>₹0.10L). All via `startApproval()` fire-and-forget — a missing/unconfigured
  workflow silently skips and the save never fails.
- **Pipeline lifecycle flow** *(2026-06-05, UNCOMMITTED)* — leads auto-convert to opportunities at
  PROPOSAL_SENT (hidden from Leads, surfaced in Opportunities, auto-navigate on transition);
  opportunity detail page has a full edit form + **Close Won** (Deal Value ex-tax, Net Profit ₹L,
  PO Number, PO Date) and **Close Lost** (reason) modals; WON/LOST deals are **locked read-only**
  (non-managers blocked at the API). **Legacy SalesFunnel deals are promotable** to real
  CrmOpportunities ("Open →" → `/api/pipeline/opportunities/promote`), giving imported deals the
  full edit/close experience. SLA badges on lead/opp cards + a leads-table SLA column.
- **Integration Center — Phase 12** *(2026-06-10, UNCOMMITTED, dev DB applied)* — `/settings/integrations`,
  a 10-tab admin console for external service connectors: `src/lib/integration-engine/` (providers,
  connections, credentials, logs, test); 5 API routes under `/api/admin/integrations/`; 11 seeded
  INACTIVE providers (SMTP, M365, Google Workspace, GST, PAN, Google Maps, WhatsApp Business, SMS,
  Teams Webhook, Tally, Generic Webhook). Credentials stored as env-var references (`secretRef`) only —
  raw secrets never persisted. Dry-run `testConnection()` — no live external calls by default.
- **SFDC-style Lead Standardization** *(2026-06-18, UNCOMMITTED, dev DB migration applied)* — `CrmLead.customerRefId` FK to `Customer` table; `CustomerNameCombobox` single smart field (auto-links on match, free-text for new prospects); `ConvertModal` on both lead list (`LeadsClient.tsx`) and detail page (`LeadDetailClient.tsx`); `POST /api/pipeline/leads/[id]/convert` creates Customer master + `CrmOpportunity` + sets stage to `PROPOSAL_SENT`. Idempotent.
- **RBAC Role Assignment UI + HR Automation** *(2026-06-18, UNCOMMITTED)* — Assign/Remove toggles per role in the Employees tab Manage drawer. PATCH endpoint handles `addRoleId`/`removeRoleId`. HR automation: deactivating/suspending employee deletes all `UserRole` records automatically.
- **Employee Form Dropdown Wiring** *(2026-06-18, UNCOMMITTED)* — Department / Designation / Reports-To dropdowns wired from master tables; sets both FK ids (`EmployeeProfile`) and name strings (`Employee` table) in sync on save.
- **Enterprise Security Center — Phase 13** *(2026-06-10, UNCOMMITTED, dev DB applied, browser verified)* —
  `/settings/security`, an 8-tab configurable security policy console: `src/lib/security-engine/`
  (password-policy, mfa, session, access-policy, data-protection, security-log, index); 7 API routes
  under `/api/admin/security/`; 5 default policies seeded (password length 8/90d expiry, MFA disabled,
  8h sessions, no IP restriction, 1000-record export limit). `evaluateSecurityPolicy()` is **fail-open**
  — returns `ALLOW` on any error. **Policies are non-enforcing** until explicitly integrated into auth.
  Existing login/sessions are completely unaffected. Security event log with 14 event types.

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

## Technical Debt

| Item | Introduced | Impact |
|---|---|---|
| `xlsx@0.18.5` HIGH advisory | Pre-session 1 | Import feature only; no remote trigger |
| Finance Phase 2 UI on mock data | Session 2 | 11 pages + mobile screens need backend wiring |
| Expense Categories / Vendor Master / Customer Master on mock data | Session 2 | Need backend APIs against existing Prisma models |
| `netProfitLakhs` rows from pre-rename era | Session 4 | Seeded rows may hold stale "%" values |
| Two coexisting RBAC systems | Pre-session 1 | `rbac.ts` DB matrix + `roles.ts` predicates both active |
| Client-side-only RBAC on Global Masters | Session 2 | Vendor/Customer Master capabilities not server-enforced |
| `canEdit || isOpsHead || isManager` fallback on settings pages | Session 3 | Dev-safe; needs tightening for prod |
| Money fields as `DOUBLE` not `Decimal(12,4)` | Pre-session 1 | Finance totals accumulate float error |
| Security policies non-enforcing | Session 6 | Engine built but not wired into auth |
| Integration connections not making live calls | Session 6 | Dry-run only; needs wiring per integration type |
| UAT DB migration not applied | Session 7 | `customerRefId` column missing on UAT — leads page broken until applied |
| Legacy `lead-generation` form not standardized | Session 7 | Old form still uses free-text `customerId`; Phase 17 deferred |

## Recommended Next Steps

1. **Apply UAT DB migration** (`20260618100000_crm_lead_customer_ref`) on UAT server — leads page is broken on UAT until done.
2. **Browser-verify the convert flow** on localhost then push to UAT git:
   - `git add -A && git commit -m "feat(crm): SFDC-style lead standardization + RBAC role assignment + HR automation"`
   - `git push origin uat`
3. **Wire password validation** — call `validatePasswordAgainstPolicy()` in any future password-change flow. Low risk; already fail-open.
4. **Wire data export guard** — call `canExportData()` before any CSV/XLSX export route returns data. First real use of the security engine.
5. **Finance backend wiring** — pick one Finance Phase 2 module (e.g. Bank Book) and wire it against the existing Phase-1 Prisma models. The `data.ts` type shapes are the contract.

## 4b. In-progress / Decisions this session

### Session 7 (2026-06-18) — SFDC Lead Standardization

- **Single combobox decision:** one `CustomerNameCombobox` field replaces two separate fields (free-text `companyName` + `CrmSelect type="customers"` dropdown). Auto-detects match against Customer master on select; free-text for new prospects. `customerRefId` null = prospect; non-null = linked master.
- **Conversion is explicit, not automatic:** "Convert →" button only appears at QUALIFIED+; not at NEW_LEAD/CONTACTED. Deliberate — salesperson triggers the conversion.
- **New customer at conversion:** form prompts name (required), district, state, pincode, address, optional GST. Creates Customer master via canonical Prisma create (same model as `/api/customers/master`). `crmSource: "lead_conversion"` tag set for audit.
- **Idempotency of convert endpoint:** checks `lead.opportunity` before creating; re-running same convert is safe.
- **HR automation scope:** only triggers on INACTIVE/SUSPENDED status change (not ACTIVE → other transitions). Fire-and-forget pattern; never blocks save.

### Session 6 (2026-06-10) — Integration Center + Security Center

- **Credential storage decision:** `secretRef` stores env var NAME only (not the secret). Rationale: avoids secrets at rest in the DB entirely; ops team sets OS env vars; the UI shows `[set]` when the var is present. `resolveSecret()` is server-only and never exposed in API responses.
- **Fail-open is mandatory for security engine:** `evaluateSecurityPolicy()` returns `ALLOW` on any error. Rationale: a policy engine bug should never lock users out of the system. Enforcing policies must be an explicit, deliberate integration step.
- **Phase 13 is final:** user directive "STOP after Security Center. Do not implement Governance module." All Settings Admin phases (8–13) are now complete.
- **MFA policy disabled by default:** seeded with `enabled=false`; `isMFARequired()` always returns false unless explicitly activated in the MFA tab.
- **Security event log is append-only / fire-silent:** log writes never throw; a log failure never affects the underlying operation.

### Session 4 (2026-06-05) — CRM Admin Engine + Approval wiring + Pipeline flow
- **Legacy deals promote to real opportunities** rather than enhancing the limited legacy modal.
  Rationale: gives imported deals the *same* full edit + Close-Won/Lost experience and aligns with
  the SalesFunnel → CRM migration direction. Idempotent via `SalesFunnel.crmOpportunityId`; promoted
  rows are filtered out of the legacy list (`crmOpportunityId: null`). Old `LegacyEditModal` removed.
- **Net profit stored as absolute ₹ Lakhs**, not a percentage — column renamed `netMargin` →
  `netProfitLakhs`. (User-requested; clearer for finance reconciliation.)
- **PROPOSAL_SENT is the lead→opportunity boundary** — such leads are hidden from the Leads view at
  the DB layer (`stage: { not: "PROPOSAL_SENT" }`) so they appear *only* on Opportunities. Avoids
  double-listing the same deal.
- **WON/LOST are terminal + locked** — UI hides the edit form and the API returns 403 for
  non-managers editing a closed deal. Closing requires PO Number + Deal Value (Won) or reason (Lost).
- **Approval/automation hooks are fire-and-forget** — wrapped in try/catch so CRM saves never fail
  if the workflow/automation engine is unconfigured.
- **Migration mechanics on Hostinger (no shadow DB)** — hand-write SQL → apply via one-off
  `node apply-*.mjs` (mariadb driver) → `prisma migrate resolve --applied` → `prisma generate` →
  restart dev server. Used for all 4 migrations this session.
- **Prisma acronym casing** — client accessors are `prisma.cRMAutomationRule` / `prisma.sLARule`;
  type imports are `CRMAutomationRuleModel` / `SLARuleModel`. crm-engine re-exports friendly aliases.


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
7. **Dual RBAC** — `hasPermission()` (DB) and `roles.ts` predicates can disagree. *(The Approval Engine object-level gap this overlapped with — any employee could act on any approval request — was fixed 2026-06-20; see the dated note at the top of §0 and `docs/RBAC_AUDIT_REPORT.md` §10 item 1. The general dual-RBAC consolidation itself is still open.)*
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
13. **🟠 PWA service worker (`caveo-crm-v1`) serves stale assets in dev.** Edits/`​.next`
    clears/server restarts can all be masked by the cached app shell. Unregister SW + clear
    caches in DevTools, then hard reload. Fix pending: skip SW registration in dev. (Cost us
    significant debugging time this session.)
14. **Turbopack doesn't pick up newly-created files without a server restart** (edits are fine).
    Orphaned `next dev` processes can also hold port 3000 and serve old code.
15. **All Finance Phase 2 UI is mock data** — no persistence. The Bank↔Cash transfer store is
    in-memory and resets on hard reload. Money shown in ₹ rupees (finance pages) vs ₹ Lakhs
    (rest of app) — reconcile when wiring the backend.
16. **2026-06-04 modules are mock & client-gated** — Expense Categories, Vendor Master, Customer
    Master have no APIs and only client-side RBAC. Money in ₹ rupees. Customer/Vendor masters
    target the existing `Customer`/`Vendor` models (extend, don't duplicate).
17. **Two "Customer Master" nav entries** — global `/masters/customers` (mock) and operational
    `/customers` (real DB). Confusing until consolidated; decision pending.
18. **Orphaned `next dev` breaks dev login** — a stray process on port 3000 serves a stale
    Turbopack route tree where `/api/dev/switch` 404s, so quick-login can't set the cookie.
    Recovery: kill the port-3000 process, `rm -rf .next`, restart. (CLAUDE.md gotcha #10.)
19. **Session-4 work is large & uncommitted** — Phase 8 CRM Admin Engine, approval wiring, and the
    pipeline lifecycle flow span 14 modified + ~10 new files/dirs. None committed. `next build` not
    yet run against this batch — run it before pushing.
20. **`netProfitLakhs` semantics changed mid-session** — rows closed-Won *before* the `netMargin`→
    `netProfitLakhs` rename may hold a leftover "%" number now interpreted as ₹L. Dev test data only.
21. **CRM-admin seed ran twice early in the session** producing duplicate stages; cleaned up via a
    one-off script. If re-seeding, the seed `upsertStage` is keyed by create (not upsert) — guard
    against duplicates or truncate `pipeline_stage` first.
22. **`scripts/db-copy-prod-to-dev.mjs`** (untracked) copies prod → dev DB; contains/uses live DB
    creds. Treat as sensitive; do not commit with secrets.

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
- **Lead → Opportunity:** moving a `CrmLead` to **PROPOSAL_SENT** auto-creates a `CrmOpportunity`
  and hides the lead from the Leads view (it now lives on Opportunities).
- **Opportunity close (CRM):** **Closed Won** requires `poNumber` + `dealValueExTax` (>0);
  **Closed Lost** requires `lostReason`. Once WON/LOST, the deal is read-only (API 403 for
  non-managers). `netProfitLakhs` is an absolute ₹L figure (not a %).
- **CRM Approvals:** opportunity value first crossing ₹50L → `LARGE_DEAL_APPROVAL`; discount first
  set >0% → `DISCOUNT_APPROVAL`; expense submitted >₹0.10L → `EXPENSE_APPROVAL`. All fire-and-forget.
- **Legacy promotion:** an imported SalesFunnel deal becomes a real opportunity on "Open →"
  (idempotent via `SalesFunnel.crmOpportunityId`); the legacy row is then hidden from the funnel.

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
- **Session-4 work (Phase 8 CRM Admin + pipeline flow) is uncommitted** — commit + `next build`
  before pushing. `executeAutomation`'s `send_notification` action is a stub (no Notification wiring
  yet). CRM-admin seed `upsertStage` creates (not upserts) → re-running can duplicate stages.
- **Enterprise Admin Console (Phases 1–8) is built** (`/settings/*` incl. `/settings/crm`).
  Architecture plan in `docs/ADMIN_ARCHITECTURE_PLAN.md`. Remaining: the legacy
  `/settings/administration` flat-tab panel still coexists with the newer per-module pages —
  converge or retire it.
- **Two "Customer Master" surfaces (2026-06-04).** The new global `/masters/customers` (enterprise
  UI, mock) and the legacy operational `/customers` (real DB + CRM import/dedupe) both exist and
  both appear in the sidebar. Non-destructive by design, but must converge: fold import/dedupe into
  the global master and back it with the existing `Customer` model. Decision asked of Vijesh.
- **Three new 2026-06-04 modules are all mock & uncommitted** — Expense Categories (8 files),
  Vendor Master (14), Customer Master (16). No APIs/persistence; gating is client-side only.
  Shapes in each `data.ts` are the backend contract. Customer/Vendor masters must wire to the
  **existing** `Customer`/`Vendor` models (extend, never duplicate).
- **Finance Phase 2 UI is all mock & uncommitted** — ~45 files under `src/app/finance/` run on
  in-memory mock data (each module's `data.ts`). No APIs/persistence. The Bank↔Cash transfer
  store resets on hard reload. Needs backend wiring (shapes already defined in `data.ts`).
- **Finance money unit mismatch** — finance web pages use ₹ rupees; the rest of the app uses
  ₹ Lakhs. Normalise (likely to Lakhs + `@db.Decimal`) when persisting.
- **Duplicate expense entry UIs** — `/finance/expenses/new/ExpenseEntryForm.tsx` (full page)
  vs the richer `ExpenseForm` drawer in the register. Consolidate.
- **Service worker not dev-safe** — `ServiceWorkerRegistrar` caches the shell and serves stale
  assets in dev; make it skip dev / network-first.
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
1. **Commit this session's work** (confirm with Vijesh; stage in chunks):
   approval-wiring → crm-engine (Phase 8) → pipeline lead→opp flow + SLA → opportunity
   full-edit/close/legacy-promotion. Run `npx tsc --noEmit` + `npx next build` first.
2. **Decide whether to push** — Phase 8 + pipeline flow touch live CRM screens (additively).
   Verify `200` on prod `/login`, then `git push origin master` after Vijesh confirms.
3. **Finish automation dispatch** — `executeAutomation` `send_notification` is a stub; wire it to
   the `Notification` model so automation rules actually notify.
4. **Earlier backlog still open** — commit the Finance/Masters UI mock modules (sessions 2–3);
   begin Finance Operations backend (Expense Register CRUD) **only when asked** (was a STOP point);
   consolidate the two Customer Master nav entries.
5. **Ledger persistence** — `src/lib/finance/bank-ledger.ts` per `BANK_LEDGER_MAPPING.md`.
6. Carryover: service-worker dev fix; wrap `recordPayment`/`applyAdvance` in `$transaction`;
   `@db.Decimal(12,4)` money; rotate dev DB creds (`Caveo@2026`) + prune Remote-MySQL whitelist;
   remove `better-sqlite3`; mitigate `xlsx@0.18.5`; remove orphaned `public/maintenance.html`.

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
