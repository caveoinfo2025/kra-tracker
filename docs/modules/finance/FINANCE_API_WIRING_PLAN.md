# Finance API Wiring Plan — Caveo CRM

> **Document status:** Step 2F complete — Expense Register UI wired to live read-only APIs. Write APIs pending (Step 2G+).
>
> **Prepared:** 2026-06-10 · Session 6 | **Updated:** 2026-06-14 · Session 11  
> **Purpose:** Safe implementation plan to wire Finance UI to real MySQL-backed APIs without breaking existing CRM modules.

---

## Step 2F Status — Completed 2026-06-14

### Files modified

| File | Change |
|---|---|
| `src/app/finance/expenses/data.ts` | Added `ApiExpenseSummary`, `ApiExpenseItem`, `ApiExpensePagination`, `ApiExpenseDetail`, `ApiApprovalEvent` interfaces + `lakhsToRupees()` helper |
| `src/app/finance/expenses/ExpenseRegisterClient.tsx` | Full rewrite — API fetch replacing mock data, debounced search, API pagination, feature-gated write buttons, detail drawer enrichment, loading/error/empty states |
| `src/app/finance/expenses/components/ExpenseTable.tsx` | Added optional `search`/`onSearch` controlled props + `apiPagination` prop for server-side pagination |

### Key implementation details

**Data flow:**
- `GET /api/finance/expenses?page=N&pageSize=25&…` → `ApiExpenseItem[]` → `mapApiExpenseItem()` → `Expense[]` (mock shape, for existing table/drawer compatibility)
- `GET /api/finance/expenses/[id]` → `ApiExpenseDetail` → enriches drawer with approval history + attachments
- Summary cards populated from `GET /api/finance/expenses` `data.summary` response (7 fields, ₹ Lakhs strings → `lakhsToRupees()` → ₹ rupees)

**Filter → API param mapping:**
| UI Filter | API Param | Notes |
|---|---|---|
| `dateFrom` / `dateTo` | `dateFrom` / `dateTo` | Direct pass |
| `status` (UI enum) | `status` (API: draft/submitted/…) | `uiStatusToApi()` maps |
| `category` | `category` | Direct pass |
| Table search input | `search` | 300ms debounce; maps to narration/category/customerName OR |
| `branch`, `department`, `type`, `paymentMode`, etc. | — | Not yet filterable server-side; silently ignored |

**Feature-gate pattern:**
```typescript
const WRITE_GATE_MSG = "This action will be enabled after Expense write APIs are implemented.";
// All write buttons: onClick={() => flash(WRITE_GATE_MSG)}
// Drawer: onEdit/onApprove/onReject all gate-toasted
// Table onBulk: (_a, _ids) => flash(WRITE_GATE_MSG)
```

**Money conversion:** API returns ₹ Lakhs as 2dp strings → `lakhsToRupees(s)` = `Number(s) × 100000` rounded to 2dp.

**Drawer enrichment:** row click shows drawer immediately (list-level data), then fires `GET /api/finance/expenses/[id]` in background and updates `approvalHistory` + `attachments` when it resolves. Errors are silently swallowed (drawer stays open with partial data).

**Build validation:** `npx tsc --noEmit` clean + `npx prisma validate` clean + `npx next build` clean (2026-06-14).

### Constraints respected
- No schema changes, no migrations
- No POST/PATCH/DELETE APIs created
- Mobile `GET /api/expenses` untouched
- Mock data files (`data.ts` `EXPENSES` array) kept — still referenced by `ExpenseForm` and Categories module

---

## Step 2E Status — Completed 2026-06-14

### Files created

| File | Change |
|---|---|
| `src/app/api/finance/expenses/route.ts` | New — read-only Expense Register list API with summary |
| `src/app/api/finance/expenses/[id]/route.ts` | New — read-only Expense detail API |

### Prisma models used

| Model | Purpose |
|---|---|
| `Expense` | Primary expense records with filters, pagination, and aggregations |
| `Employee` | Creator name via `Expense.employee` include |
| `Vendor` | Vendor name and GSTIN via `Expense.vendor` include |
| `Voucher` | Voucher number and status via `Expense.voucher` include |
| `ApprovalRequest` / `ApprovalAction` | Approval timeline in detail endpoint |
| `AuditLog` | Audit trail in detail endpoint |

### Permission check

`canManageFinance(session.user)` → all expenses; regular employee → own only (same RBAC as `/api/expenses` mobile route).

### Existing mobile route preserved

`GET /api/expenses` and `POST /api/expenses` are unchanged. The new routes live in `/api/finance/expenses/*` namespace.

### Money handling

`fmtMoney(v)` = `(Math.round(v * 100) / 100).toFixed(2)` — same helper as Bank Book and Cash Book routes. `r2(v)` for intermediate arithmetic. All values returned as 2-decimal strings in ₹ Lakhs.

### Schema limitations (documented, not blocking)

| Field | Status |
|---|---|
| `paymentMode` | Not in `Expense` model yet — returned as `null` |
| `finAccountId` / `accountName` | Not in `Expense` model yet — returned as `null` |
| `subCategory` | Not in `Expense` model — returned as `null` |
| `claimReference` | Not in `Expense` model — returned as `null` in employee block |
| GST split (CGST/SGST/IGST) | Schema stores total `gstAmountLakhs` only — `cgst`/`sgst`/`igst` returned as `"0.00"` |

### `expenseType` derivation (no schema field)

| Condition | Returned value |
|---|---|
| `customerName != ""` | `CUSTOMER_EXPENSE` |
| `vendorId != null` | `VENDOR_EXPENSE` |
| default | `GENERAL_EXPENSE` |

### Summary fields

| Field | Source |
|---|---|
| `totalExpenses` | sum `amountLakhs + gstAmountLakhs` in scope |
| `todayExpenses` | same, filtered to today (UTC) |
| `pendingApprovalAmount` | status = `submitted` |
| `approvedExpenses` | status in `approved`, `paid` |
| `employeeClaimsPending` | `pendingApprovalAmount` + sum of `draft` records (best-effort — no expenseType in schema) |
| `customerExpenses` | `customerName != ""` |
| `gstInputAmount` | sum `gstAmountLakhs` where `> 0` |

### Validation results

| Check | Result |
|---|---|
| `npx prisma validate` | ✅ Schema valid |
| `npm run build` (TS + compile) | ✅ Exit 0 — both routes compiled to `.next/server/app/api/finance/expenses/` |

### Next step: Step 2F — Wire Expense Register UI to live APIs

---

## Step 2C Status — Completed 2026-06-12

### File created

| File | Change |
|---|---|
| `src/app/api/finance/cash-book/route.ts` | New — read-only Cash Book API |

### Prisma models used

| Model | Purpose |
|---|---|
| `FinAccount` | Cash account list, opening/current balance, `type = "cash"` filter |
| `Ledger` | Cash ledger entries, running balance computation |
| `Voucher` | Voucher number via `Ledger.voucher` include |
| `Employee` | Creator name via `Ledger.recordedBy` include |

### Permission check

`canManageFinance(session.user)` — same gate as Bank Book and Accounts APIs.

### Decimal handling

`fmtMoney(v)` = `(Math.round(v * 100) / 100).toFixed(2)` — same helper as Bank Book route. No Decimal type migration needed (schema uses `Float → DOUBLE`).

### Cash Book accounting convention

| Ledger direction | Physical cash | Display column |
|---|---|---|
| `"credit"` | Cash arriving (Cash In) | **Debit** |
| `"debit"` | Cash departing (Cash Out) | **Credit** |

Running balance: `opening + Σ(credit) − Σ(debit)` — same formula as Bank Book.

### Assumptions

1. `Ledger.payee` holds the counter-party name. When direction = "credit" (cash in), payee is returned as `customerName`; when direction = "debit" (cash out), as `vendorName`. No separate Customer/Vendor FK exists on Ledger.
2. `expenseCategory` param: Ledger has no category FK — filter applied against `narration` as best-effort text match.
3. `customerId` / `vendorId` params: accepted but silently ignored (no FK on Ledger).
4. `physicalCashBalance` and `lastReconciledAt` returned as `null` — no physical count or aggregate reconciliation fields in the schema.
5. `status` in the transaction response: `"POSTED"` when reconciled, `"UNRECONCILED"` otherwise (matching the Cash Book UI's expected status values).

### Validation results

| Check | Result |
|---|---|
| `npx next build` (TS + compile) | ✅ Exit 0 — route compiled to `.next/server/app/api/finance/cash-book/` |
| `npx prisma validate` | ✅ Schema valid |
| Curl tests | ⚠️ Dev DB unreachable at test time (IP `122.164.85.187` not whitelisted in Hostinger Remote MySQL). Fix: hPanel → Databases → Remote MySQL → add IP. |

---

## Step 2D Status — Completed 2026-06-12

### Files changed

| File | Change |
|---|---|
| `src/app/finance/cash-book/data.ts` | Added `ApiCashAccount`, `ApiCashTransaction`, `ApiCashSummary` interfaces; re-exported `lakhsToRupees`, `fmtINRfromLakhs`, `ApiPagination` from bank-book/data; added `mapApiCashAccount`, `mapApiCashTransaction` helpers. Mock arrays kept intact. |
| `src/app/finance/cash-book/CashBookClient.tsx` | Full rewrite: fetches accounts from `GET /api/finance/accounts?type=CASH`, transactions from `GET /api/finance/cash-book`. Loading skeletons, error + retry, empty states, debounced search. All 5 write buttons (`Cash In`, `Cash Expense`, `Transfer From Bank`, `Deposit To Bank`, `Cash Adjustment`) feature-gated with toast. `CashEntryForm` and `doTransfer` kept intact for Step 2H. |
| `src/app/finance/cash-book/components/CashSummaryPanel.tsx` | Added `apiSummary?: ApiCashSummary` prop; shows 4-tile API summary (Opening, Cash In, Cash Out, Closing) when present; falls back to mock-computed 3-period summary otherwise. |
| `src/app/finance/cash-book/components/CashTransactionTable.tsx` | Added `CashApiPaginationControls` export; controlled `search`/`onSearch` props; external `apiPagination` controls; local pagination retained as fallback. |
| `src/app/finance/cash-book/components/CashTransactionDrawer.tsx` | Removed `CASH_ACCOUNTS` import; added `accountName?: string` prop; falls back to `txn.accountId` if not provided. |

### Filter → API param mapping

| Filter field | API param |
|---|---|
| `accountId` | `accountId` |
| `dateFrom` / `dateTo` | `dateFrom` / `dateTo` |
| `branch` | `branchId` |
| `txnType` | `transactionType` (lowercased, spaces→underscores) |
| `category` | `expenseCategory` |
| `approval` (Approved/Pending) | `status` (RECONCILED/UNRECONCILED) |
| `customer` / `vendor` / `employee` | `search` (best-effort text match on Ledger fields) |
| `searchQuery` (table search) | `search` (takes priority) |

### Feature gates (write actions pending Step 2H)

`Cash In`, `Cash Expense`, `Transfer From Bank`, `Deposit To Bank`, `Cash Adjustment` show toast: _"This action will be enabled after Cash Book write APIs are implemented."_

### Validation results

| Check | Result |
|---|---|
| `npx next build` (TS + compile) | ✅ Exit 0 — `/finance/cash-book` compiled successfully |
| `npx prisma validate` | ✅ Schema valid |

---

## Step 2B Status — Completed 2026-06-11

### Files changed

| File | Change |
|---|---|
| `src/app/finance/bank-book/data.ts` | Added `ApiAccount`, `ApiTransaction`, `ApiSummary`, `ApiPagination` interfaces + `fmtINRfromLakhs`, `lakhsToRupees`, `mapApiBankAccount`, `mapApiTransaction` helpers. Mock arrays kept intact. |
| `src/app/finance/bank-book/BankBookClient.tsx` | Full rewrite: fetches accounts from `GET /api/finance/accounts?type=BANK`, transactions from `GET /api/finance/bank-book`. Loading skeletons, error states with Retry, empty states. Write actions (Add Entry, Transfer, Import) gated with toast. |
| `src/app/finance/bank-book/components/BankTransactionTable.tsx` | Controlled `search`/`onSearch` props; external `apiPagination` controls; removed internal sub-pagination. |
| `src/app/finance/bank-book/components/BankTransactionDrawer.tsx` | Removed `BANK_ACCOUNTS` import; added `accountName?: string` prop. |
| `src/app/finance/bank-book/components/BankSummaryPanel.tsx` | Added `apiSummary?: ApiSummary` prop; falls back to mock-computed summary when not present. |

### Validation results

| Check | Result |
|---|---|
| `npm run build` | ✅ Exit 0 — all routes compiled |
| `npx prisma validate` | ✅ Schema valid |

### Feature gates (write actions pending Step 2H)

`Add Bank Entry`, `Transfer Funds`, `Import Bank Statement` show toast: _"This action will be enabled after Bank Book write APIs are implemented."_ The underlying form components (`AddEntryForm`, `TransferForm`, `BankImportWizard`) are kept in the file for Step 2H wiring.

### Next step: Step 2C — Cash Book API + UI wiring

---

## Step 2A Status — Completed 2026-06-11

### Endpoints implemented

| Endpoint | File | Status |
|---|---|---|
| `GET /api/finance/accounts` | `src/app/api/finance/accounts/route.ts` | ✅ Built + Tested |
| `GET /api/finance/bank-book` | `src/app/api/finance/bank-book/route.ts` | ✅ Built + Tested |

### Validation results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ Exit 0, no errors |
| `npx prisma validate` | ✅ Schema valid |
| `npm run build` | ✅ Exit 0 — both routes compiled to `.next/server/app/api/finance/` |

### Prisma models used

- `FinAccount` — accounts list, opening balance, current balance
- `Ledger` → `recordedBy` (Employee.name), `voucher` (Voucher.voucherNo)

### Permission gate

Both routes: `canManageFinance(session.user)` from `src/lib/roles.ts`
(covers Accounts, Operations Head, Manager).

### Assumptions made

1. `FinAccount` has no FK branch relation — `branchId` query param is treated as a `branchName` string filter. The response returns `branchId: a.branchName` (same value) since no numeric branch ID exists.
2. `Ledger.type` stores both transaction kind and payment mode in one field. Both `transactionType` and `paymentMode` query params map to the same `Ledger.type` filter.
3. Running balance is computed from all ledger entries in chronological order — it is unaffected by `search`, `transactionType`, `status` filters (correct accounting behaviour).
4. `transactionNumber` uses the linked `Voucher.voucherNo` when available; otherwise synthesised as `LDG/{id:06d}`.
5. `status=RECONCILED` → `Ledger.reconciled = true`; `status=UNRECONCILED` → `reconciled = false`.
6. Money values returned as 2-decimal strings (e.g. `"1850.00"`) — Decimal-safe serialization via `(Math.round(v * 100) / 100).toFixed(2)`.

### What is NOT in Step 2A (per instructions)

- No Cash Book API (Step 2C)
- No POST/PATCH/DELETE on any Finance route
- No UI wiring — mock data files untouched
- No schema changes or migrations
- No balance mutation logic

### Curl test results — 2026-06-11

```
# Tested with dev_employee_id=4 (Vijesh Vijayan, isManager=true → canManageFinance=true)

curl -H "Cookie: dev_employee_id=4" "http://localhost:3000/api/finance/accounts?type=BANK"
# → 200 {"success":true,"data":{"accounts":[{"id":"2","accountCode":"ACC-0002",
#     "accountName":"Primary Current A/C","accountType":"BANK","branchId":"HO",
#     "bankName":"HDFC Bank","openingBalance":"0.00","currentBalance":"0.00",
#     "status":"ACTIVE",...}]}}

curl -H "Cookie: dev_employee_id=4" "http://localhost:3000/api/finance/bank-book?page=1&pageSize=10"
# → 200 {"success":true,"data":{"summary":{"openingBalance":"0.00","totalCredits":"0.00",
#     "totalDebits":"0.00","closingBalance":"0.00"},"transactions":[],"pagination":
#     {"page":1,"pageSize":10,"total":0,"totalPages":0}}}
```

Notes:
- Bank account seeded correctly (1 HDFC account, HO branch).
- No Ledger entries seeded for bank accounts yet — transactions is empty, which is correct.
- All money values return as 2-decimal strings.
- Unauthenticated requests (no cookie) → `{"error":"Unauthorized"}` 401. ✅
- Note: Turbopack does NOT pick up newly created route files without a server restart (gotcha #10). Restarting the dev server was required before routes were accessible.

### Next step

Step 2B per the implementation order: `GET /api/finance/cash-book` (read-only).

---
>
> **Read alongside:**
> - `docs/DATABASE.md` — MySQL/Prisma rules
> - `docs/ARCHITECTURE.md` — service/API/UI pattern
> - `docs/modules/finance/DATABASE_SCHEMA.md` — column-level Finance Phase 1 spec
> - `docs/modules/finance/IMPLEMENTATION_PLAN.md` — approved 14-feature scope

---

## 1. Current Finance UI Inventory

All Finance UI routes live under `src/app/finance/`. All are server-rendered page.tsx files that delegate to a `"use client"` orchestrator. **None currently call real Finance API routes.** Mock data is co-located in each module's `data.ts`.

> **Key distinction:** Two "advance" models coexist.
> - `OrderAdvance` (legacy, CRM-era) — order advances received from customers. Used by `/api/advances`. **These are NOT Employee Advances.**
> - `EmployeeAdvance` (Finance Phase 1) — staff cash advances. No API yet.

---

### `/finance` — Finance Dashboard

| Field | Value |
|---|---|
| **Route** | `/finance` |
| **Server page** | `src/app/finance/page.tsx` |
| **Client** | `src/app/finance/FinanceDashboardClient.tsx` |
| **Mock data file** | Inline inside `FinanceDashboardClient.tsx` — `deriveData()` function, `PERIOD_FACTOR`, `BRANCH_FACTOR` constants |
| **Current API usage** | None — all data generated from inline multiplier math |
| **Backend status** | No Finance dashboard API exists. Real data requires aggregating `FinAccount`, `Ledger`, `Expense`, `EmployeeAdvance`, `TravelClaim` |
| **Risk level** | **Medium** — complex multi-model aggregation; can show stale data if wrong query scope |

---

### `/finance/bank-book` — Bank Ledger

| Field | Value |
|---|---|
| **Route** | `/finance/bank-book` |
| **Server page** | `src/app/finance/bank-book/page.tsx` |
| **Client** | `src/app/finance/bank-book/BankBookClient.tsx` |
| **Mock data file** | `src/app/finance/bank-book/data.ts` |
| **Components** | `BankBalanceCard`, `BankFilters`, `BankTransactionTable`, `BankTransactionDrawer`, `BankSummaryPanel`, `BankImportWizard`, `BankImportHistoryTable`, `BankImportPreviewTable`, `BankStatementUpload` |
| **Current API usage** | None — all transactions from `MOCK_BANK_TXNS` array in `data.ts` |
| **Cross-module dependency** | `transferStore.ts` (in-memory Bank↔Cash transfers) |
| **Backend status** | `Ledger` model exists with `accountId`, `direction`, `amountLakhs`. `FinAccount` model exists. No `/api/finance/bank-book` route |
| **Risk level** | **High** — money-critical. Incorrect balance aggregation would corrupt balance display. Bank statement import wizard is complex (4-step). |

---

### `/finance/cash-book` — Cash Ledger

| Field | Value |
|---|---|
| **Route** | `/finance/cash-book` |
| **Server page** | `src/app/finance/cash-book/page.tsx` |
| **Client** | `src/app/finance/cash-book/CashBookClient.tsx` |
| **Mock data file** | `src/app/finance/cash-book/data.ts` |
| **Components** | `CashBalanceCard`, `CashFilters`, `CashTransactionTable`, `CashTransactionDrawer`, `CashSummaryPanel`, `CashReconciliationPanel`, `CashTransferPanel`, `CashVoucherPanel` |
| **Current API usage** | None — all transactions from `MOCK_CASH_TXNS` array in `data.ts`. Re-exports helpers from `bank-book/data.ts`. |
| **Cross-module dependency** | `transferStore.ts` for Bank↔Cash transfers |
| **Backend status** | Same `Ledger` model supports cash (where `FinAccount.type = "cash"`). No `/api/finance/cash-book` route |
| **Risk level** | **High** — same money criticality as bank book. Cash in/out must post to ledger atomically |

---

### `/finance/expenses` — Expense Register

| Field | Value |
|---|---|
| **Route** | `/finance/expenses` |
| **Server page** | `src/app/finance/expenses/page.tsx` |
| **Client** | `src/app/finance/expenses/ExpenseRegisterClient.tsx` |
| **Mock data file** | `src/app/finance/expenses/data.ts` |
| **Components** | `ExpenseSummaryCard`, `ExpenseFilters`, `ExpenseTable`, `ExpenseDetailsDrawer`, `ExpenseApprovalTimeline`, `ExpenseAttachmentViewer`, `ExpenseForm`, `GSTInputSection`, `CustomerExpensePanel`, `EmployeeClaimPanel`, `VoucherPreviewPanel` |
| **Current API usage** | None — mock data only for the **register view**. Note: `POST /api/expenses` **already exists** and creates `Expense` records. The register UI does not yet call it. |
| **Backend status** | `Expense` model exists. `POST /api/expenses` and `GET /api/expenses` are **real and live** (mobile uses them). Register UI wiring is missing. |
| **Risk level** | **Medium** — API already exists. Register UI needs to call `GET /api/expenses` and surface the existing real data |

---

### `/finance/expenses/new` — New Expense Entry Form

| Field | Value |
|---|---|
| **Route** | `/finance/expenses/new` |
| **Server page** | `src/app/finance/expenses/new/page.tsx` |
| **Client** | `src/app/finance/expenses/new/ExpenseEntryForm.tsx` |
| **Mock data file** | Uses `data.ts` enums only (no mock record array) |
| **Current API usage** | None — form is UI-only, submit is disabled |
| **Backend status** | `POST /api/expenses` is **live** and ready. Form just needs to be wired |
| **Risk level** | **Low** — straightforward POST wire-up |

---

### `/finance/expenses/categories` — Expense Category Engine

| Field | Value |
|---|---|
| **Route** | `/finance/expenses/categories` |
| **Server page** | `src/app/finance/expenses/categories/page.tsx` |
| **Client** | `src/app/finance/expenses/categories/ExpenseCategoriesClient.tsx` |
| **Mock data file** | `src/app/finance/expenses/categories/data.ts` |
| **Components** | `CategoryTable`, `CategoryFilters`, `CategoryForm`, `CategoryDrawer`, `CategoryTemplateLoader` |
| **Current API usage** | None — `MOCK_CATEGORIES` array in `data.ts` |
| **Backend status** | `ExpenseCategory` and `ExpenseLimitRule` Prisma models exist (Phase 9). `GET/POST/PATCH /api/admin/finance/expenses` is **already live** (Finance Admin Engine). Category list for dropdown is missing a `/api/finance/categories` public read endpoint. |
| **Risk level** | **Low** — admin API already exists; only need a read endpoint for the category list |

---

### `/finance/approvals` — Finance Approvals

| Field | Value |
|---|---|
| **Route** | `/finance/approvals` |
| **Server page** | `src/app/finance/approvals/page.tsx` |
| **Client** | `src/app/finance/approvals/FinanceApprovalsClient.tsx` |
| **Mock data file** | `MOCK_REQUESTS` from `src/app/settings/workflow/approval-engine/data` (filtered to `module === "Finance"`) |
| **Current API usage** | None — uses `MOCK_REQUESTS` |
| **Backend status** | `GET /api/approvals` **is live**. It calls `listApprovalRequests()` from `workflow-engine`. The page only needs to call it with `entityType` filter for Finance entities. The `POST /api/approvals/[id]/action` route is also live. |
| **Risk level** | **Low** — global Approval Engine is live. Finance Approvals page only needs to replace mock with a filtered `GET /api/approvals?entityType=EXPENSE,ADVANCE,TRAVEL,VOUCHER` call |

---

### `/finance/conveyance` — Local Conveyance Register

| Field | Value |
|---|---|
| **Route** | `/finance/conveyance` |
| **Server page** | `src/app/finance/conveyance/page.tsx` |
| **Client** | `src/app/finance/conveyance/ConveyanceClient.tsx` |
| **Mock data file** | `src/app/finance/conveyance/data.ts` |
| **Components** | `ConveyanceSummaryCards`, `ConveyanceFilters`, `TravelClaimTable`, `TravelEntryDrawer`, `TravelEntryForm`, `MonthlyRegister`, `MonthlySettlementPanel`, `PolicyConfigPanel` |
| **Current API usage** | None — `MOCK_TRIPS` array |
| **Backend status** | `TravelClaim` Prisma model exists. `ConveyancePolicy` model exists (Phase 9). No `/api/finance/conveyance` route exists |
| **Risk level** | **Medium** — GPS distance calculation is deferred; plain entry without GPS is safe to wire first |

---

### `/finance/advances` — Employee Advances

| Field | Value |
|---|---|
| **Route** | `/finance/advances` |
| **Server page** | `src/app/finance/advances/page.tsx` |
| **Client** | None — page shows "Phase 6 — Coming soon" placeholder |
| **Mock data file** | None (placeholder only) |
| **Current API usage** | None |
| **Backend status** | `EmployeeAdvance` Prisma model exists. No `/api/finance/advances` route. (Note: `/api/advances` is the CRM `OrderAdvance` route — separate model.) |
| **Risk level** | **Low** — placeholder page, nothing to break; straightforward new endpoint |

---

### `/finance/vouchers` — Voucher Register

| Field | Value |
|---|---|
| **Route** | `/finance/vouchers` |
| **Server page** | `src/app/finance/vouchers/page.tsx` |
| **Client** | None — page shows "Phase 4 — Coming soon" placeholder |
| **Mock data file** | None (placeholder only) |
| **Current API usage** | None |
| **Backend status** | `Voucher` and `VoucherSequence` models exist. No `/api/finance/vouchers` route |
| **Risk level** | **Low** — placeholder page, nothing to break |

---

### `/finance/reports`, `/finance/claims`, `/finance/vendors`

| Route | Status |
|---|---|
| `/finance/reports` | Placeholder page (`page.tsx` only, no client component) |
| `/finance/claims` | Placeholder page |
| `/finance/vendors` | **Redirects to `/masters/vendors`** (global vendor master). No wiring needed here. |

---

## 2. Existing Finance Database Models

All 10 Finance Phase 1 models + 8 Finance Admin Phase 9 models are in `prisma/schema.prisma` and have been applied to the dev DB via migration `20260602120000_finance_operations_phase1` and `20260605050000_finance_admin_engine`.

---

### `FinAccount` — Chart of Accounts

| Field | Detail |
|---|---|
| **What it supports** | Master list of all cash and bank accounts for the company. `type` = `"cash"` or `"bank"`. `currentBalance` is a cached field updated by backend service only. |
| **UI screen** | Bank Book account selector, Cash Book account selector, Finance Dashboard account filter |
| **Missing fields** | No `financialYear` scoping. No `openingBalanceDate`. No `closedAt` / `closingBalance` for year-end closing. |
| **Schema change required** | Can defer — `openingBalance` and `openingBalanceDate` can be added later; current schema supports FY26-27 opening balance. |

---

### `Ledger` — General Ledger Entries

| Field | Detail |
|---|---|
| **What it supports** | Every financial transaction posted against a `FinAccount`. Supports debit/credit, reconciliation, voucher linking, and Bank↔Cash transfer pairing via `pairedLedgerId`. |
| **UI screen** | Bank Book transaction list, Cash Book transaction list, reconciliation panels |
| **Missing fields** | No `financialYear` field on the Ledger entry itself (can be derived from `entryDate`, but explicit FY column helps index-filtered queries). No `importBatchId` for bank statement import tracking. |
| **Schema change required** | `financialYear` and `importBatchId` useful but not blocking. Can add in a later migration. |

---

### `Vendor` — Vendor Master

| Field | Detail |
|---|---|
| **What it supports** | Vendor records for expense and procurement. Referenced by `Expense.vendorId`. |
| **UI screen** | Expense form vendor picker, `/masters/vendors` (global master) |
| **Missing fields** | No `vendorCode`. No `category` / `type` field for vendor classification. Missing fields listed in `masters/vendors/data.ts` (multi-branch, GST registrations, contacts, bank accounts) are part of the **extended** Vendor Master — not blocking for Phase 1 expense wiring. |
| **Schema change required** | Not blocking. Extended Vendor Master fields are deferred (future migration). |

---

### `Expense` — Expense Register

| Field | Detail |
|---|---|
| **What it supports** | All employee and company expenses. Stores category, GST split, vendor link, attachments (JSON array), approval lifecycle, voucher link. |
| **UI screen** | Expense Register `/finance/expenses`, Expense Entry Form `/finance/expenses/new` |
| **Missing fields** | No `paymentMode` field (cash/bank/card). No `finAccountId` (which account paid this expense). No `travelClaimId` link (for conveyance-expense bridge). |
| **Schema change required** | `paymentMode` and `finAccountId` are needed for ledger posting from an expense. Should be added **before** creating expense-to-ledger posting logic, but not before read-only wiring. |

---

### `Voucher` — Numbered Vouchers

| Field | Detail |
|---|---|
| **What it supports** | Formal auto-numbered vouchers (`CI/YY-YY/00001`) for payment, receipt, journal, expense, conveyance, advance types. Links to Ledger, Expense, TravelClaim, EmployeeAdvance. |
| **UI screen** | Voucher Register `/finance/vouchers`, Expense Details drawer (voucher preview) |
| **Missing fields** | No `approvedById`/`approvedAt` — approval of vouchers flows through the global Approval Engine, not inline on the model. No `cancelledAt`. |
| **Schema change required** | Not blocking for Phase 1 read. Approval is handled via `ApprovalRequest`. |

---

### `VoucherSequence` — Atomic FY Counter

| Field | Detail |
|---|---|
| **What it supports** | One row per financial year. `lastNumber` is incremented inside a `prisma.$transaction` to guarantee unique sequential voucher numbers. Seeded with FY `26-27`. |
| **UI screen** | Used internally by the voucher creation service — not directly visible in UI |
| **Missing fields** | No `prefix` override per type (e.g. `CB/` for cash book vs `CI/` for all). |
| **Schema change required** | Low priority. `VoucherConfiguration` (Phase 9) adds per-type prefix support. |

---

### `EmployeeAdvance` — Staff Advances

| Field | Detail |
|---|---|
| **What it supports** | Full lifecycle: pending → approved → disbursed → settled. `balanceLakhs` is cached (disbursed minus settled). `disbursedFromId` soft-refs `FinAccount`. |
| **UI screen** | `/finance/advances` (currently a "Coming soon" placeholder) |
| **Missing fields** | No `approvalRequestId` to link back to the global `ApprovalRequest`. No `settlementDocs` attachment JSON. |
| **Schema change required** | `approvalRequestId` is important for linking to the Approval Engine response but not blocking for the first endpoint. |

---

### `TravelClaim` — Local Conveyance / Travel

| Field | Detail |
|---|---|
| **What it supports** | GPS-aware travel reimbursement. `mode`: bike/car/auto/public. `ratePerKm` is a snapshot from HR policy at claim time. `amountRupees` and `amountLakhs` are both stored (unit conversion). |
| **UI screen** | `/finance/conveyance` register and entry form |
| **Missing fields** | No `monthlyPeriod` (YYYY-MM) field for the monthly settlement grouping the UI shows. No `approvalRequestId`. No `settlementBatchId` for bulk monthly settlement. |
| **Schema change required** | `monthlyPeriod` is needed for the Monthly Register / Settlement Panel to work correctly. Must be added before the conveyance settlement API. Not blocking for read-only trip list. |

---

### `ApprovalRule` — Finance-Level Approval Policy

| Field | Detail |
|---|---|
| **What it supports** | Amount-threshold rules per entity type (`expense`, `advance`, `travel`, `voucher`). `autoApproveLimit` bypasses approval. Up to 3 approval levels with role gates. |
| **UI screen** | Used by the expense creation API (`/api/expenses`) to determine if `startApproval()` should be called. Not directly shown in UI — managed via Finance Admin. |
| **Missing fields** | No link to the global `WorkflowDefinition` — the current `/api/expenses` route looks up the workflow by `code = "EXPENSE_APPROVAL"` directly. The `ApprovalRule` model is a standalone Finance-only policy that duplicates some of what the Workflow Engine provides. This **overlap must be resolved** before implementing advance and conveyance approval. |
| **Schema change required** | No new columns needed; but the dual-approval-system design (Finance `ApprovalRule` vs Workflow Engine `WorkflowDefinition`) needs a documented decision before coding. Recommended: use the global Workflow Engine exclusively and deprecate `ApprovalRule` for new entities. |

---

### `AuditLog` — Financial Audit Trail

| Field | Detail |
|---|---|
| **What it supports** | Immutable append-only log for every financial event: create/update/submit/approve/reject/void/disburse/settle/delete/reconcile on expense/voucher/ledger/account/advance/travel_claim/vendor/approval. |
| **UI screen** | No dedicated Finance audit UI yet. Referenced from approval timelines. |
| **Missing fields** | No `ipAddress`. No `sessionId`. Consistent with other audit trails in the codebase. |
| **Schema change required** | None. |

---

### Finance Admin Phase 9 Models (summary)

| Model | Supports | UI Screen | Blocking? |
|---|---|---|---|
| `FinancePolicy` | General policy store | Finance Admin settings | No |
| `ExpenseCategory` | Structured category definitions with code, approval, attachment rules | `/finance/expenses/categories` | No — admin API live |
| `ExpenseLimitRule` | Per-scope per-category daily/monthly/yearly limits | Finance Admin settings | No |
| `ConveyancePolicy` | Rate per km per vehicle type, monthly cap, GPS requirement | `/finance/conveyance` PolicyConfigPanel | No |
| `AdvancePolicy` | Max advance, settlement days, approval toggle | Finance Admin | No |
| `CustomerCreditPolicy` | Credit limit and payment terms | Future credit management | No |
| `VoucherConfiguration` | Prefix, number format, auto-reset per FY | Voucher Register | No |
| `CollectionPolicy` | Credit period, overdue rules | Finance Admin | No |

---

## 3. Required API Endpoints — Phase 1 Backend Wiring

All endpoints follow the project pattern: server-side session check via `getSession()`, manager/role gate, Prisma query, JSON response. All use `src/lib/prisma.ts`. Money in **₹ Lakhs** in the DB; multiply by 1,00,000 when displaying in rupees in the UI (the existing `fmtINR` helper in `bank-book/data.ts` already handles this).

---

### `GET /api/finance/dashboard`

| Field | Detail |
|---|---|
| **Purpose** | Aggregate KPIs for the Finance Dashboard: cash position, bank position, pending approvals count, expenses this month, outstanding advances, overdue invoices |
| **Query params** | `period` (month/quarter/fy), `branchName` (optional filter) |
| **Request body** | None |
| **Response** | `{ cashBalance, bankBalance, pendingApprovals, expensesThisMonth, advancesOutstanding, overdueInvoices, recentTransactions[] }` |
| **Prisma models** | `FinAccount`, `Ledger`, `Expense`, `EmployeeAdvance`, `Collection` (for overdue) |
| **Permission** | `canManageFinance(session.user)` |
| **UI screen** | `/finance` — `FinanceDashboardClient` |

---

### `GET /api/finance/bank-book`

| Field | Detail |
|---|---|
| **Purpose** | List bank ledger entries with pagination and filters |
| **Query params** | `accountId`, `from` (date), `to` (date), `type` (TxnType), `reconciled` (bool), `take` (default 100), `skip` (default 0) |
| **Request body** | None |
| **Response** | `{ entries: LedgerEntry[], account: FinAccount, summary: { debitTotal, creditTotal, closingBalance } }` |
| **Prisma models** | `Ledger` (where `account.type = "bank"`), `FinAccount` |
| **Permission** | `canManageFinance(session.user)` |
| **UI screen** | `/finance/bank-book` — `BankTransactionTable`, `BankSummaryPanel` |

---

### `POST /api/finance/bank-book`

| Field | Detail |
|---|---|
| **Purpose** | Create a new bank transaction (debit or credit) and post to ledger |
| **Query params** | None |
| **Request body** | `{ accountId, entryDate, type, direction, amountLakhs, narration, referenceNo, payee, voucherId? }` |
| **Response** | `{ entry: LedgerEntry, account: FinAccount }` |
| **Prisma models** | `Ledger` (create), `FinAccount` (update `currentBalance` in same `$transaction`) |
| **Permission** | `canManageFinance(session.user)` |
| **UI screen** | `/finance/bank-book` — `BankTransactionDrawer` new entry form |

---

### `GET /api/finance/cash-book`

| Field | Detail |
|---|---|
| **Purpose** | List cash ledger entries with pagination and filters |
| **Query params** | `accountId`, `from`, `to`, `type`, `take`, `skip` |
| **Request body** | None |
| **Response** | `{ entries: LedgerEntry[], account: FinAccount, summary: { debitTotal, creditTotal, closingBalance } }` |
| **Prisma models** | `Ledger` (where `account.type = "cash"`), `FinAccount` |
| **Permission** | `canManageFinance(session.user)` |
| **UI screen** | `/finance/cash-book` — `CashTransactionTable`, `CashSummaryPanel` |

---

### `POST /api/finance/cash-book`

| Field | Detail |
|---|---|
| **Purpose** | Create a new cash transaction and post to ledger |
| **Query params** | None |
| **Request body** | `{ accountId, entryDate, type, direction, amountLakhs, narration, referenceNo, payee, voucherId? }` |
| **Response** | `{ entry: LedgerEntry, account: FinAccount }` |
| **Prisma models** | `Ledger` (create), `FinAccount` (balance update in `$transaction`) |
| **Permission** | `canManageFinance(session.user)` |
| **UI screen** | `/finance/cash-book` — `CashTransactionDrawer`, `CashTransferPanel` |

---

### `GET /api/finance/expenses`

| Field | Detail |
|---|---|
| **Purpose** | List expense register entries with filters (replaces `GET /api/expenses` for the register view — that existing route stays but is limited) |
| **Query params** | `status`, `category`, `employeeId`, `from`, `to`, `vendorId`, `take`, `skip` |
| **Request body** | None |
| **Response** | `{ expenses: Expense[], summary: { total, gstTotal, pending, approved } }` |
| **Prisma models** | `Expense` with `employee` and `vendor` includes |
| **Permission** | `canManageFinance` → all expenses; employee → own only |
| **UI screen** | `/finance/expenses` — `ExpenseTable`, `ExpenseSummaryCard` |
| **Note** | The existing `GET /api/expenses` already does this but lacks summary aggregation. Recommend routing the register UI through a new dedicated endpoint for richer response, or enhancing the existing one. |

---

### `POST /api/finance/expenses`

| Field | Detail |
|---|---|
| **Purpose** | Create a new expense record and optionally trigger approval workflow |
| **Query params** | None |
| **Request body** | `{ category, categoryCode, narration, amountLakhs, gstRate, gstAmountLakhs, vendorId?, customerName?, expenseDate, paymentMode?, finAccountId?, submit }` |
| **Response** | `{ expense, approvalRequestId }` |
| **Prisma models** | `Expense` (create), `ApprovalRequest` (via workflow engine) |
| **Permission** | Any authenticated employee (own expense) |
| **UI screen** | `/finance/expenses/new` — `ExpenseEntryForm` |
| **Note** | `POST /api/expenses` already does most of this. The new endpoint adds `paymentMode` and `finAccountId` fields when those schema fields are added. Until then, the existing route can be called. |

---

### `GET /api/finance/expenses/[id]`

| Field | Detail |
|---|---|
| **Purpose** | Fetch full expense detail for the drawer view including approval timeline |
| **Query params** | None |
| **Request body** | None |
| **Response** | `{ expense, approvalHistory: ApprovalAction[], auditLog: AuditLog[] }` |
| **Prisma models** | `Expense`, `AuditLog`, `ApprovalRequest`, `ApprovalAction` |
| **Permission** | Owner or `canManageFinance` |
| **UI screen** | `/finance/expenses` — `ExpenseDetailsDrawer`, `ExpenseApprovalTimeline` |

---

### `PATCH /api/finance/expenses/[id]`

| Field | Detail |
|---|---|
| **Purpose** | Update expense status (approve/reject/mark-paid) or edit draft fields |
| **Query params** | None |
| **Request body** | `{ action: "approve" \| "reject" \| "mark_paid" \| "update", ...fields }` |
| **Response** | `{ expense }` |
| **Prisma models** | `Expense` (update), `AuditLog` (append) |
| **Permission** | Edit draft → owner; Approve/reject → `canManageFinance`; Mark paid → accounts role |
| **UI screen** | `/finance/expenses` — `ExpenseDetailsDrawer` action buttons |

---

### `GET /api/finance/categories`

| Field | Detail |
|---|---|
| **Purpose** | Return active expense categories for form dropdowns (lightweight list, not the full admin view) |
| **Query params** | `status` (default `active`), `usage` (filter by `forGeneral` / `forEmployee` / etc.) |
| **Request body** | None |
| **Response** | `{ categories: [{ id, name, code, requiresReceipt, requiresApproval, gstApplicable }] }` |
| **Prisma models** | `ExpenseCategory` |
| **Permission** | Any authenticated employee |
| **UI screen** | `/finance/expenses/new` — `ExpenseForm` category dropdown, `/finance/expenses/categories` — `CategoryTable` |

---

### `GET /api/finance/approvals`

| Field | Detail |
|---|---|
| **Purpose** | Return pending approval requests scoped to Finance entity types, filtered for the current user's inbox or all (for managers) |
| **Query params** | `inbox=true` (own pending), `entityType` (comma-separated: EXPENSE,ADVANCE,TRAVEL,VOUCHER), `status` |
| **Request body** | None |
| **Response** | `{ requests: ApprovalRequest[] }` |
| **Prisma models** | `ApprovalRequest`, `ApprovalAction`, `WorkflowDefinition` (via workflow-engine service) |
| **Permission** | `canManageFinance` for all; any employee for own |
| **UI screen** | `/finance/approvals` — `FinanceApprovalsClient` (replaces `MOCK_REQUESTS`) |
| **Note** | This is a **filtered view of `GET /api/approvals`**. The Finance page should call the existing `GET /api/approvals?entityType=EXPENSE&entityType=ADVANCE...` directly. No new API route is strictly needed — the page just needs to pass the right query parameters. |

---

### `GET /api/finance/advances`

| Field | Detail |
|---|---|
| **Purpose** | List `EmployeeAdvance` records (NOT `OrderAdvance` — that is `/api/advances`) |
| **Query params** | `status`, `employeeId`, `from`, `to`, `take`, `skip` |
| **Request body** | None |
| **Response** | `{ advances: EmployeeAdvance[], summary: { totalDisbursed, totalSettled, totalBalance } }` |
| **Prisma models** | `EmployeeAdvance` with `employee` include |
| **Permission** | Employee sees own; `canManageFinance` sees all |
| **UI screen** | `/finance/advances` — currently "Coming soon"; new list component needed |

---

### `GET /api/finance/vouchers`

| Field | Detail |
|---|---|
| **Purpose** | List voucher records |
| **Query params** | `type`, `status`, `from`, `to`, `take`, `skip` |
| **Request body** | None |
| **Response** | `{ vouchers: Voucher[], sequence: { financialYear, lastNumber } }` |
| **Prisma models** | `Voucher`, `VoucherSequence` |
| **Permission** | `canManageFinance` |
| **UI screen** | `/finance/vouchers` — currently "Coming soon"; new list component needed |

---

## 4. Mock Data Replacement Map

Each `data.ts` file in the Finance UI defines mock arrays. These must be replaced by API calls when APIs are ready.

---

### `src/app/finance/bank-book/data.ts`

| Field | Detail |
|---|---|
| **Mock arrays** | `MOCK_ACCOUNTS` (2 bank accounts), `MOCK_BANK_TXNS` (sample ledger rows) |
| **Components using it** | `BankBookClient`, `BankBalanceCard`, `BankTransactionTable`, `BankTransactionDrawer`, `BankSummaryPanel`, `BankImportWizard` |
| **Replacement endpoint** | `GET /api/finance/bank-book?accountId=&from=&to=` |
| **Loading state** | Skeleton rows in `BankTransactionTable`; grey balance card while loading |
| **Error state** | Red banner: "Unable to load bank transactions. Check your connection." with retry button |
| **Empty state** | "No transactions for this period" with "Record first transaction" CTA |

---

### `src/app/finance/cash-book/data.ts`

| Field | Detail |
|---|---|
| **Mock arrays** | `MOCK_CASH_ACCOUNTS`, `MOCK_CASH_TXNS` |
| **Components using it** | `CashBookClient`, `CashBalanceCard`, `CashTransactionTable`, `CashSummaryPanel`, `CashReconciliationPanel` |
| **Replacement endpoint** | `GET /api/finance/cash-book?accountId=&from=&to=` |
| **Loading state** | Skeleton balance card and table rows |
| **Error state** | Red banner with retry |
| **Empty state** | "No cash entries for this period. Record opening balance or first transaction." |

---

### `src/app/finance/expenses/data.ts`

| Field | Detail |
|---|---|
| **Mock arrays** | `MOCK_EXPENSES` (expense records array), `OPEN_COLLECTIONS`, `CUSTOMER_ADVANCES` (source links) |
| **Components using it** | `ExpenseRegisterClient`, `ExpenseTable`, `ExpenseFilters`, `ExpenseSummaryCard`, `ExpenseDetailsDrawer` |
| **Replacement endpoint** | `GET /api/finance/expenses` |
| **Loading state** | Summary card skeletons + table row skeletons |
| **Error state** | "Failed to load expense register." banner |
| **Empty state** | "No expenses found. Submit your first expense." with link to `/finance/expenses/new` |

---

### `src/app/finance/expenses/categories/data.ts`

| Field | Detail |
|---|---|
| **Mock arrays** | `MOCK_CATEGORIES` |
| **Components using it** | `ExpenseCategoriesClient`, `CategoryTable`, `CategoryFilters`, `CategoryDrawer` |
| **Replacement endpoint** | `GET /api/admin/finance/expenses` (admin view), `GET /api/finance/categories` (dropdown) |
| **Loading state** | Table row skeletons |
| **Error state** | "Unable to load categories." |
| **Empty state** | "No categories configured. Load a template or create your first category." |

---

### `src/app/finance/conveyance/data.ts`

| Field | Detail |
|---|---|
| **Mock arrays** | `MOCK_TRIPS`, `MOCK_MONTHLY_REGISTERS`, conveyance policies |
| **Components using it** | `ConveyanceClient`, `TravelClaimTable`, `MonthlyRegister`, `MonthlySettlementPanel`, `PolicyConfigPanel` |
| **Replacement endpoint** | `GET /api/finance/conveyance` (trips), `GET /api/admin/finance/conveyance` (policies) |
| **Loading state** | Trip table skeleton rows |
| **Error state** | "Failed to load conveyance records." |
| **Empty state** | "No trips this month. Log your first trip." |

---

### `src/app/finance/approvals/page.tsx` (inline mock import)

| Field | Detail |
|---|---|
| **Mock source** | `MOCK_REQUESTS` imported from `src/app/settings/workflow/approval-engine/data` filtered to `module === "Finance"` |
| **Components using it** | `FinanceApprovalsClient`, `ApprovalInbox`, `ApprovalDetailDrawer` |
| **Replacement endpoint** | `GET /api/approvals?entityType=EXPENSE&entityType=ADVANCE` (existing global route) |
| **Loading state** | Inbox item skeletons |
| **Error state** | "Unable to load approvals." |
| **Empty state** | "No pending Finance approvals." |

---

### `src/app/finance/FinanceDashboardClient.tsx` (inline mock `deriveData()`)

| Field | Detail |
|---|---|
| **Mock source** | `deriveData()` function with `PERIOD_FACTOR` / `BRANCH_FACTOR` multipliers — pure computation, no array |
| **Components using it** | `FinanceDashboardClient` (all KPI tiles and charts) |
| **Replacement endpoint** | `GET /api/finance/dashboard?period=&branchName=` |
| **Loading state** | Skeleton KPI tiles (8 cards) + skeleton chart areas |
| **Error state** | "Finance dashboard unavailable." with fallback zeroed KPIs |
| **Empty state** | N/A — dashboard always shows aggregates (may be ₹0) |

---

## 5. Approval Engine Integration Plan

The global Workflow Engine (`src/lib/workflow-engine.ts`) powers all approvals. Finance must **not** implement separate approval logic — all Finance approvals flow through the same `ApprovalRequest` → `ApprovalAction` pipeline.

**The `ApprovalRule` model (Finance Phase 1)** is a Finance-specific policy store for amount thresholds. It was designed as a configuration helper — it should inform when to call `startApproval()`, not replace the workflow engine itself.

---

### How each Finance entity should use the Approval Engine

#### Expense Approval

- **Already partially wired.** `POST /api/expenses` calls `startApproval({ workflowId, entityType: "EXPENSE", entityId, requestedBy })` when `amountLakhs > 0.10`.
- **Gap:** The Finance Approvals page (`/finance/approvals`) reads from `MOCK_REQUESTS` instead of `GET /api/approvals?entityType=EXPENSE`.
- **Fix:** Replace mock import in `approvals/page.tsx` with a server-side call to `listApprovalRequests({ entityType: "EXPENSE" })` or call `GET /api/approvals?entityType=EXPENSE` from the client.
- **Rule:** Finance Approvals page = filtered view only. Do NOT add approve/reject logic inside Finance — `POST /api/approvals/[id]/action` is the single action endpoint.

#### Employee Advance Approval

- **Not yet wired.** `EmployeeAdvance` has no API route.
- **When building:** the `POST /api/finance/advances` (create) endpoint should call `startApproval({ entityType: "EMPLOYEE_ADVANCE", entityId, requestedBy })` for any advance above the `AdvancePolicy.maxAdvanceLakhs` auto-approve threshold.
- **Workflow code to use:** `"ADVANCE_APPROVAL"` (create this workflow in the Workflow Engine seed if not present).
- **Disbursement:** A separate `POST /api/finance/advances/[id]/disburse` action — called by accounts after approval — should update `status → "disbursed"`, set `disbursedDate`, `disbursedAmountLakhs`, `disbursedFromId`, and post a corresponding `Ledger` debit.

#### Local Conveyance Monthly Approval

- **Pattern:** Individual `TravelClaim` records are submitted by employees. At month-end, a batch `POST /api/finance/conveyance/settle` action groups all `status = "approved"` claims for a given employee and month into a single settlement with one payment voucher.
- **Approval flow:** Monthly settlement (not individual trips) should go through `startApproval({ entityType: "CONVEYANCE_SETTLEMENT", entityId: settlementId })`.
- **Workflow code to use:** `"CONVEYANCE_APPROVAL"`.

#### Cash Adjustment Approval

- **Pattern:** Any `Ledger` entry of type `cash_adjustment` above a configured threshold should trigger approval before posting.
- **Implementation:** In `POST /api/finance/cash-book`, check `amountLakhs > threshold` and `type === "cash_adjustment"` → call `startApproval({ entityType: "CASH_ADJUSTMENT" })`. The ledger entry is created in `status = "pending"` and only finalised on approval callback (or immediately if below threshold).
- **Workflow code to use:** `"CASH_ADJUSTMENT_APPROVAL"`.

#### Vendor Payment Approval

- **Pattern:** Vendor payments above a threshold (e.g. > ₹1L) posted via `POST /api/finance/bank-book` with `type = "vendor_payment"` should trigger approval.
- **Implementation:** Same pattern as expense — call `startApproval({ entityType: "VENDOR_PAYMENT" })` when above threshold.
- **Workflow code to use:** `"VENDOR_PAYMENT_APPROVAL"`.

---

### Finance Approvals Page — Wiring Rule

```
/finance/approvals  →  GET /api/approvals?entityType=EXPENSE,EMPLOYEE_ADVANCE,
                                          CONVEYANCE_SETTLEMENT,CASH_ADJUSTMENT,
                                          VENDOR_PAYMENT
```

The page is a **filtered inbox** of the global Approval Engine. It must not have its own approval state — all approve/reject actions call `POST /api/approvals/[id]/action` exactly as the global Workflow Center does.

The `FinanceApprovalsClient` sub-tab structure (`expenses | advances | conveyance | payments`) is already correctly designed — it just needs to filter by `transactionType` on the real `ApprovalRequest` records.

---

## 6. Ledger Posting Plan

**Core rule:** Balance is never calculated in the frontend. `FinAccount.currentBalance` is a cached field updated only by backend service logic, inside `prisma.$transaction`. The UI reads `currentBalance` from the API response — never recomputes it.

---

### Cash In (customer receipt, petty cash replenishment)

```
1. Create Ledger { accountId: cashAccount.id, direction: "credit", amountLakhs, type: "cash_in" }
2. UPDATE FinAccount SET currentBalance = currentBalance + amountLakhs WHERE id = accountId
3. Both in prisma.$transaction — partial writes must not occur
4. Optionally create / link a Voucher (type: "receipt")
5. Write AuditLog { entityType: "ledger", action: "create" }
```

---

### Bank Transaction (NEFT, UPI, cheque receipt/payment)

```
1. Create Ledger { accountId: bankAccount.id, direction: debit|credit, amountLakhs, type: neft|upi|... }
2. UPDATE FinAccount SET currentBalance = currentBalance ± amountLakhs
3. Both in prisma.$transaction
4. Optionally create Voucher (type: "payment" for bank debit, "receipt" for bank credit)
5. Write AuditLog
```

---

### Expense Payment (paying an approved expense)

```
1. PATCH Expense { status: "paid", paidDate, finAccountId, paymentMode }
2. Create Ledger { accountId: finAccountId, direction: "debit", amountLakhs: expense.amountLakhs }
   narration = "Expense: " + expense.narration
3. UPDATE FinAccount.currentBalance -= expense.amountLakhs
4. Create Voucher { type: "expense", amountLakhs }; link Voucher to Expense and Ledger
5. All in prisma.$transaction
6. Write AuditLog { entityType: "expense", action: "paid" }
```

---

### Employee Advance Disbursement

```
1. PATCH EmployeeAdvance { status: "disbursed", disbursedDate, disbursedAmountLakhs, disbursedFromId }
2. Create Ledger { accountId: disbursedFromId, direction: "debit", amountLakhs: disbursedAmountLakhs }
3. UPDATE FinAccount.currentBalance -= disbursedAmountLakhs
4. UPDATE EmployeeAdvance.balanceLakhs = disbursedAmountLakhs (remaining balance = full amount at disbursement)
5. Create Voucher { type: "advance" }
6. All in prisma.$transaction
```

---

### Advance Settlement (employee returns surplus or expense receipts clear the advance)

```
1. If cash returned: Create Ledger { direction: "credit", amountLakhs: returnedAmount }
                     UPDATE FinAccount.currentBalance += returnedAmount
2. UPDATE EmployeeAdvance { settledDate, settledAmountLakhs, balanceLakhs = disbursed - settled, status = "settled" }
3. All in prisma.$transaction
4. Write AuditLog { action: "settle" }
```

---

### Voucher Creation (standalone, e.g. journal entry)

```
1. Lookup/increment VoucherSequence.lastNumber in prisma.$transaction (SELECT ... FOR UPDATE pattern)
2. Compute voucherNo = "CI/" + financialYear + "/" + padded(lastNumber)
3. Create Voucher { voucherNo, type, amountLakhs, narration, createdById }
4. Create paired Ledger entries (debit + credit) referencing the new voucherId
5. UPDATE FinAccount balances for both accounts
6. All in one prisma.$transaction
```

---

## 7. Risk Review Before Coding

### Risk Inventory

| Risk | Classification |
|---|---|
| **Money fields using Float/Double** — `FinAccount.currentBalance`, `Ledger.amountLakhs`, `Expense.amountLakhs`, etc. are all `Float → MySQL DOUBLE`. DOUBLE has ~15 significant digits but does accumulate rounding error on repeated additions. For a low-volume internal tool this is currently acceptable; for high-volume or audit-critical use it is not. | **Can fix during API coding** — implement a `round2(n)` guard on all balance-write paths. Full `@db.Decimal(12,4)` migration is deferred per `docs/DATABASE.md`. |
| **Missing Decimal migration** — The `@db.Decimal(12,4)` upgrade is explicitly deferred (documented in DATABASE.md). No migration exists to convert `currentBalance` / `amountLakhs` fields. | **Can fix after first API wiring** — `round2()` mitigates until a migration is scheduled. |
| **Missing Financial Year settings** — There is no UI to change the current Financial Year (currently hardcoded as `"26-27"` in `data.ts` and `VoucherSequence`). Year-end closing (carry-forward balances, new VoucherSequence row) has no implementation. | **Must fix before API coding** — At minimum, a `currentFinancialYear` key in `AppSetting` must be readable by the backend so voucher generation and FY filtering are parameterised, not hardcoded. |
| **Missing Number Series UI** — `VoucherSequence` and `VoucherConfiguration` exist but there is no UI for finance admin to configure prefix, reset, or view the current sequence counter. | **Can fix during API coding** — Add a read-only series status panel to Finance Admin. Does not block read-only API wiring. |
| **Missing Ledger Master UI** — `FinAccount` records (cash and bank accounts) are seeded only. There is no UI to add, edit, or deactivate accounts. If the seeded accounts are wrong for production, there is no way to fix them without direct DB access. | **Must fix before API coding** — A minimal Ledger Master screen (list + add + soft-delete `FinAccount`) must exist before Finance APIs go live. Without it, `accountId` references in all API payloads cannot be resolved by users. |
| **Missing Cost Center / Branch Master** — Bank Book and Cash Book UIs have branch filters (`Head Office`, `Bangalore`, `Chennai`) but `FinAccount.branchName` is a free-text field — no enforced master list. | **Can fix after first API wiring** — Low risk. Branch filter can use distinct values from `FinAccount`. |
| **Missing real Vendor Master API** — The global Vendor Master at `/masters/vendors` is mock-only. `Expense.vendorId` can reference `Vendor` records but the Vendor Master UI has no backend. Expense creation cannot pick a real vendor from a dropdown. | **Must fix before API coding** — A minimal `GET /api/vendors` list endpoint is needed for the expense form's vendor picker. Full Vendor Master wiring is deferred. |
| **Existing mock UI appearing production-ready** — `/finance/bank-book`, `/finance/cash-book`, `/finance/expenses` look fully functional but serve mock data. In production, a user who trusts these screens would see fabricated balances. | **Must fix before API coding** — Add "Demo data — not connected to live accounts" banner to all mock Finance pages before any production deploy. Remove banners only when real API is wired. |
| **Dual approval system** — `ApprovalRule` model (Finance Phase 1) vs `WorkflowDefinition` (Phase 6). The existing `/api/expenses` route uses `getWorkflowByCode("EXPENSE_APPROVAL")` — which is the right approach. But `ApprovalRule` records were seeded and are checked nowhere in API code. This creates confusion about which system governs thresholds. | **Must fix before API coding** — Decide: either make `ApprovalRule.autoApproveLimit` the threshold read by all Finance POST endpoints (consistent Finance config), or document that `ApprovalRule` is deprecated in favour of `WorkflowDefinition` policy fields. A comment and decision record in code prevents future bugs. |
| **`transferStore.ts` is in-memory** — Bank↔Cash transfers in the current UI use an in-memory store that resets on hard reload. When Bank Book and Cash Book APIs are wired, transferred amounts must post paired `Ledger` entries (one debit from source account, one credit to destination account) using `pairedLedgerId`. The in-memory store must be retired. | **Can fix during API coding** — Wire the transfer form to `POST /api/finance/bank-book` + `POST /api/finance/cash-book` as a pair in a server-side `$transaction`. |

---

## 8. Recommended Implementation Order

The following order minimises risk, avoids money-critical writes until reads are verified, and respects the "confirm before pushing to prod" rule.

---

### Step 2A — Prerequisite: Ledger Master (FinAccount list screen)

**Before any Finance API goes live, build a read-only + create `FinAccount` management screen.**

- `GET /api/finance/accounts` — list all FinAccount records (type, name, currentBalance, isActive)
- `POST /api/finance/accounts` — create new account (accounts admin only)
- `PATCH /api/finance/accounts/[id]` — toggle `isActive`

Without this, API callers cannot know which `accountId` to use.

---

### Step 2B — Bank Book API (read-only) ✅ Completed 2026-06-11

- `GET /api/finance/bank-book` implemented (Ledger where `account.type = "bank"`)
- `BankBookClient` fully rewritten — calls live API, shows real `FinAccount.currentBalance`
- Write POSTs (Add Entry, Transfer, Import) gated with toast — deferred to Step 2H

---

### Step 2C — Cash Book API (read-only) ✅ Completed 2026-06-12

- `GET /api/finance/cash-book` implemented — `Ledger` where `account.type = "cash"`
- Cash Book display convention applied: `direction = "credit"` → Debit column (Cash In); `direction = "debit"` → Credit column (Cash Out)
- Summary: `openingBalance`, `totalCashIn`, `totalCashOut`, `closingBalance`, `physicalCashBalance: null`, `lastReconciledAt: null`
- All query params supported: `accountId`, `branchId`, `dateFrom`, `dateTo`, `transactionType`, `expenseCategory`, `employeeId`, `status`, `search`, `page`, `pageSize`
- `customerId` / `vendorId` accepted silently (no FK on Ledger — safe degradation)
- `mapTxnType()` maps Ledger type strings to Cash Book enum values
- `npm run build` (Next.js only) ✅ · `npx prisma validate` ✅
- Cash Book UI still on mock data — wiring deferred to Step 2D

---

### Step 2D — Expense Register API (read-only)

- The `GET /api/expenses` route already exists. Wire `/finance/expenses` register view to call it
- Add `summary` aggregation to the response (total amount, pending count, GST total)
- Show real records in `ExpenseTable`
- Remove mock import from `ExpenseRegisterClient`

---

### Step 2E — Finance Dashboard API (read-only aggregation)

- Implement `GET /api/finance/dashboard` aggregating from `FinAccount`, `Ledger`, `Expense`
- Wire `FinanceDashboardClient` server page to fetch and pass real props
- Remove inline `deriveData()` mock

---

### Step 2F — Finance Approvals (wire to global Approval Engine)

- Replace `MOCK_REQUESTS` in `/finance/approvals/page.tsx` with a server-side call to `listApprovalRequests({ entityType: "EXPENSE" })`
- Confirm that `FinanceApprovalsClient` `doApprove` / `doReject` handlers call `POST /api/approvals/[id]/action` — they currently only update local state
- Wire the action handlers to the real API

---

### Step 2G — Expense Category List (read endpoint for dropdown)

- Implement `GET /api/finance/categories` (lightweight, public-read)
- Wire expense form category dropdown to this endpoint
- Replace `CATEGORIES` constant in `expenses/data.ts`

---

### Step 2H — Enable Bank Book POST (write transactions)

- Implement `POST /api/finance/bank-book` with `prisma.$transaction` (Ledger create + FinAccount balance update)
- Wire `BankTransactionDrawer` submit form
- Retire `MOCK_BANK_TXNS` mutation helpers

---

### Step 2I — Enable Cash Book POST (write transactions)

- Implement `POST /api/finance/cash-book` with `prisma.$transaction`
- Wire `CashTransactionDrawer` and `CashTransferPanel`
- Implement `pairedLedgerId` linking for Bank↔Cash transfers
- Retire `transferStore.ts`

---

### Step 2J — Employee Advances API

- Implement `GET /api/finance/advances` (list `EmployeeAdvance`)
- Implement `POST /api/finance/advances` (create + trigger approval)
- Implement `POST /api/finance/advances/[id]/disburse` (disburse + ledger posting)
- Build list UI for `/finance/advances` page

---

### Step 2K — Conveyance API

- Implement `GET /api/finance/conveyance` (list TravelClaims)
- Implement `POST /api/finance/conveyance` (submit a trip)
- Add `monthlyPeriod` field to `TravelClaim` via migration (needed for monthly settlement grouping)
- Wire `TravelClaimTable` and `TravelEntryForm`

---

### Step 2L — Vouchers API

- Implement `GET /api/finance/vouchers` (list Voucher)
- Build list UI for `/finance/vouchers` page
- POST (create voucher) follows once ledger posting logic is stable

---

### Step 2M — Remove Mock Data

- Once all above endpoints are wired and verified on dev:
  - Delete or archive mock arrays from each `data.ts`
  - Remove "Demo data" banners
  - Confirm with Vijesh before pushing to production

---

## 9. Files Expected to Change Later

These files are identified as likely to change during API implementation phases. **Do not modify them now.**

| File | Reason for change |
|---|---|
| `src/app/finance/page.tsx` | Will pass real API props to `FinanceDashboardClient` |
| `src/app/finance/FinanceDashboardClient.tsx` | Will replace `deriveData()` with props from server; remove mock multipliers |
| `src/app/finance/bank-book/page.tsx` | Will pass initial transaction data from server Prisma query |
| `src/app/finance/bank-book/BankBookClient.tsx` | Will call `GET /api/finance/bank-book` instead of using `MOCK_BANK_TXNS` |
| `src/app/finance/bank-book/data.ts` | Mock arrays will be removed; type definitions and helpers will stay |
| `src/app/finance/cash-book/page.tsx` | Same as bank-book page |
| `src/app/finance/cash-book/CashBookClient.tsx` | Will call `GET /api/finance/cash-book` |
| `src/app/finance/cash-book/data.ts` | Mock arrays removed; helpers stay |
| `src/app/finance/expenses/page.tsx` | Will pass real expense summaries from server |
| `src/app/finance/expenses/ExpenseRegisterClient.tsx` | Will call `GET /api/finance/expenses` |
| `src/app/finance/expenses/data.ts` | `MOCK_EXPENSES` removed; type exports stay |
| `src/app/finance/expenses/new/ExpenseEntryForm.tsx` | Will wire form submit to `POST /api/expenses` or `/api/finance/expenses` |
| `src/app/finance/expenses/categories/ExpenseCategoriesClient.tsx` | Will call `GET /api/admin/finance/expenses` |
| `src/app/finance/expenses/categories/data.ts` | `MOCK_CATEGORIES` removed |
| `src/app/finance/approvals/page.tsx` | Will call `listApprovalRequests` server-side (replace `MOCK_REQUESTS`) |
| `src/app/finance/approvals/FinanceApprovalsClient.tsx` | Action handlers will call `POST /api/approvals/[id]/action` |
| `src/app/finance/conveyance/page.tsx` | Will pass real TravelClaim data |
| `src/app/finance/conveyance/ConveyanceClient.tsx` | Will call `/api/finance/conveyance` |
| `src/app/finance/conveyance/data.ts` | Mock arrays removed |
| `src/app/finance/advances/page.tsx` | Will be rebuilt from "Coming soon" into a real list page |
| `src/app/finance/vouchers/page.tsx` | Will be rebuilt from "Coming soon" into a real list page |
| `src/app/finance/_shared/transferStore.ts` | Will be retired when Bank↔Cash transfer posts paired Ledger entries |
| `prisma/schema.prisma` | Schema fields to add: `monthlyPeriod` on TravelClaim; `paymentMode`/`finAccountId` on Expense; optional `approvalRequestId` on EmployeeAdvance and TravelClaim |
| `src/lib/finance-engine/` (to be created) | New service layer: `cash-book.ts`, `bank-book.ts`, `voucher.ts`, `advance.ts`, `conveyance.ts` — atomic balance-update helpers using `prisma.$transaction` |
| `src/lib/roles.ts` | `canManageFinance` is already present; may need `canViewFinance` for read-only employee access to own expense register |
| `src/app/api/expenses/route.ts` | May be extended with `paymentMode` and `finAccountId` fields when schema adds them |

---

## 10. Final Recommendation

### Is the project ready for Finance API implementation?

**Yes — with three preconditions.**

The Finance Phase 1 schema is solid. The 10 Prisma models are well-designed and cover all required entities. The global Approval Engine is live and working. The expense POST API already exists and is partially wired. The mock UI shapes in `data.ts` serve as the exact contract for the backend.

**Three things must be resolved before writing Finance API code:**

1. **Build a minimal `FinAccount` management screen** (Step 2A). Without knowing which `accountId` refers to which account, every Finance API call is blind.

2. **Add a `currentFinancialYear` setting to `AppSetting`** (or read it from `VoucherSequence`) so voucher numbering and FY-filtered queries are parameterised, not hardcoded as `"26-27"`.

3. **Add "Demo data — not connected to live accounts" banners** to all three mock Finance pages (`/finance`, `/finance/bank-book`, `/finance/cash-book`) before any production deploy, even partial.

---

### Which endpoint should be built first?

**`GET /api/finance/accounts`** (Ledger Master list) — to surface FinAccount records to the UI.

Immediately followed by **`GET /api/finance/bank-book`** — a pure read-only query against existing `Ledger` rows. It is the highest-value, lowest-risk first step: no writes, no balance mutations, no approval logic. It demonstrates the real data is reachable and verifies the Prisma query pattern for all subsequent Finance endpoints.

---

### Does any schema issue block progress?

**Two schema additions are needed but only for write endpoints, not read-only.**

| Field | Model | Needed for | Blocks |
|---|---|---|---|
| `monthlyPeriod` (String, e.g. `"2026-06"`) | `TravelClaim` | Conveyance monthly settlement (Step 2K) | Only blocks monthly settlement, not trip read/create |
| `paymentMode` + `finAccountId` | `Expense` | Expense-to-ledger posting (Step 2G+) | Only blocks marking expense "paid" with ledger; not needed for create/list |
| `approvalRequestId` | `EmployeeAdvance`, `TravelClaim` | Linking back to global `ApprovalRequest` | Not blocking; can cross-reference via `entityId` on `ApprovalRequest` instead |

**Read-only wiring (Steps 2B–2F) can begin immediately with no schema changes.**

Write endpoints (Steps 2H–2K) require the two schema additions above, each requiring a `npx prisma migrate dev` cycle and dev server restart.

---

*Document prepared by analysis of: `prisma/schema.prisma`, `src/app/finance/**`, `src/app/api/expenses/route.ts`, `src/app/api/advances/route.ts`, `src/app/api/approvals/route.ts`, `src/app/api/approvals/[id]/action/route.ts`, `src/app/api/admin/finance/**`, `src/lib/workflow-engine.ts` references, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/modules/finance/IMPLEMENTATION_PLAN.md`. No code was modified.*
