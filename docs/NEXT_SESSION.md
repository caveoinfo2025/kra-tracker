# Next Session — Resume Here

> Quick-start state for the next coding session. Update this at the end of every session.

## Current development status
**Stable.** All core modules live in production (`master` / `sales.caveoinfosystems.com`).
No feature work in progress — the recent activity was **documentation only**.

## Last completed task
- Generated the permanent memory docs: `CLAUDE.md` + `docs/{PROJECT_MEMORY, ARCHITECTURE,
  DATABASE, API, DESIGN_SYSTEM, CHANGELOG}.md`, then added `BUSINESS_RULES.md`,
  `SECURITY_MODEL.md`, `UI_COMPONENT_LIBRARY.md`, and this file.
- Last shipped code commit: **`7d156b2`** — "Fix Accounts collections visibility + add
  Operations Head role & hierarchy".

## What I was working on
Documentation only (no application code). Prior to that, the feature thread was the
**finance / roles area**: Operations Head role, Accounts collections visibility, payment
tracker partial-payment behavior.

## Files recently modified (uncommitted working tree)
| File | State | Notes |
|---|---|---|
| `CLAUDE.md` | modified (unstaged) | Rewritten as permanent memory |
| `auth.ts` | modified (staged) | Re-hydrate `isManager` + `role` from DB on every token refresh |
| `src/components/Navbar.tsx` | modified (staged) | Live role/manager read; Ops-Head/Accounts finance sidebar |
| `src/lib/roles.ts` | modified (staged) | Operations Head predicates + finance reach |
| `docs/` | untracked | All documentation files |

> ⚠️ The `auth.ts` / `Navbar.tsx` / `roles.ts` edits were made by the user/linter, not by
> the doc task. Review and commit them intentionally.

## Current bugs / open issues
- **No `middleware.ts`** — auth is enforced per-page/route only (by design, but fragile).
- **Dual RBAC** — DB `hasPermission()` (`rbac.ts`) vs hardcoded `roles.ts` predicates can
  disagree; the editable `RolePageAccess` matrix is **not yet enforced** at most routes.
- **Topbar global search** is cosmetic on most pages.
- **`xlsx@0.18.5`** — HIGH-severity advisory, no upstream fix.
- No known runtime/crashing bugs in production.

## Immediate next steps
1. Commit the documentation: `docs: add memory docs + business/security/UI references`.
2. Decide the authoritative RBAC path and enforce `RolePageAccess` at the page/route layer.
3. Wire Topbar search to real results.
4. Mitigate the `xlsx` advisory.

## Commands to run the project
```bash
# Install
npm install                       # runs prisma generate via postinstall

# Local dev (http://localhost:3000)
npm run dev

# Database (after editing prisma/schema.prisma)
DATABASE_URL="file:./prisma/dev.db" npx prisma migrate dev --name <change>
npx prisma generate
# then RESTART the dev server (Turbopack caches the old Prisma client → 500s)

# Lint / build
npm run lint
npm run build                     # prisma migrate deploy && prisma generate && next build

# Tests (Playwright)
npx playwright test
```
- **Tooling:** Node v24.15.0, npm 11.12.1.
- **Dev login:** use the DevBar / `/login` quick-login to impersonate an employee
  (sets `dev_employee_id`). Manager = Vijesh (id 4).
