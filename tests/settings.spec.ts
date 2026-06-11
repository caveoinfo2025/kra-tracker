import { expect, test } from '@playwright/test';
import { isDatabaseAvailable } from './helpers/environment';
import { loginAsEmployee, loginAsManager } from './helpers/login';

test.describe('Settings and admin panel', () => {
  let dbAvailable = false;

  test.beforeAll(async ({ request }) => {
    dbAvailable = await isDatabaseAvailable(request);
  });

  test('unauthenticated settings access redirects to login', async ({ page }) => {
    await page.goto('/settings');

    await expect(page).toHaveURL(/\/login/);
  });

  test('employee is blocked from admin settings routes', async ({ page, context }) => {
    test.skip(!dbAvailable, 'Database-backed authenticated pages are unavailable in this environment.');

    await loginAsEmployee(context, page, { redirectPath: '/settings' });
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/settings/identity');
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/settings/workflow/approval-engine');
    await expect(page).toHaveURL(/\/approvals$/);
  });

  test('manager can open the settings hub, identity pages, and workflow engine', async ({ page, context }) => {
    test.skip(!dbAvailable, 'Database-backed authenticated pages are unavailable in this environment.');

    await loginAsManager(context, page, { redirectPath: '/settings' });

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByText('Identity & Access')).toBeVisible();
    await expect(page.getByText('Workflow Engine')).toBeVisible();

    await page.goto('/settings/identity');
    await expect(page.getByRole('heading', { name: 'Identity & Access' })).toBeVisible();

    await page.getByRole('button', { name: 'Roles' }).click();
    await expect(page.getByText('Role Management')).toBeVisible();

    await page.getByRole('button', { name: 'Permissions' }).click();
    await expect(page.getByText('Permission Matrix')).toBeVisible();

    await page.goto('/settings/workflow/approval-engine');
    await expect(page.getByText('Approval Engine')).toBeVisible();
    await expect(page.getByText('Total Workflows')).toBeVisible();
  });
});
