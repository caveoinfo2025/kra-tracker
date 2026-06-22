# Database

**Engine:** **MySQL / MariaDB 11.8** (migrated from SQLite 2026-06-02) · **ORM:** Prisma 7.8
(driver-adapter mode, `@prisma/adapter-mariadb`) · **Schema:** `prisma/schema.prisma`
(`provider="mysql"`) · **Client output:** `src/generated/prisma` ·
**60+ models, 10 migrations.** Dev DB fully migrated (2026-06-05, session 4).

> **Planned: Decimal money migration.** Before Finance write APIs are built, every money-like
> `Float`/`Float?` field (`Collection`, `Payment`, `Expense`, `Voucher`, `Ledger`,
> `EmployeeAdvance`, `TravelClaim`, `FinAccount`, etc.) should migrate to `Decimal(18,2)` to
> avoid float-rounding errors in accounting totals. See
> `docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md` (Step 3G) for the full field inventory and
> phased plan — not yet implemented; schema is still `Float` everywhere as of this note. The
> central Decimal-safe parsing/serialization/arithmetic helper this plan calls for is already
> built — `src/lib/money.ts` (Step 3H) — and has been wired internally into the Bank Book, Cash
> Book, Expense, and Finance Dashboard read routes' calculations (Steps 3I–3L); the remaining
> Finance read routes were reviewed and found to have nothing to wire (Step 3M). **Money unit
> policy locked (2026-06-22, before Step 3O): only CRM Lead/Opportunity/pipeline-estimate fields
> may use Lakhs — every Finance/Accounting field must store actual INR.** Verification found
> every existing Finance `*Lakhs` field genuinely stores ₹ Lakhs today (e.g.
> `EmployeeAdvance.amountLakhs: 0.5` = ₹50,000), so adopting this policy requires a coordinated
> value transformation (×100,000 per row), not just a naming fix — see
> `docs/database/DECIMAL_CONVERSION_READINESS_CHECK.md` §0. **Step 3O** (2026-06-22) completed
> the live dev data profile (clean, no blockers — `u686730471_caveodev`), designed the
> Lakhs-to-INR transformation field-by-field, inventoried every UI converter/API comment that
> assumes Lakhs, and analyzed the cross-cutting risk that `Collection.invoiceValueLakhs`/
> `amountWithoutGstLakhs` feed `src/lib/kra-engine.ts`'s KRA scoring (`KRATemplateItem` targets
> are genuinely Lakhs-based — confirmed via `prisma/seed-performance-defaults.ts` — so
> `Collection`'s conversion needs an explicit `/100000` at the KRA-engine scoring boundary). See
> the readiness check's §12 sign-off table for the full decision ledger. **As of Step 3O, schema
> conversion remains BLOCKED**: Release 1 (`Expense`/`EmployeeAdvance`/`TravelClaim`) is "Approved
> with notes" pending a tested transformation script; Release 2 (`Payment`/`Collection`) is
> explicitly Blocked pending the KRA-engine sign-off.

> **2026-06-10 (Session 6) — Phase 12 Integration Center + Phase 13 Security Center.**
> Two new migration blocks applied to `u686730471_caveodev` (uncommitted to git):
>
> **`20260610080000_integration_center`** — 5 tables:
> - `integration_provider` — `name, code(unique), category(EMAIL/GST/MAPS/WHATSAPP/SMS/WEBHOOK/ACCOUNTING/CALENDAR/ERP/CUSTOM), baseUrl?, status, configJson(@db.Text)`
> - `integration_connection` — `providerId→integration_provider, connectionName, authType, secretRef(env var NAME only), configJson(@db.Text), status, lastTestAt?, lastTestStatus, lastTestMessage?`
> - `integration_usage_rule` — `connectionId, module, resource, action, isEnabled, conditionJson?`
> - `integration_log` — `connectionId, eventType, status, requestSummary, responseCode?, durationMs?, errorMessage?, createdAt`
> - `api_key_reference` — `name, keyType(API_KEY/OAUTH_TOKEN/WEBHOOK_SECRET/BASIC_AUTH/BEARER_TOKEN/CUSTOM), environmentVariableName(unique), description?, isActive, createdAt, updatedAt`
>
> **Prisma model casing gotcha (Phase 12):** `APIKeyReference` → `prisma.aPIKeyReference` (Prisma lowercases the leading acronym).
>
> **`20260610090000_security_center`** — 7 tables:
> - `security_policy` — `policyType(unique), configJson(@db.Text), status, updatedAt`
> - `password_policy` — `minimumLength, requireUppercase, requireLowercase, requireNumber, requireSpecialCharacter, expiryDays, passwordHistoryCount, failedAttemptLimit, lockDurationMinutes, status`
> - `mfa_policy` — `enabled(BOOL), requiredRolesJson(@db.Text), methodsJson(@db.Text), rememberDeviceDays, status`
> - `session_policy` — `idleTimeoutMinutes, maxSessionHours, allowConcurrentLogin, maxConcurrentSessions, rememberMeAllowed, status`
> - `access_restriction_policy` — `ipRestrictionEnabled, allowedIpJson(@db.Text), businessHourRestriction, allowedHoursJson(@db.Text), locationRestrictionJson(@db.Text), status`
> - `data_protection_policy` — `exportLimit, exportApprovalRequired, downloadRestriction, sensitiveFieldsJson(@db.Text), maskingRulesJson(@db.Text), status`
> - `security_event_log` — `userId?, eventType, ipAddress?, userAgent?, details(@db.Text), severity, createdAt`. 14 event types: LOGIN_SUCCESS/FAILED, LOGOUT, PASSWORD_CHANGED, ROLE_CHANGED, EXPORT_REQUESTED/BLOCKED, ACCESS_DENIED, MFA_CHALLENGED/PASSED/FAILED, POLICY_CHANGED, SESSION_EXPIRED, ACCOUNT_LOCKED.
>
> **Prisma model casing gotcha (Phase 13):** `MFAPolicy` → `prisma.mFAPolicy`.
>
> **2026-06-05 (Session 4) — CRM Admin Engine + Opportunity close fields.** 4 new migrations
> applied to `u686730471_caveodev` (hand-written SQL → `node apply-*.mjs` → `migrate resolve`):
> - **`20260605000000_opportunity_discount_pct`** — `CrmOpportunity.discountPct DOUBLE DEFAULT 0`
>   (non-zero triggers the `DISCOUNT_APPROVAL` workflow).
> - **`20260605010000_crm_admin_engine`** — 7 tables: `pipeline_definition`, `pipeline_stage`,
>   `territory`, `territory_rule`, `account_assignment_rule`, `crm_automation_rule`, `sla_rule`
>   (all `@@map`-ped snake_case; `pipeline_stage.pipelineId`→`pipeline_definition` and
>   `territory_rule.territoryId`→`territory` are `ON DELETE CASCADE`).
> - **`20260605020000_opportunity_won_fields`** — `CrmOpportunity` + `dealValueExTax DOUBLE`,
>   `netMargin DOUBLE`, `poNumber VARCHAR(191)`, `poDate DATETIME(3) NULL`.
> - **`20260605030000_legacy_promote_and_net_profit`** — `CrmOpportunity.netMargin` **renamed** to
>   `netProfitLakhs` (absolute ₹L, not %); `SalesFunnel.crmOpportunityId INT NULL` (tracks legacy→
>   opportunity promotion; idempotency + funnel-hide key).
>
> **Prisma acronym casing (CRM-admin models):** accessors are `prisma.cRMAutomationRule` and
> `prisma.sLARule`; type imports are `CRMAutomationRuleModel` / `SLARuleModel` from
> `@/generated/prisma/models/<Name>`. `src/lib/crm-engine/` re-exports friendly aliases.

> **2026-06-05 (Session 3) — DB Migration applied.** All 4 pending Admin Console migrations are
> live on `u686730471_caveodev`. Admin Console Phase 2 (12 models), Policy Engine Phase 5 (6
> models), Workflow Engine Phase 6 (7 models), Master Data Phase 7 (8 models).

> **@@map pattern (Phases 6 & 7 only):** Migrations for workflow engine and master data used
> snake_case SQL table names (`workflow_definition`, `master_category`, etc.) while Prisma model
> names are PascalCase. `@@map("snake_case")` directives were added to all 15 affected models so
> Prisma resolves the correct table. Phases 2 & 5 used PascalCase in both SQL and model names —
> no @@map needed there.

> **Seed actor:** All Phase 5–7 seeds that reference an Employee FK (creator, performer) use
> `{ connect: { id: N } }` relation syntax (not bare FK integer) because Prisma 7 validates
> required relations at create time. The actor ID is resolved dynamically from `findFirst` or
> hardcoded to `2` (Vijesh Vijayan, first dev employee).

> **2026-06-04 (Session 1):** **No schema/migration/model changes this session.** Expense Categories,
> Vendor Master, and Customer Master are all **UI-only on mock data** (in each module's
> `data.ts`). No Prisma models added. **Architecture note — Customer Master:** the new global
> `/masters/customers` UI deliberately does **NOT** add a model — it extends the **existing**
> `Customer` model (`id/name/address/district/state/pincode/gstNo/officeType/parentId/branches/
> crmSource`). The enterprise fields shown in the UI (customerType, industry, sites with
> per-site GST, contacts, commercial, assets, profitability, documents) are the **target shape**
> for a future, additive migration on the existing `Customer` table + new child tables — not a
> parallel model. Likewise Vendor Master's UI shape targets the existing Phase-1 `Vendor` model.

> **2026-06-03:** **No schema/migration/model changes this session.** Finance Phase 2 was
> **UI-only on mock data** (`src/app/finance/**/data.ts`) — no Prisma changes. The mock shapes
> are the contract for the future finance APIs built against the existing Phase 1 models.
> See `docs/modules/finance/BANK_LEDGER_MAPPING.md` for the proposed (deferred) `Ledger`
> source-link columns.

> Money fields ending in `Lakhs` are ₹ Lakhs (`Float` → MySQL `DOUBLE`). Status/stage/role
> fields are free-form strings validated in app code, not DB enums. Long-text columns use
> `@db.Text` (avoid MySQL's default `VARCHAR(191)` truncation). Charset `utf8mb4_unicode_ci`.

> **Connection:** built in `src/lib/prisma.ts` from `DATABASE_URL` (host **`127.0.0.1`**, not
> `localhost`). Prisma 7 forbids `url` in `schema.prisma`, so it lives in `prisma.config.ts`.
> Hostinger/Passenger escapes `%`→`\%` in injected env — `prisma.ts` strips that before parsing.

## 1. Models

### People & performance
- **Employee** — `id, name, email(unique), department, role, isManager, msEmail?(unique),
  msId?(unique), createdAt, reportsToId?`. Org chart self-relation `reportsTo`/`reports`.
- **KRA** — `title, description, target, deadline, weight(=100), status(=active)`,
  `employeeId`. `target` = `"key:value;key:value"` parsed by the KRA engine.
- **WeeklyReview** — `week, year, progress, score, notes, blockers`, `employeeId, kraId`.
- **WeeklyCommit** — `week, year, commitText`, `employeeId, kraId` (forecast accuracy).
- **Certification** — `certName, issuingBody, dateObtained, expiryDate?, attachmentUrl,
  status(=pending), approvedBy?, approvedAt?`, `employeeId, kraId`.

### Activity sheets (feed the KRA engine)
- **LeadGeneration** — `date, territory, leadSource, customerName, contactPerson,
  phoneEmail, activityType, activityCount(=1), leadStatus(=New), qualifiedFlag,
  nextActionDate?, remarks`, `employeeId`.
- **SalesFunnel** — `opportunityId, createdDate, territory, customerName, solutionCategory,
  opportunityName, stage(=Lead), dealValueLakhs, billingValueLakhs, grossProfitPct,
  proposalDate?, expectedCloseDate?, poDate?, closedDate?, probabilityPct, status(=Active),
  newCustomerFlag, pocFlag, remarks`, `employeeId`. **`poDate` mandatory for Closed Won →
  mirrored into `closedDate`.**
- **Collection** — `invoiceDate, invoiceNo, customerName, invoiceValueLakhs,
  amountWithoutGstLakhs, dueDate, paymentReceivedDate?, amountReceivedLakhs (cached),
  collectionStatus(=Pending), remarks`, `employeeId`, `payments[]`.
- **DailyUpdate** — `date, topUpdates, keyMovement, blockers, topDealThisWeek,
  managerSupportRequired, updateStatus(=On Track)`, `employeeId`.

### Finance
- **Payment** — `collectionId, amountLakhs, paymentDate, mode(=Bank Transfer), referenceNo,
  notes, fromAdvanceId?, recordedById`. Many per Collection; cached totals re-synced.
- **OrderAdvance** — `salesFunnelId?, customerName, amountLakhs, receivedDate, mode,
  referenceNo, notes, status(=unapplied), appliedToCollectionId?, appliedDate?, recordedById`.
- **Notification** — `recipientId, type(payment|advance|system), title, body, link,
  amountLakhs?, isRead`. Index `(recipientId, isRead)`.

### Pipeline / CRM
- **CrmLead** — `title, companyName, contactPerson, email, phone, source(=Direct)`,
  external refs (`categoryId/Name, oemId/Name, productId/Name, customerId/Name`),
  `stage(=NEW_LEAD), expectedValue, remarks`, `assignedToId, createdById`.
  Stages: `NEW_LEAD → CONTACTED → QUALIFIED → REQUIREMENT_GATHERED → SOLUTION_PROPOSED →
  POC_DEMO → PROPOSAL_SENT`.
- **CrmOpportunity** — `leadId(unique), stage(=PROPOSAL_SENT), value, expectedClosureDate?,
  probability(=50), lostReason, status(=active)`.
  Stages: `PROPOSAL_SENT | FOLLOW_UP | NEGOTIATION | WON | LOST | ON_HOLD`.
- **CrmTask** — `title, description, dueDate, assignedToId, status(=pending),
  priority(=medium), leadId?, opportunityId?`.
- **CrmMeeting** — `title, meetingDate, notes, attendees, location, leadId?,
  opportunityId?, employeeId`.
- **CrmActivity** — `entityType, entityId, action, description, meta(JSON), performedById,
  timestamp, leadId?, opportunityId?` (audit feed).
- **CrmNote** — `content, leadId, authorId`.

### Master & config
- **Customer** — `name, address, district, state, pincode, gstNo, officeType(=HO),
  parentId?` (self-relation `CustomerBranches`), `crmSource`. Auto-seeded + deduped.
- **AppSetting** — `category, key(unique), label, value(JSON), description, updatedAt,
  updatedById?`. Defaults in `src/lib/settings.ts`; DB rows override.
- **AppRole** — `name(unique=Employee.role), label, level(100=top), color, isSystem,
  description`, `pageAccess[]`.
- **RolePageAccess** — `roleId, pageKey, canView/Create/Edit/Delete`, unique
  `(roleId, pageKey)`. 14 pages in `rbac.ts`.

## 2. Relationships
- **Employee 1—N** KRA, WeeklyReview, WeeklyCommit, Certification, LeadGeneration,
  SalesFunnel, Collection, DailyUpdate, Payment (recordedBy), OrderAdvance (recordedBy),
  Notification (recipient), CrmLead (assignedTo + createdBy), CrmTask, CrmMeeting,
  CrmActivity, CrmNote.
- **Employee 1—N Employee** via `reportsTo`/`reports` (`OrgChart`, `onDelete: SetNull`).
- **KRA 1—N** WeeklyReview, WeeklyCommit, Certification.
- **Collection 1—N Payment.** Cached fields on Collection are derived from this ledger.
- **CrmLead 1—1 CrmOpportunity**; CrmLead 1—N Task/Meeting/Activity/Note.
- **CrmOpportunity 1—N** Task/Meeting/Activity.
- **AppRole 1—N RolePageAccess** (`onDelete: Cascade`).
- **Customer 1—N Customer** via `parent`/`branches` (HO → branches).

## 3. Cascade Rules
- Child rows `onDelete: Cascade` from Employee / CrmLead / CrmOpportunity / Collection /
  AppRole.
- `Employee.reportsTo` → `onDelete: SetNull`.
- `Customer.parent` is a soft self-relation (no cascade).

## 3b. Indexes (added in the MySQL baseline)
Beyond the implicit unique indexes, `@@index` covers FK / hot-filter columns:
`Employee.reportsToId` · `KRA.employeeId` · `WeeklyReview(employeeId, kraId)` ·
`LeadGeneration.employeeId` · `SalesFunnel.employeeId` + `(stage,status)` ·
`Collection.employeeId` + `collectionStatus` + `dueDate` · `Payment.collectionId` +
`paymentDate` + `recordedById` · `OrderAdvance.recordedById` + `status` ·
`Notification(recipientId,isRead)` + `createdAt` · `DailyUpdate(employeeId,date)` ·
`WeeklyCommit(employeeId,week,year)` + `kraId` · `Certification.employeeId` + `kraId` ·
`CrmLead.assignedToId/createdById/stage` · `CrmOpportunity(stage,status)` ·
`CrmTask.assignedToId/leadId/opportunityId` · `CrmMeeting.leadId/opportunityId/employeeId` ·
`CrmActivity.leadId/opportunityId/performedById/timestamp` · `CrmNote.leadId/authorId` ·
`Customer.parentId` + `name`.

## 4. Migration history
- **2026-06-02 — SQLite → MySQL/MariaDB.** The pre-migration SQLite migration history (16
  migrations: `init` → … → `reports_to_hierarchy`) was **removed**; a single MySQL baseline
  **`20260601000000_init_mysql`** now represents the full schema. `migration_lock.toml`
  provider is `mysql`. On production, the `_prisma_migrations` table was seeded with a
  baseline row so `prisma migrate deploy` is a no-op against the already-built DB.
- **Data migration:** read from SQLite via `better-sqlite3`, loaded into MariaDB via the
  `mysql` CLI (FK checks off during load), AUTO_INCREMENT counters reset to `MAX(id)+1`, then
  every table's row count verified identical (all 22 matched).

## 5. Important Rules
- **Local workflow (now MySQL):**
  ```bash
  # DATABASE_URL must point at a MySQL/MariaDB dev DB (host 127.0.0.1)
  npx prisma migrate dev --name <change>
  npx prisma generate
  # then RESTART the dev server (Turbopack caches the old client → 500s)
  ```
- **`contains` is case-insensitive** under `utf8mb4_unicode_ci`; `mode:"insensitive"` is
  unnecessary (it threw on SQLite; harmless-but-pointless on MySQL).
- **Money** stored in ₹ Lakhs as `Float`/`DOUBLE`. **Deferred:** switch `*Lakhs`/value fields
  to `@db.Decimal(12,4)` for exact decimal storage (avoids `DOUBLE` drift; `round2()` is the
  current mitigation). A native-type override needs no app-code change but verify aggregates.
- **Collection cached fields** (`amountReceivedLakhs`, `collectionStatus`,
  `paymentReceivedDate`) must only be changed via `syncCollectionTotals()` — never hand-set.
- **Closed Won** requires `poDate`; the app enforces this before write.
- **`url` is not allowed in `schema.prisma`** (Prisma 7) — keep it in `prisma.config.ts`.
- Prisma client output lives in `src/generated/prisma` — regenerate, never hand-edit.
- **Transaction safety (debt):** `recordPayment`/`applyAdvance` in `payments.ts` run multiple
  writes WITHOUT a `$transaction`, and `syncCollectionTotals` is read-modify-write. Under
  SQLite's single-writer this was safe; on MySQL with concurrent connections wrap these in
  `prisma.$transaction` (and consider `SELECT … FOR UPDATE`) before high write volume.

---

## 6. Platform Migration Record (append-only)

### SQLite → MySQL — completed 2026-06-02

| Item | Before | After |
|---|---|---|
| Engine | SQLite (file-based) | **MySQL 8-compatible · MariaDB 11.8** |
| ORM adapter | `@prisma/adapter-better-sqlite3` | `@prisma/adapter-mariadb` |
| Provider | `sqlite` | **`mysql`** |
| Migrations | 16 SQLite migrations (`init` → `reports_to_hierarchy`) | 1 MySQL baseline (`20260601000000_init_mysql`) |
| Datasource URL | `prisma.config.ts` (SQLite file path) | `prisma.config.ts` (**`DATABASE_URL`** — MySQL TCP) |

All 22 tables were migrated with identical row counts verified. SQLite is permanently
removed from the codebase. `better-sqlite3` / `@types/better-sqlite3` remain in
`package.json` as a cleanup debt item (safe to remove; only used by the deleted migration script).

### Canonical database stack (do not change without updating this section)
```
Database : MySQL 8-compatible — MariaDB 11.8 (Hostinger)
ORM      : Prisma 7 (prisma-client generator — driver-adapter mode, no binary engine)
Adapter  : @prisma/adapter-mariadb  +  mariadb (npm driver)
Provider : mysql   (schema.prisma)
Collation: utf8mb4_unicode_ci   (case-insensitive LIKE / contains)
```

### MySQL-compatible Prisma design rules — mandatory for all future modules
Every new Prisma model, migration, API route, or service file added to this project must
follow these rules without exception:

1. **`provider = "mysql"`** — the schema provider must never be changed back to `sqlite`
   or switched to `postgresql` without a full migration plan.

2. **`url` in `prisma.config.ts` only** — Prisma 7's `prisma-client` generator does not
   allow `url` inside `schema.prisma`. Keep it in `prisma.config.ts`.

3. **`@db.Text` on all long strings** — MySQL maps an undecorated Prisma `String` to
   `VARCHAR(191)`, silently truncating content over 191 characters. Any field that holds
   notes, descriptions, JSON, remarks, or free-form text must use `@db.Text`.

4. **`@@index` on every FK and filter column** — MySQL does not auto-create indexes on
   foreign-key columns the way SQLite did. Missing indexes produce silent full-table scans.
   Add `@@index([foreignKeyColumn])` for every relation field and every column that appears
   in `where` clauses.

5. **Money fields** — current standard is `Float` → MySQL `DOUBLE`. The planned upgrade is
   `@db.Decimal(12,4)` for exact decimal arithmetic. Never use `Int` or `String` for money.

6. **Case-insensitive search** — the `utf8mb4_unicode_ci` collation makes `contains`
   (and `LIKE`) case-insensitive by default. Do not add `mode: "insensitive"` to Prisma
   queries — it is unnecessary and was only valid on PostgreSQL.

7. **Connection string** — always use `127.0.0.1` as the host, never `localhost`. The
   `mariadb` Node driver maps `localhost` to a unix socket which times out on Hostinger.

8. **Prisma migrations against MySQL only** — running `prisma migrate dev` requires a live
   MySQL/MariaDB instance. SQLite file-path URLs will be rejected by `provider = "mysql"`.
   Set `DATABASE_URL` in your local `.env` to a MySQL connection string before running any
   migration command.

9. **Multi-step writes → `prisma.$transaction`** — MySQL supports real concurrent
   connections. Any sequence of reads + writes that must be atomic (e.g., recording a
   payment and syncing collection totals) must be wrapped in `prisma.$transaction` to
   prevent partial writes under concurrency.

---

## 7. Finance Operations Module — Phase 1 (database, 2026-06-02)

> Implemented + tested on the dev DB; **uncommitted** at session end. No API/UI yet.
> Full column-level spec: `docs/modules/finance/DATABASE_SCHEMA.md` + `PRISMA_MODELS.md`.

### Models added (10)
| Model | Purpose | Key fields / notes |
|---|---|---|
| `FinAccount` | Chart of accounts (cash + bank) | `type` (cash\|bank), `currentBalance` (cached) |
| `Ledger` | General ledger entries vs an account | `direction` (debit\|credit), `reconciled`, FK→FinAccount/Voucher/Employee |
| `Vendor` | Vendor master | GSTIN, PAN, bank, `paymentTerms`, soft `isActive` |
| `Expense` | Expense register | category inline, `gstRate/gstAmountLakhs`, `attachmentsJson` (Text), `status` |
| `Voucher` | Numbered vouchers | `voucherNo @unique` (`CI/YY-YY/00001`), `type`, `status` |
| `VoucherSequence` | Atomic per-FY counter | `financialYear @unique`, `lastNumber` (increment in `$transaction`) |
| `EmployeeAdvance` | Staff advances | `advanceNo @unique`, lifecycle pending→disbursed→settled, `balanceLakhs` (cached) |
| `TravelClaim` | Local conveyance | GPS lat/lng, `distanceKm`, `mode`, `ratePerKm`, `amountLakhs` |
| `ApprovalRule` | Approval policy | amount thresholds + role per level (1–3), `entityType` |
| `AuditLog` | Generic financial audit trail | `entityType+entityId`, `action`, `performedById`, `changes` (JSON Text) |

Plus **9 back-reference relations on `Employee`** (`ledgerEntries`, `expenses`,
`expensesApproved`, `vouchersCreated`, `employeeAdvances`, `employeeAdvancesApproved`,
`travelClaims`, `travelClaimsApproved`, `auditLogs`).

### FK delete rules
- Required refs (`Ledger.accountId/recordedById`, `Expense.employeeId`, `Voucher.createdById`,
  `EmployeeAdvance/TravelClaim.employeeId`, `AuditLog.performedById`) → `ON DELETE RESTRICT`.
- Optional refs (`*.voucherId`, `Expense.vendorId/approvedById`, `*.approvedById`) → `ON DELETE SET NULL`.
- `disbursedFromId` (EmployeeAdvance) and `pairedLedgerId` (Ledger) are **soft refs** (no FK).

### Cached fields (mutate via service only — no API in Phase 1)
`FinAccount.currentBalance`, `EmployeeAdvance.balanceLakhs`, `VoucherSequence.lastNumber`.

### Migration
- **`20260602120000_finance_operations_phase1`** — 10 `CREATE TABLE`, 15 FKs, inline indexes,
  `utf8mb4_unicode_ci`. **Generated offline** via
  `prisma migrate diff --from-schema <baseline> --to-schema prisma/schema.prisma --script`
  (no local MySQL was available). Applies on the next `prisma migrate deploy` (Hostinger build).

### Seeds
- `prisma/seed.ts` — finance **config** (cash+bank account, `VoucherSequence` FY 26-27,
  default `ApprovalRule`); idempotent; wired via `prisma.config.ts` `migrations.seed`.
- `prisma/seed-dev-users.ts`, `prisma/seed-dev-finance.ts` — **dev-only**, run with `npx tsx`.
