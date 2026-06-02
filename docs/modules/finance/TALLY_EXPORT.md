# Finance Module — Tally Export

> Planned feature. No code exists yet.
> Reference: FR-FIN-40 in `FINANCE_REQUIREMENTS.md`.
> Tally.ERP 9 / Tally Prime is the accounting software used by Caveo Infosystems.

---

## 1. Purpose

The Tally Export feature allows the Accounts team to download finance data from
Caveo CRM in a format that can be directly imported into Tally Prime / Tally.ERP 9,
eliminating manual re-entry of invoices and payment receipts.

---

## 2. Tally Import Formats

Tally supports two import mechanisms:

| Format | Use case |
|---|---|
| **XML (TDL-based)** | Native Tally XML import — the recommended method. Tally reads a structured XML file via `File > Import Data > Vouchers`. |
| **CSV via Excel** | Manual copy-paste with Tally Excel Import plugin — less reliable, not recommended. |

**This integration targets Tally XML import.**

---

## 3. Data to Export

### 3.1 Sales Invoices (from `Collection` table)

Each `Collection` row maps to a **Sales Voucher** in Tally.

| CRM Field | Tally Field | Notes |
|---|---|---|
| `invoiceDate` | `DATE` | Format: `YYYYMMDD` |
| `invoiceNo` | `VOUCHERNUMBER` | Tally voucher number |
| `customerName` | `PARTYLEDGERNAME` | Must match a Tally ledger name |
| `invoiceValueLakhs × 100000` | `AMOUNT` | Convert Lakhs to Rupees (multiply by 100,000) |
| `amountWithoutGstLakhs × 100000` | Taxable amount | Pre-GST amount |
| `(invoiceValueLakhs − amountWithoutGstLakhs) × 100000` | GST amount (CGST + SGST or IGST) | |
| `employeeId → employee.name` | Narration / Cost Centre | Tag to salesperson |

### 3.2 Payment Receipts (from `Payment` table)

Each `Payment` row (excluding `mode = "Opening Balance"`) maps to a
**Receipt Voucher** in Tally.

| CRM Field | Tally Field | Notes |
|---|---|---|
| `paymentDate` | `DATE` | Format: `YYYYMMDD` |
| `Payment.id` | `VOUCHERNUMBER` | e.g. `REC-{id}` |
| `collection.customerName` | `PARTYLEDGERNAME` | |
| `amountLakhs × 100000` | `AMOUNT` | Rupees |
| `mode` | Narration | Bank Transfer / Cheque / UPI / Cash |
| `referenceNo` | `NARRATION` / Cheque No | |
| `notes` | `NARRATION` | Appended to narration |

---

## 4. Tally XML Structure

Tally's native import format is `TALLYMESSAGE` XML. The minimal structure for
a Sales Voucher and Receipt Voucher:

### Sales Voucher (invoice)

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

          <!-- One VOUCHER element per invoice -->
          <VOUCHER VCHTYPE="Sales" ACTION="Create">
            <DATE>20260515</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>INV-2026-042</VOUCHERNUMBER>
            <PARTYLEDGERNAME>Infosys Ltd</PARTYLEDGERNAME>
            <NARRATION>Invoice INV-2026-042 · Sales rep: Rahul Kumar</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <!-- Debtors (customer receivable) -->
              <LEDGERNAME>Infosys Ltd</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-1250000.00</AMOUNT>  <!-- negative = debit in Tally -->
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <!-- Sales ledger -->
              <LEDGERNAME>Sales</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>1059322.03</AMOUNT>  <!-- without-GST amount -->
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <!-- GST output ledger (IGST or CGST+SGST depending on supply type) -->
              <LEDGERNAME>Output IGST 18%</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>190677.97</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>

        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>
```

### Receipt Voucher (payment)

```xml
<VOUCHER VCHTYPE="Receipt" ACTION="Create">
  <DATE>20260520</DATE>
  <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
  <VOUCHERNUMBER>REC-18</VOUCHERNUMBER>
  <PARTYLEDGERNAME>Infosys Ltd</PARTYLEDGERNAME>
  <NARRATION>Bank Transfer · UTR12345678 · First instalment</NARRATION>
  <ALLLEDGERENTRIES.LIST>
    <!-- Bank account (debit) -->
    <LEDGERNAME>HDFC Bank A/C</LEDGERNAME>
    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
    <AMOUNT>-500000.00</AMOUNT>
  </ALLLEDGERENTRIES.LIST>
  <ALLLEDGERENTRIES.LIST>
    <!-- Debtors (credit) -->
    <LEDGERNAME>Infosys Ltd</LEDGERNAME>
    <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
    <AMOUNT>500000.00</AMOUNT>
  </ALLLEDGERENTRIES.LIST>
</VOUCHER>
```

---

## 5. Currency Conversion

All CRM values are in **₹ Lakhs** (Float). Tally works in **Rupees** (paise-level precision).

```
Tally Rupees = CRM Lakhs × 100,000
```

Examples:
- `12.5 L` → `₹12,50,000`
- `0.5 L` → `₹50,000`

Apply `Math.round(value × 100000 * 100) / 100` to get 2-decimal-place Rupees.

---

## 6. Ledger Name Mapping

Tally ledger names must exactly match what exists in the Tally company file.
A mapping configuration is needed (stored in `AppSetting`):

| CRM concept | Default Tally ledger name | Configurable? |
|---|---|---|
| Sales income | `Sales` | Yes |
| Output IGST 18% | `Output IGST @ 18%` | Yes |
| Output CGST 9% | `Output CGST @ 9%` | Yes |
| Output SGST 9% | `Output SGST @ 9%` | Yes |
| Bank account | `HDFC Bank A/C` | Yes |
| Cash | `Cash` | Yes |
| Customer (debtor) | `{customerName}` (dynamic) | No — uses customer name directly |

**AppSetting keys to add:**

```
finance.tally.ledger.sales          = "Sales"
finance.tally.ledger.igst           = "Output IGST @ 18%"
finance.tally.ledger.cgst           = "Output CGST @ 9%"
finance.tally.ledger.sgst           = "Output SGST @ 9%"
finance.tally.ledger.bank           = "HDFC Bank A/C"
finance.tally.ledger.cash           = "Cash"
finance.tally.supply_type           = "interstate"  // "interstate" (IGST) | "intrastate" (CGST+SGST)
```

These settings are configurable in the Admin panel (`/admin` → Settings tab).

---

## 7. API Design

### `GET /api/finance/tally-export`

Generate and download the Tally-compatible XML file.

**Access:** Finance roles only (`canManagePayments`).

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `from` | `YYYY-MM-DD` | Start of current FY | Export start date (inclusive) |
| `to` | `YYYY-MM-DD` | Today | Export end date (inclusive) |
| `type` | `invoices` \| `payments` \| `all` | `all` | Which voucher types to include |
| `employeeId` | number | (all) | Scope to a single salesperson |

**Response:**
- `Content-Type: application/xml`
- `Content-Disposition: attachment; filename="tally-export-{from}-{to}.xml"`
- Body: Tally-compatible XML as described in § 4.

**Server-side logic:**

```typescript
// Pseudocode — src/app/api/finance/tally-export/route.ts

export async function GET(req: Request) {
  const session = await getSession();
  if (!canManagePayments(session?.user)) return 403;

  const { from, to, type, employeeId } = parseParams(req.url);

  const [collections, payments] = await Promise.all([
    type !== "payments" ? prisma.collection.findMany({ where: { invoiceDate: { gte: from, lte: to }, ...(employeeId ? { employeeId } : {}) }, include: { employee: true } }) : [],
    type !== "invoices" ? prisma.payment.findMany({ where: { paymentDate: { gte: from, lte: to }, mode: { not: "Opening Balance" }, ...(employeeId ? { collection: { employeeId } } : {}) }, include: { collection: { include: { employee: true } } } }) : [],
  ]);

  const settings = await getTallySettings();   // read AppSetting for ledger names
  const xml = buildTallyXml(collections, payments, settings);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Content-Disposition": `attachment; filename="tally-export-${from}-${to}.xml"`,
    },
  });
}
```

---

## 8. UI — Export Button

**Location:** `/collections` page toolbar + `/accounts` page toolbar.

**Button:** "Export to Tally" (with a download icon).

**Behaviour:**
1. Opens a small modal with date-range pickers and type selector.
2. On confirm, calls `GET /api/finance/tally-export?from=...&to=...&type=...`.
3. Browser triggers file download automatically.
4. Shows toast: "Tally XML downloaded — import via Tally: File → Import Data → Vouchers."

---

## 9. Import Instructions for the Accounts Team

After downloading the XML file from Caveo CRM:

1. Open **Tally Prime** / **Tally.ERP 9**.
2. Go to **Gateway of Tally → Import Data → Vouchers**.
3. Select the downloaded `.xml` file.
4. Tally will show a preview of vouchers to be imported.
5. Verify the count matches CRM records.
6. Click **Import**.
7. Check the import log for any ledger-name mismatches.

**Common errors:**

| Error | Fix |
|---|---|
| "Ledger not found" | Create the ledger in Tally first, or update the ledger name mapping in Admin → Settings |
| "Duplicate voucher number" | The invoice/payment was already imported; use date-range filter to export only new records |
| "Amount mismatch" | Verify the Lakhs → Rupees conversion; check for rounding differences |

---

## 10. Implementation Checklist

- [ ] Add Tally ledger mapping keys to `AppSetting` defaults (`src/lib/settings.ts`)
- [ ] Create `src/lib/tally-xml.ts` — XML builder with types for Sales / Receipt vouchers
- [ ] Create `GET /api/finance/tally-export/route.ts`
- [ ] Add "Export to Tally" button and date-range modal to `CollectionsClient.tsx`
- [ ] Add "Export to Tally" button to `AccountsClient.tsx`
- [ ] Test import with a real Tally Prime trial installation
- [ ] Document ledger name setup in the Accounts team user guide (`/user-guide.html`)
