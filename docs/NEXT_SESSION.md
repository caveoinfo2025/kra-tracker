# Next Session — Resume Here

> Quick-start state for the next coding session. Overwritten at the end of every session.
> Last updated: 2026-06-18 — Session 8: Lead Delete with Reason + Deletion Audit Log

## Where to continue

**All session 7 + session 8 work is uncommitted. UAT DB migration still pending.**

### Immediate pending steps:

1. **UAT DB migration** — apply `prisma/apply-crm-lead-customer-ref.mjs` against UAT DB (`u686730471_Caveo_UAT`):
   ```powershell
   # On UAT server (or with UAT DATABASE_URL set):
   node prisma/apply-crm-lead-customer-ref.mjs
   # Then mark resolved:
   node -e "require('dotenv').config(); const { execSync } = require('child_process'); execSync('npx prisma migrate resolve --applied 20260618100000_crm_lead_customer_ref', { stdio: 'inherit', env: process.env });"
   npx prisma generate
   ```

2. **Push to UAT git** — after UAT migration confirmed:
   ```powershell
   git add -A
   git commit -m "feat(crm): SFDC-style lead standardization — CustomerNameCombobox, convert flow, HR automation, RBAC role assignment, lead delete with audit log"
   git push origin uat
   ```

4. **Apply UAT DB migration** on Hostinger (SSH or via hPanel phpMyAdmin):
   - Run the same 3 SQL statements from `prisma/migrations/20260618100000_crm_lead_customer_ref/migration.sql`
   - Or run `apply-crm-lead-customer-ref.mjs` with UAT DATABASE_URL

## Last completed task (Session 8)

All TypeScript-clean; verified in browser:

1. **Lead Delete with Reason** — users can delete their own leads; managers can delete any lead
   - `DELETE /api/pipeline/leads/[id]` — ownership check (not manager-only); requires `reason` in body
   - `AuditLog` entry written before deletion: snapshot of title, company, stage, owner, value + reason
   - 🗑 button in table row: visible to lead owner + managers
   - 🗑 Delete button in detail page header: visible to anyone with `canEdit` (owner or manager)
   - `DeleteLeadModal` in both surfaces — requires reason, disabled until text entered, irreversibility warning

2. **Lead Deletion Audit Log** (manager-only)
   - `GET /api/pipeline/leads/deletion-log` — returns all `AuditLog` entries for deleted leads with performer name
   - **Deletion Log** button in leads toolbar (managers only) — opens modal table: lead name, stage, deleted by, reason, date
   - Lazy-loaded on first open; cached for the session

## Session 7 work (still uncommitted)

1. SFDC-style Lead Form Standardization (`customerRefId`, `CustomerNameCombobox`, `ConvertModal`, convert endpoint)
2. RBAC Role Assignment (Settings → Identity & Access → Employees)
3. HR Automation (deactivate/suspend → auto-revoke UserRole)
4. Employee Form Dropdown Wiring

## Current blockers

- **UAT DB migration not yet applied** — `20260618100000_crm_lead_customer_ref` must be run against `u686730471_Caveo_UAT` before the Leads page works on UAT.
- **All work Sessions 5–8 is uncommitted** — confirm push strategy with Vijesh before committing.
- **Office WiFi IP** — CLAUDE.md shows `10.201.255.160`; update at office if changed.

## Priority tasks for next session

1. Apply UAT DB migration + push to UAT git → confirm on UAT server
2. Test full convert + delete flows on UAT
3. Legacy `lead-generation` form wiring (Phase 17 deferred): `customerId` + `CustomerNameCombobox`
4. `OrderAdvance` form: wire `customerId`
5. Finance backend wiring — pick one Finance Phase 2 page (e.g. Bank Book) and replace mock data with live API

## Files needing attention

| File | Reason |
|------|--------|
| `prisma/apply-crm-lead-customer-ref.mjs` | Must be run against UAT before deploying |
| `src/app/api/pipeline/leads/[id]/route.ts` | DELETE now ownership-based; AuditLog write |
| `src/app/api/pipeline/leads/deletion-log/route.ts` | New — manager-only audit log endpoint |
| `src/app/pipeline/leads/LeadsClient.tsx` | Delete button + Deletion Log panel |
| `src/app/pipeline/leads/[id]/LeadDetailClient.tsx` | Delete button in header (canEdit gate) |

## Start commands

```powershell
# Start dev server (hidden, logs to .next/dev-server.log)
$logFile = "C:\Users\VIJESHVIJAYAN\Code\kra-tracker\.next\dev-server.log"
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"C:\Users\VIJESHVIJAYAN\Code\kra-tracker`" && npm run dev > `"$logFile`" 2>&1" -WindowStyle Hidden

# Navigate to:
# http://localhost:3000/pipeline/leads          ← delete button (🗑) + Deletion Log toolbar button
# http://localhost:3000/pipeline/leads/[id]     ← delete button in header
```

## Context to restore (non-obvious)

- **Delete is logged to `AuditLog`** (not `CrmActivity`) — because CrmActivity has a FK to CrmLead and would cascade-delete with the lead. AuditLog has no FK to CrmLead so the entry survives.
- **`PROPOSAL_SENT` leads are hidden from the Leads view** — they live in Opportunities. After conversion, the lead disappears from the leads table (by design).
- **Convert is idempotent** — calling the convert endpoint twice with the same customerId is safe.
- **Migration pattern (Hostinger):** write SQL → `node apply-*.mjs` (uses mariadb driver + dotenv) → `node -e "..." prisma migrate resolve` → `npx prisma generate` → restart dev server.
- **Phase 13 STOP directive is still active** — "Do not implement Governance module."
- **28+ commits ahead of origin/master** — large backlog. Confirm push strategy with Vijesh.
