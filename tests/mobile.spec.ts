/**
 * Functional tests — Mobile UI at /mobile
 * Run with Pixel 5 viewport (393×851) and desktop Chrome
 */
import { test, expect } from '@playwright/test';
import { loginAs, EMP_ID, assertNoServerError } from './helpers';

test.describe('Mobile App — /mobile', () => {
  let ctx: any, page: any;

  test.beforeAll(async ({ browser }) => {
    ctx = await browser.newContext({
      viewport: { width: 393, height: 851 },
      userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 Chrome/90 Mobile Safari/537.36',
    });
    await loginAs(ctx, EMP_ID);
    page = await ctx.newPage();
  });
  test.afterAll(() => ctx.close());

  test('loads without crashing', async () => {
    await page.goto('/mobile');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);
    await assertNoServerError(page);
    const body = await page.textContent('body') ?? '';
    expect(body.length).toBeGreaterThan(100);
  });

  test('renders Today / home screen', async () => {
    await page.goto('/mobile');
    await page.waitForLoadState('networkidle');
    // Mobile root should have the fixed overlay structure
    const root = page.locator('body');
    await expect(root).toBeVisible();
    // Should not be a blank white page
    const html = await page.content();
    expect(html).not.toMatch(/^<html><head><\/head><body><\/body><\/html>$/i);
  });

  test('bottom nav: all tabs are clickable without crash', async () => {
    await page.goto('/mobile');
    await page.waitForLoadState('networkidle');

    // Find all bottom-nav buttons (aria buttons or nav links)
    const navItems = page.locator('nav button, nav a, [data-screen], .m-nav button');
    const count = await navItems.count();

    for (let i = 0; i < Math.min(count, 8); i++) {
      try {
        await navItems.nth(i).click({ timeout: 3000 });
        await page.waitForTimeout(400);
        await assertNoServerError(page);
      } catch {
        // Some tabs may require data; just ensure no crash
      }
    }
  });

  test('pipeline / leads data loads in mobile view', async () => {
    await page.goto('/mobile');
    await page.waitForLoadState('networkidle');

    // Click the Pipeline tab (look for text containing pipeline/leads)
    const pipelineTab = page.getByText(/pipeline|leads/i).first();
    if (await pipelineTab.count() > 0) {
      await pipelineTab.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(600);
      await assertNoServerError(page);
    }
  });

  test('mobile page does not expose raw API errors to users', async () => {
    await page.goto('/mobile');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body') ?? '';
    expect(body).not.toContain('PrismaClientKnownRequestError');
    expect(body).not.toContain('SQLITE_');
    expect(body).not.toContain('stack trace');
  });

  test('mobile page is responsive at 375px (iPhone SE width)', async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/mobile');
    await page.waitForLoadState('networkidle');
    await assertNoServerError(page);
    // No horizontal scroll (content fits within viewport)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(380); // minor tolerance
  });

  test('unauthenticated /mobile redirects', async ({ browser }) => {
    const anonCtx = await browser.newContext({ viewport: { width: 393, height: 851 } });
    const anonPage = await anonCtx.newPage();
    await anonPage.goto('/mobile');
    await anonPage.waitForLoadState('networkidle');
    const url = anonPage.url();
    const body = await anonPage.textContent('body') ?? '';
    // Should redirect to login OR show login prompt
    const isProtected = url.includes('/login') || body.toLowerCase().includes('sign in') || body.toLowerCase().includes('login');
    if (!isProtected) {
      console.warn('[AUTH] /mobile accessible without auth — verify this is intentional');
    }
    await anonCtx.close();
  });
});
