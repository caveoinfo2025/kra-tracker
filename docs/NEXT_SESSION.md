# Next Session — Resume Here

> Quick-start state for the next coding session. Overwritten at the end of every session.
> Last updated: 2026-06-05 — Admin Console Phases 6 & 7 complete, DB migrated, UI cleaned up.

## Where to continue

**Working tree is clean. All work is committed. Dev DB is fully migrated.**

```
git log --oneline -8
857afe0 fix: clean WorkflowRulePanel, WorkflowDesigner and TriggerSelector UI
c84323c fix: @@map directives, seed relation syntax, designer button style
ab4967a fix: add CSS utility aliases and fix workflow component class names
25fe870 fix: clean up WorkflowDesigner and TriggerSelector UI
74bc057 fix: workflow duplicate tabs, simplified sidebar and settings page
143428d fix: workflow 404 redirect + manager canEdit fallback
fc40e16 feat(master-data): enterprise master data management — Phase 7
f4e2d3a feat(workflow-engine): enterprise approval workflow engine — Phase 6
```

## Last completed task

All of the following are complete and committed this session:

- **Phase 6** — Enterprise Approval Workflow Engine (`src/lib/workflow-engine/` + 9 API routes + 9 UI components)
- **Phase 7** — Enterprise Master Data Management (`src/lib/master-data/` + 5 API routes + 8 UI components)
- **DB migrations applied** — all 4 pending migrations deployed to `u686730471_caveodev`
- **Seeds applied** — admin foundation (65 permissions, 6 roles), policy defaults (3 policies), workflow defaults (5 workflows), master data defaults (8 categories, ~40 values)
- **UI fixes** — workflow duplicate tabs removed, sidebar simplified (single Settings link), settings page redesigned (simple list), WorkflowDesigner encoding fixed, inline styles throughout

## Recommended next steps

1. **Wire `getMasterValues()` into CRM dropdowns** — replace hardcoded arrays:
   - Lead source picker → `getMasterValues({ masterCode: "LEAD_SOURCE_LIST" })`
   - Deal stage picker → `getMasterValues({ masterCode: "DEAL_STAGE_LIST" })`
   - Expense category picker → `getMasterValues({ masterCode: "EXPENSE_CATEGORY_LIST" })`

2. **Wire Approval Engine into CRM flows** — call `startApproval()`:
   - Large-deal opportunity save → trigger `OPPORTUNITY_LARGE_DEAL`
   - Expense submit → trigger `EXPENSE_SUBMITTED`
   - Discount request → trigger `DISCOUNT_REQUESTED`

3. **Backend wiring for Finance module** — Expense Register CRUD; Customer/Vendor Masters to live DB.

4. **Consolidate Customer Master** — two nav entries pending: `/masters/customers` (new global) vs `/customers` (legacy CRM import). Either redirect legacy or merge.

5. **Push to production** — all work is on `master` branch, confirm with Vijesh before `git push`.

## Current blockers

- **None** — dev DB is migrated, code is clean, server is running.
- When creating a new workflow in the Designer, the workflow is saved as DRAFT. To make it ACTIVE, go to Workflows tab and click "Activate".
- Production is unchanged — confirm `200` on `/login` before any push.

## Start commands

```powershell
npm run dev                       # http://localhost:3000 → /login → quick-login

# Re-apply migrations if needed (already applied to dev):
$env:DATABASE_URL="mysql://u686730471_devuser:Caveo%402026@srv2201.hstgr.io:3306/u686730471_caveodev"
npx prisma migrate deploy
npx prisma generate

# Pre-push:
npx prisma validate ; npx tsc --noEmit ; npx next build
```

## Context to restore (non-obvious)

- **@@map directives** — Models WorkflowDefinition→`workflow_definition`, WorkflowStep→`workflow_step`, ApprovalRequest→`approval_request`, ApprovalAction→`approval_action`, DelegationRule→`delegation_rule`, EscalationRule→`escalation_rule`, WorkflowAuditLog→`workflow_audit_log`, MasterCategory→`master_category` (etc. for all Phase 7 models) are mapped because the migration SQL used snake_case while Prisma defaults to PascalCase.
- **CSS utility aliases** — `globals.css` now has `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-secondary`, `.input`, `.form-label`, `.form-hint` + token aliases (`--primary`, `--foreground`, etc.) for settings module components.
- **Inline styles preferred** — after encountering CSS class resolution issues (PowerShell BOM + caching), all new workflow/settings components use explicit inline styles with `var(--caveo-red)`, `var(--fg-1)`, `var(--bg-elev)`, `var(--border)` tokens rather than CSS classes.
- **session.user.employeeId** (not `.id`) — critical: the session user has `employeeId` as the integer FK. All Phase 6/7 API routes use `session.user.employeeId!`.
- **Dev users**: Vijesh Vijayan (Head of Sales, isManager: true); Deepak Sharma (Operations Head). `/api/dev/switch` to switch.
- **Workflow creator relation** — `WorkflowDefinition.createdBy` maps to `creator Employee` relation. When seeding, use `creator: { connect: { id } }` not bare `createdBy: id`.
- **Three-layer master resolution** — `getMasterValues({ masterCode, companyId?, branchId? })` resolves Global → Company override → Branch override. Branch wins. Single DB query for all overrides.
- **Two RBAC systems coexist** — legacy `roles.ts` predicates + DB-driven `src/lib/access-control/`. All settings pages use both with `||` fallback. When DB permissions are seeded via `seed-admin-foundation.ts`, the DB check takes over.
