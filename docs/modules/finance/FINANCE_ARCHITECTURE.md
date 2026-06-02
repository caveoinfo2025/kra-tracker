# Finance Module — Architecture

> Assumes familiarity with `docs/ARCHITECTURE.md` (project-wide stack).
> Database: MySQL 8-compatible (MariaDB 11.8). ORM: Prisma 7, driver-adapter mode.

---

## 1. Module Boundaries

The Finance module spans:

```
src/
  app/
    collections/          ← Invoice CRUD web page
    accounts/             ← Accounts dashboard (advances, payment tracker, daily summary)
    api/
      collections/        ← Collection CRUD endpoints
      payments/           ← Payment ledger endpoints + today summary
      advances/           ← Order advance endpoints + apply sub-route
      notifications/      ← Notification read/mark endpoints (shared)
  lib/
    payments.ts           ← Core finance business logic (shared by API routes)
    roles.ts              ← Finance role predicates (canManagePayments, canSeeAllCollections)
  components/
    PaymentsTodayWidget   ← Reusable daily-collections widget (web + mobile)
  app/mobile/
    screens/CollectionsScreen.tsx  ← Mobile invoice view
```

---

## 2. Data Flow

### Recording a payment

```
Client (AccountsClient / mobile)
  │
  ├─ POST /api/payments  { collectionId, amountLakhs, mode, ... }
  │
  └─ route.ts
       ├─ getSession()             ← auth + role check
       ├─ canManagePayments()      ← gate: Accounts / Ops Head / Manager only
       └─ recordPayment()          [src/lib/payments.ts]
            ├─ reconcileOpeningBalance()   ← insert synthetic entry if import gap exists
            ├─ prisma.payment.create()     ← immutable ledger entry
            ├─ syncCollectionTotals()      ← re-sum ledger → update Collection cached fields
            │    ├─ payment.aggregate(_sum amountLakhs)
            │    ├─ derive status (Pending / Partially / Fully)
            │    └─ collection.update(amountReceivedLakhs, collectionStatus, paymentReceivedDate)
            └─ notification.createMany()  ← fan out to rep + managers
```

### Applying an advance

```
Client
  │
  └─ POST /api/advances/[id]/apply  { collectionId }
       ├─ canManagePayments()
       └─ applyAdvance()            [src/lib/payments.ts]
            ├─ orderAdvance.findUnique()    ← check exists + not already applied
            ├─ recordPayment(...)           ← creates Payment from advance (full flow above)
            └─ orderAdvance.update(status=applied, appliedToCollectionId, appliedDate)
```

---

## 3. Component Architecture (Web)

```
CollectionsPage (server component)
├─ getSession() → prisma.collection.findMany()
└─ CollectionsClient (client component)
     ├─ Stat cards (Invoiced / Without GST / Collected / Rate)
     ├─ Tab filters (All / Overdue / Upcoming / Received / Revenue Summary)
     ├─ Employee filter (finance roles only)
     ├─ Search (customer name / invoice no)
     ├─ Invoice table with inline Edit / Delete / Record Payment actions
     ├─ RecordPaymentModal → POST /api/payments
     └─ Revenue Summary tab → buildRevenueTable() (client-side aggregation)

AccountsPage (server component)
├─ getSession() → collection + advance data
└─ AccountsClient (client component)
     ├─ PaymentsTodayWidget → GET /api/payments/today
     ├─ Order Advances section → GET /api/advances?status=unapplied
     ├─ Record Advance form → POST /api/advances
     └─ Apply Advance modal → POST /api/advances/[id]/apply  { collectionId }
```

---

## 4. Service Layer: `src/lib/payments.ts`

All business logic lives here — API routes are thin wrappers.

| Export | Responsibility |
|---|---|
| `syncCollectionTotals(collectionId)` | Re-aggregate Payment ledger → update cached fields on Collection. Called after every payment. |
| `reconcileOpeningBalance(collectionId, recordedById)` | Internal. Inserts a synthetic "Opening Balance" Payment if the Collection's cached `amountReceivedLakhs` exceeds the ledger sum (handles pre-imported invoices). |
| `recordPayment(input)` | Public. Reconciles opening balance → creates Payment → syncs totals → fans out Notifications. |
| `applyAdvance(advanceId, collectionId, recordedById)` | Wraps `recordPayment` + marks advance as applied. |
| `paymentsToday(employeeId?)` | Returns today's payment aggregate + recent list. Scoped by employee or company-wide. |

---

## 5. Role Gates

All gates use `src/lib/roles.ts` — no inline string comparisons in API routes.

| Predicate | Who passes | Used by |
|---|---|---|
| `canSeeAllCollections(user)` | isManager OR Accounts OR Operations Head | `GET /api/collections`, page server component |
| `canManagePayments(user)` | same set as above | `POST /api/payments`, `POST /api/advances`, `POST /api/advances/[id]/apply` |
| `isAccounts(user)` | role contains "accounts" (case-insensitive) | sidebar nav, feature flags |
| `isOperationsHead(user)` | role contains "operations head" or "head of operations" | sidebar nav, feature flags |
| `usesFinanceNav(user)` | non-manager AND (Accounts OR Operations Head) | sidebar link visibility |

---

## 6. Caching Strategy

The `Collection` model has three **cached/derived** fields:

| Field | Source | Written by |
|---|---|---|
| `amountReceivedLakhs` | SUM of `Payment.amountLakhs` for this collection | `syncCollectionTotals()` only |
| `collectionStatus` | Derived from sum vs invoice value | `syncCollectionTotals()` only |
| `paymentReceivedDate` | Latest `Payment.paymentDate` | `syncCollectionTotals()` only |

**Rule:** these fields must never be set by a direct `prisma.collection.update()` call
outside of `syncCollectionTotals`. The `CollectionsClient` form submits invoice header
fields (date, number, customer, value, due date) but should not write the cached fields.

---

## 7. Planned Architecture Changes

### 7.1 Transaction wrapping (debt — see FINANCE_REQUIREMENTS FR-FIN-42)
`recordPayment` currently runs `payment.create` + `syncCollectionTotals` as separate
queries. Under concurrent writes these can race. Wrap in `prisma.$transaction`:

```typescript
const [payment, collection] = await prisma.$transaction(async (tx) => {
  const p = await tx.payment.create({ ... });
  const c = await syncCollectionTotals(collectionId, tx);  // pass tx client
  return [p, c];
});
```

### 7.2 Money precision (debt — see FINANCE_REQUIREMENTS FR-FIN-43)
All `*Lakhs` and `value` fields are currently `Float` (MySQL `DOUBLE`).
Target: `@db.Decimal(12,4)` — requires a Prisma migration and verifying all
aggregation queries still return correct types.

### 7.3 Google Maps integration (planned — see GOOGLE_MAPS_INTEGRATION.md)
Field-collection visit tracking linked to `Collection` records via a new
`CollectionVisit` model.

### 7.4 Tally export (planned — see TALLY_EXPORT.md)
Server-side route that generates Tally-compatible voucher data from `Payment`
and `Collection` records.
