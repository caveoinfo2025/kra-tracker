# Finance Operations Module — Architecture

> **Status: APPROVED FINAL SCOPE**
> Stack: Next.js 16 App Router · Prisma 7 · MySQL 8-compatible (MariaDB 11.8)
> See `docs/ARCHITECTURE.md` for the full project-level stack.

---

## 1. Module Boundaries

```
src/
  app/
    finance/                        ← Finance hub (new top-level route)
      cash-book/                    ← Cash Book register
      bank-book/                    ← Bank Book register
      expenses/                     ← Expense Register
      vendors/                      ← Vendor Master
      vouchers/                     ← Voucher Register + PDF view
      approvals/                    ← Approval queue (approver view)
      claims/                       ← Employee Claims
      advances/                     ← Employee Advances
      hr-policy/                    ← HR Expense Policy (admin)
      conveyance/                   ← Local Conveyance log
      profitability/                ← Customer Profitability
      reports/                      ← Reports Dashboard
    collections/                    ← Invoice CRUD (existing Phase 0)
    accounts/                       ← Accounts dashboard (existing Phase 0)
    api/
      finance/
        cash-book/                  ← CashAccount + CashEntry
        bank-book/                  ← BankAccount + BankEntry
        expenses/                   ← ExpenseEntry + attachments
        vendors/                    ← Vendor CRUD
        vouchers/                   ← Voucher generation + PDF
        approvals/                  ← Approval workflow actions
        claims/                     ← EmployeeClaim CRUD
        advances/                   ← EmployeeAdvance CRUD
        hr-policy/                  ← HRExpensePolicy CRUD
        conveyance/                 ← ConveyanceLog + GPS
        profitability/              ← Customer profitability query
        reports/                    ← Aggregated report endpoints
        export/                     ← Excel / PDF / Tally XML exports
      collections/                  ← Existing
      payments/                     ← Existing
      advances/ (old)               ← Existing OrderAdvance (not the same as EmployeeAdvance)
  lib/
    finance/
      cash-book.ts                  ← CashBook service (balance enforcement)
      bank-book.ts                  ← BankBook service (reconciliation)
      voucher.ts                    ← Voucher numbering + PDF generation
      approval-engine.ts            ← Approval workflow state machine
      conveyance.ts                 ← GPS distance + rate calculation
      profitability.ts              ← Customer profitability aggregation
      tally-xml.ts                  ← Tally XML builder (all entity types)
      excel-export.ts               ← Excel .xlsx builder (via exceljs)
      pdf-report.ts                 ← PDF builder (via @react-pdf/renderer or puppeteer)
    payments.ts                     ← Existing (collections payments)
    roles.ts                        ← Existing role predicates
  components/
    finance/
      VoucherPDFPreview.tsx         ← PDF preview component
      ApprovalBadge.tsx             ← Status badge with approval history
      AttachmentUpload.tsx          ← File capture (camera + file picker)
      ConveyanceMapPicker.tsx       ← Google Maps start/end location picker
      AmountInWords.tsx             ← Amount → Indian number words helper
  app/mobile/
    screens/
      ExpenseEntryScreen.tsx        ← Mobile expense form
      ConveyanceScreen.tsx          ← Mobile conveyance logger
      ApprovalsScreen.tsx           ← Mobile approval queue
      CollectionsScreen.tsx         ← Existing (read-only invoices)
```

---

## 2. Data Flow Patterns

### 2.1 Recording a Cash Entry (with balance enforcement)

```
Client → POST /api/finance/cash-book/entries
  │
  └─ cash-book.ts :: createCashEntry(input)
       ├─ prisma.$transaction(async tx => {
       │    const account = await tx.cashAccount.findUnique({ ... }) // lock row
       │    const balance = account.currentBalance
       │    if (type === "payment" && balance - amount < 0)
       │      throw new Error("Insufficient cash balance")
       │    const entry = await tx.cashEntry.create({ ... })
       │    await tx.cashAccount.update({ currentBalance: balance ± amount })
       │    if (linkedBankAccountId) await createPairedBankEntry(tx, ...)
       │    return entry
       │  })
       └─ return entry
```

### 2.2 Expense Submission → Approval → Voucher

```
Employee submits expense
  → POST /api/finance/expenses  (status: "draft")
  → POST /api/finance/expenses/[id]/submit
       └─ approval-engine.ts :: createApprovalRequest(entityType:"expense", entityId, amount)
            ├─ Read ApprovalPolicy for expense type + amount
            ├─ If amount < L1 threshold → auto-approve (status: "approved")
            ├─ Else → create ApprovalRequest (status: "pending", level: 1)
            └─ Notify level-1 approver via Notification

Approver actions
  → POST /api/finance/approvals/[id]/approve  { level, comments }
       └─ approval-engine.ts :: advanceApproval(...)
            ├─ Record approval at current level (timestamp + approver)
            ├─ If all required levels done → mark "approved"
            │    └─ voucher.ts :: generateVoucher(type:"expense", entityId)
            │         ├─ auto-assign voucher number (CI/YY-YY/NNNNN)
            │         └─ update ExpenseEntry.voucherId
            └─ Else → notify next level approver
```

### 2.3 Local Conveyance → GPS → Rate → Expense

```
Mobile: employee opens ConveyanceScreen
  → GPS capture: navigator.geolocation (from / to)
  → Google Maps Distance Matrix API: road distance (km)
  → GET /api/finance/hr-policy/me → bikeRatePerKm / carRatePerKm
  → amount = distanceKm × ratePerKm  (auto-calculated)
  → POST /api/finance/conveyance
       └─ conveyance.ts :: createConveyanceLog(input)
            ├─ Enforce daily cap from HR Policy
            ├─ Create ConveyanceLog row
            └─ Create linked ExpenseEntry (category: "Conveyance")
  → Submit for approval via Approval Engine
```

### 2.4 Voucher Number Generation (atomic)

```
voucher.ts :: nextVoucherNumber(financialYear)
  └─ prisma.$transaction(async tx => {
       const seq = await tx.voucherSequence.update({
         where: { financialYear },
         data: { lastNumber: { increment: 1 } },
       })
       return `CI/${seq.financialYear}/${String(seq.lastNumber).padStart(5, "0")}`
     })
```

A dedicated `VoucherSequence` table (one row per financial year) ensures the
counter increments atomically under concurrent requests.

### 2.5 Export Pipeline

```
GET /api/finance/export?type=cash-book&format=excel&from=...&to=...
  │
  └─ excel-export.ts | tally-xml.ts | pdf-report.ts
       ├─ Fetch data from Prisma
       ├─ Build the format-specific document
       └─ Return Response with appropriate Content-Type + Content-Disposition
```

---

## 3. Service Layer — `src/lib/finance/`

| File | Responsibility |
|---|---|
| `cash-book.ts` | `createCashEntry`, `getCashBalance`, balance enforcement (no-negative rule), paired bank entry creation |
| `bank-book.ts` | `createBankEntry`, `reconcileEntry`, paired cash entry creation |
| `voucher.ts` | `nextVoucherNumber` (atomic), `generateVoucherPDF`, `voidVoucher` |
| `approval-engine.ts` | `createApprovalRequest`, `advanceApproval`, `rejectApproval`, policy resolution, notification dispatch |
| `conveyance.ts` | `createConveyanceLog`, Google Maps Distance Matrix call, HR Policy rate lookup, daily cap enforcement |
| `profitability.ts` | `getCustomerProfitability` — joins Collections + ExpenseEntry by customerName |
| `tally-xml.ts` | Builds Tally-compatible XML for all entity types (cash, bank, expenses, invoices, payments) |
| `excel-export.ts` | Builds `.xlsx` files via `exceljs` for all report types |
| `pdf-report.ts` | Builds PDF reports and voucher PDFs |

---

## 4. Role Gates (expanded)

All gates remain in `src/lib/roles.ts`. New predicates to add:

| Predicate | Who passes | Used by |
|---|---|---|
| `canSeeAllCollections(user)` | Manager, Accounts, Ops Head | Existing |
| `canManagePayments(user)` | Manager, Accounts, Ops Head | Existing |
| `canManageFinance(user)` | Manager, Accounts, Ops Head | All new finance write routes |
| `canApprove(user)` | Manager, Ops Head + any employee in an approver role | Approval action routes |
| `canManageVendors(user)` | Manager, Accounts, Ops Head | Vendor CRUD |
| `canManagePolicy(user)` | Manager only | HR Policy + Approval Policy config |
| `canViewReports(user)` | Manager, Accounts, Ops Head | Reports Dashboard |

---

## 5. Third-Party Dependencies

| Library | Purpose | Already in project |
|---|---|---|
| `exceljs` | Generate `.xlsx` files | No — add |
| `@react-pdf/renderer` or `puppeteer` | Generate PDFs server-side | No — add |
| Google Maps Distance Matrix API | Road distance calculation for conveyance | No — add |
| Google Maps JS API | Conveyance map picker (web) | No — add |
| Cloud storage (Cloudflare R2 / AWS S3) | Expense attachment storage | No — add |
| `@aws-sdk/client-s3` or `@cloudflare/r2` | Upload to cloud storage | No — add |

---

## 6. Key Architecture Decisions

| Decision | Rationale |
|---|---|
| All finance writes use `prisma.$transaction` | MySQL allows concurrent connections; balance updates and voucher sequences must be atomic |
| Voucher sequence in a dedicated table (`VoucherSequence`) | `AUTO_INCREMENT` resets are risky; a locked-increment on a single row is safer and allows per-year sequences |
| Conveyance rate from HR Policy, not hard-coded | Rates change; reading from policy at entry time ensures the rate at the time of travel is recorded |
| File attachments stored in cloud storage, URL in DB | Avoids large blobs in MySQL; supports mobile direct-upload |
| Tally ledger names configurable in AppSetting | Ledger names differ per Tally company file; must not be hard-coded |
| `customerId` on ExpenseEntry is denormalized (customerName string) | Consistent with how Collections works; avoids FK to Customer master which has its own import/dedupe lifecycle |
| PDF generation is server-side | Consistent page layout, no browser font/print issues; required for Tally compatibility |
