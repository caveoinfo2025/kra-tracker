# Next Session — Resume Here

> Quick-start state for the next coding session. Overwritten at the end of every session.
> Last updated: 2026-06-19 — Session 9: UAT Environment Stood Up + Prod→UAT Data Migration

## Where to continue

**UAT is now live and working** — sign-in via Microsoft Entra ID succeeds, Manager Dashboard
loads with real prod-mirrored data. Session 7+8 CRM features (lead convert, lead delete +
audit log, RBAC role assignment, HR automation) are deployed to UAT and ready for testing
against real data.

### Immediate pending steps:

1. **Clean up migration scripts** — decide whether to commit or delete:
   - `prisma/uat-full-schema.sql`, `prisma/uat-prisma-tracking.sql` (one-time UAT schema bootstrap)
   - `prisma/seed-uat-manager.mjs` (superseded — Vijesh's manager record now comes from prod data)
   - `prisma/migrate-prod-to-uat.mjs` (useful to keep as a re-runnable refresh script, or delete if one-off)

2. **Test on UAT with real data:**
   - Convert lead → opportunity flow (`/pipeline/leads` → Convert →)
   - Delete lead with reason + check Deletion Log (manager-only)
   - RBAC role assignment (Settings → Identity & Access → Employees)

3. **Confirm push strategy to prod** — UAT branch is well ahead of `origin/master` (28+ commits
   before this session, more added since). Discuss with Vijesh before merging UAT → master.

## Last completed task (Session 9)

1. **UAT database created from scratch** — `u686730471_Caveo_UAT` had zero tables. Built and
   imported a full schema dump (19 migrations, ~2171 lines) via phpMyAdmin, then separately
   seeded the `_prisma_migrations` tracking table so Prisma considers history complete.

2. **Build script fixed** — `package.json` `build` no longer runs `prisma migrate deploy`.
   Hostinger/Passenger's env-var escaping (`%`→`\%`) breaks the Prisma CLI's URL-encoded
   password even though the same password works fine for the runtime client. Migrations are
   applied by hand via the existing `apply-*.mjs` script pattern instead.

3. **Production data copied into UAT** for testing — 26 tables, ~1700 rows total (CrmLead 280,
   Customer 93, CrmOpportunity 49, Employee 10, etc.). The 64 newer-module tables that exist
   only in UAT's schema (Admin Console, Policy Engine, Workflow Engine, Master Data Management,
   CRM/Finance Admin Engines, Performance/Communication/Integration/Security modules) were left
   untouched since prod doesn't have that data yet.

4. **Resolved three rounds of DB access issues** — wrong DB user, then unwhitelisted IPv4
   (dev machine), then unwhitelisted IPv6 (the Hostinger app server's own outbound IP for
   DB connections, `2a02:4780:11:1234::14e` — different from the dev machine's IP). This IPv6
   gap was the actual cause of the first sign-in failure (`pool timeout` wrapping an
   `Access denied` auth error).

## Session 7 + 8 work (still uncommitted to master — now deployed to UAT for testing)

1. SFDC-style Lead Form Standardization (`customerRefId`, `CustomerNameCombobox`, `ConvertModal`, convert endpoint)
2. RBAC Role Assignment (Settings → Identity & Access → Employees)
3. HR Automation (deactivate/suspend → auto-revoke UserRole)
4. Employee Form Dropdown Wiring
5. Lead Delete with Reason + Deletion Audit Log (manager-only log view; ownership-based delete)

## Current blockers

- **All work Sessions 5–9 is uncommitted to `master`** — UAT branch only. Confirm push
  strategy with Vijesh before merging to production.
- **Office WiFi IP** — CLAUDE.md shows `10.201.255.160`; update at office if changed.

## Priority tasks for next session

1. Test full convert + delete flows on UAT against real copied data
2. Legacy `lead-generation` form wiring (Phase 17 deferred): `customerId` + `CustomerNameCombobox`
3. `OrderAdvance` form: wire `customerId`
4. Finance backend wiring — pick one Finance Phase 2 page (e.g. Bank Book) and replace mock data with live API
5. Decide fate of one-off UAT bootstrap scripts (commit as documentation vs. delete)

## Files needing attention

| File | Reason |
|------|--------|
| `package.json` | `build` script changed — no longer runs `prisma migrate deploy` |
| `prisma/uat-full-schema.sql` | One-time UAT schema bootstrap — decide keep/delete |
| `prisma/uat-prisma-tracking.sql` | One-time `_prisma_migrations` seed — decide keep/delete |
| `prisma/migrate-prod-to-uat.mjs` | Re-runnable prod→UAT data refresh — decide keep/delete |
| `prisma/seed-uat-manager.mjs` | Superseded by prod data copy — likely delete |

## Start commands

```powershell
# Start dev server (hidden, logs to .next/dev-server.log)
$logFile = "C:\Users\VIJESHVIJAYAN\Code\kra-tracker\.next\dev-server.log"
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"C:\Users\VIJESHVIJAYAN\Code\kra-tracker`" && npm run dev > `"$logFile`" 2>&1" -WindowStyle Hidden

# UAT: https://uat.caveoinfosystems.com (Hostinger-hosted, separate Node app)
# Navigate to:
# /pipeline/leads          ← delete button (🗑) + Deletion Log toolbar button + Convert →
# /pipeline/leads/[id]     ← delete button + Convert → in header
```

## Context to restore (non-obvious)

- **Delete is logged to `AuditLog`** (not `CrmActivity`) — because CrmActivity has a FK to CrmLead and would cascade-delete with the lead. AuditLog has no FK to CrmLead so the entry survives.
- **`PROPOSAL_SENT` leads are hidden from the Leads view** — they live in Opportunities. After conversion, the lead disappears from the leads table (by design).
- **Convert is idempotent** — calling the convert endpoint twice with the same customerId is safe.
- **Migration pattern (Hostinger):** write SQL → `node apply-*.mjs` (uses mariadb driver + dotenv) → `node -e "..." prisma migrate resolve` → `npx prisma generate` → restart app. **`prisma migrate deploy` must NOT run as part of the build** (see Session 9 fix) — Passenger's env escaping breaks the CLI's DB auth even when the runtime client connects fine.
- **UAT DB user is `u686730471_caveouat`** (not `u686730471_Caveo_UAT` or `u686730471_caveo` — both were tried and failed). Prod DB user is `u686730471_caveoadmincrm` on database `u686730471_caveo_crm`.
- **The Hostinger app server connects to MySQL over IPv6**, not the same IP as a developer's local machine — when whitelisting in hPanel → Remote MySQL for an app-side connection issue, check for an IPv6 address in the error message, not just IPv4.
- **UAT and prod schemas have diverged** — UAT has 97 tables (includes newer modules not yet on prod), prod has 33. Any future data refresh from prod must map common columns only (see `migrate-prod-to-uat.mjs` for the pattern), not a blind table copy.
- **Phase 13 STOP directive is still active** — "Do not implement Governance module."
- **28+ commits ahead of origin/master** (pre-Session-9 baseline; more since) — large backlog. Confirm push strategy with Vijesh.
