# Next Session — Resume Here

> Quick-start state for the next coding session. Update this at the end of every session.

## Current development status
**Database migrated SQLite → MariaDB 11.8 — migration is COMPLETE and was verified
(all 22 tables, row counts identical; app authenticated + served the DB).**
Code committed + pushed through `749f335`. Working tree otherwise clean (only untracked local
helper scripts remain — delete them, see security note).

## 🔴 BLOCKER #1 — production is currently DOWN (recover first)
The site returns **503/500** and the account hit a **CloudLinux LVE resource limit**
(`bash: fork: Resource temporarily unavailable`) — SSH/SFTP can no longer even start a shell
for the account. Cause: many back-to-back rebuilds + Passenger `restart.txt` touches piled up
`next-server` workers while a build was running, exceeding the per-account process/memory cap.

**This is an ops/resource issue, NOT data loss or a code bug.** The DB and code are intact.

**Recovery (do this first, via the browser — SSH is locked out):**
1. **hPanel → Websites → sales.caveoinfosystems.com → Node.js app → Restart**
   (Hostinger does this at the infra level, bypassing the LVE lock — it clears the stale
   workers). If there's a Stop then Start, use that.
2. If hPanel offers it, kill stray Node processes / check resource usage.
3. Once up: `curl -I https://sales.caveoinfosystems.com/login` → expect `200`.
4. Then SSH should work again: server Node is at `/opt/alt/alt-nodejs22/root/usr/bin`; restart
   the app cleanly with `touch …/nodejs/tmp/restart.txt` (do this sparingly — don't loop it).
> Lesson: do NOT trigger rapid successive rebuilds/restarts on Hostinger; each spawns workers
> and a heavy `next build`. Space them out and confirm one finished before the next.

## Then — post-migration smoke test
Log in via Microsoft and confirm reads + writes on MariaDB: dashboard totals, record a test
payment, create a test lead, open the notifications feed.

## ⚠️ Security / cleanup (do this session)
1. **Rotate the SSH (`u686730471`) + MySQL (`u686730471_caveoadmincrm`) passwords** — both were
   shared in chat during migration.
2. **Delete untracked local credential scripts:** `scripts/_tmp_ssh.mjs`, `scripts/_tmp_sftp.mjs`
   (plaintext SSH creds). They are NOT tracked — never commit them.
3. Keep the server SQLite backup `…/db/prod.db` ~2 weeks as rollback, then delete.

## Other open items (carried over)
- Priyadharshini (Accounts) + Deepak (Operations Head): one-time **re-login** for the
  stale-JWT role fix (`1ab4f7d`); set Deepak's role + `Reports To` on the Team page.
- **Money precision:** apply `@db.Decimal(12,4)` to `*Lakhs`/value fields (deferred this session).
- **Finance transactions:** wrap `recordPayment`/`applyAdvance` (`payments.ts`) in
  `prisma.$transaction` before heavy concurrent writes (MySQL has real concurrency now).
- **Orphaned `public/maintenance.html`** — wire a maintenance gate into `proxy.ts` or delete it.
- **Leftover deps** — remove `better-sqlite3` + `@types/better-sqlite3` from `package.json`.
- Consolidate dual RBAC (`rbac.ts` matrix vs `roles.ts` predicates); wire Topbar search;
  mitigate `xlsx@0.18.5`; surface notifications on desktop.

## How production connects to the DB (reference)
- Host **`127.0.0.1`** (TCP), NOT `localhost` (the `mariadb` driver maps localhost → unix socket).
- Env in `…/public_html/.builds/config/.env` (Passenger reads at app start).
- **Passenger escapes `%`→`\%`** in injected env; `src/lib/prisma.ts` strips that before parsing
  `DATABASE_URL`. Prisma 7 forbids `url` in `schema.prisma` (it's in `prisma.config.ts`).
- Auth gate is **`src/proxy.ts`** (Next 16 edge middleware); `middleware.ts` cannot coexist.

## Files to watch (central to recent work)
| File | Why it matters |
|---|---|
| `src/lib/prisma.ts` | Builds the MariaDB driver adapter; unescapes Passenger's `\%` in DATABASE_URL |
| `prisma/schema.prisma` | `provider=mysql`, `@db.Text` fields, 18 indexes |
| `prisma.config.ts` | Holds the datasource `url` (Prisma 7 — not allowed in schema) |
| `prisma/migrations/20260601000000_init_mysql/` | The single MySQL baseline migration |
| `src/proxy.ts` / `auth.config.ts` | Edge auth gate + live `authorized` callback |
| `src/lib/payments.ts` | Ledger sync + opening-balance reconciliation (needs tx wrapping) |

## Commands to run the project
```bash
# Install
npm install                       # runs prisma generate via postinstall

# Local dev (http://localhost:3000) — requires a local MySQL/MariaDB now
npm run dev

# Database (after editing prisma/schema.prisma) — DATABASE_URL must point at MySQL
npx prisma migrate dev --name <change>
npx prisma generate
# then RESTART the dev server (Turbopack caches the old Prisma client → 500s)

# Lint / build (build also runs prisma migrate deploy + generate)
npm run lint
npx next build                    # always run before pushing — type-checks the whole project
# If the build fails with a type error inside .next/dev/types/* or a corrupt
# generated file, it's a stale Turbopack cache: `rm -rf .next` then rebuild.

# Tests (Playwright + ad-hoc screenshot/API checks)
npx playwright test
node scripts/check-*.mjs           # session check scripts (payments, hierarchy, mobile, etc.)
```
- **Tooling:** local Node v24.15.0, npm 11.12.1. **Server Node:** `/opt/alt/alt-nodejs22` (v22).
- **Pre-push discipline:** dev-mode (Turbopack) does NOT type-check the whole project, but
  `next build` (and Hostinger) does. Run `next build` locally before every push.
- **Hostinger restart:** `touch …/nodejs/tmp/restart.txt` — but space restarts/rebuilds out
  (see LVE blocker above).
- **Dev login:** use the DevBar / `/login` quick-login to impersonate an employee
  (sets `dev_employee_id`). Manager = Vijesh (id 4).
