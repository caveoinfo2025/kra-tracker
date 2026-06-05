# Design System

Defined as CSS custom properties in `src/app/globals.css` (`:root`). Tailwind v4 is
present but most styling uses these tokens + hand-written component classes.
**Reuse tokens — never hardcode hex values in components.**

> **2026-06-05 — CSS utility aliases added to `globals.css`:**
>
> **Token aliases** (for settings module compatibility):
> - `--primary` = `--accent` (#C8102E)
> - `--foreground` = `--fg-1`
> - `--muted-foreground` = `--fg-3`
> - `--card` = `--bg-elev`
> - `--background` = `--bg-elev`
>
> **New utility classes:**
> - `.btn` — base button (inline-flex, h:34px, font-sans, cursor:pointer)
> - `.btn-primary` — red accent background + white text
> - `.btn-secondary` — elevated bg + border + fg-1 text
> - `.btn-ghost` — transparent bg + fg-2 text
> - `.btn-sm` — h:28px, smaller padding
> - `.btn-danger` — #ef4444 background
> - `.input` — block, full-width, border, bg-elev, fg-1, border-radius:7px
> - `.form-label` — 12px bold fg-2, display:block
> - `.form-hint` — 11px fg-4, margin-top:4px
>
> **Inline style pattern (preferred for new settings components):**
> After encountering CSS class resolution issues (PowerShell BOM corruption, Turbopack caching),
> all Phase 6/7 settings components use inline styles with design token vars directly:
> ```tsx
> const input: CSSProperties = {
>   padding: "9px 12px", border: "1px solid var(--border)",
>   background: "var(--bg-elev)", color: "var(--fg-1)",
>   borderRadius: 7, fontSize: 13, boxSizing: "border-box",
> };
> ```
> Use `var(--caveo-red)` for primary actions, `var(--fg-1/2/3/4)` for text hierarchy,
> `var(--bg-elev/muted)` for backgrounds, `var(--border/border-strong)` for borders.

> **2026-06-04 Session 2:** **no token/theme changes.** Settings Hub 26-card grid and AdminClient
> 14-tab expansion reuse existing tokens and component classes. Dashboard role-adaptive sections
> reuse `.kpi`, `.card`, `.crm-table`. The `roleVariant` discriminator adds no visual tokens —
> it only controls which existing sections render.

> **2026-06-04 Session 1:** **no token/theme changes.** Expense Categories + Global Vendor/Customer Masters
> reuse existing tokens and component classes. Two **enterprise master-data patterns** established
> (reuse for any future master): **(1) tabbed profile drawer** — a wide `.detail-pane`
> (`min(840px,96vw)`) with a horizontal scrollable tab bar (active tab = `--caveo-red` underline)
> over a scrollable `.dp-body`, footer actions pinned; used by `VendorProfile` (9 tabs) and
> `CustomerProfile` (12 tabs). **(2) inline sub-entity managers** — card list + inline add/edit
> form + set-primary star, for branches/sites/contacts/banks (`VendorBranchManager`,
> `CustomerSiteManager`, etc.). Also: a reusable **toggle switch** (custom 36×20 pill) and a
> **GSTIN validator field** with green/orange/red inline feedback (`GSTRegistrationPanel`). Money
> on these screens is ₹ rupees (`fmtINR`). Same collapsible top filter bar as the finance pages.

> **2026-06-03:** **no token/theme changes.** Finance Phase 2 UI reuses existing tokens +
> component classes (`.kpi`, `.card`, `.crm-table`, `.btn-cav`, `.badge-*`, `.detail-pane`,
> `.seg-control`). New repeatable pattern: **collapsible top filter bar** — a `card-header`
> rendered as a toggle button (Filter icon + "Filters" + active-count `badge-accent` + chevron),
> body shown only when expanded, collapsed by default, positioned above the KPI strip. Note:
> finance web pages render money in **₹ rupees** (petty-cash realism) rather than the app-wide
> ₹ Lakhs — a deliberate, temporary divergence until backend wiring normalises it.

> **2026-06-02:** **no token/theme changes** this session. New mobile finance screens
> (`CollectionsScreen`, Pipeline Opportunities segment, Today collections KPIs — `5ba865a`)
> reuse the existing `.m-*` mobile classes and tokens (no new design primitives). Finance
> Operations Module Phase 1 was database-only (no UI). Tokens/patterns below are current.
> The orphaned `public/maintenance.html` splash still uses brand red `#C8102E` on `#0F1115`
> inline — migrate it onto these tokens if kept, otherwise delete it.

## 1. Colors

### Brand
| Token | Value | Use |
|---|---|---|
| `--caveo-red` | `#C8102E` | Primary brand / accent / danger |
| `--caveo-red-600` | `#B00C27` | Hover |
| `--caveo-red-700` | `#8E0A1F` | Pressed |
| `--caveo-red-50` | `#FDECEF` | Tint / selected-row bg |
| `--cyber-black` | `#0F1115` | Darkest text / dark surfaces |
| `--graphite` / `-2` | `#2B2F36` / `#3A3F48` | Dark UI |
| `--cloud-white` / `-2` | `#F7F8FA` / `#EEF0F3` | App background |
| `--steel-silver` / `-2` | `#9AA3AD` / `#C8CDD3` | Muted text / borders |
| `--infra-blue` (+`-50`) | `#0066FF` / `#E6F0FF` | Info / charts |
| `--ot-orange` (+`-50`) | `#FF6B00` / `#FFF1E6` | Warning / pipeline charts |

### Semantic
- **Status:** `--success #1F9D55` · `--warning #FF6B00` · `--danger #C8102E` · `--info #0066FF`
- **Backgrounds:** `--bg #F7F8FA` · `--bg-elev #FFFFFF` · `--bg-muted #EEF0F3` · `--surface` · `--surface-alt #FAFBFC`
- **Foreground:** `--fg-1 #0F1115` · `--fg-2 #2B2F36` · `--fg-3 #5B626C` · `--fg-4 #9AA3AD` · `--fg-inverse #FFFFFF`
- **Borders:** `--border #E3E6EB` · `--border-strong #C8CDD3` · `--border-subtle #EEF0F3`
- **Accent:** `--accent #C8102E` · `--accent-hover #B00C27` · `--accent-pressed #8E0A1F` · `--on-accent #FFFFFF`
- **Focus ring:** `0 0 0 3px rgba(0,102,255,.35)`

## 2. Typography
- `--font-display` "Space Grotesk" → Inter (headings)
- `--font-sans` "Inter" (body)
- `--font-mono` "JetBrains Mono" (codes, setting keys)

## 3. Scales
- **Space:** `--space-1..16` = 4,8,12,16,20,24,32,40,48,64 px
- **Radius:** `xs 2 · sm 4 · md 8 · lg 12 · xl 16 · 2xl 24 · pill 999`
- **Shadow:** `--shadow-xs/sm/md/lg`
- **Motion:** `--ease-out cubic-bezier(.22,1,.36,1)`, `--ease-in-out`;
  `--duration-fast 120ms / base 200ms / slow 320ms`

## 4. Layouts
- **App shell** (`.app-shell`): fixed left **sidebar** (`Navbar` → `SidebarLinks`) +
  main column (`.main-col` → `Topbar` + scrollable `.main-content` / `.page-body`).
- **Sidebar** is role-aware: managers get full nav + Admin link; Accounts/Operations Head
  get the finance-focused nav (`usesFinanceNav` in `roles.ts`).
- **Topbar:** breadcrumb (`.tb-crumbs`) + search (`.tb-search`) + dashboard period filter
  (`.tb-period` — Today/Week/Month/Quarter).
- **Dashboard:** KPI strip (`.kpi-grid` of `.kpi` tiles, some `.kpi-link` clickable) above
  cards/charts; manager vs employee variants.
- **Sheet/table pages** (collections, lead-gen, etc.): `SheetLayout` with toolbar + table.
- **Pipeline:** `KanbanBoard` (columns per stage) ↔ table toggle.
- **Mobile** (`/mobile`): full-screen overlay, `position: fixed; inset:0; z-index:9000`,
  styled with `.m-*` classes in `mobile.css`; bottom tab nav across 13 screens.
- **Login:** centered card; dev quick-login list appears only in development.

## 5. UI Components
**Shared (`src/components/`):** `Navbar` (server, role-aware), `Topbar`, `SidebarLinks`,
`DevBar` (dev impersonation), `Badge`, `ProgressBar`, `SheetLayout`,
`CustomerNameCombobox` (autocomplete, portal dropdown), `PaymentsTodayWidget`.
**Pipeline (`src/components/pipeline/`):** `KanbanBoard`, `LeadCard`, `OpportunityCard`,
`ActivityFeed`, `CrmSelect`, `StageBadge`.
**Admin (`src/app/admin/`):** `AdminClient` (10 config tabs), `RolesClient` (role list +
View/Create/Edit/Delete permission matrix).

### Reusable classes (globals.css)
`.kpi`, `.kpi-grid`, `.kpi-accent`, `.kpi-link`, `.kpi-label`, `.kpi-value`,
`.kpi-delta.up/.down` · `.card`, `.card-body` · `.sidebar*`, `.nav-link.is-active` ·
`.topbar`, `.tb-crumbs`, `.tb-search`, `.tb-period` · `.badge-danger/-warning/-neutral` ·
`.page-eyebrow`.

## 6. Styling Rules
- Single accent: brand red `#C8102E`. Positive deltas use `--success` green; negative use red.
- Money rendered `₹X.XL` / `₹X.XCr` (1 Cr = 100 L) via `fmt` / `fmtShort`.
- Prefer CSS variables + existing component classes over inline hex or new Tailwind utilities.
- Keep the **admin panel data-free** — configuration/rules only, never CRM records.
- Respect spacing/radius tokens; don't introduce new arbitrary values.
- Mobile styles stay scoped under `.m-*`; don't leak them into the desktop shell.
