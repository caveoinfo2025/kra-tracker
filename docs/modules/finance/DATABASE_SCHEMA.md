# Finance Module — Database Schema

> Engine: MySQL 8-compatible (MariaDB 11.8).
> ORM: Prisma 7, `provider = "mysql"`.
> All money fields are in **₹ Lakhs** (`Float` → MySQL `DOUBLE`).
> All string fields holding free-form content use `@db.Text`.

---

## 1. Tables Overview

| Table | Purpose |
|---|---|
| `Collection` | Invoice master — one row per invoice raised |
| `Payment` | Immutable payment ledger — one row per payment received against an invoice |
| `OrderAdvance` | Pre-invoice advances (mobilisation / advance payments from customers) |
| `Notification` | In-app notifications fanned out on payment events |

---

## 2. `Collection` — Invoice Master

**Purpose:** Tracks every invoice raised by a sales employee against a customer.
The three cached fields (`amountReceivedLakhs`, `collectionStatus`, `paymentReceivedDate`)
are derived from the `Payment` ledger and must only be written by `syncCollectionTotals()`.

| Column | MySQL Type | Prisma Type | Notes |
|---|---|---|---|
| `id` | `INT AUTO_INCREMENT` | `Int @id @default(autoincrement())` | Primary key |
| `invoiceDate` | `DATETIME(3)` | `DateTime @default(now())` | Date the invoice was raised |
| `invoiceNo` | `VARCHAR(191)` | `String` | Invoice number (e.g. "INV-2024-001") |
| `employeeId` | `INT` | `Int` | FK → `Employee.id` (invoice owner / sales rep) |
| `customerName` | `VARCHAR(191)` | `String` | Customer name (free-text, linked to Customer master) |
| `invoiceValueLakhs` | `DOUBLE` | `Float` | Total invoice value incl. GST, in Lakhs |
| `amountWithoutGstLakhs` | `DOUBLE` | `Float @default(0)` | Invoice value excl. 18% GST, in Lakhs |
| `dueDate` | `DATETIME(3)` | `DateTime` | Payment due date |
| `paymentReceivedDate` | `DATETIME(3)?` | `DateTime?` | **Cached** — date of latest payment (null if none) |
| `amountReceivedLakhs` | `DOUBLE` | `Float @default(0)` | **Cached** — sum of all `Payment.amountLakhs` |
| `collectionStatus` | `VARCHAR(191)` | `String @default("Pending")` | **Cached** — `Pending` / `Partially Received` / `Fully Received` |
| `remarks` | `TEXT` | `String @db.Text @default("")` | Free-form notes |
| `createdAt` | `DATETIME(3)` | `DateTime @default(now())` | Record creation timestamp |
| `updatedAt` | `DATETIME(3)` | `DateTime @updatedAt` | Last modification timestamp |

**Indexes:**
```sql
INDEX idx_collection_employee   (employeeId)
INDEX idx_collection_status     (collectionStatus)
INDEX idx_collection_due_date   (dueDate)
```

**Relations:**
- `employee` → `Employee` (many-to-one, `onDelete: Restrict`)
- `payments` → `Payment[]` (one-to-many)

**Status derivation logic:**
```
amountReceivedLakhs = 0              → "Pending"
amountReceivedLakhs < invoiceValue   → "Partially Received"
amountReceivedLakhs ≥ invoiceValue   → "Fully Received"
(tolerance: 0.001 L to absorb float drift)
```

**Overdue logic (app-layer, not stored):**
```
isOverdue = dueDate < today AND collectionStatus ≠ "Fully Received"
```

---

## 3. `Payment` — Payment Ledger

**Purpose:** Immutable ledger of every payment received against an invoice.
Each row is a single payment event. The aggregate of all rows for a given
`collectionId` determines the invoice's received amount and status.

| Column | MySQL Type | Prisma Type | Notes |
|---|---|---|---|
| `id` | `INT AUTO_INCREMENT` | `Int @id @default(autoincrement())` | Primary key |
| `collectionId` | `INT` | `Int` | FK → `Collection.id` (`onDelete: Cascade`) |
| `amountLakhs` | `DOUBLE` | `Float` | Amount of this payment, in Lakhs |
| `paymentDate` | `DATETIME(3)` | `DateTime @default(now())` | Date payment was received |
| `mode` | `VARCHAR(191)` | `String @default("Bank Transfer")` | `Bank Transfer` / `Cheque` / `UPI` / `Cash` / `Opening Balance` / `Other` |
| `referenceNo` | `VARCHAR(191)` | `String @default("")` | Cheque/UTR/transaction reference |
| `notes` | `TEXT` | `String @db.Text @default("")` | Free-form notes |
| `fromAdvanceId` | `INT?` | `Int?` | FK → `OrderAdvance.id` if payment was applied from an advance |
| `recordedById` | `INT` | `Int` | FK → `Employee.id` (who recorded this payment) |
| `createdAt` | `DATETIME(3)` | `DateTime @default(now())` | Insertion timestamp |

**Indexes:**
```sql
INDEX idx_payment_collection    (collectionId)
INDEX idx_payment_date          (paymentDate)
INDEX idx_payment_recorded_by   (recordedById)
```

**Relations:**
- `collection` → `Collection` (many-to-one, `onDelete: Cascade`)
- `recordedBy` → `Employee` (many-to-one)
- `fromAdvance` → `OrderAdvance?` (many-to-one, optional)

**Immutability note:**  
Payments have no `DELETE` or `UPDATE` API currently. Correction requires a
planned soft-delete / reversal workflow (FR-FIN-44, not yet implemented).

---

## 4. `OrderAdvance` — Pre-Invoice Advances

**Purpose:** Records advance payments received from a customer before an
invoice is raised (e.g., mobilisation advance on a large deal). When an
invoice is eventually raised, the advance is applied to it.

| Column | MySQL Type | Prisma Type | Notes |
|---|---|---|---|
| `id` | `INT AUTO_INCREMENT` | `Int @id @default(autoincrement())` | Primary key |
| `salesFunnelId` | `INT?` | `Int?` | FK → `SalesFunnel.id` (optional, links to deal) |
| `customerName` | `VARCHAR(191)` | `String` | Customer name |
| `amountLakhs` | `DOUBLE` | `Float` | Advance amount, in Lakhs |
| `receivedDate` | `DATETIME(3)` | `DateTime @default(now())` | Date advance was received |
| `mode` | `VARCHAR(191)` | `String @default("Bank Transfer")` | Payment mode |
| `referenceNo` | `VARCHAR(191)` | `String @default("")` | Bank/transaction reference |
| `notes` | `TEXT` | `String @db.Text @default("")` | Free-form notes |
| `status` | `VARCHAR(191)` | `String @default("unapplied")` | `unapplied` / `applied` |
| `appliedToCollectionId` | `INT?` | `Int?` | FK → `Collection.id` (set when applied) |
| `appliedDate` | `DATETIME(3)?` | `DateTime?` | Timestamp when advance was applied |
| `recordedById` | `INT` | `Int` | FK → `Employee.id` (who recorded the advance) |
| `createdAt` | `DATETIME(3)` | `DateTime @default(now())` | Insertion timestamp |

**Indexes:**
```sql
INDEX idx_advance_recorded_by   (recordedById)
INDEX idx_advance_status        (status)
```

**State machine:**
```
unapplied  →  (apply to invoice)  →  applied
             applyAdvance() creates a Payment row + sets status="applied"
             Cannot be re-applied once "applied"
```

---

## 5. `Notification` — In-App Notifications

**Purpose:** In-app notification feed. Finance events (payments, advance applications)
fan out `Notification` rows to relevant recipients.

| Column | MySQL Type | Prisma Type | Notes |
|---|---|---|---|
| `id` | `INT AUTO_INCREMENT` | `Int @id @default(autoincrement())` | Primary key |
| `recipientId` | `INT` | `Int` | FK → `Employee.id` |
| `type` | `VARCHAR(191)` | `String` | `payment` / `advance` / `system` |
| `title` | `VARCHAR(191)` | `String` | Short notification title |
| `body` | `TEXT` | `String @db.Text` | Notification body text |
| `link` | `VARCHAR(191)` | `String` | Deep-link URL (e.g. `/collections`) |
| `amountLakhs` | `DOUBLE?` | `Float?` | Amount if finance-related |
| `isRead` | `BOOLEAN` | `Boolean @default(false)` | Read/unread flag |
| `createdAt` | `DATETIME(3)` | `DateTime @default(now())` | Creation timestamp |

**Indexes:**
```sql
INDEX idx_notif_recipient_read  (recipientId, isRead)
INDEX idx_notif_created_at      (createdAt)
```

---

## 6. Relationships Diagram

```
Employee ──────────────────────────────────────────────────────────┐
  │                                                                │
  │ 1                                                              │
  │ ───< Collection >──────< Payment >──────────── OrderAdvance   │
  │  (employeeId)   1    N (collectionId)     1─0  (fromAdvanceId)│
  │                                                                │
  │                 (recordedById) ──────────────────────────────┘ Employee
  │                 (recordedById) ─── OrderAdvance.recordedById
  │
  └──< Notification > (recipientId)
```

---

## 7. Planned Schema Changes

### 7.1 Money precision — `@db.Decimal(12,4)`
```prisma
// Current
invoiceValueLakhs      Float
amountWithoutGstLakhs  Float
amountReceivedLakhs    Float @default(0)
amountLakhs            Float   // on Payment

// Target (FR-FIN-43)
invoiceValueLakhs      Decimal  @db.Decimal(12,4)
amountWithoutGstLakhs  Decimal  @db.Decimal(12,4)
amountReceivedLakhs    Decimal  @db.Decimal(12,4) @default(0)
amountLakhs            Decimal  @db.Decimal(12,4)  // on Payment
```
Migration note: requires changing Prisma queries to use `Prisma.Decimal` or converting
to `number` at the API boundary. The `@db.Decimal(12,4)` native type override alone
does not change application code if aggregation returns are handled correctly.

### 7.2 CollectionVisit model (Google Maps — planned)
```prisma
model CollectionVisit {
  id           Int        @id @default(autoincrement())
  collectionId Int
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  employeeId   Int
  employee     Employee   @relation(fields: [employeeId], references: [id])
  visitedAt    DateTime   @default(now())
  latitude     Float
  longitude    Float
  address      String     @db.Text
  notes        String     @db.Text @default("")
  outcome      String     @default("visited")   // visited | promise | escalation
  createdAt    DateTime   @default(now())

  @@index([collectionId])
  @@index([employeeId])
  @@index([visitedAt])
}
```

### 7.3 Payment soft-delete (planned FR-FIN-44)
```prisma
// Add to Payment model
isVoid      Boolean   @default(false)
voidedAt    DateTime?
voidedById  Int?
voidReason  String    @db.Text @default("")
```
`syncCollectionTotals` would then filter `where: { isVoid: false }` when aggregating.
