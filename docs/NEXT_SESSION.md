# Next Session — Resume Here

> Quick-start state for the next coding session. Update this at the end of every session.

## Current development status
**Stable, all committed + pushed.** All core modules live in production (`master` /
`sales.caveoinfosystems.com`). Working tree clean. No feature work in progress.

## Last completed task
- **Fixed Operations Head / Accounts access** (`1ab4f7d`): root cause was a **stale JWT
  role** — the old `auth.ts` didn't refresh `role` from the DB for existing sessions, so
  Priyadharshini's Billing page was empty (no rows → no "Record Payment" button) and
  Deepak couldn't see finance. `auth.ts` now always re-hydrates `isManager`+`role`;
  `roles.ts` matches Operations Head flexibly; `Navbar` reads live role.
- Refreshed all memory docs at session end (`ab49d81` + this update).

## ⚠️ FIRST THING NEXT SESSION — verify the production fix
The fix is deployed, but JWTs minted by the *old* `auth.ts` still carry the stale role.
**Action:** have Priyadharshini (Accounts) and Deepak (Operations Head) **sign out + sign
in once** on production, then confirm:
- Priyadharshini → Billing & Collections shows all invoices + "Record Payment" buttons.
- Deepak → all collections + Payment Tracker (set his role to contain "Operations Head" and
  his `Reports To` = Vijesh on the Team page; set Priyadharshini's `Reports To` = Deepak).
If still broken after a fresh login, inspect the live session's `role` value first.

## Files to watch (central to recent work)
| File | Why it matters |
|---|---|
| `auth.ts` | JWT/session role hydration — the access-control linchpin |
| `src/lib/roles.ts` | All finance/manager-reach predicates (flexible role match) |
| `src/components/Navbar.tsx` | Live role read + role-aware sidebar |
| `src/app/collections/page.tsx`, `src/app/accounts/page.tsx` | Finance pages gated by `canSeeAllCollections` |
| `src/lib/payments.ts` | Ledger sync + opening-balance reconciliation |

## Current bugs / open issues
- **One-time re-login required** for users with pre-`1ab4f7d` tokens (see above). Technical
  debt, not a code bug — clears itself after each affected user logs in once.
- **No `middleware.ts`** — auth is enforced per-page/route only (by design, but fragile).
- **Dual RBAC** — DB `hasPermission()` (`rbac.ts`) vs hardcoded `roles.ts` predicates can
  disagree; the editable `RolePageAccess` matrix is **not yet enforced** at most routes.
- **Topbar global search** is cosmetic on most pages.
- **`xlsx@0.18.5`** — HIGH-severity advisory, no upstream fix.
- No known runtime/crashing bugs in production.

## Immediate next steps (priority order)
1. **Verify the role fix on production** (the re-login step above) — highest priority.
2. Decide the authoritative RBAC path and enforce `RolePageAccess` at the page/route layer.
3. Wire Topbar search to real results.
4. Mitigate the `xlsx` advisory.
5. Surface the notifications feed on desktop.

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
DATABASE_URL="file:./prisma/dev.db" npx next build   # always run before pushing — type-checks the whole project
# If the build fails with a type error inside .next/dev/types/* or a corrupt
# generated file, it's a stale Turbopack cache: `rm -rf .next` then rebuild.

# Tests (Playwright + ad-hoc screenshot/API checks)
npx playwright test
node scripts/check-*.mjs           # session check scripts (payments, hierarchy, mobile, etc.)
```
- **Tooling:** Node v24.15.0, npm 11.12.1.
- **Pre-push discipline:** dev-mode (Turbopack) does NOT type-check the whole project, but
  `next build` (and Hostinger) does. Run `next build` locally before every push — several
  prod build failures this session were type errors invisible in dev.
- **Dev server:** running `next build` frees port 3000 and stops `npm run dev`; restart it
  afterward (`npm run dev`).
- **Dev login:** use the DevBar / `/login` quick-login to impersonate an employee
  (sets `dev_employee_id`). Manager = Vijesh (id 4).
