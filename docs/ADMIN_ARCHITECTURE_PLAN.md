# Enterprise Admin Console — Architecture Plan

> **Status:** Draft · **Author:** Vijesh Vijayan · **Date:** 2026-06-04
> **Scope:** Caveo CRM (`kra-tracker`) — Next.js 16 / Prisma 7 / MariaDB 11.8

---

## 1. Executive Summary

The current admin panel (`/settings/administration`) is a single-page flat list of `AppSetting`
key-value pairs split into 14 tabs. It has grown organically to cover pipeline config, KRA
targets, finance ops, approval rules, and notification preferences — all in one component with
no separation of concerns, no audit trail, and no multi-level access control.

This plan defines a **12-module Enterprise Admin Console** that replaces the flat settings page
with a structured, role-gated, change-tracked configuration system. The migration is
non-destructive: all existing `AppSetting` rows are preserved and re-mapped; no data is deleted.

**Key outcomes:**
- RBAC deepens from 4 booleans to **Module × Action × DataScope**
- Every config change goes through a **Draft → Review → Publish** lifecycle with full audit
- Org model adds **Company → Branch → Department → Team** hierarchy
- Approval engine becomes a **persisted workflow definition** (not UI-only mock)
- All masters (Customer, Vendor) are **global records** referenced by every module

---

## 2. Current Architecture Analysis

### 2.1 Folder Structure (as-is)

```
src/app/settings/
├── page.tsx                        # renders SettingsHub
├── SettingsHub.tsx                 # 26-card navigation grid
├── administration/
│   └── page.tsx                    # renders AdminClient
├── users-roles/
│   └── page.tsx                    # renders RolesClient
└── workflow/
    └── approval-engine/
        ├── page.tsx
        ├── ApprovalEngineClient.tsx
        └── data.ts                 # mock data only

src/app/admin/
└── AdminClient.tsx                 # 14-tab flat settings editor

src/lib/
├── settings.ts                     # getSetting / setSetting / SETTING_DEFAULTS / SETTING_META
├── roles.ts                        # hardcoded role predicates (isOperationsHead, etc.)
└── rbac.ts                         # AppRole / RolePageAccess / hasPermission
```

### 2.2 Key Components

| Component | Purpose | Problem |
|---|---|---|
| `AdminClient.tsx` | 14-tab settings editor | Monolithic; no audit; no lifecycle |
| `SettingsHub.tsx` | Navigation grid | Flat; no permission gating per card |
| `ApprovalEngineClient.tsx` | Workflow builder UI | Mock data only; not persisted |
| `RolesClient.tsx` | Role + permission editor | Shallow RBAC (4 booleans) |
| `settings.ts` | Key-value store helpers | No versioning; no change history |
| `roles.ts` | Role predicates | Hardcoded strings; duplicates DB data |
| `rbac.ts` | Permission checks | No data scope; managers always bypass |

### 2.3 Current API Surface

| Route | What it does |
|---|---|
| `GET /api/settings` | Returns all `AppSetting` rows |
| `POST /api/settings` | Upserts a single `{key, value}` pair |
| `GET /api/roles` | Lists `AppRole` + `RolePageAccess` |
| `POST /api/roles` | Creates/updates a role |

### 2.4 Identified Problems

1. **Flat settings store** — `AppSetting` is a `key=value` table with no module, version, or
   approval state. A change to finance thresholds and a change to voucher prefixes look identical.

2. **Dual auth systems** — `roles.ts` uses hardcoded regex predicates; `rbac.ts` uses the DB.
   They can disagree silently (e.g. `isOperationsHead` regex vs `RolePageAccess` row).

3. **Shallow RBAC** — `RolePageAccess` has 4 boolean actions (`canView`, `canCreate`,
   `canEdit`, `canDelete`) and no data scope. There is no way to say "this manager can view
   team expenses but not company-wide expenses."

4. **No workflow persistence** — `ApprovalEngineClient` is a fully-functional UI but all
   workflow definitions live in `data.ts` mock arrays. Nothing is saved to the database.

5. **No org model** — the app has `Employee.role` (string) and `isManager` (boolean) but no
   formal Company / Branch / Department / Team hierarchy. Reporting lines are implicit.

6. **No config lifecycle** — settings changes take effect immediately with no review, no
   rollback, and no audit trail. A mis-typed GST rate goes live instantly.

7. **Too many tabs in one component** — `AdminClient.tsx` handles Pipeline, KRA, Sales, Finance,
   System, Notifications, and more in one 800+ line component. Adding a new module means editing
   this file.

8. **No tenant/multi-company model** — currently hardcoded for Caveo Infosystems. Expanding to
   multiple companies or branches requires a schema change and major refactor.

9. **Masters are not truly global** — Customer and Vendor masters exist as UI but share no
   formal link back to `Employee`, `Expense`, `Voucher`, etc. at the DB level.

---

## 3. Target Admin Architecture

### 3.1 Twelve Modules

| # | Module | URL | Owner Role |
|---|---|---|---|
| 1 | **Organization** | `/admin/organization` | Super Admin |
| 2 | **Identity & Access (IAM)** | `/admin/iam` | Super Admin |
| 3 | **CRM Admin** | `/admin/crm` | Sales Head / Ops Head |
| 4 | **Workflow Center** | `/admin/workflow` | Ops Head |
| 5 | **Masters** | `/admin/masters` | Ops Head / Accounts |
| 6 | **Finance Admin** | `/admin/finance` | Accounts Admin |
| 7 | **Performance (KRA)** | `/admin/performance` | HR / Manager |
| 8 | **Communications** | `/admin/communications` | Ops Head |
| 9 | **Analytics & Reports** | `/admin/analytics` | Manager+ |
| 10 | **Integrations** | `/admin/integrations` | Super Admin |
| 11 | **Security** | `/admin/security` | Super Admin |
| 12 | **Governance & Audit** | `/admin/governance` | Super Admin / Audit |

### 3.2 Module Detail

#### Module 1 — Organization
- Company profile (name, GSTIN, registered address, logo)
- Branch management (add / edit / deactivate branches)
- Department & team hierarchy
- Designation master (grade code, salary band, KRA template)
- Org chart visualization

#### Module 2 — Identity & Access (IAM)
- User directory (create, deactivate, reset password link)
- Role definitions (name, parent role, module access)
- Permission matrix (Module × Action × DataScope)
- Permission groups (bulk-assign permissions to a role)
- Data access policies (own / team / branch / company / all)
- Session & token settings

#### Module 3 — CRM Admin
- Pipeline stage definitions (name, probability, required fields)
- Lead source master
- Sales funnel weight config (currently in AdminClient "Pipeline" tab)
- KRA weights for sales reps (currently in AdminClient "KRA" tab)
- Activity type master (call / meeting / demo / site visit)

#### Module 4 — Workflow Center
- Workflow definitions (persisted, replaces mock `data.ts`)
- Approval rule builder (module → trigger → levels → escalation)
- Delegation rules (out-of-office, date range)
- Escalation policies
- SLA configuration per workflow type

#### Module 5 — Masters
- Customer Master (global; referenced by CRM, Finance, Projects, Support)
- Vendor Master (global; referenced by Finance, Procurement, Expenses)
- Product / SKU Master
- Tax Master (GST slabs, HSN/SAC codes)
- Currency & exchange rates
- Unit of measure

#### Module 6 — Finance Admin
- Chart of accounts (FinAccount)
- Expense category config (currently at `/finance/expenses/categories`)
- Voucher number series (prefix, FY reset)
- Conveyance rate per km
- Advance policy (max months salary, recovery schedule)
- Approval thresholds (auto-approve below ₹X)
- Fiscal year settings

#### Module 7 — Performance (KRA)
- KRA template library (create, clone, version)
- Scoring bands (currently in AdminClient "Scoring Bands" tab)
- Target calendar (weekly / monthly / quarterly)
- Review cycle settings
- KPI benchmark configuration

#### Module 8 — Communications
- Email template editor (approval, reminder, escalation, OTP)
- Push notification preferences per role
- SMS gateway config
- In-app notification rules
- Digest frequency settings

#### Module 9 — Analytics & Reports
- Report template library
- Dashboard widget config per role
- Export format settings (XLSX, PDF, CSV)
- Scheduled report delivery
- Data retention policy

#### Module 10 — Integrations
- Tally Prime mapping (account codes, cost centres)
- Microsoft 365 / Entra ID SSO settings
- Webhook endpoints (outgoing events)
- API key management (external consumers)
- Mobile app (Capacitor) build config

#### Module 11 — Security
- Password / session policy
- IP allowlist
- MFA settings
- Login audit (last N sessions)
- Blocked account management

#### Module 12 — Governance & Audit
- Full config change history (who changed what, when, old value, new value)
- Approval request audit trail
- Data export log
- System health overview
- Active session monitor

---

## 4. Architecture Decisions

### AD-1 — Org Model
**Decision:** `Company → Branch → Department → Team` four-level hierarchy.

`Company` is the root tenant. `Branch` maps to a physical or virtual office. `Department`
groups functions (Sales, Finance, Engineering). `Team` is the smallest unit with a manager.
`Employee` gets `branchId`, `departmentId`, `teamId`, and `designationId` foreign keys.

**Rationale:** Caveo Infosystems already operates from multiple locations. The hierarchy
enables branch-scoped reporting and future multi-company expansion without a schema rewrite.

### AD-2 — Company Model
**Decision:** Single-tenant for now; schema is multi-tenant ready.

Every master table (`AppRole`, `WorkflowDefinition`, `ExpenseCategory`, etc.) gets a nullable
`companyId` FK. Null = system default. When multi-tenancy is enabled, rows are partitioned by
`companyId`. This avoids a full rewrite later.

### AD-3 — User Model
**Decision:** Extend `Employee`, do not create a separate `User` table.

`Employee` already has `email`, `isManager`, `role`. Add `userId` (Azure OID), `status`
(`active|inactive|suspended`), `lastLoginAt`, and the hierarchy FKs. Avoids a JOIN on every
auth check.

### AD-4 — Security Model
**Decision:** JWT remains the session token. Add `sessionId` to the JWT payload.

`AuditLog.sessionId` will trace every config write back to a specific login session. No change
to the NextAuth v5 / Entra ID flow. The `dev_employee_id` cookie dev bypass is preserved.

### AD-5 — Permission Depth
**Decision:** `Module × Action × DataScope` replaces 4 boolean columns.

```
RoleModulePermission {
  roleId       FK AppRole
  module       Enum (crm | finance | performance | workflow | masters | ...)
  action       Enum (view | create | edit | delete | approve | export | import | configure)
  dataScope    Enum (own | team | branch | company | all)
}
```

`hasPermission(roleId, module, action, dataScope)` replaces the current page-key-based check.
Old `RolePageAccess` rows are migrated to the new table; the old table is deprecated.

### AD-6 — Approval Architecture
**Decision:** Persist workflow definitions in `WorkflowDefinition` + `WorkflowRule` +
`WorkflowLevel`. The mock `data.ts` arrays define the shape; the DB tables implement it.

`ApprovalRequest` and `ApprovalHistory` track live requests. `DelegationRule` and
`EscalationRule` are child tables. The UI (`ApprovalEngineClient`) is wired to CRUD APIs
instead of the mock arrays — no visual change required.

### AD-7 — Masters
**Decision:** `Customer` and `Vendor` are **global singleton records** with a common `masterId`.

Every module references `Customer.id` or `Vendor.id` directly. There are no per-module
customer/vendor tables. Child tables (`CustomerSite`, `VendorGSTIN`, `VendorBankAccount`)
extend the master record. The existing `Customer` Prisma model is extended, not replaced.

### AD-8 — Record Visibility
**Decision:** `DataAccessPolicy` table drives what data each role can see.

```
DataAccessPolicy {
  roleId      FK AppRole
  module      Enum
  scope       Enum (own | team | branch | company | all)
  filter      JSON   -- additional where-clause fragments
}
```

Server-side query builders read `DataAccessPolicy` to append `WHERE` clauses before executing
Prisma queries. This replaces the current `isManager` boolean guards in page server components.

### AD-9 — Config Lifecycle
**Decision:** All settings changes follow **Draft → Review → Publish** with version numbers.

```
ConfigurationVersion {
  settingKey   String
  value        Json
  version      Int         -- auto-increment per key
  status       Enum (draft | in_review | published | rolled_back)
  changedBy    FK Employee
  reviewedBy   FK Employee  nullable
  publishedAt  DateTime     nullable
  note         String       @db.Text  nullable
}
```

`getSetting()` reads the latest `published` version. `setSetting()` creates a `draft` row.
Publish requires a reviewer with `configure` permission on the module. Rollback sets the
previous published version back to `published` and marks the current one `rolled_back`.

---

## 5. Target Folder Structure

```
src/app/
├── admin-console/                  # NEW — replaces /settings/administration
│   ├── layout.tsx                  # AdminConsoleLayout (sidebar + breadcrumb)
│   ├── page.tsx                    # AdminConsoleLanding (12-module grid)
│   │
│   ├── organization/
│   │   ├── page.tsx
│   │   ├── OrganizationClient.tsx
│   │   ├── components/
│   │   │   ├── CompanyForm.tsx
│   │   │   ├── BranchTable.tsx
│   │   │   ├── DepartmentTree.tsx
│   │   │   └── DesignationForm.tsx
│   │   └── data.ts
│   │
│   ├── iam/
│   │   ├── page.tsx
│   │   ├── IamClient.tsx
│   │   ├── components/
│   │   │   ├── UserDirectory.tsx
│   │   │   ├── RoleMatrix.tsx
│   │   │   ├── PermissionGrid.tsx  # Module × Action × DataScope editor
│   │   │   └── PolicyEditor.tsx
│   │   └── data.ts
│   │
│   ├── workflow/
│   │   ├── page.tsx
│   │   ├── WorkflowClient.tsx
│   │   ├── components/
│   │   │   ├── WorkflowBuilder.tsx
│   │   │   ├── LevelEditor.tsx
│   │   │   ├── DelegationRules.tsx
│   │   │   └── EscalationEditor.tsx
│   │   └── data.ts                 # migrated from /settings/workflow/approval-engine/data.ts
│   │
│   ├── finance/
│   │   ├── page.tsx
│   │   ├── FinanceAdminClient.tsx
│   │   └── components/
│   │       ├── ChartOfAccounts.tsx
│   │       ├── VoucherSeriesEditor.tsx
│   │       └── ExpensePolicyForm.tsx
│   │
│   ├── performance/
│   │   ├── page.tsx
│   │   ├── PerformanceAdminClient.tsx
│   │   └── components/
│   │       ├── KraTemplateEditor.tsx
│   │       ├── ScoringBandEditor.tsx
│   │       └── TargetCalendar.tsx
│   │
│   ├── communications/
│   ├── analytics/
│   ├── integrations/
│   ├── security/
│   └── governance/
│
├── settings/                       # KEPT — navigation hub only
│   ├── page.tsx                    # SettingsHub (26-card grid; redirects into admin-console)
│   ├── SettingsHub.tsx
│   └── users-roles/                # deprecated → /admin-console/iam
│
└── masters/                        # KEPT — operational pages
    ├── customers/
    └── vendors/
```

---

## 6. Database Architecture Plan

> **Constraint:** Do NOT modify `schema.prisma` until the UI layer is validated.
> The models below are the **design target** — they are implemented in Phase 3 (IAM/RBAC)
> and Phase 4 (Workflow Engine) of the migration strategy.

### 6.1 Organization Layer

```prisma
model Company {
  id          Int      @id @default(autoincrement())
  name        String
  gstin       String?
  address     String?  @db.Text
  logoUrl     String?
  branches    Branch[]
  createdAt   DateTime @default(now())
}

model Branch {
  id           Int          @id @default(autoincrement())
  companyId    Int
  company      Company      @relation(fields: [companyId], references: [id])
  name         String
  city         String?
  gstin        String?
  employees    Employee[]
  @@index([companyId])
}

model Department {
  id        Int        @id @default(autoincrement())
  name      String
  headId    Int?
  head      Employee?  @relation("DeptHead", fields: [headId], references: [id])
  teams     Team[]
  @@index([headId])
}

model Team {
  id           Int        @id @default(autoincrement())
  name         String
  departmentId Int
  department   Department @relation(fields: [departmentId], references: [id])
  managerId    Int?
  manager      Employee?  @relation("TeamManager", fields: [managerId], references: [id])
  members      Employee[]
  @@index([departmentId])
  @@index([managerId])
}

model Designation {
  id         Int        @id @default(autoincrement())
  title      String
  gradeCode  String     @unique
  level      Int
  employees  Employee[]
}
```

### 6.2 Identity & Access Layer

```prisma
// Extensions to Employee (add columns, no new table)
// branchId      Int?    → Branch
// departmentId  Int?    → Department
// teamId        Int?    → Team
// designationId Int?    → Designation
// status        Enum    active | inactive | suspended
// lastLoginAt   DateTime?

model RoleModulePermission {
  id         Int      @id @default(autoincrement())
  roleId     Int
  role       AppRole  @relation(fields: [roleId], references: [id], onDelete: Cascade)
  module     String   // crm | finance | performance | workflow | masters | iam | org | ...
  action     String   // view | create | edit | delete | approve | export | import | configure
  dataScope  String   // own | team | branch | company | all
  @@unique([roleId, module, action])
  @@index([roleId])
}

model DataAccessPolicy {
  id       Int     @id @default(autoincrement())
  roleId   Int
  role     AppRole @relation(fields: [roleId], references: [id], onDelete: Cascade)
  module   String
  scope    String  // own | team | branch | company | all
  filter   Json?
  @@unique([roleId, module])
  @@index([roleId])
}
```

### 6.3 Workflow Layer

```prisma
model WorkflowDefinition {
  id          Int             @id @default(autoincrement())
  name        String
  module      String          // finance | hr | crm | procurement
  trigger     String          // expense_submit | advance_request | leave_apply
  isActive    Boolean         @default(true)
  companyId   Int?
  rules       WorkflowRule[]
  requests    ApprovalRequest[]
  createdAt   DateTime        @default(now())
  @@index([module, trigger])
}

model WorkflowRule {
  id           Int                @id @default(autoincrement())
  workflowId   Int
  workflow     WorkflowDefinition @relation(fields: [workflowId], references: [id])
  conditionJson Json              // {field, operator, value}
  levels       WorkflowLevel[]
  @@index([workflowId])
}

model WorkflowLevel {
  id            Int          @id @default(autoincrement())
  ruleId        Int
  rule          WorkflowRule @relation(fields: [ruleId], references: [id])
  levelOrder    Int
  approverRoleId Int?
  approverEmpId  Int?
  slaHours      Int          @default(24)
  escalationId  Int?
  @@index([ruleId])
}

model ApprovalRequest {
  id           Int                @id @default(autoincrement())
  workflowId   Int
  workflow     WorkflowDefinition @relation(fields: [workflowId], references: [id])
  referenceId  String             // e.g. expense ID, advance ID
  referenceType String
  requestorId  Int
  requestor    Employee           @relation("Requestor", fields: [requestorId], references: [id])
  status       String             // pending | approved | rejected | escalated | withdrawn
  currentLevel Int                @default(1)
  history      ApprovalHistory[]
  createdAt    DateTime           @default(now())
  @@index([workflowId])
  @@index([requestorId])
  @@index([referenceType, referenceId])
}

model ApprovalHistory {
  id         Int             @id @default(autoincrement())
  requestId  Int
  request    ApprovalRequest @relation(fields: [requestId], references: [id])
  actorId    Int
  actor      Employee        @relation("ApprovalActor", fields: [actorId], references: [id])
  action     String          // approved | rejected | delegated | escalated
  comment    String?         @db.Text
  level      Int
  actedAt    DateTime        @default(now())
  @@index([requestId])
}

model DelegationRule {
  id           Int      @id @default(autoincrement())
  delegatorId  Int
  delegateId   Int
  module       String?  // null = all modules
  fromDate     DateTime
  toDate       DateTime
  isActive     Boolean  @default(true)
  @@index([delegatorId])
}
```

### 6.4 Configuration Layer

```prisma
// Extension to AppSetting
// module   String  — which admin module owns this key
// version  Int     — auto-increment per key
// status   Enum    — draft | in_review | published | rolled_back

model ConfigurationVersion {
  id           Int      @id @default(autoincrement())
  settingKey   String
  value        Json
  version      Int
  module       String
  status       String   @default("draft")  // draft|in_review|published|rolled_back
  changedById  Int
  changedBy    Employee @relation("ConfigChanger", fields: [changedById], references: [id])
  reviewedById Int?
  reviewedBy   Employee? @relation("ConfigReviewer", fields: [reviewedById], references: [id])
  publishedAt  DateTime?
  note         String?  @db.Text
  createdAt    DateTime @default(now())
  @@unique([settingKey, version])
  @@index([settingKey, status])
}
```

---

## 7. Migration Strategy

> **Philosophy:** Each phase ships a working UI. No phase deletes existing functionality.
> The old routes continue to work until Phase 6 deprecation sweep.

### Phase 1 — Foundation (Sprints 1–2)
**Goal:** New routing skeleton, layout, and landing page. Zero DB changes.

- Create `src/app/admin-console/` with `layout.tsx` and `page.tsx`
- Build `AdminConsoleLanding` (12-module grid, mirrors SettingsHub style)
- Add sidebar link "Admin Console" gated on `canAccessSettings()`
- Stub all 12 module pages (`page.tsx` → "Coming soon" placeholder)
- Add redirect: old `/settings/administration` → `/admin-console` (with a banner)

**Deliverable:** Admin Console is navigable; old settings still works.

### Phase 2 — Organization (Sprint 3)
**Goal:** Company, Branch, Department, Team, Designation UI with mock data.

- Build `admin-console/organization/` — all 4 hierarchy levels
- `CompanyForm`, `BranchTable`, `DepartmentTree`, `DesignationForm` components
- Mock data in `organization/data.ts`
- Wire `Employee` profile page to show Branch / Department / Team labels

**DB change (deferred):** `Company`, `Branch`, `Department`, `Team`, `Designation` models +
FK columns on `Employee`. Run after UI is reviewed.

### Phase 3 — IAM & RBAC (Sprints 4–5)
**Goal:** Replace `roles.ts` predicates + `RolePageAccess` 4-boolean model with full
`RoleModulePermission` + `DataAccessPolicy`.

- Build `admin-console/iam/` — `UserDirectory`, `RoleMatrix`, `PermissionGrid`
- New `hasPermission(roleId, module, action, scope)` in `rbac.ts`
- Migrate existing `RolePageAccess` rows to `RoleModulePermission`
- Remove hardcoded predicates from `roles.ts` one by one; keep as thin wrappers during
  transition
- `DataAccessPolicy` table drives server-side query filters

**DB change:** `RoleModulePermission`, `DataAccessPolicy`, extensions to `AppRole`.

### Phase 4 — Workflow Engine (Sprints 6–7)
**Goal:** Persist approval workflow definitions; wire `ApprovalEngineClient` to real CRUD.

- Build `admin-console/workflow/` — `WorkflowBuilder`, `LevelEditor`, `DelegationRules`
- Migrate `data.ts` mock arrays to `WorkflowDefinition` + `WorkflowRule` + `WorkflowLevel`
- `ApprovalRequest` + `ApprovalHistory` replace per-module approval state
- `/approvals` and `/finance/approvals` read from `ApprovalRequest`
- `DelegationRule` activates out-of-office coverage

**DB change:** `WorkflowDefinition`, `WorkflowRule`, `WorkflowLevel`, `ApprovalRequest`,
`ApprovalHistory`, `DelegationRule`.

### Phase 5 — Business Policies (Sprints 8–10)
**Goal:** Move Finance Admin, Performance, Communications, Masters config into Admin Console.

- Build `admin-console/finance/` — migrate from `AdminClient` "Finance Ops" tab
- Build `admin-console/performance/` — migrate "KRA", "Scoring Bands", "Targets" tabs
- Build `admin-console/communications/` — migrate "Notifications" tab
- Build `admin-console/masters/` — link to existing `/masters/customers` and `/masters/vendors`
- `ConfigurationVersion` table enables Draft → Review → Publish for all settings changes
- `getSetting()` updated to read latest `published` version from `ConfigurationVersion`

**DB change:** `ConfigurationVersion`, extensions to `AppSetting`.

### Phase 6 — Security & Governance (Sprint 11–12)
**Goal:** Security policies, full audit trail, deprecation of old routes.

- Build `admin-console/security/` — session policy, IP allowlist, MFA toggle, login audit
- Build `admin-console/governance/` — config change history, approval audit, export log
- Redirect `/settings/administration` → `/admin-console` (permanent 308)
- Archive `src/app/admin/AdminClient.tsx` (preserved, not deleted)
- Archive `src/app/settings/workflow/approval-engine/data.ts` mock
- `AuditLog` table records all config publish events

---

## 8. Files to Refactor

| File | Current State | Target State |
|---|---|---|
| `src/lib/settings.ts` | Flat `getSetting/setSetting` | Add `getPublishedSetting` reading `ConfigurationVersion`; keep old functions as shims |
| `src/lib/roles.ts` | Hardcoded regex predicates | Convert to thin wrappers calling `hasPermission`; remove regex after Phase 3 |
| `src/lib/rbac.ts` | 4-boolean `RolePageAccess` | Replace core with `RoleModulePermission` check; add `DataAccessPolicy` query builder |
| `src/app/settings/SettingsHub.tsx` | 26-card grid, flat sections | Split into "Operational" (stays) and "Admin Console" (links into `/admin-console`) |
| `src/app/admin/AdminClient.tsx` | 14-tab monolith | Break into per-module client components under `admin-console/`; keep this file as legacy fallback |
| `src/app/settings/users-roles/` | Flat role editor | Replace with `admin-console/iam/` permission matrix; this page redirects |
| `src/app/settings/workflow/approval-engine/ApprovalEngineClient.tsx` | Mock data UI | Wire to real `WorkflowDefinition` CRUD; UI shape stays the same |
| `src/app/settings/workflow/approval-engine/data.ts` | Mock arrays | Move to `admin-console/workflow/data.ts`; types become the API contract |

---

## 9. Files to Deprecate

> "Deprecate" = redirect + archive comment + no new features. Delete only after 3 months of
> zero traffic (check Vercel/Hostinger analytics).

| File | Replacement | Deprecation Trigger |
|---|---|---|
| `src/app/settings/administration/page.tsx` | `/admin-console` | Phase 6 complete |
| `src/app/admin/AdminClient.tsx` | Per-module admin clients | Phase 5 complete |
| `src/app/settings/users-roles/page.tsx` | `/admin-console/iam` | Phase 3 complete |
| `src/app/settings/workflow/approval-engine/data.ts` | DB + API | Phase 4 complete |
| `src/lib/roles.ts` (predicates) | `rbac.ts` `hasPermission` | Phase 3 complete |

---

## 10. Development Rules

1. **No feature in `AdminClient.tsx`** — all new admin configuration goes into the
   appropriate `admin-console/<module>/` component from Phase 1 onwards.

2. **No hardcoded role strings** — after Phase 3, all permission checks call
   `hasPermission(roleId, module, action, scope)`. No new regex predicates in `roles.ts`.

3. **Mock data defines the API contract** — every `data.ts` mock array shape is the exact
   shape the future API must return. Do not change the shape when wiring the backend; change
   the data source.

4. **Config changes require a version row** — after Phase 5, no direct `setSetting()` calls
   that bypass `ConfigurationVersion`. All config writes create a `draft` row first.

5. **One master record per entity** — Customer and Vendor are global. Do not create
   per-module copies. All modules reference `Customer.id` / `Vendor.id`.

6. **DB changes are gated on UI sign-off** — write the UI with mock data first, get it
   reviewed, then run the migration. Never migrate schema for unreviewd UI.

7. **Backward compatibility for 2 phases** — when a new permission model replaces an old
   one, keep the old check working (shim) for two phases. This prevents a hard cutover that
   breaks live users.

8. **Confirm before pushing to production** — all changes are tested in dev, TypeScript-clean
   (`npx tsc --noEmit`), and explicitly confirmed before deployment to
   `sales.caveoinfosystems.com`.

9. **Update docs on every session end** — `docs/PROJECT_MEMORY.md` and `docs/CHANGELOG.md`
   are updated before closing each development session (per CLAUDE.md session rule).

10. **12 sprints, 12 weeks** — target completion Q3 2026. Each sprint ships a working,
    deployable increment. No sprint leaves the app in a broken state.

---

*Last updated: 2026-06-04 — Vijesh Vijayan*
