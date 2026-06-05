# UI Component Library

> Companion to `DESIGN_SYSTEM.md` (tokens). This catalogs the actual components and how
> to use them.

> **2026-06-05 — Phase 6 & 7 Settings Components:**
>
> **Workflow Engine (`src/app/settings/workflow/`):**
> - `WorkflowCenter` — 5-tab shell (Workflows|Designer|Delegation|Escalation|Audit). No Overview tab (removed duplicate). Props: `canEdit, engineCaps: {isManager, isOpsHead, currentUser}`.
> - `WorkflowRulePanel` — live workflow list with search/filter toolbar, 3 KPI summary cards, sortable table with human-readable Module/Trigger labels. Clicking a row opens `WorkflowDesigner` in edit mode.
> - `WorkflowDesigner` — 2-step form (Details → Approval Steps). Empty state with "New Workflow" CTA. **Uses inline styles only** (no CSS class dependency). Props: `canEdit, workflow?, onSaved?, onCancel?`.
> - `TriggerSelector` — module + trigger dropdowns with human-readable labels. **Uses inline styles only.** Maps SCREAMING_SNAKE_CASE event codes to readable text.
> - `ApprovalStepBuilder` — numbered step cards. Add/remove/reorder steps. Each step has `ApproverSelector` + mode/timeout/flags.
> - `ApproverSelector` — 5-type radio cards: USER|ROLE|REPORTING_MANAGER|DEPARTMENT_HEAD|POLICY_BASED.
> - `DelegationManager` — delegation list + create form (from/to employee, date range, module scope).
> - `EscalationManager` — escalation rule list + create form (after hours, action type, escalatee).
> - `WorkflowAudit` — audit log table with search + action filter.
>
> **Master Data (`src/app/settings/masters/`):**
> - `MasterDataClient` — 8-tab shell. Props: `canEdit, currentUserId`.
> - `MasterDashboard` — stat cards (categories/definitions/values/overrides counts) + architecture explainer.
> - `MasterCategoryList` — category table + inline create form.
> - `MasterValueManager` — definition picker → values table + add form.
> - `OverrideManager` — company/branch override table + upsert form.
> - `CustomerGovernance` — customer policy edit panel (GST/PAN/duplicate threshold/credit approval).
> - `VendorGovernance` — vendor policy edit panel (GST/PAN/bank verification/approval required).
> - `ValidationRules` — per-definition validation rule list + create form with optional Policy Engine integration.
> - `MasterAudit` — audit log with text filter.
>
> **Settings Page (`src/app/settings/AdminConsole.tsx`):**
> - Simple 6-item list: Organization, Identity & Access, Workflow Engine, Master Data, Policy Engine, Performance. Each item is a `<Link>` with icon, label, description, hover effect.
> - No search, no stats, no recent changes — intentionally minimal.

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

> **2026-06-04 Session 2 — Role-Adaptive Dashboard + Settings Hub:**
> **`DashboardClient.tsx`** now accepts `roleVariant?: "manager" | "opsHead" | "techHead" |
> "employee"`. Uses `showSales` + `showTeam` flags to conditionally render sales funnel, pipeline
> chart, pipeline KPI tiles, approvals panel. Pattern: pass a discriminator string → derive flags →
> gate sections — avoid adding boolean props for each role.
> **`SettingsHub.tsx`** is now a 26-card navigation grid across 7 sections. Cards are defined in a
> `CARDS` array with `{href, icon, label, description, section, badge?}`. Sections auto-derive with
> `[...new Set(CARDS.map(c => c.section))]`. All hover effects use `onMouseEnter/Leave` inline.
> **`AdminClient.tsx`** has 14 tabs including 3 new ones: Finance Ops (`Receipt` icon), Approvals
> (`ClipboardCheck`), Masters (`BookUser`). Settings render dynamically from `getSetting` for all
> keys — no component change needed when adding new `AppSetting` keys.

> **2026-06-04 Session 1 — Expense Categories + Global Masters (UI-only, MOCK).** Three modules added:
> **Expense Categories** (`/finance/expenses/categories`) — `ExpenseCategoriesClient` +
> `CategoryTable`, `CategoryFilters`, `CategoryForm` (9 config sections A–I), `CategoryDrawer`,
> `CategoryTemplateLoader` (+ `data.ts` with 30 mock categories, parent/sub hierarchy).
> **Global Vendor Master** (`/masters/vendors`) — `VendorMasterClient` + `VendorTable`,
> `VendorFilters`, `VendorForm`, `VendorProfile` (9-tab drawer), `VendorBranchManager`,
> `VendorContactManager`, `VendorBankManager`, `VendorDocumentPanel`, `VendorUsageViewer`,
> **`GSTRegistrationPanel`** (+ `GSTINBadge`) — a reusable GSTIN validator with state-code
> cross-check. **Global Customer Master** (`/masters/customers`) — `CustomerMasterClient` +
> `CustomerTable`, `CustomerFilters`, `CustomerForm` (with duplicate detection),
> `CustomerProfile` (12-tab drawer), `CustomerSiteManager`, `CustomerContactManager`,
> `CustomerGSTPanel`, `CustomerHierarchyViewer`, `CustomerAssetPanel`,
> `CustomerProfitabilityPanel`, `CustomerDocumentPanel`, `CustomerTimeline`,
> `CustomerRelationshipViewer`. **Reuse highlights:** Customer Master imports the GST
> validator/panel/badge from Vendor Master; both masters reuse `ExpenseSummaryCard` (Finance)
> for KPI tiles. **Reusable patterns:** wide tabbed profile drawer, inline sub-entity manager
> (card + inline form + set-primary), custom toggle switch, GSTIN validator field. Sidebar
> gained a **Masters** section (Customer Master + Vendor Master) across all role groups.

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

### Finance — Phase 2 UI (`src/app/finance/`) — 2026-06-03 (UI-only, MOCK data)
Built to the desktop design system (`globals.css` tokens + `.crm-table`, `.kpi`, `.card`,
`.btn-cav`, `.badge-*`, `.detail-pane`, `.seg-control`). Each module has a co-located
`data.ts` (types + mock + helpers + `deriveCaps`). **Cash Book & Expense Register reuse Bank
Book components** to stay identical — reuse Bank Book parts before building new finance UI.

| Module | Client + key components |
|---|---|
| **Dashboard** (`/finance`) | `FinanceDashboardClient` — 8 KPI tiles, inline-SVG charts (bar/donut/cash-flow), quick actions, filters |
| **Bank Book** (`/finance/bank-book`) | `BankBookClient` + `BankBalanceCard`, `BankFilters`, `BankTransactionTable`, `BankTransactionDrawer`, `BankSummaryPanel`, `BankStatementUpload`, `BankImportPreviewTable`, `BankImportHistoryTable`, `BankImportWizard` |
| **Cash Book** (`/finance/cash-book`) | `CashBookClient` + `CashBalanceCard` (re-exports `BankBalanceCard`), `CashFilters`, `CashTransactionTable`, `CashTransactionDrawer`, `CashSummaryPanel`, `CashReconciliationPanel`, `CashTransferPanel`, `CashVoucherPanel` |
| **Expense Register** (`/finance/expenses`) | `ExpenseRegisterClient` + `ExpenseSummaryCard`, `ExpenseFilters`, `ExpenseTable`, `ExpenseForm`, `ExpenseDetailsDrawer`, `ExpenseApprovalTimeline`, `ExpenseAttachmentViewer`, `GSTInputSection`, `VoucherPreviewPanel`, `CustomerExpensePanel`, `EmployeeClaimPanel` |
| **Shared** | `_shared/transferStore.ts` (cross-module Bank↔Cash paired entries, in-memory) |

**Patterns established this session (reuse these):**
- **Collapsible top filter bar** — `BankFilters`/`CashFilters`/`ExpenseFilters` render a
  clickable `card-header` button ("Filters" + active-count `badge-accent` + chevron); body
  shown only when expanded; collapsed by default; placed **above** the KPI/balance cards.
- **Balance/summary KPI card** — `BankBalanceCard` (label, value, tone credit/debit, accent,
  sub). The single reusable money tile across all finance modules.
- **Ledger table** — `.crm-table` with search + sort + pagination + column-visibility +
  (bulk-select where applicable) + row-click drawer; row highlight for imported/adjusted/reversed.
- **Slide-in drawer** — `.detail-overlay` + `.detail-pane`; entry forms and detail views.
- **RBAC capability object** — `deriveCaps`/`deriveExpenseCaps` from `roles.ts` predicates;
  buttons/actions gate on `caps.canAdd/canApprove/canEdit/...`.

> **Mobile (2026-06-03):** added `ExpenseClaimScreen` + `ConveyanceScreen` (now **15 screens**),
> new `MIcon` glyphs `camera/car/pin/route/rupee`, Finance section in `MeScreen`, and
> Log-Expense/Log-Conveyance in the `QuickLogSheet` FAB. All `.m-*` classes; no Google API.

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
