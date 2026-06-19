import { chromium } from '@playwright/test';
const b = await chromium.launch({ headless: true });
// iPhone-ish viewport
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.addCookies([{ name: 'dev_employee_id', value: '4', domain: 'localhost', path: '/' }]); // manager Vijesh
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
let pass = 0, fail = 0;
const check = (n, c, d='') => { if (c) { console.log(`  ✅ ${n}`); pass++; } else { console.log(`  ❌ ${n} ${d}`); fail++; } };

await p.goto('http://localhost:3000/mobile', { waitUntil: 'networkidle' });
await p.waitForTimeout(2000);
await p.screenshot({ path: 'test-results/m-home.png' });

// ── TEST 1: API — log call activity ──
console.log('\n── TEST 1: POST activity (call) API ──');
const leadResp = await p.request.get('http://localhost:3000/api/pipeline/leads?limit=1');
const leadData = await leadResp.json();
const firstLead = leadData.rows?.[0];
check('Has a lead to test', !!firstLead, '(no leads)');
if (firstLead) {
  const r = await p.request.post(`http://localhost:3000/api/pipeline/leads/${firstLead.id}/activity`, {
    data: { action: 'call', description: '📞 Call: test call from mobile test' }
  });
  check('Log call returns 201', r.status() === 201, `(got ${r.status()})`);
  const r2 = await p.request.post(`http://localhost:3000/api/pipeline/leads/${firstLead.id}/activity`, {
    data: { action: 'meeting', description: '🤝 Meeting: test meeting' }
  });
  check('Log meeting returns 201', r2.status() === 201, `(got ${r2.status()})`);
  // Verify it appears in GET
  const g = await p.request.get(`http://localhost:3000/api/pipeline/leads/${firstLead.id}/activity`);
  const acts = await g.json();
  check('Logged activity appears in timeline', acts.some(a => a.description?.includes('test call')), '');
}

// ── TEST 2: Team API (manager) ──
console.log('\n── TEST 2: GET /api/mobile/team ──');
const t = await p.request.get('http://localhost:3000/api/mobile/team');
check('Team API returns 200', t.status() === 200, `(got ${t.status()})`);
const td = await t.json();
check('Team API has team array', Array.isArray(td.team), '');
check('Team API has totals', !!td.totals, '');
console.log('  team size:', td.team?.length, '| totals:', JSON.stringify(td.totals));

// ── TEST 3: UI — Quick Log call opens sheet ──
console.log('\n── TEST 3: Quick Log → Log Call opens sheet ──');
// Tap the center FAB (+)
await p.locator('.m-tab.fab').click();
await p.waitForTimeout(600);
const quickLogVisible = await p.locator('text=Quick log').count();
check('Quick log sheet opens', quickLogVisible > 0);
await p.locator('.m-sheet-body button:has-text("Log Call")').click();
await p.waitForTimeout(600);
const logCallSheet = await p.locator('h2:has-text("Log Call")').count();
check('Log Call sheet opens (not dead)', logCallSheet > 0);
await p.screenshot({ path: 'test-results/m-logcall.png' });
// Close
await p.keyboard.press('Escape').catch(()=>{});
await p.locator('.m-sheet-overlay').first().click({ position: { x: 10, y: 10 } }).catch(()=>{});
await p.waitForTimeout(400);

// ── TEST 4: UI — Me → Team Overview (manager) ──
console.log('\n── TEST 4: Me → Team Overview ──');
await p.locator('.m-tab:has-text("Me")').click();
await p.waitForTimeout(800);
await p.screenshot({ path: 'test-results/m-me.png' });
const teamOverviewBtn = await p.locator('text=Team Overview').count();
check('Team Overview menu item present', teamOverviewBtn > 0);
await p.locator('.row-title:has-text("Team Overview")').click();
await p.waitForTimeout(1000);
const onTeamScreen = await p.locator('h1:has-text("Team Overview")').count();
check('Team Overview screen opens (not dead)', onTeamScreen > 0);
await p.screenshot({ path: 'test-results/m-team.png' });

console.log(`\n═══ ${pass} passed, ${fail} failed ═══`);
console.log('JS errors:', errs.length ? errs.join('; ') : 'NONE');
await b.close();
process.exit(fail > 0 ? 1 : 0);
