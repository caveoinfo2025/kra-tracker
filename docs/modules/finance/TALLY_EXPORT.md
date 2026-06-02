# Finance Operations Module — Excel / PDF / Tally Export

> **Status: APPROVED FINAL SCOPE**
> Feature 13: Excel / PDF / Tally Export
> Covers all three formats for all applicable financial data types.

---

## 1. Overview

| Format | Library | Use case |
|---|---|---|
| **Excel (.xlsx)** | `exceljs` | Download for analysis, internal records, sharing |
| **PDF** | `@react-pdf/renderer` (server-side) | Formal reports, voucher printouts, audit packs |
| **Tally XML** | Custom builder (`src/lib/finance/tally-xml.ts`) | Import into Tally Prime / Tally.ERP 9 |

All exports are generated server-side at `GET /api/finance/export`.
The client receives a file download response (no preview step).

---

## 2. Export Coverage Matrix

| Data Type | Excel | PDF | Tally XML |
|---|---|---|---|
| Cash Book | ✅ | ✅ | ✅ |
| Bank Book | ✅ | ✅ | ✅ |
| Expense Register | ✅ | ✅ | ✅ |
| Voucher Register | ✅ | ✅ | — |
| Collections (Invoices) | ✅ | ✅ | ✅ |
| Payment Ledger | ✅ | ✅ | ✅ |
| Employee Claims | ✅ | ✅ | — |
| Conveyance Summary | ✅ | ✅ | — |
| Customer Profitability | ✅ | ✅ | — |
| Individual Voucher PDF | — | ✅ | — |

---

## 3. Excel Export

**Library:** `exceljs` (add to `package.json`)

### Common Structure
Every Excel export has:
- **Row 1:** Company name — "Caveo Infosystems Pvt. Ltd."
- **Row 2:** Report title + date range
- **Row 3:** Empty (spacer)
- **Row 4+:** Column headers (bold, background fill)
- **Data rows**
- **Last row:** Totals (bold, top border)

### Cash Book Excel

Columns: `Date | Type | Narration | Receipts (₹L) | Payments (₹L) | Balance (₹L)`

- Running balance computed row by row.
- Receipts and payments in separate columns (Indian cash-book format).
- Summary row: Total Receipts | Total Payments.

### Bank Book Excel

Columns: `Date | Type | Narration | Payee | Reference No | Debit (₹L) | Credit (₹L) | Balance (₹L) | Reconciled`

### Expense Register Excel

Columns: `Date | Category | Vendor | Customer | Narration | Invoice No | Amount (₹L) | GST Rate | GST Amount (₹L) | Net (₹L) | Employee | Status`

- Subtotal row per category (optional grouping).

### Collections Excel

Columns: `Invoice Date | Invoice No | Customer | Employee | Invoice Value (₹L) | Without GST (₹L) | Due Date | Received Date | Amount Received (₹L) | Outstanding (₹L) | Status`

### Conveyance Excel

Columns: `Date | Employee | From | To | Mode | KM | Rate (₹/km) | Amount (₹) | Status`

### Customer Profitability Excel

Columns: `Customer | Revenue (₹L) | Direct Costs (₹L) | Gross Profit (₹L) | Gross Margin % | Invoices | Expenses`

---

## 4. PDF Export

**Library:** `@react-pdf/renderer` (server-side rendering, no browser required)

### PDF Report Template

All PDF reports share a common header:
```
┌────────────────────────────────────────────────┐
│  [Company Logo]   Caveo Infosystems Pvt. Ltd.  │
│                   {Report Title}               │
│                   Period: {from} to {to}       │
│  Generated: {timestamp}          Page {n}/{N}  │
├────────────────────────────────────────────────┤
│  [Table with data rows]                        │
│  ...                                           │
├────────────────────────────────────────────────┤
│  Totals row                                    │
└────────────────────────────────────────────────┘
```

Company logo is configured in `AppSetting` (key: `company.logo.url`).

### Individual Voucher PDF

Each voucher generates a standalone A5/A4 PDF:

```
┌────────────────────────────────────────────────┐
│  [Logo]         CAVEO INFOSYSTEMS PVT. LTD.   │
│                 {Address}  |  GSTIN: ...       │
├────────────────────────────────────────────────┤
│  PAYMENT VOUCHER              CI/26-27/00042   │
│  Date: 10 Jun 2026                             │
├────────────────────────────────────────────────┤
│  To: {Vendor / Payee Name}                     │
│                                                │
│  Narration: Office supplies — June 2026        │
│                                                │
│  Amount:  ₹ 25,000.00                          │
│  In Words: Rupees Twenty-Five Thousand Only    │
├────────────────────────────────────────────────┤
│  Mode: Bank Transfer   Ref: UTR1234567890      │
├────────────────────────────────────────────────┤
│  Prepared by: ____________   Date: __________  │
│  Approved by: ____________   Date: __________  │
└────────────────────────────────────────────────┘
```

"Amount in Words" is computed by an `amountToWords(rupees: number): string` helper.

---

## 5. Tally XML Export

**Library:** Custom builder — `src/lib/finance/tally-xml.ts` (no external dep needed).

### Tally Voucher Format

All Tally imports use the `TALLYMESSAGE` XML structure.
One `<VOUCHER>` element per financial record.

#### Voucher Type Mapping

| CRM entity | Tally voucher type |
|---|---|
| CashEntry (receipt) | `Receipt` |
| CashEntry (payment) | `Payment` |
| BankEntry (debit) | `Payment` |
| BankEntry (credit) | `Receipt` |
| ExpenseEntry | `Journal` |
| Collection (invoice) | `Sales` |
| Payment (ledger) | `Receipt` |

#### XML Envelope

```xml
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <!-- One <VOUCHER> block per record -->
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>
```

#### Cash Receipt Voucher

```xml
<VOUCHER VCHTYPE="Receipt" ACTION="Create">
  <DATE>20260610</DATE>
  <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
  <VOUCHERNUMBER>CI/26-27/00042</VOUCHERNUMBER>
  <NARRATION>Cash receipt — office rent collection</NARRATION>
  <ALLLEDGERENTRIES.LIST>
    <LEDGERNAME>Cash</LEDGERNAME>               <!-- debit -->
    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
    <AMOUNT>-50000.00</AMOUNT>
  </ALLLEDGERENTRIES.LIST>
  <ALLLEDGERENTRIES.LIST>
    <LEDGERNAME>Office Rent Income</LEDGERNAME>  <!-- credit -->
    <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
    <AMOUNT>50000.00</AMOUNT>
  </ALLLEDGERENTRIES.LIST>
</VOUCHER>
```

#### Sales Invoice (Collection)

```xml
<VOUCHER VCHTYPE="Sales" ACTION="Create">
  <DATE>20260515</DATE>
  <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
  <VOUCHERNUMBER>INV-2026-042</VOUCHERNUMBER>
  <PARTYLEDGERNAME>Infosys Ltd</PARTYLEDGERNAME>
  <NARRATION>Invoice INV-2026-042</NARRATION>
  <ALLLEDGERENTRIES.LIST>
    <LEDGERNAME>Infosys Ltd</LEDGERNAME>
    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
    <AMOUNT>-1250000.00</AMOUNT>
  </ALLLEDGERENTRIES.LIST>
  <ALLLEDGERENTRIES.LIST>
    <LEDGERNAME>Sales</LEDGERNAME>
    <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
    <AMOUNT>1059322.03</AMOUNT>
  </ALLLEDGERENTRIES.LIST>
  <ALLLEDGERENTRIES.LIST>
    <LEDGERNAME>Output IGST @ 18%</LEDGERNAME>
    <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
    <AMOUNT>190677.97</AMOUNT>
  </ALLLEDGERENTRIES.LIST>
</VOUCHER>
```

#### Expense Journal Entry

```xml
<VOUCHER VCHTYPE="Journal" ACTION="Create">
  <DATE>20260610</DATE>
  <VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>
  <VOUCHERNUMBER>CI/26-27/00043</VOUCHERNUMBER>
  <NARRATION>Client entertainment — Infosys lunch</NARRATION>
  <ALLLEDGERENTRIES.LIST>
    <LEDGERNAME>Client Entertainment</LEDGERNAME>  <!-- expense ledger -->
    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
    <AMOUNT>-25000.00</AMOUNT>
  </ALLLEDGERENTRIES.LIST>
  <ALLLEDGERENTRIES.LIST>
    <LEDGERNAME>Input IGST @ 18%</LEDGERNAME>   <!-- GST input credit -->
    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
    <AMOUNT>-3813.56</AMOUNT>
  </ALLLEDGERENTRIES.LIST>
  <ALLLEDGERENTRIES.LIST>
    <LEDGERNAME>Accounts Payable</LEDGERNAME>    <!-- or Cash / Bank -->
    <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
    <AMOUNT>28813.56</AMOUNT>
  </ALLLEDGERENTRIES.LIST>
</VOUCHER>
```

---

## 6. Currency Conversion

All CRM money is in **₹ Lakhs**. Tally and PDFs need **₹ Rupees**.

```
Rupees = Lakhs × 100,000
Round to 2 decimal places: Math.round(lakhs × 100000 × 100) / 100
```

Examples:
- `12.5 L` → `₹12,50,000.00`
- `0.002 L` → `₹200.00`
- `0.25 L` → `₹25,000.00`

---

## 7. Tally Ledger Name Mapping

Ledger names must exactly match names in the Tally company file.
Stored in `AppSetting` and configurable in Admin → Finance Settings.

| AppSetting Key | Default Value | Description |
|---|---|---|
| `finance.tally.ledger.cash` | `Cash` | Cash account ledger |
| `finance.tally.ledger.bank` | `HDFC Bank A/C` | Primary bank ledger |
| `finance.tally.ledger.sales` | `Sales` | Sales income ledger |
| `finance.tally.ledger.output_igst` | `Output IGST @ 18%` | IGST output for interstate sales |
| `finance.tally.ledger.output_cgst` | `Output CGST @ 9%` | CGST for intrastate |
| `finance.tally.ledger.output_sgst` | `Output SGST @ 9%` | SGST for intrastate |
| `finance.tally.ledger.input_igst` | `Input IGST @ 18%` | GST input credit (expenses) |
| `finance.tally.supply_type` | `interstate` | `interstate` (IGST) or `intrastate` (CGST+SGST) |
| `finance.tally.ledger.accounts_payable` | `Sundry Creditors` | Vendor payable ledger |

Category-specific ledger mapping (one AppSetting per ExpenseCategory code):

| AppSetting Key | Example Value |
|---|---|
| `finance.tally.category.TRVL` | `Travel Expenses` |
| `finance.tally.category.ENT` | `Client Entertainment` |
| `finance.tally.category.OFS` | `Office Supplies` |
| `finance.tally.category.CVY` | `Conveyance` |

---

## 8. Tally Import Instructions (for Accounts Team)

After downloading the XML file:

1. Open **Tally Prime**.
2. Go to **Gateway of Tally → Import → Vouchers**.
3. Select the `.xml` file from Downloads.
4. Verify the voucher count matches CRM.
5. Click **Import**.
6. Review import log for errors.

**Common errors and fixes:**

| Error | Fix |
|---|---|
| "Ledger not found: XYZ" | Create ledger in Tally first, or update the AppSetting for that ledger name |
| "Duplicate voucher number" | Filter export to only new records (already-imported range already done) |
| "Amount mismatch" | Check Lakhs → Rupees conversion; amounts may have rounding at the third decimal |
| "Date format error" | Export uses `YYYYMMDD` format — correct if Tally shows this error |

---

## 9. Implementation Checklist

- [ ] Add `exceljs` to `package.json`
- [ ] Add `@react-pdf/renderer` to `package.json`
- [ ] Create `src/lib/finance/excel-export.ts` — sheet builders for each data type
- [ ] Create `src/lib/finance/pdf-report.ts` — report PDF + voucher PDF templates
- [ ] Create `src/lib/finance/tally-xml.ts` — XML builder for all entity types
- [ ] Create `src/lib/finance/amount-to-words.ts` — Indian number words (for voucher PDF)
- [ ] Create `GET /api/finance/export/route.ts` — unified export endpoint
- [ ] Add Tally ledger AppSetting defaults in `src/lib/settings.ts`
- [ ] Add Export button + modal to all applicable list pages
- [ ] Add "Download PDF" button to individual voucher pages
- [ ] Add company logo URL to AppSetting (`company.logo.url`)
- [ ] Test Tally import with a trial Tally Prime installation
- [ ] Update Accounts team user guide (`/user-guide.html`) with import instructions
