# Finance Module — Prisma Models

> Source of truth: `prisma/schema.prisma`.
> This file documents the finance-related models as they exist today plus
> planned additions. Always check the live schema file before coding —
> if they diverge, the schema file wins.
>
> Provider: `mysql` | Collation: `utf8mb4_unicode_ci`
> Client output: `src/generated/prisma`

---

## Current Models

### Collection

```prisma
model Collection {
  id                    Int       @id @default(autoincrement())
  invoiceDate           DateTime  @default(now())
  invoiceNo             String
  employeeId            Int
  employee              Employee  @relation("EmployeeCollections", fields: [employeeId], references: [id])
  customerName          String
  invoiceValueLakhs     Float
  amountWithoutGstLakhs Float     @default(0)
  dueDate               DateTime
  paymentReceivedDate   DateTime?
  // ── Cached fields — written ONLY by syncCollectionTotals() ──
  amountReceivedLakhs   Float     @default(0)
  collectionStatus      String    @default("Pending")
  // ────────────────────────────────────────────────────────────
  remarks               String    @db.Text @default("")
  payments              Payment[]
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([employeeId])
  @@index([collectionStatus])
  @@index([dueDate])
}
```

**Key constraints:**
- `collectionStatus` valid values: `"Pending"` | `"Partially Received"` | `"Fully Received"`
- `amountReceivedLakhs` and `collectionStatus` must never be set outside `syncCollectionTotals()`.
- `paymentReceivedDate` mirrors the most recent `Payment.paymentDate` for this invoice.

---

### Payment

```prisma
model Payment {
  id            Int           @id @default(autoincrement())
  collectionId  Int
  collection    Collection    @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  amountLakhs   Float
  paymentDate   DateTime      @default(now())
  mode          String        @default("Bank Transfer")
  referenceNo   String        @default("")
  notes         String        @db.Text @default("")
  fromAdvanceId Int?
  fromAdvance   OrderAdvance? @relation("AdvancePayments", fields: [fromAdvanceId], references: [id])
  recordedById  Int
  recordedBy    Employee      @relation("PaymentRecorder", fields: [recordedById], references: [id])
  createdAt     DateTime      @default(now())

  @@index([collectionId])
  @@index([paymentDate])
  @@index([recordedById])
}
```

**Key constraints:**
- `mode` valid values: `"Bank Transfer"` | `"Cheque"` | `"UPI"` | `"Cash"` | `"Opening Balance"` | `"Other"`
- `"Opening Balance"` mode is reserved for the system-generated reconciliation entry
  created by `reconcileOpeningBalance()` — never use it in UI forms.
- No `DELETE` route exists currently. Rows are immutable once created.
- `onDelete: Cascade` — deleting a `Collection` removes all its `Payment` rows.

---

### OrderAdvance

```prisma
model OrderAdvance {
  id                  Int          @id @default(autoincrement())
  salesFunnelId       Int?
  salesFunnel         SalesFunnel? @relation(fields: [salesFunnelId], references: [id])
  customerName        String
  amountLakhs         Float
  receivedDate        DateTime     @default(now())
  mode                String       @default("Bank Transfer")
  referenceNo         String       @default("")
  notes               String       @db.Text @default("")
  status              String       @default("unapplied")
  appliedToCollectionId Int?
  appliedDate         DateTime?
  recordedById        Int
  recordedBy          Employee     @relation("AdvanceRecorder", fields: [recordedById], references: [id])
  payments            Payment[]    @relation("AdvancePayments")
  createdAt           DateTime     @default(now())

  @@index([recordedById])
  @@index([status])
}
```

**Key constraints:**
- `status` valid values: `"unapplied"` | `"applied"`
- Once `status = "applied"`, the advance cannot be applied again.
  `applyAdvance()` checks this and returns `{ error: "Advance already applied" }`.
- `salesFunnelId` is optional — advances can exist without a linked deal.
- `appliedToCollectionId` is informational only (not a FK relation); the actual
  payment link is `Payment.fromAdvanceId`.

---

### Notification

```prisma
model Notification {
  id          Int      @id @default(autoincrement())
  recipientId Int
  recipient   Employee @relation("NotificationRecipient", fields: [recipientId], references: [id], onDelete: Cascade)
  type        String                    // "payment" | "advance" | "system"
  title       String
  body        String   @db.Text
  link        String
  amountLakhs Float?
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())

  @@index([recipientId, isRead])
  @@index([createdAt])
}
```

**Finance-generated types:**
- `"payment"` — fired by `recordPayment()` on every successful payment
- `"advance"` — reserved for future advance-specific notifications
- `"system"` — reserved for system/admin messages

---

## Employee Relation Back-References

The `Employee` model must carry the following reverse-relation fields for the
finance models to compile. These are in `schema.prisma` but documented here
for cross-reference:

```prisma
// Inside the Employee model:
collections   Collection[]  @relation("EmployeeCollections")
recordedPayments Payment[]  @relation("PaymentRecorder")
recordedAdvances OrderAdvance[] @relation("AdvanceRecorder")
notifications Notification[] @relation("NotificationRecipient")
```

---

## Planned Model Additions

### CollectionVisit (Google Maps integration)

```prisma
model CollectionVisit {
  id           Int        @id @default(autoincrement())
  collectionId Int
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  employeeId   Int
  employee     Employee   @relation("VisitEmployee", fields: [employeeId], references: [id])
  visitedAt    DateTime   @default(now())
  latitude     Float
  longitude    Float
  address      String     @db.Text @default("")
  notes        String     @db.Text @default("")
  outcome      String     @default("visited")  // "visited" | "promise_to_pay" | "escalation"
  photoUrl     String?                          // future: photo evidence of visit
  createdAt    DateTime   @default(now())

  @@index([collectionId])
  @@index([employeeId])
  @@index([visitedAt])
}
```

### Planned Payment fields (soft-delete)

```prisma
// Add to Payment model (migration required):
isVoid     Boolean   @default(false)
voidedAt   DateTime?
voidedById Int?
voidedBy   Employee? @relation("PaymentVoider", fields: [voidedById], references: [id])
voidReason String    @db.Text @default("")
```

---

## MySQL-Specific Notes for This Module

1. All `String @db.Text` fields: `TEXT` column — no length limit, avoids MySQL's
   `VARCHAR(191)` truncation. Apply to any notes/remarks/body field.

2. All `Float` fields map to MySQL `DOUBLE` — approximately 15-17 significant decimal
   digits, sufficient for Lakhs values but not for exact financial accounting.
   The target upgrade is `@db.Decimal(12,4)` (FR-FIN-43, deferred).

3. The `@@index` directives on FK columns are **mandatory** — MySQL does not
   auto-create indexes on foreign key columns, unlike SQLite.

4. `amountLakhs` and related aggregations use `prisma.payment.aggregate({ _sum: ... })`.
   The result of `_sum.amountLakhs` is `number | null` — always null-check before
   arithmetic (use `?? 0`).

5. `contains` queries on `customerName` and `invoiceNo` are case-insensitive
   under `utf8mb4_unicode_ci`. Do not add `mode: "insensitive"`.
