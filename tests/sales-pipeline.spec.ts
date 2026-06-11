import { expect, test } from '@playwright/test';
import { isDatabaseAvailable } from './helpers/environment';
import { createOpportunityFixture, deleteLead } from './helpers/crm';
import { loginAsEmployee, loginAsManager } from './helpers/login';

test.describe.configure({ mode: 'serial' });

test.describe('Sales opportunity pipeline', () => {
  let dbAvailable = false;
  let leadIdForCleanup: number | null = null;
  let opportunityId: number | null = null;

  test.beforeAll(async ({ request }) => {
    dbAvailable = await isDatabaseAvailable(request);
    if (!dbAvailable) {
      return;
    }

    const fixture = await createOpportunityFixture(request, 'employee');
    leadIdForCleanup = fixture.leadId;
    opportunityId = fixture.opportunityId;
  });

  test.afterAll(async ({ request }) => {
    if (leadIdForCleanup) {
      await deleteLead(request, leadIdForCleanup, 'employee');
    }
  });

  test('unauthenticated opportunity route redirects to login', async ({ page }) => {
    await page.goto('/pipeline/opportunities');

    await expect(page).toHaveURL(/\/login/);
  });

  test('role-based opportunity filters differ for employee and manager', async ({ browser }) => {
    test.skip(!dbAvailable, 'Database-backed authenticated pages are unavailable in this environment.');

    const employeeContext = await browser.newContext();
    const employeePage = await employeeContext.newPage();
    await loginAsEmployee(employeeContext, employeePage, { redirectPath: '/pipeline/opportunities' });
    await expect(employeePage.getByTestId('opportunity-owner-filter')).toHaveCount(0);
    await employeeContext.close();

    const managerContext = await browser.newContext();
    const managerPage = await managerContext.newPage();
    await loginAsManager(managerContext, managerPage, { redirectPath: '/pipeline/opportunities' });
    await expect(managerPage.getByTestId('opportunity-owner-filter')).toBeVisible();
    await managerContext.close();
  });

  test('employee can update an active opportunity and gets close-stage validations', async ({ page, context }) => {
    test.skip(!dbAvailable, 'Database-backed authenticated pages are unavailable in this environment.');

    expect(opportunityId).toBeTruthy();

    await loginAsEmployee(context, page, {
      redirectPath: `/pipeline/opportunities/${opportunityId}`,
    });

    await expect(page.getByTestId('opportunity-stage-select')).toBeVisible();

    await page.getByTestId('opportunity-stage-select').selectOption('FOLLOW_UP');
    await page.getByTestId('opportunity-save-button').click();
    await expect(page.getByTestId('opportunity-stage-select')).toHaveValue('FOLLOW_UP');

    await page.getByTestId('opportunity-close-won-button').click();
    await page.getByTestId('opportunity-close-confirm-button').click();
    await expect(page.getByText('PO Number is required.')).toBeVisible();
    await page.getByTestId('opportunity-close-cancel-button').click();

    await page.getByTestId('opportunity-close-lost-button').click();
    await page.getByTestId('opportunity-close-confirm-button').click();
    await expect(page.getByText('Please provide the reason for losing this deal.')).toBeVisible();
  });
});
