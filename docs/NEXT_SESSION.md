# Next Session — Resume Here

> Quick-start state for the next coding session. Overwritten at the end of every session.
> Last updated: 2026-06-02 (Finance Phase 1 DB — tested on dev, awaiting commit/push).

## Where to continue
**Finance Operations Module — Phase 1 (database) is complete and verified on a dev DB but
is NOT yet committed or pushed.** Decide first:
1. **Commit + push Phase 1** (schema + migration + finance seed), OR
2. Start **Phase 2** (Vendor Master + Expense Register API/UI — see
   `docs/modules/finance/IMPLEMENTATION_PLAN.md` Phase 2).

## Last completed task
- Added **10 finance Prisma models** + 9 Employee back-refs (`prisma/schema.prisma`).
- Created migration **`20260602120000_finance_operations_phase1`** (offline via
  `prisma migrate diff` — no local MySQL).
- Added `prisma/seed.ts` (finance config) + wired `prisma.config.ts` `migrations.seed`.
- **Tested on a Hostinger dev DB** (`u686730471_caveodev`): both migrations applied, seed ran,
  all 10 tables + FKs verified, relational round-trip passed, dev server booted clean.
- Added **dev-only** helpers `prisma/seed-dev-users.ts` (7 role users) and
  `prisma/seed-dev-finance.ts` (sample finance data). Verified dev quick-login + Prisma Studio.

## Current state of the working tree (UNCOMMITTED)
```
 M package.json                 # db:seed script; removed dead prisma.seed block
 M prisma.config.ts             # migrations.seed = "npx tsx prisma/seed.ts"
 M prisma/schema.prisma         # +10 finance models, +9 Employee back-refs
?? prisma/migrations/20260602120000_finance_operations_phase1/
?? prisma/seed.ts               # finance config seed (prod-safe)
?? prisma/seed-dev-users.ts     # DEV ONLY
?? prisma/seed-dev-finance.ts   # DEV ONLY
```
`.env` was repointed to the dev DB locally — **gitignored, never commit it.**

## ⚠️ Before pushing — production impact
The Hostinger build runs `prisma migrate deploy` automatically, so **pushing applies the
finance migration to the PRODUCTION MariaDB on the next rebuild.** Confirm with Vijesh first
(golden rule). Space out rebuilds (LVE limit risk).
- Decide whether to commit the two `seed-dev-*.ts` helpers or leave them untracked/gitignored.

## Priority tasks (next session)
1. **Commit + push Finance Phase 1** (after confirmation) — verify prod migration applied.
2. **Phase 2 — Vendor Master + Expense Register** (API + UI). Needs a cloud storage choice
   (Cloudflare R2 / S3) for expense attachments + `canManageFinance` predicate in `roles.ts`.
3. Wrap `recordPayment`/`applyAdvance` in `prisma.$transaction` (now real concurrency on MySQL).
4. Carryover debt: `@db.Decimal(12,4)` money precision; remove `better-sqlite3`; rotate the
   dev DB password shared in chat + remove the Remote-MySQL IP/`%` entry after testing.

## Files needing attention
| File | Why |
|---|---|
| `prisma/schema.prisma` | New finance models live here; source of truth |
| `prisma/migrations/20260602120000_finance_operations_phase1/migration.sql` | Applies on next prod build |
| `prisma.config.ts` | Now holds the seed command (Prisma 7 location) |
| `prisma/seed.ts` | Finance config seed — keep prod-safe (no employee/PII data) |
| `.env` | Points at the dev DB locally (gitignored) |

## Start commands
```powershell
# Local dev server (reads .env → dev MySQL automatically)
npm run dev                       # http://localhost:3000  → /login → quick-login

# Prisma CLI needs DATABASE_URL inline (Prisma 7 does NOT auto-load .env):
$env:DATABASE_URL = "mysql://u686730471_devuser:<pwd-%40-encoded>@srv2201.hstgr.io:3306/u686730471_caveodev"
npx prisma migrate status
npx prisma db seed                # finance config seed
npx tsx prisma/seed-dev-users.ts  # dev users (role testing)
npx tsx prisma/seed-dev-finance.ts# sample finance data
npx prisma studio                 # browse data (opens on a random port, e.g. :51212)

# Pre-push discipline
npx prisma validate ; npx tsc --noEmit ; npx next build
```

## Context to restore (non-obvious)
- **No local MySQL exists** (no Docker/XAMPP/service). Dev DB is the **remote Hostinger**
  `u686730471_caveodev` via `srv2201.hstgr.io` (Remote MySQL whitelisted). Password contains
  `@` → URL-encode as `%40` in `DATABASE_URL`.
- Phase 1 is **DB-only** — there is no finance API/UI yet, so the app shell looks unchanged;
  the finance tables are only visible via Prisma Studio.
- Dev DB is otherwise empty except the seeds (no real CRM data) — log in via quick-login,
  not Microsoft (no matching employees beyond the 7 seeded).
