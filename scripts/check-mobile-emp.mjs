import { chromium } from '@playwright/test';
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.addCookies([{ name: 'dev_employee_id', value: '5', domain: 'localhost', path: '/' }]); // employee Mariarussell
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
let pass=0, fail=0; const check=(n,c,d='')=>{ if(c){console.log(`  ✅ ${n}`);pass++;}else{console.log(`  ❌ ${n} ${d}`);fail++;} };

await p.goto('http://localhost:3000/mobile', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);

// Me tab
await p.locator('.m-tab:has-text("Me")').click();
await p.waitForTimeout(700);
await p.screenshot({ path: 'test-results/m-emp-me.png' });
// Employee should NOT see Team Overview, should see My KRAs
const teamOv = await p.locator('.row-title:has-text("Team Overview")').count();
check('Employee does NOT see Team Overview', teamOv === 0);
const myKra = await p.locator('.row-title:has-text("My KRAs")').count();
check('Employee sees My KRAs', myKra > 0);

// Open My KRAs
await p.locator('.row-title:has-text("My KRAs")').click();
await p.waitForTimeout(900);
const krasTitle = await p.locator('h1:has-text("My KRAs")').count();
check('My KRAs screen opens', krasTitle > 0);
await p.screenshot({ path: 'test-results/m-emp-kras.png' });

console.log(`\n═══ ${pass} passed, ${fail} failed ═══`);
console.log('JS errors:', errs.length ? errs.join('; ') : 'NONE');
await b.close();
process.exit(fail>0?1:0);
