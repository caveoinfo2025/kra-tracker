# Database

**Engine:** **MySQL / MariaDB 11.8** (migrated from SQLite 2026-06-02) · **ORM:** Prisma 7.8
(driver-adapter mode, `@prisma/adapter-mariadb`) · **Schema:** `prisma/schema.prisma`
(`provider="mysql"`) · **Client output:** `src/generated/prisma` ·
**22 models, 1 baseline migration.**

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
