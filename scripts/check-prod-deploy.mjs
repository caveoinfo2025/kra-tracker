import { chromium } from '@playwright/test';
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));

// /customers redirects to login (auth-gated) — confirm it's the login page, not a 500/error
const r1 = await p.goto('https://sales.caveoinfosystems.com/customers', { waitUntil: 'networkidle', timeout: 30000 });
console.log('/customers final URL:', p.url());
console.log('/customers status:', r1.status());
const body1 = (await p.locator('body').innerText().catch(()=> '')).slice(0, 150).replace(/\n+/g, ' ');
console.log('/customers content:', JSON.stringify(body1));
await p.screenshot({ path: 'test-results/prod-customers.png' });

// Check the Customer Master route actually exists in the build (not a 404)
// A 404 would show "page could not be found"; login redirect shows sign-in card
const is404 = body1.toLowerCase().includes('could not be found') || body1.toLowerCase().includes('404');
const isLogin = body1.toLowerCase().includes('sign in') || body1.toLowerCase().includes('sales tracker');
console.log('is 404:', is404, '| is login redirect (route exists):', isLogin);

console.log('JS errors:', errs.length ? errs.join('; ') : 'NONE');
await b.close();
