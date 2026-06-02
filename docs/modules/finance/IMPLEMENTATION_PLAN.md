# Finance Module — Implementation Plan

> Phases are ordered by business value and technical dependency.
> Completed work is in Phase 0.  All future phases require review before coding.
> Database: MySQL 8-compatible (MariaDB 11.8). All new Prisma models must follow
> the MySQL design rules in `docs/DATABASE.md § 7`.

---

## Phase 0 — Completed (as-built baseline)

**Status:** ✅ Complete and live in production (`sales.caveoinfosystems.com`).

| Item | Description |
|---|---|
| Invoice management | Create / Edit / Delete `Collection` records; bulk delete |
| Payment ledger | Immutable `Payment` rows per invoice; `syncCollectionTotals()` |
| Opening-balance reconciliation | Synthetic ledger entry for pre-imported invoices |
| Order advances | Create / List / Apply advances → `Payment` |
| Payment notifications | Fan-out to invoice owner + all managers on every payment |
| Daily collections summary | `GET /api/payments/today`; web widget + mobile dashboard |
| Accounts page | Advances management + payments-today widget |
| Collections page | Invoice list with tabs (All / Overdue / Upcoming / Revenue Summary) |
| Role gates | `canSeeAllCollections`, `canManagePayments` in `src/lib/roles.ts` |
| Mobile collections screen | `CollectionsScreen.tsx` — read-only view with overdue alerts |
| Mobile today dashboard | Collections KPIs + overdue alert card on `TodayScreen.tsx` |

---

## Phase 1 — Technical Debt & Stability (Priority: High)

**Goal:** Make the existing finance module production-safe before adding new features.

### 1.1 Transaction wrapping — `recordPayment` + `applyAdvance`

**File:** `src/lib/payments.ts`

**Problem:** `recordPayment` runs `payment.create` + `syncCollectionTotals` + `notification.createMany`
as separate queries. Under concurrent writes these can race (MySQL allows concurrent connections,
unlike SQLite's single-writer lock).

**Solution:**
```typescript
export async function recordPayment(input: RecordPaymentInput) {
  await reconcileOpeningBalance(input.collectionId, input.recordedById);

  const { payment, collection } = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.create({ data: { ... } });
    const c = await syncCollectionTotals(input.collectionId, tx);
    return { payment: p, collection: c };
  });

  // Notifications outside transaction (non-critical — allowed to fail without rollback)
  await firePaymentNotifications(payment, collection);

  return { payment, collection };
}
```

`syncCollectionTotals` must accept an optional `tx` argument (Prisma transaction client).

**Acceptance criteria:** No payment creates a `Collection` in an inconsistent state under
a simulated concurrent write (tested with two parallel `POST /api/payments` for the same
`collectionId`).

---

### 1.2 Remove leftover SQLite dependencies

**File:** `package.json`

**Remove:**
```json
"better-sqlite3": "...",
"@types/better-sqlite3": "..."
```

**Run:** `npm install` to update `package-lock.json`. Verify `npm run build` passes.

---

### 1.3 Money precision migration — `@db.Decimal(12,4)`

**Files:** `prisma/schema.prisma`, `src/lib/payments.ts`, `src/app/api/**`

**Problem:** `Float` (MySQL `DOUBLE`) accumulates floating-point drift in financial sums.

**Migration:**
1. Add `@db.Decimal(12,4)` to all `*Lakhs` and `value` fields:
   - `Collection.invoiceValueLakhs`, `amountWithoutGstLakhs`, `amountReceivedLakhs`
   - `Payment.amountLakhs`
   - `OrderAdvance.amountLakhs`
   - `CrmOpportunity.value`, `SalesFunnel.dealValueLakhs`, `billingValueLakhs`
2. Run `npx prisma migrate dev --name decimal_money_fields`.
3. Prisma returns `Prisma.Decimal` from these fields. At the API boundary, convert to `number`:
   ```typescript
   const amount = Number(row.amountLakhs);
   ```
4. The `round2()` helper in `payments.ts` can be removed once Decimal is in use.

**Acceptance criteria:** All invoice + payment totals match to 4 decimal places; no
accumulated drift in `syncCollectionTotals`.

---

## Phase 2 — Payment Management UX (Priority: High)

### 2.1 Payment soft-delete / void

**Goal:** Allow Accounts to reverse a mistakenly recorded payment.

**New schema fields on `Payment`:**
```prisma
isVoid     Boolean   @default(false)
voidedAt   DateTime?
voidedById Int?
voidedBy   Employee? @relation("PaymentVoider", ...)
voidReason String    @db.Text @default("")
```

**New API:** `POST /api/payments/[id]/void` → `{ reason: string }`
- Sets `isVoid = true`, `voidedAt`, `voidedById`, `voidReason`.
- Calls `syncCollectionTotals` (which filters `where: { isVoid: false }` after this change).
- Access: `canManagePayments` only.

**UI:** "Void" action on each ledger row in the Record Payment modal. Shows voided entries
in strikethrough style with the void reason.

---

### 2.2 Mobile payment recording

**Goal:** Allow Accounts / managers to record a payment directly from the mobile app.

**New screen:** `RecordPaymentSheet.tsx` (bottom sheet)

**Trigger:** "Record Payment" button on a CollectionsScreen invoice row (finance roles only).

**Fields:** Amount, Date, Mode (segmented), Reference, Notes.

**Submit:** `POST /api/payments` → toast + refresh invoice row.

---

## Phase 3 — Google Maps Field Collections (Priority: Medium)

**Goal:** Log customer visit GPS coordinates linked to overdue invoices.

**Dependencies:**
- Google Maps API key (restricted server-side key + browser key).
- `CollectionVisit` Prisma model (schema change + migration).
- Geocoding server helper (`src/lib/geocode.ts`).

**Deliverables:**
1. `CollectionVisit` model + migration.
2. `GET/POST /api/collections/[id]/visits` routes.
3. `GET /api/finance/visits/map` (manager overview).
4. `CollectionVisitSheet.tsx` — mobile bottom sheet with GPS capture.
5. "Log Visit" button on overdue rows in `CollectionsScreen.tsx`.
6. Manager map tab on `/accounts` page (Google Maps JS API).

**Full specification:** See `GOOGLE_MAPS_INTEGRATION.md`.

---

## Phase 4 — Tally Export (Priority: Medium)

**Goal:** Download Tally-compatible XML of invoices and payment receipts.

**Dependencies:** Tally ledger name mapping in `AppSetting`.

**Deliverables:**
1. Add Tally config keys to `AppSetting` defaults (`src/lib/settings.ts`).
2. `src/lib/tally-xml.ts` — XML builder (no external dependencies needed; plain string builder).
3. `GET /api/finance/tally-export` — query + XML generation + file download response.
4. Export button + date-range modal in `CollectionsClient.tsx` and `AccountsClient.tsx`.
5. Accounts team user guide update.

**Full specification:** See `TALLY_EXPORT.md`.

---

## Phase 5 — Reporting & Analytics (Priority: Low)

### 5.1 DSO (Days Sales Outstanding)

**Formula:** `DSO = (Total Accounts Receivable / Total Credit Sales) × Number of Days`

- Per-invoice DSO: `paymentReceivedDate − invoiceDate`.
- Portfolio DSO: average across all invoices in a period.
- Display on the Revenue Summary tab and Accounts dashboard.

### 5.2 Collection Rate Trend

- Line chart: monthly collection rate (`collected / billed`) over the last 12 months.
- Sourced from existing `Collection` and `Payment` data.
- Render with Recharts (already in the project).

### 5.3 Overdue Aging Report

Groups overdue invoices by how long they've been overdue:

| Bucket | Definition |
|---|---|
| 0–30 days | `today − dueDate ≤ 30` |
| 31–60 days | 31–60 days past due |
| 61–90 days | 61–90 days past due |
| 90+ days | More than 90 days past due |

Displayed as a stacked bar chart + summary table.

### 5.4 Email Overdue Reminders

- "Send Reminder" button on an overdue invoice row.
- Sends a pre-templated email to the customer (via an email service — Resend / SendGrid).
- Logs a `CollectionVisit`-style note when the reminder is sent.

---

## Phase 6 — Advanced Features (Priority: Future / Deferred)

| Feature | Notes |
|---|---|
| GST reconciliation | Match CRM invoices against GST portal GSTR-1 data |
| ERP integration | Push invoices/payments to a central ERP (e.g. SAP / Zoho Books) |
| Cheque bounce handling | Mark a payment as "bounced" and reverse the `amountReceivedLakhs` |
| Credit limit enforcement | Block new deals for customers with outstanding > threshold |
| Invoice PDF generation | Generate a formatted PDF invoice from a `Collection` record |
| Customer payment portal | External (no-login) page for customers to view their invoices |

---

## Development Rules for All Finance Phases

1. **MySQL-compatible Prisma only.** Provider `mysql`, `@db.Text` on long strings,
   `@@index` on every FK — no exceptions. See `docs/DATABASE.md § 7`.

2. **Never hand-set cached fields.** `amountReceivedLakhs`, `collectionStatus`,
   `paymentReceivedDate` on `Collection` are set exclusively by `syncCollectionTotals()`.

3. **Gate all writes.** Every payment/advance write API must call `canManagePayments(session.user)`
   before touching the database.

4. **Money in Lakhs in the DB; Rupees in Tally XML.** Never store Rupees in the DB.

5. **`prisma.$transaction` for multi-step writes.** After Phase 1.1 lands, any new
   multi-step finance write must use a transaction from day one.

6. **Confirm before production push.** Test on dev server, confirm with the user, then push.
   Never trigger rapid rebuilds on Hostinger (LVE resource limit risk).
