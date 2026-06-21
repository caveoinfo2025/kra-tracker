# Soft Delete Migration Plan

> Planning/documentation only — Step 3A. No Prisma schema change, no migration, no API code
> change, no UI change, no delete behavior change, and `prisma migrate` was not run. This
> document is the only artifact produced by this step. Companion to
> `docs/IMPLEMENTATION_STATUS_REPORT.md` (the audit that flagged this as the #2 risk and the
> first item in its recommended build sequence), `docs/RBAC_AUDIT_REPORT.md` /
> `docs/RBAC_MIGRATION_TRACKER.md` (the permission-gap context that compounds this risk), and
> `docs/modules/finance/FINANCE_WRITE_ACCESS_CONTROL_PLAN.md` §8 (which already recommends
> "posted vouchers may require reversal instead of delete" — this plan generalizes that
> recommendation into a schema-level pattern).

---

## 1. Purpose

**Why soft delete is required.** `docs/IMPLEMENTATION_STATUS_REPORT.md` (the 2026-06-19 audit)
identified, as its #2-ranked risk: *"No soft delete anywhere — all 108 Prisma models use hard
deletes. Any UI delete action is unrecoverable; this compounds the RBAC gap (an under-permissioned
route could destroy data with no audit trail to undo it)."* That audit's own recommended build
sequence places a soft-delete pass on Finance-critical models as **Step 1**, before any new
Finance write API (Step 4A onward). This document is the planning half of that recommendation —
its own §9 "Safe Claude Code Prompts Needed Next" item 2 asks, verbatim, for "a soft-delete
migration plan for Finance-critical Prisma models... including the `deletedAt` field, query-filter
updates, and a rollback strategy," which is what this document delivers.

**Why hard delete is risky.** This codebase's hard deletes are not uniformly dangerous — some are
already protected by `ON DELETE RESTRICT` foreign keys (confirmed in §2/§3 below) — but several
are not:
- `DELETE /api/customers/master/[id]` permanently removes a `Customer` row that is referenced
  (via `SetNull` FKs) by `LeadGeneration`, `SalesFunnel`, `Collection`, `OrderAdvance`, and
  `CrmLead` records. The customer link on every one of those rows is silently severed — the
  transaction history survives, but loses its customer attribution permanently.
- `DELETE /api/employees/[id]` (manager-only) hard-deletes an `Employee` row that **cascades**
  (`ON DELETE CASCADE`, confirmed at the SQL level in §2) into deleting that employee's `KRA`,
  `WeeklyReview`, `LeadGeneration`, `SalesFunnel`, `Collection`, `Notification`, `DailyUpdate`,
  `WeeklyCommit`, `Certification`, `EmployeeProfile`, and `UserRole` rows — and `Collection`'s own
  cascade to `Payment` means **deleting one employee can silently destroy that employee's entire
  real billing/collection and payment history** in a single action, with no recovery path.
- `DELETE /api/collections/[id]` and the bulk `DELETE /api/collections` (by ID array) permanently
  remove real invoice/collection records and cascade-delete their `Payment` rows — this is a live
  risk today, not a future one, since `Collection`/`Payment` already have working create/read/
  delete APIs.

**Why this must be planned before Finance write APIs.** None of the dedicated Finance-Operations
models (`Expense`, `Voucher`, `EmployeeAdvance`, `TravelClaim`, `FinAccount`, `Ledger`, `Vendor`)
currently have *any* delete API — confirmed by inventory in §4. That is the good news: there is no
existing hard-delete behavior on these models to migrate away from. But per
`docs/IMPLEMENTATION_STATUS_REPORT.md` §5/§8, building their write APIs (Expense CRUD, Voucher
create/cancel, Bank/Cash entry, Advance disburse/settle) is the **next** major body of work once
RBAC and database-safety prerequisites are met. If those write APIs ship with `prisma.expense
.delete()`/`prisma.voucher.delete()` calls — the path of least resistance, and exactly the pattern
already used for `Customer`/`Collection`/`Employee` — every accounting record built afterward
inherits the same unrecoverable-delete risk this plan exists to prevent. Planning the pattern now,
before those APIs are written, means they can be built soft-delete-aware from day one instead of
requiring a second migration later.

**Why implementation is not being done in this step.** The task scope for this step is
documentation only. Schema changes, migrations, and API/UI changes carry real risk (a `deletedAt`
column added without updating every read filter would silently start showing rows that should be
hidden, or vice versa) and are deliberately sequenced into later, separately-scoped steps (see §10/
§12) so each can be reviewed and validated independently rather than bundled into one large,
harder-to-review change.

---

## 2. Current Delete Risk Summary

| Risk Area | Current Behavior | Risk | Priority |
|---|---|---|---|
| **Customer Master** | `DELETE /api/customers/master/[id]` hard-deletes the row; branches are re-parented first. `POST /api/customers/master/deduplicate` hard-deletes (`deleteMany`) the losing side of a merge after re-parenting their branches. Both guarded by `requirePermission(... "Masters","CustomerMaster","DELETE")`. No cascade-delete of dependents — `LeadGeneration`/`SalesFunnel`/`Collection`/`OrderAdvance`/`CrmLead` use `onDelete: SetNull`, so those rows survive but silently lose their customer link forever. | High — permanent loss of customer-attribution on real transaction/billing history; permission-guarded but still unrecoverable | **Critical** |
| **Vendor Master** | **No delete API exists at all** (no `/api/vendors` or `/api/masters/vendors` route on disk — `/masters/vendors` is still UI-only mock data per `docs/PROJECT_MEMORY.md`'s Global Masters section). | None today — purely a future risk once the real Vendor Master API is built | **Important** (pre-emptive — plan before the API exists, not after) |
| **Expense** | **No delete API exists.** `Expense.employeeId` → `Employee` is `ON DELETE RESTRICT` at the SQL level (confirmed in `prisma/migrations/20260602120000_finance_operations_phase1/migration.sql`), so an `Expense` row currently cannot even be orphaned by an employee hard-delete. | None today — future risk once Expense CRUD (`IMPLEMENTATION_STATUS_REPORT.md` Step 4A) ships | **Critical** |
| **Voucher** | **No delete API exists.** The model already has `voidedAt`/`voidReason` fields — i.e., the schema already anticipates a cancel/void pattern rather than delete. `Voucher.createdById` → `Employee` is `ON DELETE RESTRICT`. | None today — but the existing `voidedAt` pattern must not be replaced by a future hard `delete()` once Voucher write APIs ship | **Critical** |
| **Employee Advance** | **No delete API exists.** `EmployeeAdvance.employeeId` → `Employee` is `ON DELETE RESTRICT`; `approvedById` is `ON DELETE SET NULL`. | None today — future risk once Advance disburse/settle APIs ship | **Critical** |
| **Travel Claim / Conveyance** | **No delete API exists.** `TravelClaim.employeeId` → `Employee` is `ON DELETE RESTRICT`; `approvedById` is `ON DELETE SET NULL`. | None today — future risk once Conveyance trip-workflow APIs ship | **Critical** |
| **Payment / Collection** | `Collection` has both single (`DELETE /api/collections/[id]`) and bulk (`DELETE /api/collections` with an `ids[]` body) hard-delete routes, guarded by `canSeeAllCollections()` (the `roles.ts` legacy bridge — manager/Accounts/Operations-Head). `Payment.collectionId` → `Collection` is `ON DELETE CASCADE` at the SQL level, and `Collection.employeeId` → `Employee` is **also `ON DELETE CASCADE`** — so deleting an `Employee` cascades into deleting every `Collection` they ever recorded, which cascades into deleting every `Payment` against those collections. `Payment` itself has no dedicated delete API. | **Highest current real risk in the system** — real, live billing/invoice/payment data, two independent unrecoverable-delete paths (direct Collection delete, and indirect via Employee delete) | **Critical** |
| **Ledger / Finance Accounts** | **No delete route exists for either `Ledger` or `FinAccount`.** `Ledger.recordedById` → `Employee` is `ON DELETE RESTRICT`. `Ledger` rows are general-ledger postings — by accounting convention these should never be deleted at all, only reversed (e.g. via the existing `pairedLedgerId` self-pair field). | None today — but if a future Ledger "delete" route is ever built, it must not exist at all (reversal-only), not merely soft-deleted | **Do Not Soft Delete — reversal only** |
| **Workflow / Approval records** | **No delete route exists for `ApprovalRequest` or `ApprovalAction`.** Approval state changes go through `approveRequest`/`rejectRequest`/`returnRequest`/`delegateRequest`/`cancelRequest` in `src/lib/workflow-engine/approval.ts` (status transitions, not deletes), protected by Step 2A's object-level authorization fix. | None today — approval history is an audit trail by design and should never be deletable | **Do Not Soft Delete — immutable audit trail** |

---

## 3. Models To Soft Delete

Exact model names from `prisma/schema.prisma` (108 models total per
`docs/IMPLEMENTATION_STATUS_REPORT.md` §7 — only the models in scope for this audit are listed
below; every model the task brief named was inspected directly in the schema, none assumed).

| Model | Current Delete Usage | Should Add `deletedAt`? | Priority | Reason |
|---|---|---|---|---|
| `Customer` | Hard `delete()` + `deleteMany()` (dedupe merge) via `DELETE /api/customers/master/[id]` and `POST /api/customers/master/deduplicate` | Yes | **Critical** | Master record referenced by Lead/Funnel/Collection/Advance/CrmLead via `SetNull` FKs — losing the row loses customer attribution on real transaction history permanently |
| `Vendor` | None yet (no API) | Yes | **Critical** | Will be referenced by `Expense.vendorId`; must not hard-delete once the real Vendor Master API and Expense linkage are both live, to avoid orphaning/`SetNull`-ing expense vendor history |
| `Expense` | None yet (no API) | Yes | **Critical** | Real accounting/expense-claim record; per `FINANCE_WRITE_ACCESS_CONTROL_PLAN.md` §8 object-level rules, only draft-status edits are allowed and "no hard-delete on posted records" is already the documented intent |
| `Voucher` | None yet (no API); already has `voidedAt`/`voidReason` | **No — already has a reversal pattern (`voidedAt`)** | **Do Not Soft Delete (use existing void pattern)** | A posted voucher is an accounting document; the schema already models cancellation correctly via `voidedAt`/`voidReason`/`status="voided"` — adding `deletedAt` on top would create two competing "is this voucher gone" signals. Recommendation: keep `Voucher` off the soft-delete list and instead **ensure the future create/cancel API only ever sets `voidedAt`, never calls `prisma.voucher.delete()`** (see §13) |
| `EmployeeAdvance` | None yet (no API) | Yes | **Critical** | Real money advanced to an employee; status lifecycle (`pending→approved→disbursed→settled`) should be preserved indefinitely for reconciliation |
| `TravelClaim` | None yet (no API) | Yes | **Critical** | Real reimbursable expense record; same reasoning as `Expense` |
| `Payment` | None directly; cascade-deleted via `Collection`/`Employee` | Yes | **Critical** | Real money-received record; currently has no independent protection from cascading deletes — see §2 |
| `Collection` | Hard `delete()` + `deleteMany()` via `DELETE /api/collections/[id]` and `DELETE /api/collections` | Yes | **Critical** | Real invoice/billing record with the highest current live risk (§2) |
| `OrderAdvance` | None yet (no API found) | Yes | **Important** | Legacy/parallel "advance" concept (customer order advance, distinct from `EmployeeAdvance`) tied to real money received; same reasoning as `Payment`/`Collection` |
| `FinAccount` | None yet (no API) | Yes | **Important** | Chart-of-accounts row; deleting one would orphan every `Ledger` entry posted against it. Should support deactivation (`isActive` already exists) before any delete concept is even considered |
| `Ledger` | None yet (no API) | **No — reversal only, never delete or soft-delete** | **Do Not Soft Delete** | General-ledger postings are an immutable accounting trail by convention; a "deleted" ledger entry is not a real-world accounting concept — corrections must be reversing entries (the schema already has `pairedLedgerId` for bank↔cash transfer pairing, which the same reversal pattern can extend) |
| `ApprovalRequest` | None (status-transition lifecycle only) | **No** | **Do Not Soft Delete** | Already an append/transition-only audit trail, protected by Step 2A object-level authorization; no delete route exists or should exist |
| `ApprovalAction` | None | **No** | **Do Not Soft Delete** | Immutable history of who acted on an approval and when; deleting or soft-deleting either would corrupt the audit trail this model exists to provide |
| `Role` | None | Yes (Later) | **Later** | No delete route exists yet for the `access-control` `Role` model; if one is built, deactivating (`status: "INACTIVE"`, which the model already supports) is the safer first option, soft-delete as a fallback if hard removal is later requested |
| `Permission` | None | **No** | **Do Not Soft Delete** | Permissions are a static catalogue (`PERMISSION_CATALOGUE` in `permissions.ts`) synced by an idempotent seed script, not user-managed records; there is no legitimate "delete a permission" workflow in this system's design |
| `UserRole` | `deleteMany()` used routinely inside role-assignment PATCH flows (`/api/admin/identity/users/[id]`) | **No** | **Do Not Soft Delete** | A join-table row; "delete the row" *is* the correct semantic for "revoke this role from this user" — soft-deleting a revoked-role-assignment would require every permission check to also filter `deletedAt: null` on `UserRole`, adding risk for no benefit since role assignments aren't meant to be "restored" the way a customer record is |
| `DataAccessPolicy` | None | **No** | **Do Not Soft Delete** | One row per role+module, upserted by the seed script; not a record with restoration value |
| `MasterCategory` / `MasterDefinition` / `MasterValue` / `MasterOverride` | None found in `src/app/api` | Yes (Later) | **Later** | Master-data configuration tables (categories/definitions/values used across Settings → Masters); no delete route exists today, but values can be referenced by transaction records, so a future delete should not be a hard delete once those references exist |
| `AppRole` / `RolePageAccess` | `AppRole` has a hard `delete()` via `DELETE /api/admin/roles/[id]` (`isManager`-only) | **No — out of scope** | **Do Not Soft Delete (legacy, frozen)** | Per `RBAC_MIGRATION_TRACKER.md` §1/§2, this system is **frozen and decorative** — `rbac.ts`'s `hasPermission()`/`loadRolePermissions()` have zero real callers, so deleting an `AppRole` row has no runtime access-control effect today. Investing in soft-delete for a system already slated for retirement (Step 2P/2Q) would be wasted effort; resolve via that retirement instead |

---

## 4. Existing DELETE API Inventory

Every `prisma.*.delete(...)`/`prisma.*.deleteMany(...)` call found under `src/app/api` (generated
Prisma client model files under `src/generated/prisma` were excluded — those are framework
output, not application routes).

| API Route | Method | Prisma Delete Call | Model | Current Permission Guard | Recommended Change |
|---|---|---|---|---|---|
| `/api/customers/master/[id]` | DELETE | `prisma.customer.delete()` | `Customer` | `requirePermission(session,"Masters","CustomerMaster","DELETE")` | **Must convert to soft delete** |
| `/api/customers/master/deduplicate` | POST | `prisma.customer.deleteMany()` (merge losers) | `Customer` | `requirePermission(session,"Masters","CustomerMaster","DELETE")` | **Must convert to soft delete** (and the dedupe-detection `GET` must add `deletedAt: null` once soft delete ships, or already-deleted customers will resurface as "duplicates") |
| `/api/collections/[id]` | DELETE | `prisma.collection.delete()` | `Collection` | `getSession()` + `isManager \|\| own-record` ownership check | **Must convert to soft delete** (highest live risk per §2) |
| `/api/collections` | DELETE | `prisma.collection.deleteMany()` (bulk, by `ids[]`) | `Collection` | `canSeeAllCollections()` (`roles.ts` bridge) | **Must convert to soft delete** |
| `/api/employees/[id]` | DELETE | `prisma.employee.delete()` | `Employee` | `getSession()` + `isManager`-only | **Needs product decision** — this is the single highest-blast-radius hard delete in the system (cascades into `Collection`→`Payment`, `KRA`, `WeeklyReview`, `LeadGeneration`, `SalesFunnel`, `Notification`, `DailyUpdate`, `WeeklyCommit`, `Certification`, `EmployeeProfile`, `UserRole`). Soft-deleting `Employee` itself is a larger decision than this step's scope (it touches every other model's "who is this employee" lookups across the entire app) — flagged for a dedicated follow-up, not silently included in the Finance/Master-critical batch this plan scopes |
| `/api/certifications/[id]` | DELETE | `prisma.certification.delete()` | `Certification` | `getSession()` + `isManager`-only | Can remain hard delete (HR record, not Finance/Master-critical; out of this plan's scope) |
| `/api/weekly-commits/[id]` | DELETE | `prisma.weeklyCommit.delete()` | `WeeklyCommit` | `getSession()` + `isManager \|\| own-record` | Can remain hard delete (out of scope — CRM/KRA-adjacent, not Finance/Master) |
| `/api/lead-generation/[id]` | DELETE | `prisma.leadGeneration.delete()` | `LeadGeneration` | `getSession()` + `isManager \|\| own-record` | Can remain hard delete for this step (CRM pipeline record, out of Finance/Master scope — though note it has a `customerId` FK with `SetNull`, same Customer-link-loss pattern as §2) |
| `/api/pipeline/tasks/[id]` | DELETE | `prisma.crmTask.delete()` | `CrmTask` | `getSession()` + `isManager \|\| assignee` | Can remain hard delete (out of scope) |
| `/api/kras/[id]` | DELETE | `prisma.kRA.delete()` | `KRA` | `getSession()` + `isManager \|\| own-record` | Can remain hard delete (out of scope — performance-tracking, not Finance/Master) |
| `/api/sales-funnel/[id]` | DELETE | `prisma.salesFunnel.delete()` | `SalesFunnel` | `getSession()` + `isManager \|\| own-record` | Can remain hard delete for this step (legacy pipeline record, out of Finance/Master scope — same `customerId` `SetNull` note as `LeadGeneration`) |
| `/api/reviews/[id]` | DELETE | `prisma.weeklyReview.delete()` | `WeeklyReview` | `getSession()` + `isManager \|\| own-record` | Can remain hard delete (out of scope) |
| `/api/daily-updates/[id]` | DELETE | `prisma.dailyUpdate.delete()` | `DailyUpdate` | `getSession()` + `isManager \|\| own-record` | Can remain hard delete (out of scope) |
| `/api/pipeline/leads/[id]` | DELETE | `prisma.crmLead.delete()` | `CrmLead` | `getSession()` + `isManager \|\| assignee`; **already requires a `reason` field and writes an `AuditLog` row before deleting** | Can remain hard delete for this step (out of Finance/Master scope), but **this route is the existing best-practice template** for §7/§9 below — its "require reason → write audit log → then delete" pattern is exactly what soft-delete routes should replicate (with "soft-delete" in place of "then delete") |
| `/api/pipeline/notes/[id]` | DELETE | `prisma.crmNote.delete()` | `CrmNote` | `getSession()` + `isManager \|\| author` | Can remain hard delete (out of scope) |
| `/api/admin/roles/[id]` | DELETE | `prisma.appRole.delete()` | `AppRole` (legacy, frozen) | `getSession()` + `isManager`-only | Can remain hard delete — see §3's note: this system is decorative/frozen, scheduled for retirement (Step 2P/2Q), not worth soft-delete investment |
| `/api/admin/identity/users/[id]` | PATCH (internal) | `prisma.userRole.deleteMany()` | `UserRole` | `requirePermission(session,"Settings","Identity","EDIT")` | **Can remain hard delete** — this *is* the role-revoke action, not a destructive accident (§3) |
| `/api/admin/identity/permissions/[roleId]` | POST (internal) | `prisma.rolePermission.deleteMany()` | `RolePermission` | `requirePermission(session,"Settings","Identity","EDIT")` | **Can remain hard delete** — this *is* the permission-revoke action via the Permission Matrix UI, same reasoning as `UserRole` |

**Notably absent from this inventory:** no delete route exists anywhere for `Expense`, `Voucher`,
`EmployeeAdvance`, `TravelClaim`, `Vendor`, `FinAccount`, `Ledger`, `Payment`, `OrderAdvance`,
`Role`, `Permission`, `DataAccessPolicy`, `ApprovalRequest`, or `ApprovalAction` — confirming
`docs/IMPLEMENTATION_STATUS_REPORT.md`'s finding that Finance write APIs are almost entirely
unbuilt. This is the central reason this plan is being written *now*: there is nothing to migrate
away from yet for these models, only a pattern to put in place before their first write API ships.

---

## 5. Recommended Soft Delete Schema Pattern

Standard fields for every model in §3 marked "Yes":

```prisma
deletedAt    DateTime?
deletedById  Int?
deleteReason String?   @db.Text
```

**Why `deletedAt DateTime?` as the primary marker, not a boolean:**
- `null` means active, non-null means deleted — a single nullable timestamp carries both the
  boolean state *and* the "when" in one column, with no possibility of the two disagreeing.
- A separate `isDeleted Boolean @default(false)` alongside `deletedAt` would create exactly the
  failure mode this pattern is meant to avoid: a row where `isDeleted = true` but `deletedAt =
  null` (or vice versa) is an invalid, ambiguous state that a `deletedAt`-only design cannot
  produce.
- Filtering is a single, consistent `where: { deletedAt: null }` (active) or
  `where: { deletedAt: { not: null } }` (deleted) across every model — no per-model boolean-name
  inconsistency to remember.
- Sorting/reporting on "when was this deleted" comes for free, with no extra column.

**`deletedById Int?` instead of a typed relation, for now.** The brief for this plan and this
project's own existing convention (e.g. `Expense.approvedById Int?` paired with
`approvedBy Employee? @relation(...)`, `TravelClaim.approvedById`/`approvedBy`, etc.) both support
adding the relation directly. However, this plan deliberately recommends the **bare `Int?` field
first**, with the typed `@relation` to `Employee` added in a follow-up migration once the
soft-delete fields themselves are validated on dev — this keeps Phase A (§10) to a pure additive
column change with zero relation-graph risk, and defers the (low-risk but non-zero) relation-wiring
step to a moment when it can be reviewed on its own.

**`deleteReason String? @db.Text`** — nullable, not required at the schema level (some
soft-deletes, e.g. a duplicate-merge, may not need a free-text reason — the merge itself is the
reason). Whether the *API layer* should require it for certain models is a product decision, not a
schema one — see §13.

This mirrors the pattern already proven in this codebase: `DELETE /api/pipeline/leads/[id]`
already requires a `reason` in its request body and writes it to `AuditLog.notes` before deleting
(§4) — the soft-delete pattern generalizes that exact convention into a permanent column instead
of an audit-log-only note.

---

## 6. Query Filtering Rules

- **All normal list/detail read APIs must filter `deletedAt: null`.**
- **Admin/audit views may optionally include deleted records** (e.g. a future "show deleted"
  toggle on a Settings screen), but only for permission-gated admin users — never by default.
- **Dropdown/autocomplete APIs must exclude deleted records** — a soft-deleted Customer/Vendor
  must never be selectable on a new Expense, Voucher, or Lead form.
- **Reports must exclude deleted records unless explicitly requested** — a Finance report that
  silently includes a soft-deleted Expense would misstate totals exactly the way it does today
  with no soft-delete concept at all, just less obviously.
- **Unique/duplicate checks must consider active records only**, unless the check is explicitly
  part of a restore flow (where re-activating a record that collides with an active one is itself
  the conflict being checked for — see §8).

**Examples (illustrative — not implemented this step):**

Customer list:
```ts
prisma.customer.findMany({ where: { deletedAt: null } });
```

Customer detail:
```ts
prisma.customer.findUnique({ where: { id }, ... }); // then check result.deletedAt === null before returning, OR:
prisma.customer.findFirst({ where: { id, deletedAt: null } });
```

Duplicate check (e.g. the existing dedupe-detection `GET` in §4):
```ts
prisma.customer.findMany({ where: { deletedAt: null }, select: { id, name, ... } });
```
This is the one concrete, named change this plan flags for whenever Phase C (§10) lands:
`src/app/api/customers/master/deduplicate/route.ts`'s `GET` handler currently scans **all**
customers with no filter at all — once `deletedAt` exists, it must add `deletedAt: null` or a
previously soft-deleted customer will be re-surfaced as a "duplicate" candidate forever.

---

## 7. Delete API Behavior Rules

Standard shape for a converted DELETE endpoint:

1. Check permission (unchanged from today's guard — `requirePermission()` or the relevant
   `roles.ts` predicate).
2. Check the record exists **and** `deletedAt: null` (so deleting an already-deleted record
   returns a clean 404/409 rather than silently re-stamping `deletedAt`).
3. Check whether the record is referenced by critical transactions, if the model requires it (e.g.
   a `FinAccount` with `Ledger` entries posted against it; a `Customer` with active `Collection`/
   `SalesFunnel` rows — product decision per model, see §13).
4. Update `deletedAt = now()`, `deletedById = session.user.employeeId`, `deleteReason` from the
   request body (if provided/required).
5. Write an audit log row (§9) — extending the pattern `DELETE /api/pipeline/leads/[id]` already
   uses (§4), but logging *before* the soft-delete write is no longer strictly necessary the way
   it is for a hard delete (there's no "destroy evidence" race), though logging in the same
   request either order remains good practice.
6. Return success.

**Do not physically delete.** Suggested response shape, matching this project's existing
`{ ok: true }` (e.g. `DELETE /api/customers/master/[id]` today) or `{ success: true, deleted: n }`
(e.g. bulk `DELETE /api/collections` today) conventions — no new response envelope needs
inventing:
```json
{ "success": true, "message": "Record deleted successfully" }
```

**Do not expose internal hard/soft-delete details to the UI** beyond what it already shows (a
deleted record simply stops appearing in lists) unless a specific admin "view deleted records"
feature is built (§8's future scope).

---

## 8. Restore Behavior

**Recommendation: restore is not required in the first implementation.** The schema should
support it (setting `deletedAt` back to `null` is always possible once the column exists), but no
restore API needs to ship alongside the initial soft-delete conversion.

- Only Admin/Super Admin should be able to restore (i.e. gate on the same `Settings/Identity`-tier
  permission this project already uses for sensitive admin actions, or a future dedicated
  `Masters/CustomerMaster/RESTORE`-style action if the catalogue's `ACTION` enum is ever extended —
  out of scope to decide here).
- Restore must check for duplicate conflicts (e.g. restoring a `Customer` whose `gstNo` now
  collides with a different active customer created after the deletion) before clearing
  `deletedAt`.

**Documented future routes (not implemented this step):**
- `POST /api/customers/master/[id]/restore`
- `POST /api/vendors/[id]/restore` (once the real Vendor Master API exists)
- `POST /api/finance/expenses/[id]/restore` (once Expense CRUD exists)

---

## 9. Audit Logging Requirements

**A suitable audit sink already exists: the `AuditLog` model** (`prisma/schema.prisma`,
already used once, in `DELETE /api/pipeline/leads/[id]` — see §4). Its shape:

```prisma
model AuditLog {
  entityType    String   // expense|voucher|ledger|account|advance|travel_claim|vendor|approval
  entityId      Int
  action        String   // create|update|submit|approve|reject|void|disburse|settle|delete|reconcile
  performedById Int
  changes       String   // JSON before/after or detail
  notes         String
  createdAt     DateTime
}
```

This model's own `entityType` comment already enumerates exactly the Finance-critical models this
plan targets (`expense|voucher|...|advance|travel_claim|vendor`) and its `action` comment already
lists `delete` — **no new audit model is needed**, only new `action` values and consistent usage
across the routes this plan covers. Recommended new `action` values (documented here as a gap to
close in Phase D, §10):

- `SOFT_DELETE` — replaces the bare `delete` action value for converted routes.
- `RESTORE`
- `HARD_DELETE` — reserved for any route this plan explicitly leaves as hard delete (§4's "can
  remain hard delete" rows), so a hard delete is still always logged even where soft-delete isn't
  applied.
- `DELETE_BLOCKED_REFERENCE_EXISTS` — for the §7 step-3 "referenced by critical transactions"
  check, when it blocks a delete attempt; logging the *attempt*, not just silently 409-ing, gives
  visibility into who tried to delete a referenced record.

Recommended field mapping onto the existing model (no schema change required — these are usage
conventions, not new columns):
- `entityType` → the model name in lowercase/snake_case, matching the existing comment's style
  (e.g. `customer`, `expense`, `voucher`).
- `entityId` → the soft-deleted row's `id`.
- `action` → one of the four values above.
- `performedById` → `session.user.employeeId` (same as `deletedById` from §5/§7).
- `changes` → JSON snapshot of the row's prior state (or, for `RESTORE`, before/after), following
  the existing "before/after JSON" convention the model's own comment already documents.
- `notes` → the `deleteReason` (or a system-generated note for `DELETE_BLOCKED_REFERENCE_EXISTS`,
  e.g. which referencing records blocked it).

**No gap to document** — unlike some plans that must flag "no audit writer exists," this codebase
already has both the model and one working call site to extend from.

---

## 10. Migration Safety Plan

**Phase A** — Add `deletedAt`/`deletedById`/`deleteReason` fields to the critical models from §3
(`Customer`, `Vendor`, `Expense`, `EmployeeAdvance`, `TravelClaim`, `Payment`, `Collection`,
`OrderAdvance`, `FinAccount`). Generate the migration. Validate on the dev DB
(`u686730471_caveodev`) only. **`Voucher` is deliberately excluded from Phase A** — see §3's
recommendation to extend its existing `voidedAt` pattern instead, not add a parallel `deletedAt`.

**Phase B** — Update every existing **read** API for the Phase A models to exclude
`deletedAt: not null` (§6). This must land *before* Phase C, and is itself the highest-value,
lowest-risk phase, since it changes nothing about how today's hard-delete-only routes behave — it
only prepares reads for a `deletedAt` column that, immediately after Phase A, will exist on every
row but never be non-null yet.

**Phase C** — Convert the existing **DELETE** APIs in §4 marked "Must convert to soft delete"
(`Customer`'s two delete paths, `Collection`'s two delete paths) to the §7 behavior. **Important:
do not begin Phase C before Phase B is complete and verified** — converting a delete endpoint to
soft-delete while a sibling read endpoint still has no `deletedAt` filter would make "deleted"
records reappear in lists immediately, which is a worse user-facing regression than today's hard
delete.

**Phase D** — Add the `AuditLog` writer calls (§9) to every route touched in Phase C.

**Phase E** — (Later, optional) Add an admin restore UI and a "view deleted records" list screen,
once a concrete need for it is identified — not scheduled as part of this plan's recommended
sequence (§12).

---

## 11. Hostinger / MySQL Migration Notes

- **Do not run `prisma migrate dev` against the production Hostinger database.** Per
  `CLAUDE.md`'s existing, standing rule, all schema work happens against the dev DB
  (`u686730471_caveodev`) first.
- **Use the dev DB first**, exactly as every prior schema-touching step in this project's history
  has (e.g. the Finance Operations Phase 1 migration, the Phase 12/13 Integration/Security Center
  migrations — all applied to dev before any production cutover language appears in the docs).
- **Back up the database before migration** — standard practice for any schema-altering change,
  doubly so given this project has no rollback tooling beyond `prisma migrate resolve` (used
  historically per `docs/DATABASE.md`'s session notes when Hostinger's lack of a shadow database
  required hand-written SQL + manual resolve).
- **Use `prisma migrate deploy` for production**, never `migrate dev` (which can prompt for
  destructive resets) — consistent with this project's existing documented Hostinger workflow.
- **Confirm the generated migration has no destructive `DROP` operation.** A pure
  `deletedAt`/`deletedById`/`deleteReason` addition should generate only `ALTER TABLE ... ADD
  COLUMN` statements; if Prisma's diff ever proposes a `DROP`/`MODIFY` on an unrelated column,
  stop and investigate before applying.
- **Test the rollback/restore plan** before applying to any database that matters — for a
  pure-addition migration this is usually just "drop the three new columns," but that should be
  written down and dry-run on dev, not assumed.

---

## 12. Implementation Sequence

**Step 3B** — Add `deletedAt`/`deletedById`/`deleteReason` fields to the critical models identified
in §3 only (`Customer`, `Vendor`, `Expense`, `EmployeeAdvance`, `TravelClaim`, `Payment`,
`Collection`, `OrderAdvance`, `FinAccount`) — Phase A above.

**Step 3C** — Update `Customer`/`Vendor` read filters (list, detail, dropdown, dedupe-detection) to
exclude `deletedAt: not null` — Phase B above, scoped to Master models first since they have the
most existing read surface to update.

**Step 3D** — Convert the `Customer` DELETE APIs (`/api/customers/master/[id]` and the dedupe-merge
path) to soft delete — Phase C above, scoped to Master first.

**Step 3E** — Update Finance read filters (`Expense`, `EmployeeAdvance`, `TravelClaim`, `Payment`,
`Collection`, `OrderAdvance`, `FinAccount` — and their existing `/api/finance/*` GET routes from
Step 2M) to exclude `deletedAt: not null` — Phase B, Finance half.

**Step 3F** — Convert the existing `Collection` DELETE APIs to soft delete, and build any new
Finance write-API DELETE endpoints (once those write APIs themselves are built, per
`IMPLEMENTATION_STATUS_REPORT.md`'s separate build sequence) soft-delete-native from day one —
Phase C, Finance half.

**Step 3G** — Add the `AuditLog` writer integration (`SOFT_DELETE`/`RESTORE`/`HARD_DELETE`/
`DELETE_BLOCKED_REFERENCE_EXISTS` actions, §9) to every route touched in 3D/3F — Phase D above.

**Step 3H** — (Optional, later) Add an admin restore endpoint and/or a deleted-records list screen
— Phase E above, only once a concrete need is identified.

---

> **Implementation progress note (2026-06-21).** Step 3B-0 (`docs/database/SOFT_DELETE_DECISION_LOG.md`)
> locked the open §13 decisions below into final answers. **Step 3B is now complete**:
> `deletedAt`/`deletedById`/`deleteReason` were added to the 7 approved models (`Customer`,
> `Vendor`, `Expense`, `EmployeeAdvance`, `TravelClaim`, `Payment`, `Collection`) and migration
> `20260621120000_add_soft_delete_fields_phase_a` was applied to the dev DB only. **Step 3C is now
> also complete: Phase B read filters implemented before delete-route conversion** — every normal
> read (list/detail/dropdown/search/duplicate-detection/import-dedup/count/aggregate/dashboard) on
> the 7 approved models now filters `deletedAt: null`, deliberately landed before any DELETE route
> is converted (Step 3D), per this plan's own §6/§10 ordering. **Step 3D is now also complete:
> Phase C started with Customer and Collection delete-route conversion after read filters were in
> place** — `DELETE /api/customers/master/[id]`, `POST /api/customers/master/deduplicate`,
> `DELETE /api/collections/[id]`, and `DELETE /api/collections` (bulk) all now soft-delete via
> `update()`/`updateMany()` plus a per-record `AuditLog` write, instead of `delete()`/
> `deleteMany()` — exactly this plan's §7 behavior, scoped to the two confirmed live-risk models
> only. Steps 3E–3H below (Finance delete-route conversion once those write APIs exist, restore
> routes, restore UI) remain not started. See `docs/RBAC_MIGRATION_TRACKER.md` §4 and
> `docs/PROJECT_MEMORY.md` for full detail.

> **Implementation progress note (2026-06-21, UI step — distinct from this plan's own "Step 3E"
> Finance-read-filter step above, which remains not started).** Tracked as **Step 3E** in
> `docs/RBAC_MIGRATION_TRACKER.md` §4 and `docs/PROJECT_MEMORY.md`: user-triggered Customer and
> Collection soft deletes now capture a reason. The Customer Master and Collections delete UIs
> (single + bulk) were converted from `window.confirm()` to a required-reason modal
> (`DeleteCustomerModal` / shared `DeleteReasonModal`, following the existing `DeleteLeadModal`
> pattern), so the `deleteReason` accepted by the Step 3D APIs is now actually user-entered
> instead of always falling back to `"Deleted by user"`. No schema, migration, read filter, API
> response shape, or authorization logic changed; no API route code changed. Merge-delete
> intentionally kept its system-generated reason, no UI prompt added. Live-verified against
> disposable dev-only test rows. See `docs/database/SOFT_DELETE_DECISION_LOG.md`'s Step 3E note
> for full detail.

---

## 13. Risks And Decisions Needed

Decisions required before implementation (Step 3B onward) — none of these are answered by this
plan; they are listed here precisely because they need a product/stakeholder decision, not an
engineering default:

- **Which models must support restore?** This plan recommends none in the first pass (§8) — does
  the business actually need a "undo delete" workflow for Customer/Vendor, or is "soft-delete = no
  longer visible, recoverable only via direct DB access if truly necessary" sufficient?
- **Should `deleteReason` be required at the API layer** for any or all of the §3 models — e.g.
  mandatory for `Customer`/`Collection` (real transaction-bearing records) but optional for a
  duplicate-merge?
- **Who can view deleted records?** Super Admin only, or also Finance Manager / Business Head for
  their own module's deleted records?
- **Who can restore records?** Same question as above, for the restore side specifically (§8
  recommends Admin/Super Admin only as a starting default).
- **Should Finance vouchers ever be deleted, or only cancelled/voided?** §3 already recommends
  "only voided" using the existing `voidedAt` field — this still needs an explicit product
  sign-off before the first Voucher write API ships, since it forecloses building a Voucher
  `DELETE` route at all.
- **Should ledger entries ever be deleted, or only reversed?** Same question, for `Ledger` — §3
  recommends reversal-only (no delete, no soft-delete) as a hard accounting-convention rule, not
  a soft preference; this needs explicit confirmation since it's a stronger constraint than
  "deletable but recoverable."
- **Should `Role`/`Permission` data be soft-deleted or hard-deleted?** §3 recommends `Permission`
  stay hard-delete-free entirely (it's a seeded catalogue, not a user-managed record) and `Role`
  prefer deactivation (`status: "INACTIVE"`, already supported) over either kind of delete — does
  that match the intended Identity & Access management design, or is an eventual hard `Role`
  delete actually wanted for cleanup purposes?
- **What should happen to the `Employee` hard-delete?** Flagged in §4 as needing its own decision
  separate from this plan's Finance/Master-critical scope — its cascade graph (`Collection`→
  `Payment` among others) means it is arguably the single highest-risk hard delete in the system,
  but soft-deleting `Employee` itself has app-wide implications (every `assignedToId`/`recordedById`
  /etc. lookup across dozens of models would need to consider "did this employee get soft-deleted"
  questions that don't currently exist) that this plan deliberately does not resolve.

---

## 14. Final Recommendation

- **Start with `Customer`, `Vendor`, `Expense`, `EmployeeAdvance`, `TravelClaim`** as the
  soft-delete rollout's first batch — exactly the Finance/Master-critical set this plan was scoped
  to cover. (`Voucher` is intentionally handled differently — see below — and `Collection`/
  `Payment`/`OrderAdvance`/`FinAccount` are recommended as a closely-following second batch given
  their `Critical`/`Important` priority in §3, not deferred indefinitely.)
- **Do not enable any new Finance write API until the soft-delete foundation (Step 3B–3D at
  minimum) is implemented for the models that API will touch.** This generalizes
  `docs/IMPLEMENTATION_STATUS_REPORT.md`'s own Step 1 recommendation ("Soft-delete + audit-field
  pass... before any new write API is added") into an explicit gate per model, not just a global
  one-time pass.
- **Avoid hard deletes for accounting records, full stop.** `Expense`, `Voucher`,
  `EmployeeAdvance`, `TravelClaim`, `Payment`, `Ledger` should never have a `prisma.<model>.delete()`
  call anywhere in this codebase once their write APIs exist — every one of them should resolve to
  either a soft-delete (`deletedAt`) or a domain-specific reversal/cancellation field
  (`voidedAt` for `Voucher`, a reversing `Ledger` entry for `Ledger`), never a physical row removal.
- **Use reversal/cancellation for posted financial documents instead of delete.** This is already
  the documented intent for `Voucher` (`FINANCE_WRITE_ACCESS_CONTROL_PLAN.md` §8: "posted vouchers
  may require reversal instead of delete") — this plan extends the same principle to `Ledger` and
  recommends it as the standing rule for any future Finance document model, not a one-off note on
  a single model.

---

