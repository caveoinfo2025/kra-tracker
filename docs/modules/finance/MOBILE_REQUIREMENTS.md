# Finance Module — Mobile Requirements

> Mobile app lives at `/mobile` (Next.js route).
> Capacitor WebView loads `http://10.201.255.160:3000/mobile` in the Android APK.
> Mobile UI uses `.m-*` CSS classes (`src/app/mobile/mobile.css`).
> Design tokens: `--caveo-red: #C8102E`, `--cyber-black: #0F1115`.
> See `MOBILE_REQUIREMENTS.md` applies to the `/mobile` web-app; no native code.

---

## 1. Current Finance Features on Mobile (as-built)

### 1.1 Today Screen — Dashboard (`TodayScreen.tsx`)

The Today tab displays a collections summary section fetched from `GET /api/collections`.

**Collections stats section:**
- Fetches all collections for the current user on load.
- Computes client-side: `overdue count`, `openCount`, `outstandingLakhs`, `collectedTodayLakhs`.
- Renders two KPI cards:
  - **Outstanding**: total billed − received for open invoices.
  - **Collected Today** (if > 0): receipts with `paymentReceivedDate = today`.
  - Fallback: **Open Invoices** count if nothing received today.
- Renders an **overdue alert card** (red, tappable) if `overdueCount > 0`.
- "View all →" link and the overdue card both navigate to `CollectionsScreen`.

**Payments today card (managers only):**
- Fetches `GET /api/payments/today` separately.
- Shows a green card with total payment ledger amount received today.
- Visible only to `isManager = true` users.

**"Collections" action chip:**
- In the horizontal quick-action strip.
- Navigates to `CollectionsScreen`.

### 1.2 Collections Screen (`CollectionsScreen.tsx`)

Full invoice list screen accessible from Today and Me tabs.

**Header KPIs:**
- Billed (total), Collected (total), Outstanding (highlighted red if overdue exists).

**Overdue alert card:**
- Shows if any invoices are overdue.
- Displays count and total outstanding overdue amount.
- Tapping it switches the segment to "Overdue".

**Segment filter:**
- `Open`: invoices not fully received.
- `Overdue (N)`: overdue invoices.
- `All`: every invoice.

**Invoice list:**
- Each row: customer name, invoice number, due date, status pill, outstanding amount.
- Overdue rows: due date and outstanding amount shown in red.
- Partially Received rows: mini progress bar showing % collected.
- Sorted: overdue-first, then by due date ascending.
- Manager view: includes salesperson first name.

**Data source:** `GET /api/collections` (respects role — reps see own, finance sees all).

**Navigation:** Back button returns to the previous screen (Today or Me).

### 1.3 Me Screen — Quick Access

The Me tab includes finance shortcuts for all users:

- **Opportunities** → switches Pipeline tab to Opportunities segment
- **Collections** → opens CollectionsScreen

---

## 2. Mobile Finance UX Rules

| Rule | Reason |
|---|---|
| No payment recording on mobile (current) | Recording requires the ledger modal + invoice select; mobile form UX not yet designed |
| No advance management on mobile (current) | Advances are a low-frequency Accounts-team action best done on desktop |
| Collections are read-only on mobile (current) | View and triage only; edits happen on desktop |
| Overdue invoices surfaced on Today dashboard | High-priority visibility — reps and managers must see overdue status on first open |
| Outstanding amounts in Lakhs | Consistent with web app; `fmtLakhs()` helper converts to Cr if ≥ 100L |

---

## 3. Planned Mobile Finance Features

### 3.1 Record Payment on Mobile (Priority: High)

**Screen:** `RecordPaymentSheet.tsx` (bottom sheet)

**Trigger:** "Record Payment" button on a CollectionsScreen invoice row.
Finance roles only — same gate as web (`canManagePayments`).

**Fields:**
- Amount (Lakhs) — numeric input
- Payment Date — date picker (defaults to today)
- Mode — segmented: Bank Transfer / Cheque / UPI / Cash / Other
- Reference No — text input
- Notes — text area

**Submit:** `POST /api/payments` → refresh the invoice row in CollectionsScreen.

**Post-submit:** Show toast "Payment recorded — ₹{amount}L" + update outstanding KPI.

---

### 3.2 Apply Advance on Mobile (Priority: Medium)

**Screen:** `ApplyAdvanceSheet.tsx` (bottom sheet)

**Trigger:** Accessed from a new "Advances" section in the Me or Accounts section.

**Flow:**
1. Fetch `GET /api/advances?status=unapplied`.
2. Show list of unapplied advances.
3. Tap an advance → show open invoices for the same customer.
4. Confirm → `POST /api/advances/[id]/apply`.

---

### 3.3 Overdue Follow-up Actions (Priority: Medium — links to Google Maps)

On an overdue invoice row in `CollectionsScreen`, add action buttons:
- **Call** → `tel:` link with customer phone (if available from Customer master).
- **Visit** → opens `CollectionVisitSheet.tsx` to log a field visit with GPS coordinates.
- **Note** → quick text note attached to the invoice.

See `GOOGLE_MAPS_INTEGRATION.md` for the visit flow.

---

### 3.4 Notifications Screen (existing — finance-aware)

`NotificationsScreen.tsx` already handles `type: "payment"` notifications.
Finance improvements planned:
- Deep-link from notification directly to the specific invoice in CollectionsScreen.
- "Mark paid" quick action from the notification row (finance roles).

---

### 3.5 Mobile Accounts Dashboard (Priority: Low — managers/Accounts only)

A dedicated Accounts tab or section in the Me screen for:
- Payments today summary (amount + count).
- Unapplied advances count + total.
- Team collection rate (manager only).

---

## 4. Navigation Map (current)

```
Tab: Today
  └─ Collections alert card / action chip → CollectionsScreen
  └─ Bell icon → NotificationsScreen (shows payment notifications)

Tab: Pipeline
  ├─ Leads segment
  └─ Opportunities segment

Tab: + FAB
  └─ Log Call / Log Meeting / New Lead / Daily Update

Tab: Updates
  └─ Daily updates feed

Tab: Me
  ├─ Opportunities shortcut → Pipeline tab (Opportunities segment)
  ├─ Collections shortcut → CollectionsScreen
  ├─ My KRAs → KRAsScreen (non-managers)
  ├─ Pipeline Tasks → Pipeline tab
  ├─ Team Overview → TeamScreen (managers)
  └─ Team KRAs → TeamScreen KRA mode (managers)
```

---

## 5. Mobile-Specific Technical Notes

- All finance data fetched via the same REST API routes as the web app — no mobile-specific endpoints (except `/api/mobile/team`).
- Collections are fetched fresh on each `CollectionsScreen` mount (no client cache).
- The `isManager` prop is passed from `MobileApp` down through the screen hierarchy — use it (not a re-fetch) for role-gating UI elements.
- `fmtLakhs(val)` formats money: `≥ 100L → "₹{n} Cr"`, else `"₹{n} L"`.
- All money values from the API are `number` (JavaScript `float`) — round to 2 dp before display.
- Mobile screens must use `.m-*` CSS classes only — do not import Tailwind utility classes into mobile screens.
