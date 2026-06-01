# Changelog

Reverse-chronological log of notable changes. **Update at the end of every session.**
Dates from git history (branch `master`).

## Current State
- All core modules live in production on `master` / `sales.caveoinfosystems.com`:
  auth, pipeline (leads/opportunities/tasks/meetings/notes), KRA engine + reviews/commits/
  certifications, collections + payments + advances + notifications, customer master,
  manager & employee dashboards (period filter + clickable KPIs), admin panel
  (settings + RBAC), mobile app (incl. business-card OCR), bulk import, org hierarchy.
- **Database is now MySQL/MariaDB** (Hostinger MariaDB 11.8), migrated from SQLite.
  Prisma uses the `@prisma/adapter-mariadb` driver adapter. Production verified live.
- **Working tree:** clean; documentation refreshed this session.
- **Latest commit:** `7d6500a` — strip Passenger backslash-escaping from DATABASE_URL.
- **Open production caveat:** users whose JWT was minted by the *old* `auth.ts` (before
  `1ab4f7d`) need **one** sign-out + sign-in to pick up live role; afterwards role changes
  apply automatically.

## Next Actions
1. **Post-MySQL smoke test on production:** log in via Microsoft and spot-check dashboard
   totals, record a test payment, create a test lead, open the notifications feed — confirm
   reads + writes against MariaDB. Keep the SQLite `db/prod.db` backup for ~2 weeks before deleting.
2. **Rotate credentials** shared in chat (SSH `u686730471`, MySQL `u686730471_caveoadmincrm`).
   Delete the local `scripts/ssh-*.mjs`, `scripts/server-migrate.cjs`, `scripts/*conn*.cjs`,
   `scripts/test-*.cjs`, `scripts/commitmsg.txt` — they contain plaintext passwords and are
   untracked (never commit them).
3. Have Priyadharshini (Accounts) and Deepak (Operations Head) **log out + back in once** on
   production (stale-JWT role fix from `1ab4f7d`); set Deepak's role + `Reports To` on Team page.
4. Decide the authoritative RBAC path (DB `hasPermission` vs `roles.ts`) and enforce
   `RolePageAccess` at the route/page layer.
5. Wire the Topbar global search to real results.
6. Address the `xlsx@0.18.5` advisory (replace or sandbox imports).
7. Surface the notifications feed on desktop.

---

## 2026-06-02 — SQLite → MySQL/MariaDB migration
- **Migrated the live production database from SQLite to Hostinger MariaDB 11.8** with zero
  data loss (all 22 tables, row counts verified identical). Process:
  - Switched Prisma datasource `provider` to `mysql`; URL now lives in `prisma.config.ts`
    only (Prisma 7 forbids `url` in `schema.prisma`).
  - Added `@db.Text` to all long-text fields (KRA, WeeklyReview, DailyUpdate, CrmActivity,
    CrmNote, AppSetting.value, etc.) to avoid MySQL's `VARCHAR(191)` truncation.
  - Added 18 indexes on FK / filter columns (Payment.collectionId, Collection.employeeId,
    SalesFunnel.stage+status, CrmLead.assignedToId, etc.).
  - Replaced the SQLite adapter with `@prisma/adapter-mariadb` (+ `mariadb` driver). Prisma 7's
    `prisma-client` generator has no binary engine — a driver adapter is **mandatory**.
    `src/lib/prisma.ts` builds the adapter from `DATABASE_URL`.
  - Data copied on the server (better-sqlite3 read → `mysql` CLI load), AUTO_INCREMENT
    counters reset to `MAX(id)+1`, `_prisma_migrations` baselined so `migrate deploy` is a no-op.
  - Single baseline migration `prisma/migrations/20260601000000_init_mysql`; old SQLite
    migrations removed; `migration_lock.toml` provider → `mysql`.
- **Gotchas hit & fixed (all resolved):**
  - Prisma connects over TCP — use `127.0.0.1`, not `localhost` (which the driver maps to a
    unix socket). Hostinger user grant covers `@127.0.0.1`.
  - Removed `src/middleware.ts` — Next.js 16 uses `src/proxy.ts`; the two cannot coexist.
  - **Hostinger/Passenger escapes `%` → `\%` when injecting env vars**, corrupting the
    URL-encoded DB password (`Crm%40…` → `Crm\%40…`). `prisma.ts` now strips stray
    backslash-escapes before parsing `DATABASE_URL` (and accepts `DB_*` vars as override).
- Files: `prisma/schema.prisma`, `prisma.config.ts`, `src/lib/prisma.ts`, `package.json`,
  `prisma/migrations/20260601000000_init_mysql/`. Commits `59c34d5`→`7d6500a`.

## 2026-06-02 — earlier
- **Fix — Operations Head / Accounts access (root cause: stale JWT role).** Two production
  symptoms — Priyadharshini's Billing & Collections page empty (incl. no "Record Payment"
  button) and Deepak unable to see collections/payment tracker — traced to one cause: the
  old `auth.ts` only re-read `role` from the DB when `isManager` was undefined, so a
  Team-page role change never took effect on an existing session. Fixes (`1ab4f7d`):
  - `auth.ts`: **always** re-hydrate `isManager` + `role` from the DB on every token refresh.
  - `src/lib/roles.ts`: match Operations Head **flexibly** (case-insensitive contains) so
    `Operations Head`, `HR & Operations Head`, `Head of Operations` all qualify; Accounts
    matches any role containing `accounts`.
  - `Navbar.tsx`: re-fetch `role` fresh from the DB (was only fetching `isManager`); use the
    central `roles.ts` helpers instead of hardcoded string equality.
  - Verified: blank/stale role reproduces the empty page (0 rows, 0 buttons); correct role →
    all rows + buttons. Files: `auth.ts`, `src/lib/roles.ts`, `src/components/Navbar.tsx`.
- **docs:** Generated the permanent memory set — `CLAUDE.md` + `docs/{PROJECT_MEMORY,
  ARCHITECTURE,DATABASE,API,DESIGN_SYSTEM,BUSINESS_RULES,SECURITY_MODEL,UI_COMPONENT_LIBRARY,
  NEXT_SESSION,CHANGELOG}.md` — then refreshed at session end. (`ab49d81`)

## 2026-06-01
- Accounts collections visibility fix + **Operations Head** role & reporting hierarchy
  (`Employee.reportsTo`, `roles.ts`; manager-like finance reach without `isManager`). (`7d156b2`)
- Payment tracker: partial payments add to existing amount; fully-paid invoices hidden. (`c3ee10e`)
- Manager dashboard: "Pipeline by Stage" → "Collections Today". (`bee868c`)
- Employee dashboard card reorder. (`db07e85`)
- Daily collections widget on manager + sales-rep dashboards. (`b304d66`)
- Lead edit, meeting scheduling, POC/Demo presales assignment. (`c849411`)
- **Payments module:** ledger, advances, daily notifications (`Payment`/`OrderAdvance`/
  `Notification` + `src/lib/payments.ts`). (`0458034`)
- Business-card OCR lead capture in mobile (`/api/ocr/business-card`, `card-parser.ts`). (`3c79716`)
- Fixed dead mobile buttons; team views + call/meeting logging. (`ee56dfd`)

## 2026-05-31
- Mandatory **PO Date** for Closed Won + editable legacy deals (`SalesFunnel.poDate`). (`6194b5d`)
- **Customer Master** (`Customer` model) with CRM import + dedupe; auto-seed when empty. (`e1053de`, `26f4153`, `f37b5ff`)
- Legacy SalesFunnel deals rendered as opportunities in kanban + table; Closed Won totals fixed. (`459e5e0`, `60102f7`)
- **Dashboard period filter + clickable KPI tiles**, opportunity↔KRA merge, sidebar hydration fix. (`92a0979`)

## 2026-05-29
- **Admin panel** for configuration & rules: `AppSetting` (106 keys) + RBAC
  (`AppRole`/`RolePageAccess`); AdminClient (10 tabs) + RolesClient matrix. (`c47fc5d`)
- Customer-name autocomplete (`/api/customers/suggestions`, `CustomerNameCombobox`) +
  dev quick-login fix. (`6f97d11`)
- Mobile app + security hardening: signOut clears `dev_employee_id`, 8h JWT `maxAge`,
  ownership checks on `[id]` routes, API 401 JSON. (`03bc924`)

## 2026-05-27
- Printable user guide at `/user-guide.html`. (`84828ae`)
- Import `paymentReceivedDate` mapping + collections bulk delete. (`6385be7`)
- Sidebar layout + dashboard redesign with charts + team view. (`1c71016`)
- Bulk CSV/XLSX lead import. (`d651821`)
- **Pipeline module**: Lead Qualification & Opportunity funnel (`CrmLead`/`CrmOpportunity`/
  `CrmTask`/`CrmMeeting`/`CrmActivity`/`CrmNote`); legacy sheets folded into kanban/table.
  (`cf9eae9`, `666ab9b`, `d04e7fe`, `fbcc376`)

## 2026-05-26
- Payment received date, accounts dashboard, on-time collection KRA calc. (`aeebc38`)
- Forecast accuracy via weekly commits + certification tracking. (`e672c89`)
- Microsoft Entra ID auth + activity-sheets foundation (early migrations).

---
### Conventions
- One bullet per logical change; reference the short commit hash.
- Newest on top, grouped by date. Note new Prisma models/migrations and new `src/lib` modules.
- Keep "Current State" + "Next Actions" at the top current.
