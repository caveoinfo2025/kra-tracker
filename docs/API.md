# API Reference

REST handlers under `src/app/api/**/route.ts`. **52 routes.** All call `getSession()`
and return JSON.

> **2026-06-04 (Sessions 1 & 2):** **No API routes added/changed.** Role-Adaptive Dashboard
> (`dashboard/page.tsx`) performs a direct Prisma `findUnique` on the server — no new API. Settings
> Hub and AdminClient tab expansion are pure UI (the existing `/api/settings` routes handle the
> additional 16 new keys automatically because `AppSetting` is schema-free key-value). The three
> enterprise UI modules (Expense Categories, Vendor Master, Customer Master) are all mock-data UI.

> **2026-06-04 (Session 1):** **No API routes added/changed this session.** Three enterprise UI modules
> were built — **Expense Categories** (`/finance/expenses/categories`), **Global Vendor Master**
> (`/masters/vendors`), **Global Customer Master** (`/masters/customers`) — all **UI-only on
> mock data** (in each module's `data.ts`). The mock shapes are the contract for future CRUD
> APIs. The Customer Master is a NEW global UI that will be wired to the **existing**
> `/api/customers/master*` routes + `Customer` model (extend, do not duplicate). The legacy
> operational `/customers` page and its live `/api/customers/master`, `/master/[id]`,
> `/master/import`, `/master/deduplicate` routes are **unchanged and still in use**.

> **2026-06-03:** **No API routes added/changed this session.** Finance Phase 2 is UI-only on
> mock data — the finance pages mutate in-memory React state, not the network. Planned finance
> endpoints (when the backend lands) are catalogued in `docs/modules/finance/API_SPECIFICATION.md`
> and the data shapes live in `src/app/finance/**/data.ts`.

## 1. Conventions

### Auth & errors
- **Two layers:** the edge proxy (`src/proxy.ts` → `authConfig.authorized`) returns
  **`401 {"error":"Unauthorized"}`** for any unauthenticated `/api/*` request before the
  handler runs; each handler ALSO calls `getSession()` (defence in depth + ownership).
- Non-managers are scoped to their own `employeeId`; ownership mismatch → **`403 {"error":"Forbidden"}`**.
- Missing record → **`404 {"error":"Not found"}`**. Bad input → **`400 {"error": "..."}`**.
- Manager-only routes (admin) → `403` for non-managers.
- **Public (allowed by the proxy):** `/api/auth/[...nextauth]` (NextAuth) and
  `/api/dev/switch` (dev only; 404 in production).
- **No API surface changed in the SQLite→MariaDB migration** — all routes behave identically;
  only the underlying DB engine/driver changed.

### Formats
- Request/response bodies are JSON. **Money fields are numbers in ₹ Lakhs.**
- Dates are ISO strings in/out.
- List endpoints commonly accept `?q=` (search), filter params, and pagination
  (`page`, `pageSize`) where applicable; they return arrays or `{ items, total }`.
- Mutations validate required fields server-side and look up the record's `employeeId`
  to enforce ownership before writing.

## 2. Endpoints by domain

### Auth & dev
| Route | Methods | Purpose |
|---|---|---|
| `/api/auth/[...nextauth]` | (NextAuth) | OAuth sign-in/out + callbacks |
| `/api/dev/switch` | POST | Dev-only: set `dev_employee_id` impersonation cookie |

### Admin (manager-only)
| Route | Methods | Purpose / body |
|---|---|---|
| `/api/admin/settings` | GET, POST | GET all settings (defaults merged); POST `{updates:{key:value}}` bulk upsert |
| `/api/admin/roles` | GET, POST | List roles (+employee counts, seeds defaults); POST create role |
| `/api/admin/roles/[id]` | GET, PATCH, DELETE | Detail; PATCH meta + `pageAccess[]`; DELETE (non-system only) |

### Pipeline / CRM
| Route | Methods | Purpose |
|---|---|---|
| `/api/pipeline/leads` | GET, POST | List (`q`, filters, pagination) / create lead |
| `/api/pipeline/leads/[id]` | GET, PUT, PATCH, DELETE | Detail / full update / partial (mobile) / delete |
| `/api/pipeline/leads/[id]/stage` | PATCH | Move stage; auto-creates opportunity at PROPOSAL_SENT |
| `/api/pipeline/leads/[id]/activity` | GET, POST | Lead activity feed; POST logs a call/note/meeting (meetings also create a `CrmMeeting`) |
| `/api/pipeline/opportunities` | GET | List opportunities |
| `/api/pipeline/opportunities/[id]` | GET, PATCH | Detail / update stage |
| `/api/pipeline/tasks` | GET, POST | List / create task |
| `/api/pipeline/tasks/[id]` | PATCH, DELETE | Update (complete) / delete |
| `/api/pipeline/meetings` | GET, POST | Schedule/list meetings; POST assigns to self or another (e.g. presales) and notifies the assignee |
| `/api/pipeline/notes` `/[id]` | POST / DELETE | Add / delete note |
| `/api/pipeline/analytics` | GET | Pipeline analytics (manager) |
| `/api/pipeline/crm-data` | GET | External CRM master data |

### Activity sheets & KRAs
| Route | Methods | Purpose |
|---|---|---|
| `/api/lead-generation` `/[id]` | GET,POST / PUT,DELETE | Lead-gen rows |
| `/api/sales-funnel` `/[id]` | GET,POST / PUT,DELETE | Funnel rows (PO date enforced for Closed Won) |
| `/api/daily-updates` `/[id]` | GET,POST / PUT,DELETE | Daily updates |
| `/api/kras/me` | GET | Current user's KRAs + live progress |
| `/api/kras/[id]` | GET, PUT, DELETE | Single KRA |
| `/api/employees/[id]/kras` | GET, POST | Employee KRAs (manager) |
| `/api/employees/[id]/reviews` | GET, POST | Weekly reviews |
| `/api/reviews/[id]` | PUT, DELETE | Edit/delete review |
| `/api/weekly-commits` `/[id]` | GET,POST / PUT,DELETE | Weekly commits |
| `/api/certifications` `/[id]` `/[id]/approve` | GET,POST / PUT,DELETE / PUT | Certs + approval |
| `/api/kra-sync` | POST | Recompute/sync KRA progress |

### Finance
| Route | Methods | Purpose |
|---|---|---|
| `/api/collections` `/[id]` | GET,POST,DELETE / PUT,DELETE | Invoices/collections |
| `/api/payments` | GET, POST | Ledger; POST records a payment (+notifications, re-sync) |
| `/api/payments/today` | GET | Today's total + recent list |
| `/api/advances` | GET, POST | Order advances |
| `/api/advances/[id]/apply` | POST | Apply advance → creates Payment, marks applied |

> **Finance Operations Module — Phase 1 added NO API** (2026-06-02). The 10 new finance tables
> (`FinAccount`, `Ledger`, `Vendor`, `Expense`, `Voucher`, `VoucherSequence`,
> `EmployeeAdvance`, `TravelClaim`, `ApprovalRule`, `AuditLog`) are database-only. The full
> planned endpoint set lives in `docs/modules/finance/API_SPECIFICATION.md` and is built from
> **Phase 2** onward (`/api/finance/*`). Route count (52) is unchanged this session.

### Customers & employees
| Route | Methods | Purpose |
|---|---|---|
| `/api/customers/master` `/[id]` | GET,POST / PATCH,DELETE | Customer master CRUD |
| `/api/customers/master/import` | POST | Import/dedupe from CRM |
| `/api/customers/master/deduplicate` | GET, POST | Find / merge duplicates |
| `/api/customers/suggestions` | GET | Autocomplete `?q=` across CRM name sources |
| `/api/employees` `/[id]` | GET,POST / GET,PUT,DELETE | Employee CRUD (manager). PUT accepts `reportsToId` (org hierarchy, self-cycle-guarded) + `isManager` |
| `/api/import` | POST | Bulk CSV/XLSX import |

### Misc
| Route | Methods | Purpose |
|---|---|---|
| `/api/notifications` | GET, PATCH | List / mark read |
| `/api/ocr/business-card` | POST | OCR a card → parsed lead fields |
| `/api/mobile/team` | GET | Team data for the mobile app |

## 3. Validation notes
- **Sales funnel PUT/POST:** rejects Closed Won without a PO date (`400`).
- **Payments POST:** amount in ₹L; triggers `syncCollectionTotals()` + opening-balance
  reconciliation so partials add rather than overwrite.
- **Advances apply:** rejects already-applied advances.
- **Roles DELETE:** rejects `isSystem` roles.
- **Ownership:** `[id]` mutation routes fetch the row's `employeeId` and `403` on mismatch
  for non-managers (finance roles may see all collections/payments via `roles.ts`).
- **Finance scope** (collections, payments, advances, `payments/today`): gated by
  `canSeeAllCollections` / `canManagePayments` from `src/lib/roles.ts` — includes managers,
  Accounts, and Operations Head. `GET /api/payments/today` auto-scopes: privileged roles see
  company-wide, reps see only their own (`?scope=mine` forces own-only).
- Always prefer `getSession()` over `auth()` so dev impersonation works.
