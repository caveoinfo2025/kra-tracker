import { expect, test } from '@playwright/test';
import { isDatabaseAvailable } from './helpers/environment';
import { loginAsAdmin, loginAsEmployee, loginAsManager } from './helpers/login';

const hasAdminRole = Boolean(process.env.PLAYWRIGHT_ADMIN_EMPLOYEE_ID);

test.describe('Approval workflow', () => {
  let dbAvailable = false;

  test.beforeAll(async ({ request }) => {
    dbAvailable = await isDatabaseAvailable(request);
  });

  test('unauthenticated approvals route redirects to login', async ({ page }) => {
    await page.goto('/approvals');

    await expect(page).toHaveURL(/\/login/);
  });

  test('employee can open the approvals workspace but not the settings workflow engine', async ({ page, context }) => {
    test.skip(!dbAvailable, 'Database-backed authenticated pages are unavailable in this environment.');

    await loginAsEmployee(context, page, { redirectPath: '/approvals' });

    await expect(page).toHaveURL(/\/approvals$/);
    await expect(page.getByText('My Approvals')).toBeVisible();

    await page.goto('/settings/workflow/approval-engine');
    await expect(page).toHaveURL(/\/approvals$/);
  });

  test('manager can quick-approve a pending approval assigned to them', async ({ page, context }) => {
    test.skip(!dbAvailable, 'Database-backed authenticated pages are unavailable in this environment.');

    await loginAsManager(context, page, { redirectPath: '/approvals' });

    const approveButton = page.locator('[data-testid^="approval-quick-approve-"]').first();
    await expect(approveButton).toBeVisible();
    await approveButton.click();

    await page.getByTestId('approval-segment-approved').click();
    await expect(page.getByText('Approved')).toBeVisible();
  });

  test('admin sees workflow validation when required fields are missing', async ({ page, context }) => {
    test.skip(!hasAdminRole, 'Admin credentials are required to validate workflow configuration.');
    test.skip(!dbAvailable, 'Database-backed authenticated pages are unavailable in this environment.');

    await loginAsAdmin(context, page, { redirectPath: '/settings/workflow/approval-engine' });

    await page.getByRole('button', { name: 'Workflows' }).click();
    await page.getByRole('button', { name: /new workflow/i }).click();
    await page.getByRole('button', { name: /next/i }).click();

    await expect(page.getByText('Workflow name is required.')).toBeVisible();
  });
});
