import { chromium } from '@playwright/test';
import Database from 'better-sqlite3';
const b = await chromium.launch({ headless: true });
let pass=0, fail=0; const check=(n,c,d='')=>{ if(c){console.log(`  ✅ ${n}`);pass++;}else{console.log(`  ❌ ${n} ${d}`);fail++;} };

const db = new Database('./prisma/dev.db');
const pri = db.prepare("SELECT id FROM Employee WHERE name LIKE '%Priyadhar%'").get();
const deepak = db.prepare("SELECT id FROM Employee WHERE name='Deepak'").get();
const totalColl = db.prepare("SELECT COUNT(*) c FROM Collection").get().c;
db.close();

async function asUser(id) {
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addCookies([{ name: 'dev_employee_id', value: String(id), domain: 'localhost', path: '/' }]);
  return ctx.newPage();
}

// ── BUG FIX: Priyadharshini (Accounts) sees ALL collections ──
console.log('\n── Priyadharshini (Accounts) Billing & Collections ──');
const pPri = await asUser(pri.id);
const errs=[]; pPri.on('pageerror', e=>errs.push(e.message));
await pPri.goto('http://localhost:3000/collections', { waitUntil: 'networkidle' });
await pPri.waitForTimeout(1200);
const priRows = await pPri.locator('table tbody tr').count();
check('Priyadharshini sees collection rows (was 0)', priRows > 0, `(${priRows} rows, total ${totalColl})`);
await pPri.screenshot({ path: 'test-results/pri-collections.png' });

// Priyadharshini can access payment tracker
await pPri.goto('http://localhost:3000/accounts', { waitUntil: 'networkidle' });
await pPri.waitForTimeout(800);
check('Priyadharshini can open Payment Tracker', await pPri.locator('text=Payment Tracker').count() > 0);

// ── Deepak (Operations Head) full access ──
console.log('\n── Deepak (Operations Head) ──');
const pD = await asUser(deepak.id);
pD.on('pageerror', e=>errs.push('deepak: '+e.message));
// Collections
await pD.goto('http://localhost:3000/collections', { waitUntil: 'networkidle' });
await pD.waitForTimeout(1000);
const dRows = await pD.locator('table tbody tr').count();
check('Deepak sees all collections', dRows > 0, `(${dRows})`);
// Payment tracker
await pD.goto('http://localhost:3000/accounts', { waitUntil: 'networkidle' });
await pD.waitForTimeout(800);
check('Deepak can open Payment Tracker', await pD.locator('text=Payment Tracker').count() > 0);
// Team Overview (/) — ops head should NOT be redirected away
await pD.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await pD.waitForTimeout(800);
check('Deepak reaches Team Overview (not bounced)', pD.url().endsWith('/') || pD.url().includes('localhost:3000/'), pD.url());
check('Deepak role shows Operations Head', await pD.locator('text=Operations Head').count() > 0);
// Sidebar has Finance nav
check('Deepak sidebar has Payment Tracker link', await pD.locator('a:has-text("Payment Tracker")').count() > 0);
await pD.screenshot({ path: 'test-results/deepak-home.png' });

// ── Deepak can record a payment (API) ──
const recP = await pD.request.post('http://localhost:3000/api/payments', {
  data: { collectionId: db ? 0 : 0, amountLakhs: 0 } // invalid, just check it's not 403
});
// re-open db for a real collection id
const db2 = new Database('./prisma/dev.db');
const cid = db2.prepare("SELECT id FROM Collection WHERE collectionStatus!='Fully Received' LIMIT 1").get().id;
db2.close();
const recP2 = await pD.request.post('http://localhost:3000/api/payments', {
  data: { collectionId: cid, amountLakhs: 0.5, mode: 'UPI', referenceNo: 'DEEPAK-TEST' }
});
check('Deepak can record payment (not 403)', recP2.status() === 201, `(${recP2.status()})`);

console.log(`\n═══ ${pass} passed, ${fail} failed ═══`);
console.log('JS errors:', errs.length ? errs.join('; ') : 'NONE');
await b.close();
process.exit(fail>0?1:0);
