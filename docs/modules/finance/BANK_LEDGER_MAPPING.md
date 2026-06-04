# Bank Ledger ↔ Source Document Mapping

> **Status:** Design (UI implemented with mock data; schema/services deferred to a DB phase).
> Companion to `DATABASE_SCHEMA.md`, `API_SPECIFICATION.md`, and the Bank Book UI under
> `src/app/finance/bank-book/`.
> **Money:** ₹ Lakhs in the DB (`Float`/`DOUBLE`, future `@db.Decimal(12,4)`); the Bank Book
> UI currently renders ₹ rupees for petty-cash-scale realism — normalise on persistence.

---

## 1. Purpose

Every line in the Bank Book must reconcile against the rest of the system so the bank
balance is explainable. Three money flows already exist as records elsewhere; a bank line
should **link** to the one it settles:

| Money flow | Source record (existing) | Bank transaction type | Direction |
|---|---|---|---|
| Customer payment received | `Collection` + `Payment` (ledger of receipts) | Customer Receipt | **Credit** |
| Advance received from customer | `OrderAdvance` (later applied to an invoice) | Customer Receipt / Advance | **Credit** |
| Approved expense paid by bank/card | `Expense` (`status=approved`, mode = NEFT/RTGS/IMPS/UPI/Cheque/Card) | Vendor Payment / Expense Payment | **Debit** |

> Cash, interest, charges, transfers, and employee advances/claims are **not** customer/vendor
> flows — they post to the bank with no external source link (or link to `EmployeeAdvance` /
> `TravelClaim` in a later iteration).

---

## 2. Linking model (UI, implemented)

The UI represents the link as a soft reference on the bank transaction:

```ts
type SourceKind = "collection" | "advance" | "expense";
interface SourceLink { kind: SourceKind; id: string; label: string }
// BankTxn.source?: SourceLink
```

- **Add Bank Entry** shows a contextual picker driven by the transaction type:
  - *Customer Receipt* → choose **Invoice (Collection)** or **Customer Advance**, then a
    dropdown of open documents. Selecting one pre-fills amount, party, and narration.
  - *Vendor Payment / Expense Payment* → choose an **approved Expense** (filtered to
    bank/card modes). Selecting one pre-fills amount, vendor, mode, narration.
- The link renders as a **"Mapped To"** card in the details drawer and a small `Link2`
  reference under the description in the ledger table.
- **Statement import** suggests a settlement per row (matching by amount, then
  reference/date/description) shown in the preview's **Settles** column.

---

## 3. Proposed schema (deferred — no migration yet)

Add nullable soft-reference columns to the existing `Ledger` model (the bank/cash ledger
from Finance Phase 1). Keep them nullable + indexed; do **not** hard-FK across the
Phase-0 collections tables to avoid a tight coupling and a heavy migration.

```prisma
model Ledger {
  // … existing fields …

  // ── Source mapping (bank line ↔ originating document) ──
  sourceType   String?  // "collection" | "advance" | "expense" | null
  collectionId Int?     // → Collection.id   (customer receipt)
  paymentId    Int?     // → Payment.id       (specific receipt row, optional)
  advanceId    Int?     // → OrderAdvance.id  (customer advance)
  expenseId    Int?     // → Expense.id       (vendor/expense payment)

  @@index([sourceType])
  @@index([collectionId])
  @@index([advanceId])
  @@index([expenseId])
}
```

Rules:
- Exactly **one** of `collectionId` / `advanceId` / `expenseId` is set when `sourceType` is
  non-null (enforced in the service, not the DB).
- `@db.Decimal(12,4)` recommended for all money columns when this lands (carryover debt).
- Mirror back-references for reporting if needed (`Collection.bankLedgerEntries`, etc.).

---

## 4. Linking service (deferred)

`src/lib/finance/bank-ledger.ts`

| Function | Responsibility |
|---|---|
| `linkBankEntry(ledgerId, source)` | Validate amount ≤ source outstanding; set `sourceType` + id; in a `prisma.$transaction`. |
| `postCustomerReceipt(collectionId, bank)` | Create a `Payment` (existing `recordPayment`) **and** a credit `Ledger` line linked to it; run `syncCollectionTotals`. |
| `postCustomerAdvance(advanceId, bank)` | Create credit `Ledger` line linked to the `OrderAdvance`. |
| `payExpense(expenseId, bank)` | Create debit `Ledger` line linked to the `Expense`; set `Expense.status=paid`, `paidDate`. |
| `unlinkBankEntry(ledgerId)` | Clear the link, reversing any cached-total side effects. |

All mutations wrapped in `prisma.$transaction` (Phase-1 rule #8). Cached balances
(`FinAccount.currentBalance`, `Collection.amountReceivedLakhs`) are written **only** by these
service functions.

### Reconciliation rule
A linked bank line should reconcile to its source amount. If `bankAmount === sourceOutstanding`
→ mark source settled; if `<` → **partially reconciled** (the existing `Collection` partial
flow + `OrderAdvance` apply-to-invoice already model this).

---

## 5. Statement import matching (deferred service, UI mocked)

When importing a bank statement, each row is matched to a candidate source:

1. **Reference number** exact (UTR/cheque) → strongest.
2. **Amount** exact against open `Collection` (credit) / approved `Expense` (debit).
3. **Date** within ±3 days.
4. **Description / party** fuzzy contains.

Outcome per row: `new` (no system record → Add), `matched` (existing bank line → Update),
`duplicate` (possible repeat → review/Amend/Ignore). A matched source is surfaced as the
**Settles** suggestion; confirming it sets the `source*` columns on insert.

---

## 6. Permissions (reuses `src/lib/roles.ts`)

| Tier | Link / pay actions |
|---|---|
| Accounts Admin (Operations Head) | Link, pay, import-match, reconciliation approval |
| Accounts Team (Accounts) | Link, pay, import-match |
| Manager | Review / approve only |
| Branch User | View own branch; no linking/import |

---

## 7. Status — what's built vs. pending

- **Built (UI, mock):** source picker in Add Bank Entry; "Mapped To" in the drawer; linked
  reference in the table; import preview **Settles** suggestions; seeded linked transactions.
- **Pending (DB phase):** the `Ledger` source columns + migration, the `bank-ledger.ts`
  service, real candidate queries against `Collection`/`OrderAdvance`/`Expense`, and the
  reconciliation write-backs.
