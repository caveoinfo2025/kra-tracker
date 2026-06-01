import { chromium } from '@playwright/test';
import Database from 'better-sqlite3';
const b = await chromium.launch({ headless: true });
let pass=0, fail=0; const check=(n,c,d='')=>{ if(c){console.log(`  ✅ ${n}`);pass++;}else{console.log(`  ❌ ${n} ${d}`);fail++;} };

const db = new Database('./prisma/dev.db');
// Find a collection owned by a NON-manager rep, and one owned by manager(4)
const repColl = db.prepare("SELECT c.id, c.employeeId, c.customerName FROM Collection c JOIN Employee e ON e.id=c.employeeId WHERE e.isManager=0 LIMIT 1").get();
const repId = repColl.employeeId;
console.log('Rep collection:', JSON.stringify(repColl), 'repId:', repId);

// record a payment via API as manager (accounts/manager can record), on the REP's invoice
const ctxM = await b.newContext();
await ctxM.addCookies([{ name: 'dev_employee_id', value: '4', domain: 'localhost', path: '/' }]);
const pM = await ctxM.newPage();
const rec = await pM.request.post('http://localhost:3000/api/payments', {
  data: { collectionId: repColl.id, amountLakhs: 3.33, mode: 'UPI', referenceNo: 'COLL-WIDGET-TEST' }
});
check('Payment recorded on rep invoice', rec.status() === 201, `(${rec.status()})`);

// ── Manager view: company-wide, scope=all, includes the payment ──
console.log('\n── Manager (company-wide) ──');
const mToday = await (await pM.request.get('http://localhost:3000/api/payments/today')).json();
check('Manager scope = all', mToday.scope === 'all', mToday.scope);
check('Manager total includes 3.33', mToday.totalLakhs >= 3.33, String(mToday.totalLakhs));

// ── Rep view: scoped to own, sees the payment (it's their invoice) ──
console.log('\n── Rep (own invoices) ──');
const ctxR = await b.newContext();
await ctxR.addCookies([{ name: 'dev_employee_id', value: String(repId), domain: 'localhost', path: '/' }]);
const pR = await ctxR.newPage();
const rToday = await (await pR.request.get('http://localhost:3000/api/payments/today')).json();
check('Rep scope = mine', rToday.scope === 'mine', rToday.scope);
check('Rep sees own payment (>=3.33)', rToday.totalLakhs >= 3.33, String(rToday.totalLakhs));
check('Rep payment is their customer', rToday.payments.some(x => x.customerName === repColl.customerName));

// ── A DIFFERENT rep should NOT see it ──
const otherRep = db.prepare("SELECT id FROM Employee WHERE isManager=0 AND id!=? LIMIT 1").get(repId);
const ctxO = await b.newContext();
await ctxO.addCookies([{ name: 'dev_employee_id', value: String(otherRep.id), domain: 'localhost', path: '/' }]);
const pO = await ctxO.newPage();
const oToday = await (await pO.request.get('http://localhost:3000/api/payments/today')).json();
check('Other rep does NOT see this customer', !oToday.payments.some(x => x.customerName === repColl.customerName), `total ${oToday.totalLakhs}`);

// ── UI: manager dashboard shows "Collections Today", rep shows "My Collections Today" ──
console.log('\n── UI widgets ──');
await pM.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
await pM.waitForTimeout(1200);
check('Manager dashboard: Collections Today widget', await pM.locator('text=Collections Today').count() > 0);
await pM.screenshot({ path: 'test-results/dash-coll-mgr.png', fullPage: true });

await pR.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
await pR.waitForTimeout(1200);
check('Rep dashboard: My Collections Today widget', await pR.locator('text=My Collections Today').count() > 0);
await pR.screenshot({ path: 'test-results/dash-coll-rep.png', fullPage: true });

const errs=[]; pR.on('pageerror', e=>errs.push(e.message));
db.close();
console.log(`\n═══ ${pass} passed, ${fail} failed ═══`);
await b.close();
process.exit(fail>0?1:0);
