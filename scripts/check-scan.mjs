import { chromium } from '@playwright/test';
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.addCookies([{ name: 'dev_employee_id', value: '5', domain: 'localhost', path: '/' }]);
const p = await ctx.newPage();
const errs=[]; p.on('pageerror', e=>errs.push(e.message));
let pass=0, fail=0; const check=(n,c,d='')=>{ if(c){console.log(`  ✅ ${n}`);pass++;}else{console.log(`  ❌ ${n} ${d}`);fail++;} };

// ── TEST 1: OCR endpoint without key → graceful 503 ──
console.log('\n── TEST 1: OCR endpoint behaviour ──');
const r = await p.request.post('http://localhost:3000/api/ocr/business-card', { data: { image: 'iVBORw0KGgo=' } });
check('OCR returns 503 when no key configured', r.status() === 503, `(got ${r.status()})`);
const rd = await r.json();
check('503 has helpful error', /not configured|GOOGLE_VISION/i.test(rd.error ?? ''), rd.error);
// empty image → 400
const r2 = await p.request.post('http://localhost:3000/api/ocr/business-card', { data: { image: '' } });
check('Empty image → 400 or 503', [400,503].includes(r2.status()), `(got ${r2.status()})`);

// ── TEST 2: Scan screen reachable from Pipeline ──
console.log('\n── TEST 2: Scan screen UI ──');
await p.goto('http://localhost:3000/mobile', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
await p.locator('.m-tab:has-text("Pipeline")').click();
await p.waitForTimeout(800);
// scan icon in navbar (top-right red doc icon)
const navIcons = await p.locator('.m-navbar .m-nav-icon').count();
check('Pipeline navbar has scan button', navIcons >= 2, `(${navIcons})`);
await p.locator('.m-navbar .m-nav-icon').last().click();
await p.waitForTimeout(800);
const scanTitle = await p.locator('h1:has-text("Scan Business Card")').count();
check('Scan Card screen opens', scanTitle > 0);
await p.screenshot({ path: 'test-results/scan-capture.png' });
const takePhoto = await p.locator('button:has-text("Take Photo")').count();
const upload = await p.locator('button:has-text("Upload from Gallery")').count();
check('Has Take Photo button', takePhoto > 0);
check('Has Upload button', upload > 0);

// ── TEST 3: Quick-log "Scan Card" entry ──
console.log('\n── TEST 3: Quick-log Scan Card entry ──');
await p.goto('http://localhost:3000/mobile', { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
await p.locator('.m-tab.fab').click();
await p.waitForTimeout(500);
const scanCardBtn = await p.locator('.m-sheet-body button:has-text("Scan Card")').count();
check('Quick-log has Scan Card action', scanCardBtn > 0);
await p.locator('.m-sheet-body button:has-text("Scan Card")').click();
await p.waitForTimeout(700);
check('Scan Card action opens scan screen', await p.locator('h1:has-text("Scan Business Card")').count() > 0);

console.log(`\n═══ ${pass} passed, ${fail} failed ═══`);
console.log('JS errors:', errs.length ? errs.join('; ') : 'NONE');
await b.close();
process.exit(fail>0?1:0);
