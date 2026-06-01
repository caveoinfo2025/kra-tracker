# Database

**Engine:** SQLite · **ORM:** Prisma 7.8 · **Schema:** `prisma/schema.prisma` ·
**Client output:** `src/generated/prisma` · **16 models, 16 migrations.**

> Money fields ending in `Lakhs` are ₹ Lakhs (Float). Status/stage/role fields are
> free-form strings validated in app code, not DB enums.

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

## 4. Migrations (chronological)
`init` → `activity_sheets_and_ms_auth` → `billing_without_gst` → `weekly_commit` →
`closed_date_to_sales_funnel` → `certification` → `payment_received_date` (×2) →
`pipeline_module` (×2) → `app_settings` → `rbac` → `customer_master` →
`po_date_salesfunnel` → `payments_advances_notifications` → `reports_to_hierarchy`.

## 5. Important Rules
- **Local workflow:**
  ```bash
  DATABASE_URL="file:./prisma/dev.db" npx prisma migrate dev --name <change>
  npx prisma generate
  # then RESTART the dev server (Turbopack caches the old client → 500s)
  ```
- **Never** use `mode: "insensitive"` (SQLite-unsupported, throws).
- **Money** stored in ₹ Lakhs; never raw rupees.
- **Collection cached fields** (`amountReceivedLakhs`, `collectionStatus`,
  `paymentReceivedDate`) must only be changed via `syncCollectionTotals()` — never hand-set.
- **Closed Won** requires `poDate`; the app enforces this before write.
- Prisma client output lives in `src/generated/prisma` — regenerate, never hand-edit.
