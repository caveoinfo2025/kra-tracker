# Finance Operations Module — UI Requirements Specification

> **Status:** APPROVED — Full specification for Phase 2 through Phase 10 implementation.
> **Design system:** `globals.css` CSS tokens + Tailwind v4. Follow the existing CRM
> conventions exactly. No new design primitives unless listed under "New components required."
> **Route prefix:** `/finance/`
> **Last updated:** 2026-06-03 — Full 12-screen specification replacing earlier draft.

---

## 0. Global Conventions

### Styling rules (mandatory for every Finance page)

| Concern | Rule |
|---|---|
| Page wrapper | `SheetLayout` component with `title`, `description`, and `action` props |
| Page body | `.page-body` (padding 24px 28px 80px) |
| KPI strip | `.kpi-grid` of `.kpi` / `.kpi-link` / `.kpi-accent` tiles |
| Tables | `.crm-table` — header cells `10.5px uppercase fg-3`, body cells `13px fg-2` |
| Numeric columns | `.th-right` on `<th>`, `.td-right` on `<td>` for money and counts |
| Strong cell text | `.cell-strong` (fg-1 + 600 weight) |
| Sub cell text | `.cell-sub` (fg-3 + 11.5px) below main cell value |
| Buttons | `.btn-cav btn-cav-primary` (red), `.btn-cav btn-cav-secondary` (outline), `.btn-cav btn-cav-ghost`, `.btn-cav btn-cav-sm` (28px height) |
| Status pills | `.badge .badge-success / .badge-warning / .badge-danger / .badge-info / .badge-neutral / .badge-accent` |
| Slide-in panel | `.detail-overlay` (fixed backdrop) + `.detail-pane` (520px, right, full-height) + `.dp-head` + `.dp-body` |
| Tabs / segments | `.seg-control` with `.active` on current tab button |
| Alert strip | `.alert-strip` + `.alert-icon-box` for top-of-page warnings |
| Section heading | `.section-label` (10.5px uppercase fg-3) before groups of fields |
| Key-value grid | `.kv-grid` (grid: 110px 1fr) + `.kv-key` + `.kv-val` for detail read-outs |
| Timeline | `.timeline` + `.timeline-item` + `.tl-dot` + `.tl-when` for audit history |
| Cards | `.card` > `.card-header` (`.ch-title` + `.ch-sub`) + `.card-body` |
| Grid helpers | `.grid-12` + `.col-4 / .col-6 / .col-7 / .col-8` for multi-column layouts |
| Inputs | `border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229]` |
| Labels | `block text-xs font-medium text-gray-700 mb-1` |
| Error message | `bg-red-50 text-red-700 text-sm px-3 py-2 rounded border border-red-200` |
| Money display | `fmt(lakhs)` → `₹X.XL` / `₹X.XCr`; `fmtShort(lakhs)` without ₹ symbol |
| Money input | Numeric in **₹ Lakhs**. Label must say `(₹L)`. Step 0.0001. |
| Reference codes | `font-family: var(--font-mono)` — voucher numbers, advance numbers, claim numbers |
| Empty states | Centered container: muted icon (32px, `--fg-4`), 14px heading, 12px sub-text, optional CTA button |
| Loading state | Skeleton rows: `bg-gray-100 animate-pulse rounded` at the same height as data rows |
| Mobile | Finance pages are **desktop-first**. Mobile access uses the separate `/mobile` app. Web pages must not break below 900px but are not optimised for mobile viewports. |

### Money in ₹ Lakhs

All `amountLakhs` fields are stored as MySQL `DOUBLE` (₹ Lakhs). Display rules:
- `≥ 100 L` → show as Cr: `₹2.5Cr`
- `1 L – 99.9 L` → show as L: `₹12.4L`
- `< 1 L` → show as K: `₹45K`
- In table cells: always right-align (`td-right`), `font-variant-numeric: tabular-nums`
- In KPI tiles: use `kpi-value` with `unit` span

### Finance status badge mapping

| Status string | CSS class | Label |
|---|---|---|
| `draft` | `.badge-neutral` | Draft |
| `submitted` | `.badge-info` | Submitted |
| `approved` | `.badge-success` | Approved |
| `rejected` | `.badge-danger` | Rejected |
| `paid` | `.badge-success` + `badge-accent` modifier | Paid |
| `disbursed` | `.badge-info` | Disbursed |
| `settled` | `.badge-success` | Settled |
| `void` / `voided` | `.badge-danger` | Voided |
| `pending` | `.badge-warning` | Pending |

### Role predicates for Finance

Add `canManageFinance` to `src/lib/roles.ts`:

```
canManageFinance(user) = isManager || isAccounts || isOperationsHead
```

Page-level access rules (implemented in the server `page.tsx`):

| Access level | Who | How |
|---|---|---|
| Finance Admin | `canManageFinance(user)` | Full CRUD, all employees |
| Own data | All authenticated employees | Read/create own rows only |
| Approver | `canManageFinance` or explicitly assigned approver role | Can approve/reject |
| Manager only | `isManager` | Config pages (HR Policy, ApprovalRule config) |

---

## 1. Finance Dashboard

### Purpose
Central hub for the finance function. Gives a one-screen health check: cash + bank
positions, today's approvals, pending expenses, overdue invoices, and outstanding
advances. Replaces the need to visit 4–5 pages for a morning status read.

### Route
`/finance` (also the default redirect from the Finance sidebar group)

### User roles
- `canManageFinance` — full dashboard with all employees' data
- All employees — redirected to `/finance/expenses` (own expense register)

### Layout
`SheetLayout` title `"Finance"` description `"Overview of cash, approvals, and outstanding items."` with no action button.

Below the header: a **`.kpi-grid`** (6 tiles), then a **`.grid-12`** two-column card
layout (`col-7` left, `col-5` right), then a full-width approvals card.

### KPI Strip (6 tiles)

| # | Label | Value source | CSS |
|---|---|---|---|
| 1 | Cash Balance | `FinAccount.currentBalance` where `type=cash` (sum) | `.kpi.kpi-accent` |
| 2 | Bank Balance | `FinAccount.currentBalance` where `type=bank` (sum) | `.kpi.kpi-accent` |
| 3 | Pending Approvals | Count of `Expense.status=submitted` + `EmployeeAdvance.status=pending` + `TravelClaim.status=submitted` | `.kpi.kpi-link` href `/finance/approvals` |
| 4 | This Month Expenses | Sum of `Expense.amountLakhs` where current calendar month | `.kpi` |
| 5 | Outstanding Advances | Sum of `EmployeeAdvance.balanceLakhs` where `status=disbursed` | `.kpi.kpi-link` href `/finance/advances` |
| 6 | Overdue Invoices | Count from existing `Collection` model (`isOverdue`) | `.kpi.kpi-link` href `/collections?view=overdue` |

### Left column (.col-7) — two cards stacked

**Card 1: Account Balances**
- `.card` with `.ch-title` = "Accounts"
- Table listing each `FinAccount` row: Name | Type badge | Bank / Branch | Current Balance
- Balance column right-aligned, `.cell-strong`
- "Manage" link → `/finance/cash-book` or `/finance/bank-book` based on type

**Card 2: This Month Expenses by Category**
- `.card` with `.ch-title` = "Expenses by Category"
- Horizontal funnel bars (`.funnel-stage`) — reuse the pattern from DashboardClient
- One bar per category, sorted by amount descending, top 8 shown
- Bar color: `var(--caveo-red)` for top category, `var(--ot-orange)` for second, `var(--infra-blue)` for rest
- "View All" link → `/finance/expenses`

### Right column (.col-5) — two cards stacked

**Card 1: Pending Approvals (quick list)**
- `.card` with `.ch-title` = "Pending Approvals"
- Max 5 items. Each item: entity type badge + employee name + amount + days pending
- "View All" button → `/finance/approvals`
- Empty state: `CheckCircle2` icon + "No pending approvals"

**Card 2: Recent Vouchers**
- `.card` with `.ch-title` = "Recent Vouchers"
- Last 5 `Voucher` rows: voucher no (mono) + type + date + amount
- "View All" → `/finance/vouchers`

### Buttons / Actions
- Each KPI tile with `kpi-link` class navigates to the related list page
- No create actions on the dashboard itself

### Empty states
- If `FinAccount` table has no rows: show `.alert-strip` "No accounts configured. Ask your admin to seed accounts."
- If all KPI values are 0: tiles still render with `0` — do not hide them

### Permission rules
- Server `page.tsx` checks `canManageFinance(user)`. If false → `redirect("/finance/expenses")`.
- All Prisma queries in `page.tsx` are unfiltered by `employeeId` (finance roles see all).

---

## 2. Cash Book

### Purpose
The daily cash register. Records every cash-in and cash-out transaction for a cash
`FinAccount`. Shows running balance in Indian cash-book style (separate debit/credit
columns, not a single signed column).

### Route
`/finance/cash-book`

### User roles
`canManageFinance` only. Others → `redirect("/dashboard")`.

### Layout
`SheetLayout` title `"Cash Book"` description `"Cash receipts and payments register."` action = `<AddEntryButton/>` (`.btn-cav btn-cav-primary`).

### KPI Strip (4 tiles)
Opening Balance | Total Receipts | Total Payments | Closing Balance
- All values computed from filtered `Ledger` rows where `accountId` = selected account
- Closing Balance tile: use `.kpi-accent` with green border if balance > 0, red if < 0

### Filters (toolbar row above table)

| Control | Type | Behaviour |
|---|---|---|
| Account | `<select>` | Lists all `FinAccount` where `type=cash`, `isActive=true`. Defaults to first. |
| Date From | `type="date"` | Default: 1st of current month |
| Date To | `type="date"` | Default: today |
| Quick presets | `.seg-control` buttons | "Today" / "This Week" / "This Month" / "This FY" — sets From/To |
| Search | `<input>` | Filters narration + payee + referenceNo (client-side) |

### Table columns (`.crm-table`)

| Column | Data | CSS |
|---|---|---|
| Date | `entryDate` formatted `DD MMM YY` | `.cell-strong` |
| Type | `Ledger.type` label (e.g. "Cash In", "Receipt") | `.badge-neutral` pill |
| Narration | `narration` | default |
| Ref No | `referenceNo` | `font-family: var(--font-mono)`, `.cell-sub` |
| Receipts (₹L) | `amountLakhs` if `direction=credit`, else `—` | `.td-right`, green text `var(--success)` |
| Payments (₹L) | `amountLakhs` if `direction=debit`, else `—` | `.td-right`, red text `var(--danger)` |
| Balance (₹L) | Running balance (computed client-side, cumulative from filtered start) | `.td-right .cell-strong` |
| Actions | Edit icon + Delete icon (`.btn-cav btn-cav-ghost btn-cav-sm`) | right-aligned |

Row hover: `background: var(--bg-muted)`.
Credit rows: left border `2px solid var(--success)`.
Debit rows: left border `2px solid var(--danger)`.

### Add / Edit Entry (slide-in panel — `.detail-overlay` + `.detail-pane`)

**Panel title:** "Add Cash Entry" / "Edit Cash Entry"

**Fields:**

| Field | Input type | Required | Notes |
|---|---|---|---|
| Entry Type | `<select>` | Yes | "Receipt (Cash In)" / "Payment (Cash Out)" / "Bank Deposit" / "Bank Withdrawal" |
| Date | `type="date"` | Yes | Defaults to today |
| Amount (₹L) | `type="number"` step="0.0001" | Yes | Must be > 0 |
| Narration | `<textarea>` rows=2 | Yes | Free text description |
| Reference No | `type="text"` | No | Cheque/receipt number |
| Payee / Received From | `type="text"` | No | Party name |
| Linked Bank Account | `<select>` (FinAccount where type=bank) | Required if type=Bank Deposit/Withdrawal | Shows only when type requires it |

**Live balance preview:** below Amount field, show "Balance after this entry: ₹X.XL" in `var(--fg-3)`. Colour red if it would go negative.

**Buttons:**
- "Save Entry" (`.btn-cav btn-cav-primary`) — disabled while `loading`
- "Cancel" (`.btn-cav btn-cav-secondary`) — closes panel

### Validation

- Amount must be > 0 (inline error below field)
- Date must not be in the future by more than 1 day
- Cash-Out: if amount would make `currentBalance` negative → show red warning strip "Insufficient cash balance. Current: ₹X.XL. Shortfall: ₹Y.YL." — allow override with explicit checkbox "I confirm this entry (will create a negative balance)"
- For Bank Deposit / Bank Withdrawal: linked bank account is required

### Empty state
`Banknote` icon (lucide), 32px, `--fg-4`. Text: "No cash entries for this period." Sub: "Click 'Add Entry' to record the first transaction."

### Mobile behavior
Read-only view on `<900px`. "Add Entry" button hidden. Show message: "Cash Book entries can only be added from a desktop."

### Permission rules
- Page: `canManageFinance` or redirect
- API `POST /api/finance/cash-book/entries`: `canManageFinance`
- API `PUT/DELETE`: `canManageFinance`
- Delete: soft-delete not supported for ledger entries. Hard delete only with `canManageFinance`. Add warning: "Deleting a ledger entry cannot be undone and will affect running balance."

---

## 3. Bank Book

### Purpose
Full bank account register. Mirrors Cash Book but for bank accounts. Includes a
reconciliation workflow to match CRM entries against bank statements.

### Route
`/finance/bank-book`

### User roles
`canManageFinance` only.

### Layout
`SheetLayout` title `"Bank Book"` description `"Bank account transactions and reconciliation."` action = `<AddEntryButton/>`.

### KPI Strip (4 tiles)
Opening Balance | Total Debits | Total Credits | Current Balance
- Values from filtered `Ledger` rows for the selected `FinAccount` (type=bank)

### Filters

| Control | Type | Notes |
|---|---|---|
| Account | `<select>` | Lists `FinAccount` where `type=bank` |
| Date From / To | `type="date"` | Default: current month |
| Quick presets | `.seg-control` | Today / This Week / This Month / This FY |
| Sub-tabs | `.seg-control` | "All" / "Unreconciled" / "UPI" / "Cheque" / "Transfer" |
| Search | `<input>` | Narration + payee + referenceNo |

### Table columns (`.crm-table`)

| Column | Data | CSS |
|---|---|---|
| Date | `entryDate` | `.cell-strong` |
| Type | `type` label | `.badge-neutral` pill |
| Narration | `narration` | default |
| Payee | `payee` | `.cell-sub` |
| Ref / Cheque No | `referenceNo` or `chequeNo` | mono font |
| Debit (₹L) | `amountLakhs` if `direction=debit` | `.td-right`, `var(--danger)` |
| Credit (₹L) | `amountLakhs` if `direction=credit` | `.td-right`, `var(--success)` |
| Balance (₹L) | Running balance | `.td-right .cell-strong` |
| Reconciled | Tick icon if `reconciled=true`, else "Reconcile" button | center-aligned |
| Actions | Edit + Delete | right-aligned |

Unreconciled rows: `border-left: 2px solid var(--ot-orange)`.
Reconciled rows: normal border.

### Add / Edit Entry (slide-in panel)

**Fields:**

| Field | Input | Required | Condition |
|---|---|---|---|
| Direction | `.seg-control` | Yes | "Debit (Payment)" / "Credit (Receipt)" |
| Type | `<select>` | Yes | UPI / Cheque / NEFT / RTGS / IMPS / Bank Charge / Interest |
| Date | `type="date"` | Yes | — |
| Amount (₹L) | `type="number"` | Yes | > 0 |
| Narration | `<textarea>` rows=2 | Yes | — |
| Reference / UTR No | `type="text"` | Required for UPI/NEFT/RTGS/IMPS | — |
| Cheque No | `type="text"` | Required for Cheque | — |
| Cheque Date | `type="date"` | Required for Cheque | — |
| Payee | `type="text"` | No | — |
| Linked Cash Account | `<select>` | Required if type=Cash Withdrawal/Deposit | Shows only for those types |

### Reconciliation

Clicking "Reconcile" on an unreconciled row:
- Opens a confirmation dialog (not a full panel): "Mark this entry as reconciled?" with "Reconcile" (`.btn-cav btn-cav-primary`) + "Cancel".
- Sets `reconciled=true`, `reconciledAt=now()` on the `Ledger` row.
- Row left border changes from orange to default.

### Validation
- Same as Cash Book plus: UTR/Ref No required for UPI entries (8+ characters).
- Cheque No required for Cheque entries. Cheque Date must not be > 90 days in the future.

### Empty state
`CreditCard` icon. "No bank entries for this period." + Add Entry CTA.

### Mobile behavior
Read-only. "Add Entry" hidden below 900px.

### Permission rules
Same as Cash Book.

---

## 4. Expense Register

### Purpose
Central list of all expense entries. Finance roles see all employees; reps see only
their own. Primary daily-use page for expense submission and tracking.

### Route
`/finance/expenses`

### User roles
- All authenticated employees (own expenses only)
- `canManageFinance` (all employees)

### Layout
`SheetLayout` title `"Expense Register"` description `"Track and submit expense claims."` action = `<NewExpenseButton/>` (`.btn-cav btn-cav-primary`, label "+ New Expense").

### KPI Strip (4 tiles)
Total Expenses (period) | Pending Approval | This Month | GST Input (₹L)
- Finance roles: all employees. Reps: own only.

### Filters (toolbar row)

| Control | Type | Visible to |
|---|---|---|
| Status tabs | `.seg-control` | All | "All" / "Draft" / "Submitted" / "Approved" / "Rejected" / "Paid" |
| Category | `<select>` populated from distinct `Expense.category` values | All |
| Employee | `<select>` from `Employee` list | Finance roles only |
| Date From / To | `type="date"` | All |
| Search | `<input>` | All — filters narration + vendor name + customer name |

### Table columns (`.crm-table`)

| Column | Data | CSS |
|---|---|---|
| Date | `expenseDate` | `.cell-strong` |
| Category | `category` | `.badge-neutral` pill |
| Vendor | `vendor.name` or `"—"` | default |
| Customer | `customerName` | `.cell-sub` |
| Employee | `employee.name` | Finance roles only; `.cell-sub` |
| Narration | `narration` truncated 60 chars | default |
| Amount (₹L) | `amountLakhs` | `.td-right .cell-strong` |
| GST (₹L) | `gstAmountLakhs` | `.td-right` |
| Status | Status badge | center |
| Actions | View/Edit icon (own draft) + Submit button (draft) + Delete (own draft only) | right |

Row click → opens the Expense Entry slide-in panel in read mode.
Submit button visible only when `status=draft` and `employeeId = currentUser`.

### Buttons / Actions
- **+ New Expense** → opens Expense Entry slide-in in create mode
- Row **Submit** → `POST /api/finance/expenses/[id]/submit`, updates status to `submitted`
- Finance role row **Approve** → appears on `submitted` rows: `POST /api/finance/expenses/[id]/approve`
- Finance role row **Reject** → appears on `submitted` rows: opens inline rejection reason dialog

### Empty state
`Receipt` icon. "No expenses found." Sub: "Click '+ New Expense' to log your first expense."

### Mobile behavior
Table is horizontally scrollable. "+ New Expense" and "Submit" actions visible on mobile. Column set reduced to: Date | Category | Amount | Status | Actions.

### Permission rules
- API `GET /api/finance/expenses`: returns own rows unless `canManageFinance`
- API `POST /api/finance/expenses`: any authenticated user (own `employeeId`)
- API `PUT /api/finance/expenses/[id]`: only if `employeeId = currentUser` AND `status=draft`
- API `DELETE /api/finance/expenses/[id]`: only if `employeeId = currentUser` AND `status=draft`
- API `POST .../submit`: only if `employeeId = currentUser` AND `status=draft`
- API `POST .../approve`: `canManageFinance` only
- API `POST .../reject`: `canManageFinance` only

---

## 5. Expense Entry (Create / Edit / View)

### Purpose
Slide-in panel used both for creating new expenses and viewing/editing existing ones.
Not a separate page — rendered as `.detail-overlay` + `.detail-pane` within Expense Register.

### Route
No separate route. Opens from `/finance/expenses` via state.

### User roles
- Create: any authenticated employee
- Edit: only the expense owner if `status=draft`
- View: owner + `canManageFinance`

### Panel layout
`.dp-head` contains title ("New Expense" / "Edit Expense" / "Expense Details") + close `×` button.
`.dp-body` contains a form divided into sections with `.section-label` dividers.

### Sections and Fields

**Section: Basic Details**

| Field | Input | Required | Notes |
|---|---|---|---|
| Category | `<select>` | Yes | Options: Travel, Accommodation, Meals, Client Entertainment, Office Supplies, Communication, Vehicle, Professional Services, Other. Store display name in `Expense.category`, a short code in `Expense.categoryCode`. |
| Expense Date | `type="date"` | Yes | Defaults to today. Must not be > 7 days in the future. |
| Narration | `<textarea>` rows=2 | Yes | What was purchased / purpose. Min 5 chars. |

**Section: Vendor**

| Field | Input | Required | Notes |
|---|---|---|---|
| Vendor | `VendorCombobox` (debounced search from `/api/finance/vendors/suggestions`) | No | Free-type allowed for one-off vendors not in master. When a known vendor is selected, show GSTIN below as read-only sub-text. |
| Vendor Invoice No | `type="text"` | No | `Expense.vendorInvoiceNo` |
| Customer | `CustomerNameCombobox` (existing component) | No | Tag the expense to a customer for profitability reporting. `Expense.customerName` |

**Section: Amount**

| Field | Input | Required | Notes |
|---|---|---|---|
| Amount (₹L) | `type="number"` step="0.0001" min="0.0001" | Yes | `Expense.amountLakhs` |
| GST Rate | `.seg-control` buttons | No | 0% / 5% / 12% / 18% / 28%. Defaults to 0%. |
| GST Amount (₹L) | Read-only computed field | — | Auto = `amountLakhs × gstRate`. Shown in muted text. Editable override allowed. |
| Total (₹L) | Read-only | — | `amountLakhs + gstAmountLakhs`. Bold, right-aligned. |

**Section: Attachments**

- Drop zone: dashed border, `border-radius: 8px`, `background: var(--bg-muted)`
- Label: "Drop files here or click to browse" (12px, `var(--fg-3)`)
- Accepted: images (jpg/png/heic) + PDF. Max 5 MB per file. Max 5 files.
- On add: show thumbnail row. Image files: 64×64 thumbnail. PDFs: `FileText` icon (lucide) + filename.
- Each attachment: remove `×` button top-right.
- Upload on form submit — `POST /api/finance/expenses/[id]/attachments` after expense is created.
- Stored URLs written to `Expense.attachmentsJson` (JSON array `[{fileName, fileUrl}]`).

**Approval history (view mode only — `status ≠ draft`)**

`.section-label` "Approval History"
`.timeline` list — one `.timeline-item` per audit event:
- `.tl-dot` color: green for approved, red for rejected, blue for submitted
- `.tl-when` = relative date
- Main text: "{Person} {action} on {date}" + optional comment in `var(--fg-3)` italics

### Buttons / Actions (create / edit mode)
- "Save as Draft" (`.btn-cav btn-cav-secondary`) — saves with `status=draft`
- "Save & Submit" (`.btn-cav btn-cav-primary`) — saves and immediately submits for approval
- "Cancel" (`.btn-cav btn-cav-ghost`) — closes panel, discards unsaved changes

**Approve / Reject actions (finance role, view mode, `status=submitted`)**
- "Approve" (`.btn-cav btn-cav-primary`) — confirm dialog → `POST .../approve`
- "Reject" (`.btn-cav btn-cav-secondary`) — opens inline reason `<textarea>` → "Confirm Reject" button

### Validation

| Field | Rule |
|---|---|
| Category | Required |
| Expense Date | Required. Not more than 7 days in the future. Not before current FY start (1 Apr). |
| Narration | Required. Min 5 characters. |
| Amount | Required. > 0. Max 99.9999 (100 Lakhs = 1 Cr; higher requires manager approval flag). |
| GST Amount | If manually overridden: must be ≤ Amount × 0.28. |
| Attachments | If `amountLakhs ≥ finance.expense.attachmentRequiredAboveLakhs` (AppSetting, default 0.5L): at least one attachment required before "Save & Submit". |

### Empty attachment state
Dashed box shows: `Paperclip` icon + "No attachments. Attach receipts or invoices."

---

## 6. Vendor Master

### Purpose
Central registry of suppliers used in expense entries. Finance roles manage; others
have no direct access to this page (they get a vendor autocomplete in the Expense form).

### Route
`/finance/vendors`

### User roles
`canManageFinance` only. Others → `redirect("/dashboard")`.

### Layout
`SheetLayout` title `"Vendor Master"` description `"Manage suppliers and their bank details."` action = `<AddVendorButton/>`.

### Filters

| Control | Type | Notes |
|---|---|---|
| Search | `<input>` | Name / GSTIN / PAN (client-side filter) |
| Status | `.seg-control` | "Active" / "Inactive" / "All" |
| State | `<select>` | Filter by `Vendor.state` |

### Table columns (`.crm-table`)

| Column | Data | CSS |
|---|---|---|
| Vendor Name | `name` | `.cell-strong` |
| GSTIN | `gstin` or `"—"` | mono font, `.cell-sub` |
| City / State | `city + ", " + state` | `.cell-sub` |
| Contact | `contactName` + `contactPhone` | `.cell-sub` two lines |
| Payment Terms | `paymentTerms` | `.badge-neutral` pill |
| Status | `isActive` → "Active" (`.badge-success`) / "Inactive" (`.badge-neutral`) | center |
| Actions | Edit icon + Deactivate / Reactivate icon | right |

Row click → opens slide-in detail panel.

### Add / Edit Vendor (slide-in panel)

**Panel title:** "Add Vendor" / "Edit Vendor"

**Section: Basic**

| Field | Input | Required |
|---|---|---|
| Vendor Name | `type="text"` | Yes |
| GSTIN | `type="text"` maxlength=15 | No |
| PAN | `type="text"` maxlength=10 | No |
| Payment Terms | `<select>` | Yes — options: "Immediate", "7 days", "15 days", "30 days", "45 days", "60 days", "90 days" |
| Status | Toggle checkbox "Active" | — default true |

**Section: Address**

| Field | Input | Required |
|---|---|---|
| Address (line 1 + 2) | `<textarea>` rows=2 | No |
| City | `type="text"` | No |
| State | `<select>` (Indian states list) | No |
| Pincode | `type="text"` maxlength=6 | No |

**Section: Contact**

| Field | Input | Required |
|---|---|---|
| Contact Name | `type="text"` | No |
| Phone | `type="tel"` | No |
| Email | `type="email"` | No |

**Section: Bank Details**

| Field | Input | Required |
|---|---|---|
| Bank Name | `type="text"` | No |
| Account No | `type="text"` | No |
| IFSC Code | `type="text"` maxlength=11 | No |

**Expense History tab (view mode)**
When viewing an existing vendor, show a secondary `.seg-control` tab "Expense History":
- Table of `Expense` rows linked to this vendor
- Columns: Date | Category | Employee | Amount | Status

### Validation

| Field | Rule |
|---|---|
| Vendor Name | Required. Unique (case-insensitive check via API). Min 2 chars. |
| GSTIN | If provided: must match `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$` |
| PAN | If provided: must match `^[A-Z]{5}[0-9]{4}[A-Z]{1}$` |
| IFSC | If provided: must match `^[A-Z]{4}0[A-Z0-9]{6}$` |
| Pincode | If provided: 6 digits |
| Phone | If provided: 10 digits |

### Deactivate
- No hard delete. "Deactivate" sets `isActive=false`.
- Deactivated vendors no longer appear in the `VendorCombobox` suggestions.
- If vendor has linked expenses: show warning "This vendor has {n} expense record(s). It will be hidden from new expense forms but existing records are preserved."

### Empty state
`Store` icon. "No vendors added yet." + Add Vendor CTA.

### Permission rules
- All operations: `canManageFinance`
- Suggestions API (`GET /api/finance/vendors/suggestions`): any authenticated user (used in expense form)

---

## 7. Employee Claims

### Purpose
Group individual approved expenses into a formal claim for batch reimbursement.
Employees bundle their expenses; finance pays a single claim amount.

### Route
`/finance/claims`

### User roles
- All authenticated employees (own claims only)
- `canManageFinance` (all employees)

### Layout
`SheetLayout` title `"Employee Claims"` description `"Bundle expenses for reimbursement."` action = `<NewClaimButton/>`.

### KPI Strip (3 tiles)
Open Claims | Total Pending (₹L) | Paid This Month (₹L)
- Employees: own data. Finance: all.

### Filters

| Control | Type | Notes |
|---|---|---|
| Status tabs | `.seg-control` | "All" / "Draft" / "Submitted" / "Approved" / "Paid" |
| Employee | `<select>` | Finance roles only |
| Date From / To | `type="date"` | — |

### Table columns (`.crm-table`)

| Column | Data | CSS |
|---|---|---|
| Claim No | `claimNo` or `"—"` (draft) | mono font `.cell-strong` |
| Date | `createdAt` | default |
| Employee | `employee.name` | Finance roles only |
| # Expenses | Count of linked expenses | center |
| Total (₹L) | Sum of linked expense `amountLakhs` | `.td-right .cell-strong` |
| Status | Status badge | center |
| Actions | View / Submit / Approve / Pay / Reject (context-sensitive) | right |

### Create Claim (slide-in panel)

**Panel title:** "New Claim"

1. **Select Expenses section** — table of the employee's `Expense` rows where `status=approved` OR `status=draft` (self-select their own expenses).
   - Checkbox column on left
   - Columns: Date | Category | Vendor | Narration | Amount
   - Running total shown below table: "Selected: {n} expenses — Total: ₹X.XL"
   - "Select All" checkbox in header

2. **Remarks field** — `<textarea>` rows=2, optional.

3. **Submit on save:** "Create Claim" button — creates the claim in `submitted` status if expenses are already approved, else `draft`.

**Note:** Claim model is not in Phase 1 schema. In Phase 2, a `Claim` model will be added. For this specification, represent claims as a grouping of `Expense` records with a shared `claimNo` prefix (or a separate `Claim` table to be added in the next migration).

### Claim Detail (slide-in view panel)

- `.dp-head`: Claim No (mono, bold) + status badge
- `.dp-body`:
  - `.kv-grid`: Employee | Date | Status | Total Amount
  - `.section-label` "Expenses" + table of linked expenses
  - `.section-label` "Approval History" + `.timeline`
  - If `status=approved` and Finance role: "Record Payment" section with date + amount + mode fields

### Finance: Record Payment on Claim

Fields:
- Payment Date (`type="date"`, required)
- Amount Paid (₹L) (`type="number"`, pre-filled with claim total)
- Payment Mode (`<select>`: Bank Transfer / Cheque / Cash / UPI)
- Reference No (`type="text"`)
- Notes (`<textarea>` rows=1)

Action: `POST /api/finance/claims/[id]/pay` → sets `status=paid`, creates a `Voucher`.

### Validation
- At least one expense must be selected
- Remarks not required but recommended (shown as placeholder hint)

### Empty state
`Layers` icon. "No claims yet." + "Create Claim" CTA (if employee) or just the icon (if no data for finance role).

### Permission rules
- Own claims: any authenticated user
- All claims: `canManageFinance`
- Approve/Reject: `canManageFinance`
- Record Payment: `canManageFinance`

---

## 8. Employee Advance

### Purpose
Request and track cash advances paid to employees before expenses are incurred.
Tracks disbursement and settlement; outstanding balance shown as a risk indicator.

### Route
`/finance/advances`

### User roles
- All authenticated employees (own advances)
- `canManageFinance` (all)

### Layout
`SheetLayout` title `"Employee Advances"` description `"Request and manage cash advances."` action = `<RequestAdvanceButton/>`.

### KPI Strip (3 tiles — finance roles)
Total Disbursed (₹L) | Total Outstanding (₹L) | Settled This Month (₹L)
- Employees see only: My Outstanding (₹L) | My Total Requested (₹L)

### Filters

| Control | Type | Notes |
|---|---|---|
| Status tabs | `.seg-control` | "All" / "Pending" / "Approved" / "Disbursed" / "Settled" / "Rejected" |
| Employee | `<select>` | Finance roles only |
| Date From / To | `type="date"` — filters `requestDate` | — |

### Table columns (`.crm-table`)

| Column | Data | CSS |
|---|---|---|
| Advance No | `advanceNo` | mono font `.cell-strong` |
| Employee | `employee.name` | Finance roles only |
| Purpose | `purpose` truncated 50 chars | default |
| Amount Req. (₹L) | `amountLakhs` | `.td-right` |
| Disbursed (₹L) | `disbursedAmountLakhs` or `"—"` | `.td-right` |
| Balance (₹L) | `balanceLakhs` | `.td-right .cell-strong` — red if > 0 |
| Req. By | `requiredByDate` | `.cell-sub` |
| Status | Status badge | center |
| Actions | View / Approve / Disburse / Settle / Reject | right |

### Request Advance (slide-in panel)

**Fields:**

| Field | Input | Required | Notes |
|---|---|---|---|
| Purpose | `<textarea>` rows=3 | Yes | What the advance is for |
| Amount (₹L) | `type="number"` step="0.0001" | Yes | > 0 |
| Required By Date | `type="date"` | No | Hint: when the funds are needed |
| Remarks | `<textarea>` rows=1 | No | Additional notes |

**Buttons:** "Submit Request" (`.btn-cav btn-cav-primary`) + "Cancel"

### Finance: Disburse Advance (slide-in action section)

Visible when `status=approved`. Additional fields appended in the panel:

| Field | Input | Required |
|---|---|---|
| Disbursement Date | `type="date"` | Yes |
| Actual Amount (₹L) | `type="number"` | Yes — can differ from requested |
| Paid From | `<select>` (FinAccount list) | Yes |
| Reference No | `type="text"` | No |

Action: `POST /api/finance/advances/[id]/disburse` → status = `disbursed`, creates Ledger entry.

### Finance: Settle Advance

Visible when `status=disbursed`. Fields:

| Field | Input | Required |
|---|---|---|
| Settlement Date | `type="date"` | Yes |
| Amount Settled (₹L) | `type="number"` | Yes |
| Notes | `<textarea>` rows=1 | No |

Action: `POST /api/finance/advances/[id]/settle` → updates `balanceLakhs`, flips to `settled` if fully covered.

### Validation

| Field | Rule |
|---|---|
| Purpose | Required, min 10 chars |
| Amount | Required, > 0, max 50L (above 50L requires manager approval, shown as info strip) |
| Disburse Amount | Must be > 0 and ≤ `amountLakhs × 1.1` (allow 10% variance) |
| Settlement Amount | Must be ≤ `balanceLakhs` |

### Empty state
`Wallet` icon. "No advances requested." + "Request Advance" CTA.

### Alert strips
- If employee has outstanding advance (status=disbursed, balanceLakhs > 0): show `.alert-strip` at top: "You have an outstanding advance of ₹X.XL. Please settle before requesting a new one."
- Finance role: show alert if any advance is overdue by > 30 days past `requiredByDate`.

### Permission rules
- Request: any authenticated employee
- Approve: `canManageFinance`
- Disburse: `canManageFinance`
- Settle: `canManageFinance`

---

## 9. Local Conveyance

### Purpose
Log daily travel (bike/car/auto/public transport) for reimbursement. Captures
distance (manual or GPS), applies the HR Policy rate per KM, and enforces daily caps.

### Route
`/finance/conveyance`

### User roles
- All authenticated employees (own logs)
- `canManageFinance` (all employees)

### Layout
`SheetLayout` title `"Local Conveyance"` description `"Log and claim travel reimbursements."` action = `<LogTripButton/>`.

### KPI Strip (4 tiles)
Total KM (month) | Total Amount (₹L, month) | Pending Approval | Paid This Month (₹L)
- Employees: own. Finance: all.

### Filters

| Control | Type | Notes |
|---|---|---|
| Status tabs | `.seg-control` | "All" / "Draft" / "Submitted" / "Approved" / "Paid" |
| Travel Mode | `.seg-control` | "All" / "Bike" / "Car" / "Auto" / "Public" |
| Employee | `<select>` | Finance roles only |
| Date From / To | `type="date"` | — |

### Table columns (`.crm-table`)

| Column | Data | CSS |
|---|---|---|
| Date | `travelDate` | `.cell-strong` |
| Employee | `employee.name` | Finance roles only |
| From | `fromLocation` truncated 30 chars | default |
| To | `toLocation` truncated 30 chars | default |
| Mode | `mode` label with icon | `.badge-neutral` pill |
| KM | `distanceKm` | `.td-right` |
| Rate (₹/km) | `ratePerKm` | `.td-right .cell-sub` |
| Amount (₹) | `amountRupees` (rupees, not lakhs — small amounts) | `.td-right .cell-strong` |
| Amount (₹L) | `amountLakhs` | `.td-right .cell-sub` |
| Status | Status badge | center |
| Actions | View / Submit / Approve / Reject | right |

### Log Trip (slide-in panel)

**Panel title:** "Log Trip"

| Field | Input | Required | Notes |
|---|---|---|---|
| Travel Date | `type="date"` | Yes | Defaults to today. Max 7 days past. |
| From Location | `type="text"` | Yes | Free text. Button "📍 Use GPS" (web — Geolocation API) opens a small map picker. |
| To Location | `type="text"` | Yes | Same as above. |
| Distance (KM) | `type="number"` step="0.1" min="0.1" | Yes | Auto-filled if GPS/Maps used. Editable fallback. |
| Travel Mode | `.seg-control` | Yes | Bike / Car / Auto / Public Transport |
| Purpose | `type="text"` | Yes | Short description of the trip |

**Read-only computed fields (shown below the form):**
- Rate per KM: `₹{ratePerKm}` (fetched from HR Policy for employee's role + mode)
- Calculated Amount: `₹{distanceKm × ratePerKm}` (rupees)
- Daily Cap Remaining: `₹{cap − todayTotal}` — green if positive, red if at/over cap
- Converted to ₹L: `₹{amountLakhs}L`

**GPS / Map picker behavior (web):**
- Button "📍 Use GPS" calls browser `navigator.geolocation.getCurrentPosition()`
- On success: populates `fromLat/Lng` or `toLat/Lng`
- Calls `GET /api/finance/conveyance/distance?fromLat=&fromLng=&toLat=&toLng=` → returns `roadKm` (Google Maps Distance Matrix) or Haversine fallback
- Shows: "Road distance: X.X km" as a chip below the Distance field
- If API fails: shows "Could not fetch route. Please enter distance manually."

**Buttons:** "Save as Draft" + "Save & Submit" + "Cancel"

### Validation

| Field | Rule |
|---|---|
| Travel Date | Required. Not > 7 days in the past. Not future. |
| From Location | Required. Min 3 chars. |
| To Location | Required. Min 3 chars. |
| Distance | Required. > 0.1 km. Max 500 km. |
| Daily Cap | If `amountRupees + todayTotal > maxConveyanceDayRupees (AppSetting)`: block submission with error "Daily cap of ₹{cap} exceeded. This trip would add ₹{amount} to today's total of ₹{today}." Allow draft save; block submit. |
| Purpose | Required. Min 5 chars. |

### Empty state
`MapPin` icon. "No trips logged." + "Log Trip" CTA.

### Mobile behavior
Log Trip slide-in panel fully functional on mobile. GPS capture works via Capacitor
(native Android) or browser Geolocation API (PWA). Map picker optional; manual entry
is the primary mobile path. See `MOBILE_REQUIREMENTS.md` for mobile screen spec.

### Permission rules
- Own conveyance: any authenticated employee
- All conveyance: `canManageFinance`
- Approve/Reject: `canManageFinance`

---

## 10. Approval Center

### Purpose
Unified queue for all pending approvals across entity types (Expenses, Advances,
Travel Claims, Vouchers). Approvers act on items without navigating to each sub-page.

### Route
`/finance/approvals`

### User roles
- `canManageFinance` (primary users)
- Any employee where they are an assigned approver (future: when approver role is wired)

### Layout
`SheetLayout` title `"Approval Center"` description `"Review and action pending approvals."` no action button.

### KPI Strip (3 tiles)
Pending (mine) | Approved Today | Rejected Today

### Filters

| Control | Type | Notes |
|---|---|---|
| Sub-tabs | `.seg-control` | "Pending" / "Approved" / "Rejected" / "All" |
| Entity Type | `.seg-control` | "All" / "Expenses" / "Advances" / "Conveyance" |
| Employee | `<select>` | Finance roles |
| Date From / To | `type="date"` | Filters `submittedAt` |
| Overdue only | Checkbox | Shows items pending > 2 days |

### Table columns (`.crm-table`)

| Column | Data | CSS |
|---|---|---|
| Ref No | Entity-specific ref (expense id, advance no, claim no) | mono `.cell-strong` |
| Entity Type | "Expense" / "Advance" / "Conveyance" | `.badge-info` pill |
| Submitted By | `employee.name` | default |
| Description | Narration / Purpose truncated 50 chars | `.cell-sub` |
| Amount (₹L) | Entity amount | `.td-right .cell-strong` |
| Submitted On | Date | `.cell-sub` |
| Days Pending | `today - submittedAt` | `.td-right` — red if > 3 days: `.badge-danger` |
| Status | Status badge | center |
| Actions | "Approve" + "Reject" (pending); "View" (all) | right |

Rows with `daysPending > 3`: background `rgba(200, 16, 46, 0.03)`, left border `2px solid var(--caveo-red-50)`.

### Approve flow (inline — no new panel)
Clicking "Approve" on a row:
1. Row expands inline (or a compact `.detail-pane`) showing entity preview
2. Optional comment field (single line)
3. "Confirm Approve" button (`.btn-cav btn-cav-primary`)
4. On success: row status badge flips to `approved`, row moves to "Approved" tab

### Reject flow (slide-in or inline)
1. "Reject" click → inline reason field appears (required, min 10 chars)
2. "Confirm Reject" button (`.btn-cav btn-cav-secondary`)
3. On success: entity `status = rejected`, notification sent to submitter

### Entity preview (detail pane — 520px right slide-in)
Opens on row click or "View":
- Header: Entity type + Ref No + Status badge
- `.kv-grid`: Employee | Date | Amount | Category/Purpose
- Attachments: thumbnail row (for expenses)
- `.section-label "Approval History"` + `.timeline`
- Approve / Reject action buttons at the bottom (if pending)

### Empty state (Pending tab)
`CheckCircle2` icon. "All caught up!" Sub: "No items awaiting your approval."

### Permission rules
- Read: `canManageFinance`
- Approve/Reject: `canManageFinance`
- Future: approver role assignment via `ApprovalRule.level1Role` / `level2Role`

### Approval Policy Configuration
Accessible as a sub-tab "Approval Rules" (only visible to `isManager`):
- Table of `ApprovalRule` rows: Name | Entity Type | Auto-approve ≤ | L1 Limit | L1 Role | L2 Limit | L2 Role
- "Add Rule" button → slide-in form
- Fields: Name | Entity Type (`<select>`) | Auto-approve limit (₹L) | Level 1 limit (₹L) | Level 1 role (`type="text"`) | Level 2 limit | Level 2 role | Level 3 limit | Level 3 role

---

## 11. Voucher Management

### Purpose
Formal numbered payment/receipt vouchers generated for approved financial
transactions. Provides a printable audit document for each transaction.

### Route
`/finance/vouchers`

### User roles
`canManageFinance` only.

### Layout
`SheetLayout` title `"Voucher Register"` description `"Formal vouchers for all financial transactions."` action = `<NewVoucherButton/>`.

### Filters

| Control | Type | Notes |
|---|---|---|
| Type tabs | `.seg-control` | "All" / "Payment" / "Receipt" / "Expense" / "Advance" / "Conveyance" |
| Status | `.seg-control` | "All" / "Draft" / "Approved" / "Voided" |
| Date From / To | `type="date"` | — |
| Search | `<input>` | Voucher No + narration |

### Table columns (`.crm-table`)

| Column | Data | CSS |
|---|---|---|
| Voucher No | `voucherNo` (e.g. `CI/26-27/00001`) | mono font `.cell-strong`, `--caveo-red` color |
| Type | `type` label | `.badge-info` pill |
| Date | `voucherDate` | default |
| Narration | `narration` truncated 60 chars | default |
| Created By | `createdBy.name` | `.cell-sub` |
| Amount (₹L) | `amountLakhs` | `.td-right .cell-strong` |
| Status | Status badge | center |
| PDF | Download icon button (`.btn-cav btn-cav-ghost btn-cav-sm`) | center |
| Actions | View + Void (approved only) | right |

### Create Voucher (slide-in panel)

**Panel title:** "New Voucher"

| Field | Input | Required | Notes |
|---|---|---|---|
| Voucher Type | `<select>` | Yes | Payment / Receipt / Journal / Expense / Conveyance / Advance |
| Voucher Date | `type="date"` | Yes | Defaults to today |
| Amount (₹L) | `type="number"` step="0.0001" | Yes | > 0 |
| Narration | `<textarea>` rows=2 | Yes | Transaction description |
| Link Expense | Searchable select from `Expense` (status=approved, no voucher) | No | Optional |
| Link Advance | Searchable select from `EmployeeAdvance` | No | Optional |
| Link Conveyance | Searchable select from `TravelClaim` | No | Optional |

**Voucher number:** auto-generated server-side from `VoucherSequence` (atomic). Not user-editable. Shown as a read-only chip after save: "Voucher No: CI/26-27/00004" in `var(--font-mono)`.

### Voucher Detail (slide-in view panel — printable layout)

Designed to match a physical payment voucher. Uses `.dp-head` + `.dp-body`.

**Layout inside panel:**

```
┌─────────────────────────────────────────────────┐
│  [Company Logo]    CAVEO INFOSYSTEMS             │
│                    [Address]                     │
│─────────────────────────────────────────────────│
│  PAYMENT VOUCHER             CI/26-27/00001      │
│  Date: 15 Jun 2026           Status: Approved    │
│─────────────────────────────────────────────────│
│  Amount: ₹2.50L                                  │
│  In Words: Rupees Two Lakhs Fifty Thousand Only  │
│─────────────────────────────────────────────────│
│  Narration:                                      │
│  [narration text]                                │
│─────────────────────────────────────────────────│
│  Paid to / Received from: [payee]                │
│  Account Charged: [account name]                 │
│─────────────────────────────────────────────────│
│  Prepared by: ___________  Approved by: ________ │
└─────────────────────────────────────────────────┘
```

**Amount in words:** computed by `amount-to-words.ts` helper (to be built in Phase 9).
Format: "Rupees [words] Only". Example: ₹2.5L → "Rupees Two Lakhs Fifty Thousand Only".

**Print / Download PDF button:** `window.print()` scoped to `.voucher-print-area` class for the panel content. PDF generation (Phase 9) via `@react-pdf/renderer`.

**Audit log section** (below voucher): `.timeline` showing creation + approval events from `AuditLog`.

### Void Voucher flow
"Void" button (`.btn-cav btn-cav-secondary`) on approved vouchers:
1. Opens confirmation dialog: "Void this voucher? This cannot be undone."
2. Required reason field: `<textarea>` (min 10 chars)
3. "Confirm Void" (`.btn-cav btn-cav-danger-like` — red secondary) + "Cancel"
4. Sets `status=voided`, `voidedAt=now()`, `voidReason` in DB
5. Voided voucher row: strikethrough on voucher number, `.badge-danger` status

### Validation

| Field | Rule |
|---|---|
| Type | Required |
| Date | Required. Not > 7 days in the future. Not before FY start. |
| Amount | Required. > 0 |
| Narration | Required. Min 5 chars. |
| Void Reason | Required. Min 10 chars. |

### Empty state
`FileText` icon. "No vouchers generated yet." + "New Voucher" CTA.

### Permission rules
- Create / Approve: `canManageFinance`
- Void: `isManager` only (more destructive)
- View / Print: `canManageFinance`

---

## 12. Finance Reports

### Purpose
Executive finance dashboard for management and the accounts team. Aggregates data
across all finance models into summary widgets and trend charts. Date range drives
all widgets simultaneously.

### Route
`/finance/reports`

### User roles
`canManageFinance` only.

### Layout
Page title: `.page-eyebrow` "FINANCE" + `.page-title` "Reports Dashboard".
No `SheetLayout` (this page uses the full `.page-body` width with its own layout).

Top toolbar: date range selector (From / To with quick presets) + "Export All" button.

### Date Range Selector (top of page, always visible)

`.seg-control` quick presets: "This Month" / "Last Month" / "This Quarter" / "This FY" / "Custom"
When "Custom" is selected, show two `type="date"` inputs inline.
Presets compute ISO date range on the client and pass as `?from=&to=` query params.

### KPI Strip (6 tiles, `.kpi-grid`)

| # | Label | Source | CSS |
|---|---|---|---|
| 1 | Cash Balance | Sum of `FinAccount.currentBalance` where `type=cash` | `.kpi.kpi-accent` |
| 2 | Bank Balance | Sum of `FinAccount.currentBalance` where `type=bank` | `.kpi.kpi-accent` |
| 3 | Collections (period) | Sum of `Payment.amountLakhs` in date range | `.kpi.kpi-link` href `/collections` |
| 4 | Expenses (period) | Sum of `Expense.amountLakhs` in date range where status≠rejected | `.kpi.kpi-link` href `/finance/expenses` |
| 5 | Pending Approvals | Count of submitted/pending items across all entity types | `.kpi.kpi-link` href `/finance/approvals` |
| 6 | Outstanding Advances | Sum of `EmployeeAdvance.balanceLakhs` where `status=disbursed` | `.kpi` |

### Widget Grid (`.grid-12` layout)

**Row 1: two cards**

| Widget | Grid span | Type | Data |
|---|---|---|---|
| Monthly Collections vs Expenses | `.col-7` | Grouped bar chart (inline SVG `BarChart` pattern from DashboardClient) | 12 months — `Payment` by month vs `Expense` by month. Two bar series: red (expenses), blue (collections). |
| Expense by Category | `.col-5` | Donut chart (SVG `DonutChart` pattern) + legend | `Expense` grouped by `category`, top 8 categories, current period |

**Row 2: two cards**

| Widget | Grid span | Type | Data |
|---|---|---|---|
| Conveyance by Employee | `.col-6` | Horizontal bar chart | `TravelClaim.amountLakhs` grouped by `employee.name`, approved+paid only |
| Outstanding Advances by Employee | `.col-6` | Horizontal bar chart | `EmployeeAdvance.balanceLakhs` grouped by `employee.name`, status=disbursed |

**Row 3: two cards**

| Widget | Grid span | Type | Data |
|---|---|---|---|
| Overdue Invoices | `.col-5` | KPI list card | Top 5 overdue `Collection` rows: Customer | Due Date | Amount. "View All" → `/collections?view=overdue` |
| Pending Approvals | `.col-7` | List card | All pending items: Entity Type | Submitted By | Amount | Days Pending. "Action" → `/finance/approvals` |

**Row 4: full-width card**

| Widget | Grid span | Type | Data |
|---|---|---|---|
| DSO Trend (Days Sales Outstanding) | full `.grid-12` | Sparkline series | Avg `(paymentReceivedDate − invoiceDate)` in days, grouped by month for the last 12 months. Lower is better. Horizontal reference line at 30 days. |

### Chart color conventions for Reports
- Collections / Credits: `var(--infra-blue)`
- Expenses / Debits: `var(--caveo-red)`
- Advances: `var(--ot-orange)`
- Conveyance: `var(--success)`
- Neutral series: `var(--steel-silver-2)`

### Export All button
Opens a modal (centered card, `z-50`):

```
┌─ Export Reports ──────────────────────────────┐
│  Date Range:  [From ____]  [To ____]           │
│                                                │
│  Select sheets:                                │
│  ☑ Cash Book  ☑ Bank Book  ☑ Expenses          │
│  ☑ Vouchers   ☑ Advances   ☑ Conveyance        │
│                                                │
│  Format:  ○ Excel (.xlsx)   ○ PDF              │
│           ○ Tally XML                          │
│                                                │
│          [ Cancel ]   [ Download ]             │
└────────────────────────────────────────────────┘
```

- "Download" → `GET /api/finance/export?from=&to=&sheets=&format=`
- While generating: button shows "Generating…" with a spinner character. Disabled.
- On complete: browser download triggers automatically.

### Individual page Export button
Every Finance list page (Cash Book, Bank Book, Expenses, Vendors, Vouchers, Conveyance,
Claims, Advances) includes an "Export" button in the `SheetLayout` action area (secondary
style, `.btn-cav btn-cav-secondary`). Opens the same modal pre-scoped to that page's entity.

### Empty state (all widgets)
If the selected date range returns no data: widget card shows centered muted text "No data for this period." Do not hide the widget or the chart container — maintain the grid layout.

### Permission rules
- Full page: `canManageFinance`
- Export API: `canManageFinance`

---

## Appendix A — New Components Required for Finance Module

The following React components do not exist in the codebase and must be created during
Phase 2–9 implementation. Each maps to a reusable `src/components/finance/` file.

| Component file | Purpose | Phase |
|---|---|---|
| `VendorCombobox.tsx` | Debounced vendor search autocomplete. Identical pattern to `CustomerNameCombobox` but queries `/api/finance/vendors/suggestions`. Portal dropdown. | Phase 2 |
| `SlideInDrawer.tsx` | Reusable wrapper for `.detail-overlay` + `.detail-pane` + `.dp-head` + `.dp-body` to avoid repeating the fixed-overlay pattern across 12 pages. Props: `title`, `onClose`, `children`. | Phase 2 |
| `FinanceStatusBadge.tsx` | Maps `draft\|submitted\|approved\|rejected\|paid\|disbursed\|settled\|voided\|pending` → correct `.badge-*` class and label. Drop-in replacement for inline badge logic. | Phase 2 |
| `AmountInput.tsx` | Numeric input for ₹ Lakhs. Enforces `step=0.0001`, `min=0`, right-aligned text, `font-variant-numeric: tabular-nums`, and a live "= ₹X.XCr" conversion label below. | Phase 2 |
| `DateRangePicker.tsx` | From/To date pair with `.seg-control` quick presets (Today / This Week / This Month / This FY / Custom). Emits `{from: string, to: string}`. | Phase 2 |
| `ExportModal.tsx` | Shared export dialog (date range + sheet selection + format toggle). Used by every Finance list page. | Phase 9 |
| `ApprovalTimeline.tsx` | Extends `.timeline` CSS with interactive approve/reject buttons inline. Reads from `AuditLog`. | Phase 3 |
| `FileUploadZone.tsx` | Drag-and-drop file upload area. Thumbnail row for images, `FileText` icon for PDFs, per-file remove. Calls cloud storage upload API. | Phase 2 |
| `VoucherPrint.tsx` | Print-optimised voucher layout matching the specified template. `window.print()` path in Phase 4; PDF path in Phase 9. | Phase 4 |
| `MapPicker.tsx` | Google Maps Autocomplete + road distance fetch for Conveyance Log. Graceful Haversine fallback. | Phase 7 |

---

## Appendix B — Sidebar Navigation Update

Add a `Finance` group to `ACCOUNTS_GROUPS` in `src/components/SidebarLinks.tsx`.
Also add to `MANAGER_GROUPS` as a collapsed group.

```
Finance group items (ACCOUNTS_GROUPS):
  /finance            Dashboard          icon: LayoutDashboard
  /finance/expenses   Expenses           icon: Receipt
  /finance/claims     My Claims          icon: Layers
  /finance/advances   Advances           icon: Wallet
  /finance/conveyance Conveyance         icon: MapPin
  /finance/approvals  Approvals          icon: ShieldCheck  (badge: pending count)
  /finance/vendors    Vendor Master      icon: Store
  /finance/cash-book  Cash Book          icon: Banknote
  /finance/bank-book  Bank Book          icon: Building2
  /finance/vouchers   Vouchers           icon: FileText
  /finance/reports    Reports            icon: BarChart3

Finance group items (MANAGER_GROUPS, condensed — add after "Operate"):
  /finance            Finance            icon: Receipt      (single link, expands to hub)
```

Finance nav entries must only appear when `canManageFinance(user)` or when the user is
any authenticated employee (for `/finance/expenses`, `/finance/claims`, `/finance/advances`,
`/finance/conveyance` — own-data pages).

---

## Appendix C — Role Predicate Addition

Add to `src/lib/roles.ts` before any Finance page can be gated:

```typescript
/**
 * Can access the Finance Operations module.
 * Same set as canManagePayments but also gates the /finance/* routes.
 */
export function canManageFinance(user?: SessionUser | null): boolean {
  return !!user?.isManager || isAccounts(user) || isOperationsHead(user);
}
```

---

## Appendix D — Route → Permission Matrix

| Route | Server guard | Data scope |
|---|---|---|
| `/finance` | `canManageFinance` | All employees |
| `/finance/cash-book` | `canManageFinance` | All |
| `/finance/bank-book` | `canManageFinance` | All |
| `/finance/expenses` | Authenticated | Own (`employeeId`) / All if `canManageFinance` |
| `/finance/vendors` | `canManageFinance` | All |
| `/finance/claims` | Authenticated | Own / All if `canManageFinance` |
| `/finance/advances` | Authenticated | Own / All if `canManageFinance` |
| `/finance/conveyance` | Authenticated | Own / All if `canManageFinance` |
| `/finance/approvals` | `canManageFinance` | All |
| `/finance/vouchers` | `canManageFinance` | All |
| `/finance/reports` | `canManageFinance` | All |

API routes follow the same scope: own-data endpoints filter by `employeeId = session.user.employeeId` unless `canManageFinance`.
