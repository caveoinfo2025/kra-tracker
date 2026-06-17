# Phase 15 QuickStart — Run These Commands in Order

## All Files Ready ✅

```
scripts/phase15-seed-kra-metrics-templates.mjs          ✓ Ready
scripts/phase15-migrate-kra-to-employeetarget.mjs       ✓ Ready
src/app/kras/page-phase15.tsx                           ✓ Ready
src/app/kras/KrasClient-phase15.tsx                     ✓ Ready
src/app/api/kra/sync-achievements/route-phase15.ts      ✓ Ready
PHASE15-IMPLEMENTATION-GUIDE.md                         ✓ Reference
```

---

## Execute These 5 Commands (3–4 days)

### Day 1: Seed & Migrate

```bash
# 1. Seed KRA Metrics + Templates (5 min)
cd C:\Users\VIJESHVIJAYAN\Code\kra-tracker
node scripts/phase15-seed-kra-metrics-templates.mjs

# Expected: ✅ Created 15 KRAMetric records, 7 KRATemplate records

# 2. Migrate Legacy KRA → EmployeeTarget (10 min)
node scripts/phase15-migrate-kra-to-employeetarget.mjs

# Expected: ✅ Migrated 10 KRAs, 0 skipped
```

### Day 2: Update Files

```bash
# 3. Replace /kras page files
cp src/app/kras/page.tsx src/app/kras/page.backup.tsx
cp src/app/kras/page-phase15.tsx src/app/kras/page.tsx

cp src/app/kras/KrasClient.tsx src/app/kras/KrasClient.backup.tsx
cp src/app/kras/KrasClient-phase15.tsx src/app/kras/KrasClient.tsx

# 4. Create sync API route directory & file
mkdir -p src/app/api/kra/sync-achievements
cp src/app/api/kra/sync-achievements/route-phase15.ts src/app/api/kra/sync-achievements/route.ts
```

### Day 3: Test Locally

```bash
# 5. Start dev server & test
npm run dev

# Then in browser:
# - Open http://localhost:3000/login
# - Log in as manager
# - Go to http://localhost:3000/kras
# - Verify: employees + targets display
# - Click "Sync Achievements" button
# - Verify: metrics sync (check browser network tab + server logs)
```

### Day 4: Deploy to UAT

```bash
# Once tests pass locally:
git add -A
git commit -m "Phase 15: KRA consolidation (EmployeeTarget + metrics)

- Seed 15 KRAMetric + 7 KRATemplate records
- Migrate legacy KRA to EmployeeTarget system
- Update /kras page to display metrics breakdown
- Create sync API: POST /api/kra/sync-achievements
- Backward compatible fallback to legacy KRA

Closes #phase-15"

git push origin uat

# Then monitor hPanel for build completion (~3-5 min)
# Test at: https://uat.caveoinfosystems.com/kras
```

---

## What Each Script Does

| # | File | Does | Output |
|---|------|------|--------|
| 1 | `phase15-seed-kra-metrics-templates.mjs` | Creates KRAMetric + KRATemplate | 15 metrics, 7 templates |
| 2 | `phase15-migrate-kra-to-employeetarget.mjs` | Backfills EmployeeTarget + achievements | EmployeeTarget records |
| 3 | `page-phase15.tsx` | Fetch EmployeeTarget + legacy KRA | Both systems readable |
| 4 | `KrasClient-phase15.tsx` | Render EmployeeTargetCard + LegacyKRACard | Metrics breakdown + fallback |
| 5 | `route-phase15.ts` | Compute metric values automatically | POST /api/kra/sync-achievements |

---

## Key Points

✅ **No schema changes** — tables already exist (KRAMetric, KRATemplate, EmployeeTarget, KRAAchievement)

✅ **Backward compatible** — legacy KRA still works if employee has no EmployeeTarget

✅ **Zero data loss** — all KRA data migrated to new system

✅ **Low risk** — fallback mechanism means nothing breaks

⚠️ **One TODO** — Some metrics (COLLECTION_ONTIME, RETENTION_RATE) return placeholders (90%, 85%). Full implementation in Phase 16.

---

## Expected Results

**Before Phase 15:**
```
/kras page shows:
  - Each KRA as a card
  - Single progress % (guessed from activity title regex)
  - Manual WeeklyReview scores
```

**After Phase 15:**
```
/kras page shows:
  - Each EmployeeTarget as a card
  - Multiple metrics (Booking, Billing, QL Count, etc.)
  - Achievement % per metric (computed automatically)
  - Weighted overall score (0–10)
  - "Sync Achievements" button (manager only)
  - Fallback to legacy KRA if no EmployeeTarget
```

---

## Question: Why This Architecture?

**Old KRA System Problems:**
- Title-based regex matching (brittle; breaks if title changes)
- Manual progress entry (subjective; no source of truth)
- No formal metrics (just target string, no structure)
- Not wired to enterprise admin system

**New EmployeeTarget System Benefits:**
- Formal KRATemplate + KRAMetric definitions (reusable)
- Automatic computation from operational data (objective)
- Metrics tied to actual business performance (SalesFunnel, LeadGeneration, etc.)
- Foundation for Phase 16+ (RBAC, approvals, multi-tenant)
- "Only people with allocated KRA visible" ✓ (via EmployeeTarget status)

---

## Next Phase (Phase 16)

Once Phase 15 is stable on UAT, Phase 16 (RBAC Enforcement) will:
- Activate Role/Permission system (replace hardcoded `isManager` predicates)
- Wire DataAccessPolicy to all pages (OWN/TEAM/DEPARTMENT/COMPANY/ALL scopes)
- Update 143 API routes to call `requirePermission()`

---

## Support

For detailed steps and troubleshooting, see: `PHASE15-IMPLEMENTATION-GUIDE.md`

**Ready? Start with Step 1:**
```bash
cd C:\Users\VIJESHVIJAYAN\Code\kra-tracker
node scripts/phase15-seed-kra-metrics-templates.mjs
```

**Good luck! 🚀**
