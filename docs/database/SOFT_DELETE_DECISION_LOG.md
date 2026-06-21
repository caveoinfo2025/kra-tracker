# Soft Delete Decision Log

> Decision/sign-off step — Step 3B-0. No Prisma schema change, no migration, no `prisma migrate`
> run, no API code change, no UI code change, no delete behavior change. This document locks the
> scope §13 of `docs/database/SOFT_DELETE_MIGRATION_PLAN.md` (Step 3A) left open, so Step 3B can
> add schema fields against an approved, unambiguous model list rather than re-deriving scope from
> the plan's recommendations at migration time.

> **Implementation note (Step 3B, 2026-06-21):** the schema fields and migration approved in §2/
> §12 below have been implemented. Migration `20260621120000_add_soft_delete_fields_phase_a`
> applied to the dev DB (`u686730471_caveodev`) only — additive `ADD COLUMN`/`CREATE INDEX`
> statements for exactly the 7 approved models, no destructive SQL, no API/UI change. `prisma
> migrate dev` could not run directly (Hostinger has no shadow-database privilege, `P3014`); the
> migration SQL was instead generated via `prisma migrate diff --from-config-datasource
> --to-schema prisma/schema.prisma --script` and applied via a one-off
> `prisma/apply-soft-delete-fields-phase-a.mjs` script, then marked resolved. See
> `docs/RBAC_MIGRATION_TRACKER.md` §4 (Step 3B row) and `docs/PROJECT_MEMORY.md`'s Step 3B entry
> for full detail. The §13 exit criteria below are now satisfied.

---

## 1. Decision Summary

| Decision Area | Final Decision | Reason | Impact |
|---|---|---|---|
| Phase A model list | `Customer`, `Vendor`, `Expense`, `EmployeeAdvance`, `TravelClaim`, `Payment`, `Collection` — 7 models | These are the real/imminent hard-delete risk models with no competing reversal pattern of their own | Step 3B may only add `deletedAt`/`deletedById`/`deleteReason` to these 7 models |
| Voucher | Excluded from `deletedAt` migration | Already has `voidedAt`/`voidReason` — a second "is this gone" signal would be ambiguous | Voucher write APIs use void/cancel, never `delete()` or `deletedAt` |
| Ledger | Excluded from `deletedAt` migration | Accounting convention: ledger postings are immutable; corrections are reversing entries | Ledger never gets a delete or soft-delete path — reversal-only, enforced at the API-design level when Ledger write APIs are built |
| ApprovalRequest / ApprovalAction | Excluded | Immutable audit/workflow trail by design | No delete or soft-delete concept applies; unchanged from today |
| Permission / UserRole / DataAccessPolicy | Excluded | Revoke/remove is the correct semantic, not soft-delete; Permission is a seeded catalogue | `deleteMany()` usage for role/permission revocation continues unchanged |
| Restore API | Deferred | Preventing destructive deletes is the first priority; restore needs duplicate-conflict checks + admin UI | No restore route ships in Step 3B or any step until explicitly scheduled |
| `deleteReason` requirement | Optional at DB level, required at API level for user-triggered deletes where practical | DB-optional avoids backfill issues; API-required preserves accountability | Schema: nullable column. API layer (future step): validate presence before accepting a delete request, per model in §4 |
| Viewing deleted records | No normal user can see them by default; deferred | Limits exposure until an explicit admin view is designed | No "show deleted" UI/API ships in Step 3B |
| Restoring records | Deferred; Super Admin / module admin only when built | Same rationale as the restore-API deferral | No restore permission or route exists yet |
| Employee delete | Out of scope — separate lifecycle decision | Cascades into Collection→Payment and 9+ other models; should likely be deactivation, not delete | `Employee` is not in the Phase A list and will not be touched by Step 3B |
| Audit logging | Mandatory for every soft delete, reusing the existing `AuditLog` model | `AuditLog` already exists and already has one working call site (`DELETE /api/pipeline/leads/[id]`) | No new audit model; new `action` values documented for the eventual route-conversion step |

---

## 2. Phase A Models Approved For Schema Migration

The following 7 models are approved for the Step 3B schema migration. Each gets exactly these
three fields:

```prisma
deletedAt    DateTime?
deletedById  Int?
deleteReason String?   @db.Text
```

- `Customer`
- `Vendor`
- `Expense`
- `EmployeeAdvance`
- `TravelClaim`
- `Payment`
- `Collection`

**Not included in this approved list, by deliberate exclusion (not oversight):**
- **`Voucher`** — already has `voidedAt`/`voidReason`. Do not add `deletedAt` to Voucher; it
  should follow the existing cancellation/voiding pattern (§7).
- **`Ledger`** — should follow reversal-only accounting convention, never soft-deleted (§8).
- **`ApprovalRequest` / `ApprovalAction`** — immutable audit/workflow records (§9 of
  `SOFT_DELETE_MIGRATION_PLAN.md` §3; reaffirmed here).
- **`Permission` / `UserRole` / `DataAccessPolicy`** — revoke/remove semantics differ from
  business-data delete; `Permission` is a seeded catalogue, not user-managed (§10).
- **`Employee`** — separate carve-out, see §9 below.
- **`OrderAdvance` / `FinAccount`** — flagged "Important" (not "Critical") in the Step 3A plan's
  §3, with no existing delete route for either. Left out of this first approved batch to keep
  Step 3B's scope to the models with confirmed live or imminent delete risk; may be added in a
  later batch following the same pattern, not part of this decision.

---

## 3. Restore Scope Decision

**Restore API is deferred.**

Rationale:
- First priority is preventing destructive deletes, not building the full undo workflow.
- Restore requires duplicate-conflict checks (e.g. restoring a `Customer` whose `gstNo` now
  collides with a different active customer created after the deletion) and an admin UI — neither
  exists today.
- The `deletedAt` structure keeps restore technically possible later (setting it back to `null`
  is always available) without committing to build it now.

Documented future restore route examples (out of scope, not implemented):
- `POST /api/customers/master/[id]/restore`
- `POST /api/vendors/[id]/restore` (once a real Vendor Master API exists)
- `POST /api/finance/expenses/[id]/restore` (once Expense CRUD exists)
- `POST /api/collections/[id]/restore`
- `POST /api/finance/advances/[id]/restore`, `POST /api/finance/travel-claims/[id]/restore`,
  `POST /api/finance/payments/[id]/restore`

---

## 4. Delete Reason Policy

**`deleteReason` is optional at the DB level but required by the API for user-triggered deletes
wherever practical.**

Rationale:
- DB-optional avoids migration/backfill issues — no existing row needs a retroactive reason.
- API-level requirement preserves accountability for the deletes that matter most.
- Some system-initiated deletes may not have a user-entered reason to attach.

Per-model policy (to be enforced when each DELETE route is converted in a later step — not
enforced today):

| Model | Trigger | `deleteReason` requirement |
|---|---|---|
| `Customer` | User delete via `/api/customers/master/[id]` | Required |
| `Vendor` | User delete (future Vendor Master API) | Required |
| `Payment` | User delete | Required |
| `Collection` | User delete via `/api/collections/[id]` or bulk | Required |
| `Expense` | User delete (future Expense API) | Required (finance transaction) |
| `EmployeeAdvance` | User delete (future Advance API) | Required (finance transaction) |
| `TravelClaim` | User delete (future Claims API) | Required (finance transaction) |
| Any of the above | System cleanup (e.g. automated dedupe-merge cleanup) | Optional, but the corresponding `AuditLog` write is still mandatory (§11) |

---

## 5. Who Can View Deleted Records

**No normal user can see deleted records by default.**

Deleted-record views are deferred. Future access should require one of:
- Super Admin
- A dedicated Restore permission
- A module admin permission (e.g. a Finance-Operations-scoped grant for Finance models)

Documented as a future enhancement — no "show deleted" toggle, filter, or API parameter ships in
Step 3B or any step until explicitly scheduled.

---

## 6. Who Can Restore Records

**Restore is deferred**, consistent with §3.

When implemented later:
- Super Admin can restore.
- Module Admin may restore within their own module (e.g. Finance Manager restoring a soft-deleted
  `Expense`, not a `Customer`).
- Restore must check duplicate conflicts before clearing `deletedAt`.
- Restore must write an `AuditLog` row (`RESTORE` action, §11).

---

## 7. Voucher Decision

**Voucher should not use `deletedAt`.** Use the existing `voidedAt`/`voidReason` pattern.

Reason:
- Accounting documents should not be deleted once issued/posted — a voucher is evidence of a
  financial event, not a draft record.
- Cancellation/voiding is clearer than soft delete: `voidedAt`/`voidReason`/`status="voided"`
  already models "this voucher is no longer in effect" without introducing a second, competing
  "is this gone" signal alongside a hypothetical `deletedAt`.
- Voucher write APIs (not yet built) should implement a void/reverse workflow, not a delete
  endpoint. No `prisma.voucher.delete()` should ever be added once that API ships.

---

## 8. Ledger Decision

**Ledger should not use `deletedAt`.** Use reversal entries only.

Reason:
- Ledger postings must remain immutable for audit/accounting integrity — a "deleted" ledger entry
  is not a real-world accounting concept.
- Corrections should be made through reversing journal/ledger entries, extending the schema's
  existing `pairedLedgerId` self-pair field (already used for bank↔cash transfer pairing) rather
  than inventing a new correction mechanism.
- No Ledger delete route exists today (confirmed in the Step 3A inventory); this decision
  pre-emptively rules one out before any future Ledger write API is built.

---

## 9. Employee Delete Carve-Out

**Employee delete is separate scope.** It is not part of Step 3B and not part of this Phase A
approved list.

Reason:
- `Employee` currently links to finance/payment/collection flows; `DELETE /api/employees/[id]`
  cascades (`ON DELETE CASCADE`, confirmed at the SQL level) into `Collection`→`Payment`, `KRA`,
  `WeeklyReview`, `LeadGeneration`, `SalesFunnel`, `Notification`, `DailyUpdate`, `WeeklyCommit`,
  `Certification`, `EmployeeProfile`, and `UserRole` — the single highest-blast-radius hard delete
  in the system.
- Employee deletion can cascade into and affect sensitive financial data; soft-deleting `Employee`
  itself has app-wide implications (every `assignedToId`/`recordedById`/etc. lookup across dozens
  of models would need to consider "did this employee get soft-deleted").
- Employee should likely be **deactivated**, not deleted — this is an identity-lifecycle decision,
  not a data-retention decision, and belongs in a separate HR/Admin identity lifecycle step.

**Employee is not added to Step 3B.**

---

## 10. Role / Permission Delete Decision

**Do not soft-delete `Permission` / `UserRole` / `DataAccessPolicy` in Step 3B.**

Reason:
- `Permission` is a seeded catalogue (`PERMISSION_CATALOGUE` in `permissions.ts`), synced by an
  idempotent seed script — there is no legitimate "delete a permission" workflow in this system's
  design.
- `UserRole` / `RolePermission` are join tables where revocation **is** the correct semantic —
  `deleteMany()` on a role/permission assignment means "this grant no longer applies," not "an
  accidental loss of data to recover from." Soft-deleting these would require every permission
  check to also filter `deletedAt: null`, adding risk for no benefit since role assignments are
  not meant to be "restored" the way a customer record is.
- `DataAccessPolicy` should be handled separately if a policy lifecycle (versioning, deprecation)
  is ever needed — not folded into this generic soft-delete pattern.

Role soft delete may be considered later only if role management requires it (e.g. deactivating a
custom `Role` row) — not decided here, and not part of Step 3B.

---

## 11. Audit Logging Decision

**All soft deletes must write an `AuditLog` row, wherever `AuditLog` already covers that entity
type.**

`AuditLog` already exists in `prisma/schema.prisma` and already has one working call site
(`DELETE /api/pipeline/leads/[id]`, which requires a `reason` and logs before deleting) — no new
audit model is needed.

If a future model in scope for soft-delete has no reusable audit writer at the time its DELETE
route is converted, creating that audit writer is a later implementation sub-step that must
happen **before** converting that route — not bundled into Step 3B.

Required audit event (`action`) names, to be used when DELETE routes are eventually converted
(not used in Step 3B, which makes no API changes):
- `SOFT_DELETE`
- `RESTORE`
- `DELETE_BLOCKED_REFERENCE_EXISTS`
- `VOUCHER_VOID`
- `LEDGER_REVERSAL`

---

## 12. Step 3B Scope Lock

**Step 3B is approved only for schema fields and migration on these models:**
- `Customer`
- `Vendor`
- `Expense`
- `EmployeeAdvance`
- `TravelClaim`
- `Payment`
- `Collection`

**Step 3B must not:**
- Change API behavior
- Change UI behavior
- Convert delete routes
- Add restore routes
- Touch Voucher `deletedAt`
- Touch Ledger `deletedAt`
- Touch Employee deletion behavior

---

## 13. Step 3B Exit Criteria

Step 3B should be considered complete only when:
- Prisma schema has the new `deletedAt`/`deletedById`/`deleteReason` fields for the 7 approved
  models in §2
- Migration is generated safely on the dev DB (`u686730471_caveodev`) only
- Migration SQL has no destructive `DROP` operation — only `ALTER TABLE ... ADD COLUMN`
  statements are expected
- `npx prisma validate` passes
- `npx tsc --noEmit` passes
- `npm run build` passes
- Existing app behavior is unchanged (no read filter, delete route, or UI was touched)

---

# Documentation Update

`docs/RBAC_MIGRATION_TRACKER.md` and `docs/PROJECT_MEMORY.md` have been updated with a Step 3B-0
completion note — see the diffs in those files for the exact wording.

# Validation

`npx prisma validate` run — passes (schema untouched by this step, so this is a no-op
confirmation, not a meaningful check). `npm run build` / `npx tsc --noEmit` were not required to
re-validate since no code or schema file changed in this step; both were last confirmed passing
in Step 3A.
