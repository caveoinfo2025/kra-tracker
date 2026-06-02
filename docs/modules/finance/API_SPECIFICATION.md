# Finance Operations Module — API Specification

> **Status: APPROVED FINAL SCOPE**
> Base path: `/api/finance/`
> Auth: every route calls `getSession()` → `401` if no session.
> Role gates use `src/lib/roles.ts`. Finance writes require `canManageFinance(user)`.
> Money values are in **₹ Lakhs** (`Float`) unless stated otherwise.

---

## Conventions

| Pattern | Description |
|---|---|
| `GET /api/finance/X` | List or fetch |
| `POST /api/finance/X` | Create |
| `PUT /api/finance/X/[id]` | Update |
| `DELETE /api/finance/X/[id]` | Delete (soft where applicable) |
| `POST /api/finance/X/[id]/action` | State-change actions (submit, approve, void, etc.) |

Error shape: `{ "error": "message" }` with status `400` / `401` / `403` / `404` / `422` / `500`.

---

## 1. Cash Book API

### `GET /api/finance/cash-book/accounts`
List all cash accounts.
**Access:** Finance roles.
**Response:** `CashAccount[]`

### `POST /api/finance/cash-book/accounts`
Create a cash account.
**Access:** Finance roles.
**Body:** `{ name, branchName?, openingBalance? }`
**Response:** `201 CashAccount`

### `GET /api/finance/cash-book/entries?accountId=&from=&to=`
List cash entries for an account and date range.
**Query:** `accountId` (required), `from` (YYYY-MM-DD), `to` (YYYY-MM-DD)
**Response:** `{ account: CashAccount, entries: CashEntry[], openingBalance: number, closingBalance: number }`

### `POST /api/finance/cash-book/entries`
Record a cash entry.
**Access:** Finance roles.
**Body:**
```json
{
  "cashAccountId": 1,
  "entryDate": "2026-06-10",
  "type": "payment",
  "amountLakhs": 0.5,
  "narration": "Office supplies purchase",
  "linkedBankAccountId": null
}
```
**Side effects:** Updates `CashAccount.currentBalance`. Rejects if balance would go negative. Creates paired `BankEntry` if `linkedBankAccountId` is set.
**Response:** `201 CashEntry`

---

## 2. Bank Book API

### `GET /api/finance/bank-book/accounts`
List all bank accounts.
**Response:** `BankAccount[]`

### `POST /api/finance/bank-book/accounts`
Create a bank account.
**Body:** `{ bankName, accountNo, ifscCode?, accountHolder, openingBalance? }`
**Response:** `201 BankAccount`

### `GET /api/finance/bank-book/entries?accountId=&from=&to=&reconciled=`
List bank entries.
**Query:** `accountId` (required), `from`, `to`, `reconciled` (`true`/`false`/omit for all)
**Response:** `{ account: BankAccount, entries: BankEntry[], openingBalance, closingBalance }`

### `POST /api/finance/bank-book/entries`
Record a bank entry.
**Body:**
```json
{
  "bankAccountId": 1,
  "entryDate": "2026-06-10",
  "type": "upi",
  "direction": "debit",
  "amountLakhs": 1.2,
  "narration": "Vendor payment — ABC Supplies",
  "referenceNo": "UTR123456789",
  "payee": "ABC Supplies"
}
```
**Response:** `201 BankEntry`

### `POST /api/finance/bank-book/entries/[id]/reconcile`
Mark an entry as reconciled.
**Body:** `{}` (no body needed)
**Response:** `200 BankEntry`

---

## 3. Vendor Master API

### `GET /api/finance/vendors?q=&active=`
List / search vendors.
**Query:** `q` (name contains), `active` (`true` / `false`)
**Response:** `Vendor[]`

### `POST /api/finance/vendors`
Create a vendor.
**Body:** `{ name, gstin?, pan?, address?, city?, state?, pincode?, contactName?, contactPhone?, contactEmail?, bankName?, bankAccountNo?, ifscCode?, paymentTerms? }`
**Response:** `201 Vendor`

### `PUT /api/finance/vendors/[id]`
Update vendor.
**Response:** `200 Vendor`

### `DELETE /api/finance/vendors/[id]`
Deactivate vendor (sets `isActive = false`). Hard delete blocked if linked expenses exist.
**Response:** `200 { success: true }`

### `GET /api/finance/vendors/[id]/expenses?from=&to=`
Expenses linked to this vendor.
**Response:** `ExpenseEntry[]`

---

## 4. Expense Register API

### `GET /api/finance/expenses?employeeId=&categoryId=&status=&from=&to=&customer=`
List expenses. Finance roles see all; employees see own.
**Response:** `ExpenseEntry[]` with `category`, `vendor`, `employee`, `attachments`

### `POST /api/finance/expenses`
Create an expense (draft).
**Body:**
```json
{
  "categoryId": 3,
  "vendorId": 7,
  "customerName": "Infosys Ltd",
  "expenseDate": "2026-06-10",
  "amountLakhs": 0.25,
  "gstRate": 18,
  "narration": "Client entertainment — lunch",
  "vendorInvoiceNo": "REST-2026-042"
}
```
**Response:** `201 ExpenseEntry`

### `PUT /api/finance/expenses/[id]`
Update a draft expense.
**Access:** Own draft only (or finance roles for any draft).
**Response:** `200 ExpenseEntry`

### `DELETE /api/finance/expenses/[id]`
Delete a draft expense.
**Access:** Own draft only (or finance roles).
**Response:** `200 { success: true }`

### `POST /api/finance/expenses/[id]/submit`
Submit expense for approval.
**Side effects:** Creates `ApprovalRequest`; sends notification to approver(s).
**Response:** `200 { expense: ExpenseEntry, approval: ApprovalRequest }`

### `POST /api/finance/expenses/[id]/attachments`
Upload an attachment.
**Content-Type:** `multipart/form-data`
**Body:** `file` (field name)
**Side effects:** Uploads to cloud storage; creates `ExpenseAttachment` row.
**Response:** `201 ExpenseAttachment`

### `DELETE /api/finance/expenses/[id]/attachments/[attachmentId]`
Remove an attachment.
**Response:** `200 { success: true }`

### `GET /api/finance/expense-categories`
List all active expense categories.
**Response:** `ExpenseCategory[]`

### `POST /api/finance/expense-categories`
Create a category.
**Access:** Finance roles.
**Body:** `{ name, code, gstApplicable?, tallyLedger?, sortOrder? }`
**Response:** `201 ExpenseCategory`

---

## 5. Voucher API

### `GET /api/finance/vouchers?type=&from=&to=&status=`
List vouchers.
**Access:** Finance roles.
**Response:** `Voucher[]`

### `GET /api/finance/vouchers/[id]`
Fetch a single voucher with full detail.
**Response:** `Voucher` with linked entries

### `POST /api/finance/vouchers/[id]/pdf`
Generate (or regenerate) PDF for a voucher.
**Side effects:** Generates PDF, uploads to cloud, stores URL in `Voucher.pdfUrl`.
**Response:** `200 { pdfUrl: string }`

### `POST /api/finance/vouchers/[id]/void`
Void a voucher.
**Access:** Finance roles.
**Body:** `{ reason: string }`
**Response:** `200 Voucher`

---

## 6. Approval Engine API

### `GET /api/finance/approvals?status=&entityType=&myQueue=`
List approval requests.
**Query:** `status` (`pending`/`approved`/`rejected`), `entityType`, `myQueue` (`true` = only requests where I am the next approver)
**Access:** Finance roles see all. Others see own requests.
**Response:** `ApprovalRequest[]`

### `POST /api/finance/approvals/[id]/approve`
Approve at the current level.
**Body:** `{ level: 1|2|3, comments?: string }`
**Side effects:** Advances approval to next level or marks `approved`. On full approval: triggers entity state change + voucher generation + notification.
**Response:** `200 ApprovalRequest`

### `POST /api/finance/approvals/[id]/reject`
Reject the request.
**Body:** `{ reason: string }`
**Side effects:** Marks entity status `rejected`; notifies submitter.
**Response:** `200 ApprovalRequest`

### `GET /api/finance/approvals/policies`
List approval policies.
**Access:** Finance roles.
**Response:** `ApprovalPolicy[]`

### `POST /api/finance/approvals/policies`
Create an approval policy.
**Access:** Managers only (`canManagePolicy`).
**Body:** `{ name, expenseType, autoApproveLimit, level1Limit, level1Role, level2Limit?, level2Role?, level3Limit?, level3Role? }`
**Response:** `201 ApprovalPolicy`

### `PUT /api/finance/approvals/policies/[id]`
Update a policy.
**Response:** `200 ApprovalPolicy`

---

## 7. Employee Claims API

### `GET /api/finance/claims?employeeId=&status=`
List claims. Finance roles see all; employees see own.
**Response:** `EmployeeClaim[]` with `entries`, `approval`

### `POST /api/finance/claims`
Create a claim from a list of expense entry IDs.
**Body:** `{ expenseIds: number[], remarks?: string }`
**Side effects:** Sets `ExpenseEntry.claimId` for all included entries; computes `totalAmountLakhs`.
**Response:** `201 EmployeeClaim`

### `POST /api/finance/claims/[id]/submit`
Submit claim for approval.
**Side effects:** Creates `ApprovalRequest`; notifies approver.
**Response:** `200 { claim: EmployeeClaim, approval: ApprovalRequest }`

### `POST /api/finance/claims/[id]/pay`
Record claim payment.
**Access:** Finance roles.
**Body:** `{ paidDate: string, paidAmountLakhs: number }`
**Side effects:** Sets status `paid`, generates payment voucher.
**Response:** `200 EmployeeClaim`

---

## 8. Employee Advance API

### `GET /api/finance/advances/employee?employeeId=&status=`
List employee advances (not the same as `OrderAdvance` for customers).
**Response:** `EmployeeAdvance[]`

### `POST /api/finance/advances/employee`
Request an advance.
**Body:** `{ purpose, amountLakhs, requiredByDate? }`
**Response:** `201 EmployeeAdvance`

### `POST /api/finance/advances/employee/[id]/submit`
Submit advance request for approval.
**Response:** `200 { advance: EmployeeAdvance, approval: ApprovalRequest }`

### `POST /api/finance/advances/employee/[id]/disburse`
Record disbursement.
**Access:** Finance roles.
**Body:** `{ disbursedDate: string, disbursedAmountLakhs: number, fromType: "cash"|"bank", fromId: number }`
**Side effects:** Sets status `disbursed`; generates advance voucher; deducts from cash/bank account.
**Response:** `200 EmployeeAdvance`

### `POST /api/finance/advances/employee/[id]/settle`
Settle advance against expenses.
**Body:** `{ settledAmountLakhs: number, expenseIds?: number[] }`
**Side effects:** Updates `balanceLakhs`; if fully settled, sets status `settled`.
**Response:** `200 EmployeeAdvance`

---

## 9. HR Expense Policy API

### `GET /api/finance/hr-policy`
List all policies.
**Access:** Finance roles.
**Response:** `HRExpensePolicy[]`

### `GET /api/finance/hr-policy/me`
Get the active policy for the current session user (matched by role pattern).
**Response:** `HRExpensePolicy` (or the default policy if no specific match)

### `POST /api/finance/hr-policy`
Create a policy.
**Access:** Managers only.
**Body:** All `HRExpensePolicy` fields.
**Response:** `201 HRExpensePolicy`

### `PUT /api/finance/hr-policy/[id]`
Update a policy.
**Response:** `200 HRExpensePolicy`

---

## 10. Local Conveyance API

### `GET /api/finance/conveyance?employeeId=&from=&to=&status=`
List conveyance logs. Finance roles see all; employees see own.
**Response:** `ConveyanceLog[]` with `employee`

### `POST /api/finance/conveyance`
Log a conveyance trip.
**Body:**
```json
{
  "travelDate": "2026-06-10",
  "fromLocation": "Caveo Office, Bangalore",
  "toLocation": "Infosys Campus, Electronic City",
  "fromLat": 12.9716,
  "fromLng": 77.5946,
  "toLat": 12.8399,
  "toLng": 77.6770,
  "distanceKm": 18.4,
  "mode": "bike",
  "purpose": "Client meeting — Infosys account review"
}
```
**Side effects:**
- Reads HR Policy for `ratePerKm`.
- Enforces daily cap.
- Computes `amountRupees` and `amountLakhs`.
- Creates linked `ExpenseEntry` (category: Conveyance).
**Response:** `201 ConveyanceLog`

### `GET /api/finance/conveyance/distance`
Calculate road distance between two GPS coordinates via Google Maps Distance Matrix API.
**Query:** `fromLat=&fromLng=&toLat=&toLng=`
**Response:** `{ distanceKm: number, durationMinutes: number, mode: string }`

### `POST /api/finance/conveyance/[id]/submit`
Submit for approval.
**Response:** `200 { conveyance: ConveyanceLog, approval: ApprovalRequest }`

---

## 11. Customer Profitability API

### `GET /api/finance/profitability?from=&to=&sortBy=profit`
Aggregated customer profitability.
**Access:** Finance roles + managers.
**Query:** `from`, `to` (YYYY-MM-DD), `sortBy` (`profit`/`revenue`/`margin`)
**Response:**
```json
{
  "customers": [
    {
      "customerName": "Infosys Ltd",
      "revenueLakhs": 125.0,
      "costLakhs": 8.5,
      "grossProfitLakhs": 116.5,
      "grossMarginPct": 93.2,
      "invoiceCount": 5,
      "expenseCount": 3
    }
  ],
  "totals": { "revenueLakhs": 500, "costLakhs": 35, "grossProfitLakhs": 465, "grossMarginPct": 93.0 }
}
```

### `GET /api/finance/profitability/[customerName]?from=&to=`
Drill-down for a single customer.
**Response:** `{ customer, invoices: Collection[], expenses: ExpenseEntry[] }`

---

## 12. Reports API

### `GET /api/finance/reports/summary?from=&to=`
Finance dashboard KPI summary.
**Response:**
```json
{
  "cashBalance": 12.5,
  "bankBalance": 87.3,
  "collectionsToday": 5.0,
  "pendingApprovals": 4,
  "outstandingAdvances": 3,
  "overdueInvoices": 7,
  "overdueAmountLakhs": 45.2
}
```

### `GET /api/finance/reports/expense-summary?from=&to=&groupBy=category`
Expense breakdown.
**Query:** `groupBy` = `category` / `employee` / `vendor`
**Response:** `{ groups: [{ key, label, totalLakhs, count }] }`

---

## 13. Export API

### `GET /api/finance/export?type=&format=&from=&to=&employeeId=`

| `type` | Available `format` values |
|---|---|
| `cash-book` | `excel`, `pdf`, `tally` |
| `bank-book` | `excel`, `pdf`, `tally` |
| `expenses` | `excel`, `pdf`, `tally` |
| `vouchers` | `excel`, `pdf` |
| `collections` | `excel`, `pdf`, `tally` |
| `payments` | `excel`, `pdf`, `tally` |
| `claims` | `excel`, `pdf` |
| `conveyance` | `excel`, `pdf` |
| `profitability` | `excel`, `pdf` |

**Access:** Finance roles.
**Response:**
- `excel` → `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `pdf` → `Content-Type: application/pdf`
- `tally` → `Content-Type: application/xml`
- All: `Content-Disposition: attachment; filename="..."`

---

## Existing Finance API (Phase 0 — unchanged)

| Route | Description |
|---|---|
| `GET/POST /api/collections` | Invoice CRUD |
| `PUT/DELETE /api/collections/[id]` | Invoice edit/delete |
| `GET/POST /api/payments` | Payment ledger |
| `GET /api/payments/today` | Daily payment summary |
| `GET/POST /api/advances` | Customer order advances |
| `POST /api/advances/[id]/apply` | Apply advance to invoice |
| `GET/PATCH /api/notifications` | Notification feed |
