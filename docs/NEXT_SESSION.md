# Next Session — Resume Here

> Quick-start state for the next coding session. Overwritten at the end of every session.
> Last updated: 2026-06-04 — Admin Console Phase 5 (Policy Engine Foundation) complete.

## Where to continue

**A very large body of work is uncommitted.** Migration NOT yet applied to dev DB.
Decide commit/deploy order with Vijesh before proceeding.

Uncommitted modules (newest first):
- **Admin Console Phase 5 — Policy Engine Foundation** (2026-06-04) — `src/app/settings/policies/` (9 files) + 6 API routes + Policy Engine service (`src/lib/policy-engine/` 6 files) + migration SQL + seed
- **Admin Console Phase 4 — Identity & Access Management** (2026-06-04) — `src/app/settings/identity/` (11 files) + `src/app/api/admin/identity/` (8 routes)
- **Admin Console Phase 3 — Organization Management** (2026-06-04) — 23 files under `src/app/settings/organization/` + `src/app/api/settings/organization/`
- **Admin Console Phase 2 DB Foundation** (2026-06-04) — 12 new models, migration SQL, access-control service, seed
- **Admin Console Phase 1 UI Shell** (2026-06-04, 9 files under `src/app/settings/`)
- **Finance Phase 2 UI** (2026-06-03, ~45 files under `src/app/finance/`)
- **Expense Categories** (2026-06-04, 8 files under `src/app/finance/expenses/categories/`)
- **Global Vendor Master** (2026-06-04, 14 files under `src/app/masters/vendors/`)
- **Global Customer Master** (2026-06-04, 16 files under `src/app/masters/customers/`)
- **Role-Adaptive Dashboard** (2026-06-04)
- **Settings Hub + AdminClient expansion** (2026-06-04)

## Last completed task

**Admin Console Phase 5 — Policy Engine Foundation** (completed this session):

### Files created
| File | Notes |
|---|---|
| `src/lib/policy-engine/conditions.ts` | 9 operators, dot-notation field resolution, AND/OR/leaf condition trees |
| `src/lib/policy-engine/actions.ts` | 6 action types: ALLOW/BLOCK/REQUIRE_APPROVAL/SEND_NOTIFICATION/CREATE_TASK/ESCALATE |
| `src/lib/policy-engine/rules.ts` | Priority-ordered evaluation, BLOCK short-circuits when combineAll=false |
| `src/lib/policy-engine/versioning.ts` | Policy snapshot builder for version history |
| `src/lib/policy-engine/policy.ts` | `listPolicies()` + `transitionPolicyStatus()` with audit + version snapshot on ACTIVE |
| `src/lib/policy-engine/index.ts` | `evaluatePolicy({ module, event, data })` — fail-open on DB error |
| `src/app/settings/policies/data/policyDefaults.ts` | All UI types, mock data (6 categories, 3 policies, 5 audit entries), helpers |
| `src/app/settings/policies/components/ConditionBuilder.tsx` | IF field/operator/value inline builder with datalist suggestions |
| `src/app/settings/policies/components/ActionBuilder.tsx` | THEN action type + type-specific params (level/reason/templateKey/title) |
| `src/app/settings/policies/components/RuleBuilder.tsx` | Rules list with add/remove/enable-disable/priority, uses Condition+Action builders |
| `src/app/settings/policies/components/PolicyVersionHistory.tsx` | Expandable version rows with snapshot JSON, CURRENT badge |
| `src/app/settings/policies/components/PolicyAudit.tsx` | Audit log table with search + action filter, falls back to mock |
| `src/app/settings/policies/components/PolicyEditor.tsx` | Right slide-over: 3 tabs (Details/Rules/History), lifecycle action buttons, read-only guard |
| `src/app/settings/policies/components/PolicyList.tsx` | KPI cards, search/filter table with clone, opens PolicyEditor |
| `src/app/settings/policies/PolicyClient.tsx` | 2-tab client shell (Policies / Audit Log) |
| `src/app/settings/policies/page.tsx` | Server auth gate — `Settings/Policy/VIEW+EDIT` with `canAccessSettings` fallback |
| `src/app/api/admin/policies/route.ts` | `GET` (list) + `POST` (create DRAFT) |
| `src/app/api/admin/policies/[id]/route.ts` | `PATCH` (field update + status transition + rule upsert) |
| `src/app/api/admin/policies/[id]/versions/route.ts` | `GET` — version history for a policy |
| `src/app/api/admin/policies/audit/route.ts` | `GET` — audit log |
| `src/app/api/admin/policies/categories/route.ts` | `GET` — policy categories |
| `src/app/api/admin/policies/evaluate/route.ts` | `POST` — `evaluatePolicy()` passthrough |
| `prisma/migrations/20260604120000_policy_engine_foundation/migration.sql` | 6 new tables: policy_category, policy, policy_rule, policy_version, policy_audit, configuration_version |
| `prisma/seed-policy-defaults.ts` | Seeds 6 categories + 3 default policies |

### Files modified
| File | What changed |
|---|---|
| `prisma/schema.prisma` | 6 new models + Employee back-references |
| `src/lib/access-control/permissions.ts` | Added `Settings/Policy/VIEW` and `Settings/Policy/EDIT` |
| `src/lib/settings.ts` | Added `getPublishedSetting`, `draftSetting`, `publishSettingVersion` |
| `src/app/settings/data/adminModules.ts` | Added Policy Engine module (id=13, `active`, route `/settings/policies`) |
| `docs/CHANGELOG.md` | Phase 5 entry added |
| `docs/NEXT_SESSION.md` | This file |

### Build status
- `npx tsc --noEmit` — ✅ clean
- `npx next build` — ✅ clean, `/settings/policies` in route list

## Recommended next steps (Phase 6+)

Per the ADMIN_ARCHITECTURE_PLAN, next phases after Policy Engine are:
1. **Wire Policy Engine into existing CRM flows** — call `evaluatePolicy()` in deal-save and export flows
2. **Approval Workflow Engine** — implement multi-level approval chains that the Policy Engine can trigger via `REQUIRE_APPROVAL` actions
3. **Apply DB migration** — run `prisma migrate deploy` against dev then prod to make all Phase 2–5 tables live
4. **Commit batch** — all 2026-06-04 work is ready to commit once migration is applied and tested

## Current blockers

- **Migration not applied.** All API routes gracefully handle pre-migration state: GET returns mock data, writes return 503.
- **Apply with:** `$env:DATABASE_URL="mysql://u686730471_caveodev:…@srv2201.hstgr.io/u686730471_caveodev"; npx prisma migrate deploy`
  then: `npx tsx prisma/seed-admin-foundation.ts`
- **Watch:** orphaned `next dev` on port 3000 breaks dev login (`/api/dev/switch` 404). Recovery:
  kill port-3000 → `rm -rf .next` → restart.

## Priority tasks (next session)

1. **Apply Phase 2 migration to dev DB** and run `seed-admin-foundation.ts` — verify all 12
   tables created, 6 roles seeded, permissions seeded.

2. **Commit the uncommitted work** (confirm with Vijesh), staged in logical chunks:
   - `feat(admin-console-p4): identity & access management — IAM module with 6 tabs, 8 API routes`
   - `feat(admin-console-p3): organization management — 8-tab console with full CRUD`
   - `feat(admin-console-p2): enterprise DB foundation — 12 models, RBAC permission service`
   - `feat(admin-console-p1): enterprise 12-module shell at /settings`
   - `feat(dashboard): role-adaptive dashboard`
   - `feat(settings): expand SettingsHub + AdminClient`
   - `feat(finance-ui): Finance Phase 2 UI`
   - `feat(expense-categories): category engine`
   - `feat(vendor-master): global vendor master`
   - `feat(customer-master): global customer master`

3. **Backend wiring** — Expense Register CRUD first (Phase-1 models exist); then Customer Master
   → extend existing `Customer` model; Vendor Master → Phase-1 `Vendor` model.

4. **Consolidate Customer Master** — two nav entries (`/masters/customers` + legacy `/customers`).

5. Carryover: service-worker dev fix; `$transaction` on payments; `@db.Decimal(12,4)`;
   rotate dev DB password; mitigate `xlsx@0.18.5`.

## Files needing attention

| File | Why |
|---|---|
| `prisma/migrations/20260604000000_admin_console_foundation/migration.sql` | Not deployed yet — apply to dev DB first |
| `prisma/seed-admin-foundation.ts` | Run after migration deploy |
| `src/lib/access-control/index.ts` | Entry point — `hasPermission()` ready to use |
| `docs/ADMIN_ARCHITECTURE_PLAN.md` | Full 12-module plan; read before each Admin Console phase |
| `src/components/SidebarLinks.tsx` | Two "Customer Master" entries to reconcile |
| `src/app/masters/customers/data.ts` | Mock + types; contract for extending existing `Customer` model |

## Start commands

```powershell
npm run dev                       # http://localhost:3000 → /login → quick-login

# Apply Phase 2 migration (replace password):
$env:DATABASE_URL="mysql://u686730471_caveodev:PASSWORD@srv2201.hstgr.io/u686730471_caveodev"
npx prisma migrate deploy
npx tsx prisma/seed-admin-foundation.ts

# If dev login fails (orphan + stale route tree):
Get-NetTCPConnection -LocalPort 3000 -State Listen | %{ Stop-Process -Id $_.OwningProcess -Force }
Remove-Item -Recurse -Force .next ; npm run dev

# Pre-push discipline:
npx prisma validate ; npx tsc --noEmit ; npx next build
```

## Context to restore (non-obvious)

- **Two RBAC systems coexist:** legacy `roles.ts` predicates (string-based, synchronous) + new
  `src/lib/access-control/` (DB-driven, async). `hasPermission()` falls back gracefully when tables
  are empty — zero breakage until migration + seed runs.
- **Organization API dual-mode:** all 10 API routes try Prisma first; on DB error (pre-migration)
  GET routes return mock data, write routes return `{ error, status: 503 }`.
- **Identity API dual-mode:** same pattern — 8 routes, GET returns mock, writes return 503.
- **Company.companyName / Branch.branchName** — these models use `companyName`/`branchName` (not `name`) as the primary display field.
- **Offline migration pattern:** no local MySQL. Migration SQL written by hand following
  `20260602120000_finance_operations_phase1` pattern.
- **Architecture plan exists** — `docs/ADMIN_ARCHITECTURE_PLAN.md` defines the 12-module target.
  Read it before starting any Admin Console phase.
- **Dev users**: Vijesh Vijayan (id 2, Manager, Head of Sales); Deepak Sharma (id 3, Operations Head).
  Use `/api/dev/switch` to switch. Vijesh has `canAccessSettings()` → can see `/settings`.
- **All 2026-06-04 modules are mock & uncommitted** — no APIs wired to live DB, client-side RBAC only.
- **Cross-module reuse:** Customer Master imports GST validator from Vendor Master; both reuse
  `ExpenseSummaryCard` from Finance.
