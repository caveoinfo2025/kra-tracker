# Finance Module — API Specification

> All routes are in `src/app/api/`.
> Auth: every route calls `getSession()` and returns `401` if no session.
> Finance writes gate on `canManagePayments(session.user)` → returns `403` if denied.
> Money values are in **₹ Lakhs** (Float).

---

## 1. Collections API

### `GET /api/collections`

List invoices. Scope determined by the session role.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `employeeId` | number (optional) | Filter by sales rep. Finance roles only; ignored for reps. |

**Access:**
- Finance roles (`canSeeAllCollections`): returns all invoices, or filtered by `employeeId`.
- Sales rep: always returns only their own invoices (query param ignored).

**Response:** `Collection[]` — array of Collection objects including `employee: { name }`.

```json
[
  {
    "id": 42,
    "invoiceDate": "2026-05-15T00:00:00.000Z",
    "invoiceNo": "INV-2026-042",
    "employeeId": 7,
    "employee": { "name": "Rahul Kumar" },
    "customerName": "Infosys Ltd",
    "invoiceValueLakhs": 12.5,
    "amountWithoutGstLakhs": 10.59,
    "dueDate": "2026-06-15T00:00:00.000Z",
    "paymentReceivedDate": null,
    "amountReceivedLakhs": 0,
    "collectionStatus": "Pending",
    "remarks": "",
    "createdAt": "2026-05-15T10:00:00.000Z",
    "updatedAt": "2026-05-15T10:00:00.000Z"
  }
]
```

---

### `POST /api/collections`

Create a new invoice record.

**Access:** Authenticated. Finance roles can specify any `employeeId`; reps default to their own.

**Request body:**

```json
{
  "employeeId": 7,
  "invoiceDate": "2026-05-15",
  "invoiceNo": "INV-2026-042",
  "customerName": "Infosys Ltd",
  "invoiceValueLakhs": 12.5,
  "amountWithoutGstLakhs": 10.59,
  "dueDate": "2026-06-15",
  "paymentReceivedDate": null,
  "amountReceivedLakhs": 0,
  "collectionStatus": "Pending",
  "remarks": ""
}
```

**Response:** `201` with the created `Collection` row (includes `employee: { name }`).

---

### `PUT /api/collections/[id]`

Update invoice header fields. Does **not** update cached payment fields.

**Access:** Own record for reps; any record for finance roles.
Returns `403` if a rep tries to edit another rep's invoice.

**Request body:** Same shape as POST. Omit fields to leave unchanged.

**Response:** `200` with updated Collection row.

---

### `DELETE /api/collections/[id]`

Delete a single invoice.

**Access:** Own record for reps; any for finance roles.

**Response:** `200 { "success": true }`

---

### `DELETE /api/collections` (bulk)

Delete multiple invoices.

**Access:** Finance roles only (`canSeeAllCollections`).

**Request body:**
```json
{ "ids": [42, 43, 44] }
```

**Response:** `200 { "success": true, "deleted": 3 }`

---

## 2. Payments API

### `GET /api/payments?collectionId=42`

Fetch the payment ledger for a single invoice.

**Query parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `collectionId` | number | ✅ | Invoice ID |

**Response:** `Payment[]` ordered by `paymentDate DESC`, each including `recordedBy: { name }`.

```json
[
  {
    "id": 18,
    "collectionId": 42,
    "amountLakhs": 5.0,
    "paymentDate": "2026-05-20T00:00:00.000Z",
    "mode": "Bank Transfer",
    "referenceNo": "UTR12345678",
    "notes": "First instalment",
    "fromAdvanceId": null,
    "recordedById": 4,
    "recordedBy": { "name": "Vijesh Vijayan" },
    "createdAt": "2026-05-20T14:30:00.000Z"
  }
]
```

---

### `POST /api/payments`

Record a payment against an invoice.

**Access:** `canManagePayments` — Managers, Accounts, Operations Head only. Returns `403` for reps.

**Request body:**

```json
{
  "collectionId": 42,
  "amountLakhs": 5.0,
  "paymentDate": "2026-05-20",
  "mode": "Bank Transfer",
  "referenceNo": "UTR12345678",
  "notes": "First instalment"
}
```

| Field | Required | Notes |
|---|---|---|
| `collectionId` | ✅ | Must exist |
| `amountLakhs` | ✅ | Must be > 0 |
| `paymentDate` | optional | Defaults to `now()` if omitted |
| `mode` | optional | Defaults to `"Bank Transfer"` |
| `referenceNo` | optional | |
| `notes` | optional | |

**Side effects:**
1. Reconciles opening balance if needed.
2. Creates `Payment` row.
3. Updates `Collection` cached fields via `syncCollectionTotals()`.
4. Creates `Notification` rows for the invoice owner and all managers.

**Response:** `201`
```json
{
  "payment": { "id": 18, "amountLakhs": 5.0, ... },
  "collection": { "id": 42, "amountReceivedLakhs": 5.0, "collectionStatus": "Partially Received", ... }
}
```

---

### `GET /api/payments/today`

Daily payment summary — total received today + recent receipts.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `scope` | `"mine"` \| `"all"` | Force scope. Finance roles default to `"all"`; reps always `"mine"`. |

**Response:**

```json
{
  "totalLakhs": 18.5,
  "count": 3,
  "scope": "all",
  "payments": [
    {
      "id": 18,
      "amountLakhs": 5.0,
      "customerName": "Infosys Ltd",
      "invoiceNo": "INV-2026-042",
      "mode": "Bank Transfer",
      "recordedBy": "Vijesh Vijayan",
      "paymentDate": "2026-05-20T00:00:00.000Z"
    }
  ]
}
```

---

## 3. Advances API

### `GET /api/advances`

List order advances.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `status` | `"unapplied"` \| `"applied"` | Filter by status. Omit for all. |
| `customer` | string | Filter by customer name (contains, case-insensitive). |

**Response:** `OrderAdvance[]` including `recordedBy: { name }`.

```json
[
  {
    "id": 5,
    "salesFunnelId": 12,
    "customerName": "TCS",
    "amountLakhs": 8.0,
    "receivedDate": "2026-04-10T00:00:00.000Z",
    "mode": "Bank Transfer",
    "referenceNo": "UTR99887766",
    "notes": "Mobilisation advance",
    "status": "unapplied",
    "appliedToCollectionId": null,
    "appliedDate": null,
    "recordedBy": { "name": "Vijesh Vijayan" },
    "createdAt": "2026-04-10T09:00:00.000Z"
  }
]
```

---

### `POST /api/advances`

Record a new order advance.

**Access:** `canManagePayments` only. Returns `403` for reps.

**Request body:**

```json
{
  "customerName": "TCS",
  "amountLakhs": 8.0,
  "receivedDate": "2026-04-10",
  "mode": "Bank Transfer",
  "referenceNo": "UTR99887766",
  "notes": "Mobilisation advance",
  "salesFunnelId": 12
}
```

| Field | Required | Notes |
|---|---|---|
| `customerName` | ✅ | |
| `amountLakhs` | ✅ | Must be > 0 |
| `receivedDate` | optional | Defaults to `now()` |
| `mode` | optional | Defaults to `"Bank Transfer"` |
| `referenceNo` | optional | |
| `notes` | optional | |
| `salesFunnelId` | optional | Link to a Closed Won deal |

**Response:** `201` with created `OrderAdvance` row.

---

### `POST /api/advances/[id]/apply`

Apply an unapplied advance to an open invoice.

**Access:** `canManagePayments` only.

**Request body:**
```json
{ "collectionId": 42 }
```

**Side effects:**
1. Validates advance exists and is `unapplied`.
2. Calls `recordPayment()` — creates a `Payment` from the advance amount.
3. Updates `Collection` cached fields.
4. Fires payment notifications.
5. Marks advance `status = "applied"`, sets `appliedToCollectionId` and `appliedDate`.

**Response:** `200` with `{ payment, collection }` (same shape as `POST /api/payments`).

**Error responses:**
- `400 { "error": "Advance not found" }` — invalid `id`
- `400 { "error": "Advance already applied" }` — already applied
- `400 { "error": "collectionId required" }` — missing body field
- `404 { "error": "Invoice not found" }` — invalid `collectionId`

---

## 4. Notifications API

### `GET /api/notifications`

Fetch the current user's notifications.

**Response:**
```json
{
  "notifications": [
    {
      "id": 101,
      "type": "payment",
      "title": "Payment received: ₹5.00L",
      "body": "Infosys Ltd · Invoice INV-2026-042",
      "link": "/collections",
      "amountLakhs": 5.0,
      "isRead": false,
      "createdAt": "2026-05-20T14:30:00.000Z"
    }
  ]
}
```

---

### `PATCH /api/notifications`

Mark all notifications as read for the current user.

**Request body:**
```json
{ "markAllRead": true }
```

**Response:** `200 { "success": true }`

---

## 5. Error Response Format

All error responses follow the same shape:

```json
{ "error": "Human-readable message" }
```

| Status | Meaning |
|---|---|
| `400` | Validation error (missing/invalid field) |
| `401` | Not authenticated (no session) |
| `403` | Authenticated but insufficient role |
| `404` | Record not found |
| `500` | Unhandled server error |

---

## 6. Planned API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/payments/[id]/void` | `POST` | Soft-delete / reverse a payment (FR-FIN-44) |
| `/api/collections/[id]/visits` | `GET` / `POST` | Customer visit log (Google Maps — FR-FIN-41) |
| `/api/finance/tally-export` | `GET` | Download Tally-compatible voucher export (FR-FIN-40) |
| `/api/finance/summary` | `GET` | Aggregated dashboard stats for the mobile dashboard |
