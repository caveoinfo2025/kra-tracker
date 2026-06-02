# Finance Module — Business Requirements

> Part of the Caveo CRM internal documentation set.
> Read `docs/PROJECT_MEMORY.md` first for project-wide context.

---

## 1. Purpose

The Finance module is the billing, collections, and payment-tracking layer of Caveo CRM.
It enables the Accounts team and Sales Head to:

- Record and track invoices raised against Closed Won deals.
- Monitor payment status (Pending → Partially Received → Fully Received).
- Record partial or full payments against invoices and maintain an audit ledger.
- Manage order advances (pre-payments received before an invoice is raised).
- Apply advances to open invoices when billing occurs.
- Alert the team on overdue invoices.
- Provide a daily collections summary to managers and Accounts staff.

---

## 2. Stakeholders & Roles

| Role | Finance Access |
|---|---|
| **Head of Sales** (`isManager=true`) | Full access — all invoices, all payments, advances, reports |
| **Operations Head** | Full access — same as manager (via `roles.ts` predicate, without `isManager` flag) |
| **Accounts** | Full access — create/edit invoices, record payments, manage advances |
| **BDE / ISR / Inside Sales** | Own invoices only — can create and view their own collection rows; cannot record payments |
| **Sales Coordinator** | Own invoices — view only; no payment recording |
| **Business Development Manager** | Own invoices + full pipeline; no Accounts-level access |

Role predicates are defined in `src/lib/roles.ts`:
- `canSeeAllCollections(user)` — Managers, Accounts, Operations Head
- `canManagePayments(user)` — same set; gates payment and advance recording

---

## 3. Business Rules

### 3.1 Invoices (Collection records)

- Each invoice belongs to exactly one sales employee (`employeeId`).
- Invoice value is stored in **₹ Lakhs** (`Float` / MySQL `DOUBLE`). 1 Crore = 100 Lakhs.
- GST is 18%. The `amountWithoutGstLakhs` field stores the pre-GST value.
  The UI auto-computes `amountWithoutGstLakhs = invoiceValueLakhs / 1.18` when
  the invoice value is entered.
- `dueDate` is mandatory. Invoices are considered **Overdue** when `dueDate < today`
  and `collectionStatus ≠ "Fully Received"`.
- **Upcoming** = due within the next 30 days and not fully received.
- Collection status is a **cached, derived field** — it must only be set by
  `syncCollectionTotals()` in `src/lib/payments.ts`. Never hand-set it via a raw update.

### 3.2 Payment Status Lifecycle

```
Pending  →  Partially Received  →  Fully Received
```

- **Pending**: No payments recorded (ledger sum = 0).
- **Partially Received**: Ledger sum > 0 but < invoice value (tolerance: 0.001 L).
- **Fully Received**: Ledger sum ≥ invoice value − 0.001 L.
- Status never moves backward; to correct an error the payment ledger entry must be
  managed directly (no soft-delete exists yet — planned).

### 3.3 Payment Ledger

- Every payment is an immutable `Payment` row linked to a `Collection`.
- Partial payments **add to** the running total; they never replace it.
- `syncCollectionTotals()` re-sums the entire `Payment` ledger for an invoice every
  time a new payment is recorded, then writes the cached fields on `Collection`.
- **Opening Balance reconciliation**: If an invoice was imported with
  `amountReceivedLakhs > 0` but no matching `Payment` rows exist, the first new
  payment triggers a synthetic "Opening Balance" ledger entry to preserve the
  pre-existing received amount. This prevents the first real payment from overwriting
  the import value.

### 3.4 Order Advances

- An advance is a payment received from a customer **before** an invoice is raised
  (e.g., a mobilisation advance on a Closed Won deal).
- Advances start with `status = "unapplied"`.
- Applying an advance to an invoice creates a `Payment` row (sourced from the advance)
  and flips the advance to `status = "applied"`.
- An advance can only be applied once (`status = "applied"` blocks re-application).
- Advances are optionally linked to a `SalesFunnel` record (`salesFunnelId`).

### 3.5 Notifications

- When a payment is recorded (including from an advance), the system fans out
  `Notification` rows to:
  1. The sales employee who owns the invoice.
  2. Every employee with `isManager = true`.
- Notification `type = "payment"` carries the amount, customer name, and invoice number.

### 3.6 Payment Modes

Accepted modes (free-text but constrained by the UI):
`Bank Transfer` | `Cheque` | `UPI` | `Cash` | `Opening Balance` (system-only) | `Other`

---

## 4. Functional Requirements

### 4.1 Invoice Management
- **FR-FIN-01**: Create an invoice record linked to a sales employee and customer.
- **FR-FIN-02**: Edit invoice header fields (invoice date, number, customer, value, due date).
- **FR-FIN-03**: Delete an invoice (own record for reps; any record for finance roles).
- **FR-FIN-04**: Bulk delete selected invoice records (finance roles only).
- **FR-FIN-05**: Search invoices by customer name or invoice number.
- **FR-FIN-06**: Filter by status: All / Overdue / Upcoming (30d) / Received / Partially Received.
- **FR-FIN-07**: Filter by salesperson (finance roles only).

### 4.2 Payment Recording
- **FR-FIN-10**: Record a payment against an invoice (amount, date, mode, reference, notes).
- **FR-FIN-11**: View the full payment ledger for an invoice.
- **FR-FIN-12**: Payment recording auto-updates the invoice status and cached totals.
- **FR-FIN-13**: Payment recording fires notifications to the rep and all managers.

### 4.3 Order Advances
- **FR-FIN-20**: Record an advance (customer, amount, date, mode, reference, notes).
- **FR-FIN-21**: Link an advance to a `SalesFunnel` deal (optional).
- **FR-FIN-22**: List all advances with status filter (unapplied / applied / all).
- **FR-FIN-23**: Apply an unapplied advance to an open invoice.

### 4.4 Reporting & Summaries
- **FR-FIN-30**: Summary stat cards: Total Invoiced, Total Without GST, Total Collected, Collection Rate.
- **FR-FIN-31**: Revenue Summary tab: per-salesperson breakdown of billed/collected/outstanding.
- **FR-FIN-32**: Daily payment summary: total received today + recent receipts (web + mobile).
- **FR-FIN-33**: Collections KPI on the mobile dashboard (outstanding, overdue count, collected today).

### 4.5 Planned Features (not yet built)
- **FR-FIN-40**: Tally accounting software export (voucher-format CSV/XML). See `TALLY_EXPORT.md`.
- **FR-FIN-41**: Google Maps integration for customer visit / field-collection tracking. See `GOOGLE_MAPS_INTEGRATION.md`.
- **FR-FIN-42**: `prisma.$transaction` wrapping for `recordPayment` / `applyAdvance` (concurrency safety).
- **FR-FIN-43**: Money precision upgrade: `@db.Decimal(12,4)` on all `*Lakhs` fields.
- **FR-FIN-44**: Payment soft-delete / correction workflow (reverse a mistaken payment entry).

---

## 5. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Collections list loads ≤ 500 rows server-side; pagination needed above that |
| **Data integrity** | Cached fields on `Collection` must only be written by `syncCollectionTotals()` |
| **Concurrency** | `recordPayment` + `syncCollectionTotals` must be wrapped in `prisma.$transaction` before high write volume |
| **Precision** | Money displayed to 2 decimal places (Lakhs). Storage precision upgrade to `Decimal(12,4)` is deferred |
| **Access control** | Every payment/advance API route checks `canManagePayments(session.user)` before any write |
| **Audit** | Every `Payment` row carries `recordedById` (who recorded it) and `paymentDate` (when received) |
| **Notifications** | Payment notifications must reach the rep and all managers within the same request cycle |
