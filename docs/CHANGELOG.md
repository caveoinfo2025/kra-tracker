# Changelog

Reverse-chronological log of notable changes. **Update at the end of every session.**
Dates from git history (branch `master`).

## [2026-06-19 — Session 9] — UAT Environment Stood Up + Prod→UAT Data Migration

### Added
- **UAT database created from scratch** — `u686730471_Caveo_UAT` had no schema at all. Built `prisma/uat-full-schema.sql` (concatenation of all 19 migrations, ~2171 lines) and imported via phpMyAdmin. Separately created `prisma/uat-prisma-tracking.sql` to populate `_prisma_migrations` so Prisma considers the UAT DB fully migrated (avoids `prisma migrate deploy` trying to re-run history on every build).
- **`prisma/seed-uat-manager.mjs`** — one-off script to create/promote an Employee record to manager on a target DB (used to bootstrap Vijesh's UAT access before the prod data copy; superseded once prod data was copied in, since Vijesh already exists there as `isManager: true`).
- **`prisma/migrate-prod-to-uat.mjs`** — copies data for the 33 tables that exist in **both** prod and UAT schemas, mapping only common columns (UAT has 64 additional tables from newer modules — Admin Console, Policy Engine, Workflow Engine, Master Data Management, CRM Admin Engine, Finance Admin Engine, Performance Management, Communication Engine, Integration Center, Security Center — that prod hasn't received yet). Uses `mariadb` batch inserts (100-row chunks) with `FOREIGN_KEY_CHECKS=0` during the copy. Truncates target tables first.
  - Copied 26 non-empty tables: `AppRole`(8), `Collection`(141), `CrmActivity`(561), `CrmLead`(280), `CrmMeeting`(2), `CrmOpportunity`(49), `CrmTask`(282), `Customer`(93), `DailyUpdate`(2), `Employee`(10), `KRA`(34), `Notification`(39), `OrderAdvance`(3), `Payment`(26), `RolePageAccess`(112), `SalesFunnel`(100), `WeeklyCommit`(6), `WeeklyReview`(74).
  - 7 tables were empty in prod too (Finance/Vendor/Voucher/TravelClaim/EmployeeAdvance/Expense/LeadGeneration) — left empty in UAT.
  - AUTO_INCREMENT counters reset on all copied tables to `MAX(id)+1` to prevent collisions on new UAT-only inserts.

### Changed
- **`package.json` `build` script** — removed `prisma migrate deploy` (was: `prisma migrate deploy && prisma generate && next build`, now: `prisma generate && next build`). Hostinger/Passenger escapes `%`→`\%` in CLI-injected env vars, which corrupted the URL-encoded DB password and made `prisma migrate deploy` fail with `P1000: Authentication failed` during the UAT build — even though the same password works fine for the **runtime** Prisma client (which goes through `src/lib/prisma.ts`'s backslash-stripping fix). Migrations are now applied exclusively via the hand-written `apply-*.mjs` script pattern (already the established approach for Hostinger, which has no shadow DB).

### Fixed
- **UAT DB credentials/access** — went through three different DB users before finding the working one: `u686730471_devuser` (no access to UAT DB), `u686730471_Caveo_UAT` user (wrong/unwhitelisted), `u686730471_caveo` (unwhitelisted) — landed on **`u686730471_caveouat`** as the correct UAT DB user. Each required adding the connecting IP under hPanel → Remote MySQL. Note: the **app server's own outbound IP** for DB connections is an IPv6 address (`2a02:4780:11:1234::14e`), distinct from the developer's IPv4 (`49.204.126.121`) — both needed separate whitelist entries.
- **NextAuth sign-in failure on first boot** — `DriverAdapterError: pool timeout` wrapping `Access denied for user ... (using password: YES)` — was the IPv6-whitelist gap above, not a credentials problem.

### Files Modified
- `package.json`
- `prisma/uat-full-schema.sql` (new, generated — not hand-maintained)
- `prisma/uat-prisma-tracking.sql` (new)
- `prisma/seed-uat-manager.mjs` (new)
- `prisma/migrate-prod-to-uat.mjs` (new)

### Verified
- UAT sign-in via Microsoft Entra ID works end-to-end.
- Manager Dashboard loads with real prod-mirrored data (280 leads, 93 customers, 49 opportunities, etc.) after the data copy.
- TypeScript clean (`npx tsc --noEmit` — no output).

### Next session
- Decide whether to commit the `prisma/uat-*.sql`, `seed-uat-manager.mjs`, `migrate-prod-to-uat.mjs` scripts (useful as a record of how UAT was bootstrapped) or delete them now that UAT is live.
- Test full convert-lead→opportunity and delete-lead-with-audit-log flows on UAT against the real copied data.
- Confirm Entra ID App Registration has the UAT callback URL registered (sign-in works, but worth a explicit check it's not silently falling back to a wildcard).
- Carry over all Session 7/8 pending items below (legacy `lead-generation` customerId wiring, `OrderAdvance` customerId wiring, Finance Phase 2 backend wiring).
- **28+ commits ahead of `origin/master`** — confirm push strategy with Vijesh before merging UAT branch work to prod.

---

## [2026-06-18 — Session 8] — Lead Delete with Reason + Deletion Audit Log

### Added
- **`GET /api/pipeline/leads/deletion-log`** — manager-only endpoint returning all `AuditLog` entries where `entityType="lead"` and `action="delete"`, with `performedBy` name included.
- **`DeleteLeadModal`** component (in both `LeadsClient.tsx` and `LeadDetailClient.tsx`) — requires a reason, warns about permanence, disables submit until reason is entered.
- **Deletion Log panel** in the leads toolbar (manager-only) — lazy-fetches and displays a table of deleted leads: company name, title, stage at deletion, deleted-by, reason, date.

### Changed
- **`DELETE /api/pipeline/leads/[id]`** — removed manager-only gate; now allows any user to delete their own lead (ownership check: `assignedToId === employeeId`); managers can still delete any lead. Always requires `reason` in body. Writes `AuditLog` entry (entityType=`"lead"`, action=`"delete"`, notes=reason, changes=JSON snapshot) **before** deletion so the record survives the cascade.
- **`LeadsClient.tsx`** — 🗑 button now shows for `isManager || ownerId === currentEmployeeId` (was manager-only). Added **Deletion Log** button (manager-only) to toolbar.
- **`LeadDetailClient.tsx`** — Delete button guard changed from `isManager` to `canEdit` (covers lead owner + manager).

### Files Modified
- `src/app/api/pipeline/leads/[id]/route.ts`
- `src/app/api/pipeline/leads/deletion-log/route.ts` (new)
- `src/app/pipeline/leads/LeadsClient.tsx`
- `src/app/pipeline/leads/[id]/LeadDetailClient.tsx`

### Verified in browser
- 🗑 button visible in table rows ✓
- DeleteLeadModal opens with lead name, warning, required reason ✓
- Delete button disabled when reason is empty ✓
- Deletion Log modal opens for managers, shows "No leads deleted yet" on empty ✓
- TypeScript: exit code 0 ✓

---

## [2026-06-18 — Session 7] — SFDC-style Lead Standardization + HR Automation + RBAC Role Assignment

### Added
- **`customerRefId` FK on `CrmLead`** — proper FK to `Customer` table (was soft-link via `customerId String?` only). Migration `20260618100000_crm_lead_customer_ref` applied to dev DB + resolved in Prisma history.
- **`POST /api/pipeline/leads/[id]/convert`** — SFDC-style conversion endpoint: links/creates Customer master, creates `CrmOpportunity`, sets lead stage to `PROPOSAL_SENT`. Idempotent. Logs two activities (opportunity created + lead converted).
- **`ConvertModal`** in `LeadsClient.tsx` — amber "Convert →" button on lead rows at QUALIFIED/REQUIREMENT_GATHERED/SOLUTION_PROPOSED/POC_DEMO stages. If `customerRefId` is already set, skips the form and converts directly. Otherwise prompts for name, district, state, pincode, address, optional GST. Navigates to the new opportunity on success.
- **`ConvertModal`** in `LeadDetailClient.tsx` — same convert flow available on the lead detail page. "Convert →" button in the header card alongside "Edit Lead".
- **`CustomerNameCombobox` smart field** — replaces the old separate "Customer (existing)" `CrmSelect` dropdown in the lead form. Single field that: auto-links to Customer master on select (sets `customerRefId`); shows "✓ Linked to master" badge; shows prospect hint on free-text entry.
- **RBAC Role Assignment UI** in Employees tab (Settings → Identity & Access) — Assign/Remove toggles per role in the Manage drawer. Calls `PATCH /api/admin/identity/users/[id]` with `addRoleId`/`removeRoleId`.
- **HR Automation** — when employee status changes to INACTIVE or SUSPENDED, all `UserRole` records are deleted automatically (PATCH endpoint).
- **Department / Designation / Reports-To dropdowns** in Add/Edit employee form — wired from `/api/settings/organization/departments`, `/api/settings/organization/designations`, `/api/employees`. Sets both FK id (EmployeeProfile) and name string (Employee table).

### Changed
- `prisma/schema.prisma` — `CrmLead` model: added `customerRefId Int?`, `customerRef Customer?`, `@@index([customerRefId])`. `Customer` model: added `crmLeads CrmLead[]` back-relation.
- `src/types/pipeline.ts` — `LeadSerialized`: added `customerRefId: number | null`, `customerRef: { id: number; name: string } | null`.
- `LEAD_INCLUDE` in both leads API files — added `customerRef: { select: { id: true, name: true } }`.
- `POST /api/pipeline/leads` + `PUT /api/pipeline/leads/[id]` — accept `customerRefId` in body.
- `LeadsClient.tsx` — `MergedLead` type extended with `customerRefId`; form state updated; `handleSubmit` sends `customerRefId`; table company cell shows green dot when linked; `convertingLead` state + modal render added.
- `LeadDetailClient.tsx` — `FullLead` type extended with `customerRefId`/`customerRef`; `canConvert` flag; Convert button in header; Overview tab shows linked-vs-prospect status for company.
- `PATCH /api/admin/identity/users/[id]` — handles `addRoleId`, `removeRoleId`, HR deactivation auto-revoke.

### Fixed
- Dev server migration: `apply-crm-lead-customer-ref.mjs` — applied column + FK + index to `u686730471_caveodev`. Migration resolved via node-wrapped `prisma migrate resolve`.

### Files Modified
- `prisma/schema.prisma`
- `prisma/migrations/20260618100000_crm_lead_customer_ref/migration.sql` (new)
- `prisma/apply-crm-lead-customer-ref.mjs` (new)
- `src/types/pipeline.ts`
- `src/app/api/pipeline/leads/route.ts`
- `src/app/api/pipeline/leads/[id]/route.ts`
- `src/app/api/pipeline/leads/[id]/convert/route.ts` (new)
- `src/app/api/admin/identity/users/[id]/route.ts`
- `src/app/pipeline/leads/LeadsClient.tsx`
- `src/app/pipeline/leads/[id]/LeadDetailClient.tsx`
- `src/app/settings/identity/components/EmployeesTab.tsx`

### Database Changes
- `CrmLead.customerRefId INT NULL` — FK to `Customer.id` ON DELETE SET NULL

---

## [2026-06-10 — Session 6] — Phase 12: Integration Center + Phase 13: Enterprise Security Center

### Added — Phase 12: Integration Center (`/settings/integrations`)

**Schema & Migration**
- Migration `20260610080000_integration_center`: 5 tables — `integration_provider`, `integration_connection`, `integration_usage_rule`, `integration_log`, `api_key_reference`.
- `prisma/apply-integration-center.mjs`: one-off apply script (mariadb driver). Applied to dev DB.
- `prisma/seed-integration-defaults.mjs`: 11 providers seeded INACTIVE (SMTP, M365, Google Workspace, GST, PAN, Google Maps, WhatsApp Business, SMS Gateway, Teams Webhook, Tally Export, Generic Webhook).

**Service Layer (`src/lib/integration-engine/`)**
- `providers.ts` — `listProviders`, `getProvider`, `createProvider`, `updateProviderStatus`
- `connections.ts` — `listConnections`, `getConnection`, `createConnection`, `updateConnection`, `recordTestResult`
- `credentials.ts` — `listCredentials`, `createCredential`, `updateCredential`, `resolveSecret` (server-only). `secretRef` stores env var NAME only — never the raw value. `isResolved` boolean tells UI if the env var is set.
- `logs.ts` — `logIntegrationAttempt` (fail-silent), `listIntegrationLogs`
- `test.ts` — `testConnection` dry-run (no live external calls by default); records result + logs attempt
- `index.ts` — barrel re-exports + public API docs

**API Routes (`/api/admin/integrations/`)**
- `providers/route.ts` — GET/POST/PATCH
- `connections/route.ts` — GET/POST/PATCH; `secretRef` masked as `"[set]"` in all responses
- `credentials/route.ts` — GET/POST/PATCH; validates env var name (no spaces)
- `test/route.ts` — POST
- `logs/route.ts` — GET

**Admin UI (`/settings/integrations`)**
- `page.tsx` — SSR; loads all lists in parallel; strips secretRef before passing to client
- `IntegrationAdminClient.tsx` — 10-tab client: Overview, Providers, Connections, Credentials, Email, GST/PAN, Google Maps, WhatsApp/SMS, Accounting, Logs
- **New Connection inline form** (provider dropdown, connection name, auth type, secretRef env var field)
- **New Credential inline form** (name, key type, env var name auto-uppercased, description)

**Permissions & Navigation**
- `permissions.ts` — `Settings/IntegrationAdmin/VIEW`, `Settings/IntegrationAdmin/EDIT`, `Settings/IntegrationLog/VIEW` added
- `AdminConsole.tsx` — Integration Center card (Plug icon, blue, `/settings/integrations`)

---

### Added — Phase 13: Enterprise Security Center (`/settings/security`)

**Schema & Migration**
- Migration `20260610090000_security_center`: 7 tables — `security_policy`, `password_policy`, `mfa_policy`, `session_policy`, `access_restriction_policy`, `data_protection_policy`, `security_event_log`.
- `prisma/apply-security-center.mjs`: apply script. Applied to dev DB.
- `prisma/seed-security-defaults.mjs`: 5 default policies seeded — Password (length=8, expiry=90d, 5 attempts), MFA (disabled, EMAIL method), Session (8h idle/max, concurrent allowed), Access (no restrictions), Data Protection (1000-record limit, mobile/email/pan/aadhar masked).

**Service Layer (`src/lib/security-engine/`)**
- `password-policy.ts` — `getPasswordPolicy`, `upsertPasswordPolicy`, `validatePasswordPolicy` → `PasswordValidationResult { valid, failures }`
- `mfa.ts` — `getMFAPolicy`, `upsertMFAPolicy`, `isMFARequired(policy, userRole)`
- `session.ts` — `getSessionPolicy`, `upsertSessionPolicy`, `validateSession(policy, sessionAgeMinutes, idleMinutes)`
- `access-policy.ts` — `getAccessPolicy`, `upsertAccessPolicy`, `checkIPAccess`, `checkBusinessHours`
- `data-protection.ts` — `getDataProtectionPolicy`, `upsertDataProtectionPolicy`, `canExportData`, `maskField`
- `security-log.ts` — `logSecurityEvent` (fail-silent), `listSecurityLogs`, `countRecentFailedLogins`. 14 event types.
- `index.ts` — `evaluateSecurityPolicy({userId, action, context})` → `{ decision: "ALLOW"|"BLOCK"|"REQUIRE_MFA"|"REQUIRE_APPROVAL", reasons }`. **Fail-open**: returns `ALLOW` on any error — preserves backward compatibility.

**API Routes (`/api/admin/security/`)**
- `policies/route.ts` — GET (all policies summary)
- `password/route.ts`, `mfa/route.ts`, `session/route.ts`, `access/route.ts`, `data-protection/route.ts` — GET/POST/PATCH; each logs `POLICY_CHANGED` event on save
- `logs/route.ts` — GET with userId/eventType/limit/offset filters

**Admin UI (`/settings/security`)**
- `page.tsx` — SSR auth gate (manager-only); loads all 5 policies + 50 recent logs in parallel
- `SecurityAdminClient.tsx` — 8-tab client: Overview, Authentication, Password Policy, MFA, Sessions, Access Rules, Data Protection, Logs
  - Overview: 8 KPI cards + Active Policies checklist + Recent Security Events list
  - Authentication: read-only posture panel (SSO + security checks, backward-compatible)
  - Password Policy: number inputs + toggle components for complexity rules
  - MFA: enable toggle, method buttons, roles input, remember device days
  - Sessions: idle timeout, max hours, concurrent session toggles
  - Access Rules: IP allowlist textarea, business hours pickers + day selectors
  - Data Protection: export limit, approval/download toggles, sensitive field chip selector
  - Logs: table with colored event type badges, refresh button
  - `Toggle` inline component, `SaveBar` red save button, `savePolicy()` POST/PATCH helper

**Permissions & Navigation**
- `permissions.ts` — `Settings/SecurityAdmin/VIEW`, `Settings/SecurityAdmin/EDIT`, `Settings/SecurityLog/VIEW` added
- `AdminConsole.tsx` — Security Center card (Lock icon, caveo-red, `/settings/security`)

**Security constraints (in effect for all future work):**
- Do NOT replace existing authentication; do NOT break login/logout; do NOT force MFA
- Do NOT invalidate current users; do NOT store passwords; do NOT expose security secrets
- All policies are non-enforcing until explicitly integrated into auth flows
- Fail-open: `evaluateSecurityPolicy` always returns `ALLOW` on error
- `secretRef` stores only env var NAME; never the raw value; masked as `"[set]"` in API responses

### Verified in browser
- `/settings` AdminConsole shows both new cards (Integration Center + Security Center) ✓
- `/settings/security` loads with all 8 tabs; Overview shows seeded policy data ✓
- TypeScript check: exit code 0 (no errors) ✓

---

## [2026-06-09 — Session 5] — Phase 9: Finance Administration Engine

### Added — 4 commits (7f4980d → 7df039d)

**Schema & Migration**
- `prisma/schema.prisma`: 8 new models — `FinancePolicy`, `ExpenseCategory`, `ExpenseLimitRule`, `ConveyancePolicy`, `AdvancePolicy`, `CustomerCreditPolicy`, `VoucherConfiguration`, `CollectionPolicy`. Fixed Unicode smart-quote corruption in schema comments that caused 31 Prisma validation errors (all `@default("")` values had `"…"` replaced with ASCII `"`).
- Migration `20260605050000_finance_admin_engine`: hand-written SQL, 8 tables, InnoDB, utf8mb4_unicode_ci, DOUBLE for money, all FK-columns indexed.
- `prisma/apply-finance-admin.mjs`: one-off apply script (mariadb driver). **⚠ Requires IP whitelisted in hPanel → Remote MySQL before running.**
- `prisma/seed-finance-admin.ts`: 5 expense categories (TRAVEL/FOOD/HOTEL/INTERNET/CERTIFICATION), 3 conveyance rates (Bike/Car/Two-Wheeler), 3 credit policies (STANDARD/PREMIUM/GOVERNMENT), 3 voucher configs (EXP/PAY/REC), 1 advance policy, 1 collection policy.

**Service Layer (`src/lib/finance-engine/`)**
- `index.ts` — barrel exports
- `expense.ts` — `listExpenseCategories`, `createExpenseCategory`, `updateExpenseCategory`, `listExpenseLimitRules`, `upsertExpenseLimitRule`, `validateExpense()` (fail-open)
- `conveyance.ts` — `listConveyancePolicies`, `createConveyancePolicy`, `updateConveyancePolicy`, `calculateConveyance()`
- `advance.ts` — `listAdvancePolicies`, `createAdvancePolicy`, `updateAdvancePolicy`
- `credit.ts` — `listCreditPolicies`, `createCreditPolicy`, `updateCreditPolicy`, `checkCustomerCredit()` (fail-open)
- `voucher.ts` — `listVoucherConfigs`, `createVoucherConfig`, `updateVoucherConfig`, `generateVoucherNumber()` (FY reset + 3 format options)
- `collection.ts` — `listCollectionPolicies`, `createCollectionPolicy`, `updateCollectionPolicy`, `getCollectionAction()`

**API Routes (`/api/admin/finance/`)**
- `policies/route.ts` — GET/POST/PATCH `FinancePolicy` (type-validated)
- `expenses/route.ts` — GET/POST (type=category|limit_rule) / PATCH
- `conveyance/route.ts`, `advance/route.ts`, `credit/route.ts`, `voucher/route.ts`, `collection/route.ts` — GET/POST/PATCH for each policy type
- All routes guard with `getSession()` + `isManager`

**Admin UI (`/settings/finance`)**
- `page.tsx` — SSR auth gate (manager-only), loads all 7 policy lists in parallel
- `FinanceAdminClient.tsx` — 8-tab shell
- `FinanceDashboard.tsx` — stat cards + 4-panel summary grid
- `ExpensePolicyManager.tsx` — category CRUD + receipt/approval flags
- `ConveyancePolicyManager.tsx` — per-vehicle rate, monthly limit, map/override options
- `AdvancePolicyManager.tsx` — max advance (₹L) + settlement days
- `CreditPolicyManager.tsx` — per-customerType default/max credit limits + payment terms
- `VoucherConfigurator.tsx` — prefix, format (PREFIX-YEAR-SEQ / PREFIX-SEQ / custom), live preview
- `CollectionRules.tsx` — reminder/escalation/hold day inputs + timeline visualisation
- `FinanceAudit.tsx` — reads AuditLog filtered to finance entity types; grouped by entity type

### Changed
- `AdminConsole.tsx` — Finance Administration card added (Banknote icon, green, `/settings/finance`)
- `permissions.ts` — `Settings/Finance/VIEW` + `Settings/Finance/EDIT` added to `PERMISSION_CATALOGUE`

### Pending (apply to dev DB)
1. Whitelist current IP in hPanel → Remote MySQL
2. `$env:DATABASE_URL="mysql://…"; node prisma/apply-finance-admin.mjs`
3. `$env:DATABASE_URL="mysql://…"; npx prisma migrate resolve --applied 20260605050000_finance_admin_engine`
4. `npx tsx prisma/seed-finance-admin.ts`
5. Restart dev server (Turbopack — new files)
6. Verify `/settings/finance` renders correctly

### Not yet done (future sessions)
- Vendor Finance Rules tab (reuses `masters/vendors` policies — deferred)
- `hasPermission()` check using `Settings/Finance/VIEW` (currently uses `isManager`)
- Policy Engine integration — `evaluatePolicy()` hook in `validateExpense()`
- Workflow Engine integration — `startApproval()` trigger in `validateExpense()` / `checkCustomerCredit()`
- Master Data integration — vehicle type and customer type dropdowns from master values

---

## [2026-06-05 — Session 4] — CRM Admin Engine (Phase 8) + Approval Wiring + Lead→Opp Flow + Opp Close + Legacy Promotion

> **All UNCOMMITTED.** Verified in the preview browser. Dev DB has 4 new migrations applied.

### Added
- **Approval Engine wired into CRM flows** (fire-and-forget; never blocks a save):
  - `opportunities/[id]` PATCH → `startApproval()` for `LARGE_DEAL_APPROVAL` (value first crosses ₹50L) and `DISCOUNT_APPROVAL` (discountPct first > 0%).
  - New `POST /api/expenses` → `EXPENSE_APPROVAL` when submitted with amount > ₹0.10L (plus a `GET` list with manager/owner scope).
- **Phase 8 — Enterprise CRM Administration Engine** at `/settings/crm`:
  - Service layer `src/lib/crm-engine/` (6 files: `index`, `pipeline`, `territory`, `assignment`, `automation`, `sla`) — all DB calls try/catch-guarded for pre-migration safety.
  - 7 API routes under `/api/admin/crm/`: `pipelines`, `pipelines/[id]`, `territories`, `territories/[id]`, `assignment`, `automation`, `sla` (manager-gated).
  - UI: `page.tsx` (SSR) + `CRMAdminClient` (5-tab) + 5 components — `PipelineDesigner`, `TerritoryManager`, `AssignmentRuleBuilder`, `AutomationBuilder`, `SLAManager`.
  - Seed `prisma/seed-crm-defaults.ts` — default "Opportunity Pipeline" (7 stages) + "Lead Pipeline" (7 stages) + 3 automation rules + 5 SLA rules.
- **Automation execution wired to live CRM events** — `executeAutomation()` called on `lead.created` (leads POST) and `opportunity.stage_changed` / `opportunity.won` / `opportunity.lost` (opportunity PATCH). Dispatcher supports `assign_lead`, `update_stage`, `create_task`, `send_notification` (last is a placeholder).
- **SLA indicators** — `LeadCard` SLA badges (NEW_LEAD 4h first-contact, 24h follow-up), opportunity kanban-card SLA badge (48h proposal response), and a new **SLA column** in the leads table.
- **Lead → Opportunity full-edit flow** — opportunity detail page (`OppDetailClient`) gains a complete edit form for open deals + a **Close Won** modal (Deal Value ex-tax *, Net Profit ₹L, PO Number *, PO Date) and **Close Lost** modal (reason *).
- **Legacy/imported deal promotion** — `POST /api/pipeline/opportunities/promote` converts a SalesFunnel deal into a real CrmLead + CrmOpportunity (idempotent via `SalesFunnel.crmOpportunityId`), giving imported deals the full edit/close experience. "Open →" button replaces the old limited "Edit Legacy Deal" modal.

### Changed
- **CRM Admin relocated under Settings** — added as a card in `AdminConsole.tsx` (`/settings` list); removed the standalone "CRM Admin" sidebar link from `SidebarLinks.tsx`.
- **Pipeline stages aligned with live constants** — DB "Opportunity Pipeline" now exactly matches `OPP_STAGES` and "Lead Pipeline" matches `LEAD_STAGES` from `src/types/pipeline.ts`.
- **PROPOSAL_SENT leads removed from the Leads view** — both `pipeline/leads/page.tsx` and `/api/pipeline/leads` GET default to `stage: { not: "PROPOSAL_SENT" }`. Stage dropdown drops the option; stats relabeled (Active Leads / Qualified+); kanban + table no longer show converted leads. Changing a lead to PROPOSAL_SENT now auto-navigates to its opportunity.
- **Net profit is absolute ₹L (was %)** — DB column `CrmOpportunity.netMargin` renamed to `netProfitLakhs`; all labels and displays show `₹X.XXL` instead of `X.X%`.
- **Closed opportunities are locked** — WON/LOST deals render a read-only summary; the API blocks edits to terminal deals for non-managers (403). Closing requires the mandatory fields (PO Number + Deal Value for Won; reason for Lost).

### Database Changes
- `20260605000000_opportunity_discount_pct` — `CrmOpportunity.discountPct DOUBLE DEFAULT 0`.
- `20260605010000_crm_admin_engine` — 7 tables: `pipeline_definition`, `pipeline_stage`, `territory`, `territory_rule`, `account_assignment_rule`, `crm_automation_rule`, `sla_rule`.
- `20260605020000_opportunity_won_fields` — `dealValueExTax`, `netMargin`, `poNumber`, `poDate` on `CrmOpportunity`.
- `20260605030000_legacy_promote_and_net_profit` — `CrmOpportunity.netMargin` → `netProfitLakhs`; `SalesFunnel.crmOpportunityId INT NULL`.
- Seeded default pipelines/automations/SLA via `seed-crm-defaults.ts`; aligned pipeline stages via one-off script.

### Files Modified
- `prisma/schema.prisma` — CrmOpportunity (+discountPct, +dealValueExTax, +netProfitLakhs, +poNumber, +poDate), SalesFunnel (+crmOpportunityId), 7 new CRM-admin models.
- `src/types/pipeline.ts` — OpportunitySerialized gains discountPct, dealValueExTax, netProfitLakhs, poNumber, poDate.
- `src/app/api/pipeline/opportunities/[id]/route.ts` — approval triggers, automation calls, WON/LOST validation + lock, new fields.
- `src/app/api/pipeline/leads/route.ts` — PROPOSAL_SENT exclusion + `lead.created` automation.
- `src/app/pipeline/leads/page.tsx`, `LeadsClient.tsx`, `LeadDetailClient.tsx`, `src/components/pipeline/LeadCard.tsx` — PROPOSAL_SENT hiding, SLA column/badges, auto-navigate to opportunity.
- `src/app/pipeline/opportunities/OpportunitiesClient.tsx` — legacy "Open →" promotion (removed LegacyEditModal), SLA badge.
- `src/app/pipeline/opportunities/[id]/OppDetailClient.tsx` — full rewrite (edit form + Close modals + locked state).
- `src/app/pipeline/opportunities/page.tsx` — hide promoted legacy rows.
- `src/app/settings/AdminConsole.tsx` — CRM Administration card.

### New files / directories (untracked)
- `src/lib/crm-engine/` (6), `src/app/api/admin/crm/` (7 routes), `src/app/settings/crm/` (page + client + 5 components), `src/app/api/expenses/route.ts`, `src/app/api/pipeline/opportunities/promote/route.ts`, `prisma/seed-crm-defaults.ts`, 4 migration dirs.

### Config Changes
- None (no env / build config changes).

---

## [2026-06-05] — Session Summary (Admin Console Phase 6 & 7 + DB Migration + UI Fixes)

### Added
- **Phase 6 — Workflow Engine**: `src/lib/workflow-engine/` (7 service files: audit, resolver, delegation, escalation, workflow, approval, index) + 9 API routes (`/api/workflows/*`, `/api/approvals/*`, `/api/delegations/*`, `/api/escalation-rules`) + 9 UI components (`WorkflowCenter`, `WorkflowDesigner`, `TriggerSelector`, `ApprovalStepBuilder`, `ApproverSelector`, `WorkflowRulePanel`, `DelegationManager`, `EscalationManager`, `WorkflowAudit`)
- **Phase 7 — Master Data Management**: `src/lib/master-data/` (7 service files) + 5 API routes + 8 UI components + `prisma/seed-master-defaults.ts` (8 categories, ~40 values, global policies)
- **CSS utility aliases in globals.css**: `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-secondary`, `.btn-sm`, `.input`, `.form-label`, `.form-hint` + token aliases (`--primary`, `--foreground`, `--card`, `--background`, `--muted-foreground`)

### Fixed
- Workflow 404: added `/settings/workflow/page.tsx` redirect to `/settings/workflow/approval-engine`
- Duplicate workflow tabs: removed `Overview` tab that loaded legacy `ApprovalEngineClient` (had its own 6-tab strip with mock data)
- `canEdit` fallback: extended to include `isManager` on both workflow and masters pages
- WorkflowDesigner `Designer` tab was incorrectly rendering `WorkflowRulePanel` — now renders actual designer form
- Settings sidebar: removed separate Administration/Users-Roles/Approval-Engine nav links, single `Settings` link
- Settings page: replaced 13-module enterprise grid with clean 6-item list
- Encoding corruption: fixed `â†` / `â€¦` (mangled Unicode from PowerShell Set-Content without `-Encoding utf8`) in WorkflowRulePanel + WorkflowDesigner
- CSS class resolution: switched all workflow components from broken `className="btn-primary"` (non-existent) to inline styles using design tokens
- `@@map` directives added to 15 schema models (Phase 6 workflow + Phase 7 master models used snake_case table names in migration SQL)
- Seed relation syntax: `createdBy: 1` → `creator: { connect: { id } }` (Prisma 7 requires relation syntax)
- WorkflowRulePanel table: Module/Trigger columns now show human-readable labels (Finance, CRM/Sales, Expense Submitted, etc.)

### Database Changes
- Applied migration `20260604120000_policy_engine_foundation` (PolicyCategory, Policy, PolicyRule, PolicyVersion, PolicyAudit, ConfigurationVersion)
- Applied migration `20260604180000_workflow_engine` (workflow_definition, workflow_step, approval_request, approval_action, delegation_rule, escalation_rule, workflow_audit_log)
- Applied migration `20260604220000_master_data_management` (master_category, master_definition, master_value, master_override, master_validation_rule, master_audit, customer_policy, vendor_policy)
- Seeds: admin foundation (65 permissions, 6 roles), policy defaults (3), workflow defaults (5), master data defaults (8 categories + ~40 values)
- `npx prisma generate` run after migration to update client with new models

### Files Modified
- `prisma/schema.prisma` — 15 new `@@map` directives; 8 Phase 7 models + 7 Phase 6 models
- `prisma/seed-policy-defaults.ts` — relation syntax fix (`category: { connect }`, `creator: { connect }`)
- `prisma/seed-workflow-defaults.ts` — SYSTEM_ACTOR 1→2, `createdBy` → `creator: { connect }`
- `src/app/globals.css` — CSS utility aliases + token aliases
- `src/app/settings/workflow/WorkflowCenter.tsx` — removed Overview tab, fixed Designer tab
- `src/app/settings/workflow/components/WorkflowRulePanel.tsx` — full rewrite (encoding fix + inline styles + human-readable labels)
- `src/app/settings/workflow/components/WorkflowDesigner.tsx` — full rewrite (inline styles, clean form layout)
- `src/app/settings/workflow/components/TriggerSelector.tsx` — full rewrite (inline styles, readable option labels)
- `src/app/settings/workflow/components/ApprovalStepBuilder.tsx` — btn class fix
- `src/app/settings/workflow/components/DelegationManager.tsx` — btn class fix
- `src/app/settings/workflow/components/EscalationManager.tsx` — btn class fix
- `src/app/settings/workflow/components/WorkflowAudit.tsx` — btn class fix
- `src/app/settings/workflow/page.tsx` — NEW: redirect to approval-engine
- `src/app/settings/workflow/approval-engine/page.tsx` — `canEdit || isManager` fallback
- `src/app/settings/masters/page.tsx` — `canEdit || isManager` fallback
- `src/app/settings/AdminConsole.tsx` — replaced enterprise grid with 6-item clean list
- `src/components/SidebarLinks.tsx` — Settings section simplified to single link; removed isOpsHead prop
- `src/components/Navbar.tsx` — removed isOpsHead prop pass
- `src/lib/access-control/permissions.ts` — added Settings/Masters/VIEW+EDIT
- `src/app/settings/data/adminModules.ts` — Masters status beta→active
- `docs/CHANGELOG.md` — this entry
- `docs/NEXT_SESSION.md` — updated

## Current State
- All core modules present on `master` / `sales.caveoinfosystems.com`: auth, pipeline,
  KRA engine + reviews/commits/certifications, collections + payments + advances +
  notifications, customer master, dashboards, admin panel, mobile app, bulk import, org hierarchy.
- **Database is MySQL/MariaDB 11.8** (driver adapter `@prisma/adapter-mariadb`) — migrated
  from SQLite 2026-06-02.
- **Finance Operations — Phase 1 (database) is committed/pushed** (`1747f9e`): 10 models,
  migration `20260602120000_finance_operations_phase1`, finance config + dev seeds.
- **Finance Operations — Phase 2 UI (2026-06-03), UI-ONLY mock data, UNCOMMITTED** (~45 files).
- **🆕 2026-06-04 — Three enterprise UI modules added, UI-ONLY on mock data, UNCOMMITTED:**
  (1) **Expense Categories** (`/finance/expenses/categories`, 8 files); (2) **Global Vendor Master**
  (`/masters/vendors`, 14 files); (3) **Global Customer Master** (`/masters/customers`, 16 files).
  New sidebar **Masters** section. `/finance/vendors` now redirects to `/masters/vendors`. **No APIs,
  no schema changes.** `tsc` clean.
- **🆕 2026-06-04 — Admin Console Phase 1 implemented, UNCOMMITTED:**
  `/settings` now renders Enterprise Admin Console (`AdminConsole.tsx`) — 12-module grid, 4 stat cards,
  live search/filter, Recent Changes, Quick Actions. `SettingsHub.tsx` kept as rollback. Zero DB changes.
- **🆕 2026-06-04 — Admin Console Phase 2 DB Foundation implemented, UNCOMMITTED:**
  12 new Prisma models (Tenant, Company, Branch, Department, Team, Designation, EmployeeProfile, Role,
  Permission, RolePermission, UserRole, DataAccessPolicy). Offline migration SQL
  `20260604000000_admin_console_foundation`. Access control service (`src/lib/access-control/`):
  `permissions.ts` (50-permission catalogue), `policy.ts` (scope resolution), `index.ts`
  (`hasPermission`/`getAllPermissions`). Seed: `prisma/seed-admin-foundation.ts` (6 roles, full
  permission grants, data access policies). `roles.ts` bridge comment added. `tsc` clean,
  `next build` clean. **Migration NOT yet applied to dev/prod DB.**
- **🆕 2026-06-04 — Admin Console Phase 3 — Organization Management implemented, UNCOMMITTED:**
  Full enterprise org console at `/settings/organization` — 8 tabs (Overview, Companies, Branches,
  Departments, Teams, Designations, Hierarchy, Audit). 10 API routes (`/api/settings/organization/*`)
  with dual-mode: live DB when migration applied, mock data until then. `Organization` permission pair
  added to PERMISSION_CATALOGUE. Organization module status set to `"active"` in `adminModules.ts`.
  `tsc` clean, `next build` clean.
- **🆕 2026-06-04 — Admin Console Phase 4 — Identity & Access Management implemented, UNCOMMITTED:**
  Full enterprise IAM console at `/settings/identity` — 6 tabs: Users, Roles, Permissions, Data Access,
  Delegation, Audit. Components: `UsersTab` (KPI cards, search/filter, quick suspend), `UserProfileDrawer`
  (profile/org/access tabs, status change), `RoleManagement` (table, clone, disable, `RoleEditor` slide-over),
  `PermissionMatrix` (module/resource grid with dirty-cell tracking), `DataAccessPolicyPanel` (scope pills per
  module), `DelegationPanel` (rule table, slide-over form), `IdentityAudit` (audit log with action filter).
  8 API routes: `GET/PATCH /api/admin/identity/users/[id]`, `GET/POST /api/admin/identity/roles`, `PATCH
  /api/admin/identity/roles/[id]`, `GET /api/admin/identity/permissions?roleId=X`, `POST
  /api/admin/identity/permissions/[roleId]`, `GET /api/admin/identity/policies?roleId=X`, `POST
  /api/admin/identity/policies/[roleId]`. All dual-mode (live DB / mock). `/settings/users-roles` now
  redirects to `/settings/identity`. `Settings/Identity/VIEW` and `EDIT` added to `PERMISSION_CATALOGUE`.
  `tsc` clean, `next build` clean.
- **🆕 2026-06-04 — Admin Console Phase 5 — Policy Engine Foundation implemented, UNCOMMITTED:**
  Centralized reusable Policy Engine at `/settings/policies` — policies, rules, lifecycle, version history
  and audit log. Policy Engine service (`src/lib/policy-engine/`): `conditions.ts` (9 operators, dot-notation
  field resolution), `actions.ts` (6 action types), `rules.ts` (priority-ordered evaluation, BLOCK
  short-circuit), `versioning.ts` (snapshot builder), `policy.ts` (`listPolicies`/`transitionPolicyStatus`),
  `index.ts` (`evaluatePolicy` — fail-open pre-migration). 6 new DB models (PolicyCategory, Policy,
  PolicyRule, PolicyVersion, PolicyAudit, ConfigurationVersion). Offline migration SQL
  `20260604120000_policy_engine_foundation`. Admin UI: 7 components (PolicyList, PolicyEditor with
  3-section tabs, RuleBuilder with inline enable/disable, ConditionBuilder IF/THEN, ActionBuilder,
  PolicyVersionHistory, PolicyAudit). 6 API routes (`GET/POST /api/admin/policies`, `PATCH [id]`,
  `GET [id]/versions`, `GET audit`, `GET categories`, `POST evaluate`). `Settings/Policy/VIEW+EDIT`
  added to PERMISSION_CATALOGUE. Policy Engine entry added to `adminModules.ts`. Seed:
  `prisma/seed-policy-defaults.ts` (6 categories, 3 default policies). `settings.ts` extended with
  `getPublishedSetting`/`draftSetting`/`publishSettingVersion`. `tsc` clean, `next build` clean.
  **Migration NOT yet applied to dev/prod DB — all API routes fail-open to mock data until then.**
- **🆕 2026-06-04 — Admin Console Phase 6 — Enterprise Approval Workflow Engine implemented, UNCOMMITTED:**
  Generic, reusable multi-level approval engine. **Service layer** (`src/lib/workflow-engine/`): `audit.ts`
  (WorkflowAuditLog read/write, 11 action types), `resolver.ts` (resolveApprovers — USER/ROLE/REPORTING_MANAGER/
  DEPARTMENT_HEAD/POLICY_BASED), `delegation.ts` (getActiveDelegate/createDelegation/revokeDelegation/listDelegations),
  `escalation.ts` (getEscalationRules/createEscalationRule/checkAndTriggerEscalations), `workflow.ts`
  (listWorkflows/getWorkflow/getWorkflowByCode/createWorkflow/updateWorkflow), `approval.ts`
  (startApproval/listApprovalRequests/getPendingForApprover/approveRequest/rejectRequest/returnRequest/
  delegateRequest/cancelRequest), `index.ts` (unified re-export). 7 new DB models + offline migration SQL
  `20260604180000_workflow_engine` (WorkflowDefinition, WorkflowStep, ApprovalRequest, ApprovalAction,
  DelegationRule, EscalationRule, WorkflowAuditLog). **Admin UI** (`src/app/settings/workflow/`):
  `WorkflowCenter.tsx` (7-tab shell replacing ApprovalEngineClient), `WorkflowDesigner.tsx` (full create/edit with
  2-section form), `TriggerSelector.tsx`, `ApprovalStepBuilder.tsx`, `ApproverSelector.tsx`, `WorkflowRulePanel.tsx`,
  `DelegationManager.tsx`, `EscalationManager.tsx`, `WorkflowAudit.tsx`. Page updated to use `hasPermission()` with
  legacy predicate fallback. **API routes**: `GET/POST /api/workflows`, `GET/PATCH /api/workflows/[id]`,
  `POST /api/workflows/start`, `GET /api/workflows/audit`, `GET /api/approvals`, `POST /api/approvals/[id]/action`,
  `GET/POST /api/delegations`, `DELETE /api/delegations/[id]`, `GET/POST /api/escalation-rules`. 2 new permissions
  added (`Settings/Workflow/VIEW+EDIT`). `ApprovalInboxPage` upgraded with Delegated tab + SLA column in inbox.
  ApprovalInbox table `colSpan` corrected. Seed: `prisma/seed-workflow-defaults.ts` (5 default workflows). All
  pre-migration safe (fail-open). `tsc` clean, `next build` clean. Migration NOT yet applied.
- **🆕 2026-06-04 — Admin Console Phase 7 — Enterprise Master Data Management implemented, UNCOMMITTED:**
  Full master data management system at `/settings/masters` — 8 tabs (Overview, Categories, Values,
  Overrides, Customer Policy, Vendor Policy, Validation Rules, Audit Log). **Service layer**
  (`src/lib/master-data/`): `audit.ts` (logMasterEvent/getMasterAudit/listMasterAudit), `masters.ts`
  (three-layer resolution: Global → Company override → Branch override; listCategories/createCategory/
  listDefinitions/getDefinitionByCode/createDefinition/updateDefinitionStatus/listValues/getMasterValues/
  createValue/updateValue), `override.ts` (listOverrides/createOverride/updateOverride/upsertOverride),
  `validation.ts` (listValidationRules/createValidationRule/validateMasterData — integrates Policy Engine),
  `customer-policy.ts` (getCustomerPolicy/listCustomerPolicies/upsertCustomerPolicy),
  `vendor-policy.ts` (getVendorPolicy/listVendorPolicies/upsertVendorPolicy), `index.ts` (unified re-export).
  8 new DB models (MasterCategory, MasterDefinition, MasterValue, MasterOverride, MasterValidationRule,
  MasterAudit, CustomerPolicy, VendorPolicy) + offline migration SQL `20260604220000_master_data_management`.
  **Admin UI** (`src/app/settings/masters/`): server auth gate (`page.tsx`), `MasterDataClient.tsx`
  (8-tab shell), `MasterDashboard.tsx` (stat cards + architecture explainer), `MasterCategoryList.tsx`
  (table + inline create form), `MasterValueManager.tsx` (definition selector + values table + add form),
  `OverrideManager.tsx` (override table + upsert form), `CustomerGovernance.tsx` (policy edit panel),
  `VendorGovernance.tsx` (policy edit panel), `ValidationRules.tsx` (per-definition rule list + add form),
  `MasterAudit.tsx` (audit log with filter). **API routes**: `GET/POST /api/admin/masters` (multi-type:
  stats/categories/definitions/validation-rules/audit), `GET/POST /api/admin/masters/values`,
  `GET/POST /api/admin/masters/overrides`, `GET/POST /api/admin/customer-policy`,
  `GET/POST /api/admin/vendor-policy`. 2 new permissions (`Settings/Masters/VIEW+EDIT`) added to
  PERMISSION_CATALOGUE. Masters module status set to `"active"` in `adminModules.ts`. Seed:
  `prisma/seed-master-defaults.ts` (8 categories, ~40 values, global CustomerPolicy + VendorPolicy).
  All pre-migration safe (fail-open). `tsc` clean, `next build` clean — `/settings/masters` in route list.
  **Migration NOT yet applied.**
- **Latest commit:** `ce29704` (session memory snapshot). **All work from 2026-06-04 is uncommitted.**
- **Prod note:** unchanged; confirm `200` on `/login` before/after any push. Pre-`1ab4f7d`
  JWTs still need one sign-out + in to pick up live role.

## Next Actions
1. **Apply migration to dev DB:** `$env:DATABASE_URL="mysql://…"; npx prisma migrate deploy` then verify
   `npx prisma db seed` with `seed-admin-foundation.ts` runs clean.
2. **Decide commit strategy** for the large uncommitted body and commit in logical chunks (confirm with Vijesh).
3. **Wire real data behind the finance/master screens** — Expense Register CRUD first; then Customer Master →
   extend existing `Customer` model; Vendor Master → wire to Phase-1 `Vendor` model.
4. **Wire real data behind the finance/master screens** — Expense Register CRUD first; then Customer Master →
   extend existing `Customer` model; Vendor Master → wire to Phase-1 `Vendor` model.
5. **Consolidate Customer Master** — two nav entries pending convergence (`/masters/customers` + legacy `/customers`).
6. **Service-worker dev fix**; wrap `recordPayment`/`applyAdvance` in `$transaction`; apply `@db.Decimal(12,4)`;
   rotate dev DB password; remove `better-sqlite3`; mitigate `xlsx@0.18.5`.

---

## [2026-06-04 — Session 2] — Role-Adaptive Dashboard + Settings Hub + Enterprise Architecture Plan

> No application logic removed. No schema/API/migration changes. `npx tsc --noEmit` clean.
> All changes are **uncommitted** (same working tree as Session 1 today).

### Added
- **Role-Adaptive Dashboard** (`src/app/dashboard/`) — dashboard now renders differently per
  role variant. Added `roleVariant: "manager" | "opsHead" | "techHead" | "employee"` discriminator
  to `DashboardProps`. `showSales` flag gates pipeline funnel, sales KPI tiles, team chart.
  `showTeam` flag gates approvals panel. Live DB role refresh reads `Employee.isManager` + `role`
  on every request (same pattern as Navbar).
- **`isOperationsHead` import** in `dashboard/page.tsx`; `isTechHead` regex inline. Operations Head
  and Technical Head see team-oriented dashboard without the sales funnel.
- **Settings Hub expanded** (`src/app/settings/SettingsHub.tsx`) — 10 → 26 cards across 7 sections:
  General (3), Workflow (2), People (3), Masters (2), Finance (11), CRM & Sales (3), System (2).
  Added icons: `Landmark, Banknote, Layers, Wallet, MapPin, ClipboardCheck, ClipboardList,
  BarChart3, Target, BookUser, Store, CheckSquare, Activity`.
- **AdminClient expanded** (`src/app/admin/AdminClient.tsx`) — 11 → 14 tabs. Added Finance Ops,
  Approvals, and Masters tabs with new icons `Receipt, ClipboardCheck, BookUser`.
- **Settings in `src/lib/settings.ts`** — 16 new defaults + metadata across 3 new categories:
  Finance (7 keys: conveyance_rate_per_km, advance_max_months_salary, expense_max_days_backdated,
  voucher_prefix, fiscal_year_label, auto_approve_expense_below, expense_receipt_required_above),
  Approvals (5 keys), Masters (4 keys: gstin_validation_enabled, duplicate_name_threshold_pct,
  require_pan_for_vendor, customer_credit_limit_default).
- **Enterprise Architecture Plan** (`docs/ADMIN_ARCHITECTURE_PLAN.md`) — 10-section comprehensive
  migration plan from the current flat admin panel to a 12-module Enterprise Admin Console.
  Covers: 9 current problems, 12 target modules with full detail, 9 Architecture Decisions (Org
  Model, Company Model, User Model, Security Model, Permission Depth, Approval, Masters, Record
  Visibility, Config Lifecycle), target folder structure, 4-layer DB architecture plan (Org/IAM/
  Workflow/Config), 6-phase migration strategy (12 sprints), 8 files to refactor, 5 files to
  deprecate, 10 development rules.

### Files Modified
- `src/app/dashboard/page.tsx` — live role detection, `roleVariant` computation, conditional data queries
- `src/app/dashboard/DashboardClient.tsx` — `roleVariant` prop + `showSales`/`showTeam` flags + conditional sections
- `src/app/settings/SettingsHub.tsx` — expanded from 10 to 26 cards, 7 sections
- `src/app/admin/AdminClient.tsx` — added Finance Ops, Approvals, Masters tabs (11 → 14)
- `src/lib/settings.ts` — 16 new setting defaults + metadata (Finance, Approvals, Masters categories)

### Created
- `docs/ADMIN_ARCHITECTURE_PLAN.md` — full enterprise admin console architecture plan

---

## [2026-06-04 — Session 4] — Admin Console Phase 1 (UI Shell) + Phase 2 (DB Foundation)

> No existing features removed. `npx tsc --noEmit` clean. `npx next build` clean. All changes UNCOMMITTED.

### Admin Console Phase 1 — UI Shell
- **`src/app/settings/AdminConsole.tsx`** — enterprise 12-module grid with live search/filter
- **`src/app/settings/data/adminModules.ts`** — module metadata, stats, recent changes
- **`src/app/settings/components/`** — AdminHeader, AdminSearch, AdminStatsCard, AdminModuleCard, RecentChanges, QuickActions
- **`src/app/settings/page.tsx`** updated to render `<AdminConsole />` (`SettingsHub.tsx` kept as rollback)

### Admin Console Phase 2 — Database Foundation
- **`prisma/schema.prisma`** — 12 new models added: Tenant, Company, Branch, Department, Team, Designation, EmployeeProfile, Role, Permission, RolePermission, UserRole, DataAccessPolicy. 4 back-reference relations added to Employee model.
- **`prisma/migrations/20260604000000_admin_console_foundation/migration.sql`** — offline migration, 12 CREATE TABLE statements + FK constraints. NOT yet deployed.
- **`src/lib/access-control/permissions.ts`** — 50-permission catalogue, MODULE/ACTION/SCOPE constants
- **`src/lib/access-control/policy.ts`** — `resolveScope()` + `canAccessScope()` with OWN/TEAM/DEPARTMENT/BRANCH/COMPANY/ALL handling
- **`src/lib/access-control/index.ts`** — `hasPermission()` + `getAllPermissions()` public API
- **`prisma/seed-admin-foundation.ts`** — idempotent seed: Caveo Infosystems tenant/company/branch, 3 departments, 6 enterprise roles, full permission grants, data access policies
- **`src/lib/roles.ts`** — Phase 3 migration bridge comment added (legacy predicates still live)
- **`npx prisma generate`** — regenerated Prisma client with all 12 new models

### Migration status
- Schema + migration SQL written. `npx prisma migrate deploy` **NOT yet run** against dev/prod DB.
- All new `hasPermission`/`canAccessScope` calls return safe defaults (false / true respectively) until UserRole/DataAccessPolicy rows exist → zero backward-compat breakage.

---

## [2026-06-04] — Expense Categories + Global Vendor Master + Global Customer Master (UI-only, mock)

> Three enterprise UI modules built this session. **All UI-only — no Prisma schema, no
> migrations, no API routes.** All data is illustrative mock in each module's `data.ts`.
> Everything below is **uncommitted**. `npx tsc --noEmit` clean. Pages verified `200` live.

### Added — Expense Category Management (`/finance/expenses/categories`)
- Replaced the "coming soon" placeholder with a full **configuration-driven category engine**.
- `data.ts` (30 mock categories, 7 parents + 23 sub-categories, `deriveCatCaps`, 7 default
  templates) + `ExpenseCategoriesClient` + 5 components: `CategoryTable` (search/sort/paginate/
  column-visibility/bulk-disable), `CategoryFilters`, `CategoryForm` (9 sections A–I: Basic,
  Usage, Payment, Document rules, GST, Approval, Grade-policy, Customer, Tally), `CategoryDrawer`
  (full read view + clone), `CategoryTemplateLoader` (load default Office/Travel/Employee/Business/
  Maintenance/IT/Customer template groups).

### Added — Global Vendor Master (`/masters/vendors`)
- New global CRM master (one `Vendor` referenced by Finance/Expense/Procurement/Inventory/
  Projects/Support/Assets/Tally). `data.ts` (8 mock vendors, complete Indian GST state-code map,
  `validateGSTIN` validator, `deriveVendorCaps`) + `VendorMasterClient` + 10 components:
  `VendorTable`, `VendorFilters`, `VendorForm`, `VendorProfile` (9-tab drawer: Overview/Branches/
  GST/Contacts/Bank/Documents/Transactions/Purchase History/Audit), `VendorBranchManager`
  (multi-branch + per-branch GST), `VendorContactManager`, `VendorBankManager`,
  `VendorDocumentPanel` (expiry alerts), `VendorUsageViewer`, **`GSTRegistrationPanel`** (+
  `GSTINBadge`) — the reusable GSTIN validator field.
- `/finance/vendors` placeholder now **redirects** to `/masters/vendors`.

### Added — Global Customer Master (`/masters/customers`)
- New global CRM master (one `Customer` referenced by CRM Sales/Opps/Quotations/Orders/Projects/
  Support/AMC/Assets/Finance/Profitability/Engineer-Visits/Conveyance). **Extends** the existing
  `Customer` model — does NOT duplicate it; the legacy operational `/customers` page (live DB
  import + dedupe) is untouched. `data.ts` (8 mock customers incl. ABC Group hierarchy parent +
  2 subsidiaries, `deriveCustomerCaps`, duplicate detection, profitability math; reuses the
  Vendor GST validator) + `CustomerMasterClient` + 13 components: `CustomerTable`,
  `CustomerFilters`, `CustomerForm` (Basic/Hierarchy/Commercial/Sites + duplicate warning),
  `CustomerProfile` (12-tab drawer), `CustomerSiteManager` (multi-site + per-site GST + geo
  lat/long), `CustomerContactManager`, `CustomerGSTPanel`, `CustomerHierarchyViewer` (parent↔child
  tree), `CustomerAssetPanel` (warranty/AMC/SLA), `CustomerProfitabilityPanel` (revenue−cost=margin),
  `CustomerDocumentPanel`, `CustomerTimeline` (audit), `CustomerRelationshipViewer` (linked
  Opps/Quotations/Orders/Projects/Support/AMC/Finance/Expenses, finance-gated).

### Fixed
- **Login broken (dev quick-login 404).** An orphaned `next dev` process held port 3000 and
  served a stale Turbopack route tree where `/api/dev/switch` wasn't registered → quick-login
  couldn't set the `dev_employee_id` cookie. Fix: killed the orphan, cleared `.next`, restarted
  clean. (CLAUDE.md gotcha #10.) No code change.
- Removed a dead `GST_RATES` import in `vendors/components/GSTRegistrationPanel.tsx` (latent
  unused-import that broke `tsc` once Customer Master pulled the module into the graph).

### Changed
- `src/components/SidebarLinks.tsx` — added a **Masters** section (Customer Master + Vendor
  Master) to Manager, Accounts, and Employee role groups; Finance-nav "Vendors" link now points
  to `/masters/vendors`.

### Files Modified
- `src/components/SidebarLinks.tsx` (Masters section + Vendor link), `src/app/finance/vendors/page.tsx`
  (now a redirect), `src/app/finance/expenses/categories/page.tsx` (placeholder → real),
  `src/app/masters/vendors/components/GSTRegistrationPanel.tsx` (dead-import cleanup).
- New: everything under `src/app/masters/` (29 files) and `src/app/finance/expenses/categories/` (8 files).

### Database Changes
- **None.** No schema, migrations, or Prisma model changes.

### Config Changes
- **None.**

---

## [2026-06-03] — Finance Operations Module · Phase 2 UI (mock data, no backend)

> Entire finance UI built this session. **UI-only — no Prisma schema, no migrations, no API
> routes.** All data is illustrative mock held in each module's `data.ts` (money in ₹ rupees).
> Everything below is **uncommitted** in the working tree.

### Added — Finance navigation & shell
- `canManageFinance(user)` predicate in `src/lib/roles.ts` (manager / Accounts / Operations Head).
- Collapsible **Finance** section in `src/components/SidebarLinks.tsx` (Accounts ▸ Cash/Bank
  Book, Expenses ▸ Register/Add/Categories, Vendors, Employees ▸ Claims/Advance/Conveyance,
  Approvals, Vouchers, Reports) — full nav for finance roles, own-data nav for employees.
- 13 finance route placeholders, later filled: `/finance`, `/finance/cash-book`,
  `/finance/bank-book`, `/finance/expenses(+/new,/categories)`, `/finance/vendors`,
  `/finance/claims`, `/finance/advances`, `/finance/conveyance`, `/finance/approvals`,
  `/finance/vouchers`, `/finance/reports`.

### Added — Finance Dashboard (`/finance`)
- `FinanceDashboardClient.tsx` — 8 KPI tiles, 4 inline-SVG charts (monthly trend, category
  donut, cash flow, top categories), quick actions, period/branch/account filters. Mirrors
  the CRM dashboard language.

### Added — Bank Book (`/finance/bank-book`)
- `BankBookClient.tsx` + `data.ts` + 9 components: `BankBalanceCard`, `BankFilters`,
  `BankTransactionTable` (search/sort/paginate/column-visibility/bulk reconcile),
  `BankTransactionDrawer`, `BankSummaryPanel`, `BankStatementUpload`, `BankImportPreviewTable`,
  `BankImportHistoryTable`, `BankImportWizard` (4-step CSV/XLS import with match suggestions).
- Bank↔source mapping: link a bank line to a Collection / Customer Advance / Expense; shown
  in table + drawer "Mapped To"; import preview suggests settlements by amount.

### Added — Cash Book (`/finance/cash-book`) — upgraded to Bank Book maturity
- `CashBookClient.tsx` + `data.ts` + 8 components: `CashBalanceCard` (re-exports Bank card),
  `CashFilters`, `CashTransactionTable`, `CashTransactionDrawer`, `CashSummaryPanel`,
  `CashReconciliationPanel` (physical-count vs system, variance, remarks), `CashTransferPanel`
  (Transfer From / Deposit To Bank), `CashVoucherPanel`. Customer-cost + employee-finance
  panels; accounting-ledger running balance.

### Added — Expense Register (`/finance/expenses`)
- `ExpenseRegisterClient.tsx` + `data.ts` + 11 components: `ExpenseSummaryCard`,
  `ExpenseFilters` (18 fields), `ExpenseTable` (bulk approve / generate vouchers / mark paid),
  `ExpenseForm` (sections A–G, dynamic by type), `ExpenseDetailsDrawer`,
  `ExpenseApprovalTimeline`, `ExpenseAttachmentViewer`, `GSTInputSection` (auto CGST/SGST/IGST),
  `VoucherPreviewPanel`, `CustomerExpensePanel` (profitability), `EmployeeClaimPanel` (advance).
- Standalone `/finance/expenses/new/ExpenseEntryForm.tsx` (full-page entry; superseded by the
  register's drawer form but kept).

### Added — Mobile finance screens
- `ExpenseClaimScreen.tsx` (bill photo placeholder, category chips, amount, submit) and
  `ConveyanceScreen.tsx` (customer/vehicle, start/end location placeholder capture, KM, claim
  calc — no Google API). Wired into `MobileApp.tsx`, `MeScreen.tsx` (Finance section), and the
  `QuickLogSheet` FAB. New `MIcon` glyphs: `camera`, `car`, `pin`, `route`, `rupee`.

### Added — cross-module + docs
- `src/app/finance/_shared/transferStore.ts` — module-level singleton so a Cash Book
  Bank↔Cash transfer posts the paired Bank Book entry (both books seed `mock + store`).
- `docs/modules/finance/BANK_LEDGER_MAPPING.md` — schema + service design for ledger
  persistence (source links, paired posting, reconciliation) — deferred to a DB phase.
- Rewrote `docs/modules/finance/UI_REQUIREMENTS.md` to the full 12-screen spec.

### Fixed
- **Bank↔Cash transfer not reflecting in Bank Book** — Cash Book transfer now creates both
  legs (cash + paired bank, cross-referenced) via the shared store.

### Changed
- **Filters moved to the top of all 3 finance pages, made collapsible** (collapsed by default,
  click the "Filters" bar to expand) with an active-filter count badge.

### Files Modified
- `src/lib/roles.ts`, `src/components/SidebarLinks.tsx`, `src/app/mobile/MobileApp.tsx`,
  `src/app/mobile/components/MIcon.tsx`, `src/app/mobile/screens/MeScreen.tsx`,
  `src/app/mobile/screens/QuickLogSheet.tsx`, `docs/modules/finance/UI_REQUIREMENTS.md`.
- New: everything under `src/app/finance/`, two mobile screens, `BANK_LEDGER_MAPPING.md`.

### Database Changes
- **None.** No schema, no migrations, no Prisma model changes this session.

### Config Changes
- **None.**

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
