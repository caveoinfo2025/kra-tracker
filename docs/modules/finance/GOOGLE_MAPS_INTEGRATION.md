# Finance Module — Google Maps Integration

> Planned feature. No code exists yet. This document defines requirements,
> data model, API design, and UX for field-collection visit tracking.
> Reference: FR-FIN-41 in `FINANCE_REQUIREMENTS.md`.

---

## 1. Purpose

When a sales representative or collections officer visits a customer site to
follow up on an overdue invoice, the system should:

1. Record the GPS coordinates and address of the visit.
2. Link the visit to the specific overdue invoice.
3. Capture the outcome of the visit (visited / promise to pay / escalation required).
4. Allow managers to see the team's field-collection activity on a map.
5. (Future) Route-optimise a rep's collection visit itinerary for the day.

---

## 2. Scope

| In scope | Out of scope |
|---|---|
| Log a visit linked to a `Collection` (invoice) | Real-time GPS tracking / live location |
| Capture GPS coordinates at the moment of logging | Navigation / turn-by-turn routing |
| Reverse-geocode coordinates → address via Google Maps API | Third-party route optimisation |
| Display visits on a manager map view | Offline map caching |
| Mobile-first — visit logging happens in the field | Visit logging on desktop (low priority) |

---

## 3. Data Model

### New Prisma model: `CollectionVisit`

```prisma
model CollectionVisit {
  id           Int        @id @default(autoincrement())
  collectionId Int
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  employeeId   Int
  employee     Employee   @relation("VisitEmployee", fields: [employeeId], references: [id])
  visitedAt    DateTime   @default(now())
  latitude     Float                           // GPS lat, decimal degrees
  longitude    Float                           // GPS lng, decimal degrees
  address      String     @db.Text @default("") // reverse-geocoded address string
  notes        String     @db.Text @default("") // free-form field notes
  outcome      String     @default("visited")  // see § 3.1 Outcome values
  photoUrl     String?                          // future: cloud photo URL
  createdAt    DateTime   @default(now())

  @@index([collectionId])
  @@index([employeeId])
  @@index([visitedAt])
}
```

**Add reverse-relation to `Collection`:**
```prisma
// Inside the Collection model:
visits  CollectionVisit[]
```

**Add reverse-relation to `Employee`:**
```prisma
// Inside the Employee model:
collectionVisits  CollectionVisit[]  @relation("VisitEmployee")
```

### 3.1 Outcome Values

| Value | Meaning |
|---|---|
| `visited` | Customer was visited; no specific outcome recorded |
| `promise_to_pay` | Customer committed to a payment date |
| `not_available` | Customer / contact was not available |
| `escalation` | Visit revealed a dispute or issue requiring management attention |
| `partial_cash` | Customer paid a partial amount in cash on the spot |

---

## 4. API Design

### `GET /api/collections/[id]/visits`

List all field visits for an invoice.

**Access:** Finance roles + the invoice's owner.

**Response:**
```json
[
  {
    "id": 1,
    "collectionId": 42,
    "employeeId": 7,
    "employee": { "name": "Rahul Kumar" },
    "visitedAt": "2026-06-10T11:30:00.000Z",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "address": "Outer Ring Road, Bangalore 560103",
    "notes": "Met the MD; promised to transfer by Friday",
    "outcome": "promise_to_pay",
    "createdAt": "2026-06-10T11:31:00.000Z"
  }
]
```

---

### `POST /api/collections/[id]/visits`

Log a new field visit.

**Access:** Authenticated. The visit is recorded for the current user.

**Request body:**
```json
{
  "latitude": 12.9716,
  "longitude": 77.5946,
  "address": "Outer Ring Road, Bangalore 560103",
  "notes": "Met the MD; promised to transfer by Friday",
  "outcome": "promise_to_pay",
  "visitedAt": "2026-06-10T11:30:00.000Z"
}
```

| Field | Required | Notes |
|---|---|---|
| `latitude` | ✅ | Decimal degrees, e.g. 12.9716 |
| `longitude` | ✅ | Decimal degrees, e.g. 77.5946 |
| `address` | optional | If omitted, server may reverse-geocode via Google Maps API |
| `notes` | optional | Free-form visit notes |
| `outcome` | optional | Defaults to `"visited"` |
| `visitedAt` | optional | Defaults to `now()` on the server |

**Response:** `201` with the created `CollectionVisit` row.

---

### `GET /api/finance/visits/map`

Manager-only map data — all visits across the team for a date range.

**Query parameters:**
```
from    YYYY-MM-DD   Start date (inclusive)
to      YYYY-MM-DD   End date (inclusive)
empId   number       (optional) Filter by employee
```

**Response:**
```json
{
  "visits": [
    {
      "id": 1,
      "lat": 12.9716,
      "lng": 77.5946,
      "address": "Outer Ring Road, Bangalore",
      "outcome": "promise_to_pay",
      "employee": "Rahul Kumar",
      "customer": "Infosys Ltd",
      "invoiceNo": "INV-2026-042",
      "invoiceValueLakhs": 12.5,
      "visitedAt": "2026-06-10T11:30:00.000Z"
    }
  ]
}
```

---

## 5. Google Maps API Usage

### 5.1 APIs Required

| API | Purpose | Where used |
|---|---|---|
| **Maps JavaScript API** | Render the manager map view on web | `/accounts` map section |
| **Geocoding API** | Reverse-geocode (lat/lng → address string) | Server-side, when logging a visit |
| **Maps Embed API** | Lightweight map on mobile (iframe) | Mobile visit log confirmation |
| **Places API** | (Future) Customer address autocomplete | Customer master, invoice form |

### 5.2 Billing Considerations

- Reverse Geocoding: **$5 per 1,000 requests**. At ~20 visits/day this is ~$0.10/day.
- Maps JS: free up to 28,500 map loads/month.
- All API calls go through a server-side Next.js route to keep the API key secret.
  Never expose `GOOGLE_MAPS_API_KEY` in client-side code.

### 5.3 Environment Variables

```bash
# Add to .env and production config
GOOGLE_MAPS_API_KEY=your_server_side_key
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=your_map_id   # For web map rendering only
```

The `NEXT_PUBLIC_` prefix is required for the Maps JS API key used in the browser.
Use a **separate restricted key** for server-side Geocoding (no `NEXT_PUBLIC_`).

---

## 6. Mobile Visit Logging Flow

```
CollectionsScreen → overdue invoice row → "Log Visit" button
  │
  └─ CollectionVisitSheet (bottom sheet)
       ├─ Request GPS: navigator.geolocation.getCurrentPosition()
       ├─ Show coordinates (or "Getting location…")
       ├─ Outcome selector: visited / promise / not available / escalation
       ├─ Notes textarea
       └─ Submit → POST /api/collections/[id]/visits
            └─ Server: reverse-geocode lat/lng → store address
            └─ Response: visit row
            └─ Show toast: "Visit logged ✓"
```

**GPS permission handling:**
- If permission denied: show manual address input as fallback.
- If geolocation unavailable (no GPS): allow submitting with `latitude=0, longitude=0`
  and a manual address.

---

## 7. Web Map View (Manager)

Location: New tab on the `/accounts` page — "Field Visits" tab.

**Map component:** Google Maps JS API via `@googlemaps/react-wrapper` or
`@vis.gl/react-google-maps`.

**Features:**
- Date range filter (default: today).
- Employee filter (dropdown).
- Clustered markers — zoom to expand.
- Marker colour by outcome:
  - Green: `promise_to_pay`
  - Blue: `visited`
  - Red: `escalation`
  - Grey: `not_available`
- Click marker → popup: customer name, invoice no, amount, employee, notes.
- Summary bar: total visits, promise-to-pay count, total at-risk amount.

---

## 8. Implementation Checklist

- [ ] Add `CollectionVisit` model to `prisma/schema.prisma`
- [ ] Run `prisma migrate dev --name add_collection_visit`
- [ ] Create `GET/POST /api/collections/[id]/visits` route
- [ ] Create `GET /api/finance/visits/map` route (manager only)
- [ ] Create `CollectionVisitSheet.tsx` (mobile bottom sheet)
- [ ] Add "Log Visit" button to `CollectionsScreen.tsx` overdue rows
- [ ] Integrate Google Maps JS API on `/accounts` for the manager map tab
- [ ] Add `GOOGLE_MAPS_API_KEY` to `.env` and Hostinger environment config
- [ ] Server-side Geocoding helper: `src/lib/geocode.ts`
- [ ] Document the restricted key scopes in Hostinger config notes
