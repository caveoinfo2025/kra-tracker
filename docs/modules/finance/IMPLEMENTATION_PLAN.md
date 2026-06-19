# Finance Operations Module — Implementation Plan

> **Status: APPROVED FINAL SCOPE — 14 features**
> Database: MySQL 8-compatible (MariaDB 11.8)
> All Prisma models follow the rules in `docs/DATABASE.md § 7`.
> Confirm with the user before pushing any phase to production.

---

## Phase 0 — Already Live (baseline)

**Status:** ✅ Complete in production.

| Feature | Description |
|---|---|
| Invoice management | `Collection` CRUD, bulk delete, filters |
| Payment ledger | `Payment` rows, `syncCollectionTotals`, opening-balance reconciliation |
| Order advances | `OrderAdvance` — create, list, apply to invoice |
| Payment notifications | Fan-out on payment events |
| Daily collections summary | `GET /api/payments/today`, web widget + mobile KPIs |
| Mobile collections | `CollectionsScreen` — read-only with overdue alerts |

---

## Phase 1 — Foundation (prerequisite for all other phases)

**Goal:** Establish the data layer and shared infrastructure before feature work.
Nothing visible to end users yet.

### 1.1 — Schema migration

Add all new models to `prisma/schema.prisma`:
`CashAccount`, `CashEntry`, `BankAccount`, `BankEntry`, `Vendor`, `ExpenseCategory`,
`ExpenseEntry`, `ExpenseAttachment`, `VoucherSequence`, `Voucher`, `ApprovalPolicy`,
`ApprovalRequest`, `EmployeeClaim`, `EmployeeAdvance`, `HRExpensePolicy`, `ConveyanceLog`

Add back-reference fields to `Employee` model.

```bash
npx prisma migrate dev --name finance_operations_module
npx prisma generate
# Restart dev server after generate
```

### 1.2 — Service layer scaffolding

Create `src/lib/finance/` directory with placeholder files:

| File | Initial content |
|---|---|
| `cash-book.ts` | `createCashEntry`, balance enforcement |
| `bank-book.ts` | `createBankEntry`, reconciliation |
| `voucher.ts` | `nextVoucherNumber` (atomic), `generateVoucherPDF` stub |
| `approval-engine.ts` | `createApprovalRequest`, `advanceApproval`, `rejectApproval` |
| `conveyance.ts` | `createConveyanceLog`, rate lookup, daily cap |
| `profitability.ts` | `getCustomerProfitability` |
| `google-maps.ts` | `getRoadDistanceKm` + Haversine fallback |
| `tally-xml.ts` | XML builder stub |
| `excel-export.ts` | Sheet builder stub |
| `pdf-report.ts` | PDF builder stub |
| `amount-to-words.ts` | Indian number words |

### 1.3 — Role predicates

Add to `src/lib/roles.ts`:
- `canManageFinance(user)` — same set as `canManagePayments`
- `canApprove(user)` — managers + employees with approver role
- `canManageVendors(user)` — finance roles
- `canManagePolicy(user)` — managers only

### 1.4 — Approval Engine base policies

Seed default `ApprovalPolicy` rows and default `ExpenseCategory` rows via a
Prisma seed script or via the Admin settings panel once it is built.

### 1.5 — AppSetting keys

Add to `src/lib/settings.ts` defaults:
- Tally ledger mapping keys (`finance.tally.*`)
- Company logo URL (`company.logo.url`)
- Attachment size limit (`finance.attachment.maxMb`)
- Expense attachment required above (`finance.expense.attachmentRequiredAboveLakhs`)
- Conveyance daily cap override (`finance.conveyance.dailyCapRupees`)

**Acceptance criteria:** `npx prisma migrate dev` succeeds; all new tables exist in MySQL;
`npm run build` passes with zero TypeScript errors.

---

## Phase 2 — Vendor Master + Expense Register

**Goal:** Core expense tracking — the most-used daily feature for field employees.

### Deliverables
- `GET/POST/PUT/DELETE /api/finance/vendors`
- Vendor Master page (`/finance/vendors`)
- `GET/POST/PUT/DELETE /api/finance/expenses`
- `POST /api/finance/expenses/[id]/submit`
- `GET/POST/DELETE /api/finance/expenses/[id]/attachments`
- `GET /api/finance/expense-categories` + category management
- Expense Register page (`/finance/expenses`)
- File upload to cloud storage (Cloudflare R2 or S3)

### Key decisions before starting
- Choose cloud storage provider (R2 recommended — no egress fees; works with existing Hostinger setup)
- Configure `CLOUD_STORAGE_BUCKET`, `CLOUD_STORAGE_KEY`, `CLOUD_STORAGE_SECRET` in environment

### Acceptance criteria
- An employee can create a draft expense, attach a photo, and submit it.
- Finance roles can view all employees' expenses.
- Vendor autocomplete works on the expense form.

---

## Phase 3 — Approval Engine

**Goal:** Configurable approval workflow used by expenses, claims, advances, and conveyance.

### Deliverables
- `GET/POST /api/finance/approvals/policies`
- `GET /api/finance/approvals`
- `POST /api/finance/approvals/[id]/approve`
- `POST /api/finance/approvals/[id]/reject`
- Approval Queue page (`/finance/approvals`)
- Approval policy configuration in Admin → Finance Settings
- In-app notifications for approval events (reuse existing `Notification` model)
- Mobile: `ApprovalsScreen.tsx`

### Acceptance criteria
- An expense submitted by a rep triggers an approval notification to the correct approver.
- Approver can approve or reject from web and mobile.
- Auto-approve works for amounts below the threshold.
- Full approval generates a voucher automatically.

---

## Phase 4 — Voucher Management

**Goal:** Formal numbered vouchers for all financial transactions.

### Deliverables
- `VoucherSequence` seed row for current FY
- `nextVoucherNumber()` service function (atomic, transactional)
- `GET/POST /api/finance/vouchers`
- `POST /api/finance/vouchers/[id]/pdf`
- `POST /api/finance/vouchers/[id]/void`
- Voucher Register page (`/finance/vouchers`)
- PDF template (company logo + amount in words + signatory lines)
- `amount-to-words.ts` helper

### Voucher number format implementation
```
Financial Year: April 1 to March 31
Current FY at runtime: if month >= 4 → "YY-YY" else "YY-YY" (previous pair)
Example: Jun 2026 → "26-27"; Feb 2027 → "26-27"; Apr 2027 → "27-28"
```

### Acceptance criteria
- First voucher of FY 2026-27 is `CI/26-27/00001`.
- 100 simultaneous voucher creation requests all get unique numbers (load test).
- PDF voucher matches the specified template.
- Void creates an audit record and prevents re-printing as valid.

---

## Phase 5 — Cash Book + Bank Book

**Goal:** Full double-entry cash and bank registers with balance tracking.

### Deliverables
- `GET/POST /api/finance/cash-book/accounts`
- `GET/POST /api/finance/cash-book/entries`
- Cash Book page (`/finance/cash-book`)
- `GET/POST /api/finance/bank-book/accounts`
- `GET/POST /api/finance/bank-book/entries`
- `POST /api/finance/bank-book/entries/[id]/reconcile`
- Bank Book page (`/finance/bank-book`)
- Bank-to-cash and cash-to-bank paired entry creation

### Key implementation constraint
All balance updates (`currentBalance` on `CashAccount` and `BankAccount`) must be
inside `prisma.$transaction` with `SELECT ... FOR UPDATE` on the account row.

### Acceptance criteria
- Cash account balance never goes below zero.
- Bank withdrawal creates both a `CashEntry` and a `BankEntry` in a single transaction.
- Running balance column is accurate to 4 decimal places.
- Bank reconciliation view distinguishes reconciled vs unreconciled entries.

---

## Phase 6 — Employee Claims + Advances

**Goal:** Reimbursement claims and advance management for field employees.

### Deliverables
- `GET/POST /api/finance/claims`
- `POST /api/finance/claims/[id]/submit`
- `POST /api/finance/claims/[id]/pay`
- Employee Claims page (`/finance/claims`)
- `GET/POST /api/finance/advances/employee`
- `POST /api/finance/advances/employee/[id]/submit`
- `POST /api/finance/advances/employee/[id]/disburse`
- `POST /api/finance/advances/employee/[id]/settle`
- Employee Advances page (`/finance/advances`)
- Claim number and advance number generators (same atomic pattern as vouchers)

### Acceptance criteria
- An employee can batch multiple expenses into a claim and submit it.
- Approved claim generates a payment voucher on pay recording.
- Advance balance is correctly decremented on settlement.
- Outstanding advance alert appears on the Reports Dashboard.

---

## Phase 7 — HR Expense Policy + Local Conveyance

**Goal:** Policy-driven conveyance logging with GPS and Google Maps distance.

### Deliverables
- `GET/POST/PUT /api/finance/hr-policy`
- `GET /api/finance/hr-policy/me`
- `GET /api/finance/conveyance/distance` (Google Maps)
- `GET/POST /api/finance/conveyance`
- `POST /api/finance/conveyance/[id]/submit`
- Google Maps API keys provisioned (see `GOOGLE_MAPS_INTEGRATION.md`)
- `src/lib/finance/google-maps.ts` with Haversine fallback
- HR Policy config page (`/finance/hr-policy`)
- Conveyance Log page (`/finance/conveyance`)
- Mobile: `ConveyanceScreen.tsx`
- Mobile: Expense entry with camera — `ExpenseEntryScreen.tsx`

### Acceptance criteria
- HR Policy page allows setting bike/car rate; rate is reflected on conveyance form.
- GPS capture on mobile returns coordinates within 10 seconds.
- Distance Matrix API returns road KM within 5% of Google Maps app for the same route.
- Haversine fallback triggers when the Maps API is unavailable.
- Daily cap enforced (rejects if amount would exceed `maxConveyanceDayRupees`).

---

## Phase 8 — Customer Profitability + Reports Dashboard

**Goal:** Management visibility into margin and full finance reporting.

### Deliverables
- `GET /api/finance/profitability`
- `GET /api/finance/profitability/[customerName]`
- Customer Profitability page (`/finance/profitability`)
- `GET /api/finance/reports/summary`
- `GET /api/finance/reports/expense-summary`
- Reports Dashboard page (`/finance/reports`) with all widgets and Recharts

### Acceptance criteria
- Profitability report correctly reflects tagged customer expenses vs revenue.
- Reports Dashboard loads in under 3 seconds for 12 months of data.
- All Recharts components are responsive and render correctly on tablet widths.

---

## Phase 9 — Excel / PDF / Tally Export

**Goal:** Complete export capability across all finance data types.

### Deliverables
- `exceljs` added to `package.json`
- `@react-pdf/renderer` added to `package.json`
- `src/lib/finance/excel-export.ts` — all sheet builders
- `src/lib/finance/pdf-report.ts` — report PDFs + voucher PDF
- `src/lib/finance/tally-xml.ts` — full XML builder for all entity types
- `src/lib/finance/amount-to-words.ts`
- `GET /api/finance/export` unified endpoint
- Export button + modal on all applicable list pages
- Tally ledger AppSetting keys in Admin → Finance Settings

### Acceptance criteria
- Cash Book Excel has correct running balance column.
- Voucher PDF matches the approved template with company logo.
- Tally XML imports into Tally Prime without ledger errors (tested against a trial company).
- Amount in words is correct for values from ₹1 to ₹9,99,99,999.

---

## Phase 10 — Mobile Finance (Expense Entry + Conveyance + Approvals)

**Goal:** Field-facing mobile features for daily expense capture.

### Deliverables
- `ExpenseEntryScreen.tsx` — list + create mode + camera capture
- `ConveyanceScreen.tsx` — list + GPS create mode
- `ApprovalsScreen.tsx` — pending queue + approve/reject bottom sheet
- FAB quick-log options: "Log Expense" + "Log Conveyance"
- Me tab shortcuts: My Expenses, Conveyance, My Claims, Pending Approvals
- TodayScreen finance KPI cards (expenses this month, pending approvals)

### Acceptance criteria
- Camera capture opens native Android camera (Capacitor WebView).
- GPS capture works in outdoor conditions with < 10-second response.
- Approval action from mobile sends a real-time notification to the submitter.
- All new mobile screens use `.m-*` CSS classes only (no Tailwind).

---

## Development Rules (all phases)

1. **MySQL only** — `provider = "mysql"`, `@db.Text`, `@@index` on all FK columns.
2. **`prisma.$transaction`** for all multi-step writes from Phase 1 onwards.
3. **Cached fields** (`currentBalance`, `balanceLakhs`) written only by their designated service function.
4. **Voucher numbers** generated atomically — never use `MAX(id) + 1` pattern.
5. **No hard deletes** on financial data — use `isActive = false` or `isVoid = true`.
6. **Confirm before production push** — dev → confirm with user → push.
7. **Run `next build`** before every push (Turbopack dev does not type-check fully).
8. **File uploads** go to cloud storage — never store binary data in MySQL.
9. **API keys** never in client-side code — Google Maps server key, storage keys server-only.
10. **Test on dev server first** — all phases verified on `localhost:3000` before production.
