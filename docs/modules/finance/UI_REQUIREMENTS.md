# Finance Operations Module — Web UI Requirements

> **Status: APPROVED FINAL SCOPE**
> Design system: `globals.css` tokens, Tailwind v4, SheetLayout, Badge, lucide-react.
> Route prefix: `/finance/`

---

## 1. Navigation & Layout

### Finance Hub (`/finance`)

A top-level finance section with its own sub-navigation sidebar (or top tabs).
Visible only to `canManageFinance` users (Accounts, Operations Head, Manager).
Sales reps land on `/finance/expenses` and `/finance/claims` (own data only).

### Sub-Routes

| Route | Page | Access |
|---|---|---|
| `/finance/cash-book` | Cash Book register | Finance roles |
| `/finance/bank-book` | Bank Book register | Finance roles |
| `/finance/expenses` | Expense Register | All (own) / Finance roles (all) |
| `/finance/vendors` | Vendor Master | Finance roles |
| `/finance/vouchers` | Voucher Register | Finance roles |
| `/finance/approvals` | Approval Queue | Approvers + Finance roles |
| `/finance/claims` | Employee Claims | All (own) / Finance roles (all) |
| `/finance/advances` | Employee Advances | All (own) / Finance roles (all) |
| `/finance/hr-policy` | HR Expense Policy | Managers only |
| `/finance/conveyance` | Conveyance Log | All (own) / Finance roles (all) |
| `/finance/profitability` | Customer Profitability | Finance roles + Managers |
| `/finance/reports` | Reports Dashboard | Finance roles + Managers |

---

## 2. Cash Book Page (`/finance/cash-book`)

**Header:** Account selector dropdown (if multiple accounts). Running balance chip.

**Summary cards:**
- Opening Balance (for selected period)
- Total Receipts
- Total Payments
- Closing Balance

**Date range filter:** From / To with quick presets (Today / This Week / This Month / This FY).

**Entry table columns:**
| Date | Type | Narration | Receipts (₹L) | Payments (₹L) | Balance (₹L) |

- Receipts and payments in separate credit/debit columns (Indian cash-book style).
- Running balance in each row.
- Colour coding: receipts in green, payments in red.

**Add Entry button → slide-in form:**
- Type: Receipt / Payment / Bank Withdrawal / Bank Deposit
- Date, Amount, Narration
- Linked bank account (required for Bank Withdrawal/Deposit)
- Validation: amount must not make balance negative (live preview of balance after entry)

---

## 3. Bank Book Page (`/finance/bank-book`)

**Header:** Account selector. Current balance chip.

**Sub-tabs:** All Entries | Unreconciled | By Type (UPI / Cheque / Transfer)

**Entry table columns:**
| Date | Type | Narration | Payee | Reference No | Debit (₹L) | Credit (₹L) | Balance (₹L) | Reconciled |

- Unreconciled rows: yellow left border highlight.
- Cheque rows: display cheque no + cheque date.
- "Reconcile" button on each unreconciled row.

**Add Entry form fields:**
- Type, Direction (Debit / Credit), Date, Amount, Narration
- For UPI: UTR/Reference No (required)
- For Cheque: Cheque No (required), Cheque Date
- For Transfer (NEFT/RTGS/IMPS): Reference No, Payee
- Linked Cash Account (for cash withdrawal/deposit)

**Bank Reconciliation view:**
- Side-by-side: CRM entries vs uploaded bank statement rows
- Match / unmatch entries
- Show unmatched entries on both sides

---

## 4. Expense Register (`/finance/expenses`)

**Summary cards:** Total Expenses | Pending Approval | This Month | GST Input

**Tabs:** All / Draft / Submitted / Approved / Rejected / Paid

**Filters:** Category, Employee (finance roles), Vendor, Customer, Date Range

**Table columns:**
| Date | Category | Vendor | Customer | Narration | Amount (₹L) | GST (₹L) | Status | Actions |

**Create Expense → slide-in form:**
- Category (searchable select)
- Vendor (searchable autocomplete from Vendor Master)
- Customer Name (optional, autocomplete from Customer master)
- Expense Date
- Amount (Lakhs)
- GST Rate (0% / 5% / 12% / 18% / 28%) — GST amount auto-computes
- Vendor Invoice No
- Narration (required)
- Attachments (file upload — images + PDF)

**Attachment upload:**
- Drag-and-drop or browse
- Preview thumbnails for images; PDF icon for PDFs
- Remove individual attachments

**Submit button:** Moves status to `submitted` → triggers approval flow.

**Approval history accordion:** Shows who approved at each level with timestamp + comment.

---

## 5. Vendor Master (`/finance/vendors`)

**Table columns:** Name | GSTIN | City | State | Contact | Payment Terms | Status | Actions

**Search:** Name / GSTIN contains.

**Create / Edit Vendor → slide-in form:**
- Name, GSTIN, PAN
- Address, City, State, Pincode
- Contact Name, Phone, Email
- Bank Name, Account No, IFSC
- Payment Terms (dropdown)

**Vendor detail → Expense History tab:** all expenses linked to this vendor.

---

## 6. Voucher Register (`/finance/vouchers`)

**Table columns:** Voucher No | Type | Date | Narration | Amount (₹L) | Status | PDF | Actions

**Filters:** Type, Status, Date Range

**Voucher detail view:**
- Header: company logo, company name, address
- Voucher number (bold, prominent)
- Date, type, amount
- Amount in words (e.g., "Rupees Five Lakhs Only")
- Narration
- Linked entities (cash/bank entry, expense, conveyance)
- Signatory line (Prepared by / Approved by)

**Print / Download PDF button** on each voucher row and in the detail view.

**Void button:** Opens confirmation modal with reason field.

---

## 7. Approval Queue (`/finance/approvals`)

**Sub-tabs:** Pending (mine) | All Pending | Approved | Rejected

**My Queue:** Requests where the current user is the next approver.

**Table columns:** Ref No | Entity Type | Submitted By | Amount (₹L) | Submitted On | Days Pending | Actions

**Actions on each row:** View Details → Approve (with comment) / Reject (reason required)

**Entity detail preview:** Shows the underlying expense / claim / advance inline without leaving the page.

**Approval Policy configuration (Managers → `/finance/hr-policy` or sub-tab):**
- Table of policies
- Create / Edit policy: name, entity type, amount thresholds, approver role per level

---

## 8. Employee Claims (`/finance/claims`)

**Sub-tabs:** All / Draft / Submitted / Approved / Paid (employees see own only)

**Table columns:** Claim No | Date | Employee | Expenses | Total (₹L) | Status | Actions

**Create Claim:**
- Multi-select list of the employee's approved or draft expenses
- Running total as items are selected
- Remarks field
- Submit button

**Claim detail:**
- Claim number, date, employee, status
- Expense breakdown table
- Approval history
- Payment record (paid date, amount, mode)

**Finance: Record Payment button** (for approved claims): date, amount, payment mode.

---

## 9. Employee Advances (`/finance/advances`)

**Sub-tabs:** Pending / Approved / Disbursed / Settled / All

**Table columns:** Advance No | Employee | Purpose | Amount (₹L) | Balance (₹L) | Status | Actions

**Request Advance form:**
- Purpose (textarea), Amount, Required By Date

**Finance actions:**
- Approve (via Approval Engine)
- Disburse: date, actual amount, source (Cash Account / Bank Account select)
- Settle: settlement date, amount, link to expense entries

---

## 10. HR Expense Policy (`/finance/hr-policy`)

**Access:** Managers only.

**Table columns:** Policy Name | Role Pattern | Bike ₹/km | Car ₹/km | Effective From | Status

**Create / Edit Policy form:**
- Name, Role Pattern (text with hint: "all" for default, or role name)
- Per-diem Tier 1 (₹L), Tier 2 (₹L)
- Meal Limit (₹L)
- Hotel Tier 1 (₹L), Tier 2 (₹L)
- Bike ₹/km, Car ₹/km, Auto ₹/km
- Max Conveyance per Day (₹)
- Effective From date

---

## 11. Conveyance Log (`/finance/conveyance`)

**Sub-tabs:** All / Draft / Submitted / Approved / Paid

**Summary cards:** Total KM | Total Amount (₹L) | This Month | Pending Approval

**Table columns:** Date | From | To | Mode | KM | Rate | Amount (₹L) | Status | Actions

**Log Trip form:**
- Travel Date
- From Location (text + optional map picker button)
- To Location (text + optional map picker button)
- Distance (KM) — auto-filled from Maps API if coordinates captured; editable fallback
- Mode: Bike / Car / Auto / Public Transport (segmented)
- Purpose (text)
- Rate per KM (auto-read from HR Policy; shown as read-only)
- Calculated Amount (read-only: KM × Rate)

**Map picker (web):**
- Google Maps autocomplete for From / To fields
- Shows route on a small map preview
- Fetches road distance on confirm

---

## 12. Customer Profitability (`/finance/profitability`)

**Header:** Date range filter (default: current FY)

**Summary cards:** Total Revenue | Total Costs | Gross Profit | Avg Margin %

**Table columns:**
| Customer | Revenue (₹L) | Cost (₹L) | Gross Profit (₹L) | Margin % | Invoices | Expenses |

Sorted by Gross Profit descending. Click row → drill-down view.

**Drill-down view:**
- Customer name header
- Two tabs: **Invoices** (Collection list) and **Expenses** (tagged ExpenseEntry list)
- Monthly trend chart (Recharts line chart)

**Export:** Excel / PDF buttons.

---

## 13. Reports Dashboard (`/finance/reports`)

**Date range picker** at the top (affects all widgets).

**Widget grid:**

| Widget | Chart type | Data source |
|---|---|---|
| Cash Position | Single value + sparkline | CashAccount balances |
| Bank Balance | Single value + sparkline | BankAccount balances |
| Collections Today | Large number | Existing payments API |
| Expense by Category | Pie chart | ExpenseEntry grouped by category |
| Pending Approvals | Count + list | ApprovalRequest pending |
| Outstanding Advances | Count + total | EmployeeAdvance disbursed |
| Overdue Invoices | Count + amount | Collection overdue |
| Monthly Collections vs Expenses | Bar chart (grouped) | Collections + Expenses by month |
| Conveyance by Employee | Bar chart | ConveyanceLog grouped |
| DSO Trend | Line chart | Avg (paymentReceivedDate − invoiceDate) |

**Export All button:** Downloads a ZIP of all report PDFs.

---

## 14. Export Controls (all pages)

Every list page has an **Export** button in the toolbar opening a modal:

```
┌─ Export ─────────────────────────────────────────────┐
│  Date Range:  [From ____]  [To ____]                 │
│  Format:      ○ Excel   ○ PDF   ○ Tally XML           │
│  Employee:    [All ▾]   (finance roles only)          │
│                        [ Cancel ]  [ Download ]       │
└───────────────────────────────────────────────────────┘
```

Tally XML option is available only for: Cash Book, Bank Book, Expenses, Collections, Payments.
