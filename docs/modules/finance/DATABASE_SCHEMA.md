# Finance Operations Module — Database Schema

> **Status: APPROVED FINAL SCOPE**
> Engine: MySQL 8-compatible (MariaDB 11.8) · ORM: Prisma 7 · `provider = "mysql"`
> All money fields are in **₹ Lakhs** (`Float` → MySQL `DOUBLE`); target upgrade `@db.Decimal(12,4)`.
> All free-form text fields use `@db.Text`.
> Every FK column and filter column has `@@index`.

---

## Existing Tables (Phase 0 — live in production)

| Table | Description |
|---|---|
| `Collection` | Invoice master (one row per invoice) |
| `Payment` | Payment ledger entries against invoices |
| `OrderAdvance` | Pre-invoice customer advances |
| `Notification` | In-app notification feed |

See `docs/DATABASE.md` for their full column definitions.

---

## New Tables — Approved Scope

---

### CashAccount — Cash Account Master

One record per physical cash account (company HQ, branch, etc.).

| Column | MySQL Type | Notes |
|---|---|---|
| `id` | `INT AUTO_INCREMENT PK` | |
| `name` | `VARCHAR(191)` | e.g. "HO Cash", "Chennai Branch Cash" |
| `branchName` | `VARCHAR(191) DEFAULT 'HO'` | Branch identifier |
| `openingBalance` | `DOUBLE DEFAULT 0` | ₹ Lakhs |
| `currentBalance` | `DOUBLE DEFAULT 0` | **Cached** — maintained by `cash-book.ts` service only |
| `isActive` | `BOOLEAN DEFAULT TRUE` | Soft inactive |
| `createdAt` | `DATETIME(3) DEFAULT NOW()` | |
| `updatedAt` | `DATETIME(3) @updatedAt` | |

**Constraint:** `currentBalance` must never go below 0. Enforced at the service layer
inside a `prisma.$transaction` before writing the entry.

---

### CashEntry — Cash Book Entries

Every cash receipt and payment.

| Column | MySQL Type | Notes |
|---|---|---|
| `id` | `INT AUTO_INCREMENT PK` | |
| `cashAccountId` | `INT` | FK → CashAccount |
| `entryDate` | `DATETIME(3)` | Date of the transaction |
| `type` | `VARCHAR(191)` | `receipt` / `payment` / `bank_withdrawal` / `bank_deposit` |
| `amountLakhs` | `DOUBLE` | Always positive; direction determined by `type` |
| `narration` | `TEXT` | Required |
| `voucherId` | `INT?` | FK → Voucher |
| `pairedBankEntryId` | `INT?` | FK → BankEntry (for bank-cash transfers) |
| `recordedById` | `INT` | FK → Employee |
| `createdAt` | `DATETIME(3) DEFAULT NOW()` | |

**Indexes:** `(cashAccountId)`, `(entryDate)`, `(recordedById)`

**Cascade:** Deleting a CashAccount hard-blocks if entries exist (Restrict).

---

### BankAccount — Bank Account Master

| Column | MySQL Type | Notes |
|---|---|---|
| `id` | `INT AUTO_INCREMENT PK` | |
| `bankName` | `VARCHAR(191)` | e.g. "HDFC Bank" |
| `accountNo` | `VARCHAR(191)` | Account number |
| `ifscCode` | `VARCHAR(191) DEFAULT ''` | |
| `accountHolder` | `VARCHAR(191)` | |
| `openingBalance` | `DOUBLE DEFAULT 0` | ₹ Lakhs |
| `currentBalance` | `DOUBLE DEFAULT 0` | **Cached** |
| `isActive` | `BOOLEAN DEFAULT TRUE` | |
| `createdAt` | `DATETIME(3)` | |

---

### BankEntry — Bank Book Entries

Every bank debit and credit.

| Column | MySQL Type | Notes |
|---|---|---|
| `id` | `INT AUTO_INCREMENT PK` | |
| `bankAccountId` | `INT` | FK → BankAccount |
| `entryDate` | `DATETIME(3)` | |
| `type` | `VARCHAR(191)` | `upi` / `cheque` / `neft` / `rtgs` / `imps` / `cash_withdrawal` / `cash_deposit` / `bank_charge` / `receipt` / `payment` |
| `amountLakhs` | `DOUBLE` | Always positive |
| `direction` | `VARCHAR(10)` | `debit` / `credit` |
| `narration` | `TEXT` | |
| `referenceNo` | `VARCHAR(191) DEFAULT ''` | UTR / transaction ID |
| `chequeNo` | `VARCHAR(191) DEFAULT ''` | For cheque entries |
| `chequeDate` | `DATETIME(3)?` | |
| `payee` | `VARCHAR(191) DEFAULT ''` | Who paid / received |
| `voucherId` | `INT?` | FK → Voucher |
| `pairedCashEntryId` | `INT?` | FK → CashEntry (for bank-cash transfers) |
| `reconciled` | `BOOLEAN DEFAULT FALSE` | |
| `reconciledAt` | `DATETIME(3)?` | |
| `recordedById` | `INT` | FK → Employee |
| `createdAt` | `DATETIME(3)` | |

**Indexes:** `(bankAccountId)`, `(entryDate)`, `(reconciled)`, `(recordedById)`

---

### Vendor — Vendor Master

| Column | MySQL Type | Notes |
|---|---|---|
| `id` | `INT AUTO_INCREMENT PK` | |
| `name` | `VARCHAR(191)` | Required; unique within the company |
| `gstin` | `VARCHAR(191) DEFAULT ''` | 15-character GST number |
| `pan` | `VARCHAR(191) DEFAULT ''` | 10-character PAN |
| `address` | `TEXT DEFAULT ''` | |
| `city` | `VARCHAR(191) DEFAULT ''` | |
| `state` | `VARCHAR(191) DEFAULT ''` | |
| `pincode` | `VARCHAR(191) DEFAULT ''` | |
| `contactName` | `VARCHAR(191) DEFAULT ''` | |
| `contactPhone` | `VARCHAR(191) DEFAULT ''` | |
| `contactEmail` | `VARCHAR(191) DEFAULT ''` | |
| `bankName` | `VARCHAR(191) DEFAULT ''` | |
| `bankAccountNo` | `VARCHAR(191) DEFAULT ''` | |
| `ifscCode` | `VARCHAR(191) DEFAULT ''` | |
| `paymentTerms` | `VARCHAR(191) DEFAULT '30 days'` | `Immediate` / `15 days` / `30 days` / `45 days` / `60 days` |
| `isActive` | `BOOLEAN DEFAULT TRUE` | Soft delete — never hard delete |
| `createdAt` | `DATETIME(3)` | |
| `updatedAt` | `DATETIME(3) @updatedAt` | |

**Indexes:** `(name)`, `(isActive)`

---

### ExpenseCategory — Expense Category Master

| Column | MySQL Type | Notes |
|---|---|---|
| `id` | `INT AUTO_INCREMENT PK` | |
| `name` | `VARCHAR(191)` | e.g. "Travel", "Client Entertainment" |
| `code` | `VARCHAR(20)` | Short code e.g. "TRVL" |
| `gstApplicable` | `BOOLEAN DEFAULT TRUE` | |
| `tallyLedger` | `VARCHAR(191) DEFAULT ''` | Mapped Tally ledger name |
| `isActive` | `BOOLEAN DEFAULT TRUE` | |
| `sortOrder` | `INT DEFAULT 0` | Display order |
| `createdAt` | `DATETIME(3)` | |

---

### ExpenseEntry — Expense Register

| Column | MySQL Type | Notes |
|---|---|---|
| `id` | `INT AUTO_INCREMENT PK` | |
| `categoryId` | `INT` | FK → ExpenseCategory |
| `vendorId` | `INT?` | FK → Vendor (optional) |
| `customerName` | `VARCHAR(191)?` | Denormalised customer tag (for profitability) |
| `employeeId` | `INT` | FK → Employee |
| `expenseDate` | `DATETIME(3)` | |
| `amountLakhs` | `DOUBLE` | Total incl. GST |
| `gstAmountLakhs` | `DOUBLE DEFAULT 0` | GST component |
| `gstRate` | `DOUBLE DEFAULT 0` | 0 / 5 / 12 / 18 / 28 |
| `narration` | `TEXT` | Required |
| `vendorInvoiceNo` | `VARCHAR(191) DEFAULT ''` | |
| `status` | `VARCHAR(191) DEFAULT 'draft'` | `draft` / `submitted` / `approved` / `rejected` / `paid` |
| `voucherId` | `INT?` | FK → Voucher (set on approval) |
| `claimId` | `INT?` | FK → EmployeeClaim (when batched into a claim) |
| `conveyanceId` | `INT? UNIQUE` | FK → ConveyanceLog (auto-created for conveyance) |
| `approvalId` | `INT?` | FK → ApprovalRequest |
| `paidDate` | `DATETIME(3)?` | |
| `createdAt` | `DATETIME(3)` | |
| `updatedAt` | `DATETIME(3) @updatedAt` | |

**Indexes:** `(categoryId)`, `(vendorId)`, `(employeeId)`, `(expenseDate)`, `(status)`, `(claimId)`, `(customerName)`

---

### ExpenseAttachment — File Attachments

| Column | MySQL Type | Notes |
|---|---|---|
| `id` | `INT AUTO_INCREMENT PK` | |
| `expenseId` | `INT` | FK → ExpenseEntry (onDelete: Cascade) |
| `fileName` | `VARCHAR(191)` | Original file name |
| `fileUrl` | `TEXT` | Cloud storage URL (R2 / S3) |
| `fileSize` | `INT?` | Bytes |
| `mimeType` | `VARCHAR(191) DEFAULT ''` | `image/jpeg` / `application/pdf` etc. |
| `uploadedById` | `INT` | FK → Employee |
| `uploadedAt` | `DATETIME(3) DEFAULT NOW()` | |

**Indexes:** `(expenseId)`

---

### VoucherSequence — Auto-Increment Sequence Per Financial Year

| Column | MySQL Type | Notes |
|---|---|---|
| `id` | `INT AUTO_INCREMENT PK` | |
| `financialYear` | `VARCHAR(10) UNIQUE` | e.g. "26-27" |
| `lastNumber` | `INT DEFAULT 0` | Atomically incremented per voucher |
| `updatedAt` | `DATETIME(3) @updatedAt` | |

Incremented inside `prisma.$transaction` with `SELECT ... FOR UPDATE` to prevent
duplicate voucher numbers under concurrency.

---

### Voucher — Voucher Register

| Column | MySQL Type | Notes |
|---|---|---|
| `id` | `INT AUTO_INCREMENT PK` | |
| `voucherNo` | `VARCHAR(191) UNIQUE` | `CI/26-27/00001` |
| `type` | `VARCHAR(191)` | `payment` / `receipt` / `journal` / `expense` / `conveyance` / `advance` |
| `voucherDate` | `DATETIME(3)` | |
| `amountLakhs` | `DOUBLE` | |
| `narration` | `TEXT` | |
| `status` | `VARCHAR(191) DEFAULT 'draft'` | `draft` / `approved` / `voided` |
| `pdfUrl` | `TEXT?` | Cloud URL of generated PDF |
| `approvalId` | `INT?` | FK → ApprovalRequest |
| `voidedAt` | `DATETIME(3)?` | |
| `voidReason` | `TEXT DEFAULT ''` | |
| `createdById` | `INT` | FK → Employee |
| `createdAt` | `DATETIME(3)` | |
| `updatedAt` | `DATETIME(3) @updatedAt` | |

**Indexes:** `(voucherDate)`, `(type)`, `(status)`, `(createdById)`

---

### ApprovalPolicy — Approval Rule Configuration

| Column | MySQL Type | Notes |
|---|---|---|
| `id` | `INT AUTO_INCREMENT PK` | |
| `name` | `VARCHAR(191)` | e.g. "Standard Expense" |
| `expenseType` | `VARCHAR(191) DEFAULT 'all'` | `all` / `expense` / `advance` / `conveyance` / `claim` |
| `autoApproveLimit` | `DOUBLE DEFAULT 0` | Amount ≤ this → auto-approve (Lakhs) |
| `level1Limit` | `DOUBLE` | Amount ≤ L1 → L1 approver (Lakhs) |
| `level1Role` | `VARCHAR(191)` | Role name / pattern |
| `level2Limit` | `DOUBLE?` | Amount ≤ L2 → L2 approver; NULL = no L2 |
| `level2Role` | `VARCHAR(191)?` | |
| `level3Limit` | `DOUBLE?` | Amount > L2 → L3 approver; NULL = no L3 |
| `level3Role` | `VARCHAR(191)?` | |
| `isActive` | `BOOLEAN DEFAULT TRUE` | |
| `createdAt` | `DATETIME(3)` | |

---

### ApprovalRequest — Per-Entity Approval Instance

| Column | MySQL Type | Notes |
|---|---|---|
| `id` | `INT AUTO_INCREMENT PK` | |
| `entityType` | `VARCHAR(191)` | `expense` / `claim` / `advance` / `conveyance` / `voucher` |
| `entityId` | `INT` | FK to the entity (polymorphic) |
| `policyId` | `INT?` | FK → ApprovalPolicy |
| `requestedById` | `INT` | FK → Employee |
| `currentLevel` | `INT DEFAULT 1` | Active approval level |
| `status` | `VARCHAR(191) DEFAULT 'pending'` | `pending` / `approved` / `rejected` / `auto_approved` |
| `level1ApproverId` | `INT?` | FK → Employee |
| `level1ApprovedAt` | `DATETIME(3)?` | |
| `level1Comments` | `TEXT DEFAULT ''` | |
| `level2ApproverId` | `INT?` | |
| `level2ApprovedAt` | `DATETIME(3)?` | |
| `level2Comments` | `TEXT DEFAULT ''` | |
| `level3ApproverId` | `INT?` | |
| `level3ApprovedAt` | `DATETIME(3)?` | |
| `level3Comments` | `TEXT DEFAULT ''` | |
| `rejectedAt` | `DATETIME(3)?` | |
| `rejectedById` | `INT?` | FK → Employee |
| `rejectionReason` | `TEXT DEFAULT ''` | |
| `createdAt` | `DATETIME(3)` | |
| `updatedAt` | `DATETIME(3) @updatedAt` | |

**Indexes:** `(entityType, entityId)`, `(requestedById)`, `(status)`, `(level1ApproverId)`, `(level2ApproverId)`

---

### EmployeeClaim — Expense Claim Batch

| Column | MySQL Type | Notes |
|---|---|---|
| `id` | `INT AUTO_INCREMENT PK` | |
| `claimNo` | `VARCHAR(191) UNIQUE` | `CI/CLM/26-27/00001` |
| `employeeId` | `INT` | FK → Employee |
| `claimDate` | `DATETIME(3) DEFAULT NOW()` | |
| `totalAmountLakhs` | `DOUBLE` | Sum of constituent expenses |
| `status` | `VARCHAR(191) DEFAULT 'draft'` | `draft` / `submitted` / `approved` / `rejected` / `paid` |
| `approvalId` | `INT? UNIQUE` | FK → ApprovalRequest |
| `paidDate` | `DATETIME(3)?` | |
| `paidAmountLakhs` | `DOUBLE?` | Actual amount paid |
| `remarks` | `TEXT DEFAULT ''` | |
| `createdAt` | `DATETIME(3)` | |
| `updatedAt` | `DATETIME(3) @updatedAt` | |

**Indexes:** `(employeeId)`, `(status)`, `(claimDate)`

---

### EmployeeAdvance — Advance Request & Disbursement

| Column | MySQL Type | Notes |
|---|---|---|
| `id` | `INT AUTO_INCREMENT PK` | |
| `advanceNo` | `VARCHAR(191) UNIQUE` | `CI/ADV/26-27/00001` |
| `employeeId` | `INT` | FK → Employee |
| `purpose` | `TEXT` | Required |
| `amountLakhs` | `DOUBLE` | Requested amount |
| `requestDate` | `DATETIME(3) DEFAULT NOW()` | |
| `requiredByDate` | `DATETIME(3)?` | When employee needs it |
| `status` | `VARCHAR(191) DEFAULT 'pending'` | `pending` / `approved` / `disbursed` / `settled` / `rejected` |
| `approvalId` | `INT? UNIQUE` | FK → ApprovalRequest |
| `disbursedDate` | `DATETIME(3)?` | |
| `disbursedAmountLakhs` | `DOUBLE?` | Actual amount disbursed |
| `disbursedFromAccountId` | `INT?` | FK → CashAccount or BankAccount (polymorphic) |
| `disbursedFromType` | `VARCHAR(20)?` | `cash` / `bank` |
| `settledDate` | `DATETIME(3)?` | |
| `settledAmountLakhs` | `DOUBLE?` | |
| `balanceLakhs` | `DOUBLE DEFAULT 0` | **Cached**: disbursed − settled |
| `remarks` | `TEXT DEFAULT ''` | |
| `createdAt` | `DATETIME(3)` | |
| `updatedAt` | `DATETIME(3) @updatedAt` | |

**Indexes:** `(employeeId)`, `(status)`, `(requestDate)`

---

### HRExpensePolicy — HR Expense Policy Rules

| Column | MySQL Type | Notes |
|---|---|---|
| `id` | `INT AUTO_INCREMENT PK` | |
| `name` | `VARCHAR(191)` | e.g. "Standard", "Manager Grade" |
| `rolePattern` | `VARCHAR(191) DEFAULT 'all'` | Role name pattern; `all` = default |
| `perDiemTier1Lakhs` | `DOUBLE DEFAULT 0` | Metro daily allowance (Lakhs) |
| `perDiemTier2Lakhs` | `DOUBLE DEFAULT 0` | Non-metro daily allowance |
| `mealLimitLakhs` | `DOUBLE DEFAULT 0` | Per-meal cap |
| `hotelTier1Lakhs` | `DOUBLE DEFAULT 0` | Hotel per night, metro |
| `hotelTier2Lakhs` | `DOUBLE DEFAULT 0` | Hotel per night, non-metro |
| `bikeRatePerKm` | `DOUBLE DEFAULT 2.0` | ₹ per KM (not Lakhs) |
| `carRatePerKm` | `DOUBLE DEFAULT 7.0` | ₹ per KM |
| `autoRatePerKm` | `DOUBLE DEFAULT 0` | ₹ per KM |
| `maxConveyanceDayRupees` | `DOUBLE DEFAULT 0` | Daily conveyance cap (₹); 0 = no cap |
| `isActive` | `BOOLEAN DEFAULT TRUE` | |
| `effectiveFrom` | `DATETIME(3) DEFAULT NOW()` | |
| `createdAt` | `DATETIME(3)` | |

**Indexes:** `(isActive)`, `(effectiveFrom)`

---

### ConveyanceLog — Local Conveyance Entries

| Column | MySQL Type | Notes |
|---|---|---|
| `id` | `INT AUTO_INCREMENT PK` | |
| `employeeId` | `INT` | FK → Employee |
| `travelDate` | `DATETIME(3)` | |
| `fromLocation` | `TEXT` | Address / place name |
| `toLocation` | `TEXT` | |
| `fromLat` | `DOUBLE?` | GPS latitude (start) |
| `fromLng` | `DOUBLE?` | GPS longitude (start) |
| `toLat` | `DOUBLE?` | GPS latitude (end) |
| `toLng` | `DOUBLE?` | GPS longitude (end) |
| `distanceKm` | `DOUBLE` | Road distance from Maps API or manual entry |
| `mode` | `VARCHAR(50)` | `bike` / `car` / `auto` / `public` |
| `ratePerKm` | `DOUBLE` | ₹ per KM (from HR Policy at time of entry) |
| `amountRupees` | `DOUBLE` | `distanceKm × ratePerKm` |
| `amountLakhs` | `DOUBLE` | `amountRupees / 100000` |
| `purpose` | `TEXT DEFAULT ''` | |
| `status` | `VARCHAR(191) DEFAULT 'draft'` | `draft` / `submitted` / `approved` / `rejected` / `paid` |
| `expenseId` | `INT? UNIQUE` | FK → ExpenseEntry (auto-created) |
| `approvalId` | `INT?` | FK → ApprovalRequest |
| `createdAt` | `DATETIME(3)` | |
| `updatedAt` | `DATETIME(3) @updatedAt` | |

**Indexes:** `(employeeId)`, `(travelDate)`, `(status)`

---

## Table Summary

| Table | Purpose |
|---|---|
| `CashAccount` | Cash account master (HO + branches) |
| `CashEntry` | Cash book entries |
| `BankAccount` | Bank account master |
| `BankEntry` | Bank book entries |
| `Vendor` | Vendor / supplier master |
| `ExpenseCategory` | Expense category master |
| `ExpenseEntry` | Expense register (all expenses) |
| `ExpenseAttachment` | File attachments on expenses |
| `VoucherSequence` | Per-FY auto-increment sequence for voucher numbers |
| `Voucher` | Voucher register |
| `ApprovalPolicy` | Approval rule configuration |
| `ApprovalRequest` | Per-entity approval workflow instance |
| `EmployeeClaim` | Employee expense claim batches |
| `EmployeeAdvance` | Employee advance requests and disbursements |
| `HRExpensePolicy` | HR expense entitlement rules |
| `ConveyanceLog` | Local conveyance with GPS coordinates |
| `Collection` | Invoice master (existing) |
| `Payment` | Payment ledger (existing) |
| `OrderAdvance` | Customer order advances (existing) |
| `Notification` | In-app notifications (existing, shared) |
