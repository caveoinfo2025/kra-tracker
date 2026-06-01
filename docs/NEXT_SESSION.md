# Next Session — Resume Here

> Quick-start state for the next coding session. Update this at the end of every session.

## Current development status
**Stable, all committed + pushed.** All core modules live in production (`master` /
`sales.caveoinfosystems.com`). **Database migrated SQLite → MariaDB 11.8 and verified live.**
Working tree clean apart from untracked `scripts/` helpers (see security note). No feature work in progress.

## Last completed task
- **Migrated production DB from SQLite to Hostinger MariaDB 11.8** (commits `59c34d5`→`7d6500a`).
  All 22 tables copied, row counts verified identical, app live on the MariaDB driver adapter.
  See the `2026-06-02 — SQLite → MySQL/MariaDB migration` entry in `CHANGELOG.md` for the full
  play-by-play and every gotcha (TCP vs socket, middleware/proxy conflict, Passenger `%`-escaping).

## ⚠️ FIRST THINGS NEXT SESSION
1. **Post-migration smoke test:** log in via Microsoft, check dashboard totals, record a test
   payment, create a test lead, open notifications — confirm reads + writes on MariaDB.
2. **Rotate the SSH + MySQL passwords** (shared in chat) and **delete the untracked credential
   scripts** under `scripts/` (`ssh-run.mjs`, `ssh-upload.mjs`, `server-migrate.cjs`,
   `test-*.cjs`, `*conn*.cjs`, `inspect-proc-env.cjs`, `commitmsg.txt`). Never commit them.
3. Still pending from before: Priyadharshini + Deepak one-time re-login for the stale-JWT role
   fix (`1ab4f7d`); set Deepak's role + `Reports To` on the Team page.

## How the production app connects to the DB (MySQL/MariaDB)
- Host **`127.0.0.1`** (TCP), NOT `localhost` (the `mariadb` driver maps localhost → unix socket).
- Env lives in `…/public_html/.builds/config/.env` (Passenger reads it at app start).
- **Passenger escapes `%` → `\%`** in injected env values; `src/lib/prisma.ts` strips stray
  backslash-escapes before parsing `DATABASE_URL`. Restart the app with
  `touch …/nodejs/tmp/restart.txt`. Node on the server: `/opt/alt/alt-nodejs22/root/usr/bin`.

## Files to watch (central to recent work)
| File | Why it matters |
|---|---|
| `src/lib/prisma.ts` | Builds the MariaDB driver adapter; unescapes Passenger's `\%` in DATABASE_URL |
| `prisma/schema.prisma` | provider=mysql, `@db.Text` fields, indexes (URL lives in `prisma.config.ts`) |
| `prisma/migrations/20260601000000_init_mysql/` | The single MySQL baseline migration |
| `auth.ts` | JWT/session role hydration — the access-control linchpin |
| `src/lib/roles.ts` | All finance/manager-reach predicates (flexible role match) |
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
