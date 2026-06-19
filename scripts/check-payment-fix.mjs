import { chromium } from '@playwright/test';
import Database from 'better-sqlite3';
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext();
await ctx.addCookies([{ name: 'dev_employee_id', value: '4', domain: 'localhost', path: '/' }]); // manager
const p = await ctx.newPage();
let pass=0, fail=0; const check=(n,c,d='')=>{ if(c){console.log(`  ✅ ${n}`);pass++;}else{console.log(`  ❌ ${n} ${d}`);fail++;} };

const db = new Database('./prisma/dev.db');
// Simulate an imported invoice: cached amountReceived > 0 with NO ledger rows
const coll = db.prepare("SELECT id, invoiceValueLakhs FROM Collection ORDER BY id LIMIT 1").get();
db.prepare("DELETE FROM Payment WHERE collectionId=?").run(coll.id);
const invoiceVal = 10;
db.prepare("UPDATE Collection SET invoiceValueLakhs=?, amountReceivedLakhs=4, collectionStatus='Partially Received', paymentReceivedDate='2026-05-01T00:00:00.000Z' WHERE id=?").run(invoiceVal, coll.id);
console.log(`Setup: invoice ${coll.id} = ₹${invoiceVal}L, cached received ₹4L, 0 ledger rows`);

// ── TEST: record a ₹3L partial payment → should ADD to 4, not replace ──
console.log('\n── Partial payment adds to existing cached amount ──');
const r = await p.request.post('http://localhost:3000/api/payments', {
  data: { collectionId: coll.id, amountLakhs: 3, mode: 'UPI', referenceNo: 'PARTIAL-1' }
});
check('POST payment 201', r.status() === 201, `(${r.status()})`);
const { collection } = await r.json();
check('Received = 4 + 3 = 7 (added, not replaced)', Math.abs(collection.amountReceivedLakhs - 7) < 0.01, `got ${collection.amountReceivedLakhs}`);
check('Status still Partially Received', collection.collectionStatus === 'Partially Received', collection.collectionStatus);

// ledger should now have opening balance (4) + payment (3)
const ledger = await (await p.request.get(`http://localhost:3000/api/payments?collectionId=${coll.id}`)).json();
check('Ledger has 2 entries (opening + new)', ledger.length === 2, `got ${ledger.length}`);
check('Opening balance entry = 4', ledger.some(x => Math.abs(x.amountLakhs - 4) < 0.01 && x.mode === 'Opening Balance'), JSON.stringify(ledger.map(x=>({a:x.amountLakhs,m:x.mode}))));

// ── TEST: another payment of 3 → 7+3=10 → Fully Received ──
console.log('\n── Second payment completes invoice ──');
const r2 = await p.request.post('http://localhost:3000/api/payments', {
  data: { collectionId: coll.id, amountLakhs: 3, mode: 'Cheque', referenceNo: 'PARTIAL-2' }
});
const { collection: c2 } = await r2.json();
check('Received = 7 + 3 = 10', Math.abs(c2.amountReceivedLakhs - 10) < 0.01, `got ${c2.amountReceivedLakhs}`);
check('Status now Fully Received', c2.collectionStatus === 'Fully Received', c2.collectionStatus);
// opening balance only inserted ONCE (not again)
const ledger2 = await (await p.request.get(`http://localhost:3000/api/payments?collectionId=${coll.id}`)).json();
check('Opening balance inserted only once', ledger2.filter(x => x.mode === 'Opening Balance').length === 1, `count ${ledger2.filter(x=>x.mode==='Opening Balance').length}`);

// ── TEST: fully-paid hidden from default list ──
console.log('\n── Fully paid hidden from list ──');
await p.goto('http://localhost:3000/accounts', { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
// the default view is "outstanding" — this now-paid invoice should not appear
const custName = db.prepare("SELECT customerName FROM Collection WHERE id=?").get(coll.id).customerName;
const visibleInOutstanding = await p.locator(`table tbody tr:has-text("${custName}")`).count();
check('Fully-paid invoice hidden in Outstanding view', visibleInOutstanding === 0, `found ${visibleInOutstanding} (customer ${custName})`);
// switch to Fully Paid tab → it appears
await p.locator('button:has-text("Fully Paid")').click();
await p.waitForTimeout(600);
const visibleInPaid = await p.locator(`table tbody tr:has-text("${custName}")`).count();
check('Appears under Fully Paid tab', visibleInPaid > 0, `found ${visibleInPaid}`);
await p.screenshot({ path: 'test-results/accounts-payfix.png' });

db.close();
console.log(`\n═══ ${pass} passed, ${fail} failed ═══`);
await b.close();
process.exit(fail>0?1:0);
