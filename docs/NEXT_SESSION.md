# Next Session — Resume Here

> Quick-start state for the next coding session. Overwritten at the end of every session.
> Last updated: 2026-06-05 — Phase 8 CRM Admin Engine + Approval wiring + Lead→Opp flow + Opp close-won/lost + legacy promotion.

## Where to continue

**⚠️ Working tree has LARGE uncommitted changes this session (14 modified + ~10 new dirs). NOTHING is committed yet. Confirm with Vijesh, then commit in logical chunks before pushing.**

Dev DB has 4 NEW migrations applied this session (all via SSH-apply + `migrate resolve`):
```
20260605000000_opportunity_discount_pct          → CrmOpportunity.discountPct
20260605010000_crm_admin_engine                  → 7 CRM admin tables
20260605020000_opportunity_won_fields            → dealValueExTax, netMargin, poNumber, poDate
20260605030000_legacy_promote_and_net_profit     → netMargin→netProfitLakhs, SalesFunnel.crmOpportunityId
```

## Last completed task

All complete and **verified in browser**, all **UNCOMMITTED**:

1. **Approval Engine wired into CRM flows** (fire-and-forget, never blocks save):
   - Opportunity PATCH → `LARGE_DEAL_APPROVAL` (value first crosses ₹50L) + `DISCOUNT_APPROVAL` (discountPct first > 0)
   - New `POST /api/expenses` → `EXPENSE_APPROVAL` (amount > ₹0.10L on submit)
2. **Phase 8 — CRM Administration Engine** at `/settings/crm` (5 tabs: Pipelines, Territories, Assignment Rules, Automation, SLA Rules). Service layer `src/lib/crm-engine/` (6 files), 7 API routes under `/api/admin/crm/`, seed `prisma/seed-crm-defaults.ts`.
3. **CRM Admin moved under Settings** — card in `AdminConsole.tsx`; removed standalone sidebar link.
4. **Pipeline stages aligned with live data** — "Opportunity Pipeline" (OPP_STAGES) + "Lead Pipeline" (LEAD_STAGES) seeded to match `src/types/pipeline.ts` exactly.
5. **Automation wired to live events** — `executeAutomation()` on `lead.created` + `opportunity.stage_changed/won/lost`.
6. **SLA indicators** — LeadCard badges, opp-card badge, leads-table SLA column.
7. **Lead → Opportunity auto-move on PROPOSAL_SENT** — PROPOSAL_SENT leads excluded from Leads view (DB-level `stage: { not: "PROPOSAL_SENT" }`); stage→PROPOSAL_SENT auto-navigates to the opportunity; stage dropdown + stats updated.
8. **Opportunity full edit + Close Won/Lost flow** — `OppDetailClient` rewrite: Close Won modal (Deal Value ex-tax *, Net Profit ₹L, PO Number *, PO Date), Close Lost modal (reason *). WON/LOST become **locked read-only** (non-managers blocked at API with 403).
9. **Legacy/imported deal promotion** — "Open →" on a legacy SalesFunnel deal calls `POST /api/pipeline/opportunities/promote` → creates CrmLead + CrmOpportunity, sets `SalesFunnel.crmOpportunityId`, navigates to the full detail page. Idempotent. Removed the limited `LegacyEditModal`.
10. **Net profit is now absolute ₹L** (was %) — DB col `netMargin`→`netProfitLakhs`; all labels/displays show `₹X.XXL`.

## Recommended next steps

1. **Commit the uncommitted work** (confirm with Vijesh; stage in chunks):
   - `feat(approvals): wire startApproval into opportunity/discount/expense`
   - `feat(crm-engine): Phase 8 CRM Administration Engine + /settings/crm`
   - `feat(pipeline): lead→opportunity auto-move on PROPOSAL_SENT + SLA badges`
   - `feat(pipeline): opportunity full edit, close-won/lost, legacy promotion, net profit in ₹L`
2. **STOP point honored** — user said do NOT implement the Finance Operations backend module this round.
3. **Wire `executeAutomation` dispatch actions** — `send_notification` is a placeholder; hook into the `Notification` model.
4. **Promote-on-bulk** — consider a "Promote all legacy" admin action (currently one-at-a-time via "Open →").
5. **Push to production** — only after commit + `next build` + Vijesh confirms.

## Current blockers

- **None functional** — all features verified in the preview browser.
- Dev DB user `u686730471_devuser` is capped at **500 connections/hour** — heavy seeding/migration loops can exhaust it (recovers after ~1h). Not a code bug.
- Production unchanged — confirm `200` on `/login` before any push.

## Start commands

```powershell
npm run dev                       # http://localhost:3000 → /login → quick-login as Vijesh (Manager)

# Re-apply migrations if needed (already applied to dev):
$env:DATABASE_URL="mysql://u686730471_devuser:Caveo%402026@srv2201.hstgr.io:3306/u686730471_caveodev"
npx prisma migrate deploy
npx prisma generate               # then RESTART dev server (Turbopack caches old client)

# Pre-push:
npx prisma validate ; npx tsc --noEmit ; npx next build
```

## Context to restore (non-obvious)

- **Prisma acronym casing** — generated client uses `prisma.cRMAutomationRule` and `prisma.sLARule` (lowercased first letter of the acronym), and model type imports are `CRMAutomationRuleModel`/`SLARuleModel` from `@/generated/prisma/models/<Name>`. The crm-engine service files re-export friendly aliases (`CRMAutomationRule`, `SLARule`).
- **Hostinger has no shadow DB** → `prisma migrate dev` fails (P3014). Pattern used all session: write migration SQL by hand → apply via a one-off `node apply-*.mjs` (mariadb driver) → `prisma migrate resolve --applied <name>` → `prisma generate` → **restart dev server**.
- **netProfitLakhs** is the renamed column (was `netMargin`). It is an **absolute ₹ Lakhs** value now, NOT a percentage. Existing test rows seeded before the rename may hold a stale "%" number.
- **Legacy promotion is idempotent** via `SalesFunnel.crmOpportunityId`; promoted rows are filtered out of the legacy list (`crmOpportunityId: null`). A customer can still show 2 rows if it has multiple distinct SalesFunnel deals — that's expected, not a duplicate.
- **PROPOSAL_SENT leads are intentionally hidden** from the Leads page (both server page and `/api/pipeline/leads` GET use `stage: { not: "PROPOSAL_SENT" }` as default). They live on the Opportunities page.
- **crm-engine is pre-migration-safe** — every DB call is wrapped in try/catch returning safe defaults `[]`/`null`, so missing tables never crash a page.
- **Turbopack new-file gotcha bit us repeatedly** — after creating a new API route file, the route 404s until you touch an existing file in it (or restart). Editing existing files hot-reloads fine.
- **session.user.employeeId** (not `.id`) — all new API routes use `session.user.employeeId!`.
- **Approval triggers are fire-and-forget** — wrapped so a missing/unconfigured workflow silently skips; the save never fails because of approvals.
