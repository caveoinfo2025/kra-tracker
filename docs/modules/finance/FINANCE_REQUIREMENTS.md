# Finance Operations Module — Business Requirements

> **Status: APPROVED FINAL SCOPE** (updated from initial draft)
> Part of the Caveo CRM internal documentation set.
> Read `docs/PROJECT_MEMORY.md` for project-wide context.
> Database: MySQL 8-compatible (MariaDB 11.8) · ORM: Prisma 7

---

## 1. Module Overview

The Finance Operations Module is a full internal accounting and expense-management
layer within Caveo CRM. It covers cash and bank books, vendor management,
expense tracking, voucher generation, approval workflows, employee claims,
advances, HR expense policies, local conveyance, customer profitability,
and reporting — all accessible from the web app and mobile app.

**14 approved features:**

| # | Feature | Status |
|---|---|---|
| 1 | Cash Book | Planned |
| 2 | Bank Book | Planned |
| 3 | Expense Register | Planned |
| 4 | Vendor Master | Planned |
| 5 | Voucher Management | Planned |
| 6 | Approval Engine | Planned |
| 7 | Employee Claims | Planned |
| 8 | Employee Advance | Planned |
| 9 | HR Expense Policy | Planned |
| 10 | Local Conveyance | Planned |
| 11 | Customer Profitability | Planned |
| 12 | Reports Dashboard | Planned |
| 13 | Excel / PDF / Tally Export | Planned |
| 14 | Mobile App | Planned |

**Existing (Phase 0 — already live):**
- Invoice tracking (`Collection`)
- Payment ledger (`Payment`)
- Order advances (`OrderAdvance`)
- Payment notifications (`Notification`)

---

## 2. Roles & Access

| Role | Finance Access |
|---|---|
| **Head of Sales** (`isManager=true`) | Full access — all features, all employees |
| **Operations Head** | Full access — same reach as manager via `roles.ts` |
| **Accounts** | Full access — cash/bank books, expenses, vouchers, approvals, reports |
| **BDE / ISR / Inside Sales** | Submit own expenses, claims, conveyance, advance requests |
| **Sales Coordinator** | Submit own expenses, conveyance; view own claims |
| **Business Development Manager** | Submit own expenses; view own pipeline collections |

All role checks use `src/lib/roles.ts` predicates. No inline string comparisons in routes.

---

## 3. Feature Requirements

---

### 3.1 Cash Book

**Purpose:** Track physical cash movements for the company (and future branches).

#### Business Rules
- Each company / branch has one or more named `CashAccount` records.
- Opening balance is set on account creation and carried forward day-by-day.
- Balance must never go negative — any transaction that would take the balance below zero must be rejected with a validation error.
- Cash-in from a bank withdrawal creates a paired `CashEntry` (type: `bank_withdrawal`) and a `BankEntry` debit on the linked bank account.
- Cash-out entries require a narration and optionally a linked voucher.

#### Functional Requirements
| ID | Requirement |
|---|---|
| FR-CB-01 | Create and name a cash account (HO or branch) |
| FR-CB-02 | Set opening balance on account creation |
| FR-CB-03 | Record cash receipt (cash in from any source) |
| FR-CB-04 | Record cash payment (cash out for any purpose) |
| FR-CB-05 | Record cash withdrawal from bank (paired bank + cash entry) |
| FR-CB-06 | Enforce no-negative-balance rule; reject transaction if balance would go below zero |
| FR-CB-07 | Display running balance column in the cash book register |
| FR-CB-08 | Filter by date range; show opening balance for the period |
| FR-CB-09 | Branch-ready — support multiple cash accounts (HO + branches) |
| FR-CB-10 | Daily closing balance summary |

---

### 3.2 Bank Book

**Purpose:** Record and reconcile all bank account transactions.

#### Business Rules
- Each bank account (`BankAccount`) has a name, account number, IFSC, and opening balance.
- Entry types: UPI, Cheque, Transfer (NEFT/RTGS/IMPS), Receipt, Payment, Bank Charge.
- Cheque entries include cheque number and cheque date (may differ from entry date).
- A "reconciled" flag marks entries confirmed against the bank statement.
- Bank-to-cash transfer creates a paired `CashEntry` on the linked cash account.

#### Functional Requirements
| ID | Requirement |
|---|---|
| FR-BB-01 | Create and manage multiple bank accounts |
| FR-BB-02 | Record UPI transaction (reference / UTR mandatory) |
| FR-BB-03 | Record cheque payment / receipt (cheque no + date mandatory) |
| FR-BB-04 | Record bank transfer (NEFT/RTGS/IMPS) |
| FR-BB-05 | Mark individual entries as reconciled |
| FR-BB-06 | Bank statement reconciliation view — unreconciled entries highlighted |
| FR-BB-07 | Running balance column |
| FR-BB-08 | Filter by date range, entry type, reconciliation status |
| FR-BB-09 | Cash withdrawal creates a paired cash book entry automatically |

---

### 3.3 Expense Register

**Purpose:** Central register for all company and employee expenses.

#### Business Rules
- Each expense belongs to a category, has a vendor (optional), and may be tagged to a customer.
- GST input credit: capture GST rate and amount for eligible expenses.
- Vendor invoice number is captured for audit trail.
- File attachments (PDF, image) are required for expenses above a configurable limit.
- An expense moves through: `draft → submitted → approved → paid`.
- Rejected expenses return to draft for correction and resubmission.

#### Functional Requirements
| ID | Requirement |
|---|---|
| FR-EX-01 | Create expense with category, vendor, date, amount, GST, narration |
| FR-EX-02 | Tag expense to a customer name (for customer profitability) |
| FR-EX-03 | Capture GST rate (0%, 5%, 12%, 18%, 28%) and auto-compute GST amount |
| FR-EX-04 | Enter vendor invoice number |
| FR-EX-05 | Attach one or more files (receipt photos, PDF invoices) |
| FR-EX-06 | Submit for approval |
| FR-EX-07 | Expense status lifecycle: `draft → submitted → approved → rejected → paid` |
| FR-EX-08 | View all expenses (finance roles) or own expenses (reps) |
| FR-EX-09 | Filter by category, employee, date range, status |
| FR-EX-10 | Link expense to a voucher on approval |
| FR-EX-11 | Configurable attachment-required threshold (AppSetting) |

---

### 3.4 Vendor Master

**Purpose:** Central registry of vendors / suppliers used in expense recording.

#### Business Rules
- Vendor records are shared across the company.
- GSTIN and PAN are captured for tax compliance.
- Bank details are stored for payment processing.
- A vendor can be marked inactive (soft delete — never hard delete with linked expenses).

#### Functional Requirements
| ID | Requirement |
|---|---|
| FR-VM-01 | Create vendor: name, GSTIN, PAN, address, city, state, pincode |
| FR-VM-02 | Store contact person name, phone, email |
| FR-VM-03 | Store bank account details (bank name, account no, IFSC) |
| FR-VM-04 | Payment terms: `Immediate` / `15 days` / `30 days` / `45 days` / `60 days` |
| FR-VM-05 | Search and autocomplete on expense entry forms |
| FR-VM-06 | Deactivate vendor (soft delete — preserves linked expenses) |
| FR-VM-07 | View vendor expense history (all expenses linked to vendor) |

---

### 3.5 Voucher Management

**Purpose:** Formal numbered vouchers for every financial transaction.

#### Voucher Number Format
```
CI / YY-YY / 00001
│       │       └─ Sequential number (5 digits, zero-padded, resets each FY)
│       └─ Financial year (e.g., 26-27 for FY 2026-27)
└─ Company initials (Caveo Infosystems = CI)
```

Examples:
- `CI/26-27/00001` — first voucher of FY 2026-27
- `CI/26-27/00042` — 42nd voucher

#### Voucher Types
| Type | Trigger |
|---|---|
| Payment Voucher | Cash or bank payment made |
| Receipt Voucher | Cash or bank receipt recorded |
| Journal Voucher | Internal adjustment / transfer |
| Expense Voucher | Approved expense entry |
| Conveyance Voucher | Approved local conveyance claim |
| Advance Voucher | Employee advance disbursement |

#### Business Rules
- Voucher numbers are unique within a financial year and auto-incremented.
- A voucher can be in `draft`, `approved`, or `voided` state.
- Approved vouchers are immutable — corrections require a reversal journal voucher.
- PDF generation includes: company logo, company name/address, voucher number, date, payee, amount (words + figures), narration, authorised signatory line.

#### Functional Requirements
| ID | Requirement |
|---|---|
| FR-VO-01 | Auto-generate voucher number in `CI/YY-YY/00001` format |
| FR-VO-02 | Auto-reset sequence at financial year start (April 1) |
| FR-VO-03 | Generate PDF voucher with company logo |
| FR-VO-04 | Amount in words (e.g., "Rupees Twelve Lakhs Fifty Thousand Only") |
| FR-VO-05 | Print voucher from web or mobile |
| FR-VO-06 | Void a voucher with reason (creates audit trail) |
| FR-VO-07 | Link voucher to cash entry, bank entry, or expense entry |
| FR-VO-08 | Company logo configurable via Admin → Settings |

---

### 3.6 Approval Engine

**Purpose:** Configurable multi-level approval workflow for expenses, claims, and advances.

#### Business Rules
- Approval policies define amount-based thresholds and approver roles.
- Three levels maximum: Level 1 (line manager), Level 2 (department head / Finance), Level 3 (MD / Director).
- Items below the Level 1 threshold are auto-approved.
- Approvers receive an in-app notification and mobile push alert.
- Approved items automatically move to the next state in their workflow.
- Rejection at any level returns the item to draft with comments.

#### Functional Requirements
| ID | Requirement |
|---|---|
| FR-AP-01 | Define approval policies (name, expense type, amount thresholds, approver roles) |
| FR-AP-02 | Auto-approve items below the minimum threshold |
| FR-AP-03 | Level 1 approval: amount > threshold L1 and ≤ threshold L2 |
| FR-AP-04 | Level 2 approval: amount > threshold L2 and ≤ threshold L3 |
| FR-AP-05 | Level 3 approval: amount > threshold L3 |
| FR-AP-06 | Notify approvers via in-app notification when a request is pending |
| FR-AP-07 | Approver can approve or reject with a comment |
| FR-AP-08 | Rejection returns item to draft; submitter notified |
| FR-AP-09 | Approval history shown on each item (who approved, when, comments) |
| FR-AP-10 | Configurable in Admin → Finance Settings |
| FR-AP-11 | Mobile approval — approve/reject from mobile app |

---

### 3.7 Employee Claims

**Purpose:** Employees batch multiple expense entries into a reimbursement claim.

#### Business Rules
- A claim groups one or more `ExpenseEntry` rows submitted by the same employee.
- Claim total = sum of constituent expense amounts.
- Claims follow the Approval Engine workflow.
- Approved claims are paid on the next payroll cycle or via a direct bank transfer.
- Paid claims generate a payment voucher.

#### Claim Number Format
```
CI / CLM / YY-YY / 00001
```

#### Functional Requirements
| ID | Requirement |
|---|---|
| FR-CL-01 | Create a claim by selecting approved or draft expense entries |
| FR-CL-02 | Display claim total and breakdown by category |
| FR-CL-03 | Submit claim for approval |
| FR-CL-04 | Approval workflow via Approval Engine |
| FR-CL-05 | Record claim payment (date + amount + mode) |
| FR-CL-06 | View claim history per employee |
| FR-CL-07 | Finance view: all pending claims across the company |
| FR-CL-08 | Generate claim summary PDF for payroll records |

---

### 3.8 Employee Advance

**Purpose:** Manage advance payments to employees for upcoming expenses.

#### Business Rules
- Employee requests an advance with a stated purpose and required date.
- Advance follows the Approval Engine workflow.
- Disbursement is recorded against a bank or cash account.
- Settlement: the employee submits expense entries against the advance.
- Unsettled balance after settlement deadline must be deducted from salary (policy-driven).

#### Advance Number Format
```
CI / ADV / YY-YY / 00001
```

#### Functional Requirements
| ID | Requirement |
|---|---|
| FR-ADV-01 | Request advance: purpose, amount, required date |
| FR-ADV-02 | Approval workflow via Approval Engine |
| FR-ADV-03 | Record disbursement (cash or bank, amount, date) |
| FR-ADV-04 | Track outstanding advance balance (disbursed − settled) |
| FR-ADV-05 | Settle advance against expense entries |
| FR-ADV-06 | Alert when advance balance is unsettled past the policy deadline |
| FR-ADV-07 | Finance view: all outstanding advances company-wide |
| FR-ADV-08 | Generate advance disbursement voucher |

---

### 3.9 HR Expense Policy

**Purpose:** Define and enforce per-role expense entitlements and rate limits.

#### Business Rules
- Policies are assigned by role name pattern (flexible matching, same as `roles.ts`).
- If no policy matches an employee's role, a default policy applies.
- Local conveyance rates (bike/car/auto) are read from the active policy.
- Per-diem allowances vary by city tier (Tier 1 = metro, Tier 2 = others).
- Policy changes are effective from a set date; historical rates must be preserved.

#### Functional Requirements
| ID | Requirement |
|---|---|
| FR-HR-01 | Define policy: name, role pattern, effective date |
| FR-HR-02 | Set per-diem rate by city tier (Tier 1 / Tier 2) |
| FR-HR-03 | Set meal limit per meal |
| FR-HR-04 | Set hotel limit per night by city tier |
| FR-HR-05 | Set conveyance rates: bike (₹/km), car (₹/km), auto (₹/km) |
| FR-HR-06 | Set maximum conveyance claim per day (₹) |
| FR-HR-07 | Mark policy active/inactive; history preserved |
| FR-HR-08 | Auto-apply policy rate when employee logs conveyance |
| FR-HR-09 | Configurable in Admin → Finance Settings |

---

### 3.10 Local Conveyance

**Purpose:** Log and claim employee travel expenses for local (intra-city) trips.

#### Business Rules
- Supported modes: Bike, Car, Auto / Public Transport.
- Distance can be captured via Google Maps (GPS start + end coordinates → Maps Distance Matrix API) or manually entered.
- Rate per KM is read from the employee's active HR Expense Policy.
- Claim amount = distance × rate (auto-calculated; not manually editable after GPS capture).
- Conveyance log auto-creates a linked `ExpenseEntry` and submits for approval.
- Daily conveyance cap enforced from HR Expense Policy.

#### Functional Requirements
| ID | Requirement |
|---|---|
| FR-CV-01 | Log trip: from location, to location, travel date, mode, purpose |
| FR-CV-02 | Capture GPS coordinates at start and end (mobile) |
| FR-CV-03 | Calculate distance via Google Maps Distance Matrix API (road distance) |
| FR-CV-04 | Fallback: manual KM entry if GPS unavailable |
| FR-CV-05 | Auto-apply rate from HR Expense Policy |
| FR-CV-06 | Auto-calculate claim amount (KM × rate) |
| FR-CV-07 | Enforce daily conveyance cap from HR Policy |
| FR-CV-08 | Submit for approval via Approval Engine |
| FR-CV-09 | View conveyance history per employee |
| FR-CV-10 | Finance: view all conveyance across the company with map overlay |

---

### 3.11 Customer Profitability

**Purpose:** Measure gross margin per customer by combining CRM revenue with tagged expenses.

#### Business Rules
- Revenue = `Collection.invoiceValueLakhs` (or `amountReceivedLakhs` for cash-basis) for the customer.
- Direct costs = `ExpenseEntry.amountLakhs` where `customerId` matches.
- Gross profit = Revenue − Direct Costs.
- Gross margin % = (Gross Profit / Revenue) × 100.
- Data is read-only (computed from existing tables — no separate model needed).

#### Functional Requirements
| ID | Requirement |
|---|---|
| FR-CP-01 | Customer profitability report: revenue, costs, gross profit, margin % |
| FR-CP-02 | Date range filter (current FY / custom) |
| FR-CP-03 | Sort by gross profit descending |
| FR-CP-04 | Drill-down: list of invoices and expenses for a selected customer |
| FR-CP-05 | Export to Excel / PDF |
| FR-CP-06 | Trend chart: monthly profitability per customer (Recharts) |

---

### 3.12 Reports Dashboard

**Purpose:** Central finance reporting screen for managers and Accounts.

#### Reports Included
| Report | Data source |
|---|---|
| Cash Position | CashAccount running balances |
| Bank Balance | BankAccount running balances |
| Daily Collections | Payments received today (existing) |
| Expense Summary | ExpenseEntry grouped by category / employee / period |
| Pending Approvals | ApprovalRequest where status = "pending" |
| Outstanding Advances | EmployeeAdvance where status = "disbursed" |
| Overdue Invoices | Collection where isOverdue |
| Customer Profitability | Computed from Collections + ExpenseEntry |
| Conveyance Summary | ConveyanceLog by employee / period |
| DSO (Days Sales Outstanding) | Avg(paymentReceivedDate − invoiceDate) |

#### Functional Requirements
| ID | Requirement |
|---|---|
| FR-RP-01 | Dashboard with summary cards for all key finance metrics |
| FR-RP-02 | Date range filter on all reports |
| FR-RP-03 | Employee/department filter (finance roles) |
| FR-RP-04 | Charts via Recharts (line, bar, pie as appropriate) |
| FR-RP-05 | One-click export to Excel or PDF from each report |
| FR-RP-06 | Real-time data (no caching beyond the request cycle) |

---

### 3.13 Excel / PDF / Tally Export

**Purpose:** Export finance data in formats compatible with Excel, PDF, and Tally Prime.

#### Export Types
| Export | Formats | Data |
|---|---|---|
| Cash Book | Excel, PDF, Tally XML | CashEntry rows for a date range |
| Bank Book | Excel, PDF, Tally XML | BankEntry rows for a date range |
| Expense Register | Excel, PDF, Tally XML | ExpenseEntry rows for a date range |
| Voucher Register | Excel, PDF | Voucher list with amounts |
| Invoice / Collections | Excel, PDF, Tally XML | Collection rows (existing) |
| Payment Register | Excel, PDF, Tally XML | Payment rows (existing) |
| Customer Profitability | Excel, PDF | Profitability computed data |
| Conveyance Summary | Excel, PDF | ConveyanceLog rows |

#### Functional Requirements
| ID | Requirement |
|---|---|
| FR-EXP-01 | Excel export (`.xlsx`) for all reports |
| FR-EXP-02 | PDF export for all reports and individual vouchers |
| FR-EXP-03 | Tally XML export (voucher format) for Cash Book, Bank Book, Expense Register, Invoice, Payment |
| FR-EXP-04 | Date range selection on all exports |
| FR-EXP-05 | Tally ledger name mapping via Admin → Settings |
| FR-EXP-06 | Tally voucher number matches the system voucher number |
| FR-EXP-07 | Company logo embedded in PDF reports |
| FR-EXP-08 | Amount in Rupees in exports (convert from Lakhs: × 100,000) |

---

### 3.14 Mobile App — Finance Features

**Purpose:** Allow field employees to capture expenses and conveyance on the go;
allow approvers to action requests from mobile.

#### Functional Requirements
| ID | Requirement |
|---|---|
| FR-MB-01 | Camera bill capture — take a photo of a receipt and attach to an expense |
| FR-MB-02 | Manual expense entry form (category, amount, GST, vendor, narration) |
| FR-MB-03 | Log local conveyance: mode, from/to, GPS capture, auto-calculation |
| FR-MB-04 | View pending approval requests (for approvers) |
| FR-MB-05 | Approve or reject a request with a comment (for approvers) |
| FR-MB-06 | View own expense claims and their status |
| FR-MB-07 | View own advance balance and settlement status |
| FR-MB-08 | Collections screen (existing) — read-only invoice view |
| FR-MB-09 | Push notification when an expense/claim/advance is approved or rejected |

---

## 4. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Database** | MySQL 8-compatible (MariaDB 11.8); all Prisma models use `provider=mysql`, `@db.Text`, `@@index` rules |
| **Data integrity** | Cached balance fields must only be updated through the designated service functions |
| **No negative cash** | Enforced at the service layer before any CashEntry is written |
| **Concurrency** | All multi-step writes (`prisma.$transaction`) — cash/bank balance updates, voucher sequence, approval state changes |
| **Audit trail** | Every financial entry carries `recordedById` / `createdById` and a timestamp; no hard deletes on financial data |
| **File storage** | Attachments stored in a cloud bucket (Cloudflare R2 or S3); only the URL is stored in the database |
| **Money precision** | Target: `@db.Decimal(12,4)` on all Lakhs fields. Current: `Float` (DOUBLE) |
| **Voucher sequence** | Voucher auto-increment must be atomic (use `SELECT ... FOR UPDATE` or a dedicated sequence table) |
| **Role enforcement** | Every API route checks the appropriate role predicate from `src/lib/roles.ts` |
