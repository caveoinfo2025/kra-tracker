import { chromium } from '@playwright/test';

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
await ctx.addCookies([{ name: 'dev_employee_id', value: '4', domain: 'localhost', path: '/' }]);
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));

let pass = 0, fail = 0;
const check = (name, cond, detail='') => {
  if (cond) { console.log(`  ✅ ${name}`); pass++; }
  else { console.log(`  ❌ ${name} ${detail}`); fail++; }
};

// ─── DB baseline ───
import Database from 'better-sqlite3';
const db = new Database('./prisma/dev.db');
const sfByStage = db.prepare("SELECT stage, COUNT(*) c, ROUND(SUM(dealValueLakhs),1) v FROM SalesFunnel GROUP BY stage").all();
const sfMap = Object.fromEntries(sfByStage.map(r => [r.stage, r]));
const crmOpps = db.prepare("SELECT stage, COUNT(*) c FROM CrmOpportunity WHERE status='active'").all();
db.close();
console.log('\nDB baseline:');
console.log('  SalesFunnel:', JSON.stringify(sfMap));
console.log('  CRM active opps:', JSON.stringify(crmOpps));

const expectedWon = (sfMap['Closed Won']?.c ?? 0);
const expectedWonVal = (sfMap['Closed Won']?.v ?? 0);
const expectedNego = (sfMap['Negotiation']?.c ?? 0);
// Proposal Sent column = legacy Lead+Qualified+Solutioning+Proposal Sent + CRM PROPOSAL_SENT
const expectedProposalLegacy = (sfMap['Lead']?.c??0)+(sfMap['Qualified']?.c??0)+(sfMap['Solutioning']?.c??0)+(sfMap['Proposal Sent']?.c??0);

// ─── TEST 1: KANBAN VIEW ───
console.log('\n── TEST 1: Kanban renders legacy + CRM opps ──');
await p.goto('http://localhost:3000/pipeline/opportunities', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
await p.screenshot({ path: 'test-results/opp-kanban-merged.png' });

// Read column counts from kanban headers (badge next to label)
const colData = await p.evaluate(() => {
  const cols = [...document.querySelectorAll('.flex.gap-3 > div')];
  return cols.map(c => {
    const label = c.querySelector('.text-xs.font-bold')?.textContent?.trim();
    const count = c.querySelector('.rounded-full')?.textContent?.trim();
    return { label, count };
  }).filter(x => x.label);
});
console.log('  Kanban columns:', JSON.stringify(colData));
const wonCol = colData.find(c => c.label === 'Won');
check('Won column shows legacy deals', Number(wonCol?.count) === expectedWon, `(got ${wonCol?.count}, expected ${expectedWon})`);
const negoCol = colData.find(c => c.label === 'Negotiation');
check('Negotiation column shows legacy', Number(negoCol?.count) === expectedNego, `(got ${negoCol?.count}, expected ${expectedNego})`);

// Cards actually rendered in DOM
const cardCount = await p.locator('.flex.gap-3 .bg-white.rounded-lg').count();
check('Kanban renders cards (not empty)', cardCount > 50, `(${cardCount} cards)`);
const legacyBadges = await p.locator('text=Legacy').count();
check('Legacy badge present on cards', legacyBadges > 0, `(${legacyBadges} legacy badges)`);

// ─── TEST 2: KRA TILES ───
console.log('\n── TEST 2: KRA Activity tiles aligned ──');
const tiles = await p.evaluate(() => {
  const grids = [...document.querySelectorAll('.grid')];
  const kraGrid = grids.find(g => g.className.includes('sm:grid-cols-4'));
  return [...kraGrid.querySelectorAll('.text-xl.font-bold')].map(e => e.textContent.trim());
});
console.log('  KRA tiles [Proposals, FollowUps, Negotiations, Won]:', JSON.stringify(tiles));
check('Deals Won tile matches legacy count', Number(tiles[3]) === expectedWon, `(got ${tiles[3]}, expected ${expectedWon})`);
check('Negotiations tile matches', Number(tiles[2]) === expectedNego, `(got ${tiles[2]}, expected ${expectedNego})`);

// ─── TEST 3: STATS ───
console.log('\n── TEST 3: Won Value stat ──');
const wonValueTxt = await p.locator('.grid.grid-cols-3 > div').nth(2).innerText();
console.log('  Won Value tile:', wonValueTxt.replace('\n', ' '));
const wonValNum = parseFloat(wonValueTxt.replace(/[^\d.]/g, ''));
check('Won Value ≈ legacy total', Math.abs(wonValNum - expectedWonVal) < 1, `(got ${wonValNum}, expected ${expectedWonVal})`);

// ─── TEST 4: TABLE VIEW ───
console.log('\n── TEST 4: Table view renders legacy rows ──');
await p.locator('button:has-text("Table")').click();
await p.waitForTimeout(800);
await p.screenshot({ path: 'test-results/opp-table-merged.png' });
const rowCount = await p.locator('table tbody tr').count();
console.log('  Table rows:', rowCount);
const totalExpected = crmOpps.reduce((s,r)=>s+r.c,0) + Object.values(sfMap).reduce((s,r)=>s+r.c,0);
check('Table shows all opps (CRM+legacy)', rowCount === totalExpected, `(got ${rowCount}, expected ${totalExpected})`);
const tableLegacyBadges = await p.locator('table tbody tr span:has-text("Legacy")').count();
check('Table has legacy badges', tableLegacyBadges > 0, `(${tableLegacyBadges})`);

// ─── TEST 5: FILTER ───
console.log('\n── TEST 5: Search filter works on merged list ──');
await p.locator('input[placeholder="Search company…"]').fill('annex');
await p.waitForTimeout(600);
const filteredRows = await p.locator('table tbody tr').count();
check('Search filters merged rows', filteredRows > 0 && filteredRows < rowCount, `(${filteredRows} of ${rowCount})`);
await p.locator('input[placeholder="Search company…"]').fill('');
await p.waitForTimeout(400);

console.log(`\n═══ RESULT: ${pass} passed, ${fail} failed ═══`);
console.log('JS errors:', errs.length ? errs.join('; ') : 'NONE');
await b.close();
process.exit(fail > 0 ? 1 : 0);
