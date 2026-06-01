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
SQLite (`better-sqlite3` adapter) · NextAuth v5 (Microsoft Entra ID, JWT) ·
Tailwind v4 + custom `globals.css` tokens · Recharts · lucide-react · Playwright.

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
1. **No `middleware.ts`.** The `authorized` callback in `auth.config.ts` does NOT run.
   Every page and API route enforces auth itself via `getSession()`. Do not assume
   middleware protects anything.
2. **Use `getSession()` (`src/lib/dev-session.ts`), not `auth()` directly** — it powers
   dev impersonation (the `dev_employee_id` cookie + DevBar).
3. **SQLite: never use Prisma `mode: "insensitive"`** — it throws. `contains` is already
   case-insensitive for ASCII.
4. **After schema changes:** `DATABASE_URL="file:./prisma/dev.db" npx prisma migrate dev`
   → `npx prisma generate` → **restart the dev server** (Turbopack caches the old Prisma
   client and returns 500s otherwise). Prisma client is generated to `src/generated/prisma`.
5. **Money is stored in ₹ Lakhs** (Float). 1 Cr = 100 L. Use `fmt`/`fmtShort` helpers.
6. **Two authorization systems coexist:** DB-driven `AppRole`/`RolePageAccess`
   (`hasPermission` in `src/lib/rbac.ts`) AND hardcoded predicates in `src/lib/roles.ts`.
   Check which governs a given gate before changing it.
7. **`xlsx@0.18.5`** has a HIGH-severity advisory with no upstream fix (import feature).

## Session-ending rule
Before ending every session, update:
- `docs/PROJECT_MEMORY.md` (status, pending, issues)
- `docs/CHANGELOG.md` (what changed + next actions)

# userEmail
vijesh@caveoinfosystems.com
