# Finance Operations Module — Mobile Requirements

> **Status: APPROVED FINAL SCOPE**
> Mobile app: `/mobile` route (Next.js) · Capacitor WebView (Android APK)
> Mobile CSS: `.m-*` classes in `src/app/mobile/mobile.css`
> No Tailwind utility classes in mobile screens.

---

## 1. Approved Mobile Finance Features

Three new mobile screens are in scope, plus enhancements to existing screens.

| Screen | Description | Access |
|---|---|---|
| `ExpenseEntryScreen` | Create expense with camera bill capture | All employees |
| `ConveyanceScreen` | Log conveyance trip with GPS | All employees |
| `ApprovalsScreen` | View and action pending approvals | Approvers (isManager / finance roles) |
| `CollectionsScreen` | Invoice view (existing) | All |
| `TodayScreen` | Enhanced dashboard with finance KPIs | All |

---

## 2. Mobile Navigation

The existing tab bar (Today / Pipeline / + FAB / Updates / Me) is extended:

### FAB (`+`) Quick Log menu — new finance options:

| Option | Action |
|---|---|
| Log Call | Existing |
| Log Meeting | Existing |
| New Lead | Existing |
| Daily Update | Existing |
| **Log Expense** | Opens ExpenseEntryScreen |
| **Log Conveyance** | Opens ConveyanceScreen |

### Me Tab — new finance shortcuts:

| Shortcut | Screen |
|---|---|
| Collections | CollectionsScreen (existing) |
| Opportunities | Pipeline tab (existing) |
| **My Expenses** | ExpenseEntryScreen (list view) |
| **Conveyance** | ConveyanceScreen (list view) |
| **My Claims** | Claims list (read-only) |
| **Pending Approvals** | ApprovalsScreen (approvers only) |

### New screen types in `MobileApp.tsx`:
```typescript
type Screen =
  | { type: "tab" }
  | { type: "deal"; lead: MobileLead }
  | { type: "notifications" }
  | { type: "kras" }
  | { type: "team"; mode: "pipeline" | "kra" }
  | { type: "scan" }
  | { type: "compose" }
  | { type: "collections" }
  | { type: "expense-entry"; mode: "create" | "list" }   // NEW
  | { type: "conveyance"; mode: "create" | "list" }      // NEW
  | { type: "approvals" }                                 // NEW
```

---

## 3. ExpenseEntryScreen

**File:** `src/app/mobile/screens/ExpenseEntryScreen.tsx`

### 3.1 List Mode

Shows the employee's own expenses in reverse chronological order.

**Header KPIs:**
- This Month (₹L)
- Pending Approval (count)
- Approved (count)

**Segment:** Draft | Submitted | All

**Each row:**
- Category name (coloured tag)
- Narration (truncated to 2 lines)
- Amount (₹L)
- Date
- Status pill

**FAB:** Create new expense → switches to Create Mode.

---

### 3.2 Create Mode

**Step 1 — Capture receipt (camera or file)**
- Full-screen camera view (if permission granted)
- Tap to capture → preview thumbnail
- Skip button (proceed without attachment)
- "From Gallery / Files" alternative

Camera capture uses the browser's `<input type="file" accept="image/*" capture="environment">` which opens the native camera on Android.

**Step 2 — Expense details form**
- Category — searchable bottom-sheet selector
- Vendor — searchable bottom-sheet selector (optional)
- Customer — text input with autocomplete (optional)
- Date — date picker (defaults to today)
- Amount (₹ Lakhs) — numeric keypad input
- GST Rate — selector: 0 / 5 / 12 / 18 / 28%
- GST Amount — auto-computed (read-only)
- Vendor Invoice No — text (optional)
- Narration — textarea (required)

**Footer actions:**
- Save as Draft
- Save & Submit (creates ApprovalRequest immediately)

**Post-submit toast:** "Expense submitted ✓ — awaiting approval"

---

### 3.3 Attachment Flow

```
Camera button
  → native camera (or gallery)
  → file selected
  → POST /api/finance/expenses/[id]/attachments (multipart)
     (if expense not yet created, create it first as draft, then attach)
  → thumbnail shown in form
  → multiple attachments supported
```

---

## 4. ConveyanceScreen

**File:** `src/app/mobile/screens/ConveyanceScreen.tsx`

### 4.1 List Mode

**Header KPIs:** Total KM (this month) | Total Amount (₹) | Pending

**Each row:** Date, From → To, Mode icon, KM, Amount (₹), Status pill

**FAB:** Log new trip.

---

### 4.2 Create / GPS Capture Mode

**Step 1 — Travel mode selection**
Four large icon buttons: 🏍 Bike | 🚗 Car | 🛺 Auto | 🚌 Public

**Step 2 — Location capture**

Two options presented:

**Option A — GPS Capture (recommended)**
```
[ ● Capture Start Location ]
  ↓ (employee travels to destination)
[ ● Capture End Location ]

System:
  → navigator.geolocation.getCurrentPosition()
  → GET /api/finance/conveyance/distance?fromLat=...&toLat=...
  → Returns road distance in KM
```

**Option B — Manual entry**
- From Location (text)
- To Location (text)
- Distance (KM) — manual entry

**Step 3 — Trip details**
- Travel Date (defaults to today)
- Purpose (text, required)
- Rate (₹/km) — fetched from HR Policy, shown as read-only
- Calculated Amount = KM × Rate (shown live, read-only)
- Daily cap warning if approaching limit

**Submit button:** POST `/api/finance/conveyance` → submit for approval.

**Post-submit toast:** "Conveyance logged ✓ — ₹{amount}"

---

### 4.3 GPS Permission Handling

| Scenario | Behaviour |
|---|---|
| Permission granted | GPS captured automatically on button tap |
| Permission denied | Show manual entry form with a notice |
| GPS timeout (>10 sec) | Show manual entry fallback |
| No internet (Maps API) | Use Haversine straight-line distance × 1.25 factor as fallback |

---

## 5. ApprovalsScreen

**File:** `src/app/mobile/screens/ApprovalsScreen.tsx`

**Visible to:** `isManager || canManageFinance` — hidden for regular sales reps.

### 5.1 List

**Header:** "Approvals" | "{N} pending" subtitle

**Segment:** Pending | History

**Each row (Pending):**
- Entity type icon (expense / claim / advance / conveyance)
- Employee name
- Amount (₹L)
- Submitted date ("X days ago")
- Entity summary (category or purpose, 1 line)

**Tap row:** Opens ApprovalDetailSheet (bottom sheet).

---

### 5.2 ApprovalDetailSheet (Bottom Sheet)

Shows:
- Entity type + reference number
- Employee name + avatar
- Amount (large, prominent)
- Category / purpose
- Narration / notes
- Attachment thumbnails (tap to view full-screen)

**Action buttons (2-column footer):**
```
[ ✗ Reject ]    [ ✓ Approve ]
```

**Approve:** Optional comment field → POST `/api/finance/approvals/[id]/approve`
**Reject:** Required reason field → POST `/api/finance/approvals/[id]/reject`

**Post-action:** Row disappears from list; toast "Approved ✓" or "Rejected".

---

## 6. TodayScreen — Finance Enhancements

Additional cards shown below the existing collections summary:

### For all employees:
- **My Expenses this month** KPI card: total ₹L + "N pending approval" subtitle → tap → ExpenseEntryScreen
- **Conveyance this month** KPI card: total KM + total ₹ → tap → ConveyanceScreen

### For managers / approvers:
- **Pending Approvals** alert card: "N items awaiting your approval" → tap → ApprovalsScreen
- Enhanced payments today card (existing, unchanged)

---

## 7. Mobile-Specific Technical Rules

| Rule | Detail |
|---|---|
| Camera input | `<input type="file" accept="image/*" capture="environment">` — native camera on Android |
| GPS | `navigator.geolocation.getCurrentPosition()` with 10-second timeout |
| Maps distance | Server-side call to Google Maps Distance Matrix (keeps API key server-only) |
| All money | ₹ format via `fmtLakhs()` helper; ₹ per KM in plain Rupees for conveyance |
| HR Policy rate | Fetched from `GET /api/finance/hr-policy/me` on ConveyanceScreen mount |
| Offline | No offline support in scope; show a network error toast if API calls fail |
| Role gating | `isManager` prop is passed from `MobileApp` — no re-fetch needed in screens |
| CSS | Use `.m-*` classes only; no Tailwind in mobile screens |
| File size | Client-side limit: warn if attachment > 5 MB before upload |
| Expense attachment | Upload via `multipart/form-data` to `POST /api/finance/expenses/[id]/attachments` |
