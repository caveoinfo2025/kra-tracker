# Changelog

Reverse-chronological log of notable changes. **Update at the end of every session.**
Dates from git history (branch `master`).

## Current State
- All core modules live in production on `master` / `sales.caveoinfosystems.com`:
  auth, pipeline (leads/opportunities/tasks/meetings/notes), KRA engine + reviews/commits/
  certifications, collections + payments + advances + notifications, customer master,
  manager & employee dashboards (period filter + clickable KPIs), admin panel
  (settings + RBAC), mobile app (incl. business-card OCR), bulk import, org hierarchy.
- **Working tree:** documentation bootstrap only; no pending app code.
- **Latest commit:** `7d156b2` — Accounts collections visibility + Operations Head role.

## Next Actions
1. Decide the authoritative RBAC path (DB `hasPermission` vs `roles.ts` predicates) and
   enforce `RolePageAccess` at the route/page layer.
2. Wire the Topbar global search to real results.
3. Address the `xlsx@0.18.5` advisory (replace or sandbox imports).
4. Surface the notifications feed on desktop.
5. (Optional) introduce a real `middleware.ts` to centralize auth.

---

## 2026-06-02
- **docs:** Generated the permanent memory set — `CLAUDE.md` + `docs/{PROJECT_MEMORY,
  ARCHITECTURE,DATABASE,API,DESIGN_SYSTEM,CHANGELOG}.md` — from a full read-only analysis.
  No application code changed.

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
