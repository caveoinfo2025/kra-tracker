import { chromium } from '@playwright/test';
import Database from 'better-sqlite3';
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
await ctx.addCookies([{ name: 'dev_employee_id', value: '4', domain: 'localhost', path: '/' }]); // manager owns lead 1
const p = await ctx.newPage();
const errs=[]; p.on('pageerror', e=>errs.push(e.message));
let pass=0, fail=0; const check=(n,c,d='')=>{ if(c){console.log(`  ✅ ${n}`);pass++;}else{console.log(`  ❌ ${n} ${d}`);fail++;} };

const db = new Database('./prisma/dev.db');
const presales = db.prepare("SELECT id,name FROM Employee WHERE role='Presales' LIMIT 1").get();
const leadId = 1;

// ── TEST 1: Edit lead fields (API) ──
console.log('\n── TEST 1: Edit lead fields ──');
const r1 = await p.request.put(`http://localhost:3000/api/pipeline/leads/${leadId}`, {
  data: { companyName: 'TechCorp Solutions Pvt Ltd', phone: '9123456789', expectedValue: 33.5, remarks: 'edited by test' }
});
check('PUT lead 200', r1.status() === 200, `(${r1.status()})`);
const j1 = await r1.json();
check('Phone updated', j1.phone === '9123456789', j1.phone);
check('Expected value updated', j1.expectedValue === 33.5, String(j1.expectedValue));

// ── TEST 2: Schedule meeting assigned to presales (API) ──
console.log('\n── TEST 2: Schedule meeting → presales + notification ──');
const notifBefore = db.prepare("SELECT COUNT(*) c FROM Notification WHERE recipientId=?").get(presales.id).c;
const r2 = await p.request.post('http://localhost:3000/api/pipeline/meetings', {
  data: { title: 'Demo session', meetingDate: '2026-06-10T10:00', leadId, employeeId: presales.id, notes: 'test' }
});
check('POST meeting 201', r2.status() === 201, `(${r2.status()})`);
const m = await r2.json();
check('Meeting assigned to presales', m.employee?.id === presales.id, JSON.stringify(m.employee));
const notifAfter = db.prepare("SELECT COUNT(*) c FROM Notification WHERE recipientId=?").get(presales.id).c;
check('Presales notified of meeting', notifAfter > notifBefore, `before ${notifBefore} after ${notifAfter}`);

// ── TEST 3: Task assigned to someone else notifies ──
console.log('\n── TEST 3: Task assigned to presales notifies ──');
const tBefore = db.prepare("SELECT COUNT(*) c FROM Notification WHERE recipientId=?").get(presales.id).c;
const r3 = await p.request.post('http://localhost:3000/api/pipeline/tasks', {
  data: { title: 'Prep demo', dueDate: '2026-06-09T09:00', leadId, assignedToId: presales.id, priority: 'high' }
});
check('POST task 201', r3.status() === 201, `(${r3.status()})`);
const t = await r3.json();
check('Task assigned to presales', t.assignedTo?.id === presales.id);
const tAfter = db.prepare("SELECT COUNT(*) c FROM Notification WHERE recipientId=?").get(presales.id).c;
check('Presales notified of task', tAfter > tBefore, `before ${tBefore} after ${tAfter}`);

// ── TEST 4: UI — Edit button + modal ──
console.log('\n── TEST 4: UI edit + POC/Demo prompt ──');
await p.goto(`http://localhost:3000/pipeline/leads/${leadId}`, { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
check('Edit Lead button visible', await p.locator('button:has-text("Edit Lead")').count() > 0);
await p.locator('button:has-text("Edit Lead")').click();
await p.waitForTimeout(500);
check('Edit modal opens with fields', await p.locator('h3:has-text("Edit Lead")').count() > 0);
await p.locator('button:has-text("Cancel")').first().click();
await p.waitForTimeout(300);

// Move to POC_DEMO → prompt appears
await p.locator('button:has-text("POC / Demo")').first().click();
await p.waitForTimeout(1200);
const pocPrompt = await p.locator('h3:has-text("Assign POC / Demo to Presales")').count();
check('POC/Demo prompt appears on stage move', pocPrompt > 0);
await p.screenshot({ path: 'test-results/lead-poc.png' });

db.close();
console.log(`\n═══ ${pass} passed, ${fail} failed ═══`);
console.log('JS errors:', errs.length ? errs.join('; ') : 'NONE');
await b.close();
process.exit(fail>0?1:0);
