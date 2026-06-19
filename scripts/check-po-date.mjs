import { chromium } from '@playwright/test';
import Database from 'better-sqlite3';

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
await ctx.addCookies([{ name: 'dev_employee_id', value: '4', domain: 'localhost', path: '/' }]);
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
let pass = 0, fail = 0;
const check = (n, c, d='') => { if (c) { console.log(`  ✅ ${n}`); pass++; } else { console.log(`  ❌ ${n} ${d}`); fail++; } };

// ── TEST 1: PO Date mandatory on Closed Won (API rejects missing) ──
console.log('\n── TEST 1: POST Closed Won without PO date is rejected ──');
const r1 = await p.request.post('http://localhost:3000/api/sales-funnel', {
  data: { customerName: 'PO Test Co', opportunityName: 'Test Deal', stage: 'Closed Won', dealValueLakhs: 5 }
});
check('Rejects Closed Won w/o PO date', r1.status() === 400, `(got ${r1.status()})`);
const body1 = await r1.json();
check('Error mentions PO Date', /PO Date/i.test(body1.error ?? ''), `(${body1.error})`);

// ── TEST 2: POST Closed Won WITH PO date succeeds + closedDate mirrors ──
console.log('\n── TEST 2: POST Closed Won with PO date ──');
const r2 = await p.request.post('http://localhost:3000/api/sales-funnel', {
  data: { customerName: 'PO Test Co', opportunityName: 'Test Deal 2', stage: 'Closed Won', dealValueLakhs: 5, poDate: '2026-03-15' }
});
check('Accepts Closed Won with PO date', r2.status() === 201, `(got ${r2.status()})`);
const created = await r2.json();
check('poDate saved', created.poDate?.slice(0,10) === '2026-03-15', `(${created.poDate})`);
check('closedDate mirrors poDate', created.closedDate?.slice(0,10) === '2026-03-15', `(${created.closedDate})`);

// ── TEST 3: Legacy edit via PUT — set PO date on an existing Closed Won ──
console.log('\n── TEST 3: Edit legacy Closed Won, set PO date ──');
const db = new Database('./prisma/dev.db');
const legacyWon = db.prepare("SELECT id, poDate, closedDate FROM SalesFunnel WHERE stage='Closed Won' AND poDate IS NULL LIMIT 1").get();
db.close();
if (legacyWon) {
  console.log('  target legacy row id:', legacyWon.id, '(poDate was null)');
  const r3 = await p.request.put(`http://localhost:3000/api/sales-funnel/${legacyWon.id}`, {
    data: { stage: 'Closed Won', poDate: '2025-12-01' }
  });
  check('PUT legacy with PO date OK', r3.status() === 200, `(got ${r3.status()})`);
  const upd = await r3.json();
  check('Legacy poDate now set', upd.poDate?.slice(0,10) === '2025-12-01', `(${upd.poDate})`);
  check('Legacy closedDate mirrors PO', upd.closedDate?.slice(0,10) === '2025-12-01', `(${upd.closedDate})`);

  // Try to clear PO date on Closed Won — should be rejected
  const r3b = await p.request.put(`http://localhost:3000/api/sales-funnel/${legacyWon.id}`, {
    data: { stage: 'Closed Won', poDate: null }
  });
  check('Rejects clearing PO on Closed Won', r3b.status() === 400, `(got ${r3b.status()})`);
} else {
  console.log('  (no null-poDate legacy Closed Won found — skipping)');
}

// ── TEST 4: Opportunities page renders Edit button + PO column ──
console.log('\n── TEST 4: Opportunities page legacy Edit + PO column ──');
await p.goto('http://localhost:3000/pipeline/opportunities', { waitUntil: 'networkidle' });
await p.locator('button:has-text("Table")').click();
await p.waitForTimeout(800);
const headers = await p.locator('table thead th').allInnerTexts();
check('PO Date column present', headers.some(h => /PO Date/i.test(h)), `(${headers.join(',')})`);
const editBtns = await p.locator('table tbody button:has-text("Edit")').count();
check('Legacy rows have Edit button', editBtns > 0, `(${editBtns} edit buttons)`);

// Open edit modal
await p.locator('table tbody button:has-text("Edit")').first().click();
await p.waitForTimeout(500);
const modalVisible = await p.locator('text=Edit Legacy Deal').count();
check('Edit modal opens', modalVisible > 0);
await p.screenshot({ path: 'test-results/legacy-edit-modal.png' });

console.log(`\n═══ ${pass} passed, ${fail} failed ═══`);
console.log('JS errors:', errs.length ? errs.join('; ') : 'NONE');
await b.close();
process.exit(fail > 0 ? 1 : 0);
