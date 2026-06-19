# UI Component Library

> Companion to `DESIGN_SYSTEM.md` (tokens). This catalogs the actual components and how
> to use them.

> **2026-06-02:** **Mobile finance screens added** (`5ba865a`) — a new
> `src/app/mobile/screens/CollectionsScreen.tsx` (read-only invoices with overdue alerts +
> Open/Overdue/All segments), a **Leads | Opportunities** segment in `PipelineScreen`, and
> collections KPIs + overdue alert + "Collections" action chip on `TodayScreen`. New `MIcon`
> glyphs: `wallet`, `funnel`, `receipt`, `opp`, `bar-chart`. The mobile app is now **13
> screens**. Desktop component catalog below is unchanged. **Finance Operations Module Phase 1
> was database-only — no UI components** (finance UI starts in Phase 2; spec in
> `docs/modules/finance/UI_REQUIREMENTS.md` + `MOBILE_REQUIREMENTS.md`).
> Debt: `public/maintenance.html` is still **orphaned** (its `middleware.ts` was removed for the
> Next 16 `proxy.ts` conflict) — wire it into `proxy.ts` or delete it.

## Design language
Clean enterprise SaaS: white surfaces on a light grey app background, a **single brand-red
accent (`#C8102E`)**, generous radius (8–16px cards), subtle shadows, Inter/Space Grotesk
type. Information-dense but calm — KPI tiles, cards, and tables dominate.

> ⚠️ **Two styling conventions coexist** (be consistent with the file you're editing):
> - **Layout/dashboard shell** (`Navbar`, `Topbar`, `.kpi`, `.card`, sidebar) → custom
>   classes + CSS variables from `globals.css`.
> - **Atomic components** (`Badge`, `ProgressBar`, `SheetLayout`, pipeline badges) →
>   **Tailwind utility classes** (`bg-green-100`, `text-gray-900`, …).
>   When adding to these, match Tailwind; don't introduce token classes mid-file.

## Colors (quick ref — full list in DESIGN_SYSTEM.md)
- **Accent:** `--caveo-red #C8102E` (hover `#B00C27`, pressed `#8E0A1F`, tint `#FDECEF`).
- **Status:** success `#1F9D55`, warning/`ot-orange` `#FF6B00`, danger `#C8102E`, info/`infra-blue` `#0066FF`.
- **Surfaces:** bg `#F7F8FA`, elevated `#FFFFFF`, muted `#EEF0F3`.
- **Text:** `--fg-1 #0F1115` → `--fg-4 #9AA3AD`. **Borders:** `--border #E3E6EB`.
- Tailwind components approximate these with `green/yellow/red/blue/gray-100..800`.

## Components created

### Shared (`src/components/`)
| Component | Props | Notes |
|---|---|---|
| `Navbar` | (server, none) | Reads live `isManager`+`role` from DB; renders role-aware sidebar + sign-out (clears dev cookie). |
| `Topbar` | (none) | Breadcrumb + search + dashboard period filter (Today/Week/Month/Quarter via `?period=`). |
| `SidebarLinks` | nav config | Active-route highlighting; finance nav for Accounts/Ops Head. |
| `DevBar` | (dev only) | Impersonate any employee → sets `dev_employee_id`. |
| `Badge` | `{ label, variant?: success\|warning\|danger\|info\|neutral }` | Pill; Tailwind colors. |
| `ProgressBar` | `{ value, max=100 }` | Auto color: ≥80 green, ≥50 yellow, else red. |
| `SheetLayout` | `{ title, description, action?, children }` | Standard page header + body wrapper for sheet/table pages. |
| `CustomerNameCombobox` | `{ value, onChange, ... }` | Autocomplete from `/api/customers/suggestions`; portal dropdown (escapes overflow). |
| `PaymentsTodayWidget` | dashboard widget | Today's collections total + recent payments. |

### Pipeline (`src/components/pipeline/`)
| Component | Purpose |
|---|---|
| `KanbanBoard` | Columns per stage with draggable cards. |
| `LeadCard` / `OpportunityCard` | Compact entity cards for the board. |
| `LeadStageBadge` / `OppStageBadge` (`StageBadge.tsx`) | Colored stage pills from `@/types/pipeline` label/color maps. |
| `ActivityFeed` | Renders `CrmActivity` timeline. |
| `CrmSelect` | `{ type: categories\|oems\|products\|customers, value, name, onChange(id,name), oemId?, placeholder?, disabled? }` — debounced search dropdown over `/api/pipeline/crm-data`. |

### Admin (`src/app/admin/`)
- `AdminClient` — 10-tab config panel (Pipeline, Sales Funnel, Collections, Lead Gen,
  Tasks, Daily Updates, CRM Master, KRA Weights, KRA Targets, System).
- `RolesClient` — role list + permission matrix (View/Create/Edit/Delete toggles per page).

### Team / Employee (`src/app/employees/`)
- `EditEmployeeForm` — name/email/department/**role (free-text)** + **`Reports To`** picker
  (org hierarchy, self-cycle-guarded) + **`Manager access`** toggle (`isManager`). This is
  how Operations Head / reporting lines are configured in the UI. `LeadDetailClient` adds
  Edit-lead, Schedule-Meeting (with assignee + presales group), and a POC/Demo-→-presales
  prompt (creates a meeting **and** a task on entering the `POC_DEMO` stage).

## Usage rules
- **Reuse before building.** A header → `SheetLayout`; a status pill → `Badge`/`StageBadge`;
  a progress meter → `ProgressBar`; a customer field → `CustomerNameCombobox`; a CRM
  reference field → `CrmSelect`.
- Don't hardcode hex in layout/dashboard code — use CSS variables. In Tailwind-based atomic
  components, use the existing utility palette.
- Money displayed via `fmt`/`fmtShort` (`₹X.XL` / `₹X.XCr`).
- Admin panel stays **data-free** (config/rules only).

## Layout patterns
- **App shell:** fixed sidebar + `main-col` (Topbar + scrollable `page-body`).
- **Dashboard:** `.kpi-grid` of `.kpi`/`.kpi-link` tiles → cards/charts; manager vs
  employee variants.
- **Sheet pages:** `SheetLayout` header (title + description + action) over a table.
- **Pipeline:** kanban ↔ table toggle.
- **Mobile:** full-screen `.m-*` overlay (`position:fixed; inset:0; z-index:9000`) with
  bottom tab nav (13 screens, incl. `CollectionsScreen`).

## Icons
- **lucide-react** throughout. Common: `LogOut`, `Search`, `Plus`, `Trash2`, `Save`,
  `Shield`, `Users`, `ChevronUp/Down`, `Lock`, `AlertTriangle`. Default stroke ~1.5–1.6,
  size 13–20px. Keep icon usage consistent with neighbors.

## Tables
- Plain semantic `<table>` with Tailwind classes (`px-4 py-3`, header row in muted text,
  `border-b` rows). Right-align numeric/money columns (`.num`). Status cells use `Badge`/
  `StageBadge`. Row actions (edit/delete) live in a trailing cell. Bulk-select where the
  sheet supports bulk delete (e.g. collections).

## Forms
- Inputs: `border rounded-lg px-3 py-2 text-sm`, focus ring in `--caveo-red` (token-based)
  or Tailwind `focus:ring-[#C8102E]` in atomic components.
- Required fields marked with `*` in the label; validation errors shown inline / via toast.
- Money inputs are numeric in **₹ Lakhs**. Date inputs are native `type="date"`.
- Customer/company fields use `CustomerNameCombobox`; CRM category/OEM/product/customer
  fields use `CrmSelect`. Modals use a centered card with overflow-safe portal dropdowns.
- Submit buttons: brand-red primary; secondary/cancel in neutral grey.
