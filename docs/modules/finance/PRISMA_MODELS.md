# Finance Operations Module — Prisma Models

> **Status: APPROVED FINAL SCOPE**
> Provider: `mysql` | Client output: `src/generated/prisma`
> All models must be added to `prisma/schema.prisma`.
> Run `npx prisma migrate dev --name <name>` against a live MySQL DB after changes.
> Never run migrations against a SQLite URL.

---

## Existing Models (Phase 0 — unchanged)

`Collection`, `Payment`, `OrderAdvance`, `Notification` — see `docs/DATABASE.md`.

---

## New Models — Approved Scope

```prisma
// ─── Cash Book ────────────────────────────────────────────────────────────────

model CashAccount {
  id             Int         @id @default(autoincrement())
  name           String
  branchName     String      @default("HO")
  openingBalance Float       @default(0)
  currentBalance Float       @default(0)    // CACHED — written by cash-book.ts only
  isActive       Boolean     @default(true)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  entries        CashEntry[]
}

model CashEntry {
  id                Int          @id @default(autoincrement())
  cashAccountId     Int
  cashAccount       CashAccount  @relation(fields: [cashAccountId], references: [id])
  entryDate         DateTime
  type              String       // "receipt" | "payment" | "bank_withdrawal" | "bank_deposit"
  amountLakhs       Float        // always positive; direction from type
  narration         String       @db.Text
  voucherId         Int?
  voucher           Voucher?     @relation("CashVoucher", fields: [voucherId], references: [id])
  pairedBankEntryId Int?         // FK → BankEntry for bank-cash transfers
  recordedById      Int
  recordedBy        Employee     @relation("CashEntryRecorder", fields: [recordedById], references: [id])
  createdAt         DateTime     @default(now())

  @@index([cashAccountId])
  @@index([entryDate])
  @@index([recordedById])
}

// ─── Bank Book ────────────────────────────────────────────────────────────────

model BankAccount {
  id             Int         @id @default(autoincrement())
  bankName       String
  accountNo      String
  ifscCode       String      @default("")
  accountHolder  String
  openingBalance Float       @default(0)
  currentBalance Float       @default(0)    // CACHED — written by bank-book.ts only
  isActive       Boolean     @default(true)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  entries        BankEntry[]
}

model BankEntry {
  id                 Int          @id @default(autoincrement())
  bankAccountId      Int
  bankAccount        BankAccount  @relation(fields: [bankAccountId], references: [id])
  entryDate          DateTime
  type               String       // "upi"|"cheque"|"neft"|"rtgs"|"imps"|"cash_withdrawal"|"cash_deposit"|"bank_charge"|"receipt"|"payment"
  direction          String       // "debit" | "credit"
  amountLakhs        Float
  narration          String       @db.Text
  referenceNo        String       @default("")
  chequeNo           String       @default("")
  chequeDate         DateTime?
  payee              String       @default("")
  voucherId          Int?
  voucher            Voucher?     @relation("BankVoucher", fields: [voucherId], references: [id])
  pairedCashEntryId  Int?
  reconciled         Boolean      @default(false)
  reconciledAt       DateTime?
  recordedById       Int
  recordedBy         Employee     @relation("BankEntryRecorder", fields: [recordedById], references: [id])
  createdAt          DateTime     @default(now())

  @@index([bankAccountId])
  @@index([entryDate])
  @@index([reconciled])
  @@index([recordedById])
}

// ─── Vendor Master ────────────────────────────────────────────────────────────

model Vendor {
  id           Int            @id @default(autoincrement())
  name         String
  gstin        String         @default("")
  pan          String         @default("")
  address      String         @db.Text @default("")
  city         String         @default("")
  state        String         @default("")
  pincode      String         @default("")
  contactName  String         @default("")
  contactPhone String         @default("")
  contactEmail String         @default("")
  bankName     String         @default("")
  bankAccountNo String        @default("")
  ifscCode     String         @default("")
  paymentTerms String         @default("30 days")
  isActive     Boolean        @default(true)
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  expenses     ExpenseEntry[]

  @@index([name])
  @@index([isActive])
}

// ─── Expense Register ─────────────────────────────────────────────────────────

model ExpenseCategory {
  id             Int            @id @default(autoincrement())
  name           String
  code           String
  gstApplicable  Boolean        @default(true)
  tallyLedger    String         @default("")
  isActive       Boolean        @default(true)
  sortOrder      Int            @default(0)
  createdAt      DateTime       @default(now())
  expenses       ExpenseEntry[]
}

model ExpenseEntry {
  id              Int                  @id @default(autoincrement())
  categoryId      Int
  category        ExpenseCategory      @relation(fields: [categoryId], references: [id])
  vendorId        Int?
  vendor          Vendor?              @relation(fields: [vendorId], references: [id])
  customerName    String?              // denormalized customer tag for profitability
  employeeId      Int
  employee        Employee             @relation("EmployeeExpenses", fields: [employeeId], references: [id])
  expenseDate     DateTime
  amountLakhs     Float
  gstAmountLakhs  Float                @default(0)
  gstRate         Float                @default(0)
  narration       String               @db.Text
  vendorInvoiceNo String               @default("")
  status          String               @default("draft")
  voucherId       Int?
  voucher         Voucher?             @relation("ExpenseVoucher", fields: [voucherId], references: [id])
  claimId         Int?
  claim           EmployeeClaim?       @relation(fields: [claimId], references: [id])
  conveyanceId    Int?                 @unique
  conveyance      ConveyanceLog?       @relation("ConveyanceExpense")
  approvalId      Int?
  approval        ApprovalRequest?     @relation("ExpenseApproval", fields: [approvalId], references: [id])
  paidDate        DateTime?
  attachments     ExpenseAttachment[]
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt

  @@index([categoryId])
  @@index([vendorId])
  @@index([employeeId])
  @@index([expenseDate])
  @@index([status])
  @@index([claimId])
  @@index([customerName])
}

model ExpenseAttachment {
  id           Int          @id @default(autoincrement())
  expenseId    Int
  expense      ExpenseEntry @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  fileName     String
  fileUrl      String       @db.Text
  fileSize     Int?
  mimeType     String       @default("")
  uploadedById Int
  uploadedBy   Employee     @relation("AttachmentUploader", fields: [uploadedById], references: [id])
  uploadedAt   DateTime     @default(now())

  @@index([expenseId])
}

// ─── Voucher Management ───────────────────────────────────────────────────────

model VoucherSequence {
  id            Int      @id @default(autoincrement())
  financialYear String   @unique   // e.g. "26-27"
  lastNumber    Int      @default(0)
  updatedAt     DateTime @updatedAt
}

model Voucher {
  id          Int               @id @default(autoincrement())
  voucherNo   String            @unique    // CI/26-27/00001
  type        String            // "payment"|"receipt"|"journal"|"expense"|"conveyance"|"advance"
  voucherDate DateTime
  amountLakhs Float
  narration   String            @db.Text
  status      String            @default("draft")   // "draft"|"approved"|"voided"
  pdfUrl      String?           @db.Text
  approvalId  Int?
  approval    ApprovalRequest?  @relation("VoucherApproval", fields: [approvalId], references: [id])
  voidedAt    DateTime?
  voidReason  String            @db.Text @default("")
  createdById Int
  createdBy   Employee          @relation("VoucherCreator", fields: [createdById], references: [id])
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  cashEntries  CashEntry[]      @relation("CashVoucher")
  bankEntries  BankEntry[]      @relation("BankVoucher")
  expenses     ExpenseEntry[]   @relation("ExpenseVoucher")
  conveyanceLogs ConveyanceLog[] @relation("ConveyanceVoucher")

  @@index([voucherDate])
  @@index([type])
  @@index([status])
  @@index([createdById])
}

// ─── Approval Engine ──────────────────────────────────────────────────────────

model ApprovalPolicy {
  id                Int               @id @default(autoincrement())
  name              String
  expenseType       String            @default("all")
  autoApproveLimit  Float             @default(0)
  level1Limit       Float
  level1Role        String
  level2Limit       Float?
  level2Role        String?
  level3Limit       Float?
  level3Role        String?
  isActive          Boolean           @default(true)
  createdAt         DateTime          @default(now())
  requests          ApprovalRequest[]
}

model ApprovalRequest {
  id                Int              @id @default(autoincrement())
  entityType        String           // "expense"|"claim"|"advance"|"conveyance"|"voucher"
  entityId          Int
  policyId          Int?
  policy            ApprovalPolicy?  @relation(fields: [policyId], references: [id])
  requestedById     Int
  requestedBy       Employee         @relation("ApprovalRequester", fields: [requestedById], references: [id])
  currentLevel      Int              @default(1)
  status            String           @default("pending")
  level1ApproverId  Int?
  level1Approver    Employee?        @relation("L1Approver", fields: [level1ApproverId], references: [id])
  level1ApprovedAt  DateTime?
  level1Comments    String           @db.Text @default("")
  level2ApproverId  Int?
  level2Approver    Employee?        @relation("L2Approver", fields: [level2ApproverId], references: [id])
  level2ApprovedAt  DateTime?
  level2Comments    String           @db.Text @default("")
  level3ApproverId  Int?
  level3Approver    Employee?        @relation("L3Approver", fields: [level3ApproverId], references: [id])
  level3ApprovedAt  DateTime?
  level3Comments    String           @db.Text @default("")
  rejectedAt        DateTime?
  rejectedById      Int?
  rejectedBy        Employee?        @relation("ApprovalRejecter", fields: [rejectedById], references: [id])
  rejectionReason   String           @db.Text @default("")
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  expenses      ExpenseEntry[]   @relation("ExpenseApproval")
  claims        EmployeeClaim[]  @relation("ClaimApproval")
  advances      EmployeeAdvance[] @relation("AdvanceApproval")
  conveyances   ConveyanceLog[]  @relation("ConveyanceApproval")
  vouchers      Voucher[]        @relation("VoucherApproval")

  @@index([entityType, entityId])
  @@index([requestedById])
  @@index([status])
  @@index([level1ApproverId])
  @@index([level2ApproverId])
}

// ─── Employee Claims ──────────────────────────────────────────────────────────

model EmployeeClaim {
  id               Int              @id @default(autoincrement())
  claimNo          String           @unique    // CI/CLM/26-27/00001
  employeeId       Int
  employee         Employee         @relation("EmployeeClaims", fields: [employeeId], references: [id])
  claimDate        DateTime         @default(now())
  totalAmountLakhs Float
  status           String           @default("draft")
  approvalId       Int?             @unique
  approval         ApprovalRequest? @relation("ClaimApproval", fields: [approvalId], references: [id])
  paidDate         DateTime?
  paidAmountLakhs  Float?
  remarks          String           @db.Text @default("")
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
  entries          ExpenseEntry[]

  @@index([employeeId])
  @@index([status])
  @@index([claimDate])
}

// ─── Employee Advance ─────────────────────────────────────────────────────────

model EmployeeAdvance {
  id                    Int              @id @default(autoincrement())
  advanceNo             String           @unique    // CI/ADV/26-27/00001
  employeeId            Int
  employee              Employee         @relation("EmployeeAdvances", fields: [employeeId], references: [id])
  purpose               String           @db.Text
  amountLakhs           Float
  requestDate           DateTime         @default(now())
  requiredByDate        DateTime?
  status                String           @default("pending")
  approvalId            Int?             @unique
  approval              ApprovalRequest? @relation("AdvanceApproval", fields: [approvalId], references: [id])
  disbursedDate         DateTime?
  disbursedAmountLakhs  Float?
  disbursedFromType     String?          // "cash" | "bank"
  disbursedFromId       Int?             // FK to CashAccount or BankAccount
  settledDate           DateTime?
  settledAmountLakhs    Float?
  balanceLakhs          Float            @default(0)    // CACHED: disbursed − settled
  remarks               String           @db.Text @default("")
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt

  @@index([employeeId])
  @@index([status])
  @@index([requestDate])
}

// ─── HR Expense Policy ────────────────────────────────────────────────────────

model HRExpensePolicy {
  id                      Int      @id @default(autoincrement())
  name                    String
  rolePattern             String   @default("all")
  perDiemTier1Lakhs       Float    @default(0)
  perDiemTier2Lakhs       Float    @default(0)
  mealLimitLakhs          Float    @default(0)
  hotelTier1Lakhs         Float    @default(0)
  hotelTier2Lakhs         Float    @default(0)
  bikeRatePerKm           Float    @default(2.0)    // ₹ per KM
  carRatePerKm            Float    @default(7.0)    // ₹ per KM
  autoRatePerKm           Float    @default(0)
  maxConveyanceDayRupees  Float    @default(0)      // 0 = no cap
  isActive                Boolean  @default(true)
  effectiveFrom           DateTime @default(now())
  createdAt               DateTime @default(now())

  @@index([isActive])
  @@index([effectiveFrom])
}

// ─── Local Conveyance ─────────────────────────────────────────────────────────

model ConveyanceLog {
  id           Int              @id @default(autoincrement())
  employeeId   Int
  employee     Employee         @relation("EmployeeConveyance", fields: [employeeId], references: [id])
  travelDate   DateTime
  fromLocation String           @db.Text
  toLocation   String           @db.Text
  fromLat      Float?
  fromLng      Float?
  toLat        Float?
  toLng        Float?
  distanceKm   Float
  mode         String           // "bike" | "car" | "auto" | "public"
  ratePerKm    Float            // ₹ per KM (snapshot from HR Policy)
  amountRupees Float
  amountLakhs  Float
  purpose      String           @db.Text @default("")
  status       String           @default("draft")
  expenseId    Int?             @unique
  expense      ExpenseEntry?    @relation("ConveyanceExpense", fields: [expenseId], references: [id])
  voucherId    Int?
  voucher      Voucher?         @relation("ConveyanceVoucher", fields: [voucherId], references: [id])
  approvalId   Int?
  approval     ApprovalRequest? @relation("ConveyanceApproval", fields: [approvalId], references: [id])
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  @@index([employeeId])
  @@index([travelDate])
  @@index([status])
}
```

---

## Employee Model — New Back-References Required

Add these relation fields to the existing `Employee` model in `schema.prisma`:

```prisma
// Add inside the Employee model:
cashEntries       CashEntry[]         @relation("CashEntryRecorder")
bankEntries       BankEntry[]         @relation("BankEntryRecorder")
expenses          ExpenseEntry[]      @relation("EmployeeExpenses")
attachments       ExpenseAttachment[] @relation("AttachmentUploader")
vouchersCreated   Voucher[]           @relation("VoucherCreator")
approvalRequests  ApprovalRequest[]   @relation("ApprovalRequester")
level1Approvals   ApprovalRequest[]   @relation("L1Approver")
level2Approvals   ApprovalRequest[]   @relation("L2Approver")
level3Approvals   ApprovalRequest[]   @relation("L3Approver")
approvalRejections ApprovalRequest[]  @relation("ApprovalRejecter")
claims            EmployeeClaim[]     @relation("EmployeeClaims")
advances          EmployeeAdvance[]   @relation("EmployeeAdvances")
conveyanceLogs    ConveyanceLog[]     @relation("EmployeeConveyance")
```

---

## MySQL-Specific Rules Applied to All Models

1. `provider = "mysql"` — do not change.
2. Every `String` field holding free-form content uses `@db.Text`.
3. Every FK and hot-filter column has `@@index(...)`.
4. All `Float` fields = MySQL `DOUBLE`. Target upgrade: `@db.Decimal(12,4)`.
5. `currentBalance` on `CashAccount` and `BankAccount` are **cached fields** —
   never write them outside `cash-book.ts` / `bank-book.ts` service functions.
6. `balanceLakhs` on `EmployeeAdvance` is a **cached field** — update only on
   disbursement and settlement events.
7. `VoucherSequence.lastNumber` must only be incremented inside `prisma.$transaction`
   to prevent duplicate voucher numbers.
8. All multi-step financial writes must use `prisma.$transaction`.
