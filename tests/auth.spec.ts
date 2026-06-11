import { expect, test } from '@playwright/test';
import { isDatabaseAvailable } from './helpers/environment';
import { loginAsEmployee, loginAsManager } from './helpers/login';

test.describe('CRM auth and dashboard access', () => {
  let dbAvailable = false;

  test.beforeAll(async ({ request }) => {
    dbAvailable = await isDatabaseAvailable(request);
  });

  test('unauthenticated dashboard request redirects to login', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Sales Tracker' })).toBeVisible();
  });

  test('login page renders the Microsoft sign-in prompt', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('button', { name: /sign in with microsoft/i })).toBeVisible();
    await expect(page.getByText(/@caveoinfosystems\.com/i)).toBeVisible();
  });

  test('employee can reach the employee dashboard but is redirected away from settings', async ({ page, context }) => {
    test.skip(!dbAvailable, 'Database-backed authenticated pages are unavailable in this environment.');

    await loginAsEmployee(context, page, { redirectPath: '/dashboard' });

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('My KRAs')).toBeVisible();

    await page.goto('/settings');

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('manager can reach the manager dashboard and settings hub', async ({ page, context }) => {
    test.skip(!dbAvailable, 'Database-backed authenticated pages are unavailable in this environment.');

    await loginAsManager(context, page, { redirectPath: '/' });

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Manager Dashboard' })).toBeVisible();

    await page.goto('/settings');

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });
});
