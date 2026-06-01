import { chromium } from '@playwright/test';
import Database from 'better-sqlite3';
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext();
await ctx.addCookies([{ name: 'dev_employee_id', value: '4', domain: 'localhost', path: '/' }]); // manager Vijesh
const p = await ctx.newPage();
let pass=0, fail=0; const check=(n,c,d='')=>{ if(c){console.log(`  ✅ ${n}`);pass++;}else{console.log(`  ❌ ${n} ${d}`);fail++;} };

const db = new Database('./prisma/dev.db');
// pick an invoice with a balance
const coll = db.prepare("SELECT id, invoiceValueLakhs, amountReceivedLakhs, customerName FROM Collection ORDER BY id LIMIT 1").get();
console.log('Test invoice:', JSON.stringify(coll));
const beforeNotifs = db.prepare("SELECT COUNT(*) c FROM Notification").get().c;

// ── TEST 1: record a payment ──
console.log('\n── TEST 1: Record payment → ledger + cache sync + notifications ──');
const before = coll.amountReceivedLakhs;
const r1 = await p.request.post('http://localhost:3000/api/payments', {
  data: { collectionId: coll.id, amountLakhs: 1.5, mode: 'UPI', referenceNo: 'TEST-UTR-1' }
});
check('POST payment 201', r1.status() === 201, `(${r1.status()})`);
const j1 = await r1.json();
check('Payment row returned', !!j1.payment?.id);
check('Collection cache updated', Math.abs((j1.collection?.amountReceivedLakhs ?? 0) - (before + 1.5)) < 0.01, `got ${j1.collection?.amountReceivedLakhs}, expected ${before+1.5}`);
check('Status reflects partial/full', ['Partially Received','Fully Received'].includes(j1.collection?.collectionStatus), j1.collection?.collectionStatus);
// notifications fired (managers + rep, minus recorder)
const afterNotifs = db.prepare("SELECT COUNT(*) c FROM Notification").get().c;
check('Notifications created', afterNotifs > beforeNotifs, `before ${beforeNotifs} after ${afterNotifs}`);

// ── TEST 2: ledger GET ──
console.log('\n── TEST 2: Payment ledger ──');
const r2 = await p.request.get(`http://localhost:3000/api/payments?collectionId=${coll.id}`);
const ledger = await r2.json();
check('Ledger has the payment', Array.isArray(ledger) && ledger.some(x => x.referenceNo === 'TEST-UTR-1'));

// ── TEST 3: advance → apply ──
console.log('\n── TEST 3: Advance recorded then applied to invoice ──');
const ra = await p.request.post('http://localhost:3000/api/advances', {
  data: { customerName: coll.customerName, amountLakhs: 0.75, mode: 'Cheque', referenceNo: 'ADV-1' }
});
check('POST advance 201', ra.status() === 201, `(${ra.status()})`);
const adv = await ra.json();
check('Advance is unapplied', adv.status === 'unapplied');
const balBefore = (await (await p.request.get(`http://localhost:3000/api/payments?collectionId=${coll.id}`)).json()).reduce((s,x)=>s+x.amountLakhs,0);
const rApply = await p.request.post(`http://localhost:3000/api/advances/${adv.id}/apply`, {
  data: { collectionId: coll.id }
});
check('Apply advance 200', rApply.status() === 200, `(${rApply.status()})`);
const applied = await rApply.json();
check('Applied advance became a payment', Math.abs((applied.collection?.amountReceivedLakhs ?? 0) - (j1.collection.amountReceivedLakhs + 0.75)) < 0.01, `got ${applied.collection?.amountReceivedLakhs}`);
// advance now applied
const advRow = db.prepare("SELECT status, appliedToCollectionId FROM OrderAdvance WHERE id=?").get(adv.id);
check('Advance marked applied', advRow.status === 'applied' && advRow.appliedToCollectionId === coll.id, JSON.stringify(advRow));
// re-applying should fail
const rReapply = await p.request.post(`http://localhost:3000/api/advances/${adv.id}/apply`, { data: { collectionId: coll.id } });
check('Re-applying rejected (400)', rReapply.status() === 400, `(${rReapply.status()})`);

// ── TEST 4: daily summary ──
console.log('\n── TEST 4: Payments today summary ──');
const rt = await p.request.get('http://localhost:3000/api/payments/today');
const today = await rt.json();
check('Today total >= 2.25L', today.totalLakhs >= 2.25, `got ${today.totalLakhs}`);
check('Today count >= 2', today.count >= 2, `got ${today.count}`);

// ── TEST 5: RBAC — employee cannot record payment ──
console.log('\n── TEST 5: RBAC — sales employee blocked ──');
const ctx2 = await b.newContext();
await ctx2.addCookies([{ name: 'dev_employee_id', value: '5', domain: 'localhost', path: '/' }]); // employee
const p2 = await ctx2.newPage();
const rEmp = await p2.request.post('http://localhost:3000/api/payments', { data: { collectionId: coll.id, amountLakhs: 1 } });
check('Employee POST payment 403', rEmp.status() === 403, `(${rEmp.status()})`);

// ── TEST 6: notifications API for the rep ──
console.log('\n── TEST 6: Notifications visible to recipient ──');
const repId = db.prepare("SELECT employeeId FROM Collection WHERE id=?").get(coll.id).employeeId;
db.close();
const ctx3 = await b.newContext();
await ctx3.addCookies([{ name: 'dev_employee_id', value: String(repId), domain: 'localhost', path: '/' }]);
const p3 = await ctx3.newPage();
const rN = await p3.request.get('http://localhost:3000/api/notifications');
const nd = await rN.json();
check('Rep has payment notifications', Array.isArray(nd.notifications) && nd.notifications.some(x => x.type === 'payment'), `unread ${nd.unread}`);

console.log(`\n═══ ${pass} passed, ${fail} failed ═══`);
await b.close();
process.exit(fail>0?1:0);
