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

### 2026-06-21 — Decimal money migration plan created (Step 3G)
Step 3G completed: created `docs/database/DECIMAL_MONEY_MIGRATION_PLAN.md` — a planning/
documentation step only, ahead of Finance write APIs being built. Inventoried every money-like
`Float`/`Float?` field in `prisma/schema.prisma`: 35 fields classified Critical (`Collection`,
`Payment`, `OrderAdvance`, `FinAccount`, `Ledger`, `Expense`, `Voucher`, `EmployeeAdvance`,
`TravelClaim` — the models with live or imminent Finance write-API exposure), Important
(approval/policy money thresholds — `ApprovalRule`, `ExpenseLimitRule`, `ConveyancePolicy`,
`AdvancePolicy`, `CustomerCreditPolicy` — plus CRM pipeline deal-value estimates —
`SalesFunnel.dealValueLakhs`/`billingValueLakhs`, `CrmLead.expectedValue`,
`CrmOpportunity.value`/`dealValueExTax`/`netProfitLakhs`), and Later (`Notification.amountLakhs`,
a display-only denormalized copy). Explicitly excluded 12 non-money numeric fields so a future
implementation step doesn't assume every `Float` is money: `TravelClaim.distanceKm` and its GPS
lat/lng fields, `SalesFunnel.grossProfitPct`/`probabilityPct`, `CrmOpportunity.discountPct`/
`probability`, `Expense.gstRate` (a tax *rate*, distinct from the already-included
`gstAmountLakhs` tax *amount*), and the metric-dependent KRA target/score/rating fields
(`KRATemplateItem`, `KRAAchievement`, `PerformanceReview`). Recommended standard: money amounts
→ `Decimal(18,2)`, per-unit rate fields (`ratePerKm`) → `Decimal(10,4)`, tax/percentage fields →
`Decimal(8,4)` or left unchanged. Documented the API-serialization risk (Prisma `Decimal` is not
a plain JS `number`) with a recommendation to build one central money-serialization helper before
any column conversion — citing the concrete, already-existing symptom of this exact problem:
`src/lib/payments.ts`'s `round2()` (`Math.round(n*100)/100`) and the `received + 0.001 >= invoice`
epsilon-comparison hack in `syncCollectionTotals()`, both workarounds for float-precision noise on
`Payment.amountLakhs`/`Collection.invoiceValueLakhs` today. Defined a 7-phase (A–G) migration
safety plan, MySQL `ALTER COLUMN` data-rewrite risk notes (back up dev/prod first, compare
before/after `SUM()` totals, reuse the Step 3B shadow-DB-free migration workaround with manual
SQL review), and a proposed Step 3H (money helper) → 3I (Expense/Advance/TravelClaim) → 3J
(Payment/Collection) → 3K (Voucher/Ledger/FinAccount, gated on the cancellation/reversal design
per the existing Step 3B-0 void/reversal-only decision) → 3L (dashboard/report updates) → 3M
(data comparison checks) sequence. **No Prisma schema field was converted, no migration was
generated or applied, no API route or UI component was changed, and no calculation logic
(`round2()`, `syncCollectionTotals()`, or any other) was touched.** `npx prisma validate` passes
(no-op confirmation — schema untouched). See `docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3G row)
for the tracker entry.

### 2026-06-21 — Reusable AuditLog helper created; soft-delete routes refactored to use it (Step 3F)
Step 3F completed: created `src/lib/audit-log.ts`, exporting `logAuditEvent` (the core writer —
accepts `entityType`, `entityId`, `action`, `performedById`, `notes`, `changes`, and an optional
`tx` for either the default `prisma` client or a `Prisma.TransactionClient`), `logSoftDelete` (a
convenience wrapper fixing `action` to `AUDIT_ACTIONS.SOFT_DELETE` and `changes` to the pre-delete
row snapshot), and `AUDIT_ACTIONS` (future-safe action-name constants: `SOFT_DELETE`, `RESTORE`,
`DELETE_BLOCKED_REFERENCE_EXISTS`, `VOUCHER_VOID`, `LEDGER_REVERSAL`, `PAYMENT_POSTED`,
`EXPENSE_APPROVED`, `ADVANCE_SETTLED`). Refactored all 4 existing Customer/Collection soft-delete
`AuditLog` writes (the only ones touched in Steps 3D/3E) to call the helper instead of inline
`prisma.auditLog.create()`: `DELETE /api/customers/master/[id]`, `POST
/api/customers/master/deduplicate` (merge — helper calls inside the existing
`prisma.$transaction([...])` array), `DELETE /api/collections/[id]`, `DELETE /api/collections`
(bulk — helper calls inside the existing `updateMany()` + per-record-audit transaction array).
Every refactored call site preserves the exact same `action`/`entityType`/`notes`/`changes`
payload, the same transaction grouping, the same API response shape, and the same permission
guards — this is a pure internal refactor, not a behavior change. The pipeline lead hard-delete
(`DELETE /api/pipeline/leads/[id]`) was intentionally left alone — it uses `action: "delete"` (not
`"SOFT_DELETE"`) and `entityType: "lead"` (lowercase, no special casing), a genuinely different
delete semantic (hard delete vs soft delete), not an unrefactored oversight; documented as a
future candidate only if its own semantics are revisited. **Live-verified** in the dev DB using
disposable test rows (created and cleaned up within this step): Customer single delete, Customer
merge-delete, Collection single delete, and Collection bulk delete (2 rows) were each exercised
through the real running API (`fetch()` calls against the dev server, same code path the UI uses)
and the resulting `AuditLog` rows were confirmed byte-for-byte identical in shape to the
pre-refactor rows — including the bulk case still writing one `AuditLog` row per affected
`Collection` inside the same `$transaction`. `npx prisma validate`, `npx tsc --noEmit`, `npm run
build` (159 pages), and `npm run lint` (589 problems — identical to the Step 3E baseline,
confirmed no new issues) all pass. See `docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3F row) and
`docs/database/SOFT_DELETE_DECISION_LOG.md`/`SOFT_DELETE_MIGRATION_PLAN.md` for full detail.

### 2026-06-21 — Customer and Collection delete UI flows now require a delete reason (Step 3E)
Step 3E completed: Customer and Collection delete UI flows now require delete reason. Closed the
"reason-body limitation" Step 3D documented above — `CustomerMasterClient.tsx`'s new
`DeleteCustomerModal` and `CollectionsClient.tsx`'s new shared `DeleteReasonModal` (used for both
single and bulk delete) replaced the old `window.confirm()` flows, mirroring the existing
`DeleteLeadModal` pattern from `pipeline/leads/LeadsClient.tsx` (same overlay/card styling, a
required `textarea`, submit button `disabled` until the reason is non-empty after trim, an inline
error `div` that does not auto-close the dialog, separate Cancel button). All three flows now send
the user-entered reason as `deleteReason` in the request body: `DELETE
/api/customers/master/[id]`, `DELETE /api/collections/[id]`, and `DELETE /api/collections` (bulk,
alongside `ids`). Soft-delete APIs receive user-entered `deleteReason`; the API fallback reason
(`"Deleted by user"`) remains only for non-UI or legacy callers — no API route code was changed,
since no body-parsing bug was found that prevented the UI from sending a body. Customer
duplicate-merge delete (`POST /api/customers/master/deduplicate`) intentionally received no reason
prompt — its existing system-generated reason (`"Merged into customer <keepId>"`, from Step 3D)
already satisfies accountability for a system-initiated delete. No schema/API authorization
changes were made. **Live-verified in the dev DB** using disposable test rows (created and cleaned
up within this step, never touching real data): Customer single delete, Collection single delete,
and Collection bulk delete (2 rows) — for each, the Delete button was programmatically confirmed
`disabled` before a reason was entered and enabled after, the network request carried the entered
`deleteReason`, and the resulting `Customer`/`Collection` row's `deletedAt`/`deletedById`/
`deleteReason` plus a matching `AuditLog` row were confirmed directly against the database.
`npx prisma validate`, `npx tsc --noEmit`, `npm run build` (159 pages), and `npm run lint` (589
problems — identical to the Step 3D baseline, confirmed no new issues) all pass. See
`docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3E row) and `docs/database/SOFT_DELETE_DECISION_LOG.md`/
`SOFT_DELETE_MIGRATION_PLAN.md` for full detail.

### 2026-06-21 — Customer and Collection hard-delete converted to soft delete (Step 3D)
Step 3D completed: the two confirmed live-risk hard-delete paths — `Customer` and `Collection` —
no longer physically remove rows. Inventoried every `prisma.{customer,collection}.{delete,
deleteMany}` call under `src/` (excluding generated code) and converted all 4 found: `DELETE
/api/customers/master/[id]` (single), `POST /api/customers/master/deduplicate` (merge-delete),
`DELETE /api/collections/[id]` (single), `DELETE /api/collections` (bulk). Each route now
re-checks `deletedAt: null` before acting (404 if already gone), sets `deletedAt`/`deletedById`/
`deleteReason` via `update()`/`updateMany()`, and writes one `AuditLog` row per affected record
(`action: "SOFT_DELETE"`, `entityType: "customer"` or `"collection"`, `changes` = JSON snapshot of
the pre-delete row) — reusing the exact `prisma.auditLog.create()` shape `DELETE
/api/pipeline/leads/[id]` already used; no new audit helper or framework was built. **Reason-body
limitation:** neither the Customer Master nor Collections delete buttons send a request body
today (confirmed by reading `CustomerMasterClient.tsx`/`CollectionsClient.tsx`) — `deleteReason`
is optional with a fallback (`"Deleted by user"`, or `"Merged into customer <keepId>"` for
merges) so both existing delete buttons keep working with zero UI changes; this is a documented
temporary limitation, not a UI rewrite. **Merge-delete confirmed safe** — `Customer` has no
`@unique` on `name`/`gstNo`, so soft-deleting merged-away duplicates next to the still-active kept
customer cannot collide; no physical-delete exception was needed. **Bulk Collection delete** uses
one `updateMany()` + one `auditLog.create()` per record inside a single `$transaction([...])` —
audited per-record, not a silent bulk soft-delete. **Live-verified in the dev DB** using disposable
test rows created and deleted within this step (never touching real data): single Customer
delete, single Collection delete, bulk Collection delete, and Customer merge-delete all set the
correct fields, wrote the correct audit row, left the row physically present, and were
immediately excluded from `GET /api/customers/master`/`GET /api/collections` afterward. **No
Vendor/Expense/EmployeeAdvance/TravelClaim/Payment/Voucher/Ledger/Employee delete behavior was
touched** — confirmed no `prisma.vendor.delete*` call exists anywhere (Vendor Master still has no
real DELETE API). No schema, migration, read-filter, or UI layout change was made. `npx prisma
validate`, `npx tsc --noEmit`, `npm run build` (159 pages), and `npm run lint` (589 problems —
identical to the Step 3C baseline, confirmed no new issues) all pass. See
`docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3D row) and `docs/database/SOFT_DELETE_DECISION_LOG.md`/
`SOFT_DELETE_MIGRATION_PLAN.md` for full detail.

### 2026-06-21 — Read filters added so Phase A reads exclude soft-deleted records (Step 3C, read-filter only)
Step 3C completed: every normal read query against the 7 Step 3B models (`Customer`, `Vendor`,
`Expense`, `EmployeeAdvance`, `TravelClaim`, `Payment`, `Collection`) now filters `deletedAt:
null`, landed deliberately **before** any DELETE route is converted (Step 3D) — converting a
delete route first would have let "deleted" records keep reappearing in lists, a worse regression
than today's hard delete. Audited every `prisma.<model>.{findMany,findFirst,findUnique,count,
aggregate,groupBy}` call under `src/` (excluding generated Prisma client code): Customer Master
list/dedup/suggestions/import-dedup (`api/customers/master/route.ts`, `.../deduplicate/route.ts`,
`api/customers/suggestions/route.ts`, `lib/customer-import.ts`, `app/masters/customers/page.tsx`),
the lead-conversion existing-customer lookup (`api/pipeline/leads/[id]/convert/route.ts` —
`findUnique` converted to `findFirst` per the task's own guidance on adding filters to unique
lookups), Finance Expense list/detail/dashboard, EmployeeAdvance list, TravelClaim list, Payment
ledger/today-summary (`lib/payments.ts`'s `syncCollectionTotals`/`reconcileOpeningBalance` also
converted their internal Collection `findUnique` lookups to `findFirst` with the filter), and
Collection across every list/dashboard/KRA-engine read site (`app/page.tsx`,
`app/dashboard/page.tsx` ×2, `app/accounts/page.tsx`, `app/collections/page.tsx`,
`app/employees/[id]/page.tsx`, `lib/kra-engine.ts` ×5, `api/kra/sync-achievements/route.ts`,
`api/import/route.ts`'s upsert-dedup check, `api/advances/[id]/apply/route.ts`). **`Vendor` had no
application-level read queries at all** — `/masters/vendors` is still UI-only mock data, so there
was nothing to update; documented rather than silently skipped. **No DELETE route was touched** —
the two ownership-check `findUnique` reads inside `api/collections/[id]/route.ts`'s PUT/DELETE
handlers were deliberately left alone (write-path internals, not normal reads). Step
2M/2R/2S self-service `employeeId` scoping was preserved exactly everywhere, with `deletedAt: null`
merged alongside it — no authorization logic weakened, no API response shape changed. No helper
module was created (`src/lib/db/soft-delete.ts` was considered but skipped) — each call site's
`where` shape differs enough that inline `deletedAt: null` was clearer than a shared constant
would have been. `npx prisma validate`, `npx tsc --noEmit`, `npm run build` (159 pages), and `npm
run lint` all pass — lint's pre-existing failures (`SidebarLinks.tsx`, `OpportunityCard.tsx`,
`policy-engine/*`, `settings.ts`, `workflow-engine/audit.ts`) are all in files this step did not
touch, confirmed via `git show HEAD` diff. See `docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3C row)
and `docs/database/SOFT_DELETE_DECISION_LOG.md`/`SOFT_DELETE_MIGRATION_PLAN.md` for full detail.

### 2026-06-21 — Soft-delete schema fields added to Phase A models (Step 3B, schema + migration only)
Step 3B completed: added `deletedAt`/`deletedById`/`deleteReason` to `Customer`, `Vendor`,
`Expense`, `EmployeeAdvance`, `TravelClaim`, `Payment`, and `Collection` — the exact 7 models
locked by Step 3B-0's decision log, each field nullable (`deletedAt DateTime?`, `deletedById
Int?`, `deleteReason String? @db.Text`), each model getting a new `@@index([deletedAt])`.
**Voucher/Ledger/Employee intentionally excluded as per decision log** — Voucher keeps
`voidedAt`/`voidReason`; Ledger stays reversal-only; Employee delete remains a separate, deferred
identity-lifecycle decision. `Permission`/`UserRole`/`DataAccessPolicy`/`AppRole`/
`RolePageAccess`/`ApprovalRequest`/`ApprovalAction` also untouched. **`prisma migrate dev` hit
Hostinger's known no-shadow-database limitation (`P3014`, no `CREATE DATABASE` privilege)** — the
same constraint documented in this file's Phase 8/Integration Center/Security Center notes.
Worked around with the project's existing pattern: `prisma migrate diff
--from-config-datasource --to-schema prisma/schema.prisma --script` (diffs the live dev DB
directly, no shadow DB needed) to generate the migration SQL, a new one-off
`prisma/apply-soft-delete-fields-phase-a.mjs` (mariadb driver, refuses to run unless
`DATABASE_URL`'s database name is exactly `u686730471_caveodev`) to apply it, then `prisma
migrate resolve --applied` + `prisma generate`. **Dev migration validated**: the raw diff also
surfaced pre-existing unrelated schema drift (missing FKs on workflow/approval/master-data/
integration tables from earlier incompletely-applied migrations) — that drift was deliberately
excluded from this migration's SQL file and left for a separate cleanup, not bundled in here. A
read-only `information_schema.COLUMNS` query confirmed exactly the 7 approved models carry the 3
new columns and `Voucher`/`Ledger`/`Employee` carry none. No API route, read filter, DELETE
endpoint, restore route, or UI file was touched — this step only changes `prisma/schema.prisma`
and the dev database's column/index set. `npx prisma validate`, `npx tsc --noEmit`, and `npm run
build` (159 pages) all pass. See `docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3B row) and
`docs/database/SOFT_DELETE_DECISION_LOG.md` for full detail.

### 2026-06-21 — Soft-delete decision log / scope lock created (Step 3B-0, sign-off only)
Step 3B-0 completed with final approved Phase A models. Reviewed Step 3A's
`SOFT_DELETE_MIGRATION_PLAN.md` §13 open decisions (which models support restore, whether
`deleteReason` should be required, who can view/restore deleted records, whether Voucher/Ledger
should ever be deleted, what happens to the Employee hard-delete) and locked final answers into
new `docs/database/SOFT_DELETE_DECISION_LOG.md`. **Approved Phase A model list for Step 3B:**
`Customer`, `Vendor`, `Expense`, `EmployeeAdvance`, `TravelClaim`, `Payment`, `Collection` — 7
models, each to receive `deletedAt DateTime?` / `deletedById Int?` / `deleteReason String?
@db.Text`. **Voucher and Ledger confirmed excluded** — Voucher keeps its existing
`voidedAt`/`voidReason` pattern; Ledger stays reversal-only via the existing `pairedLedgerId`
self-pair field; neither gets a `deletedAt` column, ever. **Employee delete lifecycle deferred**
to a separate HR/Admin identity-lifecycle step — likely deactivation, not soft-delete, given its
cascade into `Collection`→`Payment` and 9+ other models. **`Permission`/`UserRole`/
`DataAccessPolicy` confirmed Do Not Soft Delete** (revoke/remove is the correct semantic;
`Permission` is a seeded catalogue). **Restore API and "view deleted records" both deferred** —
schema keeps restore technically possible later, but no restore route or admin view ships yet.
`deleteReason` decided as DB-optional, API-required-where-practical (full per-model table in the
decision log §4). Audit logging decided as mandatory for every soft delete, reusing the existing
`AuditLog` model and its one working call site (`DELETE /api/pipeline/leads/[id]`) — no new audit
model needed; new `action` values (`SOFT_DELETE`/`RESTORE`/`DELETE_BLOCKED_REFERENCE_EXISTS`/
`VOUCHER_VOID`/`LEDGER_REVERSAL`) documented for the future route-conversion step. No Prisma
schema change, migration, API code change, or UI code change was made — `prisma migrate` was not
run. See `docs/database/SOFT_DELETE_DECISION_LOG.md` for the full 13-section decision record and
`docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3B-0 row) for the cross-reference. `npx prisma validate`
passes (schema untouched, so this is a no-op confirmation, not a meaningful check this step).

### 2026-06-21 — Soft-delete migration plan created (Step 3A, planning only)
Created `docs/database/SOFT_DELETE_MIGRATION_PLAN.md` (new `docs/database/` folder), addressing
`IMPLEMENTATION_STATUS_REPORT.md`'s #2-ranked risk ("No soft delete anywhere — all 108 Prisma
models use hard deletes") ahead of any Finance write API. **Inventoried every
`prisma.*.delete()`/`deleteMany()` call under `src/app/api`** (18 routes found) and every relevant
model's actual `ON DELETE` FK behavior (read directly from `prisma/migrations/*/migration.sql`, not
assumed): `Customer` (hard delete, `SetNull` dependents — real risk), `Collection`/`Payment`
(hard delete, `ON DELETE CASCADE` chain from `Employee`→`Collection`→`Payment` — **highest current
live risk**, confirmed at the SQL level), and `Expense`/`Voucher`/`EmployeeAdvance`/`TravelClaim`/
`Ledger` (**zero delete routes exist for any of them today** — `ON DELETE RESTRICT` on their
`Employee` FKs, confirmed in the SQL migration files, already protects them from employee-delete
cascades). Recommended schema pattern: `deletedAt DateTime?` as the sole marker (no parallel
boolean), `deletedById Int?` (bare FK first, typed relation later), `deleteReason String?`.
**`Voucher` deliberately excluded from the soft-delete field list** — it already has
`voidedAt`/`voidReason`, the correct accounting-reversal pattern, which this plan recommends
extending rather than duplicating with a second "is this gone" signal. **`Ledger`/
`ApprovalRequest`/`ApprovalAction`/`Permission`/`UserRole`/`DataAccessPolicy` recommended as Do Not
Soft Delete** for documented reasons (immutable audit trail, seeded catalogue, or "delete is the
correct semantic" join-table rows). Found and reused an existing audit-log convention rather than
inventing one: `AuditLog` model already exists and is already used once (`DELETE
/api/pipeline/leads/[id]`, which already requires a `reason` and logs before deleting) — the plan's
§9 extends that exact pattern with new `action` values (`SOFT_DELETE`/`RESTORE`/`HARD_DELETE`/
`DELETE_BLOCKED_REFERENCE_EXISTS`) rather than proposing a new model. 5-phase safety sequence
(A: add columns → B: update read filters → C: convert delete routes → D: audit logging → E:
optional restore UI), explicitly ordered so read filters land before delete-route conversion.
No Prisma schema, migration, API, or UI change was made — `prisma migrate` was not run. See the new
plan doc for the full 14-section breakdown, including 8 open decisions flagged for product
sign-off (e.g. "should Ledger ever be deleted, or only reversed?"). `npx prisma validate` passes
(schema untouched, so this is a no-op confirmation, not a meaningful check this step).

### 2026-06-21 — Build script portability fix (Step 2T)
Recent validation steps found `npm run build` failed on Windows shells (PowerShell/Git Bash):
`package.json`'s `build` script set `RAYON_NUM_THREADS=1` using POSIX inline-assignment syntax
(`RAYON_NUM_THREADS=1 next build`), which Windows shells parse as an attempt to run a command
named `RAYON_NUM_THREADS=1` rather than as an environment-variable assignment. The portable
workaround used throughout recent sessions was `npx cross-env RAYON_NUM_THREADS=1 next build`.
**Step 2T completed:**
- `package.json`'s `build` script updated from `"prisma generate && RAYON_NUM_THREADS=1 next
  build"` to `"prisma generate && cross-env RAYON_NUM_THREADS=1 next build"` — only the env-var
  prefix changed; the existing `prisma generate` step was preserved exactly (this project's build
  script never ran `prisma migrate deploy`, so none was added).
- `cross-env` was not previously a dependency — added via `npm install -D cross-env`
  (`^10.1.0`), since `package-lock.json` confirms npm is the project's package manager (no
  pnpm/yarn lock file exists).
- `npm run build` now works across Windows/Linux shells — the previous portable validation
  command `npx cross-env RAYON_NUM_THREADS=1 next build` is now embedded in `npm run build`
  itself; both are equivalent going forward.
- **Other scripts referencing `RAYON_NUM_THREADS=1` were intentionally left unchanged**
  (`scripts/{deploy-uat,build-uat-detached,fix-uat-database-url,fix-uat-db-env-vars,
  setup-uat-server}.mjs`) — these set the variable via POSIX `export ... &&` inside a remote SSH
  command string that always executes in a Linux bash shell on the Hostinger server, never
  locally on Windows, so the portability issue does not apply to them; rewriting working
  remote-deploy commands to use `cross-env` would have been an unrelated, unrequested change.
- No application code, Prisma schema, migration, API, UI, or RBAC logic changed. `npm run build`,
  `npx tsc --noEmit`, and `npx prisma validate` all pass.

### 2026-06-21 — Curated role grants applied for new Finance permissions (Step 2W)
Decided and applied `ROLE_GRANTS` (`prisma/seed-admin-foundation.ts`) for the Step 2S/2U/2V Finance
permissions. Confirmed first, by direct DB query, that the `Role` model has exactly 6 rows (`Super
Admin`, `Business Head`, `Sales Head`, `Sales Manager`, `Account Manager`, `Finance Manager`) — no
`Accounts Team`/`Accounts Admin`/generic `Manager` role exists; the legacy `Employee.role` string
`"Accounts"` belongs to the separate `src/lib/roles.ts` system and was left untouched, not conflated
with a `Role` row. **Grants applied:** `Finance Manager` → full `Voucher`/`BankBook`/`CashBook`/
`Conveyance` (22 permissions, matching its "Full Finance module + reports" description).
`Business Head` → `Conveyance/VIEW` + `Conveyance/APPROVE` only (2 permissions), extending its
existing `Finance/Expense` approval pattern to the now-dedicated Conveyance resource — no
`BankBook`/`CashBook`/`Voucher` given (no policy basis for ledger/voucher ops at that role).
`Sales Head`/`Sales Manager`/`Account Manager` received no new grants. Ran `npx tsx
prisma/seed-admin-foundation.ts` against the dev DB (confirmed `DATABASE_URL` first); output
showed `Role grants upserted: 122` (up from Step 2U's 98, reconciling exactly to +22+2=+24).
Read-only DB query confirmed: Finance Manager 22/22, Business Head 2/2, Super Admin still 101/101,
zero duplicate `RolePermission` rows, zero grants for Sales Head/Sales Manager/Account Manager on
the new resources. **Permission Matrix UI re-verified against live data** (hit and resolved the
same `.next`-stale-cache mock-fallback gotcha documented in Step 2V — cleared `.next`, restarted
dev server, confirmed via raw `fetch()` returning real JSON before trusting the rendered grid).
Screenshot captured of Finance Manager's fully-granted new-resource rows. No schema, migration,
Finance write API, Finance API/UI logic, or `roles.ts` fallback change was made. `npx tsc --noEmit`,
`npx prisma validate`, and `npm run build` all pass. See `docs/RBAC_MIGRATION_TRACKER.md` §15 and
`docs/modules/finance/FINANCE_WRITE_ACCESS_CONTROL_PLAN.md` §18 for full detail.

### 2026-06-21 — Permission Matrix UI updated for new Finance resources (Step 2V)
Closed the UI gap Step 2U flagged: `src/app/settings/identity/components/PermissionMatrix.tsx`'s
hardcoded `MODULE_GROUPS` Finance entry extended from `["Invoice","Expense","Payment","Advance"]`
to `["Invoice","Expense","Payment","Advance","Voucher","BankBook","CashBook","Conveyance"]` (4
pre-existing resources untouched, 4 new ones appended, no duplicates/renames). `NOT_APPLICABLE`
extended with each new resource's catalogue-missing actions (`Voucher`: no `IMPORT`/`ASSIGN`;
`BankBook`: no `DELETE`/`ASSIGN`; `CashBook`/`Conveyance`: no `DELETE`/`IMPORT`/`ASSIGN`) so the
grid doesn't offer toggles for actions that don't exist in `PERMISSION_CATALOGUE`. The mock-data
fallback (`buildMockGrants()`) needed no change — it already iterates `MODULE_GROUPS`/
`NOT_APPLICABLE` dynamically. `GET /api/admin/identity/permissions` needed no change — it already
queries `prisma.permission.findMany()` with no hardcoded filter. **Only file changed:**
`PermissionMatrix.tsx`. **No `ROLE_GRANTS`, `RolePermission`, or seed grant-logic change** — role
mapping remains Step 2W. **27 → 22 documentation correction completed this step** across
`RBAC_MIGRATION_TRACKER.md`, `RBAC_AUDIT_REPORT.md`, `FINANCE_WRITE_ACCESS_CONTROL_PLAN.md`, and
this file's Step 2S entry below (the actual per-resource action counts — Voucher 6 + BankBook 6 +
CashBook 5 + Conveyance 5 — total 22, not the previously documented 27). `npm run build`, `npx tsc
--noEmit`, and `npx prisma validate` all pass. See `docs/RBAC_MIGRATION_TRACKER.md` §14 and
`docs/modules/finance/FINANCE_WRITE_ACCESS_CONTROL_PLAN.md` §17 for full detail.

### 2026-06-21 — Finance permission catalogue seeded to dev database (Step 2U)
Ran `npx tsx prisma/seed-admin-foundation.ts` against the dev database
(`u686730471_caveodev` on `srv2201.hstgr.io`, confirmed via `.env`'s `DATABASE_URL` before
running) to materialize the Step 2S catalogue additions as real `Permission` rows. Pre-run
review confirmed the script is upsert-only on the schema's `@@unique([module, resource, action])`
key, never deletes, and its `ROLE_GRANTS` array was untouched — safe to run. Seed output:
`Permissions upserted: 101`, `Role grants upserted: 98`, `DataAccessPolicies upserted: 24`. A
read-only verification script (written, run, then deleted) confirmed all 22
`Finance/{Voucher,BankBook,CashBook,Conveyance}` rows present (Voucher 6 + BankBook 6 + CashBook 5
+ Conveyance 5 = 22 — Step 2S's own "27 new rows" figure does not reconcile with its own
per-resource action lists; the action lists, which match `permissions.ts` verbatim, are treated as
correct), zero duplicate `(module,resource,action)` triples across all 101 rows, and the 4
pre-existing Finance resources (`Invoice`/`Expense`/`Payment`/`Advance`, 17 rows) unchanged.
**UI gap found, not fixed:** `/api/admin/identity/permissions` already returns all 101 live rows,
but `PermissionMatrix.tsx`'s hardcoded `MODULE_GROUPS` constant lists only
`["Invoice","Expense","Payment","Advance"]` under `Finance` — the 4 new resources exist in the DB
and API response but will not render as matrix rows until that array is updated (recommended
follow-up, not done this step — out of scope per the task brief's "do not modify Finance UI").
No role besides the pre-existing Super-Admin-gets-all loop was granted the new permissions. No
schema change, migration, Finance write API, Finance API/UI logic change, or curated role-grant
change was made. `npx prisma validate`, `npx tsc --noEmit`, and `npx cross-env
RAYON_NUM_THREADS=1 next build` all pass. See `docs/RBAC_MIGRATION_TRACKER.md` §13 and
`docs/modules/finance/FINANCE_WRITE_ACCESS_CONTROL_PLAN.md` §16 for full detail.

### 2026-06-21 — Finance permission catalogue gap closure (Step 2S)
`docs/RBAC_MIGRATION_TRACKER.md` §4 Step 2L flagged that Voucher, BankBook, CashBook, and
Conveyance had no dedicated `access-control` resource, forcing the Step 2M/2R Finance read-API
migration onto closest-fit `Finance/Payment/VIEW`/`Finance/Expense/VIEW` mappings — not clean
enough for future write APIs. Added 22 new permission rows (corrected 2026-06-21, Step 2V, from an
earlier "27" that did not reconcile with the action lists below) to `PERMISSION_CATALOGUE`
(`src/lib/access-control/permissions.ts`): `Finance/Voucher/{VIEW,CREATE,EDIT,DELETE,APPROVE,
EXPORT}`, `Finance/BankBook/{VIEW,CREATE,EDIT,APPROVE,IMPORT,EXPORT}`, `Finance/CashBook/{VIEW,
CREATE,EDIT,APPROVE,EXPORT}`, `Finance/Conveyance/{VIEW,CREATE,EDIT,APPROVE,EXPORT}` — exact
existing catalogue style, no duplicates. `Finance/Reconciliation` was deliberately deferred
(folds into the new `BankBook`/`CashBook` `APPROVE` actions instead, per the existing
"avoid a parallel reconciliation surface" recommendation). `src/lib/finance/access.ts`: two new
helpers (`canViewFinanceBankBook`, `canViewFinanceCashBook`) split off from
`canViewFinancePayments` (now used only by the `accounts` route); `canViewFinanceVouchers` and
`canViewAllConveyance` now check their dedicated resource first; `canViewFinanceDashboard` also
accepts `Finance/Voucher/VIEW`. Every helper still falls through to `canManageFinance()` — no
manager/Accounts/Operations-Head user lost access, and no role besides the pre-existing
Super-Admin-gets-all seed pattern was granted the new permissions (`seed-admin-foundation.ts`'s
`ROLE_GRANTS` intentionally left unchanged; the 22 rows will appear in the `Permission` table
automatically next time that script runs, since it iterates `PERMISSION_CATALOGUE` directly). No
schema change, migration, Finance write API, Finance API/UI behavior change, or role-assignment
change was made. `npx tsc --noEmit`, `npx prisma validate`, and `npx cross-env
RAYON_NUM_THREADS=1 next build` all pass. See `docs/RBAC_MIGRATION_TRACKER.md` §12 for full detail.

### 2026-06-21 — Finance read API migration to access-control (Step 2M/2R)
`docs/RBAC_MIGRATION_TRACKER.md` §4/§10 Step 2M ("migrate Finance read APIs from `roles.ts`-only to
`access-control`") was completed. New `src/lib/finance/access.ts` helper module
(`canViewFinancePayments`, `canViewFinanceVouchers`, `canViewFinanceDashboard`,
`canViewAllFinanceExpenses`, `canViewAllFinanceAdvances`, `canViewAllConveyance`,
`isSelfFinanceRequest`) checks the closest-fit `access-control` permission first, falling back to
`canManageFinance()` (or the prior inline `isManager||isAccounts||isOperationsHead` for
conveyance). All 11 `GET /api/finance/*` route files (`accounts`, `dashboard`, `bank-book`,
`cash-book`, `expenses`, `expenses/[id]`, `advances`, `conveyance`, `vouchers`, `vouchers/[id]`,
`voucher-sequences`) were updated. Mapping: `Finance/Payment/VIEW` for BankBook/CashBook/Accounts/
Vouchers (closest fit — no dedicated resource exists), `Settings/Finance/VIEW` as an additional
accepted grant for Vouchers, `Finance/Expense/VIEW` for the Expense Register and Conveyance,
`Finance/Advance/VIEW` for Advances. Employee self-service own-data filtering (own expenses/
advances/conveyance) is unchanged; only the full-visibility boolean now also accepts the matching
permission. `roles.ts`/`canManageFinance()` were **not removed** — retained as a temporary
fallback per the freeze rules. `POST /api/finance/advances`, `/api/expenses`, and `/api/advances`
were not touched (out of scope). No schema, migration, UI, or business-logic change. See
`docs/RBAC_MIGRATION_TRACKER.md` §11 for the full route-by-route detail. `npx tsc --noEmit`, `npx
prisma validate`, and `npx cross-env RAYON_NUM_THREADS=1 next build` all pass.

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

### 2026-06-20 — Sidebar/navigation visibility aligned with access-control (Step 2J)
`docs/RBAC_AUDIT_REPORT.md` §5 found sidebar visibility (`SidebarLinks.tsx`/`Navbar.tsx`) consulted only `roles.ts` booleans (`isManager`/`isAccounts`), never `access-control` — so a real `access-control` permission grant had no effect on what a user saw in the nav. Added `src/lib/access-control/navigation.ts` (`getNavigationCapabilities()`) — loads a session's permissions once per request via the existing `getAllPermissions()`, with the same manager-fallback `hasPermission()` already has. Wired into `Navbar.tsx` (computed once, passed down) and `SidebarLinks.tsx`: Customer/Vendor Master links now require `Masters/CustomerMaster|VendorMaster/VIEW` (real grants already exist in `prisma/seed-admin-foundation.ts` for Business Head/Sales Head/Sales Manager/Finance Manager); Finance Operations sub-items (Cash/Bank Book, Expense Register, Advances, Finance Approvals) each carry a capability check, OR'd with the existing `isManager||isAccounts` bridge so no current manager/Accounts user loses anything; the Settings nav entry is OR'd with a new `Settings/*` aggregate check (additive, since no role currently holds a seeded `Settings/*` grant). Pipeline/Daily Updates/KRA/Tasks/Employees nav and self-service Finance items (My Expenses/Claims/Advance/Conveyance) were intentionally left on the roles.ts/session bridge, per scope. No API/page guards, permission catalogue, schema, or runtime authorization logic changed — navigation visibility only; remaining page-guard alignment is Step 2K. `npx tsc --noEmit`, `npx prisma validate`, and `next build` all pass; 2 pre-existing unrelated `react-hooks/set-state-in-effect` lint errors confirmed via diff/stash-test to predate this change.

### 2026-06-20 — Settings landing/cards visibility aligned with access-control (Step 2K)
Followed Step 2J's sidebar work by aligning the `/settings` *landing page* itself. Added
`src/lib/access-control/settings-capabilities.ts` (`getSettingsCapabilities()`) — loads a
session's permissions once per request and derives an `{ organization, identity, masters,
finance, crm, workflow, policy, communication, integration, security, performance }` card map,
with the same `isManager` full-access fallback used elsewhere in `access-control`.
`src/app/settings/page.tsx` now computes capabilities server-side and gates the page on
`capabilities.canViewSettings || canAccessSettings(session.user)` (additive bridge, same pattern
as Step 2J — no Operations Head/Head of Sales/manager loses access). `AdminConsole.tsx` (the live
landing component — `SettingsHub.tsx` is dead rollback code) now filters its card list to the
modules the session actually has a `Settings/<Resource>/VIEW`-or-`EDIT` grant for, and shows a
"You do not have access to any Settings modules" empty state when none match. CRM Administration
has no `Settings/CRM` catalogue permission (documented gap, same as Step 2J/2L) so its card falls
back to the `isManager` bridge, matching `/settings/crm`'s own page guard. **Gap surfaced, not
fixed:** `/settings/{finance,communication,integrations,security,performance}` still gate purely
on `isManager` and don't yet consult the `Settings/*` permissions their cards are now keyed on —
tracked as a Step 2K follow-up in `docs/RBAC_MIGRATION_TRACKER.md`/`RBAC_AUDIT_REPORT.md`, not
rewritten this step (out of scope — no broad page-guard refactor). No schema, migrations, API
permission checks, business logic, routes, or `roles.ts`/`rbac.ts` deletions. `npx tsc --noEmit`,
`npx prisma validate`, and `next build` all pass.

### 2026-06-20 — Finance Write Access-Control Plan created (Step 2L, planning only)
Before building any Finance write API, created
`docs/modules/finance/FINANCE_WRITE_ACCESS_CONTROL_PLAN.md` mapping all 33 planned write
endpoints (Expense create/edit/delete/submit/approve/reject/mark-paid/import; Bank Book entry/
edit/import/reconcile; Cash Book entry/edit/transfers/adjustment/reconcile; Advance submit/
approve/reject/disburse/settle; Claims create/edit/approve/reject/mark-paid; Conveyance trip
log/edit/submit/approve/reject/monthly-settlement/distance-calc; Voucher create/cancel/PDF/
tally-export; Reconciliation submit/approve/reject) to real `access-control` permissions from
`permissions.ts`, cross-checked line by line — no permission invented. Findings: `Finance/
Invoice`, `Finance/Expense`, `Finance/Payment`, `Finance/Advance` are usable today; confirmed
**Catalogue Gaps** — `Finance/Voucher` has no resource at all, `Finance/Payment/EDIT` and
`Finance/Advance/EDIT` don't exist, no dedicated BankBook/CashBook/Conveyance/Reconciliation
resource exists, no `Finance/Expense/IMPORT` or `Finance/Voucher/EXPORT` action exists — all
documented with an interim closest-fit mapping (mostly `Finance/Payment/CREATE` for
Ledger-posting actions), not closed in this step. New **Schema Gap** surfaced: no Finance
transaction model (`Expense`, `EmployeeAdvance`, `TravelClaim`, `Voucher`, `Ledger`,
`FinAccount`) has a real `branchId`/`departmentId` FK — only `FinAccount.branchName` (free-text,
no `@relation`) — so `canAccessScope()`'s BRANCH/DEPARTMENT cases always fall through to "allow"
for Finance data today. Also documented: self-service vs. Finance-Operations authorization rules
(own-record actions need no grant; cross-employee actions need the mapped permission), an
object-level rule set per entity (no edit-after-submit, no hard-delete on posted records,
approval routed exclusively through the Step 2A-protected Global Approval Engine — never a
bespoke per-entity check), an API guard code template, and the recommended build sequence. No
Finance write API, schema change, migration, UI change, `roles.ts`/`rbac.ts` change, or
permission-enforcement change was made — one new documentation file only. `npx tsc --noEmit`,
`npx prisma validate`, and `next build` all pass (unaffected — no application code changed).

### 2026-06-20 — Customer/Vendor Master page guards migrated to access-control (Step 2N)
Closed the most overexposed surface flagged in `RBAC_AUDIT_REPORT.md` §2.4/§4/§5: `/masters/
customers` and `/masters/vendors` were "accessible to all authenticated users" with write-only
client-side gating (`deriveCustomerCaps`/`deriveVendorCaps`, both `roles.ts`-only). Both
`page.tsx` files now compute `hasPermission(userId, "Masters", "CustomerMaster"|"VendorMaster",
"VIEW")` server-side and redirect to `/dashboard` (the existing Settings/Finance forbidden-UX
pattern — no new unauthorized page built) when neither that grant nor `isManager` is present.
Both permissions already existed verbatim in `PERMISSION_CATALOGUE` — no catalogue gap, nothing
invented. The bypass is deliberately `isManager`-only (not the broader `isOpsHead||isManager`
bridge `/settings/masters` uses) to match Step 2J's `getNavigationCapabilities()`, which already
gives these two sidebar links the same manager-only bypass — page guard and sidebar link now
agree on who can reach each page. `deriveCustomerCaps()`/`deriveVendorCaps()` are unchanged,
retained for button-level Create/Edit/Disable/GST/Bank/Export UX (their actual original job),
each with a one-line TODO comment flagging the future button-level access-control migration.
Legacy `/customers` (still session-only) was left unchanged per scope, with a TODO pointing at
its own retirement (tracked as Step 2O in `RBAC_MIGRATION_TRACKER.md` — the task brief that
requested this step labelled the work "Step 2M" and the next step "Step 2N," but the tracker's
existing numbering — already cross-referenced from three other files including the just-written
Finance Write Access-Control Plan — reserves 2M for Finance-read-API migration and 2N for this
page-guard work, so the existing numbering was kept rather than renumbering published
cross-references). No schema, migration, Customer/Vendor API logic, UI/form change, soft delete,
or sidebar/navigation change was made. `npx tsc --noEmit`, `npx prisma validate`, `npx eslint` (2
pre-existing unrelated unused-var warnings), and `next build` all pass.

### 2026-06-20 — Customer Master base API guarded with access-control (Step 2N, API guards)
Closed the mismatch the page-guard step above exposed: `/masters/customers` was guarded, but the
underlying `GET`/`POST /api/customers/master` API was still session-only and callable directly
by any authenticated employee. `GET /api/customers/master` now requires
`Masters/CustomerMaster/VIEW`; `POST /api/customers/master` now requires
`Masters/CustomerMaster/CREATE`. Both permissions already existed verbatim in
`PERMISSION_CATALOGUE` — no catalogue gap, nothing invented. `PATCH`/`DELETE
/api/customers/master/[id]` were reviewed and confirmed already correct (`EDIT`/`DELETE`, from
Steps 2B/2C) — left unchanged. No query params, pagination, sorting, response shape, payload
structure, validation, or create logic was changed. Legacy `/customers` remains session-only and
unchanged; its retirement is still Step 2O. `npx tsc --noEmit`, `npx prisma validate`, and `next
build` all pass.

### 2026-06-20 — Legacy /customers guarded in place, not redirected (Step 2O)
The brief's preferred outcome was a server-side redirect from `/customers` to
`/masters/customers`. Code review found that would be a regression: **`/customers` is the only
real Customer Master** — live Prisma data, working Create/Edit, **Import from CRM**, **duplicate
detection**, and **Delete**, all wired to `/api/customers/master*`. `/masters/customers`'s
client component renders a hardcoded `MOCK_CUSTOMERS` array (`masters/customers/data.ts`) and
makes **zero `fetch()` calls** — it has no real persistence at all (a known, previously
documented gap — see the Global Masters section below: "Customer/Vendor masters... have no APIs
and only client-side RBAC"). Redirecting would have sent every user to a non-functional preview
instead of the working tool. Per the brief's own escape-hatch clause for this exact situation,
`/customers` was **guarded instead**: it now requires `Masters/CustomerMaster/VIEW` (access-
control) `||` `isManager`, redirecting to `/dashboard` on failure — the identical guard
`/masters/customers` already carries, applied before the page's data load (including its
auto-seed-from-CRM side effect). No navigation change was needed — a repo-wide search for
`href`/`router.push`/`redirect` to `/customers` found zero real links; the sidebar already only
links to `/masters/customers`, and the one `/customers` string in `Topbar.tsx` is a breadcrumb
label for direct URL visits, not a link. No schema, migration, customer data, Customer Master
API logic, `/masters/customers` UI/behavior, Vendor Master, or Finance change was made.
Recommended follow-up: wire `/masters/customers` to the real `Customer` table (replacing
`MOCK_CUSTOMERS` with live CRUD/import/dedupe against `/api/customers/master*`) — only then
should `/customers` become a redirect. `npx tsc --noEmit`, `npx prisma validate`, `npm run lint`,
and `next build` all pass.

### 2026-06-20 — /masters/customers wired to real Customer Master data (Step 2P, Customer Master)
Closed the Step 2O follow-up: `/masters/customers/page.tsx` now runs the same
`prisma.customer.findMany`/auto-seed-from-CRM/stats query `/customers/page.tsx` runs and renders
it through `@/app/customers/CustomerMasterClient` — **the same proven component `/customers`
already uses** (live list, search/filter, create, edit, delete, Import from CRM, duplicate
detection), reused directly rather than rewritten, matching this codebase's existing cross-route
reuse convention (`finance/cash-book` re-using `finance/bank-book`). Both routes now hit the
identical, already-guarded `GET`/`POST /api/customers/master` and `PATCH`/`DELETE
/api/customers/master/[id]` — no API contract, guard, or behavior changed. The folder's own
mock-data preview (`masters/customers/CustomerMasterClient.tsx`'s `MOCK_CUSTOMERS`,
`deriveCustomerCaps`, and the 14 enterprise components under `masters/customers/components/`)
is no longer imported by `page.tsx` but was **not deleted** — both main files now carry a header
comment: "Preview-only mock data retained for reference. Do not use for production Customer
Master rendering," confirmed safe since a repo-wide search found no other importer of either.
Button-level capability gating (Import/Find Duplicates/Delete restricted to managers; Add/Edit
open to all viewers) is the same real `isManager` logic `/customers` already used — preserved,
not weakened, and not migrated to `access-control` (left for later). The page guard itself
(`Masters/CustomerMaster/VIEW` `||` `isManager`) is unchanged from Step 2N. `/customers` was
**not modified, not redirected, and remains fully functional** — both routes are now functionally
equivalent (same component, same data, same APIs) for the first time, which is the prerequisite
for a future redirect step. Note: this step is labelled "Step 2P (Customer Master)" because
"Step 2P" was already reserved in `RBAC_MIGRATION_TRACKER.md` for the unrelated "retire legacy
`/admin` Roles tab" plan — disambiguated the same way Step 2N's API-guards sub-step was. No
database schema, migration, Customer Master API contract, Vendor Master, or Finance change was
made. `npx tsc --noEmit`, `npx prisma validate`, `npm run lint`, and `npx cross-env
RAYON_NUM_THREADS=1 next build` (the project's own `npm run build` script uses non-portable
shell syntax — pre-existing, unrelated) all pass.

### 2026-06-20 — Legacy /customers converted to a redirect (Step 2Q, Customer Master)
Final Customer Master route consolidation. Pre-check confirmed `/masters/customers/page.tsx`
already imported the live `@/app/customers/CustomerMasterClient` (Step 2P) and ran the identical
Prisma query/auto-seed/stats logic — zero unique functionality remained on `/customers`, so it
was safe to redirect. `src/app/customers/page.tsx` is now a bare server-side redirect
(`redirect("/masters/customers")`), matching the existing `finance/vendors → masters/vendors`
redirect-page convention exactly — no permission check of its own; `/masters/customers`'s own
guard now handles enforcement for both entry points. `CustomerMasterClient.tsx` (in
`src/app/customers/`) was **not deleted, renamed, or moved** — `/masters/customers` imports it
directly and needs it to stay at that path; added a one-line comment noting it's shared and
actively rendered from `/masters/customers`. A repo-wide search for `href="/customers"`,
`router.push("/customers"`, `redirect("/customers"`, and plain `"/customers"` found no active
links — only `Topbar.tsx`'s breadcrumb `PATH_LABELS` entry, not a link, now effectively dead
since the URL bar will never show `/customers` post-redirect (left unchanged, out of scope).
**Live-verified in a browser session against the dev database** (not just static checks):
unauthenticated `/customers` → `/masters/customers` → `/login`; non-manager Employee (no
`Masters/CustomerMaster/VIEW` grant) → `/masters/customers` → `/dashboard` (both routes' guards
fire in the same chain); Manager → real `/masters/customers` page, 98 live customers, working
Search/Import-from-CRM/Find-Duplicates/Add-Customer controls. Hit a transient remote-MySQL pool
timeout mid-verification (Hostinger shared-hosting connection-cap flakiness, not a credential or
code issue — a direct connection retry succeeded immediately after) — resolved itself, not a
regression from this change. No database schema, migration, customer data, Customer Master API,
Customer Master client logic, Vendor Master, or Finance change was made. `npx tsc --noEmit`,
`npx prisma validate`, `npm run lint`, and `npx cross-env RAYON_NUM_THREADS=1 next build` all
pass.

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
16. **2026-06-04 modules were mock & client-gated** — Expense Categories and Vendor Master still
    have no APIs and only client-side RBAC. **Customer Master is the exception as of Step 2P
    (2026-06-20):** `/masters/customers` now wires to the real `Customer` table and guarded
    `/api/customers/master*` APIs (reusing `/customers`'s component) — no longer mock. Money in
    ₹ rupees. Vendor Master still targets the existing `Vendor` model (extend, don't duplicate)
    but isn't wired yet.
17. ~~Two "Customer Master" nav entries, now functionally aligned — `/masters/customers` and
    operational `/customers` both render the same real component/data/APIs as of Step 2P
    (2026-06-20). Still two separate routes pending a redirect decision once verified.~~
    **RESOLVED 2026-06-20 (Step 2Q, Customer Master).** `/customers` is now a bare redirect to
    `/masters/customers` — one canonical Customer Master route, live-verified end-to-end.
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
- ~~Two "Customer Master" surfaces (2026-06-04). The new global `/masters/customers` (enterprise
  UI, mock) and the legacy operational `/customers` (real DB + CRM import/dedupe) both exist and
  both appear in the sidebar. Non-destructive by design, but must converge: fold import/dedupe into
  the global master and back it with the existing `Customer` model. Decision asked of Vijesh.~~
  **RESOLVED 2026-06-20 (Step 2P, then Step 2Q, Customer Master).** Step 2P wired
  `/masters/customers` to `/customers`'s real `CustomerMasterClient` and the same
  `Customer`-table data/APIs; Step 2Q then converted `/customers` to a redirect to
  `/masters/customers`, live-verified end-to-end (unauthenticated, non-manager, and manager
  flows all behave correctly). One canonical Customer Master route now — fully consolidated.
- **Three new 2026-06-04 modules were all mock & uncommitted** — Expense Categories (8 files),
  Vendor Master (14), Customer Master (16). **Customer Master is now wired (Step 2P, 2026-06-20)**
  — real `Customer`-table data/APIs, no longer mock. Expense Categories and Vendor Master remain
  mock; no APIs/persistence, gating is client-side only. Shapes in each `data.ts` are the backend
  contract. Vendor Master must wire to the **existing** `Vendor` model (extend, never duplicate)
  when its turn comes.
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
