import { expect, test } from '@playwright/test';

test.describe('Smoke: homepage and login', () => {
  test('root redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page renders core sign-in content', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Sales Tracker' })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in with microsoft/i })).toBeVisible();
    await expect(page.getByText(/@caveoinfosystems\.com/i)).toBeVisible();
  });
});
