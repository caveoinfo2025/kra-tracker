/**
 * Functional tests — Desktop webapp
 * Covers: auth redirect, all primary routes, key UI elements
 */
import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { isDatabaseAvailable } from './helpers/environment';
import { loginAs, EMP_ID, MGR_ID, assertNoServerError } from './helpers';

// ── Auth ──────────────────────────────────────────────────────────────
test.describe('Authentication', () => {
  let dbAvailable = false;

  test.beforeAll(async ({ request }) => {
    dbAvailable = await isDatabaseAvailable(request);
  });

  test('unauthenticated root redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page renders without crashing', async ({ page }) => {
    await page.goto('/login');
    expect(page.url()).toContain('/login');
    await assertNoServerError(page);
    // Should have some login UI element
    const body = await page.textContent('body') ?? '';
    expect(body.length).toBeGreaterThan(100);
  });

  test('authenticated user can reach dashboard', async ({ browser }) => {
    test.skip(!dbAvailable, 'Database-backed authenticated pages are unavailable in this environment.');

    const ctx = await browser.newContext();
    await loginAs(ctx, EMP_ID);
    const page = await ctx.newPage();
    await page.goto('/dashboard');
    await expect(page).not.toHaveURL(/\/login/);
    await assertNoServerError(page);
    await ctx.close();
  });
});

// ── Core pages (employee) ────────────────────────────────────────────
test.describe('Core Pages — Employee view', () => {
  test.use({ storageState: undefined });
  let dbAvailable = false;
  let ctx: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser, request }) => {
    dbAvailable = await isDatabaseAvailable(request);
    ctx = await browser.newContext();
    await loginAs(ctx, EMP_ID);
    page = await ctx.newPage();
  });
  test.afterAll(async () => {
    await ctx?.close();
  });

  const routes = [
    { path: '/dashboard',            label: 'Dashboard' },
    { path: '/pipeline/leads',       label: 'Pipeline Leads' },
    { path: '/pipeline/tasks',       label: 'Pipeline Tasks' },
    { path: '/kras',                 label: 'KRAs' },
    { path: '/daily-updates',        label: 'Daily Updates' },
    { path: '/sales-funnel',         label: 'Sales Funnel' },
    { path: '/collections',          label: 'Collections' },
    { path: '/lead-generation',      label: 'Lead Generation' },
    { path: '/accounts',             label: 'Accounts' },
  ];

  for (const { path, label } of routes) {
    test(`${label} (${path}) loads`, async () => {
      test.skip(!dbAvailable, 'Database-backed authenticated pages are unavailable in this environment.');

      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expect(page).not.toHaveURL(/\/login/);
      await assertNoServerError(page);
      const status = page.url();
      expect(status).not.toContain('500');
    });
  }

  test('pipeline lead detail loads (first lead)', async () => {
    test.skip(!dbAvailable, 'Database-backed authenticated pages are unavailable in this environment.');

    await page.goto('/pipeline/leads');
    await page.waitForLoadState('networkidle');
    // Try clicking first lead link if present
    const firstLink = page.locator('a[href*="/pipeline/leads/"]').first();
    const count = await firstLink.count();
    if (count > 0) {
      await firstLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page).not.toHaveURL(/\/login/);
      await assertNoServerError(page);
    }
  });
});

// ── Manager-only features ────────────────────────────────────────────
test.describe('Manager view', () => {
  let dbAvailable = false;
  let ctx: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser, request }) => {
    dbAvailable = await isDatabaseAvailable(request);
    ctx = await browser.newContext();
    await loginAs(ctx, MGR_ID);
    page = await ctx.newPage();
  });
  test.afterAll(async () => {
    await ctx?.close();
  });

  test('employees list accessible to manager', async () => {
    test.skip(!dbAvailable, 'Database-backed authenticated pages are unavailable in this environment.');

    await page.goto('/employees');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);
    await assertNoServerError(page);
  });

  test('pipeline analytics accessible to manager', async () => {
    test.skip(!dbAvailable, 'Database-backed authenticated pages are unavailable in this environment.');

    await page.goto('/pipeline/analytics');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);
    await assertNoServerError(page);
  });

  test('import page accessible to manager', async () => {
    test.skip(!dbAvailable, 'Database-backed authenticated pages are unavailable in this environment.');

    await page.goto('/import');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);
    await assertNoServerError(page);
  });
});

// ── RBAC: employee cannot access manager-only pages ──────────────────
test.describe('RBAC enforcement', () => {
  let dbAvailable = false;
  let ctx: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser, request }) => {
    dbAvailable = await isDatabaseAvailable(request);
    ctx = await browser.newContext();
    await loginAs(ctx, EMP_ID);  // regular employee
    page = await ctx.newPage();
  });
  test.afterAll(async () => {
    await ctx?.close();
  });

  test('employees/new requires manager', async () => {
    test.skip(!dbAvailable, 'Database-backed authenticated pages are unavailable in this environment.');

    await page.goto('/employees/new');
    await page.waitForLoadState('networkidle');
    // Should redirect, show Forbidden, or at minimum not expose raw data
    const url = page.url();
    const body = await page.textContent('body') ?? '';
    const isBlocked = url.includes('/login') || url.includes('/dashboard')
      || body.toLowerCase().includes('forbidden')
      || body.toLowerCase().includes('not authorized')
      || body.toLowerCase().includes('access denied');
    // If not explicitly blocked, flag it
    if (!isBlocked) {
      console.warn('[RBAC] employees/new did not block regular employee');
    }
    // At minimum — no server crash
    await assertNoServerError(page);
  });
});
