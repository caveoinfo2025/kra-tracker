# Next Session — Resume Here

> Quick-start state for the next coding session. Overwritten at the end of every session.
> Last updated: 2026-06-04 — Admin Console Phase 7 (Master Data Management) complete.

## Where to continue

**A very large body of work is uncommitted.** Migration NOT yet applied to dev DB.
Decide commit/deploy order with Vijesh before proceeding.

Uncommitted modules (newest first):
- **Admin Console Phase 7 — Enterprise Master Data Management** (2026-06-04) — `src/lib/master-data/` (7 files) + `src/app/settings/masters/` (9 files + page) + 5 API routes + `prisma/seed-master-defaults.ts` + migration SQL
- **Admin Console Phase 6 — Enterprise Approval Workflow Engine** (2026-06-04) — `src/lib/workflow-engine/` (7 files) + `src/app/settings/workflow/` new components (9 files) + 9 API routes + `prisma/seed-workflow-defaults.ts` + migration SQL
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

**Admin Console Phase 7 — Enterprise Master Data Management** (completed this session):

### Files created
| File | Notes |
|---|---|
| `prisma/migrations/20260604220000_master_data_management/migration.sql` | 8 tables + FK constraints |
| `src/lib/master-data/audit.ts` | logMasterEvent, getMasterAudit, listMasterAudit |
| `src/lib/master-data/masters.ts` | Three-layer value resolution (Global→Company→Branch) |
| `src/lib/master-data/override.ts` | listOverrides, createOverride, updateOverride, upsertOverride |
| `src/lib/master-data/validation.ts` | listValidationRules, createValidationRule, validateMasterData (Policy Engine) |
| `src/lib/master-data/customer-policy.ts` | getCustomerPolicy, listCustomerPolicies, upsertCustomerPolicy |
| `src/lib/master-data/vendor-policy.ts` | getVendorPolicy, listVendorPolicies, upsertVendorPolicy |
| `src/lib/master-data/index.ts` | Unified re-export |
| `src/app/settings/masters/page.tsx` | Server auth gate (hasPermission + predicate fallback) |
| `src/app/settings/masters/MasterDataClient.tsx` | 8-tab shell |
| `src/app/settings/masters/components/MasterDashboard.tsx` | Stats + architecture explainer |
| `src/app/settings/masters/components/MasterCategoryList.tsx` | Category table + inline create |
| `src/app/settings/masters/components/MasterValueManager.tsx` | Definition picker + values table |
| `src/app/settings/masters/components/OverrideManager.tsx` | Override table + upsert form |
| `src/app/settings/masters/components/CustomerGovernance.tsx` | Customer policy edit panel |
| `src/app/settings/masters/components/VendorGovernance.tsx` | Vendor policy edit panel |
| `src/app/settings/masters/components/ValidationRules.tsx` | Validation rule list + create |
| `src/app/settings/masters/components/MasterAudit.tsx` | Audit log with filter |
| `src/app/api/admin/masters/route.ts` | GET (multi-type) + POST (category/definition/validation-rule) |
| `src/app/api/admin/masters/values/route.ts` | GET + POST (create/update values) |
| `src/app/api/admin/masters/overrides/route.ts` | GET + POST (upsert overrides) |
| `src/app/api/admin/customer-policy/route.ts` | GET + POST |
| `src/app/api/admin/vendor-policy/route.ts` | GET + POST |
| `prisma/seed-master-defaults.ts` | 8 categories, ~40 values, global policies |

### Files modified
| File | What changed |
|---|---|
| `prisma/schema.prisma` | 8 new models (26–33) + Employee back-reference for MasterAudit |
| `src/lib/access-control/permissions.ts` | Added `Settings/Masters/VIEW` and `Settings/Masters/EDIT` |
| `src/app/settings/data/adminModules.ts` | Masters module status `"beta"` → `"active"` |
| `docs/CHANGELOG.md` | Phase 7 entry added |
| `docs/NEXT_SESSION.md` | This file |

### Build status
- `npx tsc --noEmit` — ✅ clean (zero output)
- `npx next build` — ✅ clean, `/settings/masters` in route list

## Recommended next steps

1. **Apply DB migrations** to dev then prod (in order):
   - `20260604000000_admin_console_foundation` (12 models)
   - `20260604120000_policy_engine_foundation` (6 models)
   - `20260604180000_workflow_engine` (7 models)
   - `20260604220000_master_data_management` (8 models)
   - Then run seeds: `seed-admin-foundation.ts`, `seed-policy-defaults.ts`, `seed-workflow-defaults.ts`, `seed-master-defaults.ts`

2. **Commit batch** — confirm with Vijesh, then stage in logical chunks:
   - `feat(master-data): enterprise master data management — Phase 7`
   - `feat(workflow-engine): enterprise approval workflow engine — Phase 6`
   - `feat(policy-engine): business policy engine — Phase 5`
   - `feat(admin-iam): identity & access management — Phase 4`
   - `feat(admin-org): organization management — Phase 3`
   - `feat(admin-foundation): enterprise DB foundation — Phase 2`
   - `feat(admin-shell): enterprise 12-module settings shell — Phase 1`
   - (finance/master UI commits as before)

3. **Wire Approval Engine into CRM flows** — call `startApproval()` in:
   - large-deal opportunity save (trigger: `OPPORTUNITY_LARGE_DEAL`)
   - expense submit (trigger: `EXPENSE_SUBMITTED`)
   - discount request (trigger: `DISCOUNT_REQUESTED`)

4. **Backend wiring** — Expense Register CRUD; Customer/Vendor Masters to live DB.

5. **Consolidate Customer Master** — two nav entries pending.

6. **Wire `getMasterValues()`** into CRM dropdowns — replace hardcoded arrays with:
   - Lead source picker → `getMasterValues({ masterCode: "LEAD_SOURCE_LIST" })`
   - Deal stage picker → `getMasterValues({ masterCode: "DEAL_STAGE_LIST" })`
   - Expense category picker → `getMasterValues({ masterCode: "EXPENSE_CATEGORY_LIST" })`

## Current blockers

- **Migration not applied.** All API routes gracefully handle pre-migration state: GET returns mock/empty, writes return 503.
- **Apply with:**
  ```powershell
  $env:DATABASE_URL="mysql://u686730471_caveodev:…@srv2201.hstgr.io/u686730471_caveodev"
  npx prisma migrate deploy
  npx tsx prisma/seed-admin-foundation.ts
  npx tsx prisma/seed-policy-defaults.ts
  npx tsx prisma/seed-workflow-defaults.ts
  npx tsx prisma/seed-master-defaults.ts
  ```
- **Watch:** orphaned `next dev` on port 3000 breaks dev login (`/api/dev/switch` 404). Recovery:
  kill port-3000 → `rm -rf .next` → restart.

## Start commands

```powershell
npm run dev                       # http://localhost:3000 → /login → quick-login

# Apply all pending migrations (replace password):
$env:DATABASE_URL="mysql://u686730471_caveodev:PASSWORD@srv2201.hstgr.io/u686730471_caveodev"
npx prisma migrate deploy
npx tsx prisma/seed-admin-foundation.ts
npx tsx prisma/seed-policy-defaults.ts
npx tsx prisma/seed-workflow-defaults.ts
npx tsx prisma/seed-master-defaults.ts

# If dev login fails (orphan + stale route tree):
Get-NetTCPConnection -LocalPort 3000 -State Listen | %{ Stop-Process -Id $_.OwningProcess -Force }
Remove-Item -Recurse -Force .next ; npm run dev

# Pre-push discipline:
npx prisma validate ; npx tsc --noEmit ; npx next build
```

## Context to restore (non-obvious)

- **Four migration files exist but none deployed:** `20260604000000_admin_console_foundation`, `20260604120000_policy_engine_foundation`, `20260604180000_workflow_engine`, `20260604220000_master_data_management`. Apply in order.
- **Two RBAC systems coexist:** legacy `roles.ts` predicates + DB-driven `src/lib/access-control/`. All Phase 3–7 pages use both with graceful fallback.
- **Three-layer master resolution:** `getMasterValues({ masterCode, companyId?, branchId? })` resolves Global → Company → Branch. Branch override wins. Single DB query for all overrides (no N+1).
- **`getMasterValues()` is the public API** for all CRM dropdowns — pass `masterCode` from the seeded `DEAL_STAGE_LIST`, `LEAD_SOURCE_LIST`, etc. codes.
- **Pre-migration pattern:** all service functions catch errors and return safe defaults. GET routes return empty arrays, write routes return 503.
- **Dev users**: Vijesh Vijayan (id 2, Manager, Head of Sales); Deepak Sharma (id 3, Operations Head). `/api/dev/switch` to switch.
- **session.user.employeeId** (not `.id`) is the employee integer FK. All new API routes use `session.user.employeeId!`.
- **Architecture plan:** `docs/ADMIN_ARCHITECTURE_PLAN.md` defines the 12-module target. Read before starting any Admin Console phase.
- **Phase 7 is the last Admin Console phase.** Do NOT implement Finance module next — apply migrations and commit first.
