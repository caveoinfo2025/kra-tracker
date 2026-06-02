# Claude Code Permanent Memory

You are the AI development partner for **Caveo CRM** (`kra-tracker`).

## Before any coding task
1. Read this file.
2. Load every file in `/docs`.
3. Understand the existing architecture before writing code.
4. Continue from the current implementation — never rebuild completed modules.

### Required context files (always read)
- `docs/PROJECT_MEMORY.md` — purpose, features (done/pending), known issues, business rules, workflows
- `docs/ARCHITECTURE.md` — stack, folder structure, components, services, auth flow
- `docs/DATABASE.md` — Prisma schema, models, relationships, migrations, rules
- `docs/API.md` — endpoints, request/response shapes, validation
- `docs/DESIGN_SYSTEM.md` — colors, components, layouts, styling rules
- `docs/CHANGELOG.md` — history, current state, next actions

## Project at a glance
Internal **Sales CRM + KRA performance tracker** for **Caveo Infosystems** (IT
infrastructure / security reseller). Tracks leads, opportunities, billing/collections,
daily updates, weekly KRAs, payments, customer master, and a mobile app.

- **Repo:** `github.com/caveoinfo2025/kra-tracker` · branch `master`
- **Production:** `https://sales.caveoinfosystems.com` (Hostinger)
- **Local:** `http://localhost:3000` (`npm run dev`)

## Technology stack
Next.js 16.2.6 (App Router, Turbopack) · React 19.2 · TypeScript 5 · Prisma 7.8 ·
**MySQL / MariaDB 11.8** (`@prisma/adapter-mariadb` + `mariadb` driver) · NextAuth v5
(Microsoft Entra ID, JWT) · Tailwind v4 + custom `globals.css` tokens · Recharts ·
lucide-react · Playwright.

> **DB migrated SQLite → MariaDB on 2026-06-02.** Prisma 7's `prisma-client` generator has
> NO query engine, so a **driver adapter is mandatory** — `src/lib/prisma.ts` builds
> `PrismaMariaDb` from `DATABASE_URL`. `provider = "mysql"` in `schema.prisma`; the `url`
> lives in `prisma.config.ts` only (Prisma 7 forbids `url` in the schema). Local dev now
> needs a MySQL/MariaDB instance too (the old `file:./dev.db` SQLite no longer matches the
> provider).

## Development rules
**Before coding:** analyze existing files, understand current structure, explain
planned changes, modify only required files.

**Never:**
- ❌ Delete existing features
- ❌ Rewrite working code
- ❌ Reset the database
- ❌ Change UI standards / design tokens

**Always:**
- ✔ Preserve existing logic
- ✔ Reuse components
- ✔ Follow the architecture in `/docs`
- ✔ Update documentation
- ✔ **Confirm before pushing to production**

## Critical gotchas (read before touching code)
1. **Auth runs in `src/proxy.ts`** (Next.js 16's edge-middleware replacement, commit
   `d6293d1`). It runs `authConfig.auth` so the **`authorized` callback in `auth.config.ts`
   IS live** — it redirects unauthenticated page routes to `/login` and returns `401 JSON`
   for `/api/*`. (This supersedes the old "no middleware / dead callback" note.) `proxy.ts`
   and a `middleware.ts` **cannot coexist** in Next 16 — adding `middleware.ts` breaks the
   build. Belt-and-suspenders: pages/routes STILL call `getSession()` themselves too.
2. **Use `getSession()` (`src/lib/dev-session.ts`), not `auth()` directly** — it powers
   dev impersonation (the `dev_employee_id` cookie + DevBar).
3. **MySQL connection: use `127.0.0.1`, NOT `localhost`** — the `mariadb` driver maps
   `localhost` to a unix socket (times out). Also, **Hostinger/Passenger escapes `%`→`\%`**
   when injecting env vars, corrupting a URL-encoded DB password; `prisma.ts` strips stray
   backslash-escapes from `DATABASE_URL` before parsing. `contains` is case-insensitive
   under the `utf8mb4_unicode_ci` collation (no `mode:"insensitive"` needed).
4. **After schema changes:** `npx prisma migrate dev --name <x>` against a **MySQL** dev DB
   → `npx prisma generate` → **restart the dev server** (Turbopack caches the old Prisma
   client and returns 500s otherwise). Prisma client is generated to `src/generated/prisma`.
5. **Money is stored in ₹ Lakhs** (Float → MySQL `DOUBLE`). 1 Cr = 100 L. Use
   `fmt`/`fmtShort`. (Deferred debt: `@db.Decimal(12,4)` for exactness — not yet applied.)
6. **Two authorization systems coexist:** DB-driven `AppRole`/`RolePageAccess`
   (`hasPermission` in `src/lib/rbac.ts`) AND hardcoded predicates in `src/lib/roles.ts`.
   Check which governs a given gate before changing it.
7. **`xlsx@0.18.5`** has a HIGH-severity advisory with no upstream fix (import feature).
8. **Prod restart / env:** Hostinger Node app is Passenger-managed —
   `touch …/nodejs/tmp/restart.txt` to restart; env lives in
   `…/public_html/.builds/config/.env`; server Node at `/opt/alt/alt-nodejs22/root/usr/bin`.
   Repeated rebuilds/restarts can pile up `next-server` workers and hit the CloudLinux LVE
   limit (`bash: fork: Resource temporarily unavailable`) → recover via hPanel → Restart app.

## Session-ending rule
Before ending every session, update:
- `docs/PROJECT_MEMORY.md` (status, pending, issues)
- `docs/CHANGELOG.md` (what changed + next actions)

# userEmail
vijesh@caveoinfosystems.com
