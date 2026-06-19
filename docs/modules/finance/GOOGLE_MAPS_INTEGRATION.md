# Finance Operations Module — Google Maps Integration

> **Status: APPROVED FINAL SCOPE**
> Google Maps is used exclusively for **Local Conveyance** (Feature 10).
> Scope: road distance calculation between GPS start/end points.
> No real-time tracking, no navigation, no route optimisation in scope.

---

## 1. Purpose

When an employee logs a local conveyance trip, Google Maps provides the
accurate road distance between the start and end locations. This distance,
combined with the rate from the employee's HR Expense Policy, auto-calculates
the claim amount — eliminating manual entry and disputes.

---

## 2. APIs Used

| Google Maps API | Purpose | Called from |
|---|---|---|
| **Distance Matrix API** | Calculate road distance (KM) between two GPS coordinates | Server-side (`/api/finance/conveyance/distance`) |
| **Maps JavaScript API** | Location picker map on the web UI conveyance form | Client-side (web only) |
| **Geocoding API** | Reverse-geocode GPS coordinates → human-readable address | Server-side (optional, for display) |

**Not in scope:** Navigation API, Routes API, real-time tracking, Places API.

---

## 3. Environment Variables

```bash
# Server-side only (Distance Matrix + Geocoding)
GOOGLE_MAPS_SERVER_KEY=AIza...

# Client-side (Maps JS API for the web map picker only)
NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=AIza...
```

Use two separate restricted keys:
- **Server key:** restrict to Distance Matrix API and Geocoding API; IP-restricted to the Hostinger server IP.
- **Browser key:** restrict to Maps JavaScript API; HTTP-referrer-restricted to `sales.caveoinfosystems.com`.

Add both to `…/public_html/.builds/config/.env` on Hostinger.
Note: Passenger escapes `%` → `\%` in env injection — if the key contains `%`, strip it in `src/lib/prisma.ts` (same pattern as `DATABASE_URL`). Avoid keys with `%` by regenerating if needed.

---

## 4. Distance Calculation Flow

### Mobile (primary path)

```
Employee opens ConveyanceScreen → taps "Capture Start"
  → navigator.geolocation.getCurrentPosition()
  → { lat: 12.9716, lng: 77.5946 }  (stored in component state)

Employee travels to destination → taps "Capture End"
  → navigator.geolocation.getCurrentPosition()
  → { lat: 12.8399, lng: 77.6770 }

App calls:
  GET /api/finance/conveyance/distance
    ?fromLat=12.9716&fromLng=77.5946
    &toLat=12.8399&toLng=77.6770
    &mode=bike

Server calls Google Distance Matrix API:
  POST https://maps.googleapis.com/maps/api/distancematrix/json
    origins=12.9716,77.5946
    destinations=12.8399,77.6770
    mode=driving       ← use "driving" for both bike and car
    key=GOOGLE_MAPS_SERVER_KEY

Response: { distanceKm: 18.4, durationMinutes: 42 }

App pre-fills distanceKm field.
Employee confirms → amount = 18.4 × ratePerKm (from HR Policy)
```

### Web (optional path — map picker)

On the web conveyance form, a "Pick on Map" button opens a modal with a
Google Maps JS view. Employee clicks the map to set start and end pins.
On confirm, the same `/api/finance/conveyance/distance` endpoint is called.

---

## 5. API Route — Distance Endpoint

### `GET /api/finance/conveyance/distance`

**Query parameters:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `fromLat` | number | ✅ | Decimal degrees |
| `fromLng` | number | ✅ | |
| `toLat` | number | ✅ | |
| `toLng` | number | ✅ | |
| `mode` | string | optional | `bike` / `car` / `auto` / `public`. Defaults to `bike`. All modes map to `driving` in the Maps API (Walking/Transit are not in scope). |

**Response:**
```json
{
  "distanceKm": 18.4,
  "durationMinutes": 42,
  "source": "google_maps"
}
```

**Fallback (when Maps API unavailable or offline):**
- Haversine straight-line distance × 1.25 correction factor.
- Response includes `"source": "haversine_estimate"` so the UI can show a notice.

**Error responses:**
- `400` — missing/invalid coordinates
- `502` — Google Maps API returned an error (logged server-side)

---

## 6. Server-Side Implementation

**File:** `src/lib/finance/google-maps.ts`

```typescript
// Pseudocode — actual implementation goes here

const MAPS_API_KEY = process.env.GOOGLE_MAPS_SERVER_KEY;

export async function getRoadDistanceKm(
  from: { lat: number; lng: number },
  to:   { lat: number; lng: number }
): Promise<{ distanceKm: number; durationMinutes: number; source: string }> {

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json` +
    `?origins=${from.lat},${from.lng}` +
    `&destinations=${to.lat},${to.lng}` +
    `&mode=driving` +
    `&key=${MAPS_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK" || data.rows[0].elements[0].status !== "OK") {
    // Fallback to Haversine
    const km = haversineKm(from, to) * 1.25;
    return { distanceKm: Math.round(km * 10) / 10, durationMinutes: 0, source: "haversine_estimate" };
  }

  const el = data.rows[0].elements[0];
  return {
    distanceKm: Math.round((el.distance.value / 1000) * 10) / 10,
    durationMinutes: Math.round(el.duration.value / 60),
    source: "google_maps",
  };
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}
```

---

## 7. GPS Coordinates Storage

GPS coordinates captured at the time of trip logging are stored on the `ConveyanceLog` row:

| Field | Description |
|---|---|
| `fromLat`, `fromLng` | GPS coordinates of start point |
| `toLat`, `toLng` | GPS coordinates of end point |
| `distanceKm` | Road distance from Maps API (or Haversine fallback) |

Coordinates are optional (nullable) — manual entry without GPS is always allowed.
When coordinates are captured, the reverse-geocoded address is shown in the
`fromLocation` and `toLocation` text fields (pre-filled for confirmation).

---

## 8. Web Map Picker Component

**File:** `src/components/finance/ConveyanceMapPicker.tsx`

Used on the web conveyance form (not mobile — mobile uses GPS buttons).

Dependencies:
- `@googlemaps/react-wrapper` (or `@vis.gl/react-google-maps`)
- `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` environment variable

Behaviour:
1. Shows a Google Map centred on Bangalore by default.
2. Two draggable markers: Start (green) and End (red).
3. On marker placement, calls `/api/finance/conveyance/distance`.
4. Shows route polyline and distance label on the map.
5. "Confirm" button returns `{ fromLat, fromLng, toLat, toLng, distanceKm }` to the parent form.

---

## 9. Billing Estimate

| API | Rate (approx.) | Expected usage | Monthly cost |
|---|---|---|---|
| Distance Matrix API | $5 per 1,000 requests | ~25 trips/day × 22 working days = 550 requests | ~$2.75 |
| Maps JavaScript API | Free up to 28,500 loads/month | Web map picker (~100 uses/month) | Free |
| Geocoding API | $5 per 1,000 requests | Optional; ~100/month | ~$0.50 |

**Total estimated Maps cost: ~$3–4/month.** Well within the Google Maps Platform free tier
for small-scale usage (if a billing account is created with the $200/month free credit).

---

## 10. Implementation Checklist

- [ ] Create a Google Cloud project for Caveo CRM
- [ ] Enable Distance Matrix API, Maps JavaScript API, Geocoding API
- [ ] Generate two restricted API keys (server + browser)
- [ ] Add `GOOGLE_MAPS_SERVER_KEY` and `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` to `.env` and Hostinger `.builds/config/.env`
- [ ] Create `src/lib/finance/google-maps.ts` — `getRoadDistanceKm` + Haversine fallback
- [ ] Create `GET /api/finance/conveyance/distance` route
- [ ] Build `ConveyanceMapPicker.tsx` (web map picker component)
- [ ] Build `ConveyanceScreen.tsx` (mobile GPS capture flow)
- [ ] Test with real GPS coordinates in Bangalore + verify KM matches Maps app
- [ ] Test Haversine fallback by mocking a Maps API failure
- [ ] Document API key in Hostinger config notes (for future devs)
