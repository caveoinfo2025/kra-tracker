# Finance Module — Web UI Requirements

> Follows the Caveo CRM design system: `globals.css` tokens, Tailwind v4,
> SheetLayout wrapper, Badge component, lucide-react icons.
> See `docs/DESIGN_SYSTEM.md` for full design token reference.

---

## 1. Pages

### 1.1 `/collections` — Billing & Collections

**File:** `src/app/collections/page.tsx` + `CollectionsClient.tsx`

**Access:** All authenticated users. Finance roles see all employees' data;
sales reps see only their own invoices.

**Layout:** `SheetLayout` with title "Billing & Collections".

#### Summary Stat Cards (top of page)

Four cards in a `2-col / 4-col` responsive grid:

| Card | Value | Description |
|---|---|---|
| Invoiced (filtered) | `₹{total}L` | Sum of `invoiceValueLakhs` for visible rows |
| Total Without GST | `₹{total}L` | Sum of `amountWithoutGstLakhs` for visible rows |
| Collected (filtered) | `₹{total}L` | Sum of `amountReceivedLakhs` for visible rows |
| Collection Rate | `{rate}%` | `(totalReceived / totalInvoiced) × 100` |

Stats are computed client-side from the filtered rows (not a separate API call).

#### Tab Filter Bar

Pill-style segmented tabs:

| Tab | Filter | Count badge | Color |
|---|---|---|---|
| All | No filter | Total row count | — |
| Overdue | `dueDate < today AND status ≠ "Fully Received"` | Overdue count | Red |
| Upcoming (30d) | `today ≤ dueDate ≤ today+30 AND status ≠ "Fully Received"` | Upcoming count | Amber |
| Received | `collectionStatus = "Fully Received"` | Count | Green |
| Revenue Summary | Switches to per-salesperson breakdown table | — | Indigo |

#### Secondary Filters (finance roles only)

- **Employee dropdown**: filter by salesperson.
- **Search input**: case-insensitive filter on `customerName` OR `invoiceNo`.

#### Invoice Table

Columns:

| Column | Notes |
|---|---|
| Checkbox | Bulk-select (finance roles only) |
| Customer | `customerName` |
| Invoice No | `invoiceNo`, "—" if empty |
| Invoice Date | `invoiceDate` formatted `DD MMM YYYY` |
| Invoice Value | `₹{n}L` |
| Without GST | `₹{n}L` |
| Due Date | Red if overdue |
| Payment Date | `paymentReceivedDate` or "—" |
| Received | `₹{n}L` (green if fully received) |
| Status | `Badge` component: success/warning/danger/neutral |
| Salesperson | `employee.name` (finance roles only) |
| Actions | Edit · Payments (ledger) · Delete |

#### Bulk Delete (finance roles)

- Select rows via checkboxes.
- "Delete N selected" button appears when ≥1 row is checked.
- Confirmation dialog required before deletion.
- Calls `DELETE /api/collections` with `{ ids: [...] }`.

#### Create / Edit Invoice Form (slide-in panel)

Fields:

| Field | Type | Notes |
|---|---|---|
| Employee | Select | Finance roles choose; reps fixed to self |
| Invoice Date | Date | Required |
| Invoice No | Text | Optional |
| Customer Name | Text (CustomerNameCombobox) | Required; autocomplete from Customer master |
| Invoice Value (Lakhs) | Number | Required; auto-fills Without GST on change |
| Without GST (Lakhs) | Number | Auto-computed (`value / 1.18`); editable |
| Due Date | Date | Required |
| Collection Status | Select | `Pending` / `Partially Received` / `Fully Received` |
| Remarks | Textarea | Optional |

**Auto-fill rule:** When `invoiceValueLakhs` changes and `amountWithoutGstLakhs` is still
at its default (`0`), auto-compute `amountWithoutGstLakhs = invoiceValueLakhs / 1.18`.
If the user has manually edited the without-GST field, do not override.

#### Record Payment Modal

Triggered by the "Payments" action on an invoice row.
Shows the existing payment ledger, then a form to record a new payment.

Fields:

| Field | Type | Notes |
|---|---|---|
| Amount (Lakhs) | Number | Required; must be > 0 |
| Payment Date | Date | Required; defaults to today |
| Mode | Select | `Bank Transfer` / `Cheque` / `UPI` / `Cash` / `Other` |
| Reference No | Text | Cheque/UTR number |
| Notes | Textarea | Optional |

On submit → `POST /api/payments`. On success: refresh invoice row in the table.

Payment ledger display below the form:
- Each row: date, amount, mode, reference, "by {name}".
- `Opening Balance` mode entries displayed in muted style.

#### Revenue Summary Tab

Client-side aggregation across all (non-filtered) rows, grouped by employee:

| Column | Notes |
|---|---|
| Salesperson | `employee.name` |
| Invoice Count | Number of their invoices |
| Total Billed | Sum `invoiceValueLakhs` |
| Without GST | Sum `amountWithoutGstLakhs` |
| GST | Billed − Without GST |
| Collected | Sum `amountReceivedLakhs` |
| Outstanding | Billed − Collected |

Sorted by `totalBilled` descending.

---

### 1.2 `/accounts` — Accounts Dashboard

**File:** `src/app/accounts/page.tsx` + `AccountsClient.tsx`

**Access:** Finance roles only (`canSeeAllCollections`). Regular sales reps
land on `/dashboard` instead.

**Layout:** `SheetLayout` with title "Accounts".

#### Sections

1. **Payments Today Widget** (`PaymentsTodayWidget` component)
   - Fetches `GET /api/payments/today`.
   - Shows total received today + list of individual payments.

2. **Order Advances**
   - Fetches `GET /api/advances?status=unapplied` on load.
   - Lists unapplied advances: customer, amount, date, mode, reference.
   - "Record Advance" button → opens form.
   - Each row has "Apply to Invoice" button → opens apply modal.

3. **Record Advance Form**
   Fields: Customer Name, Amount (Lakhs), Received Date, Mode, Reference No, Notes,
   Linked Deal (optional SalesFunnel select).
   On submit → `POST /api/advances`.

4. **Apply Advance Modal**
   Shows the advance details.
   User selects the target invoice from a list of open (`status ≠ "Fully Received"`)
   invoices for the same customer.
   On confirm → `POST /api/advances/[id]/apply`.

---

## 2. Shared Components

### `PaymentsTodayWidget`

**File:** `src/components/PaymentsTodayWidget.tsx`

Reusable widget used on both the manager dashboard and the Accounts page.
Fetches `GET /api/payments/today` on mount.

Displays:
- Large headline: total amount received today.
- Count: "N payments".
- Scrollable list of individual payments (max 20): customer, invoice no, amount, mode, recorded by, time.

Used on:
- `/dashboard` (manager view)
- `/accounts` (Accounts + Operations Head)

---

### `Badge` component

**File:** `src/components/Badge.tsx`

Used for collection status display.

| Status | Variant | Visual |
|---|---|---|
| `Fully Received` | `success` | Green pill |
| `Partially Received` | `warning` | Amber pill |
| `Overdue` | `danger` | Red pill |
| `Pending` | `neutral` | Grey pill |

Overdue check is applied at render time: if `dueDate < today AND status ≠ "Fully Received"`,
display "Overdue" with the `danger` variant regardless of the stored `collectionStatus`.

---

## 3. Design Tokens (finance-specific usage)

| Token | Usage in finance UI |
|---|---|
| `--caveo-red` / `#C8102E` | Overdue amounts, alert indicators |
| `--success` (green) | Fully Received status, positive payment amounts |
| `--ot-orange` | Partially Received, upcoming due date warnings |
| `--fg-3` | Muted labels, "Without GST" secondary values |

---

## 4. Validation Rules (client-side)

| Field | Rule |
|---|---|
| `invoiceValueLakhs` | Must be > 0 |
| `amountWithoutGstLakhs` | Must be ≥ 0 and ≤ `invoiceValueLakhs` |
| `dueDate` | Must be a valid date |
| `amountLakhs` (payment) | Must be > 0 |
| `paymentDate` | Must be a valid date; cannot be in the future by UI convention |
| `customerName` | Required; non-empty string |

---

## 5. Planned UI Features

| Feature | Priority | Description |
|---|---|---|
| Payment void / correction | High (FR-FIN-44) | UI to reverse a mistaken payment entry |
| Tally export button | Medium (FR-FIN-40) | "Export to Tally" button on `/collections` and `/accounts` |
| Google Maps visit button | Medium (FR-FIN-41) | "Log Visit" on each overdue invoice row |
| Pagination | Medium (FR-FIN-01) | Collections list is capped at 500 rows; need pagination for larger datasets |
| DSO (Days Sales Outstanding) | Low | Per-invoice and aggregate DSO metric |
| Email overdue reminder | Low | One-click "Send reminder" for overdue invoices |
