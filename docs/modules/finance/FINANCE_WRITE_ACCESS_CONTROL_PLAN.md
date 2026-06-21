# Finance Write Access-Control Plan

> Planning/documentation only — Step 2L. No Finance write API, schema change, migration, UI
> change, or permission-enforcement change is part of this document. Companion to
> `docs/RBAC_AUDIT_REPORT.md` (findings), `docs/RBAC_MIGRATION_TRACKER.md` (execution tracker),
> and `docs/modules/finance/FINANCE_API_WIRING_PLAN.md` (the existing read-API wiring history and
> endpoint inventory, which this document does not replace). Read alongside
> `docs/IMPLEMENTATION_STATUS_REPORT.md` §3/§5/§8 for the Finance write-API build sequence this
> plan's permission mapping is meant to slot into.

---

## 1. Purpose

All future Finance write APIs must use `access-control`'s `requirePermission()` (or
`hasPermission()` for non-route-level checks) from day one, plus object-level and scope checks
where the action touches a specific record (an employee's own expense, a specific bank/cash
account, a specific voucher).

State clearly:

- **Finance write APIs must not be built using only `roles.ts`.** `canManageFinance()`,
  `canManagePayments()`, `isAccounts()`, `isOperationsHead()` are coarse, all-or-nothing booleans
  with no module/resource/action granularity and no scope dimension — exactly the pattern Step 2F
  already had to migrate the 7 Finance-admin config routes away from (`RBAC_AUDIT_REPORT.md`
  §3.2). Repeating it on write endpoints would recreate the same migration debt, this time on
  routes that move real money.
- **`roles.ts` may remain as a temporary bridge for existing read APIs and self-service logic.**
  The current `GET /api/finance/*` routes (accounts, dashboard, bank-book, cash-book, expenses,
  advances, conveyance, vouchers, voucher-sequences) stay on `canManageFinance()`/`isManager`
  ownership-style checks for now — migrating reads is a separate, larger step (Step 2M, not in
  scope here) because it requires `DataAccessPolicy` OWN-vs-ALL scope rules that don't exist yet.
  Touching them as a side effect of this plan would be the kind of unscoped change the task brief
  explicitly prohibits.
- **All new write APIs must use `access-control` from day one.** Every planned endpoint in §4 is
  mapped to a real `(module, resource, action)` triple from `permissions.ts` in §5, or flagged as
  a **Catalogue Gap** in §3/§12 rather than guessed at. This mirrors the exact rule already
  written into `RBAC_MIGRATION_TRACKER.md` §5: *"All new Finance write APIs must use
  `access-control` from day one — do not repeat the `isManager`-only pattern that Step 2F just had
  to migrate away from."*

---

## 2. Current Finance Authorization State

| Route | Method | Current Guard | Current Status | Migration Note |
| ----- | ------ | ------------- | --------------- | -------------- |
| `/api/finance/accounts` | GET | `canManageFinance(session.user)` | roles.ts | No write method exists yet. A future `POST`/`PATCH /api/finance/accounts/[id]` (per `FINANCE_API_WIRING_PLAN.md` Step 2A) is **not in this plan's §4 list** — it was identified by the wiring plan as a *prerequisite* Ledger Master screen, not a Phase-1 write endpoint; recommend the same `Finance/Account` mapping pattern in §5 be applied when it is built. |
| `/api/finance/dashboard` | GET | `canManageFinance(session.user)` | roles.ts | Read-only aggregation; no write method planned. Out of scope for this plan. |
| `/api/finance/bank-book` | GET | `canManageFinance(session.user)` | roles.ts | `POST` (entry) is planned — see §4 Bank Book APIs. |
| `/api/finance/cash-book` | GET | `canManageFinance(session.user)` | roles.ts | `POST` (entry), transfer endpoints planned — see §4 Cash Book APIs. |
| `/api/finance/expenses` | GET | `canManageFinance()` for full visibility; own-data scoping otherwise | roles.ts | `POST` planned — see §4 Expense APIs. Note: the **mobile** `POST /api/expenses` (a different route, outside `/api/finance/*`) already exists and writes `Expense` rows with no `access-control` check (own-employee self-service, gated only by session) — it is **not** superseded by this plan and is **not** listed in §4; any future consolidation of the two expense-create paths is a separate decision, not assumed here. |
| `/api/finance/expenses/[id]` | GET | `canManageFinance()` for full visibility; own-data scoping otherwise | roles.ts | `PATCH`, `DELETE`, and action sub-routes (`submit`/`approve`/`reject`/`mark-paid`) are planned — see §4 Expense APIs. |
| `/api/finance/advances` | GET, **POST** | GET: `canManageFinance()` for full visibility, own-data otherwise. **POST already exists** and is gated the same way (`canManageFinance` not required to create — any authenticated employee can create their own advance request; calls `startApproval()` directly) | roles.ts | This is the **one real Finance write endpoint already in production** per `IMPLEMENTATION_STATUS_REPORT.md` §1. It is **not re-built** by this plan, but its self-service/no-`access-control` pattern is exactly what §6 below documents as the correct shape for *self-service create* — disburse/submit/approve/reject/disburse/settle endpoints (still unbuilt) are listed in §4 and must use `access-control`, unlike this existing create path. |
| `/api/finance/conveyance` | GET | `isManager \|\| isAccounts \|\| isOperationsHead` inline (own-data scoping otherwise) | roles.ts | `POST` (trips), submit/approve/reject/settlement/distance-calc planned — see §4 Conveyance APIs. |
| `/api/finance/vouchers` | GET | `canManageFinance(session.user)` | roles.ts | `POST` (create) planned — see §4 Voucher APIs. |
| `/api/finance/vouchers/[id]` | GET | `canManageFinance(session.user)` | roles.ts | `cancel`, `pdf`/`generate-pdf` planned — see §4 Voucher APIs. |
| `/api/finance/voucher-sequences` | GET | `canManageFinance(session.user)` | roles.ts | Read-only sequence display; no write method planned (sequence increment happens server-side inside the voucher-create transaction, not via a separate write endpoint). |

Cross-reference: `RBAC_AUDIT_REPORT.md` §3.7 independently confirms all of the above GET guards
and flags the whole `/api/finance/*` surface as "the single largest 'Wrong Permission System'
surface by route count" precisely because `access-control`'s `Finance/Invoice/Expense/Payment/
Advance` resources already exist in the catalogue but are used by zero current routes. This plan
exists to make sure that gap is closed *for new write routes* rather than widened further.

---

## 3. Finance Permission Catalogue Review

Inspected `src/lib/access-control/permissions.ts` (`PERMISSION_CATALOGUE`) directly — exact names
below, nothing invented.

| Module | Resource | Action | Exists? | Notes |
| ------ | -------- | ------ | ------- | ----- |
| Finance | Invoice | VIEW | ✅ Yes | |
| Finance | Invoice | CREATE | ✅ Yes | |
| Finance | Invoice | EDIT | ✅ Yes | |
| Finance | Invoice | DELETE | ✅ Yes | |
| Finance | Invoice | APPROVE | ✅ Yes | |
| Finance | Invoice | EXPORT | ✅ Yes | The only Finance resource with an `EXPORT` action today. |
| Finance | Expense | VIEW | ✅ Yes | |
| Finance | Expense | CREATE | ✅ Yes | |
| Finance | Expense | EDIT | ✅ Yes | |
| Finance | Expense | DELETE | ✅ Yes | |
| Finance | Expense | APPROVE | ✅ Yes | |
| Finance | Expense | IMPORT | ❌ **Catalogue Gap** | No `IMPORT` action defined for `Finance/Expense`. The brief's "Expense import" suggestion has no home in the catalogue yet. |
| Finance | Payment | VIEW | ✅ Yes | |
| Finance | Payment | CREATE | ✅ Yes | |
| Finance | Payment | APPROVE | ✅ Yes | |
| Finance | Payment | EDIT | ❌ **Catalogue Gap** | Confirmed gap, also documented in `RBAC_MIGRATION_TRACKER.md` §8. No `Finance/Payment/EDIT` exists. |
| Finance | Advance | VIEW | ✅ Yes | |
| Finance | Advance | CREATE | ✅ Yes | |
| Finance | Advance | APPROVE | ✅ Yes | |
| Finance | Advance | EDIT | ❌ **Catalogue Gap** | Confirmed gap, also documented in `RBAC_MIGRATION_TRACKER.md` §8. No `Finance/Advance/EDIT` exists — relevant to the planned "Settle" action (§5). |
| Finance | Voucher | (any action) | ❌ **Catalogue Gap** | **`Finance/Voucher` does not exist as a resource at all.** Voucher administration today is covered only by `Settings/Finance` (the Step 2F admin-config route — voucher *number-format config*, not voucher *creation*). Confirmed independently in `RBAC_MIGRATION_TRACKER.md` §8. This is the single largest gap blocking a clean Voucher-API mapping in §5. |
| Finance | BankBook | (any action) | ❌ **Catalogue Gap** | No `BankBook` resource exists under any module. Closest existing fit is `Finance/Payment` (VIEW/CREATE/APPROVE) — see §5's reasoning. |
| Finance | CashBook | (any action) | ❌ **Catalogue Gap** | No `CashBook` resource exists under any module. Same closest-fit reasoning as BankBook. |
| Finance | Conveyance | (any action) | ❌ **Catalogue Gap** | No dedicated `Conveyance` resource exists under `Finance` (or anywhere). Closest existing fit is `Finance/Expense` (conveyance is travel-expense reimbursement) — see §5. |
| Finance | Reconciliation | (any action) | ❌ **Catalogue Gap** | No `Reconciliation` resource exists. Closest existing fit is `Finance/Payment/APPROVE` for the act of marking a ledger entry reconciled — see §5. |
| Finance | Report | (any action) | ❌ **Catalogue Gap** under `Finance` | A `Reports` *module* exists (`Reports/Dashboard`, `Reports/Analytics`, both VIEW/EXPORT) but there is no `Finance`-module `Report` resource. Finance Reports/Tally-export, per `IMPLEMENTATION_STATUS_REPORT.md` §3, are zero-code today (static placeholder) and outside this plan's planned-API list in §4 — flagged here only because the brief named `Report` as an expected resource. |
| Finance | Collection | (any action) | ❌ **Catalogue Gap** | No `Finance/Collection` resource exists. (Note: a `Collection` Prisma model and `/api/collections` route already exist and are CRM/Pipeline-scoped under `roles.ts`, not `access-control` — out of scope for Finance write APIs and not part of §4's planned list.) |
| Workflow | ApprovalRequest | VIEW, APPROVE | ✅ Yes | Used for Finance approval actions per §7 — the resource is named `ApprovalRequest`, not `Approval`. |
| Settings | Finance | VIEW, EDIT | ✅ Yes | Already used by the 7 Finance-*admin*-config routes (Step 2F) — governs policy/threshold/category configuration, not Finance transaction writes. Not reused for the write APIs in §4 (would conflate "can configure Finance policy" with "can create an expense"). |

**Summary:** `Finance/Invoice`, `Finance/Expense`, `Finance/Payment`, `Finance/Advance` are real
and usable today (with the two `EDIT` gaps noted). `Finance/Voucher`, a dedicated
`BankBook`/`CashBook`/`Conveyance`/`Reconciliation` resource, and `Finance/Expense/IMPORT` do
**not** exist and are not invented here — §5 maps each planned API to the closest existing
permission where reasonable, and flags the resource as a true gap (§12) where no reasonable
closest-fit exists.

---

## 4. Planned Finance Write APIs

| Planned API | Method | Purpose | Required Permission | Object-Level Rule | Scope Rule | Notes |
| ----------- | ------ | ------- | -------------------- | ------------------ | ---------- | ----- |
| **Expense APIs** | | | | | | |
| `POST /api/finance/expenses` | POST | Create expense (Finance-register path, distinct from existing mobile `POST /api/expenses`) | Self: none beyond session (own record) — see §6. Cross-employee create: `Finance/Expense/CREATE` | `employeeId` on the body must equal `session.user.employeeId` unless the actor holds `Finance/Expense/CREATE` | OWN by default; `Finance` module scope (BRANCH/DEPARTMENT) once `DataAccessPolicy` rows exist — see §9 Schema Gap | |
| `PATCH /api/finance/expenses/[id]` | PATCH | Edit a draft expense's fields | Owner editing own draft: none beyond session + object check. Finance user editing another's record: `Finance/Expense/EDIT` | Owner can edit only while `status = "draft"`; Finance user needs `EDIT` regardless of status, but see §8 (no edit after submission unless returned) | OWN (owner) / scope-checked (Finance user) | |
| `DELETE /api/finance/expenses/[id]` | DELETE | Delete a draft expense | `Finance/Expense/DELETE` for any record; owner deleting own draft — see §8 (allow only while `draft`, no `access-control` grant required, same shape as edit) | Must still be `draft` (no posted/approved/paid expense can be deleted — would corrupt audit trail per `IMPLEMENTATION_STATUS_REPORT.md` §7 "no soft delete anywhere") | OWN / scope-checked | |
| `POST /api/finance/expenses/[id]/submit` | POST | Move draft → submitted, start approval workflow | Owner submitting own expense: none beyond session + object check | Must be the owner; must be `draft` | OWN | Calls `startApproval()` — must NOT implement separate approval logic per §7. |
| `POST /api/finance/expenses/[id]/approve` | POST | Approve a submitted expense | `Workflow/ApprovalRequest/APPROVE` (via the global Approval Engine action endpoint, not a bespoke Finance check) | Object-level check belongs to `assertCanActOnApprovalRequest()` (Step 2A), not a new Finance-specific check | N/A (Approval Engine scope) | **Per §7, this should proxy to/reuse `POST /api/approvals/[id]/action`, not be a standalone endpoint with its own authorization logic.** |
| `POST /api/finance/expenses/[id]/reject` | POST | Reject a submitted expense | Same as approve | Same as approve | N/A | Same as approve. |
| `POST /api/finance/expenses/[id]/mark-paid` | POST | Record an approved expense as paid + post Ledger debit | `Finance/Payment/CREATE` | Must be `status = "approved"`; actor must additionally satisfy whatever scope rule governs the `finAccountId` being debited (see §9) | scope-checked (BRANCH once schema/scope exists) | This is a Ledger-posting action (`FINANCE_API_WIRING_PLAN.md` §6 "Expense Payment"), not a pure Expense-resource action — hence `Finance/Payment/CREATE`, not `Finance/Expense/APPROVE`. |
| `POST /api/finance/expenses/import` | POST | Bulk import expenses | `Finance/Expense/CREATE` — see §12 (**Catalogue Gap**: no dedicated `IMPORT` action on `Finance/Expense`) | Each imported row's `employeeId` must be validated the same as a single create (§6 object-level rule) | OWN per row / scope-checked in bulk | |
| **Bank Book APIs** | | | | | | |
| `POST /api/finance/bank-book` | POST | Create a bank ledger entry | `Finance/Payment/CREATE` — see §12 (**Catalogue Gap**: no dedicated `BankBook` resource) | `accountId` must resolve to an active `FinAccount` of `type = "bank"` | scope-checked once branch scope exists on `FinAccount`/`Ledger` (§9 Schema Gap — currently none) | |
| `PATCH /api/finance/bank-book/[id]` | PATCH | Edit a bank ledger entry | `Finance/Payment/EDIT` — see §12 (**Catalogue Gap**: `Finance/Payment` has no `EDIT` action at all, see §3) | Must not be `reconciled = true` (editing a reconciled entry would corrupt the reconciliation) | scope-checked | |
| `POST /api/finance/bank-book/import` | POST | Bulk import bank statement | `Finance/Payment/CREATE` (closest fit; see §12 for the missing `IMPORT` action) | Each imported row validated as a normal entry create | scope-checked | `xlsx@0.18.5` HIGH-severity advisory applies — treat imported files as untrusted per `SECURITY_MODEL.md` "Known security notes." |
| `POST /api/finance/bank-book/reconcile` | POST | Bulk-mark a batch of entries reconciled | `Finance/Payment/APPROVE` — see §12 (**Catalogue Gap**: no dedicated `Reconciliation` resource) | Each entry in the batch must belong to the `accountId` the actor is scoped to | scope-checked | |
| `POST /api/finance/bank-book/[id]/mark-reconciled` | POST | Mark a single entry reconciled | `Finance/Payment/APPROVE` | Same object-level rule as above, single record | scope-checked | |
| **Cash Book APIs** | | | | | | |
| `POST /api/finance/cash-book` | POST | Create a cash ledger entry | `Finance/Payment/CREATE` | `accountId` must resolve to an active `FinAccount` of `type = "cash"` | scope-checked once schema supports it | |
| `PATCH /api/finance/cash-book/[id]` | PATCH | Edit a cash ledger entry | `Finance/Payment/EDIT` (Catalogue Gap, see Bank Book row) | Must not be `reconciled = true` | scope-checked | |
| `POST /api/finance/cash-book/transfer-from-bank` | POST | Bank → Cash transfer (paired Ledger entries) | `Finance/Payment/CREATE` | Both `accountId`s (source bank, destination cash) must resolve to active accounts; both legs created in one `prisma.$transaction` per `FINANCE_API_WIRING_PLAN.md` §6 | scope-checked on both accounts | Retires `transferStore.ts` in-memory mock per the wiring plan. |
| `POST /api/finance/cash-book/deposit-to-bank` | POST | Cash → Bank transfer | `Finance/Payment/CREATE` | Same paired-transaction rule as above, reversed direction | scope-checked on both accounts | |
| `POST /api/finance/cash-book/adjustment` | POST | Cash adjustment (shortage/overage correction) | `Finance/Payment/CREATE` for amounts under the approval threshold; routes to approval above threshold per `FINANCE_API_WIRING_PLAN.md` §5 "Cash Adjustment Approval" | `accountId` must be `type = "cash"`; threshold check against `ApprovalRule`/`AdvancePolicy`-style config (see §7 — must not duplicate approval logic) | scope-checked | |
| `POST /api/finance/cash-book/[id]/reconcile` | POST | Mark a cash entry reconciled | `Finance/Payment/APPROVE` | Entry must belong to a `type = "cash"` account in the actor's scope | scope-checked | |
| **Advance APIs** | | | | | | |
| `POST /api/finance/advances` | POST | **Already implemented** (see §2) — listed here only for completeness, not a new build item | Self-service: none beyond session (own record) | `employeeId` must equal session unless actor holds `Finance/Advance/CREATE` for cross-employee creation | OWN | No change recommended to the existing implementation by this plan. |
| `POST /api/finance/advances/[id]/submit` | POST | Move pending → submitted-for-approval | Owner submitting own: none beyond session + object check | Must be the owner; must be `pending` | OWN | |
| `POST /api/finance/advances/[id]/approve` | POST | Approve advance request | `Workflow/ApprovalRequest/APPROVE` via global Approval Engine | `assertCanActOnApprovalRequest()` (Step 2A) | N/A | Proxy to global engine per §7, same as Expense approve. |
| `POST /api/finance/advances/[id]/reject` | POST | Reject advance request | Same as approve | Same as approve | N/A | |
| `POST /api/finance/advances/[id]/disburse` | POST | Disburse approved advance, post Ledger debit | `Finance/Payment/CREATE` — see §5 "Disburse" reasoning (closest fit; `Finance/Advance` has no action representing "release funds") | Must be `status = "approved"`; `disbursedFromId` account must be in actor's scope | scope-checked | Posts paired `Ledger`/`FinAccount.currentBalance` update per `FINANCE_API_WIRING_PLAN.md` §6 "Employee Advance Disbursement" — must be inside one `$transaction`. |
| `POST /api/finance/advances/[id]/settle` | POST | Settle advance (return surplus or clear against expense) | `Finance/Advance/EDIT` — see §12 (**Catalogue Gap**: no `EDIT` action exists for `Finance/Advance`; fallback recommendation is `Finance/Payment/CREATE`, since settlement may post a Ledger credit for returned cash) | Must be `status = "disbursed"` | scope-checked | |
| **Claims APIs** | | | | | | |
| `POST /api/finance/claims` | POST | Create a travel/expense claim (note: per `FINANCE_API_WIRING_PLAN.md` §1, "New Claim" is intentionally **mobile-only** today, reusing `Expense`/`TravelClaim` models — there is no dedicated `EmployeeClaim` model) | Self: none beyond session (own record) | Same shape as Expense create (§6) | OWN | Mapped to `Finance/Expense/CREATE` (or `Finance/Advance/CREATE`/`TravelClaim` path depending on claim type) per §5 "Claims: map to Expense permissions if no Claim-specific resource exists" — no `Finance/Claim` resource exists in the catalogue. |
| `PATCH /api/finance/claims/[id]` | PATCH | Edit a claim | Owner editing own draft: none beyond session + object check. Finance editing another's: `Finance/Expense/EDIT` | Same as Expense edit object-level rule | OWN / scope-checked | |
| `POST /api/finance/claims/[id]/approve` | POST | Approve a claim | `Workflow/ApprovalRequest/APPROVE` via global engine | `assertCanActOnApprovalRequest()` | N/A | Proxy to global engine per §7. |
| `POST /api/finance/claims/[id]/reject` | POST | Reject a claim | Same as approve | Same as approve | N/A | |
| `POST /api/finance/claims/[id]/mark-paid` | POST | Mark claim paid + post Ledger debit | `Finance/Payment/CREATE` | Must be `status = "approved"` | scope-checked | |
| **Conveyance APIs** | | | | | | |
| `POST /api/finance/conveyance/trips` | POST | Log a travel/conveyance trip | Self: none beyond session (own record) | `employeeId` must equal session unless actor holds the Finance-operations equivalent (see §5 "Conveyance") | OWN | |
| `PATCH /api/finance/conveyance/trips/[id]` | PATCH | Edit a trip | Owner editing own draft: none beyond session + object check. Finance editing another's: `Finance/Expense/EDIT` (closest fit, see §3 gap) | Must be `draft` for owner edits | OWN / scope-checked | |
| `POST /api/finance/conveyance/trips/[id]/submit` | POST | Submit trip for approval | Owner submitting own: none beyond session + object check | Must be the owner; must be `draft` | OWN | |
| `POST /api/finance/conveyance/trips/[id]/approve` | POST | Approve a trip | `Workflow/ApprovalRequest/APPROVE` via global engine | `assertCanActOnApprovalRequest()` | N/A | Proxy to global engine per §7. |
| `POST /api/finance/conveyance/trips/[id]/reject` | POST | Reject a trip | Same as approve | Same as approve | N/A | |
| `POST /api/finance/conveyance/monthly-settlement` | POST | Batch-settle a month's approved trips into one voucher | `Finance/Payment/CREATE` | All trips in the batch must be `status = "approved"` and belong to the same `employeeId` + month | scope-checked | Per `FINANCE_API_WIRING_PLAN.md` §5 "Local Conveyance Monthly Approval" — the settlement itself (not individual trips) should also route through `startApproval({ entityType: "CONVEYANCE_SETTLEMENT" })`; see §7. |
| `POST /api/finance/conveyance/distance-calc` | POST | Server-side Haversine distance calculation utility | None beyond session — pure calculation, no record mutation | N/A | N/A | Stateless utility endpoint; no `access-control` check needed (same class as "self-scoped, no admin function" carve-out in `RBAC_MIGRATION_TRACKER.md` §5) — document this explicitly in the route's own comment per that rule. |
| **Voucher APIs** | | | | | | |
| `POST /api/finance/vouchers` | POST | Create a voucher (atomic `VoucherSequence` increment + paired Ledger entries) | `Finance/Payment/CREATE` — see §12 (**Catalogue Gap**: no `Finance/Voucher` resource exists at all) | Must resolve the correct `VoucherSequence` row inside the same `$transaction` as the increment (per `FINANCE_API_WIRING_PLAN.md` §6 "Voucher Creation") — concurrency-sensitive, not just a permission check | scope-checked | **Before this ships, the dual voucher-numbering mechanism (`VoucherSequence` vs `VoucherConfiguration.generateVoucherNumber()`) must be reconciled per `IMPLEMENTATION_STATUS_REPORT.md` §5/§7 — this plan does not resolve that, it only notes it is a blocking prerequisite, consistent with the existing build-sequence docs.** |
| `POST /api/finance/vouchers/[id]/cancel` | POST | Cancel (void) a voucher | `Finance/Payment/CREATE` is the closest existing-action fit for "void with downstream Ledger effect"; a dedicated cancel permission does not exist — see §12 | Must not already be `voided`; per `FINANCE_API_WIRING_PLAN.md` "posted vouchers may require reversal instead of delete" (§8) | scope-checked | A literal `Finance/Voucher/DELETE` was suggested by the brief but **does not exist** (§3) — do not invent it; flagged as Catalogue Gap in §12. |
| `GET /api/finance/vouchers/[id]/pdf` | GET | Render/download voucher PDF | `Finance/Payment/VIEW` — read-only, no mutation | Must be the same scope as the voucher's underlying Ledger/account | scope-checked | |
| `POST /api/finance/vouchers/[id]/generate-pdf` | POST | Generate and persist a voucher PDF (writes `Voucher.pdfUrl`) | `Finance/Payment/CREATE` (it mutates `pdfUrl`, so VIEW alone is insufficient — see §5 "PDF generation... depending on whether it mutates") | Voucher must exist and not be `voided` | scope-checked | |
| `POST /api/finance/vouchers/tally-export` | POST | Export voucher batch to Tally XML | `Finance/Invoice/EXPORT` is the closest existing `EXPORT`-action fit (the only Finance resource with an `EXPORT` action) — see §12 for the more precise `Finance/Voucher/EXPORT` gap | Export set must be scope-filtered (no exporting another branch's vouchers without ALL-equivalent scope) | scope-checked | No exporter library exists yet per `IMPLEMENTATION_STATUS_REPORT.md` §3 ("Tally Export... no package dependency exists yet") — this row documents the permission mapping only, not a readiness claim. |
| **Reconciliation APIs** | | | | | | |
| `POST /api/finance/reconciliation` | POST | Submit a reconciliation batch for review | `Finance/Payment/CREATE` — see §12 (**Catalogue Gap**: no `Reconciliation` resource) | Batch must be scoped to the actor's own account(s) | scope-checked | No dedicated reconciliation route exists in the current Bank Book/Cash Book wiring plan (§2) — it is implied by the brief, not by `FINANCE_API_WIRING_PLAN.md`'s own endpoint list, which instead folds reconciliation into the Bank/Cash Book `mark-reconciled` actions above. Documented here for completeness; recommend folding into Bank/Cash Book reconcile endpoints rather than building a parallel surface, to avoid the exact "two systems for one concern" pattern §7 warns against. |
| `POST /api/finance/reconciliation/[id]/approve` | POST | Approve a reconciliation batch | `Finance/Payment/APPROVE` | Object-level: batch creator ≠ approver recommended (segregation of duties), not currently enforceable by any existing helper — see §8 | scope-checked | |
| `POST /api/finance/reconciliation/[id]/reject` | POST | Reject a reconciliation batch | Same as approve | Same as approve | N/A | |

---

## 5. Suggested Permission Mapping

Final mapping, cross-checked against `permissions.ts` line-by-line (§3) — no name invented:

**Expense:**
- View: `Finance / Expense / VIEW` ✅
- Create: `Finance / Expense / CREATE` ✅ (self-service create needs no grant at all — see §6)
- Edit: `Finance / Expense / EDIT` ✅
- Delete: `Finance / Expense / DELETE` ✅
- Approve/Reject: routed through `Workflow / ApprovalRequest / APPROVE` via the global engine, **not** `Finance/Expense/APPROVE` directly at the route level — see §7. (`Finance/Expense/APPROVE` itself does exist in the catalogue and may still be the permission a `Role` is granted to determine *eligibility to approve*, but the actual route-level check should be the Step 2A object-level authorization, not a bare module/resource/action check, because "is this expense's amount within my approval limit and am I a valid approver for its current workflow step" cannot be expressed as a flat permission.)
- Mark Paid: `Finance / Payment / CREATE` (this is a Ledger-posting action, not an Expense-resource action — `Finance/Payment/APPROVE` was considered but `CREATE` better matches "this action creates a new Ledger entry," consistent with how Bank/Cash entry creation is mapped below)
- Import: **Catalogue Gap** — no `IMPORT` action exists for `Finance/Expense` (confirmed in §3). Recommend `Finance/Expense/CREATE` as the interim mapping (each imported row is functionally a create), with the gap tracked in §12 for a future `IMPORT` action addition, mirroring the precedent already set by `Masters/CustomerMaster/IMPORT`.

**Advance:**
- View: `Finance / Advance / VIEW` ✅
- Create: `Finance / Advance / CREATE` ✅ (self-service create needs no grant — already true of the existing `POST /api/finance/advances`, see §2)
- Edit: **Catalogue Gap** — no `EDIT` action exists for `Finance/Advance` (confirmed in §3, also documented pre-existing in `RBAC_MIGRATION_TRACKER.md` §8).
- Approve/Reject: `Workflow / ApprovalRequest / APPROVE` via global engine — same reasoning as Expense above.
- Disburse: `Finance / Payment / CREATE` (the brief's own suggested logic offers "Payment/CREATE or Advance/APPROVE" — `Payment/CREATE` is chosen because disbursement's primary effect is a new Ledger debit, the same action class as Bank/Cash entry creation, not an advance-approval action; `Advance/APPROVE` is already consumed by the approval step itself and reusing it for disbursement would conflate "approved this advance" with "released the funds," two genuinely separate authorities in a real Accounts workflow).
- Settle: **Catalogue Gap** for `Finance/Advance/EDIT` — recommend `Finance/Payment/CREATE` as the interim mapping (settlement frequently posts a Ledger credit for returned cash) per the brief's own fallback suggestion ("Settle: Finance / Advance / EDIT or Finance / Payment / EDIT" — since `Finance/Payment/EDIT` is *also* a confirmed gap, per §3, neither half of that fallback exists; `Payment/CREATE` is the nearest real action that fits the Ledger-posting nature of settlement).

**Payment / Bank / Cash:**
- View: `Finance / Payment / VIEW` ✅
- Create bank/cash entry: `Finance / Payment / CREATE` ✅
- Edit bank/cash entry: **Catalogue Gap** — `Finance/Payment` has no `EDIT` action (confirmed in §3 and in `RBAC_MIGRATION_TRACKER.md` §8). Recommend documenting this gap rather than substituting a different action's semantics; the build-sequence note in §11 places Bank/Cash entry edit endpoints late enough that the gap can be closed in the catalogue before they're built (§12).
- Reconcile: **Catalogue Gap** — recommend `Finance / Payment / APPROVE` as the closest existing fit (marking a financial record reconciled is conceptually closer to an approval/sign-off action than a create or edit), with a dedicated `Reconciliation` resource flagged in §12 as the cleaner long-term fix.

**Voucher:**
- View: **Catalogue Gap** for `Finance/Voucher` entirely (confirmed §3) — existing `GET /api/finance/vouchers*` routes use `canManageFinance()` (roles.ts) today and this plan does not change that (read-API migration is Step 2M, out of scope). For the *new write* endpoints' implicit VIEW-equivalent checks (e.g. the PDF GET route in §4), recommend `Finance/Payment/VIEW` as the closest fit.
- Create: **Catalogue Gap** — recommend `Finance/Payment/CREATE` (voucher creation always accompanies a Ledger posting in this schema's design, per `FINANCE_API_WIRING_PLAN.md` §6).
- Cancel/Delete: **Catalogue Gap** — the brief's suggested `Finance/Voucher/DELETE` does not exist. Recommend `Finance/Payment/CREATE` as the interim mapping for "cancel" specifically (it is implemented as a reversal/void action with a new Ledger effect, not a hard delete — `IMPLEMENTATION_STATUS_REPORT.md` §7 confirms no soft-delete exists anywhere, reinforcing that a true DELETE semantic should not be invented for vouchers regardless of catalogue state).
- Approve: **Catalogue Gap** — no voucher-specific approve action exists; if voucher creation itself needs an approval gate (not yet decided per `FINANCE_API_WIRING_PLAN.md` §5 "Voucher Creation" — vouchers are described as created directly, not routed through `startApproval()`), it should route through `Workflow/ApprovalRequest/APPROVE`, consistent with every other Finance approval in this plan.
- PDF generation: `Finance/Payment/VIEW` for the read-only `GET .../pdf` route; `Finance/Payment/CREATE` for `POST .../generate-pdf` since it mutates `pdfUrl` — see §4 row-level reasoning ("depending on whether it mutates").
- Tally export: **Catalogue Gap** — the brief's suggested `Finance/Voucher/EXPORT` does not exist (no `Finance/Voucher` resource at all, §3). The closest existing `EXPORT`-action permission anywhere in `Finance` is `Finance/Invoice/EXPORT`; recommended as the interim mapping, with a proper `Finance/Voucher/EXPORT` (or broader `Finance/Report/EXPORT`) flagged in §12.

**Conveyance:**
- View: `Finance / Expense / VIEW` (conveyance is travel-expense reimbursement on the `TravelClaim` model, which has no dedicated `Conveyance` resource in the catalogue — confirmed §3, mirroring the brief's own fallback "Finance/Expense/VIEW or Finance/Conveyance/VIEW if exists" with the second option resolving to a Catalogue Gap).
- Create trip: self-service, no grant required (same shape as Expense create, §6); a Finance user creating a trip *for* another employee would need `Finance/Expense/CREATE` under the same fallback reasoning.
- Approve: `Workflow / ApprovalRequest / APPROVE` via global engine, same as every other Finance approval in this plan — not a bare `Finance/Expense/APPROVE` route-level check, for the same object-level reasoning given for Expense approve above.
- Settlement: `Finance / Payment / CREATE` (monthly settlement posts a Ledger debit and a Voucher, per `FINANCE_API_WIRING_PLAN.md` §5 — the brief's own fallback "Payment/CREATE or Expense/APPROVE" resolves to `Payment/CREATE` for the same reason Disburse and Mark Paid do above: it is a Ledger-posting action, not an approval action).

**Claims:**
- Mapped entirely to Expense permissions per the brief's own instruction ("Map to Expense permissions if no Claim-specific resource exists") — confirmed no `Finance/Claim` resource exists in the catalogue (§3), and confirmed by `FINANCE_API_WIRING_PLAN.md` §1 that no dedicated `EmployeeClaim` model even exists at the schema level (claims reuse `Expense`/`TravelClaim`).

---

## 6. Self-Service vs Finance Operations Rules

### Self-Service Employee Actions

Examples: employee creates own expense, own advance request, own claim, own conveyance trip.

Required authorization:
- Valid session (`getSession()`, 401 if absent — standard across the codebase per
  `SECURITY_MODEL.md` "API security").
- Actor must be the same employee as the record owner (`employeeId === session.user.employeeId`),
  **or** have the `access-control` `CREATE` permission for that resource (a Finance Operations
  user creating a record on another employee's behalf — e.g. Accounts entering a paper expense
  claim for someone without app access).

Object-level rule:
- An employee cannot create or update records for another employee unless they hold the Finance
  Operations permission for that action. This is the exact same shape as the existing
  `POST /api/finance/advances` self-service create (§2) — it is the *correct, already-proven*
  pattern in this codebase, not a new invention. It also matches `roles.ts`'s existing
  ownership-equality pattern (`assignedToId === employeeId`) used throughout Pipeline/KRA/Daily
  Updates per `RBAC_AUDIT_REPORT.md` §11 — this plan is recommending the *same shape*, re-expressed
  through `access-control` rather than `roles.ts`, for new Finance write routes specifically.

### Finance Operations Actions

Examples: Accounts creates an expense for another employee, edits a posted finance record, marks
paid, disburses an advance, reconciles a bank/cash entry.

Required authorization:
- `access-control` permission via `requirePermission()` — the mapped permission from §5 for the
  specific action.
- Branch/company scope check where applicable via `canAccessScope()` — **see §9 for the Schema
  Gap that currently blocks this for every Finance transaction model** (no `branchId`/
  `departmentId` column exists on `FinAccount`, `Ledger`, `Expense`, `EmployeeAdvance`,
  `TravelClaim`, or `Voucher` — only `FinAccount.branchName`, a free-text field with no FK).
  Until that schema gap is closed, `canAccessScope()` will fall back to its documented "no
  `branchId`/`departmentId` on the record → allow" behavior (`policy.ts:92,101` — "no branch/
  department constraint on record" returns `true`), meaning BRANCH/DEPARTMENT-scoped
  `DataAccessPolicy` rows configured for the `Finance` module would currently have **no
  restrictive effect** on these write APIs even if added. This is a real limitation to flag before
  building, not something this plan can route around — see §9 for the explicit Schema Gap entry
  and §13 for the resulting risk if unaddressed.
- Object-level check for branch, employee, customer, or account scope — i.e. even where
  `DataAccessPolicy` doesn't yet apply (per the gap above), every write handler must still verify
  the specific record it's mutating exists and matches the request (e.g. `accountId` resolves to
  an active `FinAccount`, `employeeId` resolves to a real `Employee`) before performing the
  mutation — this is ordinary defensive coding, not a scope-policy substitute.

---

## 7. Approval Integration Rules

- **Finance approval decisions must go through the Global Approval Engine** —
  `src/lib/workflow-engine/` (`startApproval`, `approveRequest`, `rejectRequest`, etc.) and its
  single action endpoint `POST /api/approvals/[id]/action`. This is already the established
  pattern: `POST /api/expenses` (mobile) calls `startApproval({ workflowId, entityType: "EXPENSE",
  ... })` today, and `FINANCE_API_WIRING_PLAN.md` §5 explicitly states the rule for every other
  Finance entity ("Finance must **not** implement separate approval logic").
- **Finance APIs must not create duplicate approval logic.** The `ApprovalRule` model (Finance
  Phase 1) is a threshold-configuration helper only — `FINANCE_API_WIRING_PLAN.md` §2/§7 flags the
  `ApprovalRule` vs `WorkflowDefinition` dual-system overlap as an open, **must-fix-before-coding**
  risk that this plan does not resolve (it is a prerequisite decision for whoever builds the
  Expense/Advance/Conveyance write APIs, not a permission-mapping question this document can
  settle on its own).
- **Submit actions may start workflow** — e.g. `POST /api/finance/expenses/[id]/submit` calling
  `startApproval()`. These need no `access-control` grant beyond the self-service object-level
  check in §6, because submitting your own draft is not an admin action.
- **Approve/reject actions should use the global approval action endpoint or workflow-engine
  service functions directly** — per §4/§5, every planned `.../approve` and `.../reject` row in
  this plan maps to `Workflow/ApprovalRequest/APPROVE` and routes through
  `assertCanActOnApprovalRequest()` (Step 2A), not a bespoke per-entity Finance approval check.
  Concretely: a Finance-specific `.../[id]/approve` route, if built as a thin endpoint at all,
  should call the same `approveRequest()` function the global engine uses (passing the correct
  `entityType`), rather than re-implementing eligibility logic.
- **Direct approve/reject Finance endpoints should be avoided where the global approval endpoint
  already covers the use case.** Per `FINANCE_API_WIRING_PLAN.md` §5's explicit "Wiring Rule" for
  Finance Approvals: the page-level pattern is already correctly built as "filtered view of the
  global inbox, same action endpoint" — any future entity-specific Finance approve/reject route
  in §4 (Expense, Advance, Claims, Conveyance) should follow that same shape, not introduce a
  second authorization surface for the same decision.
- **Important: the Step 2A object-level authorization
  (`assertCanActOnApprovalRequest()` in `src/lib/workflow-engine/authorization.ts`) must remain
  the actual enforcement layer for every approve/reject/return/delegate/cancel action**, regardless
  of which Finance entity triggered it. No permission mapping in §5 substitutes for this — a role
  granted `Workflow/ApprovalRequest/APPROVE` is necessary but the Step 2A check (is this actor a
  current-step resolved approver or active delegate for *this specific request*) remains the real
  gate, exactly as `RBAC_AUDIT_REPORT.md` §10 item 1 already established for the existing
  endpoint. Building a new Finance-specific approval path that skips this check would silently
  reopen the Critical gap Step 2A closed.

---

## 8. Object-Level Authorization Rules

**Expense:**
- Employee can view/edit own record while `status = "draft"`.
- Employee cannot edit after submission (`status = "submitted"` or later) unless the workflow
  engine returns it to `draft` (a `RETURN` action per the global Approval Engine's existing
  action set, per `RBAC_AUDIT_REPORT.md` §8 — `ACTION` enum has no `RETURN`/`DELEGATE`/`CANCEL`
  members, confirming these are bespoke workflow-engine states, not `access-control` actions).
- Finance user can view/edit based on `Finance/Expense/VIEW`-or-`EDIT` plus the scope check from
  §6/§9 (currently a no-op for BRANCH/DEPARTMENT scope, per the Schema Gap).

**Advance:**
- Employee can view own advance (`employeeId === session.user.employeeId`) — same pattern as the
  existing `GET /api/finance/advances` own-data scoping (§2), unchanged by this plan.
- Disbursement only by a user holding `Finance/Payment/CREATE` (§5) — disbursement always touches
  a `FinAccount` balance, so this is also where the account-scope check from §9 would apply once
  the schema supports it.
- Settlement only by a user holding the §5-mapped settlement permission (`Finance/Payment/CREATE`,
  interim per the `Finance/Advance/EDIT` Catalogue Gap).

**Bank/Cash:**
- Only Finance/Accounts users holding the relevant `Finance/Payment` action (§5) — no self-service
  create exists for Bank/Cash entries (unlike Expense/Advance/Conveyance, there is no "employee's
  own bank/cash transaction" concept in this schema).
- Branch/account scope must match per §6/§9 — **currently unenforceable via `canAccessScope()`**
  because `FinAccount`/`Ledger` have no `branchId` FK (only free-text `branchName`); document this
  limitation in code comments on the eventual route, do not silently assume the scope check works.

**Voucher:**
- Only Finance users holding the §5-mapped permission (`Finance/Payment/CREATE`, interim per the
  `Finance/Voucher` Catalogue Gap).
- Cancellation requires the same interim permission (no dedicated cancel/`DELETE` permission
  exists, §5) — and per `FINANCE_API_WIRING_PLAN.md` §8, "posted vouchers may require reversal
  instead of delete," consistent with the project-wide no-soft-delete constraint
  (`IMPLEMENTATION_STATUS_REPORT.md` §7).
- Posted vouchers should not be hard-deleted through any endpoint in §4 — every voucher-mutating
  row in §4 is a status-transition (cancel/void) or an additive action (PDF, export), never a
  Prisma `delete()`.

**Conveyance:**
- Employee can create own trip (§6 self-service shape).
- Manager/Finance can approve based on the global workflow engine (§7) — not a bespoke
  Finance-conveyance approval check.
- Monthly settlement requires `Finance/Payment/CREATE` (§5) and, per `FINANCE_API_WIRING_PLAN.md`
  §5, should itself route through `startApproval({ entityType: "CONVEYANCE_SETTLEMENT" })` before
  the Ledger posting happens — i.e. the settlement-create permission and the settlement-approval
  step are two distinct authorization moments, not one.

**Claims:**
- Employee can view own claim (same OWN-scope shape as Expense/Advance/Conveyance).
- Finance can mark paid with `Finance/Payment/CREATE` (§5) — same mapping as Expense mark-paid,
  since claims have no dedicated model or resource (§3/§5).

**Reconciliation:**
- Segregation-of-duties note: ideally the employee who recorded a Bank/Cash entry should not also
  be the one who marks it reconciled or approves the reconciliation batch. **No existing helper in
  `access-control` enforces "actor A cannot approve their own prior action"** — `canAccessScope()`
  checks ownership/branch/team scope, not actor-history. This is flagged as a real gap for whoever
  builds the Reconciliation endpoints in §4 to design around explicitly (e.g. an inline `recordedById
  !== session.user.employeeId` check at the route level), not something this plan can map to a
  catalogue permission, because it isn't a permission question.

---

## 9. Scope Rules

| Finance Object | Scope Field | Example |
| --------------- | ----------- | ------- |
| Expense | `employeeId` (exists ✅) | `Expense.employeeId` — used for OWN-scope self-service filtering already (§2). |
| Expense | `branchId` | **Schema Gap** — no `branchId` column on `Expense`. BRANCH-scope `DataAccessPolicy` rows would have no record-level effect per `canAccessScope()`'s documented "no branch constraint on record → allow" fallback (`policy.ts:92`). |
| Advance | `employeeId` (exists ✅) | `EmployeeAdvance.employeeId`. |
| Advance | `branchId` | **Schema Gap** — same as Expense; no `branchId` column on `EmployeeAdvance`. |
| TravelClaim | `employeeId` (exists ✅) | `TravelClaim.employeeId`. |
| TravelClaim | `branchId` | **Schema Gap** — no `branchId` column on `TravelClaim`. |
| Voucher | `branchId` | **Schema Gap** — no `branchId` column on `Voucher`. Only `createdById` (Employee FK) exists, which is an *actor* field, not an owning-scope field — using it for OWN-scope filtering would conflate "who created this voucher" with "whose data this is," which are different questions for a voucher (a voucher can be created by Accounts on behalf of the whole branch). |
| Voucher | `accountId` | **Schema Gap as a direct FK** — `Voucher` itself has no `accountId`; the linked `Ledger` rows carry `accountId`, so any account-scope check on a voucher would need to traverse `Voucher.ledgerEntries[].accountId`, not a column on `Voucher` itself. |
| Bank/Cash Transaction (`Ledger`) | `accountId` (exists ✅) | `Ledger.accountId` → `FinAccount.id`. This is the only real, FK-backed scope field available today across all Finance transaction models. |
| Bank/Cash Transaction (`Ledger`) | `branchId` | **Schema Gap** — no `branchId` on `Ledger`. The only branch signal anywhere in the Finance schema is `FinAccount.branchName`, a **free-text** field with no `@relation`, confirmed by direct schema inspection (`prisma/schema.prisma` `FinAccount.branchName String @default("HO")`) and independently flagged in `IMPLEMENTATION_STATUS_REPORT.md` §7 ("Unenforced 'soft FKs'... `branchId`... bare `Int` with no `@relation`" — this case is even weaker, a bare `String`, not even an `Int`). |
| Payment / Vendor Payment | `customerId`/`vendorId`/`employeeId` | `Expense.vendorId` exists (✅, optional FK); no equivalent `customerId` FK exists on any Finance transaction model — `Expense.customerName` is a denormalized free-text field, same Schema Gap class as `FinAccount.branchName`. |
| FinAccount | `branchId` | **Schema Gap** — same `branchName` free-text issue as above; this is the root cause propagating into every dependent model (`Ledger.accountId` → `FinAccount`, which has no real branch FK to scope against). |

**Conclusion (do not build around this silently):** every Finance transaction model in the current
schema has, at most, an `employeeId` FK for OWN-scope filtering. **None** have a real `branchId`/
`departmentId` FK. `canAccessScope()`'s BRANCH/DEPARTMENT cases will currently always fall through
to "allow" for every Finance record, regardless of any `DataAccessPolicy` row an admin configures
through `/settings/identity`. This is a pre-existing schema limitation, not something introduced
by this plan — but per the task's "do not modify database schema" / "do not create migrations"
constraint, this document **documents** the gap (here and in §12) rather than proposing the actual
schema change. Closing it (adding `branchId` to the relevant Finance models) is a prerequisite for
any future Finance `DataAccessPolicy` BRANCH-scope rule to have real effect, and should be sized as
its own migration step before — or alongside — whichever write API in §11 first needs it.

---

## 10. API Guard Template

Standard Finance-Operations write-route pattern (mirrors the existing convention used by every
`access-control`-gated route in the codebase, e.g. `/api/admin/finance/voucher/route.ts`):

```ts
const session = await getSession();

if (!session?.user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const deny = await requirePermission(session, "Finance", "Expense", "CREATE");
if (deny) return deny;

// Object-level validation BEFORE any mutation — e.g. resolve the target
// record, confirm it exists, confirm its current status allows this action.
const expense = await prisma.expense.findUnique({ where: { id } });
if (!expense) {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
if (expense.status !== "draft") {
  return NextResponse.json({ error: "Conflict" }, { status: 409 });
}

// Perform the mutation only after both checks pass.
```

Self-service pattern — actor acting on their own record needs no `access-control` grant, only the
ownership check; a Finance-Operations actor acting on someone else's record needs the real grant:

```ts
const session = await getSession();
if (!session?.user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const employeeId = body.employeeId ?? session.user.employeeId;

if (employeeId !== session.user.employeeId) {
  const deny = await requirePermission(session, "Finance", "Expense", "CREATE");
  if (deny) return deny;
}

// Proceed with create — `employeeId` is now either the actor's own id, or a
// different employee's id explicitly authorized via the CREATE permission.
```

Both patterns return `401` for no session, `403` for forbidden (via `requirePermission()`'s own
`NextResponse`), and rely on object-level checks happening **after** the permission check but
**before** any Prisma write — matching the Route Migration Checklist already codified in
`RBAC_MIGRATION_TRACKER.md` §6.

---

## 11. Finance Write API Build Sequence

1. Expense create/update/delete API
2. Expense submit workflow
3. Expense mark-paid/payment posting
4. Voucher numbering reconciliation (resolve `VoucherSequence` vs `VoucherConfiguration` — blocking prerequisite per §4 Voucher APIs row, not a permission-mapping task)
5. Voucher create/cancel/PDF API
6. Bank/Cash entry APIs
7. Bank/Cash transfer APIs
8. Advance disburse/settle APIs
9. Conveyance trip logging and settlement APIs
10. Reconciliation and import APIs
11. Tally export APIs

This sequence matches the brief's requested order and is consistent with — though not identical
in granularity to — `IMPLEMENTATION_STATUS_REPORT.md` §8's independently-derived build sequence
(which additionally front-loads a Ledger Master screen, a Decimal-migration plan, and Financial
Year/Number-Series/Cost-Center master data before Step 4A's Expense CRUD). Whoever executes this
sequence should treat `IMPLEMENTATION_STATUS_REPORT.md` §7/§8's "Must fix before API coding" items
(Ledger Master UI, Financial Year setting, dual-approval-system decision, Demo-data banners) as
genuine prerequisites to step 1 above, not optional — they were flagged Critical/Must-fix by a
separate, independent audit pass, not invented for this document.

---

## 12. Catalogue Gaps To Fix Later

Confirmed gaps only — cross-checked against `permissions.ts` directly in §3, no permission
invented or assumed to exist:

- `Finance / Voucher` — **no resource exists at all** (no VIEW/CREATE/EDIT/DELETE/APPROVE/EXPORT).
  Highest-priority gap; blocks a clean mapping for every Voucher API in §4/§5.
- `Finance / Payment / EDIT` — no `EDIT` action exists for `Payment` (only VIEW/CREATE/APPROVE).
- `Finance / Advance / EDIT` — no `EDIT` action exists for `Advance` (only VIEW/CREATE/APPROVE).
  Blocks a clean mapping for the Advance Settle action.
- `Finance / Expense / IMPORT` — no `IMPORT` action exists for `Expense` (the catalogue does have
  `Masters/CustomerMaster/IMPORT` as a precedent for this action type, but it has not been
  extended to `Finance/Expense`).
- `Finance / BankBook` and `Finance / CashBook` (or one unified `Finance / Ledger`) — no dedicated
  resource exists for bank/cash *entries* as distinct from the generic `Payment` resource; all
  Bank/Cash Book write actions in §4/§5 currently fold into `Finance/Payment`, which works but
  conflates "manage a bank ledger entry" with "manage a generic payment."
- `Finance / Conveyance` — no dedicated resource exists; all Conveyance actions in §4/§5 fold into
  `Finance/Expense`, conflating travel reimbursement with general expense management.
- `Finance / Reconciliation` — no dedicated resource exists; reconciliation actions in §4/§5 fold
  into `Finance/Payment/APPROVE`, which is a reasonable interim fit but not a precise one.
- `Finance / Voucher / EXPORT` (or a broader `Finance / Report / EXPORT`) — no Tally-export-shaped
  permission exists; the interim mapping in §4/§5 (`Finance/Invoice/EXPORT`) is the closest
  existing `EXPORT` action but is semantically about invoices, not vouchers.

No permission was added to `PERMISSION_CATALOGUE` as part of this plan, per the task's explicit
"do not change access-control helper behavior" / "do not modify database schema" constraints —
these are documented gaps for a future catalogue-extension step (the natural sibling to Step 2L's
own `Settings/CRM` gap-closure recommendation in `RBAC_MIGRATION_TRACKER.md` §4), not changes made
here.

---

## 13. Risks If This Plan Is Not Followed

- **New Finance write APIs may be built on `roles.ts`** (`canManageFinance()`/`isManager`-only),
  exactly repeating the pattern Step 2F had to migrate seven Finance-admin-config routes away from
  — except this time on routes that move real money (Ledger postings, advance disbursement,
  voucher creation), making a later migration both higher-risk and higher-effort.
- **Accounts users may get blocked despite correct `access-control` grant** if a route is built
  checking `isManager`/`isAccounts()` instead of the mapped permission in §5 — inverting the usual
  risk direction (most `roles.ts`-only routes today are permissive by mistake; a brand-new route
  built carelessly on `roles.ts` could instead be *more* restrictive than the `access-control`
  grant a real Accounts role already holds, since `roles.ts` predicates don't know about
  `UserRole`/`RolePermission` data at all).
- **Employees may write records for others** if the self-service object-level check in §6 is
  skipped — e.g. a careless `POST /api/finance/expenses` that trusts a client-supplied
  `employeeId` without comparing it to `session.user.employeeId` first, recreating the exact class
  of bug already found and fixed in `PATCH /api/customers/master/[id]` (Step 2B) for a different
  resource.
- **Branch users may access other branch finance data** — though per §9, this risk is currently
  **structurally limited by the schema itself** (no `branchId` exists on Finance transaction
  models to leak across), the inverse risk is real: anyone configuring a BRANCH-scope
  `DataAccessPolicy` for the `Finance` module today would get a false sense of restriction, since
  `canAccessScope()` will allow through every record regardless (§9's "always falls through to
  allow" conclusion). Document this prominently in the eventual route code so nobody assumes
  branch isolation exists before the schema gap is closed.
- **Approval workflow may be bypassed** if a Finance write API implements its own inline
  approve/reject logic instead of calling into `src/lib/workflow-engine/` per §7 — this would
  silently reopen the exact Critical gap Step 2A fixed (`assertCanActOnApprovalRequest()`), this
  time scoped to whichever new Finance entity skipped it.
- **Payment/voucher actions may be performed without authority** if `Finance/Payment/CREATE`
  (or the interim mappings in §5 that fall back to it) is treated as optional rather than
  mandatory on every Ledger-posting endpoint — every money-movement action in §4 has at least one
  mapped permission in §5; skipping the check on any of them reopens the exact "Finance is
  read-only in practice today, for lack of any check at all" gap that
  `IMPLEMENTATION_STATUS_REPORT.md` §1/§5 flagged as the project's #4 ranked risk.

---

## 14. Final Recommendation

- **Do not build any Finance write API until this plan is accepted.** This document is the
  permission-mapping prerequisite the task brief asked for — it does not itself unblock
  implementation of any endpoint in §4.
- **Use `access-control` for all Finance write APIs** — every endpoint in §4 has either a real
  mapped permission (§5) or a documented Catalogue Gap with an interim recommendation (§5/§12);
  none should fall back to a bare `isManager`/`canManageFinance()` check.
- **Keep `roles.ts` only as a temporary bridge for existing read/self-service routes** — the
  current `GET /api/finance/*` surface (§2) and the existing `POST /api/finance/advances`
  self-service create are explicitly **not** rewritten by this plan; their eventual migration is
  Step 2M, a separate, larger effort requiring real `DataAccessPolicy` OWN-vs-ALL scope rules.
- **Use object-level checks for employee/branch/account ownership** per §6/§8 — and treat the §9
  Schema Gap (no `branchId`/`departmentId` on any Finance transaction model) as a known, documented
  limitation of branch/department-scope enforcement until a future schema change closes it; do not
  assume `DataAccessPolicy` BRANCH/DEPARTMENT rules have real effect on Finance data today.
- **Use the Global Approval Engine for approval decisions** — every `.../approve`/`.../reject` row
  in §4 routes through `Workflow/ApprovalRequest/APPROVE` and the Step 2A object-level check, never
  a bespoke per-entity Finance approval implementation, per §7.

> **Update (2026-06-21, Step 2M/2R) — Finance read API migration completed.** The `GET
> /api/finance/*` read surface this plan deliberately left untouched (§2, §14 above) has now been
> migrated to `access-control` permissions, using the exact closest-fit mappings this plan
> identified (`Finance/Payment/VIEW` for BankBook/CashBook/Accounts/Vouchers,
> `Settings/Finance/VIEW` as an additional accepted grant for Vouchers, `Finance/Expense/VIEW` for
> the Expense Register and Conveyance, `Finance/Advance/VIEW` for Advances), each with a temporary
> `canManageFinance()` fallback. See `docs/RBAC_MIGRATION_TRACKER.md` §11 for the full
> route-by-route detail and the new `src/lib/finance/access.ts` helper module. **This does not
> change anything in this document** — every catalogue gap, scope-rule limitation, and build
> sequence item above remains exactly as written. **Future Finance write APIs must still follow
> this plan and use `access-control` from day one** — the read-API migration did not add, remove,
> or alter any permission in `PERMISSION_CATALOGUE`, so every Catalogue Gap in §3/§12 is still
> open.

---

## 15. Finance Permission Catalogue Gap Closure (Step 2S, 2026-06-21)

The four highest-priority Catalogue Gaps from §3/§12 — `Finance/Voucher` (no resource at all),
and the missing dedicated `BankBook`/`CashBook`/`Conveyance` resources — have been **closed**.
`PERMISSION_CATALOGUE` (`src/lib/access-control/permissions.ts`) now defines:

| Resource | Actions added | Notes |
|---|---|---|
| `Finance/Voucher` | `VIEW`, `CREATE`, `EDIT`, `DELETE`, `APPROVE`, `EXPORT` | Closes the §3/§12 gap — previously did not exist as a resource at all. |
| `Finance/BankBook` | `VIEW`, `CREATE`, `EDIT`, `APPROVE`, `IMPORT`, `EXPORT` | `IMPORT` covers bank statement import; `APPROVE` covers reconciliation/adjustment sign-off. |
| `Finance/CashBook` | `VIEW`, `CREATE`, `EDIT`, `APPROVE`, `EXPORT` | No `IMPORT` action — no cash-statement-import use case exists. |
| `Finance/Conveyance` | `VIEW`, `CREATE`, `EDIT`, `APPROVE`, `EXPORT` | Closes the conflation flagged in §12 ("folds into `Finance/Expense`, conflating travel reimbursement with general expense management"). |

**`Finance/Reconciliation` was deliberately deferred, not added.** §4/§12 already recommended
folding reconciliation into the Bank/Cash Book `mark-reconciled`/`reconcile` actions rather than
building a parallel surface, to avoid "two systems for one concern." Consistent with that
recommendation, reconciliation approval now maps to `Finance/BankBook/APPROVE` /
`Finance/CashBook/APPROVE` (added above) instead of a dedicated `Reconciliation` resource. This
remains a documented future catalogue gap if a standalone Reconciliation workflow is ever built
that doesn't fit inside Bank/Cash Book.

**Updated permission mapping for §4/§5 (supersedes the interim mappings, where noted):**

| Planned API (§4) | §5 interim mapping | **Updated mapping (Step 2S)** |
|---|---|---|
| Voucher create | `Finance/Payment/CREATE` | **`Finance/Voucher/CREATE`** |
| Voucher cancel/void | `Finance/Payment/CREATE` | **`Finance/Voucher/DELETE`** |
| Voucher approve | `Workflow/ApprovalRequest/APPROVE` (unchanged — per §7, approval always routes through the global engine) | unchanged |
| Voucher PDF generate (mutates `pdfUrl`) | `Finance/Payment/CREATE` | **`Finance/Voucher/EDIT`** |
| Voucher PDF view (read-only) | `Finance/Payment/VIEW` | **`Finance/Voucher/VIEW`** |
| Voucher Tally export | `Finance/Invoice/EXPORT` (closest fit, semantically about invoices) | **`Finance/Voucher/EXPORT`** |
| Bank ledger entry create | `Finance/Payment/CREATE` | **`Finance/BankBook/CREATE`** |
| Bank ledger entry edit | Catalogue Gap (no `Finance/Payment/EDIT`) | **`Finance/BankBook/EDIT`** |
| Bank statement import | `Finance/Payment/CREATE` (no `IMPORT` action existed) | **`Finance/BankBook/IMPORT`** |
| Bank reconciliation approve | `Finance/Payment/APPROVE` (closest fit) | **`Finance/BankBook/APPROVE`** |
| Cash ledger entry create / transfer | `Finance/Payment/CREATE` | **`Finance/CashBook/CREATE`** |
| Cash ledger entry edit | Catalogue Gap | **`Finance/CashBook/EDIT`** |
| Cash adjustment approve / reconcile | `Finance/Payment/APPROVE` | **`Finance/CashBook/APPROVE`** |
| Conveyance trip create | self-service (unchanged) / `Finance/Expense/CREATE` for cross-employee | **self-service (unchanged) / `Finance/Conveyance/CREATE`** |
| Conveyance trip edit | `Finance/Expense/EDIT` (closest fit) | **`Finance/Conveyance/EDIT`** |
| Conveyance approve / monthly settlement | `Workflow/ApprovalRequest/APPROVE` (unchanged) / `Finance/Payment/CREATE` for the settlement-create step | `Workflow/ApprovalRequest/APPROVE` (unchanged) / **`Finance/Conveyance/APPROVE`** or `Finance/CashBook/CREATE` depending on whether the action is "approve the batch" vs. "post the resulting Ledger entry" |

**Mappings explicitly NOT changed by this step** (no catalogue resource added for these — still
open Catalogue Gaps, tracked in §12): `Finance/Payment/EDIT` does not exist (Bank/Cash entry edit
above is now covered by the new `BankBook`/`CashBook` `EDIT` actions instead, which supersedes the
need for a `Payment/EDIT` action specifically); `Finance/Advance/EDIT` does not exist (Advance
Settle still has no clean mapping — recommend `Finance/Payment/CREATE` as before); `Finance/
Expense/IMPORT` does not exist (Expense bulk import still maps to `Finance/Expense/CREATE`
per-row, as before).

**Permission sync / seed status:** `prisma/seed-admin-foundation.ts` iterates
`PERMISSION_CATALOGUE` directly and upserts every entry into the `Permission` table — the 22 new
rows above (corrected 2026-06-21, Step 2V, from an earlier "27" that did not reconcile with this
table) will be created automatically the next time that script runs (`npx tsx
prisma/seed-admin-foundation.ts`), no script change was required for that part. The script's
"Super Admin gets every permission" loop (queries all `Permission` rows after the upsert) will
also automatically grant Super Admin all 22 new permissions. **No other role (Business Head,
Sales Head, Sales Manager, Account Manager, Finance Manager) was granted any of the new
permissions** — `ROLE_GRANTS` was deliberately left unchanged, since extending a specific role's
grants is a product decision distinct from catalogue-gap closure, and the temporary
`canManageFinance()` bridge in every helper means no Finance-Operations user loses access in the
meantime. Granting `Finance Manager` (and possibly `Account Manager`) the new Voucher/BankBook/
CashBook/Conveyance permissions — matching the existing pattern where Finance Manager already
holds full `Invoice`/`Expense`/`Payment`/`Advance` access — is the recommended next step, either
by extending `ROLE_GRANTS` or via the Settings → Identity → Permission Matrix UI.

**`src/lib/finance/access.ts` updated** — `canViewFinanceBankBook()` and
`canViewFinanceCashBook()` (new) and `canViewFinanceVouchers()`/`canViewAllConveyance()` (updated)
now check their dedicated resource first, falling through to the prior closest-fit bridge
(`Finance/Payment/VIEW` or `Finance/Expense/VIEW`) and finally `canManageFinance()`. See
`docs/RBAC_MIGRATION_TRACKER.md` §11 for the full helper-to-route mapping.

---

## 16. Step 2U — Dev Database Sync (2026-06-21)

Dedicated Finance permissions described in §15 are now **materialized in the dev database**, not
just in the `PERMISSION_CATALOGUE` source file. `npx tsx prisma/seed-admin-foundation.ts` was run
against the dev DB (`u686730471_caveodev`); all 22 `Finance/{Voucher,BankBook,CashBook,Conveyance}`
rows were confirmed present via a read-only verification query, with zero duplicates and the 4
pre-existing Finance resources (`Invoice`/`Expense`/`Payment`/`Advance`) unchanged.

**Future Finance write APIs can now rely on these permission rows existing** — `requirePermission`/
`hasPermission` calls against `Finance/Voucher/*`, `Finance/BankBook/*`, `Finance/CashBook/*`, or
`Finance/Conveyance/*` will resolve against real `Permission` rows rather than a catalogue entry
with no corresponding database row.

**Curated role grants remain a separate step.** No business role (Finance Manager, Account
Manager, etc.) was granted any of the 22 new permissions this step — only the seed script's
pre-existing, unmodified Super-Admin-gets-all loop applies. Extending `Finance Manager`'s
`ROLE_GRANTS` (or granting via the Settings → Identity → Permission Matrix UI) remains the
recommended next step from §15, still not done.

**UI gap found, not fixed (out of scope this step):** the Permission Matrix UI
(`PermissionMatrix.tsx`) has a hardcoded `MODULE_GROUPS` constant whose `Finance` entry does not
yet list `Voucher`/`BankBook`/`CashBook`/`Conveyance`, so the new resources — though present in the
database and returned by the API — will not visually render in the matrix grid until that
component is updated. See `docs/RBAC_MIGRATION_TRACKER.md` §13 for full detail. **Closed
2026-06-21 (Step 2V) — see §17 below.**

---

## 17. Step 2V — Permission Matrix UI Updated (2026-06-21)

Dedicated Finance permissions are now **visible in the Permission Matrix UI**, closing the gap §16
flagged. `src/app/settings/identity/components/PermissionMatrix.tsx`'s `MODULE_GROUPS` Finance
entry was extended to include `Voucher`, `BankBook`, `CashBook`, `Conveyance` (appended after the
4 pre-existing resources, none renamed/removed/duplicated), and its `NOT_APPLICABLE` set was
extended with each new resource's missing actions (`Voucher`: no `IMPORT`/`ASSIGN`; `BankBook`: no
`DELETE`/`ASSIGN`; `CashBook`/`Conveyance`: no `DELETE`/`IMPORT`/`ASSIGN`) so the grid only offers
toggles for actions that actually exist in `PERMISSION_CATALOGUE`. No other file was changed — the
backing API (`GET /api/admin/identity/permissions`) already had no hardcoded resource filter and
needed no change.

**Future role-grant mapping can now assign these permissions to Finance/Admin roles** through the
Permission Matrix UI directly, once that work (Step 2W) begins — no further UI change is needed
to support it.

**Finance write APIs remain pending** — out of scope for this step and the next one (Step 2W is
role-grant mapping, not API implementation).

**27 → 22 correction:** completed in this step across `RBAC_MIGRATION_TRACKER.md`,
`RBAC_AUDIT_REPORT.md`, this document (§15), and `docs/PROJECT_MEMORY.md`.

**Validation:** `npm run build`, `npx tsc --noEmit`, and `npx prisma validate` all pass.

---

## Sources Reviewed

- `docs/RBAC_AUDIT_REPORT.md` (§§2–11, especially §3.7 Finance route matrix, §8 recommended
  source of truth, §10 item 1 Step 2A approval fix)
- `docs/RBAC_MIGRATION_TRACKER.md` (§§1–10, especially §5 Freeze Rules, §8 Permission Mapping gaps)
- `docs/IMPLEMENTATION_STATUS_REPORT.md` (§§1, 3, 5, 7, 8 — Finance module status, DB risks, build
  sequence)
- `docs/SECURITY_MODEL.md` (Finance authorization Phase 1 note, API security, known security notes)
- `docs/modules/finance/FINANCE_API_WIRING_PLAN.md` (§§1–8 — UI inventory, schema model detail,
  required endpoints, mock-data replacement map, approval integration plan, ledger posting plan,
  risk review, recommended implementation order)
- `src/lib/access-control/index.ts`, `permissions.ts`, `policy.ts`
- `src/lib/roles.ts`
- `prisma/schema.prisma` (`FinAccount`, `Ledger`, `Vendor`, `Expense`, `Voucher`,
  `VoucherSequence`, `EmployeeAdvance`, `TravelClaim`, `EmployeeProfile`, `Employee`)
- `src/app/api/finance/{accounts,dashboard,bank-book,cash-book,expenses,expenses/[id],advances,
  conveyance,vouchers,vouchers/[id],voucher-sequences}/route.ts`
- `src/app/api/admin/finance/voucher/route.ts` (representative Finance-admin-config route, Step 2F
  pattern confirmation)

> Note: `docs/modules/finance/API_SPECIFICATION.md` was named in the task's review list but does
> not exist in the repository (only `FINANCE_API_WIRING_PLAN.md`, `FINANCE_ARCHITECTURE.md`, and
> `FINANCE_REQUIREMENTS.md` are present under `docs/modules/finance/`) — `FINANCE_API_WIRING_PLAN.md`
> was used as the equivalent source for endpoint/data-shape detail instead.
